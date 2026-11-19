# R3: the marketing site, hosting, and the demo's reusable browser code

Evidence base: marketing worktree `80fb827b` (read-only), phone `main @ c4749193` with its installed
`node_modules` (read-only; expo 57.0.21, expo-sqlite 57.0.2, expo-camera 57.0.4, expo-location 57.0.16),
Next/Vercel/MDN/Expo docs fetched this session. Context7 returned "Invalid API key", so every library claim
below is from installed source or fetched docs. **Not run:** no `node_modules` in the marketing worktree, so
no vitest, no `next build`, and nothing was exercised in a browser. Test counts are regex counts of
line-leading `it(`/`test(` declarations (they undercount `it.each` expansions).

## 1. Embedding

### How `/demo` mounts today
- `app/demo/page.tsx:1-15`: `'use client'`, `next/dynamic(() => import('@/features/demo'), {ssr:false})`,
  renders `<DemoExperience boot />`. **No iframe.** The only iframe in the demo is the PDF preview.
- `app/demo/` sits **outside** `app/(default)/`, so it inherits no marketing chrome. The root layout
  (`app/layout.tsx`) only loads global CSS and four `next/font` fonts. `chrome-scope.test.tsx` guards this.
- `DemoExperience` lays out phone (left) + `StoryRail` (right) itself, and scales the 404x812 device to the
  viewport with `usePhoneScale` (`features/demo/ui/usePhoneScale.ts`, 12 lines, capped 1:1).
- `app/demo/error.tsx` is the route error net ("Try again" / "Start fresh").

### Every phone on the marketing site
| Where | Component | Shows | Interactive demo? |
|---|---|---|---|
| Home hero | `components/home/hero.tsx:112-120` -> `MarketingPhoneFrame scale=0.68` -> `AppDemo` | looping `<video>` (`demos/home/walkthrough.mp4`, poster webp) | no |
| Feature rows | `components/feature/feature-row.tsx:66-67` -> `MarketingPhoneFrame scale=0.62` -> `AppDemo` | looping videos from `lib/content/features.ts` | no |
| `/demo` | `features/demo/ui/PhoneFrame.tsx` (a second copy of the geometry) | the hand-built demo | yes |

- `components/app-demo.tsx` is the **video-loop** component, not the interactive demo (name collision).
- `components/marketing/phone-frame.tsx` is a Server Component: 404 frame, 378x786 screen, fixed scale, bracket
  chrome, and a `children` slot. Its docblock says it deliberately draws **no status bar, island or home
  indicator**, because the captures carry real device chrome, and a test pins that it never imports
  `@/features/demo`.
- Links to `/demo`: hero CTA "Drive the live demo" (`hero.tsx:103`), footer "Live demo"
  (`components/ui/footer.tsx:8`), header nav via `lib/site-config.ts:27`. Pinned by `hero.test`, `footer.test`,
  `site-config.test`. Nothing else embeds or links it.

### Where an iframe of the real app sits
- **Primary: the `/demo` route.** Keep the URL (the three inbound links and any shared links keep working).
  Replace `app/demo/page.tsx` with a client island: a frame (the marketing geometry plus the demo's
  island/status-bar overlay, because a live app has no recorded chrome) wrapping
  `<iframe src="/app/" width=378 height=786 style="border:0">`, with the narration rail beside it.
  The 378x786 screen slot is exactly the iframe viewport; the CSS `transform: scale()` the frames already use
  works on iframes (paint scales, layout box does not, so keep the height-compensation trick from
  `PhoneFrame.tsx`). Reuse `usePhoneScale` (copy it; marketing must not import demo code) for fit-to-viewport.
- **Hero and feature rows: leave as videos.** A live iframe in the hero would put a multi-MB app load on the
  LCP path. If wanted, a click-to-activate poster ("Drive it live") that swaps the video for the iframe.
- **Narrow viewports:** a phone-in-a-phone on a real phone is wrong. Link straight to `/app/` full-screen below
  some width. (Design call; not tested.)
- **Dependency on R1:** `react-native-safe-area-context` gives zero insets on web, so something must give the
  app a top inset under the frame's drawn status bar (e.g. `?frame=1`). Not investigated here.
- **Permissions in the iframe:** per MDN, the default Permissions-Policy allowlist for `geolocation` and
  `camera` is `self`, so a **same-origin iframe needs no `allow=`**; a cross-origin one does
  (`allow="camera; microphone; geolocation"`). `microphone`, `clipboard-*` not fetched; same default is the
  spec norm, unverified here.

## 2. Hosting options

### What exists
- Next.js `15.1.11`, App Router, `next.config.js` has only `eslint.dirs` (no `output`, `rewrites`, `headers`).
  There are server routes (`app/api/extract`, `app/api/hello`) and a Server Action (beta form), so this is a
  **server deployment, not `output: 'export'`**.
- **No `vercel.json`, no `.github/`, no CI workflow, no `.vercel/` in the repo.** Docs plan Vercel
  (`docs/planning/04-beta-and-email-capture.md`, `06-...`), `siteConfig.url` is still `https://example.com`.
  **Unverified: whether and where production is actually deployed.** Everything below assumes Vercel.
- Marketing pages use no `localStorage`/`sessionStorage`/IndexedDB (grep of `app components lib`), so no
  key collisions if the app shares the origin.

### Facts that constrain every option
| Fact | Source |
|---|---|
| `expo-sqlite` web is a Worker + OPFS `AccessHandlePoolVFS` and its sync bridge does `new SharedArrayBuffer(4)` and `Atomics` | `expo-sqlite/web/WorkerChannel.ts:104-106`, `worker.ts:10,790` |
| `SharedArrayBuffer` exists only when `crossOriginIsolated` (COOP `same-origin` + COEP `require-corp`/`credentialless`) | MDN, fetched |
| An embedded frame can only be isolated if the **top-level document** is isolated; the host page must carry COOP+COEP too (MDN did not state this outright; it is standard browser behaviour, **needs a runtime check of `crossOriginIsolated` inside the iframe**) | MDN COEP page + general knowledge |
| `headers()` in `next.config.js` are applied **before** the filesystem, so they cover `public/` files and can be path-scoped | Next docs, fetched |
| Files in `public/` get `Cache-Control: public, max-age=0` by default; `public/app/` is **not** served at `/app` or `/app/` (no directory index) | Next public-folder docs |
| `rewrites` `fallback` runs after public files and dynamic routes, so it is a clean SPA fallback; external-URL rewrites are supported | Next rewrites docs |
| Expo `web.output` omitted -> `single` (one `index.html`, needs an SPA rewrite); `static` -> one HTML per route; sub-path deploys use `experiments.baseUrl` (marked experimental) | Expo "publishing websites" docs |
| Phone `app.config.js:172-175` has `web:{favicon,bundler:'metro'}` only: no `output`, no `baseUrl` yet | file |
| Vercel: CLI source upload 100 MB Hobby / 1 GB Pro, 15,000 files; 2,048 routes per deployment; proxied (external rewrite) request timeout 120 s | vercel.com/docs/limits |
| Sizes of lazily loaded pieces the app will need: Tesseract assets 6.7 MB (`public/ocr`), pdf.js worker 1.2 MB, mapbox-gl 1.8 MB, wa-sqlite wasm 0.6 MB; the RN web bundle size is **unknown** (cannot build) | `du`, `ls` |

### Options compared
| | A. Copy build into marketing `public/app/` | B. Rewrite to a separate deployment | C. Subdomain (`app.<domain>`) |
|---|---|---|---|
| Mechanism | Expo `export -p web` output (with `baseUrl:'/app'`) lands in `public/app/`; `rewrites` `/app`, `/app/` -> `/app/index.html`; `fallback` `/app/:path*` -> `/app/index.html` | `rewrites` `/app/:path*` -> `https://<web-deploy>/app/:path*` (proxied) | separate Vercel project/domain; marketing iframes the URL |
| Build pipeline (two repos) | Marketing build needs the phone web artifact. **Don't commit it** (hashed bundles churn git history). Fetch a pinned release artifact in a `prebuild` step, or build from a checkout; needs read access to the phone repo. Version is pinned by the marketing repo, so releases are reproducible | Fully decoupled: phone repo deploys on its own; marketing changes only on first setup. Two deploys to keep in step (host page vs app contract) | Fully decoupled, same as B |
| Cache | Override per path in `headers()`: `/app/_expo/static/:path*` immutable; `index.html` and SW `no-cache`. Default `max-age=0` is revalidating, not broken | Origin's headers pass through; CDN caching of proxied responses follows origin `Cache-Control` (not verified) | Fully controlled in its own project |
| Size limits | Counts toward the marketing deployment; limits above are far above a typical web bundle | None on marketing | None on marketing |
| Service-worker scope | SW served from `/app/sw.js` has default scope `/app/`; it **cannot** touch marketing pages. A SW controls *clients*, so it also sees that page's `/api/extract` fetches (it just must not answer them) | same as A (proxied path, same origin) | scope is the whole subdomain |
| COOP/COEP for that path only | **Yes**: `headers()` on `/app/:path*` **and `/demo`** (the host page). All other marketing pages unaffected. Marketing needs no third-party subresources on `/demo` (fonts are self-hosted via `next/font`) | Set on the origin's `vercel.json` for `/app/*`; the host `/demo` still needs it from Next `headers()` | Free on the subdomain, but the **top-level host page still needs COOP/COEP and the iframe needs `allow="cross-origin-isolated"` + CORP**: most fragile |
| Effect on marketing pages | none, except `/demo` carries COOP/COEP (it is chrome-free and loads only same-origin assets today) | adds proxy latency + Fast Origin Transfer on every app asset; one more thing that can 5xx | none, but cross-origin: needs `allow=` list, `frame-ancestors`, and `/api/extract` CORS (see section 3) |
| Storage | same origin as marketing: one "clear site data" wipes both; host page can reset app data directly | same as A | separate origin (cleaner isolation); Safari/Chrome only avoid partitioning if it stays **same-site** (a `*.vercel.app` URL would be third-party) |
| Dev loop | `pnpm dev` serves whatever is in `public/app/`; or a dev-only `beforeFiles` rewrite to the Expo dev server (loses the COOP headers) | natural | natural |

Ranking: **A with a fetched artifact** is the best fit (same origin, no CORS work, path-scoped headers,
reproducible). **B** is the fallback if the phone team wants independent deploys. **C is worst** because the
isolation requirement and `/api/extract` origin guard both fight cross-origin.

## 3. AI proxy fit

### Marketing route contract (`app/api/extract/route.ts`, `guards.ts`)
| Item | Value |
|---|---|
| Request | `POST /api/extract`, JSON `{ documentText: string }`; empty/non-string -> 400 `BAD_REQUEST` |
| Response | 200 `{ rawText }`; errors `{ error, code }` with codes `TOO_LARGE` 413, `FORBIDDEN` 403, `RATE_LIMITED` 429, `BAD_REQUEST` 400, `NOT_CONFIGURED` 503, `UPSTREAM_ERROR` 502 |
| What it does | truncates to `MAX_DOCUMENT_CHARS` 8000 (+`\n[TRUNCATED]`), builds `[system, user]` messages from **its own copy** of the prompts, one OpenAI-style `/chat/completions` call, `temperature: 0`, no streaming, no `max_tokens`, no abort passthrough |
| Env (server) | `OLLAMA_API_KEY` (absent -> 503), `OLLAMA_MODEL` (`llama3.2:3b`), `OLLAMA_BASE_URL` (`https://ollama.com/v1`), `OLLAMA_TIMEOUT_MS` (30000, floor 1000), `ALLOWED_ORIGINS`, `RATE_LIMIT_MAX` 20, `RATE_LIMIT_WINDOW_MS` 60000 |
| Guards | body cap 50,000 bytes (by `content-length` only); `isAllowedOrigin`: no `Origin` header -> allowed, else `Origin.host === Host` or in `ALLOWED_ORIGINS`; in-memory per-IP bucket keyed on `x-forwarded-for` (per server instance, best-effort) |
| Coupling | `route.ts:17-20` imports `EXTRACT_FIELDS_SYSTEM_PROMPT`, `buildExtractFieldsUserPrompt`, `MAX_DOCUMENT_CHARS` from `@/features/demo/engine/logic/import` |

### Phone seam (`src/features/import/pdf-import/`)
- `AiExtractionProvider { capabilities; isAvailable(): Promise<boolean>; extract({systemPrompt, userPrompt,
  temperature?, maxOutputTokens?, abortSignal?}): Promise<{rawText, durationMs}> }`
  (`services/providers/ai-extraction-provider.ts`). Raw text only; cleaning/JSON/Zod live in `extractFields`.
- `extractFields` resolves `options?.provider ?? getDefaultProvider()` (`ai-extraction-service.ts:120`), calls
  with temperature 0.2 and maxOutputTokens 2000, and retries `AI_MAX_RETRIES = 2` on any error except
  `AiProcessingError('AI_UNAVAILABLE')`. `AI_TIMEOUT_MS = 30000` is enforced inside the Apple helper.
- `getDefaultProvider()` always returns `AppleFoundationProvider`, whose helper returns "unavailable" when
  `Platform.OS !== 'ios'`. The orchestrator never passes a provider. A web build therefore needs
  `providers/index.web.ts` exporting a `getDefaultProvider()` that returns a web provider.

### Can the web build call the route as is? **No, three mismatches**
1. **Shape.** The provider receives already-built `systemPrompt`/`userPrompt`; the route takes only
   `documentText` and builds its own. Passing the phone's `userPrompt` as `documentText` would double-wrap it
   (`---BEGIN DOCUMENT---` inside `---BEGIN DOCUMENT---`), and the phone's prompt would be ignored.
2. **The route's prompt has drifted from the phone's.** Measured: demo `EXTRACT_FIELDS_SYSTEM_PROMPT` is
   **1,919 chars**; the phone's locked prompt is **3,937 chars** (adds the email-format section, badge/name
   rules, the "from X to Y is ONE entry" rule, etc.). Last demo change to that file 2026-07-30 (unrelated);
   phone prompt locked 2026-05-28. The live route would give different extractions than the phone's own
   validated prompt. After retirement the prompt cannot stay in `features/demo/`.
3. **Parameters.** Route fixes `temperature: 0`, ignores the phone's 0.2 / `maxOutputTokens` / `abortSignal`
   (a dismissed import modal cannot cancel the request).

### Adapter needed (phone repo, `.web.ts`)
`WebProxyProvider implements AiExtractionProvider`: `isAvailable()` (cheap, e.g. `true`; availability is learned
from the first call), `extract()` does `fetch('/api/extract', {signal: abortSignal})`, maps responses:
503 `NOT_CONFIGURED` -> `AiProcessingError('AI_UNAVAILABLE')` (not retried, honest message);
429/502/network -> `AI_EXTRACTION_FAILED` (retried, so a 429 consumes more of the 20/min budget: 3 calls per
import); 200 -> `{rawText, durationMs}`. **Do not carry over the demo's silent SAMPLE fallback**
(`ui/import/run-import.ts`): the phone has no sample path, and the standing rule is never a fake success.
- **Route change (marketing repo):** accept `{systemPrompt, userPrompt, temperature?, maxOutputTokens?}` and
  keep `{documentText}` until the demo is gone. To stop the endpoint becoming a general-purpose LLM proxy on
  the site's key, require `sha256(systemPrompt)` to be in an allow-list (env or constant). That also turns
  prompt drift into a loud 4xx instead of a silent regression. Keep the 50 KB cap (a real request is about
  4 KB system + up to 8 KB document), and cap `maxOutputTokens`.
- The phone's own `MAX_DOCUMENT_CHARS = 8000` truncation already happens in the orchestrator, so the route's
  truncation becomes a second, harmless net.

### Origin checks for a same-origin iframe
- A `fetch` POST from `https://site/app/` to `/api/extract` carries `Origin: https://site`; `Host` is `site`;
  `isAllowedOrigin` passes with **no env config**. Previews on other hosts also pass (host-relative).
- Cross-origin (option C or a dev server on :8081): `Origin !== Host` -> 403 unless added to
  `ALLOWED_ORIGINS`, **and** there is no CORS handling at all (no `Access-Control-*`, no `OPTIONS` handler), so
  the browser's JSON preflight fails first. Needs both changes.
- The rate limit key is `x-forwarded-for`; all visitors behind one NAT share a bucket. Unchanged by iframing.
- Unverified: Vercel function max duration vs the 30 s upstream timeout on the Hobby plan.

## 4. Reusable I/O table

Fit: **drop-in** = use unchanged; **adapter** = reuse logic behind the phone's signature; **rewrite** = reuse
ideas/pieces but the phone surface differs structurally; **n/a** = phone seam already works on web, nothing to
lift. Demo paths are under `features/demo/`. **None of the I/O modules imports the Zustand store** (grep of
`ui/inputs`, `ui/import`, `ui/chrome/PdfPreview`, `MapCanvas`: only a comment in `CameraGpsCapture.tsx`); they
use injected `read*()` seams and import only pure `engine/logic/*` modules.

| Capability | Demo files (LOC) | Demo interface | Deps | Demo tests | Phone seam it would replace | Fit | Notes |
|---|---|---|---|---|---|---|---|
| **GPS loop** | `ui/inputs/capture-gps.ts` (183), `useGpsCapture.ts` (118), `engine/logic/gps.ts` (338), `clock.ts` (25) | `captureGps(config{targetAccuracyM,maxAttempts,timeoutMs,retryDelayMs}, deps) -> {ok,fix{lat,lng,accuracyM?,capturedAtIso,sampleCount}} \| {ok:false,failure{code,message}} \| null` | none (`navigator.geolocation`) | 16 + 7 + 31 | `location/services/gps-service.ts`: `captureLocation(config{targetAccuracy,maxAttempts,timeout,retryDelay}) -> GpsLocation{latitude,longitude,accuracy,altitude?,timestamp ISO,source:'gps',sampleCount}` throws `GpsError{code}`; plus `requestPermissions`, `hasPermission`, `getProximityCoordinate` | **adapter** | The phone already runs on web via `expo-location`'s `ExpoLocation.web.js` over `navigator.geolocation`. **Defect on web (code reading, not run):** its `getCurrentPositionAsync` defaults `maximumAge: Infinity` (`ExpoLocation.web.js:122`) and the phone passes none, so samples 2..N can come back as the cached first fix; the demo uses `maximumAge: 0`. Also `getPermissionsAsync` throws if `navigator.permissions.query` is missing. Fix = `gps-service.web.ts` built on the demo loop (rename config keys, map `UNSUPPORTED` to a phone `GpsError` code) or a `maximumAge:0` override |
| **Camera photo + video** | `capture-media.ts` (547), `useCaptureStream.ts` (212), `useMediaCapture.ts` (529), `engine/logic/media/*` (permissions, capability, devices, recording state machine, captured, library) | `openCaptureStream`, `grabVideoFrame` (canvas), `startStreamRecording` (MediaRecorder), `listCaptureDevices`; hooks `useCaptureStream`, `useMediaCapture` | none | 63 + 16 + 44 + 162 (media engine) | `video-image-capture/components/VisionCameraScreen.tsx`: props `onPhotoCapture(uri,capturedAt)`, `onVideoCapture(uri,capturedAt,duration)`, `onCancel`; `vision-capture-service.createPhotoCapture(PhotoFile{path,...}) -> PendingCapture{uri,type,capturedAt,sizeBytes,...}` via `FileSystem.copyAsync` | **rewrite** of the screen, **reusing** the I/O | `react-native-vision-camera` has **no web code** in node_modules. `expo-camera` web supports photos but `record()`/`stopRecording()` only `console.warn('... not supported on web')` (`ExpoCamera.web.js:63,66`). So a `VisionCameraScreen.web.tsx` honouring the 3 props, built on the demo's stream/frame/recorder code, writing blobs through the web file store and handing back a URI. Drop the demo's SAMPLE-media fallback (`engine/logic/media/samples.ts`, `public/demo-media`): the phone shows a permissions/unavailable view, not sample media. Output container is whatever `MediaRecorder` picks (webm on Chromium, mp4 on Safari): check the phone's media-type validation and export (unverified) |
| **Audio recording + meter** | `audio-analyser.ts` (168), `useAudioAnalyser.ts` (122), recorder in `capture-media.ts` | Web Audio `AnalyserNode` FFT meter (40 bars), `MediaRecorder` | none | 9 + 9 (+ recorder cases above) | `audio-recording/hooks/useAudioCapture.ts` wraps `@siteed/expo-audio-studio` `useAudioRecorder` (`analysisData.dataPoints[].amplitude`, `compressedFileUri`) | **n/a first, adapter as fallback** | `@siteed/expo-audio-studio` 2.18.1 ships `ExpoAudioStream.web.ts` + `WebRecorder.web.ts` (webm/opus compressed, wav) and advertises web support. **Not run**; try it first. If its `analysisData` or file output is inadequate, adapt the demo analyser to emit the same `{dataPoints:[{amplitude}]}` shape |
| **OCR (Tesseract)** | `ui/inputs/ocr-recognize.ts` (104), `engine/logic/ocr-crop.ts` (62); `public/ocr/*` (6.7 MB: `worker.min.js`, `tesseract-core-simd-lstm.wasm.js`, `eng.traineddata.gz`, `SOURCES.md`) | `recognizeDvrStrip(blob) -> {ok,text,confidence 0..1} \| {ok:false,message}`; `disposeDvrRecognizer()` | `tesseract.js` 7.0.0 (lazy import) | 10 + 6 | `ocr-time-capture/services/ocr-service.ts:65` `TextRecognition.recognize(imageUri)` (ML Kit, native only); only `.text`, `.blocks.length` and block `.confidence` are used. Everything after (cleaning pipeline, timestamp parser) is shared JS | **adapter, small** | `text-recognizer.web.ts`: `fetch(uri)` -> Blob -> `recognizeDvrStrip` -> `{text, blocks:[{text, confidence, lines:[]}]}`. Camera (`expo-camera` `takePictureAsync`) and crop (`expo-image-manipulator` has a web module) already exist on web. `ocr-crop.ts` is **not** needed: the phone crops with the same constants in `ocr-capture-service.ts`. Move `public/ocr/` to the phone web `public/` and set the paths from `baseUrl`. No-SIMD browsers fail into an error, not a sample (drop `OCR_SAMPLE_FRAMES`) |
| **pdf.js text extraction** | `ui/import/pdf-extract.ts` (52) | `extractPdfText(file: File) -> string`; throws `PdfExtractionError`; 50-char scanned threshold | `pdfjs-dist` ^6.1.200 | 51-line test file | `pdf-extraction-service.ts` `extractPdfText(fileUri) -> {rawText, method:'native', pageCount, extractionDurationMs}`; rejects anything not `file://`/`content://` (`:49`); native-only `expo-pdf-text-extract` | **adapter** | `pdf-extraction-service.web.ts`: `fetch(blobUri)` -> `arrayBuffer`; return `pageCount: doc.numPages`; map errors to the phone's `PdfExtractionError` codes (`PDF_OCR_UNAVAILABLE` for scanned). Threshold already identical (50). **Change the worker load:** the demo uses `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`, a webpack/Turbopack idiom; under Metro serve the worker from `public/` instead (same approach as OCR). `expo-document-picker` has a web module, so the picker side exists |
| **Proxy client** | `ui/import/extract-client.ts` (35) | `requestExtraction(text) -> {ok,rawText}\|{ok:false,notConfigured}` | `fetch` | 28-line test file | `AiExtractionProvider.extract` | **adapter** (section 3) | becomes the body of `WebProxyProvider.extract`; must throw typed errors, not return a union |
| **Forward/reverse geocode, autocomplete** | `ui/import/geocode.ts` (46), `ui/inputs/reverse-geocode.ts` (48), `AddressAutocomplete.tsx` (206) | `@mapbox/search-js-core` `GeocodingCore`, `SearchBoxCore` + `SearchSession` | `@mapbox/search-js-core` | 48-line + 7 tests | `location/services/mapbox-service.ts`: `suggest`, `retrieve`, `forwardGeocode`, `reverseGeocode` | **n/a** | The phone's service is plain `fetch` to `api.mapbox.com` with a token from `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`constants/index.ts:12-18`). It should run on web unchanged. Nothing to lift. The token is inlined at export time and must be URL-restricted to the marketing origin (the demo used `NEXT_PUBLIC_MAPBOX_TOKEN`, a different variable) |
| **Map canvas** | `ui/screens/map/MapCanvas.tsx` (671), `mapCluster.ts` (210, supercluster in a worker), `markerElements.ts`, `mapProximity.ts` (turf) | props `markers[]`, `cameras[]`, `proximityRing`, `onMarkerPress`, `onLongPress`; handle `flyTo`, `getCenter` | `mapbox-gl` 3.25, `supercluster`, `@turf/*` | 321 (whole map subtree) | `map-view/components/CaseMapView.tsx` over `@rnmapbox/maps`: `MapView`, `Camera`, `ShapeSource` (clustered), `CircleLayer`, `FillLayer`, `LineLayer`, `SymbolLayer`, `MarkerView`; props `collection: FeatureCollection`, `proximityRing`, `cameraBounds`, `initialCenter`; ref `flyTo(coords, opts)` | **rewrite** (reusing MapCanvas logic) | `@rnmapbox/maps` 10.2.10's `src/web` exports only `MapView`, `Camera`, `MarkerView`, `Logger` ("work in progress, only basic map components works", `install.md`), so `ShapeSource` and every layer are missing. A `CaseMapView.web.tsx` on `mapbox-gl` taking the **same props** is natural, since the phone already speaks GeoJSON (mapbox-gl clusters GeoJSON natively; supercluster likely unnecessary). Reusable from the demo: long-press, marker/camera elements, proximity polygon layers, fit-bounds and cover/failsafe logic |
| **Clipboard** | inline in `DemoExperience`, `NotesScreen`, `ImportModal`, `PickerStage`, `CoordinateDisplay` | `navigator.clipboard.*` | none | n/a | `expo-clipboard` (`CoordinateDisplay`, `copy-coordinates`, `ImportPickerModal`, `TokenStep`) | **n/a** | `expo-clipboard` 57 ships `ExpoClipboard.web.js` -> `web/ClipboardModule` over `navigator.clipboard`, with a `ClipboardUnavailableException` when absent. Nothing to lift |
| **Print-to-PDF preview** | `ui/chrome/PdfPreview.tsx` (sandboxed `<iframe srcDoc>` + `contentWindow.print()` + `beforeprint` success detection); HTML generators `engine/logic/pdf/*` | `PdfPreview({title, html, onClose})` | none | 27 | `documentation/services/document-generator.ts` `generateDocument(html) -> Print.printToFileAsync -> {uri,...}`; `CaseNotesPreviewModal({visible, htmlContent, onClose, onShare, onDismiss?})` and `TimeOffsetPreviewModal` use `react-native-webview` (no web target) | **adapter** (modals) + **gap** (file generation) | `expo-print` web `printToFileAsync()` just calls `window.print()` and returns `undefined` (`ExponentPrint.web.js`), so `result.uri` throws and `generateDocument` surfaces `PdfGenerationError`. Web needs `CaseNotesPreviewModal.web.tsx` / `TimeOffsetPreviewModal.web.tsx` with the **same props**, an iframe `srcDoc`, and `onShare` -> print; reuse PdfPreview's print/`beforeprint` honesty logic. The demo's `engine/logic/pdf/*` generators are redundant (the phone has the real templates). **Per-location PDFs for ZIP export cannot be produced** without a client-side HTML-to-PDF engine the demo never had |
| **File download** | `ui/inputs/download-file.ts` (153), `object-urls.ts` (110) | `saveTextFile({content,filename,mimeType}) -> {requested:true}\|{requested:false,reason}` ("requested", not "ok": a click cannot confirm a save) | none | 7 + 14 | `Sharing.shareAsync(path,{mimeType,dialogTitle,UTI})` in `pdf-export-service`, `geojson-service`, `case-map-export-service`, `document-share` | **adapter** | `expo-sharing` web does `navigator.share({url})` and reports unavailable without `navigator.share` (e.g. Firefox desktop); a blob/IndexedDB URL is not shareable as a link anyway. Add a web `Sharing` shim: `isAvailableAsync() -> true`, `shareAsync(uri,opts)` resolves the URI (SW-served file URL or file store) and does anchor-download (or `navigator.share({files})`), keeping the "requested" honesty. The phone's own case-map template and service are reused as is, so the demo's 85 KB ported `template.ts` is dead weight. `object-urls.ts` is not needed once files live behind SW URLs |
| **NTP / Face ID / biometrics / call / email / cloud / encrypted ZIP** | out of scope for R3 | | | | | | stay simulated and labelled |

Totals for the reusable I/O set (GPS, media, audio, OCR, pdf.js, download, object-urls, proxy client, geocode):
about 2,600 LOC and roughly 200 tests in the `ui/inputs` and `ui/import` files, plus `engine/logic/media` (162 tests) and `engine/logic/gps.ts` (338 LOC, 31 tests).

## 5. Demo-only features

### StoryRail + explore checklist
- `StoryRail.tsx` (114 LOC) is purely presentational. Inputs: `narration` (copy chosen in `DemoExperience.tsx:658-668`
  from, in order: boot gate, open `modal` id, active launchable `view`, tab-only `view`, `currentChapter`),
  `explore[]` from `selectExploreStatus(state)`, `onJump(view)`, `onBackToSite`.
- `selectExploreStatus` (`engine/store/selectors.ts:30-54`) reads exactly: `state.modal`, `state.view`,
  `state.currentChapter`, `state.visited{}`, plus form-customization visibility (`profile`, `formOverrides`) to drop rows for hidden
  wizard steps. `engine/content/explore.ts` is a 20-row registry (`covers[]` view/modal ids -> `jumpTo` view);
  `narration.ts` (396 LOC) is copy keyed by chapter/modal/tab ids. Rail click calls `store.setView(v)` and lifts the boot gate.
- **It does not need to live in the app.** Its inputs are four facts the app can emit: *current route*, *open
  modal id*, *visited set* (the host can accumulate it), *which steps are visible*. Its one output is
  "navigate to X".

### Could it run outside the iframe from posted messages? **Yes, with a small bridge in the phone repo**
- **Route level needs no app change when same-origin:** the host can read `iframe.contentWindow.location.pathname`
  (Expo Router uses the History API; `pushState` fires no event, so poll about every 250 ms or have the app post).
- **Modal level needs explicit emits.** In the phone, New Case, Add Location, Import, Settings and Media Library
  are components, not routes (`app/` has only `(tabs)` and `(form)`), so the rail's "Create a Case / Add a
  Location / Import Location / Settings / Media Library" rows cannot be detected from the URL. Options: ~5
  `useEffect(() => emit('modal', id), [visible])` calls, or a `MutationObserver` on the same-origin iframe DOM
  (fragile). Without them the rail degrades to screen-level only.
- **Rail -> app navigation** needs a message receiver (`router.navigate`), because setting `iframe.src` reloads
  the app and replays the boot sequence.
- Shape: a web-only `src/web/host-bridge.web.ts(x)` (~50 lines) in the phone repo: `postMessage({type:'dvren:route'|'dvren:modal'|'dvren:steps', ...})` out, `{type:'dvren:navigate', to}` in, validated by
  `event.origin === location.origin`. It is demo-aware code on phone `main`; no-op outside an iframe.
- The `visited` set, exit dialog ("before you go" for unvisited rows) and copy stay in marketing.

### Error / "start fresh"
- `app/demo/error.tsx`: route-segment net with "Try again" (`reset()`) and "Start fresh", which dynamically
  imports `clearDemoSnapshot` (removes `sessionStorage['dvr-demo-state-v7']`) then `reset()`.
  `DemoErrorBoundary` is the in-frame net. Both exist because bad **session state** could crash-loop the demo.
- Real app equivalent: the phone has its own root `ErrorBoundary`. "Start fresh" becomes a **host-level
  "Reset demo data"**: blank the iframe (`src='about:blank'`, so connections close), then delete the
  IndexedDB databases, OPFS directory, Cache Storage, and the app's `localStorage` keys (AsyncStorage on web
  writes **origin-wide `localStorage` keys**, so namespace them), then reload. Same-origin hosting makes this
  doable from the host page; a subdomain would need a message and a cooperating app.

## 6. What retiring the hand-built demo removes

| Area | Inventory |
|---|---|
| `features/demo/` | 527 files; **247 non-test TS/TSX (~49,960 LOC)**, **278 test files (~60,880 LOC, ~3,884 declared tests: engine 1,243, ui 2,641)**; 6.1 MB. Includes `CLAUDE.md`, `ui/`, `engine/` (store, logic, content, types, 85 KB case-map template) |
| `app/demo/` | `page.tsx`, `error.tsx`, 2 test files (9 tests) incl. the `boot` activation guard. The route URL itself is **kept**, re-pointed at the iframe host |
| Tests outside demo to change | `app/(default)/__tests__/chrome-scope.test.tsx` (comments/intent tied to chrome-free `/demo`), `components/marketing/__tests__/phone-frame.test.tsx` (asserts no import from `@/features/demo`; trivial once it's gone), `hero.test`/`footer.test`/`site-config.test` keep `/demo` links. Non-demo total today: 30 files, ~195 tests |
| `app/api/extract/` | **Stays.** Move the prompt out of `features/demo/engine/logic/import` first. Its 20 tests (route 12, guards 8) change with the new contract |
| Dependencies that become unused in marketing (verified by grep of `app components lib __tests__ tools`) | `mapbox-gl`, `motion`, `pdfjs-dist`, `supercluster`, `tesseract.js`, `zustand`, `@mapbox/search-js-core`, `@turf/circle`, `@turf/distance`, `@turf/helpers`; dev: `@tesseract.js-data/eng`, `@types/supercluster`, `@types/geojson` (type-only use only in demo). **Stay:** `zod` (`lib/beta/schema.ts`), `clsx`, `tailwind-merge`. `@headlessui/react` is **already unused today** (0 imports anywhere) |
| Config | `vitest.config.mts` coverage `include` (`features/demo/engine/**`; thresholds then guard only `lib/**`); `vitest.setup.ts` (conflicting-style tripwire and jsdom shims exist for the demo; its error text cites demo docs); `tsconfig.previews.json` and the second half of `pnpm typecheck`; `next.config.js` `eslint.dirs: ['features']` |
| Design-sync | `.design-sync/config.json` (srcDir `features/demo/ui`, 37 demo previews of the 58 in `.design-sync/previews/`), `ds-entry.ts`, `gen-entry.mjs`, `check-rn-parity.mjs`, `conventions.md`, `NOTES.md`; the 21 marketing previews and `config.marketing.json` stay |
| Tools | `tools/port-case-map-template.mjs` (writes into `features/demo/...`); `tools/rail-copy-editor.html` references the narration copy (7 matches; not examined further) |
| CSS/env | `app/css/style.css` `--color-demo-*` tokens (`:41-48`, error page only); `.env.example` `NEXT_PUBLIC_MAPBOX_TOKEN` (moves to the phone web build as `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`); `OLLAMA_*`, `ALLOWED_ORIGINS`, `RATE_LIMIT_*` stay |
| Assets | `public/ocr/` 6.7 MB -> phone repo `public/` (re-point paths to the `baseUrl`); `public/demo-media/` 112 KB (samples) -> delete (SAMPLE fallbacks not carried); `public/demos/home` is marketing, stays |
| Docs / agent config | `docs/features/interactive-demo`, `docs/features/demo-explorer`, 11 `docs/planning/demo-*` + `field-parity` + `features-migration` folders, `docs/code-reviews/` (4.3 MB, mostly demo PR reviews): archive rather than delete (owner call). `.claude/skills/demo-code-review`, `.claude/workflows/demo-phase-review.js`, `web-reviewer` agent and the `dt-handoff-staleness` / `dt-session-continuity` hooks reference the demo parity handoff paths |
| Marketing `CLAUDE.md` sections to rewrite | "Project Context" (second bullet, the demo half and the never-import rule); "ACTIVE INITIATIVE: Demo-Phone UI Parity v2" (entire section); Architecture/Routing (`app/demo/` line); Conventions ("No marketing file may import from `@/features/demo`", and the demo cross-references); "Review workflow" (`/demo-code-review`, the parity gate sentence, deferral ledger); delete `features/demo/CLAUDE.md` |
| Phone `CLAUDE.md` | the "ACTIVE CROSS-REPO INITIATIVE: Demo-Phone Parity" pointer section (read-only repo for that effort) and the new web-build/stand-in conventions |
| Not removed | `components/app-demo.tsx`, `components/marketing/*` (they are the video-loop frames), `lib/**`, beta form, `app/(default)/**` |

## 7. Risks and unknowns
1. **Production hosting is unverified** (no `vercel.json`, no CI, placeholder `siteConfig.url`). Options A/B were costed against Vercel's documented limits only.
2. **Cross-origin isolation is the biggest hosting coupling and is conditional on R2.** Verified: `expo-sqlite` web constructs `SharedArrayBuffer`, so with it the iframe **and its host page** must be isolated. Not verified in a browser: that a same-origin iframe inside an isolated `/demo` reports `crossOriginIsolated === true`; Safari behaviour; whether `COEP: credentialless` is usable (MDN fetch lacked the support table, so use `require-corp`). If R2 picks a storage engine with no SAB need, this whole risk disappears.
3. **COEP `require-corp` on the app:** Mapbox tiles/sprites/glyphs and any third-party image must be CORS-mode or send CORP. mapbox-gl and the phone's `fetch` calls use CORS, but I did not verify every request type.
4. **Phone web prerequisites are absent:** phone `package.json` has neither `react-native-web` nor `react-dom` (`expo-camera`'s web build imports `react-native-web/dist/exports/createElement`). Also, the shared context describes phone `.design-sync/NOTES.md` as recording react-native-web compile breakages (safe-area, keyboard, worklets, input stacking, frozen-clock Animated). **That file on `main` says the opposite**: a react-native-web port was "considered and rejected (2026-07-16)" and none of those items appear. R1 should confirm where that evidence actually lives.
5. **GPS stale-fix defect** (`maximumAge: Infinity` default) is by code reading only.
6. **Audio:** `@siteed/expo-audio-studio` web support is claimed and the files exist, never exercised. Container formats from `MediaRecorder` (webm vs mp4) versus the phone's media-type validation and export are unchecked.
7. **Export fidelity on web:** per-location PDFs inside ZIP exports have no in-browser generator (the demo never had one); `Sharing` shim only covers files the app can already produce.
8. **Prompt drift** is already real (1,919 vs 3,937 chars) and was invisible; the hash allow-list makes it visible but means a phone prompt change needs a coordinated marketing deploy (or an env-supplied hash list).
9. **Service worker lifecycle:** a SW that serves stored-file URLs must not cache the app shell, or a redeploy strands visitors on a stale `index.html`. Not designed here.
10. **Safari storage eviction** (7-day cap on script-writable storage without interaction) conflicts with "lasts until the visitor clears it"; R2's `navigator.storage.persist()` territory. Mentioned, not researched.
11. RN web bundle size, cold-load time and whether Metro handles the `new URL(..., import.meta.url)` worker idiom are unknown (no build possible).
12. Test counts are declaration counts, not a run (no deps installed).

## 8. Recommendations (confidence)
1. **Host the Expo web export on the marketing origin under `/app/` (option A), as a pinned artifact fetched at marketing build time, not committed.** Phone: `experiments.baseUrl:'/app'`, `web.output:'single'`. Marketing `next.config.js`: `rewrites` (`/app`, `/app/` -> `/app/index.html`; `fallback` `/app/:path*` -> `/app/index.html`) and `headers()` (COOP/COEP on `/app/:path*` **and `/demo`**; immutable cache on `/app/_expo/static/:path*`; no-cache on `index.html` and the SW). **Confidence: 70%**; the exact headers depend on R2's engine, and the `crossOriginIsolated`-in-iframe check must be the first spike. Fallback to B if the phone team needs independent deploys.
2. **Keep `/demo` as the URL; replace its body with a client island: frame + `<iframe src="/app/">` + rail.** Hero and feature rows stay on video loops; narrow viewports link to `/app/` directly. **Confidence: 85%** on placement, 60% on the narrow-viewport behaviour.
3. **AI proxy: add `providers/index.web.ts` with a `WebProxyProvider`; change the route to accept `{systemPrompt, userPrompt, temperature?, maxOutputTokens?}` gated by a system-prompt hash allow-list; move prompt/constants out of `features/demo`; 503 -> `AI_UNAVAILABLE`; no sample fallback.** Same-origin needs no origin-guard change. **Confidence: 75%.**
4. **Reuse from the demo (in order of value):** map logic (rewrite `CaseMapView.web.tsx`), camera/recorder I/O (rewrite `VisionCameraScreen.web.tsx`), GPS loop (adapter), OCR worker + `public/ocr` (small adapter), pdf.js (adapter, worker from `public/`), print-preview iframe (two `.web.tsx` modals), download -> `Sharing` shim. **Do not lift:** geocode/autocomplete, clipboard (phone seams already work on web), `object-urls`, `engine/logic/*` duplicates, SAMPLE media/OCR frames, case-map template. Try `@siteed/expo-audio-studio` web before touching audio. **Confidence: 75%**, per-row notes in section 4.
5. **Rail/checklist stays in marketing, fed by a ~50-line web-only `postMessage` bridge in the phone repo** (route-level first, modal emits for the 5 modal rows, `navigate` message back). **Confidence: 70%.** "Reset demo data" becomes a host-level control (blank iframe, then wipe IndexedDB/OPFS/Cache Storage/namespaced `localStorage`, reload). **Confidence: 75%.**
6. **Retire `features/demo/` only after the real app covers its surfaces;** retirement is a clean cut (`features/demo` has no inbound imports except `app/demo/*`, `app/api/extract/route.ts`, `.design-sync`, `tools/port-case-map-template.mjs`). Do the prompt move and the `/api/extract` contract change **before** deleting. Archive `docs/` rather than delete. **Confidence: 85%** on the cut being clean. Inbound imports and the unused-dependency list were found by grep over `app components lib __tests__ tools .design-sync .claude vitest* tsconfig*` (comments excluded); not compiled, since `tsc` could not run.
