import type { Metadata } from "next";
import { formatDuration, getPanelMetrics } from "@/lib/panel";

export const metadata: Metadata = { title: "Kadó · Organizer panel" };

// Always fresh from chain (lib/panel.ts caches Horizon reads for 30 s).
export const dynamic = "force-dynamic";

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function day(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

// P6: per-batch metrics, everything read from chain. Public and read-only.
export default async function PanelPage() {
  const batches = await getPanelMetrics();
  const total = batches.reduce(
    (sum, b) => ({ generated: sum.generated + b.generated, opened: sum.opened + b.opened }),
    { generated: 0, opened: 0 },
  );

  return (
    <main className="min-h-dvh bg-inside px-4 py-10 text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Organizer panel</h1>
          <p className="text-muted">
            Every number is read from the Stellar test network. Time to open = opening transaction − batch creation.
          </p>
        </header>

        <dl className="grid grid-cols-3 gap-4 border-y-2 border-ink py-6">
          <div>
            <dt className="text-sm font-bold text-muted">Generated</dt>
            <dd className="text-3xl font-extrabold tracking-tight">{total.generated}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-muted">Opened</dt>
            <dd className="text-3xl font-extrabold tracking-tight">{total.opened}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-muted">Open rate</dt>
            <dd className="text-3xl font-extrabold tracking-tight">
              {total.generated ? percent(total.opened / total.generated) : "—"}
            </dd>
          </div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink text-sm text-muted">
                <th className="py-2 pr-4 font-bold">Batch</th>
                <th className="py-2 pr-4 font-bold">Created</th>
                <th className="py-2 pr-4 font-bold">Amount</th>
                <th className="py-2 pr-4 text-right font-bold">Generated</th>
                <th className="py-2 pr-4 text-right font-bold">Opened</th>
                <th className="py-2 pr-4 text-right font-bold">Open rate</th>
                <th className="py-2 text-right font-bold">Median time to open</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-muted/40">
                  <td className="py-3 pr-4">
                    <span className="font-bold">{b.label}</span>
                    <span className="block text-sm text-muted">{b.id}</span>
                  </td>
                  <td className="py-3 pr-4 text-sm">{day(b.createdAt)}</td>
                  <td className="py-3 pr-4">${b.amountUsd}</td>
                  <td className="py-3 pr-4 text-right">{b.generated}</td>
                  <td className="py-3 pr-4 text-right">{b.opened}</td>
                  <td className="py-3 pr-4 text-right font-bold">{percent(b.openRate)}</td>
                  <td className="py-3 text-right">{formatDuration(b.medianSecondsToOpen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <a href="/api/panel/csv" className="self-start bg-ink px-6 py-3 font-bold text-inside">
          Download metrics (CSV)
        </a>
      </div>
    </main>
  );
}
