# Kadó

**Gift digital dollars to anyone, no wallet needed.**

> Work in progress for HackMeridian (Genesis · Stellar Unlocked). Sections marked
> _TBD_ get filled as the issues land.

## Problem

Giving digital value to someone without a wallet forces them to become a crypto
user first: install an app, guard a seed phrase, get funds. At outreach events in
Peru, attendees leave interested but without a Stellar account and without funds.

## How it works

The attendee scans a QR or types a code, taps **Open**, and in one transaction
gets their own Stellar account with real funds. No seed phrase, no app, no fee.

## How Stellar is used

_TBD (#7)._ Claimable balances (CAP-23) + sponsored reserves (CAP-33), in one
atomic transaction, no smart contract.

## Setup

Requires Node ≥ 22.12.

```bash
npm install
cp .env.example .env   # fill SPONSOR_SECRET and CODE_SALT
npm run dev
```

### Environment variables

| Variable | Meaning |
|---|---|
| `STELLAR_NETWORK` | `testnet` |
| `HORIZON_URL` | Horizon endpoint, `https://horizon-testnet.stellar.org` |
| `SPONSOR_SECRET` | Secret of the sponsor account (fees, reserves, recovery) |
| `CODE_SALT` | Salt for code → keypair derivation |

## Demo

_TBD (#7): live URL and demo codes._

## On-chain evidence

_TBD (#7)._

## Market

_TBD (#7)._

## Known limitations

See [SPEC.md](SPEC.md#known-limitations-declare-them-in-the-readme). _Full list in #7._

## Prior work

The idea comes from an earlier prototype built for an Instaward (Stellar Community
Fund) application. It validated the primitive on testnet but was never tested
with real users. **This repository was written from scratch during HackMeridian.**
No code was copied. Details and prior testnet transactions: [THESIS.md](THESIS.md#prior-work-disclosed).
