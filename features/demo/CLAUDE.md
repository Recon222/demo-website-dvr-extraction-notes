# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Scope: this file covers `features/demo/` — the **entire** interactive product demo: the UI layer in
> `ui/` and the state/choreography **engine** in `engine/`, behind one public barrel (`index.ts`).
> The repo-wide marketing-template conventions (Tailwind, AOS, route groups) are in the root `CLAUDE.md`;
> **most of them do NOT apply inside this feature** (see Conventions below).

## What this is

A self-contained, **client-only** interactive demo of the CCTV/DVR extraction-notes mobile app,
rendered as an on-screen iPhone with a narration rail beside it. It is mounted at the `/demo` route
by `app/demo/page.tsx` via `next/dynamic({ ssr: false })` (the store runs in the browser). The route
imports the single public barrel `@/features/demo`.

**One mode: hands-on.** The demo boots EMPTY (owner decision) — the visitor creates the case and
locations, imports their own request PDF (real browser-side pdf.js extraction → a model proxy parses
it; see `ui/import/`), calibrates time, and generates the notes. There is no guided tour, no URL
modes, and no seed data: the scripted director, `?mode`/`?step` handling, and the tour rail chrome
were removed in the demo-explorer refactor (`docs/features/demo-explorer/`). The rail (`StoryRail`)
is a navigable exploration manifest: it narrates the active screen AND lists every explorable chapter
with unseen badges, so a click jumps the phone there (registry: `engine/content/explore.ts`).

## The one architectural rule: the store bridge

**`ui/DemoExperience.tsx` is the ONLY component that touches the Zustand store.** Every screen, modal,
control, and chrome component below it is **purely presentational** — data in via props, intent out via
callbacks. They must never import `@/features/demo/engine/store/*` or `useStore`. `DemoExperience`:

- creates the store once per mount (`useRef`, with an injectable `store` prop as the test/SSR seam),
- subscribes selectively with `useStore(store, selector)`,
- routes the active screen in `activeScreen()` (a `switch` on `view`) and modal in `activeModal()`.

The store's **`currentChapter`** (set only by chapter navigation, never by launch/closeLaunch) anchors
two things: `closeLaunch()` returns the OCR/media launch screens to it, and the rail narration stays on
it while non-chapter views (Map, launchables) are active.

The public surface is intentionally tiny: `features/demo/index.ts` re-exports **only** `DemoExperience`
(from `@/features/demo/ui/DemoExperience`). Everything else stays internal.

## Layout of the feature

```
features/demo/
  index.ts        # the SINGLE public barrel — exports only DemoExperience
  CLAUDE.md       # this file
  ui/             # presentational layer (all 'use client')
  engine/         # pure state/logic core (no React)
```

### `ui/` — presentational layer (all `'use client'`)
- `DemoExperience.tsx` — the store bridge (above). Start here.
- `PhoneFrame.tsx` + `usePhoneScale.ts` — the device shell (404 frame · 378×786 screen · status bar ·
  dynamic island · scan sweep). The screen subtree is always interactive.
  `usePhoneScale` fits the 404×812 device into the viewport, capped at 1:1.
- `StoryRail.tsx` — the right-side narration panel (eyebrow, "you're driving" callout,
  per-screen narration + tip). Also renders the exploration manifest (jump links + unseen badges).
- `ScreenStage.tsx` + `motion.ts` — the cross-slide / drawer-push transitions between screens.
  `motion.ts` is the authoritative transition spec (and doubles as the port template for the RN app).
- `phone-overlay.tsx` — `PhoneOverlayPortal` + context. Every overlay (`ModalShell`, `WizardDrawer`,
  `PdfPreview`, `PickerSheet`) portals to a viewport-pinned root in `PhoneFrame`. Render overlays
  through it, never inline — inline re-introduces the "scroll-lift" bug.
- `screens/` — one presentational component per `ChapterId` + the launchables (`OcrCaptureScreen`),
  plus the overlay modals (`NewCaseModal`, `NewLocationModal`, `ImportModal`).
  - `screens/_shared.tsx` — shared form chrome: `ModalShell`, `WizardHeader`, `WizardNext`, `Field`,
    `Toggle`, `SectionCard`, `AddRowButton`, `ModalActions`, `switchKeyDown` (it re-exports the
    date/time/select inputs from `inputs/`). Reuse these; don't re-roll form chrome.
  - `screens/map/` — the Mapbox case-map tab: `MapScreen`, `MapCanvas` (lazy-loads `mapbox-gl`),
    `MapBottomSheet`/`LocationList`/`LocationDetailCard`/`CallConfirmSheet`/`DemoNotification`,
    `buildMarkers`, `mapData`, `mapTokens`. **This is where `mapbox-gl` enters the bundle**
    (`NEXT_PUBLIC_MAPBOX_TOKEN`; without it `MapCanvas` shows a fallback tile). Call/email/etc. are
    simulated — no real device actions.
  - `screens/screenData.ts` — view-model mappers (e.g. `toCaseCards`, `caseStatusTheme`) that shape
    store entities into the display rows screens render. Lives in the UI layer so screens stay dumb.
- `inputs/` — the date/time/select/address picker library: `DateField`, `TimeField`, `TimeWheel`,
  `Calendar`, `DateTimeField`, `Dropdown`, `PickerSheet`, `AddressAutocomplete` (+ `clock`,
  `input-theme`). The pickers live HERE, not in `_shared.tsx`.
- `import/` — live browser PDF import: `pdf-extract.ts` (pdfjs-dist text extraction), `geocode`,
  `run-import`, and `extract-client.ts` (the `/api/extract` client). Raw bytes stay on-device; only
  the extracted text is POSTed to the `/api/extract` model proxy, which returns RAW text that
  `engine/logic/import*` cleans/parses/maps. No key → the deterministic sample import (`seed.ts`).
- `controls/` — `TabBar`, `WizardDrawer`.
- `chrome/PdfPreview.tsx` — the in-phone PDF preview overlay (HTML strings come from
  `engine/logic/pdf/*`).
- `primitives/` — `TypewriterText` + `useTypewriter`.
- `demo.css` — globals + keyframe library, **scoped under `[data-demo-root]`**. Imported once by
  `DemoExperience`. Lifted verbatim from the prototype; **do not restyle the lifted rules.**

### `engine/` — pure state/logic core (no React, no `'use client'`)
- `engine/index.ts` — the engine's internal API barrel (imported as `@/features/demo/engine`).
- `store/` — the Zustand vanilla store (`create-store.ts`), `selectors.ts`, `helpers.ts`.
- `logic/` — pure functions: `time`/`time-sync`, `ocr`, `coordinates`, `retention`, the import parser
  (`import` plus the `datetime-*` / `*-disambiguation` / `import-normalize` date pipeline), and the
  `pdf/*` document generators.
- `content/` — registries + content: `screens.ts` (`CHAPTERS`/`WIZARD_SCREENS` ordering),
  `explore.ts` (the rail's exploration manifest), `narration.ts`, `seed.ts` (the sample request doc —
  the live-import fallback), `profiles.ts`.
- `types/` — the domain types (`ChapterId`, `DemoState`, `LocationForm`, …).

## Conventions & gotchas (these differ from the rest of the repo)

- **Inline styles, not Tailwind.** UI components style with `CSSProperties` objects lifted verbatim
  from the source prototype (`DVR Extraction Notes Tour.dc.html`). `ui/demo.css` holds only globals +
  keyframes. Do not Tailwind-ify these or "tidy" the lifted pixel values — the 404 = 378 + 13×2 math
  and `box-sizing: border-box` (scoped to `[data-demo-root]`) are load-bearing.
- **No `Date.now()` / `Math.random()`.** Use module-level monotonic counters for ids and React keys
  (`uiSeq` in `DemoExperience`; `seq`/`nextId` in the store). This keeps the demo
  deterministic and SSR/replay-safe.
- **`'use client'`** on every file under `ui/` (the whole UI subtree is client-only). `engine/` is
  framework-agnostic plain TS — keep React out of it.
- Some `view` values have no screen yet (`mediaCapture`, `audioRecording`) and fall through to a
  `placeholder` — these are deferred fast-follows, not bugs.
- **Overlays must portal.** Modals/drawers/sheets render through `PhoneOverlayPortal`
  (`ui/phone-overlay.tsx`) so they pin to the scaled phone viewport; rendering inline re-introduces
  the scroll-lift bug (a dev-only `console.warn` fires if the portal root is missing).
- **Network seams & env.** Rendering is client-only (`ssr:false`), but the demo is not fully offline.
  Two outbound seams, both keyless-safe (`.env.example` documents every var):
  - **Import** → `POST /api/extract` (server route at `app/api/extract/route.ts` — outside this
    feature but demo-only; imports its prompts from `engine/logic/import`). Holds the SERVER-ONLY
    `OLLAMA_API_KEY` (+ `OLLAMA_MODEL`/`OLLAMA_BASE_URL`/`OLLAMA_TIMEOUT_MS`). No key → `503
    NOT_CONFIGURED` → the client silently falls back to the deterministic sample import.
  - **Map / address** → Mapbox tiles + forward-geocode, via the PUBLIC `NEXT_PUBLIC_MAPBOX_TOKEN`
    (`pk.*`, restrict by URL). Absent → map fallback tile, address fields degrade to plain text, and
    imported locations get no pin. All soft-fail — a missing token never breaks a flow.

## Adding or changing a screen

The flow spans `ui/` and `engine/`. To add a wizard screen:
1. Build the presentational component in `ui/screens/` (props + callbacks only; reuse `_shared.tsx`
   chrome and `ui/inputs/*` for date/time/select fields).
2. Add its id to `WizardScreenId`/`ChapterId` in `engine/types/index.ts`.
3. Register it in `engine/content/screens.ts` (`WIZARD_SCREENS` and `DRAWER_DEFS`) — step numbers and
   Next/Back order are **derived from array position**, never hand-typed.
4. Add its narration to `engine/content/narration.ts`.
5. Wire it into `activeScreen()` in `ui/DemoExperience.tsx`, passing store data + callbacks.

Launch-only screens (OCR/media) go in `LaunchableId` + `LAUNCHABLE` instead of the wizard registries,
so they can only be opened by an action button, never reached via Next/Back. Tab-level screens
(`map`, `dashboard`, `cases`) are not wizard steps either — they're reached via `view`/`TabBar`, and
add themselves to the rail through `engine/content/explore.ts`, not `WIZARD_SCREENS`.

## Commands

Run from the repo root (uses `pnpm`; see root `CLAUDE.md`). View the demo at `/demo`.

```bash
pnpm dev            # dev server (Turbopack), open http://localhost:3000/demo
pnpm test           # vitest run (one-shot)
pnpm test:watch     # vitest watch
pnpm test:coverage  # vitest run --coverage
```

Tests use **Vitest + jsdom + React Testing Library**; config is `vitest.config.mts`, setup
`vitest.setup.ts`. Tests are **co-located** in `__tests__/` dirs throughout `ui/` and `engine/`.
Coverage thresholds (80% lines/functions/branches/statements) apply to the logic layer — the demo
engine (`features/demo/engine/**`) plus the non-demo helpers in `lib/**`. The UI (`features/demo/ui/**`)
runs component tests but is not counted toward coverage (presentational UI is validated behaviorally).
Pass a store to `DemoExperience` (the `store` prop) to drive component tests deterministically.

## Reference

Design docs: `docs/features/interactive-demo/` (architecture, implementation plan, test spec).
Migration to this layout: `docs/planning/features-migration/`.
Deferred work and deliberate non-changes: `docs/code-reviews/deferred.md`.
