import { peekKado } from "@/lib/stellar/open";

// State of a Kadó. The amount is only included once it is opened.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return Response.json(await peekKado(code));
}
