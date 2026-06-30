# Field Parity (text/select fields) — Plan

Closes the **data-entry field** gaps from `docs/planning/field-parity/field-parity-gaps.md`, scoped to fields on **screens that already exist**. Per the owner: **skip User Profile** and the other not-yet-built screens (Media/Audio Capture, Duplicate Location, Edit-Incident-Location-as-its-own-screen). **GPS is deferred entirely** this pass. **Mapbox address autocomplete** is planned for the street fields but **waits on the token** — built as plain inputs now, enhanced later.

## Scope (this PR)
| Screen | Adds | Mechanism |
|---|---|---|
| **New Case** | Video/Canvas Coordinator (`vcName`,`vcBadge`), Incident Location (`incidentBusinessName`,`incidentStreetAddress`,`incidentCity`), case `notes` | OIC **and** Coordinator each in a collapsed accordion (`<details>`); Incident Location as a section; Notes as a textarea |
| **Submission** | Requester Unit (`requesterUnit`) | text input in Requester Information |
| **DVR Info** | Recording Schedule (`recordingSchedule` — already typed) | **Continuous / Motion checkboxes** → comma-joined string (e.g. `"continuous, motion"`) |
| **Completion** | `dateTimeCompleted`, `completedBy` | DateTimeField + text; turns the screen from display-only into display + a small form |

## Data-model extensions (engine/types)
- **`DemoCase`** += `incidentBusinessName`, `incidentStreetAddress`, `incidentCity`, `notes` (all `string`). (`vcName`/`vcBadge` already exist.)
- **`DemoLocation`** += `requesterUnit: string`.
- **`LocationForm`** += `dateTimeCompleted: string`, `completedBy: string`.
- `DvrInformation.recordingSchedule` already exists — no type change, just an input.

Every construction site must set the new fields (tsc enforces): `createCase` + `SEED_CASE` (case fields), `addLocation` + `SEED_LOCATION` (`requesterUnit`), `blankLocationForm` (completion fields). `NewCaseInput` += optional `incidentBusinessName?`/`incidentStreetAddress?`/`incidentCity?`/`notes?` (vc already optional). `NewCaseFields` (modal) += the 6 new case fields.

## Per-screen UI
- **NewCaseModal** — keep Case Number / Display Name / Unit visible. Move **OIC** (name+badge) into a collapsed `<details>` accordion; add a collapsed `<details>` **Video/Canvas Coordinator** (vc name+badge); add an **Incident Location** section (business, street, city) — the street is the future Mapbox-autocomplete field; add a **Notes** textarea. New `Accordion`/`<details>` styling lives in `_shared.tsx`.
- **SubmissionScreen** — add **Requester Unit** in the Requester Information section (placeholder hints it defaults to the case unit).
- **DvrInfoScreen** — add **Recording Schedule** in Recording Configuration: two checkboxes (Continuous, Motion); selection serialized to a comma-joined lowercase string; parsed back for the checked state.
- **CompletionScreen** — add a small "Completion details" section above the actions: **Date/Time Completed** (DateTimeField) + **Completed By** (text).

## DemoExperience wiring
- New Case: extend `blankCaseForm` (local state) + the `onChange`/`submitCase` → `createCase` mapping to carry the 6 new fields.
- Submission: `requesterUnit` is a `DemoLocation` field → existing submission `onChange` path.
- DVR: `recordingSchedule` → `updateField('dvr.recordingSchedule', …)`.
- Completion: `dateTimeCompleted`/`completedBy` → `updateField(…)`.
Store-bridge unchanged (DemoExperience owns all store writes).

## Deferred (tracked, not this PR)
- **GPS capture** — incident coords, per-camera GPS, the no-op Location button. (`deferred.md`.)
- **Mapbox address autocomplete** — on the street fields (incident + location); waits on the token. (`deferred.md`.)
- **DIFFERS reconciliation** — Resolution/FPS/Export option-sets + custom/"Other" path; OCR manual-correct; notes structured storage. (`deferred.md`.)

## Tests (TDD where it bites)
- **engine/store** (coverage-gated): `createCase` persists the new case fields; `addLocation` defaults `requesterUnit`; `blankLocationForm` defaults the completion fields. Extend `store-actions`/seed tests.
- **Screens** (presentational render tests): NewCaseModal renders the accordions (collapsed) + incident + notes and `onChange` fires; SubmissionScreen requesterUnit; DvrInfoScreen recording-schedule checkbox toggles + serialization; CompletionScreen fields.
- Existing suites stay green (new fields are additive; the dots selector still reads the same keys).
