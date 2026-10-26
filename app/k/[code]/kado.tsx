"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { accountUrl } from "@/lib/code-format";
import { getMyKado, setMyKado } from "@/lib/my-kado";
import type { OpenResult } from "@/lib/stellar/open";

type Opened = Extract<OpenResult, { state: "opened" }>;
type View =
  | { step: "closed"; retry?: boolean } // P1
  | { step: "opening" } // P2
  | { step: "revealed"; kado: Opened } // P3
  | { step: "balance"; kado: Opened; alreadyOpened: boolean } // P4
  | { step: "error"; reason: "not_found" | "expired" }; // P5

function initialView(initial: OpenResult): View {
  switch (initial.state) {
    case "opened":
      return { step: "balance", kado: initial, alreadyOpened: true };
    case "expired":
    case "not_found":
      return { step: "error", reason: initial.state };
    default:
      return { step: "closed" };
  }
}

export function Kado({ code, initial }: { code: string; initial: OpenResult }) {
  const [view, setView] = useState<View>(() => initialView(initial));

  async function open() {
    setView({ step: "opening" });
    try {
      const response = await fetch("/api/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // A later Kadó in this browser lands in My Kadó's account (SPEC F3b).
        body: JSON.stringify({ code, into: getMyKado() ?? undefined }),
      });
      const result = (await response.json()) as OpenResult;
      if (result.state === "opened") {
        if (!result.addedToMyKado) setMyKado(code);
        setView({ step: "revealed", kado: result });
      }
      else if (result.state === "expired" || result.state === "not_found") setView({ step: "error", reason: result.state });
      else setView({ step: "closed", retry: true });
    } catch {
      setView({ step: "closed", retry: true }); // bad wifi: opening is safe to retry
    }
  }

  if (view.step === "error") return <ErrorScreen reason={view.reason} />;
  if (view.step === "balance") return <Balance code={code} kado={view.kado} alreadyOpened={view.alreadyOpened} />;

  const revealed = view.step === "revealed";
  return (
    <main className="relative h-dvh overflow-hidden bg-inside text-ink">
      {/* P3: the inside of the box */}
      <section className={`flex h-full flex-col items-center justify-center gap-6 px-4 text-center ${revealed ? "kado-appear" : "invisible"}`}>
        {revealed && (
          <>
            <p className="kado-amount">{view.kado.amountUsd ? `$${view.kado.amountUsd}` : "Your Kadó"}</p>
            <p className="text-2xl font-bold">It&apos;s yours.</p>
            <button
              onClick={() => setView({ step: "balance", kado: view.kado, alreadyOpened: false })}
              className="mt-4 bg-ink px-8 py-4 text-lg font-bold text-inside"
            >
              Continue
            </button>
          </>
        )}
      </section>

      {/* P1 / P2: the lid */}
      <section className={`absolute inset-0 flex flex-col bg-lid text-inside ${revealed ? "kado-lid-up" : ""}`}>
        <div className="flex flex-[11] flex-col items-center justify-end px-4 pb-10 text-center">
          <p className="max-w-xs text-3xl leading-tight font-extrabold tracking-tight">The event left you a Kadó.</p>
        </div>
        <div className="relative h-1 bg-inside/30">
          {view.step === "opening" && <div className="kado-seam absolute inset-0 origin-left bg-seam" />}
        </div>
        <div className="flex flex-[9] flex-col items-center justify-start gap-4 px-4 pt-10 text-center">
          {view.step === "closed" && (
            <>
              <button onClick={open} className="w-full max-w-xs bg-seam px-4 py-4 text-lg font-bold text-ink">
                Open
              </button>
              {view.retry && <p className="max-w-xs">We couldn&apos;t confirm it yet. Tap Open again.</p>}
            </>
          )}
          {view.step === "opening" && <p className="text-lg font-bold">Opening…</p>}
        </div>
      </section>
    </main>
  );
}

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/**
 * P4: where this code's money is, live from chain. A Kadó added to another
 * one resolves to that account (the server follows the payment, F3b).
 */
function Balance({ code, kado, alreadyOpened }: { code: string; kado: Opened; alreadyOpened: boolean }) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState(kado);
  const link = typeof window === "undefined" ? "" : window.location.href;

  useEffect(() => {
    fetch(`/api/kado/${encodeURIComponent(code)}`)
      .then((response) => response.json() as Promise<OpenResult>)
      .then((result) => {
        if (result.state !== "opened") return;
        setView(result);
        // A browser with no My Kadó adopts a Kadó that holds its own gift.
        if (!result.addedToMyKado) setMyKado(code);
      })
      .catch(() => {}); // keep what we have; the receipt link is always live
  }, [code]);

  const { account, balanceUsd, receipts } = view;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-inside px-4 py-10 text-center text-ink">
      {view.addedToMyKado && !alreadyOpened && <p className="font-bold text-confirmed">Added to your balance.</p>}
      {alreadyOpened && <p className="text-muted">This Kadó was already opened.</p>}
      <p className="font-bold">Your balance</p>
      <p className="kado-amount">{balanceUsd === undefined ? "…" : balanceUsd ? `≈ $${balanceUsd}` : "—"}</p>
      {receipts && receipts.length > 0 && (
        <div className="w-full max-w-xs text-left">
          <p className="mb-2 text-sm font-bold text-muted">
            {receipts.length === 1 ? "1 Kadó received" : `${receipts.length} Kadós received`}
          </p>
          <ul className="border-t border-muted/40">
            {receipts.map((receipt, i) => (
              <li key={i} className="flex justify-between border-b border-muted/40 py-2">
                <span>{when(receipt.at)}</span>
                <span className="font-bold">{receipt.amountUsd ? `$${receipt.amountUsd}` : "Kadó"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <a
        href={accountUrl(account)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-xs bg-ink px-4 py-4 text-lg font-bold text-inside"
      >
        View receipt
      </a>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <p>Save this link to come back.</p>
        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(link);
            setCopied(true);
          }}
          className="w-full border-2 border-ink px-4 py-3 font-bold"
        >
          {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </main>
  );
}

function ErrorScreen({ reason }: { reason: "not_found" | "expired" }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="max-w-xs text-2xl leading-tight font-bold">
        {reason === "expired" ? "This Kadó expired." : "We can't find that code. Check it and try again."}
      </p>
      <Link href="/" className="font-bold underline underline-offset-4">
        Try another code
      </Link>
    </main>
  );
}
