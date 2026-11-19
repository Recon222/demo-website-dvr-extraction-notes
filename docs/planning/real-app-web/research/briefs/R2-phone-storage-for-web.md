# R2: phone app storage, files and exports on the web

Read `00-shared-context.md` in this folder first.

## Questions
1. **SQLite surface.** List every `expo-sqlite` API the app uses (methods, transaction helpers, prepared
   statements, sync vs async, `openDatabaseAsync` options), where, and how often. Read
   `src/features/case-management/services/database.ts` (open, migrations, `wrapDatabaseError` and the SQLite
   error messages it pattern-matches), the encryption key flow (`db-encryption-key.ts`, expo-secure-store,
   `PRAGMA key`), and how services use transactions and the save mutex.
2. **Engine choice for the browser.** Evaluate, with evidence from the installed packages and their docs:
   (a) expo-sqlite's own web build (it uses SharedArrayBuffer: what headers it needs, whether that works in a
   same-origin iframe inside the marketing page, Safari support); (b) the wa-sqlite build that ships inside
   expo-sqlite (`node_modules/expo-sqlite/web/wa-sqlite`) with its MemoryVFS plus saving the database bytes to
   IndexedDB; (c) sql.js plus IndexedDB; (d) any IndexedDB-backed VFS. For each: does it keep SQLite's error
   messages (so `wrapDatabaseError` still works), persistence model, size, Safari/Firefox/Chrome support, and
   the effort to wrap it in the app's used API surface. Recommend one.
3. **File surface.** List every `expo-file-system` / `expo-file-system/legacy` API used, the path helpers
   (`Paths` etc.), which directories (document, cache), and every place a stored file's URI is handed to a
   renderer (Image, expo-image, video and audio players, PDF view, WebView, share). Propose the browser
   version's API contract (functions, URI scheme) and check the service-worker idea: can a service worker
   registered by an Expo static web export serve IndexedDB-stored files at URLs the app hands to `<img>`,
   `<video>` (range requests) and `<audio>`; scope and first-load caveats.
4. **Other storage and exports.** AsyncStorage and expo-secure-store use (what is stored, web behaviour);
   ZIP/AES export (`react-native-zip-archive`) and GeoJSON; `expo-print` (PDF file generation) and
   `expo-pdf-attach`; `expo-sharing`; temp-file managers and their cleanup; cloud sync (Supabase): what must
   be switched off on the web.
5. **Browser storage limits.** Quota per browser, eviction rules, and Safari's rule that deletes
   script-written storage after a period of no user interaction for sites not added to the home screen
   (verify the current rule). Say what "persists until the visitor clears it" really means per browser and
   whether `navigator.storage.persist()` helps.

## Output
Write `R2-phone-storage-for-web.md` in the parent folder. Sections: SQLite surface, Engine options and
recommendation, File surface and proposed contract, Service-worker feasibility, Other storage and exports,
Browser limits, Risks and unknowns, Recommendations (with confidence).
