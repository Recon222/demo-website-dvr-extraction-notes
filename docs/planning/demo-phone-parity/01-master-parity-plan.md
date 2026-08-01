# Demo ↔ Phone Full-Parity — Master Execution Plan

**Date:** 2026-07-30
**Status:** RATIFIED — owner ruled on all nine decisions 2026-07-30 (§3). Execution live; the orchestrator updates §7 at each merge.
**Goal:** bring the `/demo` experience to full screen/modal/card/logic parity with the phone app, per the owner's scope calls.
**Executor model:** one Fable agent per work package, dispatched per phase. This document is the contract each agent reads first.

---

## 1. Source-of-truth documents

| Doc | Where | Role |
|---|---|---|
| `00-surface-parity-matrix.md` | this directory | **The authoritative gap list.** 94 deduped surface rows + 3 appendix rows, each with status, delta, effort, phase. Every work package below cites its matrix rows; the row's Delta column + its ui-mapping doc are the spec. |
| `phone-inventory.md` | this directory (copied from the audit session) | Deep phone-side logic reference: per-screen store keys, derived math, native deps, the §5.7 import-terminal spec, §8 master table. Cited as "phone-inventory §N". |
| `demo-inventory.md` | this directory (copied from the audit session) | Deep demo-side reference: file map, store actions, per-screen state assessment. |
| `docs/ui-mapping/README.md` + `01-*.md`…`14-*.md` | **phone repo** `DVR-Extraction-Notes-ReactNative/docs/ui-mapping/` | The fact-checked 118-surface phone UI map (2026-07-16). The per-surface render-order/inputs/buttons/conditional-behavior spec. Agents MUST read the relevant detail doc before building a surface. |
| `features/demo/CLAUDE.md` | demo repo | The demo architecture contract. Binding. |
| `docs/code-reviews/deferred.md` | demo repo | Living deferred ledger. Log new deferrals here; strike resolved ones. |
| `docs/planning/field-parity/field-parity-gaps.md` | demo repo | Historical field-level audit. **Stale headline (29 → really 17 open keys)** — trust the matrix, not this doc. |

Both repos must be available to execution agents:
- Demo (work happens here): `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes` (branch `master`)
- Phone (read-only spec source): `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`

## 2. Scope

**In:** every actionable matrix row (65 rows) — wizard depth, import-terminal redesign, case/location CRUD, media/audio/OCR capture with web mocks, Export tab, map depth, User Profile (last).
**Out (owner decisions, do not re-litigate):** cloud sync / agency-cloud / Supabase / canvas-hub anything; real biometrics; JSON import (being removed from the phone too, D5); `agencyLogoUri` UI; Developer pane (`__DEV__`-only on the phone). **Settings IS in scope** as a faithful UI replica with stubbed behavior (D6): every pane built visually; only User Profile (D6) and Form Customization (D9) get real logic. Demo-only extras (StoryRail, ExploreChecklist, ExitDialog, AI import) stay.
**Direction of parity:** phone is source of truth **except** where the matrix marks DEMO-BETTER (#33 pickers, #41 DVR retention, A3) — never regress those toward the phone. Back-porting demo wins into the phone is a separate phone-repo effort (matrix §4 ledger), not this plan.

## 3. Decision gate — RATIFIED by the owner, 2026-07-30

| ID | Ruling | Effect |
|---|---|---|
| D1 | **Resolved — no divergence exists.** The matrix misread the phone-inventory's file-listing order as step order; the phone's own ui-mapping surface table has Extracted Video Scope reached by "Next" from Time Offset (step 5), same as the demo. | No work. Matrix §7 records the correction. |
| D2 | **`sessionStorage` persistence** — survives refresh, dies with the tab, preserves empty-boot. | P0.4 |
| D3 | **Dots stay exactly as they are** (matches the phone). | none |
| D4 | **Real case-map HTML download; real client-side PDF saves for the Case Notes AND Time Offset documents** (print-to-PDF primary; html2pdf-style one-click spike; NO pdfmake — it would fork the document source of truth away from the phone's HTML templates); ZIP stays an honest stub; PasswordModal skipped. All client-side. | P1.6, P5.* |
| D5 | **JSON import skipped** — the owner is removing it from the phone anyway. | rows 75/76 permanently out |
| D6 | **Full Settings replica** — master/detail shell + every pane as a faithful UI stub; User Profile fully functional with `name` wired into Completion's Completed-By autofill. Motivated by an upcoming will-say-document feature. | P7 restructured (P7.1–P7.3) |
| D7 | **Splash + biometric scan animation committed** (was optional); a drop-in slot for the bunker-doors intro video (owner supplies later); Lock Screen skipped. | new P8 |
| D8 | **Real webcam OCR with genuinely impressive recognition** — Tesseract.js feeding the already-ported cleaning/disambiguation engine; manual correction + disambiguation UI land early (P2, no camera needed), camera work in P4. | P2.2, P4.7 |
| D9 | **Form Customization in FULL** — profile chips AND the 57-toggle grid, wired to the live visibility selectors. | P7.3 |

## 4. Binding conventions for every execution agent

**Architecture (from `features/demo/CLAUDE.md` — read it in full before writing code):**
1. `ui/DemoExperience.tsx` is the ONLY store-touching component. Screens/modals/controls are presentational: props in, callbacks out. Never import `engine/store/*` from a screen.
2. `engine/` is pure TS — no React, no `'use client'`. New logic (log bus, export policy, notes registry, capture capability detection) goes in `engine/`, unit-tested.
3. New wizard screens follow the 5-step "Adding or changing a screen" procedure (component → types → `WIZARD_SCREENS`/`DRAWER_DEFS` registration → narration → `activeScreen()` wiring). Order derives from array position — never hand-type step numbers. Launch-only screens (OCR/media) go in `LaunchableId`/`LAUNCHABLE`.
4. Inline `CSSProperties`, not Tailwind, inside `features/demo/`. Do not restyle lifted rules; the 404 = 378 + 13×2 frame math is load-bearing. Reuse `screens/_shared.tsx` chrome (`ModalShell`, `Field`, `SectionCard`, …) — don't re-roll inputs.
5. No `Date.now()` / `Math.random()` / argless `new Date()`. Use the store's `seq`/`nextId` counters and the injectable `clock` seam (`ui/inputs/clock.ts`).
6. Every new modal id goes through `ModalId` + `activeModal()`; every new view through `view` + `activeScreen()`. `currentChapter` is set only by chapter navigation — launches must not touch it.
7. Marketing code must never import `@/features/demo` internals; the barrel exports only `DemoExperience`.

**Copy & pixel fidelity:** when the matrix/ui-mapping doc quotes exact phone copy, colors, sizes, or option lists — lift them verbatim. The ui-mapping docs are fact-checked with file:line citations; when in doubt, open the cited phone source file.

**Honesty rule (the demo's brand):** anything the browser can't truly do gets an explicit honest treatment (like `SyncStatusCard`'s fabricated-values-real-math and the "No camera available here" notice) — never a fake success. Follow the existing `FallbackMode`/"Sample data" badge patterns.

**Testing:** Vitest + jsdom + RTL, co-located `__tests__/`. Engine coverage gate is 80% — every engine addition ships with tests. UI ships behavioral component tests (drive `DemoExperience` with an injected store). `vitest.setup.ts` deliberately leaves `navigator.mediaDevices` undefined — sample-fallback paths must remain the tested contract. Run scoped tests while iterating; full `pnpm test` before finishing a package.

**Git & review (owner conventions):**
- Branch per phase: `feat/parity-p<N>-<slug>` off `master`. One PR per phase (or per package for L-sized packages — agent's judgment).
- Granular commits, red+green together: the failing test and the code that passes it land in the same commit. One commit per work-package slice.
- Every commit body ends with `Co-Authored-By: <your own model name> <noreply@anthropic.com>` and a `Claude-Session:` link.
- Merges are merge commits (`gh pr merge N --merge --delete-branch`) — never squash/rebase. The owner merges after external review.
- PR bodies written for review fan-out: scope, evidence (screenshots/GIFs of the demo running), deviations-with-justification, "deliberate choices — don't re-flag" section.
- After each phase: update §7 progress table in THIS file and the Status column of touched rows in `00-surface-parity-matrix.md`; log deferrals in `deferred.md`.

**Verification per package:** `pnpm test --silent` green → `pnpm dev` smoke of the touched flow in the browser → for pixel-parity-sensitive surfaces, side-by-side against the phone running in the iOS simulator (`driving-ios-simulator` skill in the phone repo) or against the ui-mapping doc's render-order spec when the sim isn't available.

---

## 5. Phases

Dependency shape: **P0 → P1 → (P2 ∥ P3) → P4 → (P5 ∥ P6) → P7 → P8 → OPT.**
P2 and P3 can run as parallel lanes (different screens; shared hotspots are `create-store.ts` + `DemoExperience.tsx` — see §6). P5/P6 are independent of each other. Rough wall-clock: ~9 weeks sequential; ~5 weeks with two lanes.

### P0 — Correctness & foundation (~3–4 days) — matrix rows 6, 10/46 (status), 44; gaps G1, G3–G6

Repairs the demo's own narrative arc before new surfaces land. All packages independent; parallelize freely.

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P0.1** Error boundary | Demo-scoped error boundary wrapping the phone-frame subtree + launch-flow fallbacks mirroring the phone's `ErrorFallback` pattern (rows 6, 40, 70). Renders inside the frame, styled to the glass aesthetic, "Try again" resets to `cases`. | ui-mapping 01 (ErrorBoundary), 06/10 (route fallbacks) | S |
| **P0.2** Truthful statuses | (a) `screenData.ts locationsOf()` uses `selectLocationMapStatus` instead of hardcoded `'draft'` (G3). (b) New store action `completeCase(caseId)` setting `status: 'complete'`; Completion's "Complete & Save" calls it via the bridge instead of the local `caseCompleted` boolean; Cases/Dashboard cards turn green (G4, rows 10/46 status slice). | matrix G3/G4; `create-store.ts:178`, `DemoExperience.tsx:186` | S |
| **P0.3** Option-set consolidation | Single source of truth for all form enums, matching phone `FORM_OPTIONS` exactly (resolution 8-option incl. CIF/4CIF/960H, FPS 1/5/10/15/20/25/30, exportMedia/fileType/mediaProvidedVia sets) **plus the custom/"Other" free-text path** on Resolution/FPS/export selects. Kill the `field-options.ts` vs `engine/logic/import.ts` drift; import writes must always be displayable (G5, row 44). | phone `src/lib`/form constants (agent locates via phone-inventory §W6/W9); deferred §26 | M |
| **P0.4** Persistence (D2) | `sessionStorage` snapshot: serialize-on-change (debounced) + rehydrate-on-mount around the vanilla store, behind a one-line kill switch. Must not violate the store-bridge rule; empty-boot behavior preserved for new tabs. Version the snapshot key; discard on shape mismatch (G1). | matrix G1, D2 | M |
| **P0.5** Glass tokens (opportunistic) | Extract the repeated gradient/border/radius triples into shared token objects (pattern: `ui/inputs/input-theme.ts`, `map/mapTokens.ts`). Pixel-identical output — this is deduplication, not restyling (G6). Skip if it threatens the schedule. | matrix G6 | M |

Exit: all G-fixes verified in browser; a created→completed case visibly turns green end to end; refresh mid-wizard restores state.

### P1 — Import experience upgrade (~1 week) — rows 47, 48, 71–74, 79; G10 — **the owner-flagged deliverable**

The phone's redesigned PDF-import experience, ported faithfully. Sequence: P1.1 → P1.2/P1.3 (parallel) → P1.4 → P1.5 → P1.6.

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P1.1** Fonts | Move `demo.css`'s runtime Google-Fonts `@import` to `next/font` CSS variables (marketing already loads Share Tech Mono + JetBrains Mono this way). Terminal rendering depends on it (G10). | matrix G10 | S |
| **P1.2** Picker upgrade | 3-card picker with the phone's exact copy/icons/layout ("Pick File" / "Paste from Clipboard" / "Paste Text", minHeight-180 glass cards, per-card spinners, error banner, cancel) + paste-step parity (back chevron, hint copy, `autoCorrect/spellCheck` off — forensic, `maxHeight: 320` internal scroll) (rows 71, 72). Clipboard card = honest browser treatment (`navigator.clipboard.readText` where permitted, honest notice otherwise). JSON routing per D5: not built — unsupported-type error string per phone spec. | phone-inventory §5.2/§5.3; ui-mapping 13 | M |
| **P1.3** Log bus (engine) | Widen the existing `onStage` callback into a real log emitter: retain-and-replay bus (cap 400), levels `INIT/FILE/PDF/AI/NORM/CASE/OK/DONE/ERR`, timestamps from the clock seam, rAF-coalesced `useImportLog` consumer hook. Wire real pipeline stages (pdf.js extract, model call/fallback, normalization, apply) to emit real lines. Pure engine + one UI hook; fully unit-tested. | phone-inventory §5.7.2 | M |
| **P1.4** Live terminal UI | `ImportTerminalProgress` + `TerminalLine` port: virtualized/memoized line list, time gutter, level tags with syntax-accent colors, expandable detail blocks, blinking `▌` cursor footer, pin-aware auto-follow + "latest ↓" pill, title bar "pdf-import · in-browser" (adapt the phone's "nothing leaves this phone" honestly: the demo's live path DOES call a model API — say what's true per `FallbackMode`), fixed-height morphing badge slot (spinner → "Review import →" CTA, FadeIn 350ms, no reflow), `TerminalOutcome` union with distinct amber `partial`. Terminal dark in both themes. | phone-inventory §5.7.1–§5.7.3 (exact copy/colors/sizes); ui-mapping 13 | L |
| **P1.5** Flow modes + dwell | `computeImportFlowMode`-equivalent state derivation: **a non-null result does NOT show results — the terminal dwells until the CTA is tapped, for failures too** (row 73). Result-error enrichment: collapsible "Technical Details", optional "Data Found" block, friendly `ERROR_MESSAGES` map (row 79). Result-success screens (77/78) are COMPLETE — do not touch. | phone-inventory §5.7; ui-mapping 13 | M |
| **P1.6** PDF save + dismiss (D4) | Real client-side PDF output for the Case Notes AND Time Offset documents: primary path `window.print()` against the iframe (vector-perfect, native dialog); PLUS a bounded spike on one-click `.pdf` download via html2pdf-style (html2canvas + jsPDF) rendering — ship it if the court-document layout survives rasterization acceptably, otherwise keep print-dialog only and record why in the PR. No pdfmake (would fork the document source of truth from the phone's HTML templates). Escape + backdrop dismiss (deferred §21) (rows 47, 48). | matrix 47/48; D4 | M |

Exit: a PDF import runs the real pipeline behind a live terminal indistinguishable in structure from the phone's, dwells, then reveals the existing result screens; a failed import dwells on the log.

### P2 — Wizard depth (~1 week) — rows 29, 34, 38, 39, 45, 46; G8, G9 — lane A (parallel with P3)

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P2.1** Notes generator port | Replace the ~15-line `generateNotes()` with the phone's 7-section registry (`address` Tier 0–3 progressive → `timeOffset` → `scopes` extracted-wins-requested-fallback → `retention` → `cameras` (deliberately `''`) → `export` → `timeOnScene`), per-section `content`/`generatedContent`/`userAddendum`/`manuallyEdited`, output-comparison reconciliation + staleness baseline, `notesFreeText` tail, "Copy all" / "Write my own notes…" / restore banner (row 45, G2). Engine-first with heavy unit tests; NotesScreen UI second. **On the PDF critical path — the Case Notes generator must consume the sectioned output.** | phone-inventory notes §; phone `src/features/documentation/notes/`; ui-mapping 08 | L |
| **P2.2** OCR confirm depth | Manual DVR-time correction on the confirmation step (editable parsed time before commit); surface `DateDisambiguationWarning` from the already-built-and-tested `engine/logic/date-disambiguation.ts` (251 LOC, zero UI consumers); user-confirm for the time-only→"today" guess (`TODO(M2)` at `engine/logic/ocr.ts:135`) (rows 38, 39; D8 early slice). | ui-mapping 06; matrix 38/39 | M |
| **P2.3** Submission depth | Simulated GPS capture on Submission's location section: `navigator.geolocation` (deferred §24's recorded direction) presented through the phone's multi-sample UX (sample counter, accuracy readout + Excellent/Good/Fair/Poor rating, `coordinateSource` stamping), honest fallback when permission is denied; `formatAddress` street-type-abbreviation derivation; reconcile contact-field placement vs phone (verify against ui-mapping 05 before building) (row 29). | ui-mapping 05; phone-inventory §M13 | M |
| **P2.4** Final gate + silent failures | Port `finalSubmissionSchema` (OCC# + address + ≥1 complete scope) as Completion's only gate with the phone's alert copy (row 46, G9); fix the two forensic-path silent failures — `selectAdjustedScopes` empty catch, `roundTo5Min` silent passthrough (G8, deferred §15). | ui-mapping 08; matrix G8/G9 | M |
| **P2.5** Time-offset advisories | The phone's 4 DST advisory branches + toast/alert guards on Time Offset (row 34 residual). | ui-mapping 06 | S |

Exit: generated notes are structurally identical to the phone's for the same case data; OCR flow allows correction; Completion actually gates.

### P3 — Case & location management + GPS (~1.5 weeks) — rows 8–15, 22, 23, 42 — lane B (parallel with P2)

Closes 6 of the 17 open field keys. Heavy `create-store.ts`/`DemoExperience.tsx` contention — see §6.

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P3.1** Cases CRUD + delete | Edit/delete/archive on cases, delete on locations, swipe/long-press affordances (web: pointer long-press + row action buttons — match intent, not gesture), single-open behavior, `DeleteConfirmationModal` 2-arm discriminated union with the shared destructive-warning line (rows 10 CRUD, 15). | ui-mapping 02, 11 | L |
| **P3.2** Dashboard actions | Long-press → `CaseActionsSheet` (`actionsForStatus` + `assertNever`, read-only case report, overflow scroll gate), complete/archive/reopen actions, 5-recent paging + `MoreLocationsPill` overflow (rows 8, 9). | ui-mapping 01, 11 | M |
| **P3.3** NewCaseModal completion | Required-field gate (Case Number/Unit), duplicate-case-number check → phone's error-banner UX, edit mode (`mode`/`existingCase` props, seeding, immutable case number), confirm-on-create (rows 11, 12). Preserve the DEMO-BETTER coordinate UX untouched. | ui-mapping 11; matrix 11/12 | M |
| **P3.4** Location GPS + dup-name | Replace the no-op "Capture GPS" with the P2.3 geolocation capability (shared engine module — coordinate with lane A; build once, consume twice); live duplicate-name check (`isLocationNameTaken`); `requireAddress` variant for the copy flow (row 13). | ui-mapping 11; deferred §24 | M |
| **P3.5** Duplicate Location modal | 6-action chooser: duplicate / new-location-with-sub-info(+scopes) / ZIP / GeoJSON — export actions render but resolve to the honest "available in the Export tab" notice until P5 (or hide until P5; agent's judgment, note in PR). `generateCopyName`/`ensureUniqueLocationName` ports. Closes the last field-parity key (`name`) (row 14). | ui-mapping 02, 11 | M |
| **P3.6** Incident editing | "Edit Incident Location" affordance on the map incident card + `EditIncidentLocationModal` as a second mode of the incident form (seed-once, manual/geocoded source stamping, reverse-geocode error banner) (rows 22, 23). | ui-mapping 03, 11 | M |
| **P3.7** Per-camera GPS | `CameraGpsCapture`-style control on camera rows — the 5 keys (`latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt`), forced-precise presentation, max-50 gate (row 42). | ui-mapping 07; phone-inventory §M15 | M |

Exit: full case/location lifecycle in the demo (create→edit→duplicate→archive→delete) with truthful statuses everywhere.

### P4 — Media, audio, OCR camera (~2 weeks) — rows 37, 49–69, 80 — the big block

One shared capability, then three consumers. Sequence: P4.1+P4.2 → (P4.3 ∥ P4.6) → P4.4 → P4.5 → P4.7.

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P4.1** Capture capability layer | Engine + hook: `getUserMedia`/`MediaRecorder` wrapper, permission states (prompt/granted/denied), device selection, and the **sample fallback** (bundled sample photo/video/audio assets) — `vitest.setup.ts` keeps `mediaDevices` undefined so the sample path stays the tested contract. Object-URL lifecycle management (in-memory per D2 — media blobs are NOT persisted to sessionStorage; on rehydrate, media entries render with an honest "media doesn't survive refresh" placeholder). | matrix §1.11 preamble | M |
| **P4.2** Drawer media accordion | The drawer's Media accordion (Capture Media / Record Audio / Media Library) — THE missing entry point; plus the save-status indicator slot (`isDirty`/`saveStatus` demo analog) (row 80 residual). | ui-mapping 14 | M |
| **P4.3** Photo/video capture | `mediaCapture` launchable for real: live viewfinder, Photo/Video mode pill, capture button, recording indicator, permissions view, photo/video review screens with accept/retake (rows 49–55). | ui-mapping 09 | L |
| **P4.4** MetadataForm + wiring | Shared filename+notes form (3 callers), phone filename conventions (`{user}.jpg/.mp4/.m4a`), finally giving `addMedia` its callers — closes 4 field keys (row 56). | ui-mapping 09 | S |
| **P4.5** Media Library | Library sheet + Photos/Video/Audio tabs (auto-select-first), lists, empty state, inline preview + item info, fullscreen preview, long-press delete confirm via the blocking-dialog primitive (rows 57–66). **Do NOT replicate the phone's missing-`onDismiss` bug (B6)** — demo close paths must always clear state. | ui-mapping 09 | L |
| **P4.6** Audio recording | Recorder screen (`MediaRecorder` + Web Audio `AnalyserNode` waveform, timer, pause/resume/stop, 500ms min-duration guard, CRT overlay), permission-denied view, audio preview (decide deliberately whether `<audio>` auto-resets on finish — the phone's non-reset is a library quirk, not a spec; note the choice in the PR). The `0s/5s/…` scale labels are decorative on the phone — replicate as decoration (rows 67–69). | ui-mapping 10 | L |
| **P4.7** OCR real camera (D8) | Real webcam on the OCR camera step: 80%×17% bounding box + 5% crop buffer, canvas frame capture → populate `OcrProof.imageDataUrl` (fixes the always-empty OCR image block in the Time-Offset PDF). Recognition is a headline feature per the owner: integrate Tesseract.js over the cropped frame and feed its raw text through the ALREADY-PORTED cleaning/parsing/disambiguation engine (`engine/logic/ocr.ts`, `date-disambiguation.ts`) so the demo's OCR is as impressive as the phone's. Sample-clock fallback stays intact for no-camera/denied paths (the tested contract); honest notice wherever recognition quality falls short (row 37). **Owner directive (2026-07-30) — landscape viewfinder:** the phone's crop strip reads as top-to-bottom in the portrait code because the operator is meant to ROTATE the phone to landscape, so the strip spans the DVR timestamp with maximum pixels — the code is confusing on this, the simulator shows it. In the demo, render this screen's camera frame in LANDSCAPE orientation (wide viewfinder inside the portrait phone frame, crop strip running across the long axis) rather than replicating a portrait-vertical strip; verify the posture side-by-side against the simulator via the verification lane. | ui-mapping 06; matrix 37; D8 | L |

Exit: every drawer item works; a visitor can capture photo/video/audio (or sample-fallback), tag it, browse it, and see the OCR image land in the calibration PDF.

### P5 — Export surfaces (~1 week) — rows 7, 24–28; G7; per D4

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P5.1** Export engine | Port the pure-TS `ExportSelection` state machine (`armedFullCase`, prune-on-refresh, `isFullCaseSelection`) + `useExportFlow` stage/policy machine + `validateLocationForPdf` validation into `engine/logic/export/` with full unit tests. **Port, don't re-derive.** | phone-inventory §T15–T22; phone `src/hooks/useExportFlow.ts` | M |
| **P5.2** Export tab UI | 4th tab in `TabBar` + `ExportHub`: single-open accordion, tri-state checkboxes, lit-vs-dimmed card treatment, empty state (rows 7, 24, G7). | ui-mapping 04 | L |
| **P5.3** Export modals | `ExportModal` (progress `STAGE_MESSAGES` + validation mode with "Continue anyway") + `ExportActionSheet` (reached from Completion's "Export Zip", not the tab) + a reusable blocking-dialog primitive for the alert taxonomy (also unblocks P4.5's delete confirm — build early if P4 wants it) (rows 25, 27, 28). ZIP terminates in the honest "download isn't available in the demo" notice per D4. PasswordModal (#26) NOT built per D4. | ui-mapping 04, 08 | M |
| **P5.4** Case Map export — real | Port `buildCaseMapHtml` (pure on the phone) and produce a genuine downloadable self-contained HTML case map — the one export that CAN be real per D4. | phone `src/features/case-management/case-map-export/` | M |

Exit: the 4th tab exists; selection/validation behave like the phone; case-map export genuinely downloads; ZIP is honestly stubbed.

### P6 — Map depth (~3–5 days) — row 19 — parallel with P5

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P6.1** Map feature depth | Supercluster clustering, status/text filters, Turf proximity toggle, camera markers show/hide (per-camera GPS from P3.7 feeds this), loading/error overlay states — on the existing `MapCanvas`/`mapbox-gl` base. | ui-mapping 03; phone-inventory §M17 | L |

### P7 — Settings replica, User Profile & Form Customization (~1 week) — rows 81–93, A1, A2; per D6/D9

The full Settings surface as a faithful UI replica: every pane visually complete; honest stub behavior everywhere except User Profile and Form Customization, which are real. Sequence: P7.1 → (P7.2 ∥ P7.3).

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P7.1** Settings shell + stub panes | `SettingsModal` master/detail shell, nav bar, category list/rows, gear entry on the Home + Cases headers, and faithful UI stubs of every pane: Appearance, Media Capture, Location, Time Sync, Export Security, Security (A1), Cloud Sync, About (rows 81–84, 87–93, A1). Stub = pixel-faithful layout and controls that render state but either no-op with an honest notice or toggle purely cosmetic state. No Developer pane (row 94 is `__DEV__`-only on the phone — document the omission). | ui-mapping 12 | L |
| **P7.2** User Profile — full | The User Profile pane + `UserProfileModal`: all 7 fields (`name`, `badgeNumber`, `timeInFieldStart`, `timeAtAgencyStart`, `currentAgency`, `unitName`, `qualifications`), configured/unconfigured states (`hasName = name.trim().length > 0` discriminator), computed career-duration lines, no Cancel button (phone parity), **no `resetProfile()`** (phone docs claim it; the store doesn't have it), **no `agencyLogoUri` UI**. Persists via the D2 layer. **Wire `name` into Completion's Completed-By autofill** exactly like the phone → flows into the Case Notes PDF header. Groundwork for the owner's upcoming will-say-document feature — keep profile types clean and exported from the engine (rows 85, 86). | ui-mapping 12; matrix 85/86 | M |
| **P7.3** Form Customization — full (D9) | The Form Customization pane in FULL: Forensic/Limited/Canvas profile chips, the 12-screen-row × 57-field-toggle grid, "Always on" locks, precedence always-on > user override > profile default, wizard next/back derived from the visible step set. The demo's `selectVisibleWizardScreens`/`selectDrawerItems` are already profile-filtered and `hiddenFields` is typed — this wires real behavior, not a mock (A2). Persist via D2. | phone `src/features/form-customization/`; matrix A2 | L |

### P8 — Boot experience (~2–3 days) — rows 1, 2; per D7

| Pkg | Scope | Spec | Size |
|---|---|---|---|
| **P8.1** Splash + biometric boot | Wire the existing (currently unreachable) `SplashScreen` into boot: simulated biometric scan through the now-live `scanning`/`authorized` branches with the `BiometricScannerHUD` treatment (~1.2s sequence), then into `cases`. Leave a clean drop-in slot for the bunker-doors intro video (owner supplies later) — the sequence must accept a video source without restructuring. Lock Screen (row 3) stays unbuilt. | ui-mapping 14; matrix 1–2 | M |

### P-OPT — Remaining optional items (owner picks)

Splash (old OPT.1) and Form Customization (old OPT.2) were promoted to P8 and P7.3 by the 2026-07-30 ratification.

| Pkg | Scope | Size |
|---|---|---|
| **OPT.1** Repo hygiene | Replace the untouched Cruip template `README.md`/`CHANGELOG.md` with real ones (G11). | S |
| **OPT.2** Init-failure screen | Only meaningful if a future init path can throw (row 5). | S |

---

## 6. Parallelization & contention notes

- **Shared hotspots:** `engine/store/create-store.ts`, `engine/types/index.ts`, `ui/DemoExperience.tsx`, `engine/content/screens.ts` are touched by nearly every package. Within a phase, land store/type changes first (small PR-able slices), or give concurrent agents worktree isolation and rebase in a fixed order. Across lanes (P2 ∥ P3): P2.3 and P3.4 share the new geolocation capability — build it once in whichever lane starts first, as its own commit, and tell the other lane's agent where it lives.
- **The blocking-dialog primitive** (P5.3) is also wanted by P3.1/P4.5 delete-confirms. Whichever phase reaches it first builds it (as a standalone `ui/chrome/` component + engine-free), the others consume.
- **Agent briefing template:** every execution agent's prompt must include: (1) this file's §4 conventions, (2) its package row(s) from §5, (3) the matrix rows + their Delta text, (4) the named spec docs, (5) the instruction to commit granularly with its own model name in the trailer, and (6) the instruction to log deliberate deferrals in `deferred.md` before finishing. Agents do NOT edit this file or the matrix — the orchestrator updates §7 and the matrix Status column at merge time.
- **Worktree execution model:** parallel agents each get their own `git worktree` (created by the orchestrator) on their own `parity/*` branch; they `pnpm install` there (shared store makes it fast), copy `.env.local` from the main checkout if present, push their branch, and never touch `master`. The orchestrator merges agent branches into the phase branch in a fixed order, resolves conflicts, runs the full suite, and opens the phase PR.
- **Agent continuity:** agents are resumed (with their full context) for their package's review findings and for follow-on packages in the same area, rather than briefing fresh agents from zero.
- **Live verification lane (owner-added 2026-07-30):** a dedicated Opus driving agent maintains a Playwright harness (standalone, outside the repo) that drives the demo at `/demo`, and drives the phone app on the iOS Simulator per the phone repo's `driving-ios-simulator` skill — side-by-side visual/behavioral parity checks at each phase boundary, filed as findings into the phase review. Screenshot-heavy work stays inside driving agents (context economy). **The phone repo is never edited — read-only spec source and reference runtime, no exceptions.**
- **Review milestones:** at each phase boundary the demo repo's multi-agent code review (ported from the phone's system; all-Opus reviewers) runs on the phase PR; findings are verified, fixed by the original authoring agents (resumed), fix-delta re-reviewed, then merged with a merge commit.
- **Review mechanics (owner-added 2026-07-30; continuity upgrade after P1):** five parallel **Opus** lane reviewers (typescript / web / tests / silent-failures / type-design, each following its `.claude/agents/` definition) write FULL findings to disk under `docs/code-reviews/parity/<phase>/lane-*.md`; a **Fable** aggregator then dedupes cross-lane duplicates, settles conflicts against the binding contracts, spot-checks every blocker, and writes the single vetted `<phase>-review.md` with per-finding suggested owners. Only that doc (plus verdict counts) enters the orchestrator's context and gets handed to the authoring agents. **P2 onward the lanes are resumable background agents: fix-delta rounds RESUME the same reviewers (warm context) rather than spawning fresh ones** — fresh reviewers per phase, warm within a phase. The `demo-phase-review.js` workflow (fresh lanes every run) is the P0/P1-era fallback.

## 7. Progress tracker (agents update this)

| Phase | Package | Status | PR | Notes |
|---|---|---|---|---|
| P0 | P0.1 error boundary | ✅ | #29 | + route-segment outer net (`app/demo/error.tsx`) with Start-fresh escape hatch |
| P0 | P0.2 truthful statuses | ✅ | #29 | completion location-scoped after R-1/R-19; honest "Location Complete" copy |
| P0 | P0.3 option consolidation | ✅ | #29 | canonical `engine/content/form-options.ts`; custom path live; FORM_OPTIONS deleted |
| P0 | P0.4 persistence (D2) | ✅ | #29 | sessionStorage v2 snapshot, compile-time drift guards (FullShape/FullShapeIn) |
| P0 | P0.5 glass tokens | ✅ | #29 | + @theme mirrors for the route error page |
| P1 | P1.1 fonts | ✅ | #30 | next/font vars; guard widened to .ts + PDF templates |
| P1 | P1.2 picker upgrade | ✅ | #30 | phone-verbatim 3 cards + paste stage; D5 honesty adaptations (§33) |
| P1 | P1.3 log bus | ✅ | #30 | retain-and-replay, real pipeline emission, readonly lines, `pnpm typecheck` |
| P1 | P1.4 live terminal | ✅ | #30 | phone-cited terminal; dual trust scopes (segment + run); Level-A a11y |
| P1 | P1.5 flow modes + dwell | ✅ | #30 | computeImportFlowMode port; CTA sole exit; ERROR_MESSAGES enrichment |
| P1 | P1.6 pdf preview save | ✅ | #30 | real window.print (pinned sandbox), beforeprint success signal; html2pdf no-ship (§34) |
| P2 | P2.1 notes generator | ✅ | #31 | 7-section engine, sectioned persistence v4, PDF consumes sections |
| P2 | P2.2 OCR confirm depth | ✅ | #31 | editable confirm, disambiguation UI, Keep-My-Edits prompt |
| P2 | P2.3 submission depth | ✅ | #31 | reusable GPS capability (§M13 2σ refuted), formatAddress |
| P2 | P2.4 final gate + G8 | ✅ | #31 | finalSubmissionSchema ×3 sites, AlertDialog, isLive() honesty |
| P2 | P2.5 offset advisories | ✅ | #31 | 4 DST branches, recalc guard, D10 passthrough fix rider |
| P3 | P3.1 cases CRUD | ✅ | #32 | store CRUD + selection repair; DeleteConfirmationModal; row tray |
| P3 | P3.2 dashboard actions | ✅ | #32 | CaseActionsSheet, setCaseStatus, 5-recent paging |
| P3 | P3.3 NewCaseModal | ✅ | #32 | gate + duplicate check + edit mode (typed immutability) |
| P3 | P3.4 location GPS | ✅ | #32 | real capture in the modal; dup-name gate; §24 location half closed |
| P3 | P3.5 duplicate location | ✅ | #32 | 6-action chooser; last field-parity key closed |
| P3 | P3.6 incident editing | ✅ | #32 | map affordance + modal; phone stale-lookup bug fixed demo-side |
| P3 | P3.7 per-camera GPS | ✅ | #32 | 5 keys, precise config, snapshot v5 |
| P4 | P4.1 capture capability | ✅ | #33 | engine media core + hooks; SNAPSHOT v6 (blob-strip); sample-fallback contract |
| P4 | P4.2 drawer accordion | ✅ | #33 | Media entry point; honest save-status (original, row-80 refuted ×2) |
| P4 | P4.3 photo/video capture | ✅ | #33 | viewfinder, mode pill, review; boolean onSave/handOff contract |
| P4 | P4.4 MetadataForm | ✅ | #33 | shared form at both SEAMs; no P7 filename dependency (refuted) |
| P4 | P4.5 media library | ✅ | #33 | tabs/previews/long-press delete; phone verified display-only |
| P4 | P4.6 audio recording | ✅ | #33 | AnalyserNode waveform, CRT, no-auto-reset decision; phone bug 9 found |
| P4 | P4.7 OCR camera | ✅ | #33 | LANDSCAPE viewfinder; lazy tesseract 10/10 reads; OcrProof.imageDataUrl fills the PDF |
| P5 | P5.1 export engine | ✅ | #34 | pure machines ported; selection verified ephemeral; §70 contracts |
| P5 | P5.2 export tab | ✅ | #34 | registry-driven 4th tab + hub; latent isChapterId defect fixed |
| P5 | P5.3 export modals | ✅ | #34 | derived-mode modal, D4 honest terminals, opener-capture AlertDialog fix |
| P5 | P5.4 case-map export | ✅ | #34 | REAL download via the flow (R-14 wire); 2 phone bugs found (ledger 10/11) |
| P6 | P6.1 map depth | ✅ | #35 | supercluster at phone config (dep refuted), filters, Turf proximity, camera markers; §79a scale fix found en route |
| P7 | P7.1 settings shell + stub panes | ✅ | #36 | full replica, honest stubs, inert Dark Mode (no theme seam) |
| P7 | P7.2 user profile — full | ✅ | #36 | real pane+modal, v7 snapshot, Completed-By autofill + PDF section gap closed |
| P7 | P7.3 form customization — full | ✅ | #36 | 3 profiles, 58-id grid, two guard layers, wizard/drawer derivation |
| P8 | P8.1 splash + biometric boot | ✅ | #37 | gate-not-view boot, hardened one-constant video drop-in (D7), honest simulated scan |

## 8. Phone-repo follow-ups (NOT this effort — file separately)

From the matrix §4 back-port ledger: **B1** the 3 import-date-pipeline bugs fixed demo-side (`docs/code-reviews/phone-app-debug.md`) → file as `BUG-NNN` in the phone's `bug-list.md`; **B6** `MediaLibrarySheet` missing `onDismiss` (iOS swipe-to-dismiss strands state — surfaced by the ui-mapping fact-check) → file as `BUG-NNN`; **B2–B5** clock-injected datetime, RetentionView derivation, incident-coordinate UX, `motion.ts` Reanimated template → back-port candidates. The owner also plans to remove the phone's JSON import path (noted 2026-07-30) — the demo has no dependency on it.

## 9. Definition of done

All 65 actionable matrix rows read COMPLETE (or carry an owner-accepted documented divergence) in `00-surface-parity-matrix.md`; the three DEMO-BETTER rows are untouched; every phase's PR merged via merge commit with review artifacts committed; `deferred.md` reflects every deliberate deferral; a visitor can walk the entire phone workflow — create → import → calibrate → document → capture media → export — inside the browser demo with honest treatments wherever the browser genuinely can't.
