// Creates the channel-account pool (SPEC F2) from the sponsor and appends
// CHANNEL_SECRETS to .env. Secrets are never printed.
// Run: npm run create-channels -- --count 20 --xlm 5
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Keypair, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { horizon, NETWORK_PASSPHRASE, sponsorKeypair } from "../lib/stellar/config";

async function main() {
  const { values } = parseArgs({
    options: { count: { type: "string", default: "20" }, xlm: { type: "string", default: "5" } },
  });
  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("--count must be 1..100");

  if (/^CHANNEL_SECRETS=.+$/m.test(readFileSync(".env", "utf8"))) {
    throw new Error("CHANNEL_SECRETS is already set in .env; remove it first to create a new pool");
  }

  const sponsor = sponsorKeypair();
  const channels = Array.from({ length: count }, () => Keypair.random());
  const builder = new TransactionBuilder(await horizon().loadAccount(sponsor.publicKey()), {
    fee: "200",
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(60);
  for (const channel of channels) {
    builder.addOperation(
      Operation.createAccount({ destination: channel.publicKey(), startingBalance: Number(values.xlm).toFixed(7) }),
    );
  }
  const tx = builder.build();
  tx.sign(sponsor);
  const result = await horizon().submitTransaction(tx);

  // An empty CHANNEL_SECRETS= line from .env.example would shadow ours.
  writeFileSync(".env", readFileSync(".env", "utf8").replace(/^CHANNEL_SECRETS=\s*$/m, ""));
  appendFileSync(".env", `\nCHANNEL_SECRETS=${channels.map((c) => c.secret()).join(",")}\n`);

  console.log(`Created ${count} channels (${values.xlm} XLM each), tx ${result.hash}`);
  console.log("Public keys:", channels.map((c) => c.publicKey()).join(" "));
}

main().catch((error) => {
  console.error(error?.response?.data?.extras?.result_codes ?? error);
  process.exit(1);
});
