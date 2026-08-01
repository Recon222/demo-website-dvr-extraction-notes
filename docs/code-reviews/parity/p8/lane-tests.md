# P8 review — TESTS lane (test quality / false-coverage)

**PR:** #37 · `master..feat/parity-p8` · reviewed at `41f4a93`
**Worktree:** `scratchpad/worktrees/parity-p8` (deps installed; every run below executed there)
**Lane contract:** `.claude/agents/test-analyzer.md` — the single question is *would these tests catch a realistic regression, or do they pass for the wrong reasons?* Production bugs, a11y, type design and swallowed errors belong to other lanes.

Context read before flagging: PR #37's body (the "Deliberate choices — DO NOT RE-FLAG" list), `docs/code-reviews/deferred.md` §87 (a–e) and the standing lessons §84a / §84f, `features/demo/CLAUDE.md`, and the phase machine + both screens in full.

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL / HIGH / MEDIUM / LOW is given alongside so the mapping is auditable.

**Method.** Every claim below is a *mutation probe*, not a reading: the guard/constant/dep/prop is deleted or inverted in the worktree, the paired suites are re-run, and the result recorded. **13 production mutations + 9 scratch-test probes run. Every one reverted; `git diff` is empty against `41f4a93` at the end of this document (verified after each probe and again at the close).** Two scratch probe suites were written, run, and deleted; the untracked `lane-probe-sf.test.tsx` / `zz-td-probe-*.tsx` in this worktree belong to sibling lanes and were left alone.

---

## Gates run in this worktree

| Gate | Result |
|---|---|
| Targeted P8 suites (the 6 changed test files), baseline | **70 passed / 70** — `boot.test.ts` 15, `BootSequence.test.tsx` 12, `SplashScreen.test.tsx` 12, `DemoExperience.boot.test.tsx` 7, plus `content.test.ts` / `explore.test.ts` |
| PR's "+44 tests" claim | **confirmed** — 15 + 12 + 7 new, `SplashScreen.test.tsx` 3 → 12 (+9), `content.test.ts` +1 = 44 |
| Coverage of the one new **gated** module, `engine/logic/boot.ts` | **100 stmts · 100 branch · 100 funcs · 100 lines** (22/22, 12/12, 3/3, 20/20) — the 80% engine gate is met with room |
| Coverage-boundary check (logic parked in ungated `ui/`) | **clean.** The split is the right one: the phase machine, the dwell table, the HUD map and the two drop-in constants all landed in gated `engine/logic/boot.ts`; only the `setTimeout`/`<video>`/effect plumbing — which cannot live in `engine/` — is in `ui/screens/BootSequence.tsx`, and it is covered behaviorally |
| Determinism | **no clock or entropy reads anywhere in the new suites.** Both timer suites drive `vi.useFakeTimers()` in `beforeEach` / `vi.useRealTimers()` in `afterEach`; the dwells come from the engine constants rather than literals |
| Factory usage | `createDemoStore()` in the bridge suite (the house injected-store seam, real store never mocked); no hand-built `DemoCase` / `DemoLocation` literals introduced |
| Mock strategy | one new module mock: `vi.mock('motion/react', …)` partial-spreading the real module to override `useReducedMotion`. **Correct and precedented** — the setup file's `matches:false` `matchMedia` latches motion's module-global, so a per-test `matchMedia` override cannot flip it; the test file says exactly this at `:4-11` (the R-18 ExportHub/ImportTerminalProgress precedent). `motionState.reduce` is reset in `beforeEach`, so no order-dependence |
| Setup-shim traps | **one, and it is load-bearing** — see **T-3**. jsdom's `HTMLMediaElement.prototype.play()` is a not-implemented stub returning `undefined`; the suite prints `Not implemented: HTMLMediaElement's play() method` on every video run |
| Full suite | **not run** (orchestrator instruction: targeted suites only). Failing files were re-run solo; none failed at baseline |

---

## Findings

### [MAJOR · lane-HIGH] T-1 — the one line that turns P8 on in production is observable by no test

**Production code:** `app/demo/page.tsx:12` — `return <DemoExperience boot />`. This prop is the entire delivery mechanism of the phase: `DemoExperience` defaults `boot = false` (`DemoExperience.tsx:425`), deliberately, so the ~30 existing bridge suites don't wait out a splash.
**Tests covering it:** **none.**

**Probe (by construction, not by mutation).** `grep -rl "app/demo/page\|from '@/app/demo'"` across every `*.test.ts(x)` in the repo returns exactly one file — `components/marketing/__tests__/phone-frame.test.tsx` — and its only hit is the word `app/demo/page.tsx` inside a *comment* (`:60`); it `readFileSync`s `components/marketing/*`, never the route. No test imports the route, no test renders it, no test source-reads it. Deleting ` boot` from `page.tsx` is therefore **unobservable by the entire 3451-test suite**, by construction — there is no file that could fail.

**Why it matters.** The failure mode is silent and total: `/demo` stops booting, every P8 test stays green (they all pass `boot` explicitly), and `tsc` is clean because the prop is optional. This is the §84a shape one level out — *the sequence was built, tested, documented, and its single production activation is the untested part.* It is also the phase's only cross-file wiring: the PR body's own "Bridge/route wiring: `boot` is route-owned (`app/demo/page.tsx`), mirroring the phone's root-layout `showSplash`" names it as a deliberate architectural decision, and a deliberate decision with no pin is a decision that survives exactly as long as nobody edits the file.

**Fix.** The repo already has the sanctioned idiom for precisely this class — a structural source-read for an invariant that is about *which file mounts what*, `app/(default)/__tests__/chrome-scope.test.tsx`, whose own comment explains why it anchors on the JSX form rather than the bare word. One test in `app/demo/__tests__/` (the directory exists):

```ts
// The route owns `boot` (P8.1, §87e) — the phone holds showSplash in its ROOT LAYOUT. This is
// the only place it is switched on; DemoExperience defaults it to false for the other suites,
// so dropping it here turns the phase off in production with every test still green.
const page = readFileSync(join(process.cwd(), 'app', 'demo', 'page.tsx'), 'utf8')
it('boots the demo route through the scan', () => {
  expect(page).toMatch(/<DemoExperience\b[^>]*\bboot\b/)
})
```

Anchoring on `<DemoExperience …boot` (not the bare word `boot`) matters for the same reason `chrome-scope` documents: a bare-word match would stay green on a comment mentioning boot after the prop is removed.

---

### [MAJOR · lane-HIGH] T-2 — "runs … on the phone-pinned dwells" is pinned by nothing; every dwell can be zero and the suite stays green

**Production code:** `features/demo/ui/screens/BootSequence.tsx:93-98` — the timed-phase effect, `const timer = setTimeout(advance, ms)` where `ms = bootPhaseDurationMs(phase)`.
**Tests covering it:** `features/demo/ui/screens/__tests__/BootSequence.test.tsx:49-68` (*"runs SCANNING → AUTHORIZED → app on the phone-pinned dwells"*) and `features/demo/ui/__tests__/DemoExperience.boot.test.tsx:10` (`runSequence`).

**Probe — the component can ignore the engine's dwell table entirely:**

| Mutation at `BootSequence.tsx:96` | `BootSequence.test.tsx` + `DemoExperience.boot.test.tsx` |
|---|---|
| `setTimeout(advance, 0)` (every dwell collapsed to zero) | **19 passed / 19** |

And the reason, isolated in a scratch probe: an *overshooting* tick advances exactly one phase and no more —

```
render(<BootSequence videoSrc={null} …/>); tapScanner(); tick(999_999)
  → still AUTHORIZED, onComplete not called   ✓ passes
```

Because each `act()` fires whatever is due and the next phase's timer is armed only when effects flush at the end of that `act()`, the assertions are **monotone in the tick amount**: any `ms ≤ tick` produces an identical result. The tests import `SCAN_MS`/`AUTHORIZED_MS`/`FADE_MS` and tick by exactly those values, so they are also insensitive to the constants changing. There is no lower-bound assertion anywhere: nothing ever ticks *less* than a dwell and checks the phase held.

**What still is pinned, so the finding is scoped honestly.** `boot.test.ts:94-105` pins the *numbers* (`AUTHORIZED_MS === 800`, `HOLD_MS === 500`, `FADE_MS === 300`, `BOOT_SEQUENCE_MS === 1200`, and `SCAN_MS` transitively at 400 through the sum) — a genuinely well-built pin, and `PHASE_MS` is the sole reader of them. What is unpinned is the **wire between them**: that `BootSequence` waits `bootPhaseDurationMs(phase)` rather than any other number. Dropping `[phase]` from the effect's deps *is* caught (probe: **6 failed / 19**), so the chain's *shape* is pinned; only its *lengths* are not.

**The bug that slips through.** Any refactor that hard-codes, halves, or drops a dwell — the plan's "~1.2 s sequence" becoming instantaneous, or the phone's 500 ms `HOLD_DURATION_MS` after the video quietly becoming 50 — ships green. For a phase whose entire deliverable is a timed sequence, and whose test carries "phone-pinned dwells" in its name, that is the §84a shape again: *the name states the contract; the assertions don't make it.*

**Fix.** Three lines, no new machinery — a boundary tick per dwell in the existing test:

```ts
tapScanner()
tick(SCAN_MS - 1)
expect(screen.getByText('SCANNING')).toBeInTheDocument()   // not a millisecond early
tick(1)
expect(screen.getByText('AUTHORIZED')).toBeInTheDocument()
tick(AUTHORIZED_MS - 1)
expect(onComplete).not.toHaveBeenCalled()
tick(1 + FADE_MS)                                          // fading is armed by this act's flush
```

(the last line still needs its own `act`, so keep `tickThrough(1, FADE_MS)` there). Same shape for `HOLD_MS` in the video test. Verified: red under the `setTimeout(advance, 0)` mutation, green at baseline.

---

### [MAJOR · lane-HIGH] T-3 — the autoplay-rejection arm is declared tested in two places and is unreachable in jsdom

**Production code:** `features/demo/ui/screens/BootSequence.tsx:127-128` —
```ts
const started: unknown = el.play()
if (started instanceof Promise) started.catch(() => setPhase('done'))
```
**Tests covering it:** **none.** `BootSequence.test.tsx:114-121` covers the *sibling* arm (`onError={skip}`, the load/decode failure) and nothing else on the ladder.

**Probe.** jsdom implements `HTMLMediaElement.prototype.play()` as a not-implemented stub: it emits a `jsdomError` (visible in every video test run as `Not implemented: HTMLMediaElement's play() method`) and **returns `undefined`**. Confirmed directly:

```
const ret = video.play()
expect(ret).toBeUndefined()          ✓
expect(ret instanceof Promise)       → false   ✓
```

So `started instanceof Promise` is **false in every existing test**, and the `.catch` is never attached, never mind invoked. Installing a rejecting `play` makes the arm fire correctly — so the code is right, and only the coverage claim is wrong:

```
video.play = () => Promise.reject(new Error('NotAllowedError'))
tapScanner(); tick(SCAN_MS); tick(AUTHORIZED_MS); await act(async () => {})
  → onComplete called once   ✓
```

**Why it matters, and why the claim is the finding.** Two documents assert this arm is covered: the PR body (*"load/decode/autoplay failure ENDS the sequence rather than stranding"*, under "What landed") and `deferred.md` §87d (*"tested against a fake source, including … the load/decode/**autoplay-rejection** error path"*). §87d's whole purpose is to tell the next reader that the drop-in is safe because everything behind the constants is proven — and the drop-in is exactly the moment nobody re-reviews. A rejected `play()` is not exotic: iOS Low Power Mode blocks muted-autoplay outright, and it is the single most likely way the owner's video fails in the field. The result is the stranding the code was written to prevent — a black rectangle with only SKIP/Escape as an exit, and no `error` event to trigger `onError`.

**Fix.** One test beside the existing error-path test, using the seam the reduced-motion test already uses (`video.play = …` on the element):

```ts
it('a REJECTED play() (autoplay policy) ends the sequence, same as a load error', async () => {
  const onComplete = vi.fn()
  render(<BootSequence videoSrc={VIDEO} onComplete={onComplete} />)
  const video = screen.getByTestId('demo-boot-video') as HTMLVideoElement
  // jsdom's play() is a no-op returning undefined, so the `instanceof Promise` arm needs this.
  video.play = () => Promise.reject(new Error('NotAllowedError'))
  tapScanner()
  tickThrough(SCAN_MS, AUTHORIZED_MS)
  await act(async () => {})
  expect(onComplete).toHaveBeenCalledOnce()
})
```

Verified green at baseline. If the fix round would rather not carry the test, the alternative is to correct §87d and the PR body — but the arm is four lines to pin and it is the failure mode the video slot exists to survive.

---

### [MINOR · lane-MEDIUM] N-1 — the reduced-motion opt-out is pinned on the wrapper and on the HUD, but not on the wire between them

**Production code:** `features/demo/ui/screens/BootSequence.tsx:167` — `<SplashScreen … reduceMotion={reduceMotion} />`.
**Tests covering it:** `BootSequence.test.tsx:173-176` asserts the *wrapper's* `transition` is dropped; `SplashScreen.test.tsx:76-89` asserts the HUD honours the *prop* in isolation. Nothing asserts the composition.

**Probe.** Deleting ` reduceMotion={reduceMotion}` from `:167`:

```
BootSequence.test.tsx + SplashScreen.test.tsx + DemoExperience.boot.test.tsx → 31 passed / 31
```

**The bug that slips through.** A visitor with `prefers-reduced-motion: reduce` sits on the idle gate — which is where reduced-motion visitors *stay*, since `PHASE_MS.idle` is `null` and nothing advances without their gesture — while `Biometric Lock` runs its 8 s `flicker`. The whole point of §87c's reduced-motion deviation is that this surface's content *is* motion. The prop drop is a realistic edit (it is the kind of thing a props-tidying pass removes), and both halves of the assertion already exist in the suite — they are just never joined.

**Fix.** One line in the existing `reduced motion` describe, which already renders the component:

```ts
it('drops the HUD animations too, not just the wrapper transition', () => {
  const { container } = render(<BootSequence videoSrc={null} onComplete={vi.fn()} />)
  expect(container.innerHTML).not.toContain('flicker')   // the idle HUD's only animation
})
```
Verified: red under the mutation, green at baseline. (`container.innerHTML` is the sanctioned form here — these are inline `animation:` styles, not Tailwind, so `css: false` doesn't blind it; it is exactly what `SplashScreen.test.tsx:79-81` already does.)

---

### [MINOR · lane-MEDIUM] N-2 — the video's own phase boundary is unpinned: it can swallow the AUTHORIZED beat unnoticed

**Production code:** `features/demo/ui/screens/BootSequence.tsx:135` — `const showVideo = hasVideo && phase !== 'idle' && phase !== 'scanning' && phase !== 'authorized'`.
**Tests covering it:** `BootSequence.test.tsx:88-112` — asserts `opacity` `'0'` at **idle** (`:96`) and `'1'` at **video** (`:103`). The `authorized` beat in between is never observed.

**Probe.** Deleting the `phase !== 'authorized'` term — so with a video configured the green AUTHORIZED HUD never paints and the video covers the beat instead:

```
BootSequence.test.tsx → 12 passed / 12
```

**The bug that slips through.** The phone shows AUTHORIZED / ACCESS GRANTED for its full 800 ms and *then* runs the doors video (`AUTHORIZED_MS` exists for exactly that). With the term gone, the demo cuts to the video the instant the scan ends and the 800 ms dwell becomes a black frame — a parity regression invisible to the suite. Note the no-video path is fine: `:57-58` asserts AUTHORIZED there. This is only unpinned on the path the video slot exists for, which is the path that ships unreviewed at drop-in time.

**Fix.** One assertion inside the existing preload test, between the two ticks (`tickThrough(SCAN_MS, AUTHORIZED_MS)` becomes two ticks with a check in the middle):

```ts
tick(SCAN_MS)
expect(screen.getByText('AUTHORIZED')).toBeInTheDocument()  // the HUD keeps the 800ms beat …
expect(video.style.opacity).toBe('0')                        // … the video is still behind it
tick(AUTHORIZED_MS)
```
Verified: red under the mutation, green at baseline.

---

### [MINOR · lane-MEDIUM] N-3 — the `case 'splash'` arm has zero coverage, and one test would have surfaced a double-boot

**Production code:** `features/demo/ui/DemoExperience.tsx:2457-2466` — the `splash` view arm, rewritten by this PR from `<SplashScreen authState="idle" onScan={… setView('dashboard')} />` to a full `<BootSequence … onComplete={… setView('cases')} />`. The destination changed, `dashboard` → `cases`.
**Tests covering it:** **none.** No test in the repo puts `view` in the `'splash'` state (`grep splash` across all suites: every hit is `NARRATION.splash`, `slideDirection`, `CHAPTERS[0]`, or a `getVisibleChapters` walk).

**Probe.** A scratch test doing what the arm's own comment says is possible (*"a restored snapshot can carry it"*):

```ts
const store = createDemoStore(); store.getState().setView('splash')
render(<DemoExperience store={store} boot />)
tapScanner(); runSequence()          // the GATE completes …
expect(screen.getByTestId('demo-boot')).toBeInTheDocument()   // ✓ … and a SECOND one is up
expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()   // ✓
tapScanner(); runSequence()
expect(store.getState().view).toBe('cases')                   // ✓ only now
```

The visitor runs the whole sequence **twice**: the route-owned gate, then the `splash` view underneath it. Both passed, i.e. the double-boot is real today.

**Scoped honestly:** `view: 'splash'` passes the loader's `isAppView` (splash ∈ `CHAPTERS` ⊂ `APP_VIEWS`, `persistence.ts:366-371`), so a snapshot carrying it *is* restored — but nothing in the running app writes it (initial view is `'cases'`; `onPrev` is wired only to wizard screens, whose prev bottoms out at `'cases'`; the explore checklist deliberately excludes splash). So the arm is currently reachable only from a hand-edited snapshot or a future build that adds a splash jump. That is why this is minor rather than major — but the arm was *rewritten* by this PR, its destination silently changed, and the cheapest possible pin would have caught the double-boot on the way in.

**Fix.** One test in `DemoExperience.boot.test.tsx`, asserting whichever behaviour the fix round decides is correct (the double-boot itself is the TS/web lane's call — this lane's finding is that nothing observes the arm at all):

```ts
it('a snapshot restored onto the splash chapter still lands on Cases', () => {
  const store = createDemoStore(); store.getState().setView('splash')
  render(<DemoExperience store={store} boot />)
  tapScanner(); runSequence()
  expect(store.getState().view).toBe('cases')   // fails today: still 'splash', second gate up
})
```

---

### [MINOR · lane-MEDIUM] N-4 — the totality pins are `tsc`'s, not the tests'; the tests' own phase list drifts silently

**Production code:** `features/demo/engine/logic/boot.ts:117` (`PHASE_MS: Record<BootPhase, …>`), `:164` (`HUD_STATE: Record<BootPhase, …>`), `:143-160` (`nextBootPhase`'s exhaustive switch).
**Tests:** `boot.test.ts:16` — `const ALL_PHASES: readonly BootPhase[] = ['idle', … 'done']`, consumed by *"is total over the phase union"* (`:89`, `:120`), *"collapses to done from ANY phase"* (`:55`) and *"returns a successor for every non-terminal phase"* (`:67`).

**Probe, in two halves.**

1. **The production totality is genuinely compile-forced.** Adding `| 'failed'` to `BootPhase` →
   ```
   boot.ts(117,7): TS2741  Property 'failed' is missing … Record<BootPhase, number | null>
   boot.ts(143,67): TS2366 Function lacks ending return statement …
   boot.ts(164,7): TS2741  Property 'failed' is missing … Record<BootPhase, BootHudState>
   ```
   Three errors, one per device. A phase cannot ship without a dwell decision, a HUD decision and a successor. **This is real and it is good** — better than a test could do.

2. **The tests contribute nothing on top of it, and go stale without saying so.** With `'failed'` added *and the three production sites filled in* (so `tsc --noEmit` is clean), `boot.test.ts` is **15 passed / 15** — the three "is total over the phase union" tests, the ANY-phase reduced-motion loop and the non-terminal-successor loop all still iterate the stale seven-element `ALL_PHASES`. `readonly BootPhase[]` type-checks a *subset* perfectly happily.

**Why it matters.** The PR body sells these as *"two total records (`PHASE_MS`, `HUD_STATE`) **pinned by totality tests**"*. They are pinned by the compiler; the tests are tautological over a list that a future phase silently escapes. Concretely: a later `'failed'` or `'retrying'` phase would land with `nextBootPhase` and `bootHudState` entries no behavioural test ever walks — a `case 'failed': return 'failed'` self-loop would pass all fifteen (`walk()` starts at `idle` and never reaches it). The risk is modest today, which is why this is minor; the mis-attribution of where the guarantee lives is the part worth correcting, because §87a explicitly reserves a `failed`-adjacent design space for the day the demo gains a real gate.

**Fix.** Make the test's list compile-forced too, which is three lines and retires the mis-attribution:

```ts
const ALL_PHASES = ['idle', 'scanning', 'authorized', 'video', 'holding', 'fading', 'done'] as const
// A phase added to BootPhase must be added here too, or this line stops compiling — otherwise
// every "is total over the phase union" test below silently stops being total.
const _allPhasesTotal: Exclude<BootPhase, (typeof ALL_PHASES)[number]> extends never ? true : never = true
```

`SplashScreen.test.tsx:29`'s `it.each<AuthState>(['idle','scanning','authorized'])` is the same shape at smaller scale (a three-member union, a hand-typed three-member list) — worth the same `satisfies`-style guard while the file is open, or worth leaving; it is named here only so the fix round decides once.

---

### [MINOR · lane-LOW] N-5 — the drop-in announcement under-names its own blast radius

**Test:** `boot.test.ts:126-131` — *"ships empty — the owner supplies the bunker-doors video later (D7)"*, with the comment *"If this test ever fails, the video landed: check that `public/demo-media/` actually holds the file."*

**Probe.** Flipping `BOOT_VIDEO_SRC` to `'/demo-media/boot-intro.mp4'`, i.e. performing the owner's drop-in exactly as documented:

```
boot.test.ts + BootSequence.test.tsx + DemoExperience.boot.test.tsx → 4 failed / 34
  × ships empty — the owner supplies the bunker-doors video later (D7)      ← the intended signal
  × lands a first-time visitor on Cases, with the tab bar back
  × hands a returning visitor back the view their snapshot restored
  × the rail narrates the splash chapter while the gate is up
```

The mechanism works — the change does announce itself. But three of the four failures are collateral: `DemoExperience.boot.test.tsx`'s `runSequence` (`:10`) is `[SCAN_MS, AUTHORIZED_MS, FADE_MS]`, which stalls at `video` once a source exists because nothing fires `ended`. The maintainer performing a two-constant change meets four red tests, only one of which is the message. **Fix:** extend the announcement comment to name the other file and the required edit — *"and `DemoExperience.boot.test.tsx`'s `runSequence` will need an `ended` + `HOLD_MS` step"* — or make `runSequence` fire `ended` when a video element is present. Either is a comment-sized change; the second is more honest but couples the helper to the slot.

---

### [NIT] N-6 — no cleanup pin for the window `keydown` listener

`BootSequence.tsx:109-115` registers a `window` `keydown` listener and removes it on unmount. Verified working (probe: `removeEventListener` is called with `'keydown'` on unmount). The suite has precedent for asserting teardown at this level — the `useReducedMotion` unmount test asserts the *exact registered handler* is the one removed, and was verified to fail when cleanup is dropped. Not filed higher because a leaked listener here degrades to a no-op `setPhase` on an unmounted tree rather than a visible defect; noted so the omission is a recorded choice.

---

## Verified as pinned — probes that reddened as they should (no findings)

Recorded so the fix round doesn't "improve" something that already works, and so the strength of this suite is on the record alongside its gaps.

| Claim | Mutation | Result |
|---|---|---|
| Boot is a **gate, not a view** — the restored position survives (§87e, the phase's central claim) | `endBoot` also does `setView('cases')` | **2 failed / 7** ✅ |
| The tab bar is withheld while the gate is up | drop `&& !booting` from `tabBar={…}` | **1 failed / 7** ✅ |
| The rail narrates the splash chapter while the gate is up | drop the `booting ? NARRATION.splash` override | **1 failed / 7** ✅ |
| The video **mounts early to buffer behind the HUD** (the phone's trick) | mount on `showVideo` instead of `hasVideo` | **2 failed / 12** ✅ |
| Reduced motion collapses **from any phase**, not just idle | `if (cfg.reduceMotion && phase === 'idle')` | **1 failed** (engine) ✅ |
| `HUD_STATE` holds AUTHORIZED past the scan | `fading: 'idle'` | **1 failed / 15** ✅ |
| The timer **chain** is armed per phase | drop `[phase]` from the effect deps | **6 failed / 19** ✅ |
| `onComplete` fires once under a changing callback identity | (covered by `:70-79`, `completedRef`) | pinned ✅ |
| The `ended` advance, the `onError` skip, SKIP from any phase, Escape-as-SKIP, `boot` defaulting to false | — | all pinned by direct assertion ✅ |

**`tickThrough` is sound, and its stated invariant is correct.** The helper's comment (*"One `act` per dwell — the next phase's timer is armed by an effect, and effects only flush at the end of an `act`, so a single combined advance stalls one phase in"*) is not cargo cult: probed directly, `tapScanner(); tick(SCAN_MS + AUTHORIZED_MS + FADE_MS)` leaves the component **at AUTHORIZED with `onComplete` uncalled**. One act per dwell is genuinely required. (What that same property costs is T-2.)

**`clearTimeout` cleanup (`:97`) is unpinned but not filed.** Dropping it → 19 passed. It is genuinely benign here: `advance` is a functional update through `nextBootPhase(p, …) ?? p`, so a late timer from an abandoned phase is absorbed (SKIP to `done` → the stale `scanning` timer resolves to `null` → `?? p`). Demanding a test for a no-op would be padding.

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| CRITICAL / blocker | 0 |
| HIGH / major | 3 (T-1, T-2, T-3) |
| MEDIUM / minor | 4 (N-1 … N-4) |
| LOW / nit | 2 (N-5, N-6) |

Probes run: **22** — 13 production mutations (7 reddened as required, 1 reddened by design at the drop-in, 4 stayed green and became findings, 1 stayed green and was ruled benign) plus 9 scratch-test probes (5 confirming a gap is real and reachable, 4 controls). One finding (T-1) is by construction rather than by mutation: nothing imports the file, so nothing can fail.

Behaviorally meaningful coverage: **adequate, and strong exactly where the phase's own doc says the risk is** — the gate-vs-view distinction (§87e), the tab-bar withholding, the rail override, the early video mount and the escape hatches are all mutation-proven. The gaps cluster in one place and have one shape: **the surfaces that only matter later** — the production activation (T-1), the dwell fidelity behind the constants (T-2), and the video ladder that goes live when the owner flips two constants (T-3, N-2, N-5). Each is one test.
Engine coverage gate (80% on `lib/**` + `engine/**`): **met** — `boot.ts` at 100/100/100/100.
Mock strategy: **at the IO edge** — one precedented `motion/react` partial mock for a module-global that `matchMedia` cannot reach; the real store is injected, never mocked; engine logic never mocked.
Factory usage: **canonical** — `createDemoStore()` via the `store` prop; no new domain literals.
Setup-shim traps: **one, and it is a finding** — jsdom's not-implemented `play()` returns `undefined`, so the `instanceof Promise` autoplay-rejection arm is unreachable in every existing test (T-3).
Determinism (clock/entropy injected): **yes** — fake timers throughout, dwells read from the engine constants, no wall-clock or entropy reads.

**Verdict: REVISE.** Three majors, each closed by one test and none requiring new machinery: a structural route guard (T-1, the `chrome-scope.test.tsx` idiom the repo already owns), boundary ticks in the test that already names the dwells (T-2), and a rejecting-`play` stub beside the existing error-path test (T-3). Everything else is minor. Nothing here questions the design — the phase machine, the gate/view split and the drop-in seam are all sound and mostly well pinned; the ledger's §87d claim about the autoplay path is the one statement that should not stand as written.

---

## Fix-delta r1

**Reviewed at:** `15b683b` (fix round merged, `5b3213a..15b683b`) · same worktree, deps unchanged
**Gates:** targeted P8 surface **178 passed / 9 files** · cold `tsc --noEmit` clean · tracked `features/` + `app/` diff empty at the close (verified after every probe)
**Method, unchanged:** 22 mutation probes — each fix's guard/constant/prop deleted or inverted, paired suites re-run, every one reverted.

**Prior findings: 9 raised, 9 FIXED.** New this round: **1 nit** (FD-1d, below). Verdict moves **REVISE → APPROVE**.

### The three majors

**T-1 FIXED** — R-3 `5862e2a`, `app/demo/__tests__/boot-activation.test.ts` (new). Three probes, all red as required:

| Mutation on `app/demo/page.tsx` | Result |
|---|---|
| `<DemoExperience />` — the prop deleted | **1 failed / 2** ✅ |
| `<DemoExperience bootMode />` — the prop renamed | **1 failed / 2** ✅ (`\bboot\b` finds no word boundary inside `bootMode`) |
| `<DemoExperience /> /* boot lives here */` — the word left in a comment | **1 failed / 2** ✅ |

The JSX anchor is **sound, not brittle**, and the third probe is the one that matters: `[^>]*` stops at the tag's own `>`, so the bare-word false-green that `chrome-scope.test.tsx`'s comment warns about is genuinely closed rather than merely cited. It is also formatting-proof — `[^>]*` is a character class, so it spans newlines and a prettier reflow onto multiple lines still matches. The second test (`.match(/<DemoExperience\b/g)` has length 1) closes the other direction, a second render site satisfying the first assertion. This is a better guard than the one I proposed.

**T-2 FIXED** — R-4 `47d1f6b`. The exact mutation that was green in round 1 now reds:

```
setTimeout(advance, ms) → setTimeout(advance, 0)
  BootSequence.test.tsx + DemoExperience.boot.test.tsx → 2 failed / 34
    × runs SCANNING → AUTHORIZED → app on the phone-pinned dwells
    × preloads during the scan, then plays through the same sequence slot
```

Both dwells in the scan test are now boundary pairs (`tick(SCAN_MS - 1)` still SCANNING → `tick(1)` AUTHORIZED, and the same for `AUTHORIZED_MS` and `FADE_MS`), and the fix went past the finding: `HOLD_MS` got the same treatment in the video test (`:125-127`), which is why the second suite reds too. The comment at `:50-53` states the monotone-assertion trap in its own words.

**T-3 FIXED** — R-5 `a816a67`. The arm is genuinely *reached* now, not merely accompanied by a test named for it. Probe — neutering only the arm's body, leaving the `instanceof Promise` guard and the stub in place:

```
started.catch((reason) => { void reason })   // was: warn + setPhase('fading')
  BootSequence.test.tsx → 1 failed / 24
    × fades out when the browser REFUSES to autoplay — the likeliest field failure (R-5)
```

The test installs `video.play = () => Promise.reject(new DOMException(…, 'NotAllowedError'))` and settles it with `await act(async () => {})`, which is the only way past jsdom's not-implemented `play()`. §87d's coverage claim is now true as written. Note the fix also *changed* the arm — a rejection now fades out rather than cutting to `done`, consistent with R-1a's ruling — and the test pins the fade (`not.toHaveBeenCalled()` → `tick(FADE_MS)` → called) and the breadcrumb, so the behaviour change is pinned rather than merely applied.

### The four minors

- **N-1 FIXED** — R-15. Dropping `reduceMotion={reduceMotion}` from the `SplashScreen` call → **1 failed / 24** (`passes the preference DOWN to the HUD, not just into its own timers`). The composition is pinned where both halves were previously pinned only in isolation.
- **N-2 FIXED, and structurally** — R-11a + R-16. The deny-list became a total record in the engine (`SURFACE: Record<BootPhase, 'hud' | 'video'>`), so the finding's *shape* is closed by the compiler, and the component test now asserts the AUTHORIZED beat between the two ticks. One mutation reds both: `SURFACE.authorized: 'hud' → 'video'` → **2 failed / 41**, one in `boot.test.ts` (the exact-partition assertion) and one in `BootSequence.test.tsx` (the beat).
- **N-3 FIXED** — R-10. Closed at the loader rather than at the arm, which is the better place: `loadSnapshot` normalizes a hand-edited `splash` view/chapter to `cases` before it reaches the store, so the double-boot I probed has no ingress left. Removing the two normalization lines → **1 failed / 54** in `persistence.test.ts`. The `case 'splash'` arm stays as the total-switch answer with its reachability comment corrected from "a restored snapshot can carry it" to "unreachable by construction" — which is now true.
- **N-4 FIXED (substantively)** — R-11b. `BOOT_PHASES = Object.keys(PHASE_MS) as readonly BootPhase[]` replaces the hand list. Probe — grow `BootPhase` by one member and fill the three records the compiler demands (`tsc` clean):

  ```
  round 1: 15 passed / 15   (the stale hand list silently covered 6 of 7)
  now:      1 failed / 17   × gives the HUD every phase up to the video, and the video everything after (R-11a)
  ```

  The derivation is total for the same reason `PHASE_MS` is, so every "for every phase" loop widens automatically, and `bootSurface`'s exact-partition assertion is the one that turns the widening into a failure. **Residual, recorded not filed:** the three `is total over the phase union` assertions remain runtime-tautological by construction — `Object.keys(PHASE_MS)` cannot contain a key `PHASE_MS` lacks. That is fine now: the substance of N-4 was the mis-attribution, and `boot.ts:161-167` now says in its own words that the guarantee is the compiler's. `BOOT_PHASES` has no production consumer (one declaration, one test import) — a deliberate test-support export from a gated module, noted so a later reader doesn't take it for dead code.
- **N-5 FIXED** — R-17, and the ledger's claim about it verified. Performing the owner's drop-in (`BOOT_VIDEO = { src: …, poster: null }`) now reds **exactly one test / 52**, the intended announcement — where in round 1 the same edit red 4, three of them collateral. `runSequence` fires `ended` when a video element is present, so the bridge suite walks the video path unchanged.
- **N-6 FIXED** — R-19. Dropping the `keydown` cleanup → **1 failed / 24**; the pin asserts the *identity* of the removed handler against the registered one, matching the `useReducedMotion` unmount precedent rather than settling for "removeEventListener was called".

### The author's claimed mutation evidence — re-run

Nine of the round's own claims spot-checked; all hold.

| Fix | Mutation | Result |
|---|---|---|
| R-1b (stall watchdog) | watchdog effect short-circuited | **2 failed / 24** — the stall test *and* the known-duration test ✅ |
| R-2 (component half) | `skipRef.current?.focus()` → no-op | **1 failed / 34** ✅ |
| R-2 (the `hadFocus` guard) | guard dropped, always focus SKIP | **1 failed / 24** — `leaves a mouse visitor's focus alone` ✅ (so that test is load-bearing, not a tautology on jsdom's non-focusing click) |
| R-2 (bridge half) | `phoneScreenRef.current?.focus()` → no-op | **1 failed / 10** ✅ |
| R-14 (mid-flight reduced motion) | the `if (reduceMotion)` short-circuit reverted | **1 failed / 24** ✅ |
| R-7 (Escape ownership) | `e.stopPropagation()` removed | **1 failed / 10** ✅ |
| R-8 (boundary recovery) | `onReturnToCases` back to bare `returnToCases` | **1 failed / 1** ✅ |
| R-12 (visited seed) | the `setView(view)` replay effect deleted | **1 failed / 10** ✅ |
| R-6 (disclosure contrast) | alpha `0.70 → 0.55` | **1 failed / 13** ✅ — *see the re-check note below* |

Two compile-gated devices verified by `tsc`, not by reading:

- **R-1d** — making `BootVideo.src` optional → `boot.test.ts(28,39): error TS2344: Type 'false' does not satisfy the constraint 'true'`. The `_PosterAloneIsNotAVideo` assertion is genuinely gated; the correlated-optional trap cannot be re-opened silently.
- **R-9 / R-11b (HUD half)** — adding a fourth member to `BOOT_HUD_STATES` → exactly one `TS2741`, at `SplashScreen.tsx:58` (`statusBody`), precisely as `boot.ts:37-47` claims. The `it.each(BOOT_HUD_STATES)` sweep in `SplashScreen.test.tsx` widens with it, closing the smaller hand-list I named in N-4's tail.

**Re-check note (R-6).** My first reading of the alpha mutation recorded 13/13 green, which would have been a false-coverage finding. **Not reproduced.** Two clean re-runs both red with an explicit `AssertionError: expected 0.55 to be greater than or equal to 0.65`, and a scratch probe confirms the machinery end to end (`style.color` serializes to `"rgba(153, 186, 221, 0.7)"`, the regex captures `"0.7"`). The first reading was an artifact of my own batched probe script, not of the suite. **No finding.** The pin's one honest limit, which its comment already implies: it asserts the *alpha*, not a computed contrast ratio, so a change to the boot **background** (`#000314`, owned by `BootSequence`, not by this component) would move the real ratio without moving this assertion. It fails safe in the other direction — a changed base colour makes the regex miss, `alpha` becomes `NaN`, and `NaN >= 0.65` is false.

### New this round

**[NIT] FD-1d — `boot={false}` satisfies the route guard**

```
<DemoExperience boot={false} />  →  app/demo/__tests__/boot-activation.test.ts: 2 passed / 2
```

`\bboot\b` matches the prop name regardless of its value, so the one edit that leaves the prop present and the phase off passes. Not raised higher: the guard exists for *accidental deletion* (the silent, total regression), and writing `boot={false}` is a deliberate act — the "temporarily disabled for debugging, forgot to restore" case rather than the tidy-up case. Closing it is one assertion if the fix round wants it: `expect(page).not.toMatch(/\bboot=\{false\}/)`, or tighten the positive to `/<DemoExperience\b[^>]*\sboot\s*\/?>/`.

### Fix-delta summary

| Severity | Count |
|---|---|
| CRITICAL / blocker | 0 |
| HIGH / major | 0 |
| MEDIUM / minor | 0 |
| LOW / nit | 1 (FD-1d) |

Prior findings: **9 FIXED, 0 deferred, 0 standing.**
Probes re-run this round: **22** — 20 reddened as required, 1 exposed the FD-1d nit, 1 (R-6) was a first-reading artifact resolved against the suite on re-run.
Behaviorally meaningful coverage: **strong.** The round did not close the findings by adding assertions; it closed them by moving the invariants somewhere they cannot drift — the deny-list became a total record (N-2), the hand list became a derivation (N-4), the reachable ingress was closed at the loader rather than defended at the arm (N-3), and the correlated `src`/`poster` pair became one value with a compile guard. Three of the nine fixes are now enforced by `tsc` rather than by a test, which is the stronger outcome.
Determinism: **unchanged** — no clock or entropy reads added; the two new async seams (`await act(async () => {})` for the `play()` rejection, the watchdog's fake-timer ceiling) are both explicit.

**Verdict: APPROVE.** One nit, one assertion wide, and nothing that blocks the merge.
