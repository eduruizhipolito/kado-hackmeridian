import { openKado } from "@/lib/stellar/open";

// Submit waits for ledger close (~5 s), plus re-reads after a lost response.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== "string") return Response.json({ error: "code required" }, { status: 400 });
  return Response.json(await openKado(body.code));
}
