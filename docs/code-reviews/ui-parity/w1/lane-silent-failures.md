# Lane: silent-failures — Wave 1 (U1.1–U1.4), PR #40 @ `28e7993`

Mode: code review. Single question: **where in this change does a real failure become invisible to
the visitor, the operator, or the next maintainer?**

Read: `git diff feat/uiparity-u0...feat/uiparity-w1` (29 files), the PR body, the three implementer
reports (`u1.1`, `u1.2-u1.3`, `u1.4`) and both integration reports. Probe worktree
`probe-w1-sfh-tiers` off `28e7993`; torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0.

Baseline in that worktree, before any mutation: standalone guard **115/115 OK, exit 0**; the eight
token/tier/contrast/recipe suites **87 passed | 10 todo (97)**, exit 0, **0 skipped** — the RN
sibling repo is present, so every `skipIf` case RAN. No verdict below is quoted off a skip.

---

## HIGH

```
[HIGH] Both tier scopes stuck on the LIGHT half: the STANDALONE guard prints "all 115 anchor rows
       match" and exits 0 while comparing light to light — SURVIVED
File: .design-sync/check-rn-parity.mjs:228-247 (`rnTierScope` / `webTierScope`) + :479-499 (the
      standalone reporter); the only check that catches it is
      features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:196-230
Code:
  export const rnTierScope  = (scheme, tier) => ({ after: ['export const GlassColors', `${scheme}: {`, `${tier}: {`], before: '}' })
  export const webTierScope = (scheme, tier) => ({ after: ['export const GLASS_TIER',  `${scheme}: {`, `${tier}: {`], before: '}' })
Issue: the two helpers are twins — same shape, adjacent, sharing one docblock that explains the
  three-level requirement once. Flatten them together and every tier row compares the LIGHT tier to
  the LIGHT tier: 48 of 115 rows silently stop guarding anything. `checkParity()` cannot see it —
  `drift` is `a.rn !== a.web`, and light equals light. The light-vs-dark structural pin that DOES
  catch it lives in the vitest file, so the two entry points disagree, and the weaker one is the one
  this PR's own Verification section quotes ("`check-rn-parity.mjs` exit 0 (115/115)") and the one
  the module header advertises as authoritative ("Standalone: node .design-sync/check-rn-parity.mjs
  (exit 1 on drift or mismatch)").
Adversarial input / sequence: a maintainer "simplifies" the duplicated scope helpers, or the phone
  reorders `Colors.ts` so a scheme marker lands elsewhere. The guard's own `webTierScope` docblock
  (`:241-246`) names this exact trap — "the identical mistake lands on a COMMENT (`Colors.ts:25`)
  that reads the LIGHT tier for both schemes — zero drift, proving nothing" — so the module knows
  the failure and still does not self-check for it.
Observable wrong behavior: `node .design-sync/check-rn-parity.mjs` prints
  "✓ all 115 anchor rows match between the RN app and the web demo" and exits 0 over a guard that is
  structurally blind to every glass tier. An operator or a phase-gate quoting that command gets the
  opposite of the truth.
MUTATION PROBE: tier scopes flattened to one level
  Target: check-rn-parity.mjs:243 (`webTierScope`) then :231 (`rnTierScope`)
  Provenance: canonical source, probe worktree probe-w1-sfh-tiers at 28e7993 (no mirrored copy)
  (A) web side only -> after: [`${tier}: {`]
      guard EXIT 1 · vitest EXIT 1 — KILLED ("web card.gradientTop: the light and dark reads
      returned the same value: expected 'rgba(248,250,252,1)' not to be 'rgba(248,250,252,1)'").
      This is the negative control: the mutation is non-equivalent, shipped, covered and executed.
  (B) BOTH sides flattened (the realistic edit — they are twins)
      standalone guard: "✓ all 115 anchor rows match" · **EXIT 0 — SURVIVED**
      vitest: EXIT 1 (3 failed) — only the test catches it
  Restore: verified byte-identical (git checkout --; git status --porcelain empty; guard exit 0; 13/13 green)
Fix: move the check into `checkParity()` so both entry points share it — alongside `drift` and
  `parseFailed`, return `stuck` = rows whose `light` and `dark` reads are identical on a side, minus
  the by-name `{onPrimary, onError}` exclusion the test already maintains; exit 1 on a non-empty
  `stuck` and print it like the other two lists. The test then asserts the guard's own result
  instead of re-deriving it, and the standalone stops being the weaker gate.
```

```
[HIGH] The 24 tier anchors are pinned by HAND-TYPED CARDINALITY, not membership — a whole tier drops
       out of the guard by editing two numbers, both gates green — SURVIVED
File: .design-sync/check-rn-parity.mjs:350-351 (`TIER_KEYS` / `TIER_PARTS`) ·
      features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:148-152
Code:
  expect(TIER_KEYS.length, 'six tiers').toBe(6)
  expect(TIER_PARTS.length, 'gradient[0], gradient[1], border, highlightTop').toBe(4)
  expect(TIER_ANCHOR_KEYS.length, '6 tiers x 4 readable parts').toBe(24)
Issue: this is W0/F2 again, one level down, in the same file — and three lines above these
  assertions the same commit writes "Cardinality is DERIVED from the two key lists, never typed.
  W0/F2 removed the hand-typed `.toBe(15)`; the same reasoning removes U1.1's hand-typed
  `.toBe(81)` — a literal total is exactly what lets someone shrink the table to reach green by
  editing one number here." The palette list beside it obeys that: `[...PALETTE_KEYS].sort()` is
  compared to `Object.keys(palette.dark).sort()`, i.e. to the live module. `TIER_KEYS` is compared
  to nothing outside itself. The test already imports `palette` from the token layer, so importing
  `GLASS_TIER` costs one line.
Adversarial input / sequence: any later package (U2.4 / U4.1 / U5.1 all index this module by name)
  hits a red tier row it does not want to own and takes the two-number path; or a seventh tier /
  a newly-readable fifth part lands in `glass-tiers.ts` and is simply never anchored — the exact
  "quiet coverage hole" the PALETTE_KEYS docblock at `:270-276` says membership exists to prevent.
Observable wrong behavior: with `'recessed'` removed from `TIER_KEYS` and the two counts edited to
  match, the standalone prints "✓ all 107 anchor rows match … 20 glass-tier keys" and exits 0, and
  the suite is 15/15 green — while the `recessed` tier, the one the phone specifically re-based off
  near-black `rgb(6,12,22)` and which grounds all three bottom-sheet pickers, is guarded by nothing.
  `tokens/__tests__/glass-tiers.test.ts` does not cover it either: it pins the module to itself.
MUTATION PROBE: shrink the tier table to green
  Target: check-rn-parity.mjs:350 TIER_KEYS + rn-token-parity.test.ts:148,152 (the two counts)
  Mutation applied: drop `'recessed'`; `.toBe(6)` -> `.toBe(5)`; `.toBe(24)` -> `.toBe(20)`
  Result: **SURVIVED** — guard exit 0 ("all 107 anchor rows match"), vitest exit 0 (15 passed),
    8 anchor rows silently gone
  Negative control: the SAME shape against `PALETTE_KEYS` is KILLED by the membership pin
    (re-verified in W0 round 1, probe (b): `'linkHover'` -> `'linkHovr'`, exit 1, the membership
    assertion firing by name). The difference is the missing pin, not the harness.
  Provenance: canonical source, probe worktree probe-w1-sfh-tiers at 28e7993
  Restore: verified byte-identical (git checkout -- both files; git status --porcelain empty;
    guard exit 0 at 115/115; 13/13 green)
Fix: import `GLASS_TIER` in the test and assert membership, retiring all three literal counts:
  `expect([...TIER_KEYS].sort()).toEqual(Object.keys(GLASS_TIER.dark).sort())` and, for the parts,
  `expect([...TIER_PARTS.filter(p => !p.startsWith('gradient')), 'gradient', ...UNREADABLE])` —
  or more simply assert the anchored parts plus the by-name exclusion `{innerShadow}` equal
  `Object.keys(GLASS_TIER.dark.card)`, so the deliberate `innerShadow` exclusion stays a NAME (the
  `SCHEME_INVARIANT` idiom the same file already uses) rather than the difference between 4 and 5.
```

## LOW

```
[LOW] `readStop` reads the first two stops of a longer tuple and reports OK on the truncation
File: .design-sync/check-rn-parity.mjs:196-200
Code:
  const m = region(...).match(new RegExp(`\b${key}\s*:\s*\[\s*(${VALUE})\s*,\s*(${VALUE})`))
Issue: the regex is unbounded on the right, so `gradient: ['a','b','c']` matches and the guard
  compares only `a` and `b`. A one-stop tuple correctly throws `tuple stops not found` (loud), and
  the web type `readonly [string, string]` forbids a third stop on the demo side — but a phone-side
  three-stop gradient would compare equal on the two stops the demo kept and report OK for a
  gradient the demo cannot render. Answering the review question directly: on a MALFORMED gradient
  (missing bracket, single stop, non-literal stop) the reader throws and lands as PARSE-FAILED,
  which is correct; truncation is the one shape it accepts silently.
Adversarial input / sequence: the phone adds a mid-stop to any tier gradient.
Observable wrong behavior: 2 of 48 tier rows report OK against a gradient that changed.
Fix: close the alternation — append `\s*\]` to the pattern so a longer tuple fails to match and
  becomes a PARSE-FAILED row. One character class; the two current callers pass 2-tuples.
```

---

## Checked and cleared — the review's seven angles, answered

1. **Three-level RN/web tier scope reading the wrong tier.** Cleared for the WRONG-TIER case, found
   for the wrong-HALF case (HIGH above). Verified against the phone source that no tier name is a
   substring of another at the marker (`card: {` does not match `nestedCard: {` — `indexOf` is
   case-sensitive), that a tier missing from `dark` searches forward past `GlassColors` into
   `PrimaryButtonGradient`/`ElevatedEdges`/`DangerFill`, none of which carries a tier name, so it
   throws → PARSE-FAILED, and that W0/F4's comment strip runs before every marker search, so a tier
   name in a comment cannot create a false slice. `before: '}'` is still safe on both sides: with
   comments stripped, a tier body holds only `rgba()` parens and one `[…]` tuple.
2. **The tuple reader on a malformed gradient.** Malformed → throws → PARSE-FAILED (correct).
   Truncation is the one silent shape — LOW above.
3. **`GLASS_TIER[scheme]` when `scheme` is anything but `'dark'`.** Loud by construction, no runtime
   default to mask a missing tier. `palette.ts:186` is `export const scheme = 'dark' satisfies
   ColorScheme`, so the literal type survives; `GLASS_TIER` is `satisfies Record<ColorScheme,
   Record<GlassVariant, GlassTier>>`, so both halves and all six tiers must exist or it does not
   compile. The only two consumers are `glass-tokens.ts:62` and `header-chrome.ts:63`, both
   `GLASS_TIER[scheme]` — no consumer indexes with a runtime string, and there is no `??`, no
   `catch` and no default anywhere on the tier path. Flipping the switch renders the light half; it
   cannot render `undefined`.
4. **Do the derived legacy `GLASS` keys follow a tier change, or stale?** They follow, and it is
   pinned. `gradientCard` / `gradientCardDiag` / `gradientPanel` / `borderSoft` / `borderAccent` are
   template literals off `tier.*` (`glass-tokens.ts:70-92`), so staleness is impossible while the
   derivation stands — and `glass-tokens.test.ts:278-292` pins the RELATION (not just the bytes),
   which is what catches a key severed back to a literal; the author records that severing is
   invisible to the byte-exact pin (their probe P4b, SURVIVED). The module-cycle hazard is closed
   structurally: `glass-tiers.ts` takes only `import type` from `palette`, so the
   `linear-gradient(180deg,undefined,undefined)` init-order failure its docblock names cannot occur.
5. **The four BANNED rewrites — is an old value now unbanned by accident?** Measured: the three
   composed old gradients and `1px solid rgba(43,140,193,0.3)` have **zero** occurrences under
   `ui/`, so nothing is live-and-unguarded today. My W0 generalization ("append the old value to
   RETIRED") is **refuted on the merits** by u1.1 report R-4, and I accept it: `RETIRED` is typed
   and documented for HEXES, and more decisively the bare triples `rgba(19,34,54,*)` /
   `rgba(26,45,68,*)` are still live at eight files (I counted 7 non-test occurrences at the current
   head), so a RETIRED entry would redden immediately and drag U1.3/U1.4/U5.1's sweeps into U1.1.
   Their successor note names the right rule — the package that removes the LAST occurrence adds the
   entry — with per-package owners. No finding.
6. **`header-chrome.ts` fallbacks.** None to flag. Three fragments, all pure derivations off
   `GLASS_TIER[scheme].header`, no default, no optional chain, no catch. Its test's `gradient()`
   helper (`header-chrome.test.tsx:40-44`) `throw`s rather than returning null, explicitly so a
   fragment that stopped being a two-stop gradient "must fail loudly, not compare against
   `undefined` and pass" — that is the right shape and the `?? ''` beside it is unreachable as a
   silent path.
7. **Any `catch` / default masking a missing tier.** None. The whole W1 diff adds no `try`/`catch`,
   no `void`, no un-awaited promise, no `Promise.all` and no `??` on a production path.

**The demo's standing honesty machinery is untouched.** No `FallbackMode` variant, notice switch,
`isSample` badge, geocode/extract breadcrumb, import generation token or `data-map-fallback`
placeholder is added, removed or reworded; the ~14 screen files in the diff take tier fragments in
place of hand-rolled gradients and nothing else. No `console.warn` / `console.error` was removed.
Deferral ledger checked: §15, §18 and §28 remain untouched by this diff — no Trigger has lapsed.

Disclosed items I did NOT re-file, having judged them: u1.1 D-1 (`flattenOver` per-fold rounding,
0.32 ΔE — the U0.5 author flagged the same seam as their own likely defect and the margin is
recorded per row), D-2 (the whitespace-blind BANNED scan — **already fixed** in W0/F3 `696f3bb`,
which this branch merges at `b56b358`; the comment at `glass-tokens.test.ts:96-101` describing it as
open is now stale, which is a prose matter for the aggregator), D-3 (`innerShadow`'s single gate —
disclosed with an owner and a stated consequence, and my HIGH #2's fix would make that exclusion a
name rather than a number, which strengthens it).

---

## Silent Failure Hunter Summary
CRITICAL: 0 · HIGH: 2 · MEDIUM: 0 · LOW: 1
Verdict: **REVISE**

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 0 |
| LOW | 1 |

Fallback honesty (every substitution announced): **n/a** — no fallback or notice surface touched.
Failure-cause distinctions preserved: **yes** — PARSE-FAILED still carries its reason per row, and
the tier rows add a positive `toMatch(/^rgba\(/)` check so a blind reader cannot pass as a value.
Partial results flagged (not silently short): **NO — this is the wave's finding.** The tier anchor
table can be shortened to green by editing two numbers (probed, SURVIVED), and a stuck reader is
invisible to the standalone entry point (probed, SURVIVED).
Async cancellation / stale-write safety: **n/a** — no async, no store writes in this diff.
Operator breadcrumbs intact: **yes** — none removed.
Probes: 3 run — 1 KILLED (the negative control), **2 SURVIVED**, restores proven byte-identical.
Teardown verified: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0.

Out-of-lane observations:
- Both HIGHs share one root the aggregator may want to state once: `checkParity()` returns only
  `drift` and `parseFailed`, so every OTHER property of the table — that both halves were read from
  their own half, that the key lists still match the modules they mirror — lives in the vitest file
  and is invisible to the standalone. Both fixes land in the same six lines of `checkParity()`.
- Still standing from W0 r1: no CI, and no `package.json` script invoking the guard. The PR body
  quotes the standalone command as verification evidence, which makes HIGH #1's blind-green
  behaviour the more consequential of the two.
- `glass-tokens.test.ts:96-101` documents W0's whitespace limit as unfixed; it was fixed in `696f3bb`
  and merged into this branch. Stale comment, not a defect.
- No foreign content was found in my lane file, and I wrote no other path.
