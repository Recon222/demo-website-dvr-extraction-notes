# Shared context for the research agents

## The effort
Replace the hand-built interactive demo in the marketing site with the **real phone app running in a
browser**. Recommended approach (to be confirmed or challenged by evidence):

- Build the real React Native / Expo app for the web with Expo's own web export (`npx expo export -p web`).
- Where the phone uses a native-only module, add a browser version beside it as a platform file
  (`foo.web.ts` next to `foo.ts`). Expo/Metro picks it for web builds. The phone build is unaffected and the
  web stand-ins live on the phone repo's `main`, not a long-lived branch.
- Storage, no database server: case data in an in-browser SQLite engine saved to the browser's own storage
  (IndexedDB) so it persists until the visitor clears site data; files (photos, video, audio, PDFs) in
  IndexedDB behind a browser version of `expo-file-system/legacy`, with a service worker that serves stored
  files at ordinary URLs so `<img>`/`<video>` work unchanged. Plain `localStorage` is too small for media.
- Host the static web build on the marketing site's own origin (for example under `/app/`) and show it in
  the marketing site's phone-frame iframe.
- Capabilities a browser cannot provide stay simulated and labelled ("never a fake success" rule): NTP time
  sync, Face ID, phone calls/email, cloud sync, encrypted ZIP. Some things the current demo marks absent may
  become real because the real app logic exists (ZIP/GeoJSON download, share → browser share/download, AI
  import via the site's existing `/api/extract` proxy).
- The current hand-built demo (`features/demo/` in the marketing repo) is retired once the real app covers it.
  Its browser I/O code (GPS loop, camera/mic, Tesseract OCR, pdf.js, Mapbox map, clipboard, print-to-PDF,
  downloads) is the starting point for the web stand-ins.

Owner constraints: no database server; browser storage is fine and should last until the visitor clears it;
do not over-engineer; honesty rule above is binding.

## Repositories (paths are absolute)
- PHONE: `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative` (Expo SDK 57 per its
  package.json, React Native, expo-router). Its `CLAUDE.md` describes the architecture; each feature has a
  README under `src/features/<feature>/README.md`. **Read-only.** Do not run npm, git checkout, builds or
  anything that writes in this directory.
- DEMO / MARKETING: `/Users/fvadev/Developer/extraction-notes/demo-real-app-plan` (a worktree of the
  marketing site, Next.js 15). Read `CLAUDE.md` and `features/demo/CLAUDE.md` there.
  `docs/planning/demo-browser-substitutes.md` is an inventory of every place the current demo stands in for a
  phone capability; read it first. **Read-only** except your own report file.
- `.design-sync/NOTES.md` in PHONE records what broke when the phone's shared components were compiled for a
  browser with react-native-web (safe-area provider, keyboard provider, reanimated worklets plugin, input
  stacking, Animated under a frozen clock). Useful evidence.

## Rules
- Read-only on both repositories. The only file you write is your report (path in your brief), plus scratch
  files inside your own folder under
  `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/2c02b8da-b937-4ecd-b779-c04ebb1b50da/scratchpad/research/<your-id>/`.
- Never `git stash`. Never launch desktop applications. Do not push anything anywhere.
- Every claim cites evidence: `file:line`, a command and its result, or a library doc you checked (use
  Context7 `mcp__context7__resolve-library-id` then `query-docs` for current library behaviour against the
  installed version; load them with ToolSearch if deferred). Say plainly what you could not verify.
- Report style: comprehensive, not verbose. Tables and one-line facts, no preamble, no praise, no restating
  this brief. Mark each recommendation with your confidence.
- Reply to the orchestrator in 15 lines or fewer: key findings, anything that changes the recommended
  approach, and your report path.
