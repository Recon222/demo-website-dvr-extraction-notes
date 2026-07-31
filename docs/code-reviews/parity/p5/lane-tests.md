# P5 — lane: TESTS

**PR:** #34 — P5 Export surfaces (`master..feat/parity-p5`)
**Lane:** test-analyzer (Vitest 4 + jsdom + RTL)
**Mode:** initial
**Worktree:** `scratchpad/worktrees/parity-p5`

## Pre-flight

| Gate | Result |
|---|---|
| `pnpm test --silent` | **237 files / 2839 tests passed**, exit 0 (126.8s) |
| `pnpm exec tsc --noEmit` | clean |
| Baseline claimed in PR body | 2839 tests — **matches** |

No pre-existing failures. Suite is deterministic; a non-silent run of the four timer-driven
export suites produced **zero `act()` warnings** and no unhandled rejections.

## Method

Every finding below with a "verified" line was produced by **mutating production code,
running the affected suites, and reverting**. Nine probes were run; the tree was returned
clean after each (`git diff` empty, confirmed). Nothing was committed.

Note: this worktree is shared with the other P5 review lanes — a transient
`features/demo/ui/__tests__/ZZtmp-reentry.test.tsx` appeared in one full-suite run and was
gone moments later (another lane's probe). It contributed 0 tests and did not affect any
result below; every probe conclusion was re-confirmed against a clean tree.

---

## Findings

### [HIGH] The §70i strengthening — the PR's headline hardening — is not pinned by the test that names it

**Production code:** `features/demo/ui/DemoExperience.tsx:2041` — `requestExportFlow`'s
`if (exportFlowRef.current.showValidationModal) return`
**Tests covering it:** `features/demo/ui/__tests__/DemoExperience.export.test.tsx:340-365` —
*"§70i: with the validation prompt up, a second dispatch is inert"* (also cited as the pin in
deferred §74b)

**Verified by mutation:** deleting line 2041 entirely leaves the **full suite green —
237 files / 2839 tests, 0 failures**.

**Uncovered case:** the test's second dispatch is `chooseScope('case')` — the *same validated
pipeline* that raised the prompt. Trace it without the guard: `requestExport` sees
`stage: 'idle'` (the prompt resets the stage, by design), returns `{kind:'validate'}`,
`runExportValidation` re-runs the validator, `applyValidation` returns `prompt` again. Both
writes land in one React batch inside one event handler, so the end state is byte-identical to
the guarded path — prompt open, stage idle, no timer scheduled, no terminal notice. Every
assertion in the test is satisfied by *both* behaviours.

The guard only changes anything for a second dispatch that would take the **`run`** arm
(`location` / `location-geojson` / `case-map`), or that would **re-arm a different case**.

**Why it matters:** §74b is explicit that the demo's narration rail sits outside the phone
frame and can move the visitor while the prompt is up — i.e. the phone's "the modal covers the
button" geometry is *not* available here, which is the entire reason the guard exists. Delete
it in a future refactor and a location ZIP pipeline runs to completion *behind* an open
validation prompt: the progress overlay never shows (validation outranks progress in
`resolveExportModalMode`), so the visitor's first sign is a terminal "Downloads Aren't
Available" dialog stacked on a question they have not answered yet.

**Fix (shape verified in both directions):** change the second dispatch to a run-pipeline —
`chooseScope('location')` instead of `chooseScope('case')` at
`DemoExperience.export.test.tsx:355`. Verified: **fails** with the guard removed
(`Tests 1 failed | 17 passed`), **passes** with the guard restored (`18 passed`). The
existing "no terminal notice" assertion at `:361-363` then becomes the discriminating one.

Recommended: add a second arm too, since the guard has two distinct jobs — arm case A's
prompt, dispatch case B from the Export tab, then Continue, and assert the `generating` stage
names case A's location. That covers the re-arm half (which is a `pendingExportCaseId`
overwrite, i.e. the §74l scope escalation reachable through a different door).

---

### [HIGH] The P5.2/P5.3 seam — re-pinned by the orchestrator at merge — is covered for 1 of its 4 moving parts

**Production code:**
- `features/demo/ui/DemoExperience.tsx:661-671` — `onExportPress`, the plan→request mapping,
  three dispatch arms (`case` / `location` / `case-subset`)
- `features/demo/ui/DemoExperience.tsx:2413` — `isExporting={isExportInFlight(exportFlow)}`
  on `<ExportHub>` (the second half of the seam per deferred §73f.2)

**Tests covering it:** `features/demo/ui/__tests__/DemoExperience.export-tab.test.tsx:178-190`
— the describe block *"the P5.2/P5.3 seam, closed: the CTA runs the real flow"*, which contains
**exactly one test**, exercising only the `case` arm, and only as far as the all-invalid
validation prompt (the seed's bare locations cannot pass PDF validation, so the run never
starts).

**Verified by mutation — all three stayed green:**

| # | Mutation at | Suites run | Result |
|---|---|---|---|
| a | `:669` subset arm → `requestExportFlow({ type: 'case', caseId: exportView.caseId })` | full suite | **2839 passed** |
| b | `:667` location arm → `locationId: null` | full suite | **2839 passed** |
| c | `:2413` → `isExporting={false}` (the literal §73f says P5.3 replaces) | export-tab + export + ExportHub | **46 passed** |

**Uncovered case, concretely:** `export-tab.test.tsx:106-114` already builds the exact input —
3 locations, tick 2, footer renders `SUBSET ZIP · PARTIAL · 2 OF 3` — and then stops at
`toBeInTheDocument()` on the CTA. Press it under mutation (a) and the demo dispatches the
**whole case**: all three locations get PDFs, and the terminal notice reads *"a ZIP of the
whole case … plus the interactive case map"* directly under a footer that promised a partial
subset. That is precisely the scope escalation §74l's arming rules exist to prevent, reachable
from the tab in two clicks, and nothing fails.

Mutation (b) turns the single-location CTA into a "No Location Selected" alert — a dead
primary button — with nothing failing. Mutation (c) reverts the seam's disabled-during-run
treatment; `ExportHub.test.tsx:165-174` pins that treatment *given the prop*, but no test ever
observes the bridge passing `true`, so the wiring itself is unpinned.

**Why it matters:** §73f/§74g make "the CTA must NOT re-derive the branch — it dispatches the
one resolved plan" the whole contract of this seam, and the PR body calls the seam "closed
exactly per both agents' documented contracts". The only test in the seam block cannot
distinguish a correctly-keyed dispatch from a hardcoded `'case'`.

**Fix:** three tests in `DemoExperience.export-tab.test.tsx`, all end-to-end from the tab.
They need PDF-passing locations — lift the `addExportableLocation` helper from
`DemoExperience.export.test.tsx:20-30` (scopes + `dateTimeCompleted` + `completedBy`) into a
shared local, and adopt that file's fake-timer `beforeEach`/`afterEach` pair.

1. *subset*: 3 exportable locations, tick 2, press `Export 2 of 3 Locations`; step once and
   assert `Location 1 of 2` plus the two ticked names (and **not** the third); at the terminal
   assert `a ZIP of the 2 selected locations`.
2. *single*: tick 1 row, press `Export 1 Location`; assert the terminal reads
   `a ZIP of this location` and **not** `whole case`.
3. *isExporting*: during that run assert the case checkbox, the location rows and the CTA are
   disabled and `Clear` is **not** — the same treatment `ExportHub.test.tsx:165` pins at the
   component level, here proving the bridge supplies it.

---

### [MEDIUM] `EXPORT_ALERTS` — 5 of 6 verbatim-ported contract strings are pinned only against themselves

**Production code:** `features/demo/engine/logic/export/flow.ts:110-142` (`EXPORT_ALERTS`)
**Tests covering it:** `features/demo/engine/logic/export/__tests__/flow.test.ts:67, 74, 78,
85, 94, 264, 280` — every one compares `outcome.alert` to `EXPORT_ALERTS.<key>`, i.e. the same
frozen object against itself. `barrel.test.ts:51` pins only `noCaseSelected.**title**`.

**Verified by mutation:** replacing the `message` of `noCaseSelected`, `noLocationSelected`,
`noCaseSelectedForMap`, `missingSubsetPayload` and `noSelection` with `MUTANT-COPY-*` leaves
**8 files / 183 tests green**. Only `caseUnavailable`'s message is literally pinned, and by a
UI test (`DemoExperience.export.test.tsx:417`), not by the engine suite.

**Why it matters:** matrix row 28 makes these contract strings; §70g documents *exactly two*
intentional wording deviations from the phone and says "every other string is verbatim". With
no literal pin, a re-port, a typo, or an over-eager "friendlier copy" pass drifts silently and
the §70g claim quietly stops being true. The house pattern already exists two files over —
`stage.test.ts:37-43` pins `STAGE_MESSAGES` as a literal `toEqual` object.

**Fix:** one `expect(EXPORT_ALERTS).toEqual({...})` against an object literal of all six
alerts in `flow.test.ts`, mirroring the `STAGE_MESSAGES` block. While there:
`EXPORT_ALERTS.noSelection` has **no production caller** (grep: only `flow.ts` and no
consumer) — either wire it or drop it, and say which in §70.

---

### [MEDIUM] The 85 kB case-map artifact is validated only at its four injection points

**Production code:** `features/demo/engine/logic/case-map/build.ts:88-97` (`buildCaseMapHtml`)
over `features/demo/engine/logic/case-map/template.ts` (**84 959 bytes**; `__MAPBOX_TOKEN__`
sits at offset **36 547**, so ~48 kB of map renderer follows the last token)
**Tests covering it:** `case-map/__tests__/build.test.ts:33-52` (one-of-each token, no relative
`<script src>`/`<link href>`, no committed `pk.` token) and
`DemoExperience.case-map-export.test.tsx:82-114` (DOCTYPE prefix, title, and the injected
GeoJSON/meta parsed back out of the real saved `Blob`).

**Verified by mutation:** appending `.slice(0, 45000)` to `buildCaseMapHtml`'s return leaves
**4 files / 39 tests green**. That truncation preserves all four injections and destroys
`mapboxgl.Map`, `loadCase()`, the scope timeline, every popup, and `</body></html>`. The
downloaded file would open as a blank page.

Related: the comment at `DemoExperience.case-map-export.test.tsx:91` reads *"Self-contained:
the CSS and the app JS are inlined, no relative asset is requested"*, but the assertion beneath
it only proves the second clause — a page with **no** app JS at all satisfies it identically.

**Why it matters:** this is the demo's ONE genuinely real download (D4), handed to a visitor as
a file they keep. `tools/port-case-map-template.mjs` is the documented re-port path (§71c) and
its own post-build guards (`:65-95`) check the same four tokens plus the sample-data strip — so
the tool and the tests share the blind spot, and a bad regeneration ships silently green.

**Fix:** extend `build.test.ts`'s *"the ported template"* block with structural completeness
pins on `CASE_MAP_TEMPLATE_HTML`:
`expect(html.trimEnd().endsWith('</html>')).toBe(true)`;
`expect(html).toContain('https://api.mapbox.com/mapbox-gl-js/')` (the basemap runtime §71f
depends on); `expect(html).toContain('loadCase')` (the reader that parses the two JSON tags);
and a length floor (`expect(html.length).toBeGreaterThan(80_000)`). Then correct or delete the
"app JS is inlined" comment in the UI test.

---

### [LOW] `selection.test.ts:155` is named for the opposite of what it asserts

**Production code:** `features/demo/engine/logic/export/selection.ts:155`
**Test:** `features/demo/engine/logic/export/__tests__/selection.test.ts:155-160` —
*"DISARMS the full-case intent when a location is dropped from the set"* — asserts
`expect(next?.armedFullCase).toBe(true)`.

The assertion is correct (the survivors still cover the whole case, so the intent still
describes the selection) and its own inline comment says so. The **name** is wrong: the real
disarm case is the sibling at `:162`. A maintainer reading the name would conclude the code is
broken and "fix" a working invariant.

**Fix:** rename to something like *"KEEPS the intent when the dropped ids were never the
case's"*.

---

### [LOW] `caseCheckboxState`'s empty-case guard is unpinnable dead code, and a test claims to pin it

**Production code:** `features/demo/engine/logic/export/selection.ts:182` —
`if (caseData.locationIds.length === 0) return 'none'`
**Test:** `selection.test.ts:200-202` — *"reads none for a case with no locations — never a
ticked box over nothing"*

**Verified by mutation:** deleting line 182 leaves **7 files / 161 tests green**. The guard is
unreachable-as-a-difference: for an empty case `selectedCount` is `0` (a `reduce` over `[]`),
so `if (selectedCount === 0) return 'none'` two lines later returns the same answer on every
input. The test takes that later branch, not the guard.

**Fix:** the guard cannot be made to matter, so either delete it (and the test's claim), or
keep it and retitle the test as documenting a defensive early-out rather than a behaviour. Not
a correctness problem — logged so the branch is not mistaken for covered.

---

### [LOW] `describeExportTerminal`'s `case-map` arm ships nowhere but carries three assertions

**Production code:** `features/demo/ui/screens/exportNotices.ts:68-73`; the dispatch site is
`DemoExperience.tsx:1967-1975` (`startExportRun`'s `location-geojson | case-map` arm)
**Test:** `features/demo/ui/screens/__tests__/exportNotices.test.ts:84-91`

`requestExportFlow` is never called with `{ type: 'case-map' }` (grep: no caller); the real
Export Map runs through `exportCaseMap` at `DemoExperience.tsx:1260` instead. So the interim
copy — *"it just is not wired to this button yet. Nothing was generated."* — is unreachable in
the shipped app, and it was written before P5.4 landed **in this same PR**. Meanwhile the
`EXPORT_TYPES`-driven exhaustiveness loop at `:27-32` reads as proof that every pipeline has a
terminal treatment, which is true of the type and not of the app.

**Fix:** production decision first (delete the arm, or wire the map tab through it). Test-side,
once that is settled, either drop `:84-91` or re-point it at the live copy. Worth a note in
§74f that the seam it describes closed inside the same PR.

---

### [LOW] `locationToFeature`'s "always-present arrays" contract is unpinned

**Production code:** `features/demo/engine/logic/case-map/geojson.ts:126-128` — `scopes`,
`extractedScopes`, `arrivalDepartures`, emitted unconditionally *"because the phone's read
side treats presence as the contract"*
**Test:** `case-map/__tests__/geojson.test.ts:130` asserts only `scopes` (`toHaveLength(1)`)

**Verified by mutation:** deleting the `extractedScopes` and `arrivalDepartures` lines leaves
the case-map suites green.

Low impact — the module's own note concedes an absent key reads the same to the map's
`(p.scopes || []).length` idiom — but the stated contract is presence, on a forensic artifact.

**Fix:** one line in the existing test —
`expect(Object.keys(feature!.properties)).toEqual(expect.arrayContaining(['scopes','extractedScopes','arrivalDepartures']))`.

---

### [LOW] Two new motion branches ship untested

1. **Reduced motion on the Export Hub footer.** `features/demo/ui/screens/export/ExportHub.tsx:140,192`
   — `animation: reduce ? undefined : 'exportFooterRise 220ms …'`. `vitest.setup.ts` stubs
   `matchMedia` to `matches: false`, so **every** ExportHub test takes the animated arm and the
   `reduce` branch is never entered. The repo has precedent for overriding the stub
   (`features/demo/ui/screens/import/__tests__/PickerStage.test.tsx`,
   `ImportTerminalProgress.test.tsx`). Failure mode is a 220 ms transform for a motion-sensitive
   visitor — real, but transform-only and presence-independent by design.
2. **`slideDirection`'s dev guard.** `features/demo/ui/motion.ts:35` changed
   `id === 'map'` → `isTabView(id)` in this PR; `features/demo/ui/__tests__/motion.test.ts`
   never passes `'export'`. Reverting the change would spam
   *"view in neither CHAPTERS nor LAUNCHABLE"* on every Export-tab visit in dev, undetected —
   even though `motion.test.ts:29-40` already tests both sides of that warning for other ids.

**Fix:** one ExportHub test with `matchMedia` overridden to `matches: true` asserting the
footer carries no `animation`; two lines in `motion.test.ts` —
`expect(slideDirection('cases','export')).toBe('none')` and a no-warning assertion for it under
`NODE_ENV=development`.

---

## Healthy — probed and confirmed (recorded so a later pass does not re-derive)

| Claim | Probe | Result |
|---|---|---|
| No-op **identity** discipline (`.toBe` pins) | broke all 5 identity early-returns in `flow.ts` + `selection.ts` | **7 tests failed** — `advanceStage`, `reportProgress`, `resetExportFlow`, `toggleCaseSelection` ×2, `pruneSelection` ×2 |
| §74l — Continue resumes the **armed** case | `continueExportFlow`'s `pendingExportCaseId.current` → `exportCaseId()` | **failed** the test that names it (`export.test.tsx:367`) |
| `pruneSelection` disarms on a grown case | dropped the `kept.length === armedCase.locationIds.length` term | **2 tests failed** |
| Pipeline is genuinely timer-driven | reasoned: the first assertion after `chooseScope` requires `validating`, which a synchronous collapse blows past | discriminating |
| Fake-timer hygiene | non-silent run of all 4 timer suites | 0 `act()` warnings, 0 unhandled rejections; `export.test.tsx:67-73` and `duplicate.test.tsx:68` both restore real timers |
| `EXPORT_STEP_MS` imported from the component | by design (§74k) — the tests pin stage ORDER, not the fabricated 550 ms | correct call, not a finding |

Other strengths worth naming: the discriminated-union arms in `flow.test.ts` narrow before
asserting throughout; `validation.test.ts` covers both throw paths of
`validateLocationSubsetForPdf` including the multi-id message; `download-file.test.ts` covers
both `SaveFileOutcome` arms **and** does a real anchor/object-URL round trip;
`DemoExperience.case-map-export.test.tsx` parses the actual saved `Blob` rather than mocking
the builders; the lazy-chunk failure arm is correctly isolated into its own file per §71j; and
the engine tests use the canonical `demoCase`/`demoLocation`/`blankLocationForm` factories
rather than inline literals.

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 5 |

Behaviorally meaningful coverage: **strong on the engine, thin at the two seams the merge
reconciled**
Engine coverage gate (80% on `lib/**` + `engine/**`): **met** (enforced in CI; every exported
engine function in `export/` and `case-map/` is exercised — not re-measured)
Mock strategy: **at the IO edge** (`mapbox-gl`, `URL.createObjectURL`, `HTMLAnchorElement.click`,
the lazy chunk id; the real store is injected, never mocked; engine logic never mocked)
Factory usage: **canonical**
Setup-shim traps: **one** — `matchMedia`'s `matches: false` leaves ExportHub's reduced-motion
arm unentered (LOW)
Determinism (clock/entropy injected): **yes** — `buildCaseMapMeta` takes `generatedAt`
(§71d), no `Date.now()`/`Math.random()` in any new test

**Verdict: REVISE**

Both HIGHs are additive test work against unchanged production code: the §70i test needs its
second dispatch changed to a run-pipeline (fix shape verified failing/passing in both
directions), and the P5.2/P5.3 seam needs its other three moving parts exercised end-to-end
from the tab. The MEDIUMs are two literal-pin gaps (`EXPORT_ALERTS` copy; the case-map
template's body).
