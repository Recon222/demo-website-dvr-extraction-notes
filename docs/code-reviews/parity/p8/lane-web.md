# P8 review r1 — WEB lane (platform / a11y / perf)

**PR:** #37 — `master..feat/parity-p8` @ `41f4a93` · **Lane:** web-reviewer (platform, accessibility,
render + bundle performance, browser-API correctness, CSS/half discipline)
**Worktree:** `parity-p8` (deps installed) · **Build:** `pnpm build` exit 0 · **Targeted suites:** 7 files / 58 tests green

Context read before reviewing: PR #37's body (incl. the DO-NOT-RE-FLAG block), `docs/code-reviews/deferred.md`
§87 (all five sub-sections), §84a and §84f, `features/demo/CLAUDE.md`, the lane definition, plus
`ScreenStage.tsx`, `_shared.tsx`'s `ModalShell`, `ExitDialog.tsx`, `demo.css` and `PhoneFrame.tsx` as
render parents / precedent.

Every HIGH and MEDIUM below is backed by a **runtime probe** executed in the worktree (throwaway vitest
files, run and deleted — `git status` clean, nothing committed). Probe IDs (P1…P6, Q1…Q3) are cited per
finding and the probe bodies are reproduced in Appendix A.

---

## Findings

### [HIGH] The boot gate has no focus handling — focus is dropped to `<body>` every time it lifts, and again mid-sequence on the video path

**File:** `features/demo/ui/screens/BootSequence.tsx:80-174` (no focus logic anywhere in the component);
`features/demo/ui/DemoExperience.tsx:485-486, 2966` (mount/unmount site);
`features/demo/ui/screens/BootSequence.tsx:135-136` (the `showHud = !showVideo` swap)

**Issue:** `BootSequence` is a new full-surface overlay containing the only two focusable controls on the
screen (the full-bleed scan button, `SplashScreen.tsx:127-145`, and SKIP, `BootSequence.tsx:169-171`).
When the gate completes, `DemoExperience` unmounts the whole subtree and mounts the screen tree in its
place. Nothing moves focus, so the focused control is destroyed while it holds focus and the browser
resets `document.activeElement` to `<body>`. The keyboard visitor who just pressed Space on "Run the
simulated biometric scan" — the app's very first interaction — has their next Tab restart from the top
of `/demo` instead of continuing into the app they just unlocked, and no screen reader is told the gate
is gone. On the video path it is worse: `showHud` flips false at `authorized → video`, unmounting
`SplashScreen` (and the focused button) **mid-sequence**, ~1 s before the gate itself goes away.

**Evidence:**

- Probe **P1** — focus placed on the scan button, gate run to completion:
  `document.activeElement` after the gate lifts = `BODY`.
- Probe **P1b** — focus placed on SKIP, SKIP clicked: `document.activeElement` = `BODY`.
- Probe **Q2** — video path, focus on the scan button:
  `focus after scanning→authorized: still on scan button` → `focus after authorized→video: BODY`
  (`Q2 splash still mounted? false`).
- Lane contract, *HIGH — Accessibility*: "a modal/sheet/drawer that opens must move focus into itself and
  restore it on close; **focus must not be left on an unmounted node.** Flag new overlays with no focus
  handling."
- WCAG 2.4.3 Focus Order (Level A) — a navigation sequence that dumps the visitor back to the document
  start does not preserve meaning or operability.
- In-repo precedent that this is a solved problem here: `ExitDialog.tsx:70-77` places focus deliberately
  on open (`autoFocus` with a documented `jsx-a11y/no-autofocus` disable, "focus lands on the safe
  default action when the modal opens"). The boot gate is the one overlay every visitor meets and it is
  the only one with no focus story at all.

Note this is **not** a focus-trap complaint — §87c's ruling that the gate stays escapable and the rail
stays clickable is correct and deliberately not a dialog. The gap is only the hand-off.

**Fix:** on completion, put focus somewhere meaningful in the revealed app rather than letting it fall to
`<body>` — e.g. `DemoExperience` keeps a ref on the phone's screen container, gives it `tabIndex={-1}`,
and `endBoot()` focuses it (the same one-line shape as `ExitDialog`'s `autoFocus`, inverted). On the
video path, either keep `SplashScreen` mounted behind the video (`opacity: 0` / `visibility: hidden`,
matching how the video itself is kept mounted at `opacity: 0` from the first frame) or move focus to SKIP
at `authorized → video` so the sole remaining control holds it. Same fix serves the SR case if the
focused target carries an accessible name.

---

### [MEDIUM] `onError={skip}` conflates *preload* failure with *playback* failure — one bad byte deletes the whole opening, scan included

**File:** `features/demo/ui/screens/BootSequence.tsx:152-165` (specifically `:162` `onError={skip}`, with
`:160` `preload="auto"` and the mount-from-first-frame at `:131`)

**Issue:** the `<video>` is mounted at phase `idle` and told to buffer immediately (the phone's preload
trick, correctly ported). `onError` is wired straight to `skip()`, which sets phase `done`. So a 404, an
unsupported codec, a CORS/network failure — anything that resolves during buffering, i.e. **before the
visitor has even tapped** — ends the entire boot sequence. The visitor gets no scan, no HUD, no fade: the
gate blinks out of existence at page load. D7 commissioned the scan; a missing video file should degrade
to the already-implemented no-video route (`authorized → fading`), not delete the surface the package
exists to build.

**Evidence:**

- Probe **P3** — render with a video source, stay at `idle` ("TAP TO SCAN" on screen), fire `error` on the
  element: `onComplete called at idle on preload error = 1`. The gate is gone before the sequence started.
- The machine already has the correct degraded route and it is unit-tested:
  `nextBootPhase('authorized', { videoSrc: null }) === 'fading'` (`boot.test.ts`, "runs scan → authorized
  → fade → done when no video source is configured").
- The component's own doc comment (`:76-78`) scopes the error path to "stranding the visitor on a black
  rectangle" — a black rectangle is only possible once the video owns the surface, i.e. from phase `video`
  onward. At `idle`/`scanning`/`authorized` the HUD is on screen and healthy.

**Dormancy:** `BOOT_VIDEO_SRC` is `null` today so this cannot fire on `master`. It activates on exactly
the two-constant drop-in §87d advertises as needing nothing else, which is why it is worth closing now.

**Fix:** hold a `videoFailed` state; `onError` sets it, and the config passed to `nextBootPhase` uses
`videoSrc: videoFailed ? null : videoSrc` so a failure before/at the video phase falls into the no-video
route. Only an error raised while `phase === 'video'` should end the sequence.

---

### [MEDIUM] The video failure ladder has no stall rung — a video that neither ends nor errors holds the gate open indefinitely

**File:** `features/demo/engine/logic/boot.ts:117-125` (`PHASE_MS.video = null`) +
`features/demo/ui/screens/BootSequence.tsx:93-98` (no timer armed for a `null` dwell)

**Issue:** phase `video` advances only on the element's `ended` event. `stalled`, `waiting`, `suspend` and
a `play()` promise that resolves onto a stream that then freezes do **not** raise `error`, so none of them
reach `onError`. A truncated/corrupt MP4, a mid-playback network drop, or a decoder that gives up after
the first GOP leaves the sequence parked in `video` forever with the app never revealed.

**Evidence:**

- Probe **P4** — enter phase `video` with `play()` resolving, then advance fake timers by **600 000 ms**:
  `onComplete after 10 min stalled in video phase = 0`.
- `BootSequence.tsx:76-78` and `deferred.md` §87d both state the failure path "ends the sequence rather
  than stranding the visitor" / "ends the sequence rather than stranding the visitor on a black
  rectangle". A stall is precisely the stranding those sentences claim to have covered — §84a's own
  lesson ("a doc comment naming the right idiom while the code shipped half of it"), one rung down the
  ladder.

**Mitigation already present:** SKIP and Escape rescue the visitor, so this is a stuck *sequence*, not a
trapped *person* — which is why it is MEDIUM and not HIGH. It is also dormant while `BOOT_VIDEO_SRC` is
`null`.

**Fix:** give `video` a ceiling rather than `null` — either a watchdog `setTimeout` armed on entry to
`video` (cleared by `ended`) sized from `el.duration` once `loadedmetadata` fires, or a fixed
`VIDEO_MAX_MS` constant beside the other phone-pinned dwells. Adding `onStalled` alone is insufficient;
`stalled` does not fire for every freeze.

---

### [MEDIUM] The honesty disclosure is the least readable text on the boot surface — 3.59:1, fails WCAG 1.4.3

**File:** `features/demo/ui/screens/SplashScreen.tsx:112-124` —
`color: 'rgba(153,186,221,0.55)'`, `fontSize: 11`, on the gate's `#000314` background
(`BootSequence.tsx:145`)

**Issue:** composited over `#000314`, `rgba(153,186,221,0.55)` resolves to `rgb(84,104,131)` for a
contrast ratio of **3.59:1**. At 11 px this is normal-size text and needs **4.5:1** (WCAG 1.4.3 Contrast
Minimum, Level AA). This is not a lifted prototype value — it is copy this PR added, and it is the single
line carrying the package's honesty claim ("Simulated scan — a browser tab has no biometric sensor. On
the phone this is Face ID."). It is also the *only* failing string on the surface; the decoration all
passes:

| Element | Computed | Required | |
|---|---|---|---|
| Disclosure `rgba(153,186,221,0.55)` 11 px | **3.59:1** | 4.5:1 | **FAIL** |
| `BIOMETRIC LOCK` `#2B8CC1` 18 px | 5.50:1 | 4.5:1 | pass |
| `TAP TO SCAN` / `SCANNING` `#2B8CC1` 23 px | 5.50:1 | 3:1 (large) | pass |
| `AUTHORIZED` `#30D158` 23 px | 10.15:1 | 3:1 (large) | pass |
| `ACCESS GRANTED` `rgba(48,209,88,0.7)` 14 px | 5.21:1 | 4.5:1 | pass |
| `SKIP` label on its pill | 8.22:1 | 4.5:1 | pass |

**Evidence:** ratios computed with the WCAG 2.x relative-luminance formula against the exact composited
backgrounds (alpha flattened over `#000314`; the SKIP label additionally flattened over its own
`rgba(4,8,14,0.55)` pill). Reproduction script in Appendix A.

**Fix:** one number — raise the alpha to **0.65** (4.65:1, minimum passing) or **0.70** (5.27:1, comfortable
and still visually subordinate to the HUD). Verified sweep: 0.55 → 3.59, 0.60 → 4.09, 0.65 → 4.65,
0.70 → 5.27, 0.75 → 5.94.

---

### [LOW] A new instance of the §19 double-Escape family: Escape during boot with the exit dialog open dismisses both

**File:** `features/demo/ui/screens/BootSequence.tsx:109-115` (`window` keydown, unconditional for the
gate's whole life) vs `features/demo/ui/controls/ExitDialog.tsx:25-31` (`document` keydown while open)

**Issue:** the rail sits outside the phone and stays interactive during boot (§87c, deliberate). On a
fresh session every manifest row is unlit, so clicking the rail's back-to-site link during boot runs
`onBackToSite` → `unseen.length > 0` → `setExitOpen(true)` (`DemoExperience.tsx:668-673`). Both listeners
are now live and neither stops propagation, so one Escape closes the dialog **and** skips the boot.

**Evidence:** probe **P2** — `dialogClosed= true  bootAlsoSkipped= true`.

**Why LOW, not a re-file of §19:** the lane contract says don't re-file §19 but do flag a new instance.
This is a new pair, but both outcomes are "dismiss something the visitor was trying to leave", so the
blast radius is one lost decoration. Recording it so the family stays counted rather than asking for a
fix; a `boot ? no-op : skip` guard or an `exitOpen`-aware listener would close it if the round is
touching the file anyway.

---

### [LOW] Flipping reduced-motion mid-sequence restarts the current dwell instead of collapsing at the next deadline

**File:** `features/demo/ui/screens/BootSequence.tsx:85-98`

**Issue:** `advance`'s identity depends on `reduceMotion`, and the timer effect depends on `advance`, so
flipping the OS setting mid-dwell tears down the pending `setTimeout` and arms a **fresh full-length** one
rather than collapsing. `boot.ts:139-141` says the from-any-phase collapse exists "so a visitor who flips
the OS setting mid-sequence lands on the app at the next advance instead of finishing an animation they
just opted out of" — they do land at the next advance, but that advance has been pushed back by up to a
full `AUTHORIZED_MS`.

**Evidence:** probe **P6** — flip at 700 ms into the 800 ms `authorized` dwell:
`completed at original deadline = 0`, then `completed after a fresh full dwell = 1`.

**Fix (if touched):** short-circuit in the timer effect — `if (reduceMotion) { setPhase('done'); return }`
before reading the dwell. Bounded at 800 ms of unwanted animation, hence LOW.

---

### [LOW] SKIP's accessible name is the bare word

**File:** `features/demo/ui/screens/BootSequence.tsx:169-171`

The gate's sole escape hatch announces as "SKIP, button" with no object. Every other icon-or-terse control
in this feature carries an explicit purpose (`aria-label="Capture"`, `aria-label="Close"`,
`aria-label="Run the simulated biometric scan"` two elements away). `aria-label="Skip the opening
sequence"` keeps the visual chrome and names what is being skipped. Nit.

---

## Verified clean — checked in depth, no finding

These are the brief's explicit emphases. Each was probed or computed rather than read.

**The `aria-disabled` transition does not drop focus.** Probe **Q1**: the scan button is the *same DOM
node* across `idle → scanning → authorized` (`button same node idle→scanning: true, scanning→authorized:
true`). `aria-disabled` + a no-op `onClick` (`SplashScreen.tsx:130-132`) is used instead of the `disabled`
attribute, which would blur it. This is exactly right and the shipped test pins the distinction
(`expect(btn).not.toBeDisabled() // 'disabled' would blur it — aria-disabled does not`).

**The `role="status"` region announces *changes*, not a mount-with-text.** Probe **Q1**: the region is a
single persistent node across all three phases (`region same node idle→scanning: true,
scanning→authorized: true`), with only its children swapped by React. That is the correct construction —
a live region created in the same mutation as its content is the classic case ATs do **not** announce, and
this one is registered at mount with `TAP TO SCAN` and then *mutated*, so `SCANNING` and `AUTHORIZED /
ACCESS GRANTED` are true live updates. The initial idle text is separately covered by
`aria-describedby={statusId}` on the button (`SplashScreen.tsx:131`), so a visitor who tabs to the control
hears it regardless. Residual, not a finding: `SCANNING` lives 400 ms and `AUTHORIZED` 1100 ms before the
region is destroyed (probe **Q3**), so polite-queue coalescing means most SR users will hear only the
`AUTHORIZED` pair. That is the right one to hear.

**SKIP is focusable in every phase.** Probe **P5**: `idle:true scanning:true authorized:true fading:true`
— the button is rendered unconditionally outside the `showHud`/`showVideo` branch (`:169`) and
`zIndex: 2` (`:32`) keeps it above both the full-bleed scan button and the `pointerEvents: 'none'` video.
`done` is not probed because the parent unmounts on it.

**WCAG 2.2.2 (Pause, Stop, Hide) is satisfied.** The auto-advancing content runs 1.2 s
(`SCAN_MS + AUTHORIZED_MS`), well under the 5 s threshold. `hudScan` and `blinkDot` are scoped to
`authState === 'scanning'` (`SplashScreen.tsx:81-83, 95-97`), i.e. 400 ms. The only animation that can
exceed 5 s is `flicker 8s infinite` on the BIOMETRIC LOCK title during the *indefinite* `idle` wait
(`PHASE_MS.idle = null`, by design) — and SKIP/Escape are a conforming "hide" mechanism for it, with
`prefers-reduced-motion` removing it outright (`SplashScreen.tsx:69`, pinned by the new
`reduceMotion` tests). Also checked **2.3.1 Three Flashes**: `flicker` dips opacity to 0.55 and 0.72
twice inside ~0.32 s once per 8 s cycle, on small `#2B8CC1` text — far under three flashes per second and
nowhere near the general-flash luminance threshold.

**Reduced motion, gate by gate.** The machine's from-any-phase collapse is exhaustively unit-tested over
all seven phases (`boot.test.ts`, "collapses to done from ANY phase under prefers-reduced-motion"). At the
component: the only reachable phase under a steady reduced-motion preference is `idle` (nothing
auto-advances from it), and the tap goes straight to `done` — no dwell, no fade, no video, all three
pinned. The container's `transition` is dropped rather than zeroed (`BootSequence.tsx:149`, asserted as
`''`). `SplashScreen` drops the flicker, the sweep and all three dots (`:69, :81, :95-97`), and the
shipped tests assert both directions. The demo continues to gate in JS with no
`prefers-reduced-motion` block in `demo.css` — consistent with the house split. Mid-sequence flipping is
the LOW above.

**Muted-autoplay policy is handled correctly.** `muted` + `playsInline` + `preload="auto"`
(`BootSequence.tsx:158-160`), plus the imperative `el.muted = true` at `:126` for React's known
prop-vs-property gap. `play()` is invoked in an effect that can only run after the visitor clicked the
scan button, so the document carries sticky user activation *and* the element is muted — belt and braces
against Chrome's and Safari's autoplay gates. The `started instanceof Promise` guard (`:127-128`) is the
right shape for legacy engines where `play()` returns `undefined` (nothing to reject there either).
Rejection ends the sequence, which is correct once the video owns the surface.

**Poster + `object-fit: cover` at 378×786.** `poster={videoPoster ?? undefined}` (`:157`) — no empty
`poster=""`, which would otherwise be fetched as a relative URL. With both constants null the element is
not rendered at all (`hasVideo` guard, `:152`) so there is no phantom media element on today's boot; the
shipped test pins that. For the drop-in: the documented 720×1280 source (9:16 = 0.5625) into 378×786
(0.481) scales by `786/1280` to 442×786 under `cover`, centre-cropping ~14.5 % horizontally — expected and
acceptable for a full-bleed intro. `objectFit: 'cover'` + `inset: 0` + `pointerEvents: 'none'`
(`:44-51`) is the right combination: the SKIP button above it stays clickable. A late first frame reads as
`#000314` (the gate's own background), which is why a null poster is safe.

**Bundle.** `pnpm build` exit 0. `/demo` First Load JS = **107 kB**, matching the PR's claim; marketing
untouched (`/` 121 kB, `/features` 110 kB, `/features/[slug]` 120 kB, shared 106 kB). Caveat worth
recording: `/demo`'s First Load number *excludes* the `next/dynamic({ ssr: false })` demo chunk, so "107 kB
unmoved" is expected whatever P8 added and is not by itself evidence about the boot code's weight. The
load-bearing check is chunk placement, done directly: string-searching the built output for
`"Run the simulated biometric scan"` finds it in exactly one file,
`.next/static/chunks/989.9f466dd535c33b53.js` (the lazy demo chunk), and in **neither** shared chunk
(`27-*.js`, `c36baf0d-*.js`). `app/demo/page.tsx` gained only a boolean prop — it does not import
`boot.ts`, so no engine module was pulled above the dynamic boundary.

**The wall.** `grep -rn "features/demo" components app/(default) lib` returns only the guard test itself
(`components/marketing/__tests__/phone-frame.test.tsx:56,66`) and a prose reference in a comment
(`components/marketing/phone-frame.tsx:7`). Both boundary guards pass (`phone-frame.test.tsx`,
`chrome-scope.test.tsx`). No marketing chrome moved into the root layout.

**Browser-resource cleanup: complete.** The phase timer is cleared on every phase/`advance` change
(`:93-98`); the Escape listener is removed on unmount (`:109-115`); the video element and its handlers die
with the gate; the completion effect is idempotent via `completedRef` (`:100-106`) so a re-rendering
parent cannot double-fire `onComplete` (pinned by test). No object URLs, no observers, no intervals, no
`AbortController`, no retained dynamic import. Nothing new leaks per mount/unmount cycle.

**Render performance.** `booting` (`DemoExperience.tsx:485`) is one boolean with three consumers — the gate
branch, the tab-bar withholding (`:2950`) and the narration override (`:645`) — that flips at most twice
per session. It is not the §84b shape (a 22-field record re-rendering the subtree per slider step) and
does not deserve a §84b-style ledger entry. `endBoot` is `useCallback`-stable. While the gate is up the
screen tree is genuinely unmounted rather than hidden (asserted by the bridge test), so no screen effects
run behind the curtain — cheaper than the alternative, and it removes any z-index race with the drawer or
a sheet.

**Style half + lifted rules.** All new styling is inline `CSSProperties` in `features/demo/ui/**` — correct
half, zero Tailwind. No new global CSS, no new keyframes (the three reused already exist in `demo.css`),
no change to the 404 = 378 + 13×2 device math or to any lifted pixel value. `SplashScreen`'s
`minHeight: 786` still matches the screen height under the `[data-demo-root]` `border-box` scope. The
`#000314` gate background is sourced from the phone with a citation. No `outline: none` was introduced
anywhere, so the default `:focus-visible` ring survives on both boot controls (checked: `demo.css` has no
`outline`/`:focus` rules at all).

**Browser-API / Next.js hygiene.** No `window`/`document`/`navigator` at module scope — the Escape
listener reads `window` inside an effect. `useReducedMotion` is imported from `motion/react`, the demo's
correct hook (not the marketing `lib/hooks` one). `next/dynamic({ ssr: false })` is unchanged; the route
change is a prop, not a new import. No `localStorage`, no `navigator.mediaDevices`, no geolocation, no
clipboard introduced.

---

## Observations (no action)

- **`case 'splash'` in `activeScreen()` (`DemoExperience.tsx:2457-2466`) is defensive-only and currently
  unreachable.** Nothing calls `setView('splash')`; the store's initial view is `'cases'`
  (`create-store.ts:425`); `explore.ts` deliberately omits the row. Worth knowing that *if* a snapshot
  ever carried `view: 'splash'`, a booted mount would render `BootSequence` twice in sequence — the gate,
  then the view — i.e. two full sequences and two `window` keydown listeners. Not reachable today, so not
  a finding; noted because the arm's own comment invites a future writer to make `splash` settable.
- **`PhoneFrame.tsx:67`'s `scanSweep 7s linear infinite` is not reduced-motion gated.** Pre-existing, not
  in this diff, and it runs on every demo surface rather than only boot — out of scope, and explicitly not
  re-filed per the lane's pre-existing-items rule. Mentioned only because P8 is the phase where
  reduced-motion coverage was audited end to end.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 3 |

Marketing↔demo isolation: **preserved** (wall grep clean; boot code confined to the lazy demo chunk, verified by string search of built output)
Bundle impact: **none on any First Load** — `/demo` 107 kB confirmed, marketing untouched; new code lands only in the `ssr: false` demo chunk
Browser-resource cleanup: **complete** (timer, keydown listener, video element, idempotent completion)
Accessibility: **gaps found** — one HIGH (focus dropped on gate lift and at `authorized → video`), one MEDIUM (disclosure contrast 3.59:1), two LOW
Style-convention adherence: **correct half**, lifted rules untouched

**Verdict: REVISE**

Notes: the two video-path MEDIUMs are dormant while `BOOT_VIDEO_SRC` is `null` but both sit directly on
the two-constant drop-in path §87d advertises as needing nothing else — closing them now is what keeps
that claim true. The a11y rework in `SplashScreen` is genuinely good (`aria-disabled` over `disabled`, a
persistent live region, a real button replacing the `<div onClick>`); the one thing it does not do is hand
focus on.

---

## Appendix A — probes (run in the `parity-p8` worktree, then deleted; nothing committed)

Two throwaway vitest files under `features/demo/ui/screens/__tests__/`, both using the suite's established
`vi.hoisted` + `vi.mock('motion/react')` seam for `useReducedMotion` (the R-18 precedent the shipped boot
tests already use). All probes passed, i.e. every asserted behaviour above is the behaviour on `41f4a93`.

| ID | What it drives | Observed |
|---|---|---|
| P1 | `<DemoExperience boot />`, focus the scan button, run the full sequence | `activeElement after gate lift = BODY` |
| P1b | Same, focus SKIP and click it | `activeElement after SKIP = BODY` |
| P2 | Boot up → rail back-to-site → exit dialog open → one `Escape` | `dialogClosed= true  bootAlsoSkipped= true` |
| P3 | `videoSrc` set, still at `idle`, `fireEvent.error(video)` | `onComplete called at idle on preload error = 1` |
| P4 | Enter phase `video` with `play()` resolving, advance 600 000 ms | `onComplete after 10 min stalled in video phase = 0` |
| P5 | `.focus()` SKIP in each phase | `idle:true scanning:true authorized:true fading:true` |
| P6 | Flip reduced-motion 700 ms into the 800 ms `authorized` dwell | `completed at original deadline = 0`; `completed after a fresh full dwell = 1` |
| Q1 | Node identity of the live region and the scan button across phases | region `true`/`true`, button `true`/`true`; initial region text `"TAP TO SCAN"` |
| Q2 | Video path, focus on the scan button, cross `authorized → video` | `still on scan button` → `BODY`; `splash still mounted? false` |
| Q3 | Lifetime of the `AUTHORIZED` live text | 1100 ms (`AUTHORIZED_MS` + `FADE_MS`) before the region is destroyed |

Contrast figures were computed with the WCAG 2.x relative-luminance formula, flattening every `rgba`
foreground and background over the gate's `#000314`:

```js
const srgb = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const L = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (f, b) => { const a = L(f), c = L(b); const [hi, lo] = a > c ? [a, c] : [c, a]; return (hi + 0.05) / (lo + 0.05) }
const over = ([r, g, b, a], [br, bg, bb]) => [r*a + br*(1-a), g*a + bg*(1-a), b*a + bb*(1-a)]
// disclosure: ratio(over([153,186,221,0.55], [0,3,20]), [0,3,20]) === 3.59
```

Targeted suites run to confirm the branch is green under this lane's probing:
`BootSequence.test.tsx`, `SplashScreen.test.tsx`, `DemoExperience.boot.test.tsx`, `boot.test.ts`,
`screens/__tests__/a11y.test.tsx`, `components/marketing/__tests__/phone-frame.test.tsx`,
`app/(default)/__tests__/chrome-scope.test.tsx` — **7 files / 58 tests passed**.

---

# Fix-delta r1

**Range:** `5b3213a..15b683b` (merge `parity/p8-fix-boot`) · **Map:** PR #37's fix-round comment,
`p8-review-r1-vetted.md`, ledger §88
**Gates re-run in this lane's worktree:** `pnpm build` exit 0 · 10 targeted suites / **133 tests** green
· probes rewritten against the new API and re-executed (throwaway file, deleted; worktree clean)

Verdict on my six findings: **6/6 FIXED**, 0 partial, 0 refuted. **1 new LOW** from the fix itself.

| Mine | Routed as | Commit | Disposition |
|---|---|---|---|
| HIGH — focus dropped on gate lift + at `authorized → video` | R-2 | `1def06a` | **FIXED** (both halves, all five lift paths) |
| MEDIUM — `onError` conflates preload with playback failure | R-1a/R-1c (M1) | `ec22c6e` | **FIXED** |
| MEDIUM — no stall rung in the failure ladder | R-1b (M2) | `a5ea4b1` | **FIXED** |
| MEDIUM — disclosure 3.59:1, fails WCAG 1.4.3 | R-6 (M3) | `c2e688f` | **FIXED**, pin is real |
| LOW — Escape double-fire with `ExitDialog` | R-7 | `9418c2f`.. | **FIXED** |
| LOW — reduced-motion flip restarts the dwell | R-14 | `9418c2f`.. | **FIXED** |
| LOW — SKIP's bare accessible name | R-18 | `9418c2f`.. | **FIXED** |

---

## HIGH → R-2 (`1def06a`) — FIXED, both halves, verified on every path

Two mechanisms, correctly separated.

**Boot → app.** `PhoneFrame` gained an optional `screenRef` and put `tabIndex={-1}` +
`outline: 'none'` on the screen slot (`PhoneFrame.tsx:21-27, 138-143`); `DemoExperience` holds
`phoneScreenRef` and a `wasBootingRef` edge detector that focuses it only on the `true → false`
transition (`DemoExperience.tsx:511-517`). Re-ran my original repro **and every other way the gate
can lift** — all five land on the screen slot instead of `<body>`:

| Lift path | Probe | `document.activeElement` after |
|---|---|---|
| scan → full sequence (my original P1) | F1 | `DIV[data-phone-screen]` |
| SKIP (my original P1b) | F1b | `DIV[data-phone-screen]` |
| **reduced-motion instant-complete** | F1c | `DIV[data-phone-screen]` |
| Escape | F1e | `DIV[data-phone-screen]` |
| rail checklist jump | F1d | `DIV[data-phone-screen]` |

**`authorized → video`.** SKIP takes the hand-off, gated on `hadFocusRef` — a `focus`/`blur`
(focusin/focusout) pair on the boot root that tracks whether focus is *inside the gate*, with
`e.currentTarget.contains(e.relatedTarget)` correctly treating a tab-out to the rail and a
`relatedTarget: null` drop as "not ours" (`BootSequence.tsx:240-256`). Both arms verified:

- Probe **F2** — focus on the scan button, cross into `video`: `hud gone? true`,
  `focus = BUTTON:Skip the opening sequence`. My Q2 regression (`BODY`) is closed.
- Probe **F2b** — mouse visitor, focus never inside the gate: `focus = BODY`, i.e. **not yanked**.
  The guard does what its comment claims.

The `hadFocus` discipline is the right call and is the detail I would have expected to be missed.

**One residual, filed as a new LOW below:** that same discipline is *not* applied to the boot → app
hand-off, which fires unconditionally — including on the rail-jump path (F1d), where focus was
deliberately outside the gate.

**Not a finding:** `outline: 'none'` on the focus target. The slot is `tabIndex={-1}`, so it is not
keyboard-operable and WCAG 2.4.7 does not reach it; suppressing a ring around the entire 378×786
screen is the standard SPA route-change idiom. The slot carries no accessible name, so an AT user
hears the revealed content rather than a label — acceptable here (the content *is* the announcement)
and strictly better than the `<body>` drop it replaces.

---

## M1 → R-1a/R-1c (`ec22c6e`) — FIXED

`onError` is now phase-scoped (`BootSequence.tsx:167-175`): before the video owns the surface it sets
`videoFailed`, and `liveVideo = videoFailed ? null : video` feeds the machine a null source so
`authorized` takes the already-tested `fading` route; from `video`/`holding` it sets `fading` (a fade
rather than my suggested hard end — §88a's disclosed consistency extension, and the better choice:
it matches the phone's `startFadeOut()`). Both arms breadcrumb with the element's `MediaError` code.

Probe **F4**, my exact P3 repro: `error` fired at `idle` →
`completed at idle? 0 · TAP TO SCAN still there? true · video element gone? true`, then the scan runs
(`SCANNING? true → AUTHORIZED? true`) and the sequence completes through the no-video route
(`completed = 1`, one warning). The gate is no longer deleted by a decoration that failed to
download. Removing the failed element from the DOM entirely (a consequence of the `liveVideo` guard
at `:268`) is a bonus — no broken media element lingers behind the HUD.

---

## M2 → R-1b (`a5ea4b1`) — FIXED; the duration+5 s / flat-20 s shape is sound

A watchdog effect scoped to `phase === 'video'` and torn down on phase exit
(`BootSequence.tsx:211-222`), with `onLoadedMetadata` recording a finite positive duration
(`:279-282`) and `VIDEO_CEILING_MS = 20_000` / `VIDEO_OVERRUN_MS = 5_000` exported as named
constants.

- Probe **F5** (my 10-minute repro, inverted): no metadata → nothing at `ceiling − 100 ms`, fades and
  completes at the ceiling, warning names `20000 ms`.
- Probe **F5b**: `duration = 3 s` → ceiling `8000 ms`, exact.
- Probe **F5c**: a healthy 4 s video firing `ended` completes normally — **the watchdog never cuts a
  working intro**, which is the failure mode a ceiling like this usually introduces.

**Judgement on the shape:** correct. The one theoretical bad case — an intro longer than 20 s whose
`loadedmetadata` has not landed by the time `video` begins — is not reachable in practice and is
self-correcting in principle: `preload="auto"` starts at mount and the `video` phase begins 1.2 s
later, and if metadata genuinely has not arrived then no frames are rendering either, so cutting at
20 s is the *right* answer rather than a premature one. Re-arming the timer when `videoDurationMs`
changes can extend the effective bound by the time already spent in `video`; bounded, harmless, and
preferable to the alternative. Deriving the bound from the element rather than hard-coding one is
better than what I asked for.

---

## M3 → R-6 (`c2e688f`) — FIXED at 5.27:1, and the pin is real

Alpha `0.55 → 0.70` on the disclosure (`SplashScreen.tsx:140`). Independently recomputed rather than
taken from the commit message: `rgba(153,186,221,0.70)` over `#000314` = **5.27:1**, clearing the
4.5:1 Level-AA floor for 11 px text. Matches my own pre-fix sweep exactly (0.55 → 3.59, 0.65 → 4.65,
0.70 → 5.27). The disclosure is no longer the least readable string on the surface.

**The pin is genuine, and reds on both axes** — I checked rather than assumed. The test
(`SplashScreen.test.tsx`, "is readable: the disclosure clears WCAG AA over the boot background")
regex-extracts the alpha from `data-testid="boot-disclosure"`'s inline `color` and asserts `≥ 0.65`:

- a revert to `0.55` captures `0.55` and fails the threshold;
- a *different* RGB triple at any alpha fails the `rgba(\s*153,\s*186,\s*221,` anchor, yielding
  `Number(undefined) → NaN`, and `expect(NaN).toBeGreaterThanOrEqual(0.65)` fails too.

So it is not the usual "asserts the value it just wrote" shape — the anchor is what makes it hold.
It pins the *input* (alpha over a known background) rather than a computed ratio, which is the right
trade for a test: the derivation lives in the comment, with all three measured points recorded.

---

## LOWs — all three FIXED

- **Escape ownership (R-7).** `ExitDialog` now calls `e.stopPropagation()` after `onStay()`
  (`ExitDialog.tsx:27-36`). It listens on `document` and `BootSequence` on `window`, which is
  strictly later in the bubble path, so stopping there is sufficient — and it is `stopPropagation`,
  not `stopImmediatePropagation`, so sibling `document` listeners are untouched and §19/§20 are not
  disturbed. Probe **F3**: `dialogClosed = true · bootStillUp = true`. My exact repro, inverted.
  The "topmost dismissible owns Escape" rule stated in one line beats the `escapeEnabled?` prop that
  §84f would have flagged.
- **Reduced-motion collapse (R-14).** The timer effect short-circuits on `reduceMotion` before
  reading the dwell (`BootSequence.tsx:125-128`), so the flip acts immediately instead of re-arming
  a full-length timer; `idle` still correctly waits for the gesture. Probe **F6**:
  `completed immediately on flip = 1` (was: only after a fresh 800 ms).
- **SKIP's name (R-18).** `aria-label="Skip the opening sequence"` (`BootSequence.tsx:290`). Probe
  **F7** confirms it stays focusable in every phase under the new name:
  `idle:true scanning:true authorized:true fading:true`.

---

## New in r1

### [LOW] The boot→app focus hand-off fires unconditionally, including when focus was deliberately outside the gate

**File:** `features/demo/ui/DemoExperience.tsx:511-517`

**Issue:** the same commit that introduced `hadFocusRef` for the *mid-sequence* hand-off left the
*boot→app* hand-off ungated. `wasBootingRef` detects only the `booting` edge, so any lift moves focus
into the phone — including the rail-checklist jump, where the visitor was navigating the rail by
keyboard and focus was intentionally outside the gate. Probe **F1d**: focus after a rail jump =
`DIV[data-phone-screen]`. Their next Tab now continues from inside the phone rather than to the next
checklist row, and the same jump performed when *not* booting moves nothing — so one control behaves
two ways depending on whether the gate happens to be up.

**Why LOW, not higher:** it is user-initiated navigation revealing the content being focused, so
WCAG 3.2.1/3.2.2 (unexpected context change) are not engaged, and it is a large net improvement over
the `<body>` drop it replaced. It is an internal inconsistency with the guard the same fix
introduced, not a defect against a visitor.

**Fix (if a later round touches it):** reuse the discipline already written — have `BootSequence`
report whether the gate held focus (or read `phoneScreenRef.current?.contains(document.activeElement)`
before the swap) and skip the `.focus()` when it did not, exactly as `hadFocusRef` does one file over.

---

## Re-verified, unchanged

- **Bundle.** Clean rebuild (`rm -rf .next && pnpm build`, exit 0). `/demo` First Load JS **107 kB**,
  identical to r0; marketing untouched (`/` 121 kB, `/features` 110 kB, `/features/[slug]` 120 kB,
  shared 106 kB — every figure byte-identical to the pre-fix table). Placement re-checked because the
  import shape changed (`BOOT_VIDEO_SRC`/`BOOT_VIDEO_POSTER` → one `BOOT_VIDEO`, plus `PhoneFrame`'s
  new prop): the boot strings still resolve to exactly one file, the lazy demo chunk
  `.next/static/chunks/989.79f2a6a591e3f72d.js`, and to **neither** shared chunk. The wall is intact —
  the only `features/demo` mention outside the demo remains the prose comment in
  `components/marketing/phone-frame.tsx:7`.
- **Resource cleanup: still complete, with one more timer to account for.** The new watchdog is
  cleared by its own effect cleanup on any `phase`/`videoDurationMs` change (`:221`), so leaving
  `video` by `ended`, by SKIP, by Escape or by error disarms it; the phase timer, the Escape listener
  and the video element are unchanged. The new `focus`/`blur` handlers are React props on the boot
  root — they die with it, no manual listener to leak. No new observers, intervals or object URLs.
- **A11y idioms held while the code moved.** `SplashScreen`'s three `&&` blocks became a
  `Record<AuthState, ReactNode>` (R-9) — the live region is still one persistent node with swapped
  children (my r0 Q1 finding that it announces *changes* rather than mounting-with-text still holds,
  and a fourth HUD state can no longer render an empty region under a dead button). `aria-disabled` +
  no-op `onClick` unchanged. The deny-list `showVideo` became the `SURFACE` total record (R-11a) with
  identical behaviour — re-confirmed by F4 (the HUD holds the surface through `authorized` on the
  degraded path) and F2 (the video takes it on the healthy one).
- **Style half.** All fix-round styling stays inline `CSSProperties` in `features/demo/ui/**`; the
  only additions are `tabIndex`/`outline: 'none'` on the screen slot and one alpha. No Tailwind, no
  new global CSS, no new keyframes, device math untouched.
- **Render perf.** The new `setView(view)` replay effect (R-12, `DemoExperience.tsx:500-505`) costs
  one extra store write and render at mount. `setView` sets `currentChapter` only for `ChapterId`s,
  and a restored view that is a chapter always agreed with `currentChapter` already, so the replay is
  a no-op beyond `visit` — no narration-anchor drift. Negligible; not a §84b-shaped addition.

---

## Fix-delta Summary

| | Count |
|---|---|
| r0 findings FIXED | 6 / 6 (1 HIGH, 3 MEDIUM, 2 of my 3 LOWs + the third) |
| Partial / refuted | 0 |
| New this round | 1 LOW |
| CRITICAL / HIGH outstanding | **0** |

Marketing↔demo isolation: **preserved** (re-verified after the import-shape change)
Bundle impact: **none** — `/demo` 107 kB and every marketing figure byte-identical to r0
Browser-resource cleanup: **complete** (watchdog included)
Accessibility: **no outstanding regressions** — the HIGH is closed on all five lift paths and the
mid-sequence hand-off; one LOW consistency item remains
Style-convention adherence: **correct half**, lifted rules untouched

**Verdict: APPROVE**

Notes: R-2 is the fix I would have written and then some — the `hadFocus` guard on the mid-sequence
hand-off is the part that is easy to skip and it is there, tested, and correct in both directions.
R-1b's watchdog derives its bound from the element rather than hard-coding one, and F5c proves it
does not cut a healthy intro. The one new LOW is that same guard not being applied to the other
hand-off; it does not gate merge.

### Appendix B — fix-delta probes

One throwaway vitest file (`features/demo/ui/screens/__tests__/ZZfd.test.tsx`), 14 probes, run at
`15b683b` and deleted — `git status` clean, nothing committed. Every r0 repro was re-run in its
original form (rewritten only for the `video: BootVideo | null` prop change) so each "FIXED" above is
an inverted execution, not a reading of the diff.

`F1`/`F1b`/`F1c`/`F1d`/`F1e` focus after each lift path · `F2`/`F2b` mid-sequence hand-off, held and
not-held · `F3` Escape ownership · `F4` preload-error degradation · `F5`/`F5b`/`F5c` watchdog
(flat ceiling, duration-derived ceiling, healthy video) · `F6` reduced-motion collapse · `F7` SKIP in
every phase.

Targeted suites at the fix head: `BootSequence.test.tsx`, `SplashScreen.test.tsx`,
`DemoExperience.boot.test.tsx`, `DemoExperience.boot-boundary.test.tsx`, `boot.test.ts`,
`app/demo/__tests__/boot-activation.test.ts`, `screens/__tests__/a11y.test.tsx`,
`persistence.test.ts`, `phone-frame.test.tsx`, `chrome-scope.test.tsx` —
**10 files / 133 tests passed**.
