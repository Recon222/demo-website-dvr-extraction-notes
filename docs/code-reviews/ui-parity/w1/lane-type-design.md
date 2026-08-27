# Lane: type-design - Wave 1 (U1), PR #40

Mode: **code review**, round 1. Branch `feat/uiparity-w1` @ `28e7993`, based on `feat/uiparity-u0`
@ `15e5a6f`; diff `feat/uiparity-u0...feat/uiparity-w1`. Read in the shared worktree `w1-wave`.
Probes ran in `probe/w1-types-tiers` (own worktree off `28e7993`), torn down via
`tools/worktree-remove.ps1` - "unlinked 549 junction(s) in 2 pass(es)", `.pnpm` 240 -> 240, exit 0.

Single question: **do the types in this change enforce the invariants the code depends on, or do
they let invalid states through?**

Baseline in the probe tree BEFORE any mutation: `tsc --noEmit --incremental false` -> **EXIT 0** -
`node .design-sync/check-rn-parity.mjs` -> **exit 0, 115/115 rows** (sibling phone repo resolves on
this box, so the guard is running, not skipping).

---

## What was verified, not assumed (the brief's direct questions)

### 1. "Six tiers x four parts x two halves, identical shape" IS a compile-time invariant - both ways

`glass-tiers.ts:186`: `as const satisfies Record<ColorScheme, Record<GlassVariant, GlassTier>>`,
with `GlassVariant` a hand-written six-name union (`:54`) and `GlassTier` the four-part record
(`:57-62`). Two mutations, one each:

| # | Mutation | Result |
|---|---|---|
| 1 | drop `highlightTop` from `dark.card` only (`:127`) | **KILLED** - `glass-tiers.ts(124,5): TS2741: Property 'highlightTop' is missing ... but required in type 'GlassTier'`, plus three consumer TS2339s. EXIT 2 |
| 2 | delete the whole `header` tier from the `light` half only | **KILLED** - `glass-tiers.ts(69,3): TS2741: Property 'header' is missing ... but required in type 'Record<GlassVariant, GlassTier>'`. EXIT 2 |

Both restored, `git diff` 0 bytes. The docblock's claim at `:182-186` is accurate. Note this is a
*stronger* construction than `palette.ts`'s: there the key set is derived from one half
(`keyof typeof dark`), so the halves constrain each other; here an explicit `GlassVariant` union
constrains BOTH, which also means adding a tier is a three-place edit that cannot be done by
half. `gradient: readonly [string, string]` is a real 2-tuple, so a one- or three-stop gradient is
also a compile error.

### 2. `scheme` is a properly constrained discriminant, and production only ever uses `GLASS_TIER[scheme]`

`palette.ts:185`: `export const scheme = 'dark' satisfies ColorScheme`. The `satisfies` keeps the
literal type `'dark'` (so `palette[scheme]` is still exactly `typeof dark` and no consumer's
inferred type moved) while `ColorScheme = 'light' | 'dark'` is what constrains it. That is the
right shape and the right reason, and giving the switch a NAME is what kept the second two-scheme
record from making the flip a two-site change.

Grepped every `GLASS_TIER` reference in the repo. **Production code: two sites, both
`GLASS_TIER[scheme]`** - `glass-tokens.ts:62` and `header-chrome.ts:63`. Every direct-half access
(`GLASS_TIER.dark` / `.light`) is in a TEST, and legitimately so: `palette-contrast.test.ts:202-217`
has to composite `LIGHT_GROUNDS` against the light half by definition, and `glass-tiers.test.ts`
pins both halves. `palette.dark` / `palette.light` appear in no non-test file at all. The
invariant holds today. What does not exist is a gate - see MEDIUM 3.

### 3. The four derived legacy keys are genuine template-literal types, not re-typed strings

Measured with a throwaway type-probe file in the probe tree (deleted; `git status` clean
afterwards). Each line below type-checks ONLY if the inferred type is the exact literal:

```
const a: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))' = GLASS.gradientCard   OK
const b: '1px solid rgba(28,78,132,0.5)'                                     = GLASS.borderSoft     OK
const c: '1px solid rgba(43,140,193,0.25)'                                   = GLASS.borderAccent   OK
const d: 'rgba(184,212,240,0.08)'                                            = glassCard.borderTopColor  OK
```

All four passed. `as const` over template literals whose substitutions are themselves literal types
gives a composed template-literal type, so `GLASS`'s derivation from `GLASS_TIER` is expressed in
the type system and not merely at runtime. `glassHeaderBar.background` was the one that did NOT -
see LOW 1, where the error text is quoted.

### 4. `GLASS_TIER`'s no-value-import rule is structurally enforced

`glass-tiers.ts:51` imports `ColorScheme` with `import type`, and the docblock at `:41-48` states
the cycle it prevents (`glass-tokens.ts` imports this module to derive four keys; the reverse edge
would evaluate template literals against `undefined` at init and ship
`linear-gradient(180deg,undefined,undefined)` past every type check). `import type` is erased, so
the cycle is impossible rather than discouraged. Correct, and correctly reasoned.

---

## MEDIUM

```
[MEDIUM] TIER_KEYS has hand-typed cardinality pins and NO membership pin, three lines below the
         comment explaining why W0/F2 removed exactly that shape for PALETTE_KEYS
Type: TIER_KEYS / TIER_PARTS (string[], .mjs)
File: .design-sync/check-rn-parity.mjs:353-354 (the lists);
      features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:151-156 (the pins)
Invariant violated / permitted invalid state: `PALETTE_KEYS` is held to `Object.keys(palette.dark)`
  by a MEMBERSHIP assertion (`:137-140`, W0/F2's fix), and the comment immediately above the new
  tier code says why: "Cardinality is DERIVED from the two key lists, never typed. W0/F2 removed
  the hand-typed .toBe(15); the same reasoning removes U1.1's hand-typed .toBe(81) - a literal
  total is exactly what lets someone shrink the table to reach green by editing one number here."
  The tier list then gets the opposite treatment: `expect(TIER_KEYS.length).toBe(6)`,
  `expect(TIER_PARTS.length).toBe(4)`, `expect(TIER_ANCHOR_KEYS.length).toBe(24)` - three
  hand-typed literals and no comparison to `GLASS_TIER` at all. `GlassVariant` and `GLASS_TIER`
  both exist and are importable from this test file.
Construction site: a seventh tier added to `GlassVariant` and to both halves of `GLASS_TIER` - the
  legitimate shape of a phone-side tier addition, and the direction `PALETTE_KEYS`'s pin exists to
  catch ("A palette token added without an anchor reds HERE", `:120-122`).
Downstream consequence - MUTATION PROBE 3. Mutated copy: the canonical
  `features/demo/ui/tokens/glass-tiers.ts`, in a private probe worktree; `TIER_KEYS` deliberately
  untouched. Added an `overlayTier` to `GlassVariant` and to both halves. Results:
  - `tsc --noEmit` -> **EXIT 0** (correct - the type invariant is satisfied);
  - `node .design-sync/check-rn-parity.mjs` -> **exit 0, still "115 anchor rows ... 24 glass-tier
    keys"** - the new tier is silently unanchored and the guard reports full coverage;
  - `rn-token-parity.test.ts` -> **PASSED, 0 failures** - every assertion in the file iterates
    TIER_KEYS / TIER_ANCHOR_KEYS, so all of them are tautological over the mutated list, and the
    three .toBe(6/4/24) literals are all still true.
  The mutation was ultimately **KILLED by a different gate** - `glass-tiers.test.ts`'s whole-object
  `toEqual` shape pin (1 failed / 14 passed, exit 1). That is why this is MEDIUM and not HIGH: the
  suite catches it. But the shape pin only forces you to NOTICE the new tier; the house rule for
  those lists is to rewrite the entry in place, after which nothing at all requires the anchor.
  `PALETTE_KEYS` carries both gates for precisely this reason, and W0/F2 was filed because the
  palette shape pin alone was not enough. Restore verified: `git checkout --`, `git diff` 0 bytes.
Fix: one line, in the tier case at `:150`:
  `expect([...TIER_KEYS].sort()).toEqual(Object.keys(GLASS_TIER[scheme]).sort())`, and delete the
  three `.toBe(...)` literals the same file's own comment argues against. `TIER_PARTS` needs no
  membership pin - it is cross-checked from the other side, because a part named there but not
  pushed in `checkParity` produces an anchor row that does not exist and reds the both-halves loop
  (traced, not assumed).
```

```
[MEDIUM] `GLASS.shadowCard` hard-codes the phone's DARK card shadow with no scheme indirection,
         in a PR where every other new value resolves through `[scheme]`
Type: GLASS.shadowCard
File: features/demo/ui/glass-tokens.ts:104 (`shadowCard: '0 4px 8px rgba(0,0,0,0.15)'`);
      consumed at :142 (`glassCard.boxShadow`) and screens/export/ExportCaseCard.tsx:138
Invariant violated / permitted invalid state: D2-amended, ratified, verbatim: **"Nothing
  hard-codes a dark value that has a light sibling."** The comment at `:96-99` transcribes
  `Layout.shadow.card.dark` and names it as such. Read at the source - phone
  `src/constants/Layout.ts:122-138` - `shadow.card` is a two-half record and the light half is
  materially different, not a tint of the dark one: `shadowColor 'rgba(30, 58, 138, 0.18)'` (a
  blue-tinted shadow, not black), `shadowOffset {0, 3}` (not 4), `shadowOpacity 1` (not 0.15).
  The CSS light value is therefore roughly `0 3px 8px rgba(30,58,138,0.18)` - a different colour,
  a different offset and a different opacity.
Construction site: `glassCard` at `:142` composes it into the card recipe's `boxShadow` at module
  init, unconditionally, for all nine `glassCard` consumers pinned in `glass-card-recipe.test.tsx`.
Downstream consequence: on the day the one-line scheme flip happens, every card in the demo keeps
  a black drop shadow under a white surface. It is also unanchored in the drift guard (correctly
  disclosed at `:100-102` - `Layout.shadow` is one of the three things the phone's design-sync
  generator does not emit), so nothing mechanical will ever notice either. Unlike
  `PrimaryButtonGradient.light` - which I raised in W0 and which is now ledgered with an owner -
  this value's light sibling EXISTS, is KNOWN, and could have shipped in the same shape as every
  other tier value in this module.
Fix: either give it the two-half shape the rest of the wave uses - a
  `{ light: '0 3px 8px rgba(30,58,138,0.18)', dark: '0 4px 8px rgba(0,0,0,0.15)' } as const` read
  through `[scheme]`, matching `GLASS_TIER`'s own idiom - or, if the light value is deliberately
  out of scope, ledger it with an owner and a trigger before merge, the disposition the same
  question got in W0. `shadow.card` appears exactly ONCE in the master plan (U1.2's row), so no
  later package currently owns the light half.
```

```
[MEDIUM] Two two-scheme records now exist and nothing gates direct-half access in production
         source - the "one-site flip" contract is still prose-only
Type: GLASS_TIER / palette (the access shape, not the records)
File: features/demo/ui/tokens/glass-tiers.ts:27-29 ("Consumers resolve GLASS_TIER[scheme]");
      features/demo/ui/tokens/palette.ts:176-177 ("no consumer may reach for palette.dark
      directly"). The rule's only enforcement is those two sentences.
Invariant violated / permitted invalid state: plan section 9 clause 12 makes the consumed scheme a
  single site. U1.1 doubled the number of records that clause governs, and `glass-tokens.ts:19`
  now actively directs new code to "reach for GLASS_TIER[scheme].<tier> directly". A new consumer
  writing `GLASS_TIER.dark.sheet` type-checks, renders identically today, passes every gate, and
  silently converts the flip into a two-site change.
Construction site: any of the six later packages the module names as its consumers (U2.4 / U4.1 /
  U5.1 among them, `glass-tiers.ts:2`). U1.4's own report records probe P10 finding that nothing
  catches it.
Downstream consequence: today, nothing - I grepped every reference and production is clean (two
  sites, both `[scheme]`; every direct-half access is a test, and the contrast test's
  `LIGHT_GROUNDS` must read the light half by definition). The cost is that the contract degrades
  silently and is only cashed in on a day with no reviewer.
Fix: the mechanism already exists and needs no new machinery. `glass-tokens.test.ts`'s
  `sourceFiles(UI_ROOT)` scan already walks every non-test file under `ui/` looking for banned
  SUBSTRINGS, with a `TOKEN_MODULES` allow-list. Add `GLASS_TIER.dark`, `GLASS_TIER.light`,
  `palette.dark` and `palette.light` as banned source patterns - `tokens/palette.ts` and
  `tokens/glass-tiers.ts` are already in `TOKEN_MODULES`. About three lines, in the same list every
  later package is already instructed to append to. That converts D2's central claim from a
  docblock into a gate before eight more waves are built on it.
```

## LOW

```
[LOW] `header-chrome.ts` annotates `CSSProperties` where the sibling token module in the same PR
      uses `as const satisfies CSSProperties` - measured, the literal types are erased
Type: glassHeaderBar / glassWizardHeaderBar / glassHeaderFooterBar
File: features/demo/ui/controls/header-chrome.ts:72, 84, 100
Invariant violated / permitted invalid state: no invalid state is admitted - excess-property
  checking still applies to an object literal assigned to an annotated type, so a typo'd CSS
  property is still a compile error. What is lost is the derivation being visible in the type.
  Measured with a throwaway type-probe in the probe worktree:
  `const e: 'linear-gradient(180deg,rgba(0,38,80,0.95),rgba(2,46,89,0.98))' = glassHeaderBar.background`
  gives `TS2322: Type 'Background<string | number> | undefined' is not assignable to type
  '"linear-gradient(...)"'`. The same probe lines against `GLASS.gradientCard`, `GLASS.borderSoft`,
  `GLASS.borderAccent` and `glassCard.borderTopColor` all PASSED - `glass-tokens.ts` keeps its
  literals through `as const satisfies CSSProperties`.
Construction site: `glassWizardHeaderBar` at `:84-87` spreads `glassHeaderBar`, so it inherits the
  widened `string | undefined` for `background` and `borderBottom` too.
Downstream consequence: a consumer or test cannot express a compile-time identity against the
  header recipe - the `satisfies typeof colors.primaryDark` device W0/F7 introduced for exactly
  this purpose is unavailable here, so the header pins are runtime-only.
Fix: `} as const satisfies CSSProperties` on all three, matching `glassCard` / `glassCardNested` /
  `glassBtnPrimary` in `glass-tokens.ts`. Purely additive; no consumer's usage changes.
```

## Considered and dropped

- **`GlassVariant` as a hand-written union rather than `keyof typeof GLASS_TIER.dark`.** The
  hand-written form is stronger here, not weaker: it constrains BOTH halves symmetrically, so
  adding a tier is a deliberate three-place edit. Probe 2 confirms it. Not a finding.
- **`innerShadow` unanchored in the drift guard.** Disclosed at `check-rn-parity.mjs:336-344` with
  the reason (it is not a CSS value on either side, so an anchor would compare two transcriptions
  rather than a contract) and with the gap named - `glass-tiers.test.ts` is its only gate, stated
  in the file. The PR body carries it as a proposed deferral. Correct as disclosed.
- **`glassCardNested` carries no elevation shadow.** Deliberate, matrix A55, reasoned at
  `glass-tokens.ts:163-167`. Not a finding.
- **The `border` / `borderTopColor` key-order hazard.** Real, but it is a CSS-semantics and
  test-coverage question owned by the web lane; `glass-card-recipe.test.tsx` pins it across all
  nine consumers in the DOM, which is the right place. Out of my lane.

---

## Type Design Summary
CRITICAL: 0 - HIGH: 0 - MEDIUM: 3 - LOW: 1
Verdict: **APPROVE with comments**

| Check | Result |
|---|---|
| Canonical homes preserved (no parallel entity declarations) | **yes** - `GlassTier` / `GlassVariant` live in the seam; `header-chrome.ts` composes, never re-declares |
| Discriminated unions well-formed | **yes** - `ColorScheme` is the discriminant, `scheme` a satisfies-constrained literal |
| Exhaustiveness enforced | **n/a** - no new switch over a union |
| Correlated state modelled as a union | **n/a** |
| Id spaces typed | **partial** - `GlassVariant` types the tier space in TS; the guard's `TIER_KEYS` mirror is unpinned (MEDIUM 1) |
| readonly discipline on shared data | **yes** - `GLASS_TIER` is `as const` with `readonly [string, string]` gradients; every `GlassTier` field is `readonly` |
| Boundary types honest about untrusted input | **n/a** - no new boundary type this wave |
| Two-scheme discipline (D2) | **gap** - `GLASS.shadowCard` (MEDIUM 2) and no gate on direct-half access (MEDIUM 3) |
| Mutation probes | 4 run - 3 KILLED, 1 killed only by a different gate (probe 3, filed MEDIUM 1). Restores proved byte-identical; probe worktree torn down with the script's proof line |

Out-of-lane observations: the `border` / `borderTopColor` shorthand-erasure hazard is well pinned
in `glass-card-recipe.test.tsx` but belongs to the web lane; I did not evaluate its coverage.
