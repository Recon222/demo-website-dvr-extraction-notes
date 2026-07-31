# Lane: type-design — phase review `p3` (PR #32) — INITIAL PASS

**Mode:** initial (resumable — this lane verifies its own findings in the fix-delta round).
**Diff under review:** `git diff master...feat/parity-p3` @ `4e60680` — 91 files, +11321/−317.
**Refs read:** `.claude/agents/type-design-analyzer.md` (lane definition) · `features/demo/CLAUDE.md` (binding contract, read first) · `docs/code-reviews/deferred.md` §4/§5/§16/§27 (tracked type gaps) and §48–§56 (this wave's own ledger) · the orchestrator's deliberate-choices list.
**Pre-flight (run in this worktree):** `npx tsc --noEmit` → **clean, exit 0**.
**Scope discipline:** the phase's stated deliberate choices are honoured and not re-flagged — the case-number/location-name case-sensitivity split (§50b/§56i), the `setCaseStatus` ∕ `updateCase` separation (§56b/§56c), `duplicated_from` left unmodelled (§52.3), and every prior-phase decision. Where a finding touches a tracked deferred item, the item is named and the trigger status is stated explicitly.

**Verdict: APPROVE with comments. 0 BLOCKER · 0 MAJOR · 3 MINOR · 4 NIT.**

This is a large diff whose type work is, on the whole, better than the phase brief asked for: the `CaseEdits` immutability probe is genuinely load-bearing, `CameraGpsFix` is linked to its canonical union rather than copied out of it, the snapshot v5 bump is correctly scoped to a value-shape move (and correctly *not* taken for the `ModalId` widening), and every one of the three prop-shape collisions the assembly had to reconcile landed on the stronger semantic rather than the average. The three MINORs are all defence-in-depth gaps with a single correct producer today; none is a shipped defect.

---

## Pre-report verification of the surfaces the brief named

Recorded because a fix-delta round should not re-derive them.

### `CaseEdits` + the `@ts-expect-error` immutability pins — **verified enforced**

`CaseEdits = Omit<NewCaseInput, 'caseNumber'>` (`features/demo/engine/store/create-store.ts:92`), probed at `features/demo/engine/store/__tests__/crud-actions.test.ts:80-96` with four `@ts-expect-error` lines rejecting `caseNumber` / `status` / `locationIds` / `id`.

The pins are real, and the mechanism is the right one:

- `tsconfig.json` `include` is `["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, so `crud-actions.test.ts` is inside the program `tsc --noEmit` checks. Confirmed by path match, not assumed.
- TypeScript reports an **unused** `@ts-expect-error` as an error. `npx tsc --noEmit` is clean *with the four directives present*, which is positive proof that each probe line errors today — i.e. `CaseEdits` currently rejects all four keys, and any loosening flips the same run to "Unused '@ts-expect-error' directive". The probe cannot rot silently.
- Each probe spreads a valid base (`{ ...base, status: 'archived' }`), so the only thing TS can object to is the extra key — excess-property checking on a fresh object literal. That is the correct construction for this pin; a bare variable would have been assignment-compatible and the probe would have been theatre.

One nuance for the record, not a finding: there is **no CI workflow in the repo** (`.github/workflows` does not exist), so the gate is `pnpm typecheck` / `next build` run by a human. That is the pre-existing state of every `@ts-expect-error` pin here (`import-log.test.ts:148-152` predates this diff), not something P3 introduced.

The writer matches the type's "TOTAL, not a patch" claim: `updateCase` (`create-store.ts:453-480`) enumerates all eleven `CaseEdits` keys with `?? ''` defaults and assigns `incidentCoordinates` unconditionally, so an omitted optional key **clears** rather than preserves. §56c's rationale ("a caller sending `{ displayName }` would expect the rest preserved and get them blanked") is true of this writer as written. Contrast TYPE-DESIGN-2 below, where the sibling patch type has the same intent and a writer that does *not* hold it.

### `UpdateCaseInput` immutability-in-the-type — **verified as designed**

`status` is unreachable through `CaseEdits`, and `setCaseStatus(caseId, status: CaseStatus)` is the single writer (`create-store.ts:493-505`). §49b's "fold the status into `updateCase`" trigger is correctly refuted, and the refutation is itself pinned by the probe. No finding.

### `DuplicateMode` — **verified**

`'submission-only' | 'with-scopes'` (`engine/types/index.ts:59`), consumed by a ternary in `duplicatedForm` (`create-store.ts:396`) and by `DuplicateLocationModal`'s two buttons. A ternary over a closed two-member union is the established shape here (`mediaBucket` does the same over three-member `MediaKind`), and the type is deliberately a plain union rather than an `as const` tuple because it is never persisted — stated at the declaration and correct: the tuple device exists only to share a closed union with the snapshot shape guard. No finding.

### The two new `ModalId`s (three, actually) through `MODAL_IDS` — **verified**

`ModalId` goes 4 → 7 (`editIncident`, `duplicateLocation`, `newAddressLocation`). `MODAL_IDS: Record<ModalId, true>` (`store/persistence.ts:330-338`) is exhaustive by construction and was updated for all three — a miss would not compile. `EXPLORE_ITEMS.covers` (`readonly (AppView | ModalId)[]`) and `MODAL_NARRATION` (`Partial<Record<ModalId | LaunchableId, …>>`) both accept the new members; all three received narration. §56l's reasoning for *not* bumping `SNAPSHOT_VERSION` on this widening is correct: `MODAL_IDS` is an allow-list `loadSnapshot` filters `visited` keys **through**, every stored snapshot's key set is a subset of the widened one, so no stored value becomes unreadable. Nothing owed. (One residual, TYPE-DESIGN-7 below, about the consumer side of the same widening.)

### `CameraGpsFix` + `Extract<GpsSource, 'gps'>` — **verified, and the guard device holds**

`CameraGpsFix extends GpsCoordinates { source: Extract<GpsSource, 'gps'>; capturedAt: string }` (`engine/types/index.ts:157-160`). Writing the provenance as `Extract<…>` rather than a bare `'gps'` literal is the R-24/R-25 discipline applied correctly: it keeps the member linked to `GPS_SOURCES`, so removing `'gps'` from the tuple collapses this to `never` and breaks every producer instead of stamping a dead provenance.

The persistence side composes with it exactly as the comment claims (`store/persistence.ts:176-193`): `z.literal('gps')` under `satisfies FullShape<NonNullable<CameraEntry['gps']>>`. `FullShape<T>` maps to `z.ZodType<Required<T>[K] | undefined>`, and zod's `Output` is covariant, so `z.enum(GPS_SOURCES)` (output `GpsSource`) would **not** satisfy `ZodType<'gps' | undefined>` — the schema cannot widen past the domain type. Key-exhaustiveness is enforced by the same device, so a sixth camera-GPS key is a compile error here. Verified by construction and by the clean `tsc` run.

`toCameraGpsFix` (`engine/logic/gps.ts:254-262`) is the single producer, and it drops `sampleCount` deliberately rather than storing a value nothing renders — consistent with precedent 4 (derived/unrendered state is not stored).

### `IncidentCoordSource` — **verified as a type, but under-consumed** → see TYPE-DESIGN-1

`IncidentCoordSource = (typeof COORD_SOURCES)[number]` (`engine/types/index.ts:305`) is declared for the stated R-25 reason ("the incident form and its mappers annotate with this rather than re-typing `'geocoded' | 'manual'`"). The engine-side form value model does annotate with it (`IncidentLocationValues.coordinateSource: IncidentCoordSource | ''`, `engine/logic/incident-location.ts:34`). The UI-side form value model for the *same* field set does not — TYPE-DESIGN-1.

### Snapshot v5 guard-device compliance across the new persisted shapes — **verified complete**

The only persisted **value** shape this phase moves is `CameraEntry.gps`, which is what v5 is for; the version note at `store/persistence.ts:65-73` states that accurately. I swept the other candidates:

- `DemoCase.incidentCoordinates` — unchanged this phase (`source` was already `(typeof COORD_SOURCES)[number]` on master); `updateIncidentLocation` writes the same shape the create path already wrote.
- `DemoLocation.gps` — already `GpsCoordinates & { source: GpsSource }` on master; P3.4's widening was of the *input* type (`NewLocationInput.gps`, `NewAddressOverrides.gps`), which now matches the stored shape rather than being narrower than it. No schema move owed; §56h's widening is a narrowing-removal, which is the safe direction.
- `ScopeEntry` clones (`cloneScopesWithNewIds`) — same shape, fresh ids.
- `visited` — key-space widening only, see above.

No unguarded new persisted shape found.

### The unified `submitBlocked` / `Field.error` prop typing — **verified**

`ModalActions.submitBlocked?: boolean` + `submitDescribedBy?: string` (`ui/screens/_shared.tsx:263-303`) and `Field.error?: string` + `readOnly?: boolean` (`:158-200`). Both are the union of the three parallel spellings, both document the semantic that survived, and — importantly for this lane — **the doc comment states the enforcement contract the type cannot** ("this prop is presentation + a11y only; the caller MUST guard"). Both callers do guard (`NewCaseModal.handleSubmit` validate-and-return; `NewLocationModal`'s `if (block !== null) return`). Modelling the caller-guard obligation in the type would need a shape the codebase does not use, and §50a's reason for not swallowing the click (it would make the phone's own copy unreachable, as on the phone) is sound. `Field.error` correctly **replaces** `hint` rather than stacking, matching the phone's `{error && …}` / `{!error && helperText && …}`. No finding.

### `useLongPress`'s option surface — **verified for the consolidated hook** → but see TYPE-DESIGN-3

`useLongPress(onLongPress, { enabled?, delayMs? })` returning the named `LongPressHandlers` (`ui/primitives/useLongPress.ts:49-62`) is a clean option surface: both options defaulted, the return type named and exported so a caller spreading it onto a row gets a checked handler set. §56f's consolidation of P3.1's and P3.5's copies is correct and the union kept the stronger half of each. The problem is that it is not, in fact, the only copy — TYPE-DESIGN-3.

---

# Findings

## TYPE-DESIGN-1 [MINOR] `features/demo/ui/screens/caseFormData.ts:34` — the New Case form's coordinate provenance is `string`, while its engine twin is `IncidentCoordSource | ''`; deferred §53d's trigger has fired

**Type.** `NewCaseFields.incidentCoordinateSource: string` (`ui/screens/caseFormData.ts:34`), with the union spelled only in prose on the line above: `/** '' | 'geocoded' (filled by an address pick) | 'manual' (typed by hand). */`.

**Permitted invalid state.** Any string. The field is written through the bridge's untyped setter — `onChange(f: keyof NewCaseFields, v: string)` → `setCaseForm((s) => ({ ...s, [f]: v }))` (`ui/DemoExperience.tsx:1603`) — so `'Geocoded'`, `'gps'`, or a typo are all constructible without a compile error.

**Construction site + downstream.** `NewCaseModal` stamps the value at two places: `onChange('incidentCoordinateSource', 'geocoded')` on an address pick (`NewCaseModal.tsx:236`) and `'manual'` on each coordinate keystroke (`:252`, `:261`). Both are correct today. A typo at `:236` would not fail to compile; it would flow into `caseFormData.toIncidentCoordinates`, whose coercion is `form.incidentCoordinateSource === 'geocoded' ? 'geocoded' : 'manual'` (`caseFormData.ts:96`) — i.e. **anything that is not exactly `'geocoded'` is silently recorded as hand-typed provenance**. That value is persisted on the case, rendered by the modal's own chip (`NewCaseModal.tsx:116`), and printed as the `Coordinates` row of the read-only case report (`screenData.ts` `toCaseSheet`). Provenance is the whole reason the field exists; a silent mislabel is the failure it is meant to prevent.

The same coercion, on a properly typed field, exists nine lines away in the engine: `incidentValuesToPatch` (`engine/logic/incident-location.ts:81`) over `IncidentLocationValues.coordinateSource: IncidentCoordSource | ''`. There the typo *is* a compile error.

**Tracked-item status — the trigger has fired, stated explicitly.** deferred.md **§53d** logs exactly this duplication ("`NewCaseModal`'s private `CoordinateField`, its inline coordinate chip, and its `incidentLatitude`/`incidentLongitude`/`incidentCoordinateSource` flat fields duplicate what `IncidentLocationFields` + `IncidentLocationValues` now express once") and names its trigger: *"the next agent to touch `NewCaseModal`'s incident section — most likely P3.3's edit-mode work"*. P3.3 landed in this PR and rewrote that component substantially (edit mode, `readOnly` number, required-field errors, the submit-failure banner, and the extraction of the flat fields into the new `caseFormData.ts`). The fold did not happen and §56 does not re-defer it. Per the lane rules I am re-filing it because its own trigger fired, not re-litigating a live deferral.

**Fix.** Two sizes; either closes the invalid state.

1. *Minimum (one line):* `incidentCoordinateSource: IncidentCoordSource | ''`. `caseToCaseForm` already produces exactly that (`c.incidentCoordinates?.source ?? ''`, `:78`), and both `NewCaseModal` write sites already pass legal members, so nothing else moves. This is precedent 5 (typed id spaces) applied to the union **this diff introduced for the purpose**.
2. *What §53d actually asked for:* back the three flat fields with `IncidentLocationValues`, mount `<IncidentLocationFields values onChange />` in place of the inline block, and delete `NewCaseModal`'s private `CoordinateField` (`:61-87`) and inline chip (`:265-271`). That also retires the second copy of the coercion rule and the two copy divergences §53d records.

Note the fix has a phase-honesty side: `IncidentLocationFields` is the "one form, two modes" surface the parity matrix (row 23) asked for, and it currently has one caller.

---

## TYPE-DESIGN-2 [MINOR] `features/demo/engine/logic/incident-location.ts:43` — `IncidentLocationPatch` is spread onto the case, but its coordinate key is optional, so an omitting producer silently preserves a stale forensic coordinate

**Type.**

```ts
export type IncidentLocationPatch = Pick<
  DemoCase,
  'incidentBusinessName' | 'incidentStreetAddress' | 'incidentCity' | 'incidentCoordinates'
>
```

`Pick` preserves optionality, and `DemoCase.incidentCoordinates` is optional (`engine/types/index.ts:323`), so `incidentCoordinates?: {...}` is optional on the patch. With no `exactOptionalPropertyTypes` in `tsconfig.json`, `{ incidentCoordinates: undefined }` and `{}` are both legal values of this type — and they mean **opposite things** to the writer.

**Permitted invalid state / the writer that makes it matter.**

```ts
updateIncidentLocation: (caseId, patch) =>
  set((s) => ({ cases: s.cases.map((c) => (c.id === caseId ? { ...c, ...patch } : c)) })),
```
(`create-store.ts:506-510`)

A **spread** writer, unlike `updateCase`'s enumerate-and-default writer, is key-presence sensitive. `incidentValuesToPatch` always emits the key explicitly — `incidentCoordinates: lat.ok && lng.ok ? {...} : undefined` (`incident-location.ts:74-83`) — so the documented guarantee holds today: *"a half-pair, or a half-typed number, is meaningless, so the result is `undefined` and the save CLEARS the stored pair rather than keeping a stale one."* That guarantee rests entirely on the mapper's discipline, **not on the type**.

**Downstream if a second producer appears.** Any producer that builds the patch conditionally (`...(coords ? { incidentCoordinates: coords } : {})` — the idiom used four times elsewhere in this same store file, e.g. `create-store.ts:543`, `:567`) type-checks perfectly and silently **preserves** the previous coordinates. The visitor clears the lat/lng fields, presses Save Changes, the map pin and the case sheet's `Coordinates` row keep pointing at the old scene. That is the exact class of defect `hasCapturedCoordinates` and BUG-008 parity exist to prevent, arriving through the write path instead of the display path.

**Why this is worth a MINOR rather than a NIT.** The phase reasoned about precisely this hazard one type over and closed it: `CaseEdits`' doc says a partial payload "would invite a caller to send `{ displayName }` and silently keep the rest, which the total writer below would NOT honour" (§56c). `IncidentLocationPatch` has the same total-payload intent, states it less explicitly, and — because its writer spreads — actually *would* honour a partial in the wrong direction. The reasoning was applied to one sibling and not the other.

**Fix.** Make the key required-but-nullable so every producer must decide:

```ts
export type IncidentLocationPatch = Pick<
  DemoCase,
  'incidentBusinessName' | 'incidentStreetAddress' | 'incidentCity'
> & { incidentCoordinates: DemoCase['incidentCoordinates'] }
```

`incidentValuesToPatch` already satisfies this unchanged. The derivation from `DemoCase` — which is the good half of this type and the reason it is `Pick` rather than a hand-declared interface — is preserved. (An alternative that also closes it: give `updateIncidentLocation` the same enumerating writer `updateCase` has. The type fix is cheaper and travels with future producers.)

---

## TYPE-DESIGN-3 [MINOR] `features/demo/ui/screens/DashboardScreen.tsx:44-83` — a **third** `useLongPress` declaration, added in the same wave that consolidated the other two; the copies already encode different knowledge

**Types.** `ui/primitives/useLongPress.ts:59-62` — `useLongPress(onLongPress: () => void, { enabled?, delayMs? }): LongPressHandlers`, the named, exported, option-bearing surface §56f consolidated P3.1's and P3.5's copies onto. Versus `DashboardScreen.tsx:44` — a module-private `function useLongPress(onLongPress: () => void)` with **no option object** and an anonymous inline return type whose handlers are pinned to `HTMLDivElement`.

**This is new in this diff.** `git show master:features/demo/ui/screens/DashboardScreen.tsx` contains no `useLongPress` and no `onLongPress`; P3.2 added it. So at the moment §56f was writing *"ONE `useLongPress`"* and a guard rail (*"a shared primitive added at a new path will not conflict with the same primitive at an old one"*), a third copy was already on the branch, invisible to the same class of merge because it is a private function rather than a module.

**The two copies do not agree, in both directions.** This is the drift, present at birth rather than predicted:

| Behaviour | `primitives/useLongPress` | `DashboardScreen`'s copy |
|---|---|---|
| `enabled` gate / `delayMs` option | yes | absent (`LONG_PRESS_MS` re-declared locally at `:23`) |
| Movement tolerance (a drag is not a hold) | yes (`MOVE_TOLERANCE_PX`) | absent |
| Swallows the hold's trailing click | yes (`onClickCapture`, capture-phase) | absent |
| Does not arm on a nested control | absent | yes (`e.target.closest('button')`, `:61`) |
| Latches the timer-fire so the OS `contextmenu` that follows a touch hold does not re-fire | **absent** | yes (`firedRef`, `:48`, with the reason written out: *"Without this latch that one gesture would open the sheet twice."*) |

The last row is the sharp one. In the consolidated hook, `onContextMenu` calls `cb.current()` unconditionally when enabled (`useLongPress.ts:114-120`) with no check that the 500 ms timer already fired — and `useLongPress.test.tsx` has no hold-then-`contextMenu` arm (its context-menu tests at `:138` and `:159` both start from a fresh gesture). The knowledge that a touch hold raises **both** signals lives only in the copy that is not the shared one.

**Why this is a type-design finding and not just DRY.** The lane brief names `useLongPress`'s option surface as a high-value surface, and what is actually wrong is that there are two *declarations* of that surface with different shapes: one that a caller can configure and whose handler set is a named exported type, and one that cannot be configured and whose handler type is structural and element-bound. A future package reading `primitives/useLongPress.ts` as "the" long-press primitive will not find the dashboard's guards, and a change to either is invisible to the other.

**Fix.** Delete `DashboardScreen`'s private copy and consume `ui/primitives/useLongPress`, carrying its two guards into the shared hook first (a `closest('button')` bail in `onPointerDown`, and a fired-latch consulted by `onContextMenu`). Both are additive and neither breaks the existing callers. Also delete `DashboardScreen.tsx:23`'s duplicate `LONG_PRESS_MS` in favour of the exported one — `appChapters.test.tsx` already imports the shared constant, so the two are one rename away from disagreeing. This is §56f's own guard rail, executed.

---

## TYPE-DESIGN-4 [NIT] `features/demo/engine/store/create-store.ts:249,261` — `duplicateLocation` / `duplicateToNewAddress` collapse three distinct refusals into one `null`

`duplicateLocation(...): string | null` and `duplicateToNewAddress(...): string | null` each return `null` for causes the doc comments enumerate as three different phone `ValidationError`s: source gone, blank name, and (for the second) blank street address (`create-store.ts:605-607`, `:632-635`). The house pattern for exactly this is a discriminated result union — `ImportRunResult`, `ExtractClientResult`, `OcrResult`, and in this very diff's neighbourhood `GpsCaptureOutcome` (`engine/logic/gps.ts:81`).

Not raised higher because the consumers cope honestly rather than accidentally: the bridge maps `null` to one generic notice each (`DUPLICATION_FAILED_NOTICE` / `NEW_ADDRESS_FAILED_NOTICE`, `DemoExperience.tsx:713`, `:781`) rather than guessing a cause, and both call sites are gated upstream (the chooser disables both duplicate buttons on a blank/taken name; the card's `newLocationBlock` guard refuses a blank street). So there is no reachable wrong-message path today. If a cause is ever surfaced to the visitor, the union is the shape to reach for.

---

## TYPE-DESIGN-5 [NIT] `features/demo/ui/screens/map/mapData.ts:47` — `IncidentSheetItem.id` is a **case** id under the field name its sibling arm uses for a **location** id

`SheetItem = LocationSheetItem | IncidentSheetItem` is properly discriminated on `kind`, but both arms name their identifier `id: string`, and they are different id spaces: `LocationSheetItem.id = l.id` (a location, `mapData.ts:110`) while `IncidentSheetItem.id = viewerCase.id` (a case, `:97`).

This diff adds the first consumer that reads the incident arm's `id` as a case id — `onEditIncident(item.id)` (`map/LocationDetailCard.tsx:70`) — and has to explain the id-space change in prose on the prop (`/** … The id is the CASE id (incident items carry it). */`, `:14-16`). Its sibling one branch up passes the *other* arm's `id` to `onGoToLocation`. Nothing is mis-wired today (the component branches on `item.kind` first), and the counter-string ids (`c1` vs `l1`) make an accidental collision impossible, so this is a naming fix rather than an invariant gap: rename the incident arm's field to `caseId`. The union is already discriminated, so the change is compile-checked and free. Explicitly **not** a request for a branded type — the lane's own false-positive list rules that out absent a demonstrated mix-up, and there is none.

---

## TYPE-DESIGN-6 [NIT] `features/demo/engine/logic/pdf/case-notes.ts:26-28` — the document-facing camera type widens `CameraGpsFix` back to `GpsCoordinates`

`CaseNotesCamera.gps?: GpsCoordinates`, fed from `selectCaseNotesData`'s `gps: c.gps` (`store/selectors.ts:273`), which is a `CameraGpsFix`. The document prints the row under a hard-coded `GPS Location` label (`case-notes.ts:220`), and `GpsCoordinates` admits a geocoded or hand-entered pair, which by construction a camera fix can never be — that is the entire point of `Extract<GpsSource, 'gps'>` on `CameraGpsFix`.

No invalid state is constructible today (one producer, and it is the camera list). Typing the field `CameraGpsFix` costs nothing — the renderer reads only `lat`/`lng`/`accuracyM` — and keeps the court-facing label honest by construction if a second producer ever appears. Filed as a NIT precisely because the boundary is currently closed by having exactly one producer.

---

## TYPE-DESIGN-7 [NIT] `features/demo/ui/DemoExperience.tsx:1600-1710` — `activeModal()`'s `default: return null` now covers a seven-member `ModalId`, and `assertNever` exists in-repo as of this diff

The `switch (modal)` gained three arms this phase; its `default: return null` is pre-existing and load-bearing for `modal === null`. But the union it switches over grew 75% in one diff, and the arm that catches a *missing* case is the same arm that catches "no modal open" — so a future `ModalId` added without a render arm opens a modal that renders nothing, with the store's `modal` set and `visited` recorded. `mediaLibrary` already sits in that state (deliberately — an unbuilt fast-follow, consistent with `activeScreen()`'s documented `placeholder(view)` fallback), which is why this is a NIT and not more.

Worth noting only because this diff **introduces `assertNever`** (`engine/logic/assert-never.ts`) and exports it from the engine barrel, so the shape is now available and cheap: `case null: return null` … `default: return assertNever(modal)`. `mediaLibrary` would need an explicit arm — which is arguably the honest outcome, since it is currently a modal id that can be opened and cannot be seen.

---

## Cross-lane observation (not a type-design finding — routed, not scored)

**`updateIncidentLocation` has no unknown-id guard, though its own doc comment says it does.** `create-store.ts:220-225` documents the action as *"A no-op for an unknown id, like every other case-keyed writer here"*, but the implementation (`:506-510`) is a bare `set((s) => ({ cases: s.cases.map(...) }))` with no `get()`-first early return — unlike `updateCase` (`:455`), `setCaseStatus` (`:503`), `deleteCase` (`:530`) and `deleteLocation` (`:558`), all of which have one. For an unknown id it allocates a fresh `cases` array and a fresh state object, waking every subscriber and triggering a snapshot write for a change that did not happen. That is the same defect §56b describes catching in `setCaseStatus` at the assembly merge, still standing in the sibling written in the same wave. Not scored here because it is an implementation/consistency defect rather than a type gap — flagging it for the TypeScript or silent-failure lane, and noting that a doc comment asserting a guard the code does not have is worse than no comment.

---

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |
| NIT | 4 |

| Check | Result |
|---|---|
| Canonical homes preserved (no parallel entity declarations) | **partial** — no domain entity is re-declared; two *form value models* for the incident field set coexist (TYPE-DESIGN-1, deferred §53d's trigger fired), and a UI primitive's surface is declared twice (TYPE-DESIGN-3) |
| Discriminated unions well-formed | yes — `NewCaseModalProps` (mode/existingCase correlation unconstructable), `DeleteTarget`, `GpsCaptureOutcome`, `SheetItem`, `PendingDelete` |
| Exhaustiveness enforced (never-checked switches) | yes for new unions — `actionsForStatus` uses `assertNever`; `gpsSourceLabel` keeps its `case undefined` + `never`; `LOOKUP_NOTICE_COPY` converts a binary ternary into a total map. One pre-existing `default:` noted (NIT-7) |
| Correlated state modelled as a union | yes — `NewLocationFields.coordinates?: NewLocationCoordinates` collapses the lat/lng/accuracy/source quartet; the bridge's modal payloads are null-guarded at every render site, no `!` assertions |
| Id spaces typed (no bare-string registries/keys) | **regression found** — `NewCaseFields.incidentCoordinateSource: string` (TYPE-DESIGN-1), against the `IncidentCoordSource` this same diff introduced |
| `readonly` discipline on shared data | yes — `cloneScopesWithNewIds(scopes: readonly ScopeEntry[])`, `existingNames: readonly string[]` throughout, `NEW_LOCATION_BLOCK_MESSAGES` frozen `Readonly<Record<…>>`, `PRECISE_GPS_CONFIG` frozen, all new copy objects `as const` |
| Boundary types honest about untrusted input | yes — the snapshot guard is the only untrusted boundary this phase moves, and v5's `CameraGpsFix` schema is key-exhaustive (`FullShape`) and provenance-pinned (`z.literal`) |
| Derived-vs-stored | yes — `toCameraGpsFix` drops `sampleCount`; `CaseSheetData.statusLabel` is a display-mapper convenience alongside the raw `status` its consumer also needs, consistent with `screenData.ts`'s own `caseStatusTheme` precedent |
| Props-type honesty (store-bridge rule) | yes — every new component takes data + callbacks; no store, setter, or `Record<string, unknown>` bag in any new prop type |
| `isolatedModules` correctness | yes — every new type re-export in `engine/index.ts` uses `export type` / a `type` specifier |

**Verdict: APPROVE with comments.** No CRITICAL/BLOCKER, no HIGH/MAJOR. The three MINORs are defence-in-depth gaps with a single correct producer each; TYPE-DESIGN-1 is the one I would land before merge, because its trigger is already logged in the ledger and because it is a one-line change if the full §53d fold is not in scope for this phase. TYPE-DESIGN-2 and TYPE-DESIGN-3 are both small and both prevent a class of future silent drift the phase has already paid to reason about once.
