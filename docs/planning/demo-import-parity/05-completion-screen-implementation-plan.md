# Import Completion Screen (Slice B) — Implementation Plan

**Prerequisite:** [`04-completion-screen-architecture.md`](./04-completion-screen-architecture.md). Tests: [`06-completion-screen-test-spec.md`](./06-completion-screen-test-spec.md).

## Phase 1 — View-model builder (pure)
**New `ui/screens/importResultData.ts`:**
```ts
export interface DetailRow { label: string; value: string }
export interface ScopeRow { label: string; range: string; isActualTime: boolean; cameras: string }
export interface ImportedLocationView { locId: string|null; title: string; caseNumber: string
  fieldCount: number; timeFrameCount: number
  sections: { heading: string; rows: DetailRow[] }[]; scopes: ScopeRow[]; warnings: { field: string; reason: string }[] }

export function buildImportedLocationView(
  patch: MappedImport, caseNumber: string, warnings: { field: string; reason: string }[],
  locId: string | null, filename?: string,
): ImportedLocationView
```
- `title = patch.businessName || filename || 'Imported location'`.
- Sections (drop empty rows; drop a section whose rows are all empty):
  - **Requesting Officer:** Name `requesterName`, Badge `requesterBadgeNumber`, Phone `requesterPhone`, Email `requesterEmail`.
  - **Recovery Location:** Offence `_import.offenceType`, Business `businessName`, Street `streetAddress`, City `city`, On-site contact `locationContact`, Contact phone `locationPhone`.
  - **DVR Information:** Make/Model `_import.dvrTypeBrand`, Retention `_import.totalDvrRetention`, Video monitor `_import.hasVideoMonitor`, Username `_import.dvrUsername`, Password `_import.dvrPassword`.
- `scopes = _import.timeFrames.map((t,i) => ({ label:`Scope ${i+1}`, range: t.startDateTime && t.endDateTime ? `${t.startDateTime} → ${t.endDateTime}` : (t.startDateTime || t.endDateTime || '—'), isActualTime: t.isActualTime, cameras: t.cameras }))`.
- `fieldCount`/`timeFrameCount` passed through (from the run result).
**Gate:** `importResultData.test.ts` green; `tsc`.

## Phase 2 — Presentational `ImportResultBody`
**New `ui/screens/ImportResultBody.tsx`** — props `{ view: ImportedLocationView }`:
- Header: title + monospace case number + a small "N fields · M time range(s)" stat line.
- Each `view.sections` → a glass card: heading (uppercase, small) + `DetailRow`s (label left/dim, value right; credentials/phone/email monospace). No empty rows (builder already dropped them).
- `view.scopes` → "Extraction scopes" card: per row a numbered badge, an ACTUAL/DVR tag (green/amber), `range` (monospace), and a camera line when present.
- `view.warnings.length > 0` → a `<details>` "N automatic adjustment(s)" listing `reason`s.
- Uses the existing demo palette/inline styles (match `ImportModal`). Decorative SVGs `aria-hidden`.
**Gate:** `ImportResultBody.test.tsx` green; `tsc`.

## Phase 3 — Presentational `ImportResultAccordion`
**New `ui/screens/ImportResultAccordion.tsx`** — props `{ view; open; onToggle; onOpenLocation }`:
- Collapsed header (button, `aria-expanded`): status dot + title + case number + chevron.
- Expanded: `<ImportResultBody view={view} />` + a full-width **Open location** button (`onOpenLocation`).
**Gate:** `ImportResultAccordion.test.tsx` green; `tsc`.

## Phase 4 — Wire the completion stage in `ImportModal`
**Edit `ui/screens/ImportModal.tsx`:**
- Replace `ImportResult` success shape with `{ ok:true; locations: ImportedLocationView[]; failures: {filename,error}[]; notice? }` (import the type from `importResultData`).
- Result stage:
  - `!result.ok` → existing error view (Try again).
  - `locations.length === 0` → failures view (the error / failures list + Try again).
  - `locations.length === 1` → header "Import complete" + `<ImportResultBody view={locations[0]} />` + `notice` + footer **Open location** (`onOpenLocation(locId)`) + **Done** (`onCancel`).
  - `locations.length > 1` → summary header ("Imported X of Y" + success/fail chips) + a single-open accordion list (`ImportResultAccordion`, local `openIndex` state) + failures card + **Done**.
- Props: replace `onOpen()` with `onOpenLocation(locId: string|null)`; keep `onCancel`/`onRetry`. Keep `aria-live` region.
**Gate:** `ImportModal` tests updated/green; `tsc`.

## Phase 5 — `DemoExperience` wiring
**Edit `ui/DemoExperience.tsx`:**
- `ImportTally`: replace `firstFieldCount/firstTimeFrames/firstName` (+ keep `notice`, `failures`, `lastLocId`) with `locations: ImportedLocationView[]`.
- In `processPdfFiles` / `runPasteImport` success branches: `tally.locations.push(buildImportedLocationView(res.patch, currentCase?.caseNumber ?? '—', res.warnings.map(w=>({field:w.field,reason:w.reason})), locId, res.filename))`.
- `finishImport`: build the `{ ok:true, locations, failures, notice }` result (or `{ok:false,error}` when `locations.length===0`).
- Modal render: `onOpenLocation={(locId) => { if (locId) openLocation(locId); store.getState().closeModal() }}` (replaces `onOpen`). Keep `currentCase` in scope (already derived).
**Gate:** sandbox bridge tests updated (the import tests now assert the rich result); `tsc`; full suite + build + coverage.

## Appendix A — files
- **New:** `ui/screens/importResultData.ts`, `ui/screens/ImportResultBody.tsx`, `ui/screens/ImportResultAccordion.tsx` + `__tests__/*`.
- **Edit:** `ui/screens/ImportModal.tsx`, `ui/DemoExperience.tsx`, `ui/screens/__tests__/modals.test.tsx`, `ui/__tests__/DemoExperience.sandbox.test.tsx`.
- No deps, no engine changes.

## Appendix B — commit cadence
One commit per phase (builder · body · accordion · modal wiring · DemoExperience+tests). Group only where a phase's component + its test belong together.
