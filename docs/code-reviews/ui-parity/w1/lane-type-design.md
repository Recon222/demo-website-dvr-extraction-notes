# Lane: type-design - Wave 1 (U1), PR #40/#41

## Round 2 (fix delta)

Warm, scoped. Phase branch `feat/uiparity-w1` @ `d91ab76`, delta `044578a..d91ab76`. Authority:
the "rider round" mapping comment on PR #41. Probes ran in `probe/w1d2-types-scan` (own worktree
off `d91ab76`), torn down via `tools/worktree-remove.ps1` - "unlinked 549 junction(s) in 2
pass(es)", `.pnpm` 240 -> 240, exit 0.

Baseline at `d91ab76` BEFORE any mutation: `tsc --noEmit --incremental false` -> **EXIT 0**;
`glass-tokens.test.ts` + `glass-card-recipe.test.tsx` -> **34 passed, exit 0**. That green run is
itself the negative control the fix commit calls C0: F15's `satisfies typeof
palette.dark.primaryDark` is LIVE at `glass-tokens.ts:77`, inside a file the scan covers, and it
does not red. The `typeof` carve-out is load-bearing production source, not a hypothetical.

### F23 - FIXED, all three forms, verified independently

`69dbd34` deletes the record roster instead of extending it: the identifier is now a wildcard and
the only exemption is the FILE.

```
member access  /(?<!\btypeof\s+)\b[A-Za-z_$][\w$]*\s*(?:\.\s*|\[\s*['"])(?:dark|light)\b/
destructure    /\{[^}]*\b(?:dark|light)\b[^}]*\}\s*=\s*[A-Za-z_$][\w$]*/
```

Re-probed my two r1 survivors plus the record their own round created, one mutation each, against
the canonical files:

```
SHADOW_CARD[scheme] -> SHADOW_CARD.dark   (glass-tokens.ts:177)
   KILLED  exit 1   AssertionError: expected [ 'glass-tokens.ts' ] to deeply equal []
GLASS_TIER[scheme] -> GLASS_TIER['dark']  (header-chrome.ts:72)
   KILLED  exit 1   AssertionError: expected [ 'controls/header-chrome.ts' ] to deeply equal []
const { dark: halves } = GLASS_TIER       (header-chrome.ts:72)
   KILLED  exit 1   AssertionError: expected [ 'controls/header-chrome.ts' ] to deeply equal []
```

Restore proved after each: `git checkout --`, `git diff` **0 bytes**, both suites 34/34 green.

`SHADOW_CARD.dark` is the one worth naming: it is a two-half record that F19 created in the SAME
round as F18's scan, and the roster never learned about it. That is the enrolment failure mode,
observed rather than argued - and it is the third recurrence of one class in this campaign
(W0 F2 `PALETTE_KEYS`, W1 F16 `TIER_KEYS`, F23 here). Deleting the roster is the correct
generalisation and I would have prescribed extending it, which would have been the fourth.

**Ruling on the wildcard plus `SCHEME_DECLARERS` (the coordinator's question).**
`SCHEME_DECLARERS` is still a two-entry `ReadonlySet<string>` of paths, and it **matters less than
it did**, not more. The list that could go stale in a dangerous direction - the roster of record
NAMES - no longer exists, so there is nothing to keep in step and a two-half record added next
wave is covered on the day it is written. What remains is a file exemption whose both stale
directions fail safe: a renamed declarer stops being exempt and REDS; a path that no longer
exists exempts nothing. There is no type for "a path in this repo", the sibling `TOKEN_MODULES`
is the identical shape and is a review-hardened decision U0.5's row forbids relaxing into a
predicate, and typing or deriving it would prove nothing. **No finding**; this is the right shape
and it is now the smaller of the two surfaces it used to be.

---

### `7a0c505` - the longhand fragments: scan/guard-pinned only, NOT type-guarded. **Proposal, not a finding.**

Answering the coordinator's question with a measurement rather than a reading. Mutation: put a
`border` shorthand back into `glassCard`, ahead of the longhands.

```
tsc --noEmit --incremental false                      EXIT 0   the TYPE permits it
glass-card-recipe.test.tsx                            EXIT 1   2 failed
  "a card fragment must not carry `border`:
     expected [ 'borderRadius', 'border', ...(8) ] to not include 'border'"   (:257)
  "expected 'rgba(184, 212, 240, 0.08)' to be 'rgb(1, 1, 1)'"  (the consumer-level cell)
```

So the contract is real and enforced at runtime in two independent places - and not at all at the
type level. `as const satisfies CSSProperties` admits `border`, `borderColor` and `borderTop`, and
a guard would be three lines with no new machinery:

```ts
type NoBorderShorthand = { [K in 'border' | 'borderColor' | 'borderTop']?: never }
export const glassCard = { ... } as const satisfies CSSProperties & NoBorderShorthand
```

**I rule it a PROPOSAL and am not filing it.** Three reasons, in order of weight:

1. **It would guard the half that does not break.** The type constrains the DECLARATION - two
   static literals, one file, one author. It cannot constrain a consumer writing a border
   shorthand after the spread, and the call site is where the hazard actually lives: 22
   consumers, and the form that "was right on the first paint and wrong on the next" - the trap
   that ships green through a render-once test. That half is not typeable at all, and this round
   covered it with two real mechanisms: the per-consumer DOM loop, and React's own
   conflicting-property warning promoted to a repo-wide test failure (`7fc126b`), which caught
   four live defects on its first run. Adding type machinery for the cheap half while the
   expensive half stays runtime-guarded is churn, not coverage.
2. **`deferred.md` §27 is exactly this shape** - the ratified precedent that a test is the
   accepted enforcement for a static, single-author literal and that a type-level fix there is
   disproportionate. Its un-defer trigger ("if the registry stops being a single static literal")
   has not fired: the fragments are still two literals in one file.
3. **The existing pin is specific and immediate.** It names the offending key in the failure
   message and bans exactly the three keys in the hazard class. I checked the omissions:
   `borderBottom` / `borderLeft` / `borderRight` are per-side and cannot erase the TOP edge, so
   they are correctly absent. (`borderBlock` would, but this repo uses no logical properties
   anywhere; not worth an entry.)

If the aggregator wants it anyway it is cheap and harmless - but it buys a compile error for the
one edit that already fails loudly, and buys nothing for the one that used to ship silently.

## Residual, not filed

- **The wildcard's false-POSITIVE surface is unbounded by construction.** Any `x.dark` /
  `x.light` / `x['light']` in a scanned file now reds. Measured today: 138 non-test files under
  `ui/`, **zero** offenders. The forward risk is a future token record with a `light` key meaning
  something other than a scheme (a font weight, a shadow tone). The failure mode is a loud,
  legible red that a human resolves by renaming the key or exempting the file - the safe
  direction - and the implementer measured the cost before widening. Worth a ledger line with the
  trigger "a package reds this scan on a non-scheme `light`/`dark` key", not a finding.
- `INVARIANT` still needs hand-maintained sort order (carried from round 1, unchanged).

## Regression sweep over the rider commits' blast radius

- **`glassCard` / `glassCardNested` gained five keys each** (`borderStyle`, `borderWidth`, three
  side colour longhands) and lost `border`. Both are still `as const satisfies CSSProperties`, so
  the literal types survive and a typo'd CSS property is still a compile error. `tsc` exit 0.
- **`SCHEME_HALF` became `readonly RegExp[]`** consumed with `.some(...)`. Typed correctly; the
  array is module-local and immutable.
- **`vitest.setup.ts` promotes React's conflicting-property warning to a failure repo-wide.**
  Out of my lane (no type surface), but noted: it is a mechanism-level guard for the class my
  lane cannot type, and it found four live defects immediately. That is the right trade against
  the `NoBorderShorthand` proposal above.
- Baseline at the merged head, before any mutation: `tsc` exit 0; the two suites 34/34.

---

## Type Design Summary (Round 2 fix delta)
CRITICAL: 0 - HIGH: 0 - MEDIUM: 0 - LOW: 0
Prior-round findings: F23 **FIXED** (0 PARTIAL, 0 UNFIXED)
Verdict: **APPROVE**

| Check | Result |
|---|---|
| Fix addresses the finding, not the symptom | **yes** - the roster was deleted rather than extended, which closes the recurrence class, not just my two forms |
| Fix-introduced regressions in blast radius | **none** |
| Prescriptions superseded on evidence | **one** - I would have extended the roster; deleting it is correct, and `SHADOW_CARD.dark` is the observed proof |
| Type-level guard on the longhand fragments | **absent by ruling** - proposal recorded above, deliberately not filed (§27) |
| Mutation probes this round | 4 - **4 KILLED, 0 SURVIVED**, plus the C0 negative control confirmed on the clean tree. Restores proved byte-identical (`git diff` 0 bytes); probe worktree torn down with the script's proof line |

Out-of-lane observations: none new this round.

---

## Round 1 (fix delta)

Warm seat. Phase branch `feat/uiparity-w1` @ `044578a`, delta `fc75577..044578a`. Authority: the
fix-mapping comment on PR #41. Worktree HEAD is `1b4ac86`; I confirmed
`git diff 044578a..HEAD -- '*.ts' '*.tsx' '*.mjs'` is **empty**, so the code under review is
identical and I probed off `044578a` as briefed. Probes ran in `probe/w1d-types-fixes` (own
worktree), torn down via `tools/worktree-remove.ps1` - "unlinked 549 junction(s) in 2 pass(es)",
`.pnpm` 240 -> 240, exit 0. No leftover `probe-w1d-types-*` existed to clean; the two probe trees
on disk (`probe-u2.2-recipe`, `probe-w1d-tests`) belong to other lanes and I left them alone.

Baseline at `044578a` BEFORE any mutation: `tsc --noEmit --incremental false` -> **EXIT 0** -
guard -> **exit 0, 115/115** - `rn-token-parity.test.ts` + `glass-tokens.test.ts` -> **25 passed,
exit 0**.

### My findings, per the mapping

| F-ID | My r0 finding | Status |
|---|---|---|
| F16 | `TIER_KEYS` cardinality-only, no membership pin | **FIXED** |
| F19 | `GLASS.shadowCard` dark-only | **FIXED** |
| F18 | no gate on direct-half access | **PARTIAL** - see the new MEDIUM |
| F20 | `header-chrome.ts` `CSSProperties` annotation (my LOW) | **FIXED** |

---

**F16 - FIXED, and better placed than I asked.** `3c31600` replaces `.toBe(6/4/24)` with two
membership assertions against the module: `[...TIER_KEYS].sort()` vs
`Object.keys(GLASS_TIER.dark).sort()`, and `[...anchoredFields, ...UNANCHORED].sort()` vs
`Object.keys(GLASS_TIER.dark.card).sort()`. The second one is the part I did not ask for and it is
the better half of the fix: it catches a FIFTH tier PART, which would otherwise reach the screen
through U1.2's recipe with no anchor - a shape I did not probe. `UNANCHORED = ['innerShadow']`
turns the exclusion into a NAME rather than the arithmetic difference between 4 and 5, matching
the `SCHEME_INVARIANT` idiom the file already uses.

The integrator then moved both pins into W0/F11's ungated `the guard's local invariants` describe.
That is exactly right and worth calling out: both sides are local, so leaving them in a `skipIf`
case would have re-created the defect F11 fixed one wave earlier.

**Re-probed my r0 mutation, in both conditions.** Mutated copy: the canonical
`features/demo/ui/tokens/glass-tiers.ts`; `TIER_KEYS` untouched. Mutation: a seventh
`overlayTier` added to `GlassVariant` and both halves.

```
r0, 28e7993, phone present   SURVIVED in the guard test (killed only by glass-tiers.test.ts)
r1, 044578a, phone PRESENT   KILLED  exit 1   Tests  1 failed | 17 passed (18)
r1, 044578a, phone ABSENT    KILLED  exit 1   Tests  1 failed | 9 passed | 8 skipped (18)
   failing case both times: "the guard's local invariants - nothing here reads the phone repo >
   anchors exactly the six glass tiers and every part of one"
```

The `es5` follow-up `e56c0f1` (`indexOf` dedupe instead of `[...new Set()]`, which is TS2802
under this tsconfig) is correct and the comment names the reason.

**On the `.mjs` import boundary (the coordinator's question).** `TIER_KEYS` / `TIER_PARTS` arrive
from JavaScript, so TS infers `string[]` and the comparison is a runtime `toEqual`. That is the
right answer and there is nothing to type here: the lists are hand-maintained *because* the guard
cannot import the TS module, and a type annotation on an untyped import would assert a shape the
compiler never checked. The membership assertion is the only construct that can close the loop,
and it is the one they used. No finding.

---

**F19 - FIXED, in the house idiom, with the right discriminant.** `7ba1825` ships

```
export const SHADOW_CARD = {
  light: '0 3px 8px rgba(30,58,138,0.18)', // Layout.ts:123-128
  dark:  '0 4px 8px rgba(0,0,0,0.15)',     // Layout.ts:130-136
} as const satisfies Record<ColorScheme, string>
```

read at `:155` as `shadowCard: SHADOW_CARD[scheme]`. Answering the coordinator's question
directly: **yes** - `Record<ColorScheme, string>` is the same discriminant `palette.ts:166` and
`glass-tiers.ts:186` use, so a half added to or dropped from this record is a compile error the
same way theirs are, and the consumed half resolves through the same one `scheme` site.

The light value is exactly what I derived from phone `Layout.ts:122-138` independently -
`rgba(30,58,138,0.18)`, offset 3 not 4 - and the docblock records the two things that make it not
a re-tint of dark (`shadowOpacity: 1` there, so the colour's alpha is final; blue-tinted because
a neutral black shadow disappears against white). The "nothing anchors this" gap is stated at the
constant and ledgered (§95), which is the disposition I asked for.

---

**F20 - FIXED.** `700ce2b` puts `as const satisfies CSSProperties` on all three header fragments,
matching `glassCard` / `glassCardNested`. `tsc` exit 0.

---

**F15 - a defect in MY OWN W0/F7 fix, correctly caught by another seat.** `8d65308` re-binds
`ACCENT_FROM` from `satisfies typeof colors.primaryDark` to
`satisfies typeof palette.dark.primaryDark`. `colors` is `palette[scheme]`, so my W0 fix tied a
scheme-INDEPENDENT constant to the CONSUMED scheme and turned plan section 9 clause 12's one-site
flip into a hard TS1360 in this very module. I did not catch that in W0 or in my W1 round-0 pass;
the finding is correct and I am recording it against my own prior work.

Probed both halves of their claim rather than reading it (one mutation each, canonical files):

```
scheme = 'light'                          tsc EXIT 0   the flip compiles again
palette.dark.primaryDark -> '#1F6B9A'     tsc EXIT 2   glass-tokens.ts(77,31): TS1360:
                                                       Type '"#1F6B99"' does not satisfy the
                                                       expected type '"#1F6B9A"'
```

Both hold: the flip is restored AND F7's kill is preserved. The binding is now to the half the
constant actually belongs to, which is what it should always have been.

---

## F18 - PARTIAL, and one new MEDIUM

The gate exists, and the prescription they shipped is **better than the one I wrote**: I said to
reuse `sourceFiles(UI_ROOT)` with `TOKEN_MODULES` allow-listed, and `c0458b6` points out that
`TOKEN_MODULES` exempts `glass-tokens.ts` - one of the exactly two production consumers the scan
exists to watch. Scanning with my list would have left half the live exposure uncovered while
reporting green. `sourceFiles(dir, skip)` plus a separate `SCHEME_DECLARERS` is the right shape,
and the `typeof` carve-out is necessary (F15 requires a scheme-independent
`satisfies typeof palette.dark.primaryDark` in the scanned file). Comment-stripping is required
too, since three of the four files spell the forbidden text in prose in order to forbid it.

**Ruling on `SCHEME_DECLARERS` being a string list (the coordinator's question): correct as
shipped, no finding.** There is no type for "a path in this repo", the sibling `TOKEN_MODULES` is
the identical `ReadonlySet<string>` shape and is itself a review-hardened decision that U0.5's row
explicitly forbids relaxing into a predicate, and both failure directions of a stale entry are
safe: a renamed declarer stops being exempt and REDS, a path that does not exist exempts nothing.
Nothing here is typeable in a way that would prove anything.

What is not closed is the regex's reach.

```
[MEDIUM] The scheme-half scan matches dot access only, so the two evasions closest in shape to
         the CORRECT idiom pass it
Type: SCHEME_HALF
File: features/demo/ui/__tests__/glass-tokens.test.ts:112 -
      /(?<!\btypeof\s+)\b(?:GLASS_TIER|palette)\s*\.\s*(?:dark|light)\b/
      asserted at :244-249, titled "no production module hard-codes a scheme half (plan §9
      clause 12)"
Invariant violated / permitted invalid state: the case's title claims coverage of hard-coding a
  scheme half; the pattern covers one spelling of it. Completeness sweep over every form that
  names a half in a value position, each probed as a single mutation at `glass-tokens.ts:115`
  (the canonical file, the exact line the scan exists to watch):
    GLASS_TIER.dark        -> KILLED   (the form I reported and they fixed)
    GLASS_TIER['dark']     -> SURVIVED  exit 0, "Tests 7 passed (7)"
    const { dark: tier }   -> SURVIVED  exit 0, "Tests 7 passed (7)"
Construction site: any of the six later packages `glass-tiers.ts:2` names as consumers. The
  bracket form is the one that matters: the MANDATED idiom is `GLASS_TIER[scheme]`, so a
  developer hard-coding a half by copying the correct shape writes `GLASS_TIER['dark']` far more
  naturally than `GLASS_TIER.dark`. The evasion nearest the right answer is the one that passes.
Downstream consequence: nothing today - production is clean, and I re-grepped to confirm the two
  live sites are still `GLASS_TIER[scheme]` (`glass-tokens.ts:115`, `header-chrome.ts:63`). The
  cost is that this scan is the ONLY mechanism for D2's central claim for eight more waves, and
  it reports green over two thirds of the shapes it is titled to catch. As the docblock itself
  says: while the demo renders dark the two expressions are the same object, so no behavioural
  pin can ever see it and the source scan is all there is.
Fix: widen the accessor half of the pattern - `(?:\.\s*|\[\s*['"])` before the half name, with
  the closing quote/bracket optional-matched - and add a destructuring alternative
  (`\{[^}]*\b(?:dark|light)\b[^}]*\}\s*=\s*(?:GLASS_TIER|palette)`). Both stay inside the
  existing `it`; no new mechanism, and the two probes above become its negative controls.
```

---

## The carry's `INVARIANT` typing - ruling

`rn-token-parity.test.ts:286`:
`const INVARIANT: readonly PaletteToken[] = ['onError', 'onPrimary']`, asserted equal to the
guard's now-exported `SCHEME_INVARIANT`.

**The integrator's argument is right, and what they shipped is the correct response to it.**
Typing the `.mjs` IMPORT would prove nothing - annotating an untyped JS export as
`readonly PaletteToken[]` is an assertion the compiler accepts without checking, i.e. exactly the
lie my W0 LOW was trying to remove. Declaring a separately-typed local literal and asserting
runtime equality against the guard's array is the only construction that closes both directions:
a typo in the MIRROR is a compile error (TS2322 on the literal), and a typo in the guard's real
list - the array that actually excludes, at `check-rn-parity.mjs:503` - reds the `toEqual`. The
`.mjs` array staying the one thing that excludes (F17) is also right; two lists that both excluded
would be the drift surface.

This supersedes my W0 `new Set<PaletteToken>` shape, which no longer applies once the exclusion
moved into the guard. No finding.

Residual, not filed: `INVARIANT` must be hand-maintained in sorted order, because the assertion
compares `[...SCHEME_INVARIANT].sort()` to an unsorted `[...INVARIANT]`. It is sorted today and a
mistake fails immediately and legibly; `.sort()` on both sides would remove the coupling.

---

## Regression sweep over the fix commits' blast radius

- **`glass-tokens.ts` gained a `palette` VALUE import** (F15) alongside `colors`, `scheme` and the
  `ColorScheme` type. No cycle: `palette.ts` still imports nothing, and `glass-tiers.ts`'s only
  import is `import type`. `tsc` exit 0.
- **`SCHEME_INVARIANT` moved into the `.mjs`** and is now consumed by `checkParity()` itself
  (F17). The test imports it rather than restating it - one place, one meaning. Guard exit 0,
  115/115.
- **`sourceFiles` gained a second parameter** with `TOKEN_MODULES` as its default, so the
  pre-existing banned-literal scan is unchanged by construction. Both scans green at baseline.
- **Two header-tier literals added to `BANNED`** (F22). No interaction with the type surface;
  `glass-tokens.test.ts` 7/7 green.
- Baseline at the merged head: `tsc` exit 0 - guard exit 0, 115/115 - the two token suites 25/25.

---

## Type Design Summary (Round 1 fix delta)
CRITICAL: 0 - HIGH: 0 - MEDIUM: 1 - LOW: 0
Prior-round findings: F16 **FIXED** - F19 **FIXED** - F20 **FIXED** - F18 **PARTIAL** (0 UNFIXED)
Verdict: **APPROVE with comments**

| Check | Result |
|---|---|
| Fixes address the finding, not the symptom | **yes** - F16 and F18 both shipped a wider fix than I prescribed, each for a reason I verified |
| Fix-introduced regressions in blast radius | **none** |
| Prescriptions refuted on evidence | **two, both correct** - F18's exemption list (mine would have skipped `glass-tokens.ts`) and the `INVARIANT` typing argument |
| Defect found in my own prior fix | **one** - W0/F7 bound a scheme-independent constant to the consumed scheme; F15 caught and fixed it, verified both ways |
| Mutation probes this round | 5 - 3 KILLED, **2 SURVIVED** (the two F18 evasion forms, folded into one MEDIUM). Restores proved byte-identical (`git diff` 0 bytes); probe worktree torn down with the script's proof line |

Out-of-lane observations: none new this round.

---

## Round 0 (initial review) - retained below

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
