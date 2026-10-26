import { CodeEntry } from "./code-entry";
import { Logo } from "./logo";

const REPO_URL = "https://github.com/eduruizhipolito/kado-hackmeridian";
const DEMO_CODES_URL = `${REPO_URL}#try-it-judges`;
const OPEN_TX_URL =
  "https://stellar.expert/explorer/testnet/tx/c314a657c51086b93aebec6f73705e4b9cdb248b7cca1f453bcf32880edae79d";

const STEPS = [
  { title: "Get a code", body: "From a QR, a link or a printed card at the event." },
  { title: "Tap Open", body: "No app to install, no seed phrase, no fee to pay." },
  { title: "It's yours", body: "Your own Stellar account, with real funds, in about five seconds." },
];

const FEATURES = [
  {
    title: "Claimable balances",
    tag: "CAP-23",
    body: "Funds wait on-chain for an account that doesn't exist yet. Unopened Kadós return to the organizer.",
  },
  {
    title: "Sponsored reserves",
    tag: "CAP-33",
    body: "The organizer covers the new account's reserve, so it starts with zero and the gift arrives whole.",
  },
  {
    title: "One atomic transaction",
    tag: "No smart contract",
    body: "The account is created and the Kadó opens together, or nothing happens. Retrying is always safe.",
  },
];

// Landing hero + P0 code entry on one screen (SPEC.md, DESIGN.md).
export default function Home() {
  return (
    <main>
      <section className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12 text-center">
        <Logo size={112} />
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight md:text-5xl">
            Gift digital dollars to anyone, no wallet needed.
          </h1>
          <p className="text-lg">Type your code, tap Open, and the gift is yours.</p>
        </div>
        <CodeEntry />
        <a href={DEMO_CODES_URL} className="font-bold underline underline-offset-4">
          Try the demo: get a code
        </a>
      </section>

      <section className="bg-inside px-4 py-16 text-ink">
        <div className="mx-auto flex max-w-4xl flex-col gap-10">
          <h2 className="text-2xl font-extrabold tracking-tight">How it works</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-lid">{i + 1}</span>
                <span className="text-xl font-bold">{step.title}</span>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t-2 border-ink bg-inside px-4 py-16 text-ink">
        <div className="mx-auto flex max-w-4xl flex-col gap-10">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight">Built on Stellar&apos;s native features</h2>
            <p className="text-muted">Two protocol features do the whole job.</p>
          </div>
          <ul className="grid gap-8 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex flex-col gap-2 border-l-4 border-lid pl-4">
                <span className="text-sm font-bold text-muted">{feature.tag}</span>
                <span className="text-xl font-bold">{feature.title}</span>
                <span>{feature.body}</span>
              </li>
            ))}
          </ul>
          <a href={OPEN_TX_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-4">
            See a real opening on the explorer
          </a>
        </div>
      </section>

      <footer className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm">
        <p>Running on the Stellar test network. Built for HackMeridian.</p>
        <a href={REPO_URL} className="underline underline-offset-4">
          Source code
        </a>
      </footer>
    </main>
  );
}
