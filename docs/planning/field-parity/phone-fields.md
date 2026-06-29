# Phone App — Fields by Screen

Scope: Every data-entry field on every screen of the React Native + Expo phone app (`extraction_case_notes_react_native_expo`), keyed to its real state/schema key, for a field-parity audit against the sibling web demo. Field keys, types, and required/optional status are taken from the actual screen components, the Zod schemas, and the Zustand store/type definitions — not inferred.

## Validation model (read first)

The wizard uses **relaxed Zod schemas**: every per-screen schema marks all fields optional so the user can move freely between steps (`src/lib/schemas/form-schema.ts`). Hard requirements are enforced in only two places:

- **`finalSubmissionSchema`** (Completion screen, on Complete & Save): requires `occNumber` (non-empty), `address` (non-empty), and **at least one `scope` with both `startDateTime` and `endDateTime`**.
- **Modal-level validators** (New Case, New Location, etc.): enforce their own required fields before submit (documented per screen below).

So in the tables, "Required?" = **Final** means "only required at final submission", **Yes** means "enforced by that screen/modal before it will submit", and **No** means optional everywhere. A `required` *prop* on an input renders a visual asterisk but is not always enforced — noted where they differ.

Most wizard fields can additionally be **hidden per profile** via the Form Customization feature (`useFieldVisible('<section>.<key>')`). Visibility keys are noted but do not change a field's underlying state key.

## Source files read

Schema / types / store:
- `src/lib/schemas/form-schema.ts`
- `src/lib/store/types.ts`
- `src/types/form.types.ts`
- `src/features/case-management/types/index.ts`
- `src/constants/FormOptions.ts`

Wizard route screens (`app/(form)/`):
- `submission.tsx`, `requested-scope.tsx`, `arrival-departure.tsx`, `time-offset.tsx`, `extracted-video-scope.tsx`, `dvr-information.tsx`, `cameras.tsx`, `export-information.tsx`, `notes.tsx`, `completion.tsx`, `ocr-capture.tsx`, `media-capture.tsx`, `audio-recording.tsx`

Shared / feature form components:
- `src/features/location/components/LocationForm.tsx`
- `src/features/location/components/IncidentLocationForm.tsx`
- `src/features/location/camera-gps/components/CameraGpsCapture.tsx`
- `src/features/ocr-time-capture/components/ConfirmationScreen.tsx`
- `src/features/media/shared/components/MetadataForm.tsx`
- `src/features/case-management/components/NewCaseModal.tsx`
- `src/features/case-management/components/NewLocationModal.tsx`
- `src/features/case-management/components/EditIncidentLocationModal.tsx`
- `src/features/case-management/components/DuplicateLocationModal.tsx`
- `src/features/settings/user-profile/components/UserProfileModal.tsx`
- `src/features/settings/user-profile/components/UserProfileSection.tsx`

---

## New Case (NewCaseModal)

`src/features/case-management/components/NewCaseModal.tsx`. Create/edit a case. Modal validation requires `caseNumber` and `metadata.unit`; submit button stays disabled until both are non-empty. In **edit** mode `caseNumber` is read-only (immutable directory name). Sections: top-level case fields, collapsible "Officer in Charge", collapsible "Video/Canvas Coordinator", collapsible "Incident Location", Notes.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Case Number | `caseNumber` | text | Yes | Placeholder `OCC2025-001`. Read-only in edit mode; create-mode shows a confirm alert that the number is immutable. |
| Display Name | `displayName` | text | No | Friendly name. |
| Unit | `metadata.unit` | text | Yes | Investigation unit (e.g. Homicide). Only required metadata field. |
| OIC Name | `metadata.oicName` | text | No | In collapsible "Officer in Charge" (default collapsed). |
| OIC Badge | `metadata.oicBadgeNumber` | text | No | |
| Coordinator Name | `metadata.videoCoordinatorName` | text | No | In collapsible "Video/Canvas Coordinator" (default collapsed). |
| Coordinator Badge | `metadata.videoCoordinatorBadgeNumber` | text | No | |
| Business / Scene Name | `incidentBusinessName` | text | No | "Incident Location" section → IncidentLocationForm `businessName`, mapped via `incidentValuesToFields`. |
| Street Address | `incidentStreetAddress` | text (autocomplete) | No | Mapbox forward-geocode autocomplete fills coords. |
| City | `incidentCity` | text | No | |
| Latitude | `incidentCoordinates.latitude` | number | No | Manual entry, validated -90..90; strict numeric parse. Also set by GPS (forced highest accuracy) or autocomplete. |
| Longitude | `incidentCoordinates.longitude` | number | No | Manual entry, validated -180..180. |
| (coordinate accuracy) | `incidentCoordinates.accuracy` | number | No | Captured from GPS hardware; not a visible input. |
| (coordinate source) | `incidentCoordinates.source` | select `'gps' \| 'manual' \| 'geocoded'` | No | Derived from how the coordinate was captured. |
| (formatted incident address) | `incidentAddress` | text (derived) | No | Auto-built from structured incident fields. |
| Notes | `notes` | text (multiline, 4 rows) | No | Additional case notes. |

---

## New Location (NewLocationModal)

`src/features/case-management/components/NewLocationModal.tsx`. Create a location within a case. Modal validation requires `locationName` (non-empty AND unique within the case, trimmed/case-insensitive). When `requireAddress` is true (duplicate-to-new-address flow) `streetAddress` is also required. Embeds `LocationForm`. The duplicate flow can pre-seed hidden requester fields (`requesterName`, `requesterBadgeNumber`, `requesterUnit`, `requesterPhone`, `requesterEmail`) via `initialValues` — they are carried into the `onSubmit` payload but are not rendered here.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Location Name | `locationName` | text | Yes | Must be unique within the case; live duplicate check + submit gate. |
| Business/Location Name | `businessName` | text | No | LocationForm. Placeholder "Optional". |
| Street Address | `streetAddress` | text (autocomplete) | Conditional | LocationForm; renders `required` asterisk. Enforced only when `requireAddress` is true. |
| City | `city` | text | No (visual `required`) | LocationForm renders `required` asterisk but modal does not enforce it. |
| (latitude) | `coordinates.latitude` | number | No | GPS capture or geocode result. |
| (longitude) | `coordinates.longitude` | number | No | |
| (coordinate accuracy) | `coordinates.accuracy` | number | No | |
| (coordinate source) | `coordinates.source` | select `'gps' \| 'manual' \| 'geocoded'` | No | |
| (formatted address) | `address` | text (derived) | No | Auto-formatted from businessName/street/city; this is the value checked by `finalSubmissionSchema`. |
| Location Contact | `locationContact` | text | No | Contact person name. |
| Location Phone | `locationPhone` | text (phone-pad) | No | |

---

## Edit Incident Location (EditIncidentLocationModal)

`src/features/case-management/components/EditIncidentLocationModal.tsx`. Incident-location-only editor reached from the map's incident detail card. Pure `IncidentLocationForm` (no extra fields); no required fields enforced. Same field set/keys as the New Case "Incident Location" section.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Business / Scene Name | `businessName` → `incidentBusinessName` | text | No | |
| Street Address | `streetAddress` → `incidentStreetAddress` | text (autocomplete) | No | |
| City | `city` → `incidentCity` | text | No | |
| Latitude | `latitude` | number | No | Manual, validated -90..90; or GPS (forced highest accuracy). |
| Longitude | `longitude` | number | No | Manual, validated -180..180. |
| (coordinate accuracy) | `coordinateAccuracy` | number | No | |
| (coordinate source) | `coordinateSource` | select `'gps' \| 'manual' \| 'geocoded'` | No | |

---

## Duplicate Location (DuplicateLocationModal)

`src/features/case-management/components/DuplicateLocationModal.tsx`. Action chooser to duplicate a location or copy submission info to a new address. Only one editable field.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Location Name | `name` | text | Yes | Must be non-empty and unique within the case. Used by "Duplicate Location" / "Duplicate Location with Scopes" actions; the "New Location w/ Sub Info" and Export actions ignore this field. |

---

## Submission Details (submission.tsx)

`app/(form)/submission.tsx`. First wizard step. Sections: "Case Information", "Requester Information", "Location Information" (embeds `LocationForm`). All fields relaxed for navigation; `occNumber` + derived `address` are the final-submission requirements. Requester/contact fields are per-field hideable.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Case Number | `occNumber` | text | Final | Read-only here (`editable={false}`, dimmed); set at case creation. Required by `finalSubmissionSchema`. |
| Requester Name | `requesterName` | text | No | Who requested video from this location. Visibility `submission.requesterName`. |
| Requester Badge | `requesterBadgeNumber` | text | No | Visibility `submission.requesterBadgeNumber`. |
| Requester Unit | `requesterUnit` | text | No | Defaults to case unit if empty; override persists. Visibility `submission.requesterUnit`. |
| Requester Phone | `requesterPhone` | text (phone-pad) | No | Visibility `submission.requesterPhone`. |
| Requester Email | `requesterEmail` | text (email) | No | Visibility `submission.requesterEmail`. |
| Business/Location Name | `businessName` | text | No | LocationForm. |
| Street Address | `streetAddress` | text (autocomplete) | No (visual `required`) | LocationForm; asterisk shown, not enforced for nav. |
| City | `city` | text | No (visual `required`) | LocationForm; asterisk shown, not enforced for nav. |
| (latitude) | `latitude` | number | No | GPS capture / geocode. |
| (longitude) | `longitude` | number | No | |
| (coordinate accuracy) | `coordinateAccuracy` | number | No | |
| (coordinate source) | `coordinateSource` | select `'gps' \| 'manual' \| 'geocoded'` | No | |
| (formatted address) | `address` | text (derived) | Final | Auto-built from business/street/city via `formatAddress`. Required by `finalSubmissionSchema`. |
| Contact Person | `locationContact` | text | No | Visibility `submission.locationContact`. |
| Contact Phone | `locationPhone` | text (phone-pad) | No | Visibility `submission.locationPhone`. |

---

## Requested Scope (requested-scope.tsx)

`app/(form)/requested-scope.tsx`. Repeatable array of requested time scopes (`scopes`, `ArrayFieldManager` min 1 / max 10). The final-submission rule requires at least one scope with both start and end. Item shape = `ScopeEntry`; user-editable sub-fields below (other `ScopeEntry` keys — `id`, `correctedStartDateTime`, `correctedEndDateTime`, `dstAdjustedStartDateTime`, `dstAdjustedEndDateTime`, `dstAdjustmentApplied` — are derived, set by the Time Offset calc, not entered here).

Array item (`scopes[n]`):

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Start Date/Time | `startDateTime` | datetime | Final (≥1 scope) | Stored as `toStorageFormat` string. |
| End Date/Time | `endDateTime` | datetime | Final (≥1 scope) | |
| Time Entry Type | `isActualTime` | radio (boolean) | No | Options: "Real Time" = `true`, "DVR Time" = `false`. Visibility `scope.isActualTime`. Changing it (when extracted scopes exist) prompts keep/regenerate. |
| Cameras | `cameras` | text (multiline, 3 rows) | No | Free text list of cameras for this scope. Visibility `scope.cameras`. |

---

## Arrival & Departure (arrival-departure.tsx)

`app/(form)/arrival-departure.tsx`. Repeatable array (`arrivalDepartures`, min 1). Item shape = `ArrivalDepartureEntry` (`id` derived). Both fields optional; individually hideable.

Array item (`arrivalDepartures[n]`):

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Arrival Date/Time | `arrivalDateTime` | datetime | No | Visibility `arrival.arrivalDateTime`. |
| Departure Date/Time | `departureDateTime` | datetime | No | Visibility `arrival.departureDateTime`. |

---

## Time Offset Calculation (time-offset.tsx)

`app/(form)/time-offset.tsx`. Computes DVR-vs-actual time difference. Inputs are disabled until a scope has start+end. "Use Current Time" captures NTP-calibrated device time into `actualDateTime`; "Calculate" derives `timeDifference`/`timeOffsetData` and regenerates extracted scopes. Cross-links to OCR capture.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| DVR Date/Time | `dvrDateTime` | datetime | No | Needed (with actual) before Calculate works; disabled until a valid scope exists. |
| Actual Date/Time | `actualDateTime` | datetime | No | Settable manually or via "Use Current Time" (NTP-calibrated). |
| DVR Applies DST | `dvrAppliesDST` | toggle (Switch, boolean) | No | Default `false`. Drives DST-adjustment calc + contextual warnings. |
| (time difference) | `timeDifference` | text (derived) | No | Formatted result string. |
| (offset data) | `timeOffsetData` | object (derived) | No | `TimeDifference` incl. direction/differenceMs. |
| (capture method) | `captureMethod` | `'manual' \| 'ocr'` (derived) | No | Set to `manual` on Calculate; `ocr` via OCR flow. |
| (sync metadata) | `timeSyncResult`, `lastSyncTimestamp` | object/number (derived) | No | Forensic NTP audit snapshot, committed only on explicit capture. |

---

## Extracted Video Scope (extracted-video-scope.tsx)

`app/(form)/extracted-video-scope.tsx`. Repeatable array (`extractedScopes`, min 0 / max 10) of actual DVR-time ranges that were exported, auto-generated from the Time Offset calc (rounded to 5-minute boundaries) and then editable. Item shape = `ExtractedScope` (`id` derived; `isActualTime` always `false`).

Array item (`extractedScopes[n]`):

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Start Date/Time | `startDateTime` | datetime | No | DVR time. |
| End Date/Time | `endDateTime` | datetime | No | DVR time. |
| Cameras | `cameras` | text (multiline, 3 rows) | No | Free text. |

---

## DVR Information (dvr-information.tsx)

`app/(form)/dvr-information.tsx`. Sections: "Basic DVR Details", "Recording Configuration", "Retention Details". All fields per-field hideable. `totalDvrRetention` and `daysUntilOverwritten` are computed from `firstRecordedDate` + scopes (shown as cards), not free inputs.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| DVR Location | `dvrLocation` | text | No | e.g. "Manager's office". Visibility `dvr.dvrLocation`. |
| DVR Type/Brand | `dvrTypeBrand` | text | No | e.g. Hikvision, Dahua, Lorex. Visibility `dvr.dvrTypeBrand`. |
| Serial Number/Model Number | `serialModelNumber` | text | No | Visibility `dvr.serialModelNumber`. |
| DVR Username | `dvrUsername` | text | No | autoCapitalize none. Visibility `dvr.dvrUsername`. (In store/type but not in dvr Zod schema.) |
| DVR Password | `dvrPassword` | text | No | spellCheck off. Visibility `dvr.dvrPassword`. (In store/type but not in dvr Zod schema.) |
| Number of Channels | `numberOfChannels` | text (numeric) | No | e.g. 4, 8, 16. Visibility `dvr.numberOfChannels`. |
| Active Cameras | `activeCameras` | text (numeric) | No | Visibility `dvr.activeCameras`. |
| Recording Schedule | `recordingSchedule` | checkboxes → comma-joined string | No | Options: "Continuous", "Motion" (either/both). Stored as e.g. `"continuous, motion"`. Visibility `dvr.recordingSchedule`. |
| Resolution | `resolution` | select + custom text | No | `RESOLUTION_OPTIONS` (352x240 CIF, 704x480 4CIF, 960x480 960H, 1280x720 720p, 1920x1080 1080p, 2560x1440 1440p, 3840x2160 4K, Other/Custom). Picking "custom" reveals a free-text field. Visibility `dvr.resolution`. |
| Recording FPS | `recordingFps` | select + custom text | No | `FPS_OPTIONS` (1,5,10,15,20,25,30, Other/Custom). Custom reveals numeric field. Visibility `dvr.recordingFps`. |
| First Recorded Date Available | `firstRecordedDate` | date | No | `maximumDate` = today. Drives retention calc. Visibility `dvr.firstRecordedDate`. |
| Total DVR Retention | `totalDvrRetention` | derived (days) | No | Auto-calculated card; written back to store. Visibility `dvr.totalDvrRetention`. |
| Days Until Overwritten | `daysUntilOverwritten` | derived (days) | No | Auto-calculated per-scope retention status. Visibility `dvr.daysUntilOverwritten`. |

---

## Camera Details (cameras.tsx)

`app/(form)/cameras.tsx`. Repeatable array (`cameras`, min 1 / max 50). Item shape = `CameraEntry` (`id` derived). Resolution/FPS use the same pickers + custom path as DVR. Per-camera GPS via `CameraGpsCapture` (forced highest accuracy, source always `'gps'`). Sub-fields are toggled as one group via `camera.latitude` visibility.

Array item (`cameras[n]`):

| Field label | Field key | Type | Required? | Notes |
|---|---|---|---|---|
| Camera Name/Number | `cameraName` | text | No | e.g. "CH1 - Front Entrance". Visibility `camera.cameraName`. |
| Resolution | `resolution` | select + custom text | No | `RESOLUTION_OPTIONS` (+ custom). Visibility `camera.resolution`. |
| Recording FPS | `recordingFps` | select + custom text | No | `FPS_OPTIONS` (+ custom). Visibility `camera.recordingFps`. |
| (latitude) | `latitude` | number | No | Captured via GPS crosshair button. Visibility group `camera.latitude`. |
| (longitude) | `longitude` | number | No | |
| (coordinate accuracy) | `coordinateAccuracy` | number (metres) | No | From GPS hardware. |
| (coordinate source) | `coordinateSource` | literal `'gps'` | No | Always `'gps'` (no manual/geocoded path for cameras). |
| (captured at) | `coordinateCapturedAt` | string (ISO-8601) | No | Timestamp of the GPS fix. |

---

## Export Information (export-information.tsx)

`app/(form)/export-information.tsx`. Single section "Export Details". All fields per-field hideable.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Export Media | `exportMedia` | select | No | `EXPORT_MEDIA_OPTIONS`: USB Drive, External Hard Drive, DVD, Cloud Upload, Network Transfer, Other. Visibility `export.exportMedia`. |
| File Type | `fileType` | select | No | `FILE_TYPE_OPTIONS`: MP4, AVI, MOV, MKV, Proprietary, Other. Visibility `export.fileType`. |
| Size (GB) | `sizeGb` | text (decimal-pad) | No | e.g. 2.5. Visibility `export.sizeGb`. |
| Media Player Included | `mediaPlayerIncluded` | switch (boolean) | No | Default `false`. Visibility `export.mediaPlayerIncluded`. |
| Media Provided Via | `mediaProvidedVia` | select | No | `MEDIA_PROVIDED_OPTIONS`: Hand Delivered, Mailed, Left with Contact, Electronic Transfer, Other. Visibility `export.mediaProvidedVia`. |

---

## Case Notes (notes.tsx)

`app/(form)/notes.tsx`. One large auto-generated, editable notes field. The visible text is the assembly of per-section generated content plus free text; on blur the text is diffed back into structured storage. The single on-screen input maps to two underlying keys.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Notes | `notesSections` (+ `notesFreeText`) | text (multiline, scrollable, height 350) | No | Auto-generated per `SECTION_DEFINITIONS`; manual edits to a section are preserved (per-section hash). Trailing free text → `notesFreeText`. Legacy/derived `notes`, `notesManuallyEdited`, `notesGeneratedFromHash` also exist on the store. |

---

## Completion & Review (completion.tsx)

`app/(form)/completion.tsx`. Section "Completion Information" (entry) + "Case Summary" (read-only display of occNumber/address/DVR/scope/camera/export counts). The Complete & Save action runs `finalSubmissionSchema` (requires `occNumber`, `address`, ≥1 scope with start+end). Also hosts PDF/zip export buttons (no fields).

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| Date & Time Completed | `dateTimeCompleted` | datetime | No | Visibility `completion.dateTimeCompleted`. |
| Completed By | `completedBy` | text | No | Auto-fills from User Profile `name` when empty. Visibility `completion.completedBy`. |

---

## OCR Capture — Confirmation (ocr-capture.tsx → ConfirmationScreen)

`app/(form)/ocr-capture.tsx` (route) and `src/features/ocr-time-capture/components/ConfirmationScreen.tsx`. Full-screen camera flow to read a DVR timestamp via OCR, then confirm. The only editable field is the DVR date/time (OCR pre-fills it; operator can correct). On confirm, the route commits `dvrDateTime`, `actualDateTime` (calibrated capture instant), `timeDifference`, plus OCR metadata into the store.

| Field label | Field key (state/schema key) | Type | Required? | Notes |
|---|---|---|---|---|
| DVR Date/Time | local `dvrDateTime` → store `dvrDateTime` | datetime | Yes (to confirm) | Confirm button disabled until set; OCR autofills, manual edit flagged. |
| (detected text) | `ocrRawText` / `ocrCleanedText` | text (display) | — | Read-only OCR output shown for review; persisted as metadata. |
| (actual/recorded time) | `actualDateTime` | datetime (display) | — | Read-only; the frozen NTP-calibrated capture instant. |
| (capture/OCR metadata) | `capturedImageUri`, `croppedImageUri`, `ocrConfidence`, `ocrParsedDateTime`, `captureMethod` | mixed (derived) | — | Written by the route on confirm; not user-entered. |

---

## Media Capture — Metadata (media-capture.tsx → MetadataForm)

`app/(form)/media-capture.tsx` (route) and `src/features/media/shared/components/MetadataForm.tsx`. After capturing a photo or video, the preview collects filename + caption before `saveMedia`. `mediaType` is `'photo' | 'video'`. Captured technical metadata (`capturedAt`, `duration`) is automatic.

| Field label | Field key (form key) | Type | Required? | Notes |
|---|---|---|---|---|
| Filename | `filename` (→ `result.userFilename`) | text | Yes | 1–100 chars; sanitized (strips `< > : " / \ | ? *`); autoCapitalize none. Extension appended on save (`.jpg`/`.mp4`). |
| Notes | `caption` (→ `result.caption`) | text (multiline, 3 rows) | No | Max 500 chars; stored in media metadata. |

---

## Audio Recording — Metadata (audio-recording.tsx → MetadataForm)

`app/(form)/audio-recording.tsx` (route) and the same shared `MetadataForm` (`mediaType='audio'`). After recording, collects filename + caption before `saveMedia` (`.m4a`). `capturedAt`, `durationMs`, `fileSize`, `mimeType` are automatic.

| Field label | Field key (form key) | Type | Required? | Notes |
|---|---|---|---|---|
| Filename | `filename` (→ `result.userFilename`) | text | Yes | 1–100 chars; sanitized; autoCapitalize none. `.m4a` appended on save. |
| Notes | `caption` (→ `result.caption`) | text (multiline, 3 rows) | No | Max 500 chars; stored in media metadata. |

---

## User Profile (UserProfileModal)

`src/features/settings/user-profile/components/UserProfileModal.tsx` (opened from Settings → UserProfileSection). Analyst identity used to autofill `completedBy` and to populate report headers. No required fields. The two date fields display a computed duration beneath them. (`agencyLogoUri` exists on the profile store but has no UI input.)

| Field label | Field key (state key) | Type | Required? | Notes |
|---|---|---|---|---|
| Full Name | `name` | text | No | Autofills Completion "Completed By". |
| Badge / ID Number | `badgeNumber` | text | No | |
| Start Date in Field | `timeInFieldStart` | date | No | Shows computed "time in field" duration. |
| Start Date at Current Agency | `timeAtAgencyStart` | date | No | Shows computed "time at agency" duration. |
| Current Agency | `currentAgency` | text | No | Police service / employer. |
| Unit / Section Name | `unitName` | text | No | e.g. Forensic Video Unit. |
| Qualifications & Education | `qualifications` | text (multiline, 8 rows) | No | Free-form paste of credentials. |

---

### Notes on shared subforms

- **LocationForm** (`businessName`, `streetAddress`, `city`, GPS `latitude`/`longitude`/`coordinateAccuracy`/`coordinateSource`) is embedded in **Submission Details** and **New Location**. Coordinate source can be `gps`, `manual`, or `geocoded`; reverse-geocode-on-capture is gated by a per-context preference toggle (`location`), which is a setting, not a form field.
- **IncidentLocationForm** (same field shape, plus manual Latitude/Longitude inputs) is embedded in **New Case** and **Edit Incident Location**; it forces highest-accuracy GPS and uses the `incident` reverse-geocode preference.
- **CameraGpsCapture** (per-camera) writes `latitude`/`longitude`/`coordinateAccuracy`/`coordinateSource`(`'gps'`)/`coordinateCapturedAt` into the `cameras[n]` item.
