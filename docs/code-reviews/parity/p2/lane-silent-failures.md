# P2 review — lane: SILENT FAILURES — FIX-DELTA

**Branch:** `feat/parity-p2` @ `572022a` · **Fix round:** commits after `e770d45`
**Initial pass:** `9f5c01a` — 2 MAJOR, 4 MINOR, verdict REVISE.
**Lane charter:** `.claude/agents/silent-failure-hunter.md` — *a fallback must announce itself;
substituted data presented as the visitor's real result is the worst failure this codebase can
have.*

## Verdict: **APPROVE** on lane substance — all six findings FIXED — **with one MAJOR fix-introduced regression (NEW-1), test infrastructure rather than product code.**

| Finding | Fix | Status |
|---|---|---|
| SF-1 — "Progress Saved" promised persistence unconditionally | R-2 | **FIXED** |
| SF-2 — dropped extracted scopes silently shortened the court PDF | R-3 | **FIXED** |
| SF-3 — fabricated OCR confidence presented as measured | R-16 | **FIXED** |
| SF-4 — partial reverse-geocode blanked typed fields, reported as success | R-17 | **FIXED** |
| SF-5 — malformed reading → unhandled rejection → dead button | R-13 | **FIXED** |
| SF-6 — `accuracy ?? 0` re-introduced the fabricated "±0m · Excellent" | R-18 | **FIXED** |

**New findings this pass:** BLOCKER 0 · MAJOR 1 · MINOR 0.

Fallback honesty: **yes** (was *no*). Failure-cause distinctions: **preserved** (was *collapsed*).
Partial results flagged: **yes** (was *no*). Async cancellation / stale-write safety: **yes, now
stronger** — R-1 added a location-generation write guard this lane had not asked for. Operator
breadcrumbs: **intact and extended** (R-13 adds one; none removed).

---

## SF-1 → R-2 · **FIXED**

`bb5f928` — `features/demo/engine/store/persistence.ts:496-513, 537-552, 584` ·
`features/demo/ui/DemoExperience.tsx:145-165, 312-329, 874-880`

**Both arms I filed are closed.**

*Arm 1 — storage absent/blocked.* `PersistenceHandle` gains `isLive()`, and `NOOP_HANDLE.isLive()`
returns `false` (`:498-502`) — exactly the no-storage / kill-switch case. `saveProgress` reads it
and swaps the body:

```
DemoExperience.tsx:876-880
const stored = persistenceRef.current?.isLive() ?? false
setAlert({ title: PROGRESS_SAVED_TITLE, message: stored ? PROGRESS_SAVED_BODY : PROGRESS_NOT_STORED_BODY, … })
```

The demoted copy states the consequence rather than going quiet —
*"This browser isn't storing the session — your work will be lost if you refresh or close the
tab."* Silence was the wrong alternative and the fix says so explicitly; that matches the
FallbackMode treatment this lane holds every degraded path to.

*Arm 2 — delete-after-promise.* The save catch sets `live = false` **before** clearing the
snapshot (`:546-549`), so the handle stops promising from the moment the snapshot stops existing.

**Judgement asked — does tracking-not-latching truly close arm 2? Yes, and tracking is the
*correct* semantic here, not a weaker one.** A latch would be wrong in both directions: latching
true would keep promising after a failure; latching false would refuse to promise forever after
one transient security/quota throw, even though a later write landed and a refresh genuinely would
restore. `isLive() === true` means "a write succeeded and has not since been cleared" — precisely
the claim the copy makes. Three supporting details check out:

- **Read at alert time, not captured at mount.** `persistenceRef` is read inside `saveProgress`,
  so a failure that revoked the promise mid-session demotes the *next* alert. A mount-time capture
  would have re-opened arm 2 wholesale.
- **`?? false` on a missing handle** — an absent handle demotes rather than assumes. That unknown
  state was exactly what the old unconditional copy assumed away.
- **Starts `false`.** Nothing has been written yet, so nothing can be promised yet — the only
  honest reading of the pre-first-write window.
- Injected stores are now wired with a *null backend* rather than skipped, so every mount has a
  handle to interrogate. That is what makes "no handle" unreachable in practice, and it is why the
  completion-gate suite's assertion correctly flipped to the demoted arm.

**Residual (recorded, not a finding).** The promise is true when made and can become false
afterwards: `isLive()` is true at the alert, the visitor taps OK, and the next debounced write
(≤250 ms later) throws and clears the snapshot. Nothing retracts an already-dismissed alert. This
is a strictly narrower window than the original defect — the promise is now grounded in a landed
write instead of in nothing — and once OK dismisses the alert there is no surface left to retract
on. Not worth engineering around; recorded so a later reader doesn't mistake it for an oversight.

**Pins.** `engine/store/__tests__/persistence.test.ts:584-650` covers `isLive` across NOOP,
kill-switch, first write, failure-clears, and recovery — **passing**.
`ui/__tests__/DemoExperience.progress-saved.test.tsx` covers both alert arms and the
read-at-alert-time property — **currently failing, see NEW-1**. Verified by hand that all four
pass with an adequate timeout, so the *fix* is sound; its *verification* is not currently running.

---

## SF-2 → R-3 · **FIXED**

`8a85bf1` — `features/demo/engine/logic/pdf/case-notes.ts:86-95, 232-245` ·
`features/demo/engine/store/selectors.ts:275-278`

**My four-step nothing-warns trace is genuinely closed end-to-end.** `extractedScopesPartial` now
rides `selectCaseNotesData` into `CaseNotesData`, and the Case Notes block renders the
`adjPartialNote`-idiom red warning. Re-walked against the trace as filed:

1. Calculate with one non-canonical scope → extracted list short, flag `true`. ✔
2. Visitor fixes the requested times and does **not** re-Calculate. ✔
3. `adjustedScopesPartial` (live recompute) clears → its warning disappears. ✔
4. `extractedScopesPartial` (stored) stays `true` → **the document now warns**: *"…the recovered
   footage reported in these notes may be incomplete. Recalculate on the Time Offset screen after
   correcting the requested times."* ✔

Three things I checked beyond the trace, all correct:

- The warning renders **even when the notes body is empty** — `:236-245` gates the section on
  `notesFlat.trim() || notesPartialNote`. Without that, an empty-notes case with a short extracted
  list would still have shipped silent. This is the detail that makes the fix complete rather than
  nearly complete.
- `formatScopes` is untouched, per the finding. Its filter is correct behaviour for a *flagged*
  partial; changing a verbatim phone port was never the fix.
- The flag clears only on a successful re-Calculate (`extractedScopesPartial: dropped > 0`) and
  survives the snapshot (`persistence.ts:230`, schema unchanged), so the warning persists across a
  refresh until the visitor does what the copy instructs.
- `time.ts:143`'s claim that the throw "flags it via `extractedScopesPartial`" is now true rather
  than aspirational.

**Residual (recorded, not a finding).** If the visitor *deletes* the offending requested scope
instead of correcting it and still doesn't re-Calculate, the flag stays `true` and the document
warns about an incompleteness whose source is gone. That is the safe direction — over-warn, never
under-report — and the copy's instruction still resolves it.

**Pins.** `engine/__tests__/engine-flow.test.ts:79-102` reproduces the review trace verbatim
(adjusted clears, extracted stays flagged, document warns);
`engine/logic/pdf/__tests__/case-notes.test.ts:77, 83` pin flagged / unflagged / empty-body
rendering. **All passing.**

---

## SF-3 → R-16 · **FIXED**

`13667ca` — `features/demo/ui/screens/OcrCaptureScreen.tsx:94-113` ·
`features/demo/engine/content/seed.ts:40-45`

The score keeps its value and tier colouring but is now badged `Sample` — the demo's existing
"not from the real thing" device, lifted from the import result cards — with two sentences that do
the actual work:

> *Fixed for sample frames — a browser has no recogniser to score. It rates how legibly the
> characters read, never which date they mean.*

That second clause is what dissolves the contradiction I flagged: a green "High confidence" above
a red assumed-date blocker is no longer the screen arguing with itself, because the chip's scope is
now stated. The fix took the "label it" arm and explicitly rejected suppressing the chip on the two
awkward frames — the right call, for the right reason: suppression hides a value instead of telling
the truth about it, the opposite of how this demo handles everything else it cannot really do. The
seed comment now also binds a future maintainer (*"if this ever becomes a measured value, that
badge and its note have to go with it"*).

Ledger §40/37f (rail narration) remains open and P4-owned, exactly as scoped — untouched.

---

## SF-4 → R-17 · **FIXED**

`78eb636` — `features/demo/ui/inputs/LocationFields.tsx:80-89, 124-134`

Writes are now component-wise, and the partial case has its own notice:

```
LocationFields.tsx:130-134
const patch: Partial<LocationFieldValues> = {}
if (address.streetAddress) patch.streetAddress = address.streetAddress
if (address.city) patch.city = address.city
if (Object.keys(patch).length > 0) onChange(patch)
setLookupNotice(address.streetAddress && address.city ? 'none' : 'partial')
```

An empty component now means "not found", never "clear what the operator typed" — so the
propagation path I traced (typed City → blanked → `formatAddress` drops it → PDF header, notes
attendance line, Cases row, map sheet) is cut at the source. The three outcomes are also no longer
collapsible: `LookupNotice` is a `'none' | 'failed' | 'partial'` union rather than two booleans,
with the reasoning written down, and `REVERSE_GEOCODE_PARTIAL` names what stands (*"the rest was
left as you typed it"*). Failure-cause distinction restored.

---

## SF-5 → R-13 · **FIXED**

`5d5973e` — `features/demo/engine/logic/gps.ts:200-210` ·
`features/demo/ui/inputs/GpsCaptureControl.tsx:135-145`

Both halves landed. `toGpsFix` guards the timestamp it converts and returns a typed failure instead
of letting `new Date(NaN).toISOString()` throw:

```
gps.ts:205-209
if (!Number.isFinite(best.timestampMs)) {
  return { ok: false, failure: { code: 'INVALID_COORDINATES', message: 'Invalid timestamp reported by the location service.' } }
}
```

so the adversarial input I named (a provider reporting `timestamp: NaN`) now sets `failure`, which
renders the control's `role="alert"` line. The chain also gains a terminal `.catch` carrying the
repo's `console.warn` convention. §45b's choice of `INVALID_COORDINATES` over a new code is sound:
the union is deliberately the phone's minus the unreachable `UNKNOWN`, the code already means "this
reading cannot be trusted", and the message names the actual defect.

**Residual (recorded, not a finding).** The terminal `.catch` warns but sets no visitor-facing
failure, so a *genuinely unexpected* throw still leaves the button idle with no on-screen reason —
now with an operator breadcrumb where there was none. The commit states this explicitly, and the
concrete input I named no longer reaches it.

**Pins.** Engine returns the typed failure rather than throwing; the Submission screen renders the
failure line and stays operable, writing nothing. **Both passing.**

---

## SF-6 → R-18 · **FIXED**

`7b92091` — `features/demo/ui/inputs/capture-gps.ts:166-174` ·
`features/demo/engine/logic/gps.ts:32-50, 159-185`

`accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : undefined` — the
fabricated `0` is gone, and the ripple I anticipated was handled deliberately rather than absorbed:

- `meetsTargetAccuracy` returns `false` without a figure, so a reading that cannot be *shown* to
  meet the target no longer ends the multi-sample loop early. This is the half that mattered most —
  `0` was collapsing the whole forensic procedure to a single reading.
- `selectBestSample` prefers a measured reading over an unmeasured one **in either order**, and
  returns an unmeasured one only when nothing in the set carries an accuracy.
- The live readout drops the `· best ±Nm` clause rather than printing `±0m`.

§45c's reasoning on the last point is right and worth endorsing: refusing to return an unmeasured
sample would turn "coordinates captured, accuracy unknown" into `LOCATION_UNAVAILABLE` — dishonest
in the other direction, since the fix is real and only the accuracy figure is missing. The type now
says what is true, and `CoordinateDisplay` already rendered `undefined` correctly.

---

## Sweep of the fix round's new failure arms

**R-1 — the abandoned-lookup silence (§45d). Judged: correct. Agreed.**
`LocationFields.tsx:99-107, 115-123` adds a `writeGen` token bumped by the cleanup React runs on
both `locationId` change and unmount; the post-await write is dropped when the generation moved.
§45d argues the drop should be silent. I agree, on three independent grounds:

1. **Nothing is lost.** The coordinates the lookup would have annotated were written, stamped and
   rendered *before* the await (`:111`). Only address enrichment is skipped, and the form keeps
   whatever the operator typed — which, after R-17, is never blanked.
2. **A notice would be a lie about attribution.** It would render on the location now on screen,
   which never had a lookup in flight. Misattributed noise is worse than silence, not better.
3. **It matches the repo's own reference pattern.** This is the `importGen` discipline — a
   superseded run's late lines drop by design, with the same reasoning already recorded in
   `DemoExperience.tsx`. A cancelled operation is not a failure to report.

This fix also closes a real cross-location write hazard I had not filed: `updateField` resolves its
target at call time, so an unguarded post-await write could land location A's address on location
B. The `key={locationId}` on `GpsCaptureControl` extends the same guard to an in-flight *capture*
(a 30–120 s budget easily outlives a switch).

**R-4 — OCR commit silently destroying edited extracted scopes. Closed; this lane missed it.**
`aa3d33f`. `confirmOcr` → `calcOffset()` → `generateExtractedScopes()` replaced the editable
extracted-scope list wholesale with no prompt, so *generate → edit → re-capture OCR → "Use this &
calculate"* destroyed the operator's edits silently. Now a three-arm confirm (Cancel / Keep My
Edits / Regenerate Scopes), verified against the phone rather than assumed. Two mechanics check
out: `calcOffset(regenerate = true)` leaves the Time Offset screen's Calculate behaving exactly as
before, and `onCalculate={calcOffset}` is only ever invoked zero-arg (`TimeOffsetScreen.tsx:61,
:159`), so no click event can leak into the boolean and force a regeneration. Escape closes to the
confirm step rather than firing Cancel — right call: a stray keypress must not discard a read.

**R-7 / §45a — `aria-disabled` instead of `disabled`.** The consequence is that the button stays
clickable while busy, making `if (busy || disabled) return` in `onClick` load-bearing — a guard
whose deletion would silently re-enable double-capture. Documented at the call site, documented in
§45a, and pinned by a test that clicks during a capture and asserts one write. Acceptable as a
declared trade.

**R-5 / R-12 / R-31 — Notes and coordinate-card dialogs.** All six Notes confirmations moved to the
shared `AlertDialog` with `onDismiss={closeDialog}` on every one, so Escape cancels and can never
fire a destructive arm. The lane-relevant contracts survive the R-14 memo refactor intact:
`SectionBlock`'s blur-and-unmount `flushRef` commit (`NotesScreen.tsx:133-138`) and the free-text
equivalent (`:273`) are unchanged, and both clipboard paths still fail honestly
(`NotesScreen.tsx:292`, `CoordinateDisplay.tsx:98-101`) — no fake success when the browser blocks
the clipboard. R-12/R-31 add the missing reset-timer cleanup on both.

**Pre-existing observation (not fix-introduced; recorded for P3.4/P3.7).** `LocationFields` is not
remounted on a location switch — only `GpsCaptureControl` is, via `key`. So `reverseGeocoding`
state outlives the switch, and location B's capture button can briefly show "Looking up address…"
and stay inert for a lookup belonging to location A. Bounded by the Mapbox round trip and cleared
by the `finally`, but it is a busy state attributed to the wrong location. §45's trigger already
sends the next reader back here.

---

## NEW-1 [MAJOR] features/demo/ui/__tests__/DemoExperience.progress-saved.test.tsx

**Claim.** The suite that pins SF-1's fix is **always red**: 4/4 fail on a quiet machine and 4/4
pass when given an adequate budget, because the file is missing the per-file test-timeout override
that this repo's other full-bridge suite carries. The honesty guarantee R-2 introduced therefore
ships unverified — and a permanently-failing honesty pin is the kind that gets `.skip`ped later
rather than fixed. The same missing budget also makes other new UI suites contention-flaky.

**Evidence — systematic, measured on this worktree at `572022a`, file run alone on a quiet box:**

```
$ pnpm vitest run features/demo/ui/__tests__/DemoExperience.progress-saved.test.tsx --silent
  Test Files  1 failed (1)
       Tests  4 failed (4)          Error: Test timed out in 5000ms.   ← all four

$ pnpm vitest run … --testTimeout=30000 --silent
  Test Files  1 passed (1)
       Tests  4 passed (4)
```

Not marginal: the four tests take ~42 s of test time between them (~10 s each) against a 5000 ms
default. Also reproduced inside a 7-file batch (`2 failed | 144 passed`, both in this file).

**Evidence — the same seam as flake, separately measured.** A 6-file UI batch run while the box was
loaded reported `2 failed | 83 passed`, one failure in `GpsCaptureControl.test.tsx`. **Re-run on a
quiet box the identical 6 files pass `6 passed (6) / 85 passed (85)`** — so those two are
contention flakes on the same 5 s ceiling, not systematic failures. Worth separating: only
`progress-saved` is broken; the rest are exposed.

**Root cause.** `vitest.config.mts` sets no `testTimeout`, so vitest's 5000 ms default applies. The
sibling full-experience suite handles exactly this:

```
DemoExperience.sandbox.test.tsx:84-87
// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file …
describe('DemoExperience — sandbox bridge paths', { timeout: 20000 }, () => {
```

The new file has no such option. Note the interaction with this phase's own
`configure({ asyncUtilTimeout: 5000 })` (`vitest.setup.ts`), whose comment reasons *"deliberately
well under that 20000ms test timeout"* — but that 20000 ms is per-file on the sandbox suite, not
global. Any new full-bridge suite that does not opt in gets an async-util budget equal to its whole
test budget, so one `findBy*` can consume the entire allowance. This file is the first to land on
that seam; the flakes above show it will not be the last.

**Observable wrong behaviour.** The branch's suite is red. Anyone running the P2 tests sees four
failures attributed to the persistence-honesty fix, with no way to tell without bisecting that the
product code is correct and only the budget is wrong.

**Suggested fix (one line).** Add the sibling's option to the describe:

```ts
describe('Progress Saved — the promise is gated on real persistence (R-2)', { timeout: 20000 }, () => {
```

Worth considering alongside it — and the flake evidence argues for it — promote the budget to a
project-wide `testTimeout` in `vitest.config.mts` so the next full-bridge suite doesn't rediscover
this. That shape is a tests-lane call; this finding flags the seam, not the remedy.

**Confidence: high.** Measured in both directions on this worktree; the missing option and the
sibling precedent are both in the tree.

**Lane note.** Test infrastructure, not product code — no visitor-facing silent failure. Filed
MAJOR because it leaves *this lane's* highest-severity fix unverified on a red suite; ownership
belongs to the tests lane.

---

## Verification performed this pass

Suites run at `572022a` (`pnpm vitest run … --silent`):

| Suite | Result |
|---|---|
| `engine/__tests__/engine-flow.test.ts` (incl. the R-3 four-step trace pin) | pass |
| `engine/logic/pdf/__tests__/case-notes.test.ts` | pass |
| `engine/store/__tests__/persistence.test.ts` (incl. `isLive`) | pass |
| `engine/logic/__tests__/gps.test.ts` | pass |
| `ui/inputs/__tests__/capture-gps.test.ts` | pass |
| `ui/screens/__tests__/submission-gps.test.tsx` | pass |
| `ui/screens/__tests__/NotesScreen.test.tsx` | pass |
| `ui/__tests__/DemoExperience.ocr.test.tsx` | pass |
| `ui/__tests__/DemoExperience.completion-gate.test.tsx` | pass |
| `ui/inputs/__tests__/CoordinateDisplay.test.tsx` | pass |
| `ui/inputs/__tests__/GpsCaptureControl.test.tsx` | pass (flaked once under load — NEW-1) |
| `ui/screens/__tests__/marquee.test.tsx` | pass |
| `ui/screens/__tests__/time-offset-advisories.test.tsx` | pass |
| `ui/__tests__/DemoExperience.progress-saved.test.tsx` | **fail 4/4 (timeout) — NEW-1**; passes at `--testTimeout=30000` |

Read in full: the R-1/R-2/R-3/R-4/R-13/R-16/R-17/R-18 commits and their touched source, plus
`LocationFields.tsx`, `GpsCaptureControl.tsx`, `capture-gps.ts`, `gps.ts`, `case-notes.ts`,
`selectors.ts`, `persistence.ts`, `OcrCaptureScreen.tsx`, `NotesScreen.tsx`,
`CoordinateDisplay.tsx`, `TimeOffsetScreen.tsx`, `DemoExperience.tsx`, and deferred §45.

## Resume notes (if a second fix round runs)

1. **NEW-1** — confirm the describe carries `{ timeout: 20000 }` (or a project-wide
   `testTimeout`), then re-run the file alone and confirm 4/4 green at the default budget.
2. **Regression watch — these must stay exactly as they are:** `isLive` tracking (not latching)
   and the read-at-alert-time in `saveProgress`; `extractedScopesPartial` rendering even with an
   empty notes body; `formatScopes` untouched; `meetsTargetAccuracy`'s `undefined` refusal;
   `LocationFields`' component-wise patch; the `if (busy || disabled) return` guard in
   `GpsCaptureControl.onClick` (load-bearing under `aria-disabled`, §45a);
   `onDismiss={closeDialog}` on all six Notes dialogs; the `SectionBlock` blur-and-unmount flush;
   `onCalculate` staying zero-arg so `calcOffset`'s `regenerate` default holds.
3. Nothing else from the initial pass remains open.
