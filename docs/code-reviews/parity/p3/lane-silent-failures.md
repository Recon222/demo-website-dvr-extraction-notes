# P3 review — SILENT-FAILURES lane

**Branch:** `feat/parity-p3` @ `4e60680` · **Diff:** `git diff master...feat/parity-p3` (91 files, +11321/-317)
**Lane definition:** `.claude/agents/silent-failure-hunter.md` · **Contract read first:** `features/demo/CLAUDE.md`
**Phase context honoured (not re-flagged):** PR #32 body + deferred `§48`–`§56` — honest export notices,
`isDeleting` not ported (synchronous write), prior-phase choices, and the tracked `§15`/`§18`/`§28` items.

**Verdict: APPROVE with comments.** 0 CRITICAL, 0 HIGH, 1 MEDIUM, 3 LOW.

The fallback-honesty machinery this lane exists to protect is intact and, in two places, extended
correctly: the six-action chooser's export arms tell the truth on press instead of faking a download,
the duplicate/new-address failure arms surface a visible banner rather than closing quietly, and the
notice is portalled where it genuinely paints over an open modal (verified by z-index, below). The
one substantive finding is the sibling the assembly's own `§56b` no-op hunt missed.

---

## Findings

### [MEDIUM] `updateIncidentLocation` has no unknown-id guard — the `§56b` zustand no-op defect's surviving sibling, and its JSDoc says it does

**File:** `features/demo/engine/store/create-store.ts:506-509` (impl), `:220-225` (the doc that claims otherwise)

**Code:**
```ts
updateIncidentLocation: (caseId, patch) =>
  set((s) => ({
    cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
  })),
```
against its own action doc at `:224` — *"A no-op for an unknown id, like every other case-keyed writer here."*

It is not. Every other case-keyed writer P3 added takes a `get()`-first early return before `set`:

| Writer | Guard |
|---|---|
| `updateCase` | `:456` `if (!get().cases.some((c) => c.id === caseId)) return` |
| `setCaseStatus` | `:502-503` `const current = get().cases.find(…); if (!current \|\| current.status === status) return` |
| `deleteCase` | `:530` `if (!get().cases.some((c) => c.id === caseId)) return` |
| `deleteLocation` | `:558-559` `const loc = get().locations.find(…); if (!loc) return` |
| `setCameraGps` | `:691` `if (!loc \|\| !loc.form.cameras.some((c) => c.id === cameraId)) return` |
| **`updateIncidentLocation`** | **none** |

`updateCase`'s own comment two functions above states the rule this one breaks verbatim: *"a bare
`.map` would still allocate a new `cases` array, waking every subscriber and triggering a snapshot
write for nothing."*

**Adversarial input / sequence (arm 1 — reachable today):** Map tab → incident pin → *Edit Incident
Location* → press **Save Changes** without changing anything. `.map` allocates a fresh `cases` array
and a fresh case object regardless, so every `cases` subscriber wakes: `caseCards`, `actionSheetCase`,
`mapViewerCase`/`mapData` all recompute and the debounced persistence subscriber writes a snapshot —
for a write that changed nothing. This is precisely the shape `§56b` caught in `setCaseStatus`'s
`{}`-from-inside-`set`, one `.map` removed.

**Adversarial input / sequence (arm 2 — defence-in-depth, not reachable today):** with a `caseId` no
case owns, the visitor's edit is discarded and reported as saved — `submitIncidentLocation`
(`features/demo/ui/DemoExperience.tsx:824-827`) calls the action and then closes the modal
unconditionally, with no banner and no breadcrumb. I traced whether a case can be deleted underneath
an open editor and it cannot: the phone overlay root is `zIndex: 40` (`ui/PhoneFrame.tsx`, the
`ref={setOverlay}` div) while `TabBar` is `zIndex: 18`, and `ModalShell`'s scrim is `position:
absolute; inset: 0; pointerEvents: 'auto'` inside that root — so the tab bar is covered and the Cases
list is unreachable while the editor is up. The guard is what keeps that true if a later package
hoists the editor to an always-mounted slot (the shape `§49f` already records for `CaseActionsSheet`)
or adds any background writer.

**Observable wrong behaviour:** nothing the visitor sees today; a documented invariant that the code
does not implement, in the exact class of defect the P3 assembly just fixed one function away — and
the safety net the `§50g`/`§49f` "a future concurrent writer should re-check this" triggers assume is
already in place.

**Why the test suite did not catch it:** `features/demo/engine/logic/__tests__/incident-location.test.ts:144`
is titled *"touches only the named case, and no-ops on an unknown id"* but asserts only
`expect(store.getState().cases.some((x) => x.incidentBusinessName === 'ghost')).toBe(false)` — a
VALUE-level check that passes either way. That is the same assertion shape `§56b` records as the
reason P3.2's `setCaseStatus` test *"passed either way"* and P3.1's whole-state assertion is what
caught it. (Note `:155` deliberately asserts `cases` is a NEW array — for a *known* id, which is
correct and should stay.)

**Fix:** add P3.1's line verbatim before `set`:
```ts
updateIncidentLocation: (caseId, patch) => {
  if (!get().cases.some((c) => c.id === caseId)) return
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) }))
},
```
and upgrade the unknown-id arm of `incident-location.test.ts:144` to the whole-state pin
(`const before = store.getState(); …; expect(store.getState()).toBe(before)`), matching the stronger
assertion `store.test.ts` now carries at `setCaseStatus`'s call site.

---

### [LOW] A second notice raised inside 2.6 s inherits the first one's timer and can flash for milliseconds

**File:** `features/demo/ui/screens/map/DemoNotification.tsx:34-37`, consumed at
`features/demo/ui/DemoExperience.tsx:1811-1815`

**Code:**
```ts
useEffect(() => {
  const t = setTimeout(() => onDismissRef.current(), durationMs)
  return () => clearTimeout(t)
}, [durationMs])          // `message` is NOT a dep
```
```tsx
{notice && (
  <PhoneOverlayPortal>
    <DemoNotification message={notice} onDismiss={() => setNotice(null)} />
  </PhoneOverlayPortal>
)}
```
The element sits at a stable position in the tree, so a `notice` string change re-renders the *same*
instance: the message swaps, the 2600 ms timer does not restart.

**Adversarial input / sequence:** P3 is what makes this reachable — the bridge's `notice` is now a
single slot driven by seven strings (`LOCATION_NOT_FOUND_NOTICE`, `DUPLICATION_FAILED_NOTICE`,
`duplicatedNotice`, `newAddressCreatedNotice`, `NEW_ADDRESS_FAILED_NOTICE`, `EXPORT_ZIP_NOTICE`,
`EXPORT_GEOJSON_NOTICE`; `DemoExperience.tsx:185-202`). Duplicate a location — notice at t=0 — then
follow the rail's own tip for this modal (*"then re-open the chooser — the suggested name has moved
on"*, `engine/content/narration.ts`, `duplicateLocation`), and press **Export ZIP** at t≈2.4 s. The
export notice replaces the message and is dismissed 200 ms later.

**Observable wrong behaviour:** the two export actions have no other feedback by design — they close
the chooser and raise the banner, and that banner *is* the honest answer `§52.2` built ("Export ZIP
isn't available yet — it lands with the Export tab"). Truncated to a sub-perceptual flash, the visitor
presses a live-looking primary button and sees nothing happen: the dead-button shape the honest-notice
treatment exists to prevent. Same for a `NEW_ADDRESS_FAILED_NOTICE` landing on the heels of an earlier
banner.

**Fix:** one line at the call site — `<DemoNotification key={notice} …>` — or add `message` to the
effect's dep array in `DemoNotification`.

---

### [LOW] `§49g`'s owed `hasCapturedCoordinates` audit fired on P3.7, but `toMapData` was not gated — the case sheet and the map now disagree about the same (0,0) pair

**File:** `features/demo/ui/screens/map/mapData.ts:74-77` (incident) and `:84-88` / `:93-100` (locations)

**Code:**
```ts
const ic = viewerCase.incidentCoordinates
const incident: MapIncident | null = ic ? { id: viewerCase.id, …, lng: ic.lng, lat: ic.lat } : null
…
const located = locations.filter((l) => l.gps)
```
Presence-gated, not policy-gated. P3.7 introduced the shared policy (`engine/logic/coordinates.ts:60-68`)
whose own doc says *"Every demo surface that DISPLAYS or PLOTS a coordinate should gate on this rather
than on object presence"*, and applied it to three consumers — `notes/camera-formatter.ts`,
`pdf/case-notes.ts` (`camGpsRow`), and `screenData.ts` `toCaseSheet` — but not to the map.
`§49g` named the trigger explicitly: *"the map's `toMapData` and `CoordinateDisplay` were NOT audited
… Trigger: P3.7 (per-camera GPS) or P6.1 (map depth), whichever touches plotting first."* P3.7 touched
plotting (the PDF camera row and the case sheet's Coordinates row); the map half was not done.

**Adversarial input / sequence:** create a case, type `0` into Latitude and `0` into Longitude. Both
pass `parseCoordinate` (0 is in range for both axes), so `caseFormToInput` stores
`{ lat: 0, lng: 0, source: 'manual' }`.

**Observable wrong behaviour:** the Case Actions Sheet omits the Coordinates row (and drops the whole
*Incident Location* group when nothing else is filled) because `toCaseSheet` gates on
`hasCapturedCoordinates`; the Map tab plots the incident pin in the Gulf of Guinea and the detail card
prints `0.000000, 0.000000`. Two surfaces in the same session giving two answers about one stored pair.

**Why LOW and not higher:** the demo has no zero-init source — coordinates only arrive via
`parseCoordinate`, a geocode (`Number.isFinite`-validated) or a real fix — so the pair can only get
there by hand-typing it, which is arguably "what the visitor asked for". The finding is the
inconsistency and the un-discharged trigger, not a fabricated position.

**Fix:** gate `toMapData`'s `incident` and `located` on `hasCapturedCoordinates` (one import, two
predicates), or, if the audit is deliberately deferred again, say so in `§54` with a named trigger so
`§49g` is not left pointing at a package that has already shipped.

---

### [LOW] `MapScreen.onEditIncident` is optional but the "Edit Incident Location" CTA renders unconditionally — the inverse of the precedent `§49a` set one package earlier

**File:** `features/demo/ui/screens/map/MapScreen.tsx:26-27` and `:102`;
`features/demo/ui/screens/map/LocationDetailCard.tsx:70-72`

**Code:**
```ts
onEditIncident?(caseId: string): void
…
onEditIncident={(caseId) => onEditIncident?.(caseId)}
```
```tsx
<button type="button" style={cta} onClick={() => onEditIncident(item.id)}>
  {EDIT_INCIDENT_LABEL}
</button>
```

**Adversarial input / sequence:** any mount of `<MapScreen>` without the handler — a future route, a
storybook-style harness, or a bridge refactor that forgets the prop. The full-size primary CTA renders
identically and swallows every press through the optional-call.

**Observable wrong behaviour:** nothing today — the bridge wires it (`DemoExperience.tsx:1594`,
`onEditIncident={editIncident}`) and `LocationDetailCard`'s own prop is correctly *required*. The
finding is the inverted contract: `§49a` reasoned exactly this case one package earlier and chose the
other shape — `CaseActionsSheetProps.onEdit` is optional AND the button renders only when supplied,
"because a button that cannot do what it says would break the demo's honesty rule". Here the
optionality lives on the prop and the button ignores it. (`onChangeCase` / `onGoToLocation` carry the
same pre-existing shape on this component; this is the first one added *after* the honesty precedent
was written down.)

**Fix:** make `MapScreen.onEditIncident` required (the bridge already passes it), or gate the CTA on
the handler's presence the way `CaseActionsSheet` gates `Edit Case`.

---

## Traced and found clean — recorded so the fix-delta need not re-derive

**Notice portalling — can a notice render behind a sheet? No.** `DemoNotification` is `zIndex: 60`;
`ModalShell`'s scrim is `21` and its dialog `22` (`ui/screens/_shared.tsx:70,82`); both render into the
same `PhoneOverlayContext` root (`ui/PhoneFrame.tsx`, `zIndex: 40`, `pointerEvents: 'none'`), which is a
single stacking context. The banner therefore paints over an open modal, which is what makes the
new-address card's deliberate "stay open after a failed create" (phone parity, `§52.6`) safe. The banner
sets no `pointerEvents`, so it inherits `none` from the root and blocks nothing underneath.
`DeleteConfirmationModal` (60/61) and `AlertDialog` (60/61) tie or beat it, and both are rendered later
in document order — correct, and no path raises a notice alongside either.

**`DuplicateCaseNumberError`'s catch topology — it cannot escape.** `createCase`
(`create-store.ts:421-451`) throws before minting an id; its only call site in the whole app is
`submitCase` (`DemoExperience.tsx:794-803`), which deliberately does not catch. Both paths into it run
inside `NewCaseModal.performSubmit`'s `try` (`NewCaseModal.tsx:137-149`): edit mode via
`handleSubmit` → `performSubmit` (and edit routes to `updateCase`, which does not throw), create mode
via the confirmation dialog's `onPress` → `confirmSubmit` → `performSubmit`. The throw lands before
`setExpandedCaseId` and `closeCaseModal`, so a rejected create leaves no partial state and the form the
visitor typed is still on screen behind the banner. `§56i`'s claim that
`duplicateLocation`/`duplicateToNewAddress` cannot reach it holds — both mint locations via `nextId('l')`.

**Each duplicate null-arm is honest for its only reachable cause — with one wrong sentence on an
unreachable arm.** `duplicateLocation` returns `null` for source-gone or blank-name; the chooser
hard-`disabled`s both duplicate buttons *and* re-guards in `duplicate()`
(`DuplicateLocationModal.tsx:111-120`), so blank/taken is unreachable and
`DUPLICATION_FAILED_NOTICE` ("the source location couldn't be read") is true for the arm that can fire.
`duplicateToNewAddress` returns `null` for source-gone, blank-name or blank-street; `newLocationBlock`
plus the caller's `if (block !== null) return` (`NewLocationModal.tsx:218-222`) cover the last two, so
the only reachable arm is source-gone — for which `NEW_ADDRESS_FAILED_NOTICE` ("a name and street
address are required") is the wrong sentence. Demoted rather than filed: I could not construct a
sequence that reaches it (the card is a modal; the source can only be deleted from the Cases list,
which the scrim covers). Worth one line in `§52` if the fix round is touching that file anyway.

**Per-camera GPS failure paths in a row list — clean.** Each row owns its own `useGpsCapture`
instance, so failures cannot cross rows: `role="alert"` error line and `role="status"` sample readout
are both keyed `camera-gps-${cameraId}` (`ui/inputs/CameraGpsCapture.tsx:157-167`), and the promise
chain carries an explicit `.catch` breadcrumb for an unexpected throw (`:125-129`, R-13's shape).
`CameraGpsCapture`'s header claim that unmount aborts the capture is TRUE — `useGpsCapture` passes
`isAborted: () => abortedRef.current` (`ui/inputs/useGpsCapture.ts:93`) and `captureGps` returns `null`
at its checkpoints, so `capture()` resolves `null` and `onCapture` never runs. `setCameraGps`'s
by-id re-resolution is the genuine second layer. The two silent drops (row removed, location switched)
are `§54f`'s documented deliberate ones and the visitor caused both by their own gesture.

**The incident editor's abandoned-lookup silence (`§53`) — honest; the lane agrees with the deferral.**
`abandonLookups()` (`ui/inputs/IncidentLocationFields.tsx:163-166`) bumps `requestSeq` and drops the
spinner when an address *pick* supersedes an in-flight reverse lookup; the retired request then returns
at `requestSeq.current !== mine` without calling `onReverseGeocodeError`, and the pick's own
`onReverseGeocodeError?.(null)` (`:256`) clears the banner. Nothing is hidden: the in-flight lookup was
started from coordinates the pick has just replaced, so its result is stale input, not a suppressed
failure — and letting it settle would be the actual silent corruption (it would write the *previous*
address over the picked one; the phone has that gap at `handleAddressSelect`, and the demo closes it).
`runReverseGeocode` clears on start, reports `REVERSE_GEOCODE_UNAVAILABLE` on no-match/throw and
`REVERSE_GEOCODE_PARTIAL` on a half-resolve, all `mounted` + `requestSeq` guarded, and its `catch` is
character-for-character `LocationFields`' reviewed treatment. The operator breadcrumb lives where the
lane's rules put it — `ui/inputs/reverse-geocode.ts:45`, still present.

**`deleteCase`/`deleteLocation` cascades + selection repair — nothing silently dropped.** All four
pair states traced through `deleteCase` (`create-store.ts:529-546`): open location survives →
`currentCaseId` re-derived from it and `capture` kept; open location dies → both halves null and
`capture` blanked; no open location but the doomed case selected → `currentCaseId` null, `capture`
correctly *not* blanked; unrelated case selected → untouched. `deleteLocation` moves only the location
half plus `capture`, matching the phone's own asymmetry (`cases.tsx:651-654`), and unlinks
`locationIds`. `confirmDelete` (`DemoExperience.tsx:872-885`) repairs the three bridge-local shadows
the store cannot know about — `expandedCaseId`, `mapViewerCaseId`, `reviewAgainFor` — and reads
`locations` from the pre-delete render closure, which is required for the case arm's ownership test and
is correct. The remaining bridge state holding a case/location id (`targetCaseId`, `caseEditId`,
`incidentCaseId`, `dupState`, `newAddrState`, `imp.lastLocId`) is all modal-scoped and unreachable
while a delete is possible; `caseEditId` additionally has the explicit create-mode fallback at
`:1604-1611`, discharging `§50g`'s reachable half.

**No-op-write discipline beyond the finding above.** `updateCase`, `setCaseStatus`, `deleteCase`,
`deleteLocation`, `setCameraGps`, `duplicateLocation` and `duplicateToNewAddress` all take a
`get()`-first early return. `completeCase`, `updateField`, `applyImport`, `addMedia`, `deleteMedia`
carry the same bare-`.map` shape but are unchanged by this diff (pre-P3, out of lane scope).
`updateIncidentLocation` is the one the diff added.

**Operator breadcrumbs.** No `console.warn`/`console.error` was removed anywhere in the diff; one was
added (`CameraGpsCapture.tsx:128`). `generateExtractedScopes`' dev-warn + `extractedScopesPartial`
flag, `applyImport`'s event-scoped warn, and `PhoneOverlayPortal`'s dev warn are all intact.

**Partial-result flags.** No new partial-result path was introduced. `cloneScopesWithNewIds`
(`engine/store/helpers.ts`) blanks `cameras` *by contract* rather than dropping entries, and
`duplicatedForm` starts every DVR-derived field blank — no counted-and-flagged treatment is owed
because nothing is silently short.

**Stale async writes.** The only new store write behind an `await` is the camera fix, guarded twice
(abort + by-id re-resolution). `IncidentLocationFields` guards its two post-await writes with
`mounted` + a monotonic `requestSeq`. `NewLocationModal`'s draft token (`§45f`) is minted per open for
BOTH callers, including the new-address card (`DemoExperience.tsx:676` and `:738`), and `locForm` is
blanked on each open — so a lookup left over from one card cannot seed the other. The import
generation token is untouched by this diff.

## Observation for another lane (not a silent failure)

`features/demo/ui/screens/DashboardScreen.tsx:44-83` still defines a private `useLongPress`, so
`§56f`'s "ONE `useLongPress`" is in fact two implementations, not one. It is behaviourally safe here —
the dashboard card has no click handler of its own, and `onPointerDown` bails when the press starts
inside a `<button>`, so the shared hook's capture-phase swallow is not needed. Flagged for the
type-design / TS lane rather than filed here.

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 3 |

Fallback honesty (every substitution announced): **yes** — the chooser's export arms, the duplicate
failure arms and the new-address failure arm all raise a visible banner; nothing simulated is presented
as real.
Failure-cause distinctions preserved: **yes** for every reachable arm (one unreachable arm carries the
wrong sentence — recorded, not filed).
Partial results flagged (not silently short): **n/a** — no new partial-result path.
Async cancellation / stale-write safety: **yes** — abort + by-id re-resolution on the camera fix,
`mounted` + `requestSeq` on the incident lookup, per-open draft tokens on both `NewLocationModal` callers.
Operator breadcrumbs intact: **yes** — none removed, one added.

**Verdict: APPROVE** (with the MEDIUM and three LOWs above as comments).
