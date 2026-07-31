# Parity P2 — WEB lane review (PR #31)

**Lane:** `web-reviewer` (render + bundle performance, browser-API correctness, resource leaks,
accessibility, CSS/style discipline, marketing↔demo isolation).
**Branch:** `feat/parity-p2` · **Base:** `master`
**Round 1 (initial):** @ `9f5c01a` — 3 MAJOR · 2 MEDIUM · 3 MINOR · 0 BLOCKER.
**Round 2 (fix-delta):** @ `572022a` (fix commits after `e770d45`) — **all 8 findings FIXED**, 0 PARTIAL,
0 UNFIXED. 2 new MINOR raised (1 residual of the round's own new idiom, 1 cross-lane routing note).

---

# FIX-DELTA (round 2) — verification @ `572022a`

WEB-n → R-n mapping taken from the vetted doc's `**Lenses:**` lines
(`docs/code-reviews/parity/p2/p2-review.md`).

| Lane finding | Vetted as | Status | Pinned by |
|---|---|---|---|
| WEB-1 MAJOR — NotesScreen `ConfirmDialog` | R-5 | **FIXED** | `NotesScreen.test.tsx` "confirmations use the shared AlertDialog contract…(R-5)" |
| WEB-2 MAJOR — CoordinateDisplay AT-unreachable status/metadata | R-6 | **FIXED** | 3 tests in `CoordinateDisplay.test.tsx` (accessible name ×2, live region outside the button) |
| WEB-3 MAJOR — capture button strands focus on `<body>` | R-7 | **FIXED** | `submission-gps.test.tsx` "stays focused and inert for the whole capture…", "keeps focus on the control when the capture fails" |
| WEB-4 MEDIUM — `SectionBlock` memo inert + unmemoised derivations | R-14 | **FIXED** | structural (useCallback/useMemo); DST site memoised too |
| WEB-5 MEDIUM — copy-status timer untracked | R-12 | **FIXED** | `NotesScreen.test.tsx` "R-12: a re-copy re-arms the reset window…" |
| WEB-6 MINOR — hard-coded `10` sample ceiling | R-10 | **FIXED** | 2 tests in the new `GpsCaptureControl.test.tsx` |
| WEB-7 MINOR — blocked-CTA reasons unassociated/silent | R-15 | **FIXED** | live region + `aria-describedby` (see below) |
| WEB-8 MINOR (cross-lane note) — OCR commit regenerates scopes unprompted | R-4 | **FIXED** | promoted to MAJOR by the aggregator on phone source; three-arm prompt shipped |

**Gate re-checks.** `tsc --noEmit` exit 0. Blast-radius suites (CoordinateDisplay, GpsCaptureControl,
AlertDialog, NotesScreen, submission-gps, DemoExperience.ocr) **75/75 pass** run serialized in 31.9 s.
Boundary: the entire fix range touches only `features/demo/**` plus `docs/code-reviews/deferred.md` —
no `package.json`, no marketing file, wall re-grepped clean. The only two timers added in the range are
the tracked-and-cleared ones from R-12/R-31.

> **Full-suite caveat (not a regression).** A single parallel run of all 85 UI files on this box
> reported 29 failures, every one a bare `Test timed out in 5000ms` — including on a *synchronous*
> test (`submission-gps.test.tsx:89`, `render` + `getByLabelText`, no async util involved). Wall 675 s
> against 1646 s of test time = heavy contention. The same files pass 75/75 serialized. This is the
> phase's documented `gate-import-flake.md` signature, not fix damage. See NEW-WEB-2 for a structural
> observation it exposed.

---

## WEB-1 → R-5 — **FIXED**

`ConfirmDialog` is **deleted** (−67 lines); all six confirmations now render through `AlertDialog`,
which is the §39.1 consolidation target. Verified against every sub-claim I filed:

- **Body copy exposed** — comes from the primitive's `aria-describedby` (`AlertDialog.tsx:44,76`);
  the `body` prop became `message`. Pinned: the new NotesScreen test asserts focus moves in *and*
  the described-by body carries the copy.
- **Focus in/out** — inherited from `AlertDialog.tsx:55-61`.
- **Escape-listener churn (my secondary claim)** — fixed at the root: `closeDialog = useCallback(…, [])`
  (`NotesScreen.tsx:301`) is the single `onDismiss`/cancel identity for all six dialogs.
- **Scrim contradiction (TYPESCRIPT-4, folded in)** — resolved by deletion; the demo now has exactly
  one blocking-dialog semantic (inert scrim, Escape cancels).
- **`DialogAction` vs `AlertAction` (TYPE-DESIGN-8)** — the local type is gone.

The primitive was extended rather than duplicated: `AlertDialog.tsx:104-107` switches to
`flexDirection: column` at 3+ actions, matching the OS multi-option shape. Reviewed for fallout —
container height is auto, so `flex: 1` on column children distributes zero free space and button
heights are unchanged; 1-2 action dialogs keep the existing row.

**Residual, accepted, not re-filed:** after a destructive action the opener may have unmounted (e.g.
"Reset to auto-generated" disappears once the section is no longer stale), so focus-restore no-ops via
the `opener.isConnected` guard and focus lands on `<body>`. That guard is deliberate and predates this
finding; it is the primitive's contract, not a NotesScreen defect.

## WEB-2 → R-6 — **FIXED**

`CoordinateDisplay.tsx` restructured exactly as suggested, and slightly better:

- The `role="status"` copy region is now a **sibling** of the button inside a new wrapper `<div>`
  (`:162-174`), with the comment naming why. `card` lost its `marginBottom` to the wrapper, so layout
  is unchanged.
- The metadata is folded into the accessible name via a composed `nameParts` array (`:108-113`),
  which correctly omits the accuracy clause when nothing measured one — the R-18 optional-accuracy
  case. Pinned by two `toHaveAccessibleName` tests plus one asserting
  `getByTestId('coordinate-display').contains(status) === false`.

Adjacent **R-31** (recovered by the aggregator from lane-typescript's routing note, on my surface):
the confirmation now auto-clears after `COPY_RESET_MS = 1600` on a tracked handle cleared on re-arm
and unmount — the R-12 idiom applied to the sibling component. Three tests. Verified: this closes the
"'Coordinates Copied' still on screen minutes later" state my round-1 write-up noted in passing.

## WEB-3 → R-7 — **FIXED** (divergence from my suggestion accepted — reasoning is sound)

`disabled={busy || disabled}` → `aria-disabled={busy || disabled}` with a guarded handler
(`GpsCaptureControl.tsx:126,154`). This is the *stronger* of the two options I offered, not the
PickerStage idiom. **Judging §45a's reasoning: correct, and better than what I proposed.** PickerStage
*repairs* focus after losing it — adequate for a sub-second clipboard read; the GPS stranding window is
the whole 30-120 s capture and, as §45a notes, my suggestion only covered the failure path while
`aria-disabled` never drops focus on the success path either. `aria-disabled` + guarded activation is
also the ARIA APG's own recommendation for a control that must stay discoverable while inert.

The consequence they flag is real and I verified the guard chain holds:
- `onClick` early-returns on `busy || disabled` (`:133`);
- two clicks in the same tick both see the pre-update `busy === false`, but `useGpsCapture`'s
  `runningRef` mutex (`useGpsCapture.ts:86-87`) refuses the second — so removing the native `disabled`
  did **not** widen the double-capture window;
- pinned by a test that clicks during a capture and asserts one write, plus `aria-disabled` state
  assertions across idle → busy → idle.

## WEB-4 → R-14 — **FIXED**

- `onRequestReset` → `requestReset = useCallback(…, [])` (`NotesScreen.tsx:305-309`).
- All six bridge callbacks → `useCallback(…, [store])` (`DemoExperience.tsx:469-486`); the store ref is
  stable, so they bind once for the mount.
- `buildNotesSectionMeta` / `assembleNotesString` → `useMemo(…, [currentLocation])` (`:467,470`).

With `meta`, both commit callbacks and `onRequestReset` all stable, `SectionBlock`'s memo now actually
holds: a free-text keystroke re-renders only `NotesScreen`. The documented intent and the code agree.

Also picked up the routing note folded into R-14: `computeDstAdvisory` moved out of the `timeOffset`
render arm into a memo at the bridge top (`:373-395`) with deps that are exactly its inputs
(`timeOffsetForAdvisory`, `scopesForAdvisory`, `capture.actualDateTime`, `capture.dvrAppliesDST` — all
store references, stable between writes). The ~23 `isDst` probes per bridge render are gone. The
honest consequence (a memoised clock read freezes "today" until an input changes) is stated in-code.

## WEB-5 → R-12 — **FIXED**

`copiedTimerRef` cleared on re-arm and in an unmount effect (`NotesScreen.tsx:277-294`) — the
`syncTimer`/`PdfPreview` idiom I cited. Both halves I described are covered: the stacking case is
pinned by "a re-copy re-arms the reset window — the earlier timer cannot wipe the later confirmation".

## WEB-6 → R-10 — **FIXED**

`resolvedConfig = config ?? buildGpsConfig()` computed once and handed to **both** the hook and the
readout (`GpsCaptureControl.tsx:117-121`), so the displayed ceiling is by construction the one the loop
uses. The duplicated literal is gone. Two tests pin it, including a caller-supplied ceiling (the P3.7
shape). The readout also picked up R-18's optional accuracy correctly — it drops the `· best …` clause
rather than printing `±0m`.

## WEB-7 → R-15 — **FIXED**

`OcrCaptureScreen.tsx:157-180`: the two blocked-reasons are wrapped in an always-mounted
`role="status"` container (the correct live-region shape — region present before content changes, not
mounted with it), and the CTA carries `aria-describedby={canCommit ? undefined : blockedId}` plus
`aria-disabled` so it stays focusable and can be landed on to hear why.

Verified the describedby can never dangle: `isDvrDraftCommittable` (`ocr.ts:259-267`) returns false in
exactly two cases — empty draft, or unconfirmed-and-unchanged assumed date — and each renders one of the
two message divs. No third blocked state exists, so the message is always present and always the right
one.

**Noted, not filed:** both message divs literally share `id={blockedId}`. They are strictly mutually
exclusive (`!dvrDraft` vs `Boolean(dvrDraft) && …`), so no duplicate ID can exist in the document at
once. Fragile if a third reason is ever added; the guard is the exclusivity, not the code shape.

## WEB-8 → R-4 — **FIXED** (promoted to MAJOR by the aggregator; correctly)

My round-1 note was filed MINOR and explicitly unverified against phone source. The aggregator
verified it (`phone ocr-capture.tsx:288-317`) and promoted it — the right call: the phone *does* guard
this, so it was silent destruction of operator work on a path the phone protects.

The fix ships the phone's full three-arm shape (`OcrCaptureScreen.tsx:184-203`): Cancel /
Keep My Edits / Regenerate Scopes, with `calcOffset(regenerate = true)` splitting scope regeneration
off the offset calculation (`DemoExperience.tsx:841-848`). Defaulting `regenerate` to `true` keeps the
Time Offset screen's own confirmed path byte-identical — `TimeOffsetScreen.tsx` was not touched, which
is the correct blast-radius discipline.

**Judging §44a (Escape ≠ Cancel here):** sound and worth the deliberate rule-break. The phone's Cancel
on this alert is `router.push(TIME_OFFSET)` — it *discards the capture*. Wiring Escape to that would
let a stray keypress throw away a read; instead Escape returns to the confirm step with the read,
draft and date-confirmation intact. Least-destructive dismissal is the right default for a keyboard
escape hatch, and it is documented in-file and in the ledger with a revisit trigger.

---

# NEW findings from the fix round

## NEW-WEB-1 [MINOR] features/demo/ui/screens/OcrCaptureScreen.tsx:134

**Claim.** The fix round adopted `aria-disabled` + guarded activation on two surfaces and wrote down
why — but the *third* button in the same file, twenty lines above the one it fixed, still uses the
native `disabled` attribute and reproduces the exact failure the round's own comment describes.

**Evidence.** `OcrCaptureScreen.tsx:130-136`, the assumed-date panel's confirm button:

```tsx
<button type="button" onClick={onConfirmDate} disabled={dateConfirmed} …>
  {dateConfirmed ? 'Date confirmed' : 'The date is correct'}
</button>
```

versus the R-15 comment at `:157-162` on the CTA below it: *"`disabled` would also drop focus at the
exact moment confirming the date re-enables it (the R-7 failure shape). The click is guarded instead."*
And `deferred.md` §44b: *"this particular button's state flips while the operator is working on the
screen … so `disabled` would drop focus to `<body>` at the exact moment the operator wants to press it."*

That reasoning describes this button precisely: pressing "The date is correct" flips `dateConfirmed`
→ the button the user just activated becomes `disabled` → browsers blur it → focus falls to `<body>`.
The very next thing the operator wants is the commit CTA that this press just unblocked, and it is now
several tabs away, with the `role="status"` blocked-reason announcing to a user whose focus is nowhere.

**Why MINOR, not MAJOR.** Unlike R-7's 30-120 s window this is a single forward step in a small
overlay, the state change is what the user intended, and the CTA is reachable. It is a completeness
residual of the pattern this round established, not a new class of defect.

**Suggested fix.** Same three-line shape as its neighbour: `aria-disabled={dateConfirmed}` and
`if (dateConfirmed) return` at the top of the handler. (Or drop the disabling entirely — re-confirming
is idempotent.)

**Confidence.** High — mechanical, and the round has already written the argument for it.

## NEW-WEB-2 [MINOR — cross-lane routing note] `vitest.config.mts` + `vitest.setup.ts`

**Not a web-platform finding; recorded so it is not lost between lanes** (tests lane owns it). This is
**not** a re-flag of the deliberate `asyncUtilTimeout: 5000` — it is about the budget that caps it.

**Claim.** `vitest.config.mts` sets **no `testTimeout`**, so it is vitest's default **5000 ms** —
exactly equal to the `asyncUtilTimeout: 5000` the phase introduced. A `findBy*`/`waitFor` that
genuinely needs the raised budget can therefore never use it: the per-test timeout fires at the same
instant. The raise is effective only inside `DemoExperience.sandbox.test.tsx`, which raised its own
per-test timeout to 20000 ms — which is precisely the file the flake doc measured.

**Evidence.** `vitest.config.mts` `test:` block contains `environment`, `globals`, `setupFiles`, `css`,
`include`, `exclude`, `coverage` — no `testTimeout`. `vitest.setup.ts:24` `configure({ asyncUtilTimeout: 5000 })`.
The setup comment itself says *"Deliberately well under that 20000 ms test timeout"* — true for the one
file that sets it, not for the other 84. Observed live: this round's contended full-suite run produced
29 failures, all `Test timed out in 5000ms`, none reaching the async-util budget's own error.

**Suggested action.** Set a global `testTimeout` above `asyncUtilTimeout` (e.g. 15000) in
`vitest.config.mts` so the async-util raise can actually take effect fleet-wide, and so a genuine hang
still fails as a hang. Pairs with the existing ceiling pin in `__tests__/async-util-timeout.test.ts`.

**Confidence.** High on the configuration fact and on the failure signature; the flake-cause
attribution is the tests lane's to confirm.

---

# ROUND 1 (initial) — original findings, retained

Line references below are as-of `9f5c01a`. See the fix-delta section above for current state.

## WEB-1 [MAJOR] features/demo/ui/screens/NotesScreen.tsx:96-156 — **FIXED (R-5)**

**Claim.** `NotesScreen`'s local `ConfirmDialog` is a second, weaker blocking-dialog implementation
shipped in the same PR that introduced the shared `AlertDialog` primitive. It carries
`role="alertdialog"` + `aria-modal="true"` but (a) never moves focus into itself, (b) never returns
focus, and (c) associates only the *title* (`aria-label={title}`) — the body copy, which is where the
destructive consequence is stated, is not exposed at all. All six Notes confirmations (reset section,
restore section, restore-all ×2, scrap-all) route through it.

**Evidence.** `NotesScreen.tsx:121-129` carried `aria-label={title}` with no `tabIndex={-1}`, no
`aria-describedby`, and no focus effect (the only `useEffect` was the Escape listener at :107-113).
The bar this PR set — `AlertDialog.tsx:41-61` — has `useId`-derived `aria-labelledby`/`aria-describedby`,
`tabIndex={-1}`, and a focus-in/focus-restore effect, with four tests pinning it and `deferred.md:939-943`
recording it as the §39.1 resolution.

**Concrete failure mode.** Screen-reader + keyboard user presses "Write my own notes…" → the dialog
mounts in a portal, focus stays on the now-obscured trigger. `aria-modal="true"` marks everything
outside inert to AT, so the user is focused on an element the AT is told to ignore, with no
announcement a dialog opened, and the sentences that matter (:378, :388, :397) are never associated.
The two buttons on offer are "Start from current notes" and "Start blank" — the second wipes all seven
sections (`create-store.ts:563-586`).

This is **not** the deferred item at `deferred.md:164-167` (a focus *trap* + return for
`WizardDrawer`/`ModalShell`, both of which at least announce their own name).

**Secondary.** The Escape effect keyed on `onCancel` with fresh inline closures at every call site
(:360, :369, :383, :390, :402) — listener teardown/re-add every render, the exact anti-pattern this PR
comments and fixes twice (`DemoExperience.tsx:356-358`, `TimeOffsetScreen.tsx:64-66`).

**Suggested fix.** Render through `AlertDialog` (add a stacked-actions variant), or port the six lines.
**Confidence.** High.

## WEB-2 [MAJOR] features/demo/ui/inputs/CoordinateDisplay.tsx:84-134 — **FIXED (R-6)**

**Claim.** The whole coordinate card is one `<button aria-label="…">` with the metadata spans **and**
the `role="status"` copy region as descendants. Per ARIA, `button` has children-presentational
descendants, and `aria-label` overrides the name computation — so an AT user gets neither the measured
accuracy/rating/source nor "Unable to copy coordinates to clipboard".

**Evidence.** `CoordinateDisplay.tsx:85-133`. The correct in-repo pattern is 40 lines away in the same
PR: `GpsCaptureControl.tsx:162-173` places `role="status"` and `role="alert"` outside the button.

**Concrete failure mode.** The card announces only "GPS coordinates: 43.653226, -79.383184. Copy to
clipboard, button". `defaultWriteClipboard` throws (:35-38) on any non-secure origin; the resulting
failure line is never heard. The component's own comment (:76-78) says a blocked clipboard "must not
look like a successful copy" — for AT it looked like nothing at all.

**Suggested fix.** Move the status block out; fold accuracy/rating/source into the accessible name.
**Confidence.** High.

## WEB-3 [MAJOR] features/demo/ui/inputs/GpsCaptureControl.tsx:131-141 — **FIXED (R-7)**

**Claim.** The capture button disabled itself for the whole capture — up to 30 s on the default config
(`gps.ts:128-138`) and 120 s with `PRECISE_GPS_CONFIG` (:142-147) — blurring the just-activated control
and dropping keyboard focus to `<body>`. On failure the `role="alert"` (:169-173) then announced with
focus nowhere.

**Evidence.** `disabled={busy || disabled}` with `busy = isCapturing || reverseGeocoding` (:119); no
ref, no focus effect. The repo's commented, tested idiom for this is `PickerStage.tsx:171-192`.

**Concrete failure mode.** Keyboard user tabs to "Use Current Location", presses Enter, loses their
place in a ~12-field form; on permission-denied there is no route back to the control. `aria-busy`
annotates a node the user is no longer on.

**Suggested fix.** Re-focus on failure (PickerStage), or `aria-disabled` + early return.
**Confidence.** High.

## WEB-4 [MEDIUM] NotesScreen.tsx:171,421-431 + DemoExperience.tsx:1113-1130 — **FIXED (R-14)**

**Claim.** `SectionBlock`'s `memo` was inert — a fresh `onRequestReset` arrow per render (:427) plus
inline `onCommitSection`/`onCommitAddendum` from the bridge (:1121-1126) meant no prop ever held
identity, defeating the optimisation its own comment documents (:168-170). Separately
`buildNotesSectionMeta` + `assembleNotesString` ran in the render body (:1114-1120) while every
neighbouring derivation (`caseCards` :331, `mapData` :334-338, `gateOutcome` :349-352) is memoised.

**Impact (stated honestly).** ~7 small subtrees re-reconciled per free-text keystroke, one full notes
rebuild per store commit. `useAutoGrow` is dep-guarded, so no layout thrash — wasted reconciliation and
a dead optimisation, not jank.

**Suggested fix.** `useCallback` the arrow, hoist the bridge callbacks, `useMemo` the derivations.
**Confidence.** High on the memo; Medium on the derivation's measured cost.

## WEB-5 [MEDIUM] NotesScreen.tsx:343-351 — **FIXED (R-12)**

**Claim.** `setTimeout(() => setCopied('idle'), 1600)` with no teardown and no stacking guard, in a
file whose siblings all track their timers (`DemoExperience.tsx:284-290`, `PdfPreview.tsx:28-33`).
Two consequences: a fire on an unmounted tree (no-op under React 18), and stacked timers reverting the
confirmation 1.6 s after the *first* click regardless of later ones.
**Suggested fix.** Ref the handle, clear on re-arm and unmount. **Confidence.** High on mechanics.

## WEB-6 [MINOR] GpsCaptureControl.tsx:165 — **FIXED (R-10)**

**Claim.** `config?.maxAttempts ?? 10` duplicates `GPS_CONFIG_STATIC.maxAttempts` (`gps.ts:111`).
Correct today; drifts silently the moment the constant moves, in a component whose docblock promises
"Every number on that line is measured" (:26-28). **Confidence.** High (latent, not live).

## WEB-7 [MINOR] OcrCaptureScreen.tsx:122-130 — **FIXED (R-15)**

**Claim.** The two reasons the commit CTA is blocked were plain, unassociated, non-live text beside a
`disabled` (unfocusable) button, appearing/disappearing reactively with no announcement. The repo's
idiom for blocking-validation messages is `role="alert"` (`CompletionScreen.tsx:77`,
`OcrCaptureScreen.tsx:89`). **Confidence.** Medium-High; filed MINOR because the assumed-date branch is
also stated in the `role="alert"` panel above.

## WEB-8 [MINOR — cross-lane routing note] DemoExperience.tsx:811-827 — **FIXED (R-4, promoted MAJOR)**

**Claim.** P2.5 gated recalculation behind a confirm on the `Calculate` button only; `confirmOcr` →
`calcOffset()` → `generateExtractedScopes()` (:762-765, :824) reached the same destructive regeneration
with no prompt. Reachable: generate scopes → edit them → re-capture OCR → "Use this & calculate" →
edits gone. **Confidence.** High on the demo-internal inconsistency; phone source unavailable to this
lane (the aggregator verified it and promoted the finding).

---

# Checked and clean (inventory — re-verified at `572022a`)

**Bundle & boundary — CRITICAL bucket, all clear.** The wall holds (`grep` over `components`,
`app/(default)`, `lib`, `app/layout.tsx` returns only the guard test and a comment in
`phone-frame.tsx:7`). The whole fix range touches only `features/demo/**` + `deferred.md`;
`package.json` unchanged across both rounds. Heavy deps still lazy (`mapbox-gl` via `await import` at
`MapCanvas.tsx:122`, `pdfjs-dist` at `pdf-extract.ts:21`); `@mapbox/search-js-core` static, matching
the pre-existing shape (`AddressAutocomplete.tsx:13`, `import/geocode.ts:3`). `app/demo/page.tsx` still
`next/dynamic(..., { ssr: false })`. No `'use client'` added to a marketing layout.

**Resource leaks — clear.** The only timers added in the fix range are R-12's and R-31's, both tracked
and cleared on re-arm *and* unmount. `persistDemoStore(store, null)` short-circuits to `NOOP_HANDLE`
before subscribing (`persistence.ts:531`), so wiring injected test stores through the real path (R-2)
adds no subscription and no timer. `PdfPreview`'s R-47 teardown, `DemoExperience`'s `syncTimer` +
pagehide listener, and `AlertDialog`'s Escape listener all still dispose. No `createObjectURL` anywhere.

**Browser-API correctness — clear.** No browser global at module scope: `readBrowserGeolocation()`
reads `navigator` at call time (`capture-gps.ts:37-41`), `defaultWriteClipboard` capability-checks
`navigator.clipboard?.writeText`, `reverseGeocode` reads the token inside the function.
`aria-disabled` did not widen the double-activation window — `useGpsCapture`'s `runningRef` is the real
mutex and is test-pinned. `useGpsCapture`'s unmount abort now also fires on a *location switch*
(`LocationFields.tsx:182` keys the control on `locationId`), which is a strict improvement to the
abort contract. Hydration N/A (`ssr: false`). `localStorage` still absent; sessionStorage still behind
`sessionStorageOrNull()`; snapshot key/version still bumped together.

**Render performance — clear and improved.** WEB-4/R-14 closed the two sites I raised plus the DST
advisory. Still no whole-store subscription, no selector returning a fresh object, no new
single-consumer state on the bridge.

**Accessibility — the three MAJORs closed; the round's idioms are now consistent** except NEW-WEB-1.
`AlertDialog` is the single blocking-dialog primitive (labelledby + describedby + focus in/out +
Escape); live regions sit outside their buttons; `aria-disabled` + guarded click is the new inert-control
idiom on two surfaces; `role="switch"` + `switchKeyDown` unchanged.

**CSS & style discipline — clear.** No `className` in `features/demo/ui`; `demo.css` untouched in both
rounds; no new keyframes; device-frame math untouched. `AlertDialog`'s new column variant is inline
`CSSProperties`, per the demo's convention.

**Deliberate choices honoured (not re-flagged).** D10; the §M13 2σ refutation; `asyncUtilTimeout: 5000`
itself (NEW-WEB-2 is about the *test* timeout that caps it, a different fact); `AlertDialog`'s
non-dismissing scrim; `aria-modal` without a focus trap (`deferred.md:164-167`) and PickerStage's
deliberate *omission* of `aria-modal` (:262-268); phone bugs not copied; snapshot v4 union;
orchestrator merge-integration commits; the OCR today-guess gate; ledger §29-§45. Fix-round
judgement calls read and accepted: §44a (Escape ≠ Cancel), §44b (`aria-disabled` CTA), §44c
(`calcOffset` default), §45a (R-7 took the stronger option).

**Not run.** `pnpm build` — `package.json` unchanged, no import moved between static and lazy, no
marketing file in either range, so the route table and per-route First Load JS cannot have moved.

---

## Observations for the next round (no action required)

- **Cancel placement differs between the two 3-action dialogs** shipped in this round. NotesScreen's
  `restoreAll`/`scrapAll` declare Cancel **last** (`NotesScreen.tsx:334-338, 366-370`); the OCR
  recalculate prompt declares it **first** (`OcrCaptureScreen.tsx:188-192`). Both comments claim
  phone-verbatim button order — and both may be faithful to their respective phone declaration arrays,
  since RN's `Alert.alert` on iOS re-positions a `style: 'cancel'` button to the bottom regardless of
  declaration order, while `AlertDialog` renders declaration order literally. Not filed as a finding:
  confirming which placement matches the device needs phone-side rendering evidence this lane does not
  have. Worth one screenshot on the phone before beta; if iOS does reorder, the OCR prompt's Cancel
  should move to the end (or `AlertDialog` should sort `style: 'cancel'` last itself, which would make
  every future caller correct by construction).
- **`blockedId` is shared by two sibling divs** in `OcrCaptureScreen` (see WEB-7 above) — safe only
  because the two conditions are strictly complementary.
