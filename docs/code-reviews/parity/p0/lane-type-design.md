# Lane review — type design (parity P0, PR #29) — FIX-DELTA

- **Lane:** `type-design` (`.claude/agents/type-design-analyzer.md`)
- **Mode:** FIX-DELTA — re-review of the fix round for the vetted P0 phase review
- **Fix range:** `git diff 165de2b..feat/parity-p0` (32 files, +851 / −187), i.e. everything after the
  review commit: three fix branches merged into `feat/parity-p0`
  (`parity/p0-fix-boundary` → `0501023`, `parity/p0-fix-options` → `e74be8c`,
  `parity/p0-fix-store` → `a25396b`).
- **Refs read:** prior vetted review `docs/code-reviews/parity/p0/p0-review.md` (R-1…R-18);
  my prior lane file (TYPE-DESIGN-1…5); `.claude/agents/type-design-analyzer.md`;
  `features/demo/CLAUDE.md`; root `CLAUDE.md`; `docs/code-reviews/deferred.md` (§4, §5, §16, §27,
  §29–§32); `docs/planning/demo-phone-parity/01-master-parity-plan.md`.
- **Full files read behind the hunks:** `engine/store/persistence.ts`, `engine/store/create-store.ts`,
  `engine/types/index.ts`, `engine/store/selectors.ts`, `engine/content/form-options.ts`,
  `engine/content/screens.ts`, `engine/content/explore.ts`, `engine/logic/import.ts`,
  `engine/index.ts`, `ui/DemoExperience.tsx`, `ui/screens/CamerasScreen.tsx`,
  `ui/screens/CompletionScreen.tsx`, `ui/screens/screenData.ts`, `ui/chrome/DemoErrorBoundary.tsx`,
  `ui/inputs/Dropdown.tsx`, `app/demo/error.tsx`, plus every changed test file.
- **Gates run for this pass:** `npx tsc --noEmit` → clean (exit 0);
  `vitest run features/demo/engine/store features/demo/engine/content` → 11 files / 143 tests green.
- **Type probes run to ground this pass** (scratchpad, outside the repo; the repo's own
  zod 3.25.76, `strict: true`, `target: es5`). Results quoted inline; the probe is the basis for
  every claim below about what `FullShape` / `z.ZodType<T>` do and don't catch.

**Severity mapping:** BLOCKER = lane-CRITICAL, MAJOR = lane-HIGH/upper-MEDIUM,
MINOR = lane-lower-MEDIUM/LOW.

**Counts (new findings this pass):** 0 BLOCKER · 1 MAJOR · 4 MINOR.

---

# Part 1 — Fix-delta on prior lane findings

| Prior | Aggregated as | Verdict | Fix commit |
|---|---|---|---|
| TYPE-DESIGN-1 | R-4 (MAJOR) | **FIXED** (2 MINOR residuals filed below) | `cf96bb5` |
| TYPE-DESIGN-2 | R-2 (MAJOR) | **FIXED** | `c78ee30` |
| TYPE-DESIGN-3 | R-16 (MINOR) | **FIXED** | `4b4f06c` |
| TYPE-DESIGN-4 | R-17 (MINOR) | **FIXED** (by deletion; 1 MINOR residual) | `a0ec7f6` |
| TYPE-DESIGN-5 | R-18 (MINOR) | **FIXED** | `65faab0` |
| lane non-finding on zod | R-9 (MINOR) | **FIXED** (doc-only) | `3967198` |

## TYPE-DESIGN-1 → R-4 — snapshot drift guard: **FIXED** (with two MINOR residuals)

All three claimed drift directions are genuinely closed, and the over-claiming header was
rewritten. Verified device by device, then probe-verified.

**(a) Narrowed `z.enum` — FIXED.** Every closed union in the persisted graph is now an
`as const` tuple in its canonical home and the schema consumes *the same value*:
`PROFILES` (`engine/types/index.ts:15`), `SYNC_METHODS` (`:57`), `OFFSET_DIRECTIONS` (`:80`),
`CAPTURE_METHODS` (`:81`), `MEDIA_KINDS` (`:139`), `CASE_STATUSES` (`:179`),
`COORD_SOURCES` (`:182`), `GPS_SOURCES` (`:184`) — consumed at `persistence.ts:113, 136, 141,
182, 226, 231, 255, 292`. I re-checked all 14 mirrored shapes field-by-field: there is no
hand-typed `z.enum` literal left in the file. The exact fix this lane asked for (precedent 9,
derive-from-the-source), applied to all eight unions rather than the six I named.
`CaptureState.method` was additionally re-pointed at the shared `CaptureMethod`
(`create-store.ts:68`), which also retires half of deferred §5's "`method`/`captureMethod`
rename trap".

**(b) Forgotten optional — FIXED.** New device 2: `FullShape<T>` (`persistence.ts:96`) applied
via `satisfies` to every nested shape literal (`:104, 110, 121, 129, 143, 151, 155, 170, 178,
190, 210, 211, 226, 234, 256, 259, 268`). Probe-verified against the repo's zod:

```
CASE 1  forgotten optional  → TS1360 "Property 'b' is missing … but required in FullShape<D1>"   ✅ caught
CASE 2  extra unknown key   → TS2353 "'zzz' does not exist in type 'FullShape<D2>'"              ✅ caught
CASE 3  required given .optional() → TS2322 (device 1, the outer z.ZodType<T> annotation)        ✅ caught
```

So the P3.7 per-camera-coordinate scenario I named is now a compile error. The runtime pin I
asked for landed too — `persistence.test.ts` "maximal round-trip (R-4b runtime pin)" populates
every optional in the graph and asserts `snapshotOf(rehydrated) === snapshotOf(original)`.
*Residual:* device 2 is applied to 17 of 18 shape literals — the top-level `persistedStateSchema`
(`:291`) is the exception. Filed as **TYPE-DESIGN-B**.

**(c) `APP_VIEWS` non-exhaustive — FIXED.** `persistence.ts:275` is now
`const EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true }`,
with `APP_VIEWS: readonly AppView[]` built from `CHAPTERS`, `LAUNCHABLE` and
`Object.keys(EXTRA_VIEWS)` (`:276-280`). Exactly the `MODAL_IDS` pattern I pointed at; a new
tab-only `AppView` is now a compile error at that line.

**(4) Softened header — FIXED.** `persistence.ts:79-93` replaces the "drift … is a COMPILE
error" blanket with a three-device enumeration plus an explicit "NOT enforced at compile time"
list. *Residual:* that list omits the field-*widening* direction, which the probe shows is still
silent. Filed as **TYPE-DESIGN-D**.

## TYPE-DESIGN-2 → R-2 — Cameras custom-mode flags: **FIXED**

`CamerasScreen.tsx:29-34` — both maps are now `Record<string, boolean>` keyed by
`CameraEntry.id`, seeded from the stored values via the canonical `isCustomResolution` /
`isCustomFps` (`engine/content/form-options.ts:96, 102`), with functional updaters
(`:38, 41, 48, 51`) and id-based reads (`:70, 73, 76, 79`). The removal scenario I described is
no longer constructible: `remove` still re-indexes the array (`DemoExperience.tsx:124`) but the
flags no longer live in index space. Both directions are now pinned by tests
(`option-parity.test.tsx`, "custom mode survives another camera's removal"). The secondary
rehydrate gap (a stored `1440x900` reopening in custom mode) is closed by the seeding, which the
orchestrator recorded as review-authorized. Camera ids come from a module-level monotonic counter
(`DemoExperience.tsx:105, 117` — `ui-c${uiSeq++}`, re-seeded past rehydrated ids at `:163`), so
stale map entries for removed rows can never be re-matched by a recycled id — checked explicitly.

## TYPE-DESIGN-3 → R-16 — `FALLBACK_COPY` bare-string registry: **FIXED**

`DemoErrorBoundary.tsx:16` is `Partial<Record<AppView, string>>`; `view: AppView` (`:59`),
`lastView: AppView` (`:70`), via a type-only import (`:5`). The lookup at `:118` keeps
`?? GENERIC_COPY` as the runtime default. The stale "no engine imports" rationale was replaced
with the correct one (`:12-14`).

## TYPE-DESIGN-4 → R-17 — `FORM_OPTIONS` lost `as const`: **FIXED by deletion**

`engine/logic/import.ts:199-202` — the registry is gone, replaced by a NOTE explaining why
(R-11/R-17 taken together, as the review suggested). Grep confirms zero remaining references
outside docs. The mutability regression is moot because the object no longer exists.
*Residual:* its only production consumer was the deleted registry, so `optionValues`
(`form-options.ts:83`) is now an orphaned export on the engine barrel. Filed as
**TYPE-DESIGN-E**.

## TYPE-DESIGN-5 → R-18 — redundant `as` casts: **FIXED**

`persistence.ts:376-380` — both casts are gone; the fields are now assigned to explicitly-typed
locals (`const currentChapter: ChapterId = d.currentChapter`, `const view: AppView = d.view`) so
a loosened `isAppView`/`isChapterId` becomes a compile error, with the rationale recorded in the
comment. This is stronger than what I suggested (the annotated locals make the dependency
explicit rather than implicit).

## R-9 — unrecorded first client-shipped zod: **FIXED** (documentation)

`docs/code-reviews/deferred.md` §32 (`3967198`) records the cost, the reason, the replacement
path, and the un-defer trigger, and correctly captures this lane's endorsement of the direction
so a later round doesn't "fix" the zod usage itself. `docs/planning/demo-phone-parity/demo-inventory.md`
was corrected in the same commit.

## Also re-checked (fix-round changes outside my prior findings)

- **R-1 (BLOCKER) type surface** — `LocationForm.completed: boolean` (`types/index.ts:174`) lives
  in the canonical home, is initialized in `blankLocationForm()` (`content/seed.ts:63`), is in the
  snapshot schema (`persistence.ts:205`) *and* forced there by `FullShape<LocationForm>`, and the
  snapshot version was correctly bumped v1→v2 with the key suffix (`persistence.ts:62-63`).
  `completed: boolean` rather than `?: true` is right here: `false` is a meaningful, always-present
  state on a fully-constructed form (same shape as its siblings `notesEdited`,
  `extractedScopesPartial`), so the `Feature.draft?: true` precedent does not apply. Storing it
  rather than deriving it is also right by the lane's derived-vs-stored test — it is a captured
  user action, not a render-time convenience, and `selectLocationMapStatus` now reads it as the
  authority (`selectors.ts:196`) instead of re-deriving a contradicting answer. **But** the
  action's precondition is under-typed — see **TYPE-DESIGN-A**.
- **R-15 load-time repair** (`persistence.ts:386-400`) — ordering is correct: `restoredChapter` is
  repaired before `restoredView` falls back to it, so a launchable view + dangling location can't
  restore into a wizard screen. No new type introduced.
- **R-5** `app/demo/error.tsx` — props typed to Next's segment-boundary convention
  (`error: Error & { digest?: string }`, `reset: () => void`); imports nothing from the demo
  barrel, so the feature's public surface is untouched. No finding.
- **R-10** `Dropdown` `aria-labelledby` + `useId` — no type surface changed
  (`DropdownProps.options: ReadonlyArray<string | PickerOption>` untouched). No finding.
- **R-3 / R-6 / R-12 / R-13 / R-14 / R-7 / R-8** — test-hygiene, timeout, focus and runtime-guard
  fixes with no type surface; the `isVisitId` change (`persistence.ts:288-289`) keeps the type
  predicate and only swaps `in` for `hasOwnProperty.call`, which is the right shape.
- **No parallel entity declarations introduced.** Every new/changed test imports the canonical
  types and uses `engine/store/__tests__/test-utils.ts`; the maximal-round-trip fixture builds
  entities through the store's own actions rather than re-declaring them.

---

# Part 2 — New findings (fix-introduced / fix-round blast radius)

## TYPE-DESIGN-A [MAJOR] features/demo/engine/store/create-store.ts:219

**Claim.** The R-1 fix gave `completeCase(caseId)` a second, *conditional* write whose
correctness depends on an invariant the signature doesn't express — `caseId` must be the case of
the **current location**. Nothing types or checks that. The call site's new `canComplete` guard
asserts a different, weaker proposition (`a location exists AND a case exists`), so in the
reachable state where the two disagree the action half-applies: an unrelated case is marked
`'complete'` (green card, "0 locations") while **no** location is stamped, `isComplete` stays
false, and "Complete & Save" does nothing visible. That is precisely the silent no-op R-1's fix
list set out to eliminate ("disable the button or surface why"), plus a fake success on the
Cases screen — the plan §4 honesty rule the aggregator used to justify R-1's BLOCKER.

**Evidence.**

- `create-store.ts:219-229`
  ```ts
  completeCase: (caseId) =>
    set((s) => ({
      cases: s.cases.map((c) => (c.id === caseId ? { ...c, status: 'complete' as const } : c)),
      locations: s.locations.map((l) =>
        l.id === s.currentLocationId && l.caseId === caseId ? … : l,
      ),
    })),
  ```
  The case write is unconditional; the location write is guarded by a **two-field** predicate.
  `caseId: string` gives the caller no way to know the second write will match, and no return
  value reports that it didn't.
- `DemoExperience.tsx:727` — `canComplete={!!currentLocation && !!currentCase}`. `currentLocation`
  is `locations.find(l => l.id === currentLocationId)` (`:267`) and `currentCase` is
  `cases.find(c => c.id === currentCaseId)` (`:269`) — two independent lookups. Neither the prop
  nor `CompletionScreenProps.canComplete: boolean` (`CompletionScreen.tsx:22`) says anything about
  the two agreeing.
- **The divergent state is created by the store itself.** `createCase` (`create-store.ts:215`)
  sets `currentCaseId` and **leaves `currentLocationId` pointing at the previous case's location**:
  `set((s) => ({ cases: [c, ...s.cases], currentCaseId: id }))`. `addLocation` (`:250-254`) is the
  mirror image — it sets `currentLocationId` but not `currentCaseId`. Only `switchLocation`
  (`:258-262`) writes both.
- **Reachable in five ordinary interactions**, no unusual input:
  1. Cases → New Case → case **A** created (`currentCaseId = A`).
  2. Cases → Add Location on A → `currentLocationId = L1` (`L1.caseId = A`). Aligned.
  3. Cases → New Case again → case **B** created. `currentCaseId = B`, `currentLocationId = L1`.
     **Diverged.**
  4. Rail → "Completion". `EXPLORE_ITEMS` lists all ten wizard screens with
     `jumpTo: d.id` (`engine/content/explore.ts:41`), wired to `setView` at
     `DemoExperience.tsx:875` — the rail is rendered on every view, so this is a one-click
     affordance, and `setView` touches neither selection id.
  5. `canComplete` is `true` (L1 exists, B exists) → tap "Complete & Save" →
     `completeCase('B')` → B goes `'complete'`; L1 is untouched (`L1.caseId = A ≠ B`);
     `isComplete` (`DemoExperience.tsx:726`) stays `false`. The screen does not change. On the
     Cases list, case B renders the green **"Complete"** chip (`screenData.ts:16-17`, via
     `toCaseCards` `:91`) beside `"0 locations"` (`:95`).
- **The fix round enshrined the store half of this as intended**:
  `store.test.ts:220` — *"never stamps a location belonging to a different case"* asserts
  `cases.find(caseB).status === 'complete'` while `locations[0].form.completed === false`. So the
  partially-applied state is a tested, deliberate store behaviour; what is missing is any type or
  guard stopping the **UI** from invoking it.
- **What changed vs. pre-fix:** before `5c319e4`, `isComplete` read `currentCase?.status ===
  'complete'`, so the same sequence at least produced (wrong) feedback. After the fix the tap is
  a no-op on screen while still falsely greening case B. The new `canComplete` prop was added
  specifically to kill the silent-no-op class (`CompletionScreen.tsx:20-22`) and encodes the wrong
  predicate.

**Suggested fix.** Make the correlated pair unrepresentable at the boundary rather than
re-checking it at every call site — the `RetentionView` precedent applied to an action signature:

1. Preferred: change the action to `completeCase(locationId: string)` (or no argument, deriving
   both from the current selection) and let it resolve the case from
   `locations.find(l => l.id === locationId).caseId`. The "which case" and "which location"
   choices then cannot disagree, and the existing `store.test.ts:220` case becomes
   "an unknown location id changes nothing".
2. Minimum: tighten the call-site proposition to the real precondition —
   `canComplete={!!currentLocation && currentLocation.caseId === currentCaseId}` — and rename
   the prop to what it now means (`canComplete` reads as "this action will take effect").
3. Either way, add the missing regression test: create A + L1, create B, jump to Completion,
   tap Complete & Save, assert case B is **not** `'complete'` (or that the button is disabled).

**Confidence.** High on the mechanism, the reachability sequence and every cited line (each
re-read in the current worktree; `createCase`'s untouched `currentLocationId` and the rail's
`jumpTo: 'completion'` were both verified directly). Filed here rather than in silent-failures
because the defect is created by the *shape* of the contract — an action parameter that carries
a hidden correlated precondition, plus a `boolean` prop that claims a guarantee it doesn't
establish. Overlaps the silent-failures and typescript lenses; expect a merge.

---

## TYPE-DESIGN-B [MINOR] features/demo/engine/store/persistence.ts:291

**Claim.** Device 2 (`satisfies FullShape<T>`) is applied to all 17 nested shape literals but
**not** to the top-level `persistedStateSchema` — the one literal that also has no
`z.ZodType<PersistedState>` annotation. Today required-field additions are still caught
indirectly (by `loadSnapshot`'s declared return type), but an *optional* addition to the
persisted subset is silent in all three places at once.

**Evidence.**

- `persistence.ts:291-301` — `const persistedStateSchema = z.object({ … })`. No annotation, no
  `satisfies`. Every other shape in the file has both (e.g. `:213`/`:234`, `:236`/`:259`).
- The indirect guard that *does* exist: `snapshotOf(s): PersistedState` (`:309`) and
  `loadSnapshot(): PersistedState | null` (`:340`, return literal `:402-412`) — a new **required**
  field on `PersistedState` breaks both literals. Verified: this is why the top-level omission is
  MINOR, not a repeat of R-4b.
- The silent case: `PersistedState = Pick<DemoState, …>` (`create-store.ts:132-143`) preserves
  optionality. Add `foo?: string` to `DemoState` and pick it, and (i) `snapshotOf`'s literal may
  omit it, (ii) the schema strips it, (iii) `loadSnapshot`'s literal may omit it — all three
  compile, and the field simply never persists. `DemoState` has no optional members today, which
  is why this is low-reachability.
- **The suggested fix needs the Input-agnostic variant** — probe-verified, because the naive
  version does *not* compile here:
  ```
  CASE 8  `satisfies FullShape<P>` with a refine()'d field
          → TS2322 "_input: Type 'string' is not assignable to type 'View | undefined'"   ❌
  CASE 9  `satisfies FullShapeIn<P>` where
          FullShapeIn<T> = { [K in keyof Required<T>]-?:
                             z.ZodType<Required<T>[K] | undefined, z.ZodTypeDef, unknown> }
          → compiles ✅ (accepts z.string().refine(isView) and z.record(z.string(), z.literal(true)))
  CASE 10 same variant, one key omitted → TS1360 "Property 'n' is missing"                 ✅ still catches
  ```
  `view` / `currentChapter` use `z.string().refine(…)` (`persistence.ts:297-298`), whose `_input`
  is `string` — that is almost certainly why the top level was skipped.

**Suggested fix.** Add the input-agnostic sibling next to `FullShape` and apply it to the one
remaining literal:
```ts
/** Like FullShape, but Input-agnostic — for shapes with refine()'d (string-input) fields. */
type FullShapeIn<T> = { [K in keyof Required<T>]-?: z.ZodType<Required<T>[K] | undefined, z.ZodTypeDef, unknown> }
const persistedStateSchema = z.object({ … } satisfies FullShapeIn<PersistedState>)
```
Then the device-2 comment at `:83-87` is true of every shape in the file without exception.

**Confidence.** High on the gap and on the fix compiling (both probe-verified against the repo's
zod). Medium on materiality — no optional persisted field exists or is scheduled.

---

## TYPE-DESIGN-C [MINOR] features/demo/engine/store/create-store.ts:41

**Claim.** The R-4a single-sourcing (closed unions declared once as `as const` tuples and
consumed everywhere) was applied to `CaptureState.method` in this very file — but the two
coordinate-`source` unions two dozen lines above were left hand-typed. They are hand-written
copies of `COORD_SOURCES` / a subset of `GPS_SOURCES`, i.e. the exact drift class the fix was
raised to eliminate, in the fix commit's own blast radius.

**Evidence.**

- `create-store.ts:41` — `incidentCoordinates?: { lat: number; lng: number; source: 'geocoded' | 'manual' }`
  versus `COORD_SOURCES = ['geocoded', 'manual'] as const` (`engine/types/index.ts:182`), used
  properly by `DemoCase.incidentCoordinates` (`:202`) and by the schema (`persistence.ts:226`).
- `create-store.ts:58` — `gps?: { lat: number; lng: number; source: 'geocoded' | 'manual' }`
  versus `GPS_SOURCES = ['gps', 'geocoded', 'manual'] as const` (`types/index.ts:184`) on
  `DemoLocation.gps` (`:225`). The narrowing here is *deliberate* and documented at `:56-58`
  ("recovery locations are geocode-only"), but it is expressed by re-typing the union rather than
  by `Exclude<(typeof GPS_SOURCES)[number], 'gps'>`, so the relationship is invisible to the
  compiler.
- Same commit, same file, the *right* treatment applied one field over: `method: CaptureMethod`
  (`:68`, changed from `'manual' | 'ocr'` in `cf96bb5`).
- Consequence (drift direction the type can't catch): add a variant to `COORD_SOURCES` — the
  domain type, the PDF and the snapshot guard all pick it up automatically, but `NewCaseInput`
  silently cannot carry it. `createCase` passes the value straight through
  (`create-store.ts:209`), so the only construction path for an incident coordinate can never
  produce the new variant, with no compile signal anywhere. The reverse (a variant *removed*)
  does error, so this is one-directional.

**Suggested fix.** `source: (typeof COORD_SOURCES)[number]` at `:41`, and
`source: Exclude<(typeof GPS_SOURCES)[number], 'gps'>` at `:58` — which turns the documented
"geocode-only" narrowing into a compiler-checked fact instead of a comment. (Not deferred §5's
`FieldUpdate` item and not a new brand — these are ordinary domain unions with an existing
canonical tuple.)

**Confidence.** High on the mismatch and the one-directional consequence; the "same file, same
commit, one field over" comparison makes it a fix-round consistency gap rather than an old
pre-existing nit.

---

## TYPE-DESIGN-D [MINOR] features/demo/engine/store/persistence.ts:91

**Claim.** The rewritten header now honestly enumerates what the guard enforces *and* a
"NOT enforced at compile time" list — but that list is incomplete in one direction the probe
confirms is silent: a domain field whose type is **widened** (a `| null`, a `| undefined`, or a
new member on any union that isn't tuple-backed) still compiles against both device 1 and device
2, and lands on the same total-wipe path R-4 was raised about. Reading `:79-93` as written, a
maintainer would reasonably conclude widening is covered.

**Evidence.**

- The list at `:91-93`: *"NOT enforced at compile time: cross-field invariants and referential
  integrity"* — widening is not mentioned, and `:79` frames the three devices as "each closing one
  drift direction".
- Probe (repo's zod 3.25.76, `strict: true`), all three compiled with **no** error:
  ```
  CASE 5  domain `a: string | null`,  schema `z.string()`                  → compiles ✅ (hole)
  CASE 6  domain `'draft'|'complete'|'reopened'`, schema z.enum(['draft','complete']) → compiles ✅
  CASE 7  domain `a: string | number`, schema `z.string()`                 → compiles ✅
  ```
  Cause: `ZodType`'s `_output`/`_input` are ordinary properties, so assignability is covariant —
  a *narrower* schema output is always assignable to a wider domain type. `FullShape<T>`'s
  per-key `z.ZodType<Required<T>[K] | undefined>` is covariant for the same reason. Device 3
  (shared `as const` tuples) is what actually closes CASE 6 in this repo — and only for the eight
  unions that have a tuple.
- Runtime consequence is unchanged from R-4: this build writes `null` (or the new member), its own
  `persistedStateSchema.safeParse` rejects it on the next boot, `discard()` (`:355-362`) removes
  the key, and the visitor's whole session is gone.
- Mitigations that make this MINOR rather than a repeat of R-4: no such widening exists today (I
  re-checked all 14 mirrored shapes field-by-field), none is scheduled in
  `01-master-parity-plan.md`, and the maximal round-trip test would fail loudly on a widening that
  the fixture happens to populate.

**Suggested fix.** Documentation, not machinery — the repo's own §27 "test-over-type" bar applies.
Extend `:91-93` to: *"NOT enforced at compile time: cross-field invariants, referential integrity,
and a domain field whose type is **widened** (nullable/optional added, or a non-tuple union
gaining a member) — `z.ZodType` is covariant, so a narrower schema still assigns. New closed
unions MUST be declared as `as const` tuples in `engine/types` (device 3) for that reason."*
The last sentence is the load-bearing one: it converts the residual into a rule a future author
can follow.

**Confidence.** High on the type behaviour (probe-verified, three shapes). Deliberately MINOR:
this is a completeness gap in a comment plus a rule that isn't written down, not a live defect.

---

## TYPE-DESIGN-E [MINOR] features/demo/engine/content/form-options.ts:83

**Claim.** Deleting `FORM_OPTIONS` removed `optionValues`' only production consumer, leaving an
exported-from-the-public-barrel helper with zero call sites in `features/` or `app/` — a
speculative abstraction created by the fix round. It also still carries the mutable
`string[]` return type that was half of R-17's original claim.

**Evidence.**

- `form-options.ts:83` — `export function optionValues(options: readonly PickerOption[]): string[]`.
- Grep across `features/`, `app/`, `lib/`: the only references are the declaration, the engine
  barrel re-export (`engine/index.ts:35`) and its own unit test
  (`engine/content/__tests__/form-options.test.ts:22, 28, 34`). Before `a0ec7f6` it had exactly
  one production consumer — the deleted `FORM_OPTIONS` (`import.ts:214-220` on the pre-fix tree,
  `git show 165de2b:features/demo/engine/logic/import.ts`).
- `engine/index.ts` is the engine's declared public API (`features/demo/CLAUDE.md`, "Layout of the
  feature"), so this is a barrel export with no consumer, not a private helper.
- The mutability half survives: `optionValues(RESOLUTION_OPTIONS).push('nope')` compiles. Harmless
  today (a fresh array per call, no shared registry to corrupt) — which is why this is MINOR — but
  it is the same `readonly`-discipline precedent (PR #8 shared catalog) that R-17 invoked.

**Suggested fix.** Either delete `optionValues` and inline `OPTIONS.map(o => o.value)` in
`form-options.test.ts` (the smallest surface — and the R-11 rationale for deleting `FORM_OPTIONS`
applies verbatim), or, if it is being kept as the intended helper for P1's import work, narrow it
to `readonly string[]` and say so in the docstring so the next reader doesn't delete it as dead.

**Confidence.** High on the facts (grep + the before/after commit). MINOR because nothing
misbehaves; it is dead surface on a public barrel.

---

## Checked and deliberately NOT filed

- **`CHAPTERS` / `LAUNCHABLE` are not exhaustive over `ChapterId` / `LaunchableId`.**
  `content/screens.ts:13, 27, 30` declare `readonly WizardScreenId[]` / `readonly ChapterId[]` /
  `readonly LaunchableId[]` — a union member missing from its array compiles. The R-4c fix
  (`EXTRA_VIEWS`) closes only the "neither chapter nor launchable" residual and *depends* on those
  two registries being complete for its wipe-severity guarantee (`persistence.ts:270-274` asserts
  the id spaces "come from the runtime registries … never a hand-typed list", which is true of the
  *derivation* but not of the arrays' own completeness). This is **deferred §4** verbatim (its
  stated direction is `satisfies Record<Union, …>` in `content/screens.ts`), and the fix diff does
  **not** touch `content/screens.ts`, so its trigger has not fired — not re-filed per the lane
  brief. Recording it here because §4 now carries a consequence it didn't have before P0.4
  (total session wipe, not just a mis-numbered step), which is worth noting when §4 is next
  triaged. Practical mitigation: `features/demo/CLAUDE.md`'s "Adding or changing a screen"
  procedure requires registering in `screens.ts` at step 3, and `CHAPTERS` splices
  `WIZARD_SCREENS` (`:27`) so the ten wizard ids can't drift.
- **`reviewAgain` (UI-local) vs. `form.completed` (store).** `DemoExperience.tsx:210, 726` —
  the pair `(completed, reviewAgain)` has one meaningless combination (`completed:false,
  reviewAgain:true`), but it is unreachable-by-effect (`isComplete` is false either way) and
  `reviewAgain` is correctly reset on `openLocation` (`:323`, the only `switchLocation` call site,
  verified by grep) and correctly *not* persisted (so a refresh honestly returns to the
  confirmation). Two booleans here is the right weight; a union would be ceremony.
- **`CompletionScreenProps` growth** (`isComplete`, `canComplete`, `onReviewAgain`) — data +
  callbacks only, no store, no `Record<string, unknown>` bag. The store-bridge rule holds. Only
  `canComplete`'s *predicate* is wrong, which is TYPE-DESIGN-A, not a props-shape finding.
- **`selectLocationMapStatus`'s new short-circuit** (`selectors.ts:196`) — `LocationMapStatus`
  stays a three-member union with an exhaustive, `default`-less switch at
  `screenData.ts:32-39` (TS2366 on a new variant). Precedent 2 still satisfied by construction.
- **`app/demo/error.tsx`** — Next segment-boundary props; no demo-barrel import, so
  `features/demo/index.ts`'s "only `DemoExperience`" surface is intact.
- **`Dropdown` `useId` ids** — template-string ids, not an id space; no union exists for them.
- **Deferred-ledger items §4, §5, §16, §27** — triggers checked individually. §5's
  `updateField(path: string)` is unchanged; §5's `method`/`captureMethod` rename trap is now half
  retired by `CaptureMethod` (worth updating the ledger entry, not a finding). §16
  (`ImportedLocationView.locId`) and §27 (`ExploreItem.covers` still a single static literal) are
  untouched.
- **Orchestrator's ruled-on deliberate choices** — the "Location Complete" copy change, the
  Cameras seeding divergence, the `FORM_OPTIONS` deletion, the class-based boundary,
  sessionStorage per D2, deferred §29–§32, the phone-verified asymmetries — respected, not
  re-flagged.

## Type Design Summary

| Severity | Count (new this pass) |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH / upper-MEDIUM) | 1 |
| MINOR (MEDIUM / LOW) | 4 |

Prior lane findings: **5 of 5 FIXED** (TYPE-DESIGN-1…5), plus the R-9 documentation item.
Two of the fixes left MINOR residuals (TYPE-DESIGN-B/D from R-4; TYPE-DESIGN-E from R-17).

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **yes**
Exhaustiveness enforced (never-checked / no-default switches): **yes** (`fallbackNotice`,
`locationStatusTheme`; `EXTRA_VIEWS`/`MODAL_IDS` as `Record<Union, true>` devices)
Correlated state modelled as a union: **flat shape found** — TYPE-DESIGN-A
(`completeCase(caseId)` + `canComplete` express a correlated precondition as two independent values)
Id spaces typed (no bare-string registries/keys): **yes** — both prior regressions fixed
(`FALLBACK_COPY: Partial<Record<AppView, string>>`, Cameras flags keyed by `CameraEntry.id`)
readonly discipline on shared data: **yes** — the mutable registry was deleted outright
Boundary types honest about untrusted input: **yes, with a documented residual** — the snapshot
guard's three devices are real and probe-verified; TYPE-DESIGN-B/D are completeness gaps, not
false guarantees

**Verdict: REVISE** — no BLOCKER, and the fix round is genuinely good work (every prior lane
finding closed, two of them more thoroughly than asked). TYPE-DESIGN-A holds it back: the R-1 fix
introduces a reachable path where "Complete & Save" silently does nothing while falsely greening
an unrelated case, which re-opens the exact honesty-rule failure R-1 was raised to close. The four
MINORs are opportunistic.
