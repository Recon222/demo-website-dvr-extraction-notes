# Lane: tests — W3 (U5 + U6 + U7), `feat/uiparity-w3` @ `13827de` vs `master` @ `6764a28`

**Mode:** code review · **Lane question:** are the wave's new pins behaviourally meaningful, do they
pin what they claim, and would they catch a realistic regression?

**Pre-flight, cold, reproduced independently in my own probe worktree** (`probe-w3r-tests-map`, cut at
`13827de`, `pnpm install --prefer-offline` 4.3 s): `pnpm exec vitest run --silent=true` →
**305 files / 4,194 passed | 2 todo (4,196), exit 0.** Matches the integration report exactly. **No
pre-flight failure, so nothing to scope out.** Motion mode for every probe below: **motion-ON**
(`vitest.setup.ts`'s `matchMedia` stub is hard-`false`); `navigator.mediaDevices` left undefined
throughout, i.e. the sample path, which is the tested contract.

**Probe provenance:** every mutation below was applied to the **canonical source in my own probe
worktree**, never to `w3-wave` and never to a mirrored copy. Every verdict is the runner's **exit
code**. Every restore is `git checkout -- features/` followed by an asserted-empty
`git status --porcelain`, and the tree was proven byte-identical to `13827de` at the end
(`git diff 13827de --stat` empty, suite re-green at 4,194). Teardown quoted in the probe ledger.

---

## HIGH

### [HIGH] The A94/D13 mono policy is enforced by a source scan that a **dead constant** satisfies — three of its five named surfaces can lose the scanner face with the full 4,194-test suite green
File: `features/demo/ui/__tests__/fonts.test.ts:137-195` (`describe('the mono policy (A94 / D13)')`, `SCANNER_ONLY` `:142-155`, `MIXED` `:156-168`, the two cases at `:170` and `:183`)
Production: `features/demo/ui/screens/import/TerminalLine.tsx:41` (`const stmono`) consumed at `:53,:60,:67,:87,:99` · `features/demo/ui/StoryRail.tsx:11` consumed at `:42,:75` · `features/demo/ui/screens/SplashScreen.tsx:23` (the HUD `status` recipe) · same shape at `screens/BootSequence.tsx:26` and `screens/import/ImportTerminalProgress.tsx:180`
Issue: both cases test **file text**, not rendered style — `uiSources` is raw source (not comment-stripped), and membership is `text.includes('--font-stmono')`. A file therefore satisfies the policy while spelling the face **only in a constant nothing consumes**, or only in a docblock. The docblock at `:132-135` says the source scan "is generalisation, not the whole proof" and names `OcrCaptureScreen.test.tsx`'s render pins as the behavioural anchor — but those are the **only** font-face render pins that exist anywhere in the demo suite (`grep -rn fontFamily features/demo/ui --include=*.test.ts*` returns exactly `OcrCaptureScreen.test.tsx:70,71,81,82,89,90` and `NotesScreen.test.tsx:159`). Nothing observes the scanner face on the four `SCANNER_ONLY` surfaces or on `StoryRail`.
Evidence — **3 SURVIVED, 1 KILLED negative control** (scope: full suite, 305 files):
- **NEGATIVE CONTROL** — `TerminalLine.tsx:41`'s const value `--font-stmono` → `--font-jbmono`: **KILLED**, `fonts.test.ts` 2 failed / 3 passed. Proves the file is in the scan's scope and the guard executes. (Non-equivalent, shipped shape, covered by the suite I ran, on an executed arm — all four clauses.)
- **MONO1** — `TerminalLine.tsx`: `fontFamily: stmono` → `fontFamily: 'inherit'` at **all five** render sites, const left in place. **SURVIVED — 305 files / 4,194 passed, exit 0.** Every terminal log row renders in the sans and nothing sees it. `TerminalLine.tsx` is the phone's own `scannerMono` anchor (`TerminalLine.tsx:21`).
- **MONO2** — `StoryRail.tsx`: both `fontFamily: stmono` sites → `'inherit'`. **SURVIVED — 4,194 passed, exit 0.**
- **MONO3** — `SplashScreen.tsx:23`: the `status` HUD recipe drops its `fontFamily` key entirely (the file keeps two other spellings, so the scan is untouched). **SURVIVED — 4,194 passed, exit 0.**
Why it matters: the mono split is the U7.3 row's named deliverable and the commit that landed it is titled "the D13 mono policy, codified and **pinned**". It is codified; it is not pinned. The realistic regression is ordinary — a package folds `TerminalLine`'s five row recipes onto a shared style, or `SplashScreen`'s HUD onto `_shared.tsx` — and the demo's signature surface silently loses its face on a wave whose whole thesis is typography and recipe parity. `css: false` makes the inline `fontFamily` the *only* observable there is, and it is unobserved.
Fix: one render pin per `SCANNER_ONLY` file plus `StoryRail`, in the shape `OcrCaptureScreen.test.tsx:67-72` already ships — render, read one representative node's `style.fontFamily`, assert `toContain('--font-stmono')` **and** `not.toContain('--font-jbmono')`. `TerminalLine.test.tsx` and `ImportTerminalProgress.test.tsx` already mount their subjects, so this is one assertion each. Re-run MONO1/MONO2/MONO3 and confirm the kills.

### [HIGH] The plan-mandated "no local STATUS map" ratchet bans ONE SPELLING of the shape, not the shape — including the exact W2/F26 code its own docblock cites as its reason for existing
File: `features/demo/ui/screens/__tests__/status-owners.test.tsx:126-138` (`trios()` and the case `finds none — and PROVES the reader works by planting one`); the claim it makes is at `:105-116` ("The pattern is 'an object literal holding TWO OR MORE severity reads', not 'the identifier STATUS'… which is exactly how the private trio survived a whole wave (W2 F26)")
Production surface scanned: `screens/TimeOffsetScreen.tsx`, `screens/SyncStatusCard.tsx`, `screens/CompletionScreen.tsx`, `screens/DvrInfoScreen.tsx` (`OWNED`, `:119`)
Issue: the predicate slices brace-free blocks with `\{[^{}]*\}` and counts matches of `colors\.(error|warning|success|info)\b`. Two independent narrowings defeat it: the slicer sees only literals containing NO nested braces, and the token pattern matches only the BARE severity name — `colors.errorLight` fails the `\b`, and a computed read through a template-literal key is not a member access at all. The W2/F26 defect was exactly a computed `*Light` read inside a returned object; the docblock names it, and the regex cannot see it.
Evidence — **3 SURVIVED, 1 KILLED negative control**, all planted in `screens/CompletionScreen.tsx` (an `OWNED` file), scope `status-owners.test.tsx` (13 cases):
- **NEGATIVE CONTROL (P12-flat)** — a two-key literal reading `colors.success` and `colors.error` → **KILLED**, 1 failed / 12 passed. The scan runs and the file is in scope.
- **P12-nested** — the same map with each value wrapped in its own object (`{ SAFE: { fg: colors.success }, BAD: { fg: colors.error } }`) → **SURVIVED**, 13 passed, exit 0.
- **P12-light** — a three-key map reading `colors.successLight` / `colors.errorLight` / `colors.warningLight` → **SURVIVED**, 13 passed, exit 0. This is the `*Light` trio shape F26 was raised against.
- **P12-computed** — a `localTone(sev)` helper returning an object whose `background` and `color` are computed `colors[...]` reads keyed off the severity → **SURVIVED**, 13 passed, exit 0. This is W2/F26's own code, transplanted into an `OWNED` file.
Why it matters: this is one of the four ADD pins plan §5's U6.4b row mandates, and U6.4b's report §4 sells it specifically as banning a SHAPE rather than a NAME, against the W0/F2 · W1/F16 · W2/F23 hand-typed-roster class. It is a hand-typed roster of one spelling. A re-grown private severity vocabulary in any of the four files — in the two forms this campaign has actually shipped — lands green. Same family as W2/F33 (a scan whose evasion forms outran its filter) and W2/F32 (a mechanism wider than the reason written beside it).
Fix: (a) match nested literals — recurse, or slice brace-balanced regions instead of `[^{}]*`; (b) widen the token pattern to `colors\.(error|warning|success|info)[A-Za-z]*\b` AND add the computed bracket form; (c) add each of the three surviving forms to the planted-control case at `:136`, so the roster's completeness is asserted rather than assumed. Re-run all four probes and confirm three new kills with the control still killing.

---

## MEDIUM

### [MEDIUM] The wave-assembly F26 sweep (`a9c57d9`) is 2-of-4 — two more Banner/PaneNote pins spell the fill and foreground as `*Light` palette tokens, and a probe shows they are exactly the two that misdirect on a seam re-point
File: `features/demo/ui/__tests__/field-recipe-sweep.test.tsx:471` (fill asserted as `colors.errorLight`), `:476` (foreground as `colors.errorOnLight`) — **no `severityTone` import anywhere in the file**, i.e. the same "no seam-consuming sibling" shape the integrator judged REAL and fixed in `AudioPreviewScreen.test.tsx` · `features/demo/ui/screens/__tests__/status-owners.test.tsx:186` (`colors.warningLight`) and `:183` (`colors.warningOnLight`), paired with seam pins at `:167`/`:174` — the weaker-instance shape the integrator fixed at `time-offset-advisories.test.tsx:103` · third touch-point `:93` (`colors.errorOnLight`), paired with the seam pin at `:73`
Production: `features/demo/ui/controls/Banner.tsx:155` and `features/demo/ui/screens/settings/panes/_pane-chrome.tsx:194` both read `severityTone(...)`; the seam is `features/demo/ui/tokens/status.ts:118-125`
Issue: the integration report's hazard-#3 section says "Three hits judged, 2 fixed" and residual risk §3 states the rule — "any new pin that spells a Banner fill as a `*Light` palette token is the same defect". The sweep ran over U7.2's files and missed U6.4a's and U6.4b's.
Evidence — one probe, whole suite: `status.ts:120`'s `background` re-pointed from the computed `*Light` read to `c.backgroundTertiary`. **KILLED, and the failing SET is the diagnostic**: exactly THREE files red — `tokens/__tests__/status.test.ts` (the seam's own oracle, correct), `__tests__/field-recipe-sweep.test.tsx`, `screens/__tests__/status-owners.test.tsx`. Every seam-reading pin (`banner.test.tsx`, `pane-chrome.test.tsx`, `CompletionScreen.test.tsx`, `time-offset-advisories.test.tsx`, `MapFiltersSheet.test.tsx`) stayed green — the documented relative-pin residual W2 ruled on, which I have deliberately NOT re-filed. So the two files above are the only ones that red on a legitimate seam re-point, and they red naming a palette token rather than the seam: the cheapest repair a maintainer reaches for is re-typing the new literal, which ratifies the change with no oracle. (Mirror probe, the seam's `color` re-pointed to `c.textTertiary`: the same two files plus `banner.test.tsx` and `palette-contrast.test.ts`. Recorded for completeness: re-pointing `color` to `c.text` is an EQUIVALENT mutation and produced a non-verdict, because in dark all four `*OnLight` collapse to `#f0f4f8` = `text` — `palette.ts:140,191-194`.)
Fix: read the seam in the four POSITIVE assertions (`field-recipe-sweep.test.tsx:471,476`; `status-owners.test.tsx:183,186,93`). Leave the NEGATIVE assertions (`:92`, `:182`, `field-recipe-sweep.test.tsx:472`) in palette terms — that is the integrator's own ruling for `CompletionScreen.test.tsx:103`, and it is right. Re-run the two seam probes and confirm only `status.test.ts` reds.

### [MEDIUM] `settings-palette-sweep`'s exemption is keyed by HEX for a reason written per SITE — a new bare literal anywhere in the settings subtree is silently excused (F32's exemption-keying class, third recurrence)
File: `features/demo/ui/screens/settings/__tests__/settings-palette-sweep.test.ts:32-43` (`ALLOWED`, keyed `#5d7a9a`), consumed at `:100-107`
Issue: the row's reason names ONE site — "FormFieldsPane's footnote tone" — but the mechanism exempts the value across the whole `screens/settings/**` walk, and the dead-exemption case at `:96` compares the set of hexes FOUND against the set of hexes ALLOWED, so a second site spelling the same hex is invisible in both directions. This is W2/F32's shape with the axes swapped, and W2's pipeline note named it the wave's one theme: "each one's exemption mechanism is broader than the reason written beside it."
Evidence — **1 SURVIVED, 1 KILLED negative control**, scope: the file (3 cases):
- **CONTROL (SP1)** — a palette hex (`#f0f4f8`) planted in `screens/settings/panes/SecurityPane.tsx` → **KILLED**, 2 failed / 1 passed. The sweep runs and the file is in scope.
- **SP2** — the exempt hex (`#5d7a9a`) planted in the SAME non-FormFieldsPane file → **SURVIVED**, 3 passed, exit 0.
Why it matters: bounded — one non-palette hex, no D2 violation either way — which is why this is MEDIUM and not higher. But the census-to-zero claim this file mechanises is what U6's exit line rests on, and the guard cannot tell one exempt site from three. `field-recipe-sweep.test.tsx:94` gets it right (`ALLOWED` file-keyed and empty); the two are siblings and should agree.
Fix: key `ALLOWED` by path-plus-hex (or store the path in the value and compare it in both cases), exactly as W2/F32's fix keyed `EXEMPT` by role. Re-run SP2 and confirm the kill, keeping SP1 as the control.

---

## LOW

### [LOW] `camera-chrome.test.ts`'s "POSITIVE CONTROL" cannot observe the scan it claims to prove — it asserts over strings it builds itself
File: `features/demo/ui/screens/__tests__/camera-chrome.test.ts:91-105`
Issue: the docblock claims the case "proves the matcher fires on the exact shape it claims to catch… without needing a probe worktree". The body wraps each spelling in a synthetic haystack and asserts the normalised haystack contains the normalised needle — true by construction. It reads no file and never enters `read(file)` or the `offenders` filter at `:80-89`. What it does test is `norm`'s case- and whitespace-insensitivity, which is real but is not what the comment says. The sibling controls do it properly: `settings-palette-sweep.test.ts:71-77` (`files.length > 10`) and `mapTokens.test.ts:340-347` (`text.length > 1000` against the real file). False-coverage-claim class, in miniature — the W2/F50 shape.
Evidence: the scan itself is real — planting a frozen camera literal in `screens/OcrCaptureScreen.tsx` **KILLED** it (1 failed / 5 passed) — so this is a claim defect, not a coverage hole, and the surrounding pins fail closed (`readFileSync` throws on a moved path; an emptied `CAMERA_CHROME` reds the `toEqual` at `:54`).
Fix: either restate the comment as "proves `norm` collapses the spellings a re-inline arrives in", or add one line that reaches the real haystack — a length assertion on `read('OcrCaptureScreen.tsx')`.

### [LOW] `banner.test.tsx:319-320` still says the adoption test "compares against a FOUR-entry list" — `ADOPTED` has ten
File: `features/demo/ui/controls/__tests__/banner.test.tsx:316-322` (the `rendersBanner` docblock); the list it describes is `:244-266`
Issue: the sentence is load-bearing — it is the argument that a broken `rendersBanner` regex cannot pass silently. The argument still holds at ten, but the number went stale the moment the W3 assembly unioned both phases' hand-backs. Same stale-count class the integrator's hazard #4 fixed IN THIS FILE (the "U7.2 took it from four to six" comment and the "3 tones, 8 sites" row); the sibling sentence twelve lines away was not re-read. Completeness sweep of the file: `:341-343`, `:268-278` and `:279-282` are count-free and correct; `:319` is the only survivor.
Fix: "compares against a fixed list" — the anti-vacuity argument needs no number, which is the F48 rule the same docblock cites.

### [LOW] `modals.test.tsx:232` still carries the pre-A93 em-dashed `pdf-extract` message as a fixture
File: `features/demo/ui/screens/__tests__/modals.test.tsx:232` vs `features/demo/ui/import/pdf-extract.ts:48`
Issue: `pdf-extract.ts` now throws "This PDF looks scanned or image-only. No selectable text was found…"; the fixture passes the old em-dashed form into `ImportModal`. Harmless today — `:236` is a regex partial that stops before the punctuation, which is why nothing reddened — but the file now documents copy that does not exist, and an exact-match assertion written off it later would pin a dead string. `copy-rules.test.ts` excludes `__tests__` by design, so no guard can see this. Same family as the integrator's hazard-#2 clean-merge defect (`MapScreen.test.tsx:685`), on the input side rather than the oracle side.
Fix: update the fixture to the shipped copy. One line, in any A93 follow-up commit.

---

## What I re-ran and confirmed (the implementers' claims, sampled)

| Claim | My probe | Verdict |
|---|---|---|
| U5.3 P5 — "Clear All stops deactivating proximity" (report §12: P5/P6 are "the only guard" against a one-line collapse) | `MapScreen.tsx:349-352` drops `setProximityActive(false)` | **KILLED** (1 failed; map scope 20 files / 318 passed) |
| U5.3 P6 — the mirror; the "obvious cleanup" the report says type-checks | `onClearFilters={handleClearFilters}` → `{handleClearAllFilters}` | **KILLED** — names `the sheet's EMPTY-state Clear stays filters-only` |
| U5.3 §12 defect 2 — "the live region and the subtitle carry the same string from two expressions; nothing forces them to agree". **There IS a pin**: `MapFiltersSheet.test.tsx:94,99,104,109` assert `getAllByText(...)` has length 2 | subtitle formatted at the call site so the two diverge (the report's own "appending a proximity radius" scenario) | **KILLED** — 3 failed. A whitespace-only divergence survives, correctly: RTL normalises and the render is identical — reported as an EQUIVALENT non-verdict, not a survivor |
| U6.4b P11 — "the Retention collapse guard is real rather than decorative" (a pin that passed on arrival) | `DvrInfoScreen.tsx:244` `{showRetention && (` → `{true && (` | **KILLED** |
| U6.4b P15 — `Banner`'s `id` prop reaching the DOM (a pin that passed on arrival) | `Banner.tsx:207` drops `id={id}` | **KILLED** — 2 failed, incl. `CompletionScreen`'s `aria-describedby` pin |
| U7.3 — `copy-rules.test.ts` reds on a new em dash in rendered copy | one planted in `SplashScreen.tsx`'s `TAP TO SCAN` | **KILLED** |
| …and does NOT red on a comment | one planted in a block comment, then in a line comment, same file | correctly **NOT red** both times (exit 0) — the exemption behaves as documented |
| U7.3 P2 — the dead-exemption half | the frozen `CloudSyncPane.tsx` string rewritten to remove its dash | **KILLED** — the message names the row to delete |
| W2/F28's lesson (fragments pinned on the RENDERED element) carried into U5.4 / U6.3 | `LocationRow.tsx:45` drops `...glassCard` · `LocationDetailCard.tsx:74` drops `...glassCardNested` · `SettingsCategoryList.tsx:117` drops `...glassCard` · `SheetHandle.tsx:36` drops `SHEET_COLORS.handle` | **4 × KILLED** (full suite each) |
| `camera-chrome` anti-re-drift scan · `settings-palette-sweep` palette-hex ban | real re-inlines planted in `OcrCaptureScreen.tsx` / `SecurityPane.tsx` | **KILLED** · **KILLED** |

**RED/GREEN discipline.** Sampled `7f8b45c`, `a9c57d9`, `671c3bf` in full, plus the titles of `ff01669`
("probe P13 SURVIVED"), `a9cac5c` ("probe P9 SURVIVED"), `7dff1c7` ("probe P1 SURVIVED"), `10d8986`
("kill the survived probe"), `9286cf4`, `4bb9b9c`. Every one carries the observed red — or the survived
probe and its fix — in the body with the reasoning. `7f8b45c` quotes the before/after strings and
explains why the re-pin was kept as a LITERAL rather than an import of the constant (a pin that imports
the string it pins passes through any rewrite of it, including a rewrite back to an em dash) — correct,
and the reasoning I would want. Reddened pins were updated in the same commit as the source that
reddened them.

**No behavioural pin was deleted or weakened by the A93 sweep.** I checked each of the four rendered
strings it moved: `ocr-recognize.ts:45` (three literals updated in the same wave at
`OcrCaptureScreen.live.test.tsx:315,330,347`), `run-import.ts:208` and `:215` (absorbed by pre-existing
regex partials at `run-import-log.test.ts:100` and `run-import.test.ts:80`, plus the structural
`code === 'NO_FIELDS_FOUND'` pin at `:88`), `pdf-extract.ts:48` (regex partial at
`modals.test.tsx:236`; the stale fixture beside it is LOW-3 above). `MapControls.test.tsx`'s 94 deleted
lines are U5.2's deleted chrome and every one has a successor: the status pills and radius presets in
`MapFiltersSheet.test.tsx:113-249`, the Clear pill's two jobs in `MapScreen.test.tsx:405-445`, the count
pill's `role="status"` in `MapFiltersSheet.test.tsx:280-334`, the zero-match copy at
`MapScreen.test.tsx:532`. The one em dash still asserted in a rendered string
(`MediaCaptureScreen.test.tsx:390`) is an `engine/` message, i.e. U7.3's disclosed deferral D-2 scope,
not a leak.

**Refuting one item from the integration report** (in lane, because it is a claim about a pin).
Residual risk §1 says *"Nothing pins that `PaneNote`'s rendered severity glyph and `Banner`'s agree
visually across all three tones."* Refuted at source: `pane-chrome.test.tsx:126-136` renders a live
`<Banner severity="warning">` beside a `<PaneNote tone="warning">` and asserts the WHOLE declaration
sets are equal (`declared(note)` vs `declared(banner)`), `:138-144` does the same for the message node,
and `:146-155` loops the glyph over info / warning / success. Both sides read `severityTone(...)`
(`Banner.tsx:155`, `_pane-chrome.tsx:194`), so a per-tone divergence is structurally impossible and the
recipe divergence is pinned relationally. That is the strongest F26-shaped guard in the wave and should
be recorded as such rather than as a gap.

---

## Probe ledger

**28 runs · 26 valid probes · 17 KILLED · 7 SURVIVED · 2 correct-non-red (exemptions behaving as
designed) · 2 EQUIVALENT non-verdicts, both declared above and neither counted as a survivor.**

Worktree `worktrees/probe-w3r-tests-map` @ `13827de`, branch `probe-w3r-tests-map`, cut and installed
per the skill. Every mutation on the CANONICAL source, one mutation per probe, verdict from the
runner's exit code. Restore proven after every probe (`git checkout -- features/` then an
asserted-empty `git status --porcelain`) and at the end: `git diff 13827de --stat` empty and the suite
re-run green at 305 files / 4,194 passed / 2 todo / exit 0.

The seven survivors, in one place: MONO1 (`TerminalLine`), MONO2 (`StoryRail`), MONO3 (`SplashScreen`)
— HIGH-1 · P12-nested, P12-light, P12-computed — HIGH-2 · SP2 — MEDIUM-2. Each has a KILLED negative
control in the same scope satisfying all four clauses.

Teardown via `tools/worktree-remove.ps1`, proof line quoted:

```
node_modules/.pnpm entries BEFORE: 240
unlinked 549 junction(s) in 2 pass(es)
node_modules/.pnpm entries AFTER : 240
OK -- worktree removed, main checkout's .pnpm store intact (240 entries).
```

exit 0 · branch `probe-w3r-tests-map` deleted · `git worktree list` carries no `probe-*` row.

---

## Tests Summary
CRITICAL: 0 · HIGH: 2 · MEDIUM: 2 · LOW: 3
Verdict: **REVISE**

Behaviourally meaningful coverage: **strong**. The wave's recipe and tier adoptions are pinned on the
rendered element (4/4 F28-class spread deletions killed), the seam-relational idiom is applied
correctly at `banner.test.tsx` / `pane-chrome.test.tsx` / `CompletionScreen.test.tsx` /
`MapFiltersSheet.test.tsx`, both of U5.3's "only guard" probes re-killed, and both of U6.4b's
passed-on-arrival probes re-killed. `terminal-palette.test.ts:80-113` (the live light-scheme flip
through a module mock) and `overlay-header.test.tsx:139-159` (an override pin rebuilt after its first
shape SURVIVED) are the two best new pins in the wave. The two HIGHs are the same kind of defect:
**source-scan guards whose pattern is narrower than the claim written above it** — this campaign's
recurring theme, now in its third consecutive wave (W2/F32 exemption keying, W2/F33 evasion forms, and
these two).

Engine coverage gate (80% on `lib/**` + `features/demo/engine/**`): **not applicable** — the diff's only
engine file is `engine/content/settings-values.ts` (three copy strings), with
`engine/content/__tests__/settings-values.test.ts` updated in the same commit. No new logic landed in
`ui/**` that belongs in `engine/**`: `mapTokens.ts`, `terminal-palette.ts`, `camera-chrome.ts`,
`sample-badge.ts` and `field-input.ts` are token/recipe records with no branching, and the one new
component with real derivation (`MapFiltersSheet`) routes its set arithmetic through the already-gated
`mapFilters.ts`.

Mock strategy: **at the IO edge.** No new mocks introduced. `terminal-palette.test.ts:93-112`'s
`vi.doMock` of the palette module (with `resetModules` and `doUnmock` in a `finally`) is a
module-boundary mock used to reach a branch jsdom cannot otherwise show, not a mock over the subject.

Factory usage: **canonical.** `MapFiltersSheet.test.tsx` builds one local `mount()` over the
component's own props (presentational, no store), `MapScreen.test.tsx` reuses `buildRichMapData`,
`status-owners.test.tsx` uses `blankLocationForm()`. No hand-built `DemoCase` / `DemoLocation` /
`NewCaseInput` literals introduced anywhere in the diff.

Setup-shim traps: **none.** `OcrCaptureScreen.test.tsx:26-29` names the `navigator.mediaDevices`
contract explicitly and takes the sample path deliberately; the live path stays in
`OcrCaptureScreen.live.test.tsx` with its own `getUserMedia` harness. No test claims a live-capture or
real-canvas path it does not install, and no test asserts reduced-motion behaviour without overriding
`matchMedia`.

Determinism (clock / entropy injected): **yes.** No `Date.now()` or `Math.random()` in any changed test
file; `MapScreen.proximity-chunk.test.tsx` drives the Turf chunk through the module boundary rather
than a timer. No order-dependence introduced — no new module-level mutable state, and the one
`vi.resetModules()` is paired in a `finally`.

Out-of-lane observations:
- `features/demo/ui/screens/import/ImportTerminalProgress.tsx:372,387,399` ships a three-arm private severity-title table (`titleColor: colors.successOnLight | warningOnLight | errorOnLight`) off `severityTone`, in the same wave as the ratchet that exists to ban that shape — and outside that ratchet's four-file `OWNED` scope. Seam-adoption call: typescript / type-design lane.
- `features/demo/ui/screens/OcrCaptureScreen.tsx`'s viewfinder still spells the retired `#1e3a5f` as an `rgba()`, disclosed as U7.3's D-3. The general point underneath it — `tokens/__tests__/palette.test.ts`'s RETIRED sweep is hex-only — now has two independent witnesses this wave (U5.1's `mapTokens` rgb() ban, U7.3's R-9). Ledger material; the aggregator writes it.
