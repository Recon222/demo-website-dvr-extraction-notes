# The real app in the browser: sliced plan

> Document 2 of 3, 2026-11-19. The architecture governs behaviour (`AD-n`, `§n.m`, `C-n`); test IDs in
> `03-test-spec.md` are the acceptance contracts. Everything here is planned; a slice is done only when its
> gate is green and its evidence is recorded. **PH** = phone repo, **MK** = marketing repo.

| Role | Reads |
|---|---|
| Implementer | its card (§3), the `AD`/`§`/`C` it cites, its registry rows in `03` §3, §5 |
| Orchestrator | §1, §2, §3 (Needs, Owns), §5, §6 |
| Reviewer | the cards of the unit, their registry rows, the architecture sections the cards cite |

## 1. Phases, milestones and lanes

| Phase | What | Mode |
|---|---|---|
| 0 | SP0 (browser spike) and FD0 (toolchain); MK1 (AI route) may start too | parallel |
| 1 | FD1 (contracts) → FD2 (dialogs) and ST1 (database) → ST2 (files) | mostly sequential |
| 2 | five lanes against the frozen contracts | parallel |
| 3 | IN1 (cross-browser end to end) → IN2 (retire the hand-built demo) | sequential |

| Milestone | Reached when | Owner checkpoint |
|---|---|---|
| M0 | SP0 records its verdict | **Yes**: one page in plain words. If Safari fails, the fallback chosen there is reported before Phase 1 |
| M1 | Phase 1 merged: a visitor can create a case and a location, fill the wizard, reload and find them | no |
| M2 | Phase 2 merged: every flow in `03` §3 has a real, simulated or "not available" outcome | no |
| M3 | IN1 green in three browsers; `/demo` runs the real app | **Yes**: the owner drives `/demo` before IN2 deletes the hand-built demo |

| Lane | Repo | Owns (exclusive roots) | Slices, in order |
|---|---|---|---|
| SP | PH (scratch) | `docs/web-build/evidence/SP0/` | SP0 |
| FD | PH | `metro.config.js`, `app.config.js` (web keys), `package.json` + lockfile, `public/index.html`, `scripts/export-web.sh`, `.github/workflows/web-build.yml`, `jest.config.js`, `e2e-web/` scaffold, `src/platform/web/`, `app/_layout.tsx`, `CLAUDE.md` (pointer section) | FD0 → FD1 → FD2 |
| ST | PH | `src/features/case-management/services/database*.ts`, `src/components/error/InitFailureScreen.tsx`, `web/shims/expo-file-system__legacy.ts`, `src/platform/web/file-store/`, `public/sw.js` | ST1 → ST2 |
| DC | PH | `web/shims/{react-native-webview,expo-print,expo-sharing,react-native-zip-archive,expo-pdf-text-extract}.*`, `src/features/import/pdf-import/services/providers/` (web file + `ProviderId`), the export-flow web branches, `public/pdfjs/` | DC1 ∥ DC2 → DC3; DC4 ∥ |
| CA | PH | `web/shims/{react-native-vision-camera,@react-native-ml-kit__text-recognition}.*`, `public/ocr/`, audio-recording wording | CA1 ∥ CA2 ∥ CA3 |
| LM | PH | `src/features/location/services/gps-service.web.ts`, `src/features/location/map-view/components/CaseMapView.web.tsx` | LM1 ∥ LM2 |
| SH | PH | `src/components/form/DateTimePicker.tsx`, `src/constants/Layout.ts` (web keys), `src/features/biometrics/components/AuthenticatedSplashScreen.web.tsx`, `src/features/precision-time-sync/services/unified-sync.web.ts`, `src/features/sync/components/SyncBootstrap.web.tsx`, settings web copy, `src/platform/web/host-bridge.ts` emit call sites | SH1 ∥ SH2 ∥ SH3 → SH4 |
| MK | MK | `app/api/extract/`, `lib/extract-prompt/`, `app/demo/`, `components/demo-host/`, `next.config.js`, `scripts/fetch-app-build.mjs`, `app-build.json`, `package.json` scripts | MK1 → (MK3 ∥ MK2) |
| IN | both | `PH:e2e-web/flows/`, deletions in `MK:features/demo/`, both `CLAUDE.md` web sections | IN1 → IN2 |

**Parallelism protocol.**
1. Within a lane, two slices run at once only where marked `∥`; their file sets are disjoint.
2. FD1 creates every shared module and empty folder (`src/platform/web/*`, `web/shims/`, `e2e-web/` fixtures),
   so lanes add files rather than edit shared ones.
3. A package stand-in is added by adding a file to `web/shims/` (C-1); nobody edits `metro.config.js` after FD0
   except FD2 (the RNW list).
4. `package.json` and the lockfile are FD0's: FD0 installs **every** dependency the plan names (§3.2 of the
   architecture). A slice that finds it needs another one files a contract proposal (§5).
5. A change to a frozen contract (C-n) is a proposal, never a local edit.

## 2. Dependency graph

```
SP0 ──────────────┐
FD0 ── FD1 ──┬── FD2 ──────────────────────────────┐
             ├── ST1 ── ST2 ───────────────────────┤
             ├── DC1 ∥ DC2 ── DC3 ; DC4 (∥, live needs MK1)
             ├── CA1 ∥ CA2 ∥ CA3                   ├── IN1 ── IN2
             ├── LM1 ∥ LM2 (both need FD0 only)    │
             ├── SH1 ∥ SH2 ∥ SH3 ── SH4            │
MK1 ─────────┴── MK3 ── MK2 ───────────────────────┘
```

- **Critical path:** FD0 → FD1 → ST1 → ST2 → IN1 → IN2.
- **Off-path:** CA, LM, SH, DC can slip without delaying M1.
- **Ready on day one:** SP0, FD0, MK1. **After FD1:** FD2, ST1, DC1, DC2, DC4, CA1, CA2, CA3, SH1, SH2, SH3;
  LM1 and LM2 need only FD0.
- **Dispatch order when seats are short:** FD2, ST1, DC1, CA1, LM2, SH3, then the rest.
- Lanes build against FD1's in-memory file store (C-2); ST2 swaps in IndexedDB behind the same surface, so no
  lane waits for ST2.
- Using another lane's unreviewed work: merge that lane branch at a green commit; never wait for its review.

## 3. Slices

Size: S ≤ 400 changed lines, M ≤ 1,500, L larger. "Evidence" is recorded in
`docs/web-build/evidence/<SLICE>/README.md` in the repo the slice changes, with sections "What was built",
"Gate results", "Invariants for a successor", "Where a successor starts".

### Phase 0

#### SP0 — Browser spike

| | |
|---|---|
| Goal | A recorded verdict on the three unknowns: OPFS SQLite persistence, a range-serving service worker for media, and both inside a same-origin iframe, in Chromium, WebKit (Playwright) and real Safari on macOS, plus Firefox (normal and private window) |
| Area · lane · size | PH scratch export (R1's recipe) · SP · M |
| Owns | `docs/web-build/evidence/SP0/` only; the scratch build is not committed |
| Needs | — |
| Parallel-safe | yes, with FD0 and MK1 |
| Implements | evidence for AD-7, AD-8, AD-10 |
| Exit | Per browser: case persists across reload (pass/fail); second tab gets a clean refusal; a 10 MB video stored in IndexedDB plays and seeks through the worker; iframe permissions for camera/mic/geolocation prompt. The verdict names the fallback for any failure (`§4.3`) |
| Tests | SP001–SP006 (manual, recorded) |
| Evidence | screenshots per browser and outcome, browser versions, the exact failure text of any failure |

#### FD0 — Web toolchain

| | |
|---|---|
| Goal | `scripts/export-web.sh` produces a web build under `/app` that loads; CI builds it on every PR |
| Area · lane · size | PH · FD · M |
| Owns | `package.json` + lockfile (every web dependency in architecture §3.2), `metro.config.js` (wasm + alias hook, C-1), `app.config.js` (`web.output`, `experiments.baseUrl`), `public/index.html`, `scripts/export-web.sh`, `.github/workflows/web-build.yml`, `src/features/location/map-view/mapbox-init.ts` + `.web.ts` (CS-b), `app/_layout.tsx` (the CS-b call site only), `web/shims/@sentry__react-native.ts`, `web/shims/@rnmapbox__maps.tsx` (null placeholder until LM2), `CLAUDE.md` (replace the "read-only for the demo" pointer with a one-line pointer to this plan) |
| Needs | — |
| Parallel-safe | yes, with SP0 and MK1 |
| Implements | AD-1, AD-2, AD-4, AD-5, AD-6, CS-b, C-1, C-8, C-10 |
| Exit | The export succeeds with the secret check passing; the build loads at `/app/` and reaches the app's init screen; no secret or DSN string in the output; the phone gate (`npm run check:all`) is green; the artifact is uploaded on CI |
| Tests | FD001–FD008 |
| Evidence | export time and sizes; the CI run URL |

### Phase 1

#### FD1 — Contracts and platform skeleton

| | |
|---|---|
| Goal | Every shared web contract exists, typed, with an in-memory file store, so lanes build in parallel |
| Area · lane · size | PH · FD · M |
| Owns | `src/platform/web/` (`unavailable.ts`, `WebNotice.tsx`, `preflight.ts` types, `host-bridge.ts` types + no-op, `file-store/` interface + `memory-store.ts`), `web/shims/expo-file-system__legacy.ts` (on the memory store), `web/shims/expo-secure-store.ts` (AD-11), `jest.config.js` (web project, AD-26), `e2e-web/` (Playwright config, fixtures, one boot test), `src/platform/web/README.md` |
| Needs | FD0 |
| Parallel-safe | no (it is the freeze) |
| Implements | AD-3, AD-11, AD-13, AD-26, AD-27, C-2 (surface), C-4, C-6 (types), C-9 (types) |
| Exit | Every contract in `01` §6 owned by FD1 exists with types and a fake; the app boots past directory setup on the memory store; the web Jest project runs; `e2e-web` runs one boot test in three browsers |
| Tests | FD101–FD112 |
| Evidence | the contract list with file paths |

#### FD2 — Dialogs

| | |
|---|---|
| Goal | Every `Alert.alert` on web shows a real dialog and runs the chosen button |
| Area · lane · size | PH · FD · S |
| Owns | `web/shims/rnw-alert.ts`, the RNW list in `metro.config.js`, `src/platform/web/dialogs.ts`, `src/platform/web/DialogHost.tsx`, `src/platform/web/WebRoot.tsx` (+ `.native` no-op), `app/_layout.tsx` (mount `WebRoot`, CS-e) |
| Needs | FD1 |
| Parallel-safe | yes, with ST1 and every lane except SH4 |
| Implements | AD-14, C-5, CS-e |
| Exit | Create Case confirms through a visible dialog and creates the case; a three-button alert runs the pressed callback; queued alerts show in order |
| Tests | FD201–FD206 |

#### ST1 — Database open seam

| | |
|---|---|
| Goal | The web build opens its SQLite database without the SQLCipher guard, and refuses honestly when the browser cannot hold it |
| Area · lane · size | PH · ST · S |
| Owns | `src/features/case-management/services/database.ts` (call site only), `database-open.ts`, `database-open.web.ts`, `src/platform/web/preflight.ts` (implementation), `src/components/error/InitFailureScreen.tsx` (web reasons) |
| Needs | FD1 |
| Parallel-safe | yes |
| Implements | AD-7, AD-8, CS-a, C-6 |
| Exit | Native open path byte-for-byte unchanged in behaviour (existing tests green); on web a case persists across reload; a second tab and a no-OPFS window each show their message |
| Tests | ST101–ST108 |

#### ST2 — IndexedDB file store and service worker

| | |
|---|---|
| Goal | Files survive reloads and play from ordinary URLs |
| Area · lane · size | PH · ST · L |
| Owns | `src/platform/web/file-store/indexeddb-store.ts`, `web/shims/expo-file-system__legacy.ts` (switch to IndexedDB), `public/sw.js`, the SW registration in `public/index.html`, the boot temp-file sweep wiring |
| Needs | ST1, SP0 verdict |
| Parallel-safe | yes, with the lanes (they use the C-2 surface) |
| Implements | AD-9, AD-10, AD-12, C-2, C-3 |
| Exit | A stored photo, video and audio file render after reload through `/app/_files/**`; ranged requests return correct `206`s; quota errors surface as the app's disk-space error; SP0's fallback is in place if SP0 required it |
| Tests | ST201–ST214 |

### Phase 2

#### DC1 — Report preview

| | |
|---|---|
| Goal | Case Notes and Time Offset previews render on web and "Save as PDF" opens the print dialog for the report only |
| Area · lane · size | PH · DC · M |
| Owns | `web/shims/react-native-webview.tsx`, `src/platform/web/print-frame.ts` |
| Needs | FD2 |
| Parallel-safe | yes, with DC2 and DC4 |
| Implements | AD-15 (preview part) |
| Exit | Both previews render their report; load callbacks fire; links do not navigate the frame; the print action prints the report, and a blocked print shows a notice instead of success |
| Tests | DC101–DC106 |

#### DC2 — Report files and download

| | |
|---|---|
| Goal | Report generation returns a real (HTML) file on web, and "share" downloads it |
| Area · lane · size | PH · DC · M |
| Owns | `web/shims/expo-print.ts`, `web/shims/expo-sharing.ts`, web copy where outputs are named "PDF" |
| Needs | FD1 |
| Parallel-safe | yes, with DC1 and DC4 |
| Implements | AD-15 (files), AD-17 |
| Exit | Exporting Case Notes, Time Offset, GeoJSON and the Case Map each download a file with the right name and type; nothing claims "shared" or "PDF" when it was a download or HTML |
| Tests | DC201–DC208 |

#### DC3 — ZIP export

| | |
|---|---|
| Goal | Case and location exports download a real, unencrypted ZIP, labelled |
| Area · lane · size | PH · DC · M |
| Owns | `web/shims/react-native-zip-archive.ts`, the web branch of the export flow's password step |
| Needs | DC2 |
| Parallel-safe | yes, with DC4 |
| Implements | AD-16 |
| Exit | A ZIP with the case's reports, media and GeoJSON downloads; asking for a password shows the "encrypted ZIPs are phone-only" notice and offers the unencrypted ZIP; the ZIP opens in a standard tool |
| Tests | DC301–DC306 |

#### DC4 — PDF import on the web

| | |
|---|---|
| Goal | A visitor imports a request PDF and gets the phone's own AI extraction |
| Area · lane · size | PH · DC · M |
| Owns | `web/shims/expo-pdf-text-extract.ts`, `public/pdfjs/`, `src/features/import/pdf-import/services/providers/index.web.ts`, `web-proxy-provider.ts`, `ProviderId` (CS-d) |
| Needs | FD1 (unit), MK1 (live end-to-end) |
| Parallel-safe | yes |
| Implements | AD-24 (client), CS-d, C-7 (consumer) |
| Exit | A text PDF yields the phone's extraction through `/api/extract`; a scanned PDF gives the phone's scanned-PDF error; route "not configured" shows AI unavailable; no sample result ever appears |
| Tests | DC401–DC408 |

#### CA1 — Camera photo and video

| | |
|---|---|
| Goal | Media Capture takes photos and records video in the browser and saves them to the case |
| Area · lane · size | PH · CA · L |
| Owns | `web/shims/react-native-vision-camera.tsx` (+ helpers in `web/shims/vision-camera/`) |
| Needs | FD1 |
| Parallel-safe | yes, with CA2, CA3 |
| Implements | AD-13, architecture §4.7 |
| Exit | Photo and video are saved and listed in the media library; permission denied shows the app's denied view; no camera shows "not available"; the camera light goes off on leaving the screen |
| Tests | CA101–CA110 |

#### CA2 — OCR of the DVR clock

| | |
|---|---|
| Goal | The OCR screen reads a DVR timestamp in the browser through the app's own parser |
| Area · lane · size | PH · CA · M |
| Owns | `web/shims/@react-native-ml-kit__text-recognition.ts`, `public/ocr/` |
| Needs | FD1 |
| Parallel-safe | yes |
| Implements | architecture §4.7 |
| Exit | A fixture DVR frame yields the expected timestamp through the phone's cleaning and parsing; no SIMD gives "not available"; no sample text ever appears |
| Tests | CA201–CA206 |

#### CA3 — Audio recording

| | |
|---|---|
| Goal | Audio recordings work in the browser with honest format wording |
| Area · lane · size | PH · CA · S |
| Owns | web wording in `src/features/media/audio-recording/` (a `.web` copy constant), any audio-studio adapter if its web recorder falls short (filed first as a proposal) |
| Needs | FD1 |
| Parallel-safe | yes |
| Implements | architecture §4.7 |
| Exit | Record, pause, stop and save produce a playable file listed in the library; the format shown is the real one |
| Tests | CA301–CA305 |

#### LM1 — GPS

| | |
|---|---|
| Goal | Multi-sample GPS capture takes fresh samples in the browser |
| Area · lane · size | PH · LM · S |
| Owns | `src/features/location/services/gps-service.web.ts` |
| Needs | FD0 |
| Parallel-safe | yes, with LM2 |
| Implements | architecture §4.8 |
| Exit | Each sample requests a fresh fix (`maximumAge: 0`); the most accurate wins; denial and timeout map to the phone's error codes; nothing is fabricated |
| Tests | LM101–LM106 |

#### LM2 — Case map

| | |
|---|---|
| Goal | The Map tab and the cameras map work on web with the same props as native |
| Area · lane · size | PH · LM · L |
| Owns | `src/features/location/map-view/components/CaseMapView.web.tsx` (+ web helpers beside it), `web/shims/@rnmapbox__maps.tsx` (delete the placeholder) |
| Needs | FD0 |
| Parallel-safe | yes |
| Implements | architecture §4.8 |
| Exit | Pins, clusters, camera markers, proximity ring, long-press and `flyTo` work; with no token a "map unavailable" view shows |
| Tests | LM201–LM208 |

#### SH1 — Date picker and layout

| | |
|---|---|
| Goal | Date fields open a calendar on web; the app fits the phone frame |
| Area · lane · size | PH · SH · S |
| Owns | `src/components/form/DateTimePicker.tsx` (CS-c), `src/constants/Layout.ts` (web keys), tab-bar sizing, `ShareTechMono` `@font-face` (requests the `public/index.html` edit from FD via the FD-owned file's documented insertion point) |
| Needs | FD0 |
| Parallel-safe | yes |
| Implements | CS-c, architecture §4.9 |
| Exit | A date can be chosen on web; native date behaviour unchanged; tab labels and headers are not clipped at 378×786 |
| Tests | SH101–SH105 |

#### SH2 — Time sync simulation and splash

| | |
|---|---|
| Goal | Time sync works as a labelled simulation; the app opens without the 8-second video |
| Area · lane · size | PH · SH · S |
| Owns | `unified-sync.web.ts`, `AuthenticatedSplashScreen.web.tsx` |
| Needs | FD1 |
| Parallel-safe | yes |
| Implements | AD-18, AD-20 |
| Exit | "Use current time" yields a result with the simulated label everywhere the sync source is shown; the app reaches the Dashboard in under 2 s after load |
| Tests | SH201–SH205 |

#### SH3 — Phone-only features, honestly

| | |
|---|---|
| Goal | Cloud sync, secure storage, encryption claims, Face ID and "open settings" say what they are on web |
| Area · lane · size | PH · SH · M |
| Owns | `SyncBootstrap.web.tsx`, web variants of the Cloud Sync section, security/encryption copy (CS-f), `Linking.openSettings` web text |
| Needs | FD1 |
| Parallel-safe | yes |
| Implements | AD-11, AD-19, CS-f |
| Exit | No network call to Supabase on web; each phone-only control shows `WebNotice phone-only`; no screen claims encryption at rest on web |
| Tests | SH301–SH306 |

#### SH4 — Host bridge emits

| | |
|---|---|
| Goal | The app tells the `/demo` page where the visitor is and obeys "navigate" |
| Area · lane · size | PH · SH · S |
| Owns | `src/platform/web/host-bridge.ts` (implementation), emit calls at the five modal sites (`.web` hook or a no-op-on-native helper) |
| Needs | FD2, SH1–SH3 merged (shares screens) |
| Parallel-safe | no, within SH |
| Implements | AD-23, C-9 |
| Exit | Route changes and the five modals post messages; `dvren:navigate` moves the router without reloading; messages from other origins are ignored; nothing is posted when not framed |
| Tests | SH401–SH405 |

#### MK1 — AI route accepts the phone's prompts

| | |
|---|---|
| Goal | `/api/extract` serves the phone's web provider with the phone's own prompt |
| Area · lane · size | MK · MK · S |
| Owns | `app/api/extract/` (route, guards, tests), `lib/extract-prompt/` (moved prompt for the legacy shape) |
| Needs | — |
| Parallel-safe | yes |
| Implements | AD-24 (route), C-7 |
| Exit | The new shape works with an allowed prompt hash; an unknown hash gets `400 PROMPT_NOT_ALLOWED`; the legacy shape still serves the old demo; `maxOutputTokens` is capped |
| Tests | MK101–MK108 |

#### MK3 — Hosting `/app/`

| | |
|---|---|
| Goal | The marketing build includes the pinned web build at `/app/` |
| Area · lane · size | MK · MK · S |
| Owns | `next.config.js` (rewrites, headers), `scripts/fetch-app-build.mjs`, `app-build.json`, `package.json` scripts, `.gitignore` (`public/app/`) |
| Needs | FD0 (artifact), MK1 |
| Parallel-safe | yes, with MK2 |
| Implements | AD-21, C-10 |
| Exit | `pnpm build` fetches and verifies the pinned build; `/app`, `/app/` and a deep link serve the app; static assets are immutable, `index.html` and `sw.js` are not cached |
| Tests | MK301–MK306 |

#### MK2 — The `/demo` host page

| | |
|---|---|
| Goal | `/demo` shows the real app in the phone frame with the rail and a reset |
| Area · lane · size | MK · MK · M |
| Owns | `app/demo/` (page and error), `components/demo-host/` (frame, iframe, rail, bridge client, reset, the moved explore/narration registry) |
| Needs | FD1 (C-9), MK3 |
| Parallel-safe | yes, with MK3 once its config lands |
| Implements | AD-22, AD-23 (host), AD-12 (reset) |
| Exit | The app runs in the frame; the rail follows the visitor and its jump links navigate; "Reset demo data" empties every store; under 640 px the page offers full screen; the hand-built demo is no longer mounted (still in the tree until IN2) |
| Tests | MK201–MK208 |

### Phase 3

#### IN1 — Cross-browser end to end

| | |
|---|---|
| Goal | Every flow in `03` §3.8 passes in Chromium, WebKit and Firefox against the real exported build inside `/demo` |
| Area · lane · size | both · IN · L |
| Owns | `PH:e2e-web/flows/`, fixes at the seams found by the runs (each fix stays inside the owning slice's files, recorded as a change to that slice) |
| Needs | every Phase 2 slice |
| Parallel-safe | no |
| Implements | AD-27, AD-28 |
| Exit | All flow tests green in three browsers; the native smoke build launches and opens a case; M3 checkpoint report written |
| Tests | IN101–IN118 |

#### IN2 — Retire the hand-built demo

| | |
|---|---|
| Goal | The marketing repo carries no second app; both repos document the web build |
| Area · lane · size | MK + PH docs · IN · M |
| Owns | deletion of `MK:features/demo/`, `public/demo-media/`, `public/ocr/`, now-unused dependencies, demo-only config, tests and tools (`R3` §6 inventory); archive of demo docs; `MK:CLAUDE.md`; the web-build section of `PH:CLAUDE.md` |
| Needs | IN1 and the owner's M3 sign-off |
| Parallel-safe | no |
| Implements | AD-25 |
| Exit | `pnpm build`, `pnpm test`, `pnpm typecheck` green; no import of `@/features/demo` anywhere; the legacy `{documentText}` route shape removed |
| Tests | IN201–IN205 |

## 4. Coverage (decision → slice)

| AD | Slices |
|---|---|
| AD-1, 2, 4, 5, 6 | FD0 |
| AD-3, 11, 13, 26, 27 | FD1 (+ every lane for AD-13) |
| AD-7, 8 | ST1 |
| AD-9, 10, 12 | ST2 (AD-12 reset: MK2) |
| AD-14 | FD2 |
| AD-15 | DC1, DC2 |
| AD-16 | DC3 |
| AD-17 | DC2 |
| AD-18, 20 | SH2 |
| AD-19 | SH3 |
| AD-21 | MK3 |
| AD-22 | MK2 |
| AD-23 | SH4, MK2 |
| AD-24 | MK1, DC4 |
| AD-25 | IN2 |
| AD-28 | every PH slice; IN1 smoke build |

## 5. Conflict avoidance

| Shared thing | Owner | How others change it |
|---|---|---|
| PH `package.json`, lockfile | FD0 | contract proposal; FD0's successor (the orchestrator) lands it as its own commit |
| `metro.config.js` | FD0 (mechanism), FD2 (RNW list) | add a shim file instead (C-1) |
| `app/_layout.tsx` | FD0 then FD2 (sequential) | proposal |
| `public/index.html` | FD0 (FD1 adds nothing; ST2 adds SW registration; SH1 adds `@font-face`) | each edit inside its own marked block; never two of these slices at once (ST2 and SH1 coordinate through the orchestrator) |
| `src/platform/web/*` contracts | FD1 | proposal |
| `e2e-web/` fixtures and config | FD1 | new spec files are free; fixture changes by proposal |
| `jest.config.js` | FD1 | proposal |
| `InitFailureScreen.tsx` | ST1 | proposal |
| MK `next.config.js` | MK3 | proposal |
| Both `CLAUDE.md` | FD0 (pointer), IN2 (sections) | proposal |
| This plan | the orchestrator | docs-only commits |

**Contract-proposal protocol:** write `docs/web-build/evidence/<SLICE>/contract-proposal.md` with the exact
signature, reason and every consumer; message the orchestrator its path; keep working on what does not depend
on it. Nobody creates a duplicate type to get unblocked.

## 6. Branches, evidence and process

- **PH branches.** `feature/web-build` off `main` is the integration branch; it only receives reviewed lane
  work. Every slice is built on `slice/<ID>` and merges, when its gate is green, into its lane branch:
  `web/base` (FD, ST), `web/dc`, `web/ca`, `web/lm`, `web/sh`. Phase 2 lane branches are cut from `web/base`
  after FD1 and merge `web/base` again when ST1 and ST2 land.
- **MK branches.** `feature/real-app-demo` off `master`, with the same slice-to-lane flow (`web/mk`).
- **Review units** (each a PR from a lane branch; building never waits for them):

  | Unit | Slices | PR |
  |---|---|---|
  | U1 | SP0, FD0, FD1, FD2 | `web/base` → `feature/web-build` |
  | U2 | ST1, ST2 | `web/base` → `feature/web-build` |
  | U3 | DC1–DC4 | `web/dc` → `feature/web-build` |
  | U4 | CA1–CA3 | `web/ca` → `feature/web-build` |
  | U5 | LM1, LM2 | `web/lm` → `feature/web-build` |
  | U6 | SH1–SH4 | `web/sh` → `feature/web-build` |
  | U7 | MK1–MK3 | `web/mk` → `feature/real-app-demo` |
  | U8 | IN1, then the whole effort | `feature/web-build` → `main` (with the native smoke build) and `feature/real-app-demo` → `master` |
  | U9 | IN2 | its own PR into `master` after the owner's M3 sign-off |

- Merge commits only. No squash, no rebase.
- Every slice records `docs/web-build/evidence/<SLICE>/README.md`; its existence marks the slice landed.
- Roles, review rounds and the leftovers rule follow the fleet process the orchestrator runs (briefs as files,
  replies under 20 lines, reviewer aggregation with stopping rules). Review leftovers go to the PR's leftovers
  file, per the phone repo's `CLAUDE.md`.
