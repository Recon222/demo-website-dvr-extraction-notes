# P7 review — TypeScript lane

**PR:** #36 · `master..feat/parity-p7` @ `1505c00` (integrator merge)
**Worktree:** `scratchpad/worktrees/parity-p7`
**Scope:** P7.1 Settings shell/catalog/stub panes · P7.2 User Profile (+v7 `userProfile`, Completed-By autofill, PDF Completion section) · P7.3 Form Customization (58-id registry, three profiles, visibility resolver, wizard/drawer derivation, v7 `formOverrides` + `PROFILES` widening) · the one-v7 unification.

**Verdict: APPROVE with comments** — 0 CRITICAL, 0 HIGH, 4 MEDIUM, 1 LOW.

Every architectural device this phase leans on was verified *by probe*, not by reading the comment
that claims it. All four hold. The four MEDIUMs are one proven stale-render, one reachable
dead-end screen state, one type-safety hole with its own fix already sitting unused in the file,
and two wrong counts in visitor-facing copy.

---

## Gate results (all re-run in this worktree)

| Gate | Result |
|---|---|
| **COLD `tsc --noEmit`** (`.tsbuildinfo` + `node_modules/.cache/tsc` removed first) | **clean**, exit 0, 1.5 s wall |
| Targeted engine suites (9 files) | 187 passed |
| Targeted UI/settings suites (9 files) | 168 passed |
| Second targeted sweep (58 files: pdf, content, explore, screens, controls, barrels) | 769 passed |
| `grep -rn "useStore" features/demo/ui` outside `DemoExperience.tsx` | 0 hits — **bridge intact** |
| React / `'use client'` / module-scope `window`,`document` under `engine/` | 0 hits — **engine pure** |
| `@/features/demo` imports from `components/`, `lib/`, `app/(default)/` | 0 hits — **isolation intact** |
| `features/demo/index.ts` | unchanged (`DemoExperience` + `clearDemoSnapshot`) |
| `any` / `as any` / `@ts-ignore` / stray `console.log` in the diff | 0 |

> **Test-run caveat, recorded because it cost me a false alarm:** running two `vitest run`
> processes concurrently against this worktree produced 42 spurious failures across 5 files. Re-run
> solo, all 9 files pass. Any lane reporting UI-suite failures should re-run serially before
> filing.

### Compile-forcing devices — probe-verified, not assumed

I temporarily patched each declaration, ran a full `tsc`, and restored. Every one errors as
documented:

| Device | Probe | Result |
|---|---|---|
| `BRIDGE_PANE_IDS` / `StubPaneId` partition (§83b) | added `'about'` to `BRIDGE_PANE_IDS`, removed it from `SETTINGS_PANES` | `DemoExperience.tsx(2754,36): TS2345 — Type '"about"' is not assignable to type 'StubPaneId'` — **the bridge is genuinely forced to branch.** The two `id === …` checks in `renderPane` are what narrow `SettingsCategoryId` to `StubPaneId`; a missing branch is a build break, exactly as `panes/index.tsx:66-72` claims. |
| `SETTINGS_PANES: Record<StubPaneId, …>` | added `'probe-pane'` to `SETTINGS_CATEGORY_IDS` | `panes/index.tsx(55,14): TS2741` **plus** `settings-values.ts(284,26): TS2345 … not assignable to 'never'` (the `assertNever` arm). A new catalog id costs a pane *and* a preview. |
| `ALWAYS_ON_FIELDS` ← `FINAL_SUBMISSION_MESSAGES` | added a 4th rule key | `form-customization.test.ts(136,11): TS2741 — Property 'probeRule' is missing … in 'Record<"address" \| "scopes" \| "occNumber" \| "probeRule", readonly FormFieldId[]>'`. The total `coveredBy` Record is a **real** compile gate — `tsconfig.json`'s `include` is `**/*.ts(x)`, so test files are in the program. A new completion rule cannot land without someone deciding whether its field locks on. |
| v7 snapshot devices 1 + 2 on `userProfile` | added a required member to `UserProfile` | `persistence.ts(341,7): TS2322` (device 1, the `z.ZodType<UserProfile>` annotation) **and** `persistence.ts(349,3): TS1360 … does not satisfy 'FullShape<UserProfile>'` (device 2). Both fire independently. |

Restored afterwards; `git status --short` shows no tracked modifications and `tsc` is clean again.

### One-v7 unification — guard integrity

- Three devices survive the union intact. `profile: z.enum(PROFILES)` still consumes the domain's
  own `as const` tuple (device 3 — the only one that closes a union *widening*, which is exactly
  what `'limited'` is). `userProfileSchema` carries `satisfies FullShape<UserProfile>`;
  `formOverridesSchema` carries `satisfies FullShapeIn<FormOverrides>`; `persistedStateSchema`
  names both new keys under `satisfies FullShapeIn<PersistedState>`. `SNAPSHOT_VERSION` and
  `SNAPSHOT_KEY` move together in one edit.
- `snapshotOf` writes both new keys (`persistence.ts:436-450`); `loadSnapshot` returns both
  (`:559-571`).
- **Filtered-on-load for `formOverrides` is real** (`persistence.ts:518-525`): both maps are
  rebuilt through `isKnownFormStep` / `isKnownFormField` from `Object.entries`, so an unknown id
  from another build is dropped rather than wiping the tab. Pinned at runtime by
  `persistence.test.ts` ("drops override keys this build does not know instead of wiping the tab",
  and the non-boolean → `null` discard).
- **Two guard layers are genuinely distinct and both true no-ops.** Read side:
  `resolveStepVisible` returns `true` for a must-stay step before consulting overrides, and
  `resolveFieldVisible` returns `true` for an always-on field before consulting anything
  (`form-visibility.ts:54-58, 65-76`). Write side: `setFormStepVisible` / `setFormFieldVisible`
  `return` **before any `set()` call** (`create-store.ts:518-521, 553-556`), so no subscriber is
  notified, no new object is allocated, and the debounced snapshot write is not triggered — a real
  no-op, not a write the resolver then ignores. State identity is pinned by
  `DemoExperience.form-customization.test.tsx` ("re-picking the active profile does nothing at
  all": `expect(store.getState()).toBe(before)`).

### The no-allocation subscription invariant (P7.3 invariant 1)

- `DemoState satisfies FormVisibility` structurally: `selectors.ts` and `DemoExperience` pass the
  raw store state to `resolveStepVisible` / `resolveFieldVisible` / `selectDrawerStatus`, and
  those calls typecheck. The invariant is enforced by every call site, so a rename of
  `DemoState.formOverrides` or `.profile` is a compile error in `selectors.ts` — no explicit
  `satisfies` pin is needed and none is missing.
- **No subscription site allocates.** All 13 `useStore` selectors in `DemoExperience.tsx:435-453`
  are plain field reads (`(s) => s.profile`, `(s) => s.formOverrides`, `(s) => s.userProfile`).
  The three new object-returning derivations (`selectDrawerStatus`, `selectMediaToolsVisible`,
  `selectDrawerItems`) are called at **render scope** on `store.getState()`, never inside a
  `useStore` selector — so the `useSyncExternalStore` infinite-loop trap is avoided by
  construction. `isFormStepVisible` / `isFormFieldVisible` are `useCallback`s that read
  `getState()` and list `[store, profile, formOverrides]` as deps, which is correct.

### Autofill deps contract (P7.2)

`DemoExperience.tsx:1015-1023`. Verified all three documented properties hold against the code:
`view !== 'completion'` early-return + `[store, view, currentLocationId]` deps gives once-per-arrival;
`if (… location.form.completedBy) return` protects a typed or cleared value; omitting `userProfile`
from the deps is what stops a later profile edit rewriting a finished location. This is the
documented contract and I am **not** flagging the deps. (There is a leftover untracked probe file
in the worktree that exercises exactly these two properties — see Observations.)

### Security / async / errors

- **No XSS.** The new `COMPLETION INFORMATION` section (`pdf/case-notes.ts:287-297`) routes both
  visitor-typed values through `row()`, which escapes label *and* value via `escapeHtml`
  (`case-notes.ts:138-143`). The `hasCompletionInfo` gate is honest: `formatDocDate` answers
  `'N/A'` for a falsy input, so the date is formatted only when present, otherwise `row()`'s own
  empty-value drop fires.
- No new `async` work, no new `JSON.parse`, no new `catch`, no new timers, no new
  `dangerouslySetInnerHTML`. Nothing for the stale-async generation-token rule to apply to.
- Determinism seam preserved: `computeCareerDuration(start, now: () => Date)` takes an injected
  clock; `UserProfileModal` reads `clock.now()` once through a lazy `useState` initialiser
  (`:91`); `AboutPane` does the same for the copyright year. No `Date.now()` / `Math.random()` in
  ids, keys, or render scope.
- `'use client'` present on every new file that exports a component or uses hooks. The two new
  pure helpers that omit it (`settingsData.ts`, `pane-props.ts`) inherit the boundary from their
  importers — the established pattern.

---

## Findings

### [MEDIUM] The `explore` memo's dep list no longer covers its inputs — the rail keeps a screen the visitor just switched off

**File:** `features/demo/ui/DemoExperience.tsx:624-632` (memo) · `features/demo/engine/store/selectors.ts:46` (the new input)

**Issue.** P7.3 widened `selectExploreStatus`'s input set: it now reads `state.profile` and
`state.formOverrides` through `resolveStepVisible(item.id, state)`. The memo that calls it was not
updated — deps are still `[store, visited, view, modal]`, and its comment still asserts *"all three
are selectExploreStatus inputs"*, which is now false. A visibility change therefore does not
recompute the manifest, even though the bridge re-renders (`formOverrides` is subscribed).

**Evidence — reproduced.** Probe test rendered `DemoExperience`, opened Settings → Form Fields,
and clicked the Cameras screen switch:

```
AFTER TOGGLE, sheet OPEN  → cameras row present: true  | counter: 2/21 explored
AFTER CLOSE               → cameras row present: false | counter: 2/20 explored
```

`store.getState().formOverrides.steps.cameras === false` at the first line. The visitor is looking
at the pane where they just removed Cameras while the rail beside the phone still lists a
"Cameras" row and reports a denominator of 21 instead of 20. It self-heals only because closing
the sheet flips `modal`, which happens to be in the dep list.

The two `useCallback`s twelve lines below (`isFormStepVisible`, `isFormFieldVisible`) list
`[store, profile, formOverrides]` for exactly this reason — the correct pattern is already in the
file; this one memo predates P7.3 and was missed.

Note the existing test named *"drops the hidden screen from the drawer **and from the rail
checklist**"* (`DemoExperience.form-customization.test.tsx:154-161`) seeds `applyFormProfile`
*before* render and asserts only the drawer, so it never exercises this path.

**Fix.** Add the two inputs to the dep list and correct the comment:

```ts
const explore = useMemo(
  () => selectExploreStatus(store.getState()),
  // eslint-disable-next-line react-hooks/exhaustive-deps -- visited/view/modal/profile/formOverrides ARE the selector's inputs, read through getState
  [store, visited, view, modal, profile, formOverrides],
)
```

(`profile` and `formOverrides` are already declared above at `:447` and `:450`.)

---

### [MEDIUM] Hiding `dvr.firstRecordedDate` leaves the Retention card telling the visitor to use a control that is no longer there

**File:** `features/demo/ui/screens/DvrInfoScreen.tsx:229` (`showRetention`) · `:206-210` (the empty state)

**Issue.** `showRetention = show.firstRecordedDate || show.totalDvrRetention || show.daysUntilOverwritten`.
When `retention.totalRetention == null`, the card renders its empty-state line unconditionally:

```tsx
) : (
  <div style={{ … }}>
    Pick the first recorded date to calculate total retention and per-scope overwrite countdowns.
  </div>
)}
```

But that line is *advice about a control* — and the control it names is gated on
`show.firstRecordedDate` (`:296-303`). Hide `dvr.firstRecordedDate` while leaving
`dvr.totalDvrRetention` (or `dvr.daysUntilOverwritten`) on, and the DVR screen renders a
"Retention" card whose entire body instructs the visitor to pick a date with no date input
anywhere on the screen.

**Concrete path (3 clicks from the pane, no seeding):** the three ids are independent (no `group`),
all three are lock-free, and `dvrInfo` is `field-capable`, so all thirteen render as switches.
Settings → Form Fields → expand *DVR Information* → toggle *First Recorded Date* off → Continue to
the DVR screen on a location with no `firstRecordedDate` stored.

**Evidence.** This is the same defect class §82e was written to prevent one level up ("a titled
card with an empty body reads as a rendering bug"). The screen-level cascade does not cover it:
`setFormFieldVisible`'s auto-hide only fires when the step's **last** visible field goes, and
twelve other DVR fields are still on.

**Fix.** Gate the empty state on the control it points at:

```tsx
) : show.firstRecordedDate ? (
  <div style={{ … }}>Pick the first recorded date to …</div>
) : null}
```

Sibling sweep: I checked the other five gated screens for the same shape — `SubmissionScreen`
(requester card gated, Location Information keeps the always-on address components),
`ExportInfoScreen` (all-off is unreachable: the cascade hides the screen first),
`CompletionScreen` (card gated on either entry), `CamerasScreen`, `RequestedScopeScreen`
(start/end always-on). This is the only instance.

---

### [MEDIUM] Eight unchecked `as` casts narrow `string` into closed unions, while the seven `as const` tuples that would close the hole are exported and unconsumed

**Files:**
`features/demo/ui/screens/settings/panes/MediaCapturePane.tsx:86, 97, 108` ·
`LocationPane.tsx:57, 65` · `TimeSyncPane.tsx:47` · `ExportSecurityPane.tsx:88, 101`
Tuples: `features/demo/engine/content/settings-values.ts:44, 48, 52, 56, 60, 64, 68`

**Issue.** `PickerOption.value` is `string`, and the option lists are typed
`readonly PickerOption[]` — so there is no compile-time link between what
`VIDEO_QUALITY_OPTIONS` contains and what `VideoQualityOption` admits. Every settings picker
closes the gap with a bare assertion:

```tsx
onChange={(v) => onChange({ videoQuality: v as VideoQualityOption })}
onChange={(v) => onChange({ maxVideoDuration: Number(v) as MaxVideoDurationOption })}
onChange={(v) => onChange({ gpsTimeout: Number(v) as GpsTimeoutOption })}
```

A typo'd or added option value (`'1080P'`, a new `'4320p'` row) lands in `DemoSettings` as a value
its own union forbids, unchecked; `Number(v)` additionally admits any numeric string. Blast radius
is bounded — these values are cosmetic by D6, unpersisted, and read only by `settingsPreview` —
but the failure is silent, and `settingsPreview`'s `VIDEO_QUALITY_SHORT[s.videoQuality]` /
`NTP_REGION_SHORT[s.ntpRegion]` lookups would then answer `undefined` for the master row.

**What makes this worth a finding rather than a nit:** the fix is already written and unused.
`VIDEO_QUALITY_VALUES`, `VIDEO_CODEC_VALUES`, `MAX_DURATION_VALUES`, `GPS_TIMEOUT_VALUES`,
`NTP_REGION_VALUES`, `PROMPT_MODE_VALUES` and `ENCRYPTION_STRENGTH_VALUES` are all declared
`as const`, all exported, and — verified by grep across `features/`, `app/`, `lib/`,
`components/`, tests included — **have zero consumers** beyond the `(typeof X)[number]` line
directly beneath each. They are seven dead exports that exist precisely to be consumed. That is
the reverse of the policy this same PR documents at `persistence.ts:136-140`: *"NEW closed unions
MUST be declared as `as const` tuples … and consumed here via `z.enum(TUPLE)`, never re-typed by
hand."* The file is also inconsistent with itself — `VIDEO_QUALITY_SHORT: Record<VideoQualityOption, string>`
and `NTP_REGION_SHORT: Record<NtpRegion, string>` twenty lines up *are* total Records over their
unions.

The exact-value `toEqual` assertions in `settings-values.test.ts:94-147` are the only thing
guarding the option lists today, and they do not help: a developer changing an option value edits
the test literal in the same pass, and the `as` cast then admits the new value silently.

**Fix (either shape closes it).**

1. Type the lists off the tuples and drop the casts:
   ```ts
   interface TypedOption<T extends string> { label: string; value: T }
   export const VIDEO_QUALITY_OPTIONS: readonly TypedOption<VideoQualityOption>[] = [ … ]
   ```
   with a `Dropdown`/`SelectField` generic or a small `narrow(TUPLE, v)` guard at the handler.
2. Or build each list from a total `Record<Union, string>` label map — the device
   `VIDEO_QUALITY_SHORT` and `GLYPHS` already use — so a union member without a label is a compile
   error and the values come from the union by construction.

**Related, same file family (fold into the same fix round):**
`ExportSecurityPane.tsx:21-29` declares `STRENGTH_TESTIDS` / `PROMPT_TESTIDS` as
`Record<string, string>` where `Record<ZipEncryptionStrength, string>` / `Record<ZipPromptMode, string>`
would be exhaustive-by-construction; today a drifted value silently yields
`data-testid={undefined}` and drops the phone's shared test selector. See also the LOW below.

*(Not flagged: `selectors.ts:135` `step.id as WizardScreenId` — that cast is documented, unavoidable
given `FormStepDef.id: FormStepId`, and pinned at runtime by the drawer-registry equality test.)*

---

### [MEDIUM] The Settings rail narration ships two counts that this PR's own registries contradict

**File:** `features/demo/engine/content/narration.ts:293`

```
'Eleven categories behind the gear: … and which of the 57 form fields you actually want to fill in.'
```

Both numbers are wrong for what the demo renders:

- **"Eleven categories"** — `SETTINGS_CATEGORIES` (`settings-catalog.ts:101-117`) has **ten**
  entries. Eleven is the *phone's* count; the eleventh is Developer, which §80a records as
  permanently out ("There is no `devOnly` member on this type at all"). `settings-catalog.ts:46`
  says "The ten categories the demo builds" in the very file this line describes.
- **"57 form fields"** — `FORM_FIELDS` holds **58** ids (pinned:
  `form-customization.test.ts` "holds the phone inventory: 58 unique ids"), of which **50** render
  as switches. §82a states this explicitly and calls 57 "an estimate made before the registry was
  read". The narration is the last place in the tree still carrying the estimate — it was written
  in P7.1, before P7.3 counted, and the merge did not sweep it.

**Failure mode.** The rail is the demo's narration voice and it sits permanently beside the phone;
a visitor who counts the ten rows in front of them reads a claim the surface disproves. That is the
one thing D6's honesty ruling exists to prevent, and it is the same class of drift §82d added a
*derived* reduction line to avoid inside the pane. No test pins this string.

**Fix.** `'Ten categories behind the gear: … and which of the 50 form fields you actually want to
fill in.'` — or, better, drop the field count from the copy entirely and let the pane's derived
line carry it, since the pane already computes from `PROFILE_DEFAULTS` and cannot drift.

---

### [LOW] `Record<string, string>` testid maps where the file's own idiom is a total Record

**File:** `features/demo/ui/screens/settings/panes/ExportSecurityPane.tsx:21-29`

Both maps are keyed by a closed union's values but typed `Record<string, string>`, so a drifted
option value compiles and yields `data-testid={undefined}` — the phone's shared selector silently
disappears from the DOM rather than failing a build. Everything else in this PR that maps over a
closed set uses the total form (`GLYPHS: Record<SettingsIconId, ReactNode>`,
`STEP_CLASSIFICATION: Record<FormStepId, …>`, `PROFILE_LABELS: Record<Profile, string>`,
`MODAL_IDS: Record<ModalId, true>`). One-line change each; listed separately from the MEDIUM above
because the impact is test-selector-only.

---

## Deliberate choices re-verified, NOT flagged

Checked against the code rather than taken on trust; all hold:

- **Dark Mode inert** — `Toggle`'s new `disabled` prop is `aria-disabled` + an inert `activate`,
  never the `disabled` attribute, so the control stays focusable (the house rule). `_shared.tsx:434-460`.
- **`agencyLogoUri` absent from the type** — confirmed by the `FullShape<UserProfile>` probe: adding
  it would cost a snapshot-shape key, a default and a `trimProfile` branch.
- **`reset()` preserves `userProfile`** — `create-store.ts:512`, pinned both ways.
- **Autofill deps `[store, view, currentLocationId]`** — see the contract section above.
- **No `resetProfile()` / no Reset on Form Fields / no PasswordModal / no Developer pane** — all
  absences, all documented, none re-flagged.
- **Section cards collapse when emptied (§82e)** — deliberate; my Retention finding is the *empty
  state that survives the collapse*, a different case.
- **58 ids / 50 switches** — the registry count is correct; only the narration copy is stale.
- **§81d Escape residual** — routed to the §80g keyboard pass; not re-filed. I did verify the
  z-index stack is coherent: `ModalShell elevation={4}` puts the profile editor at 25/26, above the
  Settings sheet's 21/22 and below `PickerSheet`'s 31/32, so the `DateField` calendars inside the
  editor still land on top (`_shared.tsx:58-68`, `PickerSheet.tsx:38,50`, `DateField.tsx:82`).
- **`STORE_CONNECTED_PANE_IDS` dropped (§83b)** — confirmed absent from the tree; `BRIDGE_PANE_IDS`
  is the strictly richer device and its compile-forcing is real (probe above).

## Observations (not findings)

1. **Untracked probe file was sitting in the worktree mid-review:**
   `features/demo/ui/__tests__/zzprobe.test.tsx` (2 tests exercising the autofill deps contract),
   untracked and therefore not in the PR diff — but it *is* collected by a `pnpm test` run in this
   worktree, which would skew a "259 files / 3365 tests" reconciliation. It was removed by another
   agent before I finished; recorded so it does not come back, and so anyone whose full-suite count
   was off by one or two knows why.
2. **Asymmetric v6-discard pin (test lane):** `persistence.test.ts` pins the P7.3 half
   (`delete parsed.state.formOverrides` → `loadSnapshot` returns `null`) but has no symmetric
   `delete parsed.state.userProfile` case. Runtime behaviour is identical (same schema mechanism),
   so this is a coverage gap rather than a defect.
3. **`reset()` has no production caller** (only `store.test.ts` and `user-profile-state.test.ts`;
   `app/demo/error.tsx` reaches only `clearDemoSnapshot`). Worth noting because `reset()` preserves
   `userProfile` (§81c) but *not* `formOverrides`/`profile` — two Settings-owned, non-case values
   with different reset semantics, decided on two branches and not reconciled at the merge. No
   user-visible effect today; re-decide if a "Start over" control ever ships.
4. `DEFAULT_SETTINGS` is `Object.freeze`d but typed `DemoSettings` (mutable members), so a direct
   assignment would compile and throw at runtime. No such write exists; `patchSettings` is
   copy-on-write. Noted only so nobody adds one.

---

## TypeScript Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 4 |
| LOW | 1 |

Store-bridge integrity: **preserved** (0 `useStore` outside `DemoExperience.tsx`; all 13 selectors allocation-free)
Engine purity: **preserved** (0 React imports, 0 `'use client'`, 0 module-scope browser globals under `engine/`)
Barrel + marketing/demo isolation: **preserved** (`features/demo/index.ts` unchanged; 0 demo imports in `components/`/`lib/`/`app/(default)/`)
Determinism seam: **preserved** (career duration takes an injected clock; both new "now" reads are lazy-`useState` at mount)
Snapshot guard (v7): **intact** — all three devices probe-verified across the union; `formOverrides` filtered on load

**Verdict: APPROVE with comments.**
Notes: the only reproduced wrong render is the stale rail manifest (fix is one dep list); the
Retention dead-end is three clicks from the pane; the `as`-cast cluster's own fix is already in the
file, unconsumed.

---

# Fix-delta r1

**Head:** `feat/parity-p7` @ `2f57ba1` (four fix branches merged) · **Base for the delta:** `1505c00`
**Probe worktree:** `scratchpad/worktrees/p7-lane-ts-delta` (registered in `git worktree list`, detached at `2f57ba1`, `node_modules` symlinked from the shared worktree). All probe edits reverted; `git status` clean, cold `tsc` re-verified clean afterwards.

**Result: 4/4 MEDIUM FIXED · 1/1 LOW FIXED · 2/2 judged sound · 1 NEW MEDIUM.**

Applying §84a's round lesson — *when a comment cites a precedent, open the precedent* — I probed every claimed compile-time guarantee rather than reading the comment that asserts it. Five of six hold under probe. One does not, and it is a fix-round commit whose message and ledger entry both state the guarantee it did not deliver.

## Gates (re-run in the probe worktree)

| Gate | Result |
|---|---|
| **COLD `tsc --noEmit`** (fresh worktree, no `.tsbuildinfo`) | **clean**, exit 0, 14.7 s |
| Engine targeted suites (27 files: content, form-visibility, user-profile, store, barrel) | 407 passed |
| UI targeted suites (117 files: bridge, settings, screens, controls, inputs) | 1485 passed |
| `useStore` outside `DemoExperience.tsx` | 0 — bridge intact |
| React / `'use client'` under `engine/` | 0 — engine pure |
| `selectDrawerStatus` production call sites | 2/2 correct (`DemoExperience:835` → visibility; `selectLocationMapStatus:323` → `COUNT_ALL_FIELDS`) |
| New `any` / `as any` / `@ts-ignore` / `console.log` in the delta | 0 (the one `@ts-expect-error` is R-25's build-failing pin on `Readonly<UserProfile>` — it does real work, since a cold clean `tsc` means the error it expects is actually produced) |

---

## My r1 findings — dispositions

### MED-1 · explore memo deps → **FIXED** (R-4, `111b4d8`) — re-probed

Deps are now `[store, visited, view, modal, profile, formOverrides]` and the comment was rewritten to name all five inputs. Re-ran my r1 probe verbatim against `2f57ba1`:

```
BEFORE                    → cameras row: true  | counter: 1/21 explored
AFTER TOGGLE, sheet OPEN  → cameras row: false | counter: 2/20 explored     ← was `true | 2/21`
AFTER CLOSE               → cameras row: false | counter: 2/20 explored
```

The rail now drops the row and corrects the denominator on the toggle itself, beside the pane that removed it. `DemoExperience.form-customization.test.tsx` gained a test that toggles *after* render — the visitor's actual path, and the one all three pre-existing rail tests missed by seeding first.

### MED-2 · DVR Retention dead-end → **FIXED** (R-8, `db7a4ef`)

The placeholder branches on `show.firstRecordedDate` and, when the picker is hidden, says `'Turn First Recorded Date back on in Settings → Form Fields to calculate retention.'` — advice the visitor can act on instead of a control that is not there. The new test renders both arms and asserts the picker's absence in the second (`queryByText(/^First Recorded Date$/)`), so the copy cannot drift back to naming it. My sibling sweep of the other five gated screens still finds no second instance.

### MED-3 · eight `as` casts + seven dead tuples → **FIXED** (R-11 `f2924cd`, with R-27 `059cd3e`) — probed

All eight casts are gone (`grep " as [A-Z]" features/demo/ui/screens/settings/` → 0 hits). The mechanism is stronger than the fix I proposed: `TypedOption<T>` types each list off its union, and `PaneSelect`/`PaneRadioGroup` became generic and narrow by **lookup**, not assertion —

```ts
onChange={(picked) => { const hit = options.find((o) => String(o.value) === picked); if (hit) onChange(hit.value) }}
```

so an unrecognised string is dropped rather than smuggled into the union. Probe (typo an option value in two lists):

```
settings-values.ts(164,31): TS2820 — Type '"1080P"' is not assignable to type '"720p" | "1080p" | "2160p"'. Did you mean '"1080p"'?
settings-values.ts(182,26): TS2322 — Type '1801' is not assignable to type '0 | 60 | 120 | 300 | 600 | 900 | 1800'
```

The seven tuples are no longer dead: `settings-values.test.ts:176-184` pins `values(X_OPTIONS) ≡ [...X_VALUES]` for each, so list and tuple are locked together in both directions. The commit also absorbed the stringify/re-parse round trip on the two numeric unions — `MAX_DURATION_OPTIONS`/`GPS_TIMEOUT_OPTIONS` now carry `number` values and `PaneSelect` stringifies once at the `Dropdown` boundary.

### MED-4 · narration counts → **FIXED** (R-5, `ea69431`) — both stale literals now test-forbidden

Both numbers are interpolated: `SETTINGS_CATEGORY_IDS.length` (through a `NUMBER_WORDS` map, so the prose still reads as prose) and a new `SWITCHABLE_FORM_FIELDS` export — the `field-capable` filter, which is 58 − 8 screen-only = **50**, and which `FormFieldsPane.test.tsx` was already re-deriving inline (§84e's dedup, taken).

Verified the forbidding is real, not just derivation: `content.test.ts` asserts `para` **contains** the derived values and `.not.toContain('Eleven categories')` / `.not.toContain('57 form fields')`. Cycle check on the two new content imports — `narration → settings-catalog` (imports nothing) and `narration → form-customization → {types, screens}` (neither imports narration): acyclic, and a cycle would have surfaced as `undefined.length` at module eval anyway.

### LOW · `Record<string, string>` testid maps → **FIXED** (folded into R-11's second half)

`STRENGTH_TESTIDS` / `PROMPT_TESTIDS` are now `Record<ZipEncryptionStrength, string>` / `Record<ZipPromptMode, string>`, and `PaneRadioGroup.testIdOf` is typed `(value: T) => string`.

---

## Judged (assigned, not my r1 findings)

### R-22 · `LinearFormStepDef` → **sound**, and it forces

The cast I *didn't* flag (`step.id as WizardScreenId`, which I explicitly left alone in r1 as documented + test-pinned) was deleted properly rather than re-annotated. Probe — type an additive tool into `LINEAR_FORM_STEPS`:

```
form-customization.ts(70,62):  TS2322 — Type '"mediaCapture"' is not assignable to type 'WizardScreenId'
form-customization.ts(70,135): TS2322 — Type 'true' is not assignable to type 'false'
```

Both halves of the narrowing (`id: WizardScreenId`, `additive?: false`) bite independently. The registry test correctly stopped asserting `additive !== true` — that comparison no longer typechecks as meaningful — and replaced it with a value assertion plus `LINEAR_FORM_STEPS.map(s => s.id) === [...WIZARD_SCREENS]`, which is the fact the narrowing rests on. Correct move: the guarantee went down a level instead of gaining another assertion.

### R-23 · required `FormVisibility | 'count-all'` → **arity trap closed**

Probe — call the selector with one argument:

```
selectors.ts(326,54): TS2554 — Expected 2 arguments, but got 1
```

`COUNT_ALL_FIELDS` is a `const` string literal, so `mode === COUNT_ALL_FIELDS` narrows the else-branch to `FormVisibility` with no cast. Both production call sites state their mode explicitly, and `drawer-status.test.ts` names it on both arms (its comment "neither is *the default* and neither is signalled by an omitted argument" is the finding restated correctly). No new trap introduced: the mode cannot be reached by an untyped string.

---

## NEW finding

### [MEDIUM] R-20's stated guarantee does not hold at the drawer — a third capture tool still reaches the grid and silently never reaches the accordion

**Files:** `features/demo/engine/store/selectors.ts:154-160` · `features/demo/ui/controls/WizardDrawer.tsx:334-344`
**Introduced by:** R-20 (`e7eb681`), recorded as closed in ledger §86c.

**The claim.** Three places assert the same thing:

- commit `e7eb681`: *"the record is total over the id space, so adding a tool breaks here **and at the drawer** until both are wired."*
- `selectors.ts`'s own doc comment: the identical sentence.
- §86c: *"a third additive tool would have compiled everywhere and silently never reached the accordion. Now `Readonly<Record<AdditiveFormStepId, boolean>>` built FROM the tuple and imported, not re-typed."*

**Probe — add a third id to `ADDITIVE_FORM_STEP_IDS`** (reusing the existing launchable `'ocr'` so the tuple's `satisfies readonly LaunchableId[]` still holds).

*Pass 1* (tuple only) — two errors, both in `content/form-customization.ts`: `STEP_CLASSIFICATION` and `ADDITIVE_STEP_LABELS`. Both are `Record<…>` literals that were **already total before R-20**.

*Pass 2* (both registries satisfied) — **zero non-test errors.** `selectMediaToolsVisible` compiles. `WizardDrawer` compiles. The new tool appears as a switchable row in the Form Fields grid, and has no accordion row: a switch that moves nothing — the same defect §82b filed against the phone.

**Why it doesn't force, at both ends:**

1. `selectMediaToolsVisible` ends in `Object.fromEntries(ADDITIVE_FORM_STEP_IDS.map(…)) as Record<AdditiveFormStepId, boolean>`. `fromEntries` returns `{[k: string]: boolean}`, so the assertion **claims** totality rather than proving it. Adding a key can never break this function — the cast absorbs it. (Contrast the device the rest of this PR uses: `MODAL_IDS`, `GLYPHS`, `STEP_CLASSIFICATION`, `ADDITIVE_STEP_LABELS` are total object *literals*, which is why pass 1 caught two of them.)
2. `WizardDrawer`'s `rows` is a hand-built array of two independent `...(mediaTools.mediaCapture ? [row] : [])` spreads. Reading two of three keys off a total `Record` is not an error in TypeScript — there is no unread-key check — so the drawer end has no gate at all.

R-20 did deliver a real improvement (the prop is now imported rather than re-declared, so `capture`/`audio` can no longer drift between selector and consumer). It is the *invariant* that is over-claimed — and it is the §84a shape the round lesson names, re-introduced by a fix commit rather than found in the original code.

**Fix.** Drop the cast by returning a total literal, and give the drawer the same device one level up:

```ts
// selectors.ts — no cast; a new AdditiveFormStepId is a compile error HERE
export function selectMediaToolsVisible(s: DemoState): Readonly<Record<AdditiveFormStepId, boolean>> {
  return {
    mediaCapture: resolveStepVisible('mediaCapture', s),
    audioRecording: resolveStepVisible('audioRecording', s),
  }
}
```

```tsx
// WizardDrawer.tsx — the row defs carry JSX, which is exactly why ADDITIVE_STEP_LABELS' own
// comment says they must live here. A total Record makes "wired at the drawer" a compile fact.
const TOOL_ROWS: Record<AdditiveFormStepId, (h: ToolHandlers) => MediaRow> = { mediaCapture: …, audioRecording: … }
rows={[...ADDITIVE_FORM_STEP_IDS.filter((id) => mediaTools[id]).map((id) => TOOL_ROWS[id](handlers)), LIBRARY_ROW]}
```

Either half alone closes one end; both together make the sentence in `selectors.ts` true.

---

## Observations (not findings)

1. **R-24 moved a guarantee sideways, not down.** `resolveStepVisible`/`resolveFieldVisible` lost their `?? false` fallbacks on the strength of `ProfileDefaults` being total — but `buildDefaults` swapped `{} as Record<…>` + a loop for `Object.fromEntries(…) as Record<…>`, which is the same assertion in different clothes (and the same shape as the R-20 cast above). Risk today is nil: `ALL_STEP_IDS`/`ALL_FIELD_IDS` are mapped straight off the registries, the import graph is acyclic, and `content.test.ts:91` pins per-key totality. Recorded only because the runtime net was removed while the proof stayed an assertion — if a cycle ever made those maps empty, the resolvers would now return `undefined` where they returned `false`, and `aria-checked={undefined}` drops the attribute rather than rendering `"false"`.
2. **R-5's negative pin will false-fail on a legitimate 11th category** — the copy would then correctly read "Eleven categories" and `.not.toContain('Eleven categories')` would redden. Harmless: `expect(SETTINGS_CATEGORY_IDS).toHaveLength(10)` fires first, so a human is forced to look at both lines together. Noted so it is read as a notice-me pin, not a bug.
3. **The narration's "50 form fields" is true as written** (50 rows render), though 7 of them render locked and §82a's "43 actually move" is the number a pedant would want. Derived and defensible — not re-flagged.
4. **My r1 Obs-2 landed** (§85e): `user-profile-state.test.ts:137` now pins the symmetric v7 discard (`delete state.userProfile`), plus a partial-member case at `:148`.
5. **My r1 Obs-3 was ruled and fixed** (§86b / R-13): `reset()` now preserves `userProfile`, `profile` and `formOverrides` as one family. The asymmetry I flagged is gone and the rule is stated once.
6. **My r1 Obs-1 is resolved** — the untracked `zzprobe.test.tsx` is no longer in the worktree.
7. **R-1b's visibility gate does not disturb the autofill deps contract I verified in r1.** The dep array is byte-identical (`[store, view, currentLocationId]`); the gate is a fill-time read. No stale-gate hole either: Settings is unreachable from a wizard screen (§82h), so the visitor cannot change `completion.completedBy`'s visibility without leaving Completion, and returning re-runs the effect.

---

## Fix-delta Summary

| | r1 | delta |
|---|---|---|
| CRITICAL | 0 | 0 |
| HIGH | 0 | 0 |
| MEDIUM | 4 | **1 new** (4 r1 fixed) |
| LOW | 1 | 0 (fixed) |

Store-bridge integrity: **preserved** · Engine purity: **preserved** · Barrel + marketing/demo isolation: **preserved** · Determinism seam: **preserved** · Snapshot guard (v7): **intact**

**Verdict: APPROVE with comments.** Every r1 finding is genuinely closed — four of the five by a stronger mechanism than the one I proposed. The one new item is a type-level guarantee that three separate texts state and the compiler does not enforce; it blocks nothing today (there are two additive tools and no third planned) and is ~10 lines from being true.

## FD-1 re-probe

**FIXED** at `362fd6f` (`6d8f976`). Third-tool probe re-run in `p7-lane-ts-delta` (baseline cold `tsc` clean first): appending `'ocr'` to `ADDITIVE_FORM_STEP_IDS` now errors `selectors.ts(164,3) TS2741` and `WizardDrawer.tsx(185,7) TS2741` — ×1 each, as the author reports — and both **persist at pass 2** once the two content registries are satisfied, which is precisely where the delta head gave zero; they are independent gates, not transitive. Selector is a total literal (cast + tuple import gone), drawer derives rows from a total `TOOL_ROWS: Record<AdditiveFormStepId, (h) => MediaRow>` over `ADDITIVE_FORM_STEP_IDS` with the ungated library row appended. Ledger honest: §86c's R-20 bullet is amended **in place** (overclaim and correction legible together, and it names the §84a shape), §86g records the whole item including the "zero in the two files the claim named" result — and volunteers that the three test fixtures' `mediaTools` literals were the only incidental gate, removable by an ordinary shared-factory refactor. §86c's R-24 bullet was scoped down to what it can prove (`content.test.ts`'s per-key pin, with the `?? false` arms named as the fallback if that pin weakens) rather than restated — which is the honest disposition of my fix-delta observation 1. Probe reverted; worktree clean, `tsc` clean.
