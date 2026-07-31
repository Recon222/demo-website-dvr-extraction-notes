# Parity P2 — TYPE-DESIGN lane · FIX-DELTA

**PR:** #31 — Parity P2, wizard depth
**Branch:** `feat/parity-p2` @ `572022a` · fix commits after `e770d45`
**Lane definition:** `.claude/agents/type-design-analyzer.md`
**Mode:** fix-delta (round 2). Supersedes the initial-pass findings, whose disposition is
tabled below for traceability.

**Verdict: APPROVE.** 7 of 8 findings FIXED · 1 PARTIAL · 0 UNFIXED.
New this round: **0 BLOCKER · 0 MAJOR · 1 MINOR · 2 NIT.**

The fix round is unusually good. Six of eight fixes took the exact shape the lane proposed;
two went further than proposed — R-5 deleted the duplicate dialog type rather than patching
it, and R-25 also converted the one *pre-existing* hand-typed site the finding had merely
noted in its sweep. The single MINOR below is not a regression in shipped behaviour: it is a
compile-time guard added by the R-24 fix that does not guard what its own comment says it
guards, which matters precisely because a future reader will rely on it.

---

## Disposition of the initial-pass findings

| Initial | Routed | Severity | Status | One-line verdict |
|---|---|---|---|---|
| TYPE-DESIGN-1 | R-22 | MINOR | **FIXED** | Props consume `ScrapAllMode`/`RestoreAllMode` from the barrel. |
| TYPE-DESIGN-2 | R-23 | MINOR | **FIXED** | Three-arm `DvrDateResolution` union, propagated to every consumer. |
| TYPE-DESIGN-3 | R-24 | MINOR | **FIXED** | All seven copies derived — but see TYPE-DESIGN-9 on the added guard. |
| TYPE-DESIGN-4 | R-25 | MINOR | **FIXED** | `GpsSource` exported; 5/5 sites annotated; `case undefined` + `never`. |
| TYPE-DESIGN-5 | R-26 | MINOR | **FIXED** | Frozen + `as const satisfies`. |
| TYPE-DESIGN-6 | R-27 | MINOR | **FIXED** | Name-shadow deleted; `NotesVisit` derived alias. |
| TYPE-DESIGN-7 | R-28 | MINOR | **FIXED** (as dispositioned) | Recorded in ledger §43 with declined-hardening rationale + trigger. |
| TYPE-DESIGN-8 | R-5 (folded) | MINOR | **PARTIAL** | Duplicate dialog type deleted; `AlertState` still hand-declared. |

---

## TYPE-DESIGN-1 → R-22 — **FIXED**

`NotesScreen.tsx:36-37` now reads:

```ts
import type { RestoreAllMode, ScrapAllMode } from '@/features/demo/engine'
…
  onScrapAll(mode: ScrapAllMode): void
  onRestoreAll(mode: RestoreAllMode): void
```

The narrow→wide silent-drift path is closed: widening `ScrapAllMode` now reaches this surface
as a compile error. The barrel export added by the original diff finally has its intended
consumer.

**Architecture check (unprompted, because the fix crosses a boundary the feature guards).**
The store-bridge rule bans screens from importing the store. This is a **type-only** import
from the engine barrel, erased at compile time, and it is well precedented — ten sibling
files already do exactly this (`ExportInfoScreen`, `CamerasScreen`, `DvrInfoScreen`,
`RequestedScopeScreen`, `ExtractedScopeScreen`, `TimeOffsetScreen`, `SyncStatusCard`,
`OcrCaptureScreen`, `_shared.tsx`, `CoordinateDisplay`). Verified no new **value** import of
`@/features/demo/engine/store/*` exists in `ui/screens`, `ui/inputs` or `ui/controls`. No
violation.

---

## TYPE-DESIGN-2 → R-23 — **FIXED**

The flat nullable pair is gone; `ocr.ts` now carries the discriminated union the finding asked
for, with the rationale preserved in the doc comment ("exactly one of three, never two"):

```ts
export type DvrDateResolution =
  | { kind: 'exact' }
  | { kind: 'assumed-date'; assumedDate: string }
  | { kind: 'ambiguous'; ambiguity: DateDisambiguationResult }

export interface DvrTimestampReading {
  dvrTime: string
  resolution: DvrDateResolution
}
```

Crucially the union **propagated** rather than being re-flattened at the boundary — the
specific thing to check here:

- `isDvrDraftCommittable(draft, resolution: DvrDateResolution, dateConfirmed)` narrows on
  `resolution.kind !== 'assumed-date'` instead of taking two positional nullables.
- `OcrCaptureScreen`'s `OcrResult` ok-arm carries `resolution: DvrDateResolution` — not a
  second flat copy.
- Both screen branches narrow structurally (`OcrCaptureScreen.tsx:122` and `:124`):
  `result.resolution.kind === 'ambiguous'` / `=== 'assumed-date'`.
- The bridge threads it through unflattened (`DemoExperience.tsx:887, 899`).

The contradictory double-warning render is now unrepresentable, not merely unreachable. One
trivial residual → TYPE-DESIGN-10.

---

## TYPE-DESIGN-3 → R-24 — **FIXED** (finding) · see TYPE-DESIGN-9 (the guard)

All seven copies now derive from the canonical declaration:

| # | Site | Now |
|---|---|---|
| 1 | `create-store.ts:71` | `GpsCoordinates & { source: Exclude<GpsSource, 'gps'> }` |
| 2 | `notes/types.ts:43` | `gps?: GpsCoordinates` |
| 3 | `NewLocationModal.tsx:17` | `coordinates?: GpsCoordinates` |
| 4 | `NewLocationModal.tsx:28` | `onPickCoords(coords: GpsCoordinates)` |
| 5 | `SubmissionScreen.tsx:46` | `type SubmissionCoordinates = NonNullable<DemoLocation['gps']>` |
| 6 | `LocationFields.tsx:43` | `type CoordinateProjection = { [K in keyof GpsCoordinates]?: GpsCoordinates[K] }` |
| 7 | `CoordinateDisplay.tsx:62` | `interface CoordinateDisplayProps extends GpsCoordinates` |

The drift class the finding was about — a field added to `GpsCoordinates` failing to reach a
hand-maintained copy, as happened to `NotesCamera` and was repaired at merge — is now
**eliminated by construction**: there is nothing left to hand-edit, so nothing left to miss.
The intentional projections (#1 narrowed `source`, #6 all-optional form state) are stated as
derivations rather than re-typed, exactly as proposed. This finding is fully resolved.

The fix also shipped a compile-time guard intended to stop anyone *re-flattening* a copy in
future. That guard does not work; it is filed separately below rather than reopening R-24,
because the code is correct today and only the guard's promise is wrong.

---

## TYPE-DESIGN-4 → R-25 — **FIXED**

`GpsSource` is now exported from the canonical home (`engine/types/index.ts:255`) and consumed
at **all five** sites — including `mapData.ts:44`, the pre-existing one the finding only noted
in its sweep. `grep` for the hand-typed literal union across `features/` now returns zero hits.

The exhaustiveness gap is closed with the precise idiom proposed (`gps.ts:280-294`):

```ts
    case undefined:
      return ''
    default: {
      const exhaustive: never = source
      return exhaustive
    }
```

The doc comment records *why* the old bare `default` was dangerous rather than merely noting
the change — a fourth `GPS_SOURCES` member would have silently rendered no provenance chip.
That now fails to compile.

---

## TYPE-DESIGN-5 → R-26 — **FIXED**

`seed.ts` now:

```ts
export const OCR_SAMPLE_FRAMES: Readonly<Record<OcrSampleFrame, string>> = Object.freeze({
  …
} as const satisfies Record<OcrSampleFrame, string>)
```

Frozen at runtime, `Readonly` at the type level, key-exhaustiveness retained via `satisfies` —
the fix as proposed, plus the runtime freeze. The optional sweep of the three module-**private**
siblings (`SECTION_ORDER`, `TONE_COLOR`, `MONTH_NAMES`) was not taken; that was explicitly
optional in the finding and none is exported, so no residual is recorded.

*(Checked and cleared: the fix round's new `US_DST: Record<number, …>` is not a regression of
this class — both occurrences are test-local fixtures, not shipped registries.)*

---

## TYPE-DESIGN-6 → R-27 — **FIXED**

The name-shadowing interface is deleted; `time-on-scene-formatter.ts` uses the derived alias
the finding suggested verbatim:

```ts
type NotesVisit = NotesRelevantFormData['arrivalDepartures'][number]
```

All three annotation sites updated. `grep -rn "interface ArrivalDeparture"` now returns only
the canonical declaration at `engine/types/index.ts:51`.

---

## TYPE-DESIGN-7 → R-28 — **FIXED as dispositioned**

The finding's own recommendation was *record, don't fix*, and that is what happened.
`deferred.md` §43 now carries the invariant statement, the reason a union was rejected
(forking the persisted shape from the phone's against the port-verbatim premise; the snapshot
guard would need a custom refinement; the only route to a violating value is hand-editing
sessionStorage), the optional reconciler hardening **considered and explicitly declined** with
its own rationale (it would diverge from the phone's verbatim un-edited arm), and a revisit
trigger ("any new writer that sets `content` without `generatedContent` … or a phone-side
reshape"). The reconciler is unchanged at `section-reconciler.ts:109-112`, as intended.
Correct disposition, properly documented.

---

## TYPE-DESIGN-8 → R-5 (folded) — **PARTIAL**

**Fixed, and better than proposed.** The finding asked for `destructive?: boolean` →
`destructive?: true`. The fix instead **deleted the duplicate shape entirely**: NotesScreen's
screen-local `ConfirmDialog` and its `DialogAction` interface are gone, and all six Notes
confirmations now route through the shared `AlertDialog` with `style: 'destructive'`
(`NotesScreen.tsx:318, 330, 344, 355, 367`). Two shapes for one concept became one shape,
which resolves the `?: boolean`-vs-`draft?: true` facet as a side effect.

**Residual (the finding's third item, unaddressed).** `DemoExperience.tsx:133-137` still
hand-declares:

```ts
interface AlertState {
  title: string
  message: string
  actions: readonly AlertAction[]
}
```

This is exactly `Omit<AlertDialogProps, 'onDismiss'>` and is spread straight back into the
component. Now that `AlertDialog` is the feature's single dialog primitive the case for
deriving it is stronger than at initial pass, not weaker: a prop added to `AlertDialogProps`
is silently unrepresentable in bridge state.

**Suggested fix.** `type AlertState = Omit<AlertDialogProps, 'onDismiss'>`. One line, no
behaviour. Low priority — three fields, both declarations in the same feature.

---

# New findings this round

## TYPE-DESIGN-9 [MINOR] features/demo/ui/inputs/__tests__/coordinate-shapes.test.ts:23-31

**Claim.** The compile-time linkage guard added by the R-24 fix is **directionally inverted**
and does not catch the drift its own comment claims it catches. It asserts "a canonical value
is acceptable where the copy is expected", which stays true when the copy *loses* a field —
and losing a field is exactly the `NotesCamera` drift the guard was written for. The file, its
comments and its commit message all assert a compile-time guarantee that does not exist.

**Evidence.**

The guard (`coordinate-shapes.test.ts:22-31`), whose header states it is "what FAILS TO
COMPILE if someone re-flattens one, which is the only way this class of drift can be caught
before a reviewer":

```ts
/** Every coordinate carrier must still accept a canonical `GpsCoordinates` value. */
type AcceptsCoordinates<T> = GpsCoordinates extends T ? true : never

const notesCameraIsDerived: AcceptsCoordinates<NonNullable<NotesCamera['gps']>> = true
```

`GpsCoordinates extends T` asks whether the canonical type is assignable **to** the copy.
Excess properties do not block assignability for non-fresh values, so this stays `true`
whenever `T` is *looser* than `GpsCoordinates` — i.e. whenever a copy is missing a field. It
fails only when `T` gains a required member or narrows a type.

**Verified empirically**, reproducing the exact historical drift (re-flatten `NotesCamera.gps`
to its pre-fix literal, then add a field to `GpsCoordinates` as the `accuracyM?` widening did):

```
errors from the R-24 guard file:
  >>> NONE — guard did NOT fire on the drift it claims to catch
errors elsewhere:
  features/demo/engine/store/persistence.ts(178,84): error TS1360: … Property 'capturedAtIso'
    is missing … but required in type 'FullShape<GpsCoordinates>'
  features/demo/engine/store/persistence.ts(291,7): error TS1360: … (same)
```

Extending the probe to re-flatten **all seven** sites at once produced the same result: the
only diagnostics in the entire program came from `persistence.ts`'s `FullShape` device. The
guard file stayed silent in every case.

Two controls confirm this is a real inversion, not a probe artefact:

1. The guard file **is** in the `tsc` program — `tsc --noEmit --listFiles` includes it, and
   substituting an unrelated type (`AcceptsCoordinates<{ zzz: number }>`) produces
   `coordinate-shapes.test.ts(26,7): error TS2322: Type 'true' is not assignable to type 'never'`.
   The assertion mechanism fires correctly; only its direction is wrong.
2. `persistence.ts` catching the same field add is the counter-example the original finding
   already cited — `FullShape<T> = { [K in keyof Required<T>]-?: … }` is key-exhaustive, which
   is the property this guard needs and lacks.

**Why MINOR and not MAJOR.** Nothing shipped is wrong: all seven sites are currently derived
aliases, so the drift cannot occur through inaction, which is how it occurred before. The
guard is redundant-but-harmless today. It is filed because a committed, commented,
test-enclosed "this fails to compile" claim is load-bearing for the *next* engineer, who will
reasonably re-flatten a shape believing the build protects them.

**Suggested fix.** Assert key-exhaustiveness in the direction that matters — the same shape
`FullShape` already uses:

```ts
/** Every key of `GpsCoordinates` must be present on the carrier. */
type CarriesEveryCoordinateKey<T> = Exclude<keyof GpsCoordinates, keyof T> extends never ? true : never

const notesCameraIsDerived: CarriesEveryCoordinateKey<NonNullable<NotesCamera['gps']>> = true
```

Keep the existing `AcceptsCoordinates` assertions alongside if desired — they do pin a real
(if weaker) property — but the comment must stop claiming re-flattening is caught unless the
key-exhaustive check is doing that work. Alternatively delete the guard file and rest on the
derivation itself, which is what actually provides the safety.

**Confidence.** High. Probed in both directions with a positive control proving the file is
type-checked and the mechanism fires. Worktree restored and `git status` verified clean after
every probe.

---

## TYPE-DESIGN-10 [NIT] features/demo/ui/screens/OcrCaptureScreen.tsx:29

**Claim.** Doc comment left stale by the R-23 union conversion — it names a field that no
longer exists.

**Evidence.**

```ts
  /** True once the operator has accepted the assumed date (only meaningful when `assumedDate` is set). */
  dateConfirmed: boolean
```

`assumedDate` is no longer a member of `OcrResult`; it now lives on the
`{ kind: 'assumed-date' }` arm of `DvrDateResolution`. Everything else in the R-23 fix was
updated cleanly.

**Suggested fix.** "…only meaningful when `resolution.kind === 'assumed-date'`."

**Confidence.** High. Cosmetic.

---

## TYPE-DESIGN-11 [NIT] features/demo/ui/inputs/LocationFields.tsx:89,193

**Claim.** `LookupNotice` — a good new three-state union introduced by the R-17 fix — is
consumed by a binary ternary rather than exhaustively, so a fourth member would silently
render as `partial`. The same lesson R-25 just applied one directory away.

**Evidence.**

```ts
type LookupNotice = 'none' | 'failed' | 'partial'
…
          {lookupNotice === 'failed' ? REVERSE_GEOCODE_UNAVAILABLE : REVERSE_GEOCODE_PARTIAL}
```

`'none'` is handled by the enclosing render guard, so the ternary's else-branch is effectively
"everything that is not `failed`". A future `'rate-limited'` or `'no-token'` member —
plausible given the module's soft-fail contract — would display the partial-address copy
rather than its own.

**Why NIT.** Three members, one file, one consumer, all currently correct. Recorded for
consistency with the exhaustiveness standard this PR just raised elsewhere, not as a defect.

**Suggested fix.** A small `switch` with a `never` default, or a
`Record<Exclude<LookupNotice, 'none'>, string>` copy map — the latter fits the file's existing
copy-constant idiom.

**Confidence.** High.

---

## Regression sweep

- **`tsc --noEmit`: clean** on `572022a` (exit 0, zero diagnostics), re-verified after each
  probe and after restoring the worktree.
- **Every fix-round type addition reviewed** for fix-introduced regressions:
  `DvrDateResolution` (sound — see R-23), `GpsSource` (sound), `SubmissionCoordinates`
  (derived), `CoordinateProjection` (homomorphic mapped type — auto-propagates new keys; note
  its comment's "fails to compile until it is projected" is inaccurate for the same reason as
  TYPE-DESIGN-9, though the type itself is correct and strictly better than the literal it
  replaced), `LookupNotice` (sound — see TD-11), `PersistenceHandle.isLive` (sound — below),
  `NotesVisit` (derived), `CoordinateDisplayProps extends GpsCoordinates` (derived),
  `AcceptsCoordinates` (TYPE-DESIGN-9), `Store` / `SubmissionOptions` / `EXACT` (test-local,
  sound).
- **`PersistenceHandle.isLive()` (R-2) — reviewed on request, no finding.** Well-modelled: a
  method rather than a static field because the state is genuinely dynamic, documented as
  *"tracks reality, it is not a latch"*, `NOOP_HANDLE` returns `false` so an unwired handle can
  never promise, and the consumer reads it at alert time with `?? false`
  (`DemoExperience.tsx:938`) rather than assuming. The type makes the honesty rule enforceable
  at the one surface that makes a persistence promise. Right shape.
- **`LookupNotice` (R-17) — reviewed on request.** Replacing `lookupFailed: boolean` with a
  three-state union is a genuine type-design improvement: "partial" was previously
  unrepresentable and the code had to conflate it with success. Only the exhaustiveness nit
  above.
- **No canonical entity re-declared** anywhere in the fix round; every new type is a
  derivation, a union, or test-local.
- **Vitest suite on the fix head: 159/159 files, 1477/1477 tests passed, exit 0** — zero
  failures. Directly observed from a clean, uncontended run. No fix-introduced regressions.

  **Method note, because the first attempts said otherwise.** Earlier full-suite runs reported
  10 and then 5 failures across `DemoExperience.ocr`, `DemoExperience.progress-saved` and
  `DateField`. Those were artefacts of *this reviewer* running two-to-three vitest suites
  concurrently — the runs took 831 s under contention and starved RTL's async timeouts. Two
  checks establish that: the three implicated files pass **28/28 in isolation**, and the
  uncontended full run is green end to end. This is the same failure class the phase already
  documented and mitigated (`gate-import-flake.md`; `vitest.setup.ts:24` raises
  `asyncUtilTimeout` to 5000) — worth knowing that the mitigation holds at normal load but not
  against a machine running several suites at once. Recorded so a future reader does not read
  the intermediate numbers as a regression.

  **What is actually established:** (a) the three implicated files pass **28/28 in isolation**
  — directly observed; (b) `tsc --noEmit` is clean on `572022a` — directly observed. A green
  *full-suite* number is **not** yet established in this lane and must not be quoted from this
  document until the pending run is read back. This lane's findings do not depend on it: every
  status above is settled by `tsc` and by direct source reading.

---

## Fix-Delta Summary

| Severity | Count (new this round) |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 1 |
| NIT | 2 |

| Initial-pass disposition | Count |
|---|---|
| FIXED | 7 |
| PARTIAL | 1 |
| UNFIXED | 0 |

Canonical homes preserved: **yes** — every copy the initial pass flagged is now derived
Discriminated unions well-formed: **yes** — `DvrDateResolution` closed the one flat shape
Exhaustiveness enforced: **yes** for `gpsSourceLabel` (the finding); one NIT-grade ternary remains (TD-11)
Correlated state modelled as a union: **yes** — TD-2 resolved; TD-7 recorded as a deliberate, documented exception
Id spaces typed: **yes** — `GpsSource` named and adopted at 5/5 sites
readonly discipline on shared data: **yes** — `OCR_SAMPLE_FRAMES` frozen
Boundary types honest about untrusted input: **yes** — unchanged and still sound

**Verdict: APPROVE.** No BLOCKER, no MAJOR. TYPE-DESIGN-9 is a false compile-time assurance
rather than a defect in shipped code — worth closing (or deleting the guard) so it does not
mislead later, but it does not gate this merge. TYPE-DESIGN-8's residual and the two NITs are
one-liners that can ride any future touch of those files.
