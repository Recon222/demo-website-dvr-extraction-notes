# The real app in the browser: test specification

> Document 3 of 3, 2026-11-19. Synced to `02-sliced-plan.md` by slice ID and to `01-architecture.md` by
> `AD-n`/`§`/`C-n`. Nothing has run yet. The registry is not edited as slices land; whether a test exists is read
> from the source, and runs are recorded in each slice's evidence file.

**Sync rules.** Every test belongs to exactly one slice; every slice has at least one test; a registered test has
one implementation, at its `Location`, with its `Title`; every test of a landed slice must exist. Both repos forbid
process IDs in test titles, so tests are found by `Location` + `Title`, never by ID. Reviewers check their unit's
rows; IN1 checks all of them.

## 1. Design

| Layer | Meaning | Gate |
|---|---|---|
| unit-web | a stand-in or helper under the web Jest project (`jest-expo/web`, jsdom) | `npm run test:web` |
| unit-native | an existing or new native Jest test (seams keep native behaviour) | `npm test` |
| e2e | Playwright against the exported build served at `/app/`, Chromium + WebKit + Firefox unless the row says otherwise | `npm run e2e:web` |
| unit-mk | Vitest in the marketing repo | `pnpm test` |
| e2e-mk | Playwright against `pnpm build && pnpm start` with a pinned web build | `pnpm e2e` |
| build | a script or CI step that fails on a broken condition | CI |
| manual | executed by an agent or the owner and recorded | evidence file |

| Gate | Runs | Needs |
|---|---|---|
| G-PH | `npm run check:all` (typecheck, lint, format, invariants, native suite) + `npm run test:web` | every PH slice |
| G-WEB | `scripts/export-web.sh` (with the secret check) + `npm run e2e:web -- --grep <slice area>` | every PH slice from FD1 on |
| G-MK | `pnpm typecheck && pnpm lint && pnpm test` (+ `pnpm e2e` from MK2 on) | every MK slice |
| G-NATIVE | EAS development build launched in the iOS simulator; open the app, create a case | IN1 only (granted by the orchestrator) |
| G-BROWSER-REAL | real Safari on macOS, and an iPhone if the owner provides one | SP0, IN1 |

| Kind | Exists when |
|---|---|
| test | one implementation at `Location` with `Title` |
| build | the script step exists and CI runs it |
| manual | the evidence file names the procedure, the browser versions and the outcome |

Hard rules: a browser that did not run is **unexecuted**, never passed; a flaky e2e test is a defect (retries off in
CI); no test asserts a stand-in "succeeded" without checking the visible or stored outcome; no sample data stands in
for a failed capability; the native suite is never weakened to make a web change pass.

## 2. Fixtures and test data

| Code | Fixture | Source | Used for |
|---|---|---|---|
| FX-BUILD | the exported build served at `/app/` by a static server with the production rewrites | `e2e-web/fixtures/serve.ts` (FD1) | every e2e row |
| FX-CASE | a seeded case with two locations, media and a completed wizard, created through the UI helper | `e2e-web/fixtures/case.ts` (FD1) | DC, IN |
| FX-MEDIA | a 3 s video, a JPEG and a short audio clip | `e2e-web/fixtures/media/` | ST2, CA1, CA3 |
| FX-CAMERA | Chromium fake camera/mic (`--use-fake-device-for-media-stream`, `--use-file-for-fake-video-capture`) | Playwright launch options | CA1, CA3 |
| FX-DVR | three DVR clock frames with known timestamps (clean, ambiguous, time only) | from the demo's sample frames, re-labelled as test fixtures | CA2 |
| FX-PDF | a text request PDF and a scanned (image-only) PDF | `e2e-web/fixtures/pdf/` | DC4 |
| FX-AI | a stub `/api/extract` returning a recorded model reply; a 503 variant | `e2e-web/fixtures/ai-stub.ts` | DC4 |
| FX-GEO | Playwright geolocation override with a scripted sequence of fixes and accuracies | fixture | LM1 |
| FX-MAPBOX | a URL-restricted test token, or the "no token" mode | env | LM2 |
| FX-MEM | the in-memory file store (C-2) | `src/platform/web/file-store/memory-store.ts` | unit-web |

## 3. Test registry

Locations: `PH:` paths are relative to the phone repo, `MK:` to the marketing repo. `*.webtest.ts(x)` files run in
the web Jest project.

### 3.1 Phase 0

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| SP001 | manual | SP0 | G-BROWSER-REAL | manual | `PH:docs/web-build/evidence/SP0/README.md` | OPFS persistence per browser | a case survives reload in Chromium, WebKit, Safari, Firefox |
| SP002 | manual | SP0 | G-BROWSER-REAL | manual | same | second tab refusal | a second tab cannot open the database and the failure is catchable |
| SP003 | manual | SP0 | G-BROWSER-REAL | manual | same | Firefox private window | the no-OPFS failure is detectable before open |
| SP004 | manual | SP0 | G-BROWSER-REAL | manual | same | service worker media playback | a stored 10 MB video plays and seeks through 206 responses, including in Safari |
| SP005 | manual | SP0 | G-BROWSER-REAL | manual | same | iframe permissions | camera, mic and geolocation prompt inside a same-origin iframe |
| SP006 | manual | SP0 | G-BROWSER-REAL | manual | same | verdict and fallback | each failure names the fallback adopted |
| FD001 | build | FD0 | G-WEB | build | `PH:scripts/export-web.sh` | export succeeds | `expo export -p web` exits 0 under `/app` |
| FD002 | build | FD0 | G-WEB | build | `PH:scripts/export-web.sh` | secret check | the build fails if `dist-web/` contains a secret env value or the Sentry DSN |
| FD003 | test | FD0 | G-WEB | e2e | `PH:e2e-web/boot.spec.ts` | the app loads under the base path | `/app/` renders the app's first screen; assets resolve under `/app/` |
| FD004 | test | FD0 | G-PH | unit-web | `PH:metro.config.webtest.ts` | shim file names map to import specifiers | `expo-file-system__legacy.ts` resolves `expo-file-system/legacy` on web only |
| FD005 | test | FD0 | G-PH | unit-native | `PH:metro.config.test.ts` | native resolution is untouched | the hook returns default resolution for ios/android |
| FD006 | test | FD0 | G-PH | unit-web | `PH:src/features/location/map-view/__tests__/mapbox-init.webtest.ts` | token setup does not throw on web | the root layout no longer calls `.catch` on `undefined` |
| FD007 | build | FD0 | CI | build | `PH:.github/workflows/web-build.yml` | CI builds and uploads the web artifact | a PR run produces `web-build-<sha>.tar.gz` with a checksum |
| FD008 | test | FD0 | G-PH | unit-web | `PH:web/shims/__tests__/sentry.webtest.ts` | error reporting sends nothing on web | `init` and `captureException` make no network request |

### 3.2 Phase 1

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| FD101 | test | FD1 | G-PH | unit-web | `PH:src/platform/web/__tests__/unavailable.webtest.ts` | unavailable errors carry their capability | `WebUnavailableError` exposes a closed capability and a message |
| FD102 | test | FD1 | G-PH | unit-web | `PH:src/platform/web/__tests__/WebNotice.webtest.tsx` | notices name what the phone does instead | both variants render the plain wording and an accessible label |
| FD103 | test | FD1 | G-PH | unit-web | `PH:src/platform/web/file-store/__tests__/memory-store.webtest.ts` | memory store honours the file contract | every C-2 function behaves as `01` §4.3, incl. recursive delete and `blob:` copy |
| FD104 | test | FD1 | G-PH | unit-web | `PH:web/shims/__tests__/expo-file-system__legacy.webtest.ts` | directories are origin-relative and synchronous | `documentDirectory` is `/app/_files/doc/` at import |
| FD105 | test | FD1 | G-PH | unit-web | `PH:web/shims/__tests__/expo-file-system__legacy.webtest.ts` | missing file without idempotent rejects | delete of a missing path rejects like native |
| FD106 | test | FD1 | G-PH | unit-web | `PH:web/shims/__tests__/expo-secure-store.webtest.ts` | secure store reports itself unavailable | `isAvailableAsync()` is false; values live for the session only and never reach localStorage |
| FD107 | test | FD1 | G-PH | unit-web | `PH:src/platform/web/__tests__/host-bridge.webtest.ts` | bridge is silent when not framed | no message is posted when `window.parent === window` |
| FD108 | test | FD1 | G-PH | unit-web | same | bridge ignores foreign origins | a `dvren:navigate` from another origin has no effect |
| FD109 | test | FD1 | G-WEB | e2e | `PH:e2e-web/boot.spec.ts` | the app boots past directory setup | no "documentDirectory is not available" error; the init screen or Dashboard shows |
| FD110 | build | FD1 | G-PH | build | `PH:jest.config.js` | web and native Jest projects are separate | `*.webtest.*` never run under the native preset and vice versa |
| FD111 | test | FD1 | G-PH | unit-native | `PH:src/platform/web/__tests__/native-isolation.test.ts` | native code never imports web helpers | no non-web source file imports `@/platform/web` or `web/shims` |
| FD112 | build | FD1 | G-WEB | build | `PH:e2e-web/playwright.config.ts` | e2e runs in three browsers | Chromium, WebKit and Firefox projects exist and run the boot test |
| FD201 | test | FD2 | G-PH | unit-web | `PH:src/platform/web/__tests__/dialogs.webtest.tsx` | alerts render as dialogs | `Alert.alert` with two buttons renders a dialog with both |
| FD202 | test | FD2 | G-PH | unit-web | same | the pressed button's callback runs | pressing a button runs its `onPress` once and closes the dialog |
| FD203 | test | FD2 | G-PH | unit-web | same | dialogs queue in call order | a second alert shows only after the first closes |
| FD204 | test | FD2 | G-PH | unit-web | same | escape acts as cancel | Escape runs the `cancel` button when there is one, and nothing otherwise |
| FD205 | test | FD2 | G-WEB | e2e | `PH:e2e-web/case.spec.ts` | create case confirms through a dialog | entering a case number and confirming creates the case in the list |
| FD206 | test | FD2 | G-PH | unit-native | `PH:src/platform/web/__tests__/WebRoot.test.tsx` | the web root is a no-op on native | native render of `WebRoot` renders its children only |
| ST101 | test | ST1 | G-PH | unit-native | `PH:src/features/case-management/services/__tests__/database-open.test.ts` | native open keeps the key and the cipher proof | `PRAGMA key` runs first and a missing cipher still throws the encryption error |
| ST102 | test | ST1 | G-PH | unit-web | `PH:src/features/case-management/services/__tests__/database-open.webtest.ts` | web open skips the key | no `PRAGMA key` or `cipher_version` is issued on web |
| ST103 | test | ST1 | G-PH | unit-web | `PH:src/platform/web/__tests__/preflight.webtest.ts` | preflight names each failure | insecure context, no OPFS, held lock and no Worker each give their reason |
| ST104 | test | ST1 | G-PH | unit-web | `PH:src/components/error/__tests__/InitFailureScreen.webtest.tsx` | each storage reason has an honest message | the four reasons render their own text, none claims encryption |
| ST105 | test | ST1 | G-WEB | e2e | `PH:e2e-web/persistence.spec.ts` | a case survives reload | a created case is listed after `page.reload()` |
| ST106 | test | ST1 | G-WEB | e2e | same | a second tab is refused honestly | a second tab shows the "open in another tab" screen |
| ST107 | test | ST1 | G-WEB | e2e (Firefox) | same | a private window says it cannot save | Firefox private context shows the no-OPFS screen |
| ST108 | test | ST1 | G-PH | unit-native | existing `PH:src/features/case-management/services/__tests__/database.test.ts` | error mapping unchanged | the `wrapDatabaseError` rows still pass |
| ST201 | test | ST2 | G-PH | unit-web | `PH:src/platform/web/file-store/__tests__/indexeddb-store.webtest.ts` | IndexedDB store honours the file contract | the FD103 cases pass against IndexedDB (fake-indexeddb) |
| ST202 | test | ST2 | G-PH | unit-web | same | files are stored as chunks | a 3 MiB file is stored in 1 MiB `ArrayBuffer` chunks with correct metadata |
| ST203 | test | ST2 | G-PH | unit-web | same | quota errors map to the disk-space error | `QuotaExceededError` surfaces as the app's existing disk-space error |
| ST204 | test | ST2 | G-PH | unit-web | `PH:public/__tests__/sw.webtest.ts` | ranged reads return 206 | `Range: bytes=0-1` returns two bytes with `Content-Range` |
| ST205 | test | ST2 | G-PH | unit-web | same | bad ranges return 416 and missing files 404 | invalid and missing cases answer correctly |
| ST206 | test | ST2 | G-PH | unit-web | same | the worker ignores other URLs | requests outside `/app/_files/` are not intercepted |
| ST207 | test | ST2 | G-WEB | e2e | `PH:e2e-web/media.spec.ts` | a stored photo renders after reload | the image loads from `/app/_files/doc/…` |
| ST208 | test | ST2 | G-WEB | e2e | same | a stored video plays and seeks | `currentTime` advances after a seek, including WebKit |
| ST209 | test | ST2 | G-WEB | e2e | same | a stored audio clip plays | playback starts |
| ST210 | test | ST2 | G-WEB | e2e | same | without a controller media shows a notice | with the worker blocked, the notice replaces the media, no broken image |
| ST211 | test | ST2 | G-PH | unit-web | `PH:src/platform/web/file-store/__tests__/indexeddb-store.webtest.ts` | `blob:` and `data:` sources copy in | `copyAsync` stores their bytes |
| ST212 | test | ST2 | G-PH | unit-web | same | free space is an estimate | `getFreeDiskStorageAsync` returns `quota - usage` |
| ST213 | test | ST2 | G-WEB | e2e | `PH:e2e-web/media.spec.ts` | temp files are swept at boot | an old temp file is gone after the next load |
| ST214 | manual | ST2 | G-BROWSER-REAL | manual | `PH:docs/web-build/evidence/ST2/README.md` | real Safari media check | photo, video and audio play in real Safari |

### 3.3 Documents

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| DC101 | test | DC1 | G-PH | unit-web | `PH:web/shims/__tests__/react-native-webview.webtest.tsx` | html renders in a sandboxed frame | `source.html` is the iframe's `srcdoc` with the pinned sandbox |
| DC102 | test | DC1 | G-PH | unit-web | same | load callbacks fire | `onLoadStart` then `onLoadEnd` run once |
| DC103 | test | DC1 | G-PH | unit-web | same | links do not navigate the frame | a link click is blocked unless `about:` |
| DC104 | test | DC1 | G-PH | unit-web | `PH:src/platform/web/__tests__/print-frame.webtest.ts` | a blocked print is not reported as saved | no `beforeprint` → the caller gets "not printed" |
| DC105 | test | DC1 | G-WEB | e2e | `PH:e2e-web/documents.spec.ts` | case notes preview shows the report | the preview contains the case number and location name |
| DC106 | test | DC1 | G-WEB | e2e | same | time offset preview shows the report | the preview contains the DVR and actual times |
| DC201 | test | DC2 | G-PH | unit-web | `PH:web/shims/__tests__/expo-print.webtest.ts` | report files are written as HTML | `printToFileAsync` returns a stored `.html` URI whose content is the input |
| DC202 | test | DC2 | G-PH | unit-web | `PH:web/shims/__tests__/expo-sharing.webtest.ts` | share downloads the stored file | `shareAsync` triggers a download with the file's name and MIME type |
| DC203 | test | DC2 | G-PH | unit-web | same | share reports a requested download, not a share | the result wording never says "shared" |
| DC204 | test | DC2 | G-WEB | e2e | `PH:e2e-web/documents.spec.ts` | case notes export downloads | a download event with the expected file name occurs |
| DC205 | test | DC2 | G-WEB | e2e | same | GeoJSON export downloads valid JSON | the file parses and has one feature per located location |
| DC206 | test | DC2 | G-WEB | e2e | same | case map export downloads | the HTML file downloads and contains the case data |
| DC207 | test | DC2 | G-WEB | e2e | same | outputs are not called PDFs on web | the export UI says "printable report" for HTML outputs |
| DC208 | test | DC2 | G-WEB | e2e | same | time offset export downloads | a download event occurs |
| DC301 | test | DC3 | G-PH | unit-web | `PH:web/shims/__tests__/react-native-zip-archive.webtest.ts` | zip contains every file under the folder | entries match the stored folder |
| DC302 | test | DC3 | G-PH | unit-web | same | password zips are unavailable | `zipWithPassword` throws `WebUnavailableError('encrypted-zip')` |
| DC303 | test | DC3 | G-WEB | e2e | `PH:e2e-web/exports.spec.ts` | case export downloads a ZIP | the ZIP opens and contains reports, media and GeoJSON |
| DC304 | test | DC3 | G-WEB | e2e | same | asking for encryption offers the unencrypted zip | the notice appears and the unencrypted ZIP downloads |
| DC305 | test | DC3 | G-WEB | e2e | same | location export downloads a ZIP | a single-location ZIP downloads |
| DC306 | test | DC3 | G-WEB | e2e | same | the zip is labelled not encrypted | the export screen states it |
| DC401 | test | DC4 | G-PH | unit-web | `PH:web/shims/__tests__/expo-pdf-text-extract.webtest.ts` | text is extracted from a text pdf | FX-PDF text PDF yields its text and page count |
| DC402 | test | DC4 | G-PH | unit-web | same | a scanned pdf gives the scanned error | FX-PDF scanned PDF maps to the phone's scanned code |
| DC403 | test | DC4 | G-PH | unit-web | `PH:src/features/import/pdf-import/services/providers/__tests__/web-proxy-provider.webtest.ts` | the provider sends the phone's own prompts | the request body carries `systemPrompt` and `userPrompt` unchanged |
| DC404 | test | DC4 | G-PH | unit-web | same | not configured means AI unavailable | 503 `NOT_CONFIGURED` → `AiProcessingError('AI_UNAVAILABLE')` |
| DC405 | test | DC4 | G-PH | unit-web | same | abort cancels the request | aborting rejects and the fetch is aborted |
| DC406 | test | DC4 | G-WEB | e2e | `PH:e2e-web/import.spec.ts` | importing a pdf fills a location | with FX-AI, the imported fields appear on the new location |
| DC407 | test | DC4 | G-WEB | e2e | same | no sample result on failure | with the 503 stub, the import shows AI unavailable and creates nothing |
| DC408 | test | DC4 | G-PH | unit-native | `PH:src/features/import/pdf-import/services/providers/__tests__/index.test.ts` | native provider selection unchanged | native `getDefaultProvider()` still returns the Apple provider |

### 3.4 Capture

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| CA101 | test | CA1 | G-PH | unit-web | `PH:web/shims/__tests__/react-native-vision-camera.webtest.tsx` | photo returns a blob path | `takePhoto` resolves `{path: 'blob:…', width, height}` |
| CA102 | test | CA1 | G-PH | unit-web | same | recording finishes with a video file | `startRecording` then `stopRecording` calls `onRecordingFinished` with a `blob:` path and duration |
| CA103 | test | CA1 | G-PH | unit-web | same | permission hooks reflect the browser | denied getUserMedia → `hasPermission` false |
| CA104 | test | CA1 | G-PH | unit-web | same | no camera is unavailable, not a sample | no device → `WebUnavailableError('camera')` |
| CA105 | test | CA1 | G-PH | unit-web | same | tracks stop on unmount | every `MediaStreamTrack` is stopped |
| CA106 | test | CA1 | G-WEB | e2e (Chromium) | `PH:e2e-web/capture.spec.ts` | a photo is saved to the case | with FX-CAMERA the photo appears in the media library |
| CA107 | test | CA1 | G-WEB | e2e (Chromium) | same | a video is saved to the case | the video appears and plays |
| CA108 | test | CA1 | G-WEB | e2e | same | denied permission shows the denied view | the app's denied view renders |
| CA109 | test | CA1 | G-WEB | e2e | same | the capture screen no longer errors | `/media-capture` renders without the error boundary |
| CA110 | manual | CA1 | G-BROWSER-REAL | manual | `PH:docs/web-build/evidence/CA1/README.md` | real camera check | photo and video with a real camera in Chrome and Safari |
| CA201 | test | CA2 | G-PH | unit-web | `PH:web/shims/__tests__/ml-kit-text-recognition.webtest.ts` | recognition returns ML Kit's shape | blocks with text, frame and lines |
| CA202 | test | CA2 | G-PH | unit-web | same | the clean frame parses to its timestamp | FX-DVR clean frame → expected timestamp through the phone's parser |
| CA203 | test | CA2 | G-PH | unit-web | same | the ambiguous frame is flagged | FX-DVR ambiguous frame → the parser's ambiguity outcome |
| CA204 | test | CA2 | G-PH | unit-web | same | no SIMD is unavailable | missing SIMD → `WebUnavailableError('ocr')`, never sample text |
| CA205 | test | CA2 | G-WEB | e2e (Chromium) | `PH:e2e-web/ocr.spec.ts` | OCR screen reads a frame | with FX-CAMERA showing a DVR frame, the read time appears |
| CA206 | build | CA2 | G-WEB | build | `PH:scripts/export-web.sh` | OCR assets are self-hosted | `dist-web/ocr/` holds the worker, core and language data; no third-party CDN URL in the bundle |
| CA301 | test | CA3 | G-WEB | e2e (Chromium) | `PH:e2e-web/audio.spec.ts` | a recording is saved and plays | record, stop, save → listed and playable |
| CA302 | test | CA3 | G-WEB | e2e (Chromium) | same | pause excludes paused time | duration excludes the paused interval |
| CA303 | test | CA3 | G-PH | unit-web | `PH:src/features/media/audio-recording/__tests__/format-label.webtest.ts` | the format shown is the real one | web shows the recorder's actual container, not AAC |
| CA304 | test | CA3 | G-WEB | e2e | same | denied microphone shows the denied view | the app's denied view renders |
| CA305 | manual | CA3 | G-BROWSER-REAL | manual | `PH:docs/web-build/evidence/CA3/README.md` | real microphone check | Chrome and Safari record and play back |

### 3.5 Location and map

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| LM101 | test | LM1 | G-PH | unit-web | `PH:src/features/location/services/__tests__/gps-service.webtest.ts` | every sample asks for a fresh fix | each call passes `maximumAge: 0` |
| LM102 | test | LM1 | G-PH | unit-web | same | the most accurate sample wins | scripted fixes → the lowest accuracy value is returned |
| LM103 | test | LM1 | G-PH | unit-web | same | early stop on target accuracy | sampling stops when the target is met |
| LM104 | test | LM1 | G-PH | unit-web | same | denial and timeout map to phone codes | browser errors become the matching `GpsError` codes |
| LM105 | test | LM1 | G-PH | unit-web | same | no geolocation is unavailable | missing API → an error, never a coordinate |
| LM106 | test | LM1 | G-WEB | e2e | `PH:e2e-web/location.spec.ts` | capture fills the location | with FX-GEO the location shows the expected coordinates and sample count |
| LM201 | test | LM2 | G-PH | unit-web | `PH:src/features/location/map-view/components/__tests__/CaseMapView.webtest.tsx` | web map exposes the native props and ref | the component accepts `CaseMapViewProps` and `flyTo` |
| LM202 | test | LM2 | G-PH | unit-web | same | pins are coloured by status | the feature collection maps to the status colours |
| LM203 | test | LM2 | G-PH | unit-web | same | long press reports a coordinate | a held press calls `onLongPress` with the map coordinate |
| LM204 | test | LM2 | G-PH | unit-web | same | no token shows map unavailable | missing token → the unavailable view, no blank map |
| LM205 | test | LM2 | G-WEB | e2e | `PH:e2e-web/map.spec.ts` | the map tab shows the case pins | with FX-CASE and a token, pins render and a pin press opens its location |
| LM206 | test | LM2 | G-WEB | e2e | same | clusters expand on press | zooming into a cluster shows its pins |
| LM207 | test | LM2 | G-WEB | e2e | same | the cameras map renders | the cameras step shows camera markers |
| LM208 | test | LM2 | G-PH | unit-native | existing `CaseMapView` tests | native map unchanged | existing native tests pass |

### 3.6 App shell

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| SH101 | test | SH1 | G-WEB | e2e | `PH:e2e-web/wizard.spec.ts` | a date can be chosen on web | tapping a date field opens the calendar and the chosen date is saved |
| SH102 | test | SH1 | G-PH | unit-native | existing `DateTimePicker` tests | native date behaviour unchanged | existing tests pass for ios and android |
| SH103 | test | SH1 | G-WEB | e2e | `PH:e2e-web/layout.spec.ts` | tab labels fit the frame | at 378×786 every tab label is fully visible |
| SH104 | test | SH1 | G-WEB | e2e | same | headers have web padding | the header top padding equals `Layout.headerPadding.web` |
| SH105 | test | SH1 | G-WEB | e2e | same | the scanner font loads | `document.fonts.check('12px ShareTechMono-Regular')` is true |
| SH201 | test | SH2 | G-PH | unit-web | `PH:src/features/precision-time-sync/services/__tests__/unified-sync.webtest.ts` | time sync is labelled simulated | the result carries the simulated source |
| SH202 | test | SH2 | G-WEB | e2e | `PH:e2e-web/time-offset.spec.ts` | use current time shows the simulated label | the label is visible next to the synced time |
| SH203 | test | SH2 | G-PH | unit-web | same as SH201 | no network call for time | no request to the time API is made |
| SH204 | test | SH2 | G-WEB | e2e | `PH:e2e-web/boot.spec.ts` | the app opens without the long splash | the Dashboard shows within 2 s of load |
| SH205 | test | SH2 | G-PH | unit-native | existing splash tests | native splash unchanged | existing tests pass |
| SH301 | test | SH3 | G-WEB | e2e | `PH:e2e-web/settings.spec.ts` | cloud sync is phone-only on web | the section shows the phone-only notice and no Supabase request occurs |
| SH302 | test | SH3 | G-WEB | e2e | same | no screen claims encryption at rest | the web copy replaces every encryption-at-rest claim |
| SH303 | test | SH3 | G-WEB | e2e | same | export password storage is phone-only | the default ZIP password control shows the notice |
| SH304 | test | SH3 | G-WEB | e2e | same | open-settings prompts become instructions | where native offers "Open Settings", web shows browser instructions |
| SH305 | test | SH3 | G-PH | unit-web | `PH:src/features/sync/components/__tests__/SyncBootstrap.webtest.tsx` | sync never starts on web | no startup sync or save trigger runs |
| SH306 | test | SH3 | G-WEB | e2e | `PH:e2e-web/settings.spec.ts` | app lock never blocks the web app | turning app lock on shows the existing biometrics-unavailable path, not a dead end |
| SH401 | test | SH4 | G-PH | unit-web | `PH:src/platform/web/__tests__/host-bridge.webtest.ts` | route changes are posted | navigation posts `dvren:route` with the path |
| SH402 | test | SH4 | G-PH | unit-web | same | the five modals post their ids | opening each posts `dvren:modal` |
| SH403 | test | SH4 | G-PH | unit-web | same | navigate moves the router without reload | `dvren:navigate` changes route; no page load |
| SH404 | test | SH4 | G-PH | unit-web | same | visible steps are posted | form customization changes post `dvren:steps` |
| SH405 | test | SH4 | G-PH | unit-native | `PH:src/platform/web/__tests__/native-isolation.test.ts` | modal emit sites are no-ops on native | the native helper posts nothing |

### 3.7 Marketing

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| MK101 | test | MK1 | G-MK | unit-mk | `MK:app/api/extract/__tests__/route.test.ts` | the phone's prompt shape is accepted | an allowed `systemPrompt` + `userPrompt` returns `{rawText}` |
| MK102 | test | MK1 | G-MK | unit-mk | same | unknown prompts are refused | an unlisted prompt hash → 400 `PROMPT_NOT_ALLOWED` |
| MK103 | test | MK1 | G-MK | unit-mk | same | output tokens are capped | a larger `maxOutputTokens` is sent upstream as the cap |
| MK104 | test | MK1 | G-MK | unit-mk | same | the prompts reach the model unchanged | upstream messages equal the request's prompts |
| MK105 | test | MK1 | G-MK | unit-mk | same | the legacy shape still works until retirement | `{documentText}` behaves as before |
| MK106 | test | MK1 | G-MK | unit-mk | same | not configured stays 503 | missing key → 503 `NOT_CONFIGURED` |
| MK107 | test | MK1 | G-MK | unit-mk | `MK:app/api/extract/__tests__/guards.test.ts` | origin and size guards unchanged | the existing guard cases pass |
| MK108 | test | MK1 | G-MK | unit-mk | `MK:lib/extract-prompt/__tests__/prompt.test.ts` | the legacy prompt no longer lives in the demo | the route imports nothing from `@/features/demo` |
| MK201 | test | MK2 | G-MK | unit-mk | `MK:components/demo-host/__tests__/DemoHost.test.tsx` | the app is framed at the screen size | an iframe `src="/app/"` sized 378×786 sits inside the frame |
| MK202 | test | MK2 | G-MK | unit-mk | `MK:components/demo-host/__tests__/bridge.test.ts` | the rail follows route messages | a `dvren:route` updates the rail's chapter and visited set |
| MK203 | test | MK2 | G-MK | unit-mk | same | rail jumps navigate the app | a jump posts `dvren:navigate` to the iframe |
| MK204 | test | MK2 | G-MK | unit-mk | same | foreign messages are ignored | a message from another origin changes nothing |
| MK205 | test | MK2 | G-MK | unit-mk | `MK:components/demo-host/__tests__/reset.test.ts` | reset clears every store | IndexedDB `dvren-fs`, OPFS, app localStorage keys and the SW registration are removed, then the frame reloads |
| MK206 | test | MK2 | G-MK | unit-mk | `MK:components/demo-host/__tests__/DemoHost.test.tsx` | narrow screens get full screen | below 640 px the page links to `/app/` instead of framing |
| MK207 | test | MK2 | G-MK | e2e-mk | `MK:e2e/demo.spec.ts` | `/demo` runs the real app | the framed app reaches its Dashboard |
| MK208 | test | MK2 | G-MK | unit-mk | existing `hero.test`, `footer.test`, `site-config.test` | inbound links keep working | links still point at `/demo` |
| MK301 | test | MK3 | G-MK | unit-mk | `MK:scripts/__tests__/fetch-app-build.test.ts` | the pinned build is fetched and verified | a checksum mismatch fails the build |
| MK302 | test | MK3 | G-MK | e2e-mk | `MK:e2e/app-hosting.spec.ts` | `/app` and `/app/` serve the app | both return the app's `index.html` |
| MK303 | test | MK3 | G-MK | e2e-mk | same | deep links fall back to the app | `/app/cases` returns `index.html` |
| MK304 | test | MK3 | G-MK | e2e-mk | same | hashed assets are immutable | `/app/_expo/static/*` has `immutable` caching |
| MK305 | test | MK3 | G-MK | e2e-mk | same | index and worker are revalidated | `index.html` and `sw.js` are `no-cache` |
| MK306 | test | MK3 | G-MK | unit-mk | `MK:scripts/__tests__/fetch-app-build.test.ts` | the build output is not committed | `public/app/` is ignored by git |

### 3.8 Integration and retirement

| ID | Kind | Slice | Gate | Layer | Location | Title | Proves |
|---|---|---|---|---|---|---|---|
| IN101 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/full-case.spec.ts` | a full case can be completed | create case → location → every wizard step → completion, in three browsers |
| IN102 | test | IN1 | G-WEB | e2e | same | the completed case survives reload | everything entered is still there after reload |
| IN103 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/exports.spec.ts` | every export produces its file | case notes, time offset, GeoJSON, case map, ZIP |
| IN104 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/import.spec.ts` | import creates a filled location | PDF import end to end with FX-AI |
| IN105 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/media.spec.ts` | captured media lists, plays and exports | photo, video, audio end to end (Chromium fake devices) |
| IN106 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/ocr-time.spec.ts` | OCR and time offset end to end | read DVR time, simulated sync, offset computed and in the report |
| IN107 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/map.spec.ts` | the map shows the case | pins and cameras for the case |
| IN108 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/honesty.spec.ts` | no silent no-op remains | every button in the flow list produces a visible outcome (a scripted sweep of the 96 alert sites reachable by UI) |
| IN109 | test | IN1 | G-WEB | e2e | same | every phone-only control is labelled | each listed control shows its notice |
| IN110 | test | IN1 | G-MK | e2e-mk | `MK:e2e/demo-flows.spec.ts` | the rail tracks a full visit | rail chapter and checklist follow IN101's route inside `/demo` |
| IN111 | test | IN1 | G-MK | e2e-mk | same | reset returns a fresh app | after reset the case list is empty |
| IN112 | manual | IN1 | G-NATIVE | manual | `PH:docs/web-build/evidence/IN1/README.md` | native smoke build | the iOS development build launches and creates a case |
| IN113 | manual | IN1 | G-BROWSER-REAL | manual | same | real Safari full visit | IN101 by hand in real Safari, and on an iPhone if available |
| IN114 | build | IN1 | G-WEB | build | `PH:scripts/export-web.sh` | the release build passes the secret check | the artifact the marketing site pins has no secrets |
| IN115 | test | IN1 | G-PH | unit-native | full native suite | the phone suite is green on the merged branch | `npm test` green on `feature/web-build` |
| IN116 | build | IN1 | CI | build | `PH:.github/workflows/web-build.yml` | CI web build green on the merged branch | the workflow passes |
| IN117 | manual | IN1 | — | manual | `PH:docs/web-build/evidence/IN1/m3-report.md` | owner checkpoint report | the M3 one-page report exists |
| IN118 | test | IN1 | G-WEB | e2e | `PH:e2e-web/flows/two-tabs.spec.ts` | a second tab in the full build is refused honestly | as ST106, on the release build |
| IN201 | build | IN2 | G-MK | build | `MK` | the site builds without the hand-built demo | `pnpm build`, `pnpm typecheck`, `pnpm test` green |
| IN202 | test | IN2 | G-MK | unit-mk | `MK:__tests__/no-demo-imports.test.ts` | nothing imports the old demo | no file imports `@/features/demo` |
| IN203 | test | IN2 | G-MK | unit-mk | `MK:app/api/extract/__tests__/route.test.ts` | the legacy route shape is gone | `{documentText}` → 400 |
| IN204 | build | IN2 | G-MK | build | `MK:package.json` | unused dependencies are removed | the R3 §6 list is gone from `package.json` |
| IN205 | manual | IN2 | — | manual | `MK:docs/web-build/evidence/IN2/README.md` | docs archived and both CLAUDE.md files updated | the listed sections are rewritten |

## 4. Gates

| # | Step | Fails when |
|---|---|---|
| 1 | `npm run typecheck` | a type error (native and web files) |
| 2 | `npm run lint`, `npm run format:check`, `npm run check:invariants` | any rule fails |
| 3 | `npm test` (native) | any native test fails |
| 4 | `npm run test:web` | any web test fails |
| 5 | `scripts/export-web.sh` | export fails or the secret check finds a secret |
| 6 | `npm run e2e:web` (the slice's area; all of it in IN1) | any e2e test fails in any of the three browsers |

A slice passes steps 1–6 before it merges into its lane branch. Steps 5–6 start at FD1 (FD0 runs 1–5 and FD003).
Marketing slices pass G-MK. A step a slice could not run is reported as not run.

## 5. Procedures

- **SP0 browser spike:** follow `02` SP0; record browser and OS versions, each outcome, screenshots.
- **Real-browser checks** (ST214, CA110, CA305, IN113): real Safari on macOS and Chrome, with a real camera and
  microphone; record versions and outcomes.
- **Native smoke build** (IN112): EAS development build of `feature/web-build` launched in the iOS simulator; open,
  create a case, take the wizard to completion; record the build ID.
- **M3 owner checkpoint** (IN117): a one-page, plain-language report with the `/demo` link and what to try; the
  owner drives it and answers before IN2 starts.

## 6. Done rules

- A slice is done when its gate is green and its evidence README exists. Coverage and mutation scores are not
  gates.
- **Never:** mark an unrun browser as passed; let a stand-in report success it did not achieve; add sample or
  fabricated data on failure; weaken a native test to make a web change pass; commit `dist-web/` or `public/app/`.
