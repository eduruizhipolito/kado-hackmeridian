import type { Horizon } from "@stellar/stellar-sdk";
import { horizon } from "./stellar/config";
import { orNull, withRetry } from "./stellar/horizon";

export type KadoState =
  | { state: "closed"; balanceId: string; amountXlm: string; expiresAt: Date }
  | { state: "opened"; account: string; balanceXlm: string }
  | { state: "expired" }
  | { state: "not_found" };

/** Public keys of every generated Kadó (from the batch manifests, #3). */
export type KnownKeys = { has(publicKey: string): boolean };

type Predicate = Horizon.HorizonApi.Predicate;

/** The `beforeAbsoluteTime` deadline in the Kadó claimant's predicate. */
function deadline(predicate: Predicate): Date | null {
  if (predicate.abs_before) return new Date(predicate.abs_before);
  if (predicate.abs_before_epoch) return new Date(Number(predicate.abs_before_epoch) * 1000);
  return null;
}

/**
 * Kadó state, all from chain (SPEC.md "Design decisions"):
 *   account exists                         → opened
 *   balance exists and now < expiration    → closed
 *   balance exists and now ≥ expiration    → expired
 *   neither, but the key is in a manifest  → expired (swept by the organizer)
 *   otherwise                              → not found
 */
export async function getKadoState(
  publicKey: string,
  known: KnownKeys,
  now = new Date(),
): Promise<KadoState> {
  const server = horizon();

  const [account, balances] = await Promise.all([
    orNull(() => server.loadAccount(publicKey)),
    withRetry(() => server.claimableBalances().claimant(publicKey).limit(10).call()),
  ]);

  if (account) {
    const balanceXlm = account.balances.find((b) => b.asset_type === "native")?.balance ?? "0";
    return { state: "opened", account: publicKey, balanceXlm };
  }

  for (const balance of balances.records) {
    if (balance.asset !== "native") continue;
    const claimant = balance.claimants.find((c) => c.destination === publicKey);
    const expiresAt = claimant && deadline(claimant.predicate);
    if (!expiresAt) continue;
    if (now >= expiresAt) return { state: "expired" };
    return { state: "closed", balanceId: balance.id, amountXlm: balance.amount, expiresAt };
  }

  return known.has(publicKey) ? { state: "expired" } : { state: "not_found" };
}
