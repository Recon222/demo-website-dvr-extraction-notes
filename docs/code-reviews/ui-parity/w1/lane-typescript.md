# Lane: typescript — Wave 1 (phase U1), PR #40 / #41

## Round 2 (fix delta — rider round, scoped)

Head: `feat/uiparity-w1` @ `d91ab76` (r1 was `044578a`). Authority: the "W1 rider round" comment on
PR #41. Read the delta only: `69dbd34`, `7a0c505`, `7fc126b`, `38cb47c`, the four root-cause
hunks, and the lit-edge ruling's §3–§4 as cited by the docblocks.
Probes in `worktrees/probe-w1d2-typescript-scan` off `d91ab76`; torn down with
`tools/worktree-remove.ps1` — `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0.

### Cold gates (own worktree, solo)

| Gate | r1 | r2 |
|---|---|---|
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | exit 0 | **exit 0** |
| `node .design-sync/check-rn-parity.mjs` | exit 0, 115/115 | **exit 0, 115/115** |
| `pnpm test --silent` | 272 files / 3575 passed / 10 todo | **272 files / 3576 passed / 10 todo, exit 0** |

Matches the PR body's claim (3,576 passed / 10 todo) exactly.

### F23 — my r1 HIGH — FIXED

Commit `69dbd34`. The roster is gone: `SCHEME_HALF` is now two regexes over a WILDCARD identifier,
exempting only the declaring FILES (`SCHEME_DECLARERS`). That is the shape I proposed and
pre-verified in r1's PROBE 5, plus two forms other lanes found. All three re-probed:

```
MUTATION PROBE 1: the three hard-coding forms, one at a time
Target: features/demo/ui/glass-tokens.ts (:155 shadowCard, :115 tier)
Claimed pin: ui/__tests__/glass-tokens.test.ts:272 — "no production module hard-codes a scheme half"
  (a) shadowCard: SHADOW_CARD.dark           -> KILLED, exit 1, expected [ 'glass-tokens.ts' ]
  (b) shadowCard: SHADOW_CARD['dark']        -> KILLED, exit 1, expected [ 'glass-tokens.ts' ]
  (c) const { dark } = GLASS_TIER; tier=dark -> KILLED, exit 1, expected [ 'glass-tokens.ts' ]
(a) is the exact mutation that SURVIVED three gates in r1 — scan, cold tsc and full suite, exit 0
each. It is dead.
Restore: verified after each — git status --porcelain empty.
```

The `typeof` carve-out still holds, and I re-probed it because the widening RAISED the risk: the
wildcard now matches `palette` in F15's `satisfies typeof palette.dark.primaryDark`, where the old
roster form matched it only via the named alternation.

```
MUTATION PROBE 2: remove the typeof lookbehind from form[0] (glass-tokens.test.ts:135)
Result: KILLED, exit 1, expected [ 'glass-tokens.ts' ]
So the carve-out is exactly what exempts F15's line under the widened regex, not incidentally.
F15 and F23 remain correctly interlocked. Restore: verified.
```

### Ruling riders in my territory

**`7a0c505` — fragments to longhands: the types are sound, and stronger than before.**
`glassCard` / `glassCardNested` now spell `borderStyle` / `borderWidth` / three side colour
longhands / `borderTopColor`, with no shorthand key, and both keep `as const satisfies CSSProperties`.
Three things I checked rather than assumed:

- **The `satisfies` chain survives the new keys.** `borderStyle: 'solid'` and `borderWidth: 1` both
  satisfy `CSSProperties` under `as const` — `Property.BorderStyle` accepts the literal, and
  `Property.BorderWidth<string | number>` accepts the number, which React renders as `1px`.
  Cold `tsc` exit 0.
- **`as const` still preserves every literal.** The inferred type is
  `{ readonly borderRadius: 12; readonly borderStyle: "solid"; readonly borderWidth: 1; readonly
  borderRightColor: "rgba(28,78,132,0.5)"; … readonly borderTopColor: "rgba(184,212,240,0.08)"; … }`.
  The derivation from `tier.card.*` is intact in the type, so F16/F17's tier gates still reach it.
- **The removed shorthand is genuinely gone from the type, not widened away.** A stale reader
  cannot compile:

```
MUTATION PROBE 3: a consumer reads the removed key
Target: CamerasScreen.tsx:85 — borderTopColor: glassCard.border
Result: KILLED at compile time (tsc exit 2)
  TS2339: Property 'border' does not exist on type '{ readonly borderRadius: 12; readonly
  borderStyle: "solid"; readonly borderWidth: 1; readonly borderRightColor: … }'.
Restore: verified.
```

That is what makes the ruling's "fragments carry only longhands" a type-level fact rather than a
convention: there is no shorthand key to order against, to override, or to read.

**`7fc126b` — the `vitest.setup.ts` guard: NO, it cannot mask a real console.error.** That was the
question asked, and the answer is unconditional in the code: the interceptor's only branch *adds* to
`conflictingStyleWarnings`, and `realConsoleError(...args)` is called on **every** call, match or
not (`vitest.setup.ts:56-62`). Nothing is swallowed, downgraded or filtered. The scoping is right on
the other axis too — one narrow regex on the phrase "conflicting property" rather than "fail on any
console.error", which the docblock correctly justifies (the suite logs expected React errors from
error boundaries and act warnings on purpose). Collecting in the interceptor and throwing in
`afterEach`, rather than throwing inside React's commit phase, is also the correct choice; a throw
there unwinds through React internals and mis-attributes the failure.

And it is not decorative. I reverted one root-cause fix to see whether the tripwire actually fires:

```
MUTATION PROBE 4: revert _shared.tsx:264 Field to the pre-fix longhand
Target: { ...fieldInput, border: '1px solid #ff4757' }  ->  { ...fieldInput, borderColor: '#ff4757' }
Result: KILLED (suite exit 1) — 5 files failed, 8 tests, and the guard's own message
  ("React reported a conflicting style shorthand/longhand update…") present in the output:
  DemoExperience.new-location · MetadataForm · DuplicateLocationModal · NewCaseModal.gate ·
  new-location-validation
Restore: verified — git status --porcelain empty.
```

Note the blast pattern: five files, none of them a card-recipe test. This tripwire catches the class
repo-wide, which is what the four live defects it surfaced already demonstrated.

**The four root-cause fixes — correct at root, no regression.** `_shared.tsx:264`'s `Field` is the
real root (15 consumers) and the two copies at `IncidentLocationFields.tsx:134` and
`NewCaseModal.tsx:86` are fixed the same way: declaring `border` in BOTH branches makes the
error-clear an in-place rewrite instead of a longhand removal that the base shorthand never
reasserts. `CompletionScreen.tsx:66`'s `padding: '60px 16px 16px'` is box-identical to the old
`padding: 16` plus `paddingTop: 60` — top 60, sides 16, bottom 16; I checked the arithmetic rather
than trusting the comment. Full suite green at 3,576 with no pin deleted to accommodate them.

### New findings

None.

### Observation (not a finding; does not change the verdict)

The tripwire is blind inside any test that replaces `console.error` wholesale. A
`vi.spyOn` on console.error with a no-op implementation substitutes the *patched* function, so the
collection branch never runs and a conflicting-property warning raised in that test body is not
recorded. There are ~15 such sites today (`DemoExperience.sandbox.test.tsx` ×6,
`DemoExperience.boundary`, `boot-boundary`, `MapCanvas` ×2, `PickerStage` ×2, `DemoErrorBoundary`,
`route.test.ts`, `useGpsCapture`). This is a **coverage bound, not a masking bug** — nothing real is
hidden from the console, and the guard still covers the other ~3,560 tests. Stated from code
reading: my attempt to demonstrate it with a synthetic clobber component did not reproduce the
warning at all, so that probe was invalid and I discarded it rather than report it as evidence. If
anyone wants the bound closed, the cheap shape is a `beforeEach` in `vitest.setup.ts` that
re-installs the interceptor over whatever console.error currently is. Test-lane's call.

## Typescript Summary (Round 2 — rider fix delta)
FIXED: 1 (r1 HIGH F23) · PARTIAL: 0 · UNFIXED: 0
Riders verified in my territory: 3 — `7a0c505` fragment types and the `satisfies` chain; `7fc126b`
guard scoping; the four root-cause fixes' blast radius. All sound.
New findings this round: CRITICAL 0 · HIGH 0 · MEDIUM 0 · LOW 0
Verdict: **APPROVE**

Scheme seam (single consumption site): guarded, name- and form-agnostic; all three forms KILL
Store-bridge integrity: preserved
Engine purity: preserved
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Mutation probes this round: 6 run — 6 KILLED (2 of them at COMPILE time), 0 SURVIVED, 1 discarded
as invalid (stated above rather than counted). All restores verified byte-identical.
Out-of-lane observations: one, above.

---


## Round 1 (fix delta)

Head: `feat/uiparity-w1` @ `044578a` (round 0 was `28e7993`). Authority: the fix-mapping comment on
PR #41. Read the delta only — each fix commit and the lines it touched, the cumulative guard and
parity-test diffs, and plan U1.1's row (opened because F14's refutation cites §4.3).
Probes in my own worktree `worktrees/probe-w1d-typescript-scheme` off `044578a`; torn down with
`tools/worktree-remove.ps1` — `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0.

**Leftover-worktree check, as asked:** `git worktree list` shows no `probe-w1d-typescript-*`. The
only `w1d` tree is `probe-w1d-tests` @ `044578a`, which belongs to the tests lane — not mine to
remove. I left nothing behind when the session cut off.

### Cold gates at the integrated head (own worktree, solo)

| Gate | Round 0 | Round 1 |
|---|---|---|
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | exit 0 | **exit 0** |
| `node .design-sync/check-rn-parity.mjs` | exit 0, 115/115 | **exit 0, 115/115** |
| `pnpm test --silent` | 272 files / 3562 passed / 10 todo | **272 files / 3575 passed / 10 todo, exit 0** (+13 tests, 0 regressions) |

### My findings

**F15 (my r0 HIGH; aggregator re-graded MEDIUM) — FIXED.** Commit `8d65308`.
`glass-tokens.ts:77` now reads `const ACCENT_FROM = '#1F6B99' satisfies typeof palette.dark.primaryDark`,
with `palette` added to the import — the one-token change I specified. Re-probed both directions, as
the brief requires:

```
MUTATION PROBE 1a: the §9 clause 12 flip
Target: features/demo/ui/tokens/palette.ts — export const scheme = 'dark' satisfies ColorScheme
Mutation applied: 'dark' -> 'light'
Result: tsc exit 0 — THE FLIP COMPILES. (Round 0: exit 2, TS1360.)
Restore: verified — git status --porcelain empty.

MUTATION PROBE 1b: F7's kill, unchanged
Target: features/demo/ui/tokens/palette.ts — dark.primaryDark '#1F6B99' -> '#1E6A98'
Result: KILLED at compile time (tsc exit 2)
  features/demo/ui/glass-tokens.ts(77,31): error TS1360:
    Type '"#1F6B99"' does not satisfy the expected type '"#1E6A98"'.
Restore: verified — git status --porcelain empty.
```
The rewritten comment block (`glass-tokens.ts:57-66`) states the reason correctly and names the
finding, so the next reader cannot re-introduce it by "simplifying" back to `colors`.

**F20 (my r0 LOW — widening annotation) — FIXED.** Commit `700ce2b`: all three header-chrome
exports close with `as const satisfies CSSProperties`, and `header-chrome.test.tsx`'s `as string`
cast is gone. The fix went one better than I asked by adding a compile-time regression pin, and I
verified that pin is real rather than decorative:

```
MUTATION PROBE 6: revert glassHeaderBar to the annotation
Target: features/demo/ui/controls/header-chrome.ts:81
Mutation applied: `export const glassHeaderBar = { … } as const satisfies CSSProperties`
              -> `export const glassHeaderBar: CSSProperties = { … }`
Result: KILLED at compile time (tsc exit 2)
  features/demo/ui/controls/__tests__/header-chrome.test.tsx(46,3): error TS2322:
    Type 'Background<string | number> | undefined' is not assignable to type 'string'.
Restore: verified — git status --porcelain empty.
```

**F14 (my r0 LOW — the undocumented `boxShadow` wipe — folded in) — FIXED, and my prescription was
refuted correctly.** Commit `3c1eac3`. The docblock now carries the `boxShadow` clause I asked for
(`glass-tokens.ts:42-45`, with the compose form spelled out). More importantly, F14 **refuted the
border prescription I would have endorsed in round 0** — "set `borderColor`, then re-set
`borderTopColor`" — and replaced it with the three side longhands. Judged on the merits, with a
probe: their refutation holds and mine was wrong.

```
MUTATION PROBE 3: F14's prescribed form at a live consumer
Target: features/demo/ui/screens/CamerasScreen.tsx:85
Mutation applied: { ...glassCard, padding: 16, marginBottom: 14,
                    borderRightColor: '#123456', borderBottomColor: '#123456',
                    borderLeftColor: '#123456' }
Result: the LIT EDGE SURVIVES. glass-card-recipe.test.tsx:233
  (`expect(card.style.borderTopColor).toBe(HIGHLIGHT)`) PASSES; the run reds one line later at
  :234 on `borderRightColor`, which is my own deliberate re-tint of a consumer the suite pins as
  standard — not a defect in the form. Contrast round 0's PROBE 2, where the shorthand override
  made :233 itself fail ('rgb(18, 52, 86)' vs the highlight).
Restore: verified — git status --porcelain empty.
```
The two negative controls F14 added (duplicate-key collapse on first paint; React writing only
CHANGED keys on update, which defeats the destructure-and-re-add form) are both real mechanisms and
neither was in my round-0 fix text. This is a better fix than the one I proposed.

### Fallout in my territory from the other fixes — one new HIGH

**F18's scan (`c0458b6`) — works, and is correctly interlocked with F15.** Two probes:

```
MUTATION PROBE 2a/2b: plant a real violation at each live consumer
Target: glass-tokens.ts:115 `const tier = GLASS_TIER[scheme]` -> `GLASS_TIER.dark`
        header-chrome.ts:72 `GLASS_TIER[scheme].header` -> `GLASS_TIER.dark.header`
Result: BOTH KILLED (exit 1) — "expected [ 'glass-tokens.ts' ] to deeply equal []" and
        "expected [ 'controls/header-chrome.ts' ] to deeply equal []".
  `glass-tokens.ts` being covered is the point: F18's refinement swapped `TOKEN_MODULES` for
  `SCHEME_DECLARERS` precisely because the former exempts it, and the probe confirms the swap.
Restore: verified.

MUTATION PROBE 2c: is F18's `typeof` carve-out load-bearing, or decorative?
Target: glass-tokens.test.ts:113 — remove `(?<!\btypeof\s+)` from SCHEME_HALF
Result: KILLED (exit 1) — "expected [ 'glass-tokens.ts' ] to deeply equal []".
  So the scan DOES reach F15's line and the carve-out is exactly what exempts it. The two fixes
  are interlocked deliberately, not by luck.
Restore: verified.
```

**F16 / F17 / F21 and the master carry — no fallout, and the carry resolved the conflict the right
way.** F16 pins `TIER_KEYS` against `Object.keys(GLASS_TIER.dark)` and the tier PARTS against
`Object.keys(GLASS_TIER.dark.card)` with an explicit `UNANCHORED = ['innerShadow']`, which closes
the fifth-part hole my round-0 PROBE 3 could not reach. F17 moves `stuck` into `checkParity()` so
the CLI and the vitest case cannot disagree; the CLI's exit now keys on `drift.length ||
stuck.length`, and a web-side-only PARSE-FAILED still lands in `drift` (`a.rn !== a.web`), so no
exit path was weakened. F21 closes `readStop` with `\s*\]`. The carry moved my own W0/F2 membership
pin — plus F16's two — into the new **ungated** `local invariants` describe, which is correct:
both sides of those assertions are local, and leaving them under `skipIf(!rnAvailable())` was the
W0/F11 defect. `e56c0f1`'s `indexOf` dedupe instead of a `Set` spread is right for this repo's
`target: es5` (TS2802).

```
[HIGH] F19 created a THIRD two-scheme record in this same fix round, and F18's scan does not name
       it — so severing its derivation passes the scan, the cold typecheck and the whole suite.
       The mapping comment claims the opposite.
File: features/demo/ui/__tests__/glass-tokens.test.ts:113 (SCHEME_HALF)
      vs features/demo/ui/glass-tokens.ts:103 (SHADOW_CARD) and :155 (`SHADOW_CARD[scheme]`)
Issue: F18's gate is `/(?<!\btypeof\s+)\b(?:GLASS_TIER|palette)\s*\.\s*(?:dark|light)\b/` — a
  hard-coded allow-list of two identifiers. F19 (`7ba1825`) added
  `export const SHADOW_CARD = { light, dark } as const satisfies Record<ColorScheme, string>`,
  consumed at `:155` as `SHADOW_CARD[scheme]`. Writing `SHADOW_CARD.dark` there is behaviourally
  invisible while the demo renders dark — which is why the round's own probe Q7 recorded SURVIVED —
  and the source scan that is supposed to be the backstop cannot see the name.
Evidence:
  MUTATION PROBE 4: sever F19's derivation
  Target: features/demo/ui/glass-tokens.ts:155
  Mutation applied: `shadowCard: SHADOW_CARD[scheme],` -> `shadowCard: SHADOW_CARD.dark,`
  Result: SURVIVED, three times over (all from exit codes)
    F18's scan   : exit 0 — 7 passed (7)
    cold tsc     : exit 0
    full suite   : exit 0 — 272 files, 3575 passed, 10 todo
  Provenance: canonical `features/demo/ui/glass-tokens.ts`; no mirrors.
  Restore: verified — git status --porcelain and git diff --stat both empty.

  The claim it falsifies is in the PR #41 mapping comment, F19's row, verbatim: *"probe Q7
  (severed derivation) recorded SURVIVED-bounded -> **covered by F18's scan**."* It is not covered.
  This is the same hand-maintained-mirror class the round already closed twice — W0/F2 for
  `PALETTE_KEYS`, F16 for `TIER_KEYS`/`TIER_PARTS` — recurring a third time, in the one place left
  where the mirror is a regex instead of an array.
Fix: the one-token version is adding `SHADOW_CARD` to the alternation. The durable version drops the
  allow-list, and I verified it costs nothing:
  MUTATION PROBE 5: name-agnostic regex
    `/(?<!\btypeof\s+)\b[A-Za-z_$][\w$]*\s*\.\s*(?:dark|light)\b/`
    - clean tree -> exit 0 (NO false red: every other `.dark`/`.light` under `ui/` outside the two
      declarers is inside a comment — `Colors.dark`, `DangerFill.light`, `GlassColors.light`,
      `PrimaryButtonGradient.dark` — and `stripComments` already removes them)
    - with PROBE 4's severed derivation -> exit 1, "expected [ 'glass-tokens.ts' ] to deeply equal []"
  Restore: verified. Whichever is chosen, the exemption belongs on the FILE (`SCHEME_DECLARERS`,
  which already works) rather than on the identifier, so a fourth two-scheme record needs no edit.
```

### What I re-verified and found clean

- **The `scheme` seam** — my assigned angle — is now guarded, not just observed. Round 0 I could
  only grep it; F18 makes it a gate, and PROBE 2a/2b show the gate bites at both live consumers.
  The HIGH above is that the gate's reach is one identifier short of the code it now has to cover.
- `SHADOW_CARD`'s `as const satisfies Record<ColorScheme, string>` is the right shape and matches
  `palette.ts:166` / `glass-tiers.ts:186`; the flip probe (1a) exercised it and it compiles in both
  schemes.
- No `any`, no `as any`, no non-null assertion, no new `Date.now()` / `Math.random()`, no `useStore`
  outside `DemoExperience.tsx`, no `features/demo/engine/**` file in the fix range, no new deep
  `@/features/demo/{ui,engine}` import from `app`/`components`/`lib`.
- `isolatedModules` clean across the fix range: `import { palette, type PaletteToken }` in
  `rn-token-parity.test.ts` uses the inline type modifier; `SCHEME_INVARIANT` crosses from the
  untyped `.mjs` and is re-typed at `readonly PaletteToken[]` on the TS side, which is the right
  place to put it.

## Typescript Summary (Round 1 — fix delta)
FIXED: 3 (r0 HIGH -> F15 · r0 LOW/annotation -> F20 · r0 LOW/boxShadow -> F14) · PARTIAL: 0 · UNFIXED: 0
New findings this round: CRITICAL 0 · **HIGH 1** · MEDIUM 0 · LOW 0
Verdict: REVISE

Scheme seam (single consumption site): guarded by F18 and biting — but one identifier short of
  F19's new record; see the HIGH
Store-bridge integrity: preserved
Engine purity: preserved
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Mutation probes this round: 7 run — 5 KILLED (2 of them at COMPILE time), 1 flip-compiles
  confirmation, **1 SURVIVED (the HIGH)**. All restores verified byte-identical.
Out-of-lane observations: none new.

---

# Round 0 (initial review) — retained below for provenance


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
