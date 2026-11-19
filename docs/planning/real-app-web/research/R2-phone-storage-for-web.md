# R2: phone app storage, files and exports on the web

Scope: phone repo `DVR-Extraction-Notes-ReactNative` (Expo SDK 57, `expo-sqlite` 57.0.2, `expo-file-system` 57.0.6), read-only.
Paths below are relative to that repo unless stated. Scratch (experiments, downloaded packages):
`/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/2c02b8da-b937-4ecd-b779-c04ebb1b50da/scratchpad/research/R2/`.

## How this was verified (and what was not)

| Evidence | Detail |
|---|---|
| Executed | The wa-sqlite build shipped inside the phone's installed `node_modules/expo-sqlite/web/wa-sqlite` (copied to scratch), run under Node 22 with MemoryVFS against the app's real DDL (extracted from `createSchema`, 5 tables, 18 indexes) |
| Read only | expo-sqlite web sources (`web/*.ts`, `src/*.ts`), expo-file-system/secure-store/sharing/print/document-picker/audio/video/image web sources, `@expo/metro-config`, Metro defaults, sql.js and `@sqlite.org/sqlite-wasm` tarball contents (sizes, README, wasm strings) |
| Web docs | Expo docs, MDN, web.dev, WebKit blog posts, Mozilla/WebKit bug pages (URLs in the text) |
| NOT done | Context7 was unavailable (`Invalid API key`), so library docs came from installed sources plus WebFetch. No browser was run. No `expo export -p web` was run (the installed tree has no `react-dom`/`react-native-web`). sql.js and `@sqlite.org/sqlite-wasm` were **not executed** (the permission layer refused running downloaded package code; their error text and sizes come from source/README/`strings` only) |

## 1. SQLite surface

### API actually used (non-test code)

Only `expo-sqlite`'s async, handle-based API. One import of `expo-sqlite` per service: `database.ts:7`, `case-service.ts:7`, `location-service.ts:7` (types only plus `runAsync`/`getAllAsync` on a handle), type-only in `components/dev/DrizzleStudioDev.tsx:17`.

| API | Where | Count (non-comment) |
|---|---|---|
| `SQLite.openDatabaseAsync(DATABASE_NAME)` (no options, no directory; name `cctv_recovery.db`, `constants/index.ts:11`) | `database.ts:154` | 1 |
| `db.execAsync(sql)` (multi-statement DDL, PRAGMAs, migrations) | `database.ts` only | 38 |
| `db.withTransactionAsync(fn)` | `database.ts` (migrations 656-1205, `executeTransaction` 1384) | 12 |
| `db.getFirstAsync<T>(sql, params[])` | `database.ts` (PRAGMAs, `caseExists`, v14/v15 row counts, integrity) | 7 |
| `db.getAllAsync<T>(sql, params[])` | `database.ts:1268` `executeQuery`; `case-service.ts:316`; `location-service.ts:398` | 3 |
| `db.runAsync(sql, params[])` -> `{changes, lastInsertRowId}`; only `.changes` is read (`location-service.ts:923,978,1023`) | `database.ts:1304` `executeRun`; `case-service.ts:337,584`; `location-service.ts:454,833`; `sync-query.ts:493-506` | 10 |
| `db.closeAsync()` | `database.ts:287` | 1 |
| `db.isInTransactionSync()` | `database.ts:32`, guarded by `__DEV__` and try/catch (diagnostics) | 1 |
| Types `SQLiteDatabase`, `SQLiteBindValue`, `SQLiteRunResult` | throughout | n/a |

Not used anywhere: prepared statements (`prepareAsync`), `getEachAsync`, sync variants (except the one above), `withExclusiveTransactionAsync` (named only in comments: `form-persistence.ts:332,457`, `media-service.ts:524`), `deserialize`/`serialize`, change listeners, `openDatabaseSync`, `SQLiteProvider`/hooks. Bind values are strings, numbers and null (arrays, positional `?`). No BLOBs.

Callers go through four wrappers in `database.ts`: `executeQuery` (1259), `executeQuerySingle` (1277), `executeRun` (1295), `executeTransaction` (1337). Call-site counts per file: `media-service` 19, `sync-query` 15, `case-service` 15, `tombstone-service` 13, `location-service` 13, `persist-mapped-import` 3, `duplicate-location-service` 2.

### Open, key, migrations

1. `openDatabaseAsync` (154), then **`PRAGMA key = '<hex>'` must be the first statement** (171). Key comes from `db-encryption-key.ts` (`expo-secure-store` get, else `expo-crypto` 32 random bytes, hex, stored `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; throws on any failure).
2. **SQLCipher proof** (189-196): `PRAGMA cipher_version` must return a row, otherwise it throws `DatabaseEncryptionUnavailableError` (the app refuses to run on plain SQLite).
3. `PRAGMA foreign_keys = ON` (202), `PRAGMA user_version` (208), `migrateDatabase` (15 versions; v0 skips straight to `createSchema`), `PRAGMA user_version = 15` (225), `createSchema` (`IF NOT EXISTS`, 5 tables). Migrations use `ALTER TABLE ... ADD COLUMN`, drop-and-recreate (v5/v6, v13->v14, v14->v15 discard rows), and `PRAGMA foreign_keys = OFF/ON` outside a transaction (998, 1043).
4. Also `PRAGMA integrity_check` (1427).

SQL features used: `datetime('now')` (40x), `date()`, `substr`, `COALESCE`, `GLOB`, CHECK constraints, FK `ON DELETE CASCADE`, `ON CONFLICT ... DO UPDATE` (`tombstone-service.ts:96`), `json_set` (`location-service.ts:968`). No FTS, RTREE, `ATTACH`, windows.

### Error handling that depends on SQLite message text

`wrapDatabaseError` (`database.ts:61-127`) matches the **message string**, not codes:

| Pattern | Line | Result |
|---|---|---|
| `database is locked` / `SQLITE_BUSY` | 68 | `DatabaseLockError` (form save retries once, `form-persistence.ts:399`) |
| `/is not a database\|SQLITE_NOTADB/i` | 95 | `DatabaseEncryptionKeyError` (`InitFailureScreen` branch) |
| `/UNIQUE constraint failed:\s*(\w+)\.(\w+)/i` | 114 | `ConstraintViolationError(table, column)`; services narrow to `DuplicateCaseNumberError` etc. |
| `.toLowerCase().includes('duplicate column name')` | 834, 868, 942 | migration idempotence |

### Transactions and mutex

- One connection for the whole app. `executeTransaction` serialises through a FIFO promise tail (`transactionTail`, 1335) and wraps `withTransactionAsync` (JS BEGIN/COMMIT/ROLLBACK over `execAsync`, identical code on web: `node_modules/expo-sqlite/src/SQLiteDatabase.ts:140-147`).
- Form saves go through `formSaveMutex` (`lib/services/save-mutex.ts`, used at `form-persistence.ts:289,1066`); the save itself is one autocommit UPDATE.
- 9 `executeTransaction` call sites (media 3, case 2, location 2, sync-query 1, persist-mapped-import 1). Transaction bodies are pure DB by rule.
- Precedent for a non-native engine behind this surface: `src/features/case-management/__tests__/node-sqlite-adapter.ts` wraps `node:sqlite` in `execAsync`/`withTransactionAsync`/`getFirstAsync` for the real-engine migration tests (6 `*.sqlite.test.ts` files).

## 2. Engine options and recommendation

### What expo-sqlite's web build is (installed 57.0.2, read from source)

- `src/ExpoSQLite.web.ts` picks `web/SQLiteModule.ts`, which spawns `new Worker(new URL('./worker', window.location.href))` (`web/SQLiteModule.ts:23`). Expo's Metro transform recognises this pattern and rewrites it to a blob-URL shim that `importScripts` the worker bundle, explicitly "works around COEP/CORP issues" (`@expo/metro-config/build/transform-worker/collect-dependencies.js:81-103`).
- In the worker: wa-sqlite (SQLite **3.50.3**, plain build, no SQLCipher, no FTS), `wa-sqlite.wasm` 621,492 B (303,497 gz) + `wa-sqlite.js` 109,108 B (26,520 gz). **Persistent VFS = `AccessHandlePoolVFS` on OPFS** (`web/worker.ts:48,405,790`); `:memory:` = `MemoryVFS`.
- **SharedArrayBuffer is used only by the `*Sync` methods** (`web/WorkerChannel.ts:104-106`). All async methods use `postMessage`. The wasm exports its own (non-shared) memory (checked with `WebAssembly.Module.exports`). The app uses no sync method in production. So the headers Expo's docs recommend (COOP `same-origin` + COEP) are **not needed for this app**, and the iframe/Safari question for SAB does not arise. (Expo docs: https://docs.expo.dev/versions/latest/sdk/sqlite/ say to add them "to support SharedArrayBuffer".)
- `withExclusiveTransactionAsync` throws on web (`SQLiteDatabase.ts:179`); unused by the app.
- Metro does not know `.wasm` as an asset: `metro-config/src/defaults/defaults.js` assetExts has no `wasm`, and the phone repo has **no `metro.config.js`**. Expo docs require `config.resolver.assetExts.push('wasm')`. Installed 57.0.2 has no `configureWeb()` (newer docs mention it).

### Results of running the app's SQL on that engine (Node, MemoryVFS; scratch `wa/exp1-3.mjs`)

| Check | Result |
|---|---|
| `createSchema` DDL (CHECKs with `GLOB`/`date()`, FKs, 18 indexes) | applies cleanly |
| `PRAGMA key = '...'` | silently ignored |
| `PRAGMA cipher_version` | **zero rows** (so `initializeDatabase` would throw `DatabaseEncryptionUnavailableError` on web unless forked) |
| Duplicate `case_number` | `"Error code 19: UNIQUE constraint failed: cases.case_number"`; after the worker hop (`reject(new Error(errorObject))` in `WorkerChannel.ts` adds an `Error: ` prefix) the `wrapDatabaseError` regex still yields `["cases","case_number"]` |
| CHECK / FK / no such table | `Error code 19: CHECK constraint failed: ...`, `Error code 19: FOREIGN KEY constraint failed`, `Error code 1: no such table: nope` (same text as native) |
| `ALTER TABLE ... ADD COLUMN` duplicate | `Error code 1: duplicate column name: notes`; matches the migration guard |
| `json_set`, `ON CONFLICT DO UPDATE`, `RETURNING`, `datetime('now')`, `PRAGMA integrity_check`, FK cascade, ROLLBACK | all work |
| `sqlite3.serialize` -> new db `deserialize` | round-trips (131,072 B for the empty schema) |

The worker-hop `Error:` prefix is derived from reading `WorkerChannel.ts`, not executed in a browser.

### Options

| | (a) expo-sqlite stock web (OPFS) | (b) wa-sqlite MemoryVFS + DB bytes to IndexedDB | (c) sql.js + IndexedDB | (d) IDB-backed VFS / other |
|---|---|---|---|---|
| What | The same `expo-sqlite` import the app already has | Same wasm, `:memory:` DB, `serializeAsync()` to IDB, `deserializeDatabaseAsync()` on boot | New wrapper over sql.js 1.17.0 (SQLite 3.54.1 by `strings`), `db.export()` to IDB | wa-sqlite IDBBatchAtomicVFS (needs an Asyncify build; expo ships only the sync build), or `@sqlite.org/sqlite-wasm` 3.54.1 |
| Keeps SQLite error text for `wrapDatabaseError` | Yes (executed, see above) | Yes (same engine) | Likely: sql.js reads `sqlite3_errmsg` (`errmsg` is wrapped in the bundle), but no `Error code N:` prefix; **not executed**, regexes are unanchored so they should match | Same engine text |
| Persistence | OPFS, durable per commit (`jSync` flushes the access handle) | Whole DB re-serialised per save (131 KB empty; grows with `form_data` JSON); crash window = debounce; **last writer wins across tabs** | Same as (b) | IDB per page batch |
| Needs COOP/COEP | No (async only) | No | No | `@sqlite.org/sqlite-wasm` `opfs` VFS: **yes** (its README lines 42-44); `opfs-sahpool` no. IDBBatchAtomicVFS: no |
| Multi-tab | **One owner**: second tab's `createSyncAccessHandle` fails (wa-sqlite's own VFS table: AccessHandlePoolVFS "Multiple connections: no") | Both open, silently overwrite each other | Same | IDBBatchAtomic supports multiple connections |
| Size (raw / gzip) | wasm 621 KB / 303 KB; glue 109 KB / 27 KB (+ worker bundle, not measured) | same | wasm 688 KB / 336 KB; glue 64 KB / 22 KB | sqlite-wasm: wasm 879 KB / 407 KB; ESM 657 KB / 179 KB |
| Works with no OPFS (Firefox private window, insecure context) | **No** | **No when run through expo-sqlite** (see below) | Yes | Yes for IDB VFS |
| Browser support | OPFS: Chrome 86, Firefox 111, Safari 15.2 (web.dev); sync-handle method details per browser not verified | same as (a) when via expo-sqlite | any browser with wasm + IDB | |
| Effort to match the app's surface | **0 lines of wrapper** (it is the API). Needs: `.wasm` in Metro, a fork of the open/unlock step, preflight, typed failure | ~40-80 lines of snapshot hook, but only if the OPFS dependency is removed first | ~150-250 lines + tests (judgment): bind arrays, row objects, `changes`, `lastInsertRowId`, transactions, error normalisation, snapshot, single-writer lock | Largest; own Emscripten build or untested npm artifact (`wa-sqlite` npm last published 2024-01-05) |

**Key finding that changes (b):** in the stock worker, `maybeInitAsync` creates the OPFS `AccessHandlePoolVFS` on the first call for **any** database, including `:memory:` and `deserialize` (`web/worker.ts:776-808`). If OPFS is missing or its files are locked, `_sqlite3` is already set but `_vfs` is null, so the first call rejects and **every later call throws `Invalid VFS state`** until the page is reloaded. There is no built-in memory fallback. (b) therefore needs either a `patch-package` patch of `web/worker.ts` (make the persistent VFS optional; the repo already uses patch-package, `package.json:18`, `patches/`) or its own worker.

**Firefox private windows:** OPFS is unavailable (`navigator.storage.getDirectory()` throws `SecurityError`; Mozilla bug 1975760 reopened, https://bugzilla.mozilla.org/show_bug.cgi?id=1366318). IndexedDB and service workers in private windows were reported fixed (bugs 1639542, 1959535; versions not stated). Safari and Chrome private-mode OPFS behaviour: not found.

### Recommendation

**(a) stock `expo-sqlite` web build, async API only**, plus:
1. `metro.config.js` adding `wasm` to `assetExts` (the only Metro change this needs; harmless to native).
2. Fork **one seam**: extract `database.ts:154-199` (open, `PRAGMA key`, cipher proof) into `database-open.ts` / `database-open.web.ts`. The web version skips the key and the cipher check, runs a preflight (secure context, `navigator.storage.getDirectory`, `Worker`, Web Lock `navigator.locks.request('dvr-db', {ifAvailable: true})`) and throws a new typed error for "this browser or tab cannot hold the database" that `InitFailureScreen` renders honestly. Everything else (`wrapDatabaseError`, executors, migrations, services) stays unchanged.
3. If "works in a private window" matters, add a small patch-package patch of `web/worker.ts` so the persistent VFS is optional and open `:memory:` with a visible "not saved" banner. Do not build an IDB snapshot engine now.
4. Retry-with-backoff once on `NoModificationAllowedError` at open (reload race, see risks).

## 3. File surface and proposed contract

### API used (`expo-file-system/legacy` only; no new-API `File`/`Directory`/`Paths` in production code)

| API | Count (non-comment) | Main sites |
|---|---|---|
| `deleteAsync(uri, {idempotent})` | 32 | `filesystem.ts` (6), `ImportPickerModal` (9), `vision-capture-service` (6), temp managers, exports |
| `getInfoAsync` -> `exists`, `isDirectory`, `size`, `modificationTime` (seconds) | 22 | `filesystem.ts` (12), temp managers, `image-utils`, `ocr-service` |
| `copyAsync({from,to})` (also recursive on directories) | 7 | `filesystem.ts:148,172`, `vision-capture-service` (capture -> temp), `image-processor`, `document-share` |
| `writeAsStringAsync` | 4 | `filesystem.ts:322`, `encrypted-share.ts`, `case-map-export-service.ts` (x2) |
| `readDirectoryAsync` (names only) | 4 | `filesystem.ts:290`, temp managers, `image-processor` (listing `documentDirectory` root) |
| `readAsStringAsync` (UTF-8 and `EncodingType.Base64`) | 3 | `filesystem.ts:306`, `image-utils.ts:117`, `ImportPickerModal` |
| `makeDirectoryAsync({intermediates})` | 2 | `filesystem.ts:46`, `document-share.ts` |
| `moveAsync` | 1 | `filesystem.ts:186` |
| `documentDirectory` | 16 | `utils/paths.ts:32` (module-load constant `BASE_DIR`), temp managers, `image-processor` |
| `cacheDirectory` | 2 | `document-share.ts:69` (`shared-<ts>/`), `image-utils.ts:44` (allow-list prefix) |
| `getFreeDiskStorageAsync` | 1 | `pdf-export-service.ts:1920` (pre-export check) |
| `uploadAsync` + `FileSystemUploadType` | 1 | `media-upload-service.ts:134` (cloud sync) |

Directories: everything lives under `documentDirectory` (cases tree built by `Paths` in `utils/paths.ts`: `casesRoot`, `exportsRoot`, `tempRoot`, location sub-folders; temp files directly in the root with prefixes `media_capture_`, `audio_capture_`, `dvr_capture_`). `cacheDirectory` is used only for share staging. Names are guaranteed single-segment, NFC, without `# ? %` and separators (`isOnDiskName`), so they are valid URL path segments unescaped.

**Installed web behaviour:** `expo-file-system/legacy` on web is `ExponentFileSystemShim` with `documentDirectory = null` and no methods (`src/legacy/ExponentFileSystem.web.ts`, `ExponentFileSystemShim.ts`). `BASE_DIR` becomes `''`, then every call throws "not a function". The new API on web only logs "not supported" (`src/ExpoFileSystem.web.ts`).

### Where stored URIs reach a renderer

| Renderer | Site | Input |
|---|---|---|
| expo-image `<Image>` (web: `<img>`, `expo-image/src/web/ImageWrapper.tsx:72`) | `PhotoList.tsx:123`, `MediaPreview.tsx:102`, `MediaPreviewFullscreen.tsx:117`, `PhotoPreview.tsx:88`, `ConfirmationScreen.tsx:285` | `item.path` / `media.path` / capture URI / OCR cropped PNG path |
| expo-video `useVideoPlayer` + `VideoView` (web: `<video>`, `VideoView.web.tsx:262`) | `MediaPreview.tsx:115`, `MediaPreviewFullscreen.tsx:82`, `VideoPreview.tsx:79` | `media.path`, capture URI |
| expo-audio `useAudioPlayer` (web: `new Audio(uri)`; `preloadAsync` fetches -> blob) | `MediaPreview.tsx:141`, `AudioPreview.tsx:82` | `media.path`, capture URI |
| react-native-webview (PDF previews) | `CaseNotesPreviewModal.tsx:226`, `TimeOffsetPreviewModal.tsx:277` | `source={{html}}` string; images are inlined as base64 by `image-utils` (no file URL) |
| expo-sharing | `geojson-service.ts`, `case-map-export-service.ts`, `pdf-export-service.ts` (x3), `document-share.ts` | file path |
| PDF viewer component | none | n/a |

The DB stores absolute paths (`media_files.path`) and a relative one (`relative_path`); renderers use `.path` directly. So the stored string must itself be loadable by `<img>`, `<video>`, `<audio>`.

### Proposed browser contract

A web module replacing `expo-file-system/legacy`. Because it is a package (no `.web.ts` can sit beside it), alias it with a Metro `resolver.resolveRequest` for `platform === 'web'` (no call-site edits in the 16 importing files; the same mechanism covers `expo-secure-store`, `expo-sharing`, `expo-print`, `react-native-zip-archive`). Alternative: a `@/lib/platform/file-system` wrapper and 16 import edits.

**URI scheme.** `documentDirectory = '<base>/_files/doc/'`, `cacheDirectory = '<base>/_files/cache/'`, where `<base>` is the app's mount path (for example `/app`). Origin-relative absolute paths, not `file://`: a service worker can only intercept http(s) same-origin fetches. Exported as constants synchronously at import time (because `paths.ts:32` reads it at module load). Pin the mount path: it is persisted in `media_files.path`.

| Function | Browser behaviour |
|---|---|
| `getInfoAsync(uri)` | `{exists, uri, isDirectory, size, modificationTime (seconds)}`; directory = any key with that prefix |
| `readDirectoryAsync(dir)` | immediate child names from a key-range scan (needed for the root listing by the temp managers) |
| `makeDirectoryAsync`, `deleteAsync(uri,{idempotent})` | mkdir is a no-op or marker; delete is recursive over the prefix; `blob:` URI -> `URL.revokeObjectURL` |
| `copyAsync({from,to})`, `moveAsync` | `from` may be a stored path (also a directory, recursive), **`blob:`**, `data:` or same-origin http (capture stand-ins and `DocumentPicker` return `blob:` URIs; `vision-capture-service.ts:97` and `ImportPickerModal` depend on this) |
| `readAsStringAsync(uri,{encoding})`, `writeAsStringAsync` | UTF-8 and Base64 |
| `getFreeDiskStorageAsync()` | `navigator.storage.estimate()` quota minus usage (an estimate, not free disk) |
| `uploadAsync`, `FileSystemUploadType` | present, rejects "unavailable on web" (sync is off) |
| Web-only extras | `getBlobAsync(uri)`, `writeBlobAsync(uri, blob)` for zip, download, share |

**Storage layout.** One IndexedDB database `dvr-fs` v1: store `meta` (key = path -> `{size, mime, mtime, chunkCount}`) and store `chunks` (key `[path, index]` -> `ArrayBuffer`, 1-2 MiB each). Chunked `ArrayBuffer`, not `Blob`: WebKit has a history of IndexedDB Blob faults (private-browsing "Error preparing Blob/File", bugs 198278 and 268037; already-rendered blobs corrupted, bug 240216; reading blobs killing the networking process on iOS 18.4.x, bug 292142; https://bugs.webkit.org/show_bug.cgi?id=292142). Chunks also let the service worker read only the requested range and avoid very large single IDB records. Capture stand-ins must write bytes into `documentDirectory` (as the native flow does: capture -> `copyAsync` to `documentDirectory + 'media_capture_<ts>.<ext>'`) because the temp managers guard with `uri.startsWith(documentDirectory)` (`audio-temp-file-manager.ts:271`).

## 4. Service-worker feasibility

**Verdict: feasible; medium confidence; needs a browser spike.** It gives stable URLs so the five renderer sites above need no edits, and the preview of a just-captured file goes through the same path.

Evidence and caveats:

| Point | Finding |
|---|---|
| Delivering the file | Expo copies the root `public/` into `dist/` (https://docs.expo.dev/router/reference/static-rendering/). `public/dvr-fs-sw.js` lands at `<base>/dvr-fs-sw.js`. Expo's own PWA page registers a worker from `+html.tsx` or `public/index.html` and warns "service workers are known to cause unexpected behavior on web" (https://docs.expo.dev/guides/progressive-web-apps/). `experiments.baseUrl` exists for subpath hosting (https://docs.expo.dev/router/migrate/from-expo-webpack/); how it prefixes exported assets was not confirmed (see risks) |
| Scope | Default scope = the script's directory; a worker at `/app/dvr-fs-sw.js` controls `/app/**` only (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers). Files at `/app/_files/**` are in scope. Secure context required (localhost counts) |
| Iframe | The app page is a same-origin iframe of the marketing page. A same-origin iframe is a normal client and can register a worker whose scope covers its own URL; the marketing page is out of scope and unaffected. No COOP/COEP needed. Same-origin iframes use the top-level origin's quota (Safari's reduced 10% partition is for cross-origin frames only, https://webkit.org/blog/14403/updates-to-storage-policy/). Not exercised in a browser here |
| First load | A page is not controlled by the worker it just registered unless `clients.claim()` is called (MDN). Use `skipWaiting()` + `clients.claim()` and gate file-backed rendering on `navigator.serviceWorker.controller` or `ready`. On a first visit no stored file exists yet, so the window is small |
| Range requests | `<video>`/`<audio>` send `Range`. Safari probes with `bytes=0-1` and needs a correct `206` + `Content-Range`; a naive worker breaks Safari playback (https://dev.to/philnash/service-workers-beware-safaris-range-request-38i7, https://web.dev/sw-range-requests/). Implement: parse single range, build the slice from the needed chunks, respond `206` with `Content-Type`, `Content-Length`, `Content-Range`, `Accept-Ranges: bytes`; `416` for invalid; `404` if missing. Hand-rolled is about 25 lines; `workbox-range-requests` is the library route (https://developer.chrome.com/docs/workbox/serving-cached-audio-and-video/). Do not put these responses in Cache API (206 cannot be cached) |
| IDB from a worker | Allowed; no Cache API involved |
| Updates | `sw.js` must be served with `Cache-Control: no-cache`; keep it tiny and keep the IDB schema versioned so an old worker never reads a new layout |
| Safari | Worker registrations and caches are in the ITP 7-day deletion list (section 6); the app must re-register on every load and degrade honestly if no controller |
| No service worker (blocked, private mode, Lockdown) | Stored media cannot be displayed. Show a notice; do not substitute |

**Fallback if the spike fails (Safari/iframe/range):** a `resolveUri(path)` that returns a `blob:` URL from the IDB chunks, used in `PhotoList`, `MediaPreview`, `MediaPreviewFullscreen`, `ConfirmationScreen` (about 4 components; identity function on native). Browsers handle ranges natively for blob URLs, at the cost of loading the whole file into a Blob and managing URL lifetimes. Not recommended as the primary: it edits native-path components and needs revoke bookkeeping.

## 5. Other storage and exports

| Item | Phone | Web (installed behaviour) | Proposal |
|---|---|---|---|
| AsyncStorage 2.2.0 | Zustand `persist`: `cctv-recovery-form` (only `currentCaseId`/`currentLocationId` survive `partialize`), `cctv-app-settings`, `cctv-biometric-settings`, `cctv-app-form-customization`, `cctv-app-user-profile`; plus `app-color-scheme`, `case_management:last_case_id`, `case_management:last_location_id`; `LargeSecureStore` ciphertext | Works: `AsyncStorage.ts` uses `window.localStorage` (5 MiB per origin; all values here are tiny) | No change. Note: `cctv-app-user-profile` holds identity text the visitor types, in plain localStorage; mention in privacy copy |
| expo-secure-store 57.0.3 | db key, default ZIP password, agency-cloud secret + config, `LargeSecureStore` keys | `ExpoSecureStore.web.ts` is `{}`: `isAvailableAsync()` false, every get/set throws "is not a function". `getAgencyCloudConfig` swallows read failures but calls `logError` each time | DB key: skipped by the open fork. Others: alias to a stand-in whose methods reject with a typed "unavailable" error, or a session-only in-memory Map. Do **not** back it with localStorage and call it secure |
| ZIP / AES (`react-native-zip-archive`) | `zip(dir, dest)` and `zipWithPassword(dir, dest, pw, 'AES-256'\|...)` (`pdf-export-service.ts:41`, `encrypted-share.ts:17`); folder-source only to get real AES on iOS | No web implementation | `@zip.js/zip.js` 2.25.0 (BSD-3, README lists data encryption; AES-256 not exercised here), reading the directory prefix from the web FS and writing a Blob. Or keep simulated per the plan. Output goes through `getBlobAsync` -> download |
| GeoJSON, Case Map | JSON/HTML string written with `writeAsStringAsync`, then `Sharing.shareAsync` | writes need the FS shim; share see below | Works through the shim plus a download-based share |
| expo-print | `Print.printToFileAsync({html,width,height,margins})` returns a PDF file URI (`document-generator.ts:62`, the only call site) | `ExponentPrint.web.ts`: `printToFileAsync()` calls `window.print()` and returns `undefined`; the caller reads `result.uri` and ends in `PdfGenerationError` | Needs a stand-in decision outside R2: hidden-iframe print (as the current demo does, no file), or an HTML->PDF library, or put the HTML in the ZIP. The per-location PDFs in ZIP exports depend on this |
| expo-pdf-attach | native qpdf module | n/a | **Not imported by any file in `src/` or `app/`** (only a `tsconfig.json:21` path); ignore |
| expo-sharing | `Sharing.shareAsync(path)` in 5 files; `isAvailableAsync()` guards | Web: `navigator.share({url})`, URL only, `isAvailableAsync` = `!!navigator.share` (false on desktop Chrome/Firefox) | Alias with: `isAvailableAsync` true; `shareAsync(uri)` -> `navigator.share({files})` when `canShare`, else `<a download>` from `getBlobAsync` |
| expo-document-picker | `ImportPickerModal` then `FileSystem.getInfoAsync/readAsStringAsync/deleteAsync(asset.uri)` | Web returns `blob:` URI + `File` | Works if the FS shim accepts `blob:` (see contract) |
| Temp-file managers | prefix sweep of `documentDirectory` (`temp-file-manager.ts:113-151`, `audio-temp-file-manager.ts:137-196`, `image-processor.ts:35-41`), `cleanupTempFiles`/`cleanupOldExports` (`filesystem.ts:333-395`), age by `modificationTime * 1000` | needs the FS shim | The contract above covers it (`readDirectoryAsync(root)`, `modificationTime`, `deleteAsync`). Add a sweep at boot, since abandoned tabs leave files |
| Cloud sync (Supabase) | `SyncBootstrap` (`app/_layout.tsx:25`) -> `triggerStartupSync`, NetInfo listener, `onSaveComplete()` after every save and import (`cases.tsx:61`, 3 import orchestrators) | Sync is already gated: `cloudSyncEnabled ?? false` (`sync-service.ts:159`) and `not-configured` skip (174). Dev builds fall back to `EXPO_PUBLIC_SUPABASE_*` env (`supabase-config-service.ts`, `devFallbackConfig`) | Switch off on web: do not bake Supabase env into the web export; make `triggerStartupSync`/`onSaveComplete` no-ops via a `.web` seam; hide `CloudSyncSettingsSection` and the agency-cloud wizard/QR enrollment (camera, Supabase Management API, SecureStore); `FileSystem.uploadAsync` rejects. Label the settings rows |

## 6. Browser limits

| Browser | Per-origin quota (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) | Eviction of best-effort data | `persist()` |
|---|---|---|---|
| Chrome / Edge | up to 60% of total disk (best-effort and persistent alike) | Only under storage pressure, least-recently-used origin first; user clearing is the common case (web.dev: https://web.dev/articles/persistent-storage) | Silent, no prompt; granted only if the site is important (engagement, installed or bookmarked, notification permission). A marketing-site visitor will usually be denied; can be asked again |
| Firefox | smaller of 10% of disk or 10 GiB (group limit) | Same LRU under pressure | Shows a user permission prompt |
| Safari (macOS 14 / iOS 17+) | up to about 60% of disk in the browser; 15% for other apps; cross-origin frames about 10% of the parent | LRU under pressure **plus ITP deletion** (below) | Heuristics only (for example Home Screen web app), per WebKit's 2023 policy post |

- IndexedDB, Cache API and OPFS writes fail with `QuotaExceededError` when over quota; map it to the app's existing disk-space error path.
- Eviction is **per origin, all or nothing**: OPFS (DB), IndexedDB (files) and localStorage go together, so eviction itself cannot leave a DB row without its file. Partial-write failures can (quota mid-copy).
- Private/incognito: "different quotas, data usually deleted when the session ends" (MDN).
- **Safari rule (verified from WebKit):** ITP deletes "all other script-writeable storage after 7 days" of Safari use without user interaction on the site (https://webkit.org/tracking-prevention/). WebKit's 2020 post counts **days of Safari use**, not calendar days, lists IndexedDB, LocalStorage, SessionStorage, media keys and service-worker registrations and caches, and exempts only web apps added to the Home Screen (own counter) (https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/). The 2023 storage-policy post says eviction by inactivity skips origins in persistent mode and lists File System as covered storage (https://webkit.org/blog/14403/updates-to-storage-policy/). MDN: "proactive eviction: Safari only". I found no source saying the rule changed in Safari 26; I could not confirm current behaviour.
- **What "persists until the visitor clears it" really means:**
  - Chrome/Edge/Firefox desktop: yes in practice; deleted only by the visitor or under disk pressure (LRU). `persist()` will not help a drive-by visitor, and in Firefox it prompts; call it only from an explicit "keep my data" action, if at all.
  - Safari (desktop and iOS, in the browser): **no**. Effectively "until 7 days of Safari use pass without touching the site". Interactions with the iframe count as interaction with the first-party origin and reset the clock. Only "Add to Home Screen" is durable, and whether a granted `persist()` also exempts ITP is not stated by WebKit. The UI should say so plainly ("saved in this browser; Safari may clear it after about a week without a visit").
  - Private windows: gone at close; Firefox private windows cannot open the OPFS database at all.
  - "Clear site data" removes DB, files, localStorage and the service-worker registration. Provide an in-app "Clear demo data" that does the same on purpose.

## 7. Risks and unknowns

1. **No web export has been run.** Worker + `.wasm` bundling through Expo's Metro under an `/app` base URL is unverified. Installed tree lacks `react-dom` and `react-native-web` (R1's area). Do the spike first: `expo export -p web`, serve under `/app/`, open in Chrome, Safari, Firefox, create a case, reload, check OPFS persistence.
2. **expo-sqlite web hard-requires OPFS.** No memory fallback; failed init is unrecoverable until reload (`worker.ts:776-808`). Second tab: `createSyncAccessHandle` throws `NoModificationAllowedError` (MDN: second `readwrite` handle). Two app iframes on one page behave like two tabs. Reload race (old worker's handles not yet released) is plausible but not measured.
3. **Web build is not encrypted.** No SQLCipher; the DB sits in OPFS in clear text. The `PRAGMA key` / `cipher_version` path must be skipped and the UI must not claim encryption. Copy to review: `InitFailureScreen.tsx:65-66`, `GeneralSettingsSection.tsx:33` ("Your data never leaves the phone" is wrong where AI import goes through the site's `/api/extract`).
4. **Destructive migrations now meet persisted visitor data.** v13->v14 and v14->v15 drop `locations`/`cases` (`database.ts:1086-1255`). A fresh web DB starts at v15, but any future destructive step would wipe returning visitors; keep later migrations additive.
5. **Mount path is baked into stored paths** (`/app/_files/...`). Changing it orphans stored media.
6. **Safari IndexedDB Blob history** (above) is why the proposal stores `ArrayBuffer` chunks; a Safari run is required to confirm chunked storage plus range serving.
7. **Not verified:** sql.js/`@sqlite.org/sqlite-wasm` behaviour; Safari 26 ITP changes; Safari/Chrome private-mode OPFS; per-browser support of the sync access-handle methods the VFS uses; Web Locks support matrix; how `baseUrl` prefixes the `.wasm` asset and worker chunk; whether Safari honours `persist()` for a non-installed site beyond the 2023 post.
8. The `expo-video+57.0.3.patch` in `patches/` was not read (not storage; may matter for web video, R1).
9. Context7 was unavailable for this report.

## 8. Recommendations (with confidence)

| # | Recommendation | Confidence |
|---|---|---|
| 1 | Use `expo-sqlite`'s stock web build (wa-sqlite 3.50.3 + OPFS), async API only. The app's SQL, error messages and transaction pattern run unchanged on it (executed) | High on API/SQL fit; medium on clean bundling until the export spike |
| 2 | No COOP/COEP headers; the only SAB consumer is the sync API the app does not use in production | High (source-verified) |
| 3 | Fork one seam: `database.ts:154-199` into `database-open.ts` + `.web.ts` (skip key and cipher proof; preflight for secure context, OPFS, Web Lock; typed failure shown honestly). Leave `wrapDatabaseError` and all services alone | High |
| 4 | Add `metro.config.js` with `wasm` asset support and `resolveRequest` aliases (web only) for `expo-file-system/legacy`, `expo-secure-store`, `expo-sharing`, `expo-print`, `react-native-zip-archive` | Medium-high |
| 5 | Files in IndexedDB as chunked `ArrayBuffer` behind the web `expo-file-system/legacy` contract; origin-relative `<base>/_files/` URIs served by a small service worker with correct 206 handling; blob-URL `resolveUri` documented as the fallback | Medium (spike required, Safari especially) |
| 6 | Do not build an IDB-snapshot SQLite engine now. If private-window support is wanted, add a patch-package patch to make the OPFS VFS optional and open `:memory:` under a visible "not saved" banner | Medium |
| 7 | Do not rely on `navigator.storage.persist()`; show `estimate()` in settings, add "Clear demo data", and put the Safari 7-day behaviour in the on-screen copy | High |
| 8 | Keep sync, agency-cloud, SecureStore-backed secrets and encrypted-at-rest claims switched off or labelled on web; ZIP via `@zip.js/zip.js` is possible (AES-256 unproven here) but can stay simulated; `expo-print` needs its own stand-in decision | High |
| 9 | Effort (judgment): DB seam about 80 lines plus tests; FS shim about 300 lines; service worker about 100 lines; secure-store/sharing/zip shims about 150 lines; Metro config about 30 lines | Low-medium |
