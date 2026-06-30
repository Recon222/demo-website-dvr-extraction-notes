# Drawer Completion Status Dots — Plan + Test Spec

**Goal:** restore the per-screen completion dots in the wizard drawer (removed as dead code in PR #19, tracked as `deferred.md #22`), now actually wired. Mirrors the phone app's approach: the dots tell the user what's **not yet filled** — nothing blocks except the fields that count.

## The rule (ported from the phone's `useSectionCompletion`)
Three states per wizard screen: **complete** (green), **partial** (amber), **empty** (no dot).
- `checkFields(values)` — `empty` = all blank; `complete` = all filled; `partial` = some. (blank = empty/whitespace string.)
- `checkArray(items, extract)` — `empty` if no items **or** every item blank; `complete` if every item fully filled; else `partial`.
- **Extracted Scope** special — `empty` only when there are **0** items; with ≥1 item it's `complete` (all filled) or `partial` (matches the phone — a present-but-blank generated row reads partial, not empty).
- **Notes** is two-state — `complete` if there's note text, else `empty` (never partial).
- **Completion** has **no editable fields in the demo** → always `empty` (no dot). *(Parity gap — the phone has `dateTimeCompleted`/`completedBy`; tracked in the field-parity audit.)*

## Per-screen field mapping (the judgment part — review these)
Demo field set differs from the phone, so this is the demo-specific mapping, not a copy. **Excluded everywhere:** toggles (a boolean is never "empty"), derived/read-only fields, and the two explicit opt-outs below.

| Screen | Source | Counted fields | Excluded (why) |
|---|---|---|---|
| **submission** | `DemoLocation.*` | requesterName, requesterBadge, requesterPhone, requesterEmail, businessName, streetAddress, city, locationContact, locationPhone | `occNumber` (read-only), `locationName` (set at New Location, not on this screen) |
| **requestedScope** | `form.scopes[]` | per item: startDateTime, endDateTime, cameras | `isActualTime` (toggle) |
| **arrivalDeparture** | `form.arrivalDepartures[]` | per item: arrival, departure | — (empty array → no dot; it's optional chain-of-custody) |
| **timeOffset** | `form.timeOffset` | dvrDateTime, actualDateTime | `dvrAppliesDST` (toggle); null offset → empty |
| **extractedScope** | `form.extractedScopes[]` | per item: startDateTime, endDateTime, cameras | `isActualTime` (forced, not editable) |
| **dvrInfo** | `form.dvr` | dvrLocation, dvrTypeBrand, dvrUsername, dvrPassword, numberOfChannels, activeCameras, resolution, recordingFps, firstRecordedDate | **`serialModelNumber` (explicit opt-out — your call + phone)**, `recordingSchedule` (default `'continuous'`, not on screen), `totalDvrRetention` (derived) |
| **cameras** | `form.cameras[]` | per item: cameraName, resolution, recordingFps | `gps` (not editable here) |
| **exportInfo** | `form.export` | exportMedia, fileType, sizeGb, mediaProvidedVia | **`mediaPlayerIncluded` (explicit opt-out — toggle; phone-excluded)** |
| **notes** | `form.notesText` | notesText (two-state) | — |
| **completion** | — | — (no fields) → always empty | entire screen (no editable fields in the demo) |

These counted-field choices are **tunable** — e.g. if requesterEmail / dvrUsername / dvrPassword shouldn't gate a green dot, drop them from the list in `selectDrawerStatus`. Flagging because the demo has fields the phone's completion logic never had.

## Architecture / implementation
1. **Pure selector** `selectDrawerStatus(loc: DemoLocation | null): Record<WizardScreenId, DrawerStatus>` in `features/demo/engine/store/selectors.ts` (engine = coverage-gated; pure, fully unit-tested). Internal `checkFields`/`checkArray`/extracted helpers. `null` location → all `empty`.
2. **Restore `DrawerItem.status`** (`'complete' | 'partial'`) + the two dot-render branches in `WizardDrawer.tsx` (the L5-removed code), green `#10d177` / amber `#ffd93d`; `empty` → no dot.
3. **Wire in `DemoExperience`** — compute `selectDrawerStatus(currentLocation)` and pass `status: dot === 'empty' ? undefined : dot` into the `selectDrawerItems(...).map(...)`. Store-bridge intact (DemoExperience already derives `currentLocation`); reactive (edits update the location → dots recompute).

## Test spec (`selectors` suite, TDD)
- `null` location → every screen `empty`.
- **checkFields screens:** submission/dvrInfo/exportInfo — all blank → `empty`; some → `partial`; all counted filled → `complete`.
- **Exclusions:** dvrInfo with **only** `serialModelNumber` filled → `empty` (the opt-out doesn't count); exportInfo with **only** `mediaPlayerIncluded=true` → `empty`.
- **Array screens:** requestedScope/cameras/arrivalDeparture — `[]` → empty; one fully-filled item → complete; mixed filled/blank items → partial.
- **extractedScope:** `[]` → empty; a present-but-blank item → `partial` (not empty); all filled → complete.
- **timeOffset:** `null` → empty; both set → complete.
- **notes:** blank → empty; text → complete (never partial).
- **completion:** always `empty`.
- **WizardDrawer render** (extend existing test): an item with `status:'complete'`/`'partial'` shows a dot; `undefined` shows none.

## Out of scope
The field-parity gaps (e.g. demo Completion lacking `dateTimeCompleted`/`completedBy`, New Case/New Location missing fields) — those are the separate field-parity audit lined up as the next work.
