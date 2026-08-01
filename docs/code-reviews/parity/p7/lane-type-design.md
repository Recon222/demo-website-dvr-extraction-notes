# P7 review — lane: TYPE DESIGN

**PR** #36 · `master..feat/parity-p7` @ `1505c00` · lane run at xhigh effort
**Scope** the v7 lattice (`UserProfile`, `FormOverrides`, `PROFILES`), the pane partition
(`BRIDGE_PANE_IDS` / `StubPaneId`), the settings-catalog registry, the `FormStepId` / `FormFieldId`
unions, `ALWAYS_ON_FIELDS`' derivation device, `FormVisibility` as a structural supertype, and the
integrator's §83 choices.
**Method** every claim below that says "probe-verified" was run as a real edit against an
**isolated** worktree (`scratchpad/worktrees/p7-typedesign`, detached at `1505c00`) with a **cold**
`tsc --noEmit` (`rm -f tsconfig.tsbuildinfo` first), then reverted. Baseline cold tsc: **clean,
exit 0**. Targeted suites re-run green (below). The phone repo was read-only throughout.

> **Why an isolated worktree.** The shared `parity-p7` worktree had concurrent lane edits in it
> mid-run (another lane's probe patches in `DemoExperience.tsx`, `settings-catalog.ts`,
> `final-submission.ts`, `logic/user-profile.ts`, plus an untracked `zzprobe.test.tsx`). One of my
> early `git checkout --` reverts landed on `features/demo/engine/content/settings-catalog.ts`
> while that lane's probe was in it — flagged here so the affected lane can re-apply if it was
> mid-probe. Every probe from that point on ran in my own worktree and touched nothing shared.

---

## Verdict

**APPROVE with comments.** No CRITICAL, no HIGH. The v7 lattice is the strongest type work in this
PR: three compile-time snapshot devices survive the merge intact, four separate id spaces are
closed unions with total `Record` consumers, and both headline exhaustiveness claims (§83b's
"a missing bridge branch is a compile error", P7.3's "a fourth validator rule is a compile error")
are **true and probe-confirmed**. What is left are four MEDIUM shape choices — three of them
seams that outlived the packages that created them — and seven LOW polish items.

---

## Claims probed (all four in the brief)

| Claim | Source | Result |
|---|---|---|
| A missing bridge branch in `renderPane` is a **compile error** | deferred §83b, `panes/index.tsx:66-72`, PR body | **TRUE.** Deleting the `id === 'form-customization'` arm → `DemoExperience.tsx(2745,36): error TS2345: … '"form-customization"' is not assignable to type 'StubPaneId'`. The ternary's negative branch is what narrows `SettingsCategoryId` to `StubPaneId`; losing a branch un-narrows it and `renderSettingsPane` refuses the call. |
| A **fourth rule** in `final-submission.ts` is a compile error against `ALWAYS_ON_FIELDS`' coverage map | P7.3 invariant 4, `content/__tests__/form-customization.test.ts:136` | **TRUE.** Adding `probeFourthRule` to `FINAL_SUBMISSION_MESSAGES` → `form-customization.test.ts(136,11): error TS2741: Property 'probeFourthRule' is missing … but required in type 'Record<"address" \| "scopes" \| "occNumber" \| "probeFourthRule", readonly FormFieldId[]>'`. Note the guard lives in a **test file** and only holds because `tsconfig.json`'s `include` is `**/*.ts` — see **L3** for its one soft edge. |
| `FormVisibility` as a structural supertype of `DemoState` — does the seam permit a non-store object where it shouldn't? | `types/index.ts:574`, `logic/form-visibility.ts` | **No invalid state permitted.** A bare `{ profile, formOverrides }` literal *is* accepted (by design, and harmless — every resolver is pure and both members are required, so there is no half-built visibility). A typo'd key inside the literal is rejected: `error TS2353: … 'notAStep' does not exist in type 'Readonly<Partial<Record<FormStepId, boolean>>>'`. Invariant 1 holds. |
| The 58 `FormFieldId`s diff **id-for-id** with the phone | deferred §82a, `types/index.ts:473-530` | **TRUE, and stronger than claimed.** Mechanical diff of the demo's `FormFieldId` against the phone's `FieldId` (`src/features/form-customization/types/index.ts:43-108`): 58 vs 58, 58 unique both sides, **zero** phone-only, **zero** demo-only, and **identical declaration order**. It is a literal union, not `string`. |

### Other exhaustiveness devices, probe-verified

- **A new settings category** (`'developer'` appended to `SETTINGS_CATEGORY_IDS`) → two compile
  errors: `settings-values.ts(284,26)` (the `assertNever` arm of `settingsPreview`) and
  `panes/index.tsx(55,14)` (`Record<StubPaneId, …>` missing the key). Registry-completeness is
  real, not a tautology.
- **A fourth `Profile`** (`'probe4th'` appended to `PROFILES`) → three compile errors, all in
  `content/profiles.ts`: `PROFILE_DEFAULTS:66`, `PROFILE_LABELS:75`, `PROFILE_BLURBS:91`.
  `FORM_PROFILE_SHORT` needs no fourth site because it is an *alias* of `PROFILE_LABELS`, not a
  copy — good call.
- **A third additive tool** (`'ocr'` appended to `ADDITIVE_FORM_STEP_IDS`) → two compile errors
  (`STEP_CLASSIFICATION:44`, `ADDITIVE_STEP_LABELS:62`) and **no error at the drawer seam** —
  which is finding **M1**.
- `BRIDGE_PANE_IDS`'s `as const satisfies readonly SettingsCategoryId[]` does what §83b says: a
  typo'd id in the tuple is a compile error rather than a never-matching branch.
- `snapshotOf` / `persistedStateSchema`: all three snapshot devices survive the P7.2+P7.3
  unification. `userProfileSchema` carries `satisfies FullShape<UserProfile>` (device 2 — probe:
  adding a member to `UserProfile` errors at `persistence.ts:341` *and* `:349`, i.e. both the
  `z.ZodType<UserProfile>` annotation and the `FullShape` satisfies fire), `z.enum(PROFILES)`
  consumes the domain tuple (device 3, the only one that closes a union *widening* — and the
  `'limited'` widening is exactly what needed it), and version + key move in one edit.
  `formOverridesSchema` is deliberately **wider** than its output type (`z.record(z.string(), …)`)
  with `loadSnapshot` filtering to known ids — this is the `visited` precedent applied correctly,
  and the filtered value is the only thing that leaves `loadSnapshot`.

---

## Findings

### [MEDIUM] M1 — the additive-tool set is keyed by ad-hoc names, so a third capture tool silently never reaches the drawer

**Type:** `selectMediaToolsVisible(s: DemoState): { capture: boolean; audio: boolean }` at
`features/demo/engine/store/selectors.ts:149`, and the same anonymous shape re-declared as
`mediaTools: { capture: boolean; audio: boolean }` at
`features/demo/ui/controls/WizardDrawer.tsx:51`.

**Permitted invalid state / missed drift:** the demo has a closed union for exactly this set —
`AdditiveFormStepId` (`types/index.ts:446`), backed by the `ADDITIVE_FORM_STEP_IDS` tuple. Both
sites use two hand-written keys (`capture`, `audio`) that are neither the union's members
(`mediaCapture`, `audioRecording`) nor derived from it, so the tuple and its two consumers have no
type-level link.

**Construction site (probe-verified):** appending a third id to `ADDITIVE_FORM_STEP_IDS`
(`types/index.ts:445`) produces **exactly two** compile errors —
`content/form-customization.ts(44,7)` (`STEP_CLASSIFICATION`) and `(62,7)`
(`ADDITIVE_STEP_LABELS`), both total `Record`s doing their job. Neither the selector nor the
drawer prop errors.

**Downstream consequence:** after fixing those two errors the new tool would be a fully registered
`FormStepId` — classified, labelled, profile-defaulted, toggleable in the Form Fields pane,
persisted in `formOverrides` — and would **never render a row in the drawer's Media accordion**.
Its switch would move nothing, which is the precise failure mode §82b files as a phone bug
(ledger item 19) and the honesty rule forbids. The existing test
(`form-customization-actions.test.ts:106-109`) asserts the two booleans by name and would still
pass.

**Fix:** return `Readonly<Record<AdditiveFormStepId, boolean>>` built by mapping
`ADDITIVE_FORM_STEP_IDS`, and type `WizardDrawerProps.mediaTools` the same (import the type rather
than re-declaring the shape). The accordion rows then build from the tuple too. Repo precedent:
the typed `visited` id space (review M1 — "keyed by the recordable id space, not bare string, so
registry typos are compile errors") and `MODAL_IDS: Record<ModalId, true>`.

---

### [MEDIUM] M2 — `SettingsPreviewContext.formProfileLabel` is a bare `string` over a closed union whose label map sits in the same file

**Type:** `formProfileLabel: string` at
`features/demo/engine/content/settings-values.ts:236`, consumed at `:271`
(`case 'form-customization': return ctx.formProfileLabel`).

**Permitted invalid state:** any string reaches the master row's right-hand value. The row is
supposed to render one of three profile labels; the type accepts `'Nope'`, `''`, or a raw profile
id.

**Construction site:** `features/demo/ui/DemoExperience.tsx:722` —
`formProfileLabel: FORM_PROFILE_SHORT[profile] ?? profile`. The `?? profile` arm is **dead per the
type**: `FORM_PROFILE_SHORT` is `Record<Profile, string>` (`settings-values.ts:246`) and `profile`
is `Profile`, so the lookup is `string`, never `undefined` (probe-verified: an equivalent
`PROFILE_DEFAULTS.forensic.steps.submission` assigns to a strict `boolean` with no error). The
fallback exists to print a raw id — i.e. the seam's own author anticipated the untyped hole.

**Downstream consequence:** low blast radius today (one caller), but this is the shape §83c
*didn't* finish. The entry records that the two stale `SEAM(P7.2)`/`SEAM(P7.3)` comments were
retired "since the seam they pointed at is now closed" — the comments went, the seam's widened
parameter stayed. `settings-values.ts` already imports both `type { Profile }` and
`PROFILE_LABELS`, so there is no new module edge to pay for.

**Fix:** `formProfile: Profile` on `SettingsPreviewContext`; `settingsPreview` maps it through
`FORM_PROFILE_SHORT` itself; delete the dead `??` at the bridge. Note `profileName: string` beside
it is *correctly* a free string — it is the analyst's typed name — which is what makes the
mismatch visible. Repo precedent: precedent 5 (typed id spaces), and `motion.ts`'s
`slideDirection(prev: ViewId, next: ViewId)` "so a typo'd literal is a compile error".

---

### [MEDIUM] M3 — `selectVisibleWizardScreens` narrows with an unchecked `as`, because `LINEAR_FORM_STEPS` is typed with the wider `FormStepId`

**Type:** `LINEAR_FORM_STEPS: readonly FormStepDef[]` at
`features/demo/engine/content/form-customization.ts:68`, where `FormStepDef.id: FormStepId`
(= `WizardScreenId | AdditiveFormStepId`). Consumer:
`features/demo/engine/store/selectors.ts:138` —
`return getVisibleFormSteps(s).map((step) => step.id as WizardScreenId)`.

**Permitted invalid state:** the assertion is the *only* thing standing between the two id spaces.
Probe-verified: removing it yields
`selectors.ts(138,3): error TS2322: Type 'FormStepId' is not assignable to type 'WizardScreenId'.
Type '"mediaCapture"' is not assignable to type 'WizardScreenId'.` The array's element type
genuinely admits the two additive ids; nothing at compile time says it doesn't.

**Downstream consequence:** `selectVisibleWizardScreens` is **public barrel API**
(`engine/index.ts:204`) declaring `WizardScreenId[]`. Its in-repo consumer
(`selectDrawerItems`, `selectors.ts:142`) launders through `Set<string>` and is safe, but any
future consumer that routes on the returned ids (`setView`, a `Record<WizardScreenId, …>` lookup)
would be trusting an assertion. The declared invariant ("every step id here is a `WizardScreenId`
because `LINEAR_FORM_STEPS` *is* `DRAWER_DEFS`") is *derivable* — `DrawerDef.id` already **is**
`WizardScreenId` — so the cast is buying nothing the compiler couldn't prove.

**Fix:** give the linear list its own narrower element type and drop the cast entirely, e.g.
`interface LinearFormStepDef extends FormStepDef { readonly id: WizardScreenId }` and
`export const LINEAR_FORM_STEPS: readonly LinearFormStepDef[] = DRAWER_DEFS.map(…)` — the map's
result already satisfies it. `getVisibleFormSteps` can be split or generic over the element type.
The comment at `selectors.ts:130-135` ("the narrowing is asserted rather than assumed so a future
additive step leaking into the linear list is a test failure, not a bad route") then becomes a
compile failure instead, which is the stronger version of the same intent.

---

### [MEDIUM] M4 — `selectDrawerStatus`'s optional second argument silently switches which question the function answers

**Type:** `selectDrawerStatus(loc: DemoLocation | null, visibility?: FormVisibility)` at
`features/demo/engine/store/selectors.ts:206-209`.

**Permitted misuse:** the two arities are not "configured / not configured" — they are **two
different questions**, as the function's own doc says: with a visibility it answers "what is left
for ME to fill"; without one it answers "how far along is this LOCATION". `foo?: T` should mean
"may legitimately not be set"; here absence is a mode, and choosing the wrong mode is not a
compile error. Probe-verified: `selectDrawerStatus(loc)` compiles with no diagnostic at all.

**Construction sites:** `DemoExperience.tsx:816` passes `store.getState()` (drawer dots — correct);
`selectors.ts:319` (`selectLocationMapStatus`) deliberately omits it (map pin — correct, §82f).
Both are right today and both are tested (`drawer-status.test.ts:134-180`).

**Downstream consequence:** a future drawer-side consumer that forgets the second argument
regresses to the exact behaviour the parameter was added to fix — a canvas visitor's DVR dot that
can never go green because five of its nine counted fields are hidden and therefore permanently
blank *and* permanently unfillable. Nothing catches it: not `tsc`, and not the existing tests,
which pin the two call sites rather than the contract.

**Fix:** make the choice nameable rather than inferable from arity. Either two entry points over a
shared private implementation (`selectDrawerStatusForVisitor(loc, v)` /
`selectLocationCompletion(loc)`), or keep one function with a **required** second parameter typed
`FormVisibility | 'count-all'` so the map/export call site states its intent. Repo precedent:
precedent 8 (distinct absence semantics — "bogus input" vs "legitimately nothing there" was worth
two return values in `getAdjacentFeatures`; two *questions* are worth at least as much).

---

### [LOW] L1 — `ProfileDefaults` is documented and typed TOTAL, constructed with `{} as Record<…>`, and read with `?? false`

`types/index.ts:580-583` says "TOTAL over both id spaces" and types both members
`Readonly<Record<FormStepId | FormFieldId, boolean>>`. `content/profiles.ts:27,30` builds them via
`{} as Record<…>` — an assertion TypeScript cannot check — and
`logic/form-visibility.ts:58,75` reads them as `…[id] ?? false`. Probe-verified that the `??` arms
are unreachable per the type (a direct lookup assigns to a strict `boolean` with no error). Three
signals, two answers: the type and the doc say total, the construction can't prove it, and the
consumer defends as though it were partial. No reachable invalid state — `ALL_STEP_IDS`/
`ALL_FIELD_IDS` are derived from the registries and the registries are test-pinned — but pick one:
keep `Record` and drop the `??`, or type it `Readonly<Partial<Record<…>>>` and keep the guard
(which also documents that "unknown id ⇒ hidden" is the intended default).

### [LOW] L2 — `Object.freeze` with the mutable type annotation: `readonly` is runtime-only on both shared defaults

`DEFAULT_SETTINGS: DemoSettings = Object.freeze({…})` (`content/settings-values.ts:112`) and
`DEFAULT_USER_PROFILE: UserProfile = Object.freeze({…})` (`logic/user-profile.ts:22`). The
annotation discards `Object.freeze`'s `Readonly<T>` return, so `DEFAULT_SETTINGS.darkMode = false`
type-checks. `DEFAULT_SETTINGS` is handed straight to `useState<DemoSettings>` and thence to all
eight panes as `settings: DemoSettings`, so the first render's object *is* the frozen one. Runtime
is loud (module code is strict-mode, so a write throws) rather than silent, which is why this is
LOW rather than MEDIUM. Fix: `Object.freeze({…}) satisfies DemoSettings` with the const inferred,
or annotate `Readonly<DemoSettings>`. Repo precedent: precedent 7 (`readonly` on module-level
registries, from the PR #8 shared-catalog fix).

### [LOW] L3 — the invariant-4 device forces a **key**, not a non-empty coverage list

`content/__tests__/form-customization.test.ts:136` —
`Record<keyof typeof FINAL_SUBMISSION_MESSAGES, readonly FormFieldId[]>`. Confirmed above that a
fourth rule is a compile error. But `probeFourthRule: []` discharges it, and the assertion loop at
`:148-150` (`for (const ids of Object.values(coveredBy)) for (const id of ids)`) then iterates
zero times and passes green — the new rule ends up covered by nothing, which is the state the
device exists to prevent. `readonly [FormFieldId, ...FormFieldId[]]` (native TS, no helper type)
closes it in one edit. Secondary: the guard is only a compile error because `tsconfig.json`'s
`include` is `**/*.ts` and therefore covers test files — worth knowing if a future build config
ever splits test type-checking out.

### [LOW] L4 — `getFormStep` / `getFormField` are typed to accept only valid ids, and the id guards call them through `as`

`content/form-customization.ts:88,195` declare `(id: FormStepId)` / `(id: FormFieldId)` returning
`… | undefined`, with the doc "`undefined` only for an id outside `FormStepId`, which the union
forecloses". `logic/form-visibility.ts:131-138` then does exactly that forbidden thing —
`getFormStep(id as FormStepId) !== undefined` on an arbitrary `string` — from a different module.
The `| undefined` in the return type exists solely for the call path the parameter type says
cannot happen. Harmless today; the honest shape is either `(id: string): FormStepDef | undefined`
on the lookups, or a separate `findFormStep(id: string)` used by the guards.

### [LOW] L5 — the new explore-row visibility filter keys off `ExploreItem.id`, the one bare-`string` field in that registry

`content/explore.ts:24` types `id: string` and documents it as a "stable slug (tests, future
analytics)" — while `covers` and `jumpTo` beside it are typed to the recordable id space precisely
so typos are compile errors (review M1). P7.3 made that slug load-bearing:
`selectors.ts:46` filters rows via `isKnownFormStep(item.id)`. A future row whose slug drifts from
its step id is a permanently-unfiltered row (the rail lists a screen the visitor cannot reach — the
exact thing the change was made to stop); a slug that *collides* with a step id is a spuriously
filtered one. Behaviour is pinned for today's ids
(`form-customization-actions.test.ts:170-185`), which is why this is LOW, and deferred §27's
test-over-type precedent applies to the static literal. Worth a line in the `id` doc comment at
minimum, since its stated purpose no longer matches its job.

### [LOW] L6 — `ModalShell`'s `elevation?: number` is a raw z-index offset carrying an invariant the type doesn't

`ui/screens/_shared.tsx:68` (`elevation?: number`, applied as `21 + elevation` / `22 + elevation`
at `:82,94`). The doc states the invariant — "Kept well under `PickerSheet`'s 31/32 so the date
pickers INSIDE the editor still land on top of it" — and the type admits any number, including one
that inverts it. One caller today: `UserProfileModal.tsx:100` (`elevation={4}`), and that modal
*does* contain `PickerSheet` date pickers, so the invariant is live rather than hypothetical.
A two-member union (`'base' | 'aboveSettings'`) or named constants would carry what the comment
currently carries alone.

### [LOW] L7 — `getSettingsCategory` is a `string`-parameter lookup with no production caller

`content/settings-catalog.ts:137` — `getSettingsCategory(id: string | null)`. Grep finds
references only in its own module and `settings-catalog.test.ts`; it is not re-exported from
`engine/index.ts`. It is also the one bare-`string` lookup in a module that otherwise closes its
id space (`SettingsCategoryId`, `SettingsGroupId`, `SettingsIconId` are all tuple-backed unions).
Either give it the caller the port implies (the phone's `getCategoryById`) or drop it; if it stays,
`string` is defensible only as a boundary guard, in which case it should be documented as one.

---

## Considered and NOT filed

- **`UserProfile`'s seven required strings** (`types/index.ts:47-65`) — *honest, not
  stringly-typed*. Empty-string-as-unset is the phone's own `DEFAULT_USER_PROFILE` shape, there is
  exactly one predicate for "filled in" (`hasProfileText`, `logic/user-profile.ts:35`), and the two
  `*Start` fields being plain `string` matches every other canonical wall-clock string in this
  codebase (`ScopeEntry.startDateTime`, `ArrivalDeparture.arrival`, …). Introducing a datetime
  brand here alone would be new machinery for one type. The `name`-empty ⇒ nothing-else-shown rule
  is a *display* rule stated at `hasProfileName`, cited to the phone, and does not lose data —
  not correlated state wanting a union.
- **`agencyLogoUri` absent from the type**, **no `resetProfile()`**, **`reset()` preserving the
  profile**, **`Partial<UserProfile>` on `updateUserProfile`** — deferred §81a/§81c and the PR
  body's DO-NOT-RE-FLAG list. The `Partial` is phone-shape parity (`user-profile-store.ts:38-39`)
  with one whole-record caller; noted, not filed.
- **`FormOverrides`' sparse `Partial`-Record + schema-wider-than-type + filtered on load** — this
  is the `visited` precedent applied correctly and deliberately (`persistence.ts:394-403,515-524`).
  The widened `z.record(z.string(), z.boolean())` never escapes `loadSnapshot` unfiltered; the
  filtered maps are what the returned `PersistedState` carries. Correct trade: a settings
  preference from another build is not worth wiping a case.
- **`ONE v7` carrying three changes** (§83a) — neither branch shipped, so no snapshot ever existed
  at a separate "P7.2 v7" or "P7.3 v7"; bumping to 8 would invent a version nothing wrote. All
  three devices survive the union (probe-verified for `FullShape<UserProfile>` and
  `z.enum(PROFILES)`). Agreed as merged.
- **`BRIDGE_PANE_IDS` winning over `STORE_CONNECTED_PANE_IDS`** (§83b) — the surviving device is
  strictly richer, and `isBridgePaneId` earns its keep by letting `panes.test.tsx` derive
  `STUB_PANE_IDS` from the *catalog* instead of from `Object.keys(SETTINGS_PANES)`, which is what
  turns the partition assertion from a tautology into a check. Endorsed.
- **`AboutPane` taking no props inside `Record<StubPaneId, ComponentType<SettingsPaneProps>>`** —
  fewer parameters is assignable and correct; not a hole.
- **`SETTINGS_GROUPS` not proven total over `SettingsGroupId` at compile time** — the drift that
  matters (a category silently dropped from the master list) is directly pinned by
  `settings-catalog.test.ts:96` (`sections.flatMap(s => s.items).length === SETTINGS_CATEGORIES.length`).
  Static single-author literal + a real guard = deferred §27's accepted precedent.
- **`profileDefaultsFor`'s `?? PROFILE_DEFAULTS[DEFAULT_PROFILE]`** — dead per the type, but the
  comment states the reason (a throwing resolver would throw inside *every* screen's render, not
  just the settings pane). Reasonable defence in depth; folded into L1 rather than filed twice.
- **`SCREEN_NOTES: Partial<Record<FormStepId, string>>`** (`FormFieldsPane.tsx:60`) — genuinely
  partial with a `?? COPY.noFields` fallback. Correct.
- **`isolatedModules`** — the new barrel exports use inline `type` modifiers
  (`type ProfileReduction`) and `export type * from '@/features/demo/engine/types'` is unchanged.
  Clean.
- **Screens' `isFieldVisible(id: FormFieldId)` props** — every one of the seven wizard screens
  types the callback to the domain union, not `(id: string)`. This is the props-honesty rule done
  right; worth saying out loud since it is 7 files of consistent discipline.

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 7 |

Canonical homes preserved (no parallel entity declarations): **yes** — every new domain type
(`UserProfile`, `FormStepId`, `FormFieldId`, `FormOverrides`, `FormVisibility`, `ProfileDefaults`,
`FormStepDef`, `FormFieldDef`) lives in `engine/types/index.ts`; the settings-catalog types live in
their registry module (consistent with `ExploreItem`); tests import rather than re-declare. The one
duplicated *shape* is the anonymous `{ capture; audio }` record — finding M1.
Discriminated unions well-formed: **yes** (`FinalSubmissionOutcome` unchanged; no new result types).
Exhaustiveness enforced (never-checked switches): **yes** — `settingsPreview`'s `assertNever`,
plus five total `Record`s (`STEP_CLASSIFICATION`, `ADDITIVE_STEP_LABELS`, `PROFILE_DEFAULTS`,
`PROFILE_LABELS`, `PROFILE_BLURBS`) and `SETTINGS_PANES: Record<StubPaneId, …>`, all probe-confirmed.
Correlated state modelled as a union: **n/a** — no new correlated-field pairs.
Id spaces typed (no bare-string registries/keys): **regression found** — M1 (additive tools),
M2 (`formProfileLabel`), L5 (`ExploreItem.id` as a step key), L7 (`getSettingsCategory`).
`readonly` discipline on shared data: **gap found** — L2 (both frozen defaults annotated mutable).
Boundary types honest about untrusted input: **yes** — `formOverridesSchema` is deliberately wider
than its output type with a documented filter on load, and `FullShape`/`FullShapeIn` hold on every
new shape literal.

**Verdict: APPROVE with comments.**

---

## Suites re-run (targeted, isolated worktree)

```
features/demo/engine/content/__tests__/form-customization.test.ts
features/demo/engine/content/__tests__/settings-catalog.test.ts
features/demo/engine/content/__tests__/settings-values.test.ts
features/demo/engine/logic/__tests__/form-visibility.test.ts
features/demo/engine/logic/__tests__/user-profile.test.ts
features/demo/engine/store/__tests__/persistence.test.ts
features/demo/engine/store/__tests__/form-customization-actions.test.ts
features/demo/engine/store/__tests__/user-profile-state.test.ts
features/demo/engine/store/__tests__/drawer-status.test.ts
features/demo/engine/__tests__/barrel.test.ts
features/demo/ui/screens/settings/__tests__/panes.test.tsx
→ 11 files / 217 tests passed
```

Cold `tsc --noEmit` at `1505c00`: **clean**. All probe edits reverted; `git status --porcelain`
empty in the probe worktree after each round.

---

# Fix-delta r1

**Head** `2f57ba1` (Merge `parity/p7-fix-formcustom`) · verified in the same isolated worktree
(`scratchpad/worktrees/p7-typedesign`, re-detached at `2f57ba1`), cold `tsc --noEmit` **exit 0**,
15 targeted suites / **273 tests** green. Every probe below was run as a real edit and reverted;
`git status --porcelain` empty after each.

**Disposition: 4 MEDIUM FIXED · 7 LOW FIXED · 0 not-fixed · 2 new LOW.**

| # | Commit | Disposition |
|---|---|---|
| M1 | R-20 `e7eb681` | **FIXED** (with a residual → **N1**) |
| M2 | R-21 `fcb1ad5` | **FIXED** — better than proposed |
| M3 | R-22 `6c936fa` | **FIXED** — replacement assertion is strictly stronger |
| M4 | R-23 `a877130` | **FIXED** |
| L1 | R-24 `74afd4d` | **FIXED** |
| L2 | R-25 `6f345ae` + `d66c498` (merge-deduped) | **FIXED** — both halves |
| L3 | R-26 `e6d99fd` | **FIXED** |
| L4 | R-27 `059cd3e` | **FIXED** |
| L5 | R-28 `252d0ca` | **FIXED** |
| L6 | R-29 `33910c3` | **FIXED** |
| L7 | R-30 `911a6ba` | **FIXED** |

## Verification, finding by finding

**M4 → R-23 — FIXED, probe-confirmed.** The omission probe now fails:
`zz-typeprobe.ts(8,48): error TS2554: Expected 2 arguments, but got 1.` The mode is
`DrawerStatusMode = FormVisibility | typeof COUNT_ALL_FIELDS`, required, with `COUNT_ALL_FIELDS`
exported and named at the map call site (`selectors.ts:323`). The `mode === COUNT_ALL_FIELDS ||
resolveFieldVisible(id, mode)` guard narrows correctly (object arm vs string-literal arm are
disjoint). This is the second of the two shapes I proposed and the better one — the map/case-map
reading is now *stated* at its call site rather than inherited from an omission.

**M3 → R-22 — FIXED, probe-confirmed, and the replaced assertion holds.**
`LinearFormStepDef extends FormStepDef { readonly id: WizardScreenId; readonly additive?: false }`
(`types/index.ts:465-475`); `LINEAR_FORM_STEPS` and `getVisibleFormSteps` carry it; the cast at
`selectors.ts:139` is gone. Probe: `LINEAR_FORM_STEPS[0].id` now types as `WizardScreenId`
(`error TS2322: Type 'WizardScreenId' is not assignable to type '"mediaCapture" |
"audioRecording"'`), so an additive tool cannot be typed into the linear list at all — a compile
failure rather than the test failure the old comment promised.

*On the replaced assertion (the specific thing to check):* the commit turned
`expect(LINEAR_FORM_STEPS.every((s) => s.additive !== true)).toBe(true)` — which stopped
type-checking as a meaningful comparison once `additive` narrowed to `false | undefined` (TS2367,
no overlap with `true`) — into **two** assertions, not zero:
`expect(LINEAR_FORM_STEPS.map((s) => s.additive)).toEqual(LINEAR_FORM_STEPS.map(() => undefined))`
plus `expect(LINEAR_FORM_STEPS.map((s) => s.id)).toEqual([...WIZARD_SCREENS])`. The first is
**strictly stronger** than what it replaced (`=== undefined` excludes `false`, which `!== true`
admitted); the second pins the id-equality the whole narrowing rests on, which the original never
asserted. The fact is preserved and widened. The one degenerate case — both sides `[]` if the
registry emptied — is closed by the id-equality assertion beside it. Correctly REPLACED, not
deleted.

**M2 → R-21 — FIXED, and the integrator improved on the proposal.** `formProfile: Profile` on
`SettingsPreviewContext` (`settings-values.ts:236`); `settingsPreview` maps through
`FORM_PROFILE_SHORT` itself at `:274`; the bridge passes the id and the dead `?? profile` arm is
gone **with its now-unused `FORM_PROFILE_SHORT` import** (`DemoExperience.tsx:721`). `profileName`
correctly stays a bare `string` — free text whose blank case *is* the domain — and the doc now
says why, which is the distinction that made the mismatch visible in the first place.
*Judgement:* the seam-era test did not merely get its literal swapped; it became a **totality
assertion** — `for (const p of PROFILES) expect(settingsPreview('form-customization', ctx({
formProfile: p }))).toBe(FORM_PROFILE_SHORT[p])`. That is better than what I suggested: a fourth
profile is now a compile error in the label map *and* automatically asserted by the loop, rather
than needing a fourth hand-written expectation. Accept as-is.

**M1 → R-20 — FIXED, but the gate is not where the commit says it is → new finding N1.**
`selectMediaToolsVisible` returns `Readonly<Record<AdditiveFormStepId, boolean>>` built by mapping
`ADDITIVE_FORM_STEP_IDS` (`selectors.ts:158-162`); `WizardDrawerProps.mediaTools` **imports** the
type rather than re-declaring it (`WizardDrawer.tsx:53`); the reads are `mediaTools.mediaCapture`
/ `.audioRecording`. The finding's failure mode is closed: a third tool can no longer land green.

I re-ran the third-tool probe and isolated exactly which files gate it (`'ocr'` appended to
`ADDITIVE_FORM_STEP_IDS`, then grouping the error set by file):

```
production files erroring: features/demo/engine/content/form-customization.ts   (only)
all files erroring:        features/demo/engine/content/form-customization.ts
                           features/demo/ui/controls/__tests__/controls.test.tsx
                           features/demo/ui/controls/__tests__/WizardDrawer.test.tsx
                           features/demo/ui/screens/__tests__/a11y.test.tsx
```

`selectors.ts` does **not** error (its `Object.fromEntries(…) as Record<…>` absorbs the widening —
harmlessly, since mapping the tuple makes it automatically correct, so there is nothing to wire
there). `WizardDrawer.tsx` does **not** error either. The commit message's "adding a tool now
fails at the selector and at the accordion until both are wired" describes neither file; what
actually fails is the eight `mediaTools` **prop-literal construction sites** in three test files,
and `form-customization.ts`'s two total `Record`s, which predate R-20. See **N1**.

**L1 → R-24 — FIXED.** `buildDefaults` now maps the registries in one `Object.fromEntries`
expression instead of `{} as Record<…>` + a loop, and **both `?? false` arms are gone**
(`form-visibility.ts:58,78`). The type, the construction and the consumer now give one answer
about totality, which was the whole ask. The residual `as Record<…>` on `Object.fromEntries` is
the unavoidable idiom (its return is `{[k: string]: T}`) and is correct by construction.

**L2 → R-25 — FIXED, both halves, dedup verified.** Probe: `DEFAULT_SETTINGS.darkMode = false` →
`TS2540: Cannot assign to 'darkMode' because it is a read-only property`; same for
`DEFAULT_USER_PROFILE.name` (`TS2540`). The double-landing (`6f345ae` shell half + `d66c498` P7.2
half) reconciled to **one** `Readonly<UserProfile>` annotation carrying the routed owner's fuller
comment — verified `grep -c "Readonly<UserProfile>" == 1`, no duplicated declaration. The
`@ts-expect-error` probe kept in `user-profile.test.ts` is a good touch: it fails the *build* if
the annotation is ever widened back, which is the one thing a runtime `Object.isFrozen` assertion
cannot do.

**L3 → R-26 — FIXED, probe-confirmed.** `readonly [FormFieldId, ...FormFieldId[]]`. Probe:
setting `occNumber: []` → `form-customization.test.ts(153,7): error TS2322: Type '[]' is not
assignable to type 'readonly [FormFieldId, ...FormFieldId[]]'. Source has 0 element(s) but target
requires 1.` The escape hatch I described (discharge the key with an empty list, loop iterates
zero times, claim satisfied by a value that proves nothing) is closed. Native tuple syntax, no
helper type introduced — right call for this codebase.

**L4 → R-27 — FIXED.** `getFormStep` / `getFormField` / `getFieldGroupMembers` take `string`;
`isKnownFormStep` / `isKnownFormField` call them with no cast. The signatures now agree with the
callers that exist, and the `| undefined` return is reachable for the reason it was written.

**L5 → R-28 — FIXED.** New `content/__tests__/explore-step-ids.test.ts` pins the join in **both**
directions: one explore row per `WIZARD_SCREENS` id slugged with that id (drift), and no
*other* row's slug colliding with a `FormStepId` except the two capture tools, which are the
deliberate exception (collision). That is exactly the pair I described, and the "other direction"
half is the one I would have expected to be skipped.

**L6 → R-29 — FIXED.** `MODAL_LAYER = { base: 0, overSheet: 4 } as const` +
`type ModalLayer = (typeof MODAL_LAYER)[keyof typeof MODAL_LAYER]`, with the ordering constraint
(above the sibling overlays, strictly below `PickerSheet`'s 31/32) documented at the one place the
values sit together. Noted without filing: `ModalLayer` resolves to `0 | 4`, so a bare
`elevation={4}` still type-checks — the union is over the *values*, not the names. That is fine:
the invariant at issue was "a caller can pick a number that breaks either end", and `12` is now
unrepresentable. Forcing the *name* would need a nominal wrapper this codebase does not use.

**L7 → R-30 — FIXED.** Deleted, and the tombstone comment at `settings-catalog.ts:136-147` is the
right artifact: it records that the phone needs `getCategoryById` because *its* `activeId` is
`string | null` while the demo's is `SettingsCategoryId | null`, which is the actual reason the
port had no caller. That is the §84a lesson applied in reverse — the comment now explains a
deletion instead of describing behaviour that was never shipped.

## New findings

### [LOW] N1 — R-20's compile gate rides on test fixtures, not on the two production files its commit names

**Type:** `selectMediaToolsVisible(): Readonly<Record<AdditiveFormStepId, boolean>>`
(`features/demo/engine/store/selectors.ts:158-162`) and the accordion's hand-built `rows` array
(`features/demo/ui/controls/WizardDrawer.tsx:334-345`).

**What the probe shows:** adding a third `AdditiveFormStepId` errors in one production file
(`content/form-customization.ts` — `STEP_CLASSIFICATION` and `ADDITIVE_STEP_LABELS`, both of which
gated it *before* R-20) and in three test files (the `mediaTools` prop literals, R-20's actual
contribution). `selectors.ts` and `WizardDrawer.tsx` are both clean.

**Why it still matters (and why only LOW):** the finding is genuinely fixed — the build cannot go
green with an unwired third tool, and whoever fixes the fixtures is looking straight at the
accordion. But the guard is *incidental*: it exists because three suites happen to construct the
prop as an object literal. Fold those into a shared factory that spreads
`selectMediaToolsVisible(...)`'s output — an ordinary test refactor — and the gate silently
evaporates, restoring the exact original failure mode. A compile gate that a test refactor can
delete is not the same asset as one anchored in the production file.

**Fix (small):** build the two tool rows from the id space in the accordion, e.g. a
`const TOOL_ROWS: Record<AdditiveFormStepId, { label: string; ariaLabel: string; icon: ReactNode;
onSelect(): void }>` mapped through `ADDITIVE_FORM_STEP_IDS` and filtered by
`mediaTools[id]`, with the ungated Media Library row appended after. A third tool is then a
compile error in `WizardDrawer.tsx` — where the commit message already says it is. Same device the
selector now uses, pointed at the consumer.

**Round-lesson tie-in (§84a):** this is the class the round lesson names, one level up — a *commit
message* asserting a compile gate at two named sites, where the compiler gates neither. When a
commit claims a compile error, run it.

### [LOW] N2 — `SelectField` can be rendered with no accessible name at all: `label` and `a11yLabel` are both optional

**Type:** `SelectField({ label, a11yLabel, value, onChange, options }: { label?: string;
a11yLabel?: string; … })` at `features/demo/ui/screens/_shared.tsx:438`.

**Permitted invalid state:** the two props are correlated — exactly one of them must be present
for the control to have a name — and the type asks for neither. Probe-verified:
`<SelectField value="" onChange={() => {}} options={['a','b']} />` compiles clean.

**How it got here:** P7.1 made `label` optional so the settings pickers could reproduce the
phone's label-above-the-control layout; R-9 then added `a11yLabel` to restore the name those
label-less pickers lost. Both steps were right; neither closed the "neither" state the first one
opened. Every current caller passes one (`PaneSelect` requires `a11yLabel`, wizard callers pass
`label`), so nothing is broken today — hence LOW, not MEDIUM.

**Fix:** the house pattern for coupled props — a union, so the invalid combination is
unrepresentable:

```ts
type SelectFieldProps = { value: string; onChange(v: string): void; options: … } &
  ({ label: string; a11yLabel?: string } | { label?: never; a11yLabel: string })
```

Repo precedent: `RetentionView` (`engine/logic/retention.ts`) — "the union makes 'no total ⇒ no
scopes' unrepresentable otherwise". Same shape, same reason.

## Fix-introduced regression hunt — clean

- **`TypedOption<T extends string | number>`** (`settings-values.ts:156`, R-11): genuinely
  cast-free. `PaneSelect` narrows by **looking the value up in the list**
  (`options.find((o) => String(o.value) === picked)`), not by asserting — so the eight `as`
  narrowings are gone and none was replaced by a hidden one. The `number` arm removes the
  stringify-at-the-list / re-parse-at-the-handler round trip for `maxVideoDuration` and
  `gpsTimeout`. Note in passing (not a finding, and not new): the `*_OPTIONS` lists are arrays, so
  they are still not *exhaustive* over their `*_VALUES` tuples — a dropped member compiles. Each
  list is pinned literal-for-literal in `settings-values.test.ts:105-160`, which is the §27
  static-literal precedent, and R-11 strictly improved the other direction (a typo'd value is now
  a compile error). `PaneRadioGroup`'s narrower `T extends string` is correct — both radio groups
  are string unions.
- **`MODAL_LAYER`** — covered under L6. No regression; `elevation` went from `number` to `0 | 4`.
- **Key renames** — `mediaTools.capture`/`.audio` → `.mediaCapture`/`.audioRecording`, and
  `formProfileLabel` → `formProfile`. Both are required-property renames on non-optional members,
  so every reader and every construction site is compiler-visible; cold tsc is clean and no
  stringly-typed reader survives (`grep` for the old keys returns nothing outside the diffs).
- **`ADDITIVE_FORM_STEPS` left at `readonly FormStepDef[]`** while its linear sibling narrowed to
  `LinearFormStepDef` — an asymmetry, not a gap: nothing routes on those ids as
  `AdditiveFormStepId`, so there is no cast for a narrowing to remove. Correctly not done.
- **`PaneSelect` drops an unrecognised picked string** (`if (hit) onChange(hit.value)`) — a silent
  no-op, but unreachable (the dropdown's option list *is* `options`), and it is the
  silent-failure lane's call, not mine. Recorded, not filed.
- `selectDrawerStatus`'s new required `mode`, the `LinearFormStepDef` narrowing and the
  `Readonly<>` annotations all propagated without a single new `as` anywhere in the diff.

## Fix-delta summary

| Severity | Outstanding |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 2 (new: N1, N2) |

Id spaces typed: **all four r1 regressions closed** (M1, M2, L5, L7).
`readonly` discipline: **closed** (L2, both halves, compile-enforced).
Exhaustiveness enforced: **strengthened** — the R-26 non-empty tuple, the R-21 totality loop and
the R-28 two-way join each replaced a device that could be discharged without proving anything.
Correlated state modelled as a union: **one new gap found** (N2).

**Verdict: APPROVE.** Both new items are LOW and neither blocks the merge.

