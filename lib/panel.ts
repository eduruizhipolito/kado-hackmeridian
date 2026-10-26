import type { Horizon } from "@stellar/stellar-sdk";
import { loadManifests, type Manifest } from "./manifest";
import { horizon } from "./stellar/config";
import { withRetry } from "./stellar/horizon";

export type KadoRow = { publicKey: string; openedAt: string | null; secondsToOpen: number | null };

export type BatchMetrics = {
  id: string;
  label: string;
  createdAt: string;
  expiresAt: string;
  amountUsd: string;
  generated: number;
  opened: number;
  openRate: number; // 0..1
  medianSecondsToOpen: number | null;
  kados: KadoRow[];
};

const CACHE_MS = 30_000; // Horizon allows 3600 req/h per IP (SPEC F7 notes)
const MAX_PAGES = 20;

let cache: { at: number; value: BatchMetrics[] } | undefined;

/**
 * Every opening, from chain: each open tx starts with the sponsor's
 * beginSponsoringFutureReserves for the Kadó key. It shares the tx (and the
 * created_at) of the claim operation, so its time is the opening time.
 */
async function openingsBySponsor(sponsor: string): Promise<Map<string, string>> {
  const openedAt = new Map<string, string>();
  let page = await withRetry(() => horizon().operations().forAccount(sponsor).order("asc").limit(200).call());
  for (let i = 0; i < MAX_PAGES && page.records.length > 0; i++) {
    for (const op of page.records) {
      if (op.type === "begin_sponsoring_future_reserves" && op.source_account === sponsor) {
        const { sponsored_id } = op as Horizon.ServerApi.BeginSponsoringFutureReservesOperationRecord;
        openedAt.set(sponsored_id, op.created_at);
      }
    }
    if (page.records.length < 200) break;
    const current = page;
    page = await withRetry(() => current.next());
  }
  return openedAt;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function metricsFor(manifest: Manifest, openedAt: Map<string, string>): BatchMetrics {
  const created = new Date(manifest.createdAt).getTime();
  const kados = manifest.kados.map(({ publicKey }) => {
    const at = openedAt.get(publicKey) ?? null;
    return {
      publicKey,
      openedAt: at,
      secondsToOpen: at ? Math.max(0, Math.round((new Date(at).getTime() - created) / 1000)) : null,
    };
  });
  const seconds = kados.flatMap((k) => (k.secondsToOpen === null ? [] : [k.secondsToOpen]));
  return {
    id: manifest.id,
    label: manifest.label,
    createdAt: manifest.createdAt,
    expiresAt: manifest.expiresAt,
    amountUsd: manifest.amountUsd,
    generated: kados.length,
    opened: seconds.length,
    openRate: kados.length ? seconds.length / kados.length : 0,
    medianSecondsToOpen: median(seconds),
    kados,
  };
}

/** Per-batch pilot metrics, newest batch first. Cached 30 s per instance. */
export async function getPanelMetrics(): Promise<BatchMetrics[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const manifests = loadManifests();
  const sponsors = [...new Set(manifests.map((m) => m.sponsor))];
  const openings = new Map<string, string>();
  for (const sponsor of sponsors) {
    for (const [key, at] of await openingsBySponsor(sponsor)) openings.set(key, at);
  }

  const value = manifests
    .map((m) => metricsFor(m, openings))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  cache = { at: Date.now(), value };
  return value;
}

/** "4 min 12 s", "2 h 05 min", "3 d 4 h". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")} min`;
  return `${Math.floor(seconds / 86_400)} d ${Math.floor((seconds % 86_400) / 3600)} h`;
}
