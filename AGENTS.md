# AGENTS.md

THESIS.md, SPEC.md and DESIGN.md say **what**. This file says **how**.

## Mission

Kadó: gift digital dollars to anyone, no wallet needed.
Demo path from SPEC.md working on Stellar **testnet**, deployed on Vercel,
before the HackMeridian submission deadline (26 Oct), with 1 hour of margin.

## Ground rules

- Read freely. **Ask before you push**, deploy or spend testnet funds in bulk.
- **Never commit secret keys** or the codes CSV. Secrets live in `.env` only.
- **Every Stellar fact needs a source** (CAP, official docs via Raven MCP, or a
  testnet tx hash). If a fact in SPEC.md looks wrong, stop and say so.
- **Write all code in this repository from scratch.** Do not copy code from
  other repositories or projects. Libraries via npm are fine.
- If the framework version has breaking changes, read its bundled docs first
  (for Next.js: `node_modules/next/dist/docs/`).

## Scope

SPEC.md is the scope. Anything else: add it to "Backlog" in SPEC.md, don't build it.
When a decision changes, update THESIS.md / SPEC.md / DESIGN.md **first**, then code.

## Tools

- Raven MCP (Stellar docs + live ecosystem data), always.
- Stellar Skills, always.
- `gh` for issues and PRs.

## Working style

- One GitHub issue → one branch `feature/<issue>` → one PR → merge. Small steps,
  roughly one per hour.
- Commit messages say what changed and reference the issue (`#3`).
- Blocked? Ask **one** question and give your best guess.
- Failed twice at the same thing? **Stop and report.**
- UI copy follows the vocabulary in THESIS.md. Never "claim", "redeem", "crypto"
  or "token" in user-facing text. "Claim" is fine inside code and protocol names.

## Done when

- [ ] The SPEC.md demo path works end to end on testnet.
- [ ] Live URL on Vercel that judges can open, with demo codes in the README.
- [ ] README covers: one-liner, problem, setup, install, env vars, demo
      instructions, architecture (how Stellar is used), on-chain tx evidence,
      known limitations, **Prior work** section.
- [ ] `npm run build` and type check pass. No keys in git.
