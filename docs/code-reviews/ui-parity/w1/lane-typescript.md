# Lane: typescript — Wave 1 (phase U1), PR #40 @ `28e7993`

Mode: code review. Base: `feat/uiparity-u0` @ `15e5a6f` (W0 + its fix round). Shared worktree read
at `worktrees\w1-wave` (read-only). Probes cut in my own worktree
`worktrees/probe-w1-typescript-scheme` off `28e7993`, torn down with `tools/worktree-remove.ps1`
(`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0).

Warm seat: I carry W0's findings and rulings. Per the brief I re-questioned what W1 builds on — and
the one HIGH below is exactly that: a W0 fix I confirmed FIXED in the W0 fix-delta becomes wrong the
moment W1 gives it a `scheme` to be wrong about.

## Cold gates I ran myself (own worktree, solo)

| Gate | Result | PR body claims |
|---|---|---|
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **exit 0** | exit 0 — reproduced |
| `node .design-sync/check-rn-parity.mjs` | **exit 0, 115/115** (32 palette keys + 24 glass-tier keys, each x both halves, + the 2 dark CTA gradient stops and the touch floor) | 115/115 — reproduced |
| `pnpm test --silent` | **exit 0 — 272 files, 3562 passed, 10 todo** | identical — reproduced |

Every figure in the PR body's Verification block reproduced.

---

## HIGH

```
[HIGH] Flipping the one consumed-scheme site does not compile. W1's central new seam exists to
       make light mode a one-line change and asserts so in three docblocks — but W0's F7 tied a
       DARK-ONLY constant to the ACTIVE scheme, so scheme = 'light' is a hard TS1360 in an
       apparently unrelated file.
File: features/demo/ui/glass-tokens.ts:52  (with features/demo/ui/tokens/palette.ts:185)
Issue: `const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark`. `colors` is
  `palette[scheme]`, so `typeof colors.primaryDark` is the literal '#1F6B99' only while
  `scheme === 'dark'`. `ACCENT_FROM` is not scheme-dependent — it is PrimaryButtonGradient.DARK's
  top stop by definition (`Colors.ts:471-474`), and the demo has no light accent pair at all
  (ledger §90). So the identity F7 created is between a fixed dark value and a moving target.
  Set `scheme = 'light'` — the single edit §9 clause 12 promises — and the build stops with an
  error pointing at a CTA gradient rather than at the flip.
Evidence:
  MUTATION PROBE 1: flip the consumed scheme, exactly as §9 clause 12 prescribes
  Target: features/demo/ui/tokens/palette.ts:185 — export const scheme = 'dark' satisfies ColorScheme
  Mutation applied: 'dark' -> 'light'   (one line, one mutation — the whole claim)
  Result: BUILD BREAK (from tsc exit code 2)
    features/demo/ui/glass-tokens.ts(52,31): error TS1360:
      Type '"#1F6B99"' does not satisfy the expected type '"#1e40af"'.
    ('#1e40af' is palette.light.primaryDark.)
  Restore: verified — git status --porcelain empty.

  The claim it falsifies, asserted three times in this diff:
   - tokens/palette.ts:177    — "flipping the demo to light is a one-site change here"
   - tokens/glass-tiers.ts:28 — "flipping the demo to light stays a one-line change (plan §9
                                 clause 12), and that is the only reason the light half is here"
   - glass-tokens.ts:58-60    — "Resolving it here rather than writing GLASS_TIER.dark is what
                                 keeps flipping the demo to light a one-line change"
  W1 spends real design budget on that contract: GLASS_TIER ships 24 light values nothing renders,
  and palette.ts gained `export const scheme` specifically to serve it (a listed deviation, and the
  reason U1 ∩ U3.1 is no longer empty on that file). The contract does not hold.

  MUTATION PROBE 1b: the proposed fix, verified in BOTH directions
  Mutation applied: satisfies typeof colors.primaryDark
                 -> satisfies typeof palette.dark.primaryDark   (+ palette added to the import)
    (a) with scheme = 'light'   -> tsc exit 0. The flip compiles.
    (b) with scheme = 'dark' and palette.ts's primaryDark re-based to '#1E6A98'
                                -> tsc exit 2, TS1360 at glass-tokens.ts(52,31).
        F7's kill is preserved intact.
  Restore: verified — git status --porcelain empty.
  Provenance: canonical features/demo/ui/glass-tokens.ts and tokens/palette.ts; no mirrors.
  (Probe note for whoever reproduces this: glass-tokens.ts's own docblock quotes the string
   "satisfies typeof colors.primaryDark" verbatim at :33, so a first-occurrence replace edits the
   COMMENT and the probe reports a false negative. Target the line, not the string.)
Fix: one token. `satisfies typeof palette.dark.primaryDark`, importing `palette` alongside
  `colors`. It says what F7 meant — this literal duplicates the phone's DARK primaryDark, which is
  what PrimaryButtonGradient.dark is built from — and being scheme-independent it keeps guarding
  after the flip instead of blocking it. ACCENT_TO has no palette sibling and correctly stays
  plain. If the authors would rather the flip stay blocked until the light accent pair lands
  (ledger §90), then say THAT in the three docblocks and stop claiming one line — but the
  one-token fix costs nothing and keeps the contract, so I would not.
```

## LOW

```
[LOW] header-chrome.ts annotates its three exports `: CSSProperties` where the sibling token
      module uses `as const satisfies CSSProperties`; the widening is already costing an `as`
      cast in its own test.
File: features/demo/ui/controls/header-chrome.ts:72, :84, :100
Issue: `export const glassHeaderBar: CSSProperties = { … }` widens every value to
  `string | undefined`, so nothing downstream can read a literal type off the recipe. Two files
  over, glass-tokens.ts:137 and :173 spell the same kind of fragment
  `{ … } as const satisfies CSSProperties`, which excess-checks identically AND keeps the literals.
  The cost is already visible: controls/__tests__/header-chrome.test.tsx:169 has to write
  `glassWizardHeaderBar.boxShadow as string` — an `as` cast that exists only because of the
  annotation. Commit 7a3a75f ("type the style pins for the cold typecheck") is that friction.
Evidence: the in-repo precedent is glassCard / glassCardNested in the module this one sits beside,
  introduced in the same wave; `as const satisfies CSSProperties` is this repo's established
  spelling for a spreadable style fragment.
Fix: close all three with `as const satisfies CSSProperties`, and drop the `as string` at
  header-chrome.test.tsx:169. Note glassWizardHeaderBar spreads glassHeaderBar, so both move
  together.
```

```
[LOW] The card recipe documents ONE silent-wipe vector and creates a second one in the same
      commit without documenting it.
File: features/demo/ui/glass-tokens.ts:124-131 (the docblock) vs :141 and :178 (the boxShadow keys)
Issue: the docblock is emphatic and correct about `border` / `borderColor` written after the spread
  erasing `borderTopColor`. But glassCard.boxShadow now FUSES two independent things into one
  string — the tier's inset (A32) and GLASS.shadowCard, the elevation (A44) — so a consumer writing
  `boxShadow` after the spread silently loses the inset highlight as well as the elevation, from
  one ordinary-looking override. Same class as the vector the docblock spends eight lines on; it
  gets none.
Evidence: no consumer does it today — I checked all 14 glassCard / glassCardNested spread sites —
  and it IS caught where covered:
  MUTATION PROBE 5: CamerasScreen.tsx:85 gains a boxShadow override after the spread
  Result: KILLED (exit 1) — "expected '0 2px 4px rgba(0,0,0,0.1)' to be
  'inset 0 1px 0 rgba(0,0,0,0.2), 0 4px …'". Restore verified.
  A documentation gap, not a live defect — hence LOW.
Fix: one clause in the existing docblock — overriding boxShadow after the spread drops the inset
  highlight too, so re-compose it or do not override.
```

---

## Probes run (5 total, 4 KILLED, 1 BUILD BREAK = the HIGH)

Beyond the two quoted above, I probed the three claims W1 rests hardest on. All three held.

```
MUTATION PROBE 2: the recipe's central bet — key order and the lit top edge
Target: features/demo/ui/screens/CamerasScreen.tsx:85 (a glassCard consumer)
Claimed pin: ui/__tests__/glass-card-recipe.test.tsx:225 — "%s paints the lit top edge on every card"
Mutation applied: borderColor: '#123456' appended after the spread — the exact silent wipe the
  glass-tokens.ts:124-131 docblock warns about (border-color is a four-side shorthand)
Result: KILLED (from exit code 1)
  "CamerasScreen paints the lit top edge on every card —
   AssertionError: expected 'rgb(18, 52, 86)' to be 'rgba(184, 212, 240, 0.08)'"
Motion mode: default (motion-ON; vitest.setup.ts's matchMedia stub reports matches:false).
Restore: verified — git status --porcelain empty.
```

```
MUTATION PROBE 3: is TIER_KEYS the same hand-maintained-mirror hole W0/F2 closed for PALETTE_KEYS?
Target: .design-sync/check-rn-parity.mjs:352 — TIER_KEYS
Mutation applied: 'recessed' -> 'card' (a swap, the exact shape that SURVIVED on PALETTE_KEYS in W0)
Result: KILLED (from exit code 1)
  "card.gradientTop must be pinned in both halves: expected [ 'dark', 'dark', 'light', 'light' ]
   to deeply equal [ 'dark', 'light' ]"
Why it is not the W0 hole: the both-halves loop doubles as a DUPLICATE detector, so a swap reds
  even without a membership pin, and adding or dropping a tier reds on TIER_KEYS.length. I looked
  for the W0/F2 shape here specifically and it is not present. No finding — stated because the
  brief asked me to re-question what W1 builds on.
Restore: verified — git status --porcelain empty.
```

```
MUTATION PROBE 4: the disclosed single gate on innerShadow (12 values, deliberately unanchored)
Target: features/demo/ui/tokens/glass-tiers.ts:128 — dark.card.innerShadow rgba(0,0,0,0.2) -> 0.44
Result: KILLED (from exit code 1); full suite: 2 files failed / 270 passed
  FAIL features/demo/ui/tokens/__tests__/glass-tiers.test.ts   (the disclosed gate)
  FAIL features/demo/ui/__tests__/glass-tokens.test.ts         (a SECOND gate the disclosure does
                                                                not claim — glassCard composes the
                                                                card inset and is pinned byte-exact)
Verdict on the disclosure: accurate, and conservative for card/nestedCard, which the composed
  fragments cover twice. For elevated/sheet/recessed — whose insets no W1 consumer composes —
  glass-tiers.test.ts genuinely is the only gate, exactly as the deferral proposal states.
  No finding.
Restore: verified — git status --porcelain empty.
```

## What I verified and found clean (no findings)

- **The `scheme` seam is intact in source** — my assigned angle. A repo-wide sweep of `app`,
  `components`, `lib` and `features/demo` for `GLASS_TIER.dark` / `.light` / `palette.dark` /
  `palette.light` outside the two defining modules returns **only comments**. Exactly two modules
  resolve the scheme (glass-tokens.ts:62, header-chrome.ts:63), both via `GLASS_TIER[scheme]`.
  The seam is real; the HIGH above is that it does not yet WORK, not that it is bypassed.
- **`export const scheme = 'dark' satisfies ColorScheme`** keeps the literal type (a const string
  initialiser infers 'dark'; `satisfies` does not widen), so `palette[scheme]` is still exactly
  `typeof dark` and `GLASS_TIER[scheme]` resolves to the dark record's literal type. The docblock's
  claim that "no consumer's inferred type moved by a character" is correct.
- **No module cycle, and it is structurally impossible.** glass-tiers.ts's ONLY import is
  `import type { ColorScheme }` (:51) — erased at compile time — so glass-tokens.ts importing
  GLASS_TIER as a value creates no runtime edge back. The docblock at :41-48 names the exact failure
  this avoids (template literals evaluating against undefined at init and shipping a gradient with
  the word "undefined" in it, past every type check). Correct, and worth the paragraph.
- **The `satisfies Record<ColorScheme, Record<GlassVariant, GlassTier>>` constraint** does what
  glass-tiers.ts:182-186 claims: a tier missing from one half, or missing one of its four parts, is
  a compile error in both directions, and `as const` preserves the literals. Same device as W0's
  palette.ts:166, correctly reused.
- **The border / borderTopColor ordering rule is respected at every one of the 14 call sites.** I
  read each: no consumer writes `border` or `borderColor` after the spread. The four header-chrome
  consumers spread LAST over pure geometry (_shared.tsx:409, CaseMapPicker.tsx:34-37,
  WizardDrawer.tsx:342 and :392) with nothing to clobber; the five nested adopters spread FIRST and
  follow with geometry only. CaseActionsSheet.tsx:179-182 even carries a comment explaining the
  order it chose.
- **isolatedModules** — glass-tiers.ts exports `type GlassVariant` / `type GlassTier` in type form
  and imports ColorScheme as `import type`; header-chrome.ts imports CSSProperties as `import type`.
  Clean.
- **RSC / 'use client'** — neither new module (tokens/glass-tiers.ts, controls/header-chrome.ts)
  carries it, and neither needs it: both are pure data with no component, hook or browser API, and
  both are reachable only through app/demo/page.tsx's ssr:false mount. Matches the established
  omitting-module set (ui/motion.ts, ui/inputs/input-theme.ts, ui/screens/map/mapTokens.ts).
- **Marketing / demo isolation and the single barrel** — W1 adds no `features/demo/ui/...` or
  `features/demo/engine/...` import from app, components or lib. (app/api/extract/route.ts:20's
  engine import and app/demo/error.tsx:60's barrel import are both pre-existing and untouched.)
- **No `any`, no `as any`, no non-null assertion, no new Date.now() / Math.random(), no `useStore`
  outside DemoExperience.tsx, no engine file in the diff, no dangerouslySetInnerHTML, no
  route-handler or secret movement.**
- **`GLASS.shadowCard`** is a genuinely new key with two live consumers (glassCard,
  ExportCaseCard.tsx:138) — not a dead export. The PR lists it as a deviation from the row's
  spelling; it is the right call, since the row's literal would have been a fourth hand-typed copy.
- **`glassHeaderFooterBar`'s 0deg gradient** really is the reversal of the 180deg one (0deg points
  to the top, so the first stop lands at the bottom) — the comment at header-chrome.ts:92-98 is
  correct, and writing it as a flip of the same two stops rather than a second pair is what makes a
  phone-side re-tint move both bars.
- **W0 carry-forward.** W0's F2 membership pin survives the merge intact at
  rn-token-parity.test.ts:137-139, and W1 correctly extended the derived-cardinality idiom rather
  than typing a new literal total — the commit says so in as many words. W0's `norm()` whitespace
  fix is now load-bearing for all 48 tier rows (phone spaced, demo unspaced) and is still covered by
  the always-running `norm` describe block.

## Out-of-lane observations

- CasesScreen, DashboardScreen and ExportCaseCard hand-roll the card from GLASS.borderSoft +
  GLASS.gradientCardDiag and took only the A43 radius change — no lit top edge, no inset highlight,
  because the D11 diagonal variant has no spreadable fragment. Whether the diagonal cards should
  carry the four-part composition is a matrix question, not a type one; noted so the aggregator can
  confirm it is intended scope.
- ExportCaseCard's wrapper sets `overflow: 'hidden'` at :55 while the inner surface paints an OUTER
  drop shadow (GLASS.shadowCard / LIT_GLOW) at :138 — clipping is a rendering question,
  web-reviewer's lane.
- The three implementer reports list 16 spec refutations with file:line, including plan §4.3's
  "override borderColor, never border" being wrong (border-color is itself a four-side shorthand).
  I probed that one incidentally in PROBE 2 and the refutation is correct — the override wiped the
  edge. Plan/matrix corrections are the orchestrator's at merge.

## Typescript Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 0 · LOW: 2
Verdict: REVISE

Scheme seam (single consumption site): intact in source, but NON-FUNCTIONAL — see the HIGH
Store-bridge integrity: preserved
Engine purity: preserved (no features/demo/engine/** file in the diff)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Module-graph safety: preserved — glass-tiers.ts has zero runtime imports, so the derive cycle
  glass-tokens -> glass-tiers -> palette cannot close
Mutation probes: 5 run — 4 KILLED, plus 1 that produced a BUILD BREAK (the HIGH). Zero survivors.
  All restores verified byte-identical; probe worktree torn down with tools/worktree-remove.ps1,
  exit 0.
Out-of-lane observations: three, listed above.
