# P8 — lane: silent failures

**PR:** #37 · `master..feat/parity-p8` @ `41f4a93` · package P8.1 (boot experience, matrix rows 1–2, decision D7)
**Lane:** silent-failure-hunter (zero tolerance: swallowed errors, collapsed causes, undeclared fallbacks, dead recovery paths)
**Method:** read every changed file; traced each error/degradation surface end to end; ran 8 adversarial probes in a scratch worktree suite (deleted after — nothing committed); cross-read the phone original (`src/features/biometrics/components/AuthenticatedSplashScreen.tsx`) for the error handling this port cites as its model.
**Pre-flight:** the four P8 suites are green (46 tests, 4 files). All findings below are additive.

---

## What I checked and found clean (so it is not re-checked in the fix round)

- **The phase machine is total and compile-guarded.** `PHASE_MS` and `HUD_STATE` are `Record<BootPhase, …>`; `nextBootPhase`'s switch has no `default:`, so adding a phase is a TS2366, not a silent `undefined`. `nextBootPhase('done', …)` returns `null` first, before the reduced-motion collapse, so there is no `done → done` spin. `advance` uses `?? p` so a null successor is a same-reference `setState` and does not re-render. No finding.
- **Completion fires exactly once.** `completedRef` guards a re-fired effect and a fresh `onComplete` identity each render; pinned by test.
- **Timer cleanup is correct on every branch.** One timer, armed only for a non-null dwell, cleared in the effect's cleanup. `advance`'s identity only moves on `videoSrc`/`reduceMotion`; a mid-phase reduced-motion flip clears-and-rearms, which restarts the dwell but cannot double-advance (React runs cleanup before the re-arm). Unmount mid-phase clears the timer and removes the keydown listener. **No leak, no double-advance.**
- **`play()` rejection genuinely ends the sequence** — probe P3: `play()` → `Promise.reject` → `onComplete` fires once. The autoplay-policy arm of the ladder works.
- **The simulation disclosure is real and AT-reachable.** The standing line renders in all three HUD states (`SplashScreen.tsx:112-124`, pinned by `it.each` over `AuthState`); it is a DOM sibling *before* the full-bleed button, so it is in the a11y tree ahead of the control; the button's own `aria-label` carries the word "simulated"; the rail tip carries a second, independent disclosure (`narration.ts` `splash.tip`, pinned in `content.test.ts`). The button stays mounted + `aria-disabled` rather than `disabled`, so focus is not dropped. **This part is done properly — the honesty bar is met.**
- **Boot as a gate, not a view, does not strand persistence.** `persistDemoStore` is wired at `DemoExperience.tsx:596-608`, *above* the gate conditional, so the snapshot subscription is live while the gate is up. The restored `view` is untouched (pinned by the bridge suite). No finding.
- **No stale-async-write surface.** Boot writes no store state; the only store write in the whole package is `setView` from the rail jump and the splash arm's `onComplete`. No generation token needed.

---

## Findings

### [MEDIUM] A render throw inside the boot gate is unrecoverable — the boundary's only exit cannot lift the gate

**File:** `features/demo/ui/DemoExperience.tsx:2960` + `:2966` (gate placed *inside* `DemoErrorBoundary`), `features/demo/ui/chrome/DemoErrorBoundary.tsx:99-104` (`handleReturn`)

```tsx
// DemoExperience.tsx:2960,2966
<DemoErrorBoundary view={view} onReturnToCases={returnToCases}>
{booting ? <BootSequence … onComplete={endBoot} /> : <>
```
```tsx
// DemoErrorBoundary.tsx:99-104 — the ONLY recovery control in the fallback
private handleReturn = () => { this.props.onReturnToCases(); this.setState({ error: null }) }
```

**Adversarial sequence:** anything that throws while rendering the boot subtree (`BootSequence` / `SplashScreen`), on the `/demo` route where `boot` is true.

**Observable wrong behavior (probe-verified):** the boundary catches and renders "Something went wrong" + **Return to Cases**. Clicking it runs `returnToCases()` — which sets `view: 'cases'`, closes the drawer and the modal — and clears the boundary's error. It does **not** touch `booting`. `booting` is still `true`, so `BootSequence` remounts, throws again, and the error card comes straight back. Probe P6 (`SplashScreen` mocked to throw): after the click, `stillShowingTheErrorCard: true`, `casesVisible: false`. There is no other exit — SKIP and the Escape listener live inside the thrown subtree and are unmounted. The visitor cannot reach the demo at all.

Two secondary effects of the same placement: `returnToCases()` also clears drawer/modal state that is already unmounted (harmless), and `FALLBACK_COPY[this.props.view]` keys the fallback copy off the *restored* view, i.e. a screen the visitor is not looking at — during boot it can only ever resolve to `GENERIC_COPY`, so the copy is mis-attributed but not wrong.

**Why MEDIUM and not HIGH:** the failure is loudly *surfaced*; it is the recovery that is a dead control (the lane's "guard-arm no-op / dead button" row). And the boot subtree is pure JSX + `useId` + a `<video>` — there is no realistic throw source today, so the HIGH bar ("a realistic input/state triggers it") is not met. It is a contract gap, not a live break.

**Fix:** lift the gate on recovery — `onReturnToCases={() => { endBoot(); returnToCases() }}`, or move the gate above the boundary so the boundary never owns it. One line either way.

---

### [MEDIUM] A video that fails while it preloads silently destroys the whole boot sequence — disclosure included

*(Latent: fires only once `BOOT_VIDEO_SRC` is set. Re-rate **HIGH** at drop-in.)*

**File:** `features/demo/ui/screens/BootSequence.tsx:152-165`, specifically `:162`

```tsx
<video … preload="auto" onEnded={advance} onError={skip} … />   // :160-162
const skip = useCallback(() => setPhase('done'), [])            // :89
```

**Adversarial input:** the element is mounted **from the first frame** whenever a source exists (`hasVideo &&`, `:152` — the deliberate preload-behind-the-HUD trick), and `preload="auto"` starts fetching immediately. So the `error` event can fire while the phase is `idle` or `scanning` — a mistyped `/demo-media/…` path, a 404 after a deploy that dropped the asset, a network drop mid-fetch on a large intro video. `onError` is wired straight to `skip`, which is not scoped to the video phase.

**Observable wrong behavior (probe P1):** with the HUD still showing **TAP TO SCAN** and no tap yet, firing `error` on the element takes the machine to `done` and `onComplete` fires once — `{ completed: 1, tapToScanStillThere: false }`. On `/demo` that lifts the gate: **the visitor never sees the scan, and never sees the "Simulated scan — a browser tab has no biometric sensor. On the phone this is Face ID." disclosure.** Nothing is logged. The operator's evidence that their intro video is broken is that the boot sequence stopped existing.

The disclosure is P8.1's entire honesty machinery for this surface (§87, `SplashScreen.tsx:110-124`, three tests). A missing asset path should not be able to delete it.

**Note:** `BootSequence.tsx:76-78` and deferred §87d both state that the error path "ends the sequence rather than stranding the visitor". That is true for an error *during* the video and it is the right behavior there; it is the wrong behavior before the video's turn has come. The existing test (`BootSequence.test.tsx:114-121`) only fires `error` after `tickThrough(SCAN_MS, AUTHORIZED_MS)` — the pre-video window is untested.

**Fix:** route the error through a handler that reads the phase. Before `video`: mark the source unusable (a `videoFailed` ref/state) so `nextBootPhase` routes `authorized → fading` exactly as it already does for `videoSrc === null` — the machine needs no change. During `video`: keep today's behavior (advance past it). Plus the breadcrumb in the next finding.

---

### [MEDIUM] The `video` phase has no watchdog — a stall that neither errors nor ends strands the sequence indefinitely

*(Latent: same drop-in trigger.)*

**File:** `features/demo/engine/logic/boot.ts:121` (`video: null`) + `features/demo/ui/screens/BootSequence.tsx:93-98` (no timer for a null dwell) + `:161-162` (only `ended` / `error` leave the phase)

```ts
const PHASE_MS: Record<BootPhase, number | null> = { … video: null, … }   // boot.ts:117-125
```
```tsx
const ms = bootPhaseDurationMs(phase)
if (ms === null) return                 // BootSequence.tsx:95-96 — nothing is armed
```

**Adversarial input:** a slow or flaky connection buffering the intro video over the network. The server accepts the request and sends headers, then stalls (or the buffer underruns mid-playback). The element fires `stalled` / `waiting` — **not** `error`. `ended` never comes. And `play()`'s promise resolves only when playback *begins* and rejects only when it *cannot start*; a media element that stalls at `HAVE_METADATA` leaves it **pending forever**, so the `.catch` at `:128` never runs either.

**Observable wrong behavior (probe P2):** enter `video`, dispatch `stalled` + `waiting`, advance the clock **ten minutes** → `{ completedAfterTenMinutes: 0, hudVisible: false, videoOpacity: '1' }`. The HUD is gone (`showHud = !showVideo`, `:135-136`), the video is opaque and empty. The visitor is looking at a black rectangle inside the phone frame with a small SKIP pill, forever, with no indication anything is wrong. Nothing is logged. `video` is the only phase in the machine whose exit is entirely outside the app's control, and it is the one phase with no upper bound.

The SKIP button and Escape mean nobody is *trapped* — which is exactly why this is MEDIUM and not HIGH — but "the visitor can manually escape a hang they were never told about" is not the same as the sequence handling it.

**Fix:** arm a watchdog on entry to `video` (a generous ceiling — the phone's own splash asset is ~a few seconds; `BOOT_VIDEO_SRC`'s drop-in note already fixes the encode shape, so a 15–20 s cap is safe) and `advance` when it fires. Optionally tighten with `onStalled`/`onWaiting` → short grace timer. Either way the fix belongs in `BootSequence`, not the machine: `PHASE_MS.video = null` correctly says "this phase waits on something else".

---

### [MEDIUM] Both boot-video failure paths swallow their cause — no breadcrumb, three distinct causes collapsed into one outcome

**File:** `features/demo/ui/screens/BootSequence.tsx:128` and `:162`

```tsx
if (started instanceof Promise) started.catch(() => setPhase('done'))   // :128
onError={skip}                                                          // :162
```

**Cause collapse:** a 404 / bad path, a codec the browser cannot decode, and an autoplay block (Safari Low Power Mode blocks even muted autoplay) are three different operator problems. All three produce one identical outcome — the sequence ends, no video — and **zero** signal. The operator who follows the §87d drop-in procedure and sees no video has nothing to look at, and no way to tell "my path is wrong" from "this browser refused to autoplay".

**Against this repo's own convention.** The `console.warn('[demo/<area>] … :', e)` breadcrumb is dense and deliberate here — `[demo/map]` ×6, `[demo/import]` ×5, `[demo/geocode]`, `[demo/reverse-geocode]`, `[demo/gps]` ×2, `[demo/capture-media]`, `[demo/download-file]`, `[demo/case-map]`, `[demo/export]` — several added by prior reviews as the only diagnostic signal (see `geocode.ts:43`, `extract-client.ts:21-32`). `MapCanvas.tsx:345-367` is the model for exactly this shape: it distinguishes *failed before first load* from *error after load* and logs each differently. `BootSequence` has no logging at all.

**Against the phone it cites.** `BootSequence.tsx:76-78` cites `AuthenticatedSplashScreen.tsx:173-201` as the model for the error path. That code logs **and** notifies:

```ts
console.error('[AuthSplash] Video load error:', error); onError?.(new Error(error)); startFadeOut()
console.error('[AuthSplash] Video playback error:', status.error); onError?.(new Error(status.error)); startFadeOut()
```

The port kept the `startFadeOut()` half and dropped both the log and the `onError` callback — and the demo's risk profile is *worse* than the phone's, because the phone's asset is a bundled `require()` that cannot 404 while the demo's is a network fetch.

Supporting evidence that nothing pins this: the existing suite emits `Not implemented: HTMLMediaElement's play() method` twice — jsdom's `play()` returns `undefined`, so `started instanceof Promise` is false and the `.catch` arm is never exercised by any committed test.

**Fix:** `console.warn('[demo/boot] the intro video failed to load — skipping it:', …)` on the error path (with `el.error?.code`/`message` when available) and `console.warn('[demo/boot] the intro video could not autoplay — skipping it:', e)` on the rejection. Two lines. Pairs naturally with the two findings above.

---

### [LOW] The gate's Escape listener is global and unscoped — one Escape aimed at the exit dialog also lifts the boot gate

**File:** `features/demo/ui/screens/BootSequence.tsx:109-115` vs `features/demo/ui/controls/ExitDialog.tsx:24-31`, wired at `features/demo/ui/DemoExperience.tsx:3088`

```tsx
// BootSequence.tsx:109-115 — registered on `window`, unconditionally, for the gate's whole life
useEffect(() => { const onKey = (e) => { if (e.key === 'Escape') skip() }
  window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey) }, [skip])
```

**The lane brief's hypothesis — "it renders INSTEAD of the tree, so probably clean" — holds for everything inside the phone** (drawer, modals, sheets, `PdfPreview`, `WizardDrawer` are all inside the gated fragment and unmounted). It does **not** hold for the two page-level surfaces the rail owns: `StoryRail` and `ExitDialog` are deliberately rendered outside the gate so the checklist stays clickable (§87c). `ExitDialog` registers its Escape on `document`, gated on `open`, with no `stopPropagation`; `BootSequence` registers on `window`. A keydown bubbles through both. This is the first pair in the app that can be live simultaneously — every other overlay's Escape is mutually exclusive by construction.

**Adversarial sequence (probe P4):** boot gate up → click the rail's "← Back to site" → `unseen.length > 0` so `ExitDialog` opens over everything → press Escape to dismiss it → `{ exitDialogOpenedDuringBoot: true, dialogStillOpenAfterEscape: false, bootGateStillUpAfterEscape: false }`. One keypress dismissed the dialog **and** silently lifted the boot gate.

Low harm (the visitor lands in the app, which is where they were headed), but it is a control doing a second thing nobody asked for, and it is the exact failure mode the §87c SKIP/Escape deviation was reasoned about in isolation.

**Fix:** make the gate's Escape yield when a modal dialog owns it — bail if `document.querySelector('[role="dialog"][aria-modal="true"]')` is present, or have the bridge pass `escapeEnabled={!exitOpen}`.

---

### [LOW] The `case 'splash'` arm double-boots under the real route

**File:** `features/demo/ui/DemoExperience.tsx:2457-2466`

**Is `view: 'splash'` mintable?** No — verified, and the arm's comment is right. There is no `setView('splash')` call site anywhere in `features/demo/ui`; `EXPLORE_ITEMS` excludes `splash` so the rail can never jump to it; `onNext`/`onPrev` (`:1246-1253`) are wired only to the ten wizard screens, and `prevVisibleChapter('submission')` bottoms out at `cases`. The only writer is `loadSnapshot`: `view: z.string().refine(isAppView)` (`persistence.ts:417`) accepts `'splash'` because `CHAPTERS` contains it, and none of the rewrite arms touch it — it is not `LAUNCHABLE` and not a `WIZARD_SCREENS` member, so `restoredView` passes it straight through (`persistence.ts:553-560`). **Reachable only by a hand-edited/tampered `sessionStorage` snapshot at `SNAPSHOT_VERSION` 7.**

**What renders (probe P5/P7):** on `/demo` the gate is *also* up, so the visitor runs the sequence, and the moment it lifts the splash-view arm mounts a **second, identical** `BootSequence` at phase `idle` — `{ visitorFacedASecondBootSequence: true, secondOneWasBackAtTapToScan: true }`. It terminates (`finalView: 'cases'`), so no loop, and each instance is individually honest. But the arm exists to make a tampered snapshot render "something real", and what it actually produces under the one route that sets `boot` is a scan the visitor has just completed, served to them again.

**Fix:** have the arm redirect rather than replay — `useEffect(() => store.getState().setView('cases'), [])` behind a `noLocationNotice`-style placeholder, or render the sequence only when the gate did not already run.

---

### [LOW] The Cases row arrives pre-lit — the exit dialog claims a screen the visitor has never been shown

**File:** `features/demo/engine/store/create-store.ts:430`

```ts
visited: { cases: true }, // you boot there — it counts
```

The comment was true on `master`, where `/demo` mounted straight onto Cases. P8.1 made it false: the visitor now boots onto the splash gate, and Cases is behind it.

**Probe P8** — boot gate up, nothing explored, click "← Back to site": the "You haven't explored everything yet" list reads `01 Dashboard, 03 Create a Case, 04 Add a Location, …`. **Row 02 (Cases) is missing** — the checklist reports a screen as seen that has not been rendered once. Self-corrects within seconds on the normal path (finishing boot lands on Cases), and one row of twenty-one, hence LOW — but it is the same "pre-lit row" hazard `explore.ts`'s own new comment reasons about for `splash`, arriving from the other direction.

**Fix:** seed `visited` empty and let the gate's completion mark the landing view, or drop the seed to `{}` and let `setView`'s existing `visit()` do it.

---

### [LOW] `SecurityPane`'s standing note now under-describes the demo

**File:** `features/demo/ui/screens/settings/panes/SecurityPane.tsx:33-38`

> "There is no biometric sensor behind a browser tab, so none of these can do anything here. … **the demo does not simulate the prompt either**: a fake Face ID sheet would be the one thing worse than an unavailable one."

§87b's ruling is correct and I am not re-litigating it — a security switch must not drive a decoration, and `boot.ts:11-24` draws a real line between faking the OS *sheet* (which would imply a gate) and running the app's own opening chrome (which gates nothing). The residue is that the pane's note is **visitor-facing text**, and as written it reads as "nothing biometric is simulated anywhere in this demo", which stopped being true in this PR. Separately, the App Lock group's help — "Require Biometrics to open the app after it has been in the background" — now sits beside an actual open-the-app biometric-looking gate that ignores the switch in both positions.

Neither misleads at the moment it matters: the splash carries its own disclosure and the rail tip carries a second one, and the pane's stub note already says the switches do nothing. But the two standing notes no longer agree with each other, and a visitor who reads the pane after booting has to reconcile them unaided.

**Fix:** one clause in the stub note — name the boot scan as the single simulated-and-labelled exception, and say it protects nothing.

---

## Observations (not filed)

- `skip()` jumps straight to `'done'`, bypassing `'fading'`, so SKIP/Escape/video-error exits are instant rather than faded. Deliberate-looking and harmless (`opacity: 0` at `done` prevents a black flash), noted only so the fix round does not mistake it for a bug when touching `onError`.
- A mid-phase `prefers-reduced-motion` flip changes `advance`'s identity and restarts the current dwell from zero. Cannot double-advance (cleanup precedes re-arm) and the next advance collapses to `done` anyway. Cosmetic; not worth a fix.
- `started instanceof Promise` would miss a cross-realm thenable and leak an unhandled rejection. Not reachable — the `<video>` is same-realm — noted for completeness.
- `create-store.ts:430`'s and `explore.ts`'s comments are the only two places where P8.1 invalidated a neighbouring comment's premise; the first is filed above, the second was correctly updated in this PR.

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 3 |

Fallback honesty (every substitution announced): **yes** — the simulation disclosure is present in all three HUD states, AT-reachable, doubled in the rail tip, and pinned by test. The one hole is that a video preload error can delete the surface carrying it (MEDIUM #2).
Failure-cause distinctions preserved: **collapsed** — 404 / decode failure / autoplay block all reduce to `setPhase('done')` with no log (MEDIUM #4).
Partial results flagged (not silently short): **n/a** — no derived/partial data in this package.
Async cancellation / stale-write safety: **yes** — boot writes no store state; timers and listeners clean up on every branch; completion is once-only.
Operator breadcrumbs intact: **removed** — the phone's two `console.error` breadcrumbs on the video error paths were dropped in the port, and the repo's `[demo/…]` convention is absent from the whole package.

**Verdict: APPROVE with comments.**

No CRITICAL, no HIGH. All four MEDIUMs are cheap: two are one-liners (`endBoot()` in the recovery path; two `console.warn`s), and the two video-ladder gaps (scope `onError` to the phase; watchdog the one unbounded phase) are contained entirely inside `BootSequence.tsx` and touch neither the machine nor the bridge. Both video findings are **latent behind `BOOT_VIDEO_SRC === null`** — nothing in this PR ships them to a visitor — but §87d advertises the drop-in as "two constants, nothing needs restructuring", and as it stands flipping those constants also ships a hang and a self-deleting boot gate. Closing them now is what makes that sentence true.
