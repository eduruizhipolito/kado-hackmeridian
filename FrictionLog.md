# Kadó: Stellar friction log

HackMeridian 2026, Genesis, thematic track Stellar Unlocked.
Live demo on testnet: https://kado-hackmeridian.vercel.app

**How to read the time costs.** They are wall-clock minutes taken from session
and commit timestamps (UTC, 26 Oct 2026). I built this with an AI coding agent
(Claude Code), so they are much shorter than the same work would take by hand.
The cost that matters more is often the design change, not the minutes.

**How the docs claims were checked.** Every statement below about what the
Stellar docs say was re-checked on 5 Nov 2026 through Raven. Doing that removed
two items I would otherwise have blamed on the docs: both were my mistakes, and
they are labelled as such.

## What we built

Kadó lets an event gift funds to people who have no wallet. The organizer
generates a batch of codes. An attendee opens a link on a phone, taps **Open**,
and in one atomic transaction gets their own funded Stellar account: no app, no
seed phrase, no fee.

- **Generation:** one claimable balance per code, aimed at a public key whose
  account does not exist yet. A second claimant returns unopened gifts to the
  organizer after expiry.
- **Opening:** one transaction with 4 operations and 3 signatures:
  `beginSponsoringFutureReserves`, `createAccount` (starting balance 0),
  `endSponsoringFutureReserves`, `claimClaimableBalance`. A later gift opened in
  the same browser adds a 5th operation, a `payment` into the first account.
- **Concurrency:** a pool of 20 channel accounts, submitted through Horizon's
  `/transactions_async`.
- **No database:** every state and panel metric is read from Horizon.

Timeline: specs on 25 Oct, planning from 00:13 UTC on 26 Oct, the core build
(issues #1 to #8) between 01:05 and 02:16, then the live balance, My Kadó and
submission work until about 12:00. In total: 72 gifts across 12 testnet batches,
30 of them for the judges.

## Stellar tools used

| Tool | How we used it |
|---|---|
| **Classic protocol: claimable balances (CAP-23), sponsored reserves (CAP-33)** | The whole product. No smart contract. |
| **`@stellar/stellar-sdk` 17.2.1** | Everything on-chain: building and signing transactions, Horizon reads, async submit. Used from the Next.js API routes and the CLI scripts. |
| **Horizon testnet** | All reads, plus submission. Filters used: `claimable_balances?claimant=` and operations for an account. |
| **Friendbot** | Funded the sponsor once (10,000 testnet XLM) from `scripts/fund-sponsor.ts`. |
| **Raven MCP** | Checked the spec's Stellar facts during planning, in 1 search and 3 execute calls. It confirmed protocol 29 adds no new CAPs, the next testnet reset date, the Horizon rate limit, and that a claimable balance has no recovery path if no predicate can be met. |
| **Stellar dev skills** (`assets`, `data`, `dapp`, `standards`) | Installed in the repo. Honestly, light use: the transcripts show one targeted search across them, not regular use. |
| **stellar.expert (testnet)** | The receipt link shown to attendees, and our on-chain evidence. |

**Not used:** Soroban, Stellar CLI, Freighter or Stellar Wallets Kit, Stellar
RPC. Soroban and wallets were not needed: requiring a wallet install would have
contradicted "no wallet needed". RPC was ruled out because it has no indexed
search by claimant or sponsor and keeps 7 days by default. We checked that the
SEP-24 test anchor was live, then cut the off-ramp for time. We read the Pollar
docs for an embedded wallet and left it for the roadmap.

## Main points of friction

### 1. Concurrent opens: three failures in a row

**Cost: about 15 minutes (01:23 to 01:37), 14 test gifts, and a change of
architecture.** This was the biggest technical problem.

**a. Synchronous submit hung instead of failing fast (about 5 minutes).** My plan
used the sponsor as the source of every open, and retried on `tx_bad_seq`. The
channel accounts guide says out-of-order transactions "bounce with a bad sequence
error", so I expected a quick failure and planned for a worst case of 10 to 15
seconds. On testnet, two simultaneous opens on the same sequence number gave no
quick error: Horizon held the second one about 60 s and returned a 504, and the
attendee waited about 70 s for a "try again". Nothing was lost or delivered twice.

- *Workaround:* the channel pool, plus `/transactions_async`.
- *My mistake, not Stellar's:* the docs have a
  [channel accounts guide](https://developers.stellar.org/docs/build/guides/transactions/channel-accounts),
  and I put the pool in the backlog to save an hour. The error handling docs do
  mention the 504. What they did not prepare me for is that a same-sequence
  collision can cost a full minute.

**b. `/transactions_async` reported a busy channel as an HTTP error (about 2
minutes).** The
[error handling page](https://developers.stellar.org/docs/data/apis/horizon/api-reference/errors/error-handling#async-transaction-submission)
describes acting on the `tx_status` returned, including `TRY_AGAIN_LATER`, so I
wrote a branch on that field. On a collision we got HTTP 503 instead, and the SDK
rejects any non-2xx response, so `submitAsyncTransaction` threw and my branch
never ran. My code treated the throw as a lost response and waited out the
timeout: opens took 39 s and 79 s.

- The
  [endpoint reference](https://developers.stellar.org/docs/data/apis/horizon/api-reference/submit-async-transaction)
  describes 503 only as "History DB is stale; core is unavailable for transaction
  submission", which reads like an outage rather than "use another channel".
- The SDK type is `tx_status: string`, so the compiler gave no hint of the possible
  values.
- *Workaround:* catch `NetworkError`, treat 503 and 400 as "not applied", and retry
  at once on another channel.
- *Caveat:* we logged the status code but not the response body. That this 503
  means `TRY_AGAIN_LATER` is my inference, and our code comment states it more
  firmly than the evidence supports.

**c. A retry could stay `PENDING` on a dead sequence number (about 2 minutes).**
A retry on a busy channel got `PENDING` with a stale sequence number, and then sat
out the full timeout: 40 s. *Workaround:* while polling the hash, also read the
channel account and stop as soon as its sequence reaches ours, then re-read chain
state.

**Result:** 5 simultaneous opens across 20 channels landed in 7 s. 3 opens forced
onto 2 channels landed in 8 s. We never tested at the 40-person scale we designed
for.

### 2. Raven MCP sign-in blocked planning

**Cost: about 12 minutes (00:26 to 00:38), and most of it was my own attention.**
Raven needs an interactive sign-in, and `/mcp` is not available in the Claude
desktop app chat. Typing it in the PowerShell panel failed too. What worked was
running the `claude` CLI in the terminal and using `/mcp` there. Even after that
sign-in, the running desktop session kept reporting `needs_auth` for a few minutes.

- *Workaround:* I checked the facts against live Horizon, Vercel's docs and the SDK
  releases in the meantime, then ran the Raven checks once it connected.
- *Fair attribution:* this is mainly client tooling rather than Raven itself, but
  it was the first thing that stopped us.

### 3. stellar-sdk v17 breaking changes, and stale examples

**Cost: about 5 minutes, spread out.** We worked from the GitHub release notes and
the SDK's bundled type files. v17 needs Node 22.12 or later, byte APIs return
`Uint8Array` instead of `Buffer` (so `tx.hash().toString('hex')` breaks), and the
`xdr` API was rewritten. 17.3 and 17.4 shipped during the hackathon week, so we
pinned 17.2.1 rather than take a days-old release on deadline day.

- *Workaround:* `Buffer.from(tx.hash()).toString("hex")`, and getting balance IDs
  from Horizon instead of touching raw XDR.
- *Docs issue:* the JavaScript sample on the async submission section still starts
  with `sdk.Server(...)`, while current code uses `new Horizon.Server(...)`.

### 4. Horizon can't tell "expired" from "never existed"

**Cost: about 15 minutes in total, plus a permanent constraint.**
`claimable_balances?claimant=` returns only unclaimed balances, and a swept balance
is gone. So the chain alone cannot say whether a code is expired or fake, and
there is nowhere on-chain for the USD rate. We kept a "no database" design by
committing public batch manifests to the repo.

- *Consequence:* every new batch needs a redeploy. The first production test opened
  fine but showed no dollar amount, because its batch was created after the deploy.
  That cost 4 redeploys through the day, with the last at about 11:26 on deadline
  day.
- This is a trade-off of my design, not a Stellar bug. A way to query claimable
  balance history by claimant would have removed it.

### 5. `accountMerge` could not fold a new account into the first one

**Cost: a few minutes of redesign, plus a lasting side effect.** For My Kadó I
wanted the new account merged into the first in the same transaction. The docs list
`ACCOUNT_MERGE_SEQNUM_TOO_FAR` as "sequence number is too high", and you have to
derive for yourself that a brand-new account hits this in its creation ledger,
because its sequence starts at `ledger << 32`.

- *Honest note:* we reasoned this out from the docs and **never ran it on-chain**.
- *Workaround:* a `payment` as a 5th operation. It stays atomic, but each emptied
  account keeps a sponsored reserve locked until a later merge, which is still in
  the backlog.

### 6. Smaller items

- **Reserve per claimant (a few minutes):** my Raven pass did not surface the rule
  that each claimant costs one base reserve, so I confirmed it on testnet (the
  sponsor's `num_sponsoring` went to 6 after 3 balances, tx `df0344ba…`). The rule
  **is** in the
  [claimable balances guide](https://developers.stellar.org/docs/build/guides/transactions/claimable-balances).
  A search miss on my side, not a docs gap.
- **Receipts for non-technical people (no time lost here):** from earlier
  prototyping we knew the stellar.expert transaction page reads badly for this flow
  (the amount shows as 0, because the account starts at 0). The receipt links to
  the account page instead.
- **Mainnet path (no time lost yet, open risk):** SDF's docs list public Horizon
  only for testnet and futurenet. Our design depends on Horizon's indexed filters,
  so the mainnet pilot needs a third-party Horizon provider.
- **Rate limit (design time only):** Horizon's default of 3600 requests per hour
  per IP matters when a whole room opens through one server, so we added read
  retries and a 30 s panel cache. This has not been tested with a real crowd.

### Not Stellar, but it slowed us down

- `gh` was not on `PATH` in the open terminal after installing it (about 4 minutes).
- Vercel's GitHub app had no access to the repo, so every deploy was manual, and a
  merged change stayed 404 on the live site until the next deploy.
- A local build failed because the PC was out of memory (about 2 minutes).
- An unrelated deck file slipped into a batch PR (#22). It was harmless and kept.

## What worked well

- **The classic primitives did the hard part.** A claimable balance aimed at an
  account that doesn't exist, plus sponsored reserves, gives wallet-free onboarding
  in one atomic transaction, with no contract to write or audit.
- **Atomicity made retries safe.** Through all of the failures in point 1, no gift
  was lost or delivered twice.
- **Per-operation source accounts** made the channel pool a small change to the
  transaction rather than a rewrite.
- **Batching is cheap:** 30 balances in one transaction, and fees are negligible.
- **Friendbot and testnet were reliable.** Friendbot worked first time, and we hit no
  Horizon testnet outage during the build.
- **Raven was worth the setup.** Official answers in a few calls, including the
  testnet reset date and the "no recovery mechanism" warning that made the
  organizer's reclaim claimant mandatory.
- **The docs were better than I assumed.** Three things I nearly logged as missing
  were there: channel accounts, the per-claimant reserve, and the 504 behaviour.

## What would have made building on Stellar easier

1. **Document the HTTP status for each `tx_status` on `/transactions_async`**, and
   say in the 503 description whether it covers `TRY_AGAIN_LATER`.
2. **Make the SDK's async submit predictable:** a union type for `tx_status`, and
   either return these statuses or document that they throw.
3. **State the sequence collision behaviour:** what a same-sequence submit does on
   synchronous `/transactions`, including the long hang before a 504.
4. **Publish a tested concurrency recipe** for the JS SDK: channel pool, async
   submit, retry on a different channel, and how to detect a dead transaction. A
   gasless, server-signed onboarding example would have saved the most here.
5. **Add a sponsored-onboarding example** showing a claim into a new account, with a
   channel as transaction source and three signers.
6. **Explain `ACCOUNT_MERGE_SEQNUM_TOO_FAR` in plain words**, including that it
   blocks merging an account in the ledger that created it.
7. **Let Horizon query claimable balance history by claimant**, including claimed
   and swept balances, so apps need less off-chain state.
8. **Give a clear mainnet answer for apps needing Horizon's indexed queries:** which
   providers to use, and what replaces those filters on RPC.
9. **Refresh JS samples for SDK v17,** starting with `sdk.Server(...)`, and link a
   migration guide from the docs.
10. **Make Raven's sign-in clearer in desktop clients,** with a short note on what to
    do when `/mcp` isn't available.
