# Import Completion Screen (Slice B) — Test Specification

**Prerequisites:** [`04-...-architecture.md`](./04-completion-screen-architecture.md) · [`05-...-implementation-plan.md`](./05-completion-screen-implementation-plan.md)

## Conventions
- Vitest + jsdom + Testing Library; co-located `__tests__/`. Presentational components are tested by rendering with prop view-models (no store). The builder is pure (unit). The sandbox bridge mocks the orchestrator (no network/model) as today.

## `importResultData.test.ts` (pure builder)
- **Field grouping:** a full patch → three sections (Requesting Officer / Recovery Location / DVR Information) with the expected rows, in order.
- **Empty omission:** a patch with blank `requesterPhone`/`dvrPassword` → those rows absent; a patch with **all** DVR fields blank → the DVR section is absent entirely.
- **Title fallback:** `businessName` present → title = business; blank business + a `filename` → title = filename; both blank → "Imported location".
- **Scopes:** `timeFrames` → `ScopeRow`s with `label "Scope 1/2…"`, `range "<start> → <end>"` (canonical dates from Slice A), `isActualTime` mapped, cameras carried; a frame missing an end → range falls back to the present side (or "—").
- **Warnings + counts:** warnings passed through; `fieldCount`/`timeFrameCount` carried; `caseNumber`/`locId` carried.

## `ImportResultBody.test.tsx` (presentational)
- Renders the section headings + the rows that have values; does **not** render a dropped/empty section.
- Renders scope rows with the ACTUAL/DVR tag and the canonical range text.
- Renders the case number + the "N fields · M time range(s)" stat.
- With warnings → the collapsible "N automatic adjustment(s)" shows the `reason`s; with none → no disclosure.

## `ImportResultAccordion.test.tsx` (presentational)
- Collapsed: shows title + case number, `aria-expanded=false`, body hidden.
- `onToggle` fires on header click; when `open`, the body (a section heading) is visible and **Open location** is present.
- Clicking **Open location** calls `onOpenLocation`.

## `ImportModal` completion stage (extend `modals.test.tsx`)
- **Single success:** `result={{ ok:true, locations:[view], failures:[] }}` → "Import complete" + a section heading + **Open location** + **Done**; **Open location** calls `onOpenLocation`.
- **Batch success:** two `locations` + `failures:[]` → summary "Imported 2 of 2"; two collapsed accordions; expanding one reveals its body + its own Open location; single-open (expanding the second collapses the first).
- **Partial batch:** one location + one failure → summary "1 of 2" + the failure row (filename + error) shown.
- **Total failure:** `{ ok:false, error }` (or `locations:[]` + failures) → error view + **Try again**.
- **Notice:** `notice` present (degraded fallback) → the notice renders.

## `DemoExperience.sandbox.test.tsx` (extend, orchestrator mocked)
- **PDF single:** stub `runPdfImport` → ok with a patch → a Location is created **and** the completion shows the location's detail (a section heading / a mapped field value), and **Open location** opens it (store currentLocation switches / modal closes).
- **PDF batch:** two ok runs → two accordions; **Open location** on the second opens that location.
- **Failure:** stub → `{ ok:false, error }` → no Location; failure shown.
- Guided-determinism + empty-paste + cancel tests from Slice-A remain green (result-shape change only).

## Coverage
- `importResultData.ts` builder fully covered (pure). Presentational components are behaviorally covered (not in the coverage gate — `features/demo/ui/**` is excluded). Global gate ≥80% holds (no engine changes).

## Out of scope
Progress/picker stage rendering (unchanged). No new engine tests (no engine changes).
