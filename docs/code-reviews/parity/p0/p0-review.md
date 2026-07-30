# Parity phase P0 — aggregated review (vetted)

- **Phase:** p0 (`feat/parity-p0`, PR #29)
- **Mode:** INITIAL
- **Date:** p0 (phase id — no timestamp)
- **Diff:** `git diff master...feat/parity-p0` — 57 files, +2482 / −169
- **Lanes aggregated:** typescript, web, tests, silent-failures, type-design (all five lane files read in full; inventory at the end)
- **Binding contracts applied:** `features/demo/CLAUDE.md`, `docs/planning/demo-phone-parity/01-master-parity-plan.md` §4 (binding conventions, incl. the honesty rule), `docs/code-reviews/deferred.md` §29–§31
- **Aggregator spot-checks:** the BLOCKER was re-verified end-to-end against the worktree (DemoExperience wiring, CompletionScreen branches, `completeCase`/`switchLocation`, master's `caseCompleted` behavior, `previewCaseNotes` wiring). All three MAJORs were independently re-verified against code (boundary test file hooks + sibling hygiene; persistence.ts drift-guard comment, hand-mirrored `z.enum`s, `APP_VIEWS` residual, `MODAL_IDS` pattern; CamerasScreen + the phone's `app/(form)/cameras.tsx:36-61`). Minors were sampled (`FALLBACK_COPY` typing, Dropdown `aria-label`, `FORM_OPTIONS` mutability + zero production consumers, missing `autoFocus`, save-path `catch {}`, `isVisitId` `in`-operator, redundant casts) — all held.

## Verdict

**APPROVE-WITH-FIXES** — 1 BLOCKER · 3 MAJOR · 14 MINOR.

R-1 gates the merge; R-2, R-3 and R-4 must also land before merge (all are contained fixes — no re-architecture anywhere). The gates themselves are healthy: `tsc --noEmit` clean, `next build` clean, full vitest suite green (865/865 on a quiet run; the observed 864/865 runs are the contention flake filed as R-6), store-bridge / engine-purity / barrel-isolation / determinism sweeps all preserved, `/demo` First Load JS unchanged at 107 kB, and every P0.5 glass-token substitution verified byte-identical by two independent lanes.

| Severity | Count |
|---|---|
| BLOCKER | 1 |
| MAJOR | 3 |
| MINOR | 14 |

## Findings table

| ID | Sev | Where | Claim | Lenses |
|---|---|---|---|---|
| R-1 | BLOCKER | `features/demo/ui/DemoExperience.tsx:719` | Completion gate is case-scoped, not location-scoped: first "Complete & Save" permanently locks Completion for every location in the case, makes the court-PDF preview unreachable forever, and falsely reports untouched sibling locations as saved/locked/archived — a regression vs master that P0.4 now persists across refresh | silent-failures, typescript |
| R-2 | MAJOR | `features/demo/ui/screens/CamerasScreen.tsx:24-25` | Per-camera custom Resolution/FPS flags keyed by array index while rows are id-keyed; removal re-indexes the list under the maps, silently reassigning custom mode between cameras (visible mis-render; one more tap destroys typed data) | web, type-design, typescript, tests, silent-failures |
| R-3 | MAJOR | `features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:13` | Boundary test file mounts the real (non-injected, now-persisted) store three times with no `sessionStorage.clear()` — order-dependent; test 2 passes for the wrong reason (empirically reproduced) | tests |
| R-4 | MAJOR | `features/demo/engine/store/persistence.ts:66` | The `z.ZodType<DomainType>` drift guard is far weaker than its header claims: narrowed `z.enum`s, forgotten optionals, and a non-exhaustive `APP_VIEWS` all compile silently — each is a scheduled P1–P4 edit whose failure mode is a silent total wipe of the visitor's session | type-design |
| R-5 | MINOR | `features/demo/ui/DemoExperience.tsx:810` | Boundary comment claims coverage of "any render throw in the screen subtree", but all bridge view-model derivation (`activeScreen()`, `activeModal()`, `toCaseCards`, `toMapData`, `selectDrawerItems`, …) runs above the boundary, and no route-level `app/demo/error.tsx` exists as an outer net | typescript, web, silent-failures |
| R-6 | MINOR | `features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:20` | New heavy full-experience suite uses the default 5 s timeout; observed timing out under full-suite load (864/865) while the sibling boundary suite added `{ timeout: 20000 }` for exactly this reason | web, typescript, tests |
| R-7 | MINOR | `features/demo/engine/store/persistence.ts:243` | `isVisitId` uses the `in` operator — `Object.prototype` keys (`toString`, `constructor`, …) pass the guard, defeating the type predicate and the documented "unknown visited keys are dropped" contract | typescript |
| R-8 | MINOR | `features/demo/ui/chrome/DemoErrorBoundary.tsx:107-125` | Error fallback never takes focus — keyboard/SR users are silently relocated to `<body>` when the throwing subtree unmounts; the in-repo idiom (`ExitDialog.tsx:70` `autoFocus`) was not applied | web |
| R-9 | MINOR | `features/demo/engine/store/persistence.ts:1` | First client-shipped zod in the repo (~13 kB gz on demo mount, eager via `loadSnapshot`) — a defensible trade that is nowhere recorded | web, type-design |
| R-10 | MINOR | `features/demo/ui/inputs/Dropdown.tsx:69` | `aria-label` overrides the trigger's text content, so the current selection — including the new "Other (Custom)" state P0.3 makes load-bearing — is never exposed to assistive tech (WCAG 4.1.2) | web |
| R-11 | MINOR | `features/demo/engine/logic/__tests__/import-displayable.test.ts:36` | The `FORM_OPTIONS` describe is a self-comparison over a constant with zero production consumers; it cannot fail for the G5 regression its name advertises, and the `form-options.ts:17-20` docstring overstates what is enforced | tests |
| R-12 | MINOR | `features/demo/ui/DemoExperience.tsx:219` | The load-bearing "injected stores are never persisted/rehydrated" contract — what keeps ~50 existing component tests hermetic — has no test on either guard | tests |
| R-13 | MINOR | `features/demo/ui/DemoExperience.tsx:108` | `sessionStorageOrNull()`'s catch arm (Safari private mode / blocked storage → boot empty, not crash) is untestable-by-gate (`ui/**` excluded from coverage) and untested | tests |
| R-14 | MINOR | `features/demo/engine/store/persistence.ts:380` | Snapshot-write `catch {}` is fully silent and leaves the previous snapshot in place — a later refresh silently restores stale work; departs from the repo's dev-breadcrumb convention | silent-failures |
| R-15 | MINOR | `features/demo/engine/store/persistence.ts:333` | `loadSnapshot` does no referential-integrity pass: a dangling `currentLocationId` rehydrates a wizard view where `updateField` is a silent no-op — and P0.4 makes that dead state survive refresh | silent-failures |
| R-16 | MINOR | `features/demo/ui/chrome/DemoErrorBoundary.tsx:13` | `FALLBACK_COPY: Record<string, string>` + `view: string` where `AppView`/`LaunchableId` unions exist — the bare-string-registry pattern the repo already fixed (review M1); the "no engine imports" rationale is refuted by three existing presentational type-imports | type-design |
| R-17 | MINOR | `features/demo/engine/logic/import.ts:214` | `FORM_OPTIONS` lost `as const` — now a mutable registry of mutable `string[]`s, regressing the "module-level registries must be readonly" precedent just before P1 lands its first real consumer | type-design |
| R-18 | MINOR | `features/demo/engine/store/persistence.ts:327` | Two redundant `as ChapterId`/`as AppView` casts where zod's type-guard `refine` already narrows — future regressions become silent assertions instead of compile errors | type-design |

---

## R-1 [BLOCKER] Completion gate is case-scoped while the screen is location-scoped — one-way door, PDF unreachable, false "locked" claims

**Where:** `features/demo/ui/DemoExperience.tsx:719` (gate), `:725-728` (action), `features/demo/ui/screens/CompletionScreen.tsx:42-57` (branch), `features/demo/engine/store/create-store.ts:216-219` (`completeCase`), `:248-252` (`switchLocation`).

**Lenses:** silent-failures (BLOCKER), typescript (MAJOR — same defect, multi-location focus). Unified at BLOCKER; every step re-verified by the aggregator against the worktree and `git show master:...`.

**Claim.** P0.2 (G4) replaced the bridge-local `caseCompleted` boolean with the store's **case-level** status, but `CompletionScreen`'s `isComplete` gate is **location-scoped in meaning**. The result is a one-way door: the first "Complete & Save" in a case permanently swaps the Completion & Review branch for the "Case Complete" confirmation for *every* location in that case, forever — and P0.4 persists it across refresh. Consequences: (a) the demo's marquee artifact — the generated court PDF — becomes unreachable for that case (the confirmation branch has no Preview/Export buttons and `previewCaseNotes` has no other entry point, verified by grep: only `CompletionScreen.onPreviewPdf` at `DemoExperience.tsx:723`); (b) untouched sibling locations are told, falsely, *"Saved and marked complete. The location is locked, with its PDFs and media archived"* — nothing about them was saved, completed, locked or archived. This directly violates the plan's binding honesty rule ("never a fake success") in the exact dimension P0.2 exists to fix ("truthful statuses").

**Evidence (all re-verified).**
- `DemoExperience.tsx:719` — `isComplete={currentCase?.status === 'complete'}` (case-level) feeding a screen rendering one *location's* review; `:720-722` bind per-location `form.dateTimeCompleted`/`form.completedBy`.
- `create-store.ts:216-219` — `completeCase` maps the **case** row to `status: 'complete'`. The only other `status` write is `'draft'` at creation. No un-complete path is reachable from any UI control.
- `create-store.ts:248-252` — `switchLocation` sets `currentCaseId: loc.caseId`, so opening a *sibling* location of a completed case keeps `currentCase.status === 'complete'`.
- `CompletionScreen.tsx:42-57` — the `isComplete` branch renders only the confirmation card + two back buttons: no review summary, no Completion Details, no "Preview PDF", no "Preview Time-Offset Calibration", no "Complete & Save".
- **Regression vs master** (verified via `git show master:features/demo/ui/DemoExperience.tsx`): `caseCompleted` was `useState(false)` (line 186) and **both** back handlers reset it to `false`, so the review form and PDF button always came back. The branch's handlers (`:729-730`) just `setView` — nothing resets.
- Internal contradiction: `completeCase` never touches `form.dateTimeCompleted`/`form.completedBy`, so `selectLocationMapStatus` still reports the location as "Working" on the very Cases card the same commit turns green (G3 row at `ui/screens/screenData.ts:77-84` disagrees with G4 on the same location).

**Repro (both are ordinary demo flows).** (1) Single location: complete → "Return to Cases" → re-open the location → Completion shows the confirmation again; the PDF preview is gone for good. (2) Multi-location (Add Location, or batch PDF import which mints one location per file, `DemoExperience.tsx:442-462`): complete location 1, open location 2 → Completion claims location 2 is complete and locked with zero data entered.

**Suggested fix.** Keep the case-level status write (that *is* G4's payoff — cards turning green) but gate the screen on the **location**: have `completeCase` also stamp the current location (write `form.dateTimeCompleted`/`form.completedBy` if blank, or add an explicit per-location completed flag) and drive `isComplete` off that; give the confirmation branch a way back to the review form ("Review / Export again") so the PDF is never a one-shot. Also fix the secondary swallow: `onComplete` (`DemoExperience.tsx:725-728`) silently no-ops when `currentCaseId` is null (reachable via rail-jump to Completion) — disable the button or surface why. Regression test: complete location 1, assert location 2's Completion still renders the review branch, and that a completed location can re-open its PDF preview. The store-action tests (`store.test.ts:832-857`) stay valid.

**Suggested owner:** P0.2 (truthful statuses) authoring agent.

---

## R-2 [MAJOR] CamerasScreen custom-mode flags keyed by array index under an id-keyed list — removal reassigns custom mode; second tap destroys data

**Where:** `features/demo/ui/screens/CamerasScreen.tsx:24-25` (state), `:56` (`onRemove(i)`), `:61,64,67,70` (index reads); `features/demo/ui/DemoExperience.tsx:124` (`filter`-based remove, re-indexes).

**Lenses:** all five lanes. Severity conflict settled by the aggregator: web + type-design said MAJOR; typescript, tests and silent-failures said MINOR on phone-parity grounds (all verified the phone's `app/(form)/cameras.tsx:36-61` uses the identical index-keyed pattern — the aggregator re-confirmed against the phone source). **Ruling: MAJOR.** The parity plan §4 mandates verbatim lifts of *copy, colors, sizes, and option lists* — not replication of internal state bugs; the ruled-on deliberate choice (deferred/ui-mapping 07) covers the *clear-on-select* asymmetry only, not the index keying; and the id-keyed fix changes nothing visible in the no-removal case, so it is not a surface divergence. A latent bug reachable in ~4 ordinary taps in a demo built to be poked at, whose second-order effect silently deletes typed data, gates merge.

**Claim.** `customResolutions`/`customFps` are `Record<number, boolean>` keyed by row index; rows render with `key={c.id}` and removal re-indexes via `filter`. Nothing re-keys the maps, and the screen doesn't remount on data change (`ScreenStage.tsx` keys on `view`). After any removal the flags point at the wrong cameras.

**Failure scenario (verified against the code).** Cameras `[A custom "1440x900" (index 0), B "1920x1080" (index 1)]` → `customResolutions = {0: true, 1: false}`. Remove A: B becomes index 0 → B renders "Other (Custom)" with a spurious pre-filled Custom Resolution field. Inverse ordering: the surviving custom camera drops out of custom mode — its free-text value displays via `Dropdown.tsx:38-39`'s raw-value degrade but is no longer editable, and re-selecting "Other (Custom)" **clears the stored value** (`CamerasScreen.tsx:29-30`, the deliberate Cameras-clears rule) — the visitor's typed resolution/FPS is gone with no warning. Not covered by any test: `option-parity.test.tsx` passes `onRemove={vi.fn()}` everywhere.

**Suggested fix.** Key both maps by the stable `CameraEntry.id` (`Record<string, boolean>`, read `customResolutions[c.id]`), using functional updaters (`setX((prev) => …)` — the current spread-of-render-closure form can clobber two same-tick changes). Add the missing test: two cameras, one custom, remove the other, assert the surviving row keeps its custom field and value. Optional (and a genuine divergence — decide explicitly, and log in `deferred.md` if declined): seed from `isCustomResolution(c.resolution)`/`isCustomFps(...)` the way `DvrInfoScreen.tsx:41-44` already does, so free-text values reopen editable after a P0.4 refresh or remount. File the phone's identical latent bug separately per parity plan §8 ("Phone-repo follow-ups — NOT this effort").

**Suggested owner:** P0.3 (option-set consolidation — the custom/"Other" path is P0.3 scope) authoring agent.

---

## R-3 [MAJOR] Boundary test file is order-dependent: real persisted store, no `sessionStorage.clear()`

**Where:** `features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:13-21`.

**Lens:** tests (empirically reproduced with an out-of-repo instrumented run). Aggregator re-verified: the file mounts `<DemoExperience />` three times with only `console.error` spy hooks — no storage hygiene — while both sibling files added in this same diff have it (`DemoExperience.test.tsx:11`, `DemoExperience.persistence.test.tsx:11-12`), and the non-injected path really does persist (`DemoExperience.tsx:219-228`; `dispose()` flushes the pending debounced write on RTL `cleanup()` unmount, `persistence.ts:396-398`).

**Claim.** Each test's teardown flushes a snapshot the next test rehydrates. The lane's instrumented run showed test 2 booting with `view=dashboard` (leaked from test 1) instead of `cases` — so the mocked always-throwing `DashboardScreen` throws during the **initial** render and `getByRole('alert')` passes for the wrong reason; the file's premise comment ("booting on Cases … exercises the boundary through real navigation") is false under full-suite order. Green today only by luck: a leaked wizard view would hide the tab bar and fail with a confusing query error. First order-dependence introduced into a suite with no flaky baseline.

**Suggested fix.** One line in `beforeEach` (matching the siblings): `window.sessionStorage.clear()`; optionally also in `afterEach`. Re-confirm test 2 still passes (it should — it will then genuinely navigate).

**Suggested owner:** P0.1 (error boundary) authoring agent — interaction created by P0.4, but the file belongs to P0.1.

---

## R-4 [MAJOR] Snapshot drift guard delivers far less than its header claims — three silent drift directions, each scheduled in P1–P4, each ending in a silent total session wipe

**Where:** `features/demo/engine/store/persistence.ts:66-69` (the claim), `:151`/`:197` etc. (hand-mirrored `z.enum`s), `:238` (`APP_VIEWS`), `:241-243` (the `MODAL_IDS` counter-example).

**Lens:** type-design (probe-verified against the installed zod 3.25.76 under `strict: true`). Aggregator re-verified the claim comment, the hand-mirrored enums, and the `readonly string[]`-erased `APP_VIEWS` residual in the file; the covariance behavior of `z.ZodType<T>` (narrower output and shorter-but-compatible output both assign) is standard TS assignability and was probe-confirmed by the lane. No *current* mismatch exists — the lane checked all 14 mirrored shapes field-by-field; this is a guard-strength defect plus a false documented guarantee, not a live bug.

**Claim.** The header states drift is "a COMPILE error". In fact `z.ZodType<DomainType>` catches only a **missing required field**. Silent today: (a) a `z.enum` *narrower* than its domain union — add a variant (P3.2 "reopen" status, P4 media kinds) and the build's own snapshot fails `safeParse` on next refresh → `discard()` → the visitor's entire session is wiped; (b) a forgotten domain **optional** — strip-mode `z.object` silently drops it on rehydrate (P3.7 adds five per-camera coordinate optionals — the exact shape at risk), and the round-trip test can't catch it because `newCaseInput()` populates only 3 of `DemoCase`'s 16 fields; (c) `APP_VIEWS: readonly string[] = [...CHAPTERS, ...LAUNCHABLE, 'map']` erases the link to `AppView` — a new non-registry view (P7 settings surfaces) makes `isAppView` reject a view this build itself writes → same wipe path. The file already demonstrates the right pattern two lines down: `MODAL_IDS: Record<ModalId, true>` is exhaustive by construction.

**Suggested fix.** (1) Single-source the mirrored unions: `export const MEDIA_KINDS = [...] as const` in `engine/types/index.ts` + `z.enum(MEDIA_KINDS)` here (same for `status`, `SyncResult.method`, both `source` unions, `direction`, `captureMethod`). (2) Close (c) with the `MODAL_IDS` pattern: `const EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true }`. (3) Close (b) with a fully-populated (every-optional-set) round-trip fixture in `persistence.test.ts` — or the stronger `satisfies { [K in keyof Required<T>]: z.ZodType<T[K]> }` shape check. (4) Soften the `:66-69` comment to what is actually enforced.

**Suggested owner:** P0.4 (persistence) authoring agent.

---

## R-5 [MINOR] Boundary coverage overstated: bridge's own render is above it, and no route-level outer net exists

**Where:** `features/demo/ui/DemoExperience.tsx:810-818` (comment + placement); no `app/demo/error.tsx` / `app/error.tsx` / `global-error.tsx` anywhere (verified by all three lanes).

**Lenses:** typescript, web, silent-failures (all MINOR — consistent).

**Claim.** The comment claims the boundary catches "any render throw in the screen subtree". JSX children are evaluated eagerly in the parent's render, so `activeScreen()`, `activeModal()`, `toCaseCards` (`:255`), `toMapData` (`:259-262`), `selectDrawerStatus` (`:264`), and `selectDrawerItems(store.getState())` (`:843`) all execute in `DemoExperience`'s own frame, above the boundary. A throw there falls through to Next's generic client error page — frame, rail and route gone, the exact outcome P0.1 exists to prevent. MINOR because the realistic throw surface (screen/modal component renders) *is* covered and no reachable throw was found in the bridge region today; parity matrix row 6 asks for "App-wide" coverage, what landed is screen-subtree.

**Suggested fix.** Add `app/demo/error.tsx` (a `'use client'` segment boundary with `reset()`) as the outer net, or push the derivations below the boundary (render-prop/child component so `activeScreen()` executes under it). At minimum, narrow the `:810` comment to what is actually covered and log the residual under deferred §29.

**Suggested owner:** P0.1 (error boundary) authoring agent.

---

## R-6 [MINOR] Heavy DemoExperience suites at the default 5 s timeout flake under full-suite load

**Where:** `features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:20` (primary — renders `<DemoExperience />` twice in one `it`, no timeout override).

**Lenses:** web (observed 864/865: timed out at 5813 ms full-suite, 3/3 green in isolation, green on re-run), typescript (observed the same-class flake on `option-parity.test.tsx` under parallel load), tests (observed 3 pre-existing files timing out under `--coverage`; green on re-run).

**Claim.** The sibling `DemoExperience.boundary.test.tsx` added in this same PR sets `{ timeout: 20000 }` on each `it` with a comment explaining CPU contention; the persistence suite (and the heavy pre-existing suites) carry no such guard, so the merge gate is flaky.

**Suggested fix.** Add `{ timeout: 20000 }` (reusing the boundary suite's comment) to the persistence suite's tests; opportunistically to `option-parity.test.tsx` and the pre-existing heavy files (`DemoExperience.test.tsx`, `DemoExperience.map.test.tsx`, `DemoExperience.sandbox.test.tsx`).

**Suggested owner:** P0.4 authoring agent (owns the persistence suite); the opportunistic files fall to whichever P0 agent takes the fix round.

---

## R-7 [MINOR] `isVisitId` uses `in` — prototype-chain keys pass the guard

**Where:** `features/demo/engine/store/persistence.ts:242-243`, consumed at `:329-332`.

**Lens:** typescript. Aggregator verified the line: `isAppView(v) || v in MODAL_IDS`.

**Claim.** `in` walks the prototype chain, so `Object.prototype` keys (`toString`, `constructor`, `valueOf`, …) satisfy the guard and are copied into the rehydrated `visited` map — defeating the type predicate and the documented "`visited` keys this build doesn't know are dropped" contract (`:287-288`). Reachable from a hand-edited or forward-version snapshot (`JSON.parse` creates own-enumerable `toString` keys; `z.record` preserves them). No prototype pollution (only `true` is written) and consumers read only known ids — a broken invariant, not a live defect.

**Suggested fix.** `Object.prototype.hasOwnProperty.call(MODAL_IDS, v)`; extend the existing test fixture (`persistence.test.ts:682-690`) with a `"toString": true` key to pin the guarantee.

**Suggested owner:** P0.4 authoring agent.

---

## R-8 [MINOR] Error fallback never takes focus

**Where:** `features/demo/ui/chrome/DemoErrorBoundary.tsx:107-125`.

**Lens:** web. Aggregator verified: no `autoFocus`, no ref-focus anywhere in the fallback; the in-repo idiom exists at `controls/ExitDialog.tsx:70`.

**Claim.** When the fallback renders, the subtree the visitor was focused in is unmounted and the browser resets focus to `<body>`; a keyboard/SR user must Tab from the top of the document to reach the only recovery control. `role="alert"` covers announcement, not position.

**Suggested fix.** `autoFocus` on the "Return to Cases" button (or ref + focus in `componentDidCatch`).

**Suggested owner:** P0.1 authoring agent.

---

## R-9 [MINOR] First client-shipped zod — unrecorded bundle decision

**Where:** `features/demo/engine/store/persistence.ts:1` (static import, eager via synchronous `loadSnapshot` on first render — cannot be lazy).

**Lenses:** web (filed), type-design (endorsed the direction as correct boundary hygiene; noted reviewer context docs are now stale on "zod appears in exactly one file").

**Claim.** ~13 kB gz lands in the demo's lazy chunk group on demo mount (`/demo` First Load JS unchanged at 107 kB — measured). Defensible (the schema doubles as the compile-time drift guard — see R-4), but recorded nowhere.

**Suggested fix.** No code change. Record the trade in the PR body / `deferred.md` (first client-side zod; cost; why; that the replacement if ever needed is a hand-rolled predicate, not a lazy import), and update the lane-brief context note.

**Suggested owner:** P0.4 authoring agent (documentation only).

---

## R-10 [MINOR] Dropdown `aria-label` hides the current selection from assistive tech

**Where:** `features/demo/ui/inputs/Dropdown.tsx:69` (`aria-label={label || placeholder}` on the trigger), value span at `:85-87` not announced.

**Lens:** web. Aggregator verified the attribute. Pre-existing gap — but P0.3 makes the pill the only carrier of the display label and the "Other (Custom)" signal, so the widening is in-diff. WCAG 2.1 SC 4.1.2.

**Suggested fix.** `aria-labelledby` pointing at the label div + value span (needs ids), or drop the `aria-label` in favor of a visually-hidden association. Deliberate small change: `getByRole('button', { name: 'Resolution' })` queries in `Dropdown.test.tsx` and `option-parity.test.tsx` need updating with it.

**Suggested owner:** P0.3 authoring agent.

---

## R-11 [MINOR] `FORM_OPTIONS` displayability test is a self-comparison over dead code; docstring overstates enforcement

**Where:** `features/demo/engine/logic/__tests__/import-displayable.test.ts:36-42`; `engine/logic/import.ts:214-220`; docstring `engine/content/form-options.ts:17-20`.

**Lens:** tests. Aggregator verified by grep: zero production consumers of `FORM_OPTIONS` (declaration + barrel + this test + comments only); the assertions are `optionValues(X)` vs `optionValues(X)`.

**Claim.** The block cannot fail for the G5 regression its name advertises ("an import can never emit an enum value the UI can't display") — nothing in the import pipeline reads `FORM_OPTIONS`. The *real* guarantee is pinned elsewhere in the same file (`:81-94`: the import patch touches no dropdown-enum fields) and by `option-parity.test.tsx`'s rendered-list checks.

**Suggested fix.** Either delete `FORM_OPTIONS` + this describe (dead code; the drift is covered by `field-options.test.ts` + `option-parity.test.tsx`), or retitle to what it pins ("derived, not re-hardcoded") and soften the `form-options.ts:17-20` docstring. Coordinate with R-17 (same constant).

**Suggested owner:** P0.3 authoring agent.

---

## R-12 [MINOR] The "injected stores are never persisted" contract is untested

**Where:** `features/demo/ui/DemoExperience.tsx:156-165` and `:219-221` (the two guards).

**Lens:** tests.

**Claim.** These guards are what keep the ~46 injected-store component renders hermetic now that P0.4 exists. If either were dropped, the whole component suite would become order-dependent (the R-3 failure class) with failures far from the causing edit. No test pins either guard.

**Suggested fix.** Two cheap cases in `DemoExperience.persistence.test.tsx`: injected store + `pagehide` → `sessionStorage.getItem(SNAPSHOT_KEY)` stays null; valid snapshot seeded + injected fresh store → renders empty ("No cases yet"), not the snapshot.

**Suggested owner:** P0.4 authoring agent.

---

## R-13 [MINOR] `sessionStorageOrNull()`'s catch arm is unverified and coverage-invisible

**Where:** `features/demo/ui/DemoExperience.tsx:107-114`.

**Lens:** tests.

**Claim.** The one real-world trigger — a browser where the `window.sessionStorage` **property access itself** throws (Safari private mode, storage-blocked embeds) — is exercised by no test; the engine tests cover null storage and throwing `getItem`, not throwing access. The module lives in `ui/**`, excluded from the coverage gate, so refactoring the `try/catch` away would pass every gate and white-screen those visitors at boot.

**Suggested fix.** One test redefining the `sessionStorage` property descriptor with a throwing getter, asserting the demo boots empty; restore the descriptor in `finally`.

**Suggested owner:** P0.4 authoring agent.

---

## R-14 [MINOR] Silent snapshot-write swallow leaves a stale snapshot to rehydrate

**Where:** `features/demo/engine/store/persistence.ts:375-382`.

**Lens:** silent-failures. Aggregator verified the bare `catch {}` (comment only — no warn, no flag, no `removeItem`).

**Claim.** If a write fails (quota, blocked), the *previous* snapshot stays in storage; a later refresh silently restores stale work as current. Departs from the repo's established best-effort convention (dev-gated `console.warn` breadcrumbs — `generateExtractedScopes`, `geocode.ts`). Reachability is low today (nothing in `PersistedState` grows large) — it stops being low the moment P4 media or OCR image data-URLs land in the snapshot.

**Suggested fix.** In the catch: dev-gated `console.warn`, plus best-effort `removeItem(SNAPSHOT_KEY)` so a refresh boots empty (honest) rather than stale. Add the missing test: seed a valid snapshot, make a later `setItem` throw, assert a subsequent `loadSnapshot` does not return the stale state.

**Suggested owner:** P0.4 authoring agent.

---

## R-15 [MINOR] No referential-integrity pass on the restored selection — dangling id makes `updateField` a silent no-op

**Where:** `features/demo/engine/store/persistence.ts:333-343`; no-op mechanism at `create-store.ts:254-263`.

**Lens:** silent-failures. Aggregator verified: only `view` gets a load-time adjustment; `currentCaseId`/`currentLocationId` pass straight through.

**Claim.** A snapshot whose `currentLocationId` resolves to no location passes the shape guard and rehydrates a wizard view where typing stores nothing, warns nothing. The trigger is adversarial (hand-edited/partial snapshot — `snapshotOf` itself is atomic), hence MINOR; but the same dead-form state is already reachable in-session via rail-jump with no location, and P0.4 makes it survive refresh.

**Suggested fix.** Extend the existing load-time adjustment block: drop `currentLocationId`/`currentCaseId` that don't resolve; if the restored view is a wizard chapter with no resolvable location, restore to `'cases'`. Pin with a test beside the existing "launch-only view restores to currentChapter" case. The broader "wizard screens should surface 'open a location first'" fix is a deferred §29-class follow-up.

**Suggested owner:** P0.4 authoring agent.

---

## R-16 [MINOR] `FALLBACK_COPY` keyed by bare `string` where the id unions exist

**Where:** `features/demo/ui/chrome/DemoErrorBoundary.tsx:13` (`Record<string, string>`), `:53-56` (`view: string` props), lookup at `:115`.

**Lens:** type-design. Aggregator verified the declarations and the three keys being exactly `LaunchableId`.

**Claim.** A typo or a `LaunchableId` rename (P4.3/P4.6 build these screens for real) silently degrades to generic copy — no compile error, no failing test. This is the bare-string-registry pattern the repo already fixed (review M1 precedent). The stated rationale ("no engine imports, so the boundary stays presentational") is refuted in-repo: `StoryRail.tsx`, `ExploreChecklist.tsx` and `mapTokens.ts` all type-import engine unions; the store-bridge rule bans the *store*, not its types.

**Suggested fix.** `view: AppView`, `lastView: AppView`, `FALLBACK_COPY: Partial<Record<AppView, string>>` (type-only imports); keep `?? GENERIC_COPY` as the runtime default.

**Suggested owner:** P0.1 authoring agent.

---

## R-17 [MINOR] `FORM_OPTIONS` lost `as const` — mutable module-level registry

**Where:** `features/demo/engine/logic/import.ts:214-220`; `optionValues(...): string[]` at `engine/content/form-options.ts:80`.

**Lens:** type-design. Aggregator verified: no `as const` on the object; `optionValues` returns mutable `string[]`.

**Claim.** On master this was deeply readonly; now `FORM_OPTIONS.resolution.push('nope')` and `FORM_OPTIONS.fps = []` compile — regressing the PR #8 "module-level registries must be readonly" precedent. Blast radius is small today (fresh array per `optionValues` call; zero production consumers — see R-11) but P1's import work is the consumer that lands next.

**Suggested fix.** `optionValues(...): readonly string[]` (all current uses are read-only) and `as const satisfies Record<string, readonly string[]>` on the object — or delete the constant entirely per R-11 option (a), which moots this.

**Suggested owner:** P0.3 authoring agent (coordinate with R-11 — one decision covers both).

---

## R-18 [MINOR] Redundant `as` casts where the schema already narrows

**Where:** `features/demo/engine/store/persistence.ts:326-328`.

**Lens:** type-design (probe-verified that zod 3's type-guard `refine` overload narrows the inferred output).

**Claim.** `d.currentChapter as ChapterId` / `d.view as AppView` are no-ops today — but if `isAppView` is ever loosened to a plain boolean predicate (an easy edit while fixing R-4c), the schema silently widens to `string` and the casts swallow it: rehydration from an unvalidated string with no compile signal.

**Suggested fix.** Delete both casts; the comment above them becomes a compiler-enforced fact.

**Suggested owner:** P0.4 authoring agent.

---

## Dropped / demoted appendix

Nothing was dropped as unverifiable — every lane finding survived spot-checking in some form. The following aggregation decisions reshaped the lane outputs:

1. **TYPESCRIPT-1 unified into R-1 at BLOCKER (severity raised from MAJOR).** Same defect as SILENT-FAILURES-1; the silent-failures writeup was broader (single-location one-way door + PDF unreachability + the honesty-rule violation, not just the multi-location lock) and every additional claim verified. The typescript lane's own note deferring the `onComplete` null no-op to the silent-failure lens is folded into R-1's fix list.
2. **WEB-1 + TYPE-DESIGN-2 + TYPESCRIPT-2 + SILENT-FAILURES-3 + TESTS-5 merged into R-2 at MAJOR.** Three lanes argued MINOR on phone-parity fidelity (all correctly verified the phone shares the identical index-keyed pattern — aggregator re-confirmed). Overruled per parity plan §4: the verbatim-lift mandate covers copy/pixels/option lists, not internal state-keying bugs; the ruled-on deliberate choice covers clear-on-select only; the fix is invisible at the surface. TESTS-5 (the missing removal test) became R-2's test requirement rather than a separate finding. The no-seeding secondary is kept as an explicitly-optional divergence decision, not mandated.
3. **TYPESCRIPT-4 + WEB-3 + SILENT-FAILURES-4 merged into R-5** (identical mechanism reported through three lenses; all agreed on MINOR). SILENT-FAILURES-4's parity-matrix-row-6 framing ("App-wide" vs screen-subtree) is retained as the strongest version of the claim.
4. **WEB-5 + the typescript lane's gate observation + the tests lane's coverage-run observation merged into R-6** — one systemic issue (heavy suites at default timeout), not three findings.
5. **WEB-4 + the type-design lane's zod non-finding merged into R-9** — kept at MINOR as a documentation-only task; type-design's endorsement of the direction is recorded so the fix round doesn't "fix" the zod usage itself.
6. **No demotions.** R-4 was considered for demotion (no live mismatch today) but retained at MAJOR: the in-code guarantee is presently false as documented, the parity plan schedules the exact edits that trigger the wipe path, and the fix is mechanical.

## Raw lane-file inventory

| Lane file | Self-reported counts | Lane verdict |
|---|---|---|
| `docs/code-reviews/parity/p0/lane-typescript.md` | 0 B / 1 M / 3 m | REVISE |
| `docs/code-reviews/parity/p0/lane-web.md` | 0 B / 1 M / 5 m | REVISE |
| `docs/code-reviews/parity/p0/lane-tests.md` | 0 B / 1 M / 4 m | REVISE |
| `docs/code-reviews/parity/p0/lane-silent-failures.md` | 1 B / 0 M / 4 m | BLOCK |
| `docs/code-reviews/parity/p0/lane-type-design.md` | 0 B / 2 M / 3 m | REVISE |

Raw totals 1 B / 5 M / 19 m across lanes → after dedupe and conflict resolution: **1 BLOCKER / 3 MAJOR / 14 MINOR** (5 majors → 3 via the R-1 and R-2 merges; 19 minors → 14 via the R-2, R-5, R-6 and R-9 merges).
