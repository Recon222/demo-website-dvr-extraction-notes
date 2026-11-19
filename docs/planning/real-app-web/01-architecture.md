# The real app in the browser: architecture

> Document 1 of 3, 2026-11-19. Status: design, nothing built. `02-sliced-plan.md` cuts this into slices;
> `03-test-spec.md` proves them. IDs are stable once building starts; new ones are appended, never renumbered.

**Authority, highest first:** owner answers (`00-high-level-plan.md` §5, and later rulings recorded in the
orchestrator's `state.md`) → current source and tests of both repos → this document → `research/R1-R3`.

| Prefix | Source | Checked at |
|---|---|---|
| `PH:` | phone repo `DVR-Extraction-Notes-ReactNative` | `main` @ `d58256f35` (2026-11-19) |
| `MK:` | marketing repo `demo-website-dvr-extraction-notes` | `master` @ `80fb827b` |
| `R1:` `R2:` `R3:` | `research/R1-phone-web-boot-and-seams.md`, `R2-phone-storage-for-web.md`, `R3-marketing-site-and-demo-io.md` | 2026-11-19 |
| `DS:` | `PH:.design-sync/NOTES.md` (components compiled with react-native-web; merged in PR #190) | `d58256f35` |

Everything in §2 is **existing behaviour** and carries a citation. Everything else is **design** unless it
carries one.

## 0. Conventions: IDs and cross-references

| Thing | Form | Defined in | Cited from |
|---|---|---|---|
| Decision | `AD-n` | §1 | slice cards "Implements", briefs |
| Ground truth | `GT-n` | §2 | design text |
| Contract | `C-n` | §6 | cards, briefs, proposals |
| Change to existing phone code | `CS-x` | §5 | cards |
| Risk / owner question | `RK-n` / `Q-n` (Q-ids are the ones in `00` §5) | §7 / `00` §5 | |
| Slice | `<LANE><n>` (`SP0`, `FD1`, `ST2` …) as a `####` heading in `02` | `02` §3 | registry, branches `slice/<ID>`, evidence dir |
| Test | `<LANE><3 digits>` in a block per slice | `03` §3 | cards ("Tests"), briefs. **Never in a test title**: both repos forbid process IDs in test names, so the registry matches on `Location` + `Title` |
| Section | `architecture §4.3` | headings | cards, briefs |

## 1. Decisions

### 1.1 Shape and build

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|
| AD-1 | Build the real phone app with `npx expo export -p web`, `web.output: 'single'`, `experiments.baseUrl: '/app'` | Proven to build, boot and persist in a same-origin iframe (GT-1, GT-2) | Porting more of the app into Next.js (the status quo: a second app to maintain) | `00` §1 |
| AD-2 | Two seam mechanisms. **Repo files:** a `.web.ts(x)` sibling. **Packages:** a web-only alias in a new `PH:metro.config.js` (`resolver.resolveRequest`, `platform === 'web'`) pointing into `PH:web/shims/`. The alias table is **derived from shim file names** (C-1), so a slice adds a shim by adding a file and never edits a shared table. RNW internals are matched on the **resolved file path** through a short explicit list in the same config | Platform extensions do not apply inside `node_modules`; aliasing leaves the 17 / 6 / 4 call sites untouched (GT-4) | Wrapping each package behind an app module and editing every import (churn on native code) | `00` §3 |
| AD-3 | Web-only code lives in two places: `PH:web/shims/` (package stand-ins) and `PH:src/platform/web/` (shared helpers: file store, preflight, unavailable error, labels, host bridge). Only `*.web.ts(x)` files and `web/shims/*` may import `@/platform/web`. The phone build never resolves either | Keeps every stand-in reviewable in one place and out of the native bundle | Scattering web helpers across features | `00` §8 |
| AD-4 | The web export runs with secret env vars empty (`TIME_API_KEY`, `SUPABASE_*`); only `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (URL-restricted public token) is set. `@sentry/react-native` is aliased to a no-op on web | The whole `app.config.js` and the real Sentry DSN are inlined in the web bundle (GT-6) | Shipping production Sentry to visitors | RK-3 |
| AD-5 | A CI job on the phone repo runs `expo export -p web` on every PR and fails on a broken build or a secret found in the output | A phone change can silently break the web build | Discovering breakage at demo deploy time | `00` §8 |
| AD-6 | Add `react-dom`, `react-native-web`, `@expo/metro-runtime` (SDK-matched, GT-3) as dependencies; `mapbox-gl` only if the map slice uses it | Required by Expo web | | |

### 1.2 Storage

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|
| AD-7 | Case data uses `expo-sqlite`'s own web build (wa-sqlite 3.50.3 on OPFS), async API only. `metro.config.js` adds `wasm` to `assetExts` | The app uses only seven async calls; SQLite error text survives, so `wrapDatabaseError` works unchanged; the async path needs no `SharedArrayBuffer`, so **no COOP/COEP headers** (GT-7, GT-8, GT-9) | An IndexedDB snapshot engine (sql.js); expo-sqlite in memory (both lose persistence or add a wrapper for no gain) | `00` §1 |
| AD-8 | Database open becomes a seam: `database-open.ts` / `database-open.web.ts` (CS-a). The web version skips `PRAGMA key` and the SQLCipher proof, runs a preflight (secure context, OPFS, Worker, a Web Lock so only one tab holds the database) and throws a typed `WebStorageUnavailableError` that `InitFailureScreen` renders honestly | The SQLCipher guard refuses to boot on web (GT-5); a second tab cannot open the OPFS database (GT-10) | Disabling the guard with `Platform.OS` inside `database.ts` (mixes web logic into native code) | Q3, Q5 |
| AD-9 | Files live in IndexedDB as chunked `ArrayBuffer`s behind a web `expo-file-system/legacy` (C-2). URIs are origin-relative: `documentDirectory = '/app/_files/doc/'`, `cacheDirectory = '/app/_files/cache/'` | The app stores `media_files.path` and hands it straight to `<img>`/`<video>`/`<audio>` (GT-11); Safari has a history of IndexedDB Blob faults, chunks avoid them and let range reads load only what is asked | `file://` URIs (no service worker can serve them); Blobs in IndexedDB | `00` §3 |
| AD-10 | A service worker at `/app/sw.js` (scope `/app/`) serves `/app/_files/**` from IndexedDB with correct `206` range responses; `skipWaiting` + `clients.claim`; it never caches the app shell | Lets every renderer play stored media unchanged; Safari requires correct ranges (GT-12) | `blob:` URLs resolved per component (kept only as the fallback if SP0 fails in Safari) | |
| AD-11 | `expo-secure-store` on web is a stand-in that keeps values **in memory for the session only** and reports `isAvailableAsync() === false`; callers that need a persisted secret show the unavailable label | Its web build is `{}` and every call throws (GT-13); storing a password in localStorage and calling it secure would be a fake success | localStorage-backed "secure" store | Q3 |
| AD-12 | `navigator.storage.persist()` is not relied on. Settings shows storage use (`estimate()`); a "Reset demo data" control on the host page clears the app's storage; the Safari 7-day rule is stated on screen | `persist()` is silently denied for most visitors; Safari deletes script-written storage after about 7 days of use without a visit (GT-14) | | Q4 |

### 1.3 Capabilities and honesty

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|
| AD-13 | Every web stand-in is one of three kinds: **real** (a browser API does the job), **simulated** (labelled on screen as simulated), **unavailable** (throws `WebUnavailableError(capability)`, which the UI shows as "not available in the browser"). A stand-in never resolves successfully without doing the work | Standing rule "never a fake success"; R1's main hazard is silent no-ops (GT-15) | Silent no-ops; sample data on failure (the old demo's SAMPLE fallbacks are not carried over) | `00` §3.4 |
| AD-14 | `Alert.alert` gets a real dialog on web: RNW's `Alert` module is aliased to a promise-driven dialog rendered in a host component mounted once in the root layout | 96 call sites, all silent no-ops today; it blocks Create Case (GT-15) | Auto-confirming; `window.confirm` (wrong look, no three-button support) | |
| AD-15 | PDFs (Q1 default): previews render the report HTML in a sandboxed `<iframe srcdoc>` (web stand-in for `react-native-webview`); "Save as PDF" opens the browser's print dialog for that iframe only; `expo-print.printToFileAsync` on web writes the **HTML** to the file store and returns its URI with `mimeType: 'text/html'`, and every place that labels the output says "printable report" on web | The browser cannot produce a PDF file without a heavy library; the stock web `printToFileAsync` prints the host page and returns `undefined` (GT-16) | A client-side HTML-to-PDF library (weight, fidelity); dropping reports from exports | Q1 |
| AD-16 | ZIP exports (Q2 default) are real downloads built with `@zip.js/zip.js` from the file store, **unencrypted**, labelled; `zipWithPassword` throws `WebUnavailableError('encrypted-zip')` and the export flow offers the unencrypted ZIP instead | No native ZIP on web (GT-17); AES via zip.js is unproven here | Simulating the whole export (the real export logic exists and works) | Q2 |
| AD-17 | `expo-sharing.shareAsync(uri)` on web triggers a download of the stored file (or `navigator.share({files})` when `canShare` allows); `isAvailableAsync()` returns `true`; the outcome is reported as "download requested", never "shared" | The stock web build shares URLs only and is unavailable on desktop Firefox/Chrome (GT-18) | | |
| AD-18 | Precise time sync on web is **simulated and labelled**: `unified-sync.web.ts` returns a sync result in the phone's shape with the offset from the browser clock and a visible "simulated: browsers can't reach NTP servers" status | No UDP in a browser (GT-19) | Calling the HTTP fallback with the time-API key (the key would be public) | |
| AD-19 | Face ID: no lock on web (the app already skips it without hardware, GT-20). Cloud sync: `SyncBootstrap` and the sync triggers are no-ops on web and the Cloud Sync settings show "phone app only". Phone calls/email from the map keep `tel:`/`mailto:` links. `Linking.openSettings()` affordances become instruction text | Honest, minimal | A simulated scan (offered under Q7) | Q7 |
| AD-20 | The 8-second splash video is replaced on web by a short static splash (`AuthenticatedSplashScreen.web.tsx`) | It replays on every load of the iframe (GT-21) | | Q6 |

### 1.4 Hosting and the marketing site

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|
| AD-21 | The marketing site serves the web build from `public/app/`, fetched at build time from a pinned phone release artifact (not committed); `next.config.js` adds rewrites (`/app`, `/app/` → `/app/index.html`; fallback `/app/:path*` → `/app/index.html`) and headers (immutable cache on `/app/_expo/static/**`; `no-cache` on `index.html` and `sw.js`) | Same origin: no CORS, the AI route's origin check passes, the host page can reset storage, iframe permissions default to `self` (GT-22, GT-23) | A proxied rewrite to a second deployment; a subdomain (cross-origin problems) | Q9 |
| AD-22 | `/demo` keeps its URL and becomes: the marketing phone frame + `<iframe src="/app/">` + the narration rail. Below a narrow width it opens `/app/` full screen. The hero and feature rows keep their video loops | Inbound links keep working; a live app in the hero would sit on the page's critical load path (GT-24) | | Q8, Q10 |
| AD-23 | App ↔ host messaging is a web-only bridge (`src/platform/web/host-bridge.ts`), `postMessage` with `event.origin === location.origin`: app emits `dvren:route`, `dvren:modal`, `dvren:steps`; host sends `dvren:navigate` | The rail needs the current screen and open modal; the phone's modals are not routes (GT-25) | Polling the iframe's DOM | Q10 |
| AD-24 | The AI import on web uses `WebProxyProvider` (`providers/index.web.ts`) posting the phone's own `systemPrompt`/`userPrompt` to `/api/extract`; the route accepts that shape, only when `sha256(systemPrompt)` is on an allow-list, caps `maxOutputTokens`, maps "not configured" to `AI_UNAVAILABLE`. No sample fallback | The route currently takes `documentText` and its own drifted prompt (1,919 vs 3,937 characters) (GT-26) | Calling the route as is | |
| AD-25 | The hand-built demo (`MK:features/demo/`) is deleted only after Phase 3's end-to-end runs pass; docs are archived, not deleted. The extraction prompt moves out of `features/demo/` first | Clean cut: nothing outside `app/demo`, the AI route, `.design-sync` and one tool imports it (GT-27) | Deleting before parity is shown | `00` §4 |

### 1.5 Quality

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|
| AD-26 | Web stand-ins are unit-tested in a second Jest project using the `jest-expo/web` preset (jsdom), which runs only `*.webtest.ts(x)` files; the existing native project ignores them | The native preset resolves the native files; web files need a DOM | Testing stand-ins only end to end | |
| AD-27 | End-to-end tests run Playwright against the exported build in Chromium, WebKit and Firefox, from a `PH:e2e-web/` folder, plus a smaller marketing-side suite for `/demo` | R1 proved only Chromium; Safari is the main unknown (RK-1) | Manual checking only | |
| AD-28 | Every phone slice keeps the phone's full gate green (`npm run check:all`) and Phase 2's last review unit includes a native smoke build before merging to `main` | Web work must not regress the phone (RK-4) | | |

## 2. Ground truth

| # | Fact | Evidence |
|---|---|---|
| GT-1 | The real app exports for web (26 s cold, 3,170 modules) with `output` default `single` and `experiments.baseUrl: '/app'`; asset, worker and wasm URLs carry the prefix | R1 §1 Setup |
| GT-2 | After 6 stand-ins and 1 source patch it boots, creates a case that survives a reload (OPFS), and renders all 10 drawer routes without a crash, including inside a same-origin iframe | R1 §1 |
| GT-3 | SDK-matched web deps: `react-dom 19.2.3`, `react-native-web 0.21.4`, `@expo/metro-runtime ~57.0.18` | R1 §1 Setup |
| GT-4 | `.web.ts` siblings do not replace packages; a `resolveRequest` alias works (verified for four packages); RNW's `Alert` must be matched on the resolved file; `getModulesRunBeforeMainModule` additions are ignored on web | R1 §1 F1, §5.2 |
| GT-5 | `PH:src/features/case-management/services/database.ts:186-195` refuses to open without SQLCipher (`PRAGMA cipher_version` returns no row on wa-sqlite) | R1 B6, R2 §2 |
| GT-6 | The whole `app.config.js` (incl. `extra`) and the real Sentry DSN are inlined in the web bundle; Sentry is enabled in production builds | R1 §1 Size, §2F |
| GT-7 | The app uses only `openDatabaseAsync`, `execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withTransactionAsync`, `closeAsync` (+ `isInTransactionSync` under `__DEV__`, try/catch) | R2 §1 |
| GT-8 | On the same engine the app's DDL applies; UNIQUE/CHECK/FK/duplicate-column errors keep SQLite's text, so `wrapDatabaseError`'s regexes still match | R2 §2 (executed) |
| GT-9 | expo-sqlite web's async path uses `invokeWorkerAsync`; `SharedArrayBuffer` is built only in `invokeWorkerSync` | `PH:node_modules/expo-sqlite/web/WorkerChannel.ts:91-106`, `web/SQLiteModule.ts:51-58` |
| GT-10 | expo-sqlite web always initialises the OPFS pool VFS; without OPFS (Firefox private window) or with the files held by another tab, every call fails until reload | R2 §2 key finding |
| GT-11 | `expo-file-system/legacy` on web has no methods and `documentDirectory = null`; the app uses about 12 functions; stored paths go directly to `expo-image`, `expo-video`, `expo-audio` | R2 §3, R1 B5 |
| GT-12 | A same-origin iframe can register a service worker scoped to `/app/`; Safari needs correct `206` responses for media | R2 §4 (not run in a browser) |
| GT-13 | `expo-secure-store` web is `export default {}` | R1 B4, R2 §5 |
| GT-14 | Safari deletes script-written storage after about 7 days of Safari use without interaction; `persist()` is unreliable | R2 §6 |
| GT-15 | RNW `Alert.alert` is an empty method; 96 call sites in 30 files | R1 F1 |
| GT-16 | `expo-print` web `printToFileAsync` calls `window.print()` and returns `undefined`; `react-native-webview` has no web build (preview shows "does not support this platform") | R1 F4, R2 §5, R3 §4 |
| GT-17 | `react-native-zip-archive` has no web build | R1 §2B |
| GT-18 | `expo-sharing` web shares URLs only; unavailable without `navigator.share` | R2 §5, R3 §4 |
| GT-19 | `react-native-udp` has no web build; on web both NTP and the HTTP fallback fail and the app reports the failure | R1 F6 |
| GT-20 | `appLockEnabled` defaults to false and `hasHardware` is false on web, so no lock appears | R1 §3 |
| GT-21 | The splash plays an 8 s, 5.5 MB video on every load | R1 §1 Size, §2F |
| GT-22 | The marketing site is a server deployment (API routes, a Server Action); no `vercel.json`/CI exists; `headers()` cover `public/` files | R3 §2 |
| GT-23 | A same-origin POST from `/app/` to `/api/extract` passes `isAllowedOrigin` with no config | R3 §3 |
| GT-24 | `/demo` is linked from the hero CTA, footer and nav; hero and feature rows use `MarketingPhoneFrame` with looping videos | R3 §1 |
| GT-25 | The rail reads route, open modal, visited set and visible steps; New Case, Add Location, Import, Settings, Media Library are modals, not routes | R3 §5 |
| GT-26 | `/api/extract` takes `{documentText}`, builds its own prompt (1,919 chars vs the phone's 3,937) and imports it from `features/demo` | R3 §3 |
| GT-27 | `features/demo/` is 247 source files (~50k lines) and 278 test files (~3,900 tests); no inbound imports except `app/demo/*`, the AI route, `.design-sync`, one tool script | R3 §6 |
| GT-28 | Web layout defects: text inputs paint blank without `input, textarea { position: relative }`; `DateTimePicker` shows no calendar on web (`Platform.OS` branches); `Layout.headerPadding.web` undefined; tab labels clipped | R1 F2, F3, F7; DS |
| GT-29 | `react-native-vision-camera` has no web build; `expo-camera` web takes photos but not video; ML Kit has no web build; `@siteed/expo-audio-studio` ships a web recorder (unverified) | R1 §2C, R3 §4 |
| GT-30 | `@rnmapbox/maps` web exports only `MapView`, `Camera`, `MarkerView`; `app/_layout.tsx:111` calls `setAccessToken(...).catch` on a value that is `undefined` on web | R1 B3 |
| GT-31 | `expo-location` web defaults `maximumAge: Infinity`, so later samples of the multi-sample GPS loop can be the cached first fix | R3 §4 (code reading) |
| GT-32 | Production web JS is 9.36 MB raw / 1.80 MB brotli, plus 8.5 MB assets (splash video 5.5 MB) | R1 §1 Size |

## 3. Modules, pins, reuse

### 3.1 Modules and dependency direction (phone repo)

| Module | Kind | Holds | May depend on |
|---|---|---|---|
| `metro.config.js` | config | `wasm` asset ext; the web alias hook (C-1) | Expo's `getDefaultConfig` |
| `web/shims/<package>.ts` | package stand-ins | one file per aliased package (C-1) | `@/platform/web`, browser APIs, the real package's types |
| `src/platform/web/` | shared web helpers | file store (C-2), preflight, `WebUnavailableError` and labels (C-4), dialog host (C-5), host bridge (C-9) | browser APIs; never feature code |
| `src/**/<name>.web.ts(x)` | repo-file stand-ins | one per seam in §4 | its feature's own modules (by path), `@/platform/web` |
| `public/` (phone) | static web files | `index.html` (CSS fix, fonts), `sw.js`, `ocr/`, `pdfjs/` worker | — |
| `e2e-web/` | Playwright suite | end-to-end tests against the export | — |

Rules: native files never import `@/platform/web` or `web/shims`; a `.web.ts(x)` sibling exports exactly the
public surface of its native file (same names, same types); feature barrels are unchanged.

### 3.2 Pins

| Item | Pin | Status |
|---|---|---|
| `react-dom`, `react-native-web`, `@expo/metro-runtime` | SDK-matched via `npx expo install` (GT-3) | verified (R1) |
| `tesseract.js` + self-hosted core/language data | 7.0.0, as the demo ships (`MK:public/ocr/`) | owed: Metro bundling |
| `pdfjs-dist` | demo's `^6.1.200`; worker served from `public/pdfjs/` | owed: Metro bundling |
| `mapbox-gl` | demo's `^3.25.0` | owed |
| `@zip.js/zip.js` | 2.x current at FD0 | owed |
| `@playwright/test` | current at FD0, browsers Chromium/WebKit/Firefox | owed |

### 3.3 Code reused from the hand-built demo (copied into the phone repo, adapted)

| Source (`MK:features/demo/`) | Destination (phone) | Kind |
|---|---|---|
| `ui/inputs/capture-media.ts`, `useCaptureStream.ts`, `engine/logic/media/{permissions,capability,devices,recording}.ts` | `web/shims/react-native-vision-camera.tsx` | adapted |
| `ui/inputs/ocr-recognize.ts`, `public/ocr/*` | `web/shims/@react-native-ml-kit__text-recognition.ts`, `PH:public/ocr/` | adapted |
| `ui/import/pdf-extract.ts` | `web/shims/expo-pdf-text-extract.ts` | adapted |
| `ui/screens/map/MapCanvas.tsx`, `markerElements.ts`, `mapProximity.ts` | `CaseMapView.web.tsx` | pattern + pieces |
| `ui/chrome/PdfPreview.tsx` (sandbox, `beforeprint` honesty) | `web/shims/react-native-webview.tsx` + print helper | adapted |
| `ui/inputs/download-file.ts` | `web/shims/expo-sharing.ts` | adapted |
| `ui/inputs/capture-gps.ts` + `engine/logic/gps.ts` (`maximumAge: 0`) | `gps-service.web.ts` | adapted |

Not reused: the demo's store, engine duplicates of phone logic, SAMPLE media/OCR frames, the case-map template,
`object-urls.ts`, geocode/autocomplete (the phone's fetch-based service works on web).

## 4. Subsystems

### 4.1 Build and configuration

- `app.config.js`: `web.output: 'single'`, `experiments.baseUrl: '/app'`; nothing else in `web` changes.
- `metro.config.js` starts from `getDefaultConfig`, adds `wasm`, and installs the alias hook (C-1). The hook is a
  no-op unless `platform === 'web'`. The table is read from `web/shims/` at startup: a file named
  `<package with "/" written as "__">.ts(x)` replaces that import specifier (`expo-file-system__legacy.ts`
  replaces `expo-file-system/legacy`; `@rnmapbox__maps.tsx` replaces `@rnmapbox/maps`). The only hand-written
  entries are RNW internals matched on the resolved file (`react-native-web/dist/**/exports/Alert/index.js`).
- `public/index.html` (Expo's template override): viewport, `input, textarea { position: relative }`,
  `@font-face` for `ShareTechMono-Regular`, and the service-worker registration snippet.
- Export command (C-8): `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=<public> npx expo export -p web --output-dir dist-web`,
  run with every other secret variable unset; a post-export check greps `dist-web/` for known secret names
  and the Sentry DSN and fails if found.
- Release artifact: CI on the phone repo uploads `dist-web/` as a versioned artifact (a GitHub release asset
  `web-build-<sha>.tar.gz`); the marketing site pins the version (C-10).

### 4.2 Database

- `database-open.ts` (native) holds today's open, key and cipher proof unchanged (moved from
  `database.ts:154-199`, CS-a). `database-open.web.ts` opens the same file name, skips the key and the
  cipher proof, and runs the preflight before opening:
  1. `isSecureContext`; 2. `navigator.storage.getDirectory()` resolves; 3. `Worker` exists;
  4. `navigator.locks.request('dvren-db', {ifAvailable: true})` is granted and held for the page's life.
- A failed step throws `WebStorageUnavailableError(reason: 'insecure' | 'no-opfs' | 'other-tab' | 'no-worker')`.
  `InitFailureScreen` renders one honest message per reason (another tab: "the demo is open in another
  tab"; no OPFS: "this browser window can't save cases, try a normal window").
- `wrapDatabaseError`, executors, migrations and services are unchanged.
- On a `NoModificationAllowedError` during open, retry once after 500 ms (a reload can race the old worker's
  handles).

### 4.3 File store and service worker

Contract C-2 (web `expo-file-system/legacy`):

| Function | Behaviour |
|---|---|
| `documentDirectory`, `cacheDirectory` | `'/app/_files/doc/'`, `'/app/_files/cache/'`, available synchronously at import |
| `getInfoAsync(uri)` | `{exists, uri, isDirectory, size, modificationTime (seconds)}`; a directory is any stored key with that prefix |
| `readDirectoryAsync(dir)` | names of immediate children |
| `makeDirectoryAsync` | records the directory; `intermediates` honoured |
| `deleteAsync(uri, {idempotent})` | recursive over the prefix; missing + not idempotent rejects as native does |
| `copyAsync({from, to})`, `moveAsync` | `from` may be a stored path (file or directory), `blob:`, `data:` or same-origin `http(s)` |
| `readAsStringAsync`, `writeAsStringAsync` | UTF-8 and Base64 |
| `getFreeDiskStorageAsync()` | `quota - usage` from `navigator.storage.estimate()` |
| `uploadAsync` | throws `WebUnavailableError('cloud-sync')` |
| web extras | `getBlobAsync(uri)`, `writeBlobAsync(uri, blob)` (used by sharing and ZIP) |

Storage layout: IndexedDB database `dvren-fs` v1, stores `meta` (path → `{size, mime, mtime, chunkCount}`) and
`chunks` (`[path, index]` → `ArrayBuffer`, 1 MiB). Quota errors map to the app's existing disk-space error.
A boot sweep runs the app's temp-file cleanup (abandoned tabs leave temp files).

Service worker C-3 (`public/sw.js`, served at `/app/sw.js`): intercepts `GET /app/_files/**`; parses a single
`Range`; answers `206` with `Content-Type`, `Content-Length`, `Content-Range`, `Accept-Ranges: bytes`, `200`
without a range, `416` for a bad range, `404` when missing; never touches other URLs; `skipWaiting` +
`clients.claim`; versioned so an old worker never reads a newer layout. The app waits for
`navigator.serviceWorker.ready` before rendering stored media; without a controller it shows "stored media
can't be shown in this browser window" (no substitute).

**Fallback (only if SP0 fails in Safari):** `resolveUri(path)` returning a `blob:` URL from the store, used by the
five renderer sites (R2 §4). The decision is recorded at SP0's exit.

### 4.4 Dialogs

`web/shims/rnw-alert.ts` replaces RNW's `Alert` module (matched on the resolved file). `Alert.alert(title,
message, buttons, options)` enqueues a dialog; `src/platform/web/DialogHost.tsx` (mounted once by
`app/_layout.web.tsx` or a web-only root wrapper) renders it inside the app with the app's theme, supports up to
three buttons and the `cancel`/`destructive` styles, and calls the pressed button's `onPress`. Dialogs queue in
call order. Escape and backdrop press act as the `cancel` button if one exists.

### 4.5 Unavailable and simulated capabilities

- `WebUnavailableError(capability: WebCapability, message?)`, where `WebCapability` is a closed union
  (`'encrypted-zip' | 'cloud-sync' | 'secure-storage' | 'biometrics' | 'ntp' | 'native-pdf' | …`), lives in
  `src/platform/web/unavailable.ts` (C-4).
- `WebNotice` (C-4): one small component for the on-screen labels, two variants: `simulated` ("Simulated in
  the browser: …") and `phone-only` ("Available in the phone app"). Wording rules: plain, one sentence, says
  what the phone does instead; never implies the browser did the work.
- Existing error UI is reused where a feature already has one (for example the export flow's alerts); a
  `WebUnavailableError` reaching the global error handler is shown, never swallowed.

### 4.6 Documents

| Piece | Design |
|---|---|
| Preview | `web/shims/react-native-webview.tsx`: renders `source.html` in `<iframe srcdoc sandbox="allow-modals allow-same-origin">`; fires `onLoadStart`/`onLoadEnd`/`onError`; blocks navigation except `about:`; exposes a `print()` used by the modals' save action |
| Report files (AD-15) | `web/shims/expo-print.ts`: `printToFileAsync({html})` writes `<cacheDir>/report-<ts>.html` and returns `{uri, numberOfPages: undefined, base64: undefined}`; `printAsync({html})` prints a hidden iframe. Callers that name the output use the file's real MIME type |
| Share and download (AD-17) | `web/shims/expo-sharing.ts`: `isAvailableAsync() → true`; `shareAsync(uri, {mimeType, dialogTitle})` reads the stored file and downloads it with its file name, or uses `navigator.share({files})` when available |
| ZIP (AD-16) | `web/shims/react-native-zip-archive.ts`: `zip(sourceDir, target)` streams every stored file under `sourceDir` into a ZIP written to `target`; `zipWithPassword` throws `WebUnavailableError('encrypted-zip')`; the export flow catches it and offers the unencrypted ZIP with a `WebNotice` |
| PDF import text | `web/shims/expo-pdf-text-extract.ts` on pdf.js (worker at `/app/pdfjs/pdf.worker.min.mjs`), same 50-character scanned threshold, mapped to the phone's `PdfExtractionError` codes |
| AI extraction (AD-24) | `providers/index.web.ts` returns `WebProxyProvider`: `extract()` POSTs `{systemPrompt, userPrompt, temperature, maxOutputTokens}` to `/api/extract` with the caller's `abortSignal`; `503 NOT_CONFIGURED` → `AiProcessingError('AI_UNAVAILABLE')`; `429`/`502`/network → retryable failure; `ProviderId` gains `'web-proxy'` |
| Route (marketing) | `MK:app/api/extract/route.ts` accepts `{systemPrompt, userPrompt, temperature?, maxOutputTokens?}`; rejects a system prompt whose SHA-256 is not in `EXTRACT_PROMPT_SHA256` (env, comma-separated) with `400 PROMPT_NOT_ALLOWED`; caps `maxOutputTokens` at 2,000; keeps the body cap, origin check and rate limit; the legacy `{documentText}` shape is removed when the demo is retired |

### 4.7 Capture

| Piece | Design |
|---|---|
| Camera | `web/shims/react-native-vision-camera.tsx` exposes the subset `VisionCameraScreen` uses: `Camera` (ref: `takePhoto`, `startRecording({onRecordingFinished, onRecordingError})`, `stopRecording`), `useCameraDevice`, `useCameraFormat`, `useCameraPermission`, `useMicrophonePermission`, `useLocationPermission`, types. Built on getUserMedia, a canvas frame grab and `MediaRecorder`. `PhotoFile.path`/`VideoFile.path` are `blob:` URLs, which `vision-capture-service` copies into the file store (C-2 accepts `blob:`) |
| OCR | `web/shims/@react-native-ml-kit__text-recognition.ts`: `recognize(uri)` fetches the image, runs Tesseract (self-hosted at `/app/ocr/`), returns ML Kit's shape `{text, blocks: [{text, frame, recognizedLanguages, lines}]}` with frames from Tesseract's boxes. No SIMD → `WebUnavailableError('ocr')`, never sample text |
| Audio | `@siteed/expo-audio-studio`'s own web recorder, used as is if CA3's checks pass; the UI's "AAC" wording becomes the real container on web |

### 4.8 Location and map

- `gps-service.web.ts`: same exports as `gps-service.ts`; the multi-sample loop calls
  `navigator.geolocation.getCurrentPosition` with `maximumAge: 0`, keeps the most accurate sample, maps
  browser errors to the phone's `GpsError` codes. Never fabricates a coordinate.
- `CaseMapView.web.tsx`: same `CaseMapViewProps` and `CaseMapViewRef.flyTo` as the native file, on
  `mapbox-gl` with native GeoJSON clustering (cluster circles + counts, status-coloured pins, camera markers,
  proximity ring, long-press, fit-to-bounds). `app/_layout.tsx`'s `setAccessToken` call moves to
  `mapbox-init.ts` / `mapbox-init.web.ts` (CS-b).

### 4.9 App shell

| Piece | Design |
|---|---|
| Date picker | `DateTimePicker.tsx` treats web like iOS for the calendar sheet (CS-c) |
| Layout | `Layout.headerPadding.web`; tab bar height in a phone-sized iframe; `ShareTechMono` via `@font-face` |
| Splash | `AuthenticatedSplashScreen.web.tsx`: the static splash for 600 ms, then the existing ready path (AD-20) |
| Time sync | `unified-sync.web.ts`: simulated result + `WebNotice simulated` on the Time Offset screen and in Settings (AD-18) |
| Cloud sync | `SyncBootstrap.web.tsx` renders nothing; sync triggers are no-ops; the Cloud Sync settings section and the agency-cloud wizard entry show `WebNotice phone-only` (AD-19) |
| Secure store | `web/shims/expo-secure-store.ts` (AD-11) |
| Sentry | `web/shims/@sentry__react-native.ts` no-op (AD-4) |
| "Open settings" | where `Linking.openSettings()` is offered, web shows the browser instruction text |
| Copy that claims encryption or "never leaves the phone" | web-only wording via `WebNotice` or a `.web` copy constant (Q3) |

### 4.10 Marketing host

- `/demo` (`MK:app/demo/page.tsx`, client): marketing phone frame (status bar/island overlay, since the live app
  draws none) + `<iframe src="/app/" title="DVR Extraction Notes app">`, scaled to the viewport; the narration
  rail beside it, fed by C-9 messages; a "Reset demo data" control (blank the iframe, delete `dvren-fs`, the
  OPFS `expo-sqlite` directory, the app's `localStorage` keys and the service worker registration, reload);
  below 640 px wide, a full-screen link to `/app/` instead of the frame.
- `next.config.js`: rewrites and headers of AD-21.
- `scripts/fetch-app-build.mjs` (prebuild): downloads the pinned `web-build-<sha>.tar.gz` into `public/app/`,
  verifies its checksum; the pin lives in `app-build.json`.
- The rail's registry (`explore.ts`, `narration.ts`) moves out of `features/demo/` into `components/demo-host/`
  and is keyed by the bridge's route and modal ids.

## 5. Changes to existing phone code

Invariant: **native behaviour is unchanged.** Every change is a move behind a seam or a new `.web` sibling. It
is proven by: the phone's full gate (`npm run check:all`) green on every slice; the native seams keep their
existing tests; a native smoke build (EAS development build, launched in the iOS simulator) before the final
review unit merges.

| CS | Change | Owning slice |
|---|---|---|
| CS-a | `database.ts:154-199` moves to `database-open.ts`; `database.ts` imports `openAppDatabase()` | ST1 |
| CS-b | `app/_layout.tsx:111` `Mapbox.setAccessToken` moves to `mapbox-init.ts` | FD0 |
| CS-c | `DateTimePicker.tsx` platform branches include web in the iOS path | SH1 |
| CS-d | `providers/index.ts`: `ProviderId` gains `'web-proxy'` | DC4 |
| CS-e | A web-only root wrapper mounts `DialogHost` and the host bridge (`app/_layout.tsx` imports a component that is a no-op on native) | FD2 |
| CS-f | Copy claiming encryption at rest or "never leaves the phone" gets a web variant | SH3 |

## 6. Contract inventory

| C | Contract | Kind | Defined in | Frozen by | Consumers |
|---|---|---|---|---|---|
| C-1 | Web alias convention: shim file name ↔ import specifier; RNW resolved-file list | config | `metro.config.js` | FD0 (mechanism); slices add shim files, never edit the config (the RNW list is FD2's) | every shim slice |
| C-2 | Web `expo-file-system/legacy` surface (§4.3) | module API | `web/shims/expo-file-system__legacy.ts` | FD1 (types + throwing skeleton), ST2 (implementation) | capture, documents, storage |
| C-3 | Service-worker URL space `/app/_files/**` and its responses | HTTP | `public/sw.js` | ST2 | renderers, e2e |
| C-4 | `WebUnavailableError`, `WebCapability`, `WebNotice` | types + component | `src/platform/web/unavailable.ts`, `WebNotice.tsx` | FD1 | all lanes |
| C-5 | Dialog queue API behind `Alert.alert` | module API | `src/platform/web/dialogs.ts` | FD2 | every screen |
| C-6 | `WebStorageUnavailableError` reasons and their messages | types | `src/platform/web/preflight.ts` | FD1 | ST1, InitFailureScreen |
| C-7 | `/api/extract` request/response for the web provider | HTTP | `MK:app/api/extract/route.ts` | MK1 | DC4 |
| C-8 | Export command and env policy | script | `PH:scripts/export-web.sh` | FD0 | CI, MK3 |
| C-9 | Host-bridge messages (`dvren:route`, `dvren:modal`, `dvren:steps`, `dvren:navigate`) | `postMessage` schema | `src/platform/web/host-bridge.ts` (+ a copy of the types in `MK:components/demo-host/bridge.ts`) | FD1 | SH4, MK2 |
| C-10 | Web build artifact name, layout and checksum | release asset | `PH:.github/workflows/web-build.yml`, `MK:app-build.json` | FD0 | MK3 |

## 7. Risks

| RK | Risk | Containment |
|---|---|---|
| RK-1 | OPFS SQLite or the service worker fails in Safari/iOS | SP0 tests it before any lane; fallbacks named in §4.3 and AD-10 |
| RK-2 | A silent no-op ships | AD-13; every flow in `03` §3 has an end-to-end test asserting the visible outcome |
| RK-3 | Secrets or telemetry in the public bundle | AD-4; post-export secret grep (test FD0xx) |
| RK-4 | Web changes regress the phone | AD-28; §5 invariant; phone gate on every slice |
| RK-5 | Two tabs open the demo | AD-8 Web Lock + honest message |
| RK-6 | Persisted visitor data meets a future destructive migration | New migrations stay additive; noted in the phone `CLAUDE.md` web section (IN2) |
| RK-7 | The mount path `/app` is baked into stored file paths | Pinned in C-2; changing it is a contract change |
| RK-8 | First-load weight | Accepted; trims listed in `00` §6 |

## 8. Owner questions

All ten are in `00-high-level-plan.md` §5 with defaults. The build proceeds on the defaults. No owner question
blocks Phase 0 or Phase 1.
