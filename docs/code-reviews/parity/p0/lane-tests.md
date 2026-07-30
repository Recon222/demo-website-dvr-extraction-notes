# Parity P0 — Lane: tests (FIX-DELTA)

**Lane:** tests (`.claude/agents/test-analyzer.md`)
**Mode:** FIX-DELTA — re-review of the fix round on `feat/parity-p0` (PR #29)
**Fix commits under review:** everything after the review merge `165de2b`, i.e. the three fix
branches merged into `feat/parity-p0`:
`parity/p0-fix-boundary` (`e950de6`, `c78ee30`, `c0b3607`, `4b4f06c`, `5ee1672`, `02b6a6c`),
`parity/p0-fix-options` (`a0ec7f6`, `5c319e4`),
`parity/p0-fix-store` (`cf96bb5`, `65faab0`, `2f08830`, `cd6b539`, `c03b92b`, `a07470e`, `bb0f4a4`, `3967198`).
**Refs read:** `docs/code-reviews/parity/p0/p0-review.md` (full), my prior
`docs/code-reviews/parity/p0/lane-tests.md`, `.claude/agents/test-analyzer.md`,
`features/demo/CLAUDE.md`, `vitest.config.mts`, `vitest.setup.ts`, every test file touched by the
fix round in full plus the production modules they pair with (`engine/store/persistence.ts`,
`engine/store/create-store.ts`, `engine/store/selectors.ts`, `engine/types/index.ts`,
`engine/content/form-options.ts`, `engine/content/seed.ts`, `engine/logic/import.ts`,
`ui/DemoExperience.tsx`, `ui/chrome/DemoErrorBoundary.tsx`, `ui/inputs/Dropdown.tsx`,
`ui/screens/CamerasScreen.tsx`, `ui/screens/CompletionScreen.tsx`, `ui/screens/CasesScreen.tsx`,
`ui/screens/screenData.ts`, `ui/controls/WizardDrawer.tsx`, `ui/StoryRail.tsx`,
`ui/controls/ExploreChecklist.tsx`, `app/demo/error.tsx`).

## Gates run in this lane

| Gate | Result |
|---|---|
| `npx vitest run --silent` | **119 files / 890 tests, all green**, 48.4 s |
| `npx vitest run --coverage --silent` | **890/890 green** + thresholds met (97.11 S / 88.85 B / 98.85 F / 98.41 L). Note: the previous pass' coverage run had **3 timeouts** at the default 5 s; this one has none — R-6 is materially fixed |
| `npx tsc --noEmit` | clean (exit 0) |
| Engine 80 % gate on the new/changed modules | `engine/store/persistence.ts` 100 S / 98 B / 100 F / 100 L (only the `NODE_ENV!=='production'` false arm at `:454` uncovered); `engine/store/create-store.ts` 98.51 S / 90.84 B; `engine/store/selectors.ts` 96.25 S / 96.15 B; `engine/logic/import.ts` 100 L / 87.71 B (unchanged by the FORM_OPTIONS deletion) |

**Verification method.** Every fix-delta verdict below that says "probe-verified red" was checked by
copying the worktree to an out-of-repo scratch dir (`scratchpad/probe-p0`, `node_modules` symlinked),
reverting the production fix *there*, and re-running the suite. **Nothing in the repo under review
was modified.** The probe dir has been deleted.

---

# Fix-delta — prior findings

| Prior lane ID | Aggregated ID | Verdict | Evidence |
|---|---|---|---|
| TESTS-1 (MAJOR) | R-3 | **FIXED** | `e950de6` — clears + boot-premise assertions; probe-verified red |
| TESTS-2 (MINOR) | R-11 | **FIXED** | `a0ec7f6` — constant + self-comparison describe deleted; docstring softened |
| TESTS-3 (MINOR) | R-12 | **FIXED** | `a07470e` — both guards pinned; persist guard probe-verified red |
| TESTS-4 (MINOR) | R-13 | **FIXED** | `a07470e` — throwing-accessor test; probe-verified red |
| TESTS-5 (MINOR) | folded into R-2 | **FIXED** | `c78ee30` — id-keying + seeding + 3 new tests, all probe-verified red |
| (shared) tests-lane coverage-run observation | R-6 | **FIXED** | `bb0f4a4` + `c78ee30` — suite timeouts on all 6 heavy files; coverage run now 890/890 with zero timeouts |

## TESTS-1 → R-3 — **FIXED** (verified red/green)

`features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:20-27` now clears
`window.sessionStorage` in **both** `beforeEach` and `afterEach`, matching the two sibling suites,
and each test opens with an explicit boot-premise assertion (`:36`, `:52`, `:63` —
`expect(screen.getByText(/No cases yet/)).toBeInTheDocument()`).

The fix is load-bearing, not decorative — I re-ran the suite in the probe copy with both clears
commented out:

```
 × Return to Cases recovers to the working Cases screen
 × navigating to another view (tab bar survives the error) resets the boundary
   → DemoExperience.boundary.test.tsx:63  getByText(/No cases yet/)  (booted on the leaked dashboard)
 Tests  2 failed | 1 passed (3)
```

So the leak is still real and the new assertions catch it; with the clears in place all three tests
genuinely boot on Cases and navigate. The premise assertions are the better half of this fix — they
convert a silent wrong-path pass into a loud failure, which is exactly what the finding asked for.

## TESTS-2 → R-11 — **FIXED**

`a0ec7f6` took option (a): `FORM_OPTIONS` is gone from `features/demo/engine/logic/import.ts`
(tombstone at `:196-200` pointing future import work at `engine/content/form-options`), the
self-comparison `describe` is gone from
`features/demo/engine/logic/__tests__/import-displayable.test.ts`, and the overstated docstring at
`engine/content/form-options.ts:17-24` now names the tests that actually enforce each claim
(`field-options.test.ts` for the by-reference re-export, `option-parity.test.tsx` for the rendered
labels, `import-displayable.test.ts` for "the import patch writes no dropdown-enum fields").
`grep -rn FORM_OPTIONS features app lib components` returns only the tombstone comment (plus
historical planning docs, correctly left alone). The two real guarantees the finding endorsed are
untouched: the 35-string junk corpus against the enum normalizers with an injected clock, and the
patch-shape pin. `import.ts` branch coverage is unchanged at 87.71 %, so nothing was lost. R-17 is
mooted by the same commit.

## TESTS-3 → R-12 — **FIXED**

`features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:57` and `:68` pin both guards.

- The **persist** guard (`DemoExperience.tsx:224`, `if (injectedStore) return`) is genuinely pinned:
  removing it in the probe makes `:57` fail with
  `AssertionError: expected '{"version":2,"state":{"profile":"fore…' to be null`.
- The **rehydrate** guard (`DemoExperience.tsx:156-158`) is pinned at the observable level — a valid
  `PR25-SEEDED` snapshot on disk plus an injected store must render "No cases yet". That catches the
  realistic regression (the `if (injectedStore)` branch dropped so the snapshot store wins). It would
  *not* catch the narrower edit "call `loadSnapshot` anyway but still prefer the injected store" —
  correctly so: that variant has no observable effect (its only side effects are the `uiSeq` reseed
  and a `removeItem` on an already-invalid snapshot). No further test needed.

## TESTS-4 → R-13 — **FIXED**

`DemoExperience.persistence.test.tsx:81` shadows `window.sessionStorage` with a throwing accessor and
restores the original descriptor in `finally` (with a `Reflect.deleteProperty` fallback if the
property turns out to live on the prototype). Traced through production: the throwing access happens
inside `sessionStorageOrNull()` at `DemoExperience.tsx:110`, called during `DemoExperience`'s **own
render** (`:162`) — above `DemoErrorBoundary` — so with the `try/catch` removed the throw propagates
out of `render()` and fails the test rather than being swallowed by a boundary. Probe-verified:
deleting the `try/catch` makes `:81` fail. The descriptor swap is `finally`-restored even on that
failure path, so it cannot leak into sibling tests.

## TESTS-5 → R-2 — **FIXED** (behavior fixed *and* the uncovered edge covered)

`features/demo/ui/screens/CamerasScreen.tsx:28-33` now keys both maps by the stable
`CameraEntry.id`, uses functional updaters, and seeds from `isCustomResolution`/`isCustomFps`.
Three new tests at `option-parity.test.tsx:161`, `:176`, `:190` cover both desync directions plus the
seeding. Probe-verified: reverting `CamerasScreen` to the index-keyed `Record<number, boolean>`
implementation makes **all three** fail —

```
 × R-2: custom mode survives another camera's removal (the data-destroying direction)
 × R-2: removing the custom camera does not transfer custom mode to the survivor
 × R-2: stored free-text values seed custom mode on mount (matches DvrInfoScreen)
```

Also checked the seeding for the obvious own-goal: `isCustomResolution('')` returns `false`
(`engine/content/form-options.ts:96`, the PF-14 empty-string guard), so a blank camera does **not**
boot into custom mode. The `useState` lazy initializer runs once per mount, and cameras added later
correctly get no entry (falsy → standard mode). No regression found.

## R-6 (shared lane) — **FIXED**

`bb0f4a4` puts `{ timeout: 20000 }` on the describes of `DemoExperience.persistence.test.tsx:14`,
`DemoExperience.test.tsx:8`, `.map.test.tsx` (both describes), `.sandbox.test.tsx` (both describes)
and `.coordinates.test.tsx:24`; `c78ee30` covers `option-parity.test.tsx:21` via
`vi.setConfig({ testTimeout: 20_000 })`. I verified the mechanism rather than assuming it:
`@vitest/runner` merges suite options into each test
(`chunk-artifact.js:1805-1806`, `options = Object.assign({}, suiteOptions, options)`) and
`SuiteOptions extends TestOptions`, so a describe-level `timeout` really does propagate. The
practical evidence is stronger: the previous pass' `--coverage` run had 3 timeouts, this one is
890/890 clean.

---

# New findings (fix-introduced)

Three MINORs, all inside the fix commits' blast radius, all probe-verified. No BLOCKER, no MAJOR.

## TESTS-6 [MINOR] features/demo/ui/DemoExperience.tsx:323

**Claim.** The R-1 fix introduced `reviewAgain` — a bridge-local UI flag that suppresses a completed
location's confirmation card. It is location-scoped **only** by the one-line reset at `:323`
(`setReviewAgain(false)` inside `openLocation`). That reset has no test: deleting it leaves the
entire demo suite green.

**Evidence.**

- `DemoExperience.tsx:210` `const [reviewAgain, setReviewAgain] = useState(false)`; `:726`
  `isComplete={(currentLocation?.form.completed ?? false) && !reviewAgain}`; `:738`
  `onReviewAgain={() => setReviewAgain(true)}`. The flag is **not** keyed by location id.
- The only reset on a location change is `:323`, inside `openLocation` — the sole entry point for
  every location switch (`:564` Dashboard, `:572` Cases, `:747` Map, `:787` import result).
- Probe: with `:323` removed, `npx vitest run features/demo` → **90 files / 705 tests, all green.**
  Nothing pins it.
- Reachable repro (all ordinary demo flows): complete locations A and B → open A → Completion shows
  "Location Complete" → **Review / Export again** (`reviewAgain = true`) → open the wizard drawer →
  **Back to Cases** (`WizardDrawer.onBackToCases`) → tap location B → walk to Completion. B renders
  the *review form* with "Complete & Save" instead of its confirmation, i.e. the completed sibling
  under-reports its own state. It is the mild direction of the R-1 defect (under-claims rather than
  falsely claims complete), which is why this is MINOR — but it is the same class of bug
  (per-location truth carried in un-keyed bridge state) that R-1 exists to close.

**Suggested fix.** One case in `DemoExperience.sandbox.test.tsx`, beside the two existing R-1 tests:
complete two locations, click **Review / Export again** on the first, then open the second *through
the UI* (`fireEvent.click` on its Cases row — the `switchLocation` store action bypasses the reset)
and assert it still shows `Location Complete`. Alternatively make the state structural
(`reviewAgainFor: string | null` compared against `currentLocationId`), which removes the reset — and
the test gap — entirely.

**Confidence.** High — probe-verified green with the guard removed; every `switchLocation` call site
read.

## TESTS-7 [MINOR] features/demo/ui/DemoExperience.tsx:727

**Claim.** R-1's secondary fix — "`onComplete` silently no-ops when `currentCaseId` is null; disable
the button or surface why" — landed as `canComplete={!!currentLocation && !!currentCase}`. The
*presentational* half is pinned (`hardwareFinale.test.tsx:88-95`: `canComplete={false}` → disabled +
no callback), but the **bridge computation** has no test: hardcoding it to `true` leaves the whole
suite green, restoring exactly the silent no-op the finding asked to remove.

**Evidence.**

- `DemoExperience.tsx:727` `canComplete={!!currentLocation && !!currentCase}`; `:734-737`
  `onComplete` still guards with `if (id) …`, so a wrong `canComplete` degrades to the original
  silent no-op rather than a crash — no other signal.
- Probe: replacing `:727` with a bare `canComplete` (always true) → `npx vitest run features/demo app`
  → **99 files / 769 tests, all green.**
- The no-location Completion state is genuinely reachable in-session, not just via a tampered
  snapshot: the rail manifest rows are buttons wired straight to `setView`
  (`ExploreChecklist.tsx:70-73` → `StoryRail.tsx:62` → `DemoExperience.tsx:875`
  `onJump={(v) => store.getState().setView(v)}`), so a visitor with no location open can land on
  Completion. (R-15 only repairs this shape *on rehydrate*, not in-session.)

**Suggested fix.** One case in `DemoExperience.sandbox.test.tsx`: fresh store, no location,
`act(() => store.getState().setView('completion'))`, then
`expect(screen.getByRole('button', { name: 'Complete & Save' })).toBeDisabled()` and
`expect(store.getState().cases).toHaveLength(0)` after a click. Cheap, and it pins the reachable half
of R-1's secondary fix.

**Confidence.** High — probe-verified; the rail-jump path traced end to end.

## TESTS-8 [MINOR] features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:98

**Claim.** The R-1 commit loosened the G4 arc assertion from `getByText('Complete')` to
`getAllByText('Complete').length).toBeGreaterThan(0)`. The loosening was **not** required — the
strict form still passes on the current code — and the loose form is weak enough to survive the very
G3/G4 contradiction the same commit set out to resolve.

**Evidence.**

- `DemoExperience.sandbox.test.tsx:98`, inside the test named *"Complete & Save marks the case
  complete in the STORE (G4) and the arc pays off green"*.
- Probe: restoring `expect(screen.getByText('Complete')).toBeInTheDocument()` and running
  `-t "the arc pays off green"` → **1 passed**. There is exactly one exact-match "Complete" on
  screen: `setupLocation` drives the store directly, so `expandedCaseId` stays `null` and
  `CasesScreen.tsx:52-66` never renders the location rows — only the case badge
  (`screenData.ts:17`) matches.
- Why it matters: `.length > 0` cannot distinguish the case badge from the location row. If the
  location-row status regressed to "Working" — the exact G3/G4 contradiction R-1's
  `selectLocationMapStatus` change fixed (`selectors.ts:196`) — this assertion and the neighbouring
  `queryByText('Draft')` check would both still pass.

**Suggested fix.** Either restore `getByText('Complete')` (verified to pass), or — better, since the
location row is the *other* half of the payoff — expand the card first
(`fireEvent.click(screen.getByText('PR25-TEST'))`) and assert both:
`expect(screen.getAllByText('Complete')).toHaveLength(2)`. The engine-level short-circuit is already
pinned at `selectors.test.ts:96-103`; this is about the rendered arc.

**Confidence.** High — the "still passes" claim is probe-verified, not reasoned.

---

## Checked and cleared (fix-round regression sweep)

Recorded so the next pass doesn't re-litigate them.

- **New runtime pins are genuinely red.** Probe-reverted each production fix and confirmed the paired
  test fails: R-4b maximal round-trip (dropped `mediaItemSchema.poster` → `persistence.test.ts:130`
  fails), R-7 own-property guard (`in` restored → `:275` fails), R-14 stale-snapshot clear
  (`removeItem` removed from the catch → `:440` fails), R-15 selection integrity (repair block
  removed → `:285`, `:302`, `:317` all fail). None passes for the wrong reason.
- **The maximal round-trip really is maximal.** Walked every optional in `PersistedState`:
  `DemoCase.incidentCoordinates`, `DemoLocation.gps`, `CameraEntry.gps`,
  `MediaItem.poster/durationSec/sample`, `SyncResult.{traceability,timestamp,stratum}`,
  `OcrProof.imageDataUrl`, `TimeOffsetData.ocr`, `capture.sync`/`capture.ocr` — all populated at
  `persistence.test.ts:130-204`. `toEqual` ignoring `undefined` keys is not a trap here because every
  optional carries a defined value, and the five explicit spot-checks at `:199-203` back it up.
- **`LocationForm.completed` is wired through every layer** — type (`types/index.ts:174`), seed
  (`seed.ts:63`), schema (`persistence.ts:205`, inside `satisfies FullShape<LocationForm>` so a
  forgotten key would not compile), store write (`create-store.ts:221-227`), selector
  (`selectors.ts:196`), gate (`DemoExperience.tsx:726`). `tsc --noEmit` clean.
- **No hardcoded snapshot-key literal in any test** — the `SNAPSHOT_VERSION` 1→2 / key
  `dvr-demo-state-v2` bump is picked up by import in both suites
  (`grep -rn dvr-demo-state features app` hits only `persistence.ts:63`).
- **`screenData.test.ts`'s "fully-complete form reads Complete"** still exercises the *aggregation*
  path, not the new short-circuit: its fixture spreads `blankLocationForm()` (`completed: false`), so
  the pre-existing G3 coverage is intact and the short-circuit is separately pinned at
  `selectors.test.ts:96-103`.
- **R-10's query fallout is safe.** Every `getByRole('button', { name: '<label>' })` became a prefix
  regex; checked each screen for cross-matching — `/^FPS/` cannot hit "Recording FPS", and
  `/^Resolution/`, `/^Export Media/`, `/^File Type/`, `/^Provided Via/` are unique per screen. The
  three new accessible-name tests (`Dropdown.test.tsx:99-118`) assert the full computed name
  including the selection and the no-label case — the contract R-10 asked for.
- **No new order-dependence.** The R-13 descriptor swap is `finally`-restored; `vi.setConfig` in
  `option-parity.test.tsx:21` is file-scoped; the boundary suite's `afterEach` ordering versus RTL's
  `cleanup()` is irrelevant because the `beforeEach` clear is the one that matters; jsdom windows are
  per-file, so nothing crosses files.
- **Setup-shim traps** — nothing new in this round claims a live camera/canvas path;
  `navigator.mediaDevices` stays undefined, `getContext` stays `null`, no reduced-motion branch is
  asserted without an override.
- **Determinism** — no `Date.now()`/`Math.random()` introduced. `persistence.test.ts` keeps fake
  timers with a matching restore; `Dropdown`'s new ids come from `useId`, not entropy.
- **Factory usage** — the new engine tests use `freshStore()`/`newCaseInput()`/`newLocationInput()`.
  The one inline `createCase({ caseNumber, displayName, unit })` at
  `DemoExperience.persistence.test.tsx:61` matches the established idiom in the sibling UI suites
  (`DemoExperience.sandbox.test.tsx:45`) and names only required fields — not worth a finding.
- **Coverage-boundary discipline** — the fix round added no logic to `ui/**` that belongs in
  `engine/**`. The selection-integrity repair went into `engine/store/persistence.ts` (gated, 100 %
  statements); `reviewAgain` and `canComplete` are genuine bridge UI state, correctly in `ui/**`
  (which is why TESTS-6/7 are behavioral gaps, not gate gaps).
- **`app/demo/error.tsx`** — the new outer net's two tests (`app/demo/__tests__/error.test.tsx`) pin
  the branded copy, `reset()` firing, and focus-on-mount. That Next actually mounts it as the segment
  boundary is a framework-convention invariant no vitest test can assert; `next build` is the gate
  for it. Not a finding.
- **Deliberate choices from the phase brief** not re-flagged: the "Location Complete" copy change,
  the Cameras seeding divergence, the class-based `DemoErrorBoundary`, sessionStorage-over-
  localStorage, the phone-verified asymmetries, and deferred §29–§32.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |

Prior lane findings: **5 of 5 FIXED** (TESTS-1/R-3, TESTS-2/R-11, TESTS-3/R-12, TESTS-4/R-13,
TESTS-5/R-2), plus the shared R-6 timeout flake.

- **Behaviorally meaningful coverage:** strong — materially stronger than the initial pass. Every fix
  that could be pinned at runtime was pinned, and each new pin fails against the pre-fix code.
- **Engine coverage gate (80 % on `lib/**` + `engine/**`):** met (97.11 S / 88.85 B / 98.85 F / 98.41 L).
- **Mock strategy:** at the IO edge; the store is injected, never mocked.
- **Factory usage:** canonical.
- **Setup-shim traps:** none.
- **Determinism (clock/entropy injected):** yes.
- **New order-dependence:** none — the one that existed (R-3) is fixed and now carries premise
  assertions that fail loudly if it returns.

**Lane verdict: APPROVE** — the three MINORs (two untested bridge guards introduced by the R-1 fix,
one gratuitously loosened assertion) are opportunistic and do not gate merge.
