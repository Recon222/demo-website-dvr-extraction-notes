# Lane: web — W1 (phase U1), PR #40 @ 28e7993

Base feat/uiparity-u0 @ 15e5a6f; diff `git diff feat/uiparity-u0...feat/uiparity-w1`. Shared worktree
worktrees/w1-wave, read-only. Read: the PR body, the three implementer reports, both integration
reports, phone-ui-delta-inventory.md §1.3.1/§1.3.2 and §2.A `Card`, and every changed source file
plus all 22 glassCard/glassCardNested/header-chrome consumers. Contrast arithmetic in
scratchpad/lane-web-w1/. One probe cut and torn down (below).

**Probe worktree:** `probe/w1-web-shorthand` @ 28e7993, cut and installed (5.4 s), one test file
added, deleted after; `git status --short` empty at teardown; removed with tools/worktree-remove.ps1
— "unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 -> 240 · OK".

---

## HIGH

```
[HIGH] The documented escape hatch for re-tinting a card's sides does not work — the prescribed
       form silently paints the SIDE colour on the lit top edge, on FIRST RENDER
File: features/demo/ui/glass-tokens.ts:129-130 (restated at :25-27)
Issue: the docblock tells every future consumer: "A consumer that must re-tint the sides sets
  `borderColor` and then re-sets `borderTopColor`." That is wrong whenever the fragment is SPREAD,
  which is how all 22 consumers use it. A duplicate key in an object literal keeps the FIRST key's
  POSITION and only takes the last value, so the "re-set" `borderTopColor` collapses back into the
  spread's slot — ahead of `borderColor` — and `borderColor`, a four-side shorthand, then erases it.
  The card renders with its lit edge equal to the side tint. Nothing catches it: it type-checks, and
  a style pin written against the rendered output would encode the wrong value as correct.
Evidence: MEASURED, not reasoned. Probe in probe/w1-web-shorthand @ 28e7993, jsdom, motion-ON (the
  default; irrelevant here — no animation involved), React 19.2:

    <div style={{ ...glassCard,
                  borderColor: variant === 'a' ? 'rgb(1, 1, 1)' : 'rgb(2, 2, 2)',
                  borderTopColor: glassCard.borderTopColor }} />

    PRESCRIBED  first: rgb(1, 1, 1)                | after update: rgb(2, 2, 2)
                       ^ expected rgba(184, 212, 240, 0.08) — the highlight never paints

  The SAME probe also confirms the second half of the hazard, which the docblock does not mention at
  all — a consumer that makes only `border` conditional is correct on first paint and broken on the
  next render, because React writes only CHANGED style keys on update:

    NAIVE       first: rgba(184, 212, 240, 0.08)   | after update: rgb(2, 2, 2)
    stderr: "Updating a style property during rerender (border) when a conflicting property is set
             (borderTopColor) can lead to styling bugs."

  Restore verified: probe file deleted, `git status --short` empty, worktree removed via the script.
  NO SHIPPED CONSUMER IS AFFECTED TODAY — I checked all 22, and none overrides `border` or
  `borderColor` after the spread; ui/__tests__/glass-card-recipe.test.tsx:232 guards that and is
  correct. The severity is the use-day, not the review-day (reviewer-contract §3): this sentence is
  the standing instruction for U2.4 / U4.1 / U5.1, which the module's own header names as the
  consumers of this seam, and the day one of them follows it there is no reviewer holding the probe.
Fix: replace the sentence with a form that works, and say why. Either destructure the fragment —
  `const { borderTopColor, ...base } = glassCard` then `{ ...base, borderColor: X, borderTopColor }`
  — or set the edge through a key the fragment does not already carry (`borderTop: '1px solid <h>'`),
  which appends after `borderColor`. Add the update-path half: a CONDITIONAL border/borderColor on a
  fragment carrying `borderTopColor` breaks on re-render even when the first paint is right, so a
  conditional side tint must re-declare the edge in the same object every render.
```

---

## MEDIUM

```
[MEDIUM] `glassCardNested` drops an elevation shadow the phone's `Card` applies to EVERY glass
         variant — the matrix row and the ported recipe disagree, and nobody reconciled them
File: features/demo/ui/glass-tokens.ts:160-163, :173-179
Issue: the docblock justifies "NO ELEVATION SHADOW, deliberately" from the matrix ("A55 names
  none"). The recipe this wave is porting says otherwise: the phone's glass branch is
  `<View style={[styles.glassContainer, shadowStyle, glowStyle, layoutStyle, outerStyle]}>` and
  `shadowStyle` is `Layout.shadow.card[scheme]` applied with NO reference to `glassVariant` — so a
  `<Card glass glassVariant="nestedCard">` on the phone does cast `shadow.card`. Five demo surfaces
  adopted the nested tier in this PR; all five now sit flat where their phone counterparts do not.
Evidence: phone-ui-delta-inventory.md:1430-1433 (§2.A `Card`, the three-node glass branch, wrapper
  style list) vs glass-tokens.ts:160-163. The two sources are both cited in this PR and they
  conflict; the docblock cites only the one that supports the outcome. Note the inventory carries a
  fact that cuts the OTHER way for `glassCard` and is also unaddressed: `Colors.ts:378` records that
  "the iOS shadow on this component is dead" in dark, so U1.2's new `0 4px 8px rgba(0,0,0,0.15)` on
  ~10 card sites is an elevation the phone does not actually render in the scheme the demo ships.
  I am not asking for either change — I am asking for the reconciliation to be written down, because
  right now the port is shadowed where the phone is not and flat where the phone is not.
Fix: one paragraph in the U1.2/U1.3 report (or a ledger row with the wave that owns shadows, U4's
  `shadow.dialog`, as the trigger) stating which source governs when §2.A's recipe and a matrix row
  disagree, and applying it to both halves of this pair.
```

---

## Verified, not findings

Things the brief asked me to check that came back clean. Recorded so the aggregator need not
re-derive them.

- **§4.3's refutation is CORRECT.** `border-color` is a four-side shorthand, so the plan's "override
  `borderColor`, never `border`" is wrong in exactly the way U1.2 says. Confirmed in the same probe:
  a trailing `borderColor` erases `borderTopColor` identically to a trailing `border`.
- **Ordering paints.** `border` then `borderTopColor` in one inline object gives the highlight on
  first render (probe, NAIVE arm first value = `rgba(184, 212, 240, 0.08)`). All 22 consumers spread
  the fragment with nothing border-related after it; WizardHeader, the drawer's two bars and
  CaseMapPicker's put the header spread LAST, which is also safe.
- **Fidelity: 48/48 tier values byte-exact** against phone-ui-delta-inventory.md §1.3.1 (dark, 24)
  and §1.3.2 (light, 24), checked key by key including the three counter-intuitive ones (nested's
  swapped stops, nested's 0.06 -> 0.2 edge, recessed's deliberately DARK `highlightTop`). Geometry
  matches §2.A: `borderRadius.lg` (12) on both card fragments, 1px border, a 1px top edge,
  `Layout.shadow.card.dark` -> `0 4px 8px rgba(0,0,0,0.15)`. The unspaced `rgba()` spelling is
  documented and reconciled by the guard's `norm()`.
- **U1.4 §9(5)'s closure claim is CORRECT — independently verified.** The report asks to close
  U0.5's open header/elevated ground-stack question on the grounds that neither tier can change a
  `Math.min`. Measured for all four foregrounds in both schemes: header+elevated min is ABOVE the
  bound min in all eight rows (dark `textTertiary` 3.927 vs bound 3.814; light `textTertiary` 4.6207
  vs bound 3.8709). My helper reproduces the report's own light margin — 3.8709 vs the 3.87 floor —
  to four decimals, so the two implementations agree. The question is closable.
- **Text on the newly-rendered tiers clears.** Header tier (WizardHeader title 12.36, drawer
  "Navigation" 12.36, `#99badd` icon strokes 6.78, picker title 11.68 / subtitle 6.55) is within 0.05
  of the hand-rolled navy it replaced. Elevated tier: CompletionScreen.tsx:54's 13px `#7a9fc4` moves
  5.18 -> 3.93 and the nested adoptions move `#7a9fc4` 5.82 -> 3.81 — both land in the `textTertiary`
  band that D5 / M2(b) ratified as a documented CEILING (floor 3.79), which is the intended
  consequence of adopting the phone's fill. Not re-filed.
- **Render cost: nil.** glass-tiers.ts is one frozen `as const` literal with no getters and only an
  `import type` (the cycle-proofing at :41-48 is real and correct — a value import would evaluate the
  derived template literals against `undefined`). header-chrome.ts builds three objects once at
  module init; glass-tokens.ts six template literals once. Nothing new runs per render.
- **Style convention: correct half.** All new styling is inline `CSSProperties`; no Tailwind entered
  features/demo/ui/**; no app/css/style.css change, so the marketing `@theme` mirrors are untouched.
  Lifted values respected — `borderRadius: 10` kept at the two nested adopters, radius 16 kept at
  AudioRecorderScreen:159,205 and AlertDialog, and the frame math is not touched.
- **Isolation:** no marketing file imports @/features/demo, ui/tokens/* or controls/*; the diff
  contains no components/, lib/ or app/(default)/ file at all.

---

## Web Summary

CRITICAL: 0 · HIGH: 1 · MEDIUM: 1 · LOW: 0
Verdict: REVISE

Marketing<->demo isolation: **preserved** (no marketing file in the diff).

Bundle impact: **unverified.** The brief names worktrees/_captures/w1-assembly-gates.log.build; that
file does not exist (_captures/ holds only w0/ and w1/, and w1/ holds only after/). The PR body
claims /demo First Load 107 kB unchanged, and nothing in the diff changes an import shape, adds a
dependency, or makes a lazy import static — but I did not see the log.

Browser-resource cleanup: **n/a** — no effects, listeners, timers or observers touched.

Accessibility: **no regressions.** New tier grounds measured; the only pairs that moved down landed
in the ratified `textTertiary` ceiling band, and the header tier is within 0.05 of what it replaced.

Style-convention adherence: **correct half; lifted rules intact.**

Out-of-lane observations:
- The W1 capture set has no before/ and only 6 of the 9 after/ groups, so no before/after read was
  possible; I used after/01-wizard/11-wizard-drawer.png only to confirm the header and footer bars
  render as one tier, which they do.
- WizardDrawer.tsx:329 still paints the drawer panel `#0b1626`, an unswept literal — D3/later-wave
  territory, noted only because the header bars now composite over it rather than over
  `colors.background`, which is where my header numbers came from (the difference favours contrast).
