import { type Keypair, NetworkError, NotFoundError, Operation, type Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { codeToKeypair, normalizeCode } from "../code";
import { getKadoState } from "../kado-state";
import { findBatch, knownKeys } from "../manifest";
import { orNull } from "./horizon";
import { channelKeypairs, codeSalt, horizon, NETWORK_PASSPHRASE, sponsorKeypair } from "./config";

const TX_TIMEOUT_S = 30; // timebounds: after this the tx can never land (SPEC.md)
const MAX_SUBMITS = 3; // each on a different channel
const FEE_PER_OP = "200";
const POLL_MS = 1000;

export type OpenResult =
  | {
      state: "opened";
      account: string;
      amountUsd: string | null; // what the Kadó delivered (P3)
      balanceUsd?: string | null; // live account balance at the batch rate (P4), from peek
      txHash?: string;
    }
  | { state: "closed" }
  | { state: "expired" }
  | { state: "not_found" }
  | { state: "busy" }; // could not confirm; safe to tap Open again

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Channels in random order: each retry uses a different one. */
function shuffledChannels(): Keypair[] {
  const channels = channelKeypairs();
  for (let i = channels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [channels[i], channels[j]] = [channels[j], channels[i]];
  }
  return channels;
}

/** The SPEC F2 transaction: channel as tx source, three signatures. */
async function buildOpenTx(kado: Keypair, sponsor: Keypair, channel: Keypair, balanceId: string) {
  const channelAccount = await horizon().loadAccount(channel.publicKey()); // fresh sequence
  const tx = new TransactionBuilder(channelAccount, { fee: FEE_PER_OP, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: kado.publicKey(), source: sponsor.publicKey() }),
    )
    .addOperation(
      Operation.createAccount({ destination: kado.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
    )
    .addOperation(Operation.endSponsoringFutureReserves({ source: kado.publicKey() }))
    .addOperation(Operation.claimClaimableBalance({ balanceId, source: kado.publicKey() }))
    .setTimeout(TX_TIMEOUT_S)
    .build();
  tx.sign(channel, sponsor, kado);
  return tx;
}

/**
 * Waits for a submitted tx: true once it is in a ledger, false if it failed,
 * timed out, or can no longer land because the channel's sequence moved past
 * it (another tx used that number). A false "dead" is harmless: the caller
 * re-reads chain state before doing anything else.
 */
async function waitForTx(tx: Transaction, channel: string): Promise<boolean> {
  const hash = Buffer.from(tx.hash()).toString("hex");
  const deadline = Date.now() + (TX_TIMEOUT_S + 5) * 1000;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    try {
      return (await horizon().transactions().transaction(hash).call()).successful;
    } catch (error) {
      if (!(error instanceof NotFoundError)) console.error("poll", error); // 404 until included
    }
    const account = await orNull(() => horizon().loadAccount(channel));
    if (account && BigInt(account.sequenceNumber()) >= BigInt(tx.sequence)) return false;
  }
  return false;
}

/** Public view of a Kadó: never reveals the amount before it is opened. */
export async function peekKado(input: string): Promise<OpenResult> {
  const code = normalizeCode(input);
  if (!code) return { state: "not_found" };
  const kado = await codeToKeypair(code, codeSalt());
  const state = await getKadoState(kado.publicKey(), knownKeys);
  if (state.state === "opened") {
    const batch = findBatch(state.account);
    return {
      state: "opened",
      account: state.account,
      amountUsd: batch?.amountUsd ?? null,
      // Same frozen rate as the gift, so everyone sees consistent dollars (SPEC.md).
      balanceUsd: batch ? (Number(state.balanceXlm) * batch.usdPerXlm).toFixed(2) : null,
    };
  }
  return { state: state.state };
}

/**
 * Opens a Kadó. Idempotent: the tx is atomic (F4), a retry only follows a
 * definite "not applied" answer, and every attempt starts by re-reading
 * chain state, so a second open of the same code returns `opened`.
 */
export async function openKado(input: string): Promise<OpenResult> {
  const code = normalizeCode(input);
  if (!code) return { state: "not_found" };
  const kado = await codeToKeypair(code, codeSalt());
  const sponsor = sponsorKeypair();
  const channels = shuffledChannels();
  const amountUsd = findBatch(kado.publicKey())?.amountUsd ?? null;

  for (let attempt = 0; attempt < MAX_SUBMITS; attempt++) {
    const state = await getKadoState(kado.publicKey(), knownKeys);
    if (state.state === "opened") return { state: "opened", account: state.account, amountUsd };
    if (state.state !== "closed") return { state: state.state };

    const channel = channels[attempt % channels.length];
    const tx = await buildOpenTx(kado, sponsor, channel, state.balanceId);
    try {
      const sent = await horizon().submitAsyncTransaction(tx);
      if (sent.tx_status === "PENDING" || sent.tx_status === "DUPLICATE") {
        if (await waitForTx(tx, channel.publicKey())) {
          return { state: "opened", account: kado.publicKey(), amountUsd, txHash: sent.hash };
        }
        // Failed in the ledger or timed out: the loop re-reads state first.
        continue;
      }
      // TRY_AGAIN_LATER (channel busy) or ERROR (rejected): never applied.
      console.warn(`open attempt ${attempt + 1}: ${sent.tx_status} on ${channel.publicKey()}`);
      await sleep(300 + Math.random() * 700);
    } catch (error) {
      const status = error instanceof NetworkError ? error.response?.status : undefined;
      // The async endpoint answers TRY_AGAIN_LATER with 503 and ERROR with 400:
      // core never took the tx, so retry right away on the next channel.
      if (status === 503 || status === 400) {
        console.warn(`open attempt ${attempt + 1}: HTTP ${status}, retrying on another channel`);
        await sleep(300 + Math.random() * 700);
        continue;
      }
      // Lost response: the tx may still land. Wait out the timebounds, then re-read.
      console.error(`open attempt ${attempt + 1} failed (${status ?? "network"})`, error);
      if (await waitForTx(tx, channel.publicKey())) {
        return { state: "opened", account: kado.publicKey(), amountUsd };
      }
    }
  }

  const state = await getKadoState(kado.publicKey(), knownKeys);
  if (state.state === "opened") return { state: "opened", account: state.account, amountUsd };
  return state.state === "closed" ? { state: "busy" } : { state: state.state };
}
