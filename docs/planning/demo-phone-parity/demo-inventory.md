# Demo Experience Inventory — `demo-website-dvr-extraction-notes`

Repo: `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes`
Compared against phone app: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`
Date of inventory: 2026-07-30. Read-only audit; nothing modified.

Canvas Hub: **not mentioned anywhere in this repo** (grep for `canvas hub` / `canvas-hub` returns
nothing). The only "canvas" references are the *future* `canvas` **profile** (a trimmed
investigator field-set — `engine/content/profiles.ts`) and `HTMLCanvasElement`-adjacent map code.
Out of scope, no action.

---

## 1. Tech stack & structure

### Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 15.1.11, App Router**, React 19.2.3, TypeScript 5.7 strict (`target: es5`, `jsx: preserve`) |
| Package manager | **pnpm** (`packageManager: pnpm@10.15.1`, `pnpm-lock.yaml` authoritative). Package name is still the template's `open-pro-next`. |
| Dev server | `pnpm dev` → `next dev --turbopack` |
| Routing | File-based App Router with **route groups**. Marketing under `app/(default)/`; the demo is a *sibling* at `app/demo/` so it inherits the root layout only (no marketing chrome). |
| Styling (marketing) | **Tailwind CSS v4, CSS-first config** — no `tailwind.config.js`; `@theme` block in `app/css/style.css`; `@tailwindcss/postcss`; `@tailwindcss/forms` via `@plugin` |
| Styling (demo) | **Inline `CSSProperties` objects, NOT Tailwind** — deliberate. `features/demo/ui/demo.css` holds only globals + a keyframe library, scoped under `[data-demo-root]`. |
| State (demo) | **Zustand vanilla store** (`zustand/vanilla` `createStore`), one store instance created per `DemoExperience` mount via `useRef`, consumed with `useStore(store, selector)`. No React context, no URL state, no `persist` middleware. **Persisted since P0.4 (D2):** the bridge rehydrates from a versioned per-tab `sessionStorage` snapshot at store creation and mirrors changes back debounced (250 ms) with a `pagehide` flush (`engine/store/persistence.ts`); injected stores (the test seam) are never persisted; a fresh tab still boots empty. Trade + details: deferred.md §29/§32. |
| Validation | `zod` ^3.25 — the **marketing beta form** (`lib/beta/schema.ts`) and, since P0.4, the **demo's snapshot shape guard** (`engine/store/persistence.ts` — first client-shipped zod, ~13 kB gz in the demo chunk; trade recorded in deferred.md §32). Demo *field* validation remains `parseCoordinate` (lat/lng) only. |
| Animation | `motion` (Framer Motion v12 successor) — `AnimatePresence` + variants for screen cross-slide and drawer push. Honors `prefers-reduced-motion`. |
| Maps | `mapbox-gl` ^3.25 + `@mapbox/search-js-core` ^1.5 (SearchBox autocomplete + GeocodingCore forward geocode) |
| PDF parsing | `pdfjs-dist` ^6.1 — browser-side text extraction, dynamically imported |
| Tests | **Vitest 4 + jsdom + React Testing Library** (`vitest.config.mts`, `vitest.setup.ts`). **110 test files total, 82 of them under `features/demo/`.** Coverage thresholds (80% lines/fn/branches/stmts) apply only to `lib/**` and `features/demo/engine/**`; `features/demo/ui/**` is deliberately excluded from coverage but has extensive component tests. |
| Lint | `next lint`; `next.config.js` explicitly adds `features` to `eslint.dirs` so the demo isn't silently skipped. |

### Where the demo lives vs. marketing

```
app/
  layout.tsx              ROOT layout — global CSS + fonts ONLY, renders no chrome
  (default)/              ── MARKETING half ──────────────────────────
    layout.tsx            server component: Header, ManifestTabStrip, Footer, ambient bg
    page.tsx              home
    features/[slug]/      feature catalog pages (content-driven)
    beta/, privacy/
  demo/
    page.tsx              13 lines. 'use client' + next/dynamic({ ssr:false }) → @/features/demo
  api/
    extract/route.ts      Route Handler: server-side model proxy (Ollama Cloud) for AI import
    extract/guards.ts     body cap + same-origin allowlist + in-memory per-IP rate limit
    hello/route.ts        template leftover (3 lines)

components/               ── MARKETING only ─────────────────────────
  ui/ home/ feature/ beta/ marketing/  (server components except where noted)
lib/                      ── MARKETING only ─────────────────────────
  content/features.ts     the feature catalog (473 lines) — marketing single source of truth
  beta/, hooks/, cn.ts, site-config.ts, to-public-url.ts

features/
  demo/                   ── THE DEMO EXPERIENCE — everything lives here ──
    index.ts              2 lines: the ONLY public export is `DemoExperience`
    CLAUDE.md             128 lines of demo-specific conventions
    ui/                   presentational layer, every file 'use client'
    engine/               pure TS state/logic core — no React, no 'use client'
```

**Hard boundary, enforced by convention + a test:** marketing code must never import
`@/features/demo` (it would drag mapbox-gl/pdfjs/motion into marketing bundles); the demo reuses
nothing from marketing chrome. `app/(default)/__tests__/chrome-scope.test.tsx` guards that `/demo`
stays chrome-free.

### The demo's internal layout

```
features/demo/
  index.ts                             → re-exports only DemoExperience
  ui/                                  (~3,000 LOC excluding tests)
    DemoExperience.tsx        813 LOC  THE store bridge + screen/modal router
    PhoneFrame.tsx            170      404px frame · 378×786 screen · island · status bar · sweep
    usePhoneScale.ts           22      fits 404×812 into viewport, capped 1:1
    ScreenStage.tsx            63      AnimatePresence cross-slide + drawer push layer
    StoryRail.tsx             114      right-hand narration panel
    motion.ts                  75      motion tokens; doubles as the RN/Reanimated port template
    phone-overlay.tsx          35      portal root pinned to the phone screen viewport
    demo.css                  122      globals + keyframes, scoped to [data-demo-root]
    screens/                  ~1,700   one component per screen + modals + view-model mappers
      map/                    ~1,000   the whole map sub-feature (13 files)
    controls/                 ~400     TabBar, WizardDrawer, ExitDialog, ExploreChecklist
    inputs/                   ~800     Dropdown, Calendar, DateField, TimeField, TimeWheel,
                                       PickerSheet, DateTimeField, AddressAutocomplete
    primitives/                60      TypewriterText + useTypewriter
    chrome/PdfPreview.tsx      35      iframe PDF preview
    import/                   ~230     run-import, pdf-extract, extract-client, geocode (IO layer)
  engine/                              (~2,400 LOC excluding tests)
    index.ts                   53      internal API barrel
    types/index.ts            225      the whole domain model
    store/create-store.ts     420      Zustand vanilla store: 16 actions
    store/selectors.ts        237      derived reads incl. drawer dots + map status
    store/helpers.ts           36      setPath (immutable dot-path write) + mediaBucket
    logic/time.ts             141      bidirectional DVR↔actual math (ported from the app)
    logic/time-sync.ts         35      simulated NTP
    logic/ocr.ts              158      OCR text cleaning + multi-format timestamp parsing
    logic/retention.ts        106      DVR retention / overwrite countdown (ported)
    logic/coordinates.ts       38      strict lat/lng parse + range validation (ported)
    logic/import.ts           238      AI prompt, JSON parse, AI→form mapping (ported)
    logic/import-normalize.ts 277      null/phone/enum/officer normalization + date pipeline
    logic/datetime-normalize  191      model date formats → canonical (ported)
    logic/date-disambiguation 251      MM/DD vs DD/MM resolution (ported)
    logic/year-disambiguation 203      AI year-hallucination correction + cold-case guard (ported)
    logic/datetime-parts.ts   128      pure parts math for the pickers
    logic/pdf/case-notes.ts   251      the Case Notes court document (HTML)
    logic/pdf/time-offset.ts  232      the Time-Offset Calibration report (HTML)
    logic/pdf/shared.ts        26      escapeHtml / formatDocDate / nowStamp
    content/screens.ts         66      WIZARD_SCREENS / CHAPTERS / LAUNCHABLE / DRAWER_DEFS
    content/narration.ts      249      story-rail copy per chapter + modal + map
    content/explore.ts         44      the exploration-manifest registry
    content/seed.ts            66      SAMPLE_REQUEST_DOC + blankLocationForm
    content/profiles.ts        23      profile config (forensic today; canvas is future work)
```

### The one architectural rule

**`ui/DemoExperience.tsx` is the ONLY component that touches the store.** Every screen, modal,
control and chrome component below it is purely presentational — data in via props, intent out via
callbacks. This is the web mirror of the phone app's callback-isolation rule (feature components
never import Zustand; route wrappers own store access). It is followed *consistently* across all
~50 UI files — I found no violation.

Other enforced conventions (from `features/demo/CLAUDE.md`):
- **No `Date.now()` / `Math.random()` for ids or keys** — module-level monotonic counters (`uiSeq`
  in `DemoExperience`, `seq`/`nextId` in the store) keep it deterministic and SSR/replay-safe.
  (`Math.random()` *is* used inside `simulateNtpSync` for jitter, and `Date.now()` inside the
  import clock seam — both at event scope, never at render/module scope.)
- Every `ui/` file is `'use client'`; `engine/` is framework-agnostic plain TS.
- Inline styles lifted verbatim from a source prototype (`DVR Extraction Notes Tour.dc.html`) —
  the `404 = 378 + 13×2` frame math and `box-sizing: border-box` are load-bearing; the CLAUDE.md
  explicitly forbids "tidying" them.

---

## 2. Screen inventory

### Routing model

There is exactly **one URL** (`/demo`). Everything is an in-memory `view` switch:

```ts
type AppView = ChapterId | LaunchableId | 'map'
type ChapterId    = 'splash' | 'dashboard' | 'cases' | WizardScreenId
type WizardScreenId = 'submission' | 'requestedScope' | 'arrivalDeparture' | 'timeOffset'
                    | 'extractedScope' | 'dvrInfo' | 'cameras' | 'exportInfo' | 'notes' | 'completion'
type LaunchableId = 'ocr' | 'mediaCapture' | 'audioRecording'   // ← last two unbuilt
type ModalId      = 'newCase' | 'newLocation' | 'import' | 'mediaLibrary'  // ← last one unbuilt
```

`DemoExperience.activeScreen()` is a `switch (view)` returning JSX; `activeModal()` is a
`switch (modal)`. Ordering/numbering is **derived from array position** in
`engine/content/screens.ts` (`WIZARD_SCREENS`, `CHAPTERS`), never hand-typed — this is what fixed
the source prototype's colliding "01 · …" nav-number bug.

**Wizard order diverges from the phone app.** Demo: submission → requestedScope →
arrivalDeparture → timeOffset → **extractedScope** → dvrInfo → cameras → exportInfo → notes →
completion. Phone: submission → requested-scope → arrival-departure → time-offset → *ocr-capture* →
dvr-information → cameras → **extracted-video-scope** → export-information → media-capture →
audio-recording → notes → completion. Extracted-scope sits at position 5 in the demo vs. 8 on the
phone (the demo's placement is arguably the better teaching order — it lands right after the offset
that generates it).

### The table

Status key: **Complete** = does what the phone screen does for the fields it exposes ·
**Partial** = real logic, but fewer fields/actions than the phone · **Stub** = renders but the
logic is simulated/hardcoded · **Static** = pure visual · **Missing** = not built.

| # | Demo surface | File(s) | Phone counterpart | State | What actually WORKS (logic) vs. visual-only |
|---|---|---|---|---|---|
| 1 | **Splash / biometric lock** | `ui/screens/SplashScreen.tsx` (74) | `src/features/biometrics` splash + auth gate | **Static** | Tap anywhere → `setView('dashboard')`. `authState` prop is hardcoded `'idle'` by the bridge, so the `scanning`/`authorized` branches are dead code. **Effectively unreachable**: the demo boots on `cases`, nothing links to `splash`, and `explore.ts` deliberately omits it ("unreachable until the deferred video entry"). No biometric simulation; the phone's Face ID gate on PDF export is also absent. |
| 2 | **Dashboard** (Recent Activity) | `ui/screens/DashboardScreen.tsx` (70) + `screenData.ts` | `app/(tabs)/home.tsx` | **Partial** | Real: renders the live store's cases as a glowing timeline (status dot + connector), personnel chips (OIC/VC), created label, location pills; tapping a location pill calls `switchLocation` + `setView('submission')`. Empty state ("No cases yet"). Read-only otherwise — no stats, no quick actions, no sync status. |
| 3 | **Cases library** | `ui/screens/CasesScreen.tsx` (79) | `app/(tabs)/cases.tsx` | **Partial** | Real: expandable case cards (accordion state lifted to the bridge), per-case **Import** + **Add Location** buttons, per-location rows that open the wizard, "New Case" (+) header button, derived `N locations` label, status theming. Missing vs. phone: edit/delete/duplicate/archive a case, search/filter, **ZIP/AES export**, per-location status (every location row is hardcoded `caseStatusTheme('draft')` — a real bug-ish shortcut, since `selectLocationMapStatus` already derives a truthful status and the map uses it). |
| 4 | **New Case modal** | `ui/screens/NewCaseModal.tsx` (161) | `NewCaseModal` (phone) | **Complete-ish** | Real: controlled form held in bridge `useState`; **collapsed `<details>` accordions** for OIC and Video/Canvas Coordinator; **Mapbox address autocomplete** that fills street + city + lat/lng and stamps `source: 'geocoded'`; **manual lat/lng entry** with on-blur strict parse + range validation (`parseCoordinate`), red border + inline error; a live coordinate chip (`43.650000, -79.380000 · Manual/Geocoded`). Submit builds `incidentCoordinates` only when BOTH axes parse. No required-field gate (Case Number/Unit are starred but not enforced) and **no duplicate-case-number check** (the phone has `DuplicateCaseNumberError`). |
| 5 | **New Location modal** | `ui/screens/NewLocationModal.tsx` (61) | phone new-location modal | **Partial** | Real: controlled form, Mapbox autocomplete → street/city/coords, submit creates the location with `gps.source='geocoded'`. **"Capture GPS coordinates" button is a no-op** — the bridge passes `onCaptureGps={() => undefined}`. No multi-sample GPS, no accuracy readout (phone's camera-gps feature). |
| 6 | **Import modal** (PDF + paste) | `ui/screens/ImportModal.tsx` (195), `ImportResultBody.tsx` (93), `ImportResultAccordion.tsx` (63), `importResultData.ts` (106), `ui/import/*` (230), `app/api/extract/*` | `ImportPickerModal` + `ImportFlowModal` + `ImportResultDetails` + `BatchResultDetails` (json-import), **`ImportTerminalProgress` + `TerminalLine`** (pdf-import) | **Complete logic / OLD design** | See §6 — this is the screen the owner flagged. Logic is genuinely deep (real pdf.js extraction, real model call, real normalization pipeline, batch, cancellation tokens, geocoding, honest sample attribution). **The progress UI is the old 3-step checklist**; the phone was redesigned to a live terminal. |
| 7 | **Submission details** | `ui/screens/SubmissionScreen.tsx` (67) | `app/(form)/submission.tsx` | **Partial** | Real: 3 `SectionCard`s (Case Information read-only OCC #, Requester Information ×5 fields, Location Information ×5 fields); every keystroke writes through `updateField(path)` into the store; Mapbox autocomplete on Street Address writes street+city and stamps `gps` on the location. Missing: the phone's fuller requester/agency set + form-customization field hiding. |
| 8 | **Requested scope** | `ui/screens/RequestedScopeScreen.tsx` (57) | `app/(form)/requested-scope.tsx` | **Complete** | Real: add/remove/edit N scope rows; **real DateTime pickers** (bottom-sheet calendar + HH:MM:SS wheel); Real-Time vs DVR-Time segmented toggle that flips `isActualTime` (which is what the offset math keys off); cameras free-text. |
| 9 | **Arrival / departure** | `ui/screens/ArrivalDepartureScreen.tsx` (43) | `app/(form)/arrival-departure.tsx` | **Complete** | Real: add/remove/edit visit pairs with the same DateTime pickers. Empty-state copy. |
| 10 | **Time offset** (the marquee) | `ui/screens/TimeOffsetScreen.tsx` (110) + `SyncStatusCard.tsx` (86) | `app/(form)/time-offset.tsx` | **Complete** | The most complete screen. Real: DVR vs Actual DateTime capture; **"Use Current Time"** runs `simulateNtpSync()` after an 1100 ms fake round-trip and writes the calibrated time + full `SyncResult`; **Calculate** runs the *real ported* `calculateTimeDifference` → commits `TimeOffsetData` → immediately runs `generateExtractedScopes`; the big "Time Difference `HH:MM:SS` / DVR is AHEAD OF real time" readout; **Adjusted Time Ranges** cards computed live by `selectAdjustedScopes` (exact `calculateCorrectedTimeRange`, no rounding); a **DVR Applies DST** switch; "Capture from DVR" launches OCR. `SyncStatusCard` is stated to be full parity with the phone's: status, method, server (`time.nrc.ca`), device offset ±ms, uncertainty, network delay (RTT/2), calibrated-at, and the traceability chain string. |
| 11 | **OCR capture** | `ui/screens/OcrCaptureScreen.tsx` (85) | `app/(form)/ocr-capture.tsx` (ML Kit) | **Partial / simulated capture, real pipeline** | Visual: a HUD with corner brackets and "AIM AT THE DVR CLOCK", an honest "No camera available here" notice. Real: **both** the shutter button and "Use sample DVR clock" run the genuine `cleanOcrText` → `parseTimestampFromText` → `getConfidenceLevel` pipeline over a hardcoded raw string `'2025-03-08 12:05:30'`; the parsed value writes `capture.dvrDateTime`, sets `captureMethod='ocr'`, seeds a default actual time; confirm → `calculateOffset` + `generateExtractedScopes` + return to the anchor chapter. Failure branch (unparsed) renders a real error card. **No live camera, no bounding-box UI, no image evidence** (`OcrProof.imageDataUrl` is typed but never populated, so the Time-Offset PDF's OCR image block is always empty). |
| 12 | **Extracted video scope** | `ui/screens/ExtractedScopeScreen.tsx` (46) | `app/(form)/extracted-video-scope.tsx` | **Complete** | Real: renders the store's auto-generated DVR-time windows (`generateExtractedScopes` = corrected range + `roundTo5Min` down/up); each row editable; per-row remove; **"Regenerate from offset"**; empty-state prompt. Store-side, non-canonical scopes are skipped, counted, dev-warned, and flagged via `extractedScopesPartial` — which the PDF then annotates rather than silently omitting. |
| 13 | **DVR information** | `ui/screens/DvrInfoScreen.tsx` (130) + `logic/retention.ts` | `app/(form)/dvr-information.tsx` | **Complete+** | Real: Basic DVR Details (5 fields), Recording Configuration (channels, active cameras, Resolution + FPS custom dropdowns, **multi-select Continuous/Motion schedule** serialized as `"continuous, motion"` to match the phone), and a **Retention** section: a `DateField` for First Recorded Date drives `buildRetentionView` → **Total DVR Retention in days** + a **per-scope overwrite countdown** with SAFE/WARNING/CRITICAL/OVERWRITTEN status chips. The derived total is written back into `form.dvr.totalDvrRetention` (the PDF's source) by an effect in the bridge, with a careful guard so an import-provided retention string is never clobbered. |
| 14 | **Cameras** | `ui/screens/CamerasScreen.tsx` (45) | `app/(form)/cameras.tsx` | **Partial** | Real: add/remove/edit camera rows with name + Resolution/FPS dropdowns sharing `field-options.ts` with DVR Info. `CameraEntry.gps` is in the type but **there is no per-camera GPS capture UI** (the phone has it). |
| 15 | **Export information** | `ui/screens/ExportInfoScreen.tsx` (38) | `app/(form)/export-information.tsx` | **Complete** | Real: 3 dropdowns (media / file type / provided-via), size text field, media-player `Toggle`. **Option sets canonical since P0.3:** the screen renders the phone-lifted lists from `engine/content/form-options.ts` (via the `ui/screens/field-options.ts` re-export), guarded by `option-parity.test.tsx`; the former `FORM_OPTIONS` registry in `engine/logic/import.ts` was deleted (reviews R-11/R-17/R-20 — tombstone at `import.ts:199`). |
| 16 | **Notes** | `ui/screens/NotesScreen.tsx` (34) | `app/(form)/notes.tsx` + `features/documentation/notes` | **Partial** | Real: editable textarea bound to `form.notesText`, edits set `notesEdited=true`, **Regenerate** calls the store's `generateNotes()`. But `generateNotes` is a **thin hand-rolled 6-line builder** (occurrence, address, requester, one offset line, one line per requested scope) — nowhere near the phone's bullet-point formatters with hash-based change detection. This is the weakest "real logic" screen. |
| 17 | **Completion & review** | `ui/screens/CompletionScreen.tsx` (92) | `app/(form)/completion.tsx` | **Partial** | Real: a live summary card (OCC #, location, DVR, offset, scopes/cameras counts, export), Date/Time Completed + Completed By fields writing to the store, **Preview / Export PDF** → real `generateCaseNotesDoc`, **Preview Time-Offset Calibration** → real `generateTimeOffsetDoc`, and a "Complete & Save" that flips a **local `caseCompleted` boolean in the bridge** to a success state. Note: completing does **not** change the case's `status` in the store — the case card stays "Draft". No biometric export gate, no encryption/password, no ZIP. |
| 18 | **PDF preview overlay** | `ui/chrome/PdfPreview.tsx` (35) | PDF export/share sheet | **Partial (real content)** | Renders the genuinely-generated court-document HTML in a `sandbox=""` iframe (maximally restrictive — no scripts/forms/popups). "Save as PDF" is a **stub** (just closes). |
| 19 | **Case Map** | `ui/screens/map/` — `MapScreen` (143), `MapCanvas` (179), `mapData` (125), `buildMarkers` (35), `MapBottomSheet` (135), `SheetHandle` (69), `LocationList` (28), `LocationRow` (62), `LocationDetailCard` (122), `CallConfirmSheet` (50), `DemoNotification` (43), `mapTokens` (33), `CaseMapPicker` (156) | `app/(tabs)/map.tsx` + `src/features/location/map-view` | **Complete** | The most fully-realized sub-feature. Real: live **mapbox-gl satellite-streets** canvas (GL engine lazily imported in an effect), status-coloured location dots + a red incident teardrop, camera `flyTo` on select, a **3-detent draggable bottom sheet** (peek 116 / partial 340 / full 560) with pointer-drag + threshold snapping and a defensive `endDrag` so a missed release can't strand it, list ↔ detail modes, a location detail card with tap-to-call / tap-to-email, an iOS-style **call-confirm action sheet** that then shows an honest "Calling isn't available in the demo" banner, "Go to Location" handing off into the wizard, and a **mandatory-then-dismissible case picker** (`CaseMapPicker`) with a disabled "All Cases" row teasing future work. Pin colours are lifted verbatim from the phone's map-view constants. Graceful no-token fallback in `MapCanvas`. |
| 20 | **Wizard drawer** | `ui/controls/WizardDrawer.tsx` (163) | `src/components/layout/CustomDrawerContent.tsx` | **Complete** | Real: 300px slide-in over a scrim with a `-72px` push of the whole screen stack; items come from `selectDrawerItems` (profile-filtered); **per-screen completion dots** from `selectDrawerStatus` (green complete / amber partial / no dot when empty) explicitly mirroring the phone's `useSectionCompletion`, including the two documented opt-outs (DVR serial, media-player toggle); status also exposed via `aria-label`; "Back to Cases". |
| 21 | **Tab bar** | `ui/controls/TabBar.tsx` (63) | `app/(tabs)/_layout.tsx` | **Partial** | Dashboard / Cases / Map. The phone also has an **Export** tab — absent here. |
| 22 | **Story rail** | `ui/StoryRail.tsx` (114) + `content/narration.ts` (249) | *no phone counterpart* | **Complete** | Demo-only. Per-screen eyebrow/title/paras/bullets/tip; anchor precedence is open-modal → map → current chapter. |
| 23 | **Exploration manifest** | `ui/controls/ExploreChecklist.tsx` (98) + `content/explore.ts` + `selectExploreStatus` | *no phone counterpart* | **Complete** | Demo-only. A numbered checklist of 16 things worth seeing; rows light green when visited (session `visited` record in the store); clicking a row jumps the phone there; the active row auto-scrolls into view (StrictMode-safe, reduced-motion aware); active-row narration renders directly under the active row. |
| 24 | **Exit dialog** | `ui/controls/ExitDialog.tsx` (85) | *no phone counterpart* | **Complete** | Demo-only "before you go" — the rail's Back-to-site link is intercepted when unlit manifest rows remain, listing what the visitor missed. |
| 25 | **Media capture** | — | `app/(form)/media-capture.tsx` | **Missing** | `view === 'mediaCapture'` falls through to a `placeholder()` reading *"The 'mediaCapture' screen is a fast-follow."* **Nothing can even reach it** — no button calls `launch('mediaCapture')`. |
| 26 | **Audio recording** | — | `app/(form)/audio-recording.tsx` | **Missing** | Same as above. |
| 27 | **Media library** | — | `src/features/media/media-library` | **Missing** | `'mediaLibrary'` is in `ModalId` but `activeModal()` has no case (falls to `null`) and nothing opens it. The store's `addMedia`/`deleteMedia` actions and the whole `LocationForm.media` bucket exist but have **zero callers** — dead code today. |
| 28 | **Settings** (all of it) | — | `src/features/settings/*` (catalog, theme, GPS accuracy, time-sync, export security, user profile, cloud sync) | **Missing** | No settings surface of any kind. `profile: 'forensic'` is hardcoded; there is no light/dark toggle (the demo is dark-only). |
| 29 | **Export / ZIP / encryption** | — | `app/(tabs)/export.tsx`, `case-management` ZIP/AES export, `settings/export-security` | **Missing** | Only the iframe PDF preview exists. No ZIP, no AES, no password modal, no case-map-export HTML bundle. |
| 30 | **Cloud sync / agency cloud** | — | `src/features/sync`, `src/features/agency-cloud` | **Missing** | Entirely absent (correctly — nothing to demo in-browser). |
| 31 | **JSON import** | — | `src/features/import/json-import` | **Missing** | The demo's import is PDF + pasted-text only. |
| 32 | **Form customization** | — | `src/features/form-customization` | **Missing** | The `ProfileConfig.hiddenFields` hook exists in types but is always `[]`. |

---

## 3. Logic & infrastructure — how native capabilities are faked

| Native capability | Phone implementation | Demo substitute | Fidelity |
|---|---|---|---|
| **SQLite** | expo-sqlite, single source of truth, transactions, migrations (v11), mutex-protected 4-layer auto-save | **Nothing.** One in-memory Zustand vanilla store, created per mount, **zero persistence** — a page reload wipes everything. `reset()` returns to the empty boot. | Deliberate. `initialState()` boots with `cases: []`, `locations: []`, `view: 'cases'`, `visited: { cases: true }`. Documented owner decision: "the demo boots EMPTY — the visitor creates everything." |
| **NTP / precision time sync** | Real RFC 5905 NTP over UDP via `react-native-udp` to regional atomic-clock servers | `engine/logic/time-sync.ts` → `simulateNtpSync(now)`: fabricates RTT 6–36 ms, root dispersion 0.4–3.0 ms, device offset ±60 ms, then computes uncertainty as the genuine RFC 5905 synchronisation distance (`RTT/2 + rootDispersion`, floored at 10 ms). Hardcoded `server: 'time.nrc.ca'`, `stratum: 2`, and the real traceability chain string. Bridge wraps it in an 1100 ms `setTimeout` for a believable spinner (timer cleared on unmount). | **High for the *shape*, fake for the *values*.** The docblock is explicit that a browser has no raw UDP socket and the serverless host blocks outbound UDP. |
| **Time-offset math** | `src/lib/utils/bidirectional-time.ts` | `engine/logic/time.ts` — a genuine port. All arithmetic appends `'Z'` so DST never shifts a delta; `calculateTimeDifference`, `isDvrTimeCorrect`, `calculateCorrectedTimeRange`, `calculateDSTAdjustedTimeRange`, `isInDST`, `doesRangeStraddleDST`, `roundTo5Min`. Throws loudly on unparseable input rather than emitting `NaN-NaN-NaN` onto a forensic document. | **Real.** This is the same math, not a mock. |
| **ML Kit OCR** | `@react-native-ml-kit/text-recognition` + bounding-box UI + cleaning pipeline | `engine/logic/ocr.ts` — a genuine port of the app's text-cleaning-pipeline and timestamp-parser (protected day/month/meridiem words, O→0/l→1/S→5 substitutions, compressed-time colon repair, '8'-as-colon, 8-digit date recovery, then 8 timestamp format matchers). The *image* is faked: a hardcoded raw string. | **Pipeline real, capture fake.** Carries one live `TODO(M2)` at `ocr.ts:135` about the time-only → "today" guess. |
| **Camera / video / audio** | vision-camera, expo-audio-studio, expo-audio, temp-file managers | **None.** No `getUserMedia`, no file capture. Media store actions exist with no callers. | Missing. |
| **GPS** | expo-location multi-sample with accuracy targeting; `src/features/location/camera-gps` | **Forward geocoding only** — Mapbox `SearchBoxCore`/`SearchSession` autocomplete (`AddressAutocomplete`) and `GeocodingCore.forward` (`ui/import/geocode.ts`), plus manual lat/lng typing on the incident. `gps.accuracyM` is always written as `0`. `NewLocationModal`'s "Capture GPS" button is a hard no-op. | Partial. `buildGeocodeQuery` is a verbatim port of the phone's (street+city first; city-only deliberately skipped because it resolves to a centroid). |
| **PDF text extraction** | native `expo-pdf-text-extract` | `ui/import/pdf-extract.ts` — real **pdf.js v6** in the browser, dynamic `import('pdfjs-dist')`, per-page `getTextContent()`, `<50 chars ⇒ PdfExtractionError` ("looks scanned or image-only"), `destroy()` in `finally` with a swallowed teardown error so it can't shadow the real one. | **Real**, and arguably a cleaner implementation than a mock would be. Raw bytes never leave the device. |
| **AI extraction** | `AiExtractionProvider.extract()` seam | `app/api/extract/route.ts` — a real server-side proxy holding an **Ollama Cloud** key (`OLLAMA_API_KEY`, default model `llama3.2:3b`, temp 0, `stream:false`, AbortController timeout). Returns raw model text only; all parsing/normalizing/mapping happens client-side, exactly like the phone. **Keyless → 503 `NOT_CONFIGURED` → deterministic `SAMPLE_EXTRACTION` fallback**, so the demo works with no key. Abuse guards: 50 KB body cap, same-origin allowlist, in-memory per-IP token bucket (20/min default). | **Real live model when configured.** |
| **Biometrics** | expo-local-authentication gate on launch + PDF export | Decorative splash only, unreachable. | Missing. |
| **Haptics / notifications** | native | `DemoNotification` — a 2.6 s auto-dismissing iOS-style top banner used for "Calling/Email isn't available in the demo". | Honest stub. |

### Central store — the 16 actions

`createDemoStore()` (`engine/store/create-store.ts`):
`reset`, `createCase`, `addLocation`, `switchLocation`, `updateField(path, value)`, `setView`,
`openModal`, `closeModal`, `setDrawerOpen`, `launch`, `closeLaunch`, `calculateOffset`,
`generateExtractedScopes`, `generateNotes`, `applyImport`, `addMedia`, `deleteMedia`.

Notable design details:
- `updateField` takes a **dot path** and routes `capture.*` writes to the ephemeral capture slice
  and everything else to the current location, via `setPath` — an immutable dot-path writer that
  clones every node so subscribers see new references, **and dev-warns when it creates a
  previously-absent key** (catches `form.scpoes` typos before they orphan data).
- `currentChapter` is set only by chapter navigation, never by `launch`/`closeLaunch` — so a launch
  screen (OCR) returns to its anchor and the rail narration doesn't break on the Map tab.
- `visited` is a `Readonly<Partial<Record<AppView | ModalId, true>>>` typed to the *recordable id
  space* (a registry typo is a compile error), with an **idempotent `visit()` helper that returns
  the same object reference when already visited** for render economy.
- `generateExtractedScopes` isolates per-entry failures: a non-canonical scope is skipped, counted,
  dev-warned, and surfaced via `extractedScopesPartial` — never silently dropped.
- `applyImport` uses `patch.x || l.x` so a blank extraction never clobbers existing data.

### Selectors (`engine/store/selectors.ts`)

`selectExploreStatus`, `selectAdjustedScopes`, `selectCurrentCase`, `selectCurrentLocation`,
`selectLocationsForCase`, `selectVisibleWizardScreens`, `selectDrawerItems`,
**`selectDrawerStatus`** (per-screen empty/partial/complete dots, mirroring the phone's
`useSectionCompletion` including its documented opt-outs), `aggregateMapStatus` /
`selectLocationMapStatus` (started/working/complete, derived — the demo has no stored
`LocationStatus`), and `selectCaseNotesData` (assembles the PDF input shape).

### Seeded demo data

There is **no seed case** — that was deliberately removed ("owner decision"). The only content
fixture is `SAMPLE_REQUEST_DOC` in `engine/content/seed.ts`: a fictional Peel Regional Police
detective email (Kim's Convenience, occurrence `PR25-0098213`, Hikvision DS-7608, 35-day retention,
cameras 3/4/7, 2025-03-08 23:45 → 2025-03-09 01:30) plus its deterministic
`SAMPLE_EXTRACTION` counterpart in `logic/import.ts`. That pair is (a) the keyless fallback and
(b) the fixture the import pipeline's tests run against.

### Shared utilities

- `engine/store/helpers.ts` — `setPath`, `mediaBucket`
- `ui/screens/screenData.ts` — `toCaseCards`, `caseStatusTheme` (view-model mappers, kept in the UI
  layer so screens stay dumb)
- `ui/screens/importResultData.ts` — `buildImportedLocationView` (empty-omitting sections)
- `ui/screens/map/mapData.ts` — `toMapData` projection (pure, unit-testable without WebGL)
- `ui/screens/map/buildMarkers.ts` — marker descriptors (pure, unit-testable without WebGL)
- `ui/inputs/input-theme.ts` — the `T` token object (the demo's closest thing to a design system)
- `ui/inputs/clock.ts` — a single injectable wall-clock seam (`clock.now`), with a docblock
  explaining it exists partly to dodge Next's TS-plugin rule 71007 on function props to client
  components
- `ui/motion.ts` — motion tokens, explicitly framed as the **port template for the RN app**
- `ui/phone-overlay.tsx` — `PhoneOverlayContext` + `PhoneOverlayPortal`, the fix for the
  "scroll-lift" bug (overlays used to scroll away with the screen)

---

## 4. Extension patterns — how to add a screen

Documented in `features/demo/CLAUDE.md` §"Adding or changing a screen", and the codebase actually
follows it:

1. Build the presentational component in `ui/screens/` — **props in, callbacks out, no store
   import**. Reuse `_shared.tsx`; do not re-roll inputs.
2. Add the id to `WizardScreenId` / `ChapterId` in `engine/types/index.ts`.
3. Register it in `engine/content/screens.ts` (`WIZARD_SCREENS` **and** `DRAWER_DEFS`). Step numbers
   and Next/Back order are derived from array position.
4. Add narration to `engine/content/narration.ts` (`NARRATION` is a `Record<ChapterId, …>`, so a
   missing entry is a compile error).
5. Wire it into `activeScreen()` in `ui/DemoExperience.tsx`, passing store data + callbacks.
6. (Optional) Add an `EXPLORE_ITEMS` row in `engine/content/explore.ts` so it appears on the rail
   manifest — the registry is explicitly allowed to lead or lag the built screens.
7. Add a `selectDrawerStatus` branch so the completion dot is truthful.

**Launch-only** screens (OCR/media) go into `LaunchableId` + `LAUNCHABLE` instead of the flow
registries, so they can only be opened by an action button and never reached via Next/Back.
`motion.ts` dev-warns if a view id is in neither registry (it would silently fade instead of slide).

### Reusable component palette

**Form chrome — `ui/screens/_shared.tsx`** (242 LOC, the workhorse):

| Export | Purpose |
|---|---|
| `ModalShell` | bottom-sheet modal chrome: scrim + rounded panel + blueprint grid + title + close, Escape-to-close, portals through `PhoneOverlayPortal` |
| `Field` | labelled text input or textarea (`multiline`), with `required` star and `hint` |
| `Accordion` | collapsed-by-default `<details>` disclosure (styled marker + rotating chevron via `demo.css`) |
| `ModalActions` | Cancel / primary action row |
| `WizardHeader` | sticky back-arrow + title + hamburger (opens the drawer) |
| `WizardNext` | full-width primary "Continue →" |
| `SectionCard` | titled form section card (gradient + hairline) |
| `DateTimeField` | date + time button pair → calendar sheet + wheel sheet |
| `SelectField` | labelled custom dropdown |
| `Toggle` | keyboard-operable `role="switch"` |
| `AddRowButton` | dashed "+ Add …" button for array screens |
| `switchKeyDown` | Enter/Space activator for `role="switch"`/`button` divs |

**Inputs — `ui/inputs/`** (a genuinely good little library):
`PickerSheet` (shared bottom-sheet chrome for all pickers, scrim/✕/Escape, portalled),
`Calendar` (pure month grid), `DateField` (calendar sheet; opening an empty field auto-populates
today, matching phone behavior; date edits preserve time via `mergeDate`),
`TimeWheel` (scroll-snapped HH:MM:SS columns with an exported pure `indexFromScrollTop`),
`TimeField` (wheel sheet with Cancel/Confirm; confirm preserves the date via `mergeTime`),
`DateTimeField`, `Dropdown` (selector pill + chevron indicator zone + sheet with glowing dot +
checkmark, replacing native `<select>`), `AddressAutocomplete` (Mapbox SearchBox suggest/retrieve
with a pure, unit-tested feature→`{street, city, coords}` extractor), `input-theme.ts` (`T` tokens),
`clock.ts` (clock seam).

**Controls / chrome:** `TabBar` (exports `TAB_BAR_HEIGHT = 50` as the single source of truth so
overlays sit flush), `WizardDrawer`, `ExitDialog`, `ExploreChecklist`, `PdfPreview`, `PhoneFrame`,
`ScreenStage`, `StoryRail`, `TypewriterText`.

**Styling model:** inline `CSSProperties` objects hoisted to module scope as named consts. There is
no CSS-in-JS library and no Tailwind inside the demo. The "glass" look is
`linear-gradient(180deg, rgba(19,34,54,0.85), rgba(26,45,68,0.92))` + `1px solid rgba(30,58,95,0.5)`
+ `borderRadius: 12`, repeated ad hoc across screens (not extracted into a token) — the closest to a
token set is `input-theme.ts` `T` and `map/mapTokens.ts`.

**Palette (de facto):** ink `#0d1b2a` / `#0a1320`, borders `#1e3a5f` / `#2a4a6f`, text `#f0f4f8` /
`#cdd9e6` / `#99badd` / `#7a9fc4` / `#5d7a9a`, primary `#2B8CC1`, accent gradient
`#35A0D6 → #2580AD`, link `#4BA3D4`, success `#10d177`, warning `#ffd93d`, danger `#ff4757`,
rail teal `#4ecdc4`. Monospace: `JetBrains Mono` for data, `Share Tech Mono` for HUD/eyebrows —
both `@import`ed from Google Fonts **inside `demo.css`** (a render-blocking third-party import; the
marketing side uses `next/font` properly).

---

## 5. Docs & tooling

### Tooling

- **No `.claude/` directory in this repo** — no skills, no slash commands, no agents, no
  settings.json. (`.vscode/settings.json` only pins the workspace TS SDK.)
- Root `CLAUDE.md` (repo-wide conventions, two-halves framing) + `features/demo/CLAUDE.md`
  (128 lines, demo-only conventions — the single most useful file for onboarding).
- `.env.example` is well-annotated: `OLLAMA_API_KEY` / `OLLAMA_MODEL` / `OLLAMA_BASE_URL` /
  `OLLAMA_TIMEOUT_MS`, `ALLOWED_ORIGINS` / `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`,
  `NEXT_PUBLIC_TESTFLIGHT_URL`, commented-out Firebase Admin vars (reserved), and
  `NEXT_PUBLIC_MAPBOX_TOKEN` (public by design; without it address fields degrade to plain text).
- `vitest.config.mts` + `vitest.setup.ts`; `next.config.js` adds `features` to lint dirs.
- `README.md` is **still the untouched Cruip "Open PRO" template readme** — stale, describes none
  of this project.

### Docs

44 files under `docs/`, plus the two `CLAUDE.md`s. Branch `master`, HEAD `a87b6de`
(Merge PR #27 — `feat/demo-explorer-m4`).

**The demo's roadmap and parity-gap ledger live entirely in three places** —
`docs/code-reviews/deferred.md`, `docs/planning/field-parity/field-parity-gaps.md`, and the
per-feature "Scope Boundaries" sections. Neither root doc helps: `PROJECT-VISION-AND-PLAN.md`
predates the demo entirely (marketing-only; the sole forward-looking line is the roadmap tease about
"the investigator and door-knock canvassing mode, the live desktop monitoring from the office, and
the will-say statement generation"), and `CHANGELOG.md` + `README.md` are **still the untouched Cruip
"Open PRO" template files** — zero project information.

#### `docs/features/interactive-demo/` — the original build spec (partly superseded)

- `01-interactive-demo-architecture.md` — the original design: two modes (Guided Tour + Free
  Sandbox), a data-driven "director" of per-chapter beats, the domain model, the callback-isolation
  rule. **The guided tour and director it specifies were later deleted.**
- `02-interactive-demo-implementation-plan.md` — the 5-milestone / 16-phase TDD build. Paths are
  stale (`lib/demo/`, `components/demo/`), superseded by the features-migration plan.
- `03-interactive-demo-test-spec.md` — per-phase tests, mock infra, coverage targets, plus an
  explicit regression net for the prototype's two bugs (nav numbering, canned data persisting).

#### `docs/features/demo-explorer/` — the CURRENT shape (all 4 milestones merged)

- `01-demo-explorer-architecture.md` — the pivot: delete `engine/director/` entirely plus
  `mode`/`auth`/`isSeed`/`SEED_CASE`/`SEED_LOCATION`; boot empty at `view:'cases'`; add `visited`,
  `explore.ts`, `ExploreChecklist`, `ExitDialog`, Case-File backdrop.
- `02-demo-explorer-implementation-plan.md` — 4 PR-sized milestones. (Note: its Phase 3 told the
  author to log the splash-video entry as deferred; **that entry was never actually added to
  `deferred.md`** — only the media-screen item exists, as #8.)
- `03-demo-explorer-test-spec.md` — test-file fate map + a source-structural `backdrop.test.ts`
  pattern (reads `demo.css` directly, since jsdom loads no CSS).

**Verbatim — demo-explorer §7 "Scope Boundaries (deferred, deliberate)":**
> - **Splash-video entry** (owner: "we can do that after") — `splash` chapter + screen are kept but unreachable; boot stays at `cases` until then.
> - **Media screens** (`mediaCapture`/`audioRecording`) — placeholders remain; they join `EXPLORE_ITEMS` when built.
> - **Checklist persistence** across visits (localStorage) — session-only v1.
> - **Deep links** (`?screen=`) — deleted with the tour; reintroduce only if marketing needs them.
> - **Screen-resolution adaptation** — owner-parked; layout/proportions untouched in all four slices.
> - **Completed-vs-visited shading** on checklist rows — v1 lights on visited; the wizard drawer already shows completion in-phone.

#### `docs/planning/demo-*` — the parity work stream (every one of these is BUILT)

| Folder | Docs | What it delivered |
|---|---|---|
| `demo-picker-parity/` | 01 arch, 02 plan, 03 test-spec | Replaced native `datetime-local`/`<select>` with hand-rolled `DateField`/`Calendar`/`TimeField`/`TimeWheel`/`Dropdown`/`PickerSheet` + pure `datetime-parts.ts`. **Zero new deps.** Out of scope: range calendars, 12-hour/AM-PM, haptics, light mode, and "the media-capture/audio screens (still deferred fast-follows)". |
| `demo-incident-coordinates/` | 01 plan (+inline test spec) | 4 slices: `coordinates.ts`, keeping Mapbox geocode coords instead of discarding them, `DemoCase.incidentCoordinates`, manual incident Lat/Lng, geocoded coords for recovery locations. Appendix A lists the deliberate divergences from the phone (no device GPS, no reverse-geocode toggle, `accuracyM: 0`, no required-field enforcement). |
| `demo-import-parity/` | 01–03 (date normalization, Slice A, PR #16) + 04–06 (completion screen, Slice B, PR #17) | Ported the three date modules that PR #15 had skipped "with a flawed rationale" — imports were writing free text straight into `scope.startDateTime`. Then the rich sectioned import-result screen + batch accordions. |
| `demo-drawer-status-dots/` | 01 plan (+inline test spec) | Restored the per-screen drawer completion dots via a pure `selectDrawerStatus`. Contains the **per-screen counted-field mapping table** with the two explicit opt-outs (`serialModelNumber`, `mediaPlayerIncluded`). |
| `demo-map-view/` | 01 arch, 02 plan (8 slices), 03 test-spec | The whole map feature. `mapbox-gl` is the only new dep, lazy-imported; `mapbox-gl` is always mocked in tests (no WebGL in jsdom). Appendix C is a manual-verification script. |
| `demo-pdf-import/` | 01 arch, 02 plan, 03 test-spec | Made "Pick a PDF" real: pdf.js → `/api/extract` (Ollama Cloud proxy) → `parseNormalizeMap` → one Location per file. Non-goals: OCR for scanned PDFs, per-field review modal, streaming. |
| `demo-field-parity/` | 01 plan | Closed the *text/select* gaps on screens that already existed (Video/Canvas Coordinator, Incident Location, case Notes, `requesterUnit`, `recordingSchedule` checkboxes, Completion's two fields). Explicitly skipped User Profile and the not-yet-built screens; **GPS deferred entirely**. |
| `demo-screen-transitions/` | 01 plan + **RN-portable Motion Spec** | The cross-slide + drawer push. The Motion Spec token table is explicitly written as the **template for the React Native app**. |
| `features-migration/` | `2026-06-28-demo-feature-colocation-plan.md` | The behaviour-preserving `git mv` of `lib/demo/` → `features/demo/engine/` and `components/demo/` → `features/demo/ui/`. No TDD spec by design — instead a "Regression-Verification Protocol" (baseline test counts must match after every slice). Origin of the `next.config.js` `eslint.dirs` fix and the vitest coverage `include`. |

#### `docs/planning/field-parity/` — THE canonical gap ledger

- `phone-fields.md` (328 ln) — every data-entry field on every phone screen, keyed to real Zod/store keys.
- `demo-fields.md` (245 ln) — the same for the demo. Audit-wide note: **"No required-field validation is enforced anywhere"** in the demo.
- `field-parity-gaps.md` (366 ln) — screen-by-screen MATCH / MISSING-IN-DEMO / DEMO-ONLY / DIFFERS.

**Verbatim — "MISSING IN DEMO (the parity work to add)" — total 29 field keys:**
> **New Case** (8 keys): `metadata.videoCoordinatorName`, `metadata.videoCoordinatorBadgeNumber`, `incidentBusinessName`, `incidentStreetAddress`, `incidentCity`, `incidentCoordinates.latitude`, `incidentCoordinates.longitude`, `notes`
> **Submission** (1): `requesterUnit`
> **DVR Information** (1): `recordingSchedule`
> **Cameras** (5 — per-camera GPS): `latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt`
> **Completion** (2): `dateTimeCompleted`, `completedBy`
> **Media Capture** (2 — screen is a demo placeholder): `filename`, `caption`
> **Audio Recording** (2 — screen is a demo placeholder): `filename`, `caption`
> **User Profile** (7 — screen does not exist in demo): `name`, `badgeNumber`, `timeInFieldStart`, `timeAtAgencyStart`, `currentAgency`, `unitName`, `qualifications`
> **Duplicate Location** (1 — flow does not exist in demo): `name`

> Not counted above (deliberately): the **Location GPS capture** gap… the demo's New Location modal has a **no-op** "Capture GPS coordinates" button and the Submission screen has no GPS input. Classified **DIFFERS** (a non-functional stub exists) rather than MISSING — but it is real functional parity work.

**⚠️ This list is now partly stale** — `demo-field-parity` and `demo-incident-coordinates` closed the
New Case (8), Submission (1), DVR (1) and Completion (2) rows, and the gaps doc was never struck
through. I verified all 12 of those in code. What remains from the list: Cameras GPS (5),
Media Capture (2), Audio Recording (2), User Profile (7), Duplicate Location (1) = **17 keys**.

**Verbatim — "Screens present in one app but not the other":**
> Phone-only (need building in demo): **Edit Incident Location**, **Duplicate Location**, **User Profile** (7 fields), **Media Capture** (demo placeholder only), **Audio Recording** (demo placeholder only).
> Demo-only: **Import** — AI/PDF recovery-request import (intentional demo feature; not a phone gap).

**Verbatim — "Smaller DIFFERS to reconcile (no new fields, behavior/options only)":**
> - Resolution & FPS option-sets + missing custom/"Other" path (DVR + Cameras).
> - Export Media / File Type / Provided-Via option-set divergence.
> - OCR confirmation: demo confirm is read-only; phone allows manual DVR-time correction.
> - Notes storage: demo flat `notesText` vs phone per-section structured (`notesSections`/`notesFreeText`).
> - Required-field enforcement: phone enforces at modal/final-submission; the demo enforces nothing (visual `*` only).

#### `docs/code-reviews/`

- **`deferred.md` (556 ln, 28 numbered items)** — the real TODO ledger; each item has a reason to
  wait *and* a concrete un-defer trigger. Demo-relevant items:

| # | Item | Status |
|---|---|---|
| 3 | `parseAiJson`/`mapAiToForm` blank-vs-garbage signal | ✅ resolved (PR #15, `fieldCount`) |
| 4 | M2 engine refinements — registry exhaustiveness sentinels, `LocationForm.media` ↔ `MediaKind`, math helpers, TZ-pinned DST test, **"OCR assumptions surfaced in M2 UI — the dash parser's MM-DD default and the time-only → today default… the M2 OCR chapter must let a reviewer confirm/correct both"** | open |
| 5 | Type-safety: typed `updateField` path, `NavState` model, `TimeOffsetInput` model, `calculateOffset` empty-input no-op | open |
| 6 | **Phone-app parity checklist (verify before beta)** — requested-scopes-are-picker-only; offset requires a requested scope; "Bidirectional DVR↔real conversion — verify presentation" | open |
| 7 | Drawer a11y — **a full focus trap + focus return** on `WizardDrawer`/`ModalShell` | open |
| 8 | **Media-capture fast-follow** — `MediaCaptureScreen`, `AudioRecordingScreen`, `MediaLibraryModal`, the drawer "Media" accordion, `CamerasScreen` per-camera GPS lock | open |
| 9 | `ImportState` discriminated union; **no single end-to-end "guided tour → PDF" test** | open |
| 10 | Name `YMD`/`Hms` part-shape types | open |
| 11 | Inline "date is in the future" signal — deliberately waiting so it lands **once, across the demo AND the phone app** | open |
| 12 | "Guided-tour flow is piecemeal" | moot (tour deleted) |
| 13, 14 | Date-module type-honesty; DST edge in `inferYearByProximity` (verbatim-port footguns — fixing would diverge from the phone source) | open |
| 15 | Silent-failure backlog — `selectAdjustedScopes` empty catch; `roundTo5Min` silently returns unparseable input | open |
| 16–21 | `locId` narrowing; `MONO_LABELS` coupling; async import handlers lack a top-level `.catch()`; double-Escape closes modal+picker; z-index inversion picker↔drawer; **`PdfPreview` has no Escape/backdrop dismiss** | open (most latent/unreachable today) |
| 22 | Drawer completion dots | ✅ resolved |
| 23 | Dots distinguish complete/partial **by colour only (WCAG 1.4.1)** — a non-colour distinction was implemented then **reverted at the owner's request** | open |
| 24 | **GPS capture** — incident device-GPS, per-camera GPS, the no-op New Location button. "explicit owner call — fields prioritised over the GPS feature this round." Chosen approach: real `navigator.geolocation` | open |
| 25 | Mapbox address autocomplete | ✅ resolved |
| 26 | **Field-parity DIFFERS reconciliation + not-yet-built screens** — the live tracker | open |
| 27, 28 | "Exactly one active manifest row" rests on a test not a type/guard; rail narration renders only when some row is active | open (PR #27) |

  **Verbatim — item #26:** *"remaining non-additive parity items — Resolution/FPS/Export **option-set**
  divergence + a custom/"Other" free-text path (DVR + Cameras + Export); OCR confirm is read-only
  (phone allows manual DVR-time correction); Notes is a flat string vs the phone's structured
  per-section storage; required-field enforcement (demo enforces nothing). Plus the **not-yet-built
  screens**: User Profile (settings UI), Media/Audio Capture (placeholders), Duplicate Location, Edit
  Incident Location."*

- `pr-8-foundation-review.md` — marketing-only, pre-dates the demo.
- **`phone-app-debug.md` — a cross-repo bug ledger pointing AT the phone app.** Three defects found
  while porting the app's logic into the demo, each **fixed in the demo and still marked
  `⬜ Port back to the phone app`**:
  1. `sourceContainsFullDate` substring false-positive trusting a hallucinated year
  2. `findYearTokenNear` only inspecting the first occurrence
  3. a blank time-frame date emitting a spurious "Empty datetime value" adjustment

  This is actionable back-port work for the phone repo, sitting in the demo repo where the phone
  team wouldn't see it.

#### `docs/proposals/interactive-demo-integration.md`

The origin story (no-code proposal, since executed): turn the standalone `.dc.html` prototype into
the site's showpiece; keep `app-logic.js` (the "crown jewel" ported RN logic), drop the dc-runtime.
Diagnoses the two prototype bugs. Appendix A = the chapter list used as the rebuild spec;
Appendix B = the data model the mock store must mirror; plus a `/features/<slug>` → demo-chapter
deep-link mapping table and a hardware-simulation strategy table.

#### `docs/features/case-file-redesign/` (marketing — noted only)

01 arch / 02 plan / 03 test-spec for the marketing reskin + two-phase beta capture. Explicitly
*"The `/demo` interactive experience is out of scope"*, and carries the load-bearing boundary rule
about not importing `@/features/demo` from marketing.

#### `docs/planning/00–07` (marketing, 2026-05-28, pre-demo)

`00-START-HERE` (locked app facts + the **forensic-restraint rule**), `01-product-and-positioning`,
`02-app-feature-inventory` (the content backbone), `03-site-architecture-and-ia`,
`04-beta-and-email-capture`, `05-media-and-content-production`, `06-timeline-thu-to-mon`,
`07-open-questions-and-decisions`. None describe the interactive demo.

#### Test-setup detail worth knowing (`vitest.setup.ts`)

Demo-specific jsdom shims: `ResizeObserver`/`IntersectionObserver` noops (phone-frame scaling),
`matchMedia` stub, **`HTMLCanvasElement.getContext → null`** ("OCR frame grab — returns null so
screens take the sample path"), `Element.scrollIntoView` noop, and the load-bearing final comment:
**"`navigator.mediaDevices` is intentionally left undefined so camera/mic screens take the
sample-fallback path."**

#### TODO/FIXME markers

Exactly **one** real marker in all of `features/demo/**`:
`features/demo/engine/logic/ocr.ts:135` — `// TODO(M2): "today" is a guess. The OCR chapter must
have the user confirm the date`. No `FIXME`/`HACK` anywhere.

---

## 6. Honest assessment

### Genuinely better than typical — worth preserving

1. **The store-bridge rule is airtight.** One file (`DemoExperience.tsx`) touches the store; ~50
   presentational components below it. This is the same callback-isolation discipline the phone app
   mandates, but here it is *actually* uniform — no leaks. It is why the component test suite can
   drive everything by injecting a store through one prop.

2. **`engine/` is a genuinely reusable pure core.** No React, no DOM, no `'use client'`. The time
   math, OCR pipeline, retention math, coordinate parsing, and the entire import normalization stack
   (datetime-normalize → MM/DD-vs-DD/MM disambiguation → year-hallucination correction with a
   cold-case guard) are real ports with real tests, not mocks. If the phone app's equivalents ever
   drift, this is a second, independently-tested expression of the same rules.

3. **The custom input library (`ui/inputs/`) is better than the phone's in one specific way: it is
   clock-injected and pure.** `datetime-parts.ts` has zero argless `new Date()`; the wall clock is a
   single injectable seam (`clock.now`) read only inside event handlers. The phone app's CLAUDE.md
   records real pain from DST/TZ-sensitive tests (`isInDST` resolving against the host zone). The
   demo's approach — parts math as pure functions, clock as a parameter — is the pattern the phone
   should back-port.

4. **`motion.ts` is explicitly written as the RN port template**, with percentage-string offsets so
   the values translate 1:1 to Reanimated. That's a deliberate, unusual, and valuable choice: the
   web demo is the *design source of truth* for the phone's screen transitions.

5. **The DVR Information retention section may be better than the phone's.** `firstRecordedDate` →
   total retention → per-scope overwrite countdown with SAFE/WARNING/CRITICAL/OVERWRITTEN chips, all
   derived, with the persisted `totalDvrRetention` kept in sync by a guarded effect that explicitly
   refuses to clobber an import-provided value. The `RetentionView` union
   (`{totalRetention: null, scopes: []} | {totalRetention: number, scopes: […]}`) makes "no total ⇒
   no scopes" unrepresentable. Status is deliberately *not* stored, so it can't drift from the day
   count. Worth checking whether `dvr-information.tsx` on the phone surfaces this as clearly.

6. **The New Case modal's incident-coordinate handling is thoughtful and worth back-porting as a
   pattern.** Accordions collapse OIC/VC so the modal isn't a wall; the address pick fills lat/lng
   and stamps `source: 'geocoded'`; typing by hand flips it to `'manual'`; on-blur strict parse
   (`parseCoordinate` rejects `43.6abc`, which `parseFloat` would happily truncate) with an inline
   error; a live coordinate chip. The type comment justifying why the *incident* can have coords
   without an address ("a scene in the woods") while a *recovery location* is geocode-only is exactly
   the kind of domain reasoning that belongs in the type.

7. **The map sub-feature is production-quality.** The `MapBottomSheet` drag has a single `endDrag`
   exit path called from pointerup/pointercancel *and* from a move that finds the button released —
   so a missed release can't strand the sheet. `buildMarkers`/`mapData` are pure so the map logic is
   unit-tested without WebGL. Pin colours are lifted verbatim from the phone's constants. The
   call/email flow honestly says "not available in the demo" rather than pretending.

8. **The import pipeline's honesty machinery is exemplary.** `FallbackMode` is a 4-arm union
   (`none` / `sample` / `unavailable` / `error`) and `fallbackNotice` is an *exhaustive switch with a
   `never` guard* — a new variant is a compile error, not a silently-missing warning. Every card
   built from the sample gets an `isSample` badge in place, so a fabricated card in a batch is
   attributable next to real ones. The **per-run generation token** (`importGen` ref, re-checked
   after the geocode await) correctly handles cancel-mid-flight and start-a-newer-run — the code
   comment explains why a shared boolean would be wrong.

9. **The exploration manifest + exit dialog are demo-native inventions with no phone analog and
   should stay demo-only** — but they're a strong pattern for a hands-on sandbox: they replace a
   guided tour (which was deliberately deleted) with a self-directed checklist.

10. **Test discipline.** 82 test files under `features/demo/`, including pure-logic suites for every
    engine module and behavioural component tests that drive the real store. A 579-line
    `DemoExperience.sandbox.test.tsx` end-to-end suite. Coverage thresholds are scoped honestly
    (logic layer only) rather than gamed.

### Weakest parts

1. **PDF import — the design gap the owner flagged. Confirmed.**
   - **Demo (`ui/screens/ImportModal.tsx`, `stage === 'progress'`)**: a flat 2–3 row checklist —
     "Extracting text from the PDF" / "Reading the request with the model" / "Mapping fields to the
     form" — each with a check ✓, a spinning arc, or a grey dot, plus "Importing 2 of 3…" for
     batches. It is the *old basic design*: no visibility into the pipeline, no scrollback, nothing
     to dwell on.
   - **Phone (`src/features/import/pdf-import/components/ImportTerminalProgress.tsx` +
     `TerminalLine.tsx`)**: a **live terminal** that tails the real `[PDF_IMPORT]` dataflow through
     a log bus (`useImportLog`), rendered as a virtualized `FlatList` of memoized `TerminalLine`s
     with a time gutter, level tags (`INIT`/`FILE`/`PDF`/`AI`/`VERB`/`NORM`/`CASE`/`OK`/`DONE`/`ERR`),
     syntax-accent colours, optional detail blocks, **pin-aware auto-follow** with a "jump to
     latest ↓" pill, a morphing badge that becomes a real labelled button, a `TerminalOutcome`
     discriminated union with a distinct **amber `partial`** treatment so a partial batch never
     reads as clean success, and an explicit "Review import →" CTA so the operator can dwell.
   - The demo's **result** screens (`ImportResultBody` / `ImportResultAccordion`) are actually
     good — grouped empty-omitting sections, mono formatting for badge/phone/email/credentials,
     ACTUAL/DVR TIME scope chips, a collapsible "N automatic adjustments" warnings list, per-card
     "Sample data" badge. It is specifically the **picker + progress** stages that are stale.
   - **Recommendation:** port `ImportTerminalProgress` to the demo. The demo already has a stage
     callback (`onStage`) and could emit a richer log; this is the single highest-leverage visual
     upgrade available, and it's the most "wow" moment in the whole product.

2. **`generateNotes()` is a 6-line placeholder.** It emits occurrence / location / requester / one
   offset line / one line per requested scope. The phone has a whole `documentation/notes`
   sub-feature with bullet-point formatters and hash-based change detection. The Notes screen looks
   finished but is the thinnest real logic in the demo, and it's on the critical path to the PDF.

3. **`CasesScreen` hardcodes every location row to "Draft"** (`caseStatusTheme('draft')` in
   `screenData.ts:locationsOf`), even though `selectLocationMapStatus` already derives a truthful
   started/working/complete and the map uses it. Also, `Complete & Save` on the completion screen
   sets a *local* `caseCompleted` boolean in the bridge — the case's store `status` stays `'draft'`
   forever, so the Cases and Dashboard cards never turn green. That's a visible correctness gap for
   the demo's own narrative arc.

4. **Dead surfaces that are typed but unreachable.** `mediaCapture`, `audioRecording`, `mediaLibrary`
   are in the id unions and `LAUNCHABLE`/`ModalId`, but nothing launches them; `addMedia` /
   `deleteMedia` / `LocationForm.media` have zero callers; `SplashScreen`'s `scanning`/`authorized`
   branches are dead; `OcrProof.imageDataUrl` is never populated (so the Time-Offset PDF's OCR image
   block is always empty); `NewLocationModal.onCaptureGps` is `() => undefined`.

5. **No persistence whatsoever.** A refresh loses everything. Given the demo boots empty and asks
   the visitor to build a case by hand, an accidental reload is a total loss of their work — a
   `sessionStorage` snapshot would be cheap insurance and would not violate the "no seed data"
   decision.

6. **Resolved by P0.3 (option-set consolidation).** The screens' option sets now have one source
   of truth: `engine/content/form-options.ts` (lifted verbatim from the phone's
   `src/constants/FormOptions.ts`), re-exported to the screens by `ui/screens/field-options.ts`
   and guarded by `field-options.test.ts` (re-export identity) + `option-parity.test.tsx`
   (rendered lists). The former `FORM_OPTIONS` registry in `engine/logic/import.ts` — the second
   source of truth this item described — was deleted along with its `optionValues` helper
   (reviews R-11/R-17/R-20; tombstone at `import.ts:199`, barrel gone-list pins). The remaining
   import-side question for P1 is normalizing *imported free-text* values against the canonical
   lists, not reconciling two registries.

7. **`demo.css` `@import`s two Google Font families at runtime** — render-blocking, third-party,
   and inconsistent with the marketing half's `next/font` handling (which already loads Share Tech
   Mono and JetBrains Mono as CSS variables the demo could just consume; `StoryRail` already does
   for two of them).

8. **The glass aesthetic isn't tokenized.** The same gradient + border + radius triple is copy-pasted
   across ~15 screens. `input-theme.ts`'s `T` and `map/mapTokens.ts` show the team knows how to do
   it; the screens just predate it. (This is defensible under the "lifted verbatim, do not restyle"
   rule, but it makes a future restyle expensive.)

9. **Ordering drift vs. the phone.** `extractedScope` at position 5 (demo) vs. 8 (phone). Either the
   demo teaches a flow the app doesn't have, or the app should adopt the demo's ordering. Worth an
   explicit decision.

10. **Root `README.md` is still the Cruip template's.** Anyone landing on the repo gets a landing-page
    template pitch, not this project.

11. **The demo found three real bugs in the phone app** and logged them in
    `docs/code-reviews/phone-app-debug.md` — all three fixed in the demo, all three still marked
    "⬜ Port back to the phone app": `sourceContainsFullDate` substring false-positive trusting a
    hallucinated year, `findYearTokenNear` only checking the first occurrence, and a blank
    time-frame date emitting a spurious "Empty datetime value" adjustment. Re-porting logic into a
    second, independently-tested runtime *worked as a bug-finding technique*. **Action item for the
    phone repo** — these are sitting in the demo repo where the phone team won't see them.

12. **The documentation discipline itself.** Every feature has an arch doc + a sliced implementation
    plan + a test spec written *before* the code, with an explicit "Scope Boundaries (deferred,
    deliberate)" section, and `deferred.md` gives every parked item a concrete **un-defer trigger**.
    `features/demo/CLAUDE.md` is the single best onboarding artifact in the repo. This is stronger
    process hygiene than most production codebases.

### Weakest parts (docs-informed additions)

11. **Two accessibility gaps are known and open.** The drawer/modal have **no focus trap and no
    focus return** (deferred #7), and the drawer's complete-vs-partial dots are **colour-only
    (WCAG 1.4.1)** — a non-colour distinction was implemented and then **reverted at the owner's
    request** (deferred #23). Also open: `PdfPreview` has no Escape or backdrop dismiss (#21).

12. **`field-parity-gaps.md` is stale and misleading.** 12 of its 29 "MISSING" keys were closed by
    later PRs and never struck through. Anyone reading it today over-estimates the gap. It should
    either be regenerated or annotated.

13. **Zero required-field validation, by decision.** `demo-fields.md` states it flatly: *"No
    required-field validation is enforced anywhere."* The red `*` on Case Number / Unit / Location
    Name is decorative. Fine for a sandbox; worth knowing before anyone reads the demo as a
    behavioural spec.

14. **Two known silent failures** (deferred #15): `selectAdjustedScopes` swallows its parse error
    into an empty `catch`, and `roundTo5Min` silently returns unparseable input unchanged. Both sit
    on the path to a forensic document.

### Consolidated "not built" list (from the three ledgers, verified against code)

User Profile screen · Media Capture screen · Audio Recording screen · Media Library modal ·
Duplicate Location flow · Edit Incident Location · **all GPS capture** (incident device-GPS,
per-camera GPS, the no-op New Location button) · splash-video entry · the `canvas` profile ·
map clustering / filters / proximity / camera markers / All-Cases aggregate / Export Map ·
Resolution/FPS/Export option-set reconciliation + an "Other" free-text path · manual DVR-time
correction on the OCR confirm · structured per-section notes · required-field enforcement ·
checklist persistence across visits · deep links (`?screen=`) · screen-resolution adaptation.

### Rough parity estimate

The owner's "~40%" is fair-to-slightly-conservative on *screen* coverage and conservative on *logic*
coverage:

- **Wizard screens:** 10 of 13 built (77%), but 2 of the 3 missing (media/audio) are whole native
  features.
- **Tabs:** 3 of 4 (no Export tab).
- **Features:** roughly 6 of ~15 phone features have any demo presence (case-management-lite,
  documentation/PDF, ocr-time-capture, precision-time-sync (simulated), location/map, import/pdf).
  Missing wholesale: media (×4 sub-features), settings (×5 sub-features), sync, agency-cloud,
  biometrics, form-customization, json-import, case-map-export, export-security.
- **Logic depth where it exists:** high — the time, OCR, retention, coordinate, and import-
  normalization engines are real ports with their own test suites, not simulations.
