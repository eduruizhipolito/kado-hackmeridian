// Funds the sponsor from SPONSOR_SECRET with Friendbot (testnet only).
// Run: npm run fund-sponsor
import { horizon, sponsorKeypair } from "../lib/stellar/config";
import { orNull } from "../lib/stellar/horizon";

async function main() {
  const sponsor = sponsorKeypair().publicKey();
  const existing = await orNull(() => horizon().loadAccount(sponsor));
  if (existing) {
    const xlm = existing.balances.find((b) => b.asset_type === "native")?.balance;
    console.log(`Sponsor ${sponsor} already exists with ${xlm} XLM.`);
    return;
  }

  const response = await fetch(`https://friendbot.stellar.org?addr=${sponsor}`);
  if (!response.ok) throw new Error(`Friendbot ${response.status}: ${await response.text()}`);
  const { hash } = (await response.json()) as { hash: string };
  console.log(`Funded sponsor ${sponsor} (tx ${hash}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
