# Parity P3 — WEB lane review (PR #32)

**Lane:** `web-reviewer` (render + bundle performance, browser-API correctness, resource leaks,
accessibility, CSS/style discipline, marketing↔demo isolation).
**Branch:** `feat/parity-p3` · **Base:** `master`
**Round 1 (initial):** @ `4e60680` — 1 MAJOR · 4 MEDIUM · 3 MINOR · 0 BLOCKER.
**Round 2 (fix-delta):** @ `3cecfcc` (fix commits after `b678a8d`) — **all 8 findings FIXED**,
0 PARTIAL, 0 UNFIXED. 1 new MINOR raised (a narrow residual of R-1's own fix mechanism).

WEB-n → R-n mapping taken from the vetted doc's routing table
(`docs/code-reviews/parity/p3/p3-review.md:504-511`).

| Lane finding | Vetted as | Status | Pinned by |
|---|---|---|---|
| WEB-1 MAJOR — shared `useLongPress` double-fires on touch | R-1 (MAJOR, merged) | **FIXED** | `useLongPress.test.tsx:170` + `CasesScreen.row-actions.test.tsx` "a TOUCH hold leaves the tray open…" |
| WEB-2 MEDIUM — dashboard's private hook, latch armed by a mouse hold | R-1 (MAJOR, merged) | **FIXED** | `useLongPress.test.tsx:190` "a MOUSE hold does not leave a latch…"; private hook deleted |
| WEB-3 MEDIUM — `DuplicateLocationModal` hard `disabled`, silent empty-name arm | R-3 (MAJOR, **promoted**) | **FIXED** (exceeded) | `DuplicateLocationModal.test.tsx` (+57/−13); gate routed through `newLocationBlock` |
| WEB-4 MEDIUM — `DemoNotification` not a live region | R-9 (MINOR, demoted) | **FIXED** | new `DemoNotification.test.tsx` "is a live region…[R-9]" |
| WEB-5 MEDIUM — delete dialog's focus-return a no-op at its call path | R-10 (MINOR, demoted) | **FIXED** | `triggerRef` anchor; probe-verified below |
| WEB-6 MINOR — incident `CoordinateField` errors unassociated | R-16 (MINOR) | **FIXED** | `IncidentLocationFields.test.tsx` (+17) |
| WEB-7 MINOR — `NewCaseModal` `submitBlocked` w/o `submitDescribedBy` | Appendix A (NIT) | **ADDRESSED** as documented-deliberate | call-site comment `NewCaseModal.tsx:279-285` + `§57i` |
| WEB-8 MINOR — Cases rows select text mid-hold | folded into R-1 (rider) | **FIXED** | `LONG_PRESS_SURFACE_STYLE` on both row surfaces |

**Gate re-checks.** `tsc --noEmit` **exit 0**. Ten blast-radius suites (`ui/primitives`,
`CasesScreen.row-actions`, `DashboardScreen`, `DuplicateLocationModal`, `DemoNotification`,
`IncidentLocationFields`, `DeleteConfirmationModal`, `DemoExperience.crud`,
`DemoExperience.duplicate`) — **107/107 pass** in 8.0 s. Boundary re-grepped: the entire fix range
touches only `features/demo/**` plus `docs/code-reviews/deferred.md`; `git diff b678a8d..HEAD --stat`
over `package.json`, `pnpm-lock.yaml`, `next.config.js`, `postcss.config.js`, `app/`, `components/`,
`lib/` is **empty**, and the wall still returns only the documented comment in
`components/marketing/phone-frame.tsx:7`. No new listener, timer or observer in the range —
R-8's change is a dep-array correction on an existing, already-cleaned-up `setTimeout`.

**Verification method.** Every round-1 finding was re-run with the same probe shape that proved it
originally, against the fixed components; the R-1/R-10 probes additionally ran against the real
`CasesScreen` rather than a synthetic probe. A separate 4-arm regression sweep exercised the moved
gesture surfaces' keyboard/AT paths. All probe files were deleted; the tree is clean apart from this
document.

---

## WEB-1 + WEB-2 → R-1 — **FIXED**

One hook (`features/demo/ui/primitives/useLongPress.ts`), both latches, **reset first, guard
second**. `DashboardScreen`'s private copy is deleted (−67 lines) along with its duplicate
`LONG_PRESS_MS`.

The two defects are fixed by the two halves of that ordering:

- **Touch double-fire (WEB-1)** — a `fired` ref is set when the timer fires (`:158`) and *consumed*
  by the trailing `contextmenu` (`:179-182`) instead of the callback running a second time.
- **Armed latch (WEB-2)** — both latches are cleared at the top of `onPointerDown` **before** the
  `e.button !== 0` return (`:148-152`), so a right-click's own pointerdown clears a latch no
  `contextmenu` came to consume. This is precisely what P3.2's copy could not do.

Re-ran both original probes plus two new arms:

```
✓ WEB-1: touch hold + trailing contextmenu leaves the tray OPEN
✓ WEB-1b: a genuine right-click AFTER the touch gesture still toggles
✓ WEB-2: mouse hold does NOT eat the next right-click
✓ nested control does not arm; the surface itself does
```

and against the real component:

```
>>> R-1 tray open on real row: true
```

**The refutation in `§57a` / commit `ec20686` is correct, and the delivered shape is better than
what I proposed.** I asked to lift `e.target.closest('button')` into the shared hook. On the Cases
layout the handlers rode a wrapper `<div>` whose every descendant is a `<button>`, so that bail
would have matched on every press and killed the gesture outright — I did not check that, and the
refutation's layout evidence is sound. Their replacement is strictly stronger: compare against the
surface (`closest(control) !== e.currentTarget`, `:196-200`) **and** move each caller's hook onto the
element that *is* the gesture surface. That also resolves the sub-claim I raised without a fix — the
⋯ trigger is now a sibling outside the gesture, so holding it no longer double-toggles its own tray
(pinned by a new arm in `CasesScreen.row-actions.test.tsx`).

`§57b` generalises the root cause into a reusable rule (a `useX` defined inside a screen file is a
consolidation candidate by default), which is the right place to land it — this was the guard rail's
third strike.

**WEB-8 rider:** `LONG_PRESS_SURFACE_STYLE` (`:99`) carries `userSelect: 'none'` to both Cases row
surfaces. Exported as a style token rather than folded into the returned handlers, because callers
spread those alongside their own `style` prop and a `style` key inside would win or lose by attribute
order — a correct call.

---

## WEB-3 → R-3 — **FIXED (exceeded)**

`ActionButton`'s `disabled` prop became `blocked` → `aria-disabled` + `aria-describedby`, with
enforcement moved into the `duplicate()` guard (`:139`). Both halves of my finding are closed, and
the fix went past what I asked for: rather than adding a local reason string, it **retired the
component's private re-derivation of the two name rules** and routes through the shared
`newLocationBlock({ …, requireAddress: false })`. `NAME_TAKEN_ERROR` is now a re-export of
`NEW_LOCATION_BLOCK_MESSAGES.duplicateName`, so the two surfaces cannot drift on copy — and the
module's evaluation order comes with it, so a blank name reports `nameRequired`, never
`duplicateName`, even when a blank-named sibling exists.

That closes the empty-name silence I flagged, with the phone's verbatim copy rather than an invented
string:

```
>>> blank-name reason announced: "Location name is required"
>>> four un-gated actions remain actionable: true
```

Probe confirms the blocked action keeps `aria-disabled="true"`, carries **no** `disabled` attribute,
points `aria-describedby` at the live reason node, and still refuses to act. `§57c` records the
consequence worth knowing: under the old `disabled` attribute the click never reached the handler, so
the commit-path guard was never actually exercised by its own test — the arm now pins the mechanism,
not just the outcome.

---

## WEB-4 → R-9 — **FIXED**, and R-8 caught a defect I missed

`role="status"` added to the banner (`DemoNotification.tsx:54`), inherited by both call sites.

R-8, raised alongside it, is a genuine bug in the same component that **my finding did not catch**:
`message` was absent from the auto-dismiss effect's deps, and the bridge renders the element
positionally, so a second notice inside the 2.6 s window re-used the same instance — text swapped,
timer not restarted. A notice raised at t≈2.4 s lived ~200 ms. That matters most on exactly the arms
I argued about: for Export ZIP/GeoJSON and the failure notices the banner is the entire outcome, so a
sub-perceptual flash reads as a dead button. Worth noting the two fixes compose — with `message` in
the deps a content change now both restarts the dwell and re-announces through the live region.

Pinned by a new `DemoNotification.test.tsx` whose R-8 arm asserts the second notice survives past the
first one's deadline and dismisses on its own — a real behavioural pin, not a shape check.

---

## WEB-5 → R-10 — **FIXED**

Neither shape I proposed was used, and `§57f` argues why: keeping the tray mounted would drop §48a's
ported tray-closes-on-handoff behaviour, and threading a `returnFocusTo` ref up to the bridge would
cross the callback-isolation boundary for chrome state. Both objections are correct.

The delivered fix moves focus to the row's own ⋯ trigger *before* the tray unmounts
(`CasesScreen.tsx:172`, `:253-254`), so the dialog's existing `document.activeElement` capture finds a
live element. The trigger is a better anchor than the one I implied: it is the affordance that led
there, and unlike the tray's buttons it survives the tray closing. Probe against the real
`CasesScreen` + `DeleteConfirmationModal`:

```
>>> R-10 dialog focused on open: true
>>> R-10 focus after Cancel — is <body>? false | is the ⋯ trigger? true
```

The delete-the-case path still degrades correctly: the row unmounts, `opener.isConnected` is false,
and the restore is skipped rather than throwing.

---

## WEB-6 → R-16 — **FIXED**, private twin correctly deferred

`useId()` + `aria-describedby` + `role="alert"` on `IncidentLocationFields`' `CoordinateField`
(`:115`, `:126`, `:136-140`) — the treatment the shared `Field` gained in this phase (§56e), applied
to the input that missed it.

`NewCaseModal`'s private `CoordinateField` twin still has the gap, and `§57h` books it against
§53d's full fold with a stated trigger, on the reasoning that fixing a component slated for deletion
would make the duplication harder to see rather than easier. **That matches my own round-1 framing**
(I recorded the twin as pre-existing and as the completeness sweep for when the shared fix lands), so
it is correctly deferred, not unfixed.

---

## WEB-7 → Appendix A — **ADDRESSED as documented-deliberate**

Exactly the disposition I suggested: a call-site comment (`NewCaseModal.tsx:279-285`) recording that
the omission is the §50a/§56d design — the click reaches `handleSubmit`, which writes the phone's
verbatim per-field messages into the fields' own `role="alert"` nodes — so a later a11y sweep does not
"fix" it into a swallow. `§57i` carries the same reasoning. Closed.

---

# NEW FINDINGS (round 2)

## NEW-WEB-1 — [MINOR] R-1's latch survives a `contextmenu` that has no preceding `pointerdown` — the keyboard menu key after a mouse hold

**File:** `features/demo/ui/primitives/useLongPress.ts:143-160`

### Issue

R-1 clears the `fired` latch at the top of `onPointerDown`, which is what lets a right-click's own
pointerdown clear a latch that no `contextmenu` came to consume. That mechanism cannot cover a
`contextmenu` raised **without** any pointer event — the keyboard context-menu key / **Shift+F10**,
which fires on the focused element directly.

The Cases gesture surface is now a real `<button>` (that is R-1's own improvement), so it is
focusable and Shift+F10 targets it. A completed desktop **mouse** hold leaves `fired` set — the
trailing click consumes `swallowNextClick` but nothing consumes `fired` — so the next Shift+F10 on
that row is swallowed, and `preventDefault()` has already suppressed the browser menu.

### Evidence

Probe against the real `CasesScreen` — mouse hold, pointerup, click, then a bare `contextMenu`:

```
>>> RESIDUAL tray still open after Shift+F10 (should have toggled shut): true
```

The dashboard card is unaffected: it is a non-focusable `<div>`, so the keyboard menu key cannot
target it.

### Assessment

This is a **residual of the fix's chosen mechanism, not a regression** — round-1 WEB-2 was "any
right-click after a mouse hold", and R-1 narrowed it to "a keyboard context-menu key, on the Cases
rows only, with no intervening pointerdown". Mixed-modality (mouse hold then keyboard menu key on the
same row), and self-clearing: the swallow resets `fired`, so the second press works. Hence MINOR
rather than a re-raise.

### Fix

Set the latch only when it can actually be needed — `fired.current = e.pointerType === 'touch'` at
the timer body, capturing `pointerType` at pointerdown. A mouse hold raises no trailing `contextmenu`,
so it never needs the latch; a touch hold does. That removes the residual class entirely rather than
adding a second clearing path. One arm to pin: mouse hold → bare `contextMenu` (no pointerdown) still
fires.

---

## Regression sweep — moved gesture surfaces (clean)

R-1 relocated the hook from the wrapper strip onto the row/header buttons, which is the change most
likely to have collateral. Four arms, all passing:

```
>>> Enter on case header toggles: true
>>> Enter on location row opens: true
>>> location ⋯ reachable: true | case ⋯ hidden while expanded (actionsAllowed=!expanded): true
>>> expanded header: no tray, click still collapses: true
>>> location tray open after touch hold: true
```

- **Keyboard activation is not swallowed** on either row surface — `onClickCapture` resets
  `swallowNextClick` *before* the `detail === 0` check (`:186-188`), so Enter both clears the flag and
  activates.
- **The `enabled` gate still holds** on an expanded case: the hold is inert, no tray appears, and the
  header's own click still collapses the card.
- **Both ⋯ triggers remain reachable by role + accessible name**, and the case trigger is still
  correctly gated off while expanded (phone parity, `actionsAllowed = !expanded`).
- The four un-gated chooser actions (`New Location w/ Sub Info`, `Export ZIP`, `Export GeoJSON`,
  `Cancel`) are never blocked by the name gate.

**One observation, not a finding.** `Duplicate…` now focuses the ⋯ trigger before opening the
chooser, which is a `ModalShell` and does not take focus — so focus rests on a background control
behind the scrim. That is strictly better than round 1 (`<body>`) and sits inside `deferred.md §7`'s
still-open "focus trap + focus return for `ModalShell`" scope, which owns it. The `Delete` path is
unaffected: `DeleteConfirmationModal` takes focus itself and consumes the anchor correctly.

---

## Web Reviewer Summary — round 2

| Severity | Count (new this round) |
|---|---|
| BLOCKER / CRITICAL | 0 |
| MAJOR / HIGH | 0 |
| MEDIUM | 0 |
| MINOR / LOW | 1 |

Round-1 disposition: **8 FIXED · 0 PARTIAL · 0 UNFIXED**

Marketing↔demo isolation: **preserved** (re-grepped at `3cecfcc`)
Bundle impact: **none** (fix range touches `features/demo/**` + `deferred.md` only)
Browser-resource cleanup: **complete** (no new listener/timer/observer; R-8 is a dep-array fix on an
already-cleaned-up timer)
Accessibility: **round-1 gaps closed** — `aria-disabled` + `aria-describedby` now uniform across every
adopter of the unified gate; live region on the toast; coordinate errors associated and announced;
focus return anchored to a surviving control
Style-convention adherence: **correct half** — inline `CSSProperties` throughout, `LONG_PRESS_SURFACE_STYLE`
added as a style token, lifted rules and device math untouched

**Verdict: APPROVE** (was REVISE)

**Notes:** The fix round beat the review on three counts — R-3 retired a duplicated gate I had only
asked to re-label, R-8 caught a dwell-timer defect in `DemoNotification` that my WEB-4 missed
entirely, and `§57a`'s refutation of my nested-control fix shape is correct with layout evidence I
had not checked. The one new MINOR is a residual of R-1's clearing mechanism on a mixed-modality
keyboard path, not a regression; `§57h`'s three deferrals all carry triggers and the
`NewCaseModal` `CoordinateField` twin is correctly booked against §53d's fold rather than patched
in place.
