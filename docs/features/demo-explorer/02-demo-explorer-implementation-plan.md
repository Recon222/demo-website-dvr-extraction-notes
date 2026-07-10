# Demo Explorer — Implementation Plan

**Prerequisite:** Read the Architecture & Design Document (`01-demo-explorer-architecture.md`) for design decisions, data flow, and scope boundaries. Tests come from `03-demo-explorer-test-spec.md` — **write each phase's tests first; commit red + green together** (one commit per phase or coherent sub-step group; never a red-only commit).

### Architecture Decisions (quick reference)

| Decision | Choice |
|----------|--------|
| Tour | Delete `engine/director/` + all mode machinery |
| Boot | Empty, `view: 'cases'` (today's free-explore semantics) |
| Chapters | Keep; rename `TOUR_CHAPTERS` → `CHAPTERS` |
| Visited tracking | Store field `visited: Record<string, true>`, written in `setView`/`launch`/`openModal` |
| Checklist registry | `engine/content/explore.ts`, `covers[]` grouping, ANY-visited lights, array order = numbering |
| Exit | In-app Back-to-site + `ExitDialog`; no `beforeunload` |
| Backdrop | `demo.css` on `[data-demo-root]` + `::before` glow, knobs; inline background stripped |

### Tooling

| Tool | Version |
|------|---------|
| Next.js | 15.1 (App Router) · React 19 |
| Zustand | vanilla store (existing) |
| Vitest + RTL | repo config (`vitest.config.mts`, jsdom) |
| pnpm | repo `packageManager` |

Gates for every slice: `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm build` (run `build` only with dev servers stopped — it clobbers `.next`).

---

## Milestone 1 — Sandbox-only demo (PR 1)

**Observable result:** `/demo` boots straight into an empty, fully interactive phone with the narration rail following whatever screen the visitor is on. No mode toggle, no tour controls, no `?mode`/`?step`. Guided-tour code no longer exists in the tree.

### Phase 1 — Engine teardown

**Goal:** The engine has one mode: none. Store, registries, seed, and types lose every tour-only concept.

#### 1A: Store (`features/demo/engine/store/create-store.ts`)

- Delete from `DemoState`: `mode`, `auth`. Delete actions `seedGuided`, `setMode` (and their `DemoActions` entries).
- `initialState()`: `view: 'cases'`, `currentChapter: 'cases'` (was `splash`/`splash`) — the empty boot IS the initial state.
- `reset()` simplifies to `set({ ...initialState(), })` semantics (no more `isSeed` filtering; it now exists for tests + future "start over" affordances).
- Remove `isSeed` from case/location creation (and from `DemoCase`/`DemoLocation` in 1D).
- Rewrite the `currentChapter` doc comment: it anchors `closeLaunch()` return + narration keying — no tour language.

#### 1B: Screen registry (`features/demo/engine/content/screens.ts`)

- Rename `TOUR_CHAPTERS` → `CHAPTERS` (same contents; update the header comment: "app flow order," not "guided-tour narrative order"). Update all imports (`DemoExperience.tsx`, tests).
- `chapterNumber`/`nextChapter`/`prevChapter` survive unchanged (wizard Next/Back).

#### 1C: Seed content (`features/demo/engine/content/seed.ts`)

- Delete `SEED_CASE`, `SEED_LOCATION`. Keep `SAMPLE_REQUEST_DOC` (live-import fallback — `run-import.ts` line ~64) and `blankLocationForm`.

#### 1D: Types (`features/demo/engine/types/index.ts`)

- Delete `DemoMode`. Remove `isSeed` from `DemoCase`/`DemoLocation`. `ChapterId`, `WizardScreenId`, `LaunchableId`, `ChapterNarration` unchanged.

#### 1E: Director deletion

- `git rm -r features/demo/engine/director/` (runner.ts, beats.ts, types.ts, `__tests__/`). Purge its exports from `features/demo/engine/index.ts`.

**Modifies existing files — high-risk flags:** `engine/index.ts` barrel; every test that imports `seedGuided`/`mode` (see test spec Phase 1 for the rewrite list).

### Phase 2 — UI teardown

**Goal:** One rail, one mode, no URL state; the phone is always interactive.

#### 2A: `features/demo/ui/DemoExperience.tsx`

- Delete: `useSearchParams` + `applyUrlState` + `slugToChapter` + `lastUrl` effect (store still created once per mount via ref, seeded by `initialState`).
- Delete: the beat-play effect, `pulses` state/timers, `TouchIndicator` render, `runBeat`/`BEATS` imports.
- Delete: `guided` flag and all its conditionals — `PhoneFrame` no longer receives `interactive`; `importLive()` inlines to `true`; paste stage always seeds `''`; `GUIDED_NOW`/clock switch collapses to `realNow`.
- Keep: `stepCaption`? No — delete (dots/caption die). `nextLabel`/`onNext`/`onPrev` survive ONLY as wizard-screen callbacks (screens' own Next/Back buttons use them); the rail stops rendering nav.
- `narration` keying unchanged (`view === 'map' ? MAP_NARRATION : NARRATION[currentChapter]`).

#### 2B: `features/demo/ui/StoryRail.tsx`

- Delete: mode toggle, `pill*` styles, progress dots, step caption, `RailNav` usage, guided branch, "Switch to guided tour" button, `mode`/`dots`/`activeDot`/`stepCaption`/`canPrev`/`nextLabel`/`onNext`/`onPrev`/`onSetMode` props.
- Keep: eyebrow, narration pane (`data-rail-pane`), **tips promoted to always-on** (render `narration.tip` when present — the gold hint card), the "You're driving" card as the standing intro (owner call), the "tap directly inside the phone" caption folded into it.
- New props shape: `{ narration: ChapterNarration; onJump(id: AppView): void }` plus the Phase 5 checklist props (leave a placeholder slot — Phase 5 fills it).

#### 2C: `features/demo/ui/PhoneFrame.tsx` + deletions

- Remove the `interactive` prop and its `pointer-events` gate (screen subtree always interactive). Do not touch anything else in the frame.
- `git rm features/demo/ui/controls/RailNav.tsx features/demo/ui/TouchIndicator.tsx`; remove `demoPulse` keyframes from `ui/demo.css` (a new rule — not a lifted one).

#### 2D: `app/demo/page.tsx`

- Drop `Suspense` + fallback (no `useSearchParams` anywhere below). Keep `'use client'` + `next/dynamic` `ssr: false`.

### Phase 3 — Docs & guards

**Goal:** No document lies about the demo.

- `features/demo/CLAUDE.md`: rewrite "Two URL-driven modes" + director sections; store-bridge rule and screen-adding recipe stay (drop the beats step).
- Root `CLAUDE.md`: one-line demo description already mode-agnostic — verify, adjust if needed.
- `docs/code-reviews/deferred.md`: note splash-video entry + media-screen checklist items as deferred follow-ups.

---

## Milestone 2 — Exploration manifest (PR 2)

**Observable result:** A numbered checklist in the rail lights up green as the visitor explores; clicking any row jumps the phone there; Map and AI import are on the list.

### Phase 4 — Engine: visited tracking + registry

#### 4A: Store (`create-store.ts`)

```typescript
// DemoState addition
visited: Readonly<Record<string, true>>
```

- `initialState()`: `visited: { cases: true }` (you boot there — it counts).
- `setView(view)`: also writes `visited[view]`. `launch(screen)`: writes `visited[screen]`. `openModal(modal)`: writes `visited[modal]` (records `'import'`, `'newCase'`, `'newLocation'` — registry decides what matters).

#### 4B: Registry (`features/demo/engine/content/explore.ts` — NEW)

```typescript
export interface ExploreItem {
  id: string                       // stable slug for tests/analytics
  label: string                    // rail display name
  covers: readonly string[]        // view/modal ids; ANY visited ⇒ lit
  jumpTo: AppView                  // where the row click navigates
}
export const EXPLORE_ITEMS: readonly ExploreItem[] = [ /* array order = numbering */ ]
```

v1 contents (owner iterates freely — that's the point of the registry): `dashboard`, `cases`, `import` (covers `['import']`, jumpTo `'cases'`), the 10 wizard screens (labels from `DRAWER_DEFS`), `map`. `splash` excluded (unreachable until the deferred video entry).

#### 4C: Selector (`features/demo/engine/store/selectors.ts`)

```typescript
export interface ExploreStatus { id: string; number: string; label: string; visited: boolean; jumpTo: AppView }
export function selectExploreStatus(state: DemoState): ExploreStatus[]
```

`number` = zero-padded position (`'01'`…), derived from array index (never hand-typed). Tolerates unknown ids both directions (arch §5).

### Phase 5 — UI: the checklist

#### 5A: `features/demo/ui/controls/ExploreChecklist.tsx` (NEW, presentational)

```typescript
export interface ExploreChecklistProps {
  items: ExploreStatus[]
  activeView: AppView
  onJump(view: AppView): void
}
```

Numbered manifest rows (mono number + label, marketing tab-strip language), LED dot per row — lit green (`#10d177` + glow, the wizard-drawer dot values) when visited, hairline-idle otherwise; `aria-label` carries "visited/not visited yet" (dots stay `aria-hidden`). Row click → `onJump(item.jumpTo)`; active view's row gets the blue edge-bar treatment from the drawer.

#### 5B: Integration (`StoryRail.tsx` + `DemoExperience.tsx`)

- Rail renders `<ExploreChecklist>` where the dots used to live (between eyebrow and narration).
- `DemoExperience` subscribes `useStore(store, (s) => s.visited)`, memoizes `selectExploreStatus`, passes items + `onJump` (→ `setView`).
- Add the zero-case Map guard test (picker's "No cases yet" state is escapable) — behavior exists; the test pins it because the checklist now routes people there.

---

## Milestone 3 — Exit dialog (PR 3)

**Observable result:** A "Back to site" affordance on the demo page; leaving with unseen checklist items opens an on-brand dialog listing them, with Keep exploring / Leave anyway.

### Phase 6 — Back-to-site + ExitDialog

#### 6A: `features/demo/ui/controls/ExitDialog.tsx` (NEW, presentational)

```typescript
export interface ExitDialogProps {
  open: boolean
  unseen: ReadonlyArray<{ number: string; label: string }>
  leaveHref: string          // '/'
  onStay(): void
}
```

Page-level overlay (NOT inside the phone — plain fixed-position dialog, `role="dialog"` `aria-modal`, Escape + backdrop → `onStay`). Lists unseen items as numbered manifest rows; "Keep exploring" primary button; "Leave anyway" is a plain `next/link` anchor to `leaveHref`.

#### 6B: Wiring (`DemoExperience.tsx` + `StoryRail.tsx`)

- "← Back to site" link at the top of the rail. If `unseen.length > 0` → `preventDefault`, open dialog; else let the link navigate.
- Dialog state is plain `useState` in `DemoExperience` (UI-only concern — not store state).

---

## Milestone 4 — Case-File backdrop (PR 4)

**Observable result:** The page around the phone reads as the marketing surface: ink-900 base, 0.035 blueprint grid, blue top glow over the rail side, no scan. Phone and its contents pixel-identical.

### Phase 7 — Backdrop + knobs

#### 7A: `features/demo/ui/demo.css`

New section (new rules — the lifted-rules guardrail is untouched):

```css
[data-demo-root] {
  --demo-glow-alpha: 0.16;   /* spotlight strength */
  --demo-glow-left: 444px;   /* glow box starts right of the phone column */
  isolation: isolate;
  background-color: #04070d; /* = marketing --color-ink-900, duplicated by convention */
  background-image: /* 0.035 · 46px carolina grid, same strings as (default)/layout.tsx */;
}
[data-demo-root]::before { /* glow: absolute, top 0, left var(--demo-glow-left), right 0,
  height 260px, z-index -1, pointer-events none,
  radial-gradient(550px 260px at 50% 0%, rgba(43,140,193,var(--demo-glow-alpha)), transparent 70%) */ }
```

#### 7B: `DemoExperience.tsx` root div

- Strip `background`/`backgroundImage` from the inline style (keep `minHeight`/`display`/`gap`/`color`/`fontFamily` — layout untouched).

#### 7C: Rail typography (optional garnish — owner may veto at review)

- `StoryRail` h2 → `fontFamily: 'var(--font-nacelle), sans-serif'`; eyebrow → `var(--font-stmono)` (both vars set on `<body>` by the root layout, available at `/demo`).

---

## Appendix A: New Files

| File | Phase | Purpose |
|------|-------|---------|
| `features/demo/engine/content/explore.ts` | 4B | Exploration registry (extensible, array-ordered) |
| `features/demo/ui/controls/ExploreChecklist.tsx` | 5A | Numbered LED checklist (presentational) |
| `features/demo/ui/controls/ExitDialog.tsx` | 6A | Before-you-go dialog (presentational) |
| `features/demo/engine/content/__tests__/explore.test.ts` | 4 | Registry invariants |
| `features/demo/ui/controls/__tests__/ExploreChecklist.test.tsx` | 5 | Checklist behavior |
| `features/demo/ui/controls/__tests__/ExitDialog.test.tsx` | 6 | Dialog behavior |

## Appendix B: Modified / Deleted Existing Files

| File | Phase | Change |
|------|-------|--------|
| `engine/store/create-store.ts` | 1A, 4A | −mode/auth/seedGuided/setMode/isSeed; boot=cases; +visited |
| `engine/content/screens.ts` | 1B | `TOUR_CHAPTERS` → `CHAPTERS` |
| `engine/content/seed.ts` | 1C | −SEED_CASE/SEED_LOCATION |
| `engine/types/index.ts` | 1D | −DemoMode, −isSeed |
| `engine/index.ts` | 1E | −director exports |
| `engine/director/**` | 1E | **DELETED** |
| `engine/store/selectors.ts` | 4C | +selectExploreStatus |
| `ui/DemoExperience.tsx` | 2A, 5B, 6B, 7B | teardown; checklist + dialog wiring; inline bg strip |
| `ui/StoryRail.tsx` | 2B, 5B, 6B, 7C | single-branch; checklist slot; back-link; fonts |
| `ui/PhoneFrame.tsx` | 2C | −interactive prop (only) |
| `ui/controls/RailNav.tsx`, `ui/TouchIndicator.tsx` | 2C | **DELETED** |
| `ui/demo.css` | 2C, 7A | −demoPulse; +backdrop section |
| `app/demo/page.tsx` | 2D | −Suspense |
| `features/demo/CLAUDE.md`, root `CLAUDE.md`, `docs/code-reviews/deferred.md` | 3 | truth maintenance |
| Test files per `03-…-test-spec.md` | all | rewrites + deletions + new |
