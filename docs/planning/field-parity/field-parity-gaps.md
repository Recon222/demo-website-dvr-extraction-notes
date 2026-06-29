# Field Parity Gaps — Phone App vs Web Demo

Source of truth: the React Native + Expo **phone app** (`phone-fields.md`). Target being brought to parity: the Next.js + React **web demo** (`demo-fields.md`). This document contrasts the two field audits screen-by-screen and lists the work needed to bring the demo's data-entry fields up to phone parity.

Screens are matched by **purpose**, not exact name. Status legend:

- **MATCH** — present in both, same intent (key naming/nesting may differ; noted).
- **MISSING IN DEMO** — phone collects it, demo has no input/capture for it anywhere on the matching screen.
- **DEMO-ONLY** — demo has it, phone does not.
- **DIFFERS** — present in both but different type/option-set/behavior (explained inline).

Conventions used below:
- Derived/non-input fields (coordinate `accuracy`/`source`, formatted-address strings, computed retention, OCR metadata, generated IDs) are **excluded from the gap count** — they are not data-entry fields. They appear in a table row only where one app exposes them as an editable input and the other does not.
- The **MISSING-IN-DEMO count** at the bottom counts distinct phone field *keys* the demo cannot capture.

---

## New Case

Demo collects only the top section (case + OIC). The phone's **Video/Canvas Coordinator**, **Incident Location**, and **Notes** sections are absent.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Case Number | `caseNumber` | `caseNumber` | MATCH |
| Display Name | `displayName` | `displayName` | MATCH |
| Unit | `metadata.unit` | `unit` | MATCH (demo flattens nesting) |
| OIC Name | `metadata.oicName` | `oicName` | MATCH |
| OIC Badge | `metadata.oicBadgeNumber` | `oicBadge` | MATCH |
| Coordinator Name | `metadata.videoCoordinatorName` | `vcName` (type only, no input) | MISSING IN DEMO |
| Coordinator Badge | `metadata.videoCoordinatorBadgeNumber` | `vcBadge` (type only, no input) | MISSING IN DEMO |
| Business / Scene Name | `incidentBusinessName` | — | MISSING IN DEMO |
| Street Address (incident) | `incidentStreetAddress` | — | MISSING IN DEMO |
| City (incident) | `incidentCity` | — | MISSING IN DEMO |
| Latitude (incident) | `incidentCoordinates.latitude` | — | MISSING IN DEMO |
| Longitude (incident) | `incidentCoordinates.longitude` | — | MISSING IN DEMO |
| Notes | `notes` | — | MISSING IN DEMO |

`vcName`/`vcBadge` exist on the demo's `DemoCase` type but are never rendered as inputs (default `''`) — so they still need a UI to reach parity. Phone derived fields (`incidentCoordinates.accuracy`/`.source`, `incidentAddress`) are excluded.

---

## New Location

Phone's New Location modal embeds `LocationForm` plus Location Contact/Phone and functional GPS. Demo's modal omits contact fields (they live on the Submission screen instead) and its GPS button is a no-op.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Location Name | `locationName` | `locationName` | MATCH |
| Business / Location Name | `businessName` | `businessName` | MATCH |
| Street Address | `streetAddress` | `streetAddress` | MATCH |
| City | `city` | `city` | MATCH |
| GPS capture (lat/long) | `coordinates.latitude` / `.longitude` | `gps` button (`onCaptureGps` no-op) | DIFFERS (demo button exists but captures nothing) |
| Location Contact | `locationContact` | — (collected on Submission instead) | DIFFERS (placement) |
| Location Phone | `locationPhone` | — (collected on Submission instead) | DIFFERS (placement) |

Notes: `locationContact`/`locationPhone` **do exist in the demo app** (Submission screen + `NewLocationInput`), so they are a placement difference, not net-new work. The formatted `address` (derived) is excluded.

---

## Edit Incident Location  — *phone-only screen*

Phone has a dedicated `EditIncidentLocationModal` (`IncidentLocationForm`: `businessName→incidentBusinessName`, `streetAddress→incidentStreetAddress`, `city→incidentCity`, manual `latitude`/`longitude`). **The demo has no incident-location concept at all.** The fields are the same set already listed as MISSING under New Case, so this screen adds **no net-new field keys** — but the editor screen itself is absent.

---

## Duplicate Location — *phone-only screen*

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Location Name | `name` | — | MISSING IN DEMO (no duplicate/copy-to-new-address flow exists) |

---

## Submission

Closely aligned. Demo lacks Requester Unit and has no GPS capture in the Location section.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Case Number (read-only) | `occNumber` | `occNumber` (display of `caseNumber`) | MATCH |
| Requester Name | `requesterName` | `requesterName` | MATCH |
| Requester Badge | `requesterBadgeNumber` | `requesterBadge` | MATCH |
| Requester Unit | `requesterUnit` | — | MISSING IN DEMO |
| Requester Phone | `requesterPhone` | `requesterPhone` | MATCH |
| Requester Email | `requesterEmail` | `requesterEmail` | MATCH |
| Business / Location Name | `businessName` | `businessName` | MATCH |
| Street Address | `streetAddress` | `streetAddress` | MATCH |
| City | `city` | `city` | MATCH |
| GPS capture (lat/long) | `latitude` / `longitude` | — | DIFFERS (no GPS on demo location; same gap as New Location) |
| Contact Person | `locationContact` | `locationContact` | MATCH |
| Contact Phone | `locationPhone` | `locationPhone` | MATCH |

Phone derived fields (`coordinateAccuracy`, `coordinateSource`, `address`) excluded.

---

## Requested Scope

Full parity.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Start Date/Time | `startDateTime` | `startDateTime` | MATCH |
| End Date/Time | `endDateTime` | `endDateTime` | MATCH |
| Time Entry Type | `isActualTime` | `isActualTime` | MATCH |
| Cameras | `cameras` | `cameras` | MATCH |

---

## Arrival & Departure

Full parity (key names differ only).

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Arrival Date/Time | `arrivalDateTime` | `arrival` | MATCH |
| Departure Date/Time | `departureDateTime` | `departure` | MATCH |

---

## Time Offset

Full parity on the three inputs.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| DVR Date/Time | `dvrDateTime` | `capture.dvrDateTime` | MATCH |
| Actual Date/Time | `actualDateTime` | `capture.actualDateTime` | MATCH |
| DVR Applies DST | `dvrAppliesDST` | `capture.dvrAppliesDST` | MATCH |

Derived/programmatic fields on both (`timeDifference`/`timeOffsetData`, `captureMethod`/`capture.method`, sync metadata) excluded.

---

## Extracted (Video) Scope

Full parity.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Start Date/Time (DVR) | `startDateTime` | `startDateTime` | MATCH |
| End Date/Time (DVR) | `endDateTime` | `endDateTime` | MATCH |
| Cameras | `cameras` | `cameras` | MATCH |

---

## DVR Information

Demo lacks Recording Schedule; Resolution/FPS differ in option sets and the demo has no custom/"Other" free-text path.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| DVR Location | `dvrLocation` | `dvrLocation` | MATCH |
| DVR Type/Brand | `dvrTypeBrand` | `dvrTypeBrand` | MATCH |
| Serial/Model Number | `serialModelNumber` | `serialModelNumber` | MATCH |
| DVR Username | `dvrUsername` | `dvrUsername` | MATCH |
| DVR Password | `dvrPassword` | `dvrPassword` | MATCH (phone notes off spellcheck; neither masks) |
| Number of Channels | `numberOfChannels` | `numberOfChannels` | MATCH |
| Active Cameras | `activeCameras` | `activeCameras` | MATCH |
| Recording Schedule | `recordingSchedule` | `recordingSchedule` (type only, default `'continuous'`, no input) | MISSING IN DEMO |
| Resolution | `resolution` | `resolution` | DIFFERS (phone: 8 options incl. CIF/4CIF/960H + custom free-text; demo: 5 options, no custom) |
| Recording FPS | `recordingFps` | `recordingFps` | DIFFERS (phone: 1/5/10/15/20/25/30 + custom; demo: 10/12/15/25/30, no custom) |
| First Recorded Date | `firstRecordedDate` | `firstRecordedDate` | MATCH |

Derived (`totalDvrRetention`, `daysUntilOverwritten`) excluded — both apps compute, not input.

---

## Cameras

Demo lacks per-camera GPS capture entirely (`gps?` exists on the type but is not editable on the Cameras screen).

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Camera Name/Number | `cameraName` | `cameraName` | MATCH |
| Resolution | `resolution` | `resolution` | DIFFERS (same option-set/custom gap as DVR) |
| Recording FPS | `recordingFps` | `recordingFps` | DIFFERS (same option-set/custom gap as DVR) |
| Latitude | `latitude` | — | MISSING IN DEMO |
| Longitude | `longitude` | — | MISSING IN DEMO |
| Coordinate Accuracy | `coordinateAccuracy` | — | MISSING IN DEMO |
| Coordinate Source | `coordinateSource` (`'gps'`) | — | MISSING IN DEMO |
| Coordinate Captured At | `coordinateCapturedAt` | — | MISSING IN DEMO |

The five camera-GPS keys are one capture feature (`CameraGpsCapture` on phone) but five distinct stored keys.

---

## Export Information

All fields present; only the select option-sets differ.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Export Media | `exportMedia` | `exportMedia` | DIFFERS (phone: USB/Ext HDD/DVD/Cloud Upload/Network Transfer/Other; demo: USB/Ext HDD/DVD/SD Card/Cloud Link) |
| File Type | `fileType` | `fileType` | DIFFERS (phone: MP4/AVI/MOV/MKV/Proprietary/Other; demo: Proprietary/MP4/AVI/MKV/Mixed) |
| Size (GB) | `sizeGb` | `sizeGb` | MATCH |
| Media Player Included | `mediaPlayerIncluded` | `mediaPlayerIncluded` | MATCH |
| Media Provided Via | `mediaProvidedVia` | `mediaProvidedVia` | DIFFERS (phone: Hand Delivered/Mailed/Left with Contact/Electronic Transfer/Other; demo: Hand Delivered/Mailed/Secure Upload/Picked Up) |

No MISSING fields; demo option values `SD Card`, `Cloud Link`, `Mixed`, `Secure Upload`, `Picked Up` are DEMO-ONLY *option values* (not fields).

---

## Notes

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Case Notes | `notesSections` (+ `notesFreeText`) | `notesText` | DIFFERS (behavior) |

Both present a single editable, auto-generated notes textarea — functionally equivalent for the operator. The phone diffs edits back into per-section structured storage with per-section hashes (`notesSections`, `notesFreeText`, plus legacy `notes`/`notesManuallyEdited`/`notesGeneratedFromHash`); the demo stores one flat `notesText` string. Not a missing field — a storage/behavior difference.

---

## Completion

Phone collects two entry fields; the demo's Completion screen is display + actions only.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Date & Time Completed | `dateTimeCompleted` | — | MISSING IN DEMO |
| Completed By | `completedBy` | — | MISSING IN DEMO |

Both apps show a read-only case summary here; that part matches.

---

## OCR Capture / Confirmation

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| DVR Date/Time (correctable) | `dvrDateTime` (editable on confirm) | `capture.dvrDateTime` (read-only confirm) | DIFFERS |

Same OCR→offset pipeline in both. Difference: the phone's confirmation screen lets the operator **manually correct** the OCR'd DVR time before confirming; the demo confirm stage is read-only (Retake / Use this & calculate only). Detected-text/confidence/actual-time are display-only in both.

---

## Media Capture — *phone screen; demo placeholder ("fast-follow")*

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Filename | `filename` (→ `result.userFilename`) | — | MISSING IN DEMO |
| Notes / Caption | `caption` (→ `result.caption`) | — | MISSING IN DEMO |

Demo `mediaCapture` launchable renders a placeholder; `MediaItem` is only added programmatically (`addMedia`), no labelled entry form.

---

## Audio Recording — *phone screen; demo placeholder ("fast-follow")*

Same shared `MetadataForm` as Media Capture.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Filename | `filename` (→ `result.userFilename`) | — | MISSING IN DEMO |
| Notes / Caption | `caption` (→ `result.caption`) | — | MISSING IN DEMO |

---

## User Profile — *phone-only screen*

The demo has no analyst-identity/profile screen at all.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| Full Name | `name` | — | MISSING IN DEMO |
| Badge / ID Number | `badgeNumber` | — | MISSING IN DEMO |
| Start Date in Field | `timeInFieldStart` | — | MISSING IN DEMO |
| Start Date at Current Agency | `timeAtAgencyStart` | — | MISSING IN DEMO |
| Current Agency | `currentAgency` | — | MISSING IN DEMO |
| Unit / Section Name | `unitName` | — | MISSING IN DEMO |
| Qualifications & Education | `qualifications` | — | MISSING IN DEMO |

(Phone `agencyLogoUri` has no UI input even on the phone — excluded.)

---

## Import — *demo-only screen*

The phone has no AI/PDF import flow.

| Field (phone) | Phone key | Demo key | Status |
|---|---|---|---|
| — | — | `imp.text` (paste textarea) + PDF `<input type=file>` | DEMO-ONLY |

The paste textarea feeds the `applyImport` extractor, which populates location/DVR/scope fields. This is demo-only functionality and is **not** a parity gap to close on the phone side.

---

# Summary of gaps

## MISSING IN DEMO (the parity work to add) — grouped by screen

**New Case** (8 keys — the entire Video Coordinator + Incident Location + Notes blocks):
- `metadata.videoCoordinatorName` (Coordinator Name) — demo `vcName` type exists, no input
- `metadata.videoCoordinatorBadgeNumber` (Coordinator Badge) — demo `vcBadge` type exists, no input
- `incidentBusinessName` (Business/Scene Name)
- `incidentStreetAddress` (Street Address)
- `incidentCity` (City)
- `incidentCoordinates.latitude` (Latitude)
- `incidentCoordinates.longitude` (Longitude)
- `notes` (case Notes)

**Submission** (1 key):
- `requesterUnit` (Requester Unit)

**DVR Information** (1 key):
- `recordingSchedule` (Recording Schedule checkboxes — demo defaults to `'continuous'`, no input)

**Cameras** (5 keys — per-camera GPS capture, currently absent):
- `latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt`

**Completion** (2 keys):
- `dateTimeCompleted` (Date & Time Completed)
- `completedBy` (Completed By — phone auto-fills from User Profile `name`)

**Media Capture** (2 keys — screen is a demo placeholder):
- `filename`, `caption`

**Audio Recording** (2 keys — screen is a demo placeholder):
- `filename`, `caption`

**User Profile** (7 keys — screen does not exist in demo):
- `name`, `badgeNumber`, `timeInFieldStart`, `timeAtAgencyStart`, `currentAgency`, `unitName`, `qualifications`

**Duplicate Location** (1 key — flow does not exist in demo):
- `name`

**Total MISSING-IN-DEMO field keys: 29.**

> Not counted above (deliberately): the **Location GPS capture** gap (Submission + New Location). The phone's `LocationForm` captures `latitude`/`longitude`/`accuracy`/`source` via GPS/geocode; the demo's New Location modal has a **no-op** "Capture GPS coordinates" button and the Submission screen has no GPS input. Classified **DIFFERS** (a non-functional stub exists) rather than MISSING — but it is real functional parity work. `locationContact`/`locationPhone` are likewise DIFFERS (placement) — they exist in the demo (Submission), just not in the New Location modal.

## DEMO-ONLY (extras the demo has)

- **Import screen** (entire): `imp.text` paste textarea + PDF file upload, driving the `applyImport` AI extractor. No phone equivalent.
- **Export option values** (not fields): `SD Card`, `Cloud Link` (`exportMedia`); `Mixed` (`fileType`); `Secure Upload`, `Picked Up` (`mediaProvidedVia`).

## Screens present in one app but not the other

Phone-only (need building in demo):
- **Edit Incident Location** — incident-location editor (fields overlap New Case incident block; **no net-new keys**).
- **Duplicate Location** — duplicate / copy-submission-to-new-address flow.
- **User Profile** — analyst identity (7 fields).
- **Media Capture** — exists as a demo placeholder only.
- **Audio Recording** — exists as a demo placeholder only.

Demo-only:
- **Import** — AI/PDF recovery-request import (intentional demo feature; not a phone gap).

## Recommended work (prioritized by field additions)

1. **New Case** — biggest single-screen gap (8 fields). Add the Video/Canvas Coordinator section (2), the Incident Location section (5: business/street/city/lat/long), and case Notes (1). This unblocks Edit Incident Location too, since they share the same incident field set.
2. **User Profile** — whole screen missing (7 fields). Needed for `completedBy` auto-fill and report headers; build the profile modal/screen.
3. **Cameras** — add per-camera GPS capture (5 keys / one `CameraGpsCapture`-style control).
4. **Media Capture + Audio Recording** — promote the two placeholder launchables to real screens with the shared filename + caption form (2 fields each).
5. **Completion** — add the two entry fields (`dateTimeCompleted`, `completedBy`).
6. **Submission** — add `requesterUnit`; wire up functional Location GPS (also fixes the New Location no-op button — the DIFFERS items).
7. **DVR Information** — add `recordingSchedule` input; reconcile Resolution/FPS option sets and add the "Other/custom" free-text path (DIFFERS).
8. **Duplicate Location** — lowest priority; only meaningful once multi-location duplication is wanted in the demo.

### Smaller DIFFERS to reconcile (no new fields, behavior/options only)

- Resolution & FPS option-sets + missing custom/"Other" path (DVR + Cameras).
- Export Media / File Type / Provided-Via option-set divergence.
- OCR confirmation: demo confirm is read-only; phone allows manual DVR-time correction.
- Notes storage: demo flat `notesText` vs phone per-section structured (`notesSections`/`notesFreeText`).
- Required-field enforcement: phone enforces at modal/final-submission; the demo enforces nothing (visual `*` only).
