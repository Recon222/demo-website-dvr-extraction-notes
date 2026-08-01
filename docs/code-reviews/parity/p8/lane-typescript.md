# P8 review — TypeScript lane

**PR:** #37 · `master..feat/parity-p8` @ `41f4a93` (single package, P8.1 — boot experience)
**Lane:** `typescript-reviewer` (type safety, async correctness, error handling, RSC boundaries,
demo-architecture compliance)
**Gates:** cold `pnpm exec tsc --noEmit --incremental false` → **clean** (9.6 s user, full program;
the checked-in `tsconfig.tsbuildinfo` makes a bare `tsc --noEmit` a 1.6 s incremental run, so it was
re-run with `--incremental false`). Targeted suites (`boot`, `BootSequence`, `SplashScreen`,
`DemoExperience.boot`, `content`, `explore`) → **6 files / 70 tests green**.
**Probes:** run in a private detached worktree (`scratchpad/probe-p8`, shared `node_modules`);
all probe files reverted, nothing committed.

---

## Verdict

**APPROVE with comments.** No CRITICAL, no HIGH. Three MEDIUM, two LOW. The phase machine is the
strongest thing in the package — the totality claim is real and I proved it — and every one of the
findings below sits in `BootSequence.tsx`, in the seam between that verified machine and the DOM.

---

## What I verified rather than assumed

### The union and the two total records ARE compile-forced (the lane's headline question)

Probe: added `'zzz'` to `BootPhase` in the probe worktree, ran a cold `tsc`. **Three diagnostics,
one per site:**

```
boot.ts(117,7): error TS2741: Property 'zzz' is missing in type '{ idle: null; scanning: number; … }'
                but required in type 'Record<BootPhase, number | null>'.        ← PHASE_MS
boot.ts(143,67): error TS2366: Function lacks ending return statement and return type
                does not include 'undefined'.                                    ← nextBootPhase
boot.ts(164,7): error TS2741: Property 'zzz' is missing in type '{ idle: "idle"; … }'
                but required in type 'Record<BootPhase, BootHudState>'.          ← HUD_STATE
```

So `PHASE_MS` and `HUD_STATE` are genuinely total, and `nextBootPhase`'s `default`-less switch is
exhaustive-**by-construction** under `strictNullChecks` — TS2366 does the work an
`assertNever(phase)` default would, *and* the absence of a `default:` is what keeps it doing it
(a `default: assertNever(...)` arm would silence TS2366 and downgrade the guarantee to a runtime
throw). That is the right call and worth preserving; M3 below is the one place the same union is
re-partitioned by hand instead.

### Everything else on the lane checklist

| Check | Result |
|---|---|
| Engine purity (`engine/logic/boot.ts`) | **preserved** — no `react` import, no `'use client'`, no `window`/`document`, no clock read. Grep-clean. |
| Store bridge | **preserved** — `booting` is `useState` in `DemoExperience` only (`:485`); `BootSequence`/`SplashScreen` are prop+callback only; no `useStore` added under `ui/`. |
| Single barrel | **preserved** — `features/demo/index.ts` untouched (still `DemoExperience` + `clearDemoSnapshot`). `boot.ts` is deliberately *not* on `engine/index.ts`, matching the `logic/import-log` R-10 precedent (no barrel widening for one consumer); the two consumers use the permitted aliased internal path, same as `logic/form-visibility` at `DemoExperience.tsx:77`. No dead exports. |
| Marketing↔demo isolation | **n/a** — no marketing file touched; `app/demo/page.tsx` is the demo route. |
| Determinism seam | **preserved** — no `Date.now()`/`Math.random()` anywhere in the new code; dwells are constants, tests drive fake timers. (Matches the PR's no-clock-seam note.) |
| `isolatedModules` | clean — `import type { CSSProperties }`, `import type { BootHudState }`, inline `type BootPhase` modifier, `export type AuthState = BootHudState`. |
| `any` / unsafe casts / non-null | none. `const started: unknown = el.play()` + `instanceof Promise` narrowing (`BootSequence.tsx:127-128`) is the house `unknown`-not-`any` pattern, and it correctly tolerates a `play()` that returns `undefined`. |
| `'use client'` | `BootSequence.tsx` has it; `boot.ts` correctly does not. |
| `aria-disabled` + guarded handler | the `ModalActions` precedent (`_shared.tsx:534-535`) is carried in full: `onClick={idle ? onScan : undefined}` (`SplashScreen.tsx:132`) honours the "the caller MUST guard" half. |

### §84a sweep — every precedent the new comments cite, opened

All of these check out (this is the standing lesson's whole point, so it was done exhaustively):

- `AuthenticatedSplashScreen.tsx:30` (720×1280), `:33` (`HOLD_DURATION_MS = 500`), `:36`
  (`FADE_DURATION_MS = 300`), `:52` (`SplashPhase`), `:126-130` (appLock skip), `:249-269`
  (video always mounted to preload), `:288` (`backgroundColor: '#000314'`) — **all accurate.**
- `scanner-hud-constants.ts:82` (`DOTS_INTERVAL_MS = 400`), `:91` (`AUTHORIZED_DISPLAY_MS = 800`),
  `:171-172` (`STATUS_AREA_MIN_HEIGHT = 100`; demo uses 68 and says "scaled to these type sizes") — **accurate.**
- `app/_layout.tsx:137` (`useState(true)` for `showSplash`), `:214-222` (`if (showSplash) return …`) — **accurate**, and the gate-not-view shape genuinely mirrors it.
- `ScreenStage.tsx:39-49` (instant-complete under reduced motion) — **accurate.**
- `_shared.tsx:103` (ModalShell Escape) and `_shared.tsx:534-535` (ModalActions) — accurate as
  citations; M2 is about the *layering* the ModalShell idiom implies, not the citation.
- `AudioRecorderScreen.tsx:84-86` ("the owner of the sequence resolves reduced motion once") — **accurate.**

One prose nit, not a finding: `DemoExperience.tsx:2963` says the gate means "no screen effects
firing behind a curtain". True of the *screen component* subtree (it is unmounted), but the
bridge's own `view`-keyed effects still run behind the gate — the map-module prefetch (`:973`),
`reconcileNotes` (`:1032`), the retention derivation (`:1010`) and the Completed-By autofill
(`:1080`) all fire while `booting` is true if the snapshot restored their view. I traced each:
every one is idempotent and does exactly what it would do without the gate, so there is no
behavioural consequence — the sentence is just slightly wider than the code.

---

## Findings

### [MEDIUM] M1 — `<video onError>` is not phase-scoped, so a video that fails to LOAD deletes the whole boot sequence

**File:** `features/demo/ui/screens/BootSequence.tsx:152-165` (specifically `:162` `onError={skip}`),
with `:89` (`skip`) and `:131` (`hasVideo`)

**Issue.** The `<video>` deliberately mounts from the first frame with `preload="auto"` so it
buffers behind the HUD — correct, and it is the phone's trick. But `onError` is wired to `skip`
unconditionally, and a *load* error (404, wrong path, undecodable codec, CDN blip) fires during
`idle`/`scanning` — before the video phase exists. The result is not "the video is skipped"; it is
"the entire boot sequence is skipped", before the visitor has seen the scan or tapped anything, with
no console breadcrumb. The no-video route (`authorized → fading`) is already implemented and is the
correct degrade, but nothing routes to it.

**Evidence — reproduced** (probe test, run green, then reverted):

```tsx
render(<BootSequence videoSrc="/demo-media/typo.mp4" onComplete={onComplete} />)
expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
fireEvent.error(screen.getByTestId('demo-boot-video'))   // the preload 404
expect(onComplete).toHaveBeenCalledOnce()                // ✅ passes — whole sequence gone
```

The shipped suite's error test (`BootSequence.test.tsx:114-121`) fires `error` only *after*
`tickThrough(SCAN_MS, AUTHORIZED_MS)`, i.e. only in the one phase where ending the sequence is the
right answer — so the case is untested as well as unhandled.

Why this matters despite `BOOT_VIDEO_SRC` being `null`: the drop-in seam is a *deliverable* of this
package (§87d, and `boot.ts:73-91`'s "That is the whole change ... nothing needs restructuring").
As written, a typo in one of the two constants — or a `public/demo-media/` file that doesn't make it
into a deploy — silently removes the feature P8 exists to add, and does it identically in production
and in a local dev check, so it will read as "the boot just doesn't run any more". Latent today;
HIGH the moment the constant flips.

Secondary, same line: `skip` jumps straight to `'done'`, so `onComplete` fires in the same commit and
the parent unmounts before the 300 ms opacity transition can paint. The cited precedent
(`AuthenticatedSplashScreen.tsx:173-201`) calls `startFadeOut()` — it fades. Hard-cutting is
defensible for *SKIP* (a skip should be instant); it is the §84a shape for the *error* path, whose
comment claims to match the phone.

**Fix shape.** Scope the error by phase, and degrade rather than abort:

- `onError` → set a `videoFailed` state; feed `advance` an effective source
  (`videoFailed ? null : videoSrc`) so `authorized` routes to `fading` exactly as the null-source
  path already does, and so `showVideo` stops claiming the surface.
- Only when `phase === 'video'` should the failure advance the sequence (to `fading`, not `done`,
  matching `startFadeOut`).
- Add the operator breadcrumb the repo already uses for exactly this class of invisible failure
  (`console.warn`, the `extract-client.ts` precedent; the phone logs `[AuthSplash] Video load error`).
- Pin both arms: error-during-`idle` → scan still runs and completes without the video;
  error-during-`video` → fades to completion.

---

### [MEDIUM] M2 — `BootSequence`'s window-level Escape listener fires underneath the page-level `ExitDialog`

**File:** `features/demo/ui/screens/BootSequence.tsx:109-115`; collides with
`features/demo/ui/controls/ExitDialog.tsx:24-31`

**Issue.** `BootSequence` registers an unconditional `window` `keydown` handler that treats any
Escape as SKIP. The rail sits outside the gate and stays clickable during boot (deliberate, §87c),
so its Back-to-site link can open `ExitDialog` while the gate is up. `ExitDialog` owns Escape as
"Keep exploring" — but it neither stops propagation nor knows about the gate, so a single Escape
dismisses the dialog **and** silently skips the boot the visitor never asked to skip. Escape acquires
a second, undisclosed effect exactly when a modal is on screen, which is the one situation the
repo's Escape idiom (topmost dismissible owns the key) exists to prevent.

**Evidence — reproduced** (probe test, run green, then reverted):

```tsx
render(<DemoExperience boot />)
fireEvent.click(screen.getByRole('link', { name: /back to site/i }))
expect(screen.getByRole('dialog', { name: 'Before you go' })).toBeInTheDocument()
fireEvent.keyDown(document, { key: 'Escape' })
expect(screen.queryByRole('dialog', { name: 'Before you go' })).toBeNull()
expect(screen.queryByTestId('demo-boot')).toBeNull()   // ✅ passes — boot gone too
```

This is reachable on the shipping `/demo` route today (no video needed): a first-time visitor always
has unlit manifest rows, so Back-to-site always opens the dialog.

Note the same listener is live in the `case 'splash'` view arm (`DemoExperience.tsx:2457-2467`),
where it makes Escape a global "navigate to Cases" binding on an ordinary app screen — same root
cause, so one fix covers both.

**Fix shape.** Cheapest correct fix exploits the existing dispatch order: `ExitDialog` binds on
`document` and `BootSequence` on `window`, so the dialog's handler already runs **first** — have it
`e.stopPropagation()` after `onStay()`. That states the "topmost dismissible owns Escape" rule in
one line and needs no new prop. (`ModalShell` and `AlertDialog` also bind on `document`, so the same
line generalises if a future overlay can coexist with the gate.) If a prop is preferred instead,
avoid a bare `escapeEnabled?: boolean` — that is another §84f correlated optional.

---

### [MEDIUM] M3 — the phase union is total at three sites and hand-partitioned at two more, both in the component

**File:** `features/demo/ui/screens/BootSequence.tsx:135` and `:148`
(completeness sweep against `features/demo/engine/logic/boot.ts:117-125`, `:143-160`, `:164-172`)

**Issue.** `boot.ts` goes to real trouble to make the union total — and, as probed above, succeeds at
all three of its own sites. `BootSequence` then re-derives two more partitions of the *same* union by
hand, as negative lists:

```tsx
const showVideo = hasVideo && phase !== 'idle' && phase !== 'scanning' && phase !== 'authorized'   // :135
opacity: phase === 'fading' || phase === 'done' ? 0 : 1,                                           // :148
```

Neither is compile-forced. A phase inserted anywhere before `video` (the obvious future one:
an `unlocking`/`doors` beat between `authorized` and `video`) gets a dwell decision and a HUD
decision forced by the compiler, then silently falls into "show the video" and "render fully
opaque" — the video takes the surface a phase early, and a new terminal phase paints an opaque
black rectangle over the app. `boot.ts:116`'s "A TOTAL record, so a phase added to the union cannot
ship without a dwell decision" is exactly right, and exactly the reason the two uncovered
partitions read as covered.

`:120` (`if (phase !== 'video') return`) is fine — a positive check fails safe.

**Fix shape.** Move the surface decision into `boot.ts` beside its two siblings, in the same
`Record<BootPhase, …>` + accessor shape the module already uses — e.g.
`const SURFACE: Record<BootPhase, 'hud' | 'video'>` with `bootSurface(phase)`, and derive
`showVideo = hasVideo && bootSurface(phase) === 'video'`. The opacity check wants the same
treatment (`const VISIBLE: Record<BootPhase, boolean>` or a `bootOpacity`), which also puts the
"`done` stays hidden" reasoning currently living in a comment at `:146-147` where the compiler can
hold it. Three total records instead of two, and the union's guarantee becomes true everywhere it
is claimed.

(Adjacent, test lane's call: `boot.test.ts:16`'s `ALL_PHASES` is a fourth hand-maintained copy of
the union, typed `readonly BootPhase[]` so it accepts a stale list silently. `Object.keys` over one
of the total records would make the "is total over the phase union" tests actually total. Mentioned
here only because it is the same set; not filed as a separate finding.)

---

### [LOW] L1 — `videoSrc`/`videoPoster` are correlated optionals: the §84f third state compiles

**File:** `features/demo/ui/screens/BootSequence.tsx:15-23`

**Issue.** `videoPoster` is meaningful only when `videoSrc !== null` — it is consumed at `:157`
inside a block gated on `hasVideo`. The type permits the pair that means nothing. Probed:

```tsx
<BootSequence videoSrc={null} videoPoster="/demo-media/boot-intro-poster.jpg" onComplete={…} />
// compiles clean
```

This is the shape §84f recorded as a trap-not-bug and closed by type in the P7 fix round ("when a
fix adds two props that are only meaningful together, it has added a third state nobody wants").
Weaker than §84f's own two instances — the bad state here has **no** observable consequence (the
poster is simply never read), which is why it is LOW rather than MEDIUM — but it is armed on the
one path this package advertises: the owner editing two independent `string | null` module
constants, where setting one and forgetting the other is the natural slip. (The engine suite's
"both are still null" assertion does catch a half-flip, which is most of the mitigation.)

**Fix shape.** One member: `video: { src: string; poster?: string } | null`, and the two constants
become one `BOOT_VIDEO: { src: string; poster?: string } | null = null`. That also collapses the
drop-in from "change these two constants" to "change this one", which is a better seam than the
one documented. Shared surface with the type-design lane — dedupe if it also files it.

---

### [LOW] L2 — the video phases are unreachable by *convention*, not by construction; and the `case 'splash'` arm can boot twice

**File:** `features/demo/engine/logic/boot.ts:152-155`; `features/demo/ui/DemoExperience.tsx:2457-2467`

Two halves of the lane's "is `video → holding → fading` unreachable-by-construction while `src` is
null?" question, answered:

**(a) Convention, not construction.** `nextBootPhase('video', { videoSrc: null, … })` returns
`'holding'` — the `case 'video'` and `case 'holding'` arms don't consult `cfg.videoSrc`, only
`case 'authorized'` does. Nothing in the type stops a caller from walking the video phases with a
null source. In `BootSequence` it is genuinely unreachable: `hasVideo` false ⇒ no `<video>` ⇒ no
`onEnded`, and the only other `advance` callers are the phase timer and `onScan`. So there is no
bug, and the outcome would be benign anyway (an extra 500 ms `holding` before the same `fading →
done`). Recording it because the doc at `boot.ts:31-34` reads as a construction guarantee ("routes
around them when `videoSrc` is null") when it is a single-branch convention that a second consumer
would not inherit. No change required; if one is wanted, the honest version is a config-parameterised
successor table rather than more branches.

**(b) The splash arm double-boots.** `loadSnapshot` passes `view: 'splash'` through untouched
(`persistence.ts:509`, `:553` — splash is neither launchable nor a wizard screen, so neither
adjustment applies), and `isAppView` accepts it because `'splash'` is `CHAPTERS[0]`. With the
route-owned gate also on, the gate runs, lifts onto `view: 'splash'`, and the arm mounts a *second*
`BootSequence` at `idle` — the visitor scans twice. Probed and confirmed green:

```tsx
store.setState({ view: 'splash' })
render(<DemoExperience store={store} boot />)
tap(); run()                                         // scan #1 — the gate
expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()   // ✅ still a scanner
tap(); run()                                         // scan #2 — the view arm
expect(store.getState().view).toBe('cases')
```

LOW because I could not find a writer: nothing calls `setView('splash')`, and `prevVisibleChapter`
can't reach it either — `onPrev` is wired only to wizard screens' `onBack`
(`DemoExperience.tsx:2511-2719`) and reads `currentChapter`, which `setView` only ever promotes to
the view it just set, so the worst Back lands on `'cases'`. So the state is reachable only from a
hand-edited or foreign `sessionStorage` snapshot, and it self-heals on the second completion. The
arm's own comment ("a restored snapshot can carry it") is therefore *technically* true and worth
keeping as defence — it just describes a snapshot this build cannot produce. If a cheap belt is
wanted, `restoredView === 'splash' → 'cases'` in `loadSnapshot` alongside the launchable adjustment
would delete the double-scan and the dead arm together.

---

## TypeScript Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 2 |

Store-bridge integrity: **preserved** (`booting` is bridge-local `useState`; no store or snapshot leak, no `useStore` added under `ui/`)
Engine purity: **preserved** (`engine/logic/boot.ts` — no React, no `'use client'`, no browser globals, no clock)
Barrel + marketing/demo isolation: **preserved** (public barrel untouched; `boot.ts` correctly off the engine barrel per the R-10 `import-log` precedent)
Determinism seam: **preserved** (no `Date.now()`/`Math.random()`; dwells are constants, tests use fake timers)

**Verdict: APPROVE with comments**

Notes: the machine itself is the best part — `PHASE_MS`, `HUD_STATE` and the `default`-less
`nextBootPhase` switch are all compile-forced (probed: TS2741 ×2 + TS2366). All three MEDIUMs live
in `BootSequence.tsx`, where that verified union meets the DOM: an unscoped `<video onError>` (M1,
reproduced), an unscoped window Escape listener (M2, reproduced), and two hand-rolled phase
partitions the compiler doesn't cover (M3).
