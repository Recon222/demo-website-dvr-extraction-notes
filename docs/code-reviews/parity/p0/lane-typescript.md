# Lane: TypeScript — parity P0 (PR #29)

- **Lane:** `typescript` (TS 5.7 strict · Next 15 App Router · React 19 · demo architecture contract)
- **Mode:** INITIAL (full review of the diff)
- **Diff under review:** `git diff master...feat/parity-p0` — 57 files, +2482 / −169
- **Refs read:**
  - `.claude/agents/typescript-reviewer.md` (lane definition — authoritative)
  - `features/demo/CLAUDE.md` (binding architecture contract), root `CLAUDE.md`
  - `docs/planning/demo-phone-parity/01-master-parity-plan.md` (P0.1–P0.5 scope), `00-surface-parity-matrix.md` (G1–G6)
  - `docs/code-reviews/deferred.md` §26, §29, §30, §31 (deliberate non-changes — not re-flagged)
  - Every changed `.ts`/`.tsx` read in full, plus their consumers (`DemoExperience.tsx`, `create-store.ts`, `selectors.ts`, `helpers.ts`)
  - Phone sources cross-checked for parity claims: `app/(form)/cameras.tsx:36-61`, `app/(form)/dvr-information.tsx:55-142`, `src/constants/FormOptions.ts:1-93`

## Gates run

| Gate | Result |
|---|---|
| `tsc --noEmit` (whole project) | **clean**, zero diagnostics |
| `vitest run` (full suite) | 864/865 pass. The one failure — `features/demo/ui/screens/__tests__/option-parity.test.tsx` "DvrInfoScreen renders the canonical Resolution + FPS lists" — is a **5 s `testTimeout` blow-out under full-suite parallel load**, not an assertion failure; the same file passes 12/12 in isolation (6.2 s). Flagging as context only — flakiness is `test-analyzer`'s lane. |
| Store-bridge sweep (`grep -rn "useStore" features/demo/ui`) | **preserved** — only `DemoExperience.tsx`. `screenData.ts` now imports the *pure selector* `selectLocationMapStatus`, which is the established `mapData.ts` pattern, not a store instance. |
| Engine purity (`features/demo/engine/**`) | **preserved** — `persistence.ts` takes an injected `StorageLike`; no React import, no `'use client'`, no module-scope `window`/`document`. |
| Barrel + marketing↔demo isolation | **preserved** — no new `features/demo` import in `components/`, `app/(default)/`, `lib/`. `app/api/extract/route.ts`'s deep engine import is pre-existing. |
| Determinism seam | **preserved** — no `Date.now()`/`Math.random()` added in production code; ids still come from `seq`/`uiSeq`, both correctly reseeded past every rehydrated id. |
| `any` / `as any` / non-null assertions / `console.log` added | **none** |
| `isolatedModules` type re-exports | correct (`type PickerOption` in the named list on `engine/index.ts`; `export *` in `ui/screens/field-options.ts` is legal). |

---

## TYPESCRIPT-1 [MAJOR] features/demo/ui/DemoExperience.tsx:719

**Claim.** `CompletionScreen`'s `isComplete` gate is now **case-scoped** while everything else on that screen is **location-scoped**. On a case with more than one location, completing the first location permanently locks the Completion screen for every *sibling* location — showing "Case Complete … The location is locked" for a location that was never completed, and hiding its review summary, its Completion Details fields, both PDF previews, and the "Complete & Save" button. The pre-change local `caseCompleted` boolean did not have this problem (it reset on `onBackToDashboard`/`onBackToCases`), so this is a regression introduced by P0.2 — in the exact dimension ("truthful statuses") the package exists to fix.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:719` — `isComplete={currentCase?.status === 'complete'}`
- `features/demo/ui/DemoExperience.tsx:725-728` — `onComplete` calls `completeCase(store.getState().currentCaseId)`; the action flips the **case** row: `features/demo/engine/store/create-store.ts:216-219`.
- `features/demo/engine/store/create-store.ts:248-252` — `switchLocation(locationId)` sets `currentCaseId: loc.caseId`, so opening a *sibling* location of a completed case keeps `currentCase.status === 'complete'`.
- `features/demo/ui/screens/CompletionScreen.tsx:42-56` — the `isComplete` branch renders only the confirmation card + "Back to Dashboard"/"Return to Cases". The location-scoped inputs it replaces write `form.dateTimeCompleted` / `form.completedBy` (`DemoExperience.tsx:720-722`) — per-location data.
- The same screen contradicts the Cases list: `features/demo/ui/screens/screenData.ts:77-84` derives each location row from `selectLocationMapStatus(l)`, so the sibling location still reads "Started"/"Working" there while Completion calls it locked.
- Not covered by `docs/code-reviews/deferred.md` §29–§31.

**Repro.** Create case C → add locations A and B (or import two PDFs into C, which mints two locations) → open A → Completion → "Complete & Save" → "Return to Cases" → open B → drawer → Completion. B shows the locked confirmation. With P0.4 in the same PR this now survives a refresh.

**Suggested fix.** Keep `completeCase(caseId)` for the case-card green, but gate the screen on the *location*: either add a per-location completion flag written by the same action (`completeCase(caseId, locationId)` setting `location.form.completed = true`) and use `isComplete={currentLocation?.form.completed === true}`, or — if a store-shape change is out of scope for P0 — derive it from location state that already exists, e.g. `isComplete={currentCase?.status === 'complete' && !!currentLocation?.form.dateTimeCompleted}`. The store action's own tests (`store.test.ts:832-857`) stay valid either way.

**Note (secondary, same 4 lines).** `onComplete` (`DemoExperience.tsx:725-728`) silently no-ops when `currentCaseId` is `null` — reachable by jumping to Completion from the rail without ever opening a location. The button then does nothing with no feedback. Left as a note here rather than a separate finding; the swallowed-intent angle belongs to `silent-failure-hunter`.

**Confidence.** High — traced end to end through the store, the bridge and both screens; the multi-location path is a first-class demo flow (batch PDF import creates several locations under one case).

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/screens/CamerasScreen.tsx:24

**Claim.** `CamerasScreen`'s custom Resolution/FPS flags are `Record<number, boolean>` keyed by **row index**, are never seeded from the stored values, and are never remapped when a row is removed. Two consequences: (a) removing a camera shifts every later row's index, so a sibling row silently loses (or inherits) custom mode; (b) any remount — navigating away and back, or a P0.4 refresh — drops custom mode for a camera whose stored resolution/FPS is free text, and the only way back into the free-text input is re-selecting "Other (Custom)", which **clears** the stored value (`:30`, `:40`).

**Evidence.**

- `features/demo/ui/screens/CamerasScreen.tsx:24-25` — `useState<Record<number, boolean>>({})`, no initializer from `cameras`.
- `features/demo/ui/screens/CamerasScreen.tsx:56` — `onRemove(i)` removes by index; neither map is re-keyed.
- `features/demo/ui/screens/CamerasScreen.tsx:61,64,67,70` — every read is `customResolutions[i]` / `customFps[i]`.
- Contrast the sibling screen, which *does* seed: `features/demo/ui/screens/DvrInfoScreen.tsx:43-44` — `useState(isCustomResolution(dvr.resolution))`.
- Concrete: cameras `[A, B]`, B in custom mode → `customResolutions === {1: true}`. Remove A → B is index 0 → `customResolutions[0]` is `undefined` → B's "Custom Resolution" field disappears and its picker falls back to showing the raw value via `Dropdown.tsx:39`.

**Parity note (why this is MINOR, not MAJOR).** This is a faithful lift: the phone does exactly the same thing — `app/(form)/cameras.tsx:36-61` uses the same index-keyed `customResolutions`/`customFps` maps with no seeding and no remap on remove, and `DvrInfoScreen`'s seeded variant mirrors `app/(form)/dvr-information.tsx:69-74`. The orchestrator's deliberate-choice list covers the *clear-on-select* asymmetry; the index-keying is adjacent and unrecorded, so it is reported here rather than assumed ruled-on. No data is lost (the value stays in the store and still renders in the picker pill) — it is the *editability* that goes.

**Suggested fix.** Key the maps by camera **id** rather than index (`Record<string, boolean>`, read `customResolutions[c.id]`), and fall back to the stored value when a row has no explicit flag: `const custom = customResolutions[c.id] ?? isCustomResolution(c.resolution)`. That keeps the phone's clear-on-select semantics while removing the index coupling. If strict phone parity on this point is preferred, log it in `deferred.md` §29 instead.

**Confidence.** High for the behaviour; the severity call rests on the parity mandate.

---

## TYPESCRIPT-3 [MINOR] features/demo/engine/store/persistence.ts:243

**Claim.** `isVisitId` tests membership with the `in` operator, which walks the prototype chain. `Object.prototype` keys (`toString`, `constructor`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`, …) therefore pass the guard and are copied into the rehydrated `visited` map, defeating the documented "`visited` keys this build doesn't know are dropped" contract and the type predicate `v is AppView | ModalId`.

**Evidence.**

- `features/demo/engine/store/persistence.ts:242-243`
  ```ts
  const MODAL_IDS: Record<ModalId, true> = { newCase: true, newLocation: true, import: true, mediaLibrary: true }
  const isVisitId = (v: string): v is AppView | ModalId => isAppView(v) || v in MODAL_IDS
  ```
- `features/demo/engine/store/persistence.ts:329-332` — `for (const key of Object.keys(d.visited)) { if (isVisitId(key)) visited[key] = true }`.
- The stated guarantee: `persistence.ts:287-288` ("`visited` keys this build doesn't know are dropped") and the test `engine/store/__tests__/persistence.test.ts:682-690`, which only exercises `holodeck`. A snapshot with `visited: { "toString": true }` survives the guard; `holodeck` does not.
- `JSON.parse` creates `toString`/`constructor` as **own enumerable** properties, and Zod's `z.record` preserves them, so this is reachable from a hand-edited (or forward-version) snapshot, not just theory.

**Blast radius (why MINOR, not higher).** No prototype pollution — the only value written is `true`, and `visited['__proto__'] = true` is ignored by the `__proto__` setter for non-object values. Consumers only read known ids (`selectExploreStatus` at `engine/store/selectors.ts:44` does `state.visited[c] === true` for registry ids), so an extra key changes no rendered output. It is a type-safety hole and a broken stated invariant, not a live defect.

**Suggested fix.** `const isVisitId = (v: string): v is AppView | ModalId => isAppView(v) || Object.prototype.hasOwnProperty.call(MODAL_IDS, v)` — and extend the existing test's fixture with a `"toString": true` key so the guarantee is actually pinned.

**Confidence.** High — the `in`-vs-`hasOwnProperty` behaviour is unambiguous, and the code path is exactly the one the test claims to cover.

---

## TYPESCRIPT-4 [MINOR] features/demo/ui/DemoExperience.tsx:810

**Claim.** The comment above `DemoErrorBoundary` claims it catches "any render throw in the screen subtree (screens, modals, drawer, overlays)". It does not: `activeScreen()`, `activeModal()`, `selectDrawerItems(store.getState())`, `selectDrawerStatus(...)`, `toMapData(...)` and `toCaseCards(...)` are all evaluated **in `DemoExperience`'s own render**, above the boundary element, so a throw in any of them escapes to the (non-existent) boundary above `DemoExperience` and white-screens the frame *and* the rail — precisely the outcome P0.1 set out to prevent.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:810-818` — the comment, then `<DemoErrorBoundary …><ScreenStage …>{activeScreen()}</ScreenStage>{activeModal()}`. JSX children are evaluated eagerly, so both function calls complete *before* the boundary element exists.
- View-model work also above the boundary: `:255` `toCaseCards`, `:259-262` `toMapData`, `:264` `selectDrawerStatus`, `:843` `selectDrawerItems(store.getState())` (inside the `WizardDrawer` props, still parent-render scope).
- React semantics: an error boundary catches throws from rendering **its descendants**; a throw during the parent's render is the parent's problem.

**Blast radius (why MINOR).** The realistic throw surface — screen and modal components' own render — *is* inside the boundary and is genuinely covered, so P0.1's headline behaviour works. What is inaccurate is the stated coverage, which will mislead the next person adding a mapper to the bridge.

**Suggested fix.** Either narrow the comment to "catches render throws from the screen/modal/overlay **components**; the bridge's own view-model computation is outside it", or (better, and cheap) pass the screen as a render prop / small child component so the switch executes under the boundary — e.g. `<DemoErrorBoundary …><ActiveScreen render={activeScreen} …>` with `ActiveScreen` calling `render()` in *its* render.

**Confidence.** High — pure React evaluation-order semantics, verified against the JSX in the file.

---

## Things checked and deliberately NOT filed

- **`engine/store/persistence.ts` overall.** Injected `StorageLike`, envelope + version + shape guard, discard-and-remove on any failure, debounced trailing-edge save with a correct `flush()`/`dispose()` pair (`save()` nulls the timer before writing; `flush()` only fires when one is pending; `dispose()` unsubscribes then flushes). No throw path reaches the demo. This is well-built.
- **Id-collision safety after rehydration.** Verified by hand: `createDemoStore` seeds `seq = maxIdSeq(initial)` and mints with `++seq` (`create-store.ts:182-183`); the bridge seeds `uiSeq = Math.max(uiSeq, maxIdSeq(snapshot) + 1)` and mints with `uiSeq++` (`DemoExperience.tsx:163`). Both first-mint at `max + 1` but under disjoint prefixes (`c`/`l`/`es`/`sc` vs `ui-s`/`ui-v`/`ui-c`), so no collision either with restored ids or with each other. `Math.max` also makes the reseed idempotent under a StrictMode double render.
- **Zod entering the engine.** The lane brief warns against adding Zod to internal demo types; a rehydrated sessionStorage blob is a genuinely new untrusted boundary with no existing hand-rolled parser, which is the documented exception. No prototype-pollution vector (`z.record` merge assigns `true`, and `__proto__ = true` is a no-op).
- **`z.ZodType<DomainType>` annotations** do catch the drift direction that matters (domain type gains a field → schema output no longer assignable → compile error). `persistedStateSchema` itself is unannotated, but `snapshotOf`'s and `loadSnapshot`'s return-object literals are typed `PersistedState`, so a shape change is still a compile error in both directions.
- **`view: z.string().refine(isAppView)`** — Zod 3's type-predicate `refine` overload already narrows to `AppView`, so `d.view as AppView` / `d.currentChapter as ChapterId` (`persistence.ts:326-327`) are redundant no-op casts, not type-hole casts. Not worth a finding.
- **Glass-token extraction (P0.5).** Every substitution checked against the literal it replaced across all ~25 call sites — byte-identical, including property order where a spread could have shadowed a later key. Nothing restyled.
- **Option lists.** `engine/content/form-options.ts` diffed field-by-field against the phone's `src/constants/FormOptions.ts:16-93` — labels, values, order and the PF-14 empty-string rule all match exactly. `toggleRecordingSchedule` reproduces `dvr-information.tsx:112-122`'s canonical `continuous, motion` ordering.
- **Ruled-on deliberate choices, not re-flagged:** map viewer-case / modal / drawer excluded from the snapshot, the 250 ms `pagehide` loss window, select placeholder copy, untokenized near-miss literals (deferred §29–§31); `DemoErrorBoundary` being a class; no free-text path on Export Info; the DVR-keeps vs Cameras-clears asymmetry; the dropped demo-only option values; `sessionStorage` over `localStorage`.
- **Out of lane, left to the owning lanes:** the `option-parity.test.tsx` full-suite timeout (`test-analyzer`), `onComplete`'s silent no-op on a null case id (`silent-failure-hunter`), the `FORM_OPTIONS` mutable-array / non-annotated-schema type shapes (`type-design-analyzer`), Zod's weight in the demo chunk and the boundary's a11y (`web-reviewer`).

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 3 |

Store-bridge integrity: **preserved**
Engine purity: **preserved**
Barrel + marketing/demo isolation: **preserved**
Determinism seam: **preserved**

**Verdict:** REVISE — fix TYPESCRIPT-1 before merge; the three MINORs are opportunistic (TYPESCRIPT-3 is a one-line change worth taking now).
