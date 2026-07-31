# P2 review — TESTS lane

**Lane:** test-analyzer (`.claude/agents/test-analyzer.md`)
**Under review:** `feat/parity-p2` @ `572022a` (fix round; fix commits after `e770d45`)
**Pass:** FIX-DELTA (initial pass was `9f5c01a`, 2 MAJOR / 3 MINOR / 1 NIT → REVISE)
**Verdict: APPROVE** — all 6 lane findings FIXED, 2 new MINOR, no BLOCKER/MAJOR.

Severity vocabulary: BLOCKER = CRITICAL, MAJOR = HIGH, MINOR = MEDIUM, NIT = LOW.

---

## Fix-delta pre-flight

| Check | Result |
|---|---|
| `pnpm test --silent` | **159 files / 1477 tests green** (was 156 / 1416) |
| `pnpm test:coverage --silent` | **159 / 1477 green; 97.8 stmts / 91.22 branch / 99.74 funcs / 99.02 lines** vs the 80% gate — functions coverage *improved* (99.23 → 99.74) |
| `pnpm exec tsc --noEmit` | clean |
| `TZ=UTC pnpm test time-offset-advisories` | 15/15 green (was 13/13) — and now genuinely red under mutation, see TESTS-2 |

**Measurement note (my artifact, not a repo signal).** An intermediate coverage run reported
40 failures across 21 files, every one `Error: Test timed out in 5000ms`. That run overlapped
two other full-suite executions I had started; wall-clock was 891 s against a normal ~70 s
(~13× contention). Re-run sequentially on a quiet box it is 159/159 green, twice. No test in
that failure set is touched by this diff. Recording it because it is the raw material for
NEW-TESTS-8 below, and so a later reader does not mistake it for a flaky baseline — **this
suite still has none.**

### Verification method

Findings that claim "the test now fails if the fix is reverted" were checked by **mutation in a
throwaway `git worktree`** (`git worktree add --detach`, `node_modules` symlinked, removed
afterwards). The review worktree was never modified — it is untouched and clean.

---

## Findings from the initial pass

## TESTS-1 → R-8 — **FIXED** (mutation-verified)

`features/demo/engine/__tests__/engine-flow.test.ts:64-78`, commit `22bb630`.

The ready-to-lift draft was taken verbatim, and it pins what I meant. Confirmed by mutation:
replacing the Flow F expression in `features/demo/engine/store/selectors.ts:244-246` with a
plain `loc ? loc.form.notesSections : []` now yields

```
Tests  1 failed | 4 passed (5)
 ❯ features/demo/engine/__tests__/engine-flow.test.ts:73
   expect(html).toContain("Attended Kim's Convenience")
```

— exactly the new test, and only it. Two properties I checked beyond "it went red":

- **Neither asserted string leaks from another section.** The mutated HTML dump shows the DVR
  block renders `Total DVR Retention: | 35 days`, a different label from the notes body's
  `• DVR retention period: 35 days`, and `Attended` appears nowhere but the notes body. So both
  assertions are notes-specific rather than incidentally satisfied by the header or DVR table.
- **The second promise is pinned too.** `expect(...form.notesSections).toEqual([])` closes the
  "nothing is written back" half that the original comment was the only guard for.

## TESTS-2 → R-9 — **FIXED** (mutation-verified under `TZ=UTC`; the commit's claims hold)

Commits `2cce219` (seam + unconditional pin) and `645ac1c` (the memo test that also exercises it).

The fix is better than the two options I suggested. Rather than pinning the zone per file, it
completed the half-open seam: `clock.isDst` now sits beside `clock.now` in
`features/demo/ui/inputs/clock.ts`, the bridge threads it
(`features/demo/ui/DemoExperience.tsx:1022-1023`), and the test stubs **both** halves with a
North-American DST fake, asserting unconditionally. The `zoneHasDst` branch is gone.

**The commit's mutation claims, re-verified independently:**

| Claim in the commit body | My result |
|---|---|
| Before: `TZ=UTC`, `dstAdvisory` hard-wired to `null` → file stayed **green** | Reproduced in the initial pass (13/13 green with the conditional assertion) |
| After: same mutation → file **FAILS** | **Confirmed.** `dstAdvisory={dstAdvisory}` → `dstAdvisory={null}` under `TZ=UTC` gives `Tests 2 failed \| 13 passed (15)` |

The commit says "1 failed / 13 passed"; at HEAD it is **2 failed** because commit `645ac1c`
later added the memoisation test to the same describe, which also fails under the mutation. The
claim was accurate at its own commit and is now conservative.

Two things I specifically checked rather than assumed:

- **The negative control is real.** `stays silent when today sits on the same side of the change
  as the scope` moves only "today" through the same seam and asserts absence — so the positive
  cannot pass on a screen that renders the advisory unconditionally. That closes the
  complementary trap to the one I filed.
- **The seam is not a tautology.** `clock.isDst` delegates to the engine's `isInDST`; the test
  replaces it with a table-driven fake, so the assertion exercises the bridge → `computeDstAdvisory`
  → screen path rather than re-asserting the engine's own logic.

## TESTS-3 → R-19 — **FIXED**

Commit `a211b23`. `vi.restoreAllMocks()` moved from the last statement of the test body to
`afterEach` on the describe that owns the spies
(`features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:160-165`). The inline call
is gone, so a throwing assertion can no longer leak a mid-January `clock.now` — or, after R-9, a
stubbed `clock.isDst` — into the rest of the file. R-9 raised the stakes here (two spies instead
of one) and the hook was added in the same round.

## TESTS-4 → R-20 — **FIXED**

Commit `7065e72`,
`features/demo/engine/store/__tests__/store-actions.test.ts:177-196`. Both projections are now
driven with data and asserted field-by-field, with deliberately distinct
`resolution`/`recordingFps` values per camera (`1920x1080`/`15`, `4CIF`/`30`) — which is the
part that matters, since the regression I named (a type-correct value swap `tsc` cannot see)
only fails against distinguishable values. `arrivalDepartures` gets distinct arrival/departure
timestamps for the same reason. The coverage run no longer names `selectors.ts:271,275`.

## TESTS-5 → R-21 — **FIXED**

Commit `3b74bd2`, `features/demo/ui/inputs/__tests__/capture-gps.test.ts:224-244`. Structurally
the test I drafted, with a better target choice: `buildGpsConfig('precise')` (10 m) against a
90 m first reading, so the loop unambiguously wants to continue; abort is flipped from
`onProgress`; asserts `getCurrentPosition` ran **exactly once** and the outcome is `null`. The
commit reports it verified red against `capture-gps.ts:125` removed. That is the loop-head
checkpoint I filed for; the post-loop checkpoint stays covered by the `useGpsCapture` unmount test.

## TESTS-6 → R-29 — **FIXED**

Commit `5d3a081`, `features/demo/ui/screens/__tests__/NotesScreen.test.tsx:11-20`. Captures the
original descriptor at module scope and restores it in `afterEach`, correctly handling the case
that actually applies here — jsdom's `navigator` has no own `clipboard`, so restoring means
`delete`, not reinstating a descriptor. Better than the `vi.stubGlobal` alternative I suggested,
which would not have handled the absent-own-property case cleanly.

## Out-of-lane observation → R-30 — **FIXED**

Commit `ea1cb4f`. `grep -n '^=======$' docs/code-reviews/deferred.md` now returns nothing; the
stray merge-conflict marker at what was line 1014 is gone.

---

## Assessment of the fix round's new tests (~61 added)

Read all 19 changed/added test files in full and paired each against its fix commit. Hunted
specifically for the patterns this lane exists to catch. **The overall standard is high** — several
of these are the strongest tests in the phase. Notable positives, then the two new findings.

**Tests that pin the discriminating property rather than the happy path:**

- **R-2** (`DemoExperience.progress-saved.test.tsx`) — partial-mocks `persistence` at the true
  module boundary and drives both arms, but the test that earns it is *"reads liveness at ALERT
  time, so a write failure mid-session demotes the next alert"*: a value captured at mount would
  pass every other assertion in the file. Paired with five `isLive` semantics tests in
  `persistence.test.ts` including *"recovers to true when a later write succeeds — the signal
  tracks reality, not a latch"*, which is the exact difference between a signal and a one-way flag.
- **R-4** (`DemoExperience.ocr.test.tsx`, `marquee.test.tsx`) — all three phone arms at both the
  screen and bridge level, plus the two arms that are easy to omit: *no prompt when there is
  nothing to lose*, and **Escape ≠ Cancel** (`marquee.test.tsx:177`). I checked the Cancel arm's
  `view).not.toBe('ocr')` assertion, which reads odd for a "cancel"; the commit body verifies it
  against phone source (`ocr-capture.tsx:288-320`, Cancel routes away discarding the read), so the
  test pins verified parity, not an accident. "Keep My Edits" asserts the offset *did* recalculate
  **and** the edits survived — the discriminating pair.
- **R-23** (`ocr.test.ts`) — the corpus test walks eight input shapes and asserts
  `Object.keys(resolution).sort()` matches exactly that arm's payload, so the producer is pinned
  *total* rather than sampled. That is the right shape for a union-modelling fix.
- **R-14 at the P2.5 site** (`time-offset-advisories.test.tsx:192-205`) — memoisation asserted
  through an observable seam (`isDst` not called on an unrelated field write; called on the
  toggle, with the advisory text changing to scenario A). A memo test that actually discriminates.
- **R-12 / R-31** (`NotesScreen.test.tsx`, `CoordinateDisplay.test.tsx`) — both re-arm tests
  advance past the *first* timer's deadline specifically, which is the only way to tell "tracked
  and cleared" from "two timers racing".
- **R-18** (`gps.test.ts`, `capture-gps.test.ts`) — the `accuracyM?` widening is pinned in every
  direction: never satisfies a target, loses to a measured reading in **both** orderings, still
  commits when nothing measured, and does not end the loop early.
- **R-1** (`submission-gps.test.tsx`) — the cross-location race has both arms (dropped when the
  location changed, *written* when it did not), so it cannot pass by writing nothing ever.
- **R-7** — asserts `aria-disabled` **and** real inertness (a second click starts no second
  capture) **and** focus retention. The a11y attribute alone would have been the shallow version.

**Checked and refuted — did not file:**

- `CoordinateDisplay.test.tsx` *"clears its timer on unmount"* asserts only
  `expect(clearSpy).toHaveBeenCalled()`, which is the classic weak-teardown shape (anything else
  calling `clearTimeout` would satisfy it). I mutated it: deleting the unmount cleanup effect in
  `features/demo/ui/inputs/CoordinateDisplay.tsx:74-79` gives `Tests 1 failed | 12 passed`. Under
  these fake timers nothing else in the render/unmount path calls `clearTimeout`, so the assertion
  is load-bearing after all. Not a finding.
- `coordinate-shapes.test.ts` (R-24) has a tautological runtime body — the real check is
  compile-time. I verified `tsc --noEmit --listFiles` includes the file (tsconfig `include` is
  `**/*.ts`, excluding only `node_modules`), so the guard genuinely fires in the typecheck gate.
  The `GpsCoordinates extends T` direction catches re-flattening (the drift that actually
  happened) though not widening-by-addition; that is the right trade for the stated purpose. Not
  a finding.
- `GpsCaptureControl.test.tsx` (R-10) test 1 interpolates `GPS_CONFIG_STATIC.maxAttempts` into its
  own expectation, which in isolation would prove nothing. Test 2 (`caller-supplied ceiling` →
  `Sample 1 of 4`) is the discriminator and it is present. The pair is sound. Not a finding.

---

## New findings

## NEW-TESTS-7 [MINOR] features/demo/ui/screens/NotesScreen.tsx:300-306

**Claim.** R-14 shipped in two halves. The P2.5 half (the DST advisory memo) got a behavioral
guard in the same round; the **notes half — the larger one — shipped with no test at all**, so the
memoisation it introduces is a claim nothing will notice the loss of.

**Evidence.**

- Commit `a4da751` (`fix(notes): make the SectionBlock memo real…`) touches exactly two production
  files and **zero** test files:
  ```
  features/demo/ui/DemoExperience.tsx      | 52 +++++++++++++++++-------
  features/demo/ui/screens/NotesScreen.tsx | 11 +++++--
  ```
- What it asserts without a guard: `requestReset` is now a `useCallback`
  (`NotesScreen.tsx:300-306`) so `SectionBlock`'s `React.memo` holds; the bridge's six notes
  callbacks bind once against the stable store ref; `notesMeta` and `notesCopyAllText` are
  `useMemo`'d on `currentLocation` (`DemoExperience.tsx`).
- The sibling half, commit `645ac1c`, **did** get one —
  `time-offset-advisories.test.tsx:192-205` proves the memo through an observable seam. Same
  review finding, same round, opposite treatment.

**The regression that slips through.** Someone adds an inline arrow prop to `SectionBlock`, or a
seventh callback that is not `useCallback`'d, or drops a `useMemo` dependency — the memo goes
inert exactly as it was before R-14, every keystroke re-renders all seven blocks and re-runs
seven formatters, and the whole suite stays green. This is a perf contract, not a correctness
one, which is why it is MINOR — but it is precisely the kind of claim that rots silently, and the
technique to guard it is already demonstrated 40 lines away in the same PR.

**Suggested fix.** Mirror the P2.5 pattern in the `NotesScreen — bridge integration` describe:
spy a formatter the section meta consumes (or count `SectionBlock` renders via a
`vi.fn()`-wrapped child), type into the free-text tail, and assert the per-section derivations
did not re-run; then change a section's underlying wizard field and assert they did.

**Confidence:** High (the commit stat is the evidence).

---

## NEW-TESTS-8 [MINOR] vitest.config.mts:18-25

**Claim.** With `asyncUtilTimeout` raised to 5000 ms, it now **equals** vitest's default
`testTimeout` (5000 ms), which this config does not override. In every file that has not opted
into a longer per-test timeout, an RTL wait can no longer complete its budget: the test dies at
the vitest deadline with a generic `Error: Test timed out in 5000ms` instead of RTL's
`Unable to find an element…` plus the DOM dump. That is the diagnostic the change's own evidence
doc was written to preserve.

**Scope — this is not a re-flag of the deliberate choice.** The phase context settles the *value*
(5000) and the ceiling pin, and I still assess both as sound (initial pass). The gap is narrower:
`docs/code-reviews/parity/p2/gate-import-flake.md` §4 justifies 5000 as *"deliberately well under
the 20 000 ms per-test timeout so a genuine hang still fails as a hang with budget left to report
it"* — but 20 000 ms is **not** the ambient per-test timeout. It exists only in the 10 files that
opt in with `{ timeout: 20000 }`. Everywhere else the margin the rationale depends on is zero.

**Evidence.**

- `vitest.config.mts` sets no `testTimeout` → vitest default 5000 ms (`grep -n testTimeout` → no
  match).
- `vitest.setup.ts:24` `configure({ asyncUtilTimeout: 5000 })`.
- 10 files raise their own per-test timeout; **10 files use `findBy`/`waitFor` and do not**:
  ```
  app/demo/__tests__/error.test.tsx
  components/beta/__tests__/beta-form.test.tsx
  features/demo/ui/chrome/__tests__/PdfPreview.test.tsx
  features/demo/ui/inputs/__tests__/AddressAutocomplete.test.tsx
  features/demo/ui/inputs/__tests__/useGpsCapture.test.ts
  features/demo/ui/screens/__tests__/modals.test.tsx
  features/demo/ui/screens/import/__tests__/PickerStage.test.tsx
  features/demo/ui/screens/import/__tests__/terminal-integration.test.tsx
  features/demo/ui/screens/map/__tests__/MapCanvas.test.tsx
  features/demo/ui/screens/map/__tests__/MapScreen.test.tsx
  ```
- Observed live: my contended run produced `Error: Test timed out in 5000ms` from
  `terminal-integration.test.tsx` — a file on that list — rather than an RTL "unable to find"
  message. At the old 1000 ms budget RTL always won that race and produced the useful failure.

**Why it matters.** It does not cause failures; it degrades the failure *message* for the exact
class of problem the phase just spent a branch diagnosing. The next person to hit a genuinely slow
wait in one of those ten files gets a timeout with no element name and no DOM, which is
materially harder to diagnose than what they would have got before P2.

**Suggested fix.** One line in `vitest.config.mts`: `testTimeout: 20000`, matching the value the
opt-in files already chose and restoring the margin the evidence doc's §4 assumes. That also makes
the ten `{ timeout: 20000 }` annotations redundant, which is a follow-up tidy, not part of the fix.
Alternatively lower `asyncUtilTimeout` to ~3000 ms (still ~1.7× the worst measured loaded sample of
1770 ms) so RTL wins the race again — but raising the test timeout is the safer direction, since it
does not re-open the flake the raise was for.

**Confidence:** High for the mechanism and the file list; the practical impact is diagnostic only.

---

## Regressions in the blast radius

**None found.** Checked specifically:

- **Test count and gate:** 1416 → 1477 tests, 0 failures; coverage gate met with a *higher*
  function figure (99.23 → 99.74) and no file regressing below threshold.
- **The files my findings touched:** `engine-flow.test.ts` (+2 tests, existing ones unchanged),
  `store-actions.test.ts` (+1, additive), `capture-gps.test.ts` (+2, additive),
  `NotesScreen.test.tsx` (teardown added; the `Copy all` test still asserts both success and
  failure), `time-offset-advisories.test.tsx` (13 → 15; the conditional branch removed, replaced by
  a positive + a negative control).
- **The R-19 teardown does not over-restore.** `afterEach(() => vi.restoreAllMocks())` sits on the
  `DemoExperience — DST advisory wiring` describe only, so it cannot reach the screen-level
  describes above it that use plain `vi.fn()` props.
- **The R-29 clipboard teardown does not fight the R-12 fake timers.** The descriptor restore runs
  in `afterEach`; `vi.useRealTimers()` runs in the R-12 test's own `finally`. No ordering coupling.
- **`clock.ts` gained an engine import** (`isInDST`), so the UI seam now depends on
  `engine/logic/time`. That is the same direction of dependency the rest of `ui/` already has
  (ui → engine), not a new cycle; `tsc` clean confirms.

---

## Summary

| Initial finding | Maps to | Status |
|---|---|---|
| TESTS-1 [MAJOR] Flow F unpinned | R-8 | **FIXED** (mutation-verified) |
| TESTS-2 [MAJOR] TZ-conditional DST wiring pin | R-9 | **FIXED** (mutation-verified under `TZ=UTC`) |
| TESTS-3 [MINOR] inline `restoreAllMocks` | R-19 | **FIXED** |
| TESTS-4 [MINOR] uncovered selector projections | R-20 | **FIXED** |
| TESTS-5 [MINOR] mid-loop abort unpinned | R-21 | **FIXED** |
| TESTS-6 [NIT] clipboard stub not restored | R-29 | **FIXED** |
| (out-of-lane) conflict marker in `deferred.md` | R-30 | **FIXED** |

| New this pass | Severity |
|---|---|
| NEW-TESTS-7 — R-14's notes-half memo ships without the guard its sibling got | MINOR |
| NEW-TESTS-8 — `asyncUtilTimeout` (5000) now equals the default `testTimeout`, costing the RTL diagnostic in 10 files | MINOR |

| Severity | Count (new) |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 2 |
| NIT | 0 |

- **Behaviorally meaningful coverage:** strong, and stronger than the initial pass. The fix round's
  tests consistently pin the *discriminating* property (liveness read at alert time, memo proved
  through a seam, re-arm proved past the first deadline, union proved total over a corpus) rather
  than the happy path.
- **Engine coverage gate:** met — 97.8 / 91.22 / 99.74 / 99.02.
- **Mock strategy:** at the IO edge throughout; the new `persistence` partial-mock is at a genuine
  module boundary with the underlying semantics separately pinned in the engine suite.
- **Setup-shim traps:** none introduced.
- **Determinism:** the one gap I filed (uninjected timezone) is closed at its root — the zone is
  now injectable through the same seam as the wall clock.

**Verdict: APPROVE.** Both MAJORs are fixed and independently mutation-verified; the two new
MINORs are a missing perf guard and a diagnostic-quality regression, neither of which blocks merge.
