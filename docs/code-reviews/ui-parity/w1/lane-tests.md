# Lane: tests — Wave 1 (U1.1-U1.4), PR #40 `feat/uiparity-w1` @ `28e7993`

Mode: code review. Base `feat/uiparity-u0` @ `15e5a6f`. Read tree: `worktrees/w1-wave` (read-only).
All probes in my own worktree `worktrees/probe-w1-tests` cut from `28e7993`, torn down with the
script: *`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*.

**Provenance for every probe: the canonical source in that worktree at `28e7993`.** No mirrored
copies exist for any file touched. Motion mode: the three probes that render (A1, RV2, and the
`header-chrome` consumer suite in the baseline) ran under the suite default, **motion-ON**
(`vitest.setup.ts`'s `matchMedia` stub is hard-coded `matches: false`); nothing in this wave is
gated on `useReducedMotion`, so both modes take the same path.

## Baseline (my worktree, before any mutation)

| Gate | Exit | Result |
|---|---|---|
| Guard, in-process | — | **115 anchors / drift 0 / parseFailed 0** (32 palette x2 + 24 tier x2 + 3 = 115 ✓) |
| Six W1 suites | **0** | **62 passed \| 10 todo (72)**, **0 skipped** — `rnAvailable()` true, the guard RAN |
| `pnpm test --silent` | **0** | **272 files / 3562 passed \| 10 todo (3572)** |
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | cold |

The `it.todo` count moved **15 -> 10**: rows 4-5, 8, 10, 31 and 33 un-todo'd, exactly the five
U1.1's row promised. No previously-live assertion was weakened — row 8 was in fact **strengthened**,
from the phone's rounded compare to an unrounded `toBeGreaterThanOrEqual` (`palette-contrast.test.ts:449-450`),
which refuses a real drop that rounding 3.7949 -> 3.79 would have accepted. The rows 22-25 todo
title narrowed from "U1.1 + U3.1" to "U3.1"; that is a scope correction (its remaining blocker is
`warningAccent` alone), not a relaxation.

## The un-todo'd contrast rows — pinned AT the constant, and they have teeth

Every new row composes its subject from `GLASS_TIER[...]` / `palette[...]`; nothing is retyped.
I probed the three that carry the contract, at the production values rather than at the test:

```
PROBE D2 — row 33 lower bound, ONE stop only (the "PER STOP, never Math.max" claim)
Target:      features/demo/ui/tokens/glass-tiers.ts:176 — dark recessed gradient[0]
Claimed pin: palette-contrast.test.ts:481 — "keeps the recessed well a well"
Mutation:    'rgba(0,24,50,0.6)' -> 'rgba(0,40,83,0.6)'   (stop 0 only, flattened onto its sheet)
Result:      KILLED (exit 1) — Tests 1 failed | 8 passed | 10 todo (19)
  AssertionError: expected [ Array(1) ] to deeply equal []   + "dE": 0, + "stop": 0
  THE POINT: the failure names `stop: 0` while stop 1 stays healthy. A `Math.max` across stops —
  the shape the phone shipped once — would have SURVIVED this exactly. The per-stop claim is real.
Scope note: glass-tiers.test.ts and the drift guard also red on this mutation; I scoped the run to
  palette-contrast.test.ts to isolate row 33's own verdict.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D2b — row 33 UPPER bound (the two-sidedness)
Mutation:    dark recessed gradient[0] -> 'rgba(6,12,22,1)'  (the near-black the phone retired)
Result:      KILLED (exit 1) — + "dE": 27.77, + "stop": 0
  Both sides of `dE < 3 || dE > 12` fire. Two-sided, confirmed, not asserted.

PROBE D3 — row 31, the nested tier's separability
Target:      glass-tiers.ts:140 — dark nestedCard.border
Mutation:    'rgba(43,140,193,0.45)' -> 'rgba(28,78,132,0.5)'  (i.e. back to the CARD's hairline,
             which is the flat tier that shipped across 30 phone call sites)
Result:      KILLED (exit 1) — AssertionError: expected [ { scheme: 'dark', ratio: 1.12 } ] to deeply equal []
  1.12 against the 1.25 bound. The border channel is the one that carries the tier in dark, and it
  is genuinely measured.

PROBE D4 — row 10, the accent-as-text token (DEF-UI-018)
Target:      features/demo/ui/tokens/palette.ts:94 — dark link
Mutation:    '#b8d4f0' -> '#2B8CC1'   (back to `primary`, the mid-tone FILL the phone moved off)
Result:      KILLED (exit 1) — AssertionError: expected [ { name: 'dark link', ratio: 2.83 } ] to deeply equal []
  2.83 against AA 4.5 — the defect this row exists for, reproduced from the shipped grounds.
```

**The W0/F6 opaque-bottom guard is load-bearing here and holds.** `LIGHT_GROUNDS`
(`palette-contrast.test.ts:213-219`) passes `stops(GLASS_TIER.light.card)` with **no** `under`, so
those stacks bottom out on the tier's own stop — legal only because light's `card` and `sheet` stops
are alpha `1`. `light.recessed` is translucent (`0.45`/`0.35`) and is correctly given
`[GLASS_TIER.light.sheet.gradient[0]]` as its opaque floor. That interlock is exactly what F6's
throw exists to enforce, and this wave is its first real consumer.

## Re-verification of claimed kills, and U1.2's fixed tautology

```
PROBE P13r — U1.2's fixed tautology: A33's swap undone
Target:      glass-tiers.ts:139 — dark nestedCard.gradient, transposed into the CARD's order
Result (first run, scoped to glass-card-recipe.test.tsx alone): SURVIVED (exit 0), 20 passed
Result (correct scope): KILLED (exit 1), THREE independent failures —
  1. glass-tiers.test.ts "makes dark `nestedCard` the SWAP of `card`'s stops (A33)"
  2. glass-tiers.test.ts's 48-value byte-exact pin
  3. the drift guard: nestedCard.gradientTop.dark AND nestedCard.gradientBot.dark, named
     SEPARATELY — which is the payoff of splitting the two stops into two anchor keys.
MY ERROR, recorded rather than buried: the first run was mis-scoped by me. `glass-card-recipe.test.tsx`
  composes its expectation from `GLASS_TIER`, so it CANNOT see a mutation to `GLASS_TIER` itself —
  and that is correct layering, not a tautology. The three gates split cleanly:
    fragment-vs-tier   -> glass-card-recipe.test.tsx  (catches re-pointing a fragment)
    tier-vs-literal    -> glass-tiers.test.ts         (catches editing a tier value)
    tier-vs-phone      -> the drift guard             (catches phone-side drift)
  U1.2's fix (composing from a second module) is real; it closes the first row, and the other two
  rows were always covered elsewhere.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE RV1 — a derived composite re-pointed at the wrong tier (U1.1's derivation claim)
Target:      features/demo/ui/glass-tokens.ts:77 — GLASS.gradientPanel
Mutation:    derive from tier.card instead of tier.elevated
Result:      KILLED (exit 1) — two failures: the byte-exact GLASS shape pin AND
             "keeps the four legacy composites DERIVED from GLASS_TIER (U1.1)"
  The derivation pin is cross-module and genuinely falsifiable.

PROBE RV2 — the header recipe sourced from the wrong tier (U1.4's central claim)
Target:      features/demo/ui/controls/header-chrome.ts:63
Mutation:    GLASS_TIER[scheme].header -> GLASS_TIER[scheme].card
Result:      KILLED (exit 1) — 4 failures, including
             expected '1px solid rgba(28,78,132,0.5)' to be '1px solid rgba(28,78,132,0.6)'
  The rendered-consumer loop and the fragment pins both fire.
```

The implementers' probe tables are trustworthy on everything I re-ran. U1.4's own disclosure of P10
as SURVIVED, with the fix written out, is exactly the behaviour the mutation skill asks for.

---

# Findings

## [MEDIUM · TRIGGER-LAPSED] `GLASS_TIER.dark` is invisible to every gate in the repo, and the deferral that suppressed it named a trigger that fired inside this same PR

**Files (two touch-points — completeness sweep):**
`features/demo/ui/controls/header-chrome.ts:63` · `features/demo/ui/glass-tokens.ts:62`
**Deferral:** U1.4 implementation report §6 **D-2** (proposed, not yet in `docs/code-reviews/deferred.md`)

**Issue.** Both tier consumers correctly write `GLASS_TIER[scheme]`. Nothing can tell if they stop.
While `scheme === 'dark'` the two expressions are the *same object*, so no behavioural pin can
distinguish them — and `tsconfig.json` sets no `noUnusedLocals`, so the orphaned `scheme` import
does not fail the cold typecheck either. Plan §9 clause 12 (*"flipping the consumed scheme is a
ONE-SITE change"*) is held today by a successor note and nothing else.

**Evidence — two SURVIVED probes:**

```
PROBE A1: header-chrome hard-codes the dark half
Target:      features/demo/ui/controls/header-chrome.ts:63
Claimed pin: header-chrome.test.tsx:24 — the docblock states, in as many words, that
             "reading `GLASS_TIER.dark` directly reddens the file"
Mutation:    const header = GLASS_TIER[scheme].header  ->  GLASS_TIER.dark.header
Result:      SURVIVED — vitest exit 0 (12 passed); cold tsc exit 0
  Path the input actually took: every expectation in that file composes its right-hand side from
  `GLASS_TIER[scheme].header`, and `scheme` IS `'dark'`, so both sides move together.
Provenance:  canonical source, probe worktree at 28e7993.  Restore: verified byte-identical.

PROBE A2: the sibling touch-point — glass-tokens hard-codes the dark half
Target:      features/demo/ui/glass-tokens.ts:62
Mutation:    const tier = GLASS_TIER[scheme]  ->  GLASS_TIER.dark
Result:      SURVIVED — exit 0, 28 passed across glass-tokens + glass-card-recipe + glass-tiers
  The "keeps the four legacy composites DERIVED from GLASS_TIER" pin composes from
  `GLASS_TIER[scheme]` too, so it is blind in the same way.
Provenance:  canonical source.  Restore: verified byte-identical.

CONTROL (all four clauses — shipped code, non-equivalent, covered, on an executed arm):
PROBE RV2 above, the wrong-TIER mutation on the same line, is KILLED with 4 failures.
  So `header-chrome.test.tsx:24`'s docblock is HALF TRUE: "sourcing a bar from `card`" is
  genuinely caught; "reading `GLASS_TIER.dark` directly" is not. A comment that tells the next
  reader a case is covered when it is not is worse than no comment.
```

**Why this is actionable NOW and not a deferral.** D-2's own Trigger reads: *"the next commit that
touches `glass-tokens.test.ts`'s scan block — U1.2's `BANNED` rewrite … If W1 closes without it,
U4.1 owns it."* That commit is **in this PR**: `74855c1` (U1.2) and `9c70828` (U1.3) both rewrote
that exact block, adding `'tokens/glass-tiers.ts'` to `TOKEN_MODULES` and fourteen entries to
`BANNED`. The condition the deferral named has occurred, which under the reviewer contract §4 is
the one mechanism that reopens a suppressed item. The deferral was also written before U1.2 merged,
so its author could not have known — this is a sequencing artifact, not a bad-faith deferral.

**Why MEDIUM and not HIGH.** Nothing renders wrong today; the values are identical by construction.
The cost lands on the light-flip at U8 exit, and plan §9 clause 12 does schedule a scratch-worktree
verification there, so the day it fires is not unattended. It is above LOW because there are two
live touch-points, every future tier consumer (U2.4, U4.1, U5.1) inherits the exposure with no
guard, and the test file actively asserts the opposite.

**Fix — the author's own four lines, already written and unchanged by me.** Add beside the existing
directory walk in `glass-tokens.test.ts` (which is where the repo's only source scanner lives, and
whose `sourceFiles` already skips the token modules — correct, since `glass-tiers.ts` declares both
halves and `palette-contrast.test.ts` legitimately reads both):

```ts
it('no consumer hard-codes a scheme half (§9 clause 12)', () => {
  const offenders = sourceFiles(UI_ROOT).filter((f) =>
    /GLASS_TIER\s*\.\s*(dark|light)/.test(readFileSync(f, 'utf8')),
  )
  expect(offenders).toEqual([])
})
```

Then correct `header-chrome.test.tsx:24`'s docblock to claim only what it delivers.

---

## [MEDIUM] Tier membership is pinned by hand-typed CARDINALITY, not against the module — the one protection the palette list was given at W0/F2

**Files:** `.design-sync/check-rn-parity.mjs:349-350` (`TIER_KEYS`, `TIER_PARTS`) ·
`features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:151-158`

**Issue.** The coordinator asked whether TIER membership is pinned like palette membership. It is
not. The palette got, at W0/F2:

```ts
expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(palette.dark).sort())   // :137-139
```

— a comparison against the module, which is what makes the loops around it non-tautological. The
tier list got three hand-typed counts instead: `.toBe(6)`, `.toBe(4)`, `.toBe(24)` (`:153-158`).
Those catch a *deletion* (I confirmed the mechanism is live — the identical W0 probe on
`PALETTE_KEYS` reds on length), but they cannot catch an *addition*, because nothing compares
`TIER_KEYS` to `Object.keys(GLASS_TIER.dark)`.

This is a straight inconsistency inside one commit: the same file's cardinality assertion two lines
above was deliberately made **derived** for exactly this reason, and says so —
*"W0/F2 removed the hand-typed `.toBe(15)`; the same reasoning removes U1.1's hand-typed `.toBe(81)`
— a literal total is exactly what lets someone shrink the table to reach green by editing one number
here."* The reasoning was applied to the total and not to the two lists that feed it.

**Evidence — SURVIVED probe:**

```
PROBE B: a seventh tier lands in GLASS_TIER, with its value pin updated
Target:      features/demo/ui/tokens/glass-tiers.ts — a `well` tier added to BOTH halves, plus
             `GlassVariant` (required: the module's `satisfies Record<ColorScheme, Record<GlassVariant,
             GlassTier>>` rejects an excess key), plus the matching block in glass-tiers.test.ts's
             48-value `toEqual`. ONE semantic mutation — "a package adds a tier" — spelled across the
             two files that a real such change must touch together.
Claimed pin: rn-token-parity.test.ts:151 — "pins all 24 glass-tier keys in BOTH halves"
Result:      SURVIVED (exit 0)
  standalone guard: anchors 115, drift 0, parseFailed 0  — UNCHANGED
  vitest: Tests 15 passed (15)
  The new tier's eight readable values are anchored against nothing, in either half, and every
  gate in the repo reports green. The equivalent palette mutation reds at rn-token-parity.test.ts:137.
Provenance:  canonical source, probe worktree at 28e7993.  Restore: verified byte-identical.
```

**Why MEDIUM, honestly bounded.** There is **no live gap**: all six tiers x four readable parts are
anchored today, and `innerShadow`'s exclusion is documented, justified (it is not a flat CSS value
on either side) and explicitly covered elsewhere — `glass-tiers.test.ts` is named in the guard's own
docblock as its only gate, which is the right disclosure. The trigger is a future tier addition, and
no package on the guard's published schedule adds one. What earns MEDIUM rather than LOW is that
the fix is one line, the precedent is in the same file, and the failure it would prevent is silent.

**Fix.** In `rn-token-parity.test.ts`, replace the three cardinality lines with the membership form
the palette already uses — the file imports from the token modules already:

```ts
expect([...TIER_KEYS].sort()).toEqual(Object.keys(GLASS_TIER.dark).sort())
expect([...TIER_PARTS].sort()).toEqual(['border', 'gradientBot', 'gradientTop', 'highlightTop'])
```

Keep a one-line note that `innerShadow` is absent from `TIER_PARTS` by design, so the second line
reads as the deliberate exclusion it is rather than as a stale list.

---

## Tests Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 2 · LOW: 0
Verdict: **APPROVE with comments**

Probes run: **10** (3 re-verifications of implementer claims, 7 of my own).
Killed: **7** · **Survived: 3** (A1, A2 — one finding, two touch-points; B) · Invalid: 0.
Restores: all 10 verified byte-identical; final `git diff 28e7993` = **0 lines**,
`git status --porcelain` = **0 lines**, `pnpm test --silent` re-green at **272 files / 3562 passed |
10 todo**, cold `tsc` exit 0. Teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 ->
240 · exit 0; `probe/w1-tests` deleted.

Rulings the coordinator asked for:
- **Un-todo'd rows 31/33 + light tier grounds — pinned AT the constant, two-sided per stop: YES.**
  Every subject reads `GLASS_TIER[...]`/`palette[...]`; nothing retyped. Row 33 proven two-sided
  (D2 at dE 0, D2b at dE 27.77) and proven PER STOP — the failure names `stop: 0` while stop 1 stays
  healthy, which a `Math.max` form could not do. Row 31 proven at 1.12 vs its 1.25 bound.
- **`TIER_ANCHOR_KEYS` membership: NOT pinned like the palette's.** Finding 2, probe B.
- **U1.4's P10 — is it a finding? YES, and specifically TRIGGER-LAPSED.** Finding 1, probes A1/A2,
  with RV2 as the control showing the docblock is half true.
- **U1.2's three tautologies: genuinely fixed.** P13r killed three ways once correctly scoped; my
  first, narrower scope was my own error and is recorded above rather than dressed up as a finding.
- **Were any reddened pins weakened? NO.** Row 8 was strengthened to an unrounded compare; the only
  other title change (rows 22-25) narrows a blocker list. Todo count 15 -> 10, matching exactly the
  five rows U1.1's row promised.

Behaviorally meaningful coverage: **strong**. This is the wave where the contrast contract stopped
being mostly `it.todo` and started measuring shipped values, and four independent probes at those
values were killed with the numbers the reports predicted. The three-layer split (fragment-vs-tier,
tier-vs-literal, tier-vs-phone) is sound and each layer is separately falsifiable.
Engine coverage gate (80% on lib/** + engine/**): **not applicable** — the diff touches 0 files
under `lib/**` or `features/demo/engine/**`.
Mock strategy: **at the IO edge** — no new module mocks; the render pins mount real components.
Setup-shim traps: **none** — `skipIf` resolved and ran (0 skipped) in every quoted run; no canvas /
mediaDevices / computed-style path touched. The one `getComputedStyle` call
(`header-chrome.test.tsx:158`) compares three rendered bars **to each other**, not to a stylesheet,
so `css: false` does not hollow it out.
Determinism: **yes** — no clock or entropy in any new test file.

Out-of-lane observations:
- `header-chrome.test.tsx:158` builds its set from `getComputedStyle(...).background` and guards the
  empty-string case at `:161` — correct, and worth keeping if that block is ever refactored, since
  three empty strings would otherwise collapse to a set of size 1 and pass.
