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

---

## Fix-delta r1

**Range:** `41f4a93..15b683b` (fix round 1, R-1..R-19; §88 dispositions)
**Gates re-run:** cold `pnpm exec tsc --noEmit --incremental false` → **clean** (9.3 s user, full
program). Targeted suites (`boot`, `BootSequence`, `SplashScreen`, `DemoExperience.boot`,
`DemoExperience.boot-boundary`, `boot-activation`, `persistence`, `store`) → **8 files / 165 tests
green**. All probes run in a private detached worktree at `15b683b`; every probe file removed,
nothing committed.

**Disposition: 5/5 of my findings FIXED. 0 regressions of substance. 2 new LOW.**

| Mine | Commit | Disposition | Verified how |
|---|---|---|---|
| M1 — unscoped `<video onError>` | `ec22c6e` (+`a5ea4b1`) | **FIXED** | probe re-run, both arms |
| M2 — Escape collision with `ExitDialog` | `9418c2f` (+`fe24e9c`) | **FIXED** | probe re-run, both directions |
| M3 — hand partitions over `BootPhase` | `44c82c2` | **FIXED** | growth probe: 3 errors → 4 |
| L1 — §84f `videoSrc`/`videoPoster` pair | `2c08673` | **FIXED** | half-flip probe now `TS2741` |
| L2(b) — the `splash` arm double-boot | `1dcfcbe` | **FIXED** | tampered-snapshot probe |
| L2(a) — video phases by convention | — | unchanged, as filed (I asked for no change) | n/a |

### M1 — FIXED, and better than I asked for

`onError` is now `handleVideoError` (`BootSequence.tsx:167-175`), phase-scoped exactly as the fix
shape asked: pre-surface → `setVideoFailed(true)`, which feeds `liveVideo = null` into the machine
(`:110`) so `authorized` takes the already-built no-video route; on-surface → `setPhase('fading')`.
Both arms breadcrumb with `[demo/boot]` and the element's `MediaError.code`/`message`. Re-ran my
original probe inverted:

```tsx
render(<BootSequence video={VID} onComplete={onComplete} />)
fireEvent.error(screen.getByTestId('demo-boot-video'))          // the preload 404, during idle
expect(onComplete).not.toHaveBeenCalled()                        // ✅ was: called once
expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()      // ✅ the boot survives
expect(warn.mock.calls[0].join(' ')).toMatch(/\[demo\/boot\].*continuing without it/)  // ✅
tap(); tick(SCAN_MS); tick(AUTHORIZED_MS); tick(FADE_MS)
expect(onComplete).toHaveBeenCalledOnce()                        // ✅ full no-video route
```

and the on-surface arm fades rather than cuts (`onComplete` silent until `tick(FADE_MS)`). My
secondary §84a note — that the cited `startFadeOut()` precedent fades where the code hard-cut — is
closed too, and `a5ea4b1` found an unbounded wait I had missed (`video` is the one phase with
`PHASE_MS === null` *and* an exit outside the app). §88a's two carried-forward shapes are the right
generalisations of the defect, and its note that the R-17 flip probe "reds nothing now, and before
the round it red three tests" is the honest version of what §87d had claimed.

**§88a's disclosed extension — `play()` rejection fades rather than cuts (`:190-193`): SOUND, and
disclose-not-smuggle was the right call.** It makes the three video failure modes (load error,
playback error, autoplay rejection) exit through one door, and that door is the phone's. The
consequence worth stating: after this round the *only* hard cuts to `done` left are SKIP and
Escape, which should be instant. That is a coherent rule, not a residue.

### M2 — FIXED

`ExitDialog.tsx:27-36` now `stopPropagation()`s after `onStay()` — the exact fix shape, and
correctly justified in-comment against the `escapeEnabled?: boolean` alternative on §84f grounds.
Probe re-run, both directions:

```tsx
fireEvent.click(screen.getByRole('link', { name: /back to site/i }))
fireEvent.keyDown(document, { key: 'Escape' })
expect(screen.queryByRole('dialog', { name: 'Before you go' })).toBeNull()
expect(screen.getByTestId('demo-boot')).toBeInTheDocument()   // ✅ boot survives (was: gone)
// and with no dialog open, Escape still skips:                  ✅
```

**§88d's escalation is right and worth endorsing.** The review offered to leave the gate's
window-`keydown` cleanup unpinned; R-7 changed the calculus, because a leaked handler is no longer
a harmless `setPhase` on a dead tree — it would answer Escape *underneath* a live dialog, i.e.
silently re-open the exact defect the `stopPropagation` closes. Pinning by handler identity is the
correct pin: it is the ordering, not the mere presence, that R-7 made load-bearing.

### M3 — FIXED, numbers confirmed

`SURFACE: Record<BootPhase, 'hud' | 'video'>` + `bootSurface()` replaces the deny-list; the
component now reads `bootSurface(phase) === 'video'` (`:228`). Growth probe (`+'zzz'` to
`BootPhase`, cold `tsc`) — **four** errors where my initial round measured three, and the new one is
the surface:

```
boot.ts(147,7)  TS2741 'zzz' missing in Record<BootPhase, number | null>          ← PHASE_MS
boot.ts(179,7)  TS2741 'zzz' missing in Record<BootPhase, "video" | "hud">        ← SURFACE  (new)
boot.ts(206,67) TS2366 Function lacks ending return statement                     ← nextBootPhase
boot.ts(227,7)  TS2741 'zzz' missing in Record<BootPhase, BootHudState>           ← HUD_STATE
```

§88b's count is exactly right. `BOOT_PHASES = Object.keys(PHASE_MS) as readonly BootPhase[]`
(R-11b) is the one new `as` in the diff and it is the justified idiom — keys of a total record,
derived rather than hand-listed, which is what makes the "total over the phase union" tests
actually total. No objection.

### L1 / L2(b) — FIXED

`BOOT_VIDEO: BootVideo | null` (`boot.ts:96-126`). Half-flip probe:
`BOOT_VIDEO = { poster: '/p.jpg' }` → `boot.ts(126,14): TS2741: Property 'src' is missing in type
'{ poster: string; }' but required in type 'BootVideo'`. The third state is closed and the drop-in
procedure is now one constant, which is the better seam I asked for.

`persistence.ts:554-561` normalizes `splash` on both `restoredChapter` and `restoredView`, ordered
before the wizard-screen block so a `splash` view with a non-null location still resolves sanely.
Probe: a tampered `{ view: 'splash', currentChapter: 'splash' }` snapshot restores to
`cases`/`cases`. ✅ The `case 'splash'` arm survives as the honest total-switch answer, and its
comment's claim moved from "convention" to "construction" — which is now true.

### §88c — the self-catch, verified

Probed independently: adding a fourth member to `BOOT_HUD_STATES` yields **exactly one** error —
`SplashScreen.tsx(58,9): TS2741: Property 'failed' is missing … Record<"idle" | "scanning" |
"authorized" | "failed", ReactNode>`. `HUD_STATE` stays green, precisely as the corrected comments
in both files now say. The claim the author caught itself making (that `HUD_STATE` helps close
`BootHudState`) was indeed false, and both replacement comments state the probed result rather than
a guarantee. This is §84a applied to a fix for a §84a-shaped finding, and it is the strongest
process signal in the round — it should be the template for future ledger entries: **name the
mechanism, run it, put the output in the comment.**

---

### New — fix-introduced

#### [LOW] N1 — the stall watchdog measures wall clock from phase entry, not time since progress

**File:** `features/demo/ui/screens/BootSequence.tsx:211-222` (with `:49-51`)

The ceiling is armed once on entering `video` and only re-armed when `videoDurationMs` changes —
which normally happens *before* the phase (metadata preloads during the scan). So the budget is
`duration + 5 s` of **wall clock from playback start**, i.e. a total rebuffering allowance for the
whole intro, not a stall detector. A video that is demonstrably alive gets cut with the same
breadcrumb as a frozen one. Probed:

```tsx
Object.defineProperty(el, 'duration', { value: 10 }); fireEvent.loadedMetadata(el)   // a 10 s intro
tap(); tick(SCAN_MS); tick(AUTHORIZED_MS)                                            // -> 'video'
for (let i = 0; i < 16; i++) { tick(1000); fireEvent.timeUpdate(el) }                 // alive throughout
expect(warn).toMatch(/never finished within 15000 ms/)   // ✅ fired despite live progress
tick(FADE_MS); expect(onComplete).toHaveBeenCalledOnce() // ✅ the healthy intro was cut short
```

This contradicts the constant's own stated intent — "Generous on purpose — it exists to end a
stall, **never to cut a healthy intro short**" (`:46-48`) — which is why it is filed rather than
left. LOW, not MEDIUM, on three counts: latent until drop-in; `preload="auto"` plus the unbounded
`idle` gesture dwell means a short portrait intro is usually fully buffered before playback starts;
and the failure mode is the graceful fade plus a breadcrumb, not a hang.

**Fix shape (small).** Make the deadline mean "since last progress": add `onTimeUpdate` (or
`onProgress`) that stores `el.currentTime` in a ref and bumps a tick the watchdog effect depends
on — or, cheaper, have the watchdog fire on a repeating interval and only exit when `currentTime`
has not advanced since the previous sample. Either turns `VIDEO_OVERRUN_MS` into what its name
already implies. Keep `VIDEO_CEILING_MS` as the pre-metadata flat bound.

#### [LOW] N2 — §88b's "last hand partition over `BootPhase`" is now off by two, both added this round

**File:** ledger §88b vs `features/demo/ui/screens/BootSequence.tsx:126`, `:171`/`:173`, `:264`

R-11 converted the one partition that pointed the unsafe way, and §88b rules that the container
opacity check stays inline deliberately — both correct, and I am **not** asking for either to
change (converting the opacity check would reverse a ruling). The record-keeping is what drifted:
after this round there are **three** inline partitions over `BootPhase` in the component, two of
them created by fixes that landed *after* R-11 and are unmentioned by §88b:

| Site | Shape | Default for a new phase |
|---|---|---|
| `:264` opacity | allow-list `'fading' \| 'done'` | fully visible — **safe** (the blessed one) |
| `:126` R-14 reduced-motion collapse | deny-list `!== 'idle' && !== 'done'` | collapse to `done` — safe |
| `:171`/`:173` R-1a error scope | allow-list `'video' \| 'holding'` | degrade to no-video — safe |

All three defaults are safe, so this is a docs-accuracy finding, not a code one: §88b's heading
("`bootSurface` is the last hand partition over `BootPhase`") plus its "the opacity check is
DELIBERATELY still an inline partition" reads as *exactly one remains*, and a future reader
auditing growth safety will stop at one and miss two. One sentence in §88b naming all three, with
the safe-default column, keeps the ruling and makes it true.

#### Note (not filed) — `videoFailed` re-arms the current phase's timer at full length

`liveVideo` (`:110`) is in `advance`'s dep list (`:114`), which is in the timer effect's dep list
(`:133`). So flipping `videoFailed` tears down and re-arms the in-flight dwell: a preload error at
t = 390 ms of `scanning` makes that scan run ~790 ms. Same mechanism R-14 just fixed for
`reduceMotion`, but one-shot, on a failure path, and purely cosmetic — noted so a future reader who
finds it knows it was seen, not filed.

---

## Fix-delta Summary

| Severity | Initial | Fixed | Remaining | New |
|---|---|---|---|---|
| CRITICAL | 0 | — | 0 | 0 |
| HIGH | 0 | — | 0 | 0 |
| MEDIUM | 3 | 3 | 0 | 0 |
| LOW | 2 | 2 | 0 | 2 |

Store-bridge integrity: **preserved** (`booting` still mount-scoped; the R-12 `setView` replay and
R-2 focus hand-off are both bridge-local, and `visit()` is identity-preserving so the replay is a
true no-op on a restored view)
Engine purity: **preserved** (`boot.ts` grew `BOOT_HUD_STATES`, `BOOT_PHASES`, `SURFACE`,
`BootVideo` — still no React, no `'use client'`, no browser globals, no clock)
Barrel + marketing/demo isolation: **preserved** (public barrel untouched; `boot.ts` still off the
engine barrel)
Determinism seam: **preserved** (the watchdog and the duration read are `setTimeout` + element
metadata; no wall-clock read anywhere)

**Verdict: APPROVE**

Notes: 5/5 fixed, all verified by re-run probe rather than by reading the diff. The two new LOWs are
a watchdog-tuning gap (N1) and a ledger-accuracy gap (N2) — neither blocks. §88a's extension and
§88c's self-catch both check out; §88c in particular is the round's best artifact.
