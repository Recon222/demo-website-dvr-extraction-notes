# P3 review — TYPESCRIPT lane

**Round 1 (initial):** `git diff master...feat/parity-p3` @ `4e60680` — APPROVE with comments,
0 CRITICAL / 0 HIGH / 3 MEDIUM / 2 LOW.
**Round 2 (fix-delta):** fix commits `ec20686…3cecfcc` on `feat/parity-p3`, verified @ `3cecfcc`.

**Lane definition:** `.claude/agents/typescript-reviewer.md` — type safety, async correctness,
error handling, RSC/`'use client'` boundaries, demo-architecture compliance.

---

# FIX-DELTA — round 2

## Verdict: **APPROVE.** 5 of 5 filed findings FIXED. 0 new findings. The one refuted fix-shape is upheld.

### Gates re-run in the worktree @ `3cecfcc`

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | **exit 0, zero output** |
| `pnpm exec vitest run` (full suite) | **189 files / 1906 tests passed** — matches the orchestrator's figure |
| `grep -rn "useStore" features/demo/ui` | still zero hits outside `DemoExperience.tsx` |
| `grep -rn "from 'react'\|'use client'" features/demo/engine` | still zero — engine purity intact |
| `grep -rn ": any\|as any"` over fix-round production files | zero |
| Production files touched by the round | 14, all under `features/demo/` — no marketing/`app/`/`lib/` file touched, isolation unchanged |

### Status table

| Lane ID | R-number | Severity | Status | Fix commit |
|---|---|---|---|---|
| TYPESCRIPT-1 | R-11 (MINOR) | MEDIUM | **FIXED** | `3c77199` |
| TYPESCRIPT-2 | R-4 (MINOR, merged) | MEDIUM | **FIXED** | `76abf1c` |
| TYPESCRIPT-3 | R-1 (MAJOR, merged) | MEDIUM | **FIXED** | `ec20686` |
| TYPESCRIPT-4 | R-8 (MINOR, merged) | LOW | **FIXED** | `6616716` |
| TYPESCRIPT-5 | R-12 (MINOR) | LOW | **FIXED** | `3c77199` |

---

## TYPESCRIPT-1 → R-11 — **FIXED** (`3c77199`)

**Was:** the New Case sheet derived its mode from `cases.find(caseEditId)` (render) and
`caseEditId !== null` (submit). When they disagreed — the deliberate create-mode fallback for a
case deleted out from under an open sheet — the sheet presented "Create Case" + the create
confirmation and then took the *edit* branch into `updateCase`'s guarded no-op: a confirmed
creation that created nothing, silently.

**Now** (`DemoExperience.tsx:801-812, 815-822, 1634-1645`): one derivation, both halves read it.

```tsx
const editingCase = caseEditId === null ? undefined : cases.find((c) => c.id === caseEditId)
…
const submitCase = () => {
  if (editingCase) {
    store.getState().updateCase(editingCase.id, caseFormToEdits(caseForm))
    …
  }
  const id = store.getState().createCase(caseFormToInput(caseForm))
```

and the render arm now branches on the same `editingCase`, with a comment stating the reason
("the sheet can never present one mode and commit the other").

**Verified beyond the diff.** I re-traced the fallback end to end rather than trusting the label:
with the case gone, `submitCase` takes the **create** branch, and `caseForm.caseNumber` still
holds the deleted case's number — which is now *free*, so `assertCaseNumberFree` passes and a case
is genuinely created. The fallback is therefore coherent, not merely consistent: the sheet says
"Create Case" and a case is created. `closeCaseModal()` then clears both `caseEditId` and
`caseForm` (§56j), so nothing is inherited. The commit body states the pin is written against the
store (no UI path can reach the state) and that restoring the second discriminator reddens it;
the suite is green with the pin present.

---

## TYPESCRIPT-2 → R-4 — **FIXED** (`76abf1c`)

**Was:** `updateIncidentLocation` documented "A no-op for an unknown id, like every other
case-keyed writer here" and had no guard, so an unknown id still allocated a fresh `cases` array
(subscriber wake + snapshot write) — the §56b defect class the assembly fixed one function up.

**Now** (`create-store.ts:506-516`): the `get()`-first early return, matching `updateCase` and
`deleteCase` verbatim.

```ts
updateIncidentLocation: (caseId, patch) => {
  if (!get().cases.some((c) => c.id === caseId)) return
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) }))
},
```

**The test that hid it was fixed too**, which is the part that matters for recurrence.
`incident-location.test.ts:150-157` was titled "no-ops on an unknown id" and asserted only that a
ghost name was absent — true with or without the guard, exactly the shape §56b records for the
sibling. It now carries the house whole-state pin (`expect(store.getState()).toBe(before)`), the
same assertion `crud-actions.test.ts:73-78` makes for `updateCase`.

**Judged and agreed — the deliberate non-fix.** The commit declines to add deep no-change
comparison for a *known* id whose patch changes nothing. That is right: `updateCase` has the
identical property, no sibling does value comparison, and adding it to one writer would be a new
divergence rather than a fix. My finding claimed only the unknown-id contract; it is closed.

**Bonus in the same commit (R-5, not my finding, my blast radius).** `IncidentLocationPatch`'s
`incidentCoordinates` moved from `Pick`ed-optional to **required-but-nullable**, which is the
correct call for a writer that *spreads* — under an optional key, `{}` and
`{ incidentCoordinates: undefined }` mean opposite things (preserve vs clear). I verified the sole
producer still satisfies it unchanged: `incidentValuesToPatch` (`incident-location.ts:82-100`)
always emits the key, with `undefined` on the half-pair path. tsc clean confirms no other producer
exists. This strictly strengthens the clear-on-save guarantee I had cleared on mapper discipline
alone in round 1.

---

## TYPESCRIPT-3 → R-1 — **FIXED** (`ec20686`), and the refutation is **upheld**

**Was:** a third private `useLongPress` + a shadowing `LONG_PRESS_MS = 500` inside
`DashboardScreen.tsx`, invisible to §56f's consolidation because it was not a module. Divergent
semantics; three suites pinned the beat from `primitives/` while the dashboard was unlinked.

**Now:** the private hook and constant are deleted (`DashboardScreen.tsx` loses 50 lines and
imports `{ LONG_PRESS_SURFACE_STYLE, useLongPress }` from
`@/features/demo/ui/primitives/useLongPress`). `grep -rn "useLongPress\|LONG_PRESS_MS"` now shows
exactly one definition and one constant, with all three consumers and all four suites reading it.
The shared hook absorbed the dashboard's two real contributions — the `fired` latch and the
nested-control bail — and fixed both survivors' inverse defects with **reset first, guard second**
(`useLongPress.ts:143-161`): both latches cleared at the top of every pointerdown *before* the
`e.button !== 0` return, which is what lets a right-click's own pointerdown clear a latch no
`contextmenu` came to consume.

### The refuted instruction — judged, and the integrator is right

The review's fix shape said: *"Lift the nested-control bail (`e.target.closest('button')`) into
the shared hook — the Cases rows need it too."* The integrator refuted it (`ec20686` body, §57a).
I verified the refutation against the **pre-fix** source rather than the narrative:

- Pre-fix `CasesScreen.tsx:132-151` attached `{...longPress}` to a wrapper
  `<div style={{ display: 'flex', alignItems: 'stretch' }}>` whose only children are the row
  `<button>` and the ⋯ `RowActionsTrigger` `<button>`.
- So for **every** press on a Cases row, `e.target.closest('button')` resolves to a button that is
  never `currentTarget` (the div). A verbatim lift bails on 100% of holds — the gesture dies
  outright on both the case header and the location row.

**Refutation upheld.** The integrator's substitute is better than the instruction: compare against
the surface (`closest(control) !== e.currentTarget`, `useLongPress.ts:196-200`) and move each
caller's handlers onto the element that *is* the gesture surface. `CasesScreen` now spreads
`{...longPress}` onto the row/header `<button>` itself. I checked the consequences:

- a press anywhere inside the row resolves to that same button → arms (inner nodes are `div`/`span`
  only, no interactive descendants);
- the ⋯ trigger is now a **sibling**, outside the surface, so it never reaches the hook — which
  incidentally removes a real pre-existing wart the review did not name (holding ⋯ used to arm the
  row's gesture *and* fire the trigger's own toggle, double-toggling the tray);
- the selector was widened to `button, a, input, select, textarea, [role="button"]`, which is
  correct for the dashboard card (its pills and ⋯ are genuine descendants) and inert for the
  Cases rows.

### Regression hunt on the consolidation (the round's largest structural change)

I looked specifically for what moving the handlers could break, and found nothing:

1. **Stale-swallow across the sheet.** A mouse hold whose release lands on the just-opened
   overlay leaves `swallowNextClick` set, since no click reaches the surface to consume it. The
   next interaction's `pointerdown` fires *before* its `click` and resets both latches
   unconditionally — commit `2b18a0a`'s rule, now applied ahead of every guard. No stale swallow.
2. **The swallow still reaches the row's own `onClick`.** `onClickCapture` and `onClick` are now
   on the *same* element; React dispatches all capture handlers before any bubble handler, so
   `stopPropagation()` in capture still suppresses the button's own `onClick`. Consistent with
   `CasesScreen.row-actions.test.tsx`'s tray-open-after-hold arms (green).
3. **`enabled` gating unchanged.** `CaseRow` still passes `{ enabled: !expanded }`; the hook
   returns early after the resets, and `onContextMenu` returns before `preventDefault()` when
   disabled, so an expanded card still gets the browser menu.
4. **Drag/scroll cancellation preserved** — `MOVE_TOLERANCE_PX` now applies to the dashboard too,
   which its private copy lacked.
5. **`LONG_PRESS_SURFACE_STYLE` spread order** is last in every `style` object
   (`CasesScreen.tsx:137, 233`, `DashboardScreen.tsx:118`), so `userSelect: 'none'` wins. Keeping
   it out of the returned handler object is the right call — a `style` key inside a spread
   handler bag would win or lose by attribute order per call site.
6. **`RowActionsTrigger` gained `triggerRef?: Ref<HTMLButtonElement>`** (R-10's anchor). Typed,
   optional, forwarded to the `<button>`; on `CaseRow` the trigger and the tray share the same
   `actionsAllowed` gate, so the ref is always live when the tray's actions run.

**One behaviour intentionally traded, worth recording:** right-clicking the ⋯ trigger now raises
the browser context menu (the wrapper used to suppress it whole-strip). That is a consequence of
the trigger leaving the gesture surface, and it is the correct direction — the trigger is an
ordinary control now.

---

## TYPESCRIPT-4 → R-8 — **FIXED** (`6616716`)

**Was:** `DemoNotification`'s auto-dismiss effect had deps `[durationMs]`, and the bridge renders
the banner positionally, so a second notice inside the 2.6 s window reused the instance and
inherited the first's remaining time. P3 took the component from one producer to eight.

**Now** (`map/DemoNotification.tsx:47-53`): `}, [durationMs, message])`. A message change tears
down and re-arms the timer, so every notice gets its full dwell.

**Checked for the obvious regression** — that the effect now re-runs on unrelated parent renders:
it does not. Deps compare by value, and `message` is a string, so a re-render with the same notice
leaves the timer untouched. The `onDismiss` ref indirection (which exists so a fresh callback
identity never resets the timer) is unchanged and still does that job.

**R-9 rode along** (`role="status"` on the banner). It composes rather than collides: with
`message` in the deps a swap restarts the timer, and the live region re-announces on content
change. Not my lane, no type impact.

---

## TYPESCRIPT-5 → R-12 — **FIXED** (`3c77199`)

**Was:** the incident editor's Save and Cancel both called `closeModal()` and left
`incidentCaseId` / `incidentForm` populated — the shape §56j deliberately hardened on
`closeCaseModal`, missing on its sibling.

**Now** (`DemoExperience.tsx:848-858, 1662`): `closeIncidentModal()` mirrors `closeCaseModal`
exactly and serves both paths.

```tsx
const closeIncidentModal = () => {
  setIncidentCaseId(null)
  setIncidentForm(blankIncidentForm)
  store.getState().closeModal()
}
```

**Ordering checked.** `submitIncidentLocation` (declared above) references `closeIncidentModal`
(declared below) — both are `const` arrow functions in the same render body, and the reference
lives inside a closure evaluated at click time, long after initialization. No TDZ. tsc clean
confirms it.

---

## New findings introduced by the fix round: **none**

I hunted the blast radius of all fifteen fix commits, including the four that touch files I
cleared in round 1 but whose findings belonged to other lanes:

- **R-13's per-key generic setter** (`NewCaseModal.tsx:19-22`,
  `onChange<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K])`) — the "went
  beyond" the orchestrator flagged, and it is the right call: narrowing
  `incidentCoordinateSource` to `IncidentCoordSource | ''` alone would have caught nothing while
  the setter accepted any `string` for any key. I checked both directions of the seam. Call sites
  narrow correctly (`onChange('incidentCoordinateSource', 'geocoded')` infers `K` to that key).
  The bridge's non-generic `(f: keyof NewCaseFields, v: string) => …` (`:1636`) still satisfies
  the prop under method-syntax bivariance — and that is not a hole, because enforcement happens at
  the *call* sites, which is where a typo would be written. Same for the modal's internal
  `change()` helper, used only for `caseNumber`/`unit` (both plain `string`).
  `caseToCaseForm`'s `c.incidentCoordinates?.source ?? ''` types cleanly against the new union.
- **R-3's rework of `DuplicateLocationModal`** onto `newLocationBlock({ …, requireAddress: false })`
  — retires a second copy of the two name rules and brings the module's evaluation order with it
  (blank reports `nameRequired`, never `duplicateName`). `NAME_TAKEN_ERROR` is now a re-export of
  `NEW_LOCATION_BLOCK_MESSAGES.duplicateName`, so the two surfaces cannot drift on copy. The
  commit-path guard survives and is now the *sole* enforcement point (`aria-disabled` replaced the
  `disabled` attribute), which finally puts it under test — under `disabled` the click never
  reached it. This corrects a gap in my own round-1 sweep: I audited the three `ModalActions`
  callers for the §56d contract and did not extend the same audit to this modal's private
  `ActionButton`, which shipped the rejected spelling. Now consistent across all four surfaces.
- **R-7's plotting gate** (`mapData.ts:79-97`) — `hasCapturedCoordinates` replaces plain presence
  for both the incident pin and the located-locations filter. The `l.gps!` assertions downstream
  are still required and still guarded (a predicate inside a `filter` arrow does not narrow the
  array element), so no non-null-assertion regression. The `incident && ic` narrowing further down
  still holds.
- **R-14** made `MapScreen.onEditIncident` required and dropped the `?.` at the call site — the
  correct direction given the CTA renders unconditionally, and the bridge already passes it.
- **R-16** added `aria-describedby` + `role="alert"` to `IncidentLocationFields`' `CoordinateField`
  via `useId()`. Deterministic, unconditional hook call, no type impact.
- **R-15's factory** (`engine/store/__tests__/test-utils.ts`) is test-only; it changed no
  production type.
- **R-2's rider** re-worded `NEW_ADDRESS_FAILED_NOTICE` to name the only *reachable* cause
  (source gone) instead of two arms the card's own gate holds upstream. Copy-only.

**Not filed, per the brief:** `NewCaseModal`'s private `CoordinateField` a11y gap is §57h's
deliberate leftover pending §53d's fold — correctly scoped, since fixing the twin that is slated
for deletion would make the duplication harder to see. Likewise WEB-7's missing
`submitDescribedBy` is now recorded as intentional at the call site (§57i), and I agree with the
reasoning: the click reaching `handleSubmit` is what keeps the phone's verbatim per-field messages
live rather than dead copy.

**One thing I considered and deliberately did not file.** `useLongPress`'s header still justifies
`onClickCapture` over a `guardClick` wrapper by its "subtree reach". After the consolidation the
Cases surfaces are single buttons with no interactive descendants — but the dashboard card, the
hook's other caller, genuinely does have them, so the rationale remains true for a live call site.
Not stale enough to be a finding.

---
---

# Round 1 (initial review) — condensed record

Kept for continuity; every finding below is verified FIXED above.

| ID | Sev | File | One line |
|---|---|---|---|
| TYPESCRIPT-1 | MEDIUM | `DemoExperience.tsx:794-803, 1602-1612` | New Case sheet's mode derived twice; the deliberate create-fallback half-applied → confirmed creation creates nothing (latent). |
| TYPESCRIPT-2 | MEDIUM | `create-store.ts:220-225, 506-509` | `updateIncidentLocation` documents an unknown-id no-op it does not have; `.map` allocates → subscriber wake + snapshot write (§56b's defect class). |
| TYPESCRIPT-3 | MEDIUM | `DashboardScreen.tsx:23, 44-79` | A third private `useLongPress` + shadowing `LONG_PRESS_MS`, outside §56f's consolidation because it was not a module; divergent semantics, unlinked from the constant three suites pin. |
| TYPESCRIPT-4 | LOW | `map/DemoNotification.tsx:34-37` | Dismiss timer deps omit `message`; P3's eight producers make a second notice inherit the first's remaining dwell. |
| TYPESCRIPT-5 | LOW | `DemoExperience.tsx:824-827, 1628-1629` | Incident editor's close paths don't clear their bridge seed — §56j's hardening applied to one sibling only. |

### Round-1 inventory: checked and found sound

Retained because the fix-delta did not disturb any of it (re-confirmed by the green full suite and
clean tsc at `3cecfcc`):

- **R-19 selection repair.** `deleteCase` walked through all four states incl. an incoherent input
  pair (repaired, not propagated, because `currentCaseId` is read off the surviving open location);
  `deleteLocation` moves only the location half with `capture` following it; the duplicate actions
  touch no selection; `loadSnapshot`'s repair block and the bridge's `onComplete` re-derivation
  (the defense-in-depth the HANDOFF brief says must not be simplified away) both intact.
- **`CaseEdits` immutability** is machine-checked, not asserted — the `crud-actions.test.ts:80-96`
  probe spreads a valid base and adds one extra key per arm, so excess-property checking is the
  thing under test, and a passing tsc means all four `@ts-expect-error`s are *used*.
- **Unified `submitBlocked` / `Field.error`** — every caller that passes `submitBlocked` carries
  its own validate-and-return guard (now four surfaces, after R-3 brought the chooser onto the
  same shape); "error replaces hint" implemented as the phone has it.
- **Per-camera GPS** — `setCameraGps` resolves location *and* camera by id at write time; I
  verified the "camera ids are globally unique" premise it leans on (only producer is the bridge's
  `blankCamera()`; `duplicatedForm` blanks the list; no import path mints one).
  `Extract<GpsSource, 'gps'>` stays linked to the canonical union and `z.literal('gps')` under
  `satisfies FullShape<…>` is the intended alarm.
- **Async correctness** — `IncidentLocationFields`' post-await writes carry both a `mounted` ref
  and a monotonic `requestSeq`; `abandonLookups()` retires in-flight lookups on an address pick
  without stranding the spinner. No new `forEach(async …)`, no unguarded post-await store write.
- **PDF/XSS** — the per-camera GPS row interpolates only numbers, still through `escapeHtml`, and
  is gated by `hasCapturedCoordinates`.
- **Architecture** — store bridge, engine purity, single barrel, marketing↔demo isolation,
  registry-derived ordering and the determinism seam all preserved.
