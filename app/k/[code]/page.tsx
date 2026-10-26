import { peekKado } from "@/lib/stellar/open";
import { Kado } from "./kado";

export default async function KadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const initial = await peekKado(decodeURIComponent(code));
  return <Kado code={decodeURIComponent(code)} initial={initial} />;
}
