# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Scope: this file covers `components/demo/` — the **UI layer** of the interactive product demo.
> The state/choreography **engine** it depends on lives in the sibling `lib/demo/` tree.
> The repo-wide marketing-template conventions (Tailwind, AOS, route groups) are in the root `CLAUDE.md`;
> **most of them do NOT apply inside this folder** (see Conventions below).

## What this is

A self-contained, **client-only** interactive demo of the CCTV/DVR extraction-notes mobile app,
rendered as an on-screen iPhone with a narration rail beside it. It is mounted at the `/demo` route
by `app/demo/page.tsx` via `next/dynamic({ ssr: false })` wrapped in `<Suspense>` (the store/director
run in the browser, and `useSearchParams` needs the Suspense boundary).

Two URL-driven modes:
- `?mode=guided` (default) — the **director** auto-plays a scripted tour; the phone is pointer-locked.
- `?mode=sandbox` — the visitor drives the phone directly; the director is off.
- `?step=<kebab-slug>` — in guided mode, jump to a chapter (e.g. `?step=time-offset`). Slug → camelCase
  `ChapterId` via `slugToChapter`; unknown slugs warn (dev) and stay on the opening chapter.

## The one architectural rule: the store bridge

**`DemoExperience.tsx` is the ONLY component that touches the Zustand store.** Every screen, modal,
control, and chrome component below it is **purely presentational** — data in via props, intent out via
callbacks. They must never import `@/lib/demo/store/*` or `useStore`. `DemoExperience`:

- creates the store once per mount (`useRef`, with an injectable `store` prop as the test/SSR seam),
- reads `?mode`/`?step` and seeds (`seedGuided`) or resets (`reset`) accordingly,
- subscribes selectively with `useStore(store, selector)`,
- routes the active screen in `activeScreen()` (a `switch` on `view`) and modal in `activeModal()`,
- runs the current chapter's **beat** on enter (guided only) and drives `TouchIndicator` pulses.

Beat-play is keyed on the store's **`currentChapter`** (set only by chapter nav / resets), NOT raw
`view` — so a beat's own `launch('ocr')` (which moves `view`) cannot re-trigger or restart the beat.

The public surface is intentionally tiny: `index.ts` re-exports **only** `DemoExperience`. Everything
else stays internal.

## Layout of this folder

- `DemoExperience.tsx` — the bridge (above). Start here.
- `PhoneFrame.tsx` + `usePhoneScale.ts` — the device shell (404 frame · 378×786 screen · status bar ·
  dynamic island · scan sweep). `interactive={!guided}` toggles `pointer-events` on the screen subtree.
  `usePhoneScale` fits the 404×812 device into the viewport, capped at 1:1.
- `StoryRail.tsx` + `controls/RailNav.tsx` — the right-side narration / tour-nav panel.
- `TouchIndicator.tsx` — the touch-pulse overlay the director fires on `tap` steps.
- `screens/` — one presentational component per `ChapterId` + the launchables (`OcrCaptureScreen`),
  plus the overlay modals (`NewCaseModal`, `NewLocationModal`, `ImportModal`).
  - `screens/_shared.tsx` — shared form chrome: `ModalShell`, `WizardHeader`, `WizardNext`, `Field`,
    `DateTimeField`, `SelectField`, `Toggle`, `SectionCard`, `AddRowButton`, `ModalActions`,
    `switchKeyDown`. Reuse these; don't re-roll inputs.
  - `screens/screenData.ts` — view-model mappers (e.g. `toCaseCards`, `caseStatusTheme`) that shape
    store entities into the display rows screens render. Lives in the UI layer so screens stay dumb.
- `controls/` — `TabBar`, `RailNav`, `WizardDrawer`.
- `chrome/PdfPreview.tsx` — the in-phone PDF preview overlay (HTML strings come from `lib/demo/logic/pdf/*`).
- `primitives/` — `TypewriterText` + `useTypewriter`.
- `demo.css` — globals + keyframe library, **scoped under `[data-demo-root]`**. Imported once by
  `DemoExperience`. Lifted verbatim from the prototype; **do not restyle the lifted rules.**

## Conventions & gotchas (these differ from the rest of the repo)

- **Inline styles, not Tailwind.** Components style with `CSSProperties` objects lifted verbatim from
  the source prototype (`DVR Extraction Notes Tour.dc.html`). `demo.css` holds only globals + keyframes.
  Do not Tailwind-ify these or "tidy" the lifted pixel values — the 404 = 378 + 13×2 math and
  `box-sizing: border-box` (scoped to `[data-demo-root]`) are load-bearing.
- **No `Date.now()` / `Math.random()`.** Use module-level monotonic counters for ids and React keys
  (`pulseSeq`, `uiSeq` in `DemoExperience`; `seq`/`nextId` in the store). This keeps the demo
  deterministic and SSR/replay-safe.
- **`'use client'`** on every interactive file here (the whole subtree is client-only).
- The store holds an `isSeed` flag on cases/locations so scripted seed data and visitor-created data
  never mix; beats may only `set` a safe top-level slice (`auth`/`mode`) and otherwise go through
  actions, so they can't bypass that invariant.
- Some `view` values have no screen yet (`mediaCapture`, `audioRecording`) and fall through to a
  `placeholder` — these are deferred fast-follows, not bugs.

## Adding or changing a screen

The flow is split across this folder and `lib/demo/`. To add a wizard screen:
1. Build the presentational component in `screens/` (props + callbacks only; reuse `_shared.tsx`).
2. Add its id to `WizardScreenId`/`ChapterId` in `lib/demo/types/index.ts`.
3. Register it in `lib/demo/content/screens.ts` (`WIZARD_SCREENS` and `DRAWER_DEFS`) — step numbers and
   Next/Back order are **derived from array position**, never hand-typed.
4. Add its narration to `lib/demo/content/narration.ts`.
5. Wire it into `activeScreen()` in `DemoExperience.tsx`, passing store data + callbacks.
6. (Optional) add the scripted choreography to `lib/demo/director/beats.ts`.

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
`vitest.setup.ts`. Tests are **co-located** in `__tests__/` dirs throughout this folder and `lib/demo/`.
Coverage thresholds (80% lines/functions/branches/statements) apply **only to `lib/**`** — the
component tests here run but do not count toward coverage (presentational UI is validated behaviorally,
the engine is validated for coverage). Pass a store to `DemoExperience` (the `store` prop) to drive
component tests deterministically.

## Reference

Design docs: `docs/features/interactive-demo/` (architecture, implementation plan, test spec).
Deferred work and deliberate non-changes: `docs/code-reviews/deferred.md`.
