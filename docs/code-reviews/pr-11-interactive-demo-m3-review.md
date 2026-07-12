# PR #11 Review — interactive demo, Milestone 3 (UI shell, primitives & bridge)

- **PR:** [#11](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/11) — `feat(demo): interactive demo — Milestone 3 (UI shell, primitives & bridge)`
- **Branch:** `feat/interactive-demo-m3` → `master`
- **Reviewed:** 2026-06-27
- **Scope:** 2 commits, 20 files, **+1232 / −0** — adds `components/demo/**` (phone frame, animation primitives, narration rail, chrome controls, and the store/director **bridge**) + jsdom shims in `vitest.setup.ts`. Additive on the merged M2 headless engine. No `/demo` route (M5) and no screen content (M4) — the phone renders empty by design.
- **Method:** six specialised review passes (code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification) plus manual verification of every reported finding and all build/test claims.

## Topology & validation

M2 (PR #10) is merged into `master` (merge-base = `02ebf67 Merge pull request #10`); M3 is cleanly additive on top.

| Gate | PR claims | Verified |
|---|---|---|
| Vitest | 215 / 32 files (+22 across 6) | ✅ 215 passed / 32 files; +22 confirmed |
| `tsc --noEmit` | clean | ✅ exit 0 |
| `next build` | green, output unchanged | ✅ green (demo components are in no route yet) |
| `@keyframes demoPulse` | (implied by `TouchIndicator`) | ✅ present (`demo.css:80`) — **not** a defect |

Findings are deduped across the six passes and filtered to **confidence ≥ 80**.

---

## 🔴 Critical

### View-oscillation loop deadlocks the guided tour at the `timeOffset` chapter
`components/demo/DemoExperience.tsx:61-74` (silent-failure-hunter; independently re-traced and every precondition verified against `beats.ts`, `runner.ts`, and the bridge test).

The director effect is keyed on `[store, currentMode, view]`, and `view` is driven by the beat itself. Sequence:

1. The `timeOffset` beat contains `{ kind: 'launch', screen: 'ocr' }` (`director/beats.ts:54`). Running it calls `store.getState().launch('ocr')`, which sets `view='ocr'`.
2. The component subscribes via `useStore(store, s => s.view)`, so `view='ocr'` re-renders and the effect **re-runs**. Its cleanup `handle.cancel()` cancels the *still-running* `timeOffset` beat.
3. The cancelled beat's launch step hits its `finally { store.getState().closeLaunch() }` (the M2 cancel-safety fix), which restores `view='timeOffset'`.
4. `view='timeOffset'` re-runs the effect → the `timeOffset` beat starts again from the top → `launch('ocr')` again → **infinite oscillation**.

Each cycle types ~1 character of the DVR clock, fires the OCR pulse, and resets; the chapter's payoff — `calculateOffset` — **never executes**. This is the demo's **marquee feature** (the defensible-timestamp calibration). It is a **cross-milestone integration bug**: the M2 "closeLaunch-on-cancel" fix × the M3 view-keyed effect — neither is wrong in isolation. It ships green because **`DemoExperience.test.tsx` mocks `runBeat`** (`vi.hoisted` with a no-op `cancel`, pre-resolved `done`), so the real `launch`/`closeLaunch` round-trip never runs in tests; `next build` doesn't execute runtime, so it's invisible there too.

**Fix (non-trivial — a one-line guard is *necessary but not sufficient*):** adding `if (!isChapter(view)) return` before the `BEATS` lookup removes the spurious *second* (`ocr`) beat, but the `timeOffset` beat still restarts via the `closeLaunch → 'timeOffset' → effect` round-trip, so the loop persists. The real fix must **decouple beat-play from launch-driven `view` changes** — e.g., key the beat-play effect on a stable "active chapter" signal (a store field set only by chapter navigation, never by `launch`/`closeLaunch`) rather than raw `view`. Add a real, **un-mocked** integration test that drives the `timeOffset` beat through the actual runner and asserts it reaches `calculateOffset` exactly once.

> **Why this is filed CRITICAL but the verdict is REVISE (not BLOCK):** there is no `/demo` route yet (M5), so nothing mounts the bridge today — consistent with how the earlier milestones were scoped. But this is a genuine infinite-loop defect in the *shipped* bridge that **will deadlock the guided tour the instant M5 adds the route.** Treat it as a hard gate before M5, not a deferrable nicety.

---

## 🟠 Important

1. **Pulse `setTimeout` is never cleaned up** — `DemoExperience.tsx:70` (code-reviewer + silent-failure, HIGH). The 650 ms pulse-removal timer is fire-and-forget; the effect cleanup only calls `handle.cancel()`. On unmount or a fast `view`/mode change within 650 ms, `setPulses` fires after the effect is replaced / the component is unmounted — silently swallowed in React 18, but it leaks timers across fast navigation and will **bleed fake timers into other tests**.
   - ⚖️ **Disputed:** code-simplifier judged it "safe as-is" (the stale-id filter is a no-op). Correct that it is not *user-visible* — but the leak and test-flakiness make it worth fixing, and the effect is being reworked for the Critical regardless. **Resolution:** track the timers (a `Set`/ref) and clear them in cleanup alongside `handle.cancel()`.
2. **`aria-disabled` on a plain `<div>` Back control** — `controls/RailNav.tsx` (code-reviewer). `aria-disabled` has no semantic effect on a `generic`-role `<div>`; the first interactive control a keyboard/SR user encounters is invisible to assistive tech. Use a real `<button type="button" disabled>` (dim via styles). The existing test only checks button *count*, so it won't catch this — update it to assert the a11y contract.
3. **`WizardDrawer` `id: string` / `onNavigate(id: string)` should be `WizardScreenId`** — `controls/WizardDrawer.tsx:7,18` (type-design). The domain has a precise 10-member union; `DRAWER_DEFS` already produces `WizardScreenId`, which is widened to bare `string` at the drawer boundary, discarding the precision and letting an arbitrary/`ChapterId` value pass.
4. **The bridge's most important behaviors are untested** (pr-test-analyzer) — and these are exactly the gaps that hid the Critical. Because `runBeat` is mocked: **`onPulse` is never invoked** (the entire pulse lifecycle is uncovered); **director cancel-on-unmount is never asserted**; the **`sandbox` must-not-call-`runBeat` guard is untested**; and the **`?step` deep-link assertion is vacuous** (`getByRole('heading', { level: 2 })` passes for every chapter — the actual title is never asserted). Add real (un-mocked) bridge tests — they would catch both the Critical and #1.

---

## 🟡 Advisory

- **`view as ChapterId` cast is redundant + a maintenance trap** — `DemoExperience.tsx:63` (flagged by **3 lanes**: code-reviewer, type-design, simplifier). `BEATS` is keyed on the full `ChapterId | LaunchableId` union, so the cast is unnecessary and falsely asserts `view` is never a `LaunchableId`. Use `BEATS[view]`.
- **`LaunchableId` view → narration silently falls back to `'splash'`** — `DemoExperience.tsx:77-79` (type-design + silent-failure). It ignores `launchReturnView`; in M4 the rail will snap to splash content during an OCR launch mid-tour. Use `isChapter(view) ? view : (launchReturnView ?? 'splash')`.
- **`runBeat`'s `degraded`/`warnings` are never read** (silent-failure MEDIUM) — a degraded beat (the signal M2 just added) plays silently here. Add a dev-mode `console.error` on `handle.done` when `degraded`.
- **`useSearchParams` Suspense + misleading `params?.`** (code-reviewer) — documented for M5, but the optional chaining is a false safety net (`useSearchParams` is non-null in a client component); remove it so M5 doesn't skip the required `<Suspense>` wrapper.
- **`WizardDrawer` dialog a11y** — `role="dialog"` but no Escape-to-close and no focus trap/return (code-reviewer); deferred infra for the M4 trigger wiring.
- **Invalid `?step` slug silently stays on splash** with no diagnostic (silent-failure LOW) — add a dev `console.warn` in `slugToChapter` on the `null` path.
- **Comment accuracy** (comment-analyzer): `demo.css` docblock claims it holds "*only* the animations those inline styles reference" — false (9 of 12 keyframes are M4 placeholders, unused in M3); the "VERBATIM" claim doesn't carve out the new `demoPulse`; `useTypewriter`'s comment describes M4 store-rendering as present-tense fact; "Creates the demo store once" → "once per mount (via ref)."
- **Type tightening** (type-design): `RailDot.active` per-dot can't express the "exactly one active" invariant — pass `dots: {id; label}[]` + `activeDot: ChapterId`; `status?: 'complete' | 'partial' | null` — drop the redundant `null`.
- **Simplification** (code-simplifier): `onClick={() => !guided && onSetMode('guided')}` uses `&&` for a side-effect — use an explicit `if`. Plus Advisory test gaps: `usePhoneScale` resize + cap-at-1:1 untested; StoryRail `onPrev`/`onJump`/`onSetMode` never fired; WizardDrawer backdrop click; `useTypewriter` unmount cleanup.

---

## Architecture invariants checked & confirmed

- **Callback isolation holds cleanly** — confirmed by three lanes (type-design, pr-test, code-reviewer): no presentational component (`PhoneFrame`/`StoryRail`/controls/primitives) imports the store; only `DemoExperience` touches it, and the boundary is expressed at the type level (props are pure data + callbacks).
- The store-created-once `useRef` lazy-init pattern is correct; `useTypewriter` (self-clearing interval + cleanup) and `usePhoneScale` (resize listener removed on unmount) have correct effect hygiene.
- The lifted inline styles match the prototype; the `demo.css`-vs-planned-`demo.module.css` deviation is correctly reasoned (CSS Modules scope `@keyframes` identifiers, which would break the global keyframe names that inline `animation:` strings reference).
- PR claims are accurate: 215/32, +22 across 6 files, and all four documented deferrals (centred pulse coords, WizardDrawer media accordion, `useSearchParams` needs Suspense in M5, empty phone screen) are verified in code.

---

## Recommended next steps

**Decision: REVISE.** Solid shell with clean isolation and honest documentation — but the view-oscillation loop is a real, verified infinite-loop defect in the core guided-tour flow, masked only by a mocked test. Fix order:

1. **The oscillation** (Critical) — decouple beat-play from launch-driven `view` changes; add a real un-mocked `timeOffset`-beat integration test. **Hard gate before M5 mounts the bridge.**
2. **Track & clear the pulse timers** (#1) — folds into the same effect rework.
3. **`aria-disabled` → real `<button disabled>`** (#2) and **`WizardScreenId` on the drawer** (#3).
4. **Add the missing bridge tests** (#4) — un-mock `runBeat` for the pulse-lifecycle, cancel-on-unmount, and sandbox-guard cases.

The Advisory items (the redundant cast, the `launchReturnView` narration, the degraded-signal logging, the comment fixes) are cheap and worth folding in as M4 lands.

## Reviewer pipeline notes

- **The Critical was a single-lane catch that the others' framing reinforced:** silent-failure traced the oscillation; pr-test-analyzer independently explained *why it shipped green* (the bridge test mocks `runBeat`, so the real `launch`/`closeLaunch` round-trip never runs). Together they make the finding airtight.
- **Cross-lane convergence** on the redundant `view as ChapterId` cast (code-reviewer + type-design + simplifier) — three lenses, one line — is a strong "real" signal even though it's only Advisory.
- **One genuine dispute surfaced:** code-simplifier ("`setTimeout` safe as-is") vs code-reviewer/silent-failure ("leak / state-after-unmount"). Both are right about different axes (not user-visible vs. timer-leak/test-flake); resolved by folding the timer-tracking into the Critical's effect rework.
- **Initial false lead, checked and cleared:** the orchestrator suspected `TouchIndicator`'s `demoPulse` keyframe might be undefined; a direct grep confirmed it exists (`demo.css:80`), so it was not reported.
