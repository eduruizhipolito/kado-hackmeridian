import { getPanelMetrics } from "@/lib/panel";

export const dynamic = "force-dynamic";

const HEADER = [
  "batch_id",
  "batch_label",
  "batch_created_at",
  "batch_expires_at",
  "amount_usd",
  "public_key",
  "opened",
  "opened_at",
  "seconds_to_open",
];

// Pilot metrics, one row per Kadó. Public keys only: no codes, no secrets.
export async function GET() {
  const rows = (await getPanelMetrics()).flatMap((b) =>
    b.kados.map((k) => [
      b.id,
      b.label,
      b.createdAt,
      b.expiresAt,
      b.amountUsd,
      k.publicKey,
      k.openedAt ? "yes" : "no",
      k.openedAt ?? "",
      k.secondsToOpen ?? "",
    ]),
  );
  const csv = [HEADER, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="kado-metrics-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
