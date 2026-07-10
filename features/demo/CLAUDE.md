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
locations, imports their own PDF (the model does the import step), calibrates time, and generates
the notes. There is no guided tour, no URL modes, and no seed data: the scripted director, `?mode`/
`?step` handling, and the tour rail chrome were removed in the demo-explorer refactor
(`docs/features/demo-explorer/`). The rail narration simply follows whatever screen is active.

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
  per-screen narration + tip).
- `screens/` — one presentational component per `ChapterId` + the launchables (`OcrCaptureScreen`),
  plus the overlay modals (`NewCaseModal`, `NewLocationModal`, `ImportModal`).
  - `screens/_shared.tsx` — shared form chrome: `ModalShell`, `WizardHeader`, `WizardNext`, `Field`,
    `DateTimeField`, `SelectField`, `Toggle`, `SectionCard`, `AddRowButton`, `ModalActions`,
    `switchKeyDown`. Reuse these; don't re-roll inputs.
  - `screens/screenData.ts` — view-model mappers (e.g. `toCaseCards`, `caseStatusTheme`) that shape
    store entities into the display rows screens render. Lives in the UI layer so screens stay dumb.
- `controls/` — `TabBar`, `WizardDrawer`.
- `chrome/PdfPreview.tsx` — the in-phone PDF preview overlay (HTML strings come from
  `engine/logic/pdf/*`).
- `primitives/` — `TypewriterText` + `useTypewriter`.
- `demo.css` — globals + keyframe library, **scoped under `[data-demo-root]`**. Imported once by
  `DemoExperience`. Lifted verbatim from the prototype; **do not restyle the lifted rules.**

### `engine/` — pure state/logic core (no React, no `'use client'`)
- `engine/index.ts` — the engine's internal API barrel (imported as `@/features/demo/engine`).
- `store/` — the Zustand vanilla store (`create-store.ts`), `selectors.ts`, `helpers.ts`.
- `logic/` — pure functions: `time`, `time-sync`, `ocr`, `import`, and `pdf/*` document generators.
- `content/` — registries + content: `screens.ts` (`CHAPTERS`/`WIZARD_SCREENS` ordering),
  `narration.ts`, `seed.ts` (the sample request doc — the live-import fallback), `profiles.ts`.
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

## Adding or changing a screen

The flow spans `ui/` and `engine/`. To add a wizard screen:
1. Build the presentational component in `ui/screens/` (props + callbacks only; reuse `_shared.tsx`).
2. Add its id to `WizardScreenId`/`ChapterId` in `engine/types/index.ts`.
3. Register it in `engine/content/screens.ts` (`WIZARD_SCREENS` and `DRAWER_DEFS`) — step numbers and
   Next/Back order are **derived from array position**, never hand-typed.
4. Add its narration to `engine/content/narration.ts`.
5. Wire it into `activeScreen()` in `ui/DemoExperience.tsx`, passing store data + callbacks.

Launch-only screens (OCR/media) go in `LaunchableId` + `LAUNCHABLE` instead of the wizard registries,
so they can only be opened by an action button, never reached via Next/Back.

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
