# Lane: silent-failures — Wave 0 (U0), PR #39

## Round 1 (fix delta)

Head reviewed: `feat/uiparity-u0` @ `15e5a6f`. Delta read: `git diff 10553c8..15e5a6f` — I read only
the fix commits and the lines they touched, plus what those lines now depend on, per contract §7.
Authority: the PR mapping comment. My four r1 items appear there as F3 (merged), F4 (folded),
F6 (merged), F8 (merged and DEMOTED to LOW); I confirm nothing outside that mapping.

Probe worktree `probe-w0d-sfh-anchors` off `15e5a6f`; torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0. Baseline in that worktree
before any mutation: the five U0 suites **45 passed | 15 todo (60)**, exit 0; standalone guard
**67/67 OK**, exit 0. The RN sibling repo is present, so every `skipIf` case RAN (11 in
`rn-token-parity.test.ts`, 0 skipped) — no verdict below is quoted off a skip.

### Per-finding status

**F3 (my r1 MEDIUM — `RETIRED` sweep case-sensitive on its needle) — FIXED.**
`696f3bb`. `palette.test.ts:35-42` now defines `norm(s) = s.toLowerCase().replace(/\s+/g,'')` and
`:152-154` applies it to **both** sides (`text.includes(norm(hex))` over `norm(readFileSync(...))`);
`glass-tokens.test.ts:33-43,142-146` gets the identical treatment, closing the tests lane's
whitespace axis in the same helper. The author reproduced my exact probe (F3-b: uppercase needle +
live `#35A0D6` in `CasesScreen.tsx`) — SURVIVED unfixed, **KILLED fixed** — and added a prospective
F3-c for the spaced-rgba half that no entry needs yet. The whitespace strip is a widening of the
haystack, so I checked for a new false-positive class: a banned literal formed by joining across a
line break would need the source to split a hex or an `rgba(` mid-token, and the shipped tree is
green over all 138 files under `ui/`. The docblock's case-insensitivity claim and the U0.5 successor
note §9 item 8 are now both true of the code.

**F4 (my r1 LOW — `region()`'s `before` marker silently widened to EOF) — FIXED.**
`4f834f9`. `check-rn-parity.mjs:131-137` now throws `region end marker not found: ${before}`, so a
missed end marker degrades to a PARSE-FAILED row exactly like a missed `after` — which is what the
function's own docblock at `:100-102` always claimed. Pinned by a new non-`skipIf` case
(`rn-token-parity.test.ts:85-90`) asserting the throw, so it runs on a box without the phone repo.

**F6 (my r1 MEDIUM — `flattenOver` / `withAlpha` return a plausible wrong value with no breadcrumb)
— FIXED.** `7c245fe` + `001627e`, reconciled into one `flatten()` at `5e2768e`. All four clauses
landed: (1) `flattenOver(top, ground, ...rest)` — the zero-ground arm is now a compile error;
(2) the contrast test's `flatten()` (`palette-contrast.test.ts:98-122`) parses every layer once and
throws `bottom ground must be opaque` on a translucent last ground, pinned at `:281`; (3) the
dev-only `warnUnparseable()` (`scale.ts:105-115`) fires on both silent arms —
`withAlpha:144` and `flattenOver:180-186` — in the `generateExtractedScopes` shape, and the cited
precedent is real (`case-map/geojson.ts:288`, itself citing `create-store.ts:986`); (4) the rgb
regex is `$`-anchored and 4-/8-digit hex now parse their alpha instead of passing through at their
own. I traced the widened `parseColor` by hand: `<=4` digits doubles each nibble (3-digit → alpha
undefined → 1; 4-digit → `dd/255`), `>4` pairs off via `match(/../g)` (6-digit → alpha undefined →
1; 8-digit → `aa/255`) — every existing call site keeps its old answer.

**F8 (my r1 MEDIUM — hand-transcribed alpha tints; DEMOTED to LOW by the aggregator) — FIXED for
what is W0's; residual accepted on the merits.** `824df2a` deletes the two dead `T` keys and
rewrites the false comment at `glass-tokens.ts:52-56`, which now names the owner and the reason
("plan U1.1 DERIVES this token … from `GLASS_TIER.dark.card`") instead of the disproved "CSS has no
alpha-on-hex". I verified the demotion's premise rather than taking it: matrix **A30** assigns
`GLASS.borderSoft` to **U1** and schedules its value to move again next wave, so the derivation is
owned and the window in which a stale copy could survive is one wave with a named closing act.
`627ac63` (F7) additionally closes the strongest member of the class I raised — `ACCENT_FROM` is now
`'#1F6B99' satisfies typeof colors.primaryDark`, so re-basing `primaryDark` without the stop stops
compiling, which was the one tint whose staleness the live contrast rows would have measured
*against*. I do not re-file the residual.

### The coordinator's three questions about the fixes' own failure surfaces

**Does F4's comment strip hide anything?** No. `region()` now opens with
`text.replace(/\/\/[^\n]*/g, '')` (`:114-124`). The one way that hides drift is a `//` inside a
string literal, which would truncate a live value out of the slice; the commit claims none of the
five sliced files has one, and I checked rather than accepted it — a grep for `://` and for `//`
between quotes over `tokens/palette.ts`, `tokens/scale.ts`, `glass-tokens.ts` and the phone's
`Colors.ts` / `Layout.ts` returns **zero** hits. The strip lives inside `region()`, which every
reader (`readField`, `readConst`, `readStop`) routes through, including the no-options calls — so
there is no unstripped path. It only ever removes comment text, so a marker previously found in
CODE is still found; a marker previously found in a COMMENT (a wrong slice, silently) now misses
and throws → PARSE-FAILED. Both directions move toward loud. Live guard after the strip:
**67/67 OK**, exit 0.

**Does F4's throw-on-missed-`before` hide anything?** No — it converts the only silent arm in the
function into the same PARSE-FAILED row the U0.0 degrade already isolates per anchor, and
`checkParity`'s `drift` filter (`:336`) counts a PARSE-FAILED row as drift, so it cannot exit 0.
The risk worth looking for is the opposite one — a FALSE PARSE-FAILED making the guard blind by
attrition — and it does not exist at any of the four call sites: `'} as const'`, `'dark: {'` and
`'}'` are all present, and a future absence is precisely the "this file was restructured, re-read
the markers" signal the row exists to raise.

**Does the guard's derived `anchors.length` + membership pin still fail LOUDLY on a malformed
anchor?** Yes — probed twice, both KILLED. This was the one assertion the vetted doc marked
PRESCRIPTION-UNVERIFIED, so I executed it rather than reading it.

```
MUTATION PROBE: malformed anchor set (F2's membership pin)
Target: .design-sync/check-rn-parity.mjs — PALETTE_KEYS
Claimed pin: rn-token-parity.test.ts:126-128 'the guard must anchor exactly the palette tokens'
Provenance: canonical source, probe worktree probe-w0d-sfh-anchors at 15e5a6f (no mirrored copy)
(a) Mutation: 'link' -> 'card' (drops one key, duplicates another — the r1 survivor's shape)
    Result: KILLED (exit 1) — "card must be pinned in both halves: expected
    [ 'dark', 'dark', 'light', 'light' ] to deeply equal [ 'dark', 'light' ]"
(b) Mutation: 'linkHover' -> 'linkHovr' (rename, no duplicate — the case (a) cannot reach,
    because the schemes loop passes whenever both rows merely exist)
    Result: KILLED (exit 1), FOUR assertions, including the membership pin BY NAME —
    "the guard must anchor exactly the palette tokens" — plus both PARSE-FAILED rows named
    ("field not found: linkHovr") and the light-vs-dark structural pin.
Restore: verified byte-identical (git checkout --; git status --porcelain empty; 11/11 green)
```

Reading the shape as well as running it: `anchors.length` is now DERIVED
(`PALETTE_KEYS.length * 2 + 3`), so it no longer detects a shrink of `PALETTE_KEYS` — membership
does that, and the derived count still covers deletion of the three non-palette anchors, which is
exactly what the comment at `:130-132` claims. The new `SCHEME_INVARIANT = {onPrimary, onError}`
exclusion is the remedy the test's own comment prescribed; I verified against `palette.ts` that
both really are `#ffffff` in both halves, and any THIRD invariant key would red the structural pin
rather than slip through — the correct direction.

### New finding (fix-introduced)

```
[LOW] `looksLikeColour` silences the withAlpha warn for exactly the CSS-function inputs the demo forbids
File: features/demo/ui/tokens/scale.ts:117-118 (the predicate) and :142-145 (the arm it gates)
Code:
  const looksLikeColour = (color: string) => /^(#|rgba?\()/i.test(color)
  if (looksLikeColour(color)) warnUnparseable('withAlpha', color, ...)
Issue: the noise argument the predicate exists for is right for `transparent`, `currentColor` and
  named colours — those are documented safe inputs, and warning on them is what gets a warning
  muted. It does not hold for `color-mix(`, `hsl(`, `hsla(` or `linear-gradient(`: none is a
  documented-safe input, all four return unchanged with the requested alpha silently dropped, and
  `color-mix()` is the one value form this module's own docblock (`:106-109`) bans inside
  `features/demo/**` precisely because it carries no channels for `flattenOver` to composite. The
  fix therefore breadcrumbs the malformed-hex case and stays silent on the case that motivated the
  ban. The sibling arm in `flattenOver` (`:180-186`) warns unconditionally and is correct.
Adversarial input / sequence: a U1.1+ recipe writes `withAlpha('color-mix(in srgb, ...)', 0.5)`.
Observable wrong behavior: the `color-mix()` string comes back at its own alpha, renders wrong, and
  logs nothing — while `withAlpha('#zzz', 0.5)` one line away does warn. LOW because no such value
  exists under `features/demo/**` today and the contrast gate rejects `color-mix()` on anything
  that reaches a ground stack.
Fix: widen the predicate to `/^(#|rgba?\(|hsla?\(|color-mix\(|linear-gradient\()/i`, or invert it
  to an allow-list of the documented-safe words (`transparent`, `currentColor`, `inherit`, `none`)
  and warn on everything else. One line either way, no behaviour change.
```

No other fix-introduced regression found in the blast radius of `696f3bb`, `4f834f9`, `4c2a4fa`,
`7c245fe`, `001627e`, `824df2a`, `627ac63` or the `5e2768e` conflict reconciliation. F1's six
accent-as-mark swaps (`ExportModal.tsx`, `MediaLibrarySheet.tsx`, `ExportCaseCard.tsx` and their
three siblings) touch colour values only — no `FallbackMode` variant, notice copy, `isSample` badge
or `data-map-fallback` string is altered, and no `console.warn` / `console.error` was removed
anywhere in the fix diff.

---

## Silent Failure Hunter Summary (Round 1 fix delta)
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 1 (new, fix-introduced)
Prior-round dispositions: **F3 FIXED · F4 FIXED · F6 FIXED · F8 FIXED** (F8's residual is owned by
U1.1; I verified that premise against matrix A30 rather than accepting it) — 4 of 4 closed,
0 PARTIAL, 0 UNFIXED.
Verdict: **APPROVE**

Fallback honesty (every substitution announced): **yes** — untouched by the fix round; the guard's
own degrade still counts a PARSE-FAILED row as drift and cannot exit 0.
Failure-cause distinctions preserved: **yes**, and improved — `warnUnparseable` names the function,
the offending value and the consequence separately on each arm.
Partial results flagged (not silently short): **yes** — probed: a malformed anchor set now reds BY
NAME on the membership pin (67 rows / 32 palette keys), where the old cardinality pin survived it.
Async cancellation / stale-write safety: **n/a** — no async and no store writes in this diff.
Operator breadcrumbs intact: **yes** — none removed; two dev-warn arms added where I asked for them.
Probes: 2 run this round, both KILLED, restores proven byte-identical. Teardown verified —
`unlinked 549 junction(s) in 2 pass(es)`, `.pnpm` 240 → 240, exit 0.

Out-of-lane observations:
- Standing from r1 and unchanged by the fixes: the `skipIf` green-on-absent-phone-repo property is
  now the phase gate for 67 rows; there is still no CI and no `package.json` script invoking the
  standalone guard, and F7's new docblock cites ledger §91 for it — so the hazard is recorded in
  two places and enforced in none. A `"parity": "node .design-sync/check-rn-parity.mjs"` script is
  the cheap half of it.
- No foreign content was found in my lane file, and I wrote no other path.
