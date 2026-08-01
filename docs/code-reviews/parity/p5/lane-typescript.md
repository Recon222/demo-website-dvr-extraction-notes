# P5 review — TypeScript lane

**PR:** #34 `master..feat/parity-p5` (P5.1 export engine · P5.2 export tab · P5.3 modals + flow shell · P5.4 case-map download)
**Worktree:** `scratchpad/worktrees/parity-p5`
**Reviewer:** typescript-reviewer (lane definition: `.claude/agents/typescript-reviewer.md`)

## Gate status

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **clean**, exit 0 (whole repo, not just the changed surface) |
| Targeted vitest (export engine, case-map, export UI, bridge export suites, download-file) | **57 files / 812 tests passed** |
| `next lint` | **unverified** — no ESLint config in the repo; `next lint` drops into its interactive setup prompt. Consistent with the lane note ("No ESLint config file in the repo"), so `noUnusedLocals`-class drift has no automated catcher. |
| Store bridge | preserved — `grep -rn useStore features/demo/ui` outside `DemoExperience.tsx`: **zero hits** |
| Engine purity | preserved — no `from 'react'`, no `'use client'`, no module-scope `window`/`document` under `features/demo/engine/**` |
| Barrel + marketing↔demo isolation | preserved — `features/demo/index.ts` and `engine/index.ts` **untouched**; `engine/logic/export` and `engine/logic/case-map` correctly kept OFF `engine/index.ts` (R-10 precedent); no `features/demo` import in `components/`, `lib/`, `app/(default)/` (the one grep hit in `components/marketing/phone-frame.tsx:7` is a pre-existing prose comment) |
| Determinism seam | preserved — **zero** `Date.now()` / `Math.random()` added anywhere in the diff; `buildCaseMapMeta(caseData, generatedAt)` takes the stamp as a parameter and the bridge supplies it from the `clock.now()` seam |
| `isolatedModules` | preserved — every type re-export in `engine/logic/export/index.ts` and `engine/logic/case-map/index.ts` uses `type` |
| `any` / `as any` | **zero** in the diff |
| `SNAPSHOT_VERSION` | untouched at 6; `EXTRA_VIEWS` / `MODAL_IDS` compile-time totality guards correctly extended for `export` / `exportScope` |

### ⚠ Worktree hygiene note (not a finding — an operational hazard)

At the end of this review `git status` in the shared worktree showed an **uncommitted mutation in `features/demo/ui/DemoExperience.tsx`** that this lane did not make (this lane is read-only and wrote only this file):

```
-      requestExportFlow({ type: 'location', locationId: Array.from(exportView.locationIds)[0] ?? null })
+      requestExportFlow({ type: 'location', locationId: null })
-      requestExportFlow({ type: 'case-subset', caseId: exportView.caseId, locationIds: Array.from(exportView.locationIds) })
+      requestExportFlow({ type: 'case', caseId: exportView.caseId })
```

That is the signature of a **concurrent lane running a mutation probe** against `onExportPress` (both edits break the dispatch mapping in exactly the way a coverage check would). It was stable for several minutes without being reverted. This lane deliberately did **not** restore it, to avoid corrupting an in-flight measurement — but the orchestrator must confirm the worktree is clean (`git checkout -- features/demo/ui/DemoExperience.tsx`) before any commit. **All findings and gate results below were produced against the pristine `HEAD` content, before this mutation appeared.**

### Context honoured (not re-flagged)

Read before writing anything: PR #34 body's deliberate-choices section, `docs/code-reviews/deferred.md` §§70–74, `features/demo/CLAUDE.md`. The following are **decisions, verified at source, and deliberately absent from the findings below**: ephemeral selection + flow state (§70a/§73d), the blocking D4 terminal instead of a toast (§74a), no PasswordModal / no `sharing` stage (§70c/§70l/§74e), the shell-level `showValidationModal` guard rather than an engine one (§70i→§74b), PDF pass re-derived from the store (§74d), no media in the case map (§71a), no loading/error/pagination on the hub (§73a), `EXPORT_STEP_MS = 550` (§74k), Clear not gated on a run (§73g), the flow following the visitor across screens (§74j), the `pendingExportCaseId` third arm (§74l), inline `CSSProperties` in `ui/**`, and the two phone defects fixed demo-side in the port tooling (§71b/§71c).

---

## Verification highlights (things I checked and found correct)

Recorded because several are exactly where a port like this usually breaks.

- **The transition machines are sound.** I traced every reachable state path through `requestExport` → `applyValidation`/`failValidation` → `continueValidatedExport`/`cancelValidation` → `advanceStage`/`reportProgress`/`resetExportFlow`. The arm/consume invariants hold: no path reaches `requestExport` with a stale `pendingValidatedExport` or `showValidationModal` still set (the shell guard at `DemoExperience.tsx:2041` closes the one window the engine leaves open, and `cancelValidation` / `consumed` clear every arm on both exits). `pruneSelection`'s reference-identity early return is correct in both directions, including the "case gained a location while armed full-case" case, which correctly demotes `armedFullCase` and rebuilds the object.
- **§70j's contract is met.** `startExportRun` (`:1987`) flips to `'validating'` synchronously before `runZipPipeline`, and `setExportFlow` writes `exportFlowRef.current` **before** `setExportFlowState`, so a second press in the next event tick reads the live stage and is ignored by the engine's entry guard. `location-geojson` / `case-map` terminate inside the same handler with no gap.
- **Timer lifecycle is correct.** `exportTimer` is cleared on re-entry (`:1938`), nulled at the terminal (`:1952`), and cleared on unmount (`:767-769`). No path leaves two pipelines ticking into one piece of state.
- **The ref+state mirror cannot desynchronise** — `setExportFlow` is the only writer of both and writes them in one call (`:747-750`).
- **`onExportPress` holds the one-decision rule**: it reads `exportFooter.plan.dispatch` — the same `ExportSelectionPlan` object that rendered the footer copy — and never re-derives the full-case/single/subset branch. Verified against the phone's `export.tsx:157-165`, including that the single-location arm sends the *ticked* location (phone: `singleSelectedLocationId` fed into `useExportFlow`, `export.tsx:74-76`), not the open one.
- **Barrel discipline is genuinely load-bearing here**: `engine/logic/case-map` is reached *only* by `await import(...)` at `DemoExperience.tsx:1275` — no static importer anywhere in `features/`, `app/`, `components/`, `lib/`. The 85 KB template cannot leak into the First Load graph.
- **`port-case-map-template.mjs` is a correct build tool**: it asserts the three phone tokens exist before mutating, refuses a real `pk.` token, asserts the sample-data strip actually removed the tag (the assertion whose *absence* is phone defect §71b.1), asserts exactly one `<title>`, and re-asserts every token appears exactly once after both deltas. It fails loudly (`process.exit(1)`) with a message. Output is `JSON.stringify`-encoded so CRLF survives byte-for-byte.
- **No XSS.** `escapeHtml` guards the only HTML-context interpolation (`build.ts:95`); `encodeJsonForScriptTag` escapes `<` in both `application/json` bodies, which is a hardening the phone lacks. The raw-injected `__MAPBOX_TOKEN__` value comes only from `process.env`, never from visitor input.

---

## Findings

### [MEDIUM] M1 — `buildCaseMapHtml`'s sequential `.replace()` chain lets visitor-typed data corrupt the exported map, silently

**File:** `features/demo/engine/logic/case-map/build.ts:88-97`

```ts
return CASE_MAP_TEMPLATE_HTML.replace('__CASE_GEOJSON__', () => encodeJsonForScriptTag(geojson))
  .replace('__CASE_META__', () => encodeJsonForScriptTag(meta))
  .replace('__CASE_TITLE__', () => escapeHtml(caseMapTitle(meta)))
  .replace('__MAPBOX_TOKEN__', () => mapboxToken)
```

**Issue:** each `.replace()` runs over the string the *previous* one produced, so a token literal that arrives inside the injected GeoJSON is a live substitution target. Token offsets in the ported template are `__CASE_TITLE__` @166, `__CASE_GEOJSON__` @30524, `__CASE_META__` @30599, `__MAPBOX_TOKEN__` @36547 — so anything the visitor types that equals `__CASE_META__` or `__MAPBOX_TOKEN__` lands *before* the real placeholder and wins the first-occurrence match. The result is a downloaded evidence artifact whose two `application/json` payloads are both malformed; `case-map.app.js:109` swallows the `JSON.parse` failure in a bare `catch {}` and renders an **empty map with no error anywhere** — which is precisely the failure mode `encodeJsonForScriptTag` was added to prevent for the sibling `</script>` case (see the module's own note at `build.ts:49-61` and §71c.3).

**Evidence:** reproduced against the shipped template with a location named `__CASE_META__`:

```
geojson tag → {"…","properties":{"locationName":"{"caseNumber":"OCC-1","displayName":"X",…}"}}]}
meta tag    → <script type="application/json" id="case-meta">__CASE_META__</script>
```

Both blobs are broken; the real `__CASE_META__` placeholder survives unreplaced. Not an XSS (the `<` escape holds and the token-slot value is env-derived), and adversarial input only — but the module's stated bar is that a silently blank exported map is unacceptable, and the port script's own `must be exactly 1` assertion is a template-time guarantee that this chain does not preserve at inject time. The phone shares the shape (`case-map-export-service.ts:142-145`), so this is also a back-port candidate alongside §71b.

**Fix:** one pass, one lookup — no injected value can then be re-scanned:

```ts
const values: Record<string, string> = {
  __CASE_GEOJSON__: encodeJsonForScriptTag(geojson),
  __CASE_META__: encodeJsonForScriptTag(meta),
  __CASE_TITLE__: escapeHtml(caseMapTitle(meta)),
  __MAPBOX_TOKEN__: mapboxToken,
}
return CASE_MAP_TEMPLATE_HTML.replace(
  /__(?:CASE_GEOJSON|CASE_META|CASE_TITLE|MAPBOX_TOKEN)__/g,
  (t) => values[t],
)
```

---

### [MEDIUM] M2 — the Export tab CTA's backstop is a silent `return`, and it strands `EXPORT_ALERTS.noSelection` as a dead export

**File:** `features/demo/ui/DemoExperience.tsx:661-662` · `features/demo/engine/logic/export/flow.ts:126-130`

```ts
const onExportPress = () => {
  if (!exportFooter || !exportView) return
```

**Issue:** the phone's counterpart is deliberately loud, and says why in source:

> `app/(tabs)/export.tsx:124-152` — *"LOUD backstops (PR-90 LOW, the PR-89 precedent): unreachable today — the footer gates the CTA on the same selection + armedCase — but that property lives in another file… **On an evidence app a silently-dead CTA reads as success.**"*

It raises `Export Error / No locations are selected. Please select locations and try again.` for the null-selection arm and `Export Error / The selected case is no longer available…` for the missing-case arm. P5.1 **ported both strings** — `EXPORT_ALERTS.noSelection` and `EXPORT_ALERTS.caseUnavailable` — and `flow.ts` carries the same doctrine verbatim in `continueValidatedExport` ("on an evidence app a silent return reads as success", `flow.ts:361-362`). `caseUnavailable` found its consumer at `DemoExperience.tsx:1980`/`:2002`; **`noSelection` has zero consumers anywhere in the repo** (grep: `flow.ts:127` is its only occurrence — not even a test names it). The one seam the CTA needed it for chose the silent shape instead.

Concrete failure mode: unreachable today (the footer and the handler read the same two render-scope values in the same pass), exactly as on the phone — but the demo's `armedExportCase` is a `caseCards.find(...) ?? null` on a list this component does not own, so the "footer rendered, case gone by press time" divergence is one refactor away, and its symptom would be a CTA that does nothing at all.

**Fix:** mirror the phone's two arms rather than one `return`:

```ts
if (!exportView) { raiseExportAlert(EXPORT_ALERTS.noSelection); return }
if (!exportFooter) { raiseExportAlert(EXPORT_ALERTS.caseUnavailable); return }
```

(`raiseExportAlert` is already in scope and already the single-OK dialog shape.)

---

### [MEDIUM] M3 — three closed unions in the export path are handled non-exhaustively, in a diff that uses `assertNever` everywhere else

**Files:** `features/demo/ui/DemoExperience.tsx:663-670` (primary) · `features/demo/ui/DemoExperience.tsx:1899-1918` · `features/demo/ui/screens/ExportActionSheet.tsx:59-79`

**Issue:** this diff is otherwise exhaustive-by-construction — `requestExport`, `resolveExportPlan`, `artifactOf`/`describeExportTerminal`, `requestExportFlow`, `continueExportFlow` and `selectExportScope` all close with `assertNever`. Three sites do not, and the first is the one the seam brief singles out:

1. **`onExportPress` (`:663-670`)** — `if (dispatch === 'case') … else if (dispatch === 'location') … else { case-subset }`. A fourth member on `ExportSelectionPlan['dispatch']` compiles clean and silently falls into the **`case-subset`** arm. That directly breaks the invariant `selection.ts:200-207` claims for itself — *"the route cannot dispatch a subset ZIP under a footer promising the canonical case artifact, because both read `kind`"* — since the footer would render the new kind's copy while the CTA ships a subset ZIP. On an evidence export that is a scope mismatch between what the visitor read and what ran.
2. **`pdfPassFor` (`:1899-1918`)** — `if (run.type === 'location') … if (run.type === 'case' || 'case-subset') … return []`. The trailing `return []` is currently unreachable (`startExportRun` peels off the two non-ZIP types first), but it means a new `ExportType` routed down the ZIP path gets an empty PDF pass and runs the pipeline reporting zero locations, rather than failing.
3. **`OptionIcon` (`ExportActionSheet.tsx:59-79`)** — `switch (icon)` with no `default`; a new `ExportSheetIcon` renders `undefined` (no icon, no error). Cosmetic, but the same class and the same one-line fix.

**Evidence:** `features/demo/engine/logic/assert-never.ts` exists for exactly this and is imported into `DemoExperience.tsx` (`:110`) and `exportNotices.ts` (`:1`) in this very diff. The lane/architecture rule: *"Discriminated-union `default:` fall-through that silently swallows a new variant — this repo prefers exhaustive-by-construction handling."*

**Fix:** convert all three to `switch` + `default: return assertNever(x)`. For `onExportPress` that also removes the need for the `dispatch` value to be re-read at all:

```ts
switch (dispatch) {
  case 'case':        requestExportFlow({ type: 'case', caseId: exportView.caseId }); return
  case 'location':    requestExportFlow({ type: 'location', locationId: Array.from(exportView.locationIds)[0] ?? null }); return
  case 'case-subset': requestExportFlow({ type: 'case-subset', caseId: exportView.caseId, locationIds: Array.from(exportView.locationIds) }); return
  default:            return assertNever(dispatch)
}
```

---

### [LOW] L1 — `showTabs` is dead after the tab-registry refactor, and it is the stale hand-listed tab set the registry replaced

**File:** `features/demo/ui/DemoExperience.tsx:2126`

```ts
const showTabs = view === 'dashboard' || view === 'cases' || view === 'map'
```

Its sole consumer was the `tabBar={showTabs ? … : undefined}` prop, which the diff replaced with `tabView` (`:2129`, derived from `TAB_VIEWS` via `isTabView`). Nothing reads `showTabs` now (grep: one hit, the declaration). The tsconfig sets no `noUnusedLocals` and there is no ESLint config, so nothing will ever flag it. Worse than an ordinary unused local: it is a three-tab literal list that is now *wrong*, sitting one line above the registry-derived replacement — the precise "parallel order array duplicating the registry" shape `screens.ts`'s own doc-block warns against, and the next reader is one copy-paste away from reintroducing it. **Fix:** delete the line.

---

### [LOW] L2 — the flow's `case-map` terminal still ships P5.3's interim copy, which P5.4 made false in the same PR

**File:** `features/demo/ui/screens/exportNotices.ts:67-73` · `features/demo/ui/DemoExperience.tsx:1972`

```
"That one IS reproducible here and is being built; it just is not wired to this button yet. Nothing was generated."
```

P5.4 shipped the real download in the same PR — but through a different surface (`exportCaseMap`, the map sheet footer), not through the flow. `startExportRun` still carries `// SEAM(P5.4): real case-map download lands here` (`:1972`) and the arm still returns the interim notice. I verified the arm is genuinely unreachable — the four `requestExportFlow` call sites (`:665`, `:667`, `:669`, `:1146`, `:2104`, `:2107`, plus `:2493-2494`) dispatch only `case` / `location` / `case-subset` / `location-geojson` — so nothing is user-visible today, and §74f records the arm as type-demanded. Two residual problems: (a) the PR body states "the case-map dispatch arm in the flow awaits P5.4's builder (same PR — **wired**)", which the code contradicts; (b) the first caller that ever routes `case-map` through the flow ships a sentence saying a shipped feature "is being built". **Fix:** either point the arm at `exportCaseMap`'s builder+save path (and delete the interim copy), or rewrite the copy to state plainly that this entry point does not produce the map and name the one that does — and correct the PR body / §74f either way.

---

### [LOW] L3 — `exportCaseMap`'s rejection guard covers only the dynamic import, and the handler has no in-flight guard

**File:** `features/demo/ui/DemoExperience.tsx:1272-1307`

The `void`-ed async IIFE wraps `await import(...)` in `try/catch` (correct, and the comment at `:1277-1279` states the doctrine: an unhandled rejection here is "a button that does nothing, silently"). Everything after the import — `buildCaseMapGeoJson`, `buildCaseMapHtml` (four `.replace()` passes over an 85 KB string), `buildCaseMapMeta`, `caseMapFileName`, `saveTextFile` — sits outside any handler on a `void`-ed promise. `saveTextFile` is documented never to throw and the builders are pure, so I could not construct a realistic throw; but the guard the file argues for is one `.catch()` wider than it currently is.

Separately, this handler is the only export surface with **no busy gate**: it does not touch `exportFlow`, the footer button is never disabled, and there is no generation token. Two fast clicks produce two identical downloads. The phone gates the same action behind `useExportFlow`'s entry guard.

**Fix:** widen the `try` to the whole IIFE (or `.catch()` the `void`-ed promise) with the existing `CASE_MAP_EXPORT_FAILED_NOTICE`; and, if the double-download matters, hold a `useRef<boolean>` in-flight flag and pass a `disabled` through `MapScreen`/`MapBottomSheet`/`LocationList` (the props are already forwarded).

---

## TypeScript Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 3 |

Store-bridge integrity: **preserved**
Engine purity: **preserved**
Barrel + marketing/demo isolation: **preserved**
Determinism seam: **preserved**

**Verdict: APPROVE with comments**

Notes: the engine's outcome unions, `assertNever` closure, nullable-arm discipline (§70j/§74) and the shell's timer/ref/state ordering all hold under trace; the three MEDIUMs are a data-corruption edge in the case-map injector, one un-ported loud backstop that leaves a ported alert dead, and three non-exhaustive union branches in a diff that is otherwise exhaustive-by-construction. None blocks merge.

---

# Fix-delta r1

**Range:** `3aab581..6cf026f` on `feat/parity-p5` · **Gates re-run:** `tsc --noEmit` clean · full suite **238 files / 2885 tests green** (see the contention note below — the first run was not).

## 1. Verification of this lane's findings

| # | Finding | Fix | Status |
|---|---|---|---|
| M1 | `buildCaseMapHtml` replace-chain corrupts the export | R-10 `d482f60` | **FIXED** |
| M2 | silent CTA backstop; `EXPORT_ALERTS.noSelection` dead | R-13 `46b9728` | **FIXED** |
| M3 | three non-exhaustive closed-union branches | R-3 `47d8ab8`, `6ad4e26`, `732a051` | **FIXED** (3/3) |
| L1 | dead `showTabs` local | R-20 `a29ec92` | **FIXED** |
| L2 | stale `case-map` terminal copy | R-8/R-14 `7f049c4` | **FIXED** (structurally) |
| L3 | `exportCaseMap` partial rejection guard, no in-flight gate | R-8 `7f049c4` | **FIXED** (both halves) |

**M1 — probe re-run.** `build.ts:104-113` now fills all four slots in one `TOKEN_PATTERN` pass from a `fill` lookup. Re-ran my original probe with a location named `__CASE_META__ __MAPBOX_TOKEN__ __CASE_TITLE__`:

```
id="case-geojson">{…"locationName":"__CASE_META__ __MAPBOX_TOKEN__ __CASE_TITLE__"}…</script>
id="case-meta">{"caseNumber":"OCC-1","displayName":"X","generatedAt":"now"}</script>
geojson parses: true    meta parses: true
```

The token strings now survive as data. `?? token` on the lookup miss is a sound belt-and-braces (a fifth pattern member without a `fill` entry renders as itself, not `undefined`). The replacer stays a function, so the `$&`/`$1` protection is untouched.

**M2.** `DemoExperience.tsx:662-676` — `!exportView → EXPORT_ALERTS.noSelection`, `!exportFooter → EXPORT_ALERTS.caseUnavailable`, both through `raiseExportAlert`. `noSelection` now has its caller. (`raiseExportAlert` is declared below `onExportPress` in the same body — no TDZ, since the handler only runs after render completes.)

**M3.** All three closed with `assertNever`: `onExportPress`'s `switch (dispatch)` (`:681-693`), `pdfPassFor`'s `switch (run.type)` (`:1943-1968`), `OptionIcon` (`ExportActionSheet.tsx`). `pdfPassFor` went further than the finding asked — its parameter is now `ZipExportRun = Extract<ExportRun, { type: 'case' | 'case-subset' | 'location' }>` (`:291`), so the residual arm is not merely closed, it is unconstructable at the call site.

**L2.** The strongest of the six. `SimulatedExportRun = Exclude<ExportRun, { type: 'case-map' }>` (`exportNotices.ts`) removes the member that carried the "is being built; it just is not wired to this button yet" sentence, so it cannot return — and `describeCaseMapTerminal` gives the real download its own four-arm outcome type. `runZipPipeline` and `exportTerminalAlert` are narrowed to match. The PR-body/code contradiction I flagged is gone: `exportCaseMap` is now `requestExportFlow({ type: 'case-map', caseId: mapViewerCaseId })`, so the arm has a caller.

**L3.** Both halves closed, and by removing the async rather than guarding it: the `void`-ed IIFE is gone; the only promise is the prefetch effect (`:816-832`), which handles **both** settlement paths and carries a `cancelled` flag; `buildCaseMapDownload` is synchronous, so the flow's own entry guard suffices; and `exportMapPending` / `exportMapBlocked` disable the footer button while the chunk is in flight or a dialog owns the screen.

## 2. Disclosed deviations touching this lane's findings

- **R-16's extra `'idle'` exclusion from `advanceStage` — SOUND, accept.** Verified all three call sites pass `validating`/`generating`/`zipping` only. `resetExportFlow` is the sole route back to rest and it also zeroes `progress` and `currentLocationName`; an `advanceStage(s, 'idle')` would have left both for the next run to inherit. Strictly stronger than the finding asked for, with no capability lost.
- **R-26's removal of `caseCheckboxState`'s zero-length guard — SOUND but order-critical, accept.** With the guard gone, an empty case reaches `selectedCount === 0 → 'none'` before `selectedCount === caseData.locationIds.length` can read `0 === 0` as `'all'`. The ordering *is* the invariant now; the comment says so and a test pins it. Swapping the two returns silently re-opens the phone's bug — correctly called out in the new comment.
- **§78f's refutation of R-11's comment half — ACCEPT, no intersection with my R-10 evidence.** My probe targeted the injection chain, not the inlining claim; `build.test.ts`'s new structural pins (`<style>` present, `function loadCase()` present, length floor) are complementary and verified present.
- **R-2's `ok` → `requested` rename on `SaveFileOutcome` — SOUND, accept.** `HTMLAnchorElement.click()` genuinely cannot report delivery; the type no longer implies a verified write. All call sites updated (tsc clean).
- **R-21's 40 s revoke fuse + `pagehide` backstop — SOUND, accept.** The listener is `{ once: true }` and removed on the timer path; the registry's scoped revoke makes the double-call a no-op. Per-download listener accumulation is bounded by the 40 s window.

## 3. Fix-introduced findings

### [MEDIUM] N1 — the new Case Map terminal asserts an empty map over one that renders camera pins

**File:** `features/demo/ui/DemoExperience.tsx:1344` · `features/demo/ui/screens/exportNotices.ts` (`'requested'` arm)

```ts
mapIsEmpty: !caseMapModule.hasPlottableFeatures(geojson),
```
→ `outcome.mapIsEmpty ? ' Nothing plots yet, so it opens with an empty map.' : ''`

`hasPlottableFeatures` is `features.some(f => f.properties.featureType !== 'camera')` — by design (§71g / the phone's non-camera guard) it answers *"does the map have site framing"*, **not** *"is the map empty"*. For a collection containing only camera features it returns `false`, so `mapIsEmpty` becomes `true` and the terminal tells the visitor nothing plots — while the exported file renders every camera pin.

**Reachable:** `setCameraGps` (`create-store.ts:704-717`) writes a camera fix independently of the parent location's `gps`, so "location typed, not picked + a per-camera GPS capture" (P3.7's own flow) produces exactly this collection. The notice then emits two clauses, one true and one false: *"None of its 1 locations have coordinates yet, so none of them are on the map. Nothing plots yet, so it opens with an empty map."*

**Why it matters at this severity:** this round's own R-2 changed `ok` → `requested` precisely to stop the terminal claiming more than it can know, and R-1 exists to stop it staying silent about what the map omits. A flatly false sentence about a file the visitor is holding sits below both bars.

**Fix:** use the right predicate for the right sentence — `mapIsEmpty: geojson.features.length === 0` — and, if the "no site framing" fact is still wanted, give it its own clause driven by `coverage.hasPlottedLocations` / `hasPlottableFeatures`.

### [LOW] N2 — a vanished case is reported as a failed builder, and resets a healthy one

**File:** `features/demo/ui/DemoExperience.tsx:1319-1320` and `:2035-2036`

```ts
const target = st.cases.find((c) => c.id === caseId)
if (!target) return { kind: 'builder-unavailable' }
...
if (outcome.kind === 'builder-unavailable') setCaseMapModule(null)
```

The missing-case condition borrows the missing-*module* outcome, so the visitor reads *"The Case Map builder could not be loaded… It is fetched on demand; check your connection and try again"* for a cause that has nothing to do with the network — and the caller then discards an already-loaded module and refetches it, every press. The taxonomy already has the right string (`EXPORT_ALERTS.caseUnavailable`, "The selected case is no longer available. Re-select and try again."), which the ZIP path raises for the identical condition (`:2049`).

**Unreachable today** — `setMapViewerCaseId((prev) => (prev === id ? null : prev))` prunes the viewer id on case delete (`:1407`), and the picker is forced when it is null. But R-13 in this very round argued that an unreachable backstop still has to be *correct*; this one names the wrong cause and has a side effect. **Fix:** add a `{ kind: 'case-unavailable' }` arm to `CaseMapOutcome` (or route it to `raiseExportAlert(EXPORT_ALERTS.caseUnavailable)`), and gate the `setCaseMapModule(null)` re-arm on the module genuinely being the cause.

## 4. ⚠ Shared-worktree contention corrupted a suite run — read before trusting any lane's numbers

My first full-suite run reported **1 failed / 2885**, in `features/demo/engine/logic/export/__tests__/flow.test.ts` — the `EXPORT_ALERTS` `toEqual` contract block, which is a `toEqual` against a frozen module constant and cannot be flaky on its own. It passed **solo** (46/46). Cause, established rather than guessed: `features/demo/engine/logic/export/flow.ts` has mtime **20:50:18**, eleven seconds into a run that started at **20:50:07** — a concurrent lane was mutation-probing that file mid-run and restored it afterwards.

I re-ran the suite with a before/after `stat` sweep over every `features/**/*.ts(x)`: **238 files / 2885 tests green**, and the sweep caught two *further* mid-run rewrites (`ui/screens/export/ExportHub.tsx`, `engine/logic/case-map/geojson.ts`) that happened not to collide with their own tests that time.

This is the second contention incident this lane has recorded in this worktree (the first: an unreverted `onExportPress` mutation at the end of round 1, logged above). **Recommendation for the orchestrator:** serialise full-suite runs, or give mutation-probing lanes their own worktree. A green number from this worktree is only trustworthy if the runner also proves no source file changed mid-run.

## Fix-delta summary

| | Count |
|---|---|
| Prior findings verified FIXED | 6 / 6 (3 MEDIUM, 3 LOW) |
| Prior findings PARTIAL / UNFIXED | 0 |
| Disclosed deviations judged | 5 — all sound, all accepted |
| New (fix-introduced) MEDIUM | 1 |
| New (fix-introduced) LOW | 1 |
| New HIGH / CRITICAL | 0 |

Store-bridge integrity: **preserved** · Engine purity: **preserved** (the new `type CaseMapCoverage` import in `exportNotices.ts` is `import type`, erased, so the lazy chunk stays out of the First Load graph) · Barrel + marketing/demo isolation: **preserved** · Determinism seam: **preserved**

**Verdict: APPROVE with comments.** The round is materially stronger than the findings required — three fixes are structural (`ZipExportRun`, `SimulatedExportRun`, discriminated `ExportModalProps`) rather than defensive, and the case-map rewire removed the async instead of guarding it. N1 is worth closing before merge; N2 can ride a later round.
