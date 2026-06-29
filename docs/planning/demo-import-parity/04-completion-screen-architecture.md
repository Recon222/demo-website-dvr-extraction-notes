# Import Completion Screen (Slice B) — Architecture & Design

**Siblings:** [`05-completion-screen-implementation-plan.md`](./05-completion-screen-implementation-plan.md) · [`06-completion-screen-test-spec.md`](./06-completion-screen-test-spec.md)
**Part of:** the "import parity" line. Slice A (date normalization) is merged (PR #16). Slice B = this — the rich completion UI.

## Problem

After a successful import the demo shows a thin result: a green check, "Location created", "Extracted N fields and M time range(s)", the business name, and one **Open location** button (or a bare "X of Y" line for batch). The phone app shows a much richer **"Import Complete"** screen. This slice brings it to parity.

The enabling gap: `DemoExperience.finishImport` currently **collapses each run to counts + the first name** and discards the per-location `patch`. The data we need is already produced — the success `ImportRunResult` carries the full `MappedImport` patch, `warnings`, `fieldCount`, `timeFrameCount`, `locId`, `filename` — we just stop keeping it. (And thanks to Slice A, the scope dates in that patch are now canonical, so the screen shows real dates + any disambiguation/year-correction warnings.)

## What the phone shows (target)

- **Single location:** a sectioned detail card — *Requesting Officer* (name/badge/phone/email), *Recovery Location* (business/street/city/contact/contact-phone), *DVR Information* (make-model/retention/monitor/credentials — section omitted if all empty), *Extraction Scopes* (numbered rows: ACTUAL/DVR-time tag, start → end, camera list), and a collapsible *Warnings* list. **Empty fields are omitted entirely.** Header = location name + case number. Footer = **Open location** + **Done**.
- **Batch:** a summary header ("Imported X of Y" + success/fail chips), one **accordion per location** (collapsed = name + case# + status dot; expanded = the same detail body + its own **Open location**), a compact **failures** card (filename + error), single **Done** footer. Single-open accordions.

## Design decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Retain per-location detail | `finishImport` accumulates one entry per successful run (the `patch` + meta), not counts | The data already exists per run; collapsing it is the only blocker. |
| 2 | View-model | A **pure builder** `buildImportedLocationView(patch, caseNumber, warnings, locId, filename)` → display sections | Decouples the presentational components from the engine `MappedImport` shape; pure + unit-testable. Lives in `ui/screens/importResultData.ts` (same pattern as `screenData.ts`). |
| 3 | Components | Presentational **`ImportResultBody`** (one location's sections) + **`ImportResultAccordion`** (collapsed header + expandable body + Open-location) | Mirrors the phone's `ImportResultBody` / `BatchResultDetails` split; dumb, prop-driven, testable. |
| 4 | Result model | `ImportResult` success becomes `{ ok:true; locations: ImportedLocationView[]; failures: {filename,error}[]; notice? }` (single = 1 entry) | One shape for single + batch; the completion stage branches on `locations.length`. |
| 5 | Visual language | Demo's dark-glass inline `CSSProperties` (the existing modal/picker look), **not** a port of the RN styles | Same information architecture, demo's aesthetic. |
| 6 | Scope dates | Show the canonical dates from Slice A; surface warnings (incl. `year_correction`/`datetime`) | Slice A made these real; this is where they pay off. |
| 7 | Store-bridge | `DemoExperience` stays the only store-touching component; the new components are presentational; **Open location** → existing `openLocation(locId)` | Unchanged architecture. |

## Data shapes

```ts
// ui/screens/importResultData.ts
interface DetailRow { label: string; value: string }            // empty values dropped by the builder
interface ScopeRow  { label: string; range: string; isActualTime: boolean; cameras: string }
interface ImportedLocationView {
  locId: string | null
  title: string                 // businessName || filename || 'Imported location'
  caseNumber: string
  fieldCount: number
  timeFrameCount: number
  sections: { heading: string; rows: DetailRow[] }[]   // Requester / Recovery Location / DVR (non-empty only)
  scopes: ScopeRow[]
  warnings: { field: string; reason: string }[]
}

// ImportModal.tsx
type ImportResult =
  | { ok: true; locations: ImportedLocationView[]; failures: { filename: string; error: string }[]; notice?: string }
  | { ok: false; error: string }
```

Flow: `finishImport` builds an `ImportedLocationView` per successful run (`buildImportedLocationView(res.patch, currentCase.caseNumber, res.warnings, locId, res.filename)`), collects failures, sets the result. `ImportModal` renders: `locations.length === 1` → `ImportResultBody` + footer; `> 1` → summary header + `ImportResultAccordion[]` + failures + Done; `0` successes → the failure/error view.

## Integration points
- **New:** `ui/screens/importResultData.ts` (builder + types), `ui/screens/ImportResultBody.tsx`, `ui/screens/ImportResultAccordion.tsx` (+ co-located tests).
- **Edit:** `ui/screens/ImportModal.tsx` (result model + completion stage rendering), `ui/DemoExperience.tsx` (`finishImport`/`ImportTally` retain views + build them; the file-pick/paste loops already capture `res`).
- No new dependencies. No engine changes (the patch already has everything).

## Out of scope
The progress/picker stages (unchanged). The retention/DVR derivation. Editing imported fields inline (the wizard already allows edits via *Open location*). The "Imported in Xs" timing line (optional; skipped unless requested).
