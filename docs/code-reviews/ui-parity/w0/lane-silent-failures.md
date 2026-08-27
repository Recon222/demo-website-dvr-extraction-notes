# Lane: silent-failures — Wave 0 (U0), PR #39 `feat/uiparity-u0` @ `7099e54`

Mode: code review. Single question: **where in this change does a real failure become invisible
to the visitor, the operator, or the next maintainer?**

Scope read: `git diff master...HEAD` (42 files), the three `u0-*` implementer reports, the PR body,
`docs/code-reviews/deferred.md`. Probes run in a dedicated worktree cut at `7099e54`
(`worktrees/probe-silentfail-u0`), torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0.

Baseline before any probe, in the probe worktree: the four U0 suites plus `rn-token-parity` =
**38 passed | 15 todo (53)**, exit 0; standalone `node .design-sync/check-rn-parity.mjs` =
**33/33 OK**, exit 0. The RN sibling repo IS present on this box
(`.../extraction_case_notes_react_native_expo`), so every `skipIf` case actually RAN — 9 cases in
`rn-token-parity.test.ts`, 0 skipped. No verdict below is quoted off a skip.

---

## What I checked and cleared (stated so the aggregator can see the negative space)

- **The gate can no longer hide drift behind a parse failure.** `checkParity`'s `drift` filter
  (`check-rn-parity.mjs:336`) is `a.rn !== a.web || isParseFailed(a.rn)`, which catches all four
  parse-failure shapes (RN-only, web-only, both-identical, both-different); the standalone exits 1
  and `rn-token-parity.test.ts:74-84` asserts `parseFailed` is empty *separately* from `drift`, so
  a red names which of the two fired. **Probe (KILLED):** target `check-rn-parity.mjs:327` —
  `readConst(t, 'ACCENT_FROM')` changed to `readConst(t, 'ACCENT_FROMX')`, simulating exactly the
  U0.0 rename that used to disable the whole table. Result: **32 of 33 rows still evaluated OK**,
  one row degraded, standalone exit **1**, vitest exit **1** with
  `gradientTop.dark: RN=#1f6b99 web=PARSE-FAILED (const not found: ACCENT_FROMX)`. Provenance:
  canonical source in the probe worktree. Restore verified (`git status --porcelain` empty, guard
  exit 0, 9/9 green). The U0.0 degrade does what it claims.
- **Table shrinkage cannot buy green.** `PALETTE_KEYS.length === 15` and `anchors.length === 33`
  are asserted (`rn-token-parity.test.ts:99-100`), so deleting rows to reach green reds instead.
- **The "reads the wrong half" hazard is pinned, not latent.** `rn-token-parity.test.ts:103-128`
  proves light differs from dark per key on *both* sides, and `:154-168` proves the three-level
  `rnTierScope` by asserting that a two-level scope demonstrably lands on the LIGHT tier. Verified
  against the phone source: `light: {` at `Colors.ts:9`, `dark: {` at `:128`, the `GlassColors`
  halves at `:274`/`:345`, so every `indexOf` first-hit lands where the docblock says it does.
- **`parse` rejects what it must.** Both regexes are `$`-anchored (`palette-contrast.test.ts:56-69`);
  `color-mix()`, `linear-gradient()` and 3-digit hex are pinned as throws at `:236-238`, and the
  buried-bad-layer case at `:251-257` pins `flatten`'s `stack.forEach(parse)` guard in the only
  position where deleting it is observable. I re-derived that: a mid-stack NaN alpha makes
  `flattenOver` emit `rgb(NaN, NaN, NaN)`, which `parse` then throws on — so no NaN can reach
  `offenders`, where `NaN < threshold === false` would otherwise have read as a silent pass.
- **No `it.todo` hides a row that is red today.** I recomputed every currently-measurable pairing
  against the shipped surfaces (`#002853` background, both `GLASS.gradientCard` / `gradientPanel`
  stops, `card`, `modal`): `text` 9.42–14.51, `textSecondary` 5.17–7.96, `link` 6.80–10.47,
  `textTertiary` 3.76–5.79 — the last being the documented M2b ceiling family, not a new
  regression, and measured on tiers U1.1 has yet to create. The CTA rows that *are* live measure
  5.80 / 8.32. The todos defer rows that genuinely need `GLASS_TIER` / `warningAccent` /
  `DangerFill` / `scrim` / `PrimaryButtonGradient.light`, none of which exist yet.
- **The demo's standing honesty machinery is untouched.** No `FallbackMode` variant, notice switch,
  `isSample` badge, geocode/extract breadcrumb, import generation token or `data-map-fallback`
  placeholder is added, removed or reworded by this diff — `MapCanvas.tsx:93` only swaps the
  fallback panel's gradient literal for `colors.background`. No `console.warn` / `console.error`
  was deleted anywhere in the diff; four `console.error` breadcrumbs were *added* to the guard.
- **No new `try`/`catch`, `void`, un-awaited promise or `Promise.all` in shipped app code.** The
  only two `catch` arms in the diff are `check-rn-parity.mjs:81` and `:94`, and both convert the
  throw into a labelled `PARSE-FAILED (<reason>)` value that the caller counts and reports.
- Deferral ledger checked: **no tracked entry's Trigger has lapsed** by this diff (§15
  `selectors.ts` / `time.ts`, §18 `DemoExperience.tsx` handlers, §28 rail narration — none touched).

---

## MEDIUM

```
[MEDIUM] The RETIRED sweep matches its needle CASE-SENSITIVELY, so an uppercase entry is green and inert
File: features/demo/ui/tokens/__tests__/palette.test.ts:35-52 (list + docblock), :141-146 (the loop)
Code:
  const text = readFileSync(file, 'utf8').toLowerCase()
  for (const [name, hex, replacement] of RETIRED) {
    if (text.includes(hex)) {
Issue: only the HAYSTACK is lowered. The needle is used raw, so a RETIRED entry transcribed in the
  repo's prevailing uppercase hex spelling never matches anything and the sweep passes forever. The
  docblock two lines above the list says the opposite — "Matched case-insensitively: the demo mixes
  spellings for the same colour, and a case-sensitive sweep silently leaves live drift behind" —
  and the U0.5 report's successor note §9 item 8 tells the next package "Both lists match
  case-insensitively now — keep it that way". The sibling guard does it correctly
  (glass-tokens.test.ts:132-134 lowers BOTH sides), which is why BANNED can carry '#1F6B99' and
  '#17527A' in uppercase and still bite. The seven current RETIRED needles happen to be
  hand-lowercased, so the list works today by author discipline that nothing states or enforces —
  and that same report instructs every later package (U1.1, U3.1, U4.4, U5.1) to append the OLD
  value to THIS list whenever it changes a token.
Adversarial input / sequence: U1.1 re-bases a glass stop and appends
  ['accent top stop', '#35A0D6', 'GLASS.accentFrom'] to RETIRED, copying the uppercase spelling
  used in BANNED and in glass-tokens.ts; a re-inline of that retired value survives under ui/.
Observable wrong behavior: the suite is green, the sweep reports zero offenders, and a hex the
  phone retired stays live in shipped UI with no signal to anyone.
MUTATION PROBE: RETIRED needle casing
  Target: features/demo/ui/tokens/__tests__/palette.test.ts:50 — the '#35a0d6' needle
  Claimed pin: :138-149 'keeps the retired navy ramp out of every UI source file'
  Negative control (all four clauses): re-inlined a live uppercase #35A0D6 at
    features/demo/ui/screens/CasesScreen.tsx:143 — shipped code, non-equivalent, covered by this
    sweep, on the executed path. Result: FAILED, exit 1, message
    "screens/CasesScreen.tsx still carries the retired accent top stop #35a0d6". The sweep has teeth.
  Mutation applied: '#35a0d6' -> '#35A0D6' in RETIRED (one line); control occurrence left in place
  Result: SURVIVED (from exit code 0) — "Tests 6 passed (6)" with the retired hex live in the tree
  Provenance: canonical source, dedicated probe worktree at 7099e54 (no mirrored copy of this file exists)
  Restore: verified byte-identical (git checkout -- both files; git status --porcelain empty; 6/6 green)
  Severity note: I did NOT take the contract's HIGH default for a survivor, because the mutation is
    to the guard's own data rather than to shipped code, and today's all-lowercase list demonstrably
    bites (see the control). The finding is that the guard is one plausible future edit from inert.
Fix: if (text.includes(hex.toLowerCase())) — matching glass-tokens.test.ts:134. One line, and it
  makes both the docblock's claim and successor note §9 item 8 true.
```

```
[MEDIUM] Alpha-derived tints are hand-transcribed rgb copies of palette tokens, with nothing linking them
File: features/demo/ui/glass-tokens.ts:52 (also :54, :55) · features/demo/ui/inputs/input-theme.ts:25 (also :35, :38)
Code:
  // `colors.border` at 50% (A7/A30) — kept as a literal because CSS has no alpha-on-hex.
  borderSoft: '1px solid rgba(28,78,132,0.5)',
Issue: six values in this diff's two token modules are the rgb triple of a palette token at an
  alpha, transcribed by hand — GLASS.borderSoft / T.borderSoft = colors.border #1c4e84 at .5;
  GLASS.borderAccent / T.primarySoft = colors.primary #2B8CC1 at .3 / .08; GLASS.borderError =
  colors.error #ff4757 at .3; T.topHighlight = colors.link #b8d4f0 at .25. All six are numerically
  correct today. Nothing asserts the relation: grep borderSoft across features/ returns only
  consumers and the two literals, and the byte-exact shape pin at glass-tokens.test.ts:156 pins the
  LITERAL, not the derivation — so it fails on an edit and stays green on a non-edit, which is the
  wrong way round for this failure. The stated justification is also false as of this PR: withAlpha
  (tokens/scale.ts:121-126) is introduced here as "the demo's ONE way to derive a tinted variant"
  and does exactly this, in TypeScript, without color-mix(). This PR demonstrates the failure mode
  itself and fixes exactly one instance: ExportCaseCard.tsx:128-133 replaces a hand-typed
  rgba(53,160,214,0.35) glow with withAlpha(GLASS.accentFrom, 0.35), under the comment "this glow
  was a hand-typed copy of the accent's rgb, so the U0.3 re-base would have left the border deep
  blue and the glow on the old light blue." The other six were left transcribed.
Adversarial input / sequence: the phone re-bases Colors.dark.border. The drift guard's border.dark
  anchor reds and forces palette.ts + palette.test.ts + the BANNED entry to move together — the
  whole re-base ritual U0.4/U0.5 built. borderSoft is anchored by nothing and named by nothing in
  that ritual, so it stays on the retired rgb.
Observable wrong behavior: every gate green, guard output "33/33 anchor rows match", and the demo
  renders a hairline that is 50% of a colour the product no longer uses, on 20+ surfaces for
  GLASS.borderSoft alone. Exactly the defect ExportCaseCard's own comment describes, one
  abstraction level up.
Fix: derive the six from their tokens — `1px solid ${withAlpha(colors.border, 0.5)}` and siblings.
  withAlpha emits the spaced rgba(r, g, b, a) form, so the byte-exact glass-tokens.test.ts pins and
  the matching BANNED entries move in the same commit (the drift guard's norm() already absorbs the
  spacing on its side). If the aggregator judges that too large for a tokens-only wave, the honest
  minimum is a pin — expect(GLASS.borderSoft).toBe('1px solid ' + withAlpha(colors.border, 0.5)) —
  which costs one line and makes the drift catchable instead of invisible.
```

```
[MEDIUM] `flattenOver` / `withAlpha` return a plausible wrong value on an unparseable layer, with no dev-warn
File: features/demo/ui/tokens/scale.ts:151-165 (flattenOver, esp. :156) and :121-126 (withAlpha, :123)
Code:
  if (!t || layers.some((l) => l === null)) return top      // flattenOver
  if (!parsed) return color                                 // withAlpha
Issue: both new helpers degrade by returning an input unchanged. For flattenOver that value is
  *plausible* — a well-formed colour string that simply was never composited — which the U0.5
  report's own §9 item 3 calls "a confident wrong ratio". The only defence built is private to the
  test file (palette-contrast.test.ts:99, stack.forEach(parse)), so it protects the GATE and not the
  PRODUCT. withAlpha silently discards the requested alpha the same way, which is precisely the
  phone bug its own docblock says it fixed for rgba() inputs — the shape survives for 'transparent',
  named colours, 8-digit hex and any color-mix() a later recipe reaches for. Neither emits a
  breadcrumb. The repo's model citizen for a partial or failed derivation (generateExtractedScopes
  in engine/store/create-store.ts) counts it, flags it in state and dev-warns; these do none of the three.
Adversarial input / sequence: U1.1+ composites a recipe whose ground stack contains 'transparent' or
  an 8-digit hex — flattenOver('rgba(14,57,101,0.85)', 'transparent', '#002853') returns
  'rgba(14,57,101,0.85)', its own first argument, still at 85% alpha.
Observable wrong behavior: the recipe renders an un-composited, still-translucent colour; nothing
  throws, nothing logs, and the contrast gate — which parses each layer itself before calling —
  never sees the stack the product actually painted. Latent today (the one production caller,
  ExportCaseCard.tsx:132, passes a valid hex), which is why this is MEDIUM and not HIGH; the
  use-day is U1.1, and that day has no reviewer for this line.
Fix: a dev-only breadcrumb on each fallback arm, the generateExtractedScopes shape — e.g. in
  flattenOver, if (process.env.NODE_ENV !== 'production') console.warn('[scale] flattenOver:
  unparseable layer, returning top uncomposited', { top, grounds }) — and the mirror in withAlpha.
  No signature change and no Result type; the documented return contract stays exactly as written.
```

## LOW

```
[LOW] `region()`'s `before` marker silently falls back to the rest of the file; its docblock says it throws
File: .design-sync/check-rn-parity.mjs:113-126, esp. :121-124 (vs the docblock claim at :100-102)
Code:
  if (before) {
    const j = out.indexOf(before)
    if (j !== -1) out = out.slice(0, j)
  }
Issue: `after` throws "region marker not found" on a miss and lands as a PARSE-FAILED row — the
  behaviour the docblock advertises for markers generally ("a reordered source file degrades these
  silently, which is why a marker that misses THROWS ... rather than falling back to the whole
  file"). `before` does exactly the falling-back that comment disclaims: a missing end marker
  silently widens the slice to EOF. All four call sites depend on it — rnRegion.light's 'dark: {',
  rnRegion.dark's and webRegion.*'s '} as const', and rnTierScope's '}'.
Adversarial input / sequence: the phone drops `as const` from Colors, or moves one key out of
  Colors.dark into a later object in the same file. Today the widened region still first-matches
  inside the intended block, so the mutation is EQUIVALENT and I deliberately did not report a
  survived probe for it — the hole only bites when a key is absent from its intended region and
  present later in the file, at which point a loud `field not found` becomes a silent read of a
  different object literal.
Observable wrong behavior: an anchor reports OK or DRIFT against a value taken from the wrong
  literal, instead of the PARSE-FAILED row U0.0 built the degrade to produce.
Fix: if (j === -1) throw new Error('region end marker not found: ' + before) — matching the `after`
  arm. One line, and it makes the docblock true at all four call sites.
```

---

## Silent Failure Hunter Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 3 · LOW: 1
Verdict: **APPROVE with comments**

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 1 |

Fallback honesty (every substitution announced): **yes** — no fallback or notice surface is touched;
the drift guard's own degrade announces itself per row and counts as drift, never as a pass (probed).
Failure-cause distinctions preserved: **yes** — PARSE-FAILED carries its reason string, and
`parseFailed` is asserted separately from `drift`, so a red tells the two failure modes apart.
Partial results flagged (not silently short): **yes** — a broken anchor takes out only itself
(32 of 33 still evaluated under probe), and the row count is pinned so the table cannot shrink to green.
Async cancellation / stale-write safety: **n/a** — no async and no store writes in this diff.
Operator breadcrumbs intact: **yes** — none removed; four `console.error` lines added to the guard.
Probes: 2 run — 1 SURVIVED (M1, guard data), 1 KILLED (the U0.0 degrade). Teardown verified,
`unlinked 549 junction(s) in 2 pass(es)`, `.pnpm` 240 → 240, exit 0.

Out-of-lane observations:
- The `it.skipIf(!rnAvailable())` green-on-absent-phone-repo property is inherited, not introduced,
  and is disclosed at `rn-token-parity.test.ts:24-30`. It is now the phase gate for 33 rows rather
  than 9, and there is no CI and no package.json script invoking the standalone guard, so the
  disclosure lives only in a comment. Worth a ledger entry with a trigger; not a finding here.
- `TOKEN_MODULES` exempts each allow-listed file from ALL of `BANNED`, and `tokens/scale.ts` carries
  no colour literal at all — a stray re-inline there would escape the scan. Test-design lane.
- U0.5 report §10(a): 15 of 19 contrast cases are `it.todo` and nothing mechanically retires them,
  so phase gate 2 ("the ported contrast test — green") is satisfiable by a contract that never comes
  online. The report proposes the honest shape (a phase-exit todo-subset check owned by the
  verification lane); I concur, and it belongs there rather than in the test file.
- No foreign content was found in my lane file, and I wrote no other path.
