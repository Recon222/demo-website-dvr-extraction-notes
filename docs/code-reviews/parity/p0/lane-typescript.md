# Lane: TypeScript — parity P0 (PR #29) · FIX-DELTA

- **Lane:** `typescript` (TS 5.7 strict · Next 15 App Router · React 19 · demo architecture contract)
- **Mode:** FIX-DELTA (re-review of the fix round; prior lane file overwritten)
- **Diff under review:** `git diff master...feat/parity-p0` — 74 files, +4915 / −206. Fix round = everything after merge commit `165de2b`: 32 files, +851 / −187.
- **Refs read:**
  - `.claude/agents/typescript-reviewer.md` (lane definition — authoritative)
  - `features/demo/CLAUDE.md` (binding architecture contract), root `CLAUDE.md`
  - `docs/code-reviews/parity/p0/p0-review.md` (vetted aggregate — R-1 … R-18)
  - prior `docs/code-reviews/parity/p0/lane-typescript.md` (TYPESCRIPT-1 … 4, now superseded)
  - every production file touched by the fix commits, read in full: `engine/store/persistence.ts`, `engine/store/create-store.ts`, `engine/store/selectors.ts`, `engine/types/index.ts`, `engine/content/form-options.ts`, `engine/content/seed.ts`, `engine/logic/import.ts`, `engine/index.ts`, `ui/DemoExperience.tsx`, `ui/screens/CompletionScreen.tsx`, `ui/screens/CamerasScreen.tsx`, `ui/screens/screenData.ts`, `ui/screens/field-options.ts`, `ui/inputs/Dropdown.tsx`, `ui/chrome/DemoErrorBoundary.tsx`, `app/demo/error.tsx`, `app/demo/page.tsx`, plus the consumers that close the loop (`engine/content/screens.ts`, `engine/content/explore.ts`, `ui/StoryRail.tsx`, `ui/controls/ExploreChecklist.tsx`, `ui/screens/CasesScreen.tsx`).

## Gates re-run on the fix head

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **clean**, zero diagnostics |
| `pnpm build` (`next build`) | **clean**; `/demo` First Load JS still **107 kB** (unchanged by the fix round) |
| `pnpm exec vitest run` (full suite) | **890/890 pass, 119/119 files**, 80 s — the R-6 timeout flake did not reproduce on a loaded runner |
| Store-bridge sweep (`grep -rn "useStore" features/demo/ui`) | **preserved** — only `DemoExperience.tsx` (11 hits). `DemoErrorBoundary.tsx`'s new `import type { AppView }` is the established type-only form (`StoryRail.tsx:4`, `ExploreChecklist.tsx:5` do the same). |
| Engine purity (`features/demo/engine/**`) | **preserved** — no React import, no `'use client'`, no module-scope `window`/`document` (the only `window` hits are prose in comments). `process.env.NODE_ENV` in the new R-14 breadcrumb matches the in-repo `generateExtractedScopes` precedent. |
| Barrel + marketing↔demo isolation | **preserved** — `app/demo/error.tsx` imports nothing from `@/features/demo`; no new deep engine/ui import from `app/`, `components/`, `lib/` (the pre-existing `app/api/extract/route.ts:20` is unchanged). |
| Determinism seam | **preserved** — no `Date.now()`/`Math.random()` added anywhere in the fix diff. `Dropdown`'s new `useId()` is React's deterministic id source, not a random one. |
| `any` / `as any` / non-null assertions / `console.log` added | **none** (grep over `^+` lines of the fix diff) |
| `isolatedModules` | correct — `engine/index.ts:11` is `export type *`, so the new `as const` **value** tuples in `engine/types` are deliberately not re-exported through the barrel; `persistence.ts:27-36` imports them by internal aliased path, which is the documented internal-module form. |

---

# Fix-delta — prior findings attributed to this lane

| Prior | Aggregate id | Verdict | Fix commit |
|---|---|---|---|
| TYPESCRIPT-1 | **R-1** (BLOCKER) | **FIXED** (with a new adjacent hole — see TYPESCRIPT-N1) | `5c319e4` |
| TYPESCRIPT-2 | **R-2** (MAJOR) | **FIXED** | `c78ee30` |
| TYPESCRIPT-3 | **R-7** (MINOR) | **FIXED** | `2f08830` |
| TYPESCRIPT-4 | **R-5** (MINOR) | **FIXED** | `02b6a6c` |
| lane gate observation | **R-6** (MINOR) | **FIXED** | `bb0f4a4`, `c78ee30` |

Cross-lane spot-checks in this lane's blast radius (`persistence.ts`, the boundary): **R-4 FIXED** (`cf96bb5`), **R-18 FIXED** (`65faab0`), **R-16 FIXED** (`4b4f06c`), **R-8 FIXED** (`c0b3607`), **R-10 FIXED** (`5ee1672`), **R-11 + R-17 FIXED by deletion** (`a0ec7f6`), **R-14 FIXED** (`cd6b539`), **R-15 FIXED** (`c03b92b`). Details below where the check was non-trivial.

---

## R-1 (was TYPESCRIPT-1) — [FIXED] location-scoped completion gate

**Verdict: FIXED.** Every leg of the original claim is closed:

- `features/demo/engine/types/index.ts:174` — `LocationForm.completed: boolean` (required) added; the sole constructor `blankLocationForm()` (`engine/content/seed.ts:63`) sets it to `false`, and `applyImport` spreads `...l.form` so it can never be clobbered by an import patch.
- `features/demo/engine/store/create-store.ts:224-228` — `completeCase` now stamps **only** `l.id === s.currentLocationId`, leaving siblings untouched, while still writing the case-level `status: 'complete'` (G4's payoff, explicitly retained per the review).
- `features/demo/ui/DemoExperience.tsx:726` — `isComplete={(currentLocation?.form.completed ?? false) && !reviewAgain}`. Case status no longer feeds the gate. Confirmed by re-tracing `switchLocation` (`create-store.ts:258-262`): opening a sibling of a completed case now yields `completed === false` and the review branch.
- The PDF one-shot is closed: `CompletionScreen.tsx:60` "Review / Export again" → `DemoExperience.tsx:738` `setReviewAgain(true)` → review branch with `onPreviewPdf`; `onComplete` (`:736`) clears the flag so re-completing returns to the confirmation.
- `reviewAgain` leak check (mine, not the review's): the flag is UI-only and reset at `DemoExperience.tsx:323` inside `openLocation`. I grepped every `switchLocation` call site — there is exactly one (`:324`, inside `openLocation`), reached from Dashboard (`:564`), Cases (`:572`), Map (`:747`) and the import result accordion (`:787`). So no location switch can carry a stale `reviewAgain` into a different location.
- The documented G3/G4 contradiction is resolved at `engine/store/selectors.ts:199` (`if (loc.form.completed) return 'complete'`), which `screenData.ts:80` consumes for the Cases row and `map/mapData.ts` for the pin.
- The null-`currentCaseId` no-op the review folded into R-1 is surfaced: `CompletionScreen.tsx:99-100` disables the button with a title hint.
- Snapshot versioning handled: `persistence.ts:62-63` `SNAPSHOT_VERSION = 2` / key `dvr-demo-state-v2`, with `locationFormSchema` gaining `completed: z.boolean()` (`:205`) — a v1 blob is discarded, not half-parsed.

**Residual (new, filed separately):** the *non-null but mismatched* case/location pair is now a silent no-op — see **TYPESCRIPT-N1**.

**Not re-flagged:** the "Case Complete" → "Location Complete" copy change is the orchestrator's declared deliberate choice.

## R-2 (was TYPESCRIPT-2) — [FIXED] Cameras custom-mode flags

**Verdict: FIXED**, all three parts of the review's suggested fix landed (`CamerasScreen.tsx:29-34, 36-54, 70-81`):

- `Record<string, boolean>` keyed by `CameraEntry.id`, read as `customResolutions[c.id]` / `customFps[c.id]`;
- functional updaters (`setCustomResolutions((prev) => …)`), so two same-tick changes can't clobber through a stale render closure;
- lazy `useState` initializers seeded from `isCustomResolution(c.resolution)` / `isCustomFps(c.recordingFps)` — the review-authorized divergence, matching `DvrInfoScreen.tsx:43-44`.

I checked the seeding for an over-reach: `isCustomResolution('')` returns `false` (`engine/content/form-options.ts:97`, the PF-14 empty-string guard), so a blank camera does **not** open in custom mode after a remount, and the `custom` sentinel is never stored (the select handler writes `''`, `:39`/`:49`). The clear-on-select phone asymmetry is preserved verbatim. Stale ids of removed cameras linger in the maps, which is harmless — `uiSeq` is strictly monotonic (`DemoExperience.tsx:117`) and reseeded past every rehydrated id (`:163`), so an id is never reused within or across a session.

## R-5 (was TYPESCRIPT-4) — [FIXED] boundary coverage overstated / no outer net

**Verdict: FIXED**, both halves:

- `app/demo/error.tsx` (new, 48 lines) is a `'use client'` route-segment boundary with the correct Next 15 `{ error, reset }` signature, colocated with `app/demo/page.tsx` so it wraps the dynamic client island. It imports nothing from `@/features/demo` (isolation intact) and stays chrome-free, consistent with `/demo` sitting outside `(default)`. `next build` renders `/demo` fine with it present. Its Tailwind tokens (`font-stmono`, `font-nacelle`, `font-jbmono`, `text-heading`/`body`/`muted`/`faint`) all resolve — verified against `app/css/style.css:12-34`.
- `DemoExperience.tsx:820-826` — the comment is now accurate: it names the in-frame boundary's real scope (screen/modal/drawer/overlay **component** renders, portals included) and explicitly excludes the bridge's own frame, pointing at the route-level net.

Recovery claim spot-checked: `reset()` remounts the segment → `DemoExperience` gets a fresh `storeRef` → `loadSnapshot` re-runs (`:162`), and the unmounting instance's effect cleanup (`:230` `handle.dispose()`) flushes the pending debounced write first, so the session genuinely survives recovery as the comment states.

## R-6 — [FIXED] heavy suites at the default timeout

`{ timeout: 20000 }` applied to `DemoExperience.persistence.test.tsx:14` (the primary), `.sandbox.test.tsx:56` and `:618`, `.map`, `.coordinates`, `DemoExperience.test.tsx`, and `vi.setConfig({ testTimeout: 20_000 })` at `option-parity.test.tsx:21` — the file this lane observed timing out. Full suite green at 890/890 on this machine.

## R-7 (was TYPESCRIPT-3) — [FIXED] `isVisitId` prototype-chain leak

`persistence.ts:288-289` is now `isAppView(v) || Object.prototype.hasOwnProperty.call(MODAL_IDS, v)`, with the rationale comment at `:285-287`. The `MODAL_IDS` exhaustive-`Record` construction is unchanged, so the type predicate is honest again.

## R-4 — [FIXED] (type-design lane; verified here because it is pure TS)

I independently checked all three devices in `persistence.ts:79-96`:

1. **Enum narrowing** — closed unions are single-sourced as `as const` tuples in `engine/types/index.ts` (`PROFILES`, `SYNC_METHODS`, `OFFSET_DIRECTIONS`, `CAPTURE_METHODS`, `MEDIA_KINDS`, `CASE_STATUSES`, `COORD_SOURCES`, `GPS_SOURCES`) with the domain types derived from them, and the schema consumes the same tuples. A narrower schema enum is now structurally impossible.
2. **Forgotten optionals** — `FullShape<T> = { [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined> }` used with `satisfies` on every shape literal (including the nested `gps` / `incidentCoordinates` / `media` objects). `satisfies` on an object literal enforces both "no missing key" (every key is `-?`) and "no excess key", so a dropped **or** stale optional is a compile error. A wrong element type is still caught because `ZodNumber._output` is not assignable to `string | undefined`. A required field declared `.optional()` is caught one level up by the `z.ZodType<DomainType>` annotation.
3. **`APP_VIEWS` exhaustiveness** — `EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true }` (`:275`) makes a new non-registry `AppView` variant a compile error at this line. Verified `AppView = ChapterId | LaunchableId | 'map'` (`create-store.ts:74`).

The header comment (`:79-93`) now states exactly what is and is not enforced, including the explicit carve-out for cross-field invariants.

## R-14 / R-15 / R-18 — [FIXED] (silent-failures / type-design; re-verified here)

- **R-14** `persistence.ts:449-462`: dev-gated `console.warn` + best-effort `removeItem` in the write catch. Nested `try` around `removeItem` keeps the "never throws into the demo" contract.
- **R-15** `persistence.ts:386-400`: selection-integrity pass. I re-derived the branch table — dangling ids drop to `null`; `restoredChapter` is repaired **before** `restoredView` reads it, so the launchable→chapter rewrite and the wizard→`'cases'` rewrite compose correctly; `'cases'` is a `ChapterId` and not a `WizardScreenId`, so the fallback can't re-trigger itself. Data is untouched — only the selection.
- **R-18** `persistence.ts:379-380`: casts replaced by plain annotations (`const view: AppView = d.view`), so a widened schema output stops compiling instead of being asserted.

---

# New findings (fix-introduced, inside the fix commits' blast radius)

## TYPESCRIPT-N1 [MAJOR] features/demo/ui/DemoExperience.tsx:727

**Claim.** The R-1 fix (`5c319e4`) added a cross-case guard to `completeCase` (`l.caseId === caseId`) but gated the button on a **null-only** predicate (`canComplete={!!currentLocation && !!currentCase}`). The store lets `currentCaseId` and `currentLocation.caseId` disagree, and in that state "Complete & Save" is enabled, marks the **wrong case** green, stamps **no** location, and shows **no** confirmation — a dead button with no feedback. This is the exact silent-no-op class R-1's fix list set out to close ("disable the button or surface why"); the fix closed the `null` arm and left the mismatched arm open.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:727` — `canComplete={!!currentLocation && !!currentCase}`: checks existence, never that they belong together.
- `features/demo/ui/DemoExperience.tsx:733-737` — `onComplete` calls `completeCase(store.getState().currentCaseId)`, i.e. the case id, not the open location's case.
- `features/demo/engine/store/create-store.ts:224-228` — the new stamp is `l.id === s.currentLocationId && l.caseId === caseId`; when the ids disagree, no location matches and `form.completed` stays `false`, so `isComplete` (`:726`) stays `false` and the confirmation never renders.
- **The store actively produces the mismatch.** `switchLocation` is the only action that keeps the pair coherent (`create-store.ts:261` sets both). The other two writers do not:
  - `createCase` (`:215`) sets `currentCaseId` and leaves `currentLocationId` pointing at a location of the *previous* case;
  - `addLocation` (`:250-254`) sets `currentLocationId` and never touches `currentCaseId` (the bridge calls it with `targetCaseId ?? currentCaseId`, `DemoExperience.tsx:355`, and `targetCaseId` is whichever case's "Add Location" button was pressed — `CasesScreen.tsx:70`, available on *any* expanded case).
- **The wizard is reachable without `switchLocation`.** The rail checklist jumps straight to any wizard screen: `engine/content/explore.ts` spreads `DRAWER_DEFS` (which includes `completion`) into `EXPLORE_ITEMS` with `jumpTo: d.id`, and `DemoExperience.tsx:875` wires `onJump` to `setView` — which changes no selection. The R-15 fix commit body itself calls rail-jump-to-Completion "a REAL flow, not just tampering".

**Repro (4 ordinary steps).** Create case A → add location L1 to A → create case B (`currentCaseId = B`, `currentLocationId` still L1) → rail-click "Completion" → "Complete & Save". Result: case **B** flips to Complete on the Cases/Dashboard cards (a case the visitor never worked on), L1 is not stamped, the screen does not change. Variant: on Cases, expand a non-current case and use its "Add Location"/"Import" button, then rail-jump — same state.

**Why this is a regression and not the pre-existing bug.** Before `5c319e4` the same state produced a *visible* (if wrong) confirmation, because `isComplete` read the case status the click had just flipped. With the location-scoped gate the click now produces nothing at all on the screen the visitor is looking at. Recoverable (returning through Cases → the location repairs `currentCaseId` via `switchLocation`), which is why this is MAJOR and not BLOCKER.

**Secondary, same lines.** The disabled hint `title="Open a location first"` (`CompletionScreen.tsx:100`) is wrong for the other reachable disable cause — a rehydrated snapshot with a dangling `currentCaseId` and a valid `currentLocationId` (`persistence.ts:391-393` drops them independently) disables the button while a location *is* open.

**Suggested fix.** Derive the case from the open location instead of trusting `currentCaseId`, in the bridge:

```ts
canComplete={!!currentLocation}
onComplete={() => {
  const loc = selectCurrentLocation(store.getState())
  if (loc) store.getState().completeCase(loc.caseId)
  setReviewAgain(false)
}}
```

That fixes the dead button *and* stops the wrong case going green, and it keeps `completeCase`'s cross-case guard meaningful. Alternatively (or additionally) restore the pair invariant at the source: have `addLocation` set `currentCaseId: caseId` alongside `currentLocationId`, and have `createCase` clear `currentLocationId`. Regression test: two cases, add a location to the non-current one, rail-jump to Completion, assert the confirmation appears and that the *other* case's status is still `'draft'`.

**Confidence.** High — every step traced in the current source (store actions, bridge wiring, rail registry, Cases screen buttons); no test covers a mismatched pair (`store.test.ts`'s `completeCase` cases and `sandbox.test.tsx`'s R-1 cases all go through `switchLocation`, which keeps the pair coherent).

---

## TYPESCRIPT-N2 [MINOR] features/demo/engine/index.ts:35

**Claim.** The R-11/R-17 fix (`a0ec7f6`) deleted `FORM_OPTIONS` from `engine/logic/import.ts`, which was `optionValues`' only production consumer. `optionValues` is now a dead export on the engine's public barrel — the lane's "dead export on `engine/index.ts` with no consumer" case, created by this fix round.

**Evidence.**

- `features/demo/engine/index.ts:35` — `optionValues` re-exported from the engine barrel.
- `features/demo/engine/content/form-options.ts:83` — the declaration.
- Grep over `features`, `lib`, `app` for `optionValues`: three hits only — the declaration, the barrel line, and `engine/content/__tests__/form-options.test.ts` (a test of the helper itself). Zero production callers; `import.ts:199-202` is now a tombstone comment where the consumer used to be.

**Blast radius (why MINOR).** No behavior change; it is public surface with no user, which is exactly what the barrel's "intentionally tiny public surface" note guards against, and it is the shape R-17 complained about (`optionValues(...): string[]` returns a *mutable* array) still sitting on the barrel after the constant that motivated it was deleted.

**Suggested fix.** Either drop `optionValues` from `engine/index.ts:35` (keeping it module-local for its test), or — if it is being kept as the deliberate API for P1's import consumer named in the tombstone comment — say so in the barrel and tighten the return to `readonly string[]` so the R-17 precedent lands with it.

**Confidence.** High — grep-verified, one line.

---

## Things checked and deliberately NOT filed

- **`selectLocationMapStatus` override vs the drawer dots.** A location completed without filling the two Completion Details fields now reads "Complete" on the Cases row while `selectDrawerStatus(...).completion` (`selectors.ts:179`) still reads `'empty'`. This is the documented split (the dot means "what's not yet filled", `selectors.ts:145-150`) and the row-vs-card consistency was the review's explicit ask in R-1. Not a defect.
- **Case card green with only one of N locations complete.** Pre-existing `completeCase` semantics, explicitly retained by R-1's fix instruction ("keep the case-level status write — that *is* G4's payoff"). Not re-flagged.
- **`reviewAgain` persisting across a chapter change within the same location** (complete → "Review / Export again" → drawer to Notes → back to Completion shows the review form). Harmless: the review form is the intended escape hatch and re-completing restores the confirmation. Not a defect.
- **`persistedStateSchema` (`persistence.ts:291-301`) carries neither the `z.ZodType<PersistedState>` annotation nor `satisfies FullShape<…>`** unlike every nested shape. A new *optional* top-level `PersistedState` key could be silently stripped. `PersistedState` is a `Pick<DemoState, …>` over nine all-required keys and both `snapshotOf` and `loadSnapshot` return `PersistedState`-typed literals (so a new required key is a compile error in two places), which makes this theoretical. Type-design's lane if anyone wants it belt-and-braces.
- **`loadSnapshot` drops a dangling `currentCaseId` without re-deriving it from a resolvable `currentLocationId`** (`persistence.ts:391-393`). Adversarial-only reachability (`snapshotOf` writes the pair atomically), so it stays a note under TYPESCRIPT-N1 rather than a finding.
- **`Dropdown`'s new `useId()`.** No hydration risk — `/demo` is `ssr: false` (`app/demo/page.tsx:7`); ids appear only in `id`/`aria-labelledby`, never in a selector. Determinism seam intact.
- **`app/demo/error.tsx` surfacing `error.message`.** Consistent with the in-frame boundary (`DemoErrorBoundary.tsx:120`); client-side messages carry no server secret (`OLLAMA_API_KEY` is read only in the route handler).
- **`__tests__` colocated under `app/demo/`.** Not a Next special filename, precedent exists at `app/(default)/__tests__/`, and `vitest.config.mts:24` (`include: ['**/*.{test,spec}.{ts,tsx}']`) does pick it up — the new test really runs.
- **Ruled-on deliberate choices, not re-flagged:** "Location Complete" copy (orchestrator-declared), the Cameras seeding divergence from the phone (review-authorized), the class-based in-frame boundary, `sessionStorage` per D2, `deferred.md` §29–§32.
- **Out of lane:** the weakened `getAllByText('Complete').length > 0` assertion in `sandbox.test.tsx` and the fact that no R-1 test drives the location switch through `openLocation` (both `test-analyzer`); the `title`/`disabled` a11y treatment and the `aria-labelledby` id wiring (`web-reviewer`); `optionValues`' mutable return type as a *type-design* question (`type-design-analyzer`) — N2 files it only as a dead barrel export.

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 1 |

Prior lane findings: **4/4 FIXED** (R-1, R-2, R-5, R-7) plus the R-6 gate observation.
Cross-lane spot-checks in this lane's blast radius: **R-4, R-8, R-10, R-11, R-14, R-15, R-16, R-17, R-18 all FIXED.**

Store-bridge integrity: **preserved**
Engine purity: **preserved**
Barrel + marketing/demo isolation: **preserved**
Determinism seam: **preserved**

**Verdict:** REVISE — the fix round is high quality and every prior lane finding is genuinely closed, but `TYPESCRIPT-N1` is a reachable dead button plus a wrong-case status write introduced by the R-1 fix's own guard, in the same honesty dimension R-1 governs. It is a ~5-line change in the bridge.
