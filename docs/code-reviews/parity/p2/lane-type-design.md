# Parity P2 — TYPE-DESIGN lane

**PR:** #31 — Parity P2, wizard depth (notes engine, OCR corrections, GPS, the final gate, DST advisories)
**Branch:** `feat/parity-p2` @ `9f5c01a` · **Diff:** `git diff master...feat/parity-p2`
**Lane definition:** `.claude/agents/type-design-analyzer.md`
**Mode:** initial pass (resumable — this file is the fix-delta baseline)

**Verdict: APPROVE with comments.** 0 CRITICAL · 0 HIGH · 4 MEDIUM · 4 LOW.

The headline type surfaces this phase are sound. `TimestampParse`, `GpsCaptureOutcome`,
`FinalSubmissionOutcome`, `DialogState` and the snapshot-guard device-3 wiring are all
textbook applications of this repo's own precedents, and the `SECTION_DEFINITIONS`
exhaustiveness guard is a genuinely new, working compile-time device (verified — see
§Verification). Every finding below is drift-surface or invariant-expression, not a
reachable invalid state; nothing here blocks merge.

---

## TYPE-DESIGN-1 [MEDIUM] features/demo/ui/screens/NotesScreen.tsx:36-37

**Claim.** `NotesScreenProps` re-declares `ScrapAllMode` and `RestoreAllMode` as inline
literal unions, in the same diff that deliberately adds both to the engine barrel for
consumption. Because the callback flows *narrow → wide* through the bridge, widening the
store-side union produces **no compile error anywhere** — the UI silently becomes unable to
emit the new mode.

**Evidence.**

Canonical home (`features/demo/engine/store/create-store.ts:160-162`), exported through the
barrel in this diff (`features/demo/engine/index.ts:116-117`):

```ts
export type ScrapAllMode = 'current' | 'blank'
export type RestoreAllMode = 'keep' | 'clear'
```

Hand-retyped at the consumer (`NotesScreen.tsx:36-37`):

```ts
  onScrapAll(mode: 'current' | 'blank'): void
  onRestoreAll(mode: 'keep' | 'clear'): void
```

The seam (`features/demo/ui/DemoExperience.tsx:527-528`):

```tsx
            onScrapAll={(mode) => store.getState().scrapAllNotes(mode)}
            onRestoreAll={(mode) => store.getState().restoreAllNotes(mode)}
```

`mode` infers as the *narrow* prop union and is passed into the *wide* store parameter.
Adding `'template'` to `ScrapAllMode` keeps `'current' | 'blank'` assignable to
`ScrapAllMode`, so `tsc` stays green while the only surface that can invoke the action can
never produce the new member. `grep -rn "ScrapAllMode|RestoreAllMode"` confirms the barrel
export currently has **zero** consumers — the type was exported for exactly this call site
and then not used.

Contrast the GPS analogue (TYPE-DESIGN-4), where the bridge passes a *store-typed* value
into a hand-typed prop — wide → narrow — and a widening therefore *does* error. The
direction of assignment is what makes this one silent and that one safe.

**Suggested fix.** Import the two types in `NotesScreen.tsx` and annotate the props with
them. This is the `ExploreItem.covers: readonly (AppView | ModalId)[]` precedent (typed id
space over hand-retyped literals) applied to a mode union. One-line change, no behaviour.

**Confidence.** High. Both declarations, the barrel export, the seam, and the assignment
direction are cited; the zero-consumer grep is dispositive on intent.

---

## TYPE-DESIGN-2 [MEDIUM] features/demo/engine/logic/ocr.ts:166-183

**Claim.** `DvrTimestampReading` expresses two **mutually exclusive** outcomes as two
independent nullable fields. `{ assumedDate: string, ambiguity: DateDisambiguationResult }`
is representable but unreachable, and the consuming screen would render two contradictory
blocking warnings if it ever occurred. This is the exact shape the `RetentionView`
precedent exists to prevent — and the same file introduces `TimestampParse`, which gets it
right.

**Evidence.**

```ts
export interface DvrTimestampReading {
  dvrTime: string
  assumedDate: string | null
  ambiguity: DateDisambiguationResult | null
}
```

The producer is total and makes the exclusivity structural
(`features/demo/engine/logic/ocr.ts:206-227`):

- `parse.kind === 'time-only'` → `{ dvrTime, assumedDate, ambiguity: null }`
- `parse.kind === 'datetime'` → `{ dvrTime, assumedDate: null, ambiguity }` (or `null`)

A time-only frame carries no date digits, so `ambiguity` cannot coexist with `assumedDate`
— the doc comments state each field's precondition individually but nothing states, or
enforces, that they are alternatives.

The flat shape is then copied verbatim into the UI union arm
(`features/demo/ui/screens/OcrCaptureScreen.tsx`, the `ok: true` arm), and the screen
branches on the two fields independently:

```tsx
            {result.ambiguity && <DateDisambiguationWarning result={result.ambiguity} />}
            {result.assumedDate !== null && ( /* "No date on the DVR display" role="alert" */ )}
```

Both-set renders an assumed-date alert *and* an MM/DD-vs-DD/MM warning over the same field,
telling the operator two incompatible stories about one timestamp on a forensic confirm
step. Not reachable today — the sole producer prevents it — so this is a defense-in-depth /
invariant-expression gap (MEDIUM), not a live defect.

Note the counter-example one screen away: the same commit replaced
`parseTimestampFromText(text): string | null` with

```ts
export type TimestampParse =
  | { kind: 'datetime'; value: string }
  | { kind: 'time-only'; time: string }
```

which is precedent 3 applied correctly, and is what makes the exclusivity provable in the
first place. `DvrTimestampReading` is the one place in the OCR chain that flattens it back
out.

**Suggested fix.** Either a three-arm union —

```ts
export type DvrTimestampReading =
  | { dvrTime: string; assumedDate: string; ambiguity?: never }
  | { dvrTime: string; assumedDate: null; ambiguity: DateDisambiguationResult | null }
```

— or, lighter and probably better here, one discriminated `resolution` field:

```ts
type Resolution =
  | { kind: 'exact' }
  | { kind: 'assumed-date'; assumedDate: string }
  | { kind: 'ambiguous'; ambiguity: DateDisambiguationResult }
```

Either lets `isDvrDraftCommittable` and the screen branch once instead of twice. The
`OcrResult` ok-arm in `OcrCaptureScreen.tsx` should carry the same shape rather than a
second flat copy. **Deliberately not proposed:** any change to the gate *behaviour* or the
today-guess policy — that is the phase's do-not-re-flag list.

**Confidence.** High on the analysis (producer read, both consumer branches read, the
in-diff counter-precedent cited). Medium on the fix being worth the churn — the payload
lives on three arms and the screen's render order is phone-pinned; the orchestrator may
reasonably prefer to note the invariant in the doc comment and defer.

---

## TYPE-DESIGN-3 [MEDIUM] features/demo/engine/types/index.ts:110-114

**Claim.** `GpsCoordinates` has **seven** structural hand-copies with no compile-time link to
the canonical declaration. The P2.3 `accuracyM?` widening therefore had to be applied to each
by hand — and one copy was missed by the authoring branch and repaired in an orchestrator
merge-integration commit. The repo already owns the device that prevents this
(`FullShape<T>` + `satisfies`), and the one layer that uses it is the one layer that did not
drift.

*(Scope note: the widening itself and its merge-commit rationale are on the phase's
do-not-re-flag list and are not questioned here. The finding is the absent linkage that made
a one-field change a seven-site manual edit.)*

**Evidence.**

Canonical (`features/demo/engine/types/index.ts:110-114`):

```ts
export interface GpsCoordinates {
  lat: number
  lng: number
  accuracyM?: number
}
```

Unlinked structural copies, all of which had to be edited (or should have been) for the
widening:

| # | Site | Shape |
|---|---|---|
| 1 | `engine/store/create-store.ts:69` | `NewLocationInput.gps?: { lat; lng; accuracyM?; source: Exclude<…,'gps'> }` |
| 2 | `engine/logic/notes/types.ts:41` | `NotesCamera.gps?: { lat; lng; accuracyM? }` |
| 3 | `ui/screens/NewLocationModal.tsx:16` | `NewLocationFields.coordinates?: { lat; lng; accuracyM? }` |
| 4 | `ui/screens/NewLocationModal.tsx:27` | `onPickCoords(coords: { lat; lng; accuracyM? })` |
| 5 | `ui/screens/SubmissionScreen.tsx:43-47` | `SubmissionCoordinates` (= `GpsCoordinates & { source }`) |
| 6 | `ui/inputs/LocationFields.tsx:33-36` | `LocationFieldValues` (flattened `lat?/lng?/accuracyM?`) |
| 7 | `ui/inputs/CoordinateDisplay.tsx:55-59` | `CoordinateDisplayProps` (flattened `lat/lng/accuracyM?`) |

Copy #2 is the demonstrated failure: PR #31's own body lists *"Orchestrator
merge-integration commits: **NotesCamera.accuracyM widening**"* — i.e. the branch that
widened the canonical type did not widen this copy, nothing failed to compile, and a human
had to notice it at merge. That is the drift this linkage would have caught mechanically.

The counter-example is in-repo and in-diff. `engine/store/persistence.ts` mirrors the same
shape and did **not** drift, because it is mechanically bound
(`persistence.ts:112-113, 175-181`):

```ts
type FullShape<T> = { [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined> }
…
  gps: z
    .object({ lat: z.number(), lng: z.number(), accuracyM: z.number().optional() } satisfies FullShape<
      NonNullable<CameraEntry['gps']>
    >)
```

Device 2's own comment states the guarantee: *"the shape must NAME every key of the domain
type, required AND optional."* Adding a field to `GpsCoordinates` breaks this shape at
compile time; adding one to the seven copies above breaks nothing.

Not all seven are equal. #1 (narrowed `source`), #2 (deliberately phone-shaped, documented
in `notes/types.ts:34-42`) and #6 (flattened for a form-patch API) are *intentional
projections* with recorded rationale — they should stay distinct types, just derived ones.
#3, #4 and #5 add no semantics over `GpsCoordinates` / `DemoLocation['gps']` at all.

**Suggested fix.** Two tiers, cheapest first:

1. Derive the pure duplicates: `NewLocationFields.coordinates?: GpsCoordinates`,
   `onPickCoords(coords: GpsCoordinates)`, and
   `type SubmissionCoordinates = NonNullable<DemoLocation['gps']>` (which is what the bridge
   already feeds it — `DemoExperience.tsx:434`, `coordinates={currentLocation?.gps}`).
2. For the intentional projections, bind them to the canonical type the way persistence
   does — e.g. `NotesCamera.gps?: Pick<GpsCoordinates, 'lat' | 'lng' | 'accuracyM'>`, or a
   `satisfies`-style key-exhaustiveness assertion — so the next field addition is a compile
   error instead of a merge-time catch.

**Confidence.** High. Canonical + all seven copies cited, the linked counter-example cited,
and the drift is not hypothetical — it already happened once in this PR and is recorded in
the PR body.

---

## TYPE-DESIGN-4 [MEDIUM] features/demo/engine/logic/gps.ts:242-253

**Claim.** `gpsSourceLabel` hand-retypes the `GPS_SOURCES` id space and consumes it with a
bare `default:` instead of a `never` check — the only new union consumer in this diff that
does. A fourth GPS source would make the provenance chip silently vanish from a forensic
coordinate card rather than breaking the build. Three further new hand-copies of the same
union ship alongside it.

**Evidence.**

Canonical (`features/demo/engine/types/index.ts:250-252`):

```ts
export const COORD_SOURCES = ['geocoded', 'manual'] as const
export const GPS_SOURCES = ['gps', 'geocoded', 'manual'] as const
```

Consumer (`features/demo/engine/logic/gps.ts:242-253`):

```ts
export function gpsSourceLabel(source: 'gps' | 'geocoded' | 'manual' | undefined): string {
  switch (source) {
    case 'gps':
      return 'GPS'
    case 'manual':
      return 'Manual'
    case 'geocoded':
      return 'Geocoded'
    default:
      return ''
  }
}
```

`default:` is currently load-bearing for the `undefined` arm, which is what disguises the
gap. The realistic sequence: a fourth source lands in `GPS_SOURCES` (P4 import-provided
coordinates is the obvious candidate); the seams in TYPE-DESIGN-3 flag compile errors; the
natural repair is to widen this parameter; and the moment it is widened the `switch` returns
`''` for the new member — `CoordinateDisplay.tsx:111-115` then renders no provenance chip
at all, on a card whose entire job is stating where a coordinate came from. Silent
degradation, exactly what the `FallbackMode` precedent's comment ("a new variant is a
compile error, not a silently-missing warning") was written against. The correctly-shaped
example is in this same diff at `DemoExperience.tsx:507-518`, where the `FallbackMode`
switch carries `const exhaustive: never = mode`.

Completeness sweep — every site naming this union (`grep -rn "'gps' | 'geocoded' | 'manual'"`):

| Site | Status |
|---|---|
| `engine/logic/gps.ts:242` | **new** (this diff) |
| `ui/inputs/CoordinateDisplay.tsx:59` | **new** (this diff) |
| `ui/inputs/LocationFields.tsx:36` | **new** (this diff) |
| `ui/screens/SubmissionScreen.tsx:46` | **new** (this diff) |
| `ui/screens/map/mapData.ts:43` | pre-existing |

Zero of the five derive from `GPS_SOURCES`. Note that unlike TYPE-DESIGN-1, these are
*currently* drift-safe: the bridge passes the store-typed `currentLocation?.gps`
(`DemoExperience.tsx:434`) into the hand-typed prop, wide → narrow, so a widening errors
there. The `switch` is the one place the safety net does not reach.

**Suggested fix.** Export `type GpsSource = (typeof GPS_SOURCES)[number]` from the canonical
home; annotate all five sites with `GpsSource` (`| undefined` where optional); and in
`gpsSourceLabel` replace `default:` with an explicit `case undefined: return ''` plus
`default: { const exhaustive: never = source; return exhaustive }`.

**Confidence.** High. Union, consumer, all five sites, the in-diff correct counter-example
and the concrete downstream render consequence are all cited.

---

## TYPE-DESIGN-5 [LOW] features/demo/engine/content/seed.ts:31-35

**Claim.** `OCR_SAMPLE_FRAMES` is an exported, module-level registry typed as a *mutable*
`Record`, with neither `as const` nor `Object.freeze` — against precedent 7, and against
every one of its own siblings introduced in this same diff.

**Evidence.**

```ts
export const OCR_SAMPLE_FRAMES: Record<OcrSampleFrame, string> = {
  clean: '2025-03-08 12:05:30',
  ambiguous: '06/07/2024 23:45:30',
  timeOnly: '12:05:30',
}
```

The explicit `Record<…, string>` annotation actively *discards* the literal types `as const`
would have given, and the object is not frozen — any importer can reassign
`OCR_SAMPLE_FRAMES.clean`. Siblings added by the same PR all do it correctly:

- `engine/logic/gps.ts:104` — `ACCURACY_MODE_TARGET_M: Readonly<Record<GpsAccuracyMode, number>> = Object.freeze({…})`
- `engine/logic/gps.ts:142` — `PRECISE_GPS_CONFIG: GpsConfig = Object.freeze({…})`
- `engine/logic/address-format.ts:31` — `STREET_TYPE_ABBREVIATIONS: Readonly<Record<string, string>> = Object.freeze({…})`
- `engine/logic/gps.ts:82` / `logic/final-submission.ts:24` / `ui/inputs/LocationFields.tsx:49` / `ui/inputs/GpsCaptureControl.tsx:53` / `ui/inputs/CoordinateDisplay.tsx:29` — all `as const`

Module-private siblings with the same shape, folded in for the sweep (lower risk — not
exported, so not externally mutable): `engine/logic/notes/notes-assembler.ts:11`
(`const SECTION_ORDER: NoteSectionId[]`), `ui/inputs/CoordinateDisplay.tsx:22`
(`TONE_COLOR: Record<AccuracyTone, string>`), `engine/logic/date-disambiguation.ts:286`
(`MONTH_NAMES`, mutable — note the sibling table in `dst-advisory.ts:54-67` *is* `as const`).

**Severity note.** The lane rubric puts "a mutable module-level registry" at MEDIUM. Filed
LOW deliberately: nothing in the repo mutates it, the consequence of a hypothetical mutation
is which sample string the OCR demo reads (cosmetic, not forensic), and the PR #8 finding
that set the precedent concerned a shared *catalog* corruptible by `push`. Reporting the
demotion rather than silently applying it.

**Suggested fix.** `export const OCR_SAMPLE_FRAMES = { … } as const satisfies Record<OcrSampleFrame, string>`
— keeps the key-exhaustiveness check, adds immutability and literal types. Optionally give
`SECTION_ORDER` / `TONE_COLOR` / `MONTH_NAMES` the same `as const` treatment.

**Confidence.** High.

---

## TYPE-DESIGN-6 [LOW] features/demo/engine/logic/notes/time-on-scene-formatter.ts:14-17

**Claim.** A module-private `interface ArrivalDeparture` shadows the canonical
`ArrivalDeparture` domain entity **by name** while having a completely different shape, and
the annotations that use it are redundant.

**Evidence.**

Canonical (`features/demo/engine/types/index.ts:51-55`):

```ts
export interface ArrivalDeparture {
  id: string
  arrival: string
  departure: string
}
```

Local (`time-on-scene-formatter.ts:14-17`):

```ts
interface ArrivalDeparture {
  arrivalDateTime: string
  departureDateTime: string
}
```

Three fields vs two, zero overlapping key names. It is used only as an inline parameter
annotation on callbacks over `formData.arrivalDepartures`
(`time-on-scene-formatter.ts:68, 78, 97`), whose element type is already fully specified by
`NotesRelevantFormData` (`notes/types.ts:57-60`) — TypeScript infers it without help.
Because TS is structural, a future reader who "fixes" the missing import by pulling
`ArrivalDeparture` from `@/features/demo/engine/types` gets a silently different shape and
`visit.arrivalDateTime` becomes an error pointing at the wrong thing.

**Suggested fix.** Delete the local interface and the three annotations (inference covers
them), or — if an explicit name is wanted — `type NotesVisit = NotesRelevantFormData['arrivalDepartures'][number]`.
Do not keep a distinct type wearing a canonical entity's name.

**Confidence.** High on the collision and the redundancy; the finding is a readability/drift
hazard with no reachable invalid state, hence LOW.

---

## TYPE-DESIGN-7 [LOW] features/demo/engine/types/index.ts:184-201

**Claim.** `NoteSection`'s own doc comment documents a correlated-field invariant that the
type does not express, and `reconcileSections` does not heal a violation of it.

**Evidence.**

The type comments state the rule twice — the state table's `Auto` row (`!manuallyEdited`)
and, on `generatedContent`, *"For un-edited sections this always equals content."* The shape
is flat and independent:

```ts
export interface NoteSection {
  id: NoteSectionId
  content: string
  generatedContent: string
  userAddendum?: string
  manuallyEdited: boolean
}
```

`{ manuallyEdited: false, content: 'a', generatedContent: 'b' }` is constructible and
type-legal. The reconciler does not repair it
(`engine/logic/notes/section-reconciler.ts:109-115`):

```ts
    // Un-edited: auto-track. Same output → same reference (no churn).
    if (fresh === stored.content) {
      return stored
    }
```

Comparison is against `content` only, so an un-edited section whose `generatedContent` has
drifted from `content` is returned by reference with the drift intact — for as long as the
formatter keeps producing the current `content`.

Reachability is the reason this is LOW, not MEDIUM: every in-repo writer preserves the
invariant (`reconcileSections` create/update arms, `resetNoteSection`, `restoreAllNotes` all
set both fields together; `commitNoteSection` and `scrapAllNotes` set `manuallyEdited: true`
first), and the only external boundary — the sessionStorage snapshot — is behind
`noteSectionSchema` and a whole-snapshot discard on any shape failure
(`persistence.ts:41-53`). A violation requires hand-editing sessionStorage, and its worst
consequence is a stale staleness baseline, which self-heals on the next formatter change.

**Suggested fix.** Probably none — record it. `NoteSection` is a phone-verbatim port
(`notes/types.ts` header) and the RetentionView-style union

```ts
type NoteSection = { id: NoteSectionId; userAddendum?: string } & (
  | { manuallyEdited: false; content: string }
  | { manuallyEdited: true; content: string; generatedContent: string }
)
```

would diverge the demo's persisted shape from the phone's for an unreachable state — against
this phase's whole premise. If anything is done, the cheap half is making the reconciler's
un-edited arm compare `fresh === stored.content && fresh === stored.generatedContent`, which
makes the invariant self-healing at one operator's cost. Flagging so the choice is explicit
rather than accidental.

**Confidence.** High on the analysis and on the unreachability; deliberately filed as
"record, don't fix."

---

## TYPE-DESIGN-8 [LOW] features/demo/ui/screens/NotesScreen.tsx:90-94

**Claim.** Two different type shapes now model "a dialog button, possibly destructive" in
the same feature, and the older one models an opt-in flag as `?: boolean` against the
`draft?: true` precedent. Separately, `AlertState` in the bridge re-derives
`AlertDialogProps` by hand.

*(Scope note: not re-litigating AlertDialog's scrim/`aria-modal` semantics or the §39.1
harmonization decision — both are on the phase's do-not-re-flag list. This is only about the
two type shapes.)*

**Evidence.**

New primitive (`ui/controls/AlertDialog.tsx:8-13`):

```ts
export interface AlertAction {
  label: string
  style?: 'default' | 'cancel' | 'destructive'
  onPress(): void
}
```

Screen-local, unchanged (`ui/screens/NotesScreen.tsx:90-94`):

```ts
interface DialogAction {
  label: string
  destructive?: boolean
  onPress?: () => void
}
```

`destructive: false` is not a meaningful state — the flag is either set or the button is
ordinary — which is precisely the `Feature.draft?: true` rationale from the PR #8 review
(*"`draft: false` is not a meaningful state, so the type rejects it"*). `onPress?` is also
optional here and required on `AlertAction`, for the same concept.

Third copy, in the bridge (`ui/DemoExperience.tsx:45-49`):

```ts
interface AlertState {
  title: string
  message: string
  actions: readonly AlertAction[]
}
```

which is exactly `Omit<AlertDialogProps, 'onDismiss'>` — it is spread straight back into the
component at `DemoExperience.tsx:578`.

**Suggested fix.** Minimal: change `destructive?: boolean` → `destructive?: true`. Better,
if NotesScreen's `ConfirmDialog` is ever folded into `AlertDialog` (not proposed here —
`ConfirmDialog` has a distinct stacked-list layout and a dismissing scrim), it comes free.
And `type AlertState = Omit<AlertDialogProps, 'onDismiss'>` in the bridge.

**Confidence.** High on the shapes; LOW severity — no invalid state, and the `?: boolean`
half is a one-token fix.

---

## Verification performed

- **`tsc --noEmit` on the branch: clean** (exit 0, zero diagnostics). No type lies about
  runtime in the changeset.
- **The new registry-exhaustiveness device actually fires.** `section-registry.ts:74-79`
  introduces a compile-time guard this repo has not used before, so I did not take it on
  faith — I reproduced it with `timeOnScene` omitted from the registry and compiled under
  `--strict`:

  ```
  error TS2322: Type 'true' is not assignable to type 'never'.
  ```

  Confirmed: adding a `NoteSectionId` member without a `SECTION_DEFINITIONS` entry is a
  build break. No distributive-conditional trap — `MissingRegistryEntry` is a type alias,
  not a naked type parameter, so `never extends never ? true : never` resolves to `true` as
  intended. This is the strongest new type device in the PR and it works.
- **Snapshot boundary confirmed closed** for TYPE-DESIGN-7's reachability call:
  `persistence.ts:41-53` documents, and `loadSnapshot` (`:378-398`) implements, whole-snapshot
  discard on any parse/version/shape failure — an unregistered `NoteSectionId` cannot reach
  the store, which also makes `reconcileSections`' defensive drop and `freshSectionContent`'s
  throw agree in practice despite taking opposite stances.
- **`accuracyM` optionality is honoured at every read site** (`grep -rn accuracyM`, all
  non-test hits inspected): `CoordinateDisplay.tsx:67,105` gate on `!== undefined`,
  `camera-formatter.ts:61` gates on `!= null && Number.isFinite && > 0`, and
  `formatAccuracy(accuracyM: number)` is only ever called inside those guards. The widening
  did not leave a consumer assuming a number.

## Checked and found sound (no finding)

| Surface | Verdict |
|---|---|
| `TimestampParse` (`ocr.ts:98-102`) | Precedent 3, correctly applied — replaced a `string \| null` that was inventing dates. The `kind` discriminant carries payload only on the arm that has it. |
| `GpsCaptureOutcome` / `GpsFailure` / `GpsErrorCode` (`gps.ts:60-74`) | `{ ok: true; fix } \| { ok: false; failure }`, codes from an `as const` tuple. `UNKNOWN` deliberately dropped "rather than carried as a dead variant… add it back only alongside a producer" — the right call, and documented. |
| `GpsFix.accuracyM: number` (required) vs `GpsCoordinates.accuracyM?` | Correct distinction, not an inconsistency: a capture always measures a radius; a stored coordinate may come from a source that did not. Two types for two provenances. |
| `FinalSubmissionOutcome` (`final-submission.ts:49`) | `{ ok: true } \| { ok: false; errors: readonly string[] }` — precedent 3; `readonly` on the returned array; a passing gate cannot expose `errors`. |
| `NOTE_SECTION_IDS` → `NoteSectionId` → `z.enum(NOTE_SECTION_IDS)` | Snapshot-guard device 3 wired exactly as the file's R-4a contract requires; union and schema enum cannot drift. |
| `SECTION_DEFINITIONS` `as const satisfies readonly SectionDefinition[]` | Readonly registry (precedent 7) + `satisfies` typing (precedent 5) + the exhaustiveness guard above. Display order derived from array position, never a stored `order` field (precedent 9). The disconnected `cameras` entry keeps its registry slot with the rationale in-line — correct, since removing it would break the guard. |
| `NoteSectionMeta` (`section-meta.ts:17-29`) | Derived view-model; `stale` and `freshContent` computed live, never stored (precedent 4, and the type comment says so). |
| `DialogState` (`NotesScreen.tsx:305-310`) | `kind`-discriminated four-arm union + `null`; payload only on the arms that need it. |
| `NotesRelevantFormData` (`notes/types.ts:49-73`) | Deliberately phone-verbatim so the seven formatters port unchanged, with `extractNotesRelevantData` as the single documented coercion site (rule F5). The always-`''` `address` field is the documented legacy-fallback seam, not dead weight. |
| `AlertAction` / `AlertDialogProps` | `actions: readonly AlertAction[]` — readonly on a prop the component only reads. Presentational: data + callbacks only, no store, no setter, no `Record<string, unknown>` bag. |
| `DstAdvisoryInput` (`dst-advisory.ts:43-52`) | `scopes: readonly DstAdvisoryScope[]` (readonly param that is only read — the `buildRetentionView` idiom); clock and DST predicate injected; the phone's dead `'info'` variant deliberately not ported, so no unreachable arm. |
| `CaseNotesData.notesSections?` / `notesFreeText?` | Consistent with the file's existing all-optional PDF-boundary design; the generator resolves both with `?? []` / `?? ''` and flattens through the single canonical assembler. |
| `isDvrTimeCorrect(diff: Pick<TimeDifference, 'formattedDifference'>)` | Narrowing a parameter to the field actually read, so the notes formatter's deliberately-narrowed `timeOffsetData` can call it without widening. Good. |
| `CaptureProgress`, `CaptureGpsDeps`, `GeolocationLike` | Honest I/O seam types; `geolocation: GeolocationLike \| null` where `null` is a real state (`UNSUPPORTED`), not an oversight. `positionErrorCode(error: unknown)` narrows structurally — `unknown` + narrowing, no `any`. |
| `isolatedModules` correctness | Barrel additions (`engine/index.ts:52-107`) use inline `type` modifiers throughout; `export *` re-exports of `dst-advisory` / `ocr` are type-safe. `tsc` clean confirms. |
| Store notes actions (`create-store.ts:459-631`) | Action signatures typed to `NoteSectionId` / `ScrapAllMode` / `RestoreAllMode`, not `string`. The id-space discipline is right at the store boundary — TYPE-DESIGN-1 is purely a UI-side omission. |
| No `any` introduced | Swept the diff; none. |

## Tracked items deliberately not re-filed

- **deferred.md §5** — `updateField(path: string)` remains untyped and is used by this diff
  (`DemoExperience.tsx:975`, `onCoordinates` → `updateField('gps', …)`). Tracked, trigger not
  fired by this PR (no change to how `updateField` is typed or constructed). Noting the new
  call site so §5's eventual `FieldUpdate` union accounts for it.
- **deferred.md §4, §16, §27** — untouched by this diff.
- **deferred.md §38** — the four hand-rolled address joins. Its stated trigger ("when P2.3's
  `formatAddress` port lands, make it the single producer") **fired** this phase and was
  mostly executed (`selectCaseNotesData`, `screenData`, `mapData`, the notes formatter, the
  bridge's summary joins). One listed site was not converted:
  `toFinalSubmissionInput` (`final-submission.ts:86-89`) still hand-joins with its own
  trim-then-filter expression. That is a duplication finding rather than a type-shape one, so
  it belongs to the TypeScript lane — recorded here only because I verified the trigger and
  do not want it read as untouched.

## Phase do-not-re-flag list — honoured

D10 divergence §39.5 · §M13 2σ refutation · `asyncUtilTimeout` 5000 · AlertDialog semantics
(scrim/`aria-modal`) · phone bugs deliberately not copied · snapshot v4 union · the
orchestrator merge commits *including the `accuracyM` widening rationale* · the today-guess
gate · ledger §29–§42. TYPE-DESIGN-3 and TYPE-DESIGN-8 each touch the neighbourhood of a
listed item and each carry an explicit scope note stating what is **not** being questioned.

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 4 |

Canonical homes preserved (no parallel entity declarations): **no** — TYPE-DESIGN-1/-3/-4/-6
Discriminated unions well-formed: **partial** — new ones are correct; `DvrTimestampReading` (TYPE-DESIGN-2) is flat
Exhaustiveness enforced (never-checked switches): **partial** — `FallbackMode` and the new registry guard are correct; `gpsSourceLabel` is not (TYPE-DESIGN-4)
Correlated state modelled as a union: **flat shape found** — TYPE-DESIGN-2 (and, benignly, TYPE-DESIGN-7)
Id spaces typed (no bare-string registries/keys): **yes** — no new bare-`string` key anywhere; the finding is hand-retyped literals, not `string`
readonly discipline on shared data: **gap found** — TYPE-DESIGN-5 (one exported registry; the rest of the diff is clean)
Boundary types honest about untrusted input: **yes** — the snapshot guard's three devices hold, browser geolocation is narrowed from `unknown`, and the OCR parser stopped asserting a date it never read

**Verdict: APPROVE with comments.** No CRITICAL, no HIGH. The four MEDIUMs are drift
surfaces worth closing — TYPE-DESIGN-1 (silent, one-line fix) and TYPE-DESIGN-3 (already
cost a merge-time repair once) are the two with real payoff.
