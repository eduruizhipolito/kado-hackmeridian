# DESIGN.md

> One look in the app, the landing page and the video. Derived from THESIS.md.

## Concept

A Kadó is **a box that opens**. The opening screens are the box itself: the
phone becomes the gift. The gesture matters more than any decoration.

## Palette (six colors, there is no seventh)

| Token | Hex | Use |
|---|---|---|
| `lid` | `#4b2fa3` | Main background, the outside of the box (violet) |
| `inside` | `#fff3e2` | Text on violet; background of the opened box (cream) |
| `ink` | `#241c33` | Text on cream |
| `seam` | `#ff6b4a` | The single accent: Open button, progress bar (coral) |
| `confirmed` | `#2e9e6b` | Success states only |
| `muted` | `#7a6f8f` | Secondary text, disabled |

Rules:

- **Flat color planes only.** No gradients, no shadows, no rounded corners.
- Hierarchy comes from color planes and type scale, not from effects.
- Coral is reserved: one coral element per screen at most. The logo's coral
  inside does not count.
- No horizontal scroll ever. No vertical scroll in the opening flow (P1 to P3).

## Type

- **Plus Jakarta Sans**, weights 400, 700, 800.
- Amount on P3: display size (56 px desktop / 44 px mobile), weight 800,
  letter-spacing -0.04em.
- Body 16 px minimum. Buttons: uppercase not required, weight 700.

## Logo

- An **open isometric box**: violet outside, coral inside visible under the
  raised lid. "Ka" on the left face, "Dó" on the right face, cream, weight 800,
  following each face's perspective.
- No ribbon, bow, confetti, coins or Stellar symbols.
- Appears on P0 (code entry), the landing page and the README. **Never** inside
  the opening ceremony (P1 to P3): there the screen is the Kadó.
- Minimum size 48 px on screen. Check the accent on "Dó" stays visible.
- Files: `public/brand/logo.svg` (source), `app/icon.svg` (favicon on cream).

## Motion

- P2 "Opening": a **linear** coral bar traveling along the seam of the box.
  Linear on purpose: a spinner says nothing, a bar suggests progress.
- P3 reveal: the amount appears after the lid moves. Short (< 600 ms), no bounce.

## Copy tone

- Second person, short sentences, no jargon (see THESIS.md vocabulary).
- P1: "The event left you a Kadó." / button "Open"
- P3: "$2.00" / "It's yours."
- P4: "Save this link to come back."
- Errors are calm: "This Kadó was already opened.", "This Kadó expired.",
  "We can't find that code. Check it and try again."

## Landing, README and pitch

Same one-liner, same words, same look:

> **Gift digital dollars to anyone, no wallet needed.**

- README: line 1 under the title.
- Landing: hero on violet, cream text, with the code entry (P0) on the same
  screen. Its **Open** button is the one coral element; "Try the demo" is a
  cream text link to the demo codes. Below the hero, on cream: how it works and
  a short "Built on Stellar's native features" strip.
- Pitch / video: opens with the line, then the live opening on a phone.
