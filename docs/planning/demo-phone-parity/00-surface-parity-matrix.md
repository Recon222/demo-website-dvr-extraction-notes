# PHONE ↔ DEMO Surface Parity Matrix

**Date:** 2026-07-30
**Phone (source of truth):** `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative` — React Native Expo SDK 54, "CCTV Recovery Notes"
**Demo (target):** `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes` — Next.js 15; the replica lives entirely in `features/demo/` (`ui/` presentational + `engine/` pure TS; only `ui/DemoExperience.tsx` touches the store)
**Demo HEAD at audit:** `a87b6de` (Merge PR #27, `feat/demo-explorer-m4`), branch `master`, working tree clean.

---

## Sources consulted

| Source | What it gave this matrix |
|---|---|
| `DVR-Extraction-Notes-ReactNative/docs/ui-mapping/README.md` + `01-*.md`…`14-*.md` | **The spine.** 118 documented surface rows across 14 detail docs, all fact-checked **2026-07-16** by a second adversarial agent pass (10 hallucinations / 51 omissions / 25 imprecisions found and corrected in place; every unit self-reported *High* confidence). The README's own scope note says collapsing the ~17 repeated shared components yields **≈95–100 distinct surfaces** — this matrix carries **94 deduped rows** plus a 3-row "not in ui-mapping" appendix. |
| Phone logic/screen inventory (scratchpad `phone-inventory.md`, fresh, verified) | Per-screen store keys, derived logic, native deps, and the §8 master surface table (A1–A4, T1–T22, W0–W14, M1–M18, I1–I10, S0–S14) used as the second join key. |
| Demo inventory (scratchpad `demo-inventory.md`, fresh, verified) | Demo file map, per-screen state assessment, the 16 store actions, the "not built" ledger. |
| `docs/planning/field-parity/field-parity-gaps.md` (demo repo) | Field-key names. **Partly stale** — see the verification note below. |
| `docs/code-reviews/deferred.md` (demo repo) §6, §7, §8, §23, §24, §26 | Un-defer triggers and the owner's recorded scope calls (GPS → `navigator.geolocation`; dots reverted; media fast-follow). |
| `features/demo/CLAUDE.md` | The demo's architecture contract (store-bridge rule, no `Date.now()`/`Math.random()` at render scope, inline-styles-verbatim rule). |
| Demo source, opened directly | `CamerasScreen.tsx`, `CasesScreen.tsx`, `NewCaseModal.tsx`, `OcrCaptureScreen.tsx`, `ImportModal.tsx`, `ImportResultBody.tsx`, `screenData.ts`, `field-options.ts`, `ExportInfoScreen.tsx`, `TabBar.tsx`, `WizardDrawer.tsx`, `engine/content/screens.ts`, `engine/store/create-store.ts`, `engine/logic/import.ts` (`FORM_OPTIONS`). |

**Field-parity re-verification (the brief asked me not to trust either number).** `field-parity-gaps.md` lists 29 missing field keys. I opened the code:

- **Closed** (12): New Case ×8 — `metadata.videoCoordinatorName`/`BadgeNumber`, `incidentBusinessName`/`StreetAddress`/`City`, `incidentCoordinates.latitude`/`.longitude`, `notes` — all present as `NewCaseFields` in `features/demo/ui/screens/NewCaseModal.tsx:8-26`; Submission `requesterUnit`; DVR `recordingSchedule` (`field-options.ts` `RECORDING_SCHEDULE_OPTIONS` + `toggleRecordingSchedule`); Completion `dateTimeCompleted` + `completedBy`.
- **Still open** (17): per-camera GPS ×5 — confirmed, `CamerasScreen.tsx` renders only `cameraName` / `resolution` / `recordingFps`, no GPS control anywhere in the file; media metadata ×2 and audio metadata ×2 (screens don't exist); User Profile ×7 (no settings surface at all); Duplicate Location `name` ×1 (flow doesn't exist).

**≈17 confirmed.** The gaps doc's headline number is stale by 12; its remaining rows are accurate.

---

## Method

1. Take the ui-mapping 118-row inventory as the authoritative phone surface list.
2. Dedupe the ~17 multi-caller shared components into one row each; per-caller configuration differences are recorded in the Delta column rather than as separate rows.
3. For each row, locate the demo counterpart by file. Where the inventory files and the code disagreed, **the code won** (this happened on the field-parity counts and on `ImportModal`'s failure branch, which the demo inventory under-described — it does have a real failure card with `FailuresCard` + Try again).
4. Classify, then size, then bucket.

**Owner scope decisions baked in (not re-litigated):** Settings is out except **User Profile**, which lands as the **final** phase. Cloud sync / agency-cloud / Supabase / canvas-hub are out entirely. Developer pane and real biometric auth are out; a *simulated* splash/lock is OPTIONAL. The PDF-import experience **must** be upgraded to the phone's redesigned picker + `ImportTerminalProgress`. Demo-only extras (StoryRail, ExploreChecklist, ExitDialog, AI import) stay and are **not** gaps.

## Status legend

| Status | Meaning |
|---|---|
| **COMPLETE** | Demo does what the phone surface does for the fields/interactions it exposes. |
| **PARTIAL** | Real logic and a real surface, but fewer fields, states, or interactions than the phone. |
| **STUB** | Renders, but the behaviour behind it is hardcoded, simulated, or a no-op. |
| **MISSING** | Not built. |
| **DEMO-BETTER** | The demo's version is ahead of the phone's — do not "fix" toward the phone; consider back-porting. |
| **OUT-OF-SCOPE** | Owner-excluded. No work planned. |
| **OPTIONAL** | Defensible to build or skip; a flourish, not parity. |

**Effort:** S ≤ half a day · M = 1–2 days · L = 3–5 days · XL > 1 week.

---

## 1. THE MATRIX

### 1.1 Boot / Auth

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 1 | Authenticated Splash Screen | 01, 14 | `ui/screens/SplashScreen.tsx` | STUB | Component exists but is **unreachable**: boot is `view: 'cases'`, nothing links to `splash`, `explore.ts` deliberately omits it. The `authState` prop is hardcoded `'idle'` by the bridge so the `scanning`/`authorized` branches are dead code. Phone: doors-open video → biometric gate → 500 ms hold → 300 ms fade. | M | OPT |
| 2 | BiometricScannerHUD (shared by splash + lock) | 14 | — | OPTIONAL | Shared HUD sub-component. Only worth building if #1/#3 are built. | S | OPT |
| 3 | Lock Screen (foreground re-auth) | 14 | — | OPTIONAL | Phone: `globalAuthLock`, 2 s cooldown, HUD state machine. A simulated version is a flourish; real auth is out of scope. | M | OPT |
| 4 | Biometrics Unavailable Screen | 14 | — | OUT-OF-SCOPE | Fail-closed screen for revoked device biometrics. No browser analog. | — | — |
| 5 | Init Failure Screen | 01, 14 | — | OPTIONAL | Phone shows it when DB/dir init throws. The demo has no init that can throw (in-memory store). | S | OPT |
| 6 | App-wide Error Boundary Fallback | 01 | — | MISSING | **Verified: the demo has zero error boundaries** (`grep ErrorBoundary\|componentDidCatch features/demo/` → no files). Any render throw white-screens the whole phone frame. Cheap resilience win independent of parity. | S | P0 |

### 1.2 Tab shell

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 7 | Tab Bar Chrome (4 tabs, `lazy:false`) | 01 | `ui/controls/TabBar.tsx` | PARTIAL | `TabId = 'dashboard' \| 'cases' \| 'map'` — the phone's **Export** tab is absent. `TAB_BAR_HEIGHT = 50` is already the single source of truth for flush overlays. | S (once #34 exists) | P5 |

### 1.3 Home / Dashboard

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 8 | Dashboard (Home tab screen) | 01 | `ui/screens/DashboardScreen.tsx` + `screenData.ts` | PARTIAL | Has: glowing timeline of live store cases, status dot + connector, OIC/VC personnel chips, created label, location pills that `switchLocation` + enter the wizard, empty state. Missing vs phone: 5-recent-cases paging (`useCases({pageSize:5})`), complete/archive/reopen actions, focus-refresh, Reanimated `FadeInLeft` stagger, `MoreLocationsPill` overflow, long-press → Case Actions Sheet. | M | P3 |
| 9 | Case Actions Sheet (long-press menu + read-only case report) | 01, 11 | — | MISSING | Phone: `actionsForStatus` with `assertNever`, `hasCapturedCoordinates`, measured-overflow scroll gate; hosts Edit Case, complete/archive/reopen. Entry point (long-press a dashboard card) also doesn't exist in the demo. | M | P3 |

### 1.4 Cases

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 10 | Cases Screen (full CRUD) | 02 | `ui/screens/CasesScreen.tsx` | PARTIAL | Has: accordion case cards, per-case **Import** + **Add Location** buttons, per-location rows into the wizard, New Case (+) header, derived `N locations`, status theming. Missing: **edit / delete / duplicate / archive**, search & filter, swipe gestures (`ReanimatedSwipeable` single-open ref map), ZIP/GeoJSON export. **Bug-ish:** every location row is hardcoded `caseStatusTheme('draft')` in `screenData.ts:locationsOf` even though `selectLocationMapStatus` already derives a truthful status and the map uses it. | L | P0 (status fix) / P3 (CRUD) |
| 11 | New Case Modal — **create** | 02, 11 | `ui/screens/NewCaseModal.tsx` | PARTIAL | Strong: OIC/VC `<details>` accordions, Mapbox autocomplete filling street+city+lat/lng with `source:'geocoded'`, manual lat/lng with on-blur `parseCoordinate` + range check + inline error, live coordinate chip. Missing: **no required-field gate** (Case Number / Unit starred but unenforced), **no duplicate-case-number check** (phone raises `DuplicateCaseNumberError` → banner), no device GPS capture, no reverse-geocode toggle, no confirm-Alert on create. | M | P3 |
| 12 | New/Edit Case Modal — **edit mode** | 01 | — | MISSING | *Multi-caller config of #11.* `NewCaseModalProps` is `{ form, onChange, onSubmit, onCancel }` — no `mode`/`existingCase` prop, so edit is structurally absent. Phone adds `caseToIncidentValues`/`incidentValuesToFields` seeding and an **immutable case number**. | M | P3 |
| 13 | New Location Modal | 02, 11 | `ui/screens/NewLocationModal.tsx` | PARTIAL | Has: controlled form, Mapbox autocomplete → street/city/coords, creates the location with `gps.source='geocoded'`. **"Capture GPS coordinates" is a hard no-op** — the bridge passes `onCaptureGps={() => undefined}` (deferred §24). No multi-sample GPS, no accuracy readout, no live duplicate-name check, no `requireAddress` variant (the new-address-copy caller doesn't exist). | M | P3 |
| 14 | Duplicate Location Modal (6-action chooser) | 02, 11 | — | MISSING | Phone: `isLocationNameTaken`, `DuplicateMode` → duplicate / new-address-with-sub-info / ZIP / GeoJSON. Carries the last open field-parity key (`name`). Two of its six actions are export actions (see #34–36). | L | P3 |
| 15 | Delete Confirmation Modal (case \| location) | 02, 11 | — | MISSING | Fixed 2-arm discriminated union, transparent-overlay `Card`, shared italic destructive-warning line. Requires the swipe/long-press affordance in #10 first. | M | P3 |
| 16 | Settings Modal (entry from Cases/Home) | 01, 02, 12 | — | OUT-OF-SCOPE | Owner: skip Settings. **Exception:** it is the host shell for User Profile — see the decision item in §4. | — | P7 (shell only, if chosen) |

### 1.5 Map

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 17 | Map Tab Route (orchestrator) | 03 | `ui/screens/map/MapScreen.tsx` | COMPLETE | 3-state render rule (picker / map / detail) mirrored. Phone's `useExportFlow` hook-in is the only unmirrored piece (see #36). | — | — |
| 18 | Case Picker (MapPicker) | 03, 11 | `ui/screens/map/CaseMapPicker.tsx` | COMPLETE | Mandatory-then-dismissible picker with a deliberately-disabled "All Cases" row teasing future work. Phone additionally has focus-refresh, error-before-empty ordering, a stale banner, preselect highlight — all SQLite-driven, not meaningful in-memory. | — | — |
| 19 | Native Case Map (MapHost + markers) | 03 | `ui/screens/map/MapCanvas.tsx` (+ `buildMarkers.ts`, `mapData.ts`) | PARTIAL | Real `mapbox-gl` satellite-streets, GL engine lazily imported, status-coloured dots + red incident teardrop (colours lifted verbatim from the phone's constants), `flyTo` on select, graceful no-token fallback. Missing vs phone `MapHost`: **supercluster clustering**, status/text filters, Turf.js proximity toggle, camera markers shown/hidden, loading/error overlay states. | L | P6 |
| 20 | Map Bottom Sheet — List Mode | 03 | `ui/screens/map/MapBottomSheet.tsx` + `SheetHandle.tsx` + `LocationList.tsx` + `LocationRow.tsx` | COMPLETE | 3-detent draggable sheet (peek 116 / partial 340 / full 560) with pointer-drag, threshold snapping, and a defensive single `endDrag` exit path so a missed release can't strand it. Phone's list-mode footer additionally holds **Export Map** (#36). | — | — |
| 21 | Map Bottom Sheet — Detail: Location | 03 | `ui/screens/map/LocationDetailCard.tsx` | COMPLETE | Tap-to-call / tap-to-email, iOS-style `CallConfirmSheet`, honest "Calling isn't available in the demo" `DemoNotification`, "Go to Location" hand-off into the wizard. | — | — |
| 22 | Map Bottom Sheet — Detail: Incident | 03 | `LocationDetailCard.tsx` (`item.kind === 'incident'`) | PARTIAL | Incident chip + address render, but the card deliberately has **no requester/contact/CTA** and, critically, **no "Edit Incident Location" affordance** (source comment: "the incident has no wizard"). That affordance is the sole entry to #23. | S | P3 |
| 23 | Edit Incident Location Modal | 03, 11 | — | MISSING | Phone: incident-only field emission, seed-once, reload-token bump, GPS + reverse geocode with a wired error banner. Overlaps heavily with #11's incident-coordinate UI — build as a second mode of the same form. | M | P3 |

### 1.6 Export tab (and the shared export machinery)

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 24 | Export Tab — Case/Location Picker (`ExportHub`) | 04 | — | MISSING | Phone: `ExportSelection` + `armedFullCase`, prune-on-refresh, `isFullCaseSelection`, single-open accordion, tri-state checkbox, "lit vs dimmed" card treatment, frozen `TEST_IDS`. The whole 4th tab. **Its selection state machine is pure TypeScript — port, don't re-derive.** | L | P5 |
| 25 | Export Progress / Validation Modal (`ExportModal`, both modes) | 02, 04, 08 | — | MISSING | *One component, 3+ callers (Cases-tab Duplicate-Location export, Export tab, Completion).* `STAGE_MESSAGES` for `idle→validating→generating→zipping→sharing`; validation-mode strings come from `validateLocationForPdf`. | M | P5 |
| 26 | Password Modal (AES) | 02, 03, 04, 08, 12 | — | MISSING | *One component, **5+ callers** — the single most-repeated surface in the app.* `MIN_PASSWORD_LENGTH = 8`, "Save as default password" checked by default, full state reset on open, "Password cannot be recovered…" warning. Only meaningful once real encryption exists (see decision D4). | M | P5 |
| 27 | Export Action Sheet (ZIP scope chooser) | 04, 08 | — | MISSING | Location-vs-case option list. Note the ui-mapping caveat: it is reached from **Completion's "Export Zip"**, not from the Export tab itself. | S | P5 |
| 28 | Native Alert Dialogs (Export tab flow) + post-export result Alerts | 04, 08 | — | MISSING | *Deduped: the same `useExportFlow` alert taxonomy, documented separately per caller.* Templates exist for `case`, `location`, `location-geojson`, `case-map`, `case-subset`. Demo has no blocking-dialog primitive at all (only the auto-dismissing `DemoNotification`). | M | P5 |

### 1.7 Wizard A — Submission / Scope / Arrival

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 29 | Submission Details Screen | 05 | `ui/screens/SubmissionScreen.tsx` | PARTIAL | Has: 3 `SectionCard`s (read-only OCC#, Requester ×5, Location ×5), every keystroke through `updateField(path)`, Mapbox autocomplete on Street Address writing street+city+`gps`. Missing: **GPS capture** (phone does a 10-sample capture with >2σ outlier filtering + accuracy rating), `coordinateAccuracy`/`coordinateSource` display, `locationContact`/`locationContactPhone`, the `formatAddress` street-type-abbreviation derivation, form-customization field hiding. | M | P2 |
| 30 | Address Autocomplete Suggestions Dropdown | 05 | `ui/inputs/AddressAutocomplete.tsx` | COMPLETE | Mapbox SearchBox suggest/retrieve with a pure, unit-tested feature→`{street, city, coords}` extractor. `buildGeocodeQuery` is a verbatim port (street+city first; city-only deliberately skipped — it resolves to a centroid). Phone adds a 300 ms debounce + a 10@10/s token bucket; demo uses `SearchSession`. | — | — |
| 31 | Requested Scope Screen (1–10) | 05 | `ui/screens/RequestedScopeScreen.tsx` | COMPLETE | Add/remove/edit N rows, real DateTime pickers, Real-Time vs DVR-Time segmented toggle driving `isActualTime`, cameras free-text. Phone additionally fires the store recalculation subscription and a recalculate-offset confirm Alert; the demo recalculates eagerly instead. | — | — |
| 32 | Arrival & Departure Screen (1–20) | 05 | `ui/screens/ArrivalDepartureScreen.tsx` | COMPLETE | Add/remove/edit visit pairs, same pickers, empty-state copy. | — | — |
| 33 | Date/Time Picker (shared bottom sheet) | 05 (+08 note) | `ui/inputs/` — `PickerSheet`, `Calendar`, `DateField`, `TimeWheel`, `TimeField`, `DateTimeField`, `Dropdown` | **DEMO-BETTER** | Full parity on behaviour (empty field auto-populates today; `mergeDate`/`mergeTime` preserve the other half). **Ahead of the phone:** `datetime-parts.ts` is pure with zero argless `new Date()` and a single injectable `clock.now` seam — the pattern the phone's CLAUDE.md says it wants (DST/TZ test pain). Out of scope both sides: range calendars, 12-hour/AM-PM, haptics, light mode. | — | back-port |

### 1.8 Wizard B — Time Offset / OCR

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 34 | Time Offset Screen ★core math | 06 | `ui/screens/TimeOffsetScreen.tsx` | COMPLETE | The demo's strongest screen. DVR vs Actual capture; "Use Current Time" runs `simulateNtpSync()` behind an 1100 ms fake round-trip; **Calculate** runs the genuinely-ported `calculateTimeDifference` → commits `TimeOffsetData` → immediately runs `generateExtractedScopes`; the HH:MM:SS "DVR is AHEAD OF real time" readout; live Adjusted Time Ranges via `selectAdjustedScopes` (exact `calculateCorrectedTimeRange`, no rounding); DVR-Applies-DST switch; "Capture from DVR" launches OCR. Minor gaps: the phone's **4 DST advisory branches** and its Toast/Alert guards. | S (advisories) | P2 |
| 35 | SyncStatusCard | 06 | `ui/screens/SyncStatusCard.tsx` | COMPLETE | Status, method, server (`time.nrc.ca`), device offset ±ms, uncertainty, network delay (RTT/2), calibrated-at, traceability-chain string. Values are fabricated but the **uncertainty is the genuine RFC 5905 synchronisation distance** (`RTT/2 + rootDispersion`, floored at 10 ms). Honest by design — a browser has no raw UDP socket. | — | — |
| 36 | OCR Capture Route Wrapper | 06 | `ui/screens/OcrCaptureScreen.tsx` (launch-only via `LAUNCHABLE`) | PARTIAL | Launch/return-to-anchor wiring is correct (`currentChapter` is never set by `launch`/`closeLaunch`). Phone additionally forces `saveFormToLocation(true)` on exit — no analog needed without persistence. | — | — |
| 37 | OCR Capture — Camera Step | 06 | Same file, `result === null` branch | STUB | HUD with corner brackets + "AIM AT THE DVR CLOCK" + an honest "No camera available here" notice. **No live camera, no 80%×17% bounding box, no 5% crop buffer, no volume-button shutter, no image evidence** — both the shutter and "Use sample DVR clock" run the real pipeline over a hardcoded `'2025-03-08 12:05:30'`. Consequence: `OcrProof.imageDataUrl` is typed but never populated, so the Time-Offset PDF's OCR image block is **always empty**. | L | P4 |
| 38 | OCR Capture — Confirmation Step | 06 | Same file, `result !== null` branch | PARTIAL | Renders parsed DVR time, confidence band, actual (atomic) time, Retake / "Use this & calculate", and a real failure card showing raw OCR text. **Read-only** — the phone lets the operator **manually correct the parsed DVR time** before committing (deferred §26). Also missing the `TODO(M2)` at `engine/logic/ocr.ts:135`: the time-only → "today" guess must be user-confirmed. | M | P2 |
| 39 | DateDisambiguationWarning | 06 | — | MISSING | Inline warning when an OCR date is MM/DD-vs-DD/MM ambiguous. **The engine already computes it** — `engine/logic/date-disambiguation.ts` (251 LOC, ported + tested) is fully built with no UI consumer on the OCR path. Pure surfacing work. | S | P2 |
| 40 | OCR Capture — Error Fallback (route-level ErrorBoundary) | 06 | — | MISSING | Rolled into #6 (the demo has no error boundary anywhere). | — | P0 |

### 1.9 Wizard C — DVR / Cameras / Extracted Scope

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 41 | DVR Information Screen | 07 | `ui/screens/DvrInfoScreen.tsx` + `engine/logic/retention.ts` | **DEMO-BETTER** | Full field parity (5 basic + channels/active-cameras/Resolution/FPS + multi-select Continuous/Motion serialized `"continuous, motion"` to match the phone). **Ahead:** a Retention section where `firstRecordedDate` → `buildRetentionView` → total-retention days + **per-scope overwrite countdown with SAFE/WARNING/CRITICAL/OVERWRITTEN chips**, written back to `form.dvr.totalDvrRetention` by a guarded effect that refuses to clobber an import-provided value. The `RetentionView` union makes "no total ⇒ no scopes" unrepresentable and status is deliberately **not** stored so it can't drift. Residual gap: option-set drift (see §3). | — | back-port |
| 42 | Cameras Screen (1–50) | 07 | `ui/screens/CamerasScreen.tsx` | PARTIAL | Add/remove/edit rows with `cameraName` + Resolution/FPS from shared `field-options.ts`. **Verified missing: all 5 per-camera GPS keys** — `latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt`. `CameraEntry.gps` exists in the type with no UI. Phone forces `precise` accuracy for camera GPS (`CameraGpsCapture`). Also no max-50 gate. | M | P3 |
| 43 | Extracted Video Scope Screen ★derived | 07 | `ui/screens/ExtractedScopeScreen.tsx` | COMPLETE | Renders auto-generated DVR-time windows (corrected range + `roundTo5Min` down/up), per-row edit + remove, "Regenerate from offset", empty-state prompt. Store-side, non-canonical scopes are skipped, counted, dev-warned and flagged via `extractedScopesPartial`, which the PDF then annotates rather than silently omitting. **Step position matches the phone (5, right after Time Offset) — an earlier draft of this row claimed a divergence that does not exist; see §7 D1.** | — | — |

### 1.10 Wizard D — Export Info / Notes / Completion

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 44 | Export Information Screen | 08 | `ui/screens/ExportInfoScreen.tsx` | PARTIAL | All 5 fields present (media / file type / size / provided-via / media-player toggle). **Option-set drift, verified:** the screen hardcodes `MEDIA`/`FILETYPE`/`VIA` locally while `engine/logic/import.ts` `FORM_OPTIONS` carries a different list (`'Cloud Upload'`, `'Network Transfer'`, `'Left with Contact'`, `'Electronic Transfer'` vs the screen's `'Cloud Link'`, `'Mixed'`, `'Picked Up'`). Two sources of truth. Phone's `exportSchema` exists but is never invoked, so validation parity is a no-op. | S | P0 |
| 45 | Notes Screen ★generated | 08 | `ui/screens/NotesScreen.tsx` | PARTIAL | Editable textarea bound to `form.notesText`; edits set `notesEdited`; **Regenerate** calls the store. But `generateNotes()` (`create-store.ts:313-341`) is a **hand-rolled ~15-line builder** emitting occurrence / address / requester / one offset line / one line per requested scope. Phone has **7 registry-ordered sections** (`address` progressive Tier 0–3 → `timeOffset` → `scopes` (extracted wins, requested fallback with dual form) → `retention` → `cameras` (deliberately `''`) → `export` → `timeOnScene`), each independently tracked with `content`/`generatedContent`/`userAddendum`/`manuallyEdited`, **output-comparison reconciliation** and staleness detection, plus a `notesFreeText` tail, "Copy all", "Write my own notes…", and a restore banner. This is the thinnest real logic in the demo **and it is on the critical path to the PDF.** | L | P2 |
| 46 | Completion & Review Screen | 08 | `ui/screens/CompletionScreen.tsx` | PARTIAL | Has: live summary card, Date/Time Completed + Completed By writing to the store, **Preview/Export PDF** → real `generateCaseNotesDoc`, **Preview Time-Offset Calibration** → real `generateTimeOffsetDoc`. Missing: `finalSubmissionSchema` (the phone's **only** runtime validation gate — OCC# + address + ≥1 complete scope), the stricter `validatePdfGeneration`, biometric export gate, ZIP/encryption. **Bug: "Complete & Save" flips a local `caseCompleted` boolean in the bridge (`DemoExperience.tsx:186`) — the case's store `status` stays `'draft'` forever** (`create-store.ts:178` is the only `status:` write), so Cases and Dashboard cards never turn green. | M | P0 (status) / P2 (gate) |
| 47 | PDF Preview Modal — Case Notes | 08, 14 | `ui/chrome/PdfPreview.tsx` | PARTIAL | Renders the genuinely-generated court-document HTML in a maximally-restrictive `sandbox=""` iframe. **"Save as PDF" is a stub (just closes).** Also, per deferred §21, **no Escape / backdrop dismiss**. Phone uses WebView + `expo-print` + share sheet. Browser fix is `window.print()` against the iframe — near-free, and the phone templates are already HTML. | S | P1 |
| 48 | Time Offset Calibration Preview Modal | 08, 14 | `ui/chrome/PdfPreview.tsx` (reused) | PARTIAL | *Multi-caller config of #47.* Content is real (`engine/logic/pdf/time-offset.ts`, 232 LOC). Phone has a 4-field hard gate before it will render, and conditional NTP/HTTP/manual + OCR/DST sections. The **OCR image block is always empty** in the demo because #37 never populates `OcrProof.imageDataUrl`. | S | P1 |

### 1.11 Media Capture & Library

> All 18 rows are MISSING. Deferred §8 scopes them as one fast-follow: real `getUserMedia`/`MediaRecorder` with sample fallbacks (`vitest.setup.ts` leaves `navigator.mediaDevices` undefined **on purpose** so tests take the sample path). Today `view === 'mediaCapture'` falls through to `placeholder()` ("The 'mediaCapture' screen is a fast-follow.") and **nothing calls `launch('mediaCapture')`** — there is no entry point, because `DRAWER_DEFS` has no Media accordion. The store's `addMedia`/`deleteMedia` actions and the whole `LocationForm.media` bucket exist with **zero callers**.

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 49 | Vision Camera Screen (live capture) | 09 | — | MISSING | Shutter, photo/video toggle, flash/torch, flip, zoom, `isActive={isFocused}`. Web: `getUserMedia` + `MediaRecorder`. | L | P4 |
| 50 | Camera Permissions View | 09 | — | MISSING | Camera/mic permission not-yet-granted state. Web: permission-prompt + denied fallback. | S | P4 |
| 51 | Mode Toggle (Photo/Video pill) | 09 | — | MISSING | Always-visible inline control. | S | P4 |
| 52 | Capture Button | 09 | — | MISSING | Custom `Pressable` with its own explicit haptics (not the shared `Button` haptic). | S | P4 |
| 53 | Recording Indicator | 09 | — | MISSING | Shown while a video recording is active. | S | P4 |
| 54 | Review Image (Photo Preview) | 09 | — | MISSING | Accept / retake. | S | P4 |
| 55 | Review Video (Video Preview) | 09 | — | MISSING | Accept / retake + playback (`expo-video` → `<video>`). | S | P4 |
| 56 | MetadataForm (Filename + Notes) | 09 | — | MISSING | *Shared by photo / video / audio previews — one component, 3 callers.* Carries **4 of the 17 open field keys**: media `filename` + `caption`, audio `filename` + `caption`. Phone filenames: `{user}.{jpg\|mp4}` / `{user}.m4a`. | S | P4 |
| 57 | Media Library Sheet | 09 | — | MISSING | `'mediaLibrary'` is in `ModalId` but `activeModal()` has **no case** for it (falls to `null`) and nothing opens it. Note the phone-side defect the ui-mapping fact-check surfaced: `MediaLibrarySheet`'s `<Modal>` has no `onDismiss`, so iOS swipe-to-dismiss strands the parent state — **do not replicate**. | L | P4 |
| 58 | Media Tabs (Photos/Video/Audio) | 09 | — | MISSING | Auto-selects the first item on tab switch. | S | P4 |
| 59 | Photo List | 09 | — | MISSING | Grid vs list. | S | P4 |
| 60 | Video List | 09 | — | MISSING | — | S | P4 |
| 61 | Audio List | 09 | — | MISSING | — | S | P4 |
| 62 | Empty Media State | 09 | — | MISSING | Active tab has zero items. | S | P4 |
| 63 | Media Preview (inline, in-sheet) | 09 | — | MISSING | Tapping a list row. | M | P4 |
| 64 | Media Item Info | 09 | — | MISSING | Sub-panel of #63. | S | P4 |
| 65 | Media Preview Fullscreen | 09 | — | MISSING | Modal. | S | P4 |
| 66 | Delete Media (native Alert confirmation) | 09 | — | MISSING | Long-press a row → confirm + haptics. Needs the blocking-dialog primitive from #28. | S | P4 |

### 1.12 Audio Recording

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 67 | Recorder Screen | 10 | — | MISSING | Waveform, timer, pause/resume/stop, 500 ms min-duration guard, CRT overlay, spectrum analyzer. Web: `MediaRecorder` + Web Audio `AnalyserNode`. Note the ui-mapping finding that the `0s/5s/10s/15s/20s` scale labels are **static/decorative** with nothing tying them to elapsed time — replicate as decoration or fix, but don't assume they mean something. | L | P4 |
| 68 | Permission Denied View | 10 | — | MISSING | Microphone permanently denied. | S | P4 |
| 69 | Audio Preview / Review Audio | 10 | — | MISSING | Playback; the phone's player does **not** auto-reset on finish (library quirk — a `<audio>` port should decide deliberately). | S | P4 |
| 70 | Error Fallback (Audio route) | 10 | — | MISSING | Rolled into #6. | — | P0 |

### 1.13 Import

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 71 | ImportPickerModal — Step 1 "picker" | 02, 13 | `ui/screens/ImportModal.tsx` (`stage === 'picker'`) | PARTIAL | Demo has **2 cards** (Pick a PDF / Paste text). Phone has **3** minHeight-180 glass cards with exact copy the demo should lift verbatim: "Pick File" (`document-outline` @48, "Choose a JSON or PDF recovery file from your device"), "Paste from Clipboard" (`clipboard-outline`, JSON path only), "Paste Text" (`sparkles-outline`, "Paste a request email or notes — AI fills the form"), plus a Cancel button, per-card loading spinners, an error banner, and the whole file-type-routing error string set (mixed selection / unsupported type / >25-file `BATCH_SIZE_WARNING_THRESHOLD` confirm). **Spec: phone-inventory §5.2.** | M | P1 |
| 72 | ImportPickerModal — Step 2 "Paste Text" | 13 | Same file (`stage === 'paste'`) | PARTIAL | Demo: label + textarea + submit. Phone adds a back chevron, the exact hint copy, `autoCorrect/spellCheck={false}` (forensic — autocorrect must not rewrite a DVR model / OCC / badge number), and a **load-bearing `maxHeight: 320`** with internal scroll so a pasted 2-page email can't push the button off-screen. **Spec: phone-inventory §5.3.** | S | P1 |
| 73 | ImportFlowModal — shell | 02, 13 | `ui/screens/ImportModal.tsx` (`ModalShell`) | PARTIAL | Demo drives everything off one `stage` union. Phone splits picker and flow into two modals with `computeImportFlowMode` deriving mode from `(isPdfImporting, pdfResult, pdfTerminalAcknowledged)`. Key transition to replicate: **a non-null result does NOT mean results are showing** — the dwell keeps mode at `'progress'` until the CTA is tapped. | M | P1 |
| 74 | **PDF/Text Import Live Terminal** (`ImportTerminalProgress` + `TerminalLine`) | 02, 13 | `ImportModal.tsx` (`stage === 'progress'`) — old 3-row checklist | **PARTIAL → the flagged deliverable** | Demo: a flat checklist ("Extracting text from the PDF" / "Reading the request with the model" / "Mapping fields to the form") with ✓ / spinning arc / grey dot, plus "Importing 2 of 3…". Phone: a **live terminal** tailing the real `[PDF_IMPORT]` dataflow through a retain-and-replay log bus (cap 400) via rAF-coalesced `useImportLog`, rendered as a virtualized list of memoized `TerminalLine`s — time gutter, level tags (`INIT`/`FILE`/`PDF`/`AI`/`VERB`/`NORM`/`CASE`/`OK`/`DONE`/`ERR`), syntax-accent colours, expandable detail blocks, blinking `▌` cursor footer, **pin-aware auto-follow** with a "latest ↓" pill, a title bar reading "pdf-import · on-device" / "nothing leaves this phone", a fixed-height badge slot that **morphs** (FadeIn 350 ms) from a processing spinner into a labelled "Review import →" CTA with no reflow, and a `TerminalOutcome` union with a distinct **amber `partial`** treatment so a partial batch never reads as clean success. Terminal panel is dark in **both** themes by design. The dwell applies to failures too — "the log is most valuable when something broke." **Full spec incl. exact copy/colours/sizes: phone-inventory §5.7.1–§5.7.3.** The demo already has an `onStage` callback that can be widened into a log emitter. | L | **P1** |
| 75 | ImportFlowModal — Progress (Single JSON) | 13 | — | OPTIONAL | The demo has no JSON import path at all (`import/` handles PDF + pasted text only). Reanimated 0–100 % bar. See decision D5. | M | OPT |
| 76 | ImportFlowModal — Progress (Batch JSON) | 13 | — | OPTIONAL | Same. See D5. | S | OPT |
| 77 | Result — Success (Single) | 13 | `ui/screens/ImportResultBody.tsx` + `importResultData.ts` | COMPLETE | Grouped empty-omitting sections, mono formatting for badge/phone/email/credentials, ACTUAL/DVR TIME scope chips, a collapsible "N automatic adjustments" warnings list, per-card "Sample data" badge, Done / Open location. **Keep as-is — the owner already rated the result screens good.** | — | — |
| 78 | Result — Success/Partial (Batch) | 13 | `ui/screens/ImportResultAccordion.tsx` | COMPLETE | Single-open accordion of successes + a `FailuresCard` for failures + "Imported N of M requests." | — | — |
| 79 | Result — Error / Dry-Run | 13 | `ImportModal.tsx` (`!result.ok` branch) | PARTIAL | **Code check corrected the inventory here:** the demo *does* have a real failure card — red circle icon @42, `aria-live` error text, `FailuresCard`, "Try again". Missing vs phone: the collapsible **"Technical Details"** block, the optional **"Data Found"** block, the `ERROR_MESSAGES` friendly-message map, and the dry-run/validation-only view. | S | P1 |

### 1.14 Previews / Drawer

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 80 | CustomDrawerContent | 14 | `ui/controls/WizardDrawer.tsx` | COMPLETE (P4.2) | Strong: 300 px slide-in over a scrim with a `-72px` push of the whole screen stack; items from `selectDrawerItems` (profile-filtered); **per-screen completion dots** from `selectDrawerStatus` explicitly mirroring the phone's `useSectionCompletion` including both documented opt-outs (`serialModelNumber`, `mediaPlayerIncluded`); status in the item `aria-label` with dots `aria-hidden`; "Back to Cases". **P4.2 added** the Media accordion (Capture Media / Record Audio / Media Library — interim `launch()` placeholders until P4.3/P4.6/P4.5) with the ported no-location guard. **P4.2 refuted two of this row's "missing" claims (deferred §59):** (1) the phone has **no save-status indicator anywhere** — `useSaveStatus()` has zero production readers; the demo's honest per-tab snapshot line is an *original*, not a port; (2) app-version footer chrome **already existed** since the prototype port — the real fix was labelling it `Interactive demo · v1.0.0`. A11y: no focus trap / focus return (deferred §7); dots are **colour-only** (deferred §23 — decision D3). | M | P4 (accordion) ✅ |

### 1.15 Settings / User Profile

| # | Phone surface | ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| 81 | Settings Modal (master/detail shell) | 01, 02, 12 | — | OUT-OF-SCOPE | Needed **only** as the host for #85/#86 — see decision D6 for the lighter alternative. | M | P7 (if D6=shell) |
| 82 | Settings Nav Bar | 12 | — | OUT-OF-SCOPE | — | — | — |
| 83 | Settings Category List | 12 | — | OUT-OF-SCOPE | — | — | — |
| 84 | Settings Category Row | 12 | — | OUT-OF-SCOPE | — | — | — |
| 85 | Detail Pane: User Profile | 12 | — | MISSING | Two states: configured (Name / Badge / Agency / Unit summary lines + "Edit Profile") and unconfigured ("No profile configured." + "Set Up Profile"). `hasName = name.trim().length > 0` is the discriminator. Note `timeInFieldStart`/`timeAtAgencyStart`/`qualifications` are deliberately **not** summarized here. | S | **P7** |
| 86 | User Profile Modal (editor) | 12 | — | MISSING | **All 7 open field keys live here:** `name`, `badgeNumber`, `timeInFieldStart`, `timeAtAgencyStart`, `currentAgency`, `unitName`, `qualifications`. (An 8th, `agencyLogoUri`, exists on the type as `[Future]`, has **no UI**, and must **not** be built.) Single device-local profile — no multi-profile, no avatar, no signature. No validation; phone uses uncontrolled `defaultValue` + `onEndEditing` and has **no Cancel button**. Renders computed career-duration lines. Feeds Completion's "Completed By" autofill → the Case Notes PDF. Phone persists to AsyncStorage `cctv-app-user-profile` v1 with **no migrate** — the demo's analog depends on decision D2. Do **not** implement a `resetProfile()` — the phone's docs claim it but the store doesn't have it. | M | **P7** |
| 87 | Detail Pane: Appearance | 12 | — | OUT-OF-SCOPE | Demo is dark-only by design. | — | — |
| 88 | Detail Pane: Media Capture | 12 | — | OUT-OF-SCOPE | — | — | — |
| 89 | Detail Pane: Location | 12 | — | OUT-OF-SCOPE | GPS accuracy/timeout presets. If #29/#42 GPS lands, hardcode `precise`. | — | — |
| 90 | Detail Pane: Time Sync | 12 | — | OUT-OF-SCOPE | Single NTP-region picker. Demo hardcodes `time.nrc.ca`. | — | — |
| 91 | Detail Pane: Export Security | 12 | — | OUT-OF-SCOPE | Would gate #26. | — | — |
| 92 | Detail Pane: Cloud Sync | 12 | — | OUT-OF-SCOPE | Owner: cloud is out entirely. | — | — |
| 93 | Detail Pane: About | 12 | — | OUT-OF-SCOPE | — | — | — |
| 94 | Detail Pane: Developer (`__DEV__`) | 12 | — | OUT-OF-SCOPE | Owner: out. | — | — |

### 1.16 Appendix — surfaces NOT in the ui-mapping set

The ui-mapping README names these as its own known coverage gaps. Statuses below are my assessment, not the map's.

| # | Phone surface | Why absent from ui-mapping | Demo counterpart | Status | Delta | Effort | Phase |
|---|---|---|---|---|---|---|---|
| A1 | `SecuritySettingsSection` (biometrics settings pane) | `12-settings.md` defers it onward to `@/features/biometrics`; no doc exists | — | OUT-OF-SCOPE | App Lock / Protect Exports / Allow Device Passcode. Real biometrics are out. | — | — |
| A2 | `FormCustomizationSection` + `ProfilePicker` detail panes | `12-settings.md` defers onward to `@/features/form-customization`; no doc exists | `engine/content/profiles.ts` (`profile: 'forensic'` hardcoded; `hiddenFields` always `[]`) | STUB | Phone: profile chips Forensic/Limited/Canvas, 12 screen rows, **57 field toggles**, "Always on" locks, precedence *always-on > user override > profile default*, wizard next/back derived from the **visible** step set. **Pure JS + a persisted store — it ports 1:1 with no native dep.** The demo's `selectVisibleWizardScreens`/`selectDrawerItems` are already profile-filtered, so the plumbing exists and only the toggle UI + defaults are missing. Would be a genuinely impressive demo moment. | L | OPT |
| A3 | `DateTimePicker` / `TimePicker` internals | `08-wizard-d-completion.md` notes them inline but scopes them out as shared generics | `ui/inputs/*` | **DEMO-BETTER** | Same as #33 — the demo's is pure + clock-injected. | — | back-port |

---

## 2. Demo-side gaps that aren't a single surface

| # | Gap | Evidence | Impact | Effort | Phase |
|---|---|---|---|---|---|
| G1 | **No persistence whatsoever** — a reload loses everything | `grep -rn "localStorage\|sessionStorage" features/demo/` → **zero hits** (excluding tests); no `persist` middleware; store is `zustand/vanilla` `createStore` in a `useRef` per `DemoExperience` mount | Highest-severity demo-specific risk. The demo boots **empty** by owner decision and asks the visitor to build a case by hand — an accidental refresh destroys everything they made. Deferred §"demo-explorer scope boundaries" parks checklist persistence only; whole-store persistence was never scoped. | M | **P0** (pending D2) |
| G2 | **`generateNotes()` is a placeholder** | `engine/store/create-store.ts:313-341` — ~15 lines, 5 line types | Phone has 7 registry-ordered sections with per-section edit tracking, output-comparison reconcile, and staleness detection. Notes feed the Case Notes PDF, so this is on the forensic-document critical path. Same as row #45. | L | P2 |
| G3 | **`CasesScreen` hardcodes every location row to "Draft"** | `ui/screens/screenData.ts` `locationsOf()` → `status: caseStatusTheme('draft')` | `selectLocationMapStatus` **already derives** a truthful started/working/complete and the map uses it. One-line-ish fix; visible correctness gap in the demo's own narrative. | S | **P0** |
| G4 | **"Complete & Save" never sets the store status** | `ui/DemoExperience.tsx:186` local `useState(false)` `caseCompleted`; `create-store.ts:178` is the only `status:` write (`'draft'` at creation) | Cases and Dashboard cards never turn green, so the visitor's arc never visibly completes. Needs a `completeCase(caseId)` store action. | S | **P0** |
| G5 | **Option-set drift vs phone `FORM_OPTIONS`** | `ExportInfoScreen.tsx` hardcodes `MEDIA`/`FILETYPE`/`VIA`; `engine/logic/import.ts:199-205` `FORM_OPTIONS` has different values; `resolution`/`fps` exist in **both** `ui/screens/field-options.ts` **and** `FORM_OPTIONS` with different lists (`field-options` has `'Other'`, `FORM_OPTIONS` has `'custom'`) | Two sources of truth for the same enums, and neither matches the phone exactly. An import can write a value the dropdown can't display. Also missing on both sides of the demo: the phone's custom/"Other" free-text path (deferred §26). | S | **P0** |
| G6 | **Glass-aesthetic tokens copy-pasted, not extracted** | The same `linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` + `1px solid rgba(30,58,95,0.5)` + `borderRadius:12` triple appears across ~15 screens | Defensible under the CLAUDE.md "lifted verbatim, do not restyle" rule, but it makes any future restyle expensive. `ui/inputs/input-theme.ts` (`T`) and `map/mapTokens.ts` show the pattern already exists. | M | P0 (opportunistic) |
| G7 | **Tab bar missing the Export tab** | `TabBar.tsx` `TabId = 'dashboard' \| 'cases' \| 'map'` | Same as row #7 — blocked on #24. | S | P5 |
| G8 | **Two known silent failures on the forensic-document path** | deferred §15 — `selectAdjustedScopes` swallows its parse error into an empty `catch`; `roundTo5Min` silently returns unparseable input unchanged | Not surfaces, but both sit between the offset math and the PDF. Worth folding into P2. | S | P2 |
| G9 | **Zero required-field enforcement anywhere** | `demo-fields.md`: *"No required-field validation is enforced anywhere"*; red `*` on Case Number / Unit / Location Name is decorative | The phone's single runtime gate is `finalSubmissionSchema` on Completion. Matching just that one gate (not per-screen validation — the phone has none either) is the honest parity move. | S | P2 |
| G10 | **`demo.css` `@import`s two Google Font families at runtime** | render-blocking third-party import inside `demo.css`; the marketing half already loads Share Tech Mono + JetBrains Mono via `next/font` as CSS variables, and `StoryRail` already consumes two of them | Perf + consistency. Not parity, but cheap and the terminal work (#74) needs Share Tech Mono to render right. | S | P1 |
| G11 | **Root `README.md` / `CHANGELOG.md` are still the untouched Cruip "Open PRO" template** | demo repo root | Anyone landing on the repo gets a landing-page template pitch. Not parity; noted so it isn't lost. | S | OPT |

---

## 3. DECISIONS NEEDED (each with a recommendation)

**D1 — Wizard step order — RESOLVED: no divergence exists (owner-corrected 2026-07-30).**
This matrix originally claimed the phone puts extracted scope at step 8. That was wrong: the ui-mapping surface table itself records Extracted Video Scope as reached by "Next" from Time Offset, and DVR Information by "Next" from Extracted Video Scope — i.e. the phone's order is time-offset → extracted-scope → dvr-information → cameras, exactly like the demo. The step-8 claim came from misreading the phone-inventory's file-listing order (W8) as navigation order. No work on either side.

**D2 — Persistence: `sessionStorage` snapshot, `localStorage`, or nothing?**
**Recommendation: `sessionStorage`.** It survives refresh (the actual failure mode) but dies with the tab, so the "boots empty, the visitor creates everything" decision is preserved and a fresh visitor never inherits a stranger's case. `localStorage` would resurrect old sessions and contradict the empty-boot decision. A single serialize-on-change / rehydrate-on-mount around the vanilla store is ~½ day and doesn't touch the store-bridge rule. Gate it behind a one-line kill switch. **Blocks G1 and, downstream, whether User Profile (#86) persists at all.**

**D3 — Drawer status dots: reinstate a non-colour distinction?**
A non-colour version was built and then **reverted at the owner's request** (deferred §23, preferred the filled-dot look). SR users already get status via `aria-label`; the gap is colourblind *sighted* users (WCAG 1.4.1).
**Recommendation: leave reverted.** It is a showcase, the SR path is covered, and the owner has already ruled. If it ever needs revisiting, the note in §23 is right: a small check glyph *inside* the complete dot preserves the filled look better than the ring that was tried.

**D4 — Export / ZIP / AES / PasswordModal: build, fake, or skip?**
Rows #24–28 plus the Case Map export HTML are ~L–XL together and are the last big un-scoped block. Real AES-256 in-browser is feasible but the artifact can't go anywhere useful from a demo.
**Recommendation: build the Export tab + `ExportModal` + `ExportActionSheet` as a real selection/validation experience (the selection state machine and `useExportFlow` policy are pure TypeScript — port them), and stop at an **honest** "download isn't available in the demo" `DemoNotification` instead of producing a real encrypted ZIP.** Skip `PasswordModal` (#26) unless real encryption is built, since a password prompt that protects nothing is the one thing the demo's honesty machinery has consistently refused to do. **Exception worth doing for real:** the **Case Map export** is already a self-contained HTML file produced by a pure `buildCaseMapHtml` — that one *can* genuinely download.

**D5 — JSON import path (#75, #76): build it?**
The demo is PDF + pasted-text only. The phone's JSON path is a deterministic Peel parser feeding the same universal schema.
**Recommendation: skip.** The AI/PDF path is the demo's showpiece and the JSON path demos as a progress bar over an instantaneous parse. Revisit only if a Peel-style agency asks to see their own export format ingest.

**D6 — Where does User Profile live without Settings (#81–84)?**
Owner wants User Profile but not the Settings shell.
**Recommendation: skip the master/detail shell.** Put a small avatar/person button in the Dashboard header that opens the `UserProfileModal` (#86) directly, and fold the #85 summary pane into the modal's own empty state. That is ~1 day instead of ~3 and avoids building four Settings chrome surfaces (#81–84) that are explicitly out of scope. Pairs with D2: if persistence lands, the profile survives a refresh, which is most of its point.

**D7 — Simulated splash / lock (#1, #2, #3)?**
`SplashScreen.tsx` already exists, unreachable, with dead `scanning`/`authorized` branches. deferred/demo-explorer parks a "splash-video entry" that was **never actually logged in `deferred.md`** (only the media item, §8).
**Recommendation: yes, but last — a P-OPT flourish after P7.** Wiring the existing component to boot + faking a 1.2 s scan is ~½ day and it's the app's actual first impression. Real biometrics stay out. Skip the Lock Screen (#3) entirely — a demo has no background/foreground cycle to justify it.

**D8 — OCR: simulated capture forever, or real webcam?**
`vitest.setup.ts` deliberately leaves `navigator.mediaDevices` undefined and stubs `getContext → null` so screens take the sample path — the sample-fallback architecture is already the tested contract.
**Recommendation: real `getUserMedia` with the sample fallback intact, but bundled into P4 with the media screens** (same capability, same permission UX, same fallback pattern — building them separately means doing the camera work twice). Two things should land **earlier**, in P2, because they need no camera: manual DVR-time correction on the confirm step (#38) and surfacing `DateDisambiguationWarning` (#39), whose engine module is already written and tested with no UI consumer.

**D9 — Form Customization (A2): in or out?**
It is not in the ui-mapping set and the owner's "skip Settings" arguably covers it, but it is **pure JS with no native dependency**, the demo's `selectVisibleWizardScreens`/`selectDrawerItems` are **already profile-filtered**, and `ProfileConfig.hiddenFields` is typed and wired but always `[]`.
**Recommendation: OPTIONAL, and genuinely tempting.** Three profile chips that visibly retune the wizard in front of the visitor is a strong demo moment for a fraction of the phone's 57-toggle build. Defer the per-field toggle grid.

---

## 4. BACK-PORT LEDGER — phone improvements found in the demo (OUT of demo-parity scope)

Work for the **phone** repo. Listed here because it was found during this audit and would otherwise evaporate. None of it is demo work.

| # | Item | Where it lives | Note |
|---|---|---|---|
| B1 | **3 real phone bugs, fixed in the demo, still marked "⬜ Port back to the phone app"** | demo repo `docs/code-reviews/phone-app-debug.md` | (a) `sourceContainsFullDate` substring false-positive that trusts a hallucinated year; (b) `findYearTokenNear` only inspecting the **first** occurrence; (c) a blank time-frame date emitting a spurious "Empty datetime value" adjustment. All three are in the phone's import date pipeline. **Re-porting logic into a second, independently-tested runtime worked as a bug-finding technique** — that's the meta-finding. These are sitting in the demo repo where the phone team never sees them; they should become `BUG-NNN` rows in the phone's `docs/cleanup-audit/bug-list.md`. |
| B2 | **Clock-injected datetime parts** | demo `engine/logic/datetime-parts.ts` + `ui/inputs/clock.ts` | Zero argless `new Date()`; the wall clock is a single injectable seam read only inside event handlers. The phone's CLAUDE.md records real pain from DST/TZ-sensitive tests (`isInDST` resolving against the host zone, CI defaulting to UTC). This is the pattern that removes the class of bug. |
| B3 | **DVR RetentionView derivation** | demo `engine/logic/retention.ts` + `ui/screens/DvrInfoScreen.tsx` | `firstRecordedDate` → total retention → per-scope overwrite countdown with SAFE/WARNING/CRITICAL/OVERWRITTEN chips, all derived. The `RetentionView` union makes "no total ⇒ no scopes" unrepresentable; status is deliberately **not stored** so it can't drift from the day count; the persisted `totalDvrRetention` is kept in sync by a guarded effect that refuses to clobber an import-provided value. Worth checking whether phone `dvr-information.tsx` surfaces retention this clearly. |
| B4 | **NewCaseModal incident-coordinate UX** | demo `ui/screens/NewCaseModal.tsx` + `engine/logic/coordinates.ts` | Accordions collapse OIC/VC so the modal isn't a wall; an address pick fills lat/lng and stamps `source:'geocoded'`; typing by hand flips it to `'manual'`; **on-blur strict `parseCoordinate`** rejects `43.6abc` where `parseFloat` would silently truncate; inline error + a live coordinate chip. The type comment justifying why the *incident* can have coords without an address ("a scene in the woods") while a *recovery location* is geocode-only is domain reasoning that belongs in the phone's types too. |
| B5 | **`motion.ts` as the Reanimated port template** | demo `ui/motion.ts` + `docs/planning/demo-screen-transitions/01-*.md` (Motion Spec) | Written deliberately with percentage-string offsets so the values translate 1:1 to Reanimated. The web demo is the **design source of truth** for the phone's screen transitions — unusual and valuable. It also dev-warns if a view id is in neither flow registry (it would silently fade instead of slide). |
| B6 | *(found during this audit)* **`MediaLibrarySheet` has no `onDismiss`** | phone `src/features/media/media-library/components/MediaLibrarySheet.tsx` | Surfaced by the ui-mapping fact-check (`09-media.md`), classified there as a **genuine functional defect, not a doc gap**: iOS pageSheet swipe-to-dismiss never calls `handleClose()`, so the sheet disappears but `showMediaLibrary` is never cleared and the drawer never re-opens. Deserves a `BUG-NNN`. Do not replicate in demo row #57. |

---

## 5. Totals

### By status (94 matrix rows + 3 appendix rows = 97)

| Status | Count | Rows |
|---|---|---|
| COMPLETE | 13 | 17, 18, 20, 21, 30, 31, 32, 33*, 34, 35, 41*, 43, 77, 78 (*33 and 41 also counted as DEMO-BETTER) |
| PARTIAL | 24 | 7, 8, 10, 11, 13, 19, 22, 29, 36, 38, 42, 44, 45, 46, 47, 48, 71, 72, 73, 74, 79, 80 (+ 2 dual-counted) |
| STUB | 3 | 1, 37, A2 |
| MISSING | 38 | 6, 9, 12, 14, 15, 23, 24, 25, 26, 27, 28, 39, 40, 49–66, 67–70, 85, 86 |
| DEMO-BETTER | 3 | 33, 41, A3 |
| OUT-OF-SCOPE | 16 | 4, 16, 81, 82, 83, 84, 87, 88, 89, 90, 91, 92, 93, 94, A1 (+ cloud/agency-cloud wholesale) |
| OPTIONAL | 6 | 2, 3, 5, 75, 76, A2 |

*(Rows 33, 41, A3 appear under both COMPLETE and DEMO-BETTER; 40 and 70 fold into row 6. Actionable-parity rows = **65**; excluded rows = **22**.)*

### By effort (actionable rows only)

| Effort | Count |
|---|---|
| S | 30 |
| M | 22 |
| L | 12 |
| XL | 0 |

No single surface is XL; the XL-sized *blocks* are P4 (media+audio, 22 rows) and P5 (export, 6 rows).

### By phase bucket

| Phase | Rows | Surface rows | Non-surface gaps | Rough size |
|---|---|---|---|---|
| **P0** — Correctness & foundation | 6, 10 (status only), 44, 46 (status only) | 4 | G3, G4, G5, G1, G6 | ~3–4 days |
| **P1** — Import experience upgrade | 47, 48, 71, 72, 73, 74, 79 | 7 | G10 | ~1 week |
| **P2** — Wizard depth | 29, 34 (advisories), 38, 39, 45, 46 (final gate) | 6 | G8, G9 | ~1 week |
| **P3** — Case & location management + GPS | 8, 9, 10 (CRUD), 11, 12, 13, 14, 15, 22, 23, 42 | 11 | — | ~1.5 weeks |
| **P4** — Media, audio, OCR camera | 37, 49–66, 67–69, 80 (accordion) | 25 | — | ~2 weeks |
| **P5** — Export surfaces | 7, 24, 25, 26, 27, 28 | 6 | G7 | ~1 week (less if D4 = honest-stub) |
| **P6** — Map depth | 19 | 1 | — | ~3–5 days |
| **P7** — User Profile (**final**, per owner) | 85, 86 (+81 only if D6 = full shell) | 2–3 | — | ~1 day (D6 = header button) |
| **OPT** — Optional flourishes | 1, 2, 3, 5, 75, 76, A2 | 7 | G11 | variable |

---

## 6. Accuracy notes

- Every Status and Delta above is grounded in either a file I opened in the demo repo or a fresh inventory I read. Where the two conflicted, I opened the code and the code won — that happened twice: the field-parity "29 missing keys" headline (**actually 17**, verified key by key) and `ImportModal`'s failure branch (the demo inventory under-described it; the code has a real failure card with `FailuresCard` + Try again, so row #79 is PARTIAL, not MISSING).
- No surface in this matrix is invented. Rows 1–94 map to the ui-mapping 118-row inventory; the three appendix rows are the ui-mapping README's own declared coverage gaps, labelled as such.
- The phone side reflects the ui-mapping set as fact-checked **2026-07-16**. Anything merged into the phone after that date is not represented here.
- This document is planning-only; it changes no code in either repo. Committed alongside the master plan on 2026-07-30.

---

## 7. Owner ratification — 2026-07-30

All nine decisions ruled on by the owner. This section supersedes §3's recommendations and the affected row classifications above.

- **D1 — RESOLVED, this matrix was wrong.** Phone and demo already agree: extracted scope is step 5 on both, right after Time Offset (see the corrected §3 entry). No work.
- **D2 — RATIFIED:** `sessionStorage` persistence (P0.4).
- **D3 — RATIFIED:** drawer dots stay exactly as they are.
- **D4 — RATIFIED + EXPANDED:** Case Map export downloads for real; ZIP stays an honest stub; PasswordModal skipped; AND the Case Notes + Time Offset documents get real client-side PDF saves (print-to-PDF primary, html2pdf-style one-click spike; no pdfmake) — rows 47/48 upgraded S → M.
- **D5 — RATIFIED:** JSON import skipped permanently; the owner is removing it from the phone too (rows 75/76).
- **D6 — OVERRIDDEN:** the full Settings surface IS built as a faithful UI replica — rows 81–84, 87–93 and A1 flip from OUT-OF-SCOPE to **STUB-BUILD** (pixel-faithful UI, honest non-functional behavior), phase P7. Row 94 (Developer, `__DEV__`-only) stays out. User Profile (85/86) is built fully, with `name` wired into Completion's Completed-By autofill. Motivated by an upcoming will-say-document feature.
- **D7 — RATIFIED + COMMITTED:** splash + biometric scan animation wired into boot (rows 1–2 → committed, new phase P8), with a drop-in slot for the owner's bunker-doors intro video later; Lock Screen (row 3) stays unbuilt.
- **D8 — RATIFIED:** manual correction + disambiguation UI in P2; real webcam + Tesseract.js recognition feeding the already-ported cleaning/disambiguation engine in P4 (row 37).
- **D9 — OVERRIDDEN UP:** Form Customization built in FULL — profile chips AND the 57-toggle grid (A2 → committed, phase P7).

Effective classification shifts vs §5's totals: OUT-OF-SCOPE 16 → 5 (row 4, row 94, plus cloud/agency wholesale); new STUB-BUILD class: 10 rows (81–84, 87–93, A1); OPTIONAL 6 → 2 (rows 5 and G11's repo hygiene). The master plan (`01-master-parity-plan.md`) §5 reflects the restructured P7/P8.

**D10 — owner ruling on extracted-scope derivation (2026-07-31).** Real-time (`isActualTime === true`) requested scopes: apply the offset, then round the start BACK and the end FORWARD to the nearest 5-minute mark. DVR-time (`isActualTime === false`) scopes: **pure passthrough — no offset, no rounding**. Verified against source: the demo's `generateExtractedScopes` (create-store.ts) wrongly runs EVERY scope through `calculateCorrectedTimeRange`, so DVR-time scopes get the offset applied in the reverse direction, mislabeled, then rounded — a genuine bug that row 43's COMPLETE verdict missed (the branch predates P0/P1 review scopes). Fix queued as P2.6. Phone-side: CORRECT — the phone passes DVR-time scopes raw (offset informational only), matching the ruling's core invariant; its rounding of the raw branch is a practical no-op per the owner's domain rationale (a DVR-time requester stood at the device, saw its clock, and requested exactly those times — the recovery is usually exactly what was asked). No phone bug; question withdrawn 2026-07-31. The rationale ships in P2.6's code comments: offset-and-round exists for REAL-TIME requests (mapping the requester's real-world window onto the DVR's timeline, padded outward); DVR-TIME requests are already the answer.

**P2 completed — PR #31 merged 2026-07-31.** Effects: row 45 (Notes) COMPLETE (the 7-section engine — G2 DONE); rows 38/39 COMPLETE (editable OCR confirm + DateDisambiguationWarning; the today-guess gate is deliberately ahead of phone); row 29 COMPLETE (GPS capture + accuracy ratings + formatAddress; contact placement fixed); row 46 COMPLETE (finalSubmissionSchema gate — G9 DONE; G8 fully closed); row 34 COMPLETE (4 DST advisories + recalculate guard); row 43 corrected per D10 (DVR-time passthrough). New shared primitives: AlertDialog (row 28's demand — P3.1/P4.5/P5.3 unblocked), the GPS capability (P3.4/P3.7 consume it), isLive() persistence honesty. Review trail: docs/code-reviews/parity/p2/ (39 findings, 3 rounds, final APPROVE). A/B verdict + P3 decision: P2-DEBRIEF.md.

**P6 completed — PR #35 merged 2026-07-31.** Effects: row 19 COMPLETE (map at phone feature depth: supercluster clustering at the phone's exact ShapeSource config — the supercluster-dependency premise refuted at source; status/text filters with the phone's post-filter count semantics; Turf proximity ring with the phone's incident/camera exemption asymmetry; per-camera markers with show/hide + honest `2 of 5` dropped-fix counting; loading/error overlays with terminal-error classification). Cross-phase reconcile landed in the PR (P5.4's export footer inside P6's rewritten sheet; one combined-tree fixture break caught by the merged-head gate). New production fix found en route: §79a (phone-frame CSS scale displaced long-press coordinates; mapbox's own getScaledPoint formula, verified char-for-char by three lanes). Tests 2893→3073. Review trail: `docs/code-reviews/parity/p6/` — initial 0B/11M/14m (R-1..R-27 from 52 raw) → fix round 24+3-seam-deferrals + R-25 refutation upheld → fix-delta 0 UNFIXED → micro-round 6/6 → spot-delta ×4 APPROVE → **APPROVE**. Ledger §72 amended + §79 (a–k).

**P5 completed — PR #34 merged 2026-07-31.** Effects: rows 7/24 COMPLETE (Export as the registry-driven 4th tab + ExportHub: tri-state selection, one-decision footer; G7 DONE); row 25 COMPLETE (unified progress/validation ExportModal, derived-mode, AT-audible); row 27 COMPLETE (ExportActionSheet from Completion, options at the caller per phone); row 28 COMPLETE (blocking-alert taxonomy via the shared AlertDialog — which gained the opener-capture focus fix at the primitive); rows 17/20 COMPLETE (the REAL Case Map download, wired through the export flow with prefetch-on-map-open; honest coverage clause naming dropped locations; the stale "(#36)" pointers in rows 17/20 are corrected by this addendum — the case-map entry point is the MAP SHEET FOOTER, phone-verbatim); ZIP pipelines terminate in the D4 blocking notice; PasswordModal not built (D4). Engine: `engine/logic/export/` ported pure with ~98% coverage; selection/flow state ephemeral by verified phone precedent (SNAPSHOT_VERSION still 6). Tests 2570→2893. Review trail: `docs/code-reviews/parity/p5/` — initial 0B/8M/20m (R-1..R-28) → fix round 27/28 + §75e deferral → fix-delta 0 UNFIXED → micro-round 11/11 → **APPROVE**. Ledger §§70–78 + amendments; TWO new phone bugs (items 10/11) + back-port B6. NOTE: the export/map cross-phase seam (exportMapPending/exportMapBlocked props) reconciles into P6 at its pre-PR master merge.

**P4 completed — PR #33 merged 2026-07-31.** Effects: row 37 COMPLETE (real webcam OCR — LANDSCAPE viewfinder per the owner directive, phone crop geometry 80%×17% + width-only 5% buffer verified at source, lazy tesseract.js with self-hosted assets measuring 10/10 exact reads @94–96 conf, `OcrProof.imageDataUrl` now fills the Time-Offset PDF's evidence block); rows 49–55 COMPLETE (MediaCaptureScreen: permission stages, mode pill, recording badge, photo/video review with accept/retake); row 56 COMPLETE (shared MetadataForm at both accept paths; no P7 filename dependency — `{user}` is user-typed, refuted with file:line); rows 57–66 COMPLETE (media library: tabs, previews, fullscreen, long-press delete via useLongPress third call site; phone verified display-only so the form keeps two callers; D-B6 honored — every close path clears state); rows 67–69 COMPLETE (audio recorder: AnalyserNode waveform, CRT, 500ms gate on BOTH controls — phone bug ledger item 9 — and the deliberate no-auto-reset decision); row 80 COMPLETE (Media accordion + honest save-status original; two row-80 claims refuted §59). SNAPSHOT_VERSION 5→6 (media bytes never persisted; blob-strip on write). Tests 1908→2570; /demo First Load 107 kB throughout (tesseract fully lazy). Review trail: `docs/code-reviews/parity/p4/` — initial 1B/11M/20m (R-1..R-33) → fix round 32/33 + §66d rider → fix-delta 0 UNFIXED → targeted round FD-1..7 all FIXED → **APPROVE**. Nine §§ in the deferred ledger (58–66 + inline updates); phone bug ledger grew to 15 items.

**P3 completed — PR #32 merged 2026-07-31.** Effects: rows 8/9 COMPLETE (dashboard depth + CaseActionsSheet); rows 10/11/12 COMPLETE (CRUD, gate, duplicate check, edit mode); rows 13/14/15 COMPLETE (real GPS in the location modal, the 6-action duplicate chooser — the LAST open field-parity key — and the 2-arm delete modal); rows 22/23 COMPLETE (incident editing); row 42 COMPLETE (per-camera GPS, snapshot v5). The case-management layer is at full parity. Review trail: docs/code-reviews/parity/p3/ (initial 0B/3M/14m → fix round + micro-round → APPROVE; 21 vetted findings resolved). Notable: the review's own fix shape refuted once with layout evidence; three touch tests exposed as simulating mouse holds.

**P1 completed — PR #30 merged 2026-07-31.** Effects on this matrix: rows 71/72 (picker/paste) COMPLETE (phone-verbatim with D5 honesty adaptations, deferred §33); row 73 (flow shell + dwell) COMPLETE (`computeImportFlowMode` port; results hold until the CTA, failures included); row 74 (live terminal) COMPLETE — the owner-flagged deliverable (log bus + phone-cited TerminalLine/ImportTerminalProgress, dual trust scopes, keyboard + SR accessible); row 79 (error enrichment) COMPLETE (ERROR_MESSAGES / Technical Details / Data Found); rows 47/48 (PDF previews) COMPLETE for save+dismiss (real `window.print()` with pinned sandbox; one-click download evidence-based no-ship, deferred §34); G10 DONE. Review trail: `docs/code-reviews/parity/p1/` (R-1..R-51 across three rounds; final verdict APPROVE; R-45..R-51 carried as P2 riders). Side-by-side baselines (phone vs demo terminal) captured by the verification lane.

**P0 completed — PR #29 merged 2026-07-30.** Effects on this matrix: row 6 COMPLETE (plus an `app/demo/error.tsx` route-segment outer net beyond the mapped surface); G1 DONE (sessionStorage, versioned v2 snapshot, compile-time drift guards); G3/G4 DONE (truthful location statuses; completion is location-scoped and honestly labeled "Location Complete"); G5 DONE (canonical `engine/content/form-options.ts`, custom/"Other" path on Resolution/FPS, demo-only option values dropped); G6 DONE (`ui/glass-tokens.ts` + source-scan guard). Row 10's status slice and row 46's status bug are fixed (their CRUD / final-gate remainders stay P3 / P2); row 44's option-drift half is fixed (validation-gate half stays P2). G10 is built and banked on `parity/p1-fonts` (merges with P1). Full review trail: `docs/code-reviews/parity/p0/` — initial (1B/3M/14m) → fix-delta (0B/1M/11m) → fix-delta r2 **APPROVE** (0B/0M/10m carried as P1 riders).
