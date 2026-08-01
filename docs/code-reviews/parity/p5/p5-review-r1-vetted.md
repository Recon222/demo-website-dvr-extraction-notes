# P5 review — round 1, VETTED

**PR:** #34 `master..feat/parity-p5` — Export surfaces (P5.1 engine · P5.2 tab · P5.3 modals+flow · P5.4 case-map+download)
**Aggregator:** review-aggregator (Fable) · worktree `scratchpad/worktrees/parity-p5` @ `7b90aea`
**Inputs:** five lane files (`lane-typescript` APPROVE-w-comments · `lane-web` REVISE · `lane-tests` REVISE · `lane-silent-failures` REVISE · `lane-type-design` REVISE) · PR #34 body incl. the CORRECTION section · `docs/code-reviews/deferred.md` §§70–74.

## Verdict: **REVISE** — 0 blocker · 8 major · 20 minor (28 findings, deduped from 39 raw)

**Blocker ruling (on the merits): none.** The two strongest candidates — R-1 (a real downloaded
artifact silently missing the visitor's un-plotted locations) and R-2 (success reported for a
download the browser may have dropped) — concern the visitor's own in-session play data on a
marketing demo, the map itself is honest about what it contains, and both fixes are counts + copy.
Nothing corrupts state, crashes, or fakes data in the happy path. Majors, fixed before merge per
the normal fix-round discipline; no emergency stop.

**Severity vocabulary normalized** to blocker / major / minor (lane CRITICAL→blocker, HIGH and
promoted MEDIUMs→major, MED/LOW/minor/nit→minor). Within the minors, R-9…R-14 are the
fix-first end; R-25…R-28 are batchable polish.

## Empirical adjudication (all probes run against `7b90aea`, tree returned clean — `git status` empty)

| Probe | Claim under test | Result |
|---|---|---|
| Delete `DemoExperience.tsx:2041` (§70i guard), full suite | tests HIGH-1: guard deletable, suite green | **CONFIRMED** — 237 files / 2839 tests green |
| Fix shape: test line 355 `chooseScope('case')`→`('location')` | discriminates in both directions | **CONFIRMED** — 1 failed/17 passed with guard deleted; 18 passed with guard restored |
| `:669` subset arm → dispatch `{type:'case'}`, full suite | tests HIGH-2 mutation (a): seam mutable green | **CONFIRMED** — 2839 tests green under a scope-escalating mutation |
| 1-plotted + 2-unplotted case → `buildCaseMapGeoJson`/`hasPlottableFeatures` | silent-failures HIGH: drop uncounted, success predicate true | **CONFIRMED** — 1 location feature of 3, dropped names absent from the payload, predicate true → zero caveats; incident-only case also suppresses the caveat |
| Location named `__CASE_META__` → `buildCaseMapHtml` | typescript M1: replace-chain corrupts both JSON payloads | **CONFIRMED** — real meta placeholder survives unreplaced; geojson tag fails `JSON.parse` |

Tests HIGH-2 mutations (b) `locationId: null` and (c) `isExporting={false}` accepted on the lane's
recorded runs (same method, same probe class as (a), which reproduced exactly).

**Shared-worktree warnings in three lane files are discharged:** the mid-review dirty state was the
tests lane's own in-flight mutation probes; the tree is clean at `7b90aea` and every probe above was
run from and returned to clean.

**Settled, not re-adjudicated:** the case-map flow-arm overclaim (PR body CORRECTION — the arm is
NOT wired; three lanes caught it; wiring is expected fix-round work). It appears below only as the
carried copy/type debt (R-14).

---

## Findings — majors

### R-1 — MAJOR — the Case Map download reports unqualified success while silently omitting every un-plotted location

**Where:** `features/demo/engine/logic/case-map/geojson.ts:104-106,219-222,239-241` ·
`features/demo/ui/DemoExperience.tsx:295-298,1299-1306`
**Lanes:** silent-failures HIGH (typescript corroborates the artifact family). **Probe-verified.**
**Scenario:** the demo's *normal* mixed state — locations typed rather than picked (tokenless
autocomplete, no-match geocode) have no `gps`; `locationToFeature` drops them `null`, uncounted,
unflagged, no dev-warn. Banner reads exactly `Success — Case Map exported successfully.` The
visitor walks away with the one artifact this PR makes real, missing two-thirds of their case,
told nothing. Second half: `hasPlottableFeatures` counts the **incident** feature, so the "No
location has coordinates yet…" caveat is suppressed the moment the case has incident coordinates —
even at zero plotted locations — and the shipped test (`DemoExperience.case-map-export.test.tsx:124-133`)
pins the silence. This is the repo's own bar (`generateExtractedScopes`: skip, **count**, **flag**,
dev-warn) and P5.4's own doc-comment commitment ("anything true about it that they cannot see from
the banner has to be on the banner").
**Fix shape:** `buildCaseMapGeoJson` (or a sibling) returns dropped counts; add the third banner
clause (`N of M locations have no coordinates yet and are not on the map.`); re-gate the empty-map
caveat on *location* features (keep `hasPlottableFeatures` for its §71g purpose); dev-warn per the
`generateExtractedScopes` shape; update the incident-only pin to assert the new clause.
**Owner:** P5.4.

### R-2 — MAJOR — the one genuinely-real export reports success from "the click didn't throw"

**Where:** `features/demo/ui/inputs/download-file.ts:99-108` (also `:48-61`) ·
`features/demo/ui/DemoExperience.tsx:1294-1306`
**Lanes:** web HIGH + silent-failures MEDIUM — same defect, merged; severity settled **major**
(it is the one real artifact; deferred §70d's own trigger — "evaluate then, against a real
failure" — has now fired, and both lanes agree the failure class is real and undetectable).
**Scenario:** `HTMLAnchorElement.click()` is fire-and-forget in every browser; a suppressed
download throws nothing. Chrome's automatic-download blocking (which R-8's double-press makes easy
to trip), a blocking extension, a hardened/enterprise or private profile, or transient user
activation expiring during the ~22 kB chunk fetch — all return normally, `saveTextFile` returns
`{ ok: true }`, and the banner prints `Success — Case Map exported successfully.` over an empty
Downloads folder. The module's own doc claims `failed` covers "it can, and the attempt did not
work", but `failed` is reachable only through a throw, so the largest real-world failure class
lands in `ok: true`.
**Fix shape:** detection is impossible, so the copy must stop claiming — change the success string
from a completion claim to a request claim (e.g. `Case Map ready — your browser was asked to save
<filename>. Check your downloads.`), keep the two existing caveats (plus R-1's third). Optionally
rename `SaveFileOutcome.ok` → `requested` so the type stops implying a verified write. No save-path
code change is needed or possible.
**Owner:** P5.4.

### R-3 — MAJOR — the seam join consumes `ExportSelectionPlan.dispatch` with a trailing `else`; widening the union compiles silently into a subset ZIP (+3 sibling non-exhaustive sites)

**Where (primary):** `features/demo/ui/DemoExperience.tsx:661-671` (`onExportPress`), over
`selection.ts:211`. **Siblings:** `DemoExperience.tsx:1899-1918` (`pdfPassFor` trailing
`return []`) · `ExportActionSheet.tsx:59-79` (`OptionIcon`, no `default`) ·
`ExportCaseCard.tsx:84-86` (`ariaChecked` ternary — a 4th `CaseCheckboxState` reads
`aria-checked={false}`).
**Lanes:** type-design MAJOR + typescript MEDIUM (same family) + silent-failures LOW
(`pdfPassFor`) — one defect species, four sites, merged. Probe-verified by the type-design lane:
adding a fourth `dispatch` member compiles with zero errors and falls into the `case-subset` arm.
**Scenario:** the one site the engine's invariant is *about* ("the CTA must NOT re-derive the
branch"; "the route cannot dispatch a subset ZIP under a footer promising the canonical case
artifact") is the only union consumer in the diff without an `assertNever` closure — six other
consumers close correctly. A realistic widening (§71g's whole-case GeoJSON footer button) would
render the new pipeline's footer copy and ship a subset ZIP. `pdfPassFor`'s residual arm runs a
zero-PDF pipeline instead of failing; `OptionIcon` renders nothing; `ariaChecked` lies to a screen
reader.
**Fix shape:** `switch` + `default: return assertNever(dispatch)` at all four sites; type the field
`Extract<ExportType, 'case' | 'location' | 'case-subset'>` per `flow.ts:65`'s own
`ValidatedExportType` discipline (no import cycle — verified by the lane).
**Owner:** ORCHESTRATOR-SEAM for `onExportPress` (the merge-commit join); siblings land with
P5.3 (`pdfPassFor`, `OptionIcon`) and P5.2 (`ariaChecked`) — one commit is fine if entangled.

### R-4 — MAJOR — the P5.2/P5.3 seam is pinned for 1 of its 4 moving parts; three scope-changing mutations run full-suite green

**Where:** `features/demo/ui/__tests__/DemoExperience.export-tab.test.tsx:178-190` (the seam
describe block — exactly one test, `case` arm only, stops at the validation prompt), against
`DemoExperience.tsx:661-671` and `:2413` (`isExporting={isExportInFlight(exportFlow)}`).
**Lanes:** tests HIGH-2. **Probe-verified** (mutation (a) re-run here: subset arm dispatching the
whole case — the exact §74l scope escalation, reachable in two clicks — is full-suite green;
(b)/(c) accepted on the lane's runs).
**Scenario:** the PR body calls the seam "closed exactly per both agents' documented contracts";
the only test in the seam block cannot distinguish a correctly-keyed dispatch from a hardcoded
`'case'`. A dead single-location CTA (mutation b) and a reverted disabled-during-run treatment
(mutation c) are also invisible.
**Fix shape (lane's, adopted):** three end-to-end tests in `DemoExperience.export-tab.test.tsx` —
*subset* (tick 2 of 3 exportable, assert `Location 1 of 2`, the two ticked names, not the third,
terminal `a ZIP of the 2 selected locations`), *single* (terminal `a ZIP of this location`, not
`whole case`), *isExporting* (during a run: case checkbox, rows, CTA disabled; Clear not). Lift
`addExportableLocation` from `DemoExperience.export.test.tsx:20-30` into a shared local; adopt its
fake-timer pair.
**Owner:** ORCHESTRATOR-SEAM (the seam test is merge-reconciliation work); executes naturally in
P5.2's suite file — pair it with R-3's `onExportPress` fix so the tests pin the new switch.

### R-5 — MAJOR — the §70i strengthening — the PR's headline hardening — is not pinned by the test that names it

**Where:** `features/demo/ui/__tests__/DemoExperience.export.test.tsx:340-365` against
`DemoExperience.tsx:2041`.
**Lanes:** tests HIGH-1. **Probe-verified both directions here** (guard deleted → 2839 green;
lane's fix applied → discriminates exactly).
**Scenario:** the test's second dispatch re-enters the *validated* pipeline, whose unguarded
behaviour is byte-identical to the guarded one — every assertion passes with the guard deleted.
The guard's real job (per §74b: the demo's rail can move the visitor while the prompt is up) is
refusing a **run**-arm dispatch; delete the guard in a refactor and a location ZIP runs to
completion behind an open validation prompt, surfacing as a terminal dialog stacked on an
unanswered question.
**Fix shape (verified):** change the second dispatch at `:355` to `chooseScope('location')`; the
existing "no terminal notice" assertion becomes the discriminating one. Recommended second arm:
arm case A's prompt, dispatch case B from the tab, Continue, assert `generating` names case A's
location (covers the re-arm half / §74l's other door).
**Owner:** P5.3 (the guard and the flow suite are P5.3 territory).

### R-6 — MAJOR — the export progress overlay is silent to assistive tech: `role="progressbar"` prunes its own content and the live region ships pre-populated

**Where:** `features/demo/ui/screens/ExportModal.tsx:93-135`.
**Lanes:** web HIGH.
**Scenario:** `progressbar` is a presentational-children role — the stage line, `Location 2 of 3`,
and the location name are pruned from the accessibility tree; and `aria-live="polite"` sits on a
node that mounts with content already in place, thereafter changing only an *attribute*. A
screen-reader user presses the tab's primary CTA (which immediately disables, dropping focus to
`<body>`) and hears silence for the full ~2.2 s run. WCAG 2.2 4.1.3 (AA). The file documents and
obeys the correct rule 40 lines later (`:166-171`, ValidationContent's next-tick sr-only region);
the existing test pins only attribute shape, which is why this is green.
**Fix shape:** sibling sr-only `role="status" aria-live="polite"` fed from a `useEffect` on the
composed `[stageMessage, progressLabel, locationLabel]` string (the in-file pattern); give the
progressbar `aria-valuemin/max/now` or `aria-valuetext`.
**Owner:** P5.3.

### R-7 — MAJOR — `ExportActionSheet` has no focus management, and its promised arrow-key traversal is unreachable from the state it opens in

**Where:** `features/demo/ui/screens/ExportActionSheet.tsx:97-134`; opener at
`CompletionScreen.tsx:120-129`; test gap at `__tests__/ExportActionSheet.test.tsx:114-118`.
**Lanes:** web HIGH.
**Scenario:** the sheet mounts with no focus move in and no restore on close; the opener button
stays focused behind the scrim, and Tab walks the whole obscured Completion form + tab bar before
reaching the menu — verbatim the harm R-8 (repo precedent) fixed once and documented in
`MediaLibrarySheet.tsx:323-335`. The `role="menu"` container's `onKeyDown` never fires on the
primary path (keydown dispatches at `document.activeElement`, still outside the portal); the test
fires the event directly on the container, which a browser never does. Escape works, so not a
trap — a friction/announcement failure. The two-effect idiom exists in four components including
this PR's own `ExportModal.tsx:181-187`; this is the only new P5 overlay without it.
**Fix shape:** AlertDialog's two-effect block + `tabIndex={-1}` on the menu container (focus on
mount, restore to opener on unmount, `isConnected`-guarded); re-point the keyboard test to focus a
menuitem first so it pins reachability.
**Owner:** P5.3.

### R-8 — MAJOR (promoted from 2× MEDIUM + LOW) — the Export Map handler has no re-entry guard, its click is separated from the gesture by a network fetch, and its rejection guard covers only the import

**Where:** `features/demo/ui/DemoExperience.tsx:1260-1308` ·
`features/demo/ui/screens/map/LocationList.tsx:36-56` (footer button — no `disabled`, no spinner).
**Lanes:** silent-failures MEDIUM (re-entry) + web MEDIUM (activation/pending) + typescript LOW
(catch width) — one handler, one defect cluster, merged; promoted on convergence + reachability:
this is the one export entry point that bypasses `requestExportFlow`, so §74b's guard does not
cover it, and the phone gates the same action (`useExportFlow.ts:915`).
**Scenario:** first press → nothing visible while the 22.4 kB gzip chunk fetches → visitor presses
again → N presses produce N builds/clicks (verified by the SF lane: three presses, three
downloads, three Success notices — identical strings, so React elides the repeat notify). Second+
downloads trip Chrome's multiple-download blocking → silently dropped → each still reports Success
(R-2). Separately, transient user activation (~5 s) can expire during a slow first fetch, making
the *first* click an un-activated programmatic download. And everything after the `await import`
(`buildCaseMapGeoJson`/`buildCaseMapHtml`/`saveTextFile`) runs outside any handler on a `void`-ed
promise.
**Fix shape:** in-flight ref set before the IIFE, cleared in `finally`, threaded as
`disabled`+spinner through `MapScreen`/`MapBottomSheet`/`LocationList` (props already forwarded;
spinner precedent ×4 in repo); widen the `try` (or `.catch()` the promise) to the whole IIFE with
`CASE_MAP_EXPORT_FAILED_NOTICE`; optionally prefetch the chunk on list-mode mount or
`onPointerEnter`/`onFocus` so the click is synchronous with the gesture. Note: R-14's option 1
(route this handler through the flow) would retire the guard gap structurally — coordinate before
fixing twice.
**Owner:** P5.4.

---

## Findings — minors

### R-9 — minor — the real export's failure outcomes go to the 2.6 s auto-dismissing banner; every fake pipeline gets the blocking dialog

`DemoExperience.tsx:1269,1281,1299-1306` · `DemoNotification.tsx:47`. Lanes: silent-failures
MEDIUM. The chunk-failure and save-failure arms — failures about a **real file** — land on the
self-dismissing banner at an unpredictable moment (after a network wait), while every simulated
ZIP terminal correctly blocks (§74a: "the one honest sentence must not time out unread" — an
inversion of D4's own rule). Fix: route the two `Export Error` arms through `raiseExportAlert`;
success may stay on the banner. Owner: P5.4.
*Kept separate from R-2/R-8 deliberately: three different fix loci (copy string / handler guard /
alert routing) = three granular commits mapping cleanly to findings, per the repo's fix-commit
convention. One mega-finding would blur the commit→finding table.*

### R-10 — minor — `buildCaseMapHtml`'s sequential `.replace()` chain lets visitor-typed data corrupt the exported map, silently

`build.ts:88-97`. Lanes: typescript MEDIUM. **Probe-verified here**: a location named
`__CASE_META__` leaves the real meta placeholder unreplaced and both JSON payloads unparseable →
the template's bare `catch {}` renders a blank map under a Success banner — the exact failure
`encodeJsonForScriptTag` exists to prevent for `</script>`. Adversarial-input-only (hence minor),
five-line fix: single-pass regex `/__(?:CASE_GEOJSON|CASE_META|CASE_TITLE|MAPBOX_TOKEN)__/g` over
a lookup record. Phone shares the shape — back-port candidate alongside §71b. Owner: P5.4.

### R-11 — minor — the 85 kB case-map artifact is validated only at its four injection points; a truncation destroying the entire map runtime is suite-green

`case-map/__tests__/build.test.ts:33-52` · `DemoExperience.case-map-export.test.tsx:82-114`.
Lanes: tests MEDIUM (mutation-verified by the lane: `.slice(0, 45000)` green across 39 tests).
The port tool's guards check the same four tokens — tool and tests share the blind spot, so a bad
regeneration ships silently. Fix: structural pins on `CASE_MAP_TEMPLATE_HTML`
(`endsWith('</html>')`, contains the Mapbox GL CDN ref and `loadCase`, length floor ≥ 80 000);
correct the UI test's "app JS is inlined" comment (its assertion only proves no relative asset).
Owner: P5.4.

### R-12 — minor — 5 of 6 verbatim-ported `EXPORT_ALERTS` contract strings are pinned only against themselves; `noSelection` has no production caller

`flow.ts:110-142` · `flow.test.ts`. Lanes: tests MEDIUM (mutation-verified: `MUTANT-COPY-*`
messages green). Matrix row 28 makes these contract strings and §70g claims "every other string is
verbatim" — undefended. Fix: one literal `expect(EXPORT_ALERTS).toEqual({...})` mirroring the
`STAGE_MESSAGES` block (`stage.test.ts:37-43`). `noSelection`'s dead-consumer half is resolved by
R-13 (which wires it); do them together. Owner: P5.1.

### R-13 — minor — `onExportPress`'s backstop is a silent `return`, stranding the ported `EXPORT_ALERTS.noSelection` dead; the phone's counterpart is deliberately loud

`DemoExperience.tsx:661-662` · `flow.ts:126-130`. Lanes: typescript MEDIUM. The phone's PR-90/89
doctrine is in the demo's own `flow.ts` verbatim ("a silent return reads as success"), and P5.1
ported both backstop strings — the CTA seam consumed `caseUnavailable` and chose the silent shape
over `noSelection`. Unreachable today; one refactor away (footer/handler read the same
render-scope pair, but `armedExportCase` is a `find(...) ?? null` on a list this component doesn't
own). Fix: `if (!exportView) { raiseExportAlert(EXPORT_ALERTS.noSelection); return }` /
`if (!exportFooter) { raiseExportAlert(EXPORT_ALERTS.caseUnavailable); return }`. Owner:
ORCHESTRATOR-SEAM (same handler as R-3 — land together).

### R-14 — minor — the flow's `case-map` arm: a union member with no constructor keeping now-false interim copy alive; §74f's trigger fired at merge and was not discharged

`exportNotices.ts:67-73` · `DemoExperience.tsx:1967-1975` (`SEAM(P5.4)` marker) · `flow.ts:56,77,88`
· `exportNotices.test.ts:84-91`. Lanes: typescript LOW + web LOW + silent-failures LOW + tests LOW
+ type-design MINOR — five statements of one debt, merged (type-design's is the fullest). Settled
context: the PR CORRECTION already concedes the arm is unwired and unreachable; the interim copy
("is being built; it just is not wired to this button yet") is dead today and a lie waiting for
its first caller. Secondary drift: `EXPORT_ALERTS.noCaseSelectedForMap` (unreachable) and
`NO_CASE_SELECTED_NOTICE` (live) are two hand-maintained copies of one phone string. Fix — decide,
don't leave: **(1)** route `exportCaseMap` through
`requestExportFlow({ type: 'case-map', caseId })` — gains the entry guard (retires R-8's gap
structurally), collapses the duplicate alert, needs a success terminal for the arm; this is what
§74f pointed at. **(2)** delete the variant + its alert + arm + test, re-add with a real caller
(the module's own orphan-barrel rule). Either way the false sentence and its pinning test go in
the same commit, and §74f gets a closing note. Owner: P5.3 (flow shell) with P5.4's builder
contract if option 1 — orchestrator picks the option first, since it interacts with R-8/R-9.

### R-15 — minor — the validation arm is decomposed into two engine fields plus a shell `useRef`, hand-reassembled; `ValidatedExportRun` already pairs all three

`flow.ts:162,164` (`pendingValidatedExport` + `pendingSubsetLocationIds`) ·
`DemoExperience.tsx:764` (`pendingExportCaseId`). Lanes: type-design MINOR. §74l's own near-miss
(first draft re-derived the case at Continue → scope escalation) is the evidence the incomplete
arm invites caller mistakes. Fix: `pendingValidatedRun: ValidatedExportRun | null` — deletes the
second field, the reassembly, the `missingSubsetPayload` state (keep the boundary alert), and the
bridge ref + both assignments. Sizeable blast radius; **a recorded deferral with trigger is an
acceptable outcome** — but it must be recorded in the ledger, not left silent. Owner: P5.1 (engine
shape) + P5.3 (shell), or ledger entry.

### R-16 — minor — `DEMO_EXPORT_STAGES` constrains nothing; `advanceStage(state, 'sharing')` compiles and would print "Opening share dialog…" in a browser

`stage.ts:40-41` · `flow.ts:400`. Lanes: type-design MINOR (probe-verified compile). §70l's stated
purpose ("something to assert against rather than a comment") is unmet — `DemoExportStage` has
zero uses and the exclusion lives in a comment at `DemoExperience.tsx:1931`. Fix is one word:
`advanceStage(state: ExportFlowState, stage: DemoExportStage)` — all seven call sites already
conform. Owner: P5.1.

### R-17 — minor — the prompt-visibility pair is modelled flat in both layers; `{ mode: 'validation', validationResult: null }` renders an invisible modal

`ExportModal.tsx:38-44,339-341` · `flow.ts:154-156`. Lanes: type-design MINOR. Unreachable via the
single caller today; the component's own comment admits the cope. Fix (props layer, cheap):
discriminate `ExportModalProps` on `mode` with `validationResult` required on the `validation`
arm. The `ExportFlowState` half is the phone's ported shape — if it stays flat, ledger it. Owner:
P5.3.

### R-18 — minor — new infinite spinner not gated on `prefers-reduced-motion`, against four in-repo precedents and this PR's own `ExportHub` gating

`ExportModal.tsx:110-121`. Lanes: web MEDIUM (normalized minor: convention inconsistency inside
the diff, JS-gated by feature contract). Fix: `useReducedMotion()` in `ProgressContent`,
`animation: reduce ? undefined : 'spin 0.9s linear infinite'`. (`SyncStatusCard.tsx:59` is the one
pre-existing ungated spin — same fix round if convenient, not this PR's debt.) Owner: P5.3.

### R-19 — minor — the tab bar signals the active tab by colour alone, now across four destinations

`TabBar.tsx:83-87`. Lanes: web MEDIUM (normalized minor: pre-existing shape extended, one-line
fix). No `aria-current`/`aria-selected`/`role="tab"` — hue-only cue (WCAG 1.4.1, 4.1.2); the
phone does not share the gap (React Navigation sets `aria-selected`). Fix: `aria-current={active
=== id ? 'page' : undefined}` inside the `TAB_VIEWS.map()` (or `aria-pressed` per §67c's ruling —
pick one, use it for both surfaces). Owner: P5.2.

### R-20 — minor — `showTabs` is dead AND stale — it encodes the pre-P5 three-tab rule one line above its registry-derived replacement

`DemoExperience.tsx:2126`. Lanes: typescript LOW + web LOW + type-design NIT — merged. No reader
(grep: declaration only), no `noUnusedLocals`, no ESLint config to ever catch it; reusing it hides
the tab bar on Export. Fix: delete the line. Owner: P5.2.

### R-21 — minor — the deferred object-URL revoke is `setTimeout(fn, 0)` — the same race the module documents, with a one-task fuse

`download-file.ts:62-64,106-108`. Lanes: silent-failures LOW. The interface doc names same-tick
revoke as download-cancelling; next-macrotask is the same race narrower, and a mis-timed revoke is
a silently-lost download already reported `ok: true` (R-2). Ecosystem answer (FileSaver.js) is
tens of seconds. Fix: widen the delay (e.g. 40 s) or sweep on `pagehide`; the registry already
makes either safe. Owner: P5.4.

### R-22 — minor — `runExportValidation`'s catch has no operator breadcrumb, and a non-`Error` throw renders `[object Object]` as the dialog body

`DemoExperience.tsx:2012-2019`. Lanes: silent-failures LOW. The one export catch without the
repo's console breadcrumb (phone logs first; this PR's own `download-file.ts:104` and
`DemoExperience.tsx:1280` do too). Fix: `console.warn('[demo/export] validation threw — no export
was started:', e)` in the catch. Owner: P5.3.

### R-23 — minor — two new motion branches ship untested: ExportHub's reduced-motion arm is never entered (setup stub pins `matches: false`) and `slideDirection`'s widened dev guard has no `'export'` case

`ExportHub.tsx:140,192` · `motion.ts:35` · `motion.test.ts`. Lanes: tests LOW. Fix: one ExportHub
test overriding `matchMedia` to `matches: true` (PickerStage precedent) asserting no `animation`;
two lines in `motion.test.ts` (`slideDirection('cases','export') === 'none'` + no-warning under
dev). Owner: P5.2.

### R-24 — minor — `locationToFeature`'s "always-present arrays" contract is unpinned (deleting two of the three emissions stays green)

`geojson.ts:126-128` · `geojson.test.ts:130`. Lanes: tests LOW (mutation-verified by the lane).
Stated contract is presence, on a forensic-style artifact. Fix: one
`expect(Object.keys(feature!.properties)).toEqual(expect.arrayContaining(['scopes','extractedScopes','arrivalDepartures']))`.
Owner: P5.4.

### R-25 — minor — `selection.test.ts:155` is named for the opposite of what it correctly asserts

Lanes: tests LOW. The assertion (`armedFullCase` kept when survivors still cover the case) is
right; the name says "DISARMS". A maintainer trusting the name "fixes" a working invariant. Fix:
rename (e.g. "KEEPS the intent when the dropped ids were never the case's"). Owner: P5.1.

### R-26 — minor — `caseCheckboxState`'s empty-case guard is unpinnable dead code and a test claims to pin it

`selection.ts:182` · `selection.test.ts:200-202`. Lanes: tests LOW (mutation-verified by the
lane: the later `selectedCount === 0` branch returns the same answer on every input). Fix: delete
the guard (and the test's claim) or retitle the test as documenting a defensive early-out. Owner:
P5.1.

### R-27 — minor — `TAB_NARRATION` is `Partial<Record<AppView, …>>` where the exact total key-space type exists one file away in the same diff

`narration.ts:356`. Lanes: type-design NIT. Both failure halves (chapter-key shadowing; missing
tab copy) are pinned by a good test — §27's accepted test-over-type precedent — but the diff
*creates* this registry and its two siblings chose total records; `Record<Exclude<AppView,
ChapterId | LaunchableId>, ChapterNarration>` (the `EXTRA_VIEWS` device) closes both by
construction and discharges §4's direction. Owner: P5.2.

### R-28 — minor — `featureType` is an untyped id space: three writers, one reader, `Record<string, unknown>`

`case-map/types.ts:17-21` · `geojson.ts:69,110,183,240`. Lanes: type-design NIT. A writer typo
surfaces as `hasPlottableFeatures` mis-answering → the wrong success banner (R-1's machinery).
Fix (additive, keeps the bag open): `properties: { featureType: FeatureType } & Record<string,
unknown>` with a `FEATURE_TYPES` const. Owner: P5.4.

---

## Struck / not carried — with reasons

**No lane finding was struck as wrong.** All four empirically-probed claims reproduced exactly as
filed; no conflict required overruling a lane on the facts. Dispositions short of carrying:

| Item | Disposition |
|---|---|
| The case-map flow-arm **overclaim** (original PR body) | **Settled by the PR CORRECTION** before this pass — per orchestrator instruction, not re-adjudicated. Only the residual copy/type debt is carried (R-14). |
| Three lanes' **shared-worktree dirty-state warnings** (typescript gate note, silent-failures note, type-design note) | **Discharged** — operational hazards, not findings; the mutations were the tests lane's probes; tree verified clean at `7b90aea` before and after this aggregation's own probes. |
| Web lane's `__MAPBOX_TOKEN__`-raw-into-JS observation, and silent-failures' matching note (a `'` in the env token → blank map) | **Not carried as a finding** — both lanes themselves declined to file it (operator-controlled env, phone-identical); recorded in their "checked and clear" sections; fold into R-10's single-pass fix if convenient. |
| Silent-failures' `noCaseSelectedForMap`/`NO_CASE_SELECTED_NOTICE` duplication | Not a separate finding — absorbed into R-14 (it is that decision's secondary drift). |
| Tests lane's `EXPORT_STEP_MS`-imported-from-component observation, and every item on the PR's DO-NOT-RE-FLAG list (§§70a, 70c, 70l, 71a, 73a, 73g, 74a, 74d, 74e, 74j, 74k, 74l, inline `CSSProperties`) | Honoured by all five lanes; verified not re-filed here. |

Severity conflicts settled: **R-2** (web HIGH vs silent-failures MEDIUM) → **major** — §70d's own
trigger fired; the one real artifact; both lanes agree on mechanism and fix. **R-8** (two MEDIUMs
+ one LOW) → **major** — promoted on convergence, phone-parity (the phone gates it), and normal
visitor reachability. **R-3** (type-design MAJOR vs typescript MEDIUM) → **major** — the
probe-verified silent-widening at the exact site the engine's invariant protects.

Download-family "one finding vs several" rationale: R-2 (impossible-detection → copy claim), R-8
(handler robustness), R-9 (failure channel), R-21 (revoke race) are one *theme* with four distinct
fix loci and four distinct tests; kept separate so fix commits map one-to-one to findings per the
repo's commit→finding convention, with cross-links where one fix (R-14 option 1) subsumes another
(R-8's guard).

---

## Owner routing (suggestion — orchestrator does final routing)

| Owner | Majors | Minors |
|---|---|---|
| **P5.1 engine** | — | R-12, R-15 (w/ P5.3; deferral acceptable), R-16, R-25, R-26 |
| **P5.2 tab** | R-3 sibling (`ariaChecked`) | R-19, R-20, R-23, R-27 |
| **P5.3 modals+flow** | R-5, R-6, R-7, R-3 siblings (`pdfPassFor`, `OptionIcon`) | R-14 (decide w/ P5.4 + orchestrator), R-15 (w/ P5.1), R-17, R-18, R-22 |
| **P5.4 case-map+download** | R-1, R-2, R-8 | R-9, R-10, R-11, R-21, R-24, R-28 |
| **ORCHESTRATOR-SEAM** (executes in P5.2's suite / the merge-join code) | R-3 (primary switch), R-4 (seam tests) | R-13 |

**Sequencing note for the orchestrator:** decide R-14's option (wire vs delete) *before* routing
R-8 and R-9 — option 1 restructures both. R-3's switch and R-4's tests should land as a pair (the
new tests pin the new switch). R-1 + R-2 share the banner copy — one agent (P5.4), two commits.
