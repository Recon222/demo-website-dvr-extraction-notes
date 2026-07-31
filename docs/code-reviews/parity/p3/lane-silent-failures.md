# P3 review — SILENT-FAILURES lane · FIX-DELTA

**Branch:** `feat/parity-p3` @ `3cecfcc` · **Fix round:** `b678a8d..HEAD` (15 commits, R-1…R-17)
**Initial pass was against:** `4e60680` · **Lane definition:** `.claude/agents/silent-failure-hunter.md`
**Ledger:** deferred `§57` (fix-round judgement calls) + `§57h` (what stays deferred, with triggers)

## Verdict: APPROVE — all four prior findings FIXED, 0 new, 0 fix-introduced regressions

| # | Finding (initial pass) | Status | Fixed by |
|---|---|---|---|
| 1 | **[MEDIUM]** `updateIncidentLocation` has no unknown-id guard, contradicting its own JSDoc | **FIXED** | `76abf1c` (R-4) |
| 2 | **[LOW]** A second notice inside 2.6 s inherits the first one's timer | **FIXED** | `6616716` (R-8, + R-9 rider) |
| 3 | **[LOW]** `§49g`'s `hasCapturedCoordinates` map audit fired on P3.7 but `toMapData` was not gated | **FIXED** | `113c5a3` (R-7) |
| 4 | **[LOW]** `MapScreen.onEditIncident` optional but its CTA renders unconditionally | **FIXED** | `38bf301` (R-14) |
| — | *(demoted observation, not filed)* `NEW_ADDRESS_FAILED_NOTICE` names two unreachable causes | **FIXED anyway** | `c0e48e4` rider (R-2) |

Per the aggregator's disposition, the **no-change-Save subscriber wake** was dropped as not-owed
(`updateCase` has the identical property and no sibling does deep no-change comparison). Not re-filed —
and I agree with the reasoning: adding it to one writer alone would be a new divergence, not a fix.

| Severity | Prior | New | Open |
|---|---|---|---|
| CRITICAL | 0 | 0 | 0 |
| HIGH | 0 | 0 | 0 |
| MEDIUM | 1 | 0 | **0** |
| LOW | 3 | 0 | **0** |

---

## Verification, finding by finding

### 1 — [MEDIUM] incident writer's unknown-id guard · **FIXED** (`76abf1c`)

**Fix as landed** (`features/demo/engine/store/create-store.ts:506-516`):
```ts
updateIncidentLocation: (caseId, patch) => {
  if (!get().cases.some((c) => c.id === caseId)) return
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) }))
},
```
Exactly P3.1's line, in the position I named, with the `§56b` reasoning recorded at the guard.

**Test upgraded, which is the half that mattered** —
`features/demo/engine/logic/__tests__/incident-location.test.ts:150-157` now takes the whole-state
pin (`const before = store.getState(); …; expect(store.getState()).toBe(before)`), replacing the
value-level assertion that the writer satisfied unconditionally. That was my stated evidence for why
the defect survived P3.6's suite; the commit records mutation-verification (removing the guard reddens
it). The pre-existing `:155` arm that asserts a NEW `cases` array for a *known* id is correctly left
alone — the two arms now pin both directions.

**Both arms of the finding are closed.** Arm 1 (a fresh `cases` array + state object for a write that
matched nothing) can no longer happen. Arm 2 (a save against a vanished case reported as success) is
now a true no-op at the store, and `R-12` additionally gave the editor one close path
(`closeIncidentModal`, `DemoExperience.tsx:851-861`) that clears `incidentCaseId`/`incidentForm` — so
the seed can no longer outlive the modal either. The caller still closes unconditionally with no
notice on that path; that is correct given it is unreachable twice over (the modal scrim covers the
tab bar, and the id is seeded from a case just found), and the store no longer lies about it.

**Bonus fix in the same family, not filed by me but worth recording:** `R-11` (`3c77199`) found the
New Case sheet deriving its mode *twice* — the render arm from `cases.find(caseEditId)` with the
create-mode fallback, `submitCase` from a bare `caseEditId !== null`. On disagreement the sheet
presented "Create Case", ran the create confirmation, then took the EDIT branch into `updateCase`'s
guarded no-op: **the visitor confirms a creation and nothing is created, silently.** That is a
textbook fake-success and it sits directly beside the `§50g` fallback my pass cleared as
"handled" — I checked the render arm and did not check that `submitCase` re-derived it. Now one
`editingCase` derivation governs both (`DemoExperience.tsx:801-813, 1637-1643`), pinned end to end.
Credit where due; noting the miss so the next pass checks both halves of a fallback, not one.

### 2 — [LOW] notice timer · **FIXED** (`6616716`)

`features/demo/ui/screens/map/DemoNotification.tsx:53` — `}, [durationMs, message])`. A message swap
now restarts the dwell, so the export/failure banners get their full 2600 ms rather than inheriting
~200 ms of a predecessor's window. Same-message re-renders still do not restart (deps compare by
value), so there is no never-dismisses regression. Arm at
`map/__tests__/DemoNotification.test.tsx`.

**R-9 closed an arm of the same finding I missed.** The banner was a plain `<div>`. For Export ZIP,
Export GeoJSON, the location-not-found arm and both failure arms this banner is the *entire* outcome
(`§52.2`'s honest answer in place of a fake download) — so a screen-reader visitor got a closed
dialog, focus on `<body>`, and silence: the truth told to sighted visitors only. `role="status"` is
now on it (`:56`). My pass verified the banner *paints* over an open modal and stopped there; "is it
announced" is the same question one sense over, and I should have asked it. The two fixes compose —
a message change restarts the timer *and* re-announces.

### 3 — [LOW] `toMapData` plotting gate · **FIXED** (`113c5a3`)

`features/demo/ui/screens/map/mapData.ts:79-97` — both call sites gated:
`hasCapturedCoordinates(ic)` for the incident, `locations.filter((l) => hasCapturedCoordinates(l.gps))`
for the pins. The case sheet, the PDF camera row, the notes formatter and the map now read one policy,
so a single stored pair no longer has two behaviours. `statusCounts` derives from `pins`, so an
ungated (0,0) can no longer inflate the tally either — an arm I had not thought through and the fix
did. Arms in `map/__tests__/mapData.test.ts`.

`§49g`'s trigger is discharged in `§57e`, which also keeps my severity framing honest: the demo has no
zero-init artifact, so this is consistency between consumers rather than a fabricated position.

### 4 — [LOW] `MapScreen.onEditIncident` · **FIXED** (`38bf301`)

`features/demo/ui/screens/map/MapScreen.tsx:26-38` — the prop is now required and forwarded directly
(`onEditIncident={onEditIncident}`, `:113`), so a handler-less mount is a compile error rather than a
full-size primary CTA that swallows every press. The two optional neighbours (`onChangeCase`,
`onGoToLocation`) are correctly left alone — they gate their own affordances; this one's CTA did not.
`tsc` surfaced four unwired test renders, which is the change doing its job.

---

## Sweep of the fix round's new arms

**The abandoned-gesture paths (`R-1`, `ec20686`) — clean, and it fixed a real silent failure I
missed.** The consolidated `ui/primitives/useLongPress.ts` now resets **both** latches at the top of
every `pointerdown` before the button/nested-control guards (`:143-161`). Two genuine defects fell out
that my pass did not find:
- the shared hook **double-fired on touch** — `onContextMenu` ran `clear(); cb()` unconditionally, and
  `clear()` is a no-op once the timer has nulled itself, so both Cases consumers (whose callback is a
  toggle) read as open-then-close: *a hold on the row carrying Delete and Duplicate… appeared to do
  nothing.* That is a silent failure in my lane and I walked past it;
- the dashboard's private copy reset `firedRef` *after* the `e.button !== 0` return, so a mouse hold
  left the latch standing and swallowed the next genuine right-click.

I re-traced the merged hook against both platform sequences and it is correct: touch hold →
timer fires once, the trailing `contextmenu` is consumed by `fired`, the trailing click by
`swallowNextClick`; mouse hold → no `contextmenu`, and the *right-click's own* `pointerdown` clears
`fired` because the reset precedes the button guard. `pointerdown` precedes `contextmenu` on every
engine, so that ordering holds. Both sequences are pinned
(`primitives/__tests__/useLongPress.test.tsx:170-206`), mutation-verified per the commit.

The call-site move (handlers from the wrapper strip onto the row/header `<button>`) keeps the
capture-phase swallow effective — `onClickCapture` still runs before the button's own bubble-phase
`onClick`, and `stopPropagation` in capture kills React's bubble dispatch — while leaving the ⋯
trigger outside the gesture. `isNestedControl` reads `e.currentTarget` synchronously, so the synthetic
event is still valid. `§57a`'s refutation of the review's "lift `closest('button')` verbatim"
instruction is correct: that would have bailed on every Cases hold.

**The gate-module routing's error surfaces (`R-3`, `3dee080`) — strictly more honest than before.**
`DuplicateLocationModal` now derives from the shared `newLocationBlock({ …, requireAddress: false })`
(`:135`), renders the reason in an unconditionally-mounted `role="status"` region (`:165-171`), points
both dimmed actions at it via `aria-describedby`, and enforces in the caller (`:139-142`). The
`addressRequired` arm is unreachable with `requireAddress: false`, and the module's ordering rule
comes along, so a blank name reports "required" and never "duplicate". This closes a silent arm my
pass cleared too generously: under the old hard `disabled`, a **blank** name produced *no message at
all* and simply removed two primary actions from the tab order. `NAME_TAKEN_ERROR` is now a re-export
of the module's string, so the two surfaces cannot drift on copy.

**`NEW_ADDRESS_FAILED_NOTICE` rider (`c0e48e4`) — correct and correctly scoped.** New copy:
`"Failed to Create Location — the source location couldn't be read."` — the one cause that can
actually reach it, since the card's own `newLocationBlock` gate holds blank-name and blank-street
upstream. The old sentence would have told a visitor to fix a form that was already valid. The
three-refusals-one-`null` shape is recorded on the constant with a pointer to type-design's carried
NIT, so the copy can split back into three sentences if the store ever returns a discriminated result.
The same commit also wrote the end-to-end arm for the `gps: locForm.coordinates` wire whose severing
had left all 1891 tests green — `§57d` records the reusable lesson (an argument from similarity is not
a pin), which is the right generalisation.

**Other new arms, checked and clean:**
- `R-16` (`c4dce78`) — `IncidentLocationFields`' `CoordinateField` error is now `role="alert"` + an id
  the input's `aria-describedby` points at. `role="alert"` is the right mode here (blur-raised, not
  per-keystroke), matching `§56e`'s distinction.
- `R-10` (`56c0b63`) — focus moves to the row's own ⋯ trigger *before* the tray hands off, so
  `DeleteConfirmationModal`'s `opener.isConnected` restore finds a live element instead of `<body>`.
  `triggerRef.current?.focus()` degrades to a no-op if the ref is ever null, which loses focus
  restoration but claims nothing false. `§57f` explains why neither shape the review proposed was
  taken; the reasoning holds (keeping the tray mounted would drop `§48a`'s ported
  tray-closes-on-handoff).
- `R-12` (`3c77199`) — `closeIncidentModal` clears the seed on both Save and Cancel, the `§56j`
  hardening applied to the sibling it missed.
- `R-13` (`0618c7d`) — `NewCaseFields.incidentCoordinateSource` narrowed to `IncidentCoordSource | ''`
  **and** the setter made generic per key. `§57g`'s note is the load-bearing part: narrowing the field
  alone would have caught nothing, because `onChange(field: keyof NewCaseFields, value: string)`
  accepted any string for any key — a typo would have become a silent provenance mislabel on a field
  that is persisted and printed into the court document.

**Fix-introduced regressions: none found.** Specifically re-checked: the `R-4` guard cannot refuse a
legitimate write; `R-7`'s gates do not drop any coordinate the demo can actually produce (and the
sheet/pin/tally now move together); `R-8`'s dep addition cannot strand a notice; `R-1`'s call-site
move preserves the swallow's subtree reach and leaves the ⋯ trigger ungated; `R-3`'s
`aria-disabled` swap keeps enforcement at the caller per `§56d`.

---

## Recorded, not filed

**`onContextMenu` does not arm `swallowNextClick`.** If a browser were to dispatch `contextmenu`
*before* the 500 ms timer and still dispatch a trailing `click`, the hold would open the tray and the
click would then reach the row's own handler — opening the wizard on the row the operator was
reaching the tray on, which is precisely what the swallow exists to prevent. The hook takes the
contextmenu-first path correctly in every other respect (`clear()` cancels the pending timer, `cb()`
runs exactly once), and both original hooks carried the same assumption with the reasoning written
down ("a context-menu gesture produces no follow-up click to eat"). I cannot construct a browser
sequence that reaches it — long-press-driven `contextmenu` on touch consumes the tap — so under the
lane's pre-report gate this is demoted rather than filed. If `R-1`'s owner wants belt-and-braces it is
one line (`swallowNextClick.current = true` in the `fired`-false branch of `onContextMenu`).

**`§57h`'s incident-fold leftover is the right call.** `NewCaseModal`'s private `CoordinateField`
still lacks `R-16`'s association/announcement, so a screen-reader visitor typing a malformed incident
latitude there gets `aria-invalid` and no reason — and `toIncidentCoordinates` then drops the pair on
Save. That is a real silent-ish arm, but it is pre-existing on master, deliberately not fixed twice
(the twin is slated for deletion by `§53d`'s full fold), and now carries a named trigger ("the next
package to touch `NewCaseModal`'s incident section — and this time the fold, not another type patch").
Fixing the twin would make the duplication harder to see, not easier. Agreed; flagging it here only so
the trigger has a second witness.

---

## Silent Failure Hunter Summary (post-fix)

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

Fallback honesty (every substitution announced): **yes** — and improved: the chooser's blocked state
now states its reason instead of removing two actions from the tab order, and every honest notice is
both fully dwelt and announced.
Failure-cause distinctions preserved: **yes** — `NEW_ADDRESS_FAILED_NOTICE` now names its only
reachable cause; the collapsed-three-into-one shape is recorded at the constant with its un-defer path.
Partial results flagged (not silently short): **n/a** — no new partial-result path.
Async cancellation / stale-write safety: **yes** — unchanged by the fix round and re-verified.
Operator breadcrumbs intact: **yes** — none removed across either pass; one added (`CameraGpsCapture`).

**Verdict: APPROVE.** Every finding this lane filed is fixed with evidence; the fix round additionally
closed two silent failures my initial pass walked past (the touch-hold double-fire, and the New Case
sheet's confirm-then-create-nothing divergence).
