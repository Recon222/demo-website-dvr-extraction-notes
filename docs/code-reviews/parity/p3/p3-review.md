# Parity P3 — vetted review (PR #32)

**PR:** #32 — *Parity P3 — case & location management (CRUD, actions sheet, edit mode, GPS everywhere)*
**Head:** `4e60680` (`feat/parity-p3`) · **Diff:** `git diff master...feat/parity-p3` (91 files, +11321/−317)
**Aggregator:** Fable (Claude Fable 5), settling five Opus lanes — `lane-typescript.md`, `lane-web.md`,
`lane-tests.md`, `lane-silent-failures.md`, `lane-type-design.md` (same directory).
**Baselines honoured:** `features/demo/CLAUDE.md`, plan §4, `deferred.md` §29–§56, PR #32 body's
deliberate-choices list. Nothing on that list is re-flagged; two findings *enforce* reconciliations the
phase itself established (§56d, §56f), which is the opposite of re-flagging them.

## Verdict: **APPROVE WITH FIXES**

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 3 |
| MINOR | 14 |

Gating: the three MAJORs (R-1, R-2, R-3). All have small, well-shaped fixes; per the house workflow the
fix round gets a fix-delta re-review before merge. The 14 MINORs are one-line-to-one-arm fixes or ledger
entries; none gates individually, but R-4 through R-8 are cheap enough that the fix round should sweep
them.

### Severity normalization

Lanes wrote in CRITICAL/HIGH/MEDIUM/LOW/NIT; this document uses the house BLOCKER/MAJOR/MINOR.
Mapping applied: CRITICAL→BLOCKER, HIGH→MAJOR, MEDIUM→adjudicated per finding (justified inline),
LOW→MINOR, NIT→appendix (unscored). Every candidate MAJOR was re-verified at source by the aggregator;
the one runtime probe a settlement duty required (R-2's full-suite mutation) was re-run and confirmed
(see Appendix C).

---

## Findings table

| ID | Sev | Title | Owner | Sources (lane findings) |
|---|---|---|---|---|
| R-1 | MAJOR | Long-press shipped as three hooks, and both survivors mis-handle one input path: touch double-fire on Cases rows, armed latch eats the dashboard's next right-click | integrator | WEB-1, WEB-2, TESTS-P3-2, TYPESCRIPT-3, TYPE-DESIGN-3, SF-obs, WEB-8 (rider) |
| R-2 | MAJOR | The new-address card's GPS pass-through (`DemoExperience.tsx:774`) is unpinned — severing it leaves all 1891 tests green (aggregator re-verified) | integrator | TESTS-P3-1 |
| R-3 | MAJOR | `DuplicateLocationModal` uses the hard `disabled` attribute §56d rejected in this same phase; its empty-name arm gives no reason at all | P3.5 | WEB-3 |
| R-4 | MINOR | `updateIncidentLocation` lacks the unknown-id guard its own JSDoc claims; the test titled "no-ops on an unknown id" passes either way | P3.6 | TYPESCRIPT-2, SF-MED, TESTS-P3-4, TYPE-DESIGN routed obs |
| R-5 | MINOR | `IncidentLocationPatch.incidentCoordinates` is optional onto a spread writer — a conditional-spread producer would silently preserve a stale forensic coordinate | P3.6 | TYPE-DESIGN-2 |
| R-6 | MINOR | `setCameraGps`'s row-existence / cross-location guard has no behavioural pin — both named arms pass with the guard deleted (test gap; the guard itself is correct) | P3.7 | TESTS-P3-3 |
| R-7 | MINOR | `toMapData` is presence-gated, not `hasCapturedCoordinates`-gated — the map plots the (0,0) pair the sheet and PDF suppress; §49g's trigger fired un-discharged | P3.7 | TESTS-P3-5, SF-LOW-3 |
| R-8 | MINOR | A second notice inside 2.6 s inherits the first's remaining timer — the honest-notice banner can flash sub-perceptually | integrator | TYPESCRIPT-4, SF-LOW-1 |
| R-9 | MINOR | `DemoNotification` is not a live region, and P3 made it the sole feedback for three actions — nothing is announced to screen readers | integrator | WEB-4 |
| R-10 | MINOR | The delete dialog's documented focus-return is a no-op at its only call path — opener unmounts first, focus lands on `<body>` | P3.1 | WEB-5 |
| R-11 | MINOR | New Case sheet derives its mode from two different discriminators; the deliberate create-fallback is only half-applied (latent) | P3.3 | TYPESCRIPT-1 |
| R-12 | MINOR | The incident editor's two close paths don't clear `incidentCaseId`/`incidentForm` — the §56j hardening applied to the sibling modal, missing here | P3.6 | TYPESCRIPT-5 |
| R-13 | MINOR | `NewCaseFields.incidentCoordinateSource: string` against the `IncidentCoordSource` union this diff introduced; deferred §53d's trigger fired | P3.3 | TYPE-DESIGN-1 |
| R-14 | MINOR | `MapScreen.onEditIncident` is optional but the CTA renders unconditionally — the inverse of §49a's honesty precedent | P3.6 | SF-LOW-4 |
| R-15 | MINOR | Seven suites hand-roll full `DemoCase` literals; no entity factory exists — the phone repo's BUG-007 drift pattern arriving here (ledger entry) | orchestrator | TESTS-P3-6 |
| R-16 | MINOR | `IncidentLocationFields`' `CoordinateField` errors are unassociated and unannounced, beside the `Field` that gained exactly that treatment in this diff | P3.6 | WEB-6 |
| R-17 | MINOR | Test hygiene trio: one decorative assertion, one over-broad `±` sweep, one unreset module-level harness | P3.4 / P3.7 | TESTS-P3-8 |

---

## R-1 [MAJOR] — the long-press family: three hooks, two live defects, one unpinned divergence

**Files:** `features/demo/ui/primitives/useLongPress.ts:88-120` · `features/demo/ui/screens/DashboardScreen.tsx:23, 44-83` ·
consumers `features/demo/ui/screens/CasesScreen.tsx:50, 129, 210`
**Settles:** WEB-1 (MAJ), WEB-2 (MED), TESTS-P3-2 (HIGH), TYPESCRIPT-3 (MED), TYPE-DESIGN-3 (MINOR), the
silent-failures lane's routed observation, and WEB-8 (MINOR, folded as a rider). One defect family, one owner, one fix.

§56f's stated outcome was ONE hook. Three shipped, and the two that survive encode complementary halves of the
same platform fact — a touch hold fires the 500 ms timer AND raises the OS `contextmenu` a moment later — each
correct where the other is broken. All four claims below were **verified at source by the aggregator**:

1. **Shared hook double-fires on touch (WEB-1).** `useLongPress.ts:114-120`: `onContextMenu` runs
   `preventDefault(); clear(); cb.current()` unconditionally. `clear()` only cancels a *pending* timer; the
   timer that already fired set `timer.current = null` (`:99`), so `clear()` is a no-op and `cb.current()`
   runs a second time for the same gesture. Both Cases consumers pass the toggle
   `toggleActions = (key) => setOpenActionsKey(prev => prev === key ? null : key)` (`CasesScreen.tsx:50`),
   so on touch the two fires are open-then-close: the phone-parity hold on the surface carrying **Delete**
   and **Duplicate…** appears to do nothing. Desktop mouse is unaffected (left-release raises no
   `contextmenu`), which is why every existing test passes. The web lane additionally reproduced this with a
   vitest probe (2 fires; tray absent after the trailing `contextmenu`). The always-visible ⋯ trigger keeps
   the actions reachable — broken accelerator, not a dead end — which is what holds this at MAJOR rather
   than BLOCKER.
2. **Dashboard's private copy inverts the defect (WEB-2).** `DashboardScreen.tsx:59-81`: `firedRef` is reset
   only inside `onPointerDown`, which returns early for `e.button !== 0` (`:60`) — so a right-click's own
   pointerdown never resets it. A **mouse** hold fires the timer, sets `firedRef = true`, and no
   `contextmenu` follows to consume it. The next genuine right-click on that card hits
   `preventDefault(); clear(); if (firedRef.current) { … return }` — swallowed, and the browser menu
   suppressed too. One wasted interaction, recoverable; the web lane reproduced it.
3. **The divergence is unpinned in both directions (TESTS-P3-2).** `DashboardScreen.test.tsx:147` pins
   suppress-the-second-fire; `useLongPress.test.tsx:138` fires `contextMenu` with no prior hold, so the
   hold→contextmenu sequence never runs. The tests lane's probe: adding the latch to the shared hook leaves
   all 1891 tests green. The suite currently pins **two contradictory contracts for one gesture** and cannot
   say which is intended.
4. **Drift is structural, not hypothetical (TYPESCRIPT-3 / TYPE-DESIGN-3).** The dashboard copy re-declares
   `LONG_PRESS_MS = 500` (`:23`) while three suites import the constant from `primitives/` — changing the
   shared beat leaves the dashboard behind with every test green. The copies also disagree on movement
   tolerance, the `enabled` gate, click-swallowing, and the nested-control bail (`closest('button')`,
   pointerdown-only — so a right-click on a location pill or the card's own ⋯ button bubbles to the card and
   opens the sheet, bypassing the control's own semantics).

**Fix shape (the consolidation is the unit of work — do not patch the three sites independently):**

- ONE hook, in `ui/primitives/useLongPress.ts`. Port the latch: timer-fire sets `fired`; `onContextMenu`
  consumes-and-returns when set, else fires. Reset `fired` (and `swallowNextClick`) at the start of **every**
  pointerdown, **before** the `e.button !== 0` early return — that is what lets a mouse-hold-then-right-click
  sequence work (the right-click's own pointerdown, button 2, clears the stale latch). This is commit
  `2b18a0a`'s "reset at the start of every new gesture" rule, applied to the flag that commit didn't cover.
- Lift the nested-control bail (`e.target.closest('button')`) into the shared hook — the Cases rows need it
  too — applied on the pointerdown path (context-menu suppression stays whole-element).
- Delete `DashboardScreen`'s private hook and its local `LONG_PRESS_MS`; consume the shared one.
- Rider (WEB-8): put `userSelect: 'none'` into the hook's returned contract (or add it to the two Cases
  `{...longPress}` wrappers) so a desktop hold stops selecting row text mid-gesture.
- Pins owed: (a) `useLongPress.test.tsx` — hold → `advanceTimersByTime(LONG_PRESS_MS)` → `contextMenu`
  fires the callback ONCE, and a follow-up genuine `contextMenu` still fires; (b) the WEB-2 arm — mouse hold,
  release, then right-click opens (not swallowed); (c) `CasesScreen.row-actions.test.tsx` — tray is OPEN
  (not toggled shut) after pointerdown → 500 ms → contextMenu; (d) `DashboardScreen.test.tsx`'s existing
  ONCE arm must keep passing against the shared hook, including its nested-control exclusion arm.

**Owner:** integrator — the defect spans P3.1/P3.2/P3.5 merges and the fix lands in the assembly's own
consolidation (§56f executed to completion).

---

## R-2 [MAJOR] — the new-address GPS wire is the one unpinned link on a forensic-coordinate path, and the probe proves it

**File:** `features/demo/ui/DemoExperience.tsx:774` (`submitNewAddressLocation`, `gps: locForm.coordinates`
into `duplicateToNewAddress`) · **Settles:** TESTS-P3-1 (HIGH → MAJOR, straight vocabulary mapping).

**Aggregator re-verification (settlement duty):** mutated `gps: locForm.coordinates` → `gps: undefined` in
this worktree; `pnpm test` → **189 files / 1891 tests passed**; reverted. The lane's probe claim is exact.

Every coordinate a visitor captures (real multi-sample GPS) or picks (geocode) on the *New Location w/ Sub
Info* card can be dropped on the floor with the whole suite green, yielding a location with no coordinates,
no error, and a "Location Created" success notice. Severity is held at MAJOR because this seam has form:
§52.4 flagged it, and §56h fixed **two** type-level bugs here (a hard-coded `'geocoded'` stamp and a
`gps`-excluding override type) that were invisible precisely because the path was a no-op. §56h's closing
argument — the wire "is the same expression `submitLocation` uses and which IS pinned there" — is an argument
from similarity to a different call site, the same reasoning shape that let those two bugs live. The head
commit `4e60680` pinned the modal's **emission** and the store's **storage**; the wire between them is the
one link a real regression can now sever undetected.

**Fix:** one arm in `DemoExperience.duplicate.test.tsx`'s "New Location w/ Sub Info" describe, modelled on
`DemoExperience.coordinates.test.tsx`'s "creates the location with the captured fix stamped `gps`" (its
`withGeolocation`/`fixAt` helpers copy over): chooser → New Location w/ Sub Info → capture → street →
Create → `store.getState().locations[1].gps` equals `{ lat, lng, accuracyM, source: 'gps' }`. The tests lane
re-runs the mutation at the fix-delta; the arm must go red against it.

**Rider (from the silent-failures lane, same file territory):** `NEW_ADDRESS_FAILED_NOTICE` ("a name and
street address are required") is the wrong sentence for the only arm that can actually fire it (source-gone —
the blank-name/street arms are gated upstream). Unreachable today; fold the copy fix in if touching this file.

**Owner:** integrator — the residual is §56h's own self-declared one; the wire sits in P3.5's file.

---

## R-3 [MAJOR] — `DuplicateLocationModal` ships the hard `disabled` this phase's own reconciliation rejected, and the empty-name arm says nothing

**File:** `features/demo/ui/screens/DuplicateLocationModal.tsx:63-89` (`ActionButton`, `disabled={disabled}`
at `:77`), gate at `:111-113`, used at `:138-143` · **Settles:** WEB-3 (MED → **promoted to MAJOR**).

**Verified at source:** `ActionButton` renders the native `disabled` attribute off
`isSubmitDisabled = isNameEmpty || isNameTaken`, a gate that recomputes per keystroke. The collision arm has
`error={isNameTaken ? NAME_TAKEN_ERROR : undefined}` (`:134`, announced via `Field`'s `role="alert"`); the
empty-name arm has **no message anywhere** — two vanished primary actions and nothing said about why.

**Promotion justification.** §56d reconciled three spellings of the submit gate and named P3.5's hard
`disabled` as the loser; `_shared.tsx:280-283` states the house rule (`disabled` drops keyboard focus to
`<body>`; a keystroke-flipping gate strands the visitor mid-form — the R-7/R-15 choice, §45a precedent).
That reconciliation is part of this PR's own settled API — the don't-re-flag baseline cuts the other way
here: this is a shipped surface *contradicting* the phase's binding decision, in the same diff that
established it, with user-facing consequences (the two duplicate actions leave the tab order and the
actionable a11y tree while the name is empty/colliding; keyboard and SR visitors find a chooser that
silently changed shape). A same-phase contract violation with reachable a11y impact is MAJOR under this
document's criteria.

**Fix:** give `ActionButton` the house treatment — `aria-disabled` + guarded `onClick` (the guard already
exists at `:117-120`) + `aria-describedby` at a reason node — and add empty-name copy so both blocked arms
say why. `NewLocationModal.tsx:200-224` is the in-repo shape to copy. Note the existing pin at
`DemoExperience.duplicate.test.tsx:159` asserts `toBeDisabled()` and must move to the `aria-disabled`
semantic with the fix (the §56k dedupe already records that exact assertion migration for the sibling).

**Owner:** P3.5.

---

## R-4 [MINOR] — `updateIncidentLocation`: no unknown-id guard, a JSDoc that claims one, and a test title that pretends to pin it

**Files:** `features/demo/engine/store/create-store.ts:506-509` (impl), `:220-225` (doc) ·
`features/demo/engine/logic/__tests__/incident-location.test.ts:144-153` · caller
`features/demo/ui/DemoExperience.tsx:824-827`
**Settles:** TYPESCRIPT-2 (MED), SF-MEDIUM, TESTS-P3-4 (MED), type-design's routed observation — four lanes,
one finding. **Demoted to MINOR** (justified below).

**Verified at source.** The impl is a bare `set` + `.map`; the doc says *"A no-op for an unknown id, like
every other case-keyed writer here."* It is the only P3-added case-keyed writer without the `get()`-first
early return — `updateCase` (`:456`), `setCaseStatus` (`:502-503`), `deleteCase` (`:530`), `deleteLocation`
(`:558-559`), `setCameraGps` (`:691`) all carry it. For an unknown id the `.map` allocates a fresh `cases`
array and state object: every selector re-runs and the persistence subscriber writes a snapshot for a write
that changed nothing — verbatim the §56b defect class the assembly fixed one function up. The test at `:144`
is titled "no-ops on an unknown id" but asserts only a value-level `some(...'ghost') === false`, which the
`.map` satisfies unconditionally — the same weak-assertion shape §56b records as the reason P3.2's
`setCaseStatus` bug survived. (`:155` correctly pins the new-array behaviour for a *known* id; keep it.)

**Demotion justification (3× MEDIUM → MINOR):** unreachable through any UI path today — the only caller
guards `if (incidentCaseId)` on an id seeded from a case it just found (`:808-813`), and the silent-failures
lane traced that the modal scrim makes deleting the case under an open editor impossible. No visitor-visible
consequence; the substance is a false documented contract plus a false test title in a file whose discipline
is that contracts are exact. One-line fix — the fix round should take it.

**Settlement note:** the SF lane's "arm 1" (a no-change Save re-renders subscribers) is *not* addressed by
the unknown-id guard and is not owed — `updateCase` has the identical property for a known id; no sibling
does deep no-change comparison. The finding is the unknown-id guard + doc + test, nothing more.

**Fix:** add `if (!get().cases.some((c) => c.id === caseId)) return` (P3.1's line verbatim); strengthen the
unknown-id arm to the whole-state pin (`const before = store.getState(); …; expect(store.getState()).toBe(before)`).

**Owner:** P3.6.

---

## R-5 [MINOR] — `IncidentLocationPatch`'s optional coordinate key onto a spread writer

**File:** `features/demo/engine/logic/incident-location.ts:43` (type), writer `create-store.ts:506-509` ·
**Settles:** TYPE-DESIGN-2 (MINOR).

`Pick` preserves `DemoCase.incidentCoordinates`'s optionality, and the writer **spreads**, so `{}` and
`{ incidentCoordinates: undefined }` are both legal and mean opposite things. Today's single producer
(`incidentValuesToPatch`) always emits the key explicitly, so the documented clear-on-save guarantee holds —
but it rests on mapper discipline, not the type. A future producer using the conditional-spread idiom this
same store file uses four times would type-check and silently *preserve* a stale forensic coordinate — the
BUG-008 class arriving through the write path. The phase paid for exactly this reasoning on `CaseEdits`
(§56c) and applied it to one sibling but not the other.

**Fix:** make the key required-but-nullable —
`Pick<DemoCase, 'incidentBusinessName' | 'incidentStreetAddress' | 'incidentCity'> & { incidentCoordinates: DemoCase['incidentCoordinates'] }`.
`incidentValuesToPatch` already satisfies it unchanged. (Pairs naturally with R-4 in one commit — same
action, same owner.)

**Owner:** P3.6.

---

## R-6 [MINOR] — `setCameraGps`'s guard is correct code with no test that reaches it

**Files:** `features/demo/engine/store/create-store.ts:691` (guard) ·
`features/demo/engine/store/__tests__/camera-gps.test.ts:71-81, 83-100` · **Settles:** TESTS-P3-3 (MED),
settled per the orchestrator's adjudication: **the guard is correct; the finding is a test gap against
P3.7's suite** — the lane's mutation showed the guard's second clause can be deleted with all three camgps
suites green.

**Verified at source (statically).** The write is a `.map` keyed by camera id, not an upsert: with the guard
gone, an absent `cameraId` matches nothing, so the value-level assertions both named arms make
(`gps` `toBeUndefined`) pass by the shape of the writer, not by the guard. What the guard actually buys is
the no-op/state-identity discipline — without it, `set` reallocates `locations`, wakes every subscriber and
triggers a snapshot write for a capture that landed nowhere: the §56b class, whose house pin
(`expect(store.getState()).toBe(before)`) appears five times in `crud-actions.test.ts` and once in
`store.test.ts`, but zero times in `camera-gps.test.ts`. Secondary (lane-reasoned, plausible): the UI abort
and the store guard are mutually redundant — each test passes as long as *at least one* survives, so neither
defence is independently pinned.

**Fix:** two identity arms in `camera-gps.test.ts`'s `setCameraGps` describe — removed-camera write and
cross-location write each assert `expect(store.getState()).toBe(before)`. Both turn the lane's probe red and
pin the guards independently of the UI abort.

**Owner:** P3.7.

---

## R-7 [MINOR] — the map plots the (0,0) pair every other consumer suppresses; §49g's trigger fired un-discharged

**File:** `features/demo/ui/screens/map/mapData.ts:78-88` · **Settles:** TESTS-P3-5 (MED) + SF-LOW-3 —
merged; demoted to MINOR.

**Verified at source:** `toMapData` gates the incident pin on plain truthiness (`ic ? … : null`) and
locations on `filter((l) => l.gps)`; no `hasCapturedCoordinates` anywhere in the file. P3.7 introduced that
policy (`engine/logic/coordinates.ts`), whose own doc says every plotting surface should gate on it, and
wired three consumers (case sheet, PDF camera row, notes formatter) — not the map. §49g deferred the map
audit with the trigger *"P3.7 (per-camera GPS) or P6.1 (map depth), whichever touches plotting first"*;
P3.7 fired it, and P3.6's editor added a second hand-entry path (`parseCoordinate` correctly accepts 0/0).
Result: one stored pair, three consumers, two behaviours — sheet and PDF suppress, map plots the Gulf of
Guinea — and no test in either direction.

**Demotion justification:** the only source is a visitor deliberately typing `0` / `0`; no zero-init
artifact exists in the demo. Inconsistency plus an un-discharged ledger trigger, not a fabricated position.

**Fix:** gate `toMapData`'s `incident` and `located` on `hasCapturedCoordinates` plus one arm each pinning
`incident === null` / no pin for a (0,0) pair — **or** re-defer explicitly in §54 with a named trigger so
§49g stops pointing at a package that already shipped. Either way the three consumers stop silently
disagreeing.

**Owner:** P3.7.

---

## R-8 [MINOR] — a second notice inherits the first's remaining timer

**Files:** `features/demo/ui/screens/map/DemoNotification.tsx:34-37` · bridge
`features/demo/ui/DemoExperience.tsx:1811-1815` · **Settles:** TYPESCRIPT-4 (LOW) + SF-LOW-1.

**Verified at source:** the auto-dismiss effect deps are `[durationMs]` only, and the bridge renders the
element positionally, so a `notice` change re-renders the same instance — message swaps, 2600 ms timer does
not restart. Pre-existing component, but P3 took it from one producer to eight, and for the export/failure
arms the banner is the *entire* outcome (§52.2's honest answer): raised at t≈2.4 s after a previous notice,
it lives ~200 ms — the dead-button impression the honest-notice treatment exists to prevent.

**Fix:** one line — `key={notice}` at the bridge, or add `message` to the effect deps. Land together with
R-9 (same component, one commit).

**Owner:** integrator.

---

## R-9 [MINOR] — the notice banner is not a live region; three actions' only feedback is silent for screen readers

**Files:** `features/demo/ui/screens/map/DemoNotification.tsx:38-42`; producers
`DemoExperience.tsx:185-202` · **Settles:** WEB-4 (MED → MINOR).

The banner is a plain `<div>` — no `role="status"`, no `aria-live`. For Export ZIP / Export GeoJSON, the
location-not-found arm, and the two failure arms, the banner is the entire outcome; an SR visitor gets a
closed dialog, focus on `<body>` (R-10), and silence — §52.2's truth told to sighted visitors only. The
repo's own idiom (`role="status"`) exists in eight named places. Not a re-file of §52.6 (that entry covers
copy/portalling, not the live region).

**Demotion justification (MED → MINOR):** visible feedback exists and is honest; the gap is
announcement-only; one-attribute fix. Kept below the web lane's own MAJOR calibration (a functionally
broken gesture). Should still land in the fix round — it is one attribute.

**Fix:** `role="status"` on the banner element (announcement-on-insert works for a conditionally-rendered
short-lived banner), inherited by both call sites. Note interaction with R-8's `key={notice}` fix: a keyed
remount re-inserts the node, which is exactly what `role="status"` announces — the two fixes compose.

**Owner:** integrator.

---

## R-10 [MINOR] — the delete dialog's focus-return cannot fire at its only call path

**Files:** `features/demo/ui/screens/DeleteConfirmationModal.tsx:81-87` · call path
`features/demo/ui/screens/CasesScreen.tsx:158, 236` · **Settles:** WEB-5 (MED → MINOR; lane probe-verified
`document.activeElement === document.body` after Cancel).

The mount effect captures `document.activeElement` — but the tray action runs
`onCloseActions(); onDeleteCase(c.id)` in one batched handler, so the opener is already detached and the
captured element is `<body>`; the cleanup's `isConnected`/`instanceof` guard passes and calls
`document.body.focus()`, a no-op. The component header and §48c assert focus-return as settled fact; no test
pins it (`DeleteConfirmationModal.test.tsx:92` asserts mount focus only). Not a re-file of §7 (ModalShell
never implemented focus-return; this component *did*, and it can't fire).

**Demotion justification:** recoverable (Tab from document top), keyboard-only, no data impact.

**Fix:** keep the tray mounted while `pendingDelete` is armed (close it on the dialog's unmount instead of
the click), or pass a `returnFocusTo` ref from the row/⋯ trigger. Then pin focus-after-Cancel.

**Owner:** P3.1.

---

## R-11 [MINOR] — New Case sheet: mode derived twice, fallback half-applied (latent)

**File:** `features/demo/ui/DemoExperience.tsx:794-803` (submit: branches on `caseEditId`), `:1602-1612`
(render: branches on `cases.find(...)` with a deliberate create-mode fallback) · **Settles:** TYPESCRIPT-1
(MED → MINOR).

**Verified at source.** If `caseEditId` names a deleted case, the render falls back to create mode ("Create
Case", create confirmation) while `submitCase` takes the edit branch — `updateCase('c1', …)` is a guarded
no-op — so confirming creates nothing, silently. The TS lane checked reachability thoroughly (scrim covers
the rows; every opener re-seeds) and found **no UI path today** — the divergence is latent, which is the
demotion. Filed because the code deliberately implements a fallback for exactly this scenario and applies it
to only one of the two discriminators; a maintainer reading `:1605-1606` will believe the case is handled.

**Fix:** derive `editing` once above `activeModal()` and have `submitCase` branch on it (or clear
`caseEditId` in the fallback arm).

**Owner:** P3.3.

---

## R-12 [MINOR] — incident editor close paths don't clear their bridge state (§56j applied to one sibling, not the other)

**File:** `features/demo/ui/DemoExperience.tsx:824-827` (`submitIncidentLocation`), `:1628-1629` (Cancel) ·
**Settles:** TYPESCRIPT-5 (LOW).

Both close paths call `closeModal()` leaving `incidentCaseId`/`incidentForm` populated — the exact shape
§56j hardened on `closeCaseModal` ("the guarantee belongs at the close rather than resting on every future
opener remembering to"). Unreachable today (the opener re-seeds; `modal` is excluded from snapshots), and
this modal also lacks the render-side null-guard its two P3.5 sibling arms carry.

**Fix:** a `closeIncidentModal()` mirroring `closeCaseModal` (clear id + blank form + `closeModal()`), used
by Save and Cancel.

**Owner:** P3.6.

---

## R-13 [MINOR] — `incidentCoordinateSource: string` against the union this diff introduced; §53d's trigger fired

**File:** `features/demo/ui/screens/caseFormData.ts:34`; write sites `NewCaseModal.tsx:236, 252, 261`;
coercion `caseFormData.ts:96` · **Settles:** TYPE-DESIGN-1 (MINOR).

The engine twin (`IncidentLocationValues.coordinateSource: IncidentCoordSource | ''`) makes a provenance
typo a compile error; the UI form field is bare `string` through an untyped keyed setter, and the coercion
records anything ≠ `'geocoded'` as `'manual'` — a silent provenance mislabel on a persisted, PDF-rendered
field. §53d logged this duplication with the trigger "the next agent to touch `NewCaseModal`'s incident
section — most likely P3.3's edit-mode work"; P3.3 rewrote the component in this PR and the fold didn't
happen, and §56 doesn't re-defer it. Re-filed as trigger-fired, not re-litigated.

**Fix:** minimum — `incidentCoordinateSource: IncidentCoordSource | ''` (one line; both write sites already
pass legal members). Full §53d fold (mount `IncidentLocationFields`, delete the private `CoordinateField` +
chip) can stay deferred if re-logged with a new trigger.

**Owner:** P3.3.

---

## R-14 [MINOR] — `MapScreen.onEditIncident` optional, CTA unconditional — §49a inverted

**Files:** `features/demo/ui/screens/map/MapScreen.tsx:26-27, 102`;
`features/demo/ui/screens/map/LocationDetailCard.tsx:70-72` · **Settles:** SF-LOW-4.

The prop is optional and forwarded as `onEditIncident?.(caseId)`, but the full-size primary CTA renders
unconditionally — a handler-less mount ships a button that swallows every press. §49a chose the opposite
shape one package earlier (render the button only when the handler is supplied, "because a button that
cannot do what it says would break the demo's honesty rule"). Nothing wrong today (the bridge wires it);
first contract added *after* the precedent was written down.

**Fix:** make the prop required (bridge already passes it), or gate the CTA on presence like
`CaseActionsSheet` gates Edit Case.

**Owner:** P3.6.

---

## R-15 [MINOR] — seven suites hand-roll `DemoCase`; no entity factory (ledger entry)

**Sites:** seven listed in lane-tests TESTS-P3-6 (five added/edited by this diff); existing factories in
`engine/store/__tests__/test-utils.ts` are all *input* shapes · **Settles:** TESTS-P3-6 (MED → MINOR).

P3 made `DemoCase` a widely-fixtured entity (2 → 7 suites, fifteen fields each). Its growth direction is
optional fields, which `tsc` will not flag in a stale fixture — the phone repo's documented
`createMockCase`/BUG-007 drift pattern arriving here. Demoted because it is maintenance risk, not a defect;
the lane itself says non-gating.

**Fix:** `demoCase(over?: Partial<DemoCase>)` / `demoLocation(over?)` in a shared test-utils home; fold the
seven sites as touched. **At minimum this phase: a deferred.md entry** so the next field-add is a one-file
change.

**Owner:** orchestrator (ledger; factory optional in this round).

---

## R-16 [MINOR] — `IncidentLocationFields`' coordinate errors unassociated and unannounced

**File:** `features/demo/ui/inputs/IncidentLocationFields.tsx:100-132` · **Settles:** WEB-6 (MINOR).

`CoordinateField` renders its message as a bare `<div>` — no `id`, no `aria-describedby`, no `role="alert"`
— beside the shared `Field` that gained exactly that treatment in this same diff (§56e). An SR visitor
hears "invalid entry" and never why. (`NewCaseModal`'s private copy has the same gap but is pre-existing on
master — fold it in when the shared fix lands, or when R-13's §53d fold retires it.)

**Fix:** thread `useId()` + `aria-describedby` + `role="alert"` through `CoordinateField`, or extract one
coordinate input both modals use.

**Owner:** P3.6.

---

## R-17 [MINOR] — test hygiene trio

**Settles:** TESTS-P3-8 (LOW). Three small items, one commit:

1. `new-location-gps.test.tsx:292` — the stale-notice assertion is decorative (`LocationFields` resets
   `lookupNotice` on every draft change, so it holds regardless); the load-bearing sibling at `:290` is
   probe-verified real. Drop or re-scope the decorative line.
2. `case-notes.test.ts:696` — `expect(html).not.toContain('±')` over the whole document will false-fail the
   moment any other section legitimately prints `±`. Scope it to the camera row.
3. `new-location-gps.test.tsx:8` — `pickHarness` is module-level mutable state with no `beforeEach` reset;
   both consumers null it by hand, a third that forgets becomes order-dependent. One
   `beforeEach(() => { pickHarness.release = null })`.

**Owner:** P3.4 (items 1, 3) / P3.7 (item 2).

---

# Appendix A — dropped, demoted-to-NIT, and folded

| Lane finding | Disposition |
|---|---|
| TESTS-P3-7 (LOW) — `deleteCase` derivation arm can't distinguish derive-from-location vs keep-previous | **NIT, not scored.** The distinguishing state is unconstructible today (the lane re-verified every writer + `loadSnapshot`); defence-in-depth is legitimately hard to pin. Optional: soften the test comment, or construct the crossing pair via `createDemoStore` seed. |
| WEB-7 (MINOR) — `NewCaseModal` passes `submitBlocked` without `submitDescribedBy` | **NIT.** Mitigated by the §50a/§56d deliberate let-the-click-through design — the reason is reachable via the fields' `role="alert"` after activation. Suggested: a call-site comment recording the omission as deliberate so a sweep doesn't "fix" it into a swallow. |
| WEB-8 (MINOR) — Cases rows select text mid-hold | **Folded into R-1** as a rider (`userSelect` into the hook's returned contract). |
| TYPE-DESIGN-4 (NIT) — duplicate actions collapse three refusals into one `null` | **Carried as NIT.** Consumers are honest (generic notice, upstream gates); reach for the discriminated result union only if a cause is ever surfaced. |
| TYPE-DESIGN-5 (NIT) — `IncidentSheetItem.id` is a case id under the sibling arm's location-id field name | **Carried as NIT.** Rename to `caseId` when touched; discriminated union makes it compile-checked and free. No branded type owed. |
| TYPE-DESIGN-6 (NIT) — `CaseNotesCamera.gps` widens `CameraGpsFix` back to `GpsCoordinates` | **Carried as NIT.** One producer today; typing it `CameraGpsFix` is free and keeps the court-facing label honest by construction. |
| TYPE-DESIGN-7 (NIT) — `activeModal()`'s `default: return null` over a 7-member `ModalId`; `assertNever` now exists in-repo | **Carried as NIT.** `mediaLibrary` is a deliberate placeholder; adopt `assertNever` when the switch is next touched. |
| SF observation — `NEW_ADDRESS_FAILED_NOTICE` is the wrong sentence for its only fireable (unreachable) arm | **Rider on R-2** (same file territory); one line of copy if the fix round touches it. |
| SF "arm 1" of the incident-writer finding — a no-change Save wakes subscribers | **Dropped from R-4's scope** — not addressed by the unknown-id guard, and `updateCase` has the identical known-id property; no sibling does deep no-change comparison. Not owed. |

# Appendix B — lane inventory (every lane finding, settled)

| Lane | Finding | Lane sev | Settled as |
|---|---|---|---|
| typescript | TYPESCRIPT-1 | MEDIUM | R-11 (MINOR) |
| typescript | TYPESCRIPT-2 | MEDIUM | R-4 (MINOR, merged) |
| typescript | TYPESCRIPT-3 | MEDIUM | R-1 (MAJOR, merged) |
| typescript | TYPESCRIPT-4 | LOW | R-8 (MINOR, merged) |
| typescript | TYPESCRIPT-5 | LOW | R-12 (MINOR) |
| web | WEB-1 | MAJOR | R-1 (MAJOR, merged) |
| web | WEB-2 | MEDIUM | R-1 (MAJOR, merged) |
| web | WEB-3 | MEDIUM | R-3 (MAJOR, promoted) |
| web | WEB-4 | MEDIUM | R-9 (MINOR, demoted) |
| web | WEB-5 | MEDIUM | R-10 (MINOR, demoted) |
| web | WEB-6 | MINOR | R-16 (MINOR) |
| web | WEB-7 | MINOR | Appendix A (NIT) |
| web | WEB-8 | MINOR | folded into R-1 |
| tests | TESTS-P3-1 | HIGH | R-2 (MAJOR; probe re-verified) |
| tests | TESTS-P3-2 | HIGH | R-1 (MAJOR, merged) |
| tests | TESTS-P3-3 | MEDIUM | R-6 (MINOR, settled as test gap; guard correct) |
| tests | TESTS-P3-4 | MEDIUM | R-4 (MINOR, merged) |
| tests | TESTS-P3-5 | MEDIUM | R-7 (MINOR, merged) |
| tests | TESTS-P3-6 | MEDIUM | R-15 (MINOR, ledger) |
| tests | TESTS-P3-7 | LOW | Appendix A (NIT) |
| tests | TESTS-P3-8 | LOW | R-17 (MINOR) |
| silent-failures | SF MEDIUM (incident guard) | MEDIUM | R-4 (MINOR, merged; "arm 1" dropped, see Appendix A) |
| silent-failures | SF LOW 1 (notice timer) | LOW | R-8 (MINOR, merged) |
| silent-failures | SF LOW 2 (map (0,0)) | LOW | R-7 (MINOR, merged) |
| silent-failures | SF LOW 3 (onEditIncident) | LOW | R-14 (MINOR) |
| silent-failures | routed obs (third hook) | — | R-1 |
| type-design | TYPE-DESIGN-1 | MINOR | R-13 (MINOR) |
| type-design | TYPE-DESIGN-2 | MINOR | R-5 (MINOR) |
| type-design | TYPE-DESIGN-3 | MINOR | R-1 (MAJOR, merged) |
| type-design | TYPE-DESIGN-4..7 | NIT ×4 | Appendix A (NITs) |
| type-design | routed obs (incident guard) | — | R-4 |

Lane verdicts: typescript approve · web revise · tests revise · silent-failures approve · type-design
approve. Settled verdict: **approve-with-fixes** — both "revise" lanes' gating findings resolve into
R-1/R-2/R-3, each with a small, well-shaped fix and a defined fix-delta verification (the tests lane's
re-probe plan in `lane-tests.md` stands).

# Appendix C — aggregator verification log

Everything below was checked in this worktree at `4e60680`, not taken from the lanes.

- **R-1 double-fire, at source:** `useLongPress.ts:98-102` (timer fire nulls `timer.current`),
  `:114-120` (`onContextMenu` → `preventDefault`, `clear()` — a no-op post-fire — then unconditional
  `cb.current()`). Toggle consumer shape confirmed at `CasesScreen.tsx:50`.
- **R-1 armed latch, at source:** `DashboardScreen.tsx:59-63` (`firedRef` reset only after the
  `e.button !== 0` early return in `onPointerDown`), `:73-80` (`preventDefault` before the latch check;
  consume-and-return). Local `LONG_PRESS_MS` at `:23`; private hook at `:44-83`.
- **R-2 probe re-run:** `DemoExperience.tsx:774` mutated `gps: locForm.coordinates` → `gps: undefined`;
  `pnpm test` → 189 files / 1891 tests passed (72.5 s); mutation reverted; `git status` clean (lane docs
  untracked only).
- **R-3 at source:** `DuplicateLocationModal.tsx:77` (`disabled={disabled}`), `:111-113` (per-keystroke
  gate), `:134` (collision-only error), `:117-120` (commit-path guard, which the fix reuses).
- **R-4 at source:** `create-store.ts:506-509` vs the doc at `:220-225`; sibling guards confirmed at
  `:456, :502-503, :530, :558-559, :691`. Weak unknown-id arm confirmed at `incident-location.test.ts:144-153`
  (value-level only; `:155-161` pins the known-id new-array behaviour).
- **R-6 refutation logic, statically:** `camera-gps.test.ts:71-81, :83-100` assert `toBeUndefined` only —
  satisfied by the `.map` no-match with the guard's second clause deleted; no identity arm in the file.
- **R-7 at source:** `mapData.ts:78-88` — truthiness/presence gates, no `hasCapturedCoordinates` import.
- **R-8 at source:** `DemoNotification.tsx:34-37` — effect deps `[durationMs]`; positional render confirmed
  in the bridge.
- **R-11 at source:** render fallback at `DemoExperience.tsx:1602-1612` vs submit discriminator at
  `:794-803`; **R-12** at `:824-827`.
- **Ownership:** merge graph read from `git log --merges` — order p3-riders, p3-camgps, p3-dashboard,
  p3-locgps, p3-incident, p3-crud, p3-newcase, p3-duplicate, then assembly. `updateIncidentLocation`
  introduced by `80c9042` (p3-incident); the dashboard latch by `048ee1f` (p3-dashboard); head commit
  `4e60680` is the assembly's own §56h pin commit, which is why R-2's owner is the integrator.
- **Not independently re-run:** the web lane's three vitest probes (WEB-1/WEB-2/WEB-5 — mechanisms confirmed
  statically instead), the tests lane's other eight mutation probes (assertion shapes confirmed by reading
  the named tests), and the lanes' structural gates (`tsc`, full-suite green at HEAD, isolation greps) —
  consistent across independent lanes and spot-consistent with everything read here.
