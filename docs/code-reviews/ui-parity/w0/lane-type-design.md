# Lane: type-design - Wave 0 (U0), PR #39 `feat/uiparity-u0` @ `7099e54`

Mode: **code review**. Base: `master`. Read in the shared worktree `worktrees/u0-phase`;
every probe ran in a private worktree (`probe/w0-types` off `7099e54`), torn down via
`tools/worktree-remove.ps1` - *"unlinked 549 junction(s) in 2 pass(es)"*, `.pnpm` 240 -> 240, exit 0.

Single question: **do the types in this change enforce the invariants the code depends on, or do
they let invalid states through?**

Baseline in the probe tree before any mutation: `rm -f tsconfig.tsbuildinfo && pnpm exec tsc
--noEmit --incremental false` -> **EXIT 0**; `node .design-sync/check-rn-parity.mjs` -> **exit 0,
33/33 anchor rows OK** (the sibling phone repo resolves on this box, so the guard is not skipping -
the "a skipped test is not a killed mutant" hazard was checked, not assumed).

---

## What was verified, not assumed (the brief's four direct questions)

### 1. The "ONE key set across both halves" invariant IS type-enforced, in all four directions

`features/demo/ui/tokens/palette.ts:113` derives `PaletteToken = keyof typeof dark` and `:166`
constrains the other half with `as const satisfies Record<PaletteToken, string>`. The docblock at
`:14-17` claims this is a compile error "in both directions". **Probed all four, one mutation each:**

| # | Mutation | Result |
|---|---|---|
| 1 | drop `linkHover` from `light` (`:156`) | **KILLED** - `TS1360 ... Property 'linkHover' is missing`, EXIT 2 |
| 2 | add `probeOnlyKey` to `light` only | **KILLED** - `TS2353 ... 'probeOnlyKey' does not exist in type Record<...>`, EXIT 2 |
| 3 | add `probeDarkOnly` to `dark` only | **KILLED** - `PaletteToken` widens, `light` fails the constraint, EXIT 2 |
| 4 | drop `linkHover` from `dark` only | **KILLED** - `PaletteToken` narrows, `light`'s key becomes excess, EXIT 2 |

Restore proved byte-identical after each (`git checkout --` plus an empty `git diff`). The author's
claim holds exactly as written, including the asymmetry the foundation report's successor note item 3
warns about (`dark` is the definer, `light` the constrained half). This is the strongest type work in
the PR and it needs no change.

### 2. A malformed drift-guard anchor is caught LOUDLY, not silently

Probe 9: appended `'linkHoverTypo'` to `PALETTE_KEYS` (`.design-sync/check-rn-parity.mjs:238-254`).
**KILLED** - both rows report `PARSE-FAILED (field not found: linkHoverTypo)`, the standalone runner
prints "the guard is BLIND there" and exits **1**, and *the other 33 rows still resolved* (U0.0's
per-anchor degrade doing its job). `checkParity()`'s `drift` set includes parse failures by
construction (`:336`), and `rn-token-parity.test.ts:74-84` asserts `parseFailed` empty separately
from `drift` empty. The `.mjs` file carries no types, but the failure mode the brief asked about - a
malformed anchor going *silently* PARSE-FAILED - does not exist: PARSE-FAILED is itself the alarm.
The complementary hazard (a reader that resolves to the *wrong* region and compares a block to
itself) is closed by `rn-token-parity.test.ts:103-128`, which asserts every anchored key's light and
dark reads differ. That pair is well designed.

### 3. `T`'s aliases: 8 typed re-exports, 10 fresh literals

`input-theme.ts:19-45`. Genuinely re-exported: `bg`, `raised`, `border`, `text`, `textMute`,
`textFaint`, `primary`, `error` - and `palette.test.ts:151-166` pins that mapping at runtime with
`satisfies Record<string, PaletteToken>`, so a re-point reddens. The other ten stayed literals; two
of them are dead keys (finding L1) and one (`rowH`) is disclosed by the implementer (below).

### 4. Numeric branding for pt/px in `scale.ts` - considered and DROPPED

No mix-up exists in the code under review. Every `scale.ts` value is a unitless number consumed as a
`CSSProperties` number (px), the guard's one cross-unit comparison (`touchFloor`) is explicitly
documented at `check-rn-parity.mjs:329` as scheme- and unit-invariant geometry, and the persona's
"no brands exist here" rule applies. Not a finding.

---

## MEDIUM

```
[MEDIUM] `flattenOver`'s "the last ground is opaque" invariant is prose-only, and the
         zero-grounds arm silently returns an uncomposited colour
Type: flattenOver(top: string, ...grounds: string[]): string
File: features/demo/ui/tokens/scale.ts:151-165
Invariant violated / permitted invalid state: the docblock (`:138-140`, `:149`) states that the last
  ground is TREATED AS OPAQUE and that its alpha is discarded, and the foundation report's successor
  note item 6 repeats it. The signature enforces neither half. `...grounds: string[]` admits ZERO
  grounds, in which case `:152` returns `top` unchanged - a translucent colour handed back as if it
  had been flattened.
Construction site: features/demo/ui/__tests__/palette-contrast.test.ts:98-102 - `flatten(stack)`
  destructures `const [top, ...grounds] = stack` and spreads, so any one-element ground stack reaches
  the zero-grounds arm. `contrast(fg, grounds)` at `:109-114` calls it on every row.
Downstream consequence / MUTATION PROBE 8: mutated copy = the canonical
  `features/demo/ui/__tests__/palette-contrast.test.ts`, in a private probe worktree (jsdom; no
  motion path involved). Added one case asserting
  `contrast('#ffffff', ['rgba(0, 0, 0, 0.1)'])` equals `contrast('#ffffff', ['#000000'])`.
  Result: **PASSED, exit 0** - a 10%-opacity black ground measures 21.00, identical to pure black.
  The alpha is dropped entirely and the file reports a confident, wrong ratio. This is precisely the
  failure the file's own `:191` note ("both stacks must bottom out at `background` and never at a
  glass stop") and `:94-96` ("do not remove that line") exist to prevent - and it is the one class
  `stack.forEach(parse)` cannot catch, because `rgba(0, 0, 0, 0.1)` parses fine. U1.1 hand-writes
  nine ground stacks per scheme against this helper (`:168-181`), where a stack ending on a glass
  stop instead of `background` is a one-token edit away.
Fix: make the first ground a required parameter - `flattenOver(top: string, ground: string,
  ...rest: string[])`. That makes the empty case a compile error with no new machinery, matching the
  house habit of making an impossible state unrepresentable (`RetentionView`,
  `engine/logic/retention.ts`). The alpha half cannot be expressed in a type; a one-line
  `parseColor(last)[3] === 1` assert in `flattenOver`, or in the contrast test's `flatten`, is the
  boundary guard for it. Restore verified byte-identical.
```

```
[MEDIUM] `ACCENT_FROM` re-types `colors.primaryDark` instead of deriving it - the only thing
         linking them is a guard that reports green when the phone repo is absent
Type: const ACCENT_FROM / ACCENT_TO
File: features/demo/ui/glass-tokens.ts:34-35 (and the token it duplicates,
      features/demo/ui/tokens/palette.ts:47)
Invariant violated / permitted invalid state: the phone models the CTA's top stop as a REFERENCE -
  `PrimaryButtonGradient.dark = [Colors.dark.primaryDark, '#17527A']` - and this PR's own comment at
  `glass-tokens.ts:31-32` records that. The demo re-types the hex, so `#1F6B99` now has two
  independent web-side definitions with no structural link. Nothing inside the demo enforces
  `ACCENT_FROM === colors.primaryDark`: `palette.test.ts:59` pins one to a literal and
  `glass-tokens.test.ts` pins the other to a literal, and neither compares them.
Construction site: the realistic path is the phone re-basing `primaryDark`. The drift guard would
  redden on two rows (`primaryDark.*` and `gradientTop.dark`, since the RN side RESOLVES the
  reference via `rnRef('dark')` at `check-rn-parity.mjs:324`), but that whole suite is
  `it.skipIf(!rnAvailable())` - a hazard `rn-token-parity.test.ts:24-30` documents in its own words:
  "a CI without the phone repo reports green regardless of drift." On such a run, updating
  `palette.ts` alone leaves the CTA gradient's top stop on the retired colour with a fully green suite.
Downstream consequence: `GLASS.accentFrom`, `GLASS.gradientAccent`, `T.accentFrom`, `glassBtnPrimary`
  and `ExportCaseCard.tsx:127,129` (the expanded-card border and its `withAlpha` glow) would all
  paint a colour the palette no longer contains - and the contrast rows at
  `palette-contrast.test.ts:307-317` measure `onPrimary` against `GLASS.accentFrom`, so the AA claim
  would move WITH the stale value rather than fail on it. That is the same tautology the file's own
  `:35-39` deep-import rule and its `:350-356` DangerFill note exist to forbid.
Fix: `const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark`. PROBED, three ways:
  (a) with the `satisfies` added and nothing else changed, `tsc --noEmit` -> **EXIT 0**;
  (b) with it in place, mutating `palette.ts:47` to `'#1F6B9A'` -> **KILLED**,
      `glass-tokens.ts(34,31): error TS1360: Type '"#1F6B99"' does not satisfy the expected type
      '"#1F6B9A"'`, EXIT 2;
  (c) the drift guard is UNAFFECTED - `readConst`'s `VALUE` alternation takes the quoted literal and
      ignores the trailing `satisfies`. Verified by running the guard with the fix in place:
      **33/33 OK, exit 0, `gradientTop.dark RN=#1f6b99 web=#1f6b99`**.
  So the comment at `glass-tokens.ts:31-32` correctly rules out `= colors.primaryDark`, but does NOT
  rule out the `satisfies` link - the constraint it cites is narrower than the conclusion it draws.
  Precedent: derived state is not stored (`ScopeRetention`, `engine/logic/retention.ts`); the phone
  itself models this as a dereference. `ACCENT_TO` has no palette sibling and stays a plain literal.
  Restore verified byte-identical after each probe.
```

## LOW

```
[LOW] `T.borderSoft` and `T.radius` are DEAD keys that were re-based rather than deleted - and
      `borderSoft` hard-codes a dark value with a light sibling, which D2-amended forbids
Type: T
File: features/demo/ui/inputs/input-theme.ts:25 (`borderSoft: 'rgba(28,78,132,0.5)'`), :43 (`radius: 12`)
Invariant violated / permitted invalid state: `rgba(28,78,132,0.5)` is `colors.border` (`#1c4e84`) at
  50%, and `colors.border` HAS a light sibling (`#e5e7eb`, `palette.ts:138`). D2-amended's ratified
  text (matrix section OWNER RATIFICATION, plan section 3 D2) reads verbatim: **"Nothing hard-codes a
  dark value that has a light sibling."** `T.radius: 12` likewise duplicates `radius.lg` from the
  scale seam this same PR shipped (`scale.ts:53`).
Construction site: neither key is read. Measured across `features/` and `app/`: `T.borderSoft` -> **0
  readers**, `T.radius` -> **0 readers**. (`GLASS.borderSoft`, the live twin at `glass-tokens.ts:52`,
  is the same violation but IS owned - plan U1.1 derives `GLASS.gradientCard` / `gradientPanel` /
  `borderSoft` / `borderAccent` from the two-half `GLASS_TIER`, whose `dark.card.border` is exactly
  this value. Out of scope for this PR; not filed.)
Downstream consequence: none today - that is why this is LOW and not MEDIUM. The cost is that the D2
  violation is invisible: it survives the `palette.test.ts` `RETIRED` sweep, the
  `glass-tokens.test.ts` `BANNED` list and the drift guard, and the next reader of `input-theme.ts`
  inherits a key that looks live. `input-theme.ts` is owned only by U0.1 / U3.1 (status) / U4.4
  (scrim) - no package owns `borderSoft` or `radius`, so nothing will find them.
Fix: delete both keys. If they are kept as vocabulary for the picker library, derive them -
  `borderSoft: withAlpha(colors.border, 0.5)` (`withAlpha` shipped in this PR at `scale.ts:121` and is
  already used this way at `ExportCaseCard.tsx:129`) and `radius: radius.lg`. Honest cost of the
  derived spelling: `withAlpha` emits SPACED `rgba(28, 78, 132, 0.5)`, so a byte-exact shape pin and
  the `BANNED` entry for the compact form would need rewriting in the same commit - the foundation
  report's successor note item 7 already states this.
```

```
[LOW] The guard's anchor row uses a bare-`string` `scheme` with a magic `'any'` sentinel outside
      `SCHEMES`, and the row shape is re-declared in the test
Type: Anchor
File: features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:17; the rows it describes at
      .design-sync/check-rn-parity.mjs:298-331; `SCHEMES` at :257
Invariant violated / permitted invalid state: `SCHEMES` is `light` plus `dark` - the id space - but
  the `touchFloor` row at `:330` carries `scheme: 'any'`, a third value belonging to no half. The test
  types it `scheme: string`, so nothing links the field to `SCHEMES`.
Construction site: `.design-sync/check-rn-parity.mjs:358` - the drift report interpolates the scheme
  into `RN Colors.<scheme> = <value>`, which renders as `RN Colors.any = 44` if the touch floor ever
  drifts. Reachable the moment the phone changes `Layout.ts`'s touch floor.
Downstream consequence: a misleading failure message on the one anchor that is NOT a colour, in a
  guard whose entire value is naming exactly what drifted. No behavioural impact.
Fix: either give the row `scheme: null` and branch the message, or key the message off the label
  (which already reads `touchFloor`). The `.mjs` file cannot express the union; that is the same
  test-over-type trade `deferred.md` section 27 records as acceptable for a static single-author
  table, so the bare `string` in the test's `Anchor` is not filed separately.
```

---

## Disclosed by the implementers, awaiting the ledger - NOT re-filed as findings

Both are correct calls with a named reason. Per CLAUDE.md the ledger entry must land **before merge**,
and neither is in `docs/code-reviews/deferred.md` today (grepped: 6,240 lines, zero hits for
`PrimaryButtonGradient`, `uiparity`, `U0.5` or `light accent`). What is flagged here is the missing
ledger entry, not the code.

- **`PrimaryButtonGradient` shipped as its DARK ARM ONLY, flattened to two module consts with no
  scheme discriminant** - `glass-tokens.ts:34-35`. The phone's light pair has no web token,
  `palette-contrast.test.ts:324-326` carries the row as an `it.todo` titled UNOWNED / proposed U2.2,
  and `check-rn-parity.mjs:316-320` explains why anchoring it would violate plan section 6.6 gate 1.
  The U0.5 report section 7 P-1 states the D2 violation in the author's own words. **This is the one
  place the "flipping the consumed scheme is a one-site change" claim is structurally false AND
  unowned**, so the ledger entry needs an owner and a trigger, not just a note.
- **`T.rowH: 44` is now an unguarded duplicate of `touchTarget.min`** - `input-theme.ts:44`. U0.4 moved
  the `touchFloor` anchor off `T.rowH` onto `scale.ts` (`check-rn-parity.mjs:267-269`), leaving the
  literal behind with one reader (`TimeWheel.tsx:8`). The U0.4 report P-1 proposes the deferral with
  owner U2.1 and a trigger. Correct as disclosed.

The three per-scheme records the brief asked about - `PrimaryButtonGradient`, `ElevatedEdges`,
`DangerFill` - are otherwise **not in this diff** (U2.2 owns two of them; `palette.ts:20-31` documents
all three including the `DangerFill` name-inversion trap, which is the right thing to have written
down before U2.2 starts). `ColorScheme` (`palette.ts:170`) is exported with zero current consumers; it
is the discriminant D2 binds those records to, so it is deliberate forward wiring, not speculative
abstraction. Not filed.

## Out-of-lane observations

- `palette-contrast.test.ts`'s fifteen `it.todo` rows carry their owning package only in a free-text
  title, so nothing prevents an unowned todo - and one exists by design (`:324`). A typed row
  descriptor would be disproportionate machinery for a static, single-author literal (`deferred.md`
  section 27's accepted precedent), so this is a planning/ownership question for the aggregator, not a
  type defect. The rows themselves read off `palette` / `GLASS` rather than retyped literals, which is
  the part that actually matters and is done correctly (`:35-39`).
- `check-rn-parity.mjs`'s readers are `indexOf` plus regex over source TEXT, comments included.
  Checked by hand against every key in `PALETTE_KEYS` for the current `palette.ts`: no comment in
  either region produces a key-colon-value match, and the case-SENSITIVE regex means prose like
  "Text ramp" cannot collide with `text:`. It holds today; it is fragile to a future docblock that
  writes a key-colon pair inside a scheme region. `region()` throwing on a missed marker (`:118`) is
  the right call.

---

## Type Design Summary
CRITICAL: 0 - HIGH: 0 - MEDIUM: 2 - LOW: 2
Verdict: **APPROVE with comments**

| Check | Result |
|---|---|
| Canonical homes preserved (no parallel entity declarations) | **yes** - new types live in the new `ui/tokens/` seam; no domain entity re-declared |
| Discriminated unions well-formed | **n/a** - this diff introduces no tagged union |
| Exhaustiveness enforced (never-checked switches) | **n/a** - no new `switch` over a union |
| Correlated state modelled as a union | **n/a** |
| Id spaces typed (no bare-string registries/keys) | **yes** - `PaletteToken` is the key space and is enforced in BOTH directions (probed 4/4 KILLED) |
| readonly discipline on shared data | **yes** - `palette`, `spacing`, `radius`, `touchTarget`, `iconSize`, `GLASS`, `T` all `as const`; `TOKEN_MODULES` is a `ReadonlySet`; `RETIRED` / `BANNED` are `ReadonlyArray` |
| Boundary types honest about untrusted input | **yes** - `parseColor` returns a 4-tuple or `null`, and `flatten` pre-parses every layer; the one gap is the arity, filed MEDIUM |
| Mutation probes | 9 run - 8 KILLED, **1 SURVIVED** (probe 8, `flattenOver` zero grounds; filed MEDIUM). Restores proved byte-identical; probe worktree torn down with the script's proof line |

Out-of-lane observations: two, listed above.
