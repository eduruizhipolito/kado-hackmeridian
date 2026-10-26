# SPEC.md

> What to build, and how to check it works. This file is the scope.
> Anything not here goes to "Backlog" at the bottom, not into the code.

## Demo path (the only thing that must work)

1. The organizer generates a batch of N Kadós for an event: fixed amount in XLM,
   shown as a USD value, with an expiration date.
2. The organizer gets printable codes / links (CSV is enough).
3. The attendee opens `/k/<code>` on a phone (or types the code on `/`).
4. They see a **closed** Kadó. The amount is not shown.
5. They tap **Open**. In one transaction their account is created and funded.
6. The Kadó opens and shows the amount in USD. A link "View receipt" opens the
   **account** page in stellar.expert (testnet).
7. The organizer sees a panel: generated, opened, open rate, seconds to open.

Everything else is secondary.

## Stack

- Next.js (App Router) on Vercel, TypeScript, Tailwind.
- `@stellar/stellar-sdk`, Horizon testnet.
- No database. State lives on-chain (see "Why no database").

## Stellar facts (each one has a source)

**F1. A claimable balance can target a public key whose account does not exist.**
Source: CAP-23; validated on testnet in prior work (tx `916372…`, see THESIS.md).

**F2. Opening is one transaction, three signatures.** The tx source is a
**channel account** from a pool: it pays the fee and supplies the sequence
number, because the attendee has no XLM and the sponsor alone would serialize
every open. The sponsor still sponsors the reserves as the source of ops 1–2.
Source: CAP-33, prior validation `d3e637…` (sponsor as tx source, 2 signatures);
channel variant validated on testnet in #4, tx `06d77fdc…620c` (channel source,
4 ops, 3 signatures).

```
tx source: channel                 signs: channel, sponsor, attendee
1. beginSponsoringFutureReserves  source: sponsor   sponsoredId: attendee
2. createAccount startingBalance=0 source: sponsor
3. endSponsoringFutureReserves    source: attendee
4. claimClaimableBalance          source: attendee
```

`startingBalance: "0"` is only valid because the account is sponsored.

**F3. With an issued asset, `changeTrust` goes inside the sponsorship sandwich,
before the claim** (otherwise its 0.5 XLM reserve falls on the attendee, who has
zero). Prior validation `35a50e…`.

```
1. beginSponsoringFutureReserves  source: sponsor   sponsoredId: attendee
2. createAccount startingBalance=0 source: sponsor
3. changeTrust                     source: attendee
4. endSponsoringFutureReserves     source: attendee
5. claimClaimableBalance           source: attendee
```

**F3b. "My Kadó": a later Kadó lands in the first one's account.** The browser
remembers the first Kadó opened in it (local storage, per browser). Opening
another Kadó in that browser adds a 5th operation to the same transaction:

```
5. payment  source: new Kadó  destination: My Kadó account  amount: the gift
```

The new account ends at 0 XLM (its reserve stays sponsored). `accountMerge`
would also return the reserve, but Stellar rejects merging an account created
in the same ledger (`ACCOUNT_MERGE_SEQNUM_TOO_FAR`: a new account's sequence
starts at ledger << 32), so it can't be in the same atomic tx. The payment
keeps everything in one transaction.

**F4. The transaction is atomic.** If any op fails, the account is not created.
So opening is idempotent: retry is safe, double delivery is impossible.

**F5. Reserve cost.** Base reserve 0.5 XLM. Account = 2 reserves, trustline = 1.
A generated, unopened Kadó (claimable balance with 2 claimants) also locks
2 reserves. Budget **1.0 XLM per Kadó** (1.5 with an issued asset), locked in the
sponsor, not spent. Fees are noise (~0.00001 XLM per op).
Testnet evidence: tx `df0344ba…82b4` created 3 two-claimant balances and the
sponsor's `num_sponsoring` went to 6 (one reserve per claimant).

**F6. With an issued asset the attendee ends with 0 XLM** and cannot pay any
future fee. For the hackathon, deliver **XLM** and show its USD equivalent.

**F7. Horizon, not RPC.** We need `claimableBalances().claimant(pk)` (find the
Kadó from the code) and `accounts().sponsor(pk)` (list attendees). RPC has no
indexed search over classic data and keeps 7 days only. Source: Stellar docs;
re-check with Raven MCP.

**F8. `submitTransaction` is synchronous** (~5 s until ledger close). Horizon's
`/transactions` returns 200, 400 or a 504 timeout, after which the client must
poll the hash (Stellar docs, Horizon error handling). With Fluid compute, Vercel's
default function duration is 300 s (Vercel docs, Aug 2026); the open route sets
`maxDuration = 60` as a cap.

**F9. Protocol 29 (current testnet) introduces no new CAPs** (Stellar docs,
software versions). Next testnet reset: 16 Dec 2026 (Stellar docs, networks).

## Design decisions

- **Code → keypair.** Each Kadó has a 12-char code (Crockford base32, ~60 bits),
  shown as `XXXX-XXXX-XXXX`. The keypair is derived with scrypt(code, salt) on the
  server. The salt is an env var; changing it invalidates every code.
- **Two claimants per balance:** the Kadó keypair with
  `beforeAbsoluteTime(expiration)`, and the organizer with the negation.
- **Exchange rate is frozen at generation**, never at opening, so everyone in the
  room sees the same `$2.00`. It lives in a public batch manifest
  (`batches/<id>.json`, no secrets). The codes CSV is **never** committed.
- **The receipt points to the account page**, not the transaction page: the tx
  page lists operations (amount shows as 0), the account page shows the balance.
- **Time to open** is read from the `created_at` of the `claim_claimable_balance`
  operation, not from the account's `last_modified_time` (which changes when the
  user moves funds).
- **Reads are retried** with exponential backoff + jitter (40 people opening in
  the same minute from one Vercel IP). **Submits are not retried blindly**: on a
  lost response, re-read state first.
- **Delivery-channel independent:** a direct link, a QR or a typed code reach the
  same opening flow.
- **One Stellar account** is sponsor, claimable-balance creator and recovery
  claimant. Its secret lives in Vercel env vars.
- **Exchange rate** is passed to the batch CLI (`--usd-per-xlm`), not fetched.
- **The manifest lists each Kadó public key** and the expiration, so the app can
  tell "expired" from "doesn't exist" after a sweep. Kadó state:
  account exists → opened; balance exists and now < expiration → closed;
  balance exists and now ≥ expiration → expired; neither, but the public key is
  in a manifest → expired; otherwise → not found.
- **Concurrent opens:** each open picks a random channel account
  (`CHANNEL_SECRETS`, ~20, created by `scripts/create-channels.ts`) as tx source.
  Tested on testnet (#4): with the sponsor as the only source, two simultaneous
  opens made Horizon's synchronous submit hang ~60 s and return 504. So opens go
  through **`/transactions_async`**: `PENDING` → poll the hash until it lands;
  `TRY_AGAIN_LATER` or `ERROR` (not applied, e.g. two opens picked the same
  channel) → re-read state, then retry on a different channel (max 3).
  On any lost response: re-read state, never resubmit blindly.
- **Open transactions carry 30 s timebounds**, so a re-read after they expire is
  conclusive.
- **`/` is the landing hero and the code entry (P0) in one screen.**
- **My Kadó is per browser.** The first Kadó opened (or an opened Kadó's link
  visited) in a browser with no My Kadó becomes it; its code is kept in local
  storage. Later Kadós opened there go into its account (F3b), and P4 always
  shows My Kadó. Another browser or an incognito window is another person.
  Kadós received = the first Kadó's own claim + payments into the account from
  accounts in a batch manifest, read from Horizon.
- **Panel time to open** = `created_at` of the claim operation − batch `created_at`.
  Openings are read from the sponsor's operations: each open tx has the sponsor's
  `beginSponsoringFutureReserves` for the Kadó key, in the same tx (same
  `created_at`) as the claim. One paginated read instead of one per account.

### Why no database

The code finds its claimable balance in Horizon. Every number in the panel is
verifiable on-chain. Fewer moving parts on bad event wifi.

## Screens

| # | Screen | Notes |
|---|---|---|
| P0 | Code entry (`/`) | Logo here. Input `XXXX-XXXX-XXXX` |
| P1 | Kadó closed | Amount hidden. One button: Open |
| P2 | Opening | Linear progress bar, not a spinner (~5 s) |
| P3 | Kadó open | Amount in USD, big. "It's yours." |
| P4 | Your balance | Live balance of My Kadó, list of Kadós received (amount, date), "View receipt", "Save this link to come back" |
| P5 | Errors | Code doesn't exist / Already opened / Expired |
| P6 | Organizer panel (`/panel`) | Per-batch metrics + CSV export |

## Issues (one branch + one PR each)

1. Project scaffold, env vars, `.env.example`, README skeleton.
2. Stellar lib: config, Horizon client with retry, code → keypair derivation.
3. Batch generator CLI: keypairs, claimable balances, manifest JSON, codes CSV.
4. Open API route: builds and submits the F2 transaction; idempotent.
5. Attendee flow P0 to P5.
6. Organizer panel P6 + CSV export, all from chain.
7. Deploy to Vercel + testnet demo batch + README demo codes.
8. Landing hero (same one-liner) + demo video.

**Stretch (only if 1 to 7 are done and a mentor agrees):**

9. Off-ramp demo via the Stellar test anchor (SEP-24 on testnet): from P4,
   "Cash out" opens the anchor's interactive flow. Requires an issued asset
   (anchor's test asset) and therefore F3 + F6. Re-evaluate the track.

## Acceptance criteria

1. An attendee with no previous account opens a Kadó on a phone in under a minute.
2. The account is verifiable in stellar.expert by a non-technical person.
3. The amount stays hidden until opening.
4. The organizer can recover unopened Kadós after expiration (predicate in place;
   the sweep can be manual for the demo).
5. The panel exports the pilot metrics.
6. No secret key or codes CSV in git.

## Known limitations (declare them in the README)

- **Bearer:** whoever has the code opens the Kadó. Acceptable in a controlled room.
- **Custody window** between deposit and opening. Can shrink, cannot disappear.
- **Custody continues after opening:** the account key is derived from the code
  and a server salt, so the operator can still sign for the account.
- **The USD amount is the value at generation.** The asset is XLM; its USD value
  moves after that.
- **Griefing:** the Kadó public key is public on-chain. If someone creates that
  account first, the Kadó can't be opened; the organizer recovers it after expiry.
- **The panel is public** (read-only, all data is on-chain).
- **My Kadó lives in one browser.** Clearing its data or changing device loses
  the link (the codes still open their accounts).
- **Hidden amount is UI only**: it is public on-chain.
- **The sponsor is critical infrastructure:** if it runs out of XLM, every opening
  fails. Monitor its balance.
- **No off-ramp** yet (unless stretch 9 ships).

## Backlog (out of scope for the hackathon)

- Person-to-person Kadós by link; embedded non-custodial wallet (Privy or Pollar
  candidates): login-based My Kadó that works across devices, email route.
- Merge the emptied Kadó accounts later to return their reserves to the sponsor.
- Multiple assets, variable amounts.
- Send / Receive from the balance screen (needs sponsor fee-bump).
- Automatic expiration sweep job.
- Printable QR sheet.
- Third-party Horizon provider for mainnet (SDF lists only testnet and futurenet
  Horizon instances).
- Non-custodial key after opening (attendee-held key or passkey).

## Discarded (do not re-propose)

DeFi or yield inside the opening flow, float as revenue, merchant network,
custodial wallets, native app.
