# THESIS.md

> Single source of truth. Change it here first, then SPEC.md and DESIGN.md.

## One line

**Gift digital dollars to anyone, no wallet needed.**

## The user

A person at an introductory crypto meetup, workshop or university talk in Peru.
They have **no wallet** and no crypto knowledge. They are curious, but they will
not install an app, write down a seed phrase and fund an account just to see what
this is about.

Not the hackathon builder: builders already have wallets. That was observed first
hand at Web3 hackathons, and it is why the target is outreach events, not builder
events.

## The problem

Giving digital value to someone without a wallet forces them to become a crypto
user first: install an app, guard a seed phrase, get funds. The gift arrives
after the homework, and almost nobody finishes the homework.

Outreach events in Peru generate interest but not conversion. Attendees leave
the room the same way they came in: without a Stellar account and without funds.

## The value proposition

The attendee scans a QR or types a code, taps **Open**, and in a single
transaction gets their own Stellar account with real funds. No seed phrase, no
app, no email, no fee to pay.

A Kadó is **a box you open**, not a coupon you redeem. The amount stays hidden
until the moment of opening.

## Why Stellar

Two native protocol features do the whole job, no smart contract needed:

- **Claimable balances (CAP-23):** the funds are locked on-chain for a public key
  whose account does not exist yet, with a time predicate that returns them to
  the organizer if nobody opens the Kadó.
- **Sponsored reserves (CAP-33):** the organizer pays the reserves of the new
  account, so the attendee can start with zero XLM.

Both combine in one atomic transaction: either the account is created and the
Kadó is opened, or nothing happens. Retrying is always safe.

## What we know, and what we don't

- **Validated (testnet):** the primitive works as described. See Prior work.
- **Not validated:** that a person without a wallet wants to keep the funds
  instead of ignoring them. No real users yet.
- **Unsolved:** what the receiver does with the funds afterwards (off-ramp).

## Principles

1. **Zero crypto jargon** in the attendee flow. We say "digital dollars".
2. **Narrow scope.** Anything new goes to the backlog, not the build.
3. **Declared custody.** Between deposit and opening the operator has effective
   control. In this version it keeps it after opening too, because the account
   key comes from the code and a server secret. We say so.
4. **On-chain evidence.** Every claim is backed by a transaction hash anyone can
   open in the explorer.

## Vocabulary

| Say | Don't say |
|---|---|
| Kadó | voucher, coupon, ticket, gift card |
| Open | redeem, claim, cash in |
| Digital dollars | USDC, crypto, token |
| "The event left you a Kadó" | "someone sent you something" |

The giver is the event or the chapter. Never invent a personal sender.

## Prior work (disclosed)

The idea comes from an earlier prototype I built for an Instaward (Stellar
Community Fund) application. That prototype validated the primitive on testnet
but was **never tested with real users**.

**This repository was written from scratch during HackMeridian.** The knowledge
from that exploration (product decisions, operation ordering, reserve costs) is
captured as facts in THESIS.md and SPEC.md, with sources. No code was copied.

Prior testnet validation transactions:

- Claimable balance to a non-existent account:
  `9163729d22c14c66eed586e2925ec590a475b02ac0432ef335b42c6560a0d94b`
- Sponsored account creation + claim in one transaction:
  `d3e637e953a3317705c97754384ed42da05addcbc18555ec40be9f0c6aa84067`
- Same flow with an issued asset (sponsored trustline):
  `35a50eb10cc3dff0bfe5d36e34f57be01c3462800b1a1e2f6b7f94f47db37e34`

## Roadmap after the hackathon

- **Phase 1 (pilot):** real events of the Stellar Ambassador Chapter Peru, measure
  open rate, then mainnet with low amounts.
- **Phase 2:** person-to-person Kadós sent by link, non-custodial embedded wallet.
- **Phase 3:** multiple assets and a real off-ramp.

## Track

Genesis. Thematic track: Stellar Unlocked (core protocol features: CAP-23 + CAP-33).
If the anchor off-ramp ships, re-evaluate Stellar Composed.
