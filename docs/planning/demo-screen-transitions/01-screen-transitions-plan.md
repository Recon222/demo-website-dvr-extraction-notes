# Screen Transitions & Drawer Push — Plan + Motion Spec

**Goal:** bring the demo's navigation to parity with the phone app — a **horizontal slide** on screen change (incl. wizard Next/Prev) and a **right-anchored drawer that pushes the screen left** — and improve where we can. Bottom sheets (date/time/dropdown) are already perfect and are **not** touched. This doc's "Motion Spec" section is the portable template for the React Native app (which uses Reanimated, not this code).

## Source of truth — what the phone does (agent audit)
- **Screen ↔ screen / wizard Next:** React Navigation native-stack default — slide-in from the right, outgoing screen parallax-shifts left, ~350 ms, ease, gesture-interruptible.
- **Drawer:** React Navigation Drawer, `drawerPosition: 'right'`, slide type — drawer in from the right **+ underlying screen pushed left**; close reverses; ~300–500 ms.
- **Bottom sheets:** gorhom spring ~250–300 ms → the demo's `sheetUp` 0.28s already matches. **Leave.**

## Library decision
**`motion` (ex–framer-motion, v12).** Rationale: the hard part of a screen transition is the **exit** animation (the outgoing screen sliding out as it unmounts) plus interruption robustness — `AnimatePresence` solves both correctly; pure CSS requires a hand-rolled keep-mounted controller (a band-aid). The demo is client-only (`next/dynamic ssr:false`) so SSR is a non-issue, and bundle size is irrelevant for a showcase. CSS keyframes stay for the bottom sheets and ambient effects (scan sweep, pulses); `motion` is used **only** for the screen cross-slide + drawer push. Nothing ports as code to RN anyway (RN = Reanimated), so the **Motion Spec** below is the actual template.

## Motion Spec (the RN-portable tokens)
Centralized in `features/demo/ui/motion.ts` and consumed by the motion components.

| Token | Value | Used by |
|---|---|---|
| `DUR.screen` | 0.34 s | screen cross-slide |
| `DUR.drawer` | 0.3 s | drawer slide + screen push |
| `EASE.standard` | `[0.32, 0.72, 0, 1]` (iOS-like decelerate) | screen + drawer |
| `screenEnter` (forward) | from `{ x: '100%', opacity: 1 }` → `{ x: 0 }` | incoming screen (Next) |
| `screenExit` (forward) | `{ x: 0 }` → `{ x: '-28%', opacity: 0.6 }` (parallax) | outgoing screen (Next) |
| `screenEnter` (back) | from `{ x: '-28%', opacity: 0.6 }` → `{ x: 0 }` | incoming screen (Prev) |
| `screenExit` (back) | `{ x: 0 }` → `{ x: '100%' }` | outgoing screen (Prev) |
| `DRAWER_W` | 300 px | drawer panel width |
| `DRAWER_PUSH` | −72 px | screen-host translateX while drawer open (tunable; verified visually) |
| reduced-motion | all transforms→none, duration→0 | `useReducedMotion()` |

Direction = sign of `index(next) − index(prev)` in `TOUR_CHAPTERS`; a view outside the chapter order (launchables: OCR/media) → **fade** (no x), since it has no linear position.

## Architecture decisions
| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Cross-slide both screens | `<AnimatePresence mode="sync" initial={false} custom={dir}>` with a keyed `motion.div key={view}` | `sync` keeps both mounted so they slide simultaneously (the iOS feel); `initial={false}` skips the first-mount animation. |
| 2 | Each screen owns its scroll | screen `motion.div` is `position:absolute; inset:0; overflowY:auto; overscrollBehavior:contain` | Both screens must overlay to cross-slide; per-screen scroll replaces the single `data-phone-screen` scroller (which becomes `overflow:hidden`, a pure positioning/clipping context). Matches native (each screen is its own scroll view). |
| 3 | Drawer push | a **push layer** (`motion.div animate={{ x: drawerOpen ? DRAWER_PUSH : 0 }}`) wraps the AnimatePresence; the drawer itself stays portaled in the overlay (PR #18) and slides in from the right | Two independent layers both keyed off `drawerOpen` → screen shifts left while the drawer slides over from the right + scrim dims. |
| 4 | Direction source | DemoExperience tracks `prevView` in a ref; computes `dir` on render via a pure `slideDirection(prev, next)` | No clock/random (determinism rule); pure + unit-testable. |
| 5 | Drawer = motion | `WizardDrawer` panel becomes `motion.div` with enter `{x:'100%'}→{x:0}` / exit `{x:0}→{x:'100%'}` + backdrop fade, inside its own `AnimatePresence` (in DemoExperience where it's conditionally rendered) | Real enter **and exit** (CSS `screenIn` had no exit); from the right to match the phone. |
| 6 | A11y | `useReducedMotion()` collapses all transforms/durations | Respect `prefers-reduced-motion`. |
| 7 | Store-bridge intact | DemoExperience stays the only store-touching component; `drawerOpen`/`view` already there; new transition wrapper is presentational | Unchanged architecture. |

## Implementation phases
**Phase 1 — Motion spec + direction logic (pure, TDD).**
`features/demo/ui/motion.ts`: the tokens + variant factories + `slideDirection(prev, next): 'forward'|'back'|'none'`. Unit tests for `slideDirection` (forward, back, same, launchable→none). Gate: test + tsc.

**Phase 2 — Screen transition host.**
New `features/demo/ui/ScreenStage.tsx` (presentational): props `{ view, direction, drawerOpen, children }` → push layer + `AnimatePresence` + keyed slide `motion.div`. `features/demo/ui/PhoneFrame.tsx`: `data-phone-screen` → `overflow:hidden`. `DemoExperience.tsx`: track `prevView` ref, wrap `activeScreen()` in `<ScreenStage>`. Gate: sandbox tests green (content still queryable through motion), tsc.

**Phase 3 — Drawer push + right slide.**
`WizardDrawer.tsx`: panel → `motion.div` from the right (enter/exit), wrapped in `AnimatePresence`; right-anchored (`right:0`). DemoExperience passes `drawerOpen` into `ScreenStage` for the push. Gate: WizardDrawer tests updated (portal + dismiss still green; assert it renders), tsc.

**Phase 4 — Verify + tune.**
`pnpm test` + tsc + build + coverage. Visual pass with chrome-devtools (dev server): trigger Next/Prev + drawer, screenshot, tune `DRAWER_PUSH`/easing.

## Test spec
- **`motion.test.ts`** (pure): `slideDirection` — `('cases','submission')→forward`, `('submission','cases')→back`, same→`none`/no-op, `(_, 'ocr')`/launchable→`none` (fade).
- **Existing suites stay green:** `DemoExperience.sandbox`, `appChapters`, `WizardDrawer`, `PhoneFrame`, `modals`, `a11y` — motion renders children in jsdom (animations are no-ops; matchMedia stub → reduced-motion path is harmless). Assertions query by text/role, position-independent.
- **No new engine tests** (no engine changes). Coverage gate holds (`features/demo/ui/**` excluded; the one pure helper `motion.ts` is UI-layer but unit-tested behaviorally).

## Out of scope
Bottom sheets (already perfect), the ambient HUD/scan/pulse animations, gesture/swipe nav (demo is click-only), and the phone's misc micro-animations (accordion spring, progress bar) beyond what already exists.
