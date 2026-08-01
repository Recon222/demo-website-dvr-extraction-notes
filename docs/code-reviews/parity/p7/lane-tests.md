# P7 review — TESTS lane (test quality / false-coverage)

**PR:** #36 · `master..feat/parity-p7` · reviewed at `1505c00`
**Worktree:** `scratchpad/worktrees/parity-p7` (cold; deps installed; every run below executed here)
**Lane contract:** `.claude/agents/test-analyzer.md` — the single question is *would these tests catch a realistic regression, or do they pass for the wrong reasons?* Production bugs, a11y, type design and swallowed errors belong to other lanes.

Context read before flagging: PR #36's body (the "Deliberate choices — DO NOT RE-FLAG" list), `docs/code-reviews/deferred.md` §§80 (a–g), 81 (a–e), 82 (a–i), 83 (a–c), and `features/demo/CLAUDE.md`.

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL / HIGH / MEDIUM / LOW is given alongside so the mapping is auditable.

**Method.** Every claim below is a *mutation probe*, not a reading: the guard/gate/dep is deleted or inverted in the worktree, the paired suites are re-run, and the result recorded. Every probe was reverted; `git status` is clean at the end of this document (verified).

---

## Gates run in this worktree

| Gate | Result |
|---|---|
| `pnpm test` (cold, full) | **259 files / 3365 passed** — exactly the PR's claim (master baseline 3073, so +292) |
| `pnpm test:coverage` | **97.83 stmts · 92.92 branch · 99.22 funcs · 98.83 lines** against the 80% gate on `lib/**` + `engine/**` — comfortably met |
| New engine modules, branch coverage | `form-visibility.ts` 89.47 · `profiles.ts` 75 · `form-customization.ts` 87.5 · `settings-values.ts` 82.6 · `settings-catalog.ts` 100 · `user-profile.ts` 100 — all above the gate; the residual gaps are itemised in **T-7** |
| Coverage-boundary check (logic parked in ungated `ui/`) | **clean.** The one new `ui/` module that could have carried logic, `ui/screens/settings/settingsData.ts`, is a pure `screenData.ts`-style shape mapper with no branching; every derivation (`settingsPreview`, `describeProfile`, `resolve*Visible`, `computeCareerDuration`, `trimProfile`) landed in gated `engine/` |
| Determinism | no `Date.now()`/`Math.random()` in any new test; the two clock-dependent surfaces both take the injectable seam and both are pinned to it (`user-profile.test.ts:168-172` asserts the spy is *called*; `panes.test.tsx:275-279` drives the About copyright year through `clock.now`) |
| Factory usage | `freshStore()` / `newCaseInput()` / `newLocationInput()` used throughout the new store suites; the new local factories (`profile()`, `vis()`, `renderPane()`, `patch()`) are per-file helpers over canonical defaults, not hand-built domain literals |
| Mock strategy | **no new module mocks at all.** Every new suite drives the real store / real engine; the two bridge suites inject a real `createDemoStore()` via the `store` prop, which is the house pattern |
| `panes.test.tsx` solo, 5× consecutive | 27 passed × 5 (see **Flake re-check** below) |

---

## Flake re-check — the web lane's `panes.test.tsx:288` report

`lane-web.md` recorded one run in which `[...BRIDGE_PANE_IDS]` was received as `["about","form-customization","user-profile"]`, and routed it here.

**Not reproduced, and not producible from the source.** Five consecutive solo runs of `panes.test.tsx` and one cold full-suite run are green. `BRIDGE_PANE_IDS` has exactly four references in the whole feature (`panes/index.tsx:46,47,52` and the test file), none of which is a write — no `push`, no index assignment, no `concat` into it — so no runtime path exists that could add a third element, and `'about'` has never been a member in any commit on this branch. Vitest runs with per-file isolation, so a sibling suite cannot reach the module registry either.

The recorded run overlapped `next build` writing into the same worktree's caches, which is the likeliest source of a stale transform. **No finding.** If it recurs from a worktree that has *not* had a Next build running concurrently, the culprit is the toolchain sharing one worktree, not this suite — re-file against the runner, not `panes.test.tsx`.

---

## Findings

### [MAJOR · lane-HIGH] T-1 — the Completed-By autofill's dependency-list contract is stated in prose and pinned by nothing

**Production code:** `features/demo/ui/DemoExperience.tsx:1016-1024` — the autofill effect; the dependency list is `:1024`.
**Tests covering it:** `features/demo/ui/__tests__/DemoExperience.user-profile.test.tsx:104-206` (8 tests in the `Completed By autofill` block, 12 in the file).

The PR body names this exact list as load-bearing — *"The Completed-By autofill's dependency list IS the contract … typing survives, later profile edits never rewrite. Don't 'fix' the deps."* The effect's own doc comment goes further (`:1001-1004`): *"neither `completedBy` nor the profile name is a dependency, so typing over the autofilled name — **or clearing it** — survives for as long as the screen stays open."*

**Probe — the deps can be "fixed" and the suite stays green:**

| Mutation at `DemoExperience.tsx:1024` | `DemoExperience.user-profile.test.tsx` |
|---|---|
| `[store, view, currentLocationId, currentLocation?.form.completedBy]` | **12 passed** |
| `[store, view, currentLocationId, userProfile.name]` | **12 passed** |

**Uncovered case + the bug that slips through.** Both mutations are behavioural regressions, and I confirmed each against a scratch test (written, run at baseline and under mutation, then deleted):

1. **`completedBy` in the deps ⇒ the field becomes unclearable.** Sitting on Completion with an autofilled name, the visitor selects-all and deletes. The effect re-runs on the now-empty value, the `if (location.form.completedBy) return` guard no longer holds, and the name is written straight back. Baseline: cleared stays cleared. Mutated: `expected '' … received 'K. Vasilyev'`.
2. **`userProfile.name` in the deps ⇒ a name set later fills a screen already open.** Baseline leaves the field the visitor's; mutated fills it.

The 8 shipped tests miss both because every one of them either arrives at Completion with a name *already present* (so the empty-guard short-circuits regardless of deps) or changes the profile from a *different* view (`:171-176` does `setView('cases')` first), which forces a `view`-driven re-run that exists under both dep lists. No test ever empties the field, and no test ever changes the profile while `view === 'completion'`.

**Fix.** Two tests in the same describe block — no new machinery, `setupCompletion` already exists:

```ts
it('a CLEARED field stays cleared — the deps are the contract (PR body, §81)', () => {
  // …setupCompletion with a profile name; expect the autofill…
  fireEvent.change(completedByField(), { target: { value: '' } })
  expect(completedByField()).toHaveValue('')
  expect(store.getState().locations[0].form.completedBy).toBe('')
})

it('a profile name set while Completion is OPEN does not fill it', () => {
  // …setupCompletion with NO profile name…
  act(() => store.getState().updateUserProfile({ name: NAME }))
  expect(completedByField()).toHaveValue('')
})
```

Both verified: green at baseline, red under the respective mutation.

---

### [MAJOR · lane-HIGH] T-2 — the submission GPS *block* toggle pins only its capture button; the coordinate card and the lookup notice can escape the gate

**Production code:** `features/demo/ui/inputs/LocationFields.tsx:241-268` — `{showGps && (<> GpsCaptureControl · lookup notice · CoordinateDisplay </>)}`; fed by `features/demo/ui/screens/SubmissionScreen.tsx:160` (`showGps={isFieldVisible('submission.latitude')}`).
**Tests covering it:** `features/demo/ui/screens/__tests__/field-visibility.test.tsx:146` — `'submission.latitude': byTestId('gps-capture-control')`.

§82b is explicit about the scope of this gate: *"the capture control + lookup notice + coordinate card go with it."* Only the first is asserted. `gps-capture-control` is the testid on `GpsCaptureControl`'s own root (`GpsCaptureControl.tsx:153`); the notice and the card are **siblings**, not children.

The test is short-circuited by its own fixture: `submissionFields` (`field-visibility.test.tsx:34-45`) carries no `lat`/`lng`, so `hasCoordinates` is false and `CoordinateDisplay` renders in **neither** arm of the visible/hidden pair. The "render twice and diff" shape that makes the rest of this file strong is defeated here because the element in question is absent from both renders.

**Probe.** Moving `CoordinateDisplay` outside the `showGps` fragment (leaving the capture control gated):

```
field-visibility · submission-gps · location-coordinates · DemoExperience.form-customization
  → 84 passed (0 failed)
```

**Uncovered case + the bug that slips through.** Realistic and reachable in three clicks: capture GPS on Submission → open Settings → Form Fields → switch the submission coordinate group off. The capture button disappears; the captured coordinate card stays on screen with no control to remove it — a field the grid claims to govern, still rendering. Verified with a scratch test (deleted): baseline green, mutated `expected document not to contain element, found <span … 43.6087`.

**Fix.** One test in `field-visibility.test.tsx`, beside the existing section-card cases:

```ts
it('takes the whole GPS block, not just the capture control (§82b)', () => {
  render(
    <SubmissionScreen occNumber="PR25-1" fields={submissionFields}
      coordinates={{ lat: 43.6087, lng: -79.6505, accuracyM: 8, source: 'gps' }}
      isFieldVisible={(id) => id !== 'submission.latitude'}
      onChange={vi.fn()} onCoordinates={vi.fn()} {...nav} />,
  )
  expect(screen.queryByTestId('gps-capture-control')).not.toBeInTheDocument()
  expect(screen.queryByText(/43\.6087/)).not.toBeInTheDocument()
})
```

The lookup-notice half (`data-testid="reverse-geocode-notice"`) is the same gap but needs a reverse-geocode fixture; the card is the cheap, load-bearing half. Note the **camera** GPS group has no equivalent gap — `camera-gps-${id}` is the root of the whole block (`CameraGpsCapture.tsx:133`), so `byTestId('camera-gps-c1')` genuinely covers it.

---

### [MINOR · lane-MEDIUM] T-3 — the must-stay exemption on the auto-hide cascade is unpinned; the test named for it passes through the *other* guard layer

**Production code:** `features/demo/engine/store/create-store.ts:566` — `if (screen && !isStepMustStay(screen)) {` inside `setFormFieldVisible`'s cascade.
**Test claiming to cover it:** `features/demo/engine/store/__tests__/form-customization-actions.test.ts:147-157`, *"leaves a MUST-STAY screen standing when its optional fields are all off"*, whose comment says "the exemption is what keeps the mandatory inputs reachable."

**Probe.** Deleting `&& !isStepMustStay(screen)`:

```
form-customization-actions · field-visibility · drawer-status → 73 passed (0 failed)
```

**Why the named test misses it.** Two independent short-circuits, either of which alone makes it green:

1. It drives `submission`, whose five always-on fields are forced visible by `resolveFieldVisible` (`form-visibility.ts:66`), so `stepHasVisibleField('submission', …)` is never false and the cascade branch is never entered at all.
2. Its assertion is `resolveStepVisible('submission', …) === true`, which the **READ**-force layer (`form-visibility.ts:55`) satisfies unconditionally — it would hold even if `steps.submission = false` had been written.

So the test exercises layer 1 while being named for layer 2. This is the one write path in P7.3 where the PR body's claim — *"the store writers refuse contradicting overrides at WRITE via true no-op early returns (state-identity pinned)"* — is not actually pinned. (The two *direct* refusals at `:523` and `:553` **are** pinned by identity; see the verified table below.)

**Reachable case.** `completion` is the only must-stay screen with **no** always-on field (`field-visibility.test.tsx:219-227`'s own always-on list confirms: the seven locked ids are all `submission.*`/`scope.*`). Switching both Completion fields off under the mutation writes `formOverrides.steps.completion = false` into store state **and into the v7 snapshot** — a record the resolver ignores and the pane can never clear, because `setFormStepVisible` refuses must-stay writes. Verified with a scratch test (deleted): baseline `{}`, mutated `{ completion: false }`.

**Fix.** Extend the existing test with the write-side assertion it is named for, on the screen that actually reaches the branch:

```ts
it('leaves a MUST-STAY screen standing when its optional fields are all off', () => {
  // …existing submission body…
  // Completion is the must-stay screen with no always-on field — the branch's only reachable case.
  const store2 = freshStore()
  store2.getState().setFormFieldVisible('completion.dateTimeCompleted', false)
  store2.getState().setFormFieldVisible('completion.completedBy', false)
  expect(store2.getState().formOverrides.steps).toEqual({})   // the cascade did not fire
  expect(resolveStepVisible('completion', store2.getState())).toBe(true)
})
```

---

### [MINOR · lane-MEDIUM] T-4 — `reset()`'s treatment of the two new P7.3 members is unasserted in either direction, and the "dirty EVERY mutable key" reset fixture has drifted

**Production code:** `features/demo/engine/store/create-store.ts:514` — `reset: () => set({ ...initialState(), userProfile: get().userProfile })`.
**Tests covering it:** `features/demo/engine/store/__tests__/store.test.ts:30-52` (the maximal reset fixture, whose own comment reads *"Dirty EVERY mutable key"*) and `user-profile-state.test.ts:82-93` (which pins `userProfile` **survives**).

`profile` and `formOverrides` are new mutable `DemoState` members that ride the v7 snapshot. `reset()` wipes both — a deliberate-looking asymmetry against §81c's identity-survives ruling, since a form profile is a settings preference of the same family. Neither the wipe nor a hypothetical preserve is asserted anywhere: `grep formOverrides` across all test files hits six suites, none of which mentions `reset`.

**Probe.** Rewriting reset to *preserve* both:

```
reset: () => set({ ...initialState(), userProfile: get().userProfile,
                   profile: get().profile, formOverrides: get().formOverrides })
→ features/demo/engine/store + DemoExperience.form-customization: 280 passed (0 failed)
```

The `store.test.ts:30` fixture dirties view, chapter, cases, locations, drawer, modal and two capture keys, and asserts each returns to boot — it stopped being maximal the moment P7.3 added two more. That is precisely the fixture-drift failure mode this repo's own conventions warn about, and it is silent: nothing fails when a new key is forgotten.

**Fix.** Add `applyFormProfile('canvas')` + one `setFormStepVisible` to the `store.test.ts:30` dirty set, then assert `profile === 'forensic'` and `formOverrides` equals `{ steps: {}, fields: {} }` after reset (or the opposite, if the owner rules the form profile survives like identity does — either way it is one line and it becomes a decision on the record rather than an accident). No UI calls `reset()` today, which is why this is MEDIUM and not higher.

---

### [MINOR · lane-LOW] T-5 — the "every pane opens with an honest note" loop pins the box, not the text

**Production code:** the eight stub panes' `<PaneStubNote>` bodies (`_pane-chrome.tsx:108-131` renders the `data-testid`).
**Test:** `features/demo/ui/screens/settings/__tests__/panes.test.tsx:47-53`.

The loop asserts `getByTestId('settings-pane-stub-note')` is in the document, which is presence of the container, not honesty of its content. Five panes are saved by content assertions elsewhere in the file (media-capture `/carries EXIF/`, location `/Balanced \(50 m\)/`, time-sync `time.nrc.ca`, security `/does not simulate the prompt/`, cloud-sync `/nothing you enter here leaves your browser tab/`). **Appearance, Export Security and About have no assertion on their note text anywhere.**

**Probe.** Replacing the Appearance and About note bodies with `{null}`:

```
features/demo/ui/screens/settings + DemoExperience.settings → 93 passed (0 failed)
```

D6's honesty rule is the whole justification for the stub treatment, so an empty note is a real (if unlikely) regression. **Fix:** either add `expect(note).not.toBeEmptyDOMElement()` (or a min-length check on `textContent`) to the loop, or give the three uncovered panes a one-line content assertion each — Appearance already has the natural one ("no light theme to switch to").

---

### [MINOR · lane-LOW] T-6 — the partition test's first assertion is genuinely catalog-derived; its second and third are tautologies

**Test:** `features/demo/ui/screens/settings/__tests__/panes.test.tsx:35-45`.

§83b's claim is **verified true for the assertion that matters.** `STUB_PANE_IDS` (`:24`) is `SETTINGS_CATEGORY_IDS.filter(id => !isBridgePaneId(id))` — derived from the catalog, not from `Object.keys(SETTINGS_PANES)` — so `:39` is a real completeness check.

**Probe.** Adding a `'developer'` entry to `SETTINGS_CATEGORY_IDS` + `SETTINGS_CATEGORIES` with no pane:

```
panes.test.tsx: "partitions the catalog…" FAILED · "every pane opens with an honest note…" FAILED
settings-catalog.test.ts: 3 more FAILED   → 5 failed / 30 passed
```

Runtime, not just `tsc`. Good.

The two follow-ups are not, and the report should say so rather than counting them as coverage:

- `:41` — `[...STUB_PANE_IDS, ...BRIDGE_PANE_IDS].sort()` vs the catalog is `(catalog − bridge) + bridge = catalog`, true by construction. Its only residual content is "`BRIDGE_PANE_IDS` has no duplicates and no member outside the catalog", and the second half is already compile-enforced by `as const satisfies readonly SettingsCategoryId[]` (`panes/index.tsx:46`).
- `:42-44` — "no bridge id also sits in the map" is implied by `:39` (a bridge id in `SETTINGS_PANES` would make `Object.keys` unequal to `catalog − bridge`).

No change required — redundant assertions are cheap. Flagged so the fix-delta does not read three green assertions as three independent guarantees.

---

### [MINOR · lane-LOW] T-7 — the two remaining new-engine branch gaps, both defensive fallbacks

Surfaced by the coverage run, both above the gate but both cheap and both mirroring a sibling that *is* tested:

1. `features/demo/engine/content/profiles.ts:110` — `describeProfile`'s `PROFILE_DEFAULTS[id] ?? PROFILE_DEFAULTS[DEFAULT_PROFILE]` rogue-profile fallback (branch coverage 75%). Its exact sibling, `profileDefaultsFor` in `form-visibility.ts:47-51`, **is** pinned (`form-visibility.test.ts:54-60`, "falls back to the default profile when the persisted one is out of universe"). One line in `content.test.ts`: `expect(describeProfile('nope' as Profile)).toEqual({ steps: 0, fields: 0 })`.
2. `features/demo/engine/content/form-customization.ts:202` — `getFieldGroupMembers`'s `if (!field) return []` unknown-id guard. The neighbouring unknown-id guards (`isKnownFormField`, `resolveFieldVisible`) are both pinned at `form-visibility.test.ts:152-163`; this one is not. One line in `form-customization.test.ts`.

The other flagged branches in the new engine files are unreachable-by-construction (`settings-values.ts:284` is `assertNever`; `form-visibility.ts:58,75` are `?? false` arms over profile maps that `content.test.ts:72-81` proves total). Leave those.

---

### [MINOR · lane-LOW] T-8 — `checkArray` is now dead and, as of this diff, entirely untested

**Production code:** `features/demo/engine/store/selectors.ts:169-176`.

`selectDrawerStatus`'s two array screens moved to the new `countedArray` helper, and `checkArray` lost its last caller — `grep -rn checkArray features/demo` returns the declaration and one doc-comment mention, nothing else. It is the reason `selectors.ts` reports the lowest numbers of any store file in the coverage run (89.42 stmts / 92.15 funcs, uncovered `170-174`).

Raised from this lane only because the coverage delta is what surfaces it; **the deletion belongs to the TS lane** (dead-export hygiene). Noting it here so the two lanes' findings can be merged into one commit rather than two.

---

## What I probed and found genuinely load-bearing (no findings)

Recorded so the fix-delta does not re-derive them, and so a later reviewer can see which claims were *tested* rather than read.

| Claim under test | Mutation applied | Result |
|---|---|---|
| **Guard layer 1 (read-force), fields** | delete `if (isFieldAlwaysOn(id)) return true` (`form-visibility.ts:66`) | 1 failed — `form-visibility.test.ts` "forces a mandatory field visible against an explicit off override" |
| **Guard layer 1 (read-force), steps** | delete `if (isStepMustStay(id)) return true` (`:55`) | 1 failed — "forces a must-stay step visible against an explicit off override" |
| **Guard layer 2 (write-refusal), steps** | delete `if (isStepMustStay(id)) return` (`create-store.ts:523`) | 1 failed — the `.toBe(before)` state-identity pin at `form-customization-actions.test.ts:59` |
| **Guard layer 2 (write-refusal), fields** | delete `if (isFieldAlwaysOn(id)) return` (`:553`) | 1 failed — the identity pin at `:119` |
| ⇒ **the two layers are pinned separately** | each mutation fails *only* its own layer's test | confirmed — the read tests build `FormVisibility` literals directly, so they never route through the store's refusal, and vice versa |
| **Blank-screen symmetry (invariant 3), outer half** | delete the whole `if (on) { … }` restore branch (`create-store.ts:527-542`) | 2 failed |
| **…inner half only** (clear-overrides kept, force-on dropped) | collapse to `next = { steps, fields: cleared }` | 1 failed — "forces fields on when the PROFILE itself would leave the screen blank" (so the two halves are pinned independently, not by one test) |
| **Auto-hide cascade** | delete the `if (!on) { … }` block | 3 failed, incl. the bridge-level "shows the auto-hide cascade land on the screen row itself" |
| **GPS group atomicity** | `getFieldGroupMembers(id)` → `fields[id] = on` | 1 failed |
| **v7 fixture ordering constraint** (`applyFormProfile` must precede the toggles) | move `applyFormProfile('canvas')` after the two toggles | 1 failed, `expected { steps: {}, fields: {} } to deeply equal { …(2) }` — the constraint is **both stated** (`persistence.test.ts:222-224`) **and load-bearing**; note the whole-state diff alone would *not* have caught it, the explicit `toEqual` at `:257-260` is what does |
| **v7 maximal fixture exercises both new members** | — | yes: `userProfile` with all seven fields non-empty (`:210-219`), `formOverrides` with **both** halves non-empty (`:225-227`), plus `profile: 'canvas'`. The v7 *union*'s third change — `PROFILES` widened to `'limited'` — is covered separately by `DemoExperience.form-customization.test.tsx:185-196`, which round-trips `profile: 'limited'` through `snapshotOf`. All three v7 shape changes have a runtime pin |
| **Bridge reactivity** | `useStore(store, s => s.formOverrides)` → non-subscribing `store.getState().formOverrides` | 3 failed in `DemoExperience.form-customization.test.tsx` |
| **§83c merge wiring** (`profileName` reaching the master row) | drop `userProfile.name` from the `settingsSections` memo deps | 1 failed — "updates the master row preview from the phone's 'Not set' to the live name" |
| **Grid gating, 8 spot-probes** across 7 screens — `dvr.recordingSchedule`, `dvr.daysUntilOverwritten`, `export.mediaPlayerIncluded`, `scope.isActualTime`, `arrival.departureDateTime`, `camera.recordingFps`, `submission.locationPhone`, `completion.completedBy` | each gate forced to `true` | **8/8 failed exactly one test each** in `field-visibility.test.tsx`. The render-twice-and-diff shape works, and the `CONTROL`-map completeness test at `:206-229` is a real registry check (36 mapped + 7 group members + 7 always-on = the 50 switchable fields) |
| **The 30-test engine profile suite** (`engine/logic/__tests__/user-profile.test.ts`) | read against the phone's own `src/features/settings/user-profile/__tests__/compute-duration.test.ts` | **faithful superset.** Every phone case is present with the same anchor (2024-07-15T12:00:00) and the same expected string; the demo adds the clock-injection seam assertion, the "date only, no time" input, the calendar-month boundary (31st → 1st), and whitespace handling. The suite's own header claim holds |
| **`panes.test.tsx` stub-note pins** | see T-5 | the loop covers the 8 stub ids; the two bridge panes are correctly excluded (`UserProfilePane` ships a note pinned at `UserProfilePane.test.tsx:96-101`; `FormFieldsPane` ships none, which is right — D6 exempts it, and it carries the output-policy footnote instead) |

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| CRITICAL / blocker | 0 |
| HIGH / major | 2 (T-1, T-2) |
| MEDIUM / minor | 2 (T-3, T-4) |
| LOW / minor | 4 (T-5, T-6, T-7, T-8) |

Behaviorally meaningful coverage: **strong** — this is one of the most mutation-resistant test surfaces this project has shipped. 21 of 23 probes reddened, most of them narrowly (one named test, not a shotgun).
Engine coverage gate (80% on `lib/**` + `engine/**`): **met** — 97.83 / 92.92 / 99.22 / 98.83.
Mock strategy: **at the IO edge** — no new module mocks at all; the real store and the real engine run everywhere.
Factory usage: **canonical** — `freshStore`/`newCaseInput`/`newLocationInput` throughout; no hand-built domain literals introduced.
Setup-shim traps: **none** — nothing new touches `getContext`, `mediaDevices`, `matchMedia` or `scrollIntoView`.
Determinism (clock/entropy injected): **yes** — both clock-dependent surfaces take the seam and both assert on it.

**Verdict: REVISE** — two HIGH, both single-test fixes, both verified red-under-mutation / green-at-baseline. Nothing here blocks; the two MEDIUMs are each one assertion.
