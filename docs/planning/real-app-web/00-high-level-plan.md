# The real app in the browser: high-level plan

**Status:** proposed, 2026-11-19. Nothing is built. Read this first; the detailed plan is in
`01-architecture.md`, `02-sliced-plan.md` and `03-test-spec.md` in this folder. The research behind every
claim is in `research/` (R1 boot and seams, R2 storage, R3 marketing site).

## 1. What we are doing, in plain terms

The `/demo` page today runs a hand-built copy of the phone app: about 50,000 lines written to look and
behave like the real thing. Every phone change has to be copied by hand.

We will replace it with **the real phone app, built for the browser by Expo, running inside the phone
frame on `/demo`**. One codebase. When the app changes, the demo changes with the next build.

What the visitor gets:

- The real app: the same screens, wizard, forms, validation, PDFs-as-documents, map and case list.
- Their work is saved in their own browser and is still there next time, until they clear site data
  (with one honest exception for Safari, section 5).
- The phone features a browser can do for real are real: GPS, camera photos and video, microphone,
  OCR of a DVR screen, PDF import with AI, clipboard, map, address search, downloads.
- The ones it cannot do are clearly labelled simulations or say plainly they are phone-only: precise
  NTP time sync, Face ID, phone calls and email, cloud sync, encrypted storage.

Not in scope: a database server, accounts, sharing data between visitors, a native-looking desktop layout.

## 2. Why this is feasible (proven, not assumed)

A research agent built the real app for the web in a scratch copy and drove it in a browser (R1):

- `npx expo export -p web` builds it in about 26 seconds. It is served under `/app/` and works inside a
  same-origin iframe.
- After six small stand-ins and one source change it **boots, creates a case, keeps it after a reload, and
  renders all ten wizard screens without a crash**. The case was stored by Expo's own browser SQLite.
- The app's whole database layer is seven calls of one library, and that library already has a browser
  version that keeps SQLite's own error messages, so the app's error handling works unchanged (R2, run
  against the app's real schema).
- About 25 of the app's native libraries already work in a browser with no change (R1 section 2).

## 3. The approach

1. **The phone repo learns to build for the web, on `main`.** Browser versions sit beside the phone code:
   - For the app's own files, a sibling file (`CaseMapView.web.tsx` beside `CaseMapView.tsx`). Expo picks
     it for web builds; the phone build never sees it. About 7 of these.
   - For libraries, a web-only alias table in a new `metro.config.js` pointing at one folder of browser
     stand-ins (`web/shims/`). About 11 of these. No call sites change.
2. **Storage stays in the visitor's browser.** Case data in Expo's browser SQLite (saved to the browser's
   private file storage, OPFS). Photos, video, audio and documents in IndexedDB, served to the app at
   ordinary URLs by a small service worker so images and video play unchanged.
3. **The marketing site hosts the build at `/app/`** on its own domain, and `/demo` becomes the phone
   frame with the real app in an iframe, plus the narration rail beside it.
4. **The honesty rule carries over:** a stand-in either works for real, is labelled as simulated, or says
   plainly it is not available in the browser. Never a fake success. R1 found the main danger is not
   crashes but **silent no-ops** (an alert that does nothing, a print that prints the wrong page), so every
   one of those gets an explicit stand-in.
5. **The hand-built demo is retired** once the real app covers it. Its browser code (camera, GPS, OCR,
   pdf.js, map, print preview, downloads) is reused inside the phone repo's stand-ins, not thrown away.

## 4. Work, in phases

**Phase 0, prove the risky parts (1 to 2 days).** Before building the stand-ins, check the three things
the research could not: Safari and iOS (does the browser SQLite keep data there?), Firefox, and a service
worker playing stored video in Safari. If Safari fails, we choose the fallback here, not later. In
parallel: add the web toolchain to the phone repo (web packages, `metro.config.js`, `/app` base path,
error reporting switched off for the web build, no secrets baked into the bundle, a CI check that the
web build still builds).

**Phase 1, the shared base (about 2 days, mostly sequential).** The pieces every later slice depends on:
a real dialog for `Alert.alert` (96 call sites; today it silently does nothing and blocks Create Case),
the database-open change, the browser file store and service worker, the "not available in the
browser" error and on-screen label, the message bridge between the app and the `/demo` page. After this
the case, location and wizard flows work end to end.

**Phase 2, parallel lanes (about a week, 5 lanes at once).**

| Lane | What it delivers |
|---|---|
| Documents | PDF preview, print and save, ZIP and GeoJSON downloads, PDF import with AI through the site's proxy |
| Capture | Camera photo and video, OCR of the DVR clock, audio recording |
| Location and map | Multi-sample GPS, the case map on Mapbox |
| App shell | Date picker, layout fixes, labelled NTP simulation, shorter splash, Face ID and cloud sync handled honestly |
| Marketing host | `/demo` page with the iframe, rail and "Reset demo data"; `/app/` hosting; the AI route accepting the phone's own prompts |

**Phase 3, finish (2 to 3 days).** End-to-end runs in Chrome, Safari and Firefox; fix what the pieces
break where they meet; retire the hand-built demo; update both repos' `CLAUDE.md`.

## 5. Decisions for you (each has a default; the build carries on with the default)

| # | Question | Default |
|---|---|---|
| Q1 | **PDFs.** The phone turns each report into a PDF file. A browser cannot do that well without a heavy library. | Reports open in a preview with a **Save as PDF** button (the browser's own print-to-PDF), as the demo does today. ZIP exports include each report as a printable HTML file, labelled "PDFs are produced by the phone app". |
| Q2 | **ZIP exports.** The phone makes AES-encrypted ZIPs. | Real ZIP downloads, **not encrypted**, clearly labelled. AES is a later option (a library exists; not proven). |
| Q3 | **Encryption at rest.** The phone refuses to run without database encryption. A browser cannot provide it. | The web build skips that check and **says so** wherever the app claims encryption. The phone build keeps the check unchanged. |
| Q4 | **Safari.** Safari deletes a site's stored data after about 7 days of Safari use without visiting it. | Say so on screen ("saved in this browser; Safari may clear it after about a week without a visit"). |
| Q5 | **Private windows** (Firefox private windows cannot store the database at all). | An honest "this browser window can't save cases" screen. No unsaved fallback mode. |
| Q6 | **The 8-second splash video** replays on every page load. | A short static splash on the web. |
| Q7 | **Face ID.** A browser has none; the app already skips the lock when there is no hardware. | No lock screen on the web. A labelled "simulated scan" moment only if you want it. |
| Q8 | **Phones visiting `/demo`.** A phone frame inside a phone is cramped. | Below a narrow width, `/demo` opens the app full screen. |
| Q9 | **Hosting.** The repos show no deployment setup yet. | Vercel, the web build copied into the site at build time from a pinned phone release. |
| Q10 | **The narration rail and checklist.** | Kept, outside the iframe, fed by messages the app posts. |

## 6. Main risks

| Risk | What we do |
|---|---|
| Safari's browser SQLite or service worker misbehaves (only Chrome was tested) | Phase 0 tests it first; the fallback is chosen before any lane starts |
| Silent no-ops slip through (a button that does nothing) | Every known one is listed with a stand-in; the end-to-end tests drive each flow and check the visible result |
| Changes for the web break the phone build | Everything web-only is guarded so the phone never loads it; the phone's own checks (types, lint, invariants, the full test suite) run on every slice; a native smoke build before merging the phase |
| Secrets in a public bundle | The web export runs with secret environment variables empty, and a test checks the built files contain none |
| First load is heavy (about 1.8 MB of compressed code plus media) | Acceptable to start; later trims are listed (splash video, one oversized embedded string, an icon font) |
| The AI import route drifts from the phone's prompt | The route accepts only the phone's own prompt, checked by fingerprint, so drift fails loudly |

## 7. How the work is run

- **Phone repo:** an integration branch `feature/web-build` in its own worktree off `main`. Each slice is
  built in its own worktree off that branch and merges back when its checks pass. Reviews happen per
  group of slices, as pull requests from `feature/web-build` to `main`. Your main checkout is never
  touched.
- **Marketing repo:** the same pattern on `feature/real-app-demo`.
- One orchestrator dispatches slices and merges; reviewer sessions review; implementers build one slice
  each. Briefs and reports are files; nothing important lives only in an agent's memory.
- Building never waits for review; nothing builds on an unmerged contract.
- The phone repo's "read-only for the demo" rule in its `CLAUDE.md` changes in the first slice, because
  this effort changes the phone repo by design.

## 8. What changes for the people who maintain this

- The demo stops being a second app. Phone features appear in the demo when the phone ships them.
- A phone change can break the web build. The CI check from Phase 0 catches that on the phone's own PRs.
- New native-only code needs a web answer (a stand-in, a label, or "not in the browser"). The phone's
  `CLAUDE.md` gains a short section saying how.
