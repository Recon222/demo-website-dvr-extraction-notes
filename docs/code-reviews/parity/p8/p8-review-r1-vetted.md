# P8 review — round 1, VETTED (the one doc the fix round executes against)

**PR:** #37 · `master..feat/parity-p8` @ `41f4a93` (lane files committed `dc03f78`)
**Aggregator:** Fable (P8 review aggregator role — the final phase) · worktree `scratchpad/worktrees/parity-p8`
**Inputs:** the five lane files in this directory · PR #37 body (DO-NOT-RE-FLAG list) · `docs/code-reviews/deferred.md` §87 (a–e)
**Owner model:** single code owner — **P8.1's author (warm)**. The one PR-body obligation (A1) is the orchestrator's.

---

## VERDICT: REVISE

**0 blockers · 6 majors · 13 minors** (19 vetted findings from 34 raw lane items: 5 cross-lane
merges absorbing 20 raw items, 1 partial strike, 1 recorded-no-action, 2 amendment obligations).

Two lanes said REVISE (tests, web) and three said APPROVE-with-comments; the vetted verdict is
REVISE, for two reasons that don't cancel out. First, the round's one **live** HIGH: the boot gate
— the app's very first interaction — drops keyboard/AT focus to `<body>` every time it lifts, and
again mid-sequence on the video path (R-2). Second, the round's crux: **the video drop-in
robustness family** (R-1) — six raw MEDIUMs across four lanes that are all one defect cluster
sitting directly on the two-constant drop-in seam that is this phase's headline deliverable.
Nothing in R-1 can hurt a visitor today; all of it arms the day the owner flips the constants,
which §87d explicitly advertises as needing no re-review. That is what makes it must-fix now (the
severity ruling is under R-1).

The package underneath is strong, and the lanes converged on that too: the phase machine's
totality is compile-forced (probed twice, independently), engine purity / store-bridge /
barrel / determinism seams all hold, the gate-not-view design is correct and pinned, and the
a11y rework in `SplashScreen` is genuinely good work with exactly two gaps (the hand-off, R-2;
the disclosure's own contrast, R-6).

Baseline confirmed in this worktree before adjudication: 263 files / 3451 tests green, cold
`tsc --noEmit` clean. All probes and mutations below were reverted; `git status` clean (lane
files + this doc aside) and targeted suites re-green (19/19) at the end of the run.

---

## Empirical adjudication (re-run by the aggregator, then reverted)

| # | Probe | Result | Adjudication |
|---|---|---|---|
| 1 | **R-1a repro:** `BootSequence` with a video source, still at `idle` ("TAP TO SCAN" on screen), `fireEvent.error` on the video | `onComplete` fired once; sequence gone before it began | **CONFIRMED** — a preload 404 deletes the whole boot, disclosure included |
| 2 | **R-1b repro:** enter phase `video`, dispatch `stalled` + `waiting`, advance fake timers **600 000 ms** | `onComplete` never fired; video still opaque at `1` | **CONFIRMED** — no watchdog; the only unbounded phase whose exit is outside app control |
| 3 | **R-2 repro:** `<DemoExperience boot />`, focus the scan button, run the sequence to completion | `document.activeElement === document.body` after the gate lifts | **CONFIRMED** — focus dropped on an unmounted node |
| 4 | **R-7 repro:** boot up → rail "Back to site" → ExitDialog open → one Escape | dialog closed **and** `demo-boot` gone | **CONFIRMED** — one keypress, two effects |
| 5 | **R-3 mutation:** delete ` boot` from `app/demo/page.tsx:14`, run the **full suite** | **263 files / 3451 tests green** with the phase's production activation deleted | **CONFIRMED at full-suite strength** — stronger than the lane's by-construction argument: the mutation was actually run against everything |
| 6 | R-3 by-construction check | only test-file reference to the route is a *comment* in `phone-frame.test.tsx:60` | CONFIRMED — no test imports, renders, or reads the route |
| 7 | **R-6 arithmetic:** WCAG relative-luminance, `rgba(153,186,221,α)` flattened over `#000314` | α 0.55 → **3.59** · 0.60 → 4.09 · 0.65 → **4.65** · 0.70 → **5.27** | CONFIRMED — fails 4.5:1 at the shipped 0.55; the web lane's sweep reproduces exactly |
| 8 | Post-revert baseline | `git status` clean of probes; `BootSequence` + `DemoExperience.boot` suites 19/19 green | clean |

Lane-reported probes not re-run here (accepted on multiple independent reproductions or on a
verified static basis): the Escape/splash-arm double-boot (probed independently by TS, TD, SF,
tests — four green reproductions), the §84f correlated-optional compile probes (TD probe A1/C,
TS probe), the T-2 `setTimeout(advance, 0)` mutation (19/19 green, lane-verified with the
monotone-assertion mechanism explained and checked against the test source here), the jsdom
`play()`-returns-`undefined` basis of R-5 (visible in every committed video-test run's
`Not implemented` stderr), and the TD/tests drop-in collateral probe (module-mock and
constant-flip variants agree: 3 bridge tests red).

---

## PR-body / ledger overclaims (amendment obligations, per house discipline)

- **A1 (rides R-5) — owner: orchestrator (PR comment) + P8.1 (ledger edit).** The PR body's
  *"load/decode/autoplay failure ENDS the sequence rather than stranding"* and §87d's *"tested
  against a fake source, including … the load/decode/**autoplay-rejection** error path"* both
  overclaim: the autoplay-rejection arm (`started instanceof Promise → .catch`) is unreachable in
  jsdom — `play()` returns `undefined` in every committed test, so the `.catch` is never attached,
  never mind exercised. The code is right (lane-verified with a rejecting stub); the *coverage
  claim* is wrong, in the two documents whose whole purpose is to tell the drop-in-day reader
  nothing needs re-review. Same shape as P7's A1. Once R-5's test lands the sentence becomes
  true; §87d still gets the one-line amendment (test added post-review) and the fix-round PR
  comment carries the correction.
- **A2 (rides R-1d + R-17) — owner: P8.1.** §87d's headline *"The drop-in is two constants"* and
  `boot.ts:87-90`'s *"That is the whole change … no test that names a real asset exists to go
  stale"* are false as written: flipping the source constant reds **four** tests, only one of
  which is the intended announcement — `DemoExperience.boot.test.tsx`'s `runSequence` hard-codes
  the null-source phase path and stalls in `video` (3 collateral failures, probed two independent
  ways). If R-1d lands, the headline becomes **one** constant — shorter *and* true. Amend
  `boot.ts`'s procedure comment and §87d together with whichever shape ships.

---

## MAJOR findings

### R-1 [MAJOR] — the video drop-in robustness family: the seam this phase exists to deliver ships with a self-deleting error path, an unbounded stall, silent causes, and a half-flippable constant pair
**Files:** `features/demo/ui/screens/BootSequence.tsx:127-128, 152-165` · `features/demo/engine/logic/boot.ts:92-97, 117-125`
**Lanes (8 raw items merged):** typescript M1 (MED) + silent-failures M2 (MED) + web M1 (MED) → **(a)**; silent-failures M3 (MED) + web M2 (MED) → **(b)**; silent-failures M4 (MED) → **(c)**; type-design M1 (MED) + typescript L1 (LOW) → **(d)** · **Owner: P8.1**

One family, four sub-defects, one file pair, one owner. All four are invisible today
(`BOOT_VIDEO_SRC === null`) and all four arm simultaneously the day the owner performs §87d's
drop-in.

- **(a) The preload error kill** (adjudication #1). The `<video>` mounts at frame 1 with
  `preload="auto"` (the phone's trick, correctly ported) — so its `error` event can fire during
  `idle`/`scanning`, and `onError={skip}` is not phase-scoped. A mistyped path, a deploy that
  dropped the asset, or a network blip **deletes the entire boot sequence before the visitor has
  tapped** — scan, HUD, and the simulation disclosure that is this phase's honesty machinery —
  identically in production and in a local dev check. The shipped error test fires `error` only
  after the video owns the surface, i.e. only in the one phase where ending the sequence is
  correct; the pre-video window is unhandled *and* untested. **Fix (all three lanes converge):**
  route `onError` through a phase-aware handler — before `video`, set a `videoFailed` state and
  feed `advance` an effective source (`videoFailed ? null : videoSrc`) so `authorized` routes to
  `fading` exactly as the already-implemented-and-tested null-source path does; only during
  `video` should a failure advance the sequence (to `fading`, matching the phone's
  `startFadeOut()`, not a hard cut to `done`). Pin both arms.
- **(b) The missing stall watchdog** (adjudication #2). `PHASE_MS.video = null` (correct — the
  phase waits on `ended`), but `stalled`/`waiting`/a mid-stream freeze raise no `error`, and a
  `play()` promise that resolved before the stall has nothing left to reject. Probed: ten minutes
  parked in `video`, HUD unmounted, opaque empty rectangle, no log, no advance. `video` is the
  **only** phase whose exit is entirely outside the app's control and the only one with no upper
  bound. SKIP/Escape mean nobody is trapped — that is mitigation, not handling. **Fix:** a
  watchdog armed on entry to `video` in `BootSequence` (not the machine — `PHASE_MS.video = null`
  correctly says "waits on something else"): a generous fixed ceiling (15–20 s; the SF lane's
  sizing note) or `el.duration`-derived once `loadedmetadata` fires, cleared by `ended`, advancing
  on expiry. `onStalled` alone is insufficient — `stalled` does not fire for every freeze.
- **(c) The swallowed causes.** Both failure arms (`onError`, the `play()` `.catch`) produce the
  identical outcome with **zero** signal — a 404, an undecodable codec, and an autoplay block are
  three different operator problems collapsed into "the boot stopped existing". The repo's
  `console.warn('[demo/…]')` breadcrumb convention is dense (16+ sites, several added by prior
  reviews as the only diagnostic signal), and the phone code this component cites as its model
  logs **and** notifies on both paths (`[AuthSplash] Video load error` / `playback error`) — the
  port kept the completion half and dropped both breadcrumbs, while the demo's risk is *worse*
  (network fetch vs bundled `require()`). **Fix:** two `console.warn('[demo/boot] …')` lines with
  the distinct cause (`el.error?.code`/message on the error path; the rejection reason on the
  autoplay path).
- **(d) The §84f correlated pair.** `videoSrc`/`videoPoster` (props) and
  `BOOT_VIDEO_SRC`/`BOOT_VIDEO_POSTER` (constants) are two values only meaningful together — a
  poster with no source compiles clean (TD probe A1, TS probe, both zero-diagnostic) and silently
  renders nothing, reachable through the PR's own documented procedure (step 2 without step 3 is
  a legal edit). This is the exact trap §84f records this team closing by type one round ago.
  **Fix (TD probe C, both directions verified):** collapse to one value —
  `interface BootVideo { readonly src: string; readonly poster: string | null }`,
  `BOOT_VIDEO: BootVideo | null = null`, prop `video: BootVideo | null`. A half-flip becomes
  `TS2741` at both sites, the drop-in becomes **one** constant (A2 gets shorter and truer), and
  `boot.test.ts`'s guard collapses to a single assertion.

**Severity ruling (the round's central adjudication).** Reach today is zero — on reach alone the
family caps at MEDIUM-latent, which is where all six MEDIUM lane items sat, each with its own
"re-rate HIGH at drop-in" note. But the seam **is the deliverable**: the PR's headline is "a
clean two-constant drop-in seam", and §87d's entire function is to promise that flipping the
constants needs no re-review — the drop-in is precisely the moment nobody re-opens these files.
A defect on an advertised no-review path carries the severity it will have on the day the path
is used, because that day has no reviewer: a self-deleting boot (disclosure included) and an
unbounded black rectangle, both signal-free. Ruled **MAJOR, must-fix this round** — the round in
which the seam is the deliverable is the only round positioned to fix it, and merging with §87d
as written ships a documented promise the code does not keep. (This also disposes of the lanes'
individual severities: not a promotion of any single MEDIUM, but the family's deliverable-contract
weight.)

### R-2 [MAJOR] — the boot gate has no focus handling: focus drops to `<body>` at every gate lift, and again mid-sequence on the video path
**Files:** `features/demo/ui/screens/BootSequence.tsx:80-174` (no focus logic) · `DemoExperience.tsx:485-486, 2966` (mount/unmount) · `BootSequence.tsx:135-136` (`showHud = !showVideo`)
**Lane:** web HIGH (the phase's only HIGH) · **adjudication #3: CONFIRMED** · **Owner: P8.1**

Live on `/demo` today — the only major with present-day reach. The gate holds the screen's only
two focusable controls; completion unmounts the subtree with nothing moving focus, so the
keyboard visitor who just pressed Space on the app's **first interaction** has their next Tab
restart from the top of the page, and no SR is told the gate is gone (WCAG 2.4.3). On the video
path it happens a second time mid-sequence: `authorized → video` unmounts `SplashScreen` while
its button holds focus (web probe Q2). The §87c not-a-dialog ruling is correct and untouched —
this is only the hand-off. **Fix:** `endBoot()` focuses a `tabIndex={-1}` ref on the revealed
stage container (the `ExitDialog` `autoFocus` shape, inverted); on the video path either keep
`SplashScreen` mounted at `visibility: hidden` behind the video (mirroring how the video itself
stays mounted at `opacity: 0`) or move focus to SKIP at `authorized → video`. Note the
`aria-disabled`-not-`disabled` choice inside `SplashScreen` is exactly right and already pinned —
the gap is only at the two unmount boundaries.

### R-3 [MAJOR] — the one line that turns P8 on in production is observable by no test
**File:** `app/demo/page.tsx:14` (`<DemoExperience boot />`)
**Lane:** tests T-1 (lane-HIGH) · **adjudications #5–6: CONFIRMED at full-suite strength — the aggregator deleted the prop and ran all 3451 tests: green** · **Owner: P8.1**

The phase's entire delivery mechanism is one optional prop the bridge deliberately defaults to
`false` (so ~30 bridge suites don't wait out a splash). Deleting it is silent and total: `/demo`
stops booting, `tsc` is clean, every P8 test stays green because all of them pass `boot`
explicitly. §84a one level out — the sequence was built, tested, and documented, and its single
production activation is the untested part. **Fix:** the repo's sanctioned structural idiom for
which-file-mounts-what invariants (`chrome-scope.test.tsx`): one source-read test in
`app/demo/__tests__/` matching `/<DemoExperience\b[^>]*\bboot\b/` — anchored to the JSX form, not
the bare word, for the reason `chrome-scope`'s own comment documents.

### R-4 [MAJOR] — "runs … on the phone-pinned dwells" is pinned by nothing: every dwell can be zero and the suite stays green
**File:** `features/demo/ui/screens/BootSequence.tsx:93-98` · tests `BootSequence.test.tsx:49-68`, `DemoExperience.boot.test.tsx:10`
**Lane:** tests T-2 (lane-HIGH), mutation-verified (`setTimeout(advance, 0)` → 19/19 green; overshoot probe explains the mechanism: one-phase-per-`act` makes every assertion monotone in the tick amount) · **Owner: P8.1**

`boot.test.ts` pins the *numbers* (a genuinely good pin) and the deps probe pins the chain's
*shape*; nothing pins that the component waits `bootPhaseDurationMs(phase)` rather than any other
number — no test ticks *less* than a dwell and checks the phase held. For a phase whose entire
deliverable is a timed sequence, a refactor collapsing the plan's ~1.2 s to instantaneous ships
green under a test named "phone-pinned dwells". **Fix:** boundary ticks in the existing test
(`tick(SCAN_MS - 1)` → still SCANNING → `tick(1)` → AUTHORIZED, same for `AUTHORIZED_MS`, same
shape for `HOLD_MS` in the video test) — lane-verified red under the mutation, green at baseline.

### R-5 [MAJOR] — the autoplay-rejection arm is declared tested in two places and is unreachable in jsdom
**File:** `features/demo/ui/screens/BootSequence.tsx:127-128` · claims in PR #37 body + `deferred.md` §87d
**Lane:** tests T-3 (lane-HIGH) · carries **A1** · **Owner: P8.1 (test + ledger edit); orchestrator (PR comment)**

jsdom's `play()` returns `undefined` (the `Not implemented` stderr in every committed video run
is this fact announcing itself), so `started instanceof Promise` is false in every existing test
and the `.catch` is never attached. The code is right — lane-verified with a rejecting stub — but
the arm is the **single most likely field failure** (iOS Low Power Mode blocks muted autoplay
outright), its outcome is the exact stranding the ladder exists to prevent, and both the PR body
and §87d claim it tested. **Fix:** one test beside the existing error-path test
(`video.play = () => Promise.reject(…)` — the seam the reduced-motion test already uses),
lane-verified green at baseline; plus A1's amendments. Entangled with R-1c (the rejection
breadcrumb changes the arm's body) — same commit or adjacent.

### R-6 [MAJOR] — the honesty disclosure is the only string on the boot surface that fails WCAG contrast
**File:** `features/demo/ui/screens/SplashScreen.tsx:112-124` (`rgba(153,186,221,0.55)`, 11 px, over `#000314`)
**Lane:** web M3 (MED, promoted) · **adjudication #7: CONFIRMED — 3.59:1 against a 4.5:1 requirement** · **Owner: P8.1**

Live today, and thematically the round's sharpest irony: every decorative string on the surface
passes (the lane's full table — BIOMETRIC LOCK 5.50, AUTHORIZED 10.15, SKIP 8.22) while the one
line carrying the package's honesty claim — "Simulated scan — a browser tab has no biometric
sensor…" — is the least readable text on the screen. A low-vision visitor is shown a convincing
biometric gate and cannot read the caption that says it is fake. This PR added the copy; it is
not a lifted value. **Promoted MED → MAJOR:** a live Level-AA failure on the phase's single
load-bearing honesty string, with a one-number fix. **Fix:** alpha 0.55 → **0.65** (4.65:1,
minimum) or **0.70** (5.27:1, comfortable and still visually subordinate — recommended); pin
with a computed-style assertion if cheap, else the value alone.

---

## MINOR findings

### R-7 [minor] — one Escape aimed at the ExitDialog also silently skips the boot
**Files:** `BootSequence.tsx:109-115` (window keydown, unconditional) vs `ExitDialog.tsx:24-31` (document keydown, no `stopPropagation`)
**Lanes (3 merged):** typescript M2 (MED, normalized down) + silent-failures L1 + web L1 · **adjudication #4: CONFIRMED, live on `/demo` today** · **Owner: P8.1**

The first Escape-listener pair in the app that can be live simultaneously (the rail and dialog
sit outside the gate by §87c design; every other overlay pair is mutually exclusive by
construction). One keypress does two things; the second is undisclosed. Normalized to minor —
two of three lanes had it LOW, and the blast radius is one lost decoration for a visitor who
chose "keep exploring" — but it is live and the fix is one line. **Fix (TS lane's dispatch-order
insight):** `ExitDialog` binds on `document`, `BootSequence` on `window`, so the dialog's handler
already runs first — add `e.stopPropagation()` after `onStay()`, which states "topmost
dismissible owns Escape" in one line, needs no new prop, and generalizes (ModalShell/AlertDialog
also bind on `document`). Avoid a bare `escapeEnabled?: boolean` — another §84f correlated
optional. R-10's fix independently retires the splash-arm variant of the same listener.

### R-8 [minor] — a render throw inside the boot gate is unrecoverable: the boundary's only exit cannot lift the gate
**Files:** `DemoExperience.tsx:2960, 2966` (gate *inside* `DemoErrorBoundary`) · `DemoErrorBoundary.tsx:99-104`
**Lane:** silent-failures M1 (MED, normalized down per the lane's own reasoning) · probe-verified (SF P6) · **Owner: P8.1**

"Return to Cases" runs `returnToCases()` + clears the boundary error — but `booting` is untouched,
so `BootSequence` remounts, throws again, and the card returns; SKIP/Escape live inside the thrown
subtree. A dead recovery control, loudly surfaced — and no realistic throw source exists in the
boot subtree today, which is why it is minor. **Fix (one line):**
`onReturnToCases={() => { endBoot(); returnToCases() }}` at the gate's boundary, or move the gate
above the boundary. Pin with the SF probe's shape.

### R-9 [minor] — `SplashScreen`'s HUD branches are three independent `&&`s: a fourth `BootHudState` renders an empty live region
**Files:** `boot.ts:39` (union) · `SplashScreen.tsx:91-107` (three `&&` blocks) · comment `boot.ts:37-38`
**Lane:** type-design M2 (MED; the lane flagged its own demotion for review) · **Owner: P8.1**

TD's demotion **upheld, and not moved to HIGH** under the FallbackMode clause: that clause
targets `default:` arms silently absorbing imminent variants; here there is no default arm, the
invalid state requires a future union edit (not a reachable input), and all three ledger triggers
pointing at a fourth member (§87a/b) are explicitly owner-deferred. The gap is still real — a
fourth member would be compile-forced through `HUD_STATE` and then render an empty
`role="status"` region with an `aria-disabled` dead button, worse than a wrong default — and the
fix is one file. **Fix:** `Record<BootHudState, ReactNode>` beside the `status` style constant
(TD probe C2b: `TS2741` on growth) or a `switch` closing on the house `assertNever` (8 live call
sites). Independently: narrow the `boot.ts:37-38` comment — the alias makes the *name*
undriftable, not the branch set (§84a shape).

### R-10 [minor] — the `'splash'` snapshot arm: a tamper-only state that double-boots, closed by one loader line
**Files:** `DemoExperience.tsx:2457-2467` (the arm) · `persistence.ts:551-557` (the normalization block with no splash branch)
**Lanes (4 merged):** type-design M3 (MED, normalized down) + typescript L2b + silent-failures L2 + tests N-3 · **Owner: P8.1**

**Mintability is SETTLED as tamper-only** — three lanes independently swept for a writer and
found none (no `setView('splash')` call site in any ref, `EXPLORE_ITEMS` excludes it,
`onPrev` bottoms out at `'cases'`); the only path is a hand-edited `sessionStorage` snapshot,
which `loadSnapshot` accepts because `'splash' ∈ CHAPTERS`. Reached, it round-trips, the visitor
runs the gate, and the arm then mounts a **second identical** `BootSequence` as the screen —
discarding the restored position (the failure §87e exists to prevent, avoided on the way in and
open on the way back) and leaving a window-global Escape-navigates-to-Cases listener live for the
view's life. Probed green by four lanes; self-heals on second completion. **Normalized to minor
on reach** (TD's MEDIUM was the id-space-divergence argument, which the fix honors anyway).
**Fix (TD's, one line, no `SNAPSHOT_VERSION` bump** — it narrows what the loader *accepts*,
same reasoning as the launchable arm and the `visited` key-set widening):
`if (restoredView === 'splash') restoredView = restoredChapter` (+ the chapter fallback) in the
existing block at `persistence.ts:551-557`, **plus tests N-3's pin** (snapshot restored onto
splash lands on Cases — fails today). The arm at `:2457` can then become unreachable-and-honest
or redirect; fix round's call.

### R-11 [minor] — the phase union's growth safety stops at `boot.ts`: one deny-list partition and one stale-able test list
**Files:** `BootSequence.tsx:135` (`showVideo` deny-list) · `boot.test.ts:16` (`ALL_PHASES: readonly BootPhase[]`)
**Lanes (3 merged, 1 half struck):** typescript M3 (MED, partial — see struck) + type-design L1 + tests N-4 · **Owner: P8.1**

The three compile-forced sites are real (probed by two lanes independently: TS2741 ×2 + TS2366)
and all live in `boot.ts` — anyone adding a phase is told three times in the right file, which is
why this is minor. Two consumers are not growth-safe: **(a)** `showVideo`'s deny-list — a new
pre-video phase silently takes the surface early (both lanes agree; TD's sweep confirms this is
the one partition pointing the *unsafe* way). Fix: flip to the allow-list form, or TS's
`SURFACE: Record<BootPhase, 'hud' | 'video'>` in `boot.ts` beside its siblings — note R-1d
reshapes this line anyway, so land together. **(b)** `ALL_PHASES` is a hand list under a
`readonly BootPhase[]` annotation that type-checks a subset — the three tests named "total over
the phase union" silently stop being total on growth (probed: stale list, 15/15 green), and the
PR body's "pinned by totality tests" mis-attributes a guarantee that is the compiler's. Fix:
derive the list (`Object.keys(PHASE_MS)` export, or tests N-4's `Exclude`-based
compile guard); same treatment or a recorded pass for `SplashScreen.test.tsx:29`'s three-member
twin, decided once.

### R-12 [minor] — the Cases row arrives pre-lit: the exit checklist claims a screen the visitor has never seen
**File:** `features/demo/engine/store/create-store.ts:430` (`visited: { cases: true } // you boot there — it counts`)
**Lane:** silent-failures L3, probe-verified · **Owner: P8.1**

The comment was true on `master`; P8.1 made it false — during boot, "You haven't explored
everything yet" omits row 02 for a screen that has rendered zero times. Self-corrects seconds
later on the normal path. **Fix with care (aggregator note):** SF's "seed `{}` and let the gate's
completion mark the landing view" is the right shape, but the landing mark must come from
`endBoot`'s path (or `setView`'s existing `visit()`), and ~30 bridge suites mount with
`boot=false` where Cases must still light — whichever seam is chosen, run the store + explore +
exit-dialog suites before settling. If the cost creeps past small, a recorded-choice ledger line
is an acceptable disposition for one row of twenty-one.

### R-13 [minor] — `SecurityPane`'s standing note now under-describes the demo
**File:** `features/demo/ui/screens/settings/panes/SecurityPane.tsx:33-38`
**Lane:** silent-failures L4 · **Owner: P8.1**

"…the demo does not simulate the prompt either" stopped being unqualified-true this PR: the boot
scan is a simulated-and-labelled biometric surface, and the App Lock group's help now sits beside
an open-the-app gate that ignores the switch in both positions. §87b's ruling is untouched (and
correct); this is one clause of visitor-facing copy. **Fix:** name the boot scan as the single
simulated-and-labelled exception and say it protects nothing.

### R-14 [minor] — flipping reduced-motion mid-dwell restarts the dwell instead of collapsing at the next deadline
**File:** `BootSequence.tsx:85-98`
**Lane:** web L2, probe-verified (flip at 700 ms into the 800 ms dwell → fresh full dwell) · **Owner: P8.1**

`advance`'s identity moves on `reduceMotion`, tearing down and re-arming the pending timer
full-length — the machine's from-any-phase collapse promise (`boot.ts:139-141`) is honored one
dwell late, bounded at 800 ms. **Fix (if touched):** short-circuit in the timer effect —
`if (reduceMotion) { setPhase('done'); return }` before reading the dwell. SF's observation that
this cannot double-advance (cleanup precedes re-arm) is on the record; don't re-derive it.

### R-15 [minor] — the reduced-motion wire between `BootSequence` and `SplashScreen` is unpinned
**File:** `BootSequence.tsx:167` (` reduceMotion={reduceMotion}`) · **Lane:** tests N-1, mutation-verified (prop deleted → 31/31 green) · **Owner: P8.1**

Both halves are pinned in isolation; the composition is not — a props-tidying pass can drop the
prop and ship the 8 s flicker to exactly the visitors who opted out, on the phase where
reduced-motion visitors *stay* (idle never auto-advances). **Fix:** the lane's one-line
`container.innerHTML` check in the existing describe (red under mutation, green at baseline;
inline-style animations, so `css: false` doesn't blind it).

### R-16 [minor] — the AUTHORIZED beat is unpinned on the video path
**File:** `BootSequence.tsx:135` · **Lane:** tests N-2, mutation-verified (`!== 'authorized'` term deleted → 12/12 green) · **Owner: P8.1**

With a video configured, nothing asserts the green HUD holds its 800 ms before the video takes
the surface — the phone's beat can silently become a black frame, on the path that ships
unreviewed at drop-in. **Fix:** split `tickThrough(SCAN_MS, AUTHORIZED_MS)` in the preload test
and assert AUTHORIZED + `video.style.opacity === '0'` between the ticks. Rides naturally with
R-1a's test edits (same file, same describe).

### R-17 [minor] — the drop-in's real blast radius: "two constants" is two constants plus three bridge-test edits
**Files:** `boot.ts:87-90` (the claim) · `DemoExperience.boot.test.tsx:10` (`runSequence`, null-path hard-coded)
**Lanes (2 merged):** type-design L2 + tests N-5, probed two independent ways (module mock; constant flip → 4 red, 3 collateral) · carries **A2** · **Owner: P8.1**

Not asking for an injection prop for one call site (the lanes agree that's the
speculative-abstraction trap). **Fix:** either make `runSequence` fire `ended` when a video
element is present, or amend the comment + §87d to name the three tests and the required edit —
and A2's rewrite rides R-1d either way (the honest headline after the collapse: "one constant,
and `runSequence` fires `ended`").

### R-18 [minor] — SKIP's accessible name is the bare word
**File:** `BootSequence.tsx:169-171` · **Lane:** web L3 · **Owner: P8.1**

`aria-label="Skip the opening sequence"` — every other terse control in the feature names its
object. One attribute.

### R-19 [minor · recorded-choice] — no cleanup pin for the gate's window keydown listener
**File:** `BootSequence.tsx:109-115` · **Lane:** tests N-6 (nit) · **Owner: P8.1**

Cleanup verified working; a leak would degrade to a no-op `setPhase` on an unmounted tree. The
suite has the assert-the-exact-handler precedent if the fix round wants it; leaving it unpinned
is an acceptable recorded choice. Note R-7/R-10 may reshape this listener anyway — decide after
those land.

---

## Struck findings (and why)

- **typescript M3, the opacity-partition half** (`BootSequence.tsx:148` "wants the same
  treatment") — **struck; TD's growth-direction sweep controls.** The opacity check is an
  *allow-list*: a new phase defaults to fully visible, which is the safe side for every realistic
  insertion (a pre-video beat must paint the HUD). The "new terminal phase paints an opaque black
  rectangle" scenario requires adding a phase *after* `done` — incoherent in this machine, where
  `done` is narrowed out before the switch and succeeds nothing. Converting to a
  `VISIBLE: Record<BootPhase, boolean>` is acceptable polish if R-11a lands as records; it is not
  a defect. The `showVideo` half of the same finding survives as R-11a.
- **typescript L2a** (the video phases are unreachable by *convention*, not construction) —
  **recorded, no action, per the lane's own filing** ("No change required"). The doc-comment at
  `boot.ts:31-34` reads as a construction guarantee where it is a single-branch convention; the
  fix round may sharpen one sentence while editing the same comment block for A2, but no code
  change is wanted — the honest alternative (a config-parameterized successor table) is machinery
  this codebase doesn't need for one consumer.

Nothing else was struck: every remaining raw item survives inside a vetted finding above.

---

## Severity normalizations (for auditability)

| Item | Lane said | Vetted | Why |
|---|---|---|---|
| The video family (TS M1, SF M2/M3/M4, web M1/M2, TD M1, TS L1) | 6× MED + 1 LOW, "HIGH at drop-in" | **R-1 MAJOR** | Deliverable-contract ruling under R-1: a no-review path carries its use-day severity |
| Web focus drop | HIGH | **R-2 MAJOR** | Upheld — live, first interaction, WCAG 2.4.3, reproduced |
| Tests T-1 / T-2 / T-3 | lane-HIGH ×3 | **R-3/R-4/R-5 MAJOR** | Upheld; T-1 re-verified at full-suite strength |
| Disclosure contrast (web M3) | MED | **R-6 MAJOR** | Promoted: live AA failure on the phase's load-bearing honesty string; one-number fix |
| Escape collision (TS M2) | MED (TS) / LOW (SF, web) | **R-7 minor** | Two-of-three lanes + bounded blast radius (one lost decoration); live, one-line fix |
| Boundary recovery (SF M1) | MED | **R-8 minor** | The lane's own reasoning: loud failure, dead control, no realistic throw source |
| HUD growth (TD M2) | MED, flagged for possible HIGH | **R-9 minor** | FallbackMode-literal reading declined: no `default:` arm, no reachable input, all triggers owner-deferred |
| Splash arm (TD M3) | MED (TD) / LOW (TS, SF) / minor (tests) | **R-10 minor** | Tamper-only reach, settled by three independent writer sweeps; self-healing |
| showVideo partition (TS M3 half) | MED | **R-11 minor** | All compile-forced sites are in the file the editor must touch; deny-list is real but told-three-times mitigated |

---

## Suggested fix-commit grouping (single owner; granular, red+green together, findings mapped per commit)

The order minimizes rework: the type collapse lands first because three later commits touch the
lines it reshapes.

1. **R-1d + R-17 + A2** — the `BootVideo | null` collapse (constants, props, `boot.test.ts`
   guard), `runSequence`'s `ended` step, and the amended drop-in comment/§87d text. (Entangled:
   all three rewrite the same constant block and its tests.)
2. **R-1a + R-1c + R-16** — phase-scoped `videoFailed` error routing + both breadcrumbs + pins
   for both error arms + the AUTHORIZED-beat assertion (same test file, same describe).
3. **R-1b** — the video watchdog + its pin.
4. **R-5 + A1** — the rejecting-`play()` test + the §87d wording amendment (PR comment is the
   orchestrator's).
5. **R-2** — focus hand-off at gate lift + at `authorized → video`, with the two web-lane probes
   as tests.
6. **R-6** — disclosure alpha + pin.
7. **R-3** — the route's structural `boot` pin.
8. **R-4** — boundary ticks (scan/authorized/hold).
9. **R-7** — `ExitDialog` `stopPropagation` + pin.
10. **R-8** — `endBoot()` on boundary recovery + pin.
11. **R-10** — the `loadSnapshot` splash normalization + tests N-3's pin (+ the arm's disposition).
12. **R-9** — the `Record<BootHudState, ReactNode>` HUD body + the narrowed alias comment.
13. **R-11** — `showVideo` allow-list/record + derived `ALL_PHASES` (+ the SplashScreen twin,
    decided once).
14. **R-12** — visited seed (or the recorded-choice ledger line if the seam costs too much).
15. **R-13 + R-18** — the two one-line copy/label edits (grouped: both are single-string edits).
16. **R-14 + R-15** — reduced-motion short-circuit + composition pin (grouped: same concern).
17. **R-19** — decide after 9/11; pin or record.

Ledger: fix-round dispositions land in **§88+** per the PR body's reservation.

---

## Lane hygiene (for the orchestrator, not the fix round)

- **The silent-failures lane file was missing from the worktree.** Commit `dc03f78` says "five
  lane files" but contains four; the SF agent wrote its file to the **main checkout**
  (`docs/code-reviews/parity/p8/lane-silent-failures.md`, untracked on `master`) instead of this
  worktree. The aggregator copied it into the worktree's p8 directory (uncommitted) so the fix
  round has all inputs in one place — it needs to be committed with this doc, and the stray
  untracked copy in the main checkout cleaned up.
- **SF lane summary-table miscount:** the table says 4 MEDIUM / 3 LOW; the body files four LOWs
  (Escape, splash arm, pre-lit row, SecurityPane). The vetted counts use the body.
- Lane discipline was otherwise excellent this round: every MEDIUM+ claim arrived probe-verified,
  the lanes left each other's in-flight probe files alone in the shared worktree, and two lanes
  independently refuted plausible-but-wrong "fixes" (the `assertNever` default that would
  *weaken* `nextBootPhase`; the opacity partition) — both refutations are preserved above so the
  fix round doesn't undo them.

---

## Lane → R-ID map

| Lane item | Vetted |
|---|---|
| typescript M1 | R-1a |
| typescript M2 | R-7 |
| typescript M3 | R-11a (showVideo) · struck (opacity half) |
| typescript L1 | R-1d |
| typescript L2 | R-10 (b) · recorded (a) |
| type-design M1 | R-1d |
| type-design M2 | R-9 |
| type-design M3 | R-10 |
| type-design L1 | R-11 |
| type-design L2 | R-17 (+A2) |
| tests T-1 | R-3 |
| tests T-2 | R-4 |
| tests T-3 | R-5 (+A1) |
| tests N-1 | R-15 |
| tests N-2 | R-16 |
| tests N-3 | R-10 |
| tests N-4 | R-11b |
| tests N-5 | R-17 |
| tests N-6 | R-19 |
| silent-failures M1 | R-8 |
| silent-failures M2 | R-1a |
| silent-failures M3 | R-1b |
| silent-failures M4 | R-1c |
| silent-failures L1 | R-7 |
| silent-failures L2 | R-10 |
| silent-failures L3 | R-12 |
| silent-failures L4 | R-13 |
| web HIGH | R-2 |
| web M1 | R-1a |
| web M2 | R-1b |
| web M3 | R-6 |
| web L1 | R-7 |
| web L2 | R-14 |
| web L3 | R-18 |

---

# Fix-delta r1 — CAMPAIGN-FINAL AGGREGATION

**Range:** `41f4a93..15b683b` (fix round 1, R-1..R-19; §88) · lane sections committed `eed92b8`
**Aggregator:** Fable (same role) · **Gates at the fix head:** 265 files / **3473 tests** green ·
cold `tsc` clean (two lanes independently) · `pnpm build` exit 0, `/demo` First Load **107 kB
byte-identical** · every lane re-ran its original probes inverted rather than reading the diff.

## VERDICT: APPROVE FOR MERGE — conditional on ONE rider commit

**All 19 vetted findings FIXED (32/32 raw lane dispositions, 0 partial, 0 refuted). Both
amendment obligations (A1, A2) executed and independently verified — §87d's autoplay claim and
the "one constant" drop-in headline are now *measured* statements (the drop-in was performed
against the full suite: exactly one red, the intended announcement). Six low/nit survivors, all
1–5 lines: four ride the rider, one is ledgered with a trigger, one is recorded by comment.**

Three fixes were closed by moving invariants to the compiler rather than adding assertions
(`BootVideo`, `SURFACE`, `BOOT_PHASES`/`BOOT_HUD_STATES` derivations) — the strongest outcome the
r1 doc asked for. The lanes also caught the round improving on the spec four times (the loader-side
splash fix preserving a real restored position; the fade-not-cut error exits; the duration-derived
watchdog bound; the `hadFocus` guard) — all four judged sound here, none smuggled: §88a disclosed
the one behavioral extension.

## The dedupe ruling: type-design N1 + web's disclosed incident are one story

**Settled by the committed tree** (re-read here, not taken from either lane): at `15b683b`,
`boot.ts:38-47` carries the corrected R-9 comment *with the probe output embedded*, while
`SplashScreen.tsx` still carries **both** retired claims — the statusBody comment credits
`HUD_STATE` with a compile-force the probe disproved (N1a), and the alias comment still says
"cannot drift" (N1b). §88c's "Both comments now say that" is therefore **false of the merged
tree** — half-true, boot.ts only.

**Is the destroyed-edit hypothesis confirmable from the §88c text? No.** §88c asserts the
SplashScreen correction but does not quote its replacement text, so the ledger alone cannot
distinguish *edit-made-then-destroyed* from *edit-claimed-but-never-made*. It is, however, the
best explanation of the joint evidence: the incident names exactly a one-line uncommitted
SplashScreen edit concurrent with the lane runs; N1a's fix is exactly one line; and the boot.ts
half of the same claimed pair demonstrably had its mechanism run (the probe output is *in* the
comment), which makes claimed-but-never-made the out-of-character reading. Ruled **very likely,
unproven — and immaterial to disposition**: the tree needs the same three comment edits under
either explanation, and §88c needs the same one-line amendment. The typescript lane's §88c check
("corrected comments in both files") over-reported on the SplashScreen half — it verified the
diagnostic and generalized; type-design's reading is the accurate one (lane hygiene, below).

## Survivor dispositions (6 items, ruled on the merits)

| # | Survivor | Lane | Ruling |
|---|---|---|---|
| S1 | The comment trio: `SplashScreen.tsx` N1a (wrong mechanism credited) + N1b (retired "cannot drift" claim) + `boot.ts:32` N1c (stale `videoSrc` identifier) — plus the §88c amendment | type-design N1 (+ the incident) | **RIDER.** Comment-only, but this defect class — a comment naming a guarantee the code doesn't carry — is what R-9 *was*, and the campaign cannot close on a ledger claim the tree contradicts. |
| S2 | §88b's "last hand partition" is off by two — three inline `BootPhase` partitions exist post-round (`:126` R-14 collapse, `:171/:173` R-1a error scope, `:264` opacity), all safe-by-default | typescript N2 | **RIDER** (one sentence in §88b naming all three with the safe-default column). A growth-safety auditor stopping at "one remains" would miss two; docs-accuracy is this doc's own product. |
| S3 | The boot→app focus hand-off fires unconditionally — a keyboard rail-jump yanks focus from the rail into the phone | web new-LOW (probe F1d) | **RIDER.** Live today, an internal inconsistency with the `hadFocus` guard the same commit introduced, and the fix is one guard: at effect time the gate is already unmounted, so orphaned focus sits at `<body>` while rail-held focus is still on the rail — `if (was && !booting && document.activeElement === document.body)` distinguishes them exactly. Flip F1d's expectation into the suite. |
| S4 | `boot={false}` satisfies the route guard's `\bboot\b` | tests FD-1d (nit) | **RIDER** (one assertion: `expect(page).not.toMatch(/\bboot=\{false\}/)`, or tighten the positive to require no `={false}`). The guard exists for the silent regression; the debugging-leftover is the one silent variant it still admits. |
| S5 | The stall watchdog budgets total wall clock from phase entry, not time-since-progress — a healthy long/rebuffering intro can be cut against the constant's own "never to cut a healthy intro short" | typescript N1 | **LEDGER with trigger** (the D7 drop-in), + the comment honesty line in the rider. Adjudicated against SF/web, who both *accepted* the shape: the mechanism is sound and every probe terminates in a graceful, breadcrumbed fade — under the R-1 use-day rule this is **LOW at the drop-in too**, so it does not inherit R-1's must-fix. What is false today is the comment's absolute claim: the rider aligns it ("a healthy intro that rebuffers more than `VIDEO_OVERRUN_MS` total is treated as stalled"), and the ledger line rides the drop-in note so the fixer on that day sees it. The progress-basis rework (`onTimeUpdate` ref + re-arm, the code-heaviest survivor) is the trigger's work, not tonight's. |
| S6 | The R-14 dwell-re-arm class recurring on R-1a's `videoFailed` seam — a pre-video failure re-runs the current dwell once, bounded, terminating | silent-failures observation-LOW | **RECORDED by comment** (rides the rider's comment edits) — SF's own offered disposition: one sentence on the dwell effect saying the re-arm is accepted for this input. The mechanical fix (ref-read `liveVideo`) is declined: one-shot, cosmetic, on a failure path, and it would touch a seam five green probes currently pin. |

## The rider (merge precondition — single commit, P8.1's warm agent)

One commit, ~10 lines total, no behavioral change except S3's one-line guard:

1. **S1** — the three comment edits (point N1a at `statusBody`; narrow N1b to name-only; rename
   N1c's identifier) + one sentence amending §88c (the SplashScreen half was absent from the
   merged tree — restored here; the incident recorded).
2. **S5/S6 comment lines** — align `VIDEO_CEILING_MS`'s comment with the wall-clock mechanism;
   one accepted-re-arm sentence on the dwell effect. *(Optional, same commit: move the R-2 doc
   comment off R-12's effect and onto its own — TD's placement note.)*
3. **S2** — the one-sentence §88b correction (three inline partitions, all safe-by-default).
4. **S3** — the `document.activeElement === document.body` guard + the F1d test flip.
5. **S4** — the `boot={false}` negative assertion.

**Ledgered with trigger** (lands in the closing ledger entry): S5's progress-basis watchdog,
trigger = the owner's D7 drop-in — the line belongs beside the drop-in procedure so it cannot be
missed on the day it matters.

## Lane hygiene (final)

- **Web's disclosed incident** — a blind `git checkout` in the shared worktree destroyed a
  concurrent uncommitted one-line `SplashScreen.tsx` edit (almost certainly §88c's missing half,
  per the ruling above). Disclosed promptly, damage bounded to one comment line, and now a
  standing rule: probe reverts name their own files; never checkout a shared tree wholesale.
  The isolation discipline three other lanes used (private detached worktrees) is the pattern.
- The typescript lane's §88c verification over-reported ("both files") — corrected by
  type-design's tree-accurate reading; recorded so the audit trail shows which is authoritative.
- Everything else was exemplary to the end: every disposition above rests on an inverted re-run
  of the original probe, the author's own mutation table was spot-checked nine ways by the tests
  lane, and one first-reading artifact (R-6's pin) was caught and resolved *against the suite*
  by the lane itself before it became a false finding.

## FINAL ARC (PR-comment-ready, for the campaign's last PR)

> **P8 fix round — final arc.** The initial review vetted 34 raw findings across five lanes into
> 19 (0 blockers / 6 majors / 13 minors), the crux being the video drop-in robustness family: six
> converging MEDIUMs on the two-constant seam §87d advertises as needing no re-review, ruled
> must-fix on deliverable-contract grounds — a defect on a no-review path carries its use-day
> severity. The fix round closed **19/19** in 17 commits, three of them by moving the invariant
> into the compiler (`BootVideo | null` collapses the correlated pair and makes the drop-in ONE
> constant; `SURFACE` retires the last unsafe hand partition; the phase and HUD lists are now
> derived, so the totality tests are total). The fix-delta re-review re-ran every original probe
> inverted — **32/32 raw dispositions FIXED, 0 partial, 0 refuted** at 265 files / 3473 tests,
> cold `tsc` clean, `/demo` First Load 107 kB byte-identical. Both overclaim obligations were
> discharged empirically: the autoplay-rejection arm is now genuinely reached (a rejecting
> `play()` stub past jsdom's stub), and the drop-in was *performed* against the full suite —
> exactly one red, the intentional announcement guard. Six low/nit survivors remain, all 1–5
> lines: four land in a single rider commit (the R-9 comment trio + §88b/§88c ledger accuracy +
> a `document.activeElement` guard completing R-2's own `hadFocus` discipline + a `boot={false}`
> negative pin on the route guard); the watchdog's progress-basis is ledgered against the D7
> drop-in; the dwell-re-arm observation is recorded in-code. With the rider merged, the boot
> phase ships hardened end to end: a broken intro video now degrades to the tested no-video route
> with four distinguishable operator breadcrumbs instead of silently deleting the sequence — and
> the honesty disclosure it once deleted is now legible at WCAG AA (5.27:1), focus-handed,
> Escape-scoped, and pinned by 165+ tests plus four compile-forced total records. This closes the
> demo↔phone parity campaign's final phase.

*(Aggregator note: this appendix is uncommitted by contract — the orchestrator commits it with
the closing ledger entry.)*
