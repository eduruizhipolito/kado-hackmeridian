# Kadó

**Gift digital dollars to anyone, no wallet needed.**

<img src="public/brand/logo.svg" alt="Kadó logo" width="96">

**Live demo:** https://kado-hackmeridian.vercel.app (Stellar **testnet**)

HackMeridian · Genesis · thematic track **Stellar Unlocked**: the whole product
runs on two native protocol features, claimable balances (CAP-23) and sponsored
reserves (CAP-33), with no smart contract.

## The problem

Giving digital value to someone without a wallet forces them to become a crypto
user first: install an app, guard a seed phrase, get funds. The gift arrives
after the homework, and almost nobody finishes the homework.

We saw it first hand at outreach events in Peru (meetups, workshops, university
talks): people leave interested, but without a Stellar account and without funds.
Builders already have wallets; the people we want to reach don't.

## What Kadó does

The organizer generates a batch of Kadós for an event. Each attendee gets a code
(link, QR or typed). They open the link, see a **closed** Kadó, tap **Open**, and
in **one transaction** they get their own Stellar account with real funds.
No seed phrase, no app, no email, no fee. The amount stays hidden until the box
opens.

## Try it (judges)

1. Open one of the links below on a phone, or type a code at
   https://kado-hackmeridian.vercel.app.
2. Tap **Open**. In about 5 seconds the Kadó opens and shows the amount.
3. Tap **Continue → View receipt**: it opens the new account on stellar.expert
   (testnet) with its 10 XLM balance, sponsored by our account.

Each code opens **once** (it's a bearer gift). If one says "already opened",
someone got there first: pick another. 30 Kadós of 10 XLM (≈ $2.00 at the
event rate of 0.20 USD/XLM), valid until 25 Nov 2026.

| | | |
|---|---|---|
| [E0H2-56XR-ZAEG](https://kado-hackmeridian.vercel.app/k/E0H2-56XR-ZAEG) | [2QKN-E15V-EA2A](https://kado-hackmeridian.vercel.app/k/2QKN-E15V-EA2A) | [K1M0-F4M2-KE67](https://kado-hackmeridian.vercel.app/k/K1M0-F4M2-KE67) |
| [MH43-YNRP-PFYD](https://kado-hackmeridian.vercel.app/k/MH43-YNRP-PFYD) | [NCZ7-Y2BN-5H8Z](https://kado-hackmeridian.vercel.app/k/NCZ7-Y2BN-5H8Z) | [V3JE-XK4T-Y9DW](https://kado-hackmeridian.vercel.app/k/V3JE-XK4T-Y9DW) |
| [E9JH-M53Z-3BXK](https://kado-hackmeridian.vercel.app/k/E9JH-M53Z-3BXK) | [EC1G-B66E-6XTV](https://kado-hackmeridian.vercel.app/k/EC1G-B66E-6XTV) | [NN0A-HDR7-MYNH](https://kado-hackmeridian.vercel.app/k/NN0A-HDR7-MYNH) |
| [R5TJ-9SZ1-X3PW](https://kado-hackmeridian.vercel.app/k/R5TJ-9SZ1-X3PW) | [HH3H-9QX8-CZXP](https://kado-hackmeridian.vercel.app/k/HH3H-9QX8-CZXP) | [AVB8-WAQ2-WMAS](https://kado-hackmeridian.vercel.app/k/AVB8-WAQ2-WMAS) |
| [NY4R-1QRN-P5A0](https://kado-hackmeridian.vercel.app/k/NY4R-1QRN-P5A0) | [0701-8F38-S2H2](https://kado-hackmeridian.vercel.app/k/0701-8F38-S2H2) | [JEP6-R06F-RXP8](https://kado-hackmeridian.vercel.app/k/JEP6-R06F-RXP8) |
| [3B3W-3XCE-KB1F](https://kado-hackmeridian.vercel.app/k/3B3W-3XCE-KB1F) | [7JQV-B1YR-B6DV](https://kado-hackmeridian.vercel.app/k/7JQV-B1YR-B6DV) | [RQ3K-748R-9K9G](https://kado-hackmeridian.vercel.app/k/RQ3K-748R-9K9G) |
| [R7G2-GKK9-W66G](https://kado-hackmeridian.vercel.app/k/R7G2-GKK9-W66G) | [VP6E-Z1JB-W1R4](https://kado-hackmeridian.vercel.app/k/VP6E-Z1JB-W1R4) | [YYD2-M077-33YM](https://kado-hackmeridian.vercel.app/k/YYD2-M077-33YM) |
| [E6JY-7MKP-X30D](https://kado-hackmeridian.vercel.app/k/E6JY-7MKP-X30D) | [JS9B-YHE8-7RG7](https://kado-hackmeridian.vercel.app/k/JS9B-YHE8-7RG7) | [S9DC-6H32-7SD6](https://kado-hackmeridian.vercel.app/k/S9DC-6H32-7SD6) |
| [Z87G-0J9X-HREV](https://kado-hackmeridian.vercel.app/k/Z87G-0J9X-HREV) | [E4JS-7V3Q-MZNC](https://kado-hackmeridian.vercel.app/k/E4JS-7V3Q-MZNC) | [ESYS-QF50-VWF6](https://kado-hackmeridian.vercel.app/k/ESYS-QF50-VWF6) |
| [56RJ-8YC4-NY5W](https://kado-hackmeridian.vercel.app/k/56RJ-8YC4-NY5W) | [KTQ0-QBWY-X4B4](https://kado-hackmeridian.vercel.app/k/KTQ0-QBWY-X4B4) | [J3X2-BPRK-TCR6](https://kado-hackmeridian.vercel.app/k/J3X2-BPRK-TCR6) |

## How Stellar is used

**1. Generation** (`scripts/generate-batch.ts`). For each code, the server derives
a keypair with `scrypt(code, salt)`. The sponsor creates one **claimable
balance** per Kadó, for a public key **whose account does not exist yet**, with
two claimants:

- the Kadó key, `beforeAbsoluteTime(expiration)`
- the sponsor, `not(beforeAbsoluteTime(expiration))`, so unopened Kadós come back

**2. Opening** (`lib/stellar/open.ts`). One atomic transaction, three signatures:

```
tx source: channel account                 signs: channel, sponsor, attendee
1. beginSponsoringFutureReserves  source: sponsor   sponsoredId: attendee
2. createAccount startingBalance=0 source: sponsor
3. endSponsoringFutureReserves    source: attendee
4. claimClaimableBalance          source: attendee
```

- **Sponsored reserves (CAP-33)** let the account start with 0 XLM: the sponsor
  carries its 1 XLM of reserves, so the gift arrives whole.
- **Atomicity**: either the account is created *and* the Kadó opens, or nothing
  happens. Opening twice is impossible; retrying is always safe.
- **Channel accounts** pay the fee and supply the sequence number, so many
  people can open at the same moment. Submits go through Horizon's
  `/transactions_async`; a busy channel answers at once and the open retries on
  another one.

**3. No database.** The code finds its claimable balance via Horizon
(`claimable_balances?claimant=`); "opened" means the account exists. Every state
the app shows can be checked on-chain.

### On-chain evidence (testnet)

| What | Transaction |
|---|---|
| Judges' batch: 30 claimable balances in one tx | [`8f28e192…`](https://stellar.expert/explorer/testnet/tx/8f28e192576fd1a85b2868ad09b614e292e60b040c23001cf24ceebe4c909a1f) |
| Open on the live site (production) | [`c314a657…`](https://stellar.expert/explorer/testnet/tx/c314a657c51086b93aebec6f73705e4b9cdb248b7cca1f453bcf32880edae79d) |
| Open with a channel as source: 4 ops, 3 signatures | [`06d77fdc…`](https://stellar.expert/explorer/testnet/tx/06d77fdcf8117bc5ad108434fc775481d47ea326ef22ebb1c1a0bbcdd67d620c) |
| Channel pool: 20 accounts created by the sponsor | [`48080fa7…`](https://stellar.expert/explorer/testnet/tx/48080fa7df16c29697785236b5ab9e58adbb484937c03653cca188a712238526) |
| First test batch (sponsor's `num_sponsoring` went to 6: one reserve per claimant) | [`df0344ba…`](https://stellar.expert/explorer/testnet/tx/df0344ba8eaa91570712e982506cbb01041349a260c4dc82bb81a6b5689d82b4) |

Sponsor account: [`GCHFQTSH…D5ZZ`](https://stellar.expert/explorer/testnet/account/GCHFQTSHH7ZMDXEMEEVYCWK2HYXU5VTZDC5XWPJXIR4F73VSF7BBD5ZZ).
Load test on testnet: 5 simultaneous opens landed in 7 s; 3 opens forced onto
2 channels landed in 8 s.

## Market

- **Cost per onboarded person:** the gift + **1 XLM** of reserves, locked in the
  sponsor (not spent) while the account exists. Fees are about 0.00008 XLM per
  open. At 0.20 USD/XLM, a funded, real Stellar account costs the organizer about
  **$0.20 of locked capital** on top of the gift.
- **Unopened Kadós come back** to the organizer after expiration, so a low open
  rate doesn't waste the budget.
- **First users:** the Stellar Ambassador Chapter Peru and other outreach events
  (meetups, workshops, university talks): every attendee leaves with an account.
- **North-star metric:** open rate per event, read from chain (organizer panel).
- **Roadmap:** Phase 1 pilot at real events, then mainnet with low amounts.
  Phase 2: person-to-person Kadós by link, non-custodial embedded wallet.
  Phase 3: multiple assets and a real off-ramp.

## Architecture

```
app/page.tsx              P0: code entry
app/k/[code]/             P1–P5: closed → opening → open → balance / errors
app/api/open              POST: builds and submits the opening transaction
app/api/kado/[code]       GET: Kadó state (no amount before opening)
lib/code.ts               code generation, scrypt(code, salt) → keypair
lib/kado-state.ts         opened / closed / expired / not found, from Horizon
lib/stellar/open.ts       opening transaction, channels, async submit, retries
lib/stellar/horizon.ts    read retry with backoff + jitter
scripts/                  generate-batch, create-channels, fund-sponsor, checks
batches/<id>.json         public batch manifests (no codes)
```

Next.js 16 (App Router) on Vercel, TypeScript, Tailwind 4,
`@stellar/stellar-sdk` 17, Horizon testnet. Specs: [THESIS.md](THESIS.md),
[SPEC.md](SPEC.md), [DESIGN.md](DESIGN.md).

## Setup

Requires Node ≥ 22.12.

```bash
npm install
cp .env.example .env          # then fill CODE_SALT (see the comment in the file)
```

Create and fund a testnet sponsor (put its secret in `SPONSOR_SECRET` first),
create the channel pool, generate a batch, run:

```bash
npm run fund-sponsor
npm run create-channels -- --count 20 --xlm 5
npm run generate-batch -- --count 3 --xlm 10 --usd-per-xlm 0.2 --expires 2d --label "Test"
npm run dev
```

The codes are written to `batches/<id>.codes.csv`, which git ignores.
`npm run check-batch -- <id>` verifies a batch on-chain.

### Environment variables

| Variable | Meaning |
|---|---|
| `STELLAR_NETWORK` | `testnet` |
| `HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `SPONSOR_SECRET` | Sponsor account: creates the claimable balances, sponsors reserves, recovers unopened Kadós |
| `CHANNEL_SECRETS` | Comma-separated channel accounts: tx source and fee payer of each open |
| `CODE_SALT` | Salt for `scrypt(code, salt)`. Changing it invalidates every code |

## Known limitations

- **Bearer:** whoever has the code opens the Kadó. Fine in a controlled room.
- **Custody:** between generation and opening the operator controls the funds.
  In this version custody **continues after opening**, because the account key
  is derived from the code and a server secret. A non-custodial key is in the
  backlog.
- **The USD amount is the value at generation.** The asset is XLM; its USD value
  moves after that.
- **Hidden amount is UI only:** it is public on-chain.
- **The sponsor is critical infrastructure:** if it runs out of XLM, openings
  fail. Its secret is a hot key on the server.
- **Griefing:** a Kadó's public key is visible on-chain; if someone creates that
  account first, the Kadó can't be opened (the organizer recovers it after expiry).
- **No off-ramp yet**, and no send/receive from the balance screen.
- **Testnet only.** The next testnet reset is 16 Dec 2026.

## Prior work

The idea comes from an earlier prototype built for an Instaward (Stellar
Community Fund) application. That prototype validated the primitive on testnet
but was **never tested with real users**. Its testnet transactions:
[`9163729d…`](https://stellar.expert/explorer/testnet/tx/9163729d22c14c66eed586e2925ec590a475b02ac0432ef335b42c6560a0d94b)
(claimable balance to a non-existent account),
[`d3e637e9…`](https://stellar.expert/explorer/testnet/tx/d3e637e953a3317705c97754384ed42da05addcbc18555ec40be9f0c6aa84067)
(sponsored account + claim in one tx),
[`35a50eb1…`](https://stellar.expert/explorer/testnet/tx/35a50eb10cc3dff0bfe5d36e34f57be01c3462800b1a1e2f6b7f94f47db37e34)
(same with an issued asset).

**This repository was written from scratch during HackMeridian.** No code was
copied; the knowledge from that exploration lives as sourced facts in
[THESIS.md](THESIS.md) and [SPEC.md](SPEC.md). New this weekend: the batch
generator, the code → keypair scheme, the channel-account pool with async
submit, the attendee app and the deployment. The commit and PR history shows
the build step by step.
