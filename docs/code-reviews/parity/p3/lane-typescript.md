# P3 review — TYPESCRIPT lane

**Scope:** `git diff master...feat/parity-p3` @ `4e60680` (91 files, +11321/−317).
**Lane definition:** `.claude/agents/typescript-reviewer.md` — type safety, async correctness,
error handling, RSC/`'use client'` boundaries, demo-architecture compliance. Browser/perf/a11y/CSS
is the web lane; test quality is the test lane; error-swallowing is the silent-failure lane;
invariant modelling is the type-design lane.

**Gates run in the worktree (evidence, not assumption):**

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | clean, exit 0 (no pre-existing drift to filter) |
| `pnpm exec vitest run features/demo/engine/store features/demo/ui/screens features/demo/ui/__tests__ features/demo/ui/primitives` | 92 files / 952 tests passed |
| `grep -rn "useStore" features/demo/ui` (store bridge) | zero hits outside `DemoExperience.tsx` |
| `grep -rn "from 'react'\|'use client'" features/demo/engine` | zero hits — engine purity intact |
| `grep -rn "features/demo" components app/\(default\) lib` | no marketing→demo import (only comments + the pre-existing server route `app/api/extract/route.ts`) |
| `grep -n "Date.now\|Math.random\|new Date()"` over changed non-test `.ts(x)` | only `realNow`/comments already in place pre-P3; no new id/key/render-scope clock read |
| `grep -n ": any\|as any\|<any>"` over changed non-test `.ts(x)` | zero (one prose hit: "has any business here") |

**Merge order** verified from git history, not from the brief: `p3-dashboard` → `p3-locgps` →
`p3-incident` → `p3-crud` → `p3-newcase` → `p3-duplicate`, then `§56` assembly + `4e60680`.
This ordering is directly relevant to TYPESCRIPT-3 below — dashboard landed **first** and was
therefore outside the three-way reconciliation `§56f` describes.

**Verdict: APPROVE with comments** — 0 CRITICAL, 0 HIGH, 3 MEDIUM, 2 LOW.

---

## TYPESCRIPT-1 [MEDIUM] features/demo/ui/DemoExperience.tsx:794-803 (and :1602-1612)

**Claim.** The New Case sheet's *mode* is derived twice, from two different sources, and the
diff's own comment states that the case where they disagree is reachable. The render derives it
from `cases.find(c => c.id === caseEditId)`; the submit derives it from `caseEditId` alone. When
the seeded case disappears the sheet falls back to **create** mode while `submitCase` stays in
**edit** mode, so "Create Case" creates nothing.

**Evidence.**

Render side (`:1602-1612`), with the comment that names the trigger:

```tsx
const editing = caseEditId === null ? undefined : cases.find((c) => c.id === caseEditId)
// A case deleted while its edit sheet is open falls back to create mode rather than
// rendering an edit sheet with no case behind it (P3.1's delete makes that reachable).
return editing ? (
  <NewCaseModal mode="edit" existingCase={editing} … />
) : (
  <NewCaseModal form={caseForm} … />          // create mode
)
```

Submit side (`:794-803`) — a different discriminator:

```tsx
const submitCase = () => {
  if (caseEditId !== null) {
    store.getState().updateCase(caseEditId, caseFormToEdits(caseForm))
    closeCaseModal()
    return
  }
  const id = store.getState().createCase(caseFormToInput(caseForm))
  …
}
```

Concrete failure: `caseEditId = 'c1'`, `cases` no longer contains `c1`. The sheet renders titled
"New Case", the Case Number field is editable and seeded with the deleted case's number, the
primary button reads "Create Case", and pressing it raises the create-mode confirmation
(`NewCaseModal.tsx:283-293`, "…can't be changed after the case is created"). Confirming calls
`submitCase`, which takes the `caseEditId !== null` branch, calls `updateCase('c1', …)` —
a true no-op by `create-store.ts:456`'s unknown-id guard — and closes the modal. The visitor
was shown a create confirmation and got no case, with nothing logged and no banner.

Reachability, checked rather than assumed: `pendingDelete` is only ever set from `CasesScreen`
(`:1371-1372`), and `ModalShell` renders a full-screen scrim at `z-index: 21`
(`_shared.tsx:69`) over the screen subtree, so the Cases rows are not clickable while the sheet
is open. `returnToCases()` (`:580-593`) closes the modal but leaves `caseEditId` set — however
every opener (`newCase`, `editCase`) re-seeds both, so no stale-open path exists either. **The
divergence is therefore latent today, not user-reachable** — which is why this is MEDIUM and not
HIGH. It is still worth closing: the code deliberately implements a fallback for exactly this
scenario and the fallback is only half-applied, so a maintainer reading `:1605-1606` will
reasonably believe the case is handled.

**Suggested fix.** Derive the mode once and thread it. Either resolve `editing` above
`activeModal()` and have `submitCase` branch on `editing` (not `caseEditId`), or have the
fallback arm clear the id it is falling back from:

```tsx
const editingCase = caseEditId === null ? undefined : cases.find((c) => c.id === caseEditId)
// submitCase: if (editingCase) { updateCase(editingCase.id, …) } else { createCase(…) }
```

**Confidence.** High that the two discriminators can disagree (both read, both quoted above, and
the divergence is a plain consequence of one resolving the id and the other not). High that the
consequence is a silent no-op. Medium-low on user reachability — I could not construct a UI path,
and I checked the scrim, the delete entry points and the error-boundary recovery path.

---

## TYPESCRIPT-2 [MEDIUM] features/demo/engine/store/create-store.ts:220-225, 506-509

**Claim.** `updateIncidentLocation` is documented as "A no-op for an unknown id, like every other
case-keyed writer here". It is not. It is the one new case-keyed writer in P3 that omits the
`get()`-first guard, so an unknown id still allocates a fresh `cases` array — the exact defect
class the assembly found and fixed on `setCaseStatus` (deferred §56b) and deliberately guarded on
`updateCase` and `deleteCase`.

**Evidence.**

The declaration (`:220-225`):

```ts
/** Incident-location-only edit… A no-op for an
 *  unknown id, like every other case-keyed writer here. */
updateIncidentLocation(caseId: string, patch: IncidentLocationPatch): void
```

The implementation (`:506-509`) — no guard:

```ts
updateIncidentLocation: (caseId, patch) =>
  set((s) => ({
    cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)),
  })),
```

`Array.prototype.map` always returns a new array, so for an unknown id `cases` changes identity:
every `cases` selector re-runs and the persistence subscriber writes a snapshot for a write that
changed nothing. That is verbatim the reasoning the two siblings carry:

- `updateCase` (`:454-456`): *"Unknown id is a genuine no-op (P3.1): a bare `.map` would still
  allocate a new `cases` array, waking every subscriber and triggering a snapshot write for
  nothing."* → `if (!get().cases.some((c) => c.id === caseId)) return`
- `setCaseStatus` (`:493-503`): *"The early return has to happen OUTSIDE `set`…"* →
  `const current = get().cases.find(…); if (!current || current.status === status) return`
- `deleteCase` (`:527`): `if (!get().cases.some((c) => c.id === caseId)) return`

`crud-actions.test.ts:73-78` pins the guarantee at whole-state granularity for `updateCase`
(`expect(store.getState()).toBe(before)`); `updateIncidentLocation` has no equivalent arm, which
is why the gap survived the assembly.

Blast radius is small — the only caller is `submitIncidentLocation` (`DemoExperience.tsx:825`),
which guards `if (incidentCaseId)` and seeds that id from a case it just found (`:808-814`), so
an unknown id is not reachable through the UI today. The finding is that the contract stated on
the action is untrue, in a file whose whole discipline is that these contracts are exact.

**Suggested fix.** One line, matching `updateCase`:

```ts
updateIncidentLocation: (caseId, patch) => {
  if (!get().cases.some((c) => c.id === caseId)) return
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) }))
},
```

(or, if the doc line is the thing that is wrong, delete the "no-op for an unknown id" sentence —
but the guard is cheaper than the divergence).

**Confidence.** High. Read both the declaration and the implementation; the sibling writers in the
same file establish both the rule and the correct shape.

---

## TYPESCRIPT-3 [MEDIUM] features/demo/ui/screens/DashboardScreen.tsx:23, 44-79

**Claim.** P3 ships **two** `useLongPress` implementations, not one. The assembly reconciled
P3.1's and P3.5's copies into `ui/primitives/useLongPress.ts` (deferred §56f) but did not notice
that P3.2's dashboard — merged **first**, at `3baec48`, before either of them — carries a third,
private copy inside `DashboardScreen.tsx`, together with its own `const LONG_PRESS_MS = 500`
shadowing the shared module's exported constant. §56f's own guard rail ("a shared primitive added
at a new path will not conflict with the same primitive at an old one") describes exactly this,
and the sweep it prescribes was not run against the dashboard.

**Evidence.**

```
$ grep -rn "useLongPress\|LONG_PRESS_MS" features/demo --include='*.ts' --include='*.tsx'
features/demo/ui/screens/CasesScreen.tsx:7:    import { useLongPress } from '@/features/demo/ui/primitives/useLongPress'
features/demo/ui/screens/DashboardScreen.tsx:23:  const LONG_PRESS_MS = 500          ← second constant
features/demo/ui/screens/DashboardScreen.tsx:44:  function useLongPress(onLongPress: () => void)   ← second hook
features/demo/ui/primitives/useLongPress.ts:44:  export const LONG_PRESS_MS = 500
…
features/demo/ui/screens/__tests__/CasesScreen.row-actions.test.tsx:5: imports LONG_PRESS_MS from primitives
features/demo/ui/screens/__tests__/appChapters.test.tsx:5:            imports LONG_PRESS_MS from primitives
features/demo/ui/__tests__/DemoExperience.duplicate.test.tsx:5:        imports LONG_PRESS_MS from primitives
```

The two hooks are not equivalent, so this is duplication *with drift already in it*:

| | `primitives/useLongPress.ts` | `DashboardScreen.tsx` private copy |
|---|---|---|
| trailing-click swallow | `onClickCapture` + `swallowNextClick` (`:121-127`) | none |
| keyboard exemption | `e.detail === 0` (`:124`) | n/a |
| movement tolerance | `MOVE_TOLERANCE_PX = 10` (`:107-113`) | none |
| `enabled` gate + cancel-in-flight | yes (`:82-84, 89`) | none |
| nested-control exclusion | none (rows own the whole strip) | `e.target.closest('button')`, **pointerdown only** (`:57`) |
| double-fire latch | swallow flag | `firedRef` (`:36, 66, 74-77`) |

Concrete consequence of the asymmetric nested-control exclusion: `onContextMenu` (`:71-79`) has
no `closest('button')` check, so a right-click on a location pill or on the card's own ⋯ button
bubbles to the card and opens the Case Actions Sheet — the pill's and the ⋯ button's own
semantics are bypassed. The shared hook has no such split because its two branches agree.

Second consequence, the durable one: three suites pin the hold beat by importing `LONG_PRESS_MS`
**from `primitives/`**. The dashboard's copy is not linked to that constant, so changing the
shared beat leaves the dashboard on 500 ms with every test still green.

**Suggested fix.** Delete the private hook and constant; import the shared one:

```tsx
import { useLongPress } from '@/features/demo/ui/primitives/useLongPress'
…
const longPress = useLongPress(() => onCaseActions(card.id))
```

The dashboard card body has no `onClick` of its own, so the shared hook's swallow is inert there
(harmless). The one behaviour that has to survive the swap is "a hold started on a nested control
does not arm" — either lift `e.target.closest('button')` into the shared hook (it is correct for
the Cases rows too, whose row button and ⋯ trigger are siblings) or spread the shared handlers and
wrap `onPointerDown`/`onContextMenu` at the dashboard call site.

**Confidence.** High on the duplication and on the constant shadowing (grep output above, both
files read in full). High on the right-click consequence (the handler is quoted; the exclusion is
demonstrably present in one branch and absent in the other).

---

## TYPESCRIPT-4 [LOW] features/demo/ui/screens/map/DemoNotification.tsx:34-37

**Claim.** The auto-dismiss effect's dependency array omits `message`, so a second notice raised
while the first is still on screen inherits the first's *remaining* lifetime instead of a fresh
one. `DemoNotification` is unchanged by this diff, but P3 takes it from one producer (the map's
Call/Email notice) to eight, which is what makes the gap worth closing now.

**Evidence.**

```tsx
useEffect(() => {
  const t = setTimeout(() => onDismissRef.current(), durationMs)
  return () => clearTimeout(t)
}, [durationMs])
```

The bridge renders it positionally, so a new `notice` value re-renders the *same* element rather
than remounting it (`DemoExperience.tsx:1811-1815`):

```tsx
{notice && (
  <PhoneOverlayPortal>
    <DemoNotification message={notice} onDismiss={() => setNotice(null)} />
  </PhoneOverlayPortal>
)}
```

New producers added by P3: `LOCATION_NOT_FOUND_NOTICE` (×2 paths), `duplicatedNotice`,
`DUPLICATION_FAILED_NOTICE`, `newAddressCreatedNotice`, `NEW_ADDRESS_FAILED_NOTICE`,
`EXPORT_ZIP_NOTICE`, `EXPORT_GEOJSON_NOTICE` (`DemoExperience.tsx:185-202`). Sequence: press
"Export ZIP" from the chooser (notice A, t=0); reopen the tray and press "Export GeoJSON" at
t≈2400 ms (notice B). A's timer fires at 2600 ms and clears B after ~200 ms.

**Suggested fix.** `}, [durationMs, message])` — or key the element (`key={notice}`) at the
bridge. Either restarts the countdown per message.

**Confidence.** High on the mechanism (effect deps + positional reconciliation, both read).
Medium on how often a visitor actually hits the <2.6 s window.

---

## TYPESCRIPT-5 [LOW] features/demo/ui/DemoExperience.tsx:824-827, 1628-1629

**Claim.** The incident editor's two close paths (Save and Cancel) call `closeModal()` without
clearing `incidentCaseId` / `incidentForm`, so the bridge keeps the previous case's id and its
seeded values after the sheet is gone. That is the exact shape the assembly deliberately hardened
on the sibling modal one release earlier (§56j: *"Clearing the id alone left the previous case's
VALUES in the form; every UI entry blanks them on open so nothing was reachable, but the guarantee
belongs at the close rather than resting on every future opener remembering to"*).

**Evidence.**

```tsx
const submitIncidentLocation = () => {
  if (incidentCaseId) store.getState().updateIncidentLocation(incidentCaseId, incidentValuesToPatch(incidentForm))
  store.getState().closeModal()                       // ← incidentCaseId / incidentForm survive
}
…
case 'editIncident':
  return <EditIncidentLocationModal … onCancel={() => store.getState().closeModal()} />
```

versus the hardened sibling (`:639-643`):

```tsx
const closeCaseModal = () => {
  setCaseEditId(null)
  setCaseForm(blankCaseForm)
  store.getState().closeModal()
}
```

Not reachable today: `editIncident` (`:808-814`) re-seeds both before opening, `modal` is excluded
from the snapshot (`persistence.ts:366-378`), and `'editIncident'` has no other `openModal` caller.
Also note `activeModal()`'s `'editIncident'` arm renders unconditionally, where the two P3.5 arms
guard on their own state being non-null (`dupState ? … : null`, `newAddrState ? … : null`) — so
this modal has neither the close-side clear nor the render-side guard.

**Suggested fix.** A `closeIncidentModal()` mirroring `closeCaseModal`, used by both `onCancel`
and the tail of `submitIncidentLocation`:

```tsx
const closeIncidentModal = () => {
  setIncidentCaseId(null)
  setIncidentForm(blankIncidentForm)
  store.getState().closeModal()
}
```

**Confidence.** High that the clear is absent and that the sibling establishes the house rule.
High that it is unreachable today — hence LOW.

---

## Checked and found sound (inventory for the fix-delta pass)

Recording what was examined and cleared, so a resumed round does not re-derive it.

**Store / CRUD / selection repair (the R-19 law, HANDOFF §7 store-territory brief).**
`deleteCase` (`create-store.ts:527-546`) is written as a derivation, not a pair of conditional
clears, and I walked all four states: (a) unrelated case deleted with a location open → pair
re-derived from the surviving open location, `capture` untouched; (b) owning case deleted →
both halves null, `capture` blanked, and the `s.currentLocationId !== null` qualifier correctly
skips the blank when nothing was open; (c) no location open, `currentCaseId` is the doomed case →
case half cleared; (d) an *incoherent* input pair (case B selected, case A's location open) is
repaired, not propagated, because `currentCaseId` is read off the surviving location. `deleteLocation`
(`:555-571`) moves only the location half, with `capture` following it — matching the phone's
`cases.tsx:651-654` and leaving the same coherent "case selected, no location open" pair
`createCase` produces. Neither writer can leave the pair pointing across cases. `duplicateLocation` /
`duplicateToNewAddress` deliberately touch no selection at all; the bridge's `openLocation(id)` →
`switchLocation` is what moves it for the new-address flow, and that writer sets both halves.
`loadSnapshot`'s repair block (`persistence.ts:456-473`) is intact and still derives
`currentCaseId` from the open location. The bridge's `onComplete` re-derivation
(`DemoExperience.tsx:484, 1306-1323`) — the defense-in-depth the brief says must not be
"simplified" away — is untouched.

**`CaseEdits` / `UpdateCaseInput` immutability typing.** `CaseEdits = Omit<NewCaseInput,
'caseNumber'>` (`create-store.ts:92`) is genuinely machine-checked, not merely asserted: the
probe in `crud-actions.test.ts:80-96` spreads a valid base and adds one extra key per arm, so
excess-property checking is the thing being tested, and `tsc --noEmit` passing means all four
`@ts-expect-error`s are *used* (an unused one is itself an error). `caseNumber` / `status` /
`locationIds` / `id` are all unreachable through the type. The total-not-partial choice (§56c) is
honoured by the writer, which assigns every field unconditionally including
`incidentCoordinates: edits.incidentCoordinates` — so clearing a field really clears it.

**Unified `submitBlocked` / `Field.error` API (§56d, §56e).** All three `ModalActions` call sites
audited. `submitBlocked` is presentation-only and every caller that passes it carries its own
validate-and-return guard: `NewCaseModal.handleSubmit` (`:155-165`) validates and returns before
submitting, `NewLocationModal` (`:218-221`) refuses on `block !== null`. `EditIncidentLocationModal`
passes no `submitBlocked` and needs none. The "error replaces hint" rule is implemented as the
phone has it (`_shared.tsx:236-243`: `error ? <div role="alert" …> : hint && <div …>`), and both
live callers pass a *constant* string from a conditionally-mounted node
(`NEW_LOCATION_BLOCK_MESSAGES.duplicateName`, `NAME_TAKEN_ERROR`), which is what makes §56e's
`role="alert"` reasoning hold at the call sites that exist.

**Duplicate store actions (§56b, §56c, §56f).** `archiveCase`/`reopenCase` are gone; `setCaseStatus`
is the single status writer and carries the `get()`-first early return plus the no-change short
circuit. One `updateCase`. One `NewLocationModal` mount shape. The one duplicate that survived is
TYPESCRIPT-3.

**Per-camera GPS, id-resolved writes (§54, §45f).** `setCameraGps` (`:682-699`) resolves
`currentLocationId` and then the camera *by id* at write time and drops the write if either is
gone — correct for a capture that can run 120 s under `PRECISE_GPS_CONFIG` while the row list is
editable. I verified the "camera ids are globally unique" premise the comment leans on: the only
producer is the bridge's `blankCamera()` (`ui-c${uiSeq++}`), `duplicatedForm` blanks `cameras`, and
neither `applyImport` nor any other store path mints a `CameraEntry`. `CamerasScreen` correctly
passes `onCaptureGps` straight through rather than reusing the index-based `cam.change`, with the
reason stated at the call site (`DemoExperience.tsx:1506-1512`). `CameraGpsCapture.onClick` guards
re-entry on `isCapturing`, and its `.catch` re-throw backstop logs rather than swallowing.
`CameraGpsFix.source = Extract<GpsSource, 'gps'>` stays linked to the canonical union, and
`persistence.ts:182-190`'s `z.literal('gps')` under `satisfies FullShape<…>` is the intended
compile-time alarm if it ever widens. `capturedAt` is passed through from `GpsFix.capturedAtIso`
in `toCameraGpsFix` — no clock read anywhere on that path (§54a confirmed in code).

**Incident editor seed-once semantics.** The phone's `useState(() => caseToIncidentValues(…))` is
lifted to the bridge (`editIncident`, `:808-814`) and the modal itself is store-free, so the
store-bridge rule holds. `IncidentLocationFields`' post-await writes are guarded by *both* a
`mounted` ref and a monotonic `requestSeq` (`:148-196`) — the generation-token discipline the lane
definition requires of any new async flow that writes after an await — and `abandonLookups()` on
an address pick correctly retires in-flight lookups without letting their `finally` strand the
spinner (a guard the phone lacks, noted at `:238`). `incidentValuesToPatch` is derived
`Pick<DemoCase, …>`, so the write surface cannot drift.

**Async correctness elsewhere.** No new `forEach(async …)`, no new bare `Promise.all` where partial
tolerance is wanted, no new `setState`-after-unmount path. The import pipeline's `importGen`
token discipline is untouched by this diff. `createCase`'s new throw is caught at the one call
site that can produce it (`NewCaseModal.performSubmit`, `:137-149`, narrowing
`DuplicateCaseNumberError` → typed message, `Error` → its message, else a fallback string) and
`submitCase` deliberately does not swallow it (§50c).

**PDF / XSS.** The new per-camera GPS row (`pdf/case-notes.ts:214-217`) interpolates only
`gps.lat.toFixed(6)` / `gps.lng.toFixed(6)` / `Math.round(gps.accuracyM)` and still runs them
through `e()` (`escapeHtml`); all three are numbers by type. Gated by the shared
`hasCapturedCoordinates`, so a (0,0) failed fix cannot print as an authoritative position.

**Registry / determinism / barrel.** No hand-typed step numbers. New `ModalId` members are
registered in `MODAL_IDS` (`persistence.ts:330-338`) under the `Record<ModalId, true>`
exhaustive-by-construction device, and §56l's "widening the allow-list needs no `SNAPSHOT_VERSION`
bump" reasoning is correct — the bump to 5 is for `CameraEntry.gps`'s new required members, which
*is* a persisted value-shape move. `cloneScopesWithNewIds` takes `nextId` as an injected parameter
rather than minting ids in the engine. New `useId()` calls (`_shared.tsx`, `NewLocationModal`,
`DeleteConfirmationModal`) are React-deterministic and are not id/key generation in the banned
sense. Engine barrel additions follow the established pattern (the barrel has effectively one
runtime consumer plus `barrel.test.ts`), so they are not flagged as dead exports.

**`useLongPress` (the shared one).** Read in full. The `onClickCapture` swallow is correct for
rows holding more than one interactive child; `swallowNextClick` is reset at `onPointerDown` so a
hold released off-element cannot eat the next genuine tap (the `2b18a0a` fix); `detail === 0`
keeps keyboard activation unswallowed and also drains a stale flag. The returned handler object is
fresh per render, but all gesture state lives in refs, so no pointerdown/pointerup pair can be
orphaned by an identity change mid-gesture.

**Deliberate choices honoured (not flagged, per the brief):** case-sensitivity split
(`case-number.ts` case-SENSITIVE vs `location-name.ts` case-INSENSITIVE, cross-referenced both
ways); `aria-disabled` validate-on-click; `setCaseStatus`/`updateCase` separation; the honest
export notices; no incident GPS capture; `DeleteConfirmationModal` not built on `AlertDialog`;
snapshot v5; dropped redundant parallel tests; `minItems={1}` not ported; `sampleCount` dropped
from the camera fix; `duplicated_from` not modelled; `isDeleting`/`isSubmitting` not ported.
