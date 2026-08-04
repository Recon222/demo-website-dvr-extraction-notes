# Parity P3 — TESTS lane (fix-delta)

**PR:** #32 — *Parity P3 — case & location management (CRUD, actions sheet, edit mode, GPS everywhere)*
**Round-1 head:** `4e60680` · **Fix-round head reviewed:** `3cecfcc` (`feat/parity-p3`), delta `b678a8d..HEAD` (15 commits)
**Lane:** `.claude/agents/test-analyzer.md` · **Mode:** fix-delta (resumed; I verify my own round-1 findings)
**Refs read:** `features/demo/CLAUDE.md`, `docs/code-reviews/deferred.md` §48–§57 (incl. the new §57a–§57i),
every fix commit body, and the full diff of all 20 touched test files.

## Pre-flight

| Gate | Result |
|---|---|
| `pnpm test` (full, `--silent`) on `3cecfcc` | **189 files / 1906 tests passed**, 0 failed — matches the orchestrator's claim |
| Round-1 baseline | 189 files / 1891 tests → **net +15** |
| `it()` blocks added / removed in the delta | **+18 added**, 3 removed — 2 of those are renames with strictly stronger bodies, **1 is a genuine deletion** (see TESTS-P3-9) |
| `.only` / `.skip` / `.todo` / snapshots | none |
| Probes run this round | **13**, every one reverted; `git diff -- features/` clean at sign-off |

---

## Round-1 findings — verification

| # | Finding (round 1) | Fix | Status | Mutation evidence |
|---|---|---|---|---|
| TESTS-P3-1 | HIGH — new-address card's GPS wire unpinned | R-2 `c0e48e4` | **FIXED** | probe E |
| TESTS-P3-2 | HIGH — long-press contextmenu divergence unpinned; third hook | R-1 `ec20686` | **FIXED** | probes A, B |
| TESTS-P3-3 | MEDIUM — `setCameraGps` guard unpinned at every level | R-6 `66fc066` | **FIXED** | probe F |
| TESTS-P3-4 | MEDIUM — `updateIncidentLocation` "no-ops" claim untrue | R-4 `76abf1c` | **FIXED** | probe G |
| TESTS-P3-5 | MEDIUM — map plotting ungated on `hasCapturedCoordinates` | R-7 `113c5a3` | **FIXED** | probe H |
| TESTS-P3-6 | MEDIUM — seven hand-rolled `DemoCase` fixtures, no factory | R-15 `3511527` | **PARTIAL** | 7 → 3; ledger claim inaccurate |
| TESTS-P3-7 | LOW — `deleteCase` derivation arm can't distinguish the branches | carried §57h | **DEFERRED (accepted)** | unchanged; rationale sound |
| TESTS-P3-8 | LOW — two unfailable assertions + unreset harness | R-17 `683735e` | **FIXED** | all three items |

### TESTS-P3-1 → FIXED

**Probe E** — re-ran my exact round-1 mutation, `gps: locForm.coordinates` → `gps: undefined`
(`DemoExperience.tsx:774`), against the **full** suite:

```
× carries a fix captured ON THE CARD through to the created location (R-2)
Test Files  1 failed | 188 passed (189)
Tests       1 failed | 1905 passed (1906)
```

Round 1 the same mutation was green at 1891/1891. The new arm
(`DemoExperience.duplicate.test.tsx`, R-2) drives a real capture through the bridge — chooser →
*New Location w/ Sub Info* → `withGeolocation` → street → Create → asserts the created location's
`gps` equals `{ lat: 43.7, lng: -79.4, accuracyM: 4, source: 'gps' }`. It reddens **only** that
arm, which is the right blast radius: the wire, not a proxy for it. §57d concedes the point
explicitly ("an argument from similarity is not a pin").

### TESTS-P3-2 → FIXED (the fix shape was met in all three places, and exceeded)

**Probe A** — restore the pre-R-1 unconditional `onContextMenu` (delete the `fired` latch):

```
× a touch hold that also raises contextmenu fires ONCE, and the next right-click still works   (useLongPress)
× a touch hold that also raises contextmenu opens the sheet ONCE                               (DashboardScreen)
× a TOUCH hold leaves the tray open — the trailing contextmenu must not toggle it shut         (CasesScreen.row-actions)
Test Files 3 failed (3) · Tests 3 failed | 40 passed (43)
```

That is exactly the fix shape my finding demanded — the **hook**, the **real call site**, and the
**dashboard** — and the same mutation was green at 1891/1891 in round 1.

**Probe B** — restore P3.2's reset-*after*-guard ordering in `onPointerDown`:

```
× a MOUSE hold does not leave a latch that eats the next right-click
Test Files 1 failed | 2 passed (3)
```

So the second half — the one my round-1 finding did **not** identify — is independently pinned too.
Judgement on what the fix went beyond my report: the round found a *third* implementation
(`DashboardScreen.tsx`'s private hook, which §56f never saw because it was not a module), deleted
it, and discovered that the two survivors held **complementary halves of one platform fact** —
the shared hook was broken on touch, the dashboard's on mouse. My round-1 report only had the
touch half. §57b generalises the guard rail correctly.

**§57a's refutation of my suggested fix shape is correct and I accept it.** I proposed lifting
P3.2's `e.target.closest('button')` bail into the shared hook. Verified at source: the Cases
handlers rode a wrapper `<div>` whose every descendant is a `<button>`, so the bare check would
have bailed on every hold and killed the gesture outright. The shipped rule
(`closest(control) !== e.currentTarget`, plus moving the Cases handlers onto the row/header button)
is the correct generalisation, and `useLongPress.test.tsx`'s new `CardProbe` covers the *other*
call-site shape so both are exercised. Good catch against my own suggestion.

### TESTS-P3-3 → FIXED

**Probe F** — delete the guard's second clause (`create-store.ts:691`), the exact round-1 mutation:

```
× drops the write when the camera was removed mid-capture — and does NOT resurrect it
× does not write a fix into ANOTHER location that happens to be open
Test Files 1 failed | 2 passed (3) · Tests 2 failed | 29 passed (31)
```

Round 1: **all 31 green**. Both arms now carry the house whole-state pin
(`const before = store.getState(); …; expect(store.getState()).toBe(before)`), and R-6's commit
body reproduces my reasoning about *why* the value assertions were satisfied by the writer's shape.
The cross-location arm matters most, exactly as flagged — the UI abort and the store guard are
mutually redundant, so only an identity pin can hold each independently.

### TESTS-P3-4 → FIXED

**Probe G** — remove the new `get()`-first early return from `updateIncidentLocation`:

```
× touches only the named case, and no-ops on an unknown id
Test Files 1 failed (1) · Tests 1 failed | 11 passed (12)
```

The guard shipped **and** the test title is now true. §57 also records the thing I dropped and
they re-derived independently — a no-change Save on a *known* id still wakes subscribers, which
`updateCase` shares, so fixing it here alone would be a new divergence. Correct call.

### TESTS-P3-5 → FIXED

**Probe H** — revert `toMapData` to plain presence (both gates):

```
× does not plot a (0,0) incident — Null Island is never a captured position
× does not plot a (0,0) location, and does not count it in the status tallies
Test Files 1 failed | 1 passed (2) · Tests 2 failed | 13 passed (15)
```

Both gates fixed and both pinned, and the location arm additionally asserts the **status tally** —
derived from the pins, so an ungated pin would have inflated it. That is a consequence my finding
did not name. §49g's trigger is discharged rather than re-deferred (§57e), which is the better of
the two options I offered.

### TESTS-P3-6 → PARTIAL

R-15 built the canonical `demoCase` / `demoLocation` in
`features/demo/engine/store/__tests__/test-utils.ts:44-96` and folded four suites
(`screenData.test.ts`, `CaseActionsSheet.test.tsx`, `EditIncidentLocationModal.test.tsx`,
`NewCaseModal.gate.test.tsx`). Fixture sites carrying a **full hand-rolled 15-field literal**:
**7 → 3**. Real progress, and more than the ledger entry I said was the minimum.

**The residual, and why it is not merely "not done yet":** both the commit body and §57h state
that *"sites that build cases through the store are already drift-proof and were left alone."*
That is **false for all three survivors** — none of them builds through the store:

| Site | Shape |
|---|---|
| `ui/screens/__tests__/caseFormData.test.ts:17` | `function demoCase(over)` — 15 fields inline, incl. `incidentCoordinates` |
| `engine/logic/__tests__/incident-location.test.ts:10` | `function makeCase(o)` — 15 fields inline, incl. `incidentCoordinates` |
| `engine/logic/__tests__/final-submission.test.ts:29` | `const demoCase = (o)` — 15 fields inline, **plus** a hand-rolled `demoLocation` |

Each is a one-line delegation away (`demoCase({ …the two or three fields this suite is about })`),
exactly like the four that were folded. Left as-is, the ledger's trigger ("the next `DemoCase`
field add — update the factory first, then fold whatever still fails") will not fire for them,
because an added **optional** field does not make a stale fixture fail — which is the precise
failure mode the factory was built for. The entry is self-defeating as written.

**Fix (small):** fold the three, or correct §57h to name them as outstanding rather than describing
them as drift-proof.

### TESTS-P3-7 → DEFERRED (accepted)

Carried in §57h as a NIT with the rationale I gave — the distinguishing state (an open location
whose `caseId` differs from `currentCaseId`) is unconstructible through any writer, and
`loadSnapshot` now derives too. Correct disposition; nothing owed.

### TESTS-P3-8 → FIXED

All three items in R-17 `683735e`: the decorative stale-notice assertion dropped with a comment
naming the load-bearing half; `not.toContain('±')` scoped to the GPS cell rather than the whole
document; `pickHarness` given a central `beforeEach` reset.

---

# New findings (fix-introduced / newly exposed)

## [MEDIUM] TESTS-P3-9 — R-1 **deleted** the only pin on the keyboard exemption, and nothing replaced it

**Production code:** `features/demo/ui/primitives/useLongPress.ts:188` —
`if (e.detail === 0) return // keyboard activation — never a hold's trailing click`.
**Tests covering it:** **none**, since `ec20686`.

The R-1 hunk **replaced** `it('never swallows keyboard activation')` with the touch arm rather
than adding beside it — it is the one genuine deletion in the delta (the other two removed `it(`
lines are renames with stronger bodies). Nothing in the fix round mentions it: §57a/§57b
discuss R-1 at length and `git log -S"detail === 0" -- features/demo/ui/primitives/` over the
delta returns nothing.

**Probe C** — delete the exemption line, full suite:

```
Test Files  189 passed (189)
Tests       1906 passed (1906)
```

**Why it matters.** The suite still *claims* the guarantee in two places that now describe nothing:
the file header (`useLongPress.test.tsx:9`, "keyboard activation is never swallowed") and the
`click(detail = 1)` helper's doc comment (`:48`, "A real (pointer-originated) click carries
detail ≥ 1; keyboard activation carries 0"). §56f recorded this exemption as a known
wrong-reason trap — *"P3.1's swallow test gained an explicit `detail: 1`: `fireEvent.click`
defaults to `0`, which is now the keyboard exemption, so the unqualified click was passing for
the wrong reason."* The reachable a11y path: a hold released **off** the row arms
`swallowNextClick` and no click consumes it (the `2b18a0a` pointerdown reset does not help — no
new pointerdown intervenes); a keyboard user then tabs to that row and presses Enter, whose
synthesised click carries `detail === 0`. Without the exemption the activation is
`preventDefault`ed and `stopPropagation`ed, and the row silently does nothing — on the surface
carrying Delete and Duplicate….

**Fix.** Restore the deleted arm in `useLongPress.test.tsx` (it is three lines, and the `click(0)`
helper is still in the file, currently unused): hold → `advanceTimersByTime(LONG_PRESS_MS)` →
`click(0)` → `expect(onClick).toHaveBeenCalledOnce()`. That turns probe C red.

## [MEDIUM] TESTS-P3-10 — the `2b18a0a` swallow-reset is unpinned too, and its own test passes for the wrong reason

**Production code:** `useLongPress.ts:145` — `swallowNextClick.current = false` at the top of
`onPointerDown` (commit `2b18a0a`, "a long-press released off the row must not eat the next tap").
**Test claiming it:** `CasesScreen.row-actions.test.tsx:132` — *"does not eat a later tap when the
hold ended off the row"*.

**Probe D** — delete the reset, full suite:

```
Test Files  189 passed (189)
Tests       1906 passed (1906)
```

**Why the test cannot fail.** Its final action is a bare `fireEvent.click(row)`, which jsdom gives
`detail: 0` — so it is exempted by the **keyboard** rule at `useLongPress.ts:188` and never
reaches the swallow at all. `onClickCapture` consumes the latch and returns before
`preventDefault`, so the row's `onClick` runs either way. `2b18a0a`'s "probe-verified red without
the reset" was true **on the P3.1 branch**, before §56f merged P3.5's `detail` check into the
hook; the assembly silently made it vacuous, and nobody re-ran it.

**Not fix-introduced** — it predates this round. Filed now because (a) R-1 rewrote this exact
function and did not catch it, and (b) it compounds with TESTS-P3-9: with the keyboard pin
deleted, **both** halves of the click-swallow discipline — the exemption and the reset — are now
unpinned, and each is what makes the other's test read correctly.

**Fix.** One character of intent: give that test's final click `{ detail: 1 }` (the same
correction §56f applied to the swallow test for the same reason). Then probe D reddens it, and
with TESTS-P3-9's arm restored the two rules are pinned independently.

---

## Judgement on the ~15 new tests: behaviourally meaningful, with mutation evidence

I read all 18 added `it()` blocks and probe-verified the six most likely to be vacuous
(focus assertions and timer assertions in jsdom are the usual offenders):

| Arm | Probe | Result |
|---|---|---|
| R-10 focus return (2 arms, `DemoExperience.crud.test.tsx`) | strip `triggerRef.current?.focus()` from both rows | **2 red** |
| R-8 second-notice dwell (`DemoNotification.test.tsx`) | revert effect deps to `[durationMs]` | **1 red** |
| R-9 live region | strip `role="status"` from the JSX | **1 red** |
| R-16 coordinate-error a11y | strip `role="alert"` | **1 red** |
| R-16 (other half) | strip `aria-describedby={error ? errorId : undefined}` | **1 red** |
| R-2 / R-6 / R-4 / R-7 | as tabulated above | **8 red total** |

None of them is shape-noise. Three deserve specific credit:

- **R-3's migration strengthened a weakness my round-1 report flagged but did not file.** I noted
  that `DuplicateLocationModal`'s *"emits nothing while gated"* pinned only the outcome, because a
  `disabled` attribute means the DOM click never reaches the commit-path guard. Moving to
  `aria-disabled` (§56d's house gate) means those clicks now genuinely land, so the guard is
  exercised for the first time — and the new arms add the reason node
  (`duplicate-location-blocked`), `toHaveAccessibleDescription`, and a focusability arm.
- **R-11's arm pins *both halves* of one derivation** (render mode and submit branch) in a single
  test, which is the shape that catches a discriminator that disagrees with itself — precisely the
  class of bug §56b/§56c kept finding.
- **R-8's arm uses the right geometry**: advance past the *first* notice's deadline but short of
  the second's, so it fails in both directions (a timer that never restarts, and one that
  restarts twice).

Two smaller notes, neither filed:
- `DemoExperience.case-actions.test.tsx`'s R-11 arm reaches its state via
  `store.getState().deleteCase(caseId)` and says so in-comment ("no UI path can do this while the
  sheet's scrim is up; the point is that the two halves cannot disagree"). Honest framing of a
  defensive pin — the right way to write one.
- The new `demoCase`/`demoLocation` factory is imported by UI suites from
  `engine/store/__tests__/test-utils`. Cross-layer test-util import is already the established
  pattern here (`update-case.test.ts` does it), so no objection.

---

## Fix-introduced regression sweep

- **Deleted tests:** one (TESTS-P3-9). The other two removed `it(` lines are renames whose bodies
  gained assertions.
- **Weakened assertions:** none found. R-3's `toBeDisabled()` → `aria-disabled` swap keeps the
  `toBeEnabled()` checks on the four ungated actions and adds `not.toBeDisabled()` on the gated
  ones, so the semantic change is asserted in both directions.
- **Order-dependence / shared mutable state:** improved (R-17's `pickHarness` reset). No new
  module-level mutable state introduced.
- **Determinism:** unchanged — fake timers scoped and restored in every new arm; no `Math.random`;
  the single `new Date()` is still the safe upper-bound comparison in `gps.test.ts`.
- **Setup-shim traps:** none. The new capture arms install `navigator.geolocation` per-test and
  `Reflect.deleteProperty` it, respecting the `vitest.setup.ts` contract.
- **Mock strategy:** unchanged and still at the IO edge; no engine or store mocking introduced.

---

## Test Analyzer Summary (fix-delta)

| Severity | Round 1 | Verified this round | New |
|---|---|---|---|
| CRITICAL | 0 | — | 0 |
| HIGH | 2 | **2 FIXED** | 0 |
| MEDIUM | 4 | **3 FIXED**, 1 PARTIAL | **2** |
| LOW | 2 | **1 FIXED**, 1 DEFERRED (accepted) | 0 |

**Prior-finding disposition: 6 FIXED · 1 PARTIAL · 1 DEFERRED-accepted · 0 UNFIXED.**

Behaviorally meaningful coverage: **strong** — every fix that owed a pin got one that reddens
under its own mutation; 13/13 probes behaved as the commit bodies claimed
Engine coverage gate (80% on `lib/**` + `engine/**`): **met**
Mock strategy: **at the IO edge**
Factory usage: **canonical, incompletely adopted** — factory exists, 3 of 7 sites unfolded (TESTS-P3-6)
Setup-shim traps: **none**
Determinism (clock/entropy injected): **yes**

**Verdict: APPROVE with comments**

No BLOCKER, no HIGH. Both round-1 HIGHs are closed with mutation evidence and the long-press fix
went beyond what I asked for (third hook found and deleted; my own suggested fix shape correctly
refuted with evidence). The two new MEDIUMs are the same file and cost roughly four lines between
them — restore the deleted keyboard arm, and give one existing click `{ detail: 1 }`. TESTS-P3-6's
PARTIAL is a ledger-accuracy problem more than a coverage one: fold the three remaining literals or
stop describing them as drift-proof.

### If a further round runs, this lane re-verifies

| Item | Check |
|---|---|
| TESTS-P3-9 | delete `if (e.detail === 0) return` → the restored arm must go red |
| TESTS-P3-10 | delete `swallowNextClick.current = false` from `onPointerDown` → `CasesScreen.row-actions.test.tsx:132` must go red |
| TESTS-P3-6 | re-count full hand-rolled `DemoCase` literals (currently 3) and re-read §57h's claim |
| Regression sweep | re-diff `it(` additions/removals; re-run the six a11y/timer probes |
