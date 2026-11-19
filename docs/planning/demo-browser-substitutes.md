# Demo Browser Substitutes — what replaces the phone's native layer

> Inventory of everything in `/demo` that stands in for a phone capability a browser tab cannot run
> (native modules, OS services, device hardware, filesystem, network protocols). The UI recipes, the
> screens and the ported pure logic (`engine/logic/*`) are **out of scope** here; this is only the
> boundary between "the app's code" and "what the device/OS provides".
>
> Written 2026-11-16 against `master @ 3f5726b5`. Purpose: the input for replacing the hand-built
> demo with the real RN app running in a browser. Each row below is a seam that build will need
> its own web answer for.

## Status legend

| Tag | Meaning |
|---|---|
| **REAL** | Same capability, done for real via a browser API. |
| **REAL-ALT** | Real, but a different engine than the phone (e.g. Tesseract instead of ML Kit). |
| **SIM** | Behaviour is simulated (fabricated values in the phone's shape), and disclosed on screen. |
| **STUB** | UI is present and holds state, but nothing reads it and nothing happens. A `PaneStubNote` or notice says so. |
| **SAMPLE** | Real pipeline fed bundled sample input when the browser can't supply real input. Always labelled "Sample". |
| **ABSENT** | Not ported; the flow ends in an honest notice. |

The demo's standing rule (repeated in nearly every seam's docblock): **never a fake success.** A
substitute either works for real, is labelled sample/simulated, or says plainly that it doesn't
exist here.

## Summary table

| # | Capability | Phone (native) | Demo substitute | Status | Entry point |
|---|---|---|---|---|---|
| 1 | Device shell | Real iPhone | Drawn iPhone frame, scaled to the viewport | SIM | `ui/PhoneFrame.tsx`, `ui/usePhoneScale.ts`, `ui/phone-overlay.tsx` |
| 2 | Boot / Face ID unlock | `AuthenticatedSplashScreen` + OS biometric prompt | Tap-to-scan HUD animation that gates nothing | SIM | `engine/logic/boot.ts`, `ui/screens/SplashScreen.tsx`, `BootSequence.tsx` |
| 3 | Database (SQLite) | SQLite services | In-memory Zustand store mirrored to `sessionStorage` (per tab) | REAL-ALT | `engine/store/create-store.ts`, `engine/store/persistence.ts` |
| 4 | Settings store | Persisted settings store | Bridge-local React state, not persisted; scheme only in `sessionStorage` | STUB (mostly) | `engine/content/settings-values.ts`, `ui/tokens/palette.ts` |
| 5 | PDF text extraction | `expo-pdf-text-extract` | `pdfjs-dist` in a web worker | REAL-ALT | `ui/import/pdf-extract.ts` |
| 6 | AI field extraction | `AiExtractionProvider.extract()` | `POST /api/extract` → Ollama Cloud (server key) or SAMPLE fallback | REAL / SAMPLE | `app/api/extract/*`, `ui/import/extract-client.ts`, `ui/import/run-import.ts` |
| 7 | Forward geocode (import) | Mapbox service | `@mapbox/search-js-core` `GeocodingCore` | REAL | `ui/import/geocode.ts` |
| 8 | Address autocomplete / reverse geocode | Mapbox service | Mapbox Search Box (web) | REAL | `ui/inputs/AddressAutocomplete.tsx`, `ui/inputs/reverse-geocode.ts` |
| 9 | Map | `@rnmapbox/maps` | `mapbox-gl` JS, lazy-loaded | REAL-ALT | `ui/screens/map/MapCanvas.tsx` (+ `mapCluster.ts` worker) |
| 10 | GPS capture | `expo-location` multi-sample loop | `navigator.geolocation` driving the same loop | REAL | `ui/inputs/capture-gps.ts`, `useGpsCapture.ts`, `engine/logic/gps.ts` |
| 11 | Camera (photo/video) | `react-native-vision-camera` | `getUserMedia` + `<canvas>` frame grab + `MediaRecorder` | REAL-ALT / SAMPLE | `ui/inputs/capture-media.ts`, `useCaptureStream.ts`, `useMediaCapture.ts`, `engine/logic/media/*` |
| 12 | Audio recording + meter | `@siteed/expo-audio-studio` | `MediaRecorder` + Web Audio `AnalyserNode` | REAL-ALT / SAMPLE | `ui/inputs/audio-analyser.ts`, `useAudioAnalyser.ts`, `engine/logic/media/recording.ts`, `audio-levels.ts` |
| 13 | Media file storage | App filesystem | `blob:` object URLs (die on refresh) | REAL-ALT (ephemeral) | `ui/inputs/object-urls.ts`, `engine/logic/media/captured.ts` |
| 14 | OCR (DVR clock) | ML Kit text recognition | Tesseract.js (self-hosted wasm) or sample DVR frames | REAL-ALT / SAMPLE | `ui/inputs/ocr-recognize.ts`, `engine/logic/ocr-crop.ts`, `engine/content/seed.ts` |
| 15 | NTP time sync | RFC 5905 NTP over UDP (`react-native-udp`) | `simulateNtpSync()`: random offset/RTT, fixed `time.nrc.ca` | SIM | `engine/logic/time-sync.ts`, `SyncStatusCard.tsx` |
| 16 | Host clock / DST | Device clock | Browser clock + host-zone DST, behind one seam | REAL | `ui/inputs/clock.ts`, `engine/logic/dst-advisory.ts` |
| 17 | Court PDFs (Case Notes, Time-Offset) | HTML → PDF file → share sheet | Same HTML in a sandboxed `<iframe>`; "Save as PDF" calls the browser print dialog | REAL-ALT | `ui/chrome/PdfPreview.tsx`, `engine/logic/pdf/*` |
| 18 | Case Map HTML export | Write file → share sheet | Real `Blob` download (`Case Map.html`) | REAL | `engine/logic/case-map/*`, `ui/inputs/download-file.ts` |
| 19 | ZIP exports + GeoJSON | AES ZIP / GeoJSON → share sheet | Staged progress overlay ending in a "Downloads aren't available" notice | ABSENT | `engine/logic/export/*`, `ui/screens/exportNotices.ts`, `DemoExperience.runZipPipeline` |
| 20 | Export protection (Face ID + AES password) | `useProtectedExport`, PasswordModal | Not ported; settings switches inert | ABSENT / STUB | `engine/logic/export/flow.ts` header, `ExportSecurityPane.tsx` |
| 21 | Share sheet | OS share sheet | None; the `sharing` stage is never entered | ABSENT | `engine/logic/export/stage.ts` |
| 22 | Phone calls / email from map | `tel:` / `mailto:` | Mock call-confirm sheet → "Calling/Email isn't available in the demo." banner | STUB | `ui/screens/map/MapScreen.tsx:26-27`, `CallConfirmSheet.tsx`, `DemoNotification.tsx` |
| 23 | Contact Support | `mailto:` | Real `mailto:` (address printed as a fallback) | REAL | `ui/screens/settings/panes/AboutPane.tsx` |
| 24 | Clipboard | RN clipboard | `navigator.clipboard` read (paste request) / write (copy notes, coords) | REAL | `import/PickerStage.tsx`, `NotesScreen.tsx`, `inputs/CoordinateDisplay.tsx` |
| 25 | Cloud sync (Supabase) | Agency Supabase + QR enrolment | Switch fixed off | STUB | `settings/panes/CloudSyncPane.tsx` |
| 26 | App lock / biometrics settings | Face ID-gated settings row | Inert switches | STUB | `settings/panes/SecurityPane.tsx` |
| 27 | Media capture settings | Applied at capture | Inert (browser exposes no quality/codec knobs, no EXIF) | STUB | `settings/panes/MediaCapturePane.tsx` |
| 28 | GPS accuracy settings | Read by capture | Inert; capture uses hardcoded configs | STUB | `settings/panes/LocationPane.tsx` |
| 29 | NTP region | Picks the server | Cosmetic; always reports NRC | STUB | `settings/panes/TimeSyncPane.tsx` |
| 30 | Import "show process details" | Toggles terminal detail | Terminal always prints the full log | STUB | `settings/panes/AppearancePane.tsx` |
| 31 | User profile | On-device, reused by every case | Persisted per tab; feeds "Completed By" only | REAL-ALT | `settings/panes/UserProfilePane.tsx`, `engine/logic/user-profile.ts` |
| 32 | Crash recovery | — | Route error boundary + "Start fresh" (clears the snapshot) | Demo-only | `app/demo/error.tsx`, `ui/chrome/DemoErrorBoundary.tsx` |
| 33 | Narration rail + explore checklist | — | `StoryRail` + `explore.ts` registry | Demo-only | `ui/StoryRail.tsx`, `engine/content/explore.ts`, `narration.ts` |

(Paths without a prefix are relative to `features/demo/`.)

---

## Detail by seam

### 1. Device shell — SIM
- `PhoneFrame.tsx` draws a 404×812 iPhone (378×786 screen, 13px bezel) with a fake status bar,
  dynamic island and scan sweep. `usePhoneScale.ts` fits it to viewport height, capped at 1:1, and
  reserves 56px of sticky-column padding (DP-8).
- **All overlays must portal** into the frame's viewport-pinned root (`phone-overlay.tsx`), or they
  hit the "scroll-lift" bug.
- `/demo` mounts the demo directly with `next/dynamic({ ssr: false })` (`app/demo/page.tsx`). **The
  demo is not iframed.** The only `<iframe>` in the demo is the PDF preview (§17).
- The marketing site's `components/marketing/phone-frame.tsx` is a separate copy of the geometry. It
  imports nothing from the demo and plays a looping video in the screen slot.

### 2. Boot / biometric unlock — SIM
- `engine/logic/boot.ts` is the phone's `AuthenticatedSplashScreen` phase machine minus the
  `failed` branch. The OS's automatic Face ID prompt becomes an explicit **TAP TO SCAN**, and a
  standing line under the HUD says "Simulated scan. A browser tab has no biometric sensor. On the
  phone this is Face ID."
- It gates nothing. It is deliberately **not** wired to `settings.appLockEnabled` (deferred §87).
- `BOOT_VIDEO = null`, so the doors-open video phase is routed around. Supplying a video means
  changing that one constant.

### 3. Persistence (SQLite → sessionStorage) — REAL-ALT
- The Zustand vanilla store is the database. `persistence.ts` mirrors a `PersistedState` snapshot
  to `window.sessionStorage` under **`dvr-demo-state-v7`** (`SNAPSHOT_VERSION = 7`), with a 250ms
  debounce, and rehydrates it at store creation behind a strict zod shape guard.
- **Per tab by design** (owner decision D2): it survives a refresh and dies with the tab, and a
  visitor never inherits someone else's case.
- On a bad read, parse, version or shape, the snapshot is discarded and the demo boots empty. Write
  errors are swallowed. `PERSISTENCE_ENABLED` is the kill switch.
- **Media bytes are never persisted.** `blob:` URLs are stripped on write, and a restored item shows
  `MEDIA_EXPIRED_NOTICE`. Bundled `/demo-media/*` sample URLs survive.
- `clearDemoSnapshot` is the one other public export, used by `app/demo/error.tsx` → "Start fresh".

### 4. Settings — STUB (values held, never consulted)
- Decision D6: a full Settings UI replica. `settings-values.ts` holds typed values with the phone's
  defaults and option lists. **Nothing downstream reads them**, and they are not persisted (they
  live in `DemoExperience` state and reset with the tab, deferred §80c).
- Exceptions that do something:
  - **Dark Mode** is real. The choice is stored in `sessionStorage['dvr-demo-scheme']`, read once at
    module init, and flipping it restarts the demo.
  - **User Profile** and **Form Customization** (`formOverrides`) are persisted in the snapshot.
- Every inert pane carries a `PaneStubNote` explaining why (see rows 25–30).

### 5. PDF text extraction — REAL-ALT
- `extractPdfText(file)` lazy-imports `pdfjs-dist` and points its worker at
  `pdf.worker.min.mjs`. It joins every page's text items with spaces and pages with newlines.
- Fewer than 50 characters means scanned or image-only, and throws `PdfExtractionError` ("Paste the
  request text instead"). There is no OCR fallback, matching the phone's v1.
- **The raw PDF bytes never leave the browser.** Only the extracted text goes to the proxy.
- A paste-text path exists too (`import/PasteStage.tsx`), plus a clipboard paste shortcut
  (`navigator.clipboard.readText`).

### 6. AI extraction (model proxy) — REAL with SAMPLE fallback
- The pipeline is `run-import.ts`: extract → `requestExtraction()` → `POST /api/extract` → raw
  model text → `parseNormalizeMap` (ported engine) → forward geocode (§7) → store.
- **Server route** (`app/api/extract/route.ts`, `runtime = 'nodejs'`):
  - Truncates the document to `MAX_DOCUMENT_CHARS = 8000`.
  - Sends one OpenAI-compatible `/chat/completions` call (temperature 0, no streaming) with
    `EXTRACT_FIELDS_SYSTEM_PROMPT` and `buildExtractFieldsUserPrompt` from `engine/logic/import`.
  - Returns `{ rawText }`. All cleaning and parsing is client-side, the same as the phone's
    raw-text-only `AiExtractionProvider` seam.
- **Env (server-only):** `OLLAMA_API_KEY`, `OLLAMA_MODEL` (default `llama3.2:3b`), `OLLAMA_BASE_URL`
  (default `https://ollama.com/v1`), `OLLAMA_TIMEOUT_MS` (default 30000, minimum 1000).
- **Guards** (`guards.ts`):
  - 50KB body cap.
  - Same-origin plus `ALLOWED_ORIGINS`; requests with no Origin header are allowed.
  - In-memory per-IP limit (`RATE_LIMIT_MAX` 20 per `RATE_LIMIT_WINDOW_MS` 60s), best-effort and
    per instance. The real backstop is a spend cap on the Ollama account.
- **`FallbackMode`:**

  | Mode | Trigger | What happens |
  |---|---|---|
  | `none` | The live model read the visitor's document | Normal result |
  | `unavailable` | 503 `NOT_CONFIGURED` (no key) | SAMPLE fallback, "not configured" notice |
  | `error` | 401, 429, 502, network error or timeout | SAMPLE fallback, separate notice |
  | `sample` | `live: false` | Test seam only |

  The SAMPLE is `SAMPLE_EXTRACTION` / `SAMPLE_REQUEST_DOC` (`engine/content/seed.ts`). Every
  substitution is logged in the import terminal (`SAMPLE_FALLBACK_PREFIX`) **and** badged "Sample"
  on the result.
- **Real failure codes:** `PDF_SCANNED`, `PDF_READ_FAILED`, `MODEL_OUTPUT_UNPARSEABLE`,
  `NO_FIELDS_FOUND`, `UNEXPECTED_ERROR`.
- The live terminal UI (`screens/import/ImportTerminalProgress.tsx`) is fed by `import-log`, an
  event bus whose lines report what actually happened.

### 7–8. Geocoding — REAL (needs `NEXT_PUBLIC_MAPBOX_TOKEN`)
- **Forward** (`import/geocode.ts`): imported addresses are geocoded so imported locations get a
  pin. The query rule is the phone's `buildGeocodeQuery`, ported verbatim.
- **Reverse** (`inputs/reverse-geocode.ts`): the GPS control's "Geocode" toggle turns coordinates
  into a street and city.
- **Autocomplete** (`inputs/AddressAutocomplete.tsx`): Mapbox Search Box. It keeps coordinates only
  when a finite pair comes back, and sets accuracy (5m) only for a rooftop match.
- **No token:** every path returns `null` without breaking the flow. Address fields become plain
  text inputs, and locations get no pin. A failure logs one `console.warn` so an expired token is
  traceable.

### 9. Map — REAL-ALT
- `MapCanvas.tsx` lazy-loads `mapbox-gl` JS: clustering (`mapCluster.ts`, which uses a worker),
  status-coloured markers, camera markers, and a proximity polygon.
- The long-press gesture is hand-rolled because mapbox-gl has no `longpress` event.
- The proximity fallback **never prompts for the visitor's location**. It uses the current map
  centre instead of the phone's GPS read.
- No token means a fallback tile instead of a map.

### 10. GPS — REAL (no fallback by design)
- `capture-gps.ts` runs the phone's `gps-service.captureLocation` loop over
  `navigator.geolocation`: up to N readings, an early stop on target accuracy, a retry delay, an
  overall timeout, and **the single most accurate sample** wins. There is no 2σ filter, because
  the phone has none (deferred §41).
- **Configs are hardcoded:**
  - Recovery locations: Balanced, 50m target, 30s budget.
  - Incident pin and per-camera fixes: `PRECISE_GPS_CONFIG`, 10m target, 120s budget.
  - Settings are not read, and the accuracy warning is not wired (`LocationPane` note).
- **Never fabricates a coordinate.** No geolocation, or a refused permission, gives a typed failure.
- The demo adds a live readout of sample count and best accuracy so the multi-sample procedure is
  visible.

### 11–13. Camera, microphone, media storage — REAL-ALT with SAMPLE fallback
- **I/O** is `ui/inputs/capture-media.ts`. Every decision is in `engine/logic/media/*`:
  - `permissions.ts`: states `prompt` / `granted` / `denied` / `unavailable`, plus a failure
    taxonomy.
  - `capability.ts`: what this browser can do, per operation.
  - `devices.ts`: a device picker built from `enumerateDevices()`, replacing the phone's
    back/front flip.
  - `recording.ts`: the recording state machine. Paused time doesn't count, Stop is allowed after
    500ms, and recording auto-stops at one hour.
  - `captured.ts`: turns a capture into a `MediaItem` and applies the phone's `sanitizeFilename`.
  - `library.ts`: the media library's tabs, counts and wording.
- **Photo** grabs a frame from the live `<video>` through `<canvas>`. **Video and audio** use
  `MediaRecorder` with the container the browser chooses.
- **Audio meter:** a real `AnalyserNode` FFT, 40 bars, bottom quarter of the spectrum. A suspended
  `AudioContext` shows "no live meter" rather than flat bars. The graph is not connected to the
  speakers, to avoid feedback.
- **SAMPLE fallback only when the capability is absent** (`permission === 'unavailable'`).
  **A denied permission never gets a sample.** The samples are `public/demo-media/`
  (`sample-photo.jpg`, `sample-clip.mp4` plus its poster, `sample-note.m4a`), each stamped
  "SAMPLE" on its face and flagged `sample: true` through to the badge.
- **Storage:** `object-urls.ts` is a registry of `blob:` URLs. It sweeps them on unmount, and
  `release()` hands ownership to the store when an item is saved. The bytes are lost on refresh
  (§3).
- **Things the browser doesn't give us:** quality and codec settings, shutter sound, and EXIF/GPS
  embedding.
- Hardware is released on unmount, so the camera light goes off.

### 14. OCR — REAL-ALT with SAMPLE fallback
- `ocr-recognize.ts` lazy-imports `tesseract.js`. The worker, the SIMD-LSTM wasm core and
  `eng.traineddata.gz` are **self-hosted in `public/ocr/`** (about 6.8MB, see `SOURCES.md`), with no
  third-party CDN.
- The worker is a single module-level instance: created on first use, disposed when the screen
  unmounts.
- `ocr-crop.ts` applies the phone's box (80% width, 17% height, plus a 5% buffer on each side,
  width only), recomputed for an `object-fit: cover` viewfinder.
- The raw text goes into the ported `cleanOcrText` → `readDvrTimestamp` steps (`engine/logic/ocr.ts`).
- **No camera, or no wasm SIMD:** three `OCR_SAMPLE_FRAMES` (`clean`, `ambiguous`, `timeOnly`) feed
  the **same** pipeline, labelled sample. `SAMPLE_ACTUAL_TIME` stands in when no sync has run.
- The recognition confidence is real for a live read and a fixed, badged value for a sample.
- The captured strip image is embedded in the Time-Offset PDF as a data URI.

### 15. NTP time sync — SIM
- A browser has no UDP socket and the serverless host blocks outbound UDP, so real NTP is
  impossible.
- `simulateNtpSync(now)` returns:
  - offset: random within ±60ms
  - RTT: 6–36ms
  - uncertainty: `max(10, RTT/2 + rootDispersion)`, the real RFC 5905 formula
  - fixed server `time.nrc.ca`, stratum 2, and the NRC traceability chain
- **Use Current Time** (`DemoExperience.runTimeSync`) waits 1.1s, then writes
  `capture.actualDateTime = now + offset` and `capture.sync`. It never touches the DVR time.
- The NTP region setting is cosmetic. The Time Sync pane discloses all of this.

### 16. Clock and time zone — REAL
- `ui/inputs/clock.ts` is the one place the browser clock and time zone are read: `now()` and
  `isDst()`. The DST advisories use the browser's own time zone.
- The engine reads no ambient time. Callers pass the stamp in, e.g. `buildCaseMapMeta(…, generatedAt)`.

### 17. Court PDFs — REAL-ALT ("print to PDF")
- `engine/logic/pdf/case-notes.ts` and `pdf/time-offset.ts` produce complete standalone HTML
  documents (`@page` letter portrait), modelled on the phone's templates.
- `PdfPreview.tsx` renders them in `<iframe srcDoc sandbox="allow-modals allow-same-origin">` (the
  sandbox value is pinned by a test). **Save as PDF** calls `contentWindow.print()`, and the visitor
  uses the browser's own Save-as-PDF.
- Success is detected from `beforeprint`. A blocked print shows an honest notice; it never claims
  success.
- These are the only PDFs the demo produces. The per-location PDFs inside a ZIP are not generated.

### 18. Case Map export — REAL (decision D4)
- This is the one real download. The phone's `case-map-export` template is ported byte for byte
  (`case-map/template.ts`, about 85KB). It is kept out of the First Load bundle through a dynamic
  `import()` and never re-exported from `engine/index.ts`.
- The flow: `buildCaseMapGeoJson` → `buildCaseMapHtml` (data injected into a `<script>` tag) →
  `download-file.ts` (`Blob` → object URL → `<a download="Case Map.html">` → revoke after 40s, or on
  `pagehide`).
- The terminal says "Your browser was **asked** to save…", because a download request can't be
  confirmed. It also reports which locations were left off for having no coordinates, and that the
  basemap is blank without a token.
- Outcomes: `requested`, `builder-unavailable`, `case-unavailable`, `save-unavailable`,
  `save-failed`.

### 19–21. ZIP exports, GeoJSON, protection, share sheet — ABSENT
- `engine/logic/export/flow.ts` ports the phone's `useExportFlow` state machine: entry guard,
  validation modal, and subset payloads passed as arguments. Biometrics, the password flow and the
  post-export alert taxonomy are **not ported** (deferred §70).
- `runZipPipeline` shows the phone's stages in order: `validating` → `generating` k/n per location
  → `zipping`, 550ms each (`EXPORT_STEP_MS`). `sharing` is never entered.
- It ends with `describeExportTerminal`: **"Downloads Aren't Available in the Demo"**, which names
  what the phone would have written and points to the two real PDFs.
- This covers the `case`, `case-subset`, `location` and `location-geojson` runs.

### 22–24. Device handoffs
- **Map Call and Email:** a mock iOS call-confirm sheet, then a 2.6s `DemoNotification` banner
  (`role="status"`): "Calling isn't available in the demo." / "Email isn't available in the demo."
- **Contact Support:** a real `mailto:` to `SUPPORT_EMAIL` (`engine/content/app-info.ts`), with the
  address printed in case no mail handler is registered.
- **Clipboard:** real. Paste reads the request text, Copy All writes the notes, and coordinates can
  be copied. Every clipboard call goes through a test seam, and a blocked clipboard shows a failure
  instead of claiming success.

### 32–33. Demo-only additions (no phone equivalent)
- `StoryRail` narration plus the exploration checklist (`engine/content/explore.ts`,
  `narration.ts`), with unseen badges and jump links.
- `app/demo/error.tsx` (route-level net) and `DemoErrorBoundary` (in-frame), with "Start fresh",
  which clears the snapshot.

---

## External dependencies the substitutes pull in

| Dependency | Why | Load |
|---|---|---|
| `pdfjs-dist` | PDF text | Lazy, in a worker |
| `tesseract.js` + `public/ocr/*` | OCR | Lazy, about 6.8MB, self-hosted |
| `mapbox-gl` | Map | Lazy, inside the effect |
| `@mapbox/search-js-core` / Search Box | Geocode and autocomplete | On use |
| `zod` | Snapshot shape guard | Eager |
| Ollama Cloud (server) | Model | Through `/api/extract` |
| `public/demo-media/*` | Media SAMPLE fallback | Static |

## Env vars (see `.env.example`)

- **Server:** `OLLAMA_API_KEY`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS`,
  `ALLOWED_ORIGINS`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`.
- **Public:** `NEXT_PUBLIC_MAPBOX_TOKEN` (`pk.*`, restrict it by URL).
- Every one is optional. The demo runs with none of them set: sample import, no map, plain address
  fields.

## Notes for a "real app in the browser" rebuild

Each row in the summary table is a module boundary that needs a web implementation. Grouped by how
the current demo already handles it:

- **Ready-made web answers (lift the I/O layer):**
  - GPS (§10)
  - Camera, microphone and media (§11–13)
  - OCR (§14)
  - PDF text (§5)
  - Model proxy (§6)
  - Geocoding and autocomplete (§7–8)
  - Clipboard (§24)
  - Case Map download (§18)
  - Print-to-PDF (§17)

  Each sits behind a `read*()`-at-call-time or injection seam with pure engine logic beside it.
- **Need a web stand-in that discloses itself:**
  - NTP (§15)
  - Biometrics and app lock (§2, §26)
  - Share sheet (§21)
  - Call and email (§22)
  - Encrypted ZIP and GeoJSON (§19–20)
  - Cloud sync (§25)
  - Settings that only matter natively (§27–29)
- **Storage model choice:** today it is `sessionStorage` per tab, with media in memory only (§3).
  The phone's SQLite and filesystem need a browser backend, such as IndexedDB or OPFS, if anything
  should outlive a tab. Owner decision D2 (fresh visitor boots empty) currently argues against it.
- **Honesty contract:** any replacement inherits the "never a fake success" rule. Simulated means
  labelled, sample means badged, and absent means saying so.
