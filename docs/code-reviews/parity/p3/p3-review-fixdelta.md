# Parity P3 — vetted fix-delta review (PR #32, round 2)

**PR:** #32 — *Parity P3 — case & location management (CRUD, actions sheet, edit mode, GPS everywhere)*
**Round-1 head:** `4e60680` · **Fix-round head:** `3cecfcc` · **Fix range:** `b678a8d..3cecfcc`
(15 fix commits `ec20686`…`3511527` + ledger `3cecfcc`)
**Round-1 vetted doc:** `p3-review.md` (approve-with-fixes: 0 B / 3 M / 14 m)
**Aggregator:** Fable (Claude Fable 5), settling the five resumed Opus lanes' delta passes
(`lane-typescript.md`, `lane-web.md`, `lane-tests.md`, `lane-silent-failures.md`, `lane-type-design.md`,
all overwritten in place).
**Suite at head:** 189 files / 1906 tests green (round 1: 1891; net +15), `tsc --noEmit` clean —
independently re-run by two lanes. Isolation wall re-grepped clean; fix range touches
`features/demo/**` + `deferred.md` only.

## Verdict: **APPROVE — merge-ready. Nothing gates.**

All three round-1 MAJORs are FIXED with mutation evidence. Prior-finding disposition across the
17 vetted findings: **16 FIXED · 1 PARTIAL (R-15)**, with every Appendix-A carry honoured. New this
round: **0 BLOCKER · 0 MAJOR · 4 MINOR · 2 NIT** — all four MINORs are integrator-owned,
three of them in the long-press family's test surface, and none is a shipped user-facing defect.
They can land as a small follow-up commit on this branch or ride into the next phase; neither path
blocks the merge.

| Severity (new, round 2) | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 4 (R-18…R-21) |
| NIT (appendix, unscored) | 2 (TD-N1, TD-N2) |

---

## Prior findings — final status

Evidence column names the strongest verification: lane mutation probes (13 run by the tests lane,
all reverted; tree clean), web-lane component probes, and the aggregator's own at-source reads this
round (Appendix C).

| ID | R1 sev | Status | Fix commit | Evidence |
|---|---|---|---|---|
| R-1 long-press family (3 hooks, touch double-fire, armed latch) | MAJOR | **FIXED — exceeded** | `ec20686` | Probe A: pre-fix `onContextMenu` restored → 3 arms red across hook + CasesScreen call site + Dashboard. Probe B: reset-after-guard restored → mouse-latch arm red. Third hook + duplicate `LONG_PRESS_MS` deleted (aggregator confirmed: one definition repo-wide). Fix-shape refutation §57a **upheld** — see Refutations. WEB-8 rider fixed via `LONG_PRESS_SURFACE_STYLE`. |
| R-2 new-address GPS wire unpinned | MAJOR | **FIXED** | `c0e48e4` | Probe E: the round-1 mutation (`gps: undefined`) — green at 1891/1891 in round 1, now reds exactly the new end-to-end arm. §57d concedes "an argument from similarity is not a pin". Rider: `NEW_ADDRESS_FAILED_NOTICE` copy now names its only reachable cause. |
| R-3 hard `disabled` on the duplicate chooser | MAJOR | **FIXED — exceeded** | `3dee080` | `aria-disabled` + `aria-describedby` + caller-side guard; the private re-derivation of the name rules **retired** in favour of `newLocationBlock({ requireAddress: false })`; `NAME_TAKEN_ERROR` re-exported from the shared messages so copy cannot drift; blank name now reports "required". Old `toBeDisabled` pin migrated; the commit-path guard is under test for the first time (§57c). |
| R-4 incident writer's unknown-id guard + lying doc/test | MINOR | **FIXED** | `76abf1c` | Guard shipped verbatim (`create-store.ts:506-516`); test strengthened to the whole-state pin, Probe G red without the guard. Declined known-id deep comparison — correct per the round-1 disposition, endorsed by three lanes. |
| R-5 `IncidentLocationPatch` optional coordinate key | MINOR | **FIXED** | `76abf1c` | Required-but-nullable, exactly the proposed shape, derivation from `DemoCase` preserved; TD verified the sole producer unchanged. |
| R-6 `setCameraGps` guard unpinned | MINOR | **FIXED** | `66fc066` | Both arms carry the house identity pin; Probe F (guard clause deleted) → 2 red, was 31/31 green. |
| R-7 map plots the (0,0) the sheet/PDF suppress | MINOR | **FIXED** | `113c5a3` | Both gates on `hasCapturedCoordinates`; Probe H → 2 red; the location arm also pins the status **tally** (a consequence round 1 missed). §49g's trigger discharged (§57e). |
| R-8 notice inherits predecessor's timer | MINOR | **FIXED** | `6616716` | `[durationMs, message]`; dwell arm probe-verified red on revert; no same-message restart regression. |
| R-9 notice not a live region | MINOR | **FIXED** | `6616716` | `role="status"` on the banner; arm red when stripped. Composes with R-8 (restart + re-announce). |
| R-10 delete dialog focus-return no-op | MINOR | **FIXED** | `56c0b63` | Third shape (focus the ⋯ trigger before tray handoff) — both review-proposed shapes declined with sound §57f reasoning; web probe: focus after Cancel is the trigger, not `<body>`; delete path degrades correctly. |
| R-11 New Case sheet's dual mode discriminator | MINOR | **FIXED** | `3c77199` | One `editingCase` derivation, both halves read it; TS lane re-traced the fallback end-to-end — the create branch now genuinely creates (the number is free again). Pinned in one arm covering render mode + submit branch together. |
| R-12 incident editor close paths don't clear seed | MINOR | **FIXED** | `3c77199` | `closeIncidentModal()` mirrors `closeCaseModal`, serves Save + Cancel. |
| R-13 `incidentCoordinateSource: string` | MINOR | **FIXED — exceeded** | `0618c7d` | Field narrowed **and** the `onChange` prop made generic per key — §57g's diagnosis (the field alone would have caught nothing) probe-verified by TD in both directions (`TS2578` under the old signature). Residual → TD-N1 (NIT). |
| R-14 `onEditIncident` optional + unconditional CTA | MINOR | **FIXED** | `38bf301` | Prop required; `tsc` flushed four unwired test renders. |
| R-15 `DemoCase` fixture factory | MINOR | **PARTIAL** | `3511527` | Factory built, 4 of 7 sites folded. Residual **adjudicated** below → R-21. |
| R-16 `CoordinateField` errors unassociated | MINOR | **FIXED** | `c4dce78` | `useId` + `aria-describedby` + `role="alert"`; both halves probe-red when stripped. `NewCaseModal`'s private twin correctly booked to §53d's fold (§57h), matching the round-1 framing. |
| R-17 test hygiene trio | MINOR | **FIXED** | `683735e` | All three items landed. |

**Appendix-A carries from round 1 — all honoured:** WEB-7 addressed as documented-deliberate
(call-site comment + §57i, the exact disposition suggested). TESTS-P3-7 deferred-accepted (§57h;
the lane confirms the rationale). TYPE-DESIGN-4…7 carried untouched with triggers (§57h) — TD
re-verified each site in the delta, and TD-4 gained a recorded live consequence (the failure-notice
copy had to collapse to one cause because the store collapses three).

---

## New findings (round 2)

| ID | Sev | Title | Owner | Source |
|---|---|---|---|---|
| R-18 | MINOR | R-1 deleted the only pin on the keyboard-activation exemption; the suite's docs still claim the guarantee | integrator | TESTS-P3-9 (lane MEDIUM, normalized) |
| R-19 | MINOR | The off-row-hold swallow-reset test is vacuous — its bare `fireEvent.click` rides the keyboard exemption, so the `2b18a0a` reset is unpinned | integrator | TESTS-P3-10 (lane MEDIUM, normalized) |
| R-20 | MINOR | The `fired` latch survives a `contextmenu` with no preceding pointerdown — keyboard menu key / Shift+F10 after a mouse hold is swallowed once on Cases rows | integrator | NEW-WEB-1 (MINOR) |
| R-21 | MINOR | R-15's residual: three hand-rolled `DemoCase` literals remain and §57h's "drift-proof" claim is false for all three; the trigger as written can never fire for them | integrator | TESTS-P3-6 PARTIAL (adjudicated) |

### R-18 [MINOR] — the deleted keyboard pin

**Files:** `features/demo/ui/primitives/useLongPress.ts:188` (production, correct);
`features/demo/ui/primitives/__tests__/useLongPress.test.tsx` (pin absent).

**Aggregator verification (at source):** the exemption `if (e.detail === 0) return` exists and is
load-bearing — a hold released off the row leaves `swallowNextClick` armed (`clear()` at `:127-133`
touches only timer/origin), and a keyboard Enter's synthesised click carries `detail 0`; without the
line it would be `preventDefault`ed on the surface carrying Delete/Duplicate. The test file's arm
inventory (13 `it()` blocks) contains **no** arm exercising `detail: 0`, and a repo-wide grep for
`detail: 0` across `features/demo` returns **nothing** — the lane's full-suite probe (line deleted →
1906/1906 green) is consistent with an exhaustive absence, not just a gap in one suite. Meanwhile the
file header (`:9`) still claims "keyboard activation is [never swallowed]" and the `click` helper's
doc (`:48`) still explains the semantics — documentation of a pin that no longer exists. §56f had
explicitly recorded this exemption as a known wrong-reason trap; R-1's hunk replaced the arm instead
of adding beside it (the one genuine test deletion in the delta).

**Normalization (lane MEDIUM → MINOR):** production behaviour is correct; the deliverable is a
three-line test arm (the `click(0)` helper is already in the file, currently unused). Same criteria
as round-1 R-6 (correct code, missing pin = MINOR). Noted as a fix-round regression in the *test*
surface, which is why it should land now rather than ride.

**Fix:** restore the arm — hold → `advanceTimersByTime(LONG_PRESS_MS)` → `click(0)` →
`expect(onClick).toHaveBeenCalledOnce()`.

### R-19 [MINOR] — the vacuous swallow-reset pin

**Files:** `features/demo/ui/primitives/useLongPress.ts:148` (the `2b18a0a` reset, correct);
`features/demo/ui/screens/__tests__/CasesScreen.row-actions.test.tsx:168-183` (the vacuous pin).

**Aggregator verification (at source):** the test's final action (`:181`) is a bare
`fireEvent.click(row)` — jsdom default `detail: 0` — so `onClickCapture` consumes the flag and
returns at the keyboard exemption (`:188`) before any swallow could happen. Walked both mutations:
with the `:148` reset deleted, the armed flag from the abandoned hold is consumed by the exempted
click and the row's `onClick` still runs — the test passes either way. `2b18a0a`'s
"probe-verified red" was true on the P3.1 branch, before the §56f assembly merged the `detail` check
in; the assembly silently made it vacuous. Pre-existing (not fix-introduced), but R-1 rewrote this
exact function without catching it, and it compounds with R-18: both halves of the click-swallow
discipline are currently unpinned, and each is what makes the other's test read correctly.

**Normalization (lane MEDIUM → MINOR):** production correct; the fix is one character of intent —
`fireEvent.click(row, { detail: 1 })` (the same correction §56f applied to the swallow test for the
same reason). With R-18's arm restored, the two rules become independently pinned.

### R-20 [MINOR] — the latch vs. a pointerless `contextmenu`

**File:** `features/demo/ui/primitives/useLongPress.ts:149, 158, 179-182`.

**Aggregator verification (at source):** the timer body sets `fired.current = true` unconditionally
(`:158`) — regardless of pointer type — and the only reset is at the top of `onPointerDown`
(`:149`). R-1's mechanism (reset-first-guard-second) covers every `contextmenu` *preceded by a
pointerdown*; the keyboard context-menu key (Shift+F10) fires `contextmenu` on the focused element
with no pointer event at all. The Cases gesture surface is now a real `<button>` (R-1's own
improvement made it focusable), so: completed mouse hold → `fired` stays set (trailing click consumes
only `swallowNextClick`) → Shift+F10 → consumed at `:179-181`, browser menu already suppressed by
`:177`. Web lane probe-confirmed against the real `CasesScreen`. Self-clearing (the swallow resets
the latch; the second press works), mixed-modality only, Cases rows only, dashboard card unaffected
(non-focusable `<div>`). A residual of the fix's chosen mechanism narrowing round-1 WEB-2, not a
regression re-opening it.

**Fix (web lane's, endorsed):** set the latch only when it can be needed — capture `pointerType` at
pointerdown and make the timer body set `fired.current = (pointerType === 'touch')`; a mouse hold
raises no trailing `contextmenu`, so it never needs the latch. One arm to pin: mouse hold → bare
`contextMenu` (no pointerdown) still fires. Removes the residual class instead of adding a second
clearing path.

### R-21 [MINOR] — R-15's residual, adjudicated

**Files:** `features/demo/ui/screens/__tests__/caseFormData.test.ts:16-35`,
`features/demo/engine/logic/__tests__/incident-location.test.ts:10-30`,
`features/demo/engine/logic/__tests__/final-submission.test.ts:29-55` ·
ledger `docs/code-reviews/deferred.md` §57h ("The remaining `DemoCase` fixture sites") ·
commit `3511527`.

**Aggregator verification (at source):** all three surviving sites read directly — each is a full
hand-rolled entity literal (`demoCase`/`makeCase` at 15 fields; `final-submission.test.ts` carries a
hand-rolled `demoLocation` as well). **None builds through the store.** §57h's claim — *"folded the
four suites carrying hand-rolled literals; sites that build cases through the store are already
drift-proof and were left alone"* — is therefore false in both halves: hand-rolled-literal suites
were not all folded, and the survivors are not store-built. The trigger — *"the next `DemoCase`
field add — update the factory first, then fold whatever still fails"* — is self-defeating exactly
as the tests lane argues: the entity's growth direction is optional fields, an added optional field
makes no stale literal *fail*, so "whatever still fails" is the empty set. `final-submission.test.ts`
already demonstrates the drift shape live: its literal omits the optional `incidentCoordinates` and
type-checks.

**Adjudication (the judged item).** The orchestrator asked whether the fix may be a docs-correction +
trigger rewrite rather than folding the three. Ruling: **fold the three** — each is the same
one-line-per-suite delegation (`demoCase({ …suite-relevant overrides })`) as the four already folded,
the total cost is smaller than writing an accurate exception paragraph, and folding ends the drift
class instead of documenting it. A docs-only correction is acceptable **only** as a fallback, and
only if §57h names the three files explicitly — a named-site list is auditable; "whatever still
fails" is not, for the optional-field reason above. In either case the §57h sentence must be
corrected: a ledger entry that describes outstanding work as already-safe is worse than no entry —
it actively prevents the work from ever being picked up. The commit body of `3511527` carries the
same false sentence; the ledger correction should note it.

**Normalization:** MINOR, consistent with round-1 R-15. The parallel to R-2's refuted §56h closure
was weighed: R-2 was MAJOR because the unpinned *production wire* carried a forensic payload with a
two-bug history; R-21's substance is fixture-drift risk plus ledger accuracy, the same risk class
round 1 rated MINOR. The falsity is fresh (this round's own ledger), which is why it is filed rather
than deferred.

---

## Refutations and acceptances — the record

| Item | Disposition |
|---|---|
| **§57a — R-1's vetted fix shape refuted.** The round-1 vetted doc (and the web/TS lanes it settled) instructed lifting `e.target.closest('button')` verbatim into the shared hook. The integrator refuted it with layout evidence: the Cases handlers rode a wrapper `<div>` whose every descendant is a `<button>`, so the verbatim lift would have bailed on 100% of holds and killed the gesture. | **Refutation upheld by the aggregator.** Two lanes verified it against the pre-fix source independently (web, typescript); tests, web, and type-design explicitly accepted it against their own round-1 instruction; SF concurs. The round-1 vetted doc owned the flawed instruction — recorded here. The shipped substitute (`closest(NESTED_CONTROL_SELECTOR) !== e.currentTarget`, plus moving handlers onto the element that *is* the surface) is verified stronger, and incidentally fixed the ⋯-trigger double-toggle wart nobody had filed. |
| **§57f — both R-10 proposed fix shapes declined.** Keeping the tray mounted would drop §48a's ported handoff behaviour; threading `returnFocusTo` to the bridge would cross callback-isolation for chrome state. | **Accepted** (web lane, endorsed here). The delivered third shape — focus the ⋯ trigger before the tray unmounts — is probe-verified and anchors to the affordance that led there. |
| **R-4's declined known-id no-change comparison.** | **Already the round-1 disposition** (Appendix A "dropped as not-owed"); the fix round independently re-derived it, three lanes endorse. Closed. |
| **§57i — WEB-7's omission recorded as deliberate at the call site.** | The exact disposition round 1 suggested. Closed. |
| **§57h — TESTS-P3-7 deferral.** | Accepted by the filing lane. Closed. (The *other* §57h entry — the fixture claim — is R-21.) |
| **TS lane round-1 self-correction, recorded:** its §56d audit covered the three `ModalActions` callers but not `DuplicateLocationModal`'s private `ActionButton` (WEB-3's find). | Recorded in the lane file; noted here for the round's honesty ledger. SF likewise records walking past the touch double-fire; web records missing the R-8 dwell defect. The cross-lane fan-out worked as designed — every miss was another lane's catch. |

---

## Appendix A — carried NITs, demotions, and unfiled observations

| Item | Disposition |
|---|---|
| **TD-N1 (NIT)** — `NewCaseModal.tsx:184`'s `change` wrapper and the bridge's `onChange` (`DemoExperience.tsx:1636`) still erase R-13's per-key typing (constraint-instantiation makes them assignable). TD probe-verified the wrapper accepts the provenance typo. | **Carried as NIT**, unscored — no current call site reaches it (the three provenance writes call the generic prop directly). Flagged as the one NIT worth taking opportunistically: one line each, and it stops R-13 from being re-openable by an edit that type-checks, in the same file the fix hardened. |
| **TD-N2 (NIT)** — `LONG_PRESS_SURFACE_STYLE: CSSProperties` is the sole exported style token not `as const satisfies CSSProperties`; currently mutable shared data spread into three call sites. | **Carried as NIT.** One-line change; the export-as-token decision itself is right and well-argued. |
| **SF, recorded-not-filed** — `onContextMenu` does not arm `swallowNextClick`, so a hypothetical contextmenu-before-timer browser that still dispatched a trailing click would let that click through. | **Kept unfiled** — no constructible browser sequence reaches it; both original hooks carried the same written-down assumption. One-line belt-and-braces available if R-20's owner is in the file anyway. |
| **Web observation** — after `Duplicate…`, focus rests on the ⋯ trigger behind the chooser's scrim (`ModalShell` takes no focus). | **Not filed** — strictly better than round 1 (`<body>`), and owned by `deferred.md §7`'s still-open ModalShell focus-trap scope. |
| **Severity normalizations this round** — TESTS-P3-9 and TESTS-P3-10 filed as MEDIUM, settled MINOR. | Justified inline at R-18/R-19: correct production code, missing/vacuous pins, three-line and one-character fixes; consistent with round-1 criteria (R-6 precedent). No promotions this round. |

## Appendix B — lane inventory (round 2)

| Lane | R1 verdict → R2 verdict | Prior findings | New |
|---|---|---|---|
| typescript | approve-w/-comments → **APPROVE** | 5/5 FIXED | 0 (round-1 self-correction recorded) |
| web | revise → **APPROVE** | 8/8 FIXED (incl. WEB-7 as documented-deliberate, WEB-8 via rider) | 1 MINOR → R-20 |
| tests | revise → **APPROVE w/ comments** | 6 FIXED · 1 PARTIAL (→ R-21) · 1 DEFERRED-accepted | 2 MEDIUM → R-18, R-19 (normalized MINOR) |
| silent-failures | approve → **APPROVE** | 4/4 FIXED + demoted observation fixed anyway | 0 |
| type-design | approve-w/-comments → **APPROVE** | 3/3 FIXED + routed obs FIXED + 4 NITs carried | 2 NIT (Appendix A) |

13 tests-lane mutation probes + 10 web-lane component/regression probes + 2 TD compile probes this
round, all reported reverted; both lanes state the tree clean at sign-off.

## Appendix C — aggregator verification log (round 2)

Checked in this worktree at `3cecfcc`, beyond the lane reports:

- **Fix range confirmed:** `git log --merges`/`--oneline b678a8d..3cecfcc` — 15 fix commits + ledger,
  R-numbers in every subject; worktree clean apart from the review docs.
- **R-18:** `useLongPress.ts:188` read in the shipped hook; the test file's 13-arm inventory read
  (no `detail: 0` arm); header claim at `:9` and helper doc at `:48` confirmed still present;
  repo-wide `grep "detail: 0"` over `features/demo` → zero hits (the lane's full-suite probe result
  is thereby explained structurally, not just trusted).
- **R-19:** `CasesScreen.row-actions.test.tsx:168-183` read — final click is bare (`:181`); both
  mutation directions walked against the shipped `onClickCapture` (`:185-191`): the detail-0
  exemption rescues the test with the `:148` reset deleted.
- **R-20:** shipped hook read in full — `fired` set unconditionally at `:158`, reset only at `:149`
  (`onPointerDown`), consumed at `:179-181` after the unconditional `preventDefault` at `:177`;
  the pointerless-`contextmenu` path has no clearing step. Web's proposed pointerType fix checked
  against the code shape — sound.
- **R-21:** all three surviving fixture sites read in full (15-field literals, plus the
  `demoLocation` literal in `final-submission.test.ts`; that file's literal omits optional
  `incidentCoordinates` — the drift shape, live); §57h's exact sentence read at
  `deferred.md:2356-2358`.
- **R-1 shipped shape (spot-check of the round's largest fix):** `useLongPress.ts` read in full —
  reset-first-guard-second at `:143-153`, both latches, `isNestedControl` comparing against
  `currentTarget` at `:196-200`, one hook and one `LONG_PRESS_MS` repo-wide.
- **Not independently re-run:** the lanes' 25 probes (each lane's own resumed-reviewer duty;
  spot-consistent with everything read here — the tests lane's round-1 probe claim was re-run by
  this aggregator in round 1 and held exactly), and the full-suite/tsc gates (independently reported
  identical by two lanes).

---

**Final disposition:** APPROVE. Round-1's three gates are closed with evidence; the fix round beat
the review in three places (R-3's gate unification, R-8's dwell defect, R-1's third-hook discovery)
and was itself caught short in four small, cheap places (R-18…R-21) — recommended as one follow-up
commit (R-18/R-19/R-20 are one file plus one test file; R-21 is three one-line folds + a ledger
sentence) either before merge or immediately after, at the owner's discretion. Nothing gates.
