import { CodeEntry } from "./code-entry";
import { Logo } from "./logo";

// P0. The landing hero around it comes in #8.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <Logo size={112} />
      <h1 className="max-w-sm text-3xl leading-tight font-extrabold tracking-tight">
        Gift digital dollars to anyone, no wallet needed.
      </h1>
      <CodeEntry />
    </main>
  );
}
