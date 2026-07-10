# Demo Explorer — Test Specification

This document defines every test that must be written **before implementation begins**, phase by phase. The **Implementation Plan** (`02-demo-explorer-implementation-plan.md`) is the single source of truth for technical details; the **Architecture Document** (`01-demo-explorer-architecture.md`) defines the contracts. Write each phase's tests red, implement to green, **commit red + green together**.

Repo conventions apply throughout: Vitest + jsdom + RTL, co-located `__tests__/`, engine tested pure (create a store, call actions, assert `getState()`), UI tested via props/callbacks, `DemoExperience` via the injected `store` prop. Coverage thresholds (80%) apply to `features/demo/engine/**` — the new `explore.ts` + store changes fall under them.

## Test File Map

| Test file | Phase(s) | Fate |
|-----------|----------|------|
| `engine/director/__tests__/runner.test.ts` | 1 | **DELETED** with the director |
| `ui/__tests__/TouchIndicator.test.tsx` | 2 | **DELETED** with the component |
| `engine/store/__tests__/*` + `test-utils.ts` | 1 | Rewritten: no `seedGuided`/`mode`/`isSeed` |
| `engine/__tests__/engine-flow.test.ts` | 1 | Rewritten: sandbox-only flow |
| `engine/__tests__/barrel.test.ts` | 1 | Updated: no director exports |
| `ui/__tests__/DemoExperience.test.tsx` | 1–2 | Rewritten: boot/URL/beat blocks removed |
| `ui/__tests__/DemoExperience.sandbox.test.tsx` | 2 | Becomes the core suite; mode-toggle cases removed |
| `ui/__tests__/StoryRail.test.tsx` | 2, 5, 6 | Rewritten for the single-branch rail |
| `ui/__tests__/PhoneFrame.test.tsx` | 2 | `interactive`-gate cases removed |
| `engine/content/__tests__/explore.test.ts` | 4 | NEW |
| `ui/controls/__tests__/ExploreChecklist.test.tsx` | 5 | NEW |
| `ui/controls/__tests__/ExitDialog.test.tsx` | 6 | NEW |
| `ui/__tests__/backdrop.test.ts` | 7 | NEW — source-structural (reads `demo.css` + `DemoExperience.tsx`, the marketing `background-scan.test.ts` pattern, since jsdom loads no CSS) |

**Shared infrastructure:** the existing `engine/store/__tests__/test-utils.ts` and `ui/__tests__/test-utils.tsx` factories are updated in Phase 1 (drop seed/mode helpers); all new tests consume them. No network mocking is needed anywhere in this feature (import tests already stub at the `run-import` seam and are untouched).

---

## Phase 1 Tests — Engine teardown

**Files:** store tests, `engine-flow.test.ts`, `barrel.test.ts`.

1. `describe('boot state')` →
   - `it('initial state is the empty sandbox: view cases, no cases/locations, no modal')`
   - `it('reset() returns a dirtied store to the same empty boot state')`
   - `it('store exposes no seedGuided or setMode action')` — type-level via `satisfies`/runtime key assertion (pins the deletion)
2. `describe('chapter flow (CHAPTERS registry)')` →
   - `it('CHAPTERS starts splash→dashboard→cases then the 10 wizard screens in order')`
   - `it('nextChapter/prevChapter walk the wizard order and null at the ends')` (existing cases, re-pointed at the rename)
3. `describe('closeLaunch return anchor')` →
   - `it('launch(ocr) then closeLaunch() returns view to the pre-launch chapter')` — pins that `currentChapter` survived the teardown for its real job
4. `barrel.test.ts` → `it('engine barrel no longer exports runner/beats/director types')`
5. Sweep assertion (engine-flow): `it('a full sandbox pass works: createCase → addLocation → wizard fields → calculateOffset → notes')` — the existing flow test, minus seed/mode preamble.

## Phase 2 Tests — UI teardown

**Files:** `DemoExperience.test.tsx`, `DemoExperience.sandbox.test.tsx`, `StoryRail.test.tsx`, `PhoneFrame.test.tsx`.

1. `describe('DemoExperience boot')` →
   - `it('renders the Cases screen on mount with an empty library')`
   - `it('phone is interactive immediately (New Case opens the modal on tap)')`
   - `it('renders no mode toggle, no step caption, no Back/Next rail nav')` — `queryByText(/guided tour|free explore|step \d+ of/i)` all null
2. `describe('narration follows the screen')` →
   - `it('navigating to dashboard swaps the rail narration to the dashboard chapter')`
   - `it('map view shows the map narration while currentChapter is unchanged')` (existing case, survives)
3. `describe('StoryRail (single branch)')` →
   - `it('renders eyebrow, title, paras, bullets from the narration prop')`
   - `it('renders the tip card whenever narration.tip is present')` — tips are always-on now
   - `it('renders the standing “You’re driving” card')`
4. `describe('PhoneFrame')` → existing chrome cases minus the pointer-events gate; `it('screen subtree never sets pointer-events none')`

## Phase 4 Tests — Visited tracking + registry

**Files:** store tests, `explore.test.ts`, selector tests in `engine/store/__tests__/`.

1. `describe('visited tracking')` →
   - `it('boot marks cases visited (you start there)')`
   - `it('setView records each view exactly once (idempotent re-visits)')`
   - `it('launch(ocr) records ocr; openModal(import) records import')`
   - `it('reset() clears visited back to the boot record')`
2. `describe('EXPLORE_ITEMS registry')` →
   - `it('every jumpTo is a known AppView and every covers id is a known view/modal/launchable')` — cross-registry integrity, the guard that makes future additions safe
   - `it('ids are unique and labels non-empty')`
   - `it('numbering derives from array position (01…N, zero-padded)')` via `selectExploreStatus`
3. `describe('selectExploreStatus')` →
   - `it('marks an item visited when ANY covered id is visited (grouping)')`
   - `it('ignores visited ids no registry item covers, and unlists nothing')` (registry may lead/lag screens)
   - `it('returns items in registry order with stable ids')`

## Phase 5 Tests — Checklist UI

**File:** `ExploreChecklist.test.tsx` (+ one integration case in `DemoExperience.sandbox.test.tsx`).

1. `describe('ExploreChecklist')` →
   - `it('renders one numbered row per item, in order')`
   - `it('lit LED + “visited” aria-label on visited rows; unlit + “not visited yet” otherwise')`
   - `it('clicking a row calls onJump with the item’s jumpTo view')`
   - `it('marks the active view’s row')`
2. Integration (`DemoExperience`) →
   - `it('visiting the Map lights the Map row')` — drive `setView('map')` through the UI, assert the row's lit state
   - `it('clicking the unlit Map row navigates the phone to the map (zero-case picker shows its empty state and is escapable via the tab bar)')`

## Phase 6 Tests — Exit dialog

**File:** `ExitDialog.test.tsx` (+ integration in `DemoExperience.sandbox.test.tsx`).

1. `describe('ExitDialog')` →
   - `it('renders the unseen items as numbered rows')`
   - `it('Keep exploring calls onStay; Escape and backdrop click also call onStay')`
   - `it('Leave anyway is an anchor with href = leaveHref')`
   - `it('has role dialog + aria-modal')`
2. Integration →
   - `it('Back to site with unseen items opens the dialog instead of navigating')`
   - `it('Back to site with everything visited navigates directly (no dialog)')`

## Phase 7 Tests — Backdrop (source-structural)

**File:** `ui/__tests__/backdrop.test.ts` — reads `ui/demo.css` + `DemoExperience.tsx` source, mirroring the marketing `background-scan.test.ts` approach and philosophy (pin relationships, not tunable values).

1. `it('demo root carries the ink base and the 46px carolina grid in CSS, not inline')` — demo.css has `[data-demo-root]` with `#04070d` + both `repeating-linear-gradient` axes; `DemoExperience.tsx` no longer inlines `backgroundImage`
2. `it('the glow is a ::before anchored off the phone column with knobs')` — `[data-demo-root]::before` exists with `pointer-events: none`, negative z-index, `var(--demo-glow-left)`, radial `43,140,193`
3. `it('the root isolates so the negative-z glow cannot vanish behind its own background')` — `isolation: isolate`
4. `it('no scan markup or scan classes exist on the demo page')` — `DemoExperience.tsx` contains no `case-scan`

## Coverage & Quality Gates

| Layer | Expectation |
|-------|-------------|
| `engine/**` (store, explore, selectors) | Repo-enforced 80% thresholds keep applying; new engine code fully covered by Phases 1/4 blocks |
| UI components | Behavioral coverage (interactions + a11y roles), not styling |
| Every phase | `tsc --noEmit` + full `pnpm test` green before its commit; `pnpm build` at each PR boundary |

Checklist before calling any phase done: tests were written first and observed red for the right reason; red + green land in the same commit; no test depends on another's execution; deleted features have no orphaned test utilities left behind.
