# Demo App — Fields by Screen

Scope: enumerates every user-facing form field on every data-entry screen of the Next.js + React interactive demo (`features/demo/`), with the real state/type keys from the engine model, for a field-parity audit against the React Native phone app.

## Source files read

- `features/demo/engine/types/index.ts` — domain/form types (`ScopeEntry`, `ArrivalDeparture`, `TimeOffsetData`, `CameraEntry`, `DvrInformation`, `ExportInformation`, `LocationForm`, `DemoCase`, `DemoLocation`, `GpsCoordinates`, `OcrProof`, `SyncResult`, `MediaItem`)
- `features/demo/engine/store/create-store.ts` — store state/actions (`NewCaseInput`, `NewLocationInput`, `CaptureState`, `createCase`, `addLocation`, `calculateOffset`, `generateExtractedScopes`, `generateNotes`, `applyImport`)
- `features/demo/engine/store/helpers.ts` — `setPath` dot-path writer
- `features/demo/engine/content/seed.ts` — `blankLocationForm()` defaults, seed case/location
- `features/demo/ui/screens/_shared.tsx` — shared `Field`, `SelectField`, `DateTimeField`, `Toggle`, `SectionCard`, `AddRowButton`, `ModalShell`
- `features/demo/ui/screens/field-options.ts` — `RESOLUTION_OPTIONS`, `FPS_OPTIONS`
- `features/demo/ui/screens/NewCaseModal.tsx`
- `features/demo/ui/screens/NewLocationModal.tsx`
- `features/demo/ui/screens/SubmissionScreen.tsx`
- `features/demo/ui/screens/RequestedScopeScreen.tsx`
- `features/demo/ui/screens/ArrivalDepartureScreen.tsx`
- `features/demo/ui/screens/TimeOffsetScreen.tsx`
- `features/demo/ui/screens/ExtractedScopeScreen.tsx`
- `features/demo/ui/screens/DvrInfoScreen.tsx`
- `features/demo/ui/screens/CamerasScreen.tsx`
- `features/demo/ui/screens/ExportInfoScreen.tsx`
- `features/demo/ui/screens/NotesScreen.tsx`
- `features/demo/ui/screens/CompletionScreen.tsx`
- `features/demo/ui/screens/OcrCaptureScreen.tsx`
- `features/demo/ui/screens/ImportModal.tsx`
- `features/demo/ui/inputs/DateTimeField.tsx`, `DateField.tsx`, `TimeField.tsx`, `Dropdown.tsx` (input widget behaviour)
- `features/demo/ui/DemoExperience.tsx` — modal/screen wiring, blank-form defaults, submit handlers

### Audit-wide notes

- **No required-field validation is enforced anywhere.** `Field` renders a red `*` when `required` is set (purely visual), but the submit handlers `submitCase` / `submitLocation` in `DemoExperience.tsx` call `createCase` / `addLocation` unconditionally — empty required fields still submit. "Required?" below reflects the visible `*` marker only.
- Date/time inputs bind to a store string `YYYY-MM-DD HH:MM:SS`. `DateTimeField` renders two buttons: a calendar bottom-sheet (date half) and an HH:MM:SS wheel (time half), both bound to the same value. `DateField` alone edits the date portion only.
- `SelectField` is a custom dropdown (placeholder `Select…`); options listed per field.
- `Toggle` is an on/off switch (`role="switch"`).
- Array screens persist to `LocationForm` via `updateField(path, value)` and add/remove rows; item shapes are documented per screen.
- Two `DvrInformation` keys are NOT exposed as editable on any screen: `recordingSchedule` (defaults to `'continuous'` in `blankLocationForm`) and `totalDvrRetention` (derived; the DVR screen shows a computed retention view rather than an input).

---

## New Case (NewCaseModal)

Overlay modal (`ModalShell` title "New Case"). Writes to `NewCaseInput` via local `caseForm` state, committed by `createCase` → new `DemoCase`. No `SectionCard` groupings. Submit button: "Create Case".

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Case Number | `caseNumber` | text | Yes (`*`, not enforced) | Placeholder `OCC2025-001`. Hint: "Locked once the case is created — it names the evidence folder." Default `''`. |
| Display Name | `displayName` | text | No | Placeholder "Friendly name". Default `''`. |
| Unit | `unit` | text | Yes (`*`, not enforced) | Placeholder "Investigation unit". Default `''`. |
| OIC Name | `oicName` | text | No | Placeholder "Officer in charge". Default `''`. Optional in `NewCaseInput`. |
| OIC Badge | `oicBadge` | text | No | Placeholder "Badge number". Default `''`. Optional in `NewCaseInput`. |

Note: `DemoCase` also carries `vcName`, `vcBadge` (not collected by this modal; default `''`), plus derived `status` (`'draft'`), `createdLabel`, `isSeed`, `locationIds`.

---

## New Location (NewLocationModal)

Overlay modal (`ModalShell` title "New Location"). Writes to `NewLocationInput` via local `locForm` state, committed by `addLocation` → new `DemoLocation`. No `SectionCard` groupings. Submit button: "Create Location".

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Location Name | `locationName` | text | Yes (`*`, not enforced) | Placeholder "e.g., Front entrance". Default `''`. |
| Business Name | `businessName` | text | No | Placeholder "Business at this site". Default `''`. |
| Street Address | `streetAddress` | text | No | Placeholder "Street address". Default `''`. |
| City | `city` | text | No | Placeholder "City". Default `''`. |
| — (Capture GPS coordinates) | `gps` | action button | No | "Capture GPS coordinates" button. In the demo `onCaptureGps` is a no-op (`() => undefined`); no GPS value is collected here. `DemoLocation.gps` is `GpsCoordinates & { source }` when set. |

Note: `addLocation`/`NewLocationInput` also accept `requesterName`, `requesterBadge`, `requesterPhone`, `requesterEmail`, `locationContact`, `locationPhone` (all optional), but this modal does not collect them — they are edited later on the Submission screen.

---

## Submission (SubmissionScreen)

First wizard screen. Edits the current `DemoLocation` fields (NOT under `form`) via `onChange`. Sections: **Case Information**, **Requester Information**, **Location Information**.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Case Number | `occNumber` (display of case `caseNumber`) | read-only text | No | Section "Case Information". Rendered as a dimmed static box (`opacity 0.6`); shows `—` when empty. Not editable. |
| Requester Name | `requesterName` | text | No | Section "Requester Information". Placeholder "Who requested video". |
| Requester Badge | `requesterBadge` | text | No | Placeholder "Badge number". |
| Requester Phone | `requesterPhone` | text | No | Placeholder "e.g., 905-555-1234". |
| Requester Email | `requesterEmail` | text | No | Placeholder "e.g., det@dept.ca". |
| Business Name | `businessName` | text | No | Section "Location Information". Placeholder "Business at this location". |
| Street Address | `streetAddress` | text | No | Placeholder "Street address". |
| City | `city` | text | No | Placeholder "City". |
| Contact Person | `locationContact` | text | No | Placeholder "On-site coordinator". |
| Contact Phone | `locationPhone` | text | No | Placeholder "Contact phone". |

Note: these are `DemoLocation` top-level keys (same ones the AI import maps into via `applyImport`).

---

## Requested Scope (RequestedScopeScreen)

Repeatable array `form.scopes: ScopeEntry[]`. Each row is a card "Scope N" with Add ("+ Add Scope") / Remove (Remove shown when >1 row). The input the time-offset math consumes.

**Array item shape — `ScopeEntry`:**

| Field label | Field key (per item) | Type | Required? | Notes |
|---|---|---|---|---|
| Start Date / Time | `startDateTime` | datetime (date + HH:MM:SS) | No | Bound to `YYYY-MM-DD HH:MM:SS` string. |
| End Date / Time | `endDateTime` | datetime (date + HH:MM:SS) | No | Bound to `YYYY-MM-DD HH:MM:SS` string. |
| Time Entry Type | `isActualTime` | toggle / 2-button segmented | No | Two buttons "Real Time" (`true`) / "DVR Time" (`false`). Drives offset math. |
| Cameras | `cameras` | text | No | Placeholder "e.g., 3, 4, 7" (free-text camera list). |

Also on item: `id` (generated). Default array: empty (`scopes: []`); the demo/import adds rows.

---

## Arrival / Departure (ArrivalDepartureScreen)

Repeatable array `form.arrivalDepartures: ArrivalDeparture[]`. Each row "Visit N" with Add ("+ Add Visit") / Remove. Optional chain-of-custody detail. Empty-state message: "No visits recorded — add one if you attended the site."

**Array item shape — `ArrivalDeparture`:**

| Field label | Field key (per item) | Type | Required? | Notes |
|---|---|---|---|---|
| Arrival | `arrival` | datetime (date + HH:MM:SS) | No | Bound to `YYYY-MM-DD HH:MM:SS` string. |
| Departure | `departure` | datetime (date + HH:MM:SS) | No | Bound to `YYYY-MM-DD HH:MM:SS` string. |

Also on item: `id` (generated). Default array: empty (`arrivalDepartures: []`).

---

## Time Offset (TimeOffsetScreen)

Captures DVR clock vs real time into transient `CaptureState` (`capture.*`), then `calculateOffset` commits to `form.timeOffset: TimeOffsetData`. Section: **DVR Time vs Actual Time**. Actions: "Use Current Time", "Calculate" (disabled until both date/times present), "Capture from DVR" (launches OCR). Below: SyncStatusCard, computed result, adjusted ranges, DST toggle.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| DVR Date / Time | `capture.dvrDateTime` | datetime (date + HH:MM:SS) | No (gates Calculate) | Default `''`. Calculate button disabled until both this and Actual are set. Committed to `timeOffset.dvrDateTime`. |
| Actual Date / Time | `capture.actualDateTime` | datetime (date + HH:MM:SS) | No (gates Calculate) | Default `''`. "Use Current Time" fills it. Committed to `timeOffset.actualDateTime`. |
| DVR Applies DST | `capture.dvrAppliesDST` | toggle | No | Default `false`. Shown only after a result exists. Committed to `timeOffset.dvrAppliesDST`. |

Derived/read-only (not inputs): Time Difference, direction, "DVR time is correct"; "Adjusted Time Ranges" cards (`reqStart/reqEnd/adjStart/adjEnd/cameras` per scope) computed by the offset math; `SyncStatusCard` (NTP/HTTP `SyncResult`). Capture also tracks `capture.method` (`'manual'|'ocr'`), `capture.ocr` (`OcrProof`), `capture.sync` (`SyncResult|null`) set programmatically, not via labelled inputs.

---

## Extracted Scope (ExtractedScopeScreen)

Repeatable array `form.extractedScopes: ScopeEntry[]`, auto-generated from the offset (`generateExtractedScopes`, always DVR-time, rounded to 5 min). Editable; "Regenerate from offset" button; Remove shown when >1 row. Empty-state: "Calculate the time offset first, then regenerate."

**Array item shape — `ScopeEntry` (subset editable here):**

| Field label | Field key (per item) | Type | Required? | Notes |
|---|---|---|---|---|
| Start (DVR time) | `startDateTime` | datetime (date + HH:MM:SS) | No | Auto-filled (rounded down to 5 min); editable. |
| End (DVR time) | `endDateTime` | datetime (date + HH:MM:SS) | No | Auto-filled (rounded up to 5 min); editable. |
| Cameras | `cameras` | text | No | Placeholder "Cameras exported". |

Item also carries `id` (generated) and `isActualTime` (forced `false` = DVR time; not exposed as an input here). Related flag: `form.extractedScopesPartial` (set when regeneration skipped non-canonical scopes; not user-editable).

---

## DVR Info (DvrInfoScreen)

Edits `form.dvr: DvrInformation`. Sections: **Basic DVR Details**, **Recording Configuration**, **Retention**.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| DVR Location | `dvrLocation` | text | No | Section "Basic DVR Details". Placeholder "e.g., Manager's office". |
| DVR Type / Brand | `dvrTypeBrand` | text | No | Placeholder "e.g., Hikvision, Dahua". |
| Serial / Model Number | `serialModelNumber` | text | No | Placeholder "Serial or model". |
| DVR Username | `dvrUsername` | text | No | Placeholder "e.g., admin". |
| DVR Password | `dvrPassword` | text | No | Placeholder "Login password". Plain text input (not masked). |
| Channels | `numberOfChannels` | text (numeric-ish) | No | Section "Recording Configuration". Placeholder "e.g., 16". Stored as string. |
| Active Cameras | `activeCameras` | text (numeric-ish) | No | Placeholder "e.g., 8". Stored as string. |
| Resolution | `resolution` | select | No | Options: `1280x720`, `1920x1080`, `2560x1440`, `3840x2160`, `Other` (`RESOLUTION_OPTIONS`). |
| Recording FPS | `recordingFps` | select | No | Options: `10fps`, `12fps`, `15fps`, `25fps`, `30fps` (`FPS_OPTIONS`). |
| First Recorded Date | `firstRecordedDate` | date (date-only) | No | Section "Retention". `DateField` (calendar). Drives derived total retention + per-scope overwrite countdown. |

Derived/read-only: "Total DVR Retention" (N days) and per-scope retention status (Safe/Warning/Critical/Overwritten) computed from `firstRecordedDate` + scopes (`RetentionView`), not inputs. Type-only (not on screen): `recordingSchedule` (default `'continuous'`), `totalDvrRetention` (derived string written for the PDF/notes).

---

## Cameras (CamerasScreen)

Repeatable array `form.cameras: CameraEntry[]`. Each row "Camera N" with Add ("+ Add Camera") / Remove. Empty-state: "No cameras yet — add the ones in the recovery."

**Array item shape — `CameraEntry`:**

| Field label | Field key (per item) | Type | Required? | Notes |
|---|---|---|---|---|
| Camera Name / Location | `cameraName` | text | No | Placeholder "e.g., Rear entrance". |
| Resolution | `resolution` | select | No | Options `RESOLUTION_OPTIONS` (same list as DVR Info). |
| FPS | `recordingFps` | select | No | Options `FPS_OPTIONS` (same list as DVR Info). |

Item also carries `id` (generated) and optional `gps?: GpsCoordinates` (not editable on this screen). Default array: empty (`cameras: []`).

---

## Export Info (ExportInfoScreen)

Edits `form.export: ExportInformation`. Single section: **Export Details**.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Export Media | `exportMedia` | select | No | Options: `USB Drive`, `External Hard Drive`, `DVD`, `SD Card`, `Cloud Link`. Default `''`. |
| File Type | `fileType` | select | No | Options: `Proprietary`, `MP4`, `AVI`, `MKV`, `Mixed`. Default `''`. |
| Total Size (GB) | `sizeGb` | text (numeric-ish) | No | Placeholder "e.g., 12". Stored as string. |
| Provided Via | `mediaProvidedVia` | select | No | Options: `Hand Delivered`, `Mailed`, `Secure Upload`, `Picked Up`. Default `''`. |
| Media player included | `mediaPlayerIncluded` | toggle | No | Default `false`. |

---

## Notes (NotesScreen)

Edits `form.notesText`. Auto-generated by `generateNotes`; editable textarea with "Regenerate" link.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Case notes | `notesText` | textarea (multiline) | No | aria-label "Case notes". Monospace, ~420px tall. "Regenerate" rebuilds from case data (occurrence #, address, requester, offset, requested scopes). Related flag `form.notesEdited` (set false on regenerate; not a user input). |

---

## Completion (CompletionScreen)

Review + export gate. **No editable form fields.** Shows a read-only summary (`CompletionSummary`: `occNumber`, `location`, `dvr`, `offset`, `scopes` count, `cameras` count, `export`) and action buttons: "Preview / Export PDF", "Preview Time-Offset Calibration" (when an offset exists), "Complete & Save". Post-completion variant shows "Back to Dashboard" / "Return to Cases".

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| _(none)_ | — | — | — | Display + actions only; no data entry. |

---

## OCR Capture (OcrCaptureScreen)

Launch-only full-screen overlay (`LaunchableId 'ocr'`), opened from Time Offset's "Capture from DVR". **No labelled form fields.** Two stages: (1) aim/camera stage with a capture button + "Use sample DVR clock" (no live camera in the demo; both run the real `cleanOcrText`/`parseTimestampFromText` pipeline over a sample DVR frame); (2) confirm stage showing parsed DVR time, OCR confidence, and the atomic actual time, with "Retake" / "Use this & calculate". On confirm it writes the parsed timestamp into `capture` state (`capture.dvrDateTime`, `capture.method='ocr'`, `capture.ocr: OcrProof`) and triggers the offset calculation — there is no direct text-entry field.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| _(none — capture pipeline)_ | `capture.dvrDateTime` / `capture.ocr` | derived (OCR) | No | Populated by the OCR parse, not typed. `OcrProof` = `{ rawText, cleanedText, parsedDateTime, confidence, imageDataUrl? }`. |

---

## Import (ImportModal)

Overlay modal (`ModalShell` title "Import Recovery Request"), `LaunchableId`/`ModalId 'import'`. Stages: picker (Pick a PDF / Paste text) → paste → progress → result. The AI extractor (`applyImport`) maps results into a new location's `DemoLocation` + `form.dvr` + `form.scopes` fields (documented above). The only direct user-entry control is the paste textarea.

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Paste the recovery request (email or form) | `imp.text` (local `ImportState`) | textarea (multiline) | No | aria-label "Request text". Placeholder "Paste any request text here…". In guided mode pre-seeded with `SAMPLE_REQUEST_DOC`; sandbox starts blank. Not a persisted form field — consumed by the extractor, which populates location/DVR/scope fields. PDF path uses a hidden `<input type="file" accept="application/pdf" multiple>` instead. |

Note: not-yet-built launchables `mediaCapture` and `audioRecording` (and the `mediaLibrary` modal id) render a "fast-follow" placeholder — no form fields exist for them yet. `MediaItem` (`id`, `kind`, `url`, `poster?`, `filename`, `caption`, `capturedAt`, `durationSec?`, `sample?`) is added programmatically via `addMedia`, not through a labelled data-entry form.
