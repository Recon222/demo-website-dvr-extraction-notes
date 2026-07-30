# Parity P0 — Lane: tests

**Lane:** tests (`.claude/agents/test-analyzer.md`)
**Mode:** INITIAL (full review of the diff)
**Diff under review:** `git diff master...feat/parity-p0` (PR #29, phase P0)
**Refs read:** `.claude/agents/test-analyzer.md`, `features/demo/CLAUDE.md`, `vitest.config.mts`,
`vitest.setup.ts`, `docs/code-reviews/deferred.md` (§29–§31), every changed test file in full plus the
production modules they pair with (`engine/store/persistence.ts`, `engine/store/create-store.ts`,
`engine/store/helpers.ts`, `engine/store/selectors.ts`, `engine/content/form-options.ts`,
`engine/logic/import.ts`, `ui/DemoExperience.tsx`, `ui/chrome/DemoErrorBoundary.tsx`,
`ui/glass-tokens.ts`, `ui/inputs/Dropdown.tsx`, `ui/inputs/PickerSheet.tsx`, `ui/screens/_shared.tsx`,
`ui/screens/{DvrInfo,Cameras,ExportInfo,Cases,Completion}Screen.tsx`, `ui/screens/screenData.ts`,
`ui/screens/field-options.ts`), plus the phone source `app/(form)/cameras.tsx` for the custom-mode
parity claim.

## Gates run in this lane

| Gate | Result |
|---|---|
| `npx vitest run` | **118 files / 865 tests, all green**, 41.6s |
| `npx vitest run --coverage` | thresholds met — see below (one contention-only flake, TESTS-5) |
| `npx tsc --noEmit` | clean (exit 0) |
| Engine 80% gate on the new modules | `engine/store/persistence.ts` **100/100/100/100**; `engine/content/form-options.ts` **100/100/100/100**; `engine/store/helpers.ts` 100 L / 96.15 B; `engine/logic/import.ts` 100 L / 87.71 B; project total 98.36 L / 98.83 F / 88.71 B / 97.03 S |

Overall the test posture on this diff is **strong**. `persistence.test.ts` (323 lines) pins the
round-trip, every shape-guard rejection arm, both debounce edges, `flush`/`dispose`, the swallowed
quota throw and both kill-switch directions with an injected fake `StorageLike` and fake timers —
no ambient clock, no real `sessionStorage`. `option-parity.test.tsx` is a genuine anti-drift guard:
it opens the real dropdowns and compares *rendered* labels against the engine lists, so a screen that
hardcodes or forgets an option fails. `import-displayable.test.ts` throws 35 adversarial strings
(unicode, SQL/HTML injection, 500-char, null-indicators) at the enum normalizers with an injected
clock. The glass-token guard follows the established `readFileSync` structural idiom with an
exclusion for `__tests__` and the token module itself. Coverage-boundary discipline is right: the new
*logic* landed in `engine/` (gated), only presentation stayed in `ui/`.

Findings below are one MAJOR (a real, empirically reproduced order-dependence) and four MINORs.

---

## TESTS-1 [MAJOR] features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:13

**Claim.** The new boundary test file mounts `<DemoExperience />` **without** an injected store three
times and never clears `window.sessionStorage`. Because P0.4 wires real persistence onto the
non-injected path, each test's teardown flushes a snapshot that the *next* test rehydrates — the file
is order-dependent, and test 2 no longer boots on Cases as its own header comment claims.

**Evidence.**

- `features/demo/ui/DemoExperience.tsx:219-228` — for a non-injected store the component subscribes
  `persistDemoStore(store, sessionStorageOrNull())` and returns `handle.dispose()` from the effect
  cleanup; `engine/store/persistence.ts:396-399` makes `dispose()` **flush any pending debounced
  write**. RTL's `cleanup()` (`vitest.setup.ts:9-11`) unmounts after every test, so the click on the
  Dashboard tab in test 1 is written to storage at teardown.
- `features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:16-21` — the only hooks are the
  `console.error` spy/restore. No `sessionStorage.clear()`.
- The sibling file **does** have the hygiene, added in this same diff:
  `features/demo/ui/__tests__/DemoExperience.test.tsx:9-11`
  (`// jsdom shares one window per file, so clear between tests or state leaks across mounts`), as
  does `DemoExperience.persistence.test.tsx:11-12`. The boundary file was missed.
- **Empirically verified**, not reasoned: I ran the file under an out-of-repo vitest config with a
  probe setup that logs `sessionStorage['dvr-demo-state-v1'].state.view` at each test boundary
  (read-only; nothing in the repo was touched):

  ```
  [before] "a throwing screen shows the fallback…"          view=NO-SNAPSHOT
  [before] "Return to Cases recovers to the working Cases…" view=dashboard      ← leaked
  [before] "navigating to another view…"                    view=cases          ← leaked
  ```

  Running test 2 alone (`-t "Return to Cases recovers"`) gives `view=NO-SNAPSHOT`. So test 2 takes a
  *different code path* depending on whether its siblings ran.

**Why it matters.** With `view=dashboard` restored at mount, the mocked `DashboardScreen`
(`:7-11`) throws during the **initial** render — the boundary is already in its error state before
`fireEvent.click(… 'Dashboard')` at `:43` runs. The file's premise comment at `:6-7` ("booting on
Cases (which works) and tapping the Dashboard tab exercises the boundary through real navigation")
is false for that test, and `expect(screen.getByRole('alert'))` at `:44` passes for the wrong reason.
It is green today only by luck: had the leaked view been a wizard screen instead, `showTabs`
(`DemoExperience.tsx:552`) would be false, the `'Dashboard'` tab button would not exist, and the test
would fail with a confusing query error. The suite has no flaky baseline — this is exactly the
order-dependence that rots a deterministic suite.

**Suggested fix.** One line, matching the sibling files:

```ts
describe('DemoExperience — error boundary wiring', () => {
  beforeEach(() => {
    window.sessionStorage.clear()          // ← add (these mount the REAL store; P0.4 persists it)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
```

Optionally also `afterEach(() => window.sessionStorage.clear())` as in
`DemoExperience.persistence.test.tsx:12`. After the fix, re-confirm test 2 still passes — it should,
since it will then genuinely boot on Cases and navigate.

**Confidence.** High — reproduced with instrumentation, both in-file and isolated.

---

## TESTS-2 [MINOR] features/demo/engine/logic/__tests__/import-displayable.test.ts:36

**Claim.** The `FORM_OPTIONS is a values-only view of the canonical lists` block is a
self-comparison over a constant that **no production code reads**, so it cannot fail for the
regression its name and comments advertise ("an import can never emit an enum value the UI can't
display").

**Evidence.**

- `features/demo/engine/logic/import.ts:214-220` now defines
  `FORM_OPTIONS = { exportMedia: optionValues(EXPORT_MEDIA_OPTIONS), … }`.
- `import-displayable.test.ts:38-42` asserts `expect(FORM_OPTIONS.exportMedia).toEqual(optionValues(EXPORT_MEDIA_OPTIONS))`
  — i.e. `optionValues(X)` vs `optionValues(X)`, for all five keys.
- `grep -rn "FORM_OPTIONS" features app lib components` returns only: the declaration, the engine
  barrel re-export (`engine/index.ts`), this test, and two comments. **Zero production consumers** —
  neither `mapAiToForm` nor `import-normalize.ts` validates against it.
- The module docstring at `engine/content/form-options.ts:17-20` ("the import pipeline's
  `FORM_OPTIONS` … consume THIS module, so … an import can never write an enum value no dropdown can
  display") therefore overstates what is enforced.

**Why it matters.** Low blast radius — the *real* displayability guarantee is pinned two describes
down (`import-displayable.test.ts:81-94`: the import patch touches none of the dropdown-enum fields),
and that test is meaningful. But this block reads as coverage of the G5 anti-drift contract when it
only guards against a hypothetical future re-hardcoding of `FORM_OPTIONS` with *different* values.

**Suggested fix.** Either (a) delete `FORM_OPTIONS` and this describe — it is dead code, and
`field-options.test.ts`'s by-reference re-export check plus `option-parity.test.tsx`'s rendered-list
check already cover the drift; or (b) keep it and retitle to what it actually pins
(`FORM_OPTIONS is derived, not re-hardcoded`), and soften the `form-options.ts:17-20` docstring so it
does not claim import-time validation that does not exist.

**Confidence.** High on the facts (grep + read); the "which fix" call is the orchestrator's.

---

## TESTS-3 [MINOR] features/demo/ui/DemoExperience.tsx:219

**Claim.** The load-bearing "injected stores are deliberately **not** persisted" contract — the thing
that keeps ~50 existing component tests hermetic now that P0.4 exists — has no test.

**Evidence.**

- Two guards implement it: `DemoExperience.tsx:156-165` (an injected store skips `loadSnapshot`
  entirely) and `DemoExperience.tsx:219-221` (`if (injectedStore) return` before
  `persistDemoStore(…)`), documented at `:216-218`.
- No test asserts either. `DemoExperience.persistence.test.tsx:20-42` only exercises the
  *non*-injected path; the injected-store files (`sandbox`, `map`, `coordinates` — 46 renders) assume
  the guard rather than pin it.

**Why it matters.** If either guard were dropped, every injected-store component test would start
writing to (and rehydrating from) the shared per-file jsdom `sessionStorage`, converting the whole
component suite into the order-dependent state TESTS-1 describes — with failures surfacing far from
the edit that caused them.

**Suggested fix.** Two cheap cases in `DemoExperience.persistence.test.tsx`:

```ts
it('an injected store is NOT persisted (the test seam stays hermetic)', () => {
  const store = createDemoStore()
  render(<DemoExperience store={store} />)
  act(() => { store.getState().createCase(newCaseInput({ caseNumber: 'PR25-INJECTED' })) })
  fireEvent(window, new Event('pagehide'))
  expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull()
})

it('an injected store is NOT rehydrated over, even with a valid snapshot present', () => {
  // seed storage from a worked store, then render with a fresh injected store
  expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
})
```

**Confidence.** High.

---

## TESTS-4 [MINOR] features/demo/ui/DemoExperience.tsx:108

**Claim.** `sessionStorageOrNull()`'s `catch` arm — the only piece of the "persistence is best-effort,
boot is sacred" policy living **outside** the gated engine — is unreachable from any test, so the
one real-world trigger (a browser that throws on `window.sessionStorage` access) is unverified.

**Evidence.**

- `DemoExperience.tsx:107-114`:
  ```ts
  function sessionStorageOrNull(): StorageLike | null {
    try { return typeof window === 'undefined' ? null : window.sessionStorage }
    catch { return null }
  }
  ```
- The `null` *consumers* are well covered on the engine side (`persistence.test.ts:315-322`
  — `persistDemoStore(store, null)` and `loadSnapshot(null)`), and a throwing `getItem`/`removeItem`
  is covered at `persistence.test.ts:165-180`. But nothing makes the property **access itself** throw,
  which is the actual failure mode (Safari private browsing, storage-blocked embeds).
- The module lives in `ui/**`, which is excluded from `coverage.include` (`vitest.config.mts:31`), so
  the 80% gate cannot flag it either.

**Why it matters.** Small, but it is the boot-crash guard for a whole class of visitor. If the
`try/catch` were refactored away, every gated engine test would still pass and the demo would
white-screen for those users.

**Suggested fix.** One case in `DemoExperience.persistence.test.tsx`, restoring the descriptor in
`afterEach`:

```ts
it('a Storage-blocked browser boots empty instead of crashing', () => {
  const real = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('SecurityError') } })
  try {
    render(<DemoExperience />)
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  } finally { Object.defineProperty(window, 'sessionStorage', real) }
})
```

**Confidence.** High on the gap; medium on how much it is worth — it is a 4-line helper.

---

## TESTS-5 [MINOR] features/demo/ui/screens/__tests__/option-parity.test.tsx:123

**Claim.** `CamerasScreen`'s custom-mode flags are keyed by **row index**, and no test covers what
happens when a row is removed — the flags are never reindexed, so removing a camera transfers the
custom-mode state to whichever row slides into that index.

**Evidence.**

- `features/demo/ui/screens/CamerasScreen.tsx:24-25` —
  `useState<Record<number, boolean>>({})` for both `customResolutions` and `customFps`; read at
  `:61`, `:64`, `:67`, `:70` as `customResolutions[i]` / `customFps[i]`.
- `:56` — `onRemove(i)`; `DemoExperience.tsx:124` (`listEditHandlers.remove`) filters the array, so
  every row after `i` shifts down one index while the flag map keeps its old keys.
- The test file has the adjacent case — `option-parity.test.tsx:123-138` "custom mode is per-camera:
  only the toggled row shows the input" — but stops before removal.
- Concrete failure: cameras `[A, B]`; put **A** into custom Resolution mode (which clears A's stored
  value per `:29-30`); remove A. B is now index 0 and inherits `customResolutions[0] === true`, so
  B's standard `'1920x1080'` renders inside the free-text "Custom Resolution" field with the picker
  pill stuck on "Other (Custom)". Inverse case: put **B** (index 1) into custom mode, remove A — B
  loses custom mode and its free text ('12') falls back to the raw-value display path added in
  `Dropdown.tsx:38-39`, no longer editable as free text.

**Why it matters (and why only MINOR).** The demo is a *verbatim* lift of the phone here — I checked
`/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/app/(form)/cameras.tsx:36-61`
and it uses the identical index-keyed `Record<number, boolean>` maps with the identical clear-on-
switch semantics. So the demo is faithfully replicating phone behavior, and "fixing" it would be a
parity *divergence*. This is a note that the uncovered edge exists and that any future decision to
key by camera `id` needs a test to land with it — not a request to change P0 behavior.

**Suggested fix.** Either add a documenting test that pins today's (phone-matching) behavior —
`removing a row does not reindex custom mode (phone parity, cameras.tsx:36-61)` — or log it in
`docs/code-reviews/deferred.md` alongside §29–§31 as a known phone-inherited quirk so it is not
rediscovered as a bug later.

**Confidence.** High on the mechanics and on the phone parity (both files read).

---

## Not findings — checked and cleared

Recorded so the next pass does not re-litigate them.

- **Coverage-run timeout flake.** One `--coverage` run showed 3 timeouts at the default 5000ms
  (`DemoExperience.test.tsx:12`, `DemoExperience.map.test.tsx:26`,
  `DemoExperience.sandbox.test.tsx:57`); an immediate re-run was fully green (865/865) and the
  non-coverage run is green in 41s. Pre-existing CPU-contention fragility of the heavy
  full-experience renders under v8 instrumentation, not caused by this diff — the new boundary file
  already anticipates it with `{ timeout: 20000 }` (`DemoExperience.boundary.test.tsx:26,41,51`).
  Worth raising the two pre-existing files' timeouts opportunistically; not a merge blocker.
- **`launch-only view restores to currentChapter`** (`persistence.test.ts:192-201`) — traced by hand:
  `setView('timeOffset')` → `launch('ocr')` stores `view: 'ocr'`, and deleting the
  `LAUNCHABLE`-adjust at `persistence.ts:339` makes the test fail. It genuinely pins the branch.
- **`ids minted after rehydration never collide`** (`persistence.test.ts:102-116`) — with `maxIdSeq`
  broken to `0`, `createCase` mints `c1` which is in the `existing` set and the test fails. Real.
- **`field-options.ts` re-export identity test** (`field-options.test.ts:9-19`) — `export *` gives
  live bindings, so `toBe` identity holds and a locally redefined list fails. The two behavioral
  tests it replaced were moved verbatim to `form-options.test.ts:108-122`; no coverage was lost.
- **Glass-token structural guard** — `sourceFiles()` correctly excludes `__tests__` and
  `glass-tokens.ts`; `PickerSheet` really does dismiss on `document` `keydown` Escape
  (`PickerSheet.tsx:25-31`), so `option-parity.test.tsx:32`'s close-between-dropdowns works and the
  two sequential `renderedOptions()` calls cannot cross-contaminate. Substring matching would miss a
  whitespace-varied re-inline, but the banned strings are the exact ones that were replaced — the
  guard does what it says.
- **Glass substitution ordering.** I checked all 34 `...glass*` spread sites: none override
  `border` / `background` / `borderRadius` / `color` *after* the spread, so no shorthand/longhand
  ordering regression is possible. `CasesScreen.tsx:34,55` and `DashboardScreen` correctly use the
  individual `GLASS.*` tokens (radius 16) rather than `glassCard` (radius 12).
- **`DemoErrorBoundary` coverage** — children/fallback/three launch copies/non-Error normalization/
  `handleReturn` while `view` is unchanged (the `:98-100` comment's exact case)/view-change reset are
  all pinned. Only `error.message === ''` (the `:117` guard) is uncovered; not behaviorally
  meaningful.
- **Setup-shim traps** — no test in this diff claims a live camera/canvas path;
  `navigator.mediaDevices` stays undefined and the OCR tests are explicitly sample-path
  ("Use sample DVR clock"). No `matchMedia`/reduced-motion branch is asserted without an override.
- **Determinism** — no `Date.now()`/`Math.random()` in any new test. `persistence.test.ts:49-54` uses
  fake timers with a matching restore; `import-displayable.test.ts:18` injects a fixed `NOW`;
  `option-parity.test.tsx:19` uses the existing `stubClock()` helper with `restoreAllMocks`.
- **Factory usage** — `persistence.test.ts` uses `freshStore()`/`newCaseInput()`/`newLocationInput()`
  from `engine/store/__tests__/test-utils.ts`. The one large inline literal
  (`screenData.test.ts:78-118`, the fully-complete `LocationForm`) is built by spreading
  `blankLocationForm()` and there is no canonical "complete form" factory to reuse — acceptable.
- **Coverage-boundary gaming** — none. The new logic (`form-options.ts`, `persistence.ts`,
  `maxIdSeq`, `completeCase`) all landed in gated `engine/**`; `field-options.ts` moved logic *out*
  of `ui/`; what stayed in `ui/` is presentation (`glass-tokens.ts`, `locationStatusTheme`, the
  screens' custom-mode component state) and is behaviorally tested.
- **Deferred/deliberate items not re-flagged**, per `deferred.md` §29–§31 and the phase brief: the
  untestable `uiSeq` reseed, the unpersisted map viewer case, modal/drawer exclusion, the 250ms
  pagehide loss window, the `Select…` placeholder copy, near-miss style literals, the class
  `DemoErrorBoundary`, the Export-Info no-free-text decision, the DVR-keeps/Cameras-clears
  asymmetry, the dropped demo-only option values, and sessionStorage-over-localStorage.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 4 |

- **Behaviorally meaningful coverage:** strong
- **Engine coverage gate (80% on `lib/**` + `engine/**`):** met — new modules at 100% across all four metrics
- **Mock strategy:** at the IO edge (`run-import`, `geocode`); the store is injected, never mocked; the one component mock (`DashboardScreen`) is the standard way to induce a render throw
- **Factory usage:** canonical
- **Setup-shim traps:** none
- **Determinism (clock/entropy injected):** yes
- **New order-dependence:** one — TESTS-1

**Lane verdict: REVISE** — fix TESTS-1 (one line) before merge; TESTS-2/3/4/5 are opportunistic.
