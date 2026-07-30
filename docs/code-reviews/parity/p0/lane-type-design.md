# Lane review — type design (parity P0, PR #29)

- **Lane:** `type-design` (`.claude/agents/type-design-analyzer.md`)
- **Mode:** INITIAL — full review of the diff
- **Diff:** `git diff master...feat/parity-p0` (57 files, +2482 / −169)
- **Refs read:** `.claude/agents/type-design-analyzer.md`, `features/demo/CLAUDE.md`, root `CLAUDE.md`,
  `docs/code-reviews/deferred.md` (§4, §5, §16, §26–§31),
  `docs/planning/demo-phone-parity/01-master-parity-plan.md` (§5 phases P1–P8)
- **Full files read behind the hunks:** `engine/store/persistence.ts`, `engine/store/create-store.ts`,
  `engine/types/index.ts`, `engine/store/selectors.ts`, `engine/store/helpers.ts`,
  `engine/content/form-options.ts`, `engine/content/screens.ts`, `engine/logic/import.ts`,
  `engine/index.ts`, `ui/DemoExperience.tsx`, `ui/chrome/DemoErrorBoundary.tsx`, `ui/glass-tokens.ts`,
  `ui/inputs/Dropdown.tsx`, `ui/screens/_shared.tsx`, `ui/screens/screenData.ts`,
  `ui/screens/field-options.ts`, `ui/screens/CamerasScreen.tsx`, `ui/screens/DvrInfoScreen.tsx`,
  `ui/screens/ExportInfoScreen.tsx`, `lib/beta/schema.ts`, plus every new test file.
- **Pre-flight:** `npx tsc --noEmit` → clean (exit 0).
- **Type probe run to ground finding 1** (scratchpad, outside the repo; zod 3.25.76, `strict: true`):
  a `z.ZodType<T>`-annotated `z.object` errors only for a **missing required** field. A **narrowed
  `z.enum`** and a **missing optional** field both compile silently. `.refine(<type guard>)` *does*
  narrow the inferred output.

**Severity mapping used:** BLOCKER = lane-CRITICAL, MAJOR = lane-HIGH/upper-MEDIUM,
MINOR = lane-lower-MEDIUM/LOW.

**Counts:** 0 BLOCKER · 2 MAJOR · 3 MINOR.

---

## TYPE-DESIGN-1 [MAJOR] features/demo/engine/store/persistence.ts:66

**Claim.** The snapshot shape guard does not deliver the compile-time drift protection its own
header claims. `z.ZodType<DomainType>` catches exactly one drift direction — a **missing required
field**. It does **not** catch (a) a `z.enum` that is *narrower* than the domain union it mirrors,
(b) a domain **optional** field the schema forgot, or (c) an `AppView` member absent from the
hand-assembled `APP_VIEWS` list. All three are silent, and every one of them is scheduled work in
P1–P4.

**Evidence.**

- The claim: `persistence.ts:66-69` — *"Every schema is annotated `z.ZodType<DomainType>` so a
  drift between the domain types and this guard is a COMPILE error, not a stale snapshot silently
  passing validation."*
- Probe result (zod 3.25.76, `strict: true`, run before writing this finding):

  ```ts
  interface K { kind: 'a' | 'b' | 'c' }
  const narrowedEnum: z.ZodType<K> = z.object({ kind: z.enum(['a', 'b']) })      // ✅ compiles
  interface WithOpt { a: string; b?: number }
  const missingOptional: z.ZodType<WithOpt> = z.object({ a: z.string() })        // ✅ compiles
  interface WithReq { a: string; b: number }
  const missingRequired: z.ZodType<WithReq> = z.object({ a: z.string() })        // ❌ TS2322 (only this one)
  ```

  Cause: `ZodType`'s `_output`/`_input` are ordinary properties, so assignability is covariant —
  a narrower output and a shorter-but-compatible output both pass.

- **Instance (a) — narrowed enum → total session wipe.** `mediaItemSchema.kind` is
  `z.enum(['photo','video','audio'])` (`persistence.ts:151`) mirroring `MediaKind`
  (`engine/types/index.ts:127`); `demoCaseSchema.status` is `z.enum(['draft','complete','archived'])`
  (`persistence.ts:197`) mirroring `DemoCase.status` (`types/index.ts:182`). Same pattern for
  `SyncResult.method`, `TimeOffsetData.direction`/`captureMethod`, `CaptureState.method`,
  `DemoLocation.gps.source`, `DemoCase.incidentCoordinates.source`.
  Construction site: add a variant to any of those unions (P3.2 "complete/archive/**reopen** actions",
  master-parity-plan.md:128; P4.x media work) → `addMedia`/`completeCase` writes it into the store →
  `persistDemoStore` serializes it → on the very next refresh `persistedStateSchema.safeParse` fails
  → `discard()` (`persistence.ts:322`) removes the key and `loadSnapshot` returns `null`. The
  visitor's **entire** session — every case, location and form — is silently wiped by a build
  rejecting its *own* snapshot. Nothing in the diff warns at compile time.
- **Instance (b) — missing optional → silent field loss.** `z.object` runs in strip mode
  (acknowledged at `persistence.ts:68-69`), so a domain optional the schema forgot is dropped from
  the rehydrated object. P3.7 adds five per-camera coordinate keys to the camera entry
  (`latitude`, `longitude`, `coordinateAccuracy`, `coordinateSource`, `coordinateCapturedAt` —
  master-parity-plan.md:132), the exact shape of `CameraEntry.gps?` at `types/index.ts:99`. If those
  land as optionals and `cameraEntrySchema` (`persistence.ts:118-124`) isn't updated, they compile
  and vanish on refresh.
  No test catches this either: the round-trip assertion `expect(s.cases).toEqual(store.getState().cases)`
  (`__tests__/persistence.test.ts:67`) is fed by `newCaseInput()`, which sets **3 of `DemoCase`'s 16
  fields** (`engine/store/__tests__/test-utils.ts:18-20`) — `incidentCoordinates`, `oicName`, `notes`,
  `status`… are all `undefined`/default in the fixture, so a stripped optional round-trips as equal.
- **Instance (c) — `APP_VIEWS` is not exhaustive over `AppView`.** `persistence.ts:238`:
  `const APP_VIEWS: readonly string[] = [...CHAPTERS, ...LAUNCHABLE, 'map']`, versus
  `AppView = ChapterId | LaunchableId | 'map'` (`create-store.ts:73`). Chapters and launchables are
  registry-derived, but the residual (`'map'`) is hand-typed and `readonly string[]` erases the link.
  A second tab-only view (the plan adds Settings/User Profile surfaces in P7,
  master-parity-plan.md:170) added to `AppView` but not to `APP_VIEWS` makes `isAppView` reject a
  view this build itself writes → same total-wipe path as (a).
  **This file already knows the right pattern**: `persistence.ts:241-242` —
  `/** Exhaustive by construction: gains/losses on ModalId are compile errors here. */
  const MODAL_IDS: Record<ModalId, true> = {…}`. The guard is exhaustive for modals and
  non-exhaustive for everything else.

**Suggested fix.**
1. Make the mirrored unions single-sourced instead of hand-retyped — the repo's own
   derive-from-the-registry precedent (precedent 9; already applied to `CHAPTERS`/`LAUNCHABLE`
   two lines above). E.g. in `engine/types/index.ts`:
   `export const MEDIA_KINDS = ['photo','video','audio'] as const` /
   `export type MediaKind = (typeof MEDIA_KINDS)[number]`, then `z.enum(MEDIA_KINDS)` here. Same for
   `DemoCase['status']`, `SyncResult['method']`, the two `source` unions, `direction`, `captureMethod`.
   A new variant then updates the guard automatically.
2. Close (c) with the `MODAL_IDS` pattern applied to the residual:
   `const EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true }`,
   and build `APP_VIEWS` from `CHAPTERS`, `LAUNCHABLE` and `Object.keys(EXTRA_VIEWS)`.
3. Close (b) either with a per-schema exact-shape check
   (`satisfies { [K in keyof Required<DemoCase>]: z.ZodType<DemoCase[K]> }` on the shape literal —
   this forces a key for every optional and rejects unknown keys), or by extending
   `persistence.test.ts` with a fully-populated fixture (every optional set) round-tripped through
   `snapshotOf` → `loadSnapshot` → `toEqual`. Given deferred §27's accepted "test-over-type" bar, a
   full-fidelity round-trip fixture is a proportionate minimum; the `satisfies` shape is the stronger fix.
4. Soften the `persistence.ts:66-69` claim to what is actually enforced ("a missing **required**
   field is a compile error"), so the next maintainer doesn't trust a guarantee that isn't there.

**Confidence.** High on the type behaviour (probe-verified, three directions). High on reachability
of (a)/(b) — the parity plan schedules the exact edits. Medium on (c) — it needs a *new* non-registry
view, which P7 makes plausible but not certain. No current mismatch exists: I checked all 14 mirrored
shapes field-by-field against `engine/types/index.ts` + `create-store.ts` and today they agree exactly.
This is a guard-strength finding, not a live defect.

---

## TYPE-DESIGN-2 [MAJOR] features/demo/ui/screens/CamerasScreen.tsx:24

**Claim.** The per-camera custom-mode flags are typed `Record<number, boolean>` — keyed by **array
position** — while camera rows are identified by `CameraEntry.id` everywhere else in the feature. The
type expresses no link to the `cameras` array it indexes, so removing a row silently reassigns every
later row's custom-mode flag to its neighbour. Reachable today with two clicks.

**Evidence.**

- `CamerasScreen.tsx:24-25`
  ```ts
  const [customResolutions, setCustomResolutions] = useState<Record<number, boolean>>({})
  const [customFps, setCustomFps] = useState<Record<number, boolean>>({})
  ```
  read at `:61`, `:64`, `:67`, `:70` as `customResolutions[i]` / `customFps[i]`, where `i` is the
  `cameras.map((c, i) => …)` index (`:52`) — but the row's React key is `c.id` (`:53`) and the entry
  type carries a stable `id` (`engine/types/index.ts:95`).
- Removal is positional and compacting: `onRemove(i)` (`CamerasScreen.tsx:56`) →
  `remove: (i: number) => write(list.filter((_, idx) => idx !== i))`
  (`ui/DemoExperience.tsx:124`). Nothing re-keys the flag maps.
- **Failure scenario.** Cameras `[A, B, C]`. On **B** (index 1) pick "Other (Custom)" → `customFps`
  becomes `{1: true}`, B's stored FPS is cleared and the user types `12`. Now remove **A**
  (`onRemove(0)`): the array is `[B, C]`, so **C** is index 1. Next render:
  `customFps[1]` is `true` → **C** shows the "Other (Custom)" pill and a "Custom FPS" input bound to
  C's value, which the user never chose; **B** is index 0 with no flag, so its pill falls back to
  `c.recordingFps = '12'`, which is not in `FPS_OPTIONS` and hits `Dropdown`'s raw-value degrade path
  (`ui/inputs/Dropdown.tsx:39`) — B's custom field disappears while its non-standard value stays
  selected. The existing test only pins the no-removal case
  (`ui/screens/__tests__/option-parity.test.tsx:123-138`).
- Secondary instance of the same shape problem: because the flags are component-local and *not*
  derived, they don't survive the P0.4 rehydrate this PR also adds. `DvrInfoScreen` avoids that by
  seeding from the stored value — `useState(isCustomResolution(dvr.resolution))`
  (`DvrInfoScreen.tsx:41-42`), pinned by `option-parity.test.tsx:85-90` ("a stored free-text value
  reopens in custom mode"). Cameras has no equivalent, so after a refresh a camera with a stored
  `1440x900` renders a plain pill with no custom input — the same screen behaving two different ways
  in one PR.

**Suggested fix.** Key the flags by the stable row id rather than position:
`useState<Record<string, boolean>>({})` (or `Set<string>`) indexed by `c.id`, with the handlers taking
`(id: string, value: string)` and the row still passing `i` to `onChange`/`onRemove`. Reading it as
`customResolutions[c.id] ?? isCustomResolution(c.resolution)` closes the rehydrate gap in the same
edit and reuses the canonical helper the DVR screen already imports
(`engine/content/form-options.ts:93`). Note: this is the *keying*, not the clear-on-switch behaviour —
the DVR-keeps/Cameras-clears asymmetry is phone-verified and deliberate, and stays as-is.

**Confidence.** High — the remove path, the index read, and the absence of a re-keying step are all
in the diff; the scenario needs no unusual input. Overlaps the react/web lane (it is also a
stale-state bug); filed here because the defect is created by the *shape* of the state
(position-keyed map with no type-level tie to the id-keyed list).

---

## TYPE-DESIGN-3 [MINOR] features/demo/ui/chrome/DemoErrorBoundary.tsx:13

**Claim.** New registry + prop keyed by bare `string` where a finite id union exists — the exact
pattern the repo fixed in review M1 and codified as precedent ("keyed by the recordable id space,
not bare string, so registry typos are compile errors", `engine/store/create-store.ts:89-95`).

**Evidence.**

- `DemoErrorBoundary.tsx:13` — `const FALLBACK_COPY: Record<string, string> = { ocr: …,
  mediaCapture: …, audioRecording: … }`. Those three keys are exactly `LaunchableId`
  (`engine/types/index.ts:30`) and the registry `LAUNCHABLE` (`engine/content/screens.ts:30`).
- `DemoErrorBoundary.tsx:53-56` — `view: string` on the props; the call site passes an `AppView`
  (`ui/DemoExperience.tsx:814`, `<DemoErrorBoundary view={view} …>`), and `lastView: string` in the
  state (`:66`) inherits the widening.
- Lookup at `:115` — `FALLBACK_COPY[this.props.view] ?? GENERIC_COPY`. A typo, or a rename of a
  `LaunchableId` (P4.3/P4.6 build these two screens for real), silently degrades to generic copy with
  no compile error and no failing test.
- The stated rationale — *"Keyed by plain view id — no engine imports, so the boundary stays
  presentational"* (`:11-12`) — does not hold: two presentational components already type-import the
  same union without touching the store (`ui/StoryRail.tsx:4`, `ui/controls/ExploreChecklist.tsx:5`,
  both `import type { AppView } from '@/features/demo/engine/store/create-store'`), and
  `ui/screens/map/mapTokens.ts:1` type-imports `LocationMapStatus`. `features/demo/CLAUDE.md`'s
  store-bridge rule bans importing the *store*, not its types.

**Suggested fix.** `view: AppView`, `lastView: AppView`, and
`const FALLBACK_COPY: Partial<Record<AppView, string>>` (or `Record<LaunchableId, string>` with an
`AppView` lookup) — type-only imports, so the boundary stays presentational. The `?? GENERIC_COPY`
fallback stays as the runtime default for the un-keyed views.

**Confidence.** High on the type gap and on the refutation of the stated rationale. MINOR rather than
MAJOR because the worst outcome is generic instead of specific fallback copy — no invalid data reaches
the visitor.

---

## TYPE-DESIGN-4 [MINOR] features/demo/engine/logic/import.ts:214

**Claim.** `FORM_OPTIONS` lost its `as const` in this diff and is now a **mutable** module-level
registry of **mutable** `string[]`s — a regression against precedent 7 (the PR #8 shared-catalog fix:
"New module-level registries must be `readonly`").

**Evidence.**

- Before (master): `export const FORM_OPTIONS = { exportMedia: [...], … } as const` — deeply readonly.
- After (`import.ts:214-220`): `export const FORM_OPTIONS = { exportMedia: optionValues(EXPORT_MEDIA_OPTIONS), … }`
  with `export function optionValues(options: readonly PickerOption[]): string[]`
  (`engine/content/form-options.ts:80`). Both the object and each array are now writable:
  `FORM_OPTIONS.resolution.push('nope')` and `FORM_OPTIONS.fps = []` compile.
- The source lists themselves stayed correctly `readonly PickerOption[]`
  (`form-options.ts:31, 40, 49, 57, 68`) and `RECORDING_SCHEDULE_OPTIONS` is `as const`
  (`form-options.ts:106`) — so the regression is only on the derived view, and only the derived view
  is exported from the engine barrel path used by the import pipeline.
- Blast radius today is small: `optionValues` returns a fresh array per call, so a mutation cannot
  corrupt the canonical lists, and `FORM_OPTIONS` currently has no production consumer (grep: only
  `engine/logic/__tests__/import-displayable.test.ts`). That is why this is MINOR, not MAJOR — but
  the plan's P1 import work is the consumer that lands next.

**Suggested fix.** `optionValues(options: readonly PickerOption[]): readonly string[]` (all current
uses — `.includes`, `toEqual`, spread — are read-only), and
`export const FORM_OPTIONS = { … } as const satisfies Record<string, readonly string[]>`.

**Confidence.** High — direct before/after in the diff, and the precedent is named in the lane brief.

---

## TYPE-DESIGN-5 [MINOR] features/demo/engine/store/persistence.ts:327

**Claim.** Two unnecessary `as` casts stand where the compiler already knows the narrow type. They
are no-ops today, but they convert a future regression from a compile error into a silent unchecked
assertion.

**Evidence.**

- `persistence.ts:326-328`
  ```ts
  // The refinements above guarantee these narrowings.
  const currentChapter = d.currentChapter as ChapterId
  const view = d.view as AppView
  ```
- Zod 3's `refine` has a type-guard overload
  (`refine<R extends Output>(check: (arg: Output) => arg is R): ZodEffects<this, R, Input>`), and
  `isAppView`/`isChapterId` (`persistence.ts:239-240`) are declared as type predicates, so
  `z.string().refine(isAppView)` already infers `AppView`. Probe (4), run against this repo's
  zod 3.25.76 with `strict: true`, confirmed the narrowing survives `z.infer` of the enclosing
  `z.object` — assigning the refined field to the narrow union produced no error.
- Consequence of keeping them: if `isAppView` is ever changed to a plain `(v: string) => boolean`
  (an easy edit when fixing TYPE-DESIGN-1 instance (c)), the schema silently widens to `string` and
  the `as AppView` swallows it — `DemoState.view` would then be rehydrated from an unvalidated string
  with no compile signal.

**Suggested fix.** Drop both casts and use `d.currentChapter` / `d.view` directly; the comment then
becomes a compiler-enforced fact rather than a promise. (If a future zod upgrade drops the guard
overload, the build fails loudly at that point — which is the desired behaviour.)

**Confidence.** High — probe-verified against the installed zod.

---

## Checked and deliberately NOT filed

- **Zod entering the engine** (`persistence.ts:1`) — the lane brief records "Zod appears in exactly
  one file (`lib/beta/schema.ts`)"; that is now stale. Using a real parser at an *untrusted-input*
  boundary (sessionStorage is user-editable) is better boundary hygiene than the hand-rolled path,
  and the inversion vs. `lib/beta/schema.ts` (there the schema is the source of truth via
  `z.infer`; here the domain types are, and the schema mirrors them) is the correct direction for
  canonical domain types. Not a finding — but it is the reason TYPE-DESIGN-1 matters, and reviewers'
  context docs should be updated.
- `PersistedState = Pick<DemoState, …>` (`create-store.ts:129-140`) — correct: `snapshotOf`
  (`persistence.ts:263`) and `loadSnapshot`'s return literal are both typed to it, so adding a
  persisted field is a compile error in both directions. `modal`/`drawerOpen` exclusion documented
  and matched by deferred §29.
- `locationStatusTheme` (`ui/screens/screenData.ts:31-40`) — exhaustive switch with **no** `default`
  arm and an explicit return type, so a new `LocationMapStatus` variant is TS2366. Better than the
  neighbouring pre-existing `caseStatusTheme` (`:20`), which does use `default:`. Precedent 2
  satisfied by construction; no `never` arm needed.
- `RetentionView` consumption in `DvrInfoScreen` — unchanged, still the correlated-union form.
- `DropdownProps.options: ReadonlyArray<string | PickerOption>` (`ui/inputs/Dropdown.tsx:16`) — a
  `typeof`-discriminated convenience union normalised once at `:35`; `readonly` and correctly
  variadic. `SelectField` mirrors it (`ui/screens/_shared.tsx:212`). Sound.
- `PickerOption` living in `engine/content/form-options.ts` rather than `engine/types/index.ts` —
  follows the `ExploreItem`-in-`content/explore.ts` precedent for registry-local content types
  (canonical-homes table). Not parallel-type drift.
- `ui/screens/field-options.ts` reduced to `export * from '@/features/demo/engine/content/form-options'`
  — `isolatedModules`-safe, and the deep-import-from-`ui` shape matches existing files
  (`StoryRail.tsx`, `map/mapTokens.ts`, `map/mapData.ts`).
- `glass-tokens.ts` — `GLASS` is `as const`, the three fragments are `as const satisfies CSSProperties`.
  Correct readonly discipline and the right use of `satisfies` (keeps the literal types while checking
  against `CSSProperties`). No finding.
- `maxIdSeq(value: unknown)` (`engine/store/helpers.ts:41`) — `unknown` + narrowing, per house rule.
- `DemoErrorBoundary`'s state shape (`error: Error | null` + `lastView`) — no invalid combination is
  representable; `getDerivedStateFromError(error: unknown)` is tighter than React's `any`. Only the
  `view: string` id-space issue is filed (TYPE-DESIGN-3).
- Tests re-export/import canonical types and use `engine/store/__tests__/test-utils.ts`; no canonical
  entity is re-declared outside its home anywhere in the diff.
- Deferred-ledger items **§4, §5, §16, §27** — none of their triggers fire in this diff
  (`updateField(path: string)` unchanged, `ExploreItem.covers` still a single static literal,
  `content/screens.ts` sentinels untouched, `ImportedLocationView` untouched).
- Orchestrator's ruled-on deliberate choices (deferred §29–§31, the class-component boundary, the
  Export-Info no-free-text parity, the DVR-vs-Cameras clear asymmetry, the dropped demo-only option
  values, sessionStorage/D2) — respected, not re-flagged.

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH / upper-MEDIUM) | 2 |
| MINOR (MEDIUM / LOW) | 3 |

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **yes**
Exhaustiveness enforced (never-checked / no-default switches): **yes** (`locationStatusTheme`)
Correlated state modelled as a union: **n/a** (no new correlated pair introduced)
Id spaces typed (no bare-string registries/keys): **regression found** (TYPE-DESIGN-2, TYPE-DESIGN-3)
readonly discipline on shared data: **gap found** (TYPE-DESIGN-4)
Boundary types honest about untrusted input: **partial** — the snapshot boundary validates honestly
at runtime, but its type-level drift guard is weaker than documented (TYPE-DESIGN-1)

**Verdict: REVISE** — no BLOCKER; TYPE-DESIGN-2 is a reachable mis-render and TYPE-DESIGN-1 leaves a
documented-but-absent guarantee on a code path whose failure mode is a silent total wipe of the
visitor's session.
