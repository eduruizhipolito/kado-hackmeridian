import {
  Asset,
  type Horizon,
  type Keypair,
  NetworkError,
  NotFoundError,
  Operation,
  type Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { codeToKeypair, normalizeCode } from "../code";
import { getKadoState } from "../kado-state";
import { findBatch, knownKeys } from "../manifest";
import { orNull, withRetry } from "./horizon";
import { channelKeypairs, codeSalt, horizon, NETWORK_PASSPHRASE, sponsorKeypair } from "./config";

const TX_TIMEOUT_S = 30; // timebounds: after this the tx can never land (SPEC.md)
const MAX_SUBMITS = 3; // each on a different channel
const FEE_PER_OP = "200";
const POLL_MS = 1000;

/** One Kadó that reached an account (P4 list). */
export type Receipt = { amountUsd: string | null; at: string };

export type OpenResult =
  | {
      state: "opened";
      account: string; // the account the funds are in (My Kadó when added to it)
      amountUsd: string | null; // what this Kadó delivered (P3)
      balanceUsd?: string | null; // live balance at the batch rate (P4), from peek
      receipts?: Receipt[]; // Kadós received by this account (P4), from peek
      addedToMyKado?: boolean;
      txHash?: string;
    }
  | { state: "closed" }
  | { state: "expired" }
  | { state: "not_found" }
  | { state: "busy" }; // could not confirm; safe to tap Open again

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const usd = (xlm: string | number, rate: number | undefined) =>
  rate === undefined ? null : (Number(xlm) * rate).toFixed(2);

/** Channels in random order: each retry uses a different one. */
function shuffledChannels(): Keypair[] {
  const channels = channelKeypairs();
  for (let i = channels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [channels[i], channels[j]] = [channels[j], channels[i]];
  }
  return channels;
}

/**
 * The SPEC F2 transaction: channel as tx source, three signatures. With
 * `into`, F3b adds a 5th op that moves the gift into My Kadó's account.
 */
async function buildOpenTx(
  kado: Keypair,
  sponsor: Keypair,
  channel: Keypair,
  balance: { id: string; amountXlm: string },
  into?: string,
) {
  const channelAccount = await horizon().loadAccount(channel.publicKey()); // fresh sequence
  const builder = new TransactionBuilder(channelAccount, { fee: FEE_PER_OP, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.beginSponsoringFutureReserves({ sponsoredId: kado.publicKey(), source: sponsor.publicKey() }),
    )
    .addOperation(
      Operation.createAccount({ destination: kado.publicKey(), startingBalance: "0", source: sponsor.publicKey() }),
    )
    .addOperation(Operation.endSponsoringFutureReserves({ source: kado.publicKey() }))
    .addOperation(Operation.claimClaimableBalance({ balanceId: balance.id, source: kado.publicKey() }));
  if (into) {
    builder.addOperation(
      Operation.payment({ destination: into, asset: Asset.native(), amount: balance.amountXlm, source: kado.publicKey() }),
    );
  }
  const tx = builder.setTimeout(TX_TIMEOUT_S).build();
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

/**
 * A Kadó account's activity, from chain. Receipts: its own Kadó's claim, plus
 * payments into it from other Kadó accounts (F3b); other payments are ignored.
 * `addedTo`: the account this Kadó's gift was moved into, if it was.
 */
async function getActivity(account: string): Promise<{ receipts: Receipt[]; addedTo?: string }> {
  const page = await withRetry(() => horizon().operations().forAccount(account).order("asc").limit(200).call());
  const receipts: Receipt[] = [];
  let addedTo: string | undefined;
  for (const op of page.records) {
    if (op.type === "claim_claimable_balance" && op.source_account === account) {
      receipts.push({ amountUsd: findBatch(account)?.amountUsd ?? null, at: op.created_at });
    } else if (op.type === "payment") {
      const payment = op as Horizon.ServerApi.PaymentOperationRecord;
      if (payment.asset_type !== "native") continue;
      if (payment.to === account && knownKeys.has(payment.from)) {
        receipts.push({ amountUsd: usd(payment.amount, findBatch(payment.from)?.usdPerXlm), at: op.created_at });
      } else if (payment.from === account && knownKeys.has(payment.to)) {
        addedTo = payment.to;
      }
    }
  }
  return { receipts, addedTo };
}

const nativeBalance = (account: Horizon.AccountResponse | null) =>
  account?.balances.find((b) => b.asset_type === "native")?.balance ?? "0";

/** The My Kadó account for a code, if that Kadó is opened. */
async function myKadoAccount(input: string | undefined, exclude: string): Promise<string | undefined> {
  const code = input ? normalizeCode(input) : null;
  if (!code || code === exclude) return undefined;
  const key = (await codeToKeypair(code, codeSalt())).publicKey();
  const state = await getKadoState(key, knownKeys);
  return state.state === "opened" ? key : undefined;
}

/** Public view of a Kadó: never reveals the amount before it is opened. */
export async function peekKado(input: string): Promise<OpenResult> {
  const code = normalizeCode(input);
  if (!code) return { state: "not_found" };
  const kado = await codeToKeypair(code, codeSalt());
  const state = await getKadoState(kado.publicKey(), knownKeys);
  if (state.state !== "opened") return { state: state.state };

  const amountUsd = findBatch(state.account)?.amountUsd ?? null;
  const own = await getActivity(state.account);
  if (own.addedTo) {
    // This Kadó's gift lives in another Kadó's account: show that one (F3b).
    const [target, activity] = await Promise.all([
      orNull(() => horizon().loadAccount(own.addedTo!)),
      getActivity(own.addedTo),
    ]);
    return {
      state: "opened",
      account: own.addedTo,
      amountUsd,
      balanceUsd: usd(nativeBalance(target), findBatch(own.addedTo)?.usdPerXlm),
      receipts: activity.receipts,
      addedToMyKado: true,
    };
  }
  return {
    state: "opened",
    account: state.account,
    amountUsd,
    // Same frozen rate as the gift, so everyone sees consistent dollars (SPEC.md).
    balanceUsd: usd(state.balanceXlm, findBatch(state.account)?.usdPerXlm),
    receipts: own.receipts,
  };
}

/**
 * Opens a Kadó, optionally into My Kadó (`intoCode`, F3b). Idempotent: the tx
 * is atomic (F4), a retry only follows a definite "not applied" answer, and
 * every attempt starts by re-reading chain state, so a second open of the
 * same code returns `opened`.
 */
export async function openKado(input: string, intoCode?: string): Promise<OpenResult> {
  const code = normalizeCode(input);
  if (!code) return { state: "not_found" };
  const kado = await codeToKeypair(code, codeSalt());
  const sponsor = sponsorKeypair();
  const channels = shuffledChannels();
  const amountUsd = findBatch(kado.publicKey())?.amountUsd ?? null;
  const into = await myKadoAccount(intoCode, code);
  const opened = (txHash?: string): OpenResult => ({
    state: "opened",
    account: into ?? kado.publicKey(),
    amountUsd,
    addedToMyKado: Boolean(into),
    txHash,
  });

  for (let attempt = 0; attempt < MAX_SUBMITS; attempt++) {
    const state = await getKadoState(kado.publicKey(), knownKeys);
    if (state.state === "opened") return opened();
    if (state.state !== "closed") return { state: state.state };

    const channel = channels[attempt % channels.length];
    const tx = await buildOpenTx(kado, sponsor, channel, { id: state.balanceId, amountXlm: state.amountXlm }, into);
    try {
      const sent = await horizon().submitAsyncTransaction(tx);
      if (sent.tx_status === "PENDING" || sent.tx_status === "DUPLICATE") {
        if (await waitForTx(tx, channel.publicKey())) return opened(sent.hash);
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
      if (await waitForTx(tx, channel.publicKey())) return opened();
    }
  }

  const state = await getKadoState(kado.publicKey(), knownKeys);
  if (state.state === "opened") return opened();
  return state.state === "closed" ? { state: "busy" } : { state: state.state };
}
