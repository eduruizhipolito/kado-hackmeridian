// Generates a batch of Kadós: one claimable balance per code.
// Run: npm run generate-batch -- --count 3 --xlm 10 --usd-per-xlm 0.2 --expires 7d --label "Demo"
//
// Writes batches/<id>.json (public manifest, committed) and
// batches/<id>.codes.csv (the codes, git-ignored: whoever has a code opens it).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Asset, Claimant, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { codeToKeypair, formatCode, generateCode } from "../lib/code";
import { BATCHES_DIR, type Manifest } from "../lib/manifest";
import { codeSalt, horizon, NETWORK_PASSPHRASE, sponsorKeypair } from "../lib/stellar/config";

const OPS_PER_TX = 100; // protocol maximum
const FEE_PER_OP = "200"; // stroops; testnet base fee is 100

/** "7d", "2h", "30m" or an ISO date → Date. */
function parseExpires(value: string): Date {
  const relative = /^(\d+)([mhd])$/.exec(value);
  if (relative) {
    const unit = { m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2] as "m" | "h" | "d"];
    return new Date(Date.now() + Number(relative[1]) * unit);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Bad --expires: ${value}`);
  return date;
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const { values } = parseArgs({
    options: {
      count: { type: "string" },
      xlm: { type: "string" },
      "usd-per-xlm": { type: "string" },
      expires: { type: "string" },
      label: { type: "string" },
    },
  });
  const count = Number(values.count);
  const amountXlm = Number(values.xlm).toFixed(7);
  const usdPerXlm = Number(values["usd-per-xlm"]);
  if (!Number.isInteger(count) || count < 1) throw new Error("--count must be a positive integer");
  if (!(Number(amountXlm) > 0)) throw new Error("--xlm must be > 0");
  if (!(usdPerXlm > 0)) throw new Error("--usd-per-xlm must be > 0");
  if (!values.expires || !values.label) throw new Error("--expires and --label are required");

  const expiresAt = parseExpires(values.expires);
  if (expiresAt <= new Date()) throw new Error("--expires must be in the future");
  const expiresEpoch = String(Math.floor(expiresAt.getTime() / 1000));
  const id = `${slug(values.label)}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;

  const sponsor = sponsorKeypair();
  const salt = codeSalt();
  const server = horizon();

  // Budget: gift + 1 XLM locked per Kadó (2 claimants × 0.5 XLM reserve), SPEC F5.
  const needed = count * (Number(amountXlm) + 1);
  const account = await server.loadAccount(sponsor.publicKey());
  const available = Number(account.balances.find((b) => b.asset_type === "native")?.balance ?? 0);
  if (available < needed + 2) {
    throw new Error(`Sponsor has ${available} XLM, batch needs ~${needed} XLM plus its own reserve`);
  }

  const codes = Array.from({ length: count }, generateCode);
  const keypairs = await Promise.all(codes.map((code) => codeToKeypair(code, salt)));

  // Codes first: if a submit fails after this, unopened balances return to
  // the sponsor at expiration anyway.
  const csvPath = join(BATCHES_DIR, `${id}.codes.csv`);
  writeFileSync(
    csvPath,
    "code,link\n" + codes.map((code) => `${formatCode(code)},/k/${formatCode(code)}`).join("\n") + "\n",
  );

  const kadoPredicate = Claimant.predicateBeforeAbsoluteTime(expiresEpoch);
  const txHashes: string[] = [];
  for (let start = 0; start < count; start += OPS_PER_TX) {
    const builder = new TransactionBuilder(account, {
      fee: FEE_PER_OP,
      networkPassphrase: NETWORK_PASSPHRASE,
    }).setTimeout(60);
    for (const kado of keypairs.slice(start, start + OPS_PER_TX)) {
      builder.addOperation(
        Operation.createClaimableBalance({
          asset: Asset.native(),
          amount: amountXlm,
          claimants: [
            new Claimant(kado.publicKey(), kadoPredicate),
            new Claimant(sponsor.publicKey(), Claimant.predicateNot(kadoPredicate)),
          ],
        }),
      );
    }
    const tx = builder.build();
    tx.sign(sponsor);
    const result = await server.submitTransaction(tx);
    txHashes.push(result.hash);
    console.log(`tx ${result.hash} (${Math.min(OPS_PER_TX, count - start)} Kadós)`);
  }

  const manifest: Manifest = {
    id,
    label: values.label,
    network: "testnet",
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    amountXlm,
    usdPerXlm,
    amountUsd: (Number(amountXlm) * usdPerXlm).toFixed(2),
    sponsor: sponsor.publicKey(),
    kados: keypairs.map((k) => ({ publicKey: k.publicKey() })),
    txHashes,
  };
  writeFileSync(join(BATCHES_DIR, `${id}.json`), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nBatch ${id}: ${count} Kadós of ${amountXlm} XLM (≈ $${manifest.amountUsd}), expire ${manifest.expiresAt}`);
  console.log(`Manifest: batches/${id}.json`);
  console.log(`Codes:    batches/${id}.codes.csv (never commit)`);
}

main().catch((error) => {
  console.error(error?.response?.data?.extras?.result_codes ?? error);
  process.exit(1);
});
