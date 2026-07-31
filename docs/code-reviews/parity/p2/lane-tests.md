# P2 review — TESTS lane

**Lane:** test-analyzer (`.claude/agents/test-analyzer.md`)
**Under review:** `feat/parity-p2` @ `9f5c01a`, diff `git diff master...feat/parity-p2`
**Pass:** initial
**Verdict:** REVISE (2 MAJOR, 3 MINOR, 1 NIT — no BLOCKER)

Severity vocabulary maps to the agent rubric as: BLOCKER = CRITICAL, MAJOR = HIGH,
MINOR = MEDIUM, NIT = LOW.

---

## Pre-flight (run in this worktree)

| Check | Result |
|---|---|
| `pnpm test --silent` | **156 files / 1416 tests, all green** |
| `pnpm exec tsc --noEmit` | clean (exit 0) |
| `pnpm test:coverage --silent` | **green — gate met with margin**: all files 97.78 stmts / 91.19 branch / 99.23 funcs / 99.01 lines against the 80% thresholds on `lib/**` + `features/demo/engine/**` |
| `TZ=UTC pnpm test time-offset-advisories --silent` | 13/13 green — but see TESTS-2, one of those greens is vacuous under UTC |

No flaky baseline exists in this repo and none was observed: the full suite was run once
green, and the coverage run (a second full execution) was green again.

### On the global `asyncUtilTimeout` change (asked for explicitly; **not** re-flagged as a finding)

`vitest.setup.ts:24` `configure({ asyncUtilTimeout: 5000 })`, evidence
`docs/code-reviews/parity/p2/gate-import-flake.md`, guard
`__tests__/async-util-timeout.test.ts`. Assessed as **sound**:

- The diagnosis is falsifiable and was falsified correctly — a failing set that moves
  between runs and crosses test files is a scheduler race, not state coupling, and the
  doc backs it with a measured latency distribution (35 ms idle vs 561/674/1093/1770 ms
  loaded) rather than an assertion.
- The value is sized off that distribution (~3× the worst loaded sample) and is bounded
  **below** the 20 000 ms per-test timeout, so a genuine hang still fails as a hang with
  budget left to report. The guard test pins both ends (`>= 5000`, `< 20000`), which is
  the right shape — a floor alone would let a later "just bump it" hide a real hang.
- The guard is red at the 1000 ms default and green after, so it is a real regression
  test. The two originally-red tests correctly were **not** used as the pin (they do not
  fail deterministically).
- Cost check: the raise cannot slow a passing suite — `waitFor`/`findBy*` resolve on the
  first successful poll, so the budget is only spent on failures. I checked for the one
  pattern that would make it expensive — a test that asserts absence by letting a
  `findBy*` time out — and found none in the demo suites; absence is asserted with
  `queryBy*`/`not.toBeInTheDocument()` throughout.

The one residual risk is the documented one (§6 of the evidence doc): the raise is global,
so a future genuinely-slow wait is now 5× more patient before it complains. That is
recorded in the doc as a deliberate trade with an explicit "raise it at the call site, not
here" rule. Accepted.

---

## Findings

## TESTS-1 [MAJOR] features/demo/engine/__tests__/engine-flow.test.ts:23,53

**Claim.** "Flow F" — the **read-only reconcile inside `selectCaseNotesData`** — is the
only thing that puts notes into the court PDF for a visitor who never opens the Notes
screen, and nothing in the suite pins it. Every existing assertion that notes content
reached the PDF calls `reconcileNotes()` into the store first, so all of them pass
identically if Flow F is deleted.

**Evidence.**

- Production, `features/demo/engine/store/selectors.ts:241-246`:
  ```ts
  // Flow F (phone parity, useCaseNotesExport.deriveNotesFromStore): reconcile READ-ONLY
  // before assembling, so the court PDF can never embed stale un-edited notes even if
  // the Notes screen was never focused. Nothing is written back to the store.
  const notesSections = loc
    ? reconcileSections(extractNotesRelevantData(loc), loc.form.notesSections).sections
    : []
  ```
- The only store-side reconcile trigger is view-gated —
  `features/demo/ui/DemoExperience.tsx:405-408`:
  ```ts
  useEffect(() => {
    if (view === 'notes') store.getState().reconcileNotes()
  }, [store, view, currentLocationId])
  ```
  and the PDF is generated straight off the selector at
  `features/demo/ui/DemoExperience.tsx:881`:
  `setPdf({ title: 'Case Notes — PDF', html: generateCaseNotesDoc(selectCaseNotesData(store.getState())) })`.
- Tests that assert notes content in a generated document:
  `features/demo/engine/__tests__/engine-flow.test.ts:23` and `:53` — **both call
  `store.getState().reconcileNotes()` immediately before**
  `generateCaseNotesDoc(selectCaseNotesData(...))`. With the sections already reconciled
  into the store, `reconcileSections` inside the selector is a no-op returning the same
  references, so replacing the Flow F expression with a plain `loc.form.notesSections`
  leaves both tests green.
- The other `selectCaseNotesData` tests cannot cover it either:
  `features/demo/engine/store/__tests__/store-actions.test.ts:168-175` runs on an **empty**
  store (`loc` is null → the `: []` arm), and
  `features/demo/engine/store/__tests__/select-adjusted-scopes.test.ts:32-33` asserts only
  `adjustedScopes`.
- `features/demo/ui/__tests__/DemoExperience.completion-gate.test.tsx:271-282` renders the
  PDF through the bridge but asserts only `getByTitle('Case Notes — PDF')` — the iframe's
  existence, never its body.

**The bug that slips through.** A visitor fills the wizard and taps "Preview / Export PDF"
without ever opening Notes — the single most likely path, since Notes is step 12 of 13 and
the Completion screen's own CTA reaches the document directly. Without Flow F,
`form.notesSections` is still `[]`, `assembleNotesString([], '')` returns `''`, and
`case-notes.ts:220-224` drops the entire **Case Notes** block from the court document. The
suite stays green. The lane rubric puts the document generators in its top severity band;
the code is currently *correct*, so this is missing coverage on a load-bearing path rather
than a live defect — MAJOR, not BLOCKER.

The comment's second promise — *"Nothing is written back to the store"* — is likewise
unpinned. A selector that writes during render is a React hazard, and today only the
comment prevents it.

**Suggested fix.** One test in
`features/demo/engine/__tests__/engine-flow.test.ts` (or the `selectCaseNotesData` describe
in `store-actions.test.ts`), deliberately **not** calling `reconcileNotes()`:

```ts
it('Flow F: the court PDF carries reconciled notes even if the Notes screen was never opened, and writes nothing back', () => {
  const store = freshStore()
  const c = store.getState().createCase(newCaseInput())
  store.getState().addLocation(c, newLocationInput())
  store.getState().updateField('form.dvr.totalDvrRetention', '35 days')
  // NOTE: reconcileNotes() is deliberately NOT called — this is the never-opened-Notes path.
  const html = generateCaseNotesDoc(selectCaseNotesData(store.getState()))
  expect(html).toContain("Attended Kim's Convenience")
  expect(html).toContain('DVR retention period: 35 days')
  // …and the read-only promise: the store is untouched.
  expect(selectCurrentLocation(store.getState())?.form.notesSections).toEqual([])
})
```

Verified by code-trace (both directions of the mutation reasoned through the selector and
the assembler), not by running a mutated build — the lane is read-only.

**Confidence:** High.

---

## TESTS-2 [MAJOR] features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:179-181

**Claim.** The only test that connects the bridge to `computeDstAdvisory` and on to the
screen prop makes its assertion **conditional on the runner's timezone**, and in the
non-DST arm the assertion is a negative that a completely disconnected wiring also
satisfies. On a UTC runner — the documented CI default — the sole end-to-end pin for the
DST advisory is vacuous.

**Evidence.**

- The test, `features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:176-181`:
  ```ts
  const advisory = screen.queryByText(/either side of the DST change/)
  const zoneHasDst = new Date(2026, 0, 15).getTimezoneOffset() !== new Date(2026, 6, 15).getTimezoneOffset()
  if (zoneHasDst) expect(advisory).toBeInTheDocument()
  else expect(advisory).toBeNull()
  ```
  In the `else` arm the whole test reduces to "this string is absent", which passes if
  `dstAdvisory` is never computed, never threaded into `TimeOffsetScreen`, or the screen
  stops rendering it.
- The bridge has **no** DST seam — `features/demo/ui/DemoExperience.tsx:1017-1023` passes
  `now: clock.now` (spy-able, and the test does spy it at `:167`) but omits `isDst`, so
  `computeDstAdvisory` falls back to the host-zone `isInDST`
  (`features/demo/engine/logic/dst-advisory.ts:144`). The wall clock is injectable; the
  *zone* is not.
- No other test covers this seam. The engine tests inject `isDst`
  (`features/demo/engine/logic/__tests__/dst-advisory.test.ts:18-23`, and its own comment
  at `:11-13` says CI containers default to UTC, which never observes DST). The screen
  tests pass `dstAdvisory` as a literal prop
  (`time-offset-advisories.test.tsx:34,39,45`) and so never touch the computation.
- Confirmed empirically: `TZ=UTC pnpm test time-offset-advisories --silent` → **13/13
  green**, i.e. the file passes taking the vacuous arm.

**The bug that slips through.** Dropping the `dstAdvisory={dstAdvisory}` prop at
`DemoExperience.tsx:1043`, or short-circuiting `computeDstAdvisory` to `null`, would ship
a Time-Offset screen that silently never warns about a DST straddle — a forensic advisory
about pulling an extra hour of footage — and CI would stay green.

**Suggested fix.** Give the bridge the same injected `IsDstFn` seam the engine helper
already takes (an optional dep on `DemoExperience`, mirroring how `clock` is already a
spy-able seam), stub it in this test with the suite's `usIsDst` fake, and then assert the
advisory **unconditionally**. Failing that, pin the zone for this file
(`process.env.TZ = 'America/Toronto'` in a `beforeAll`, restored in `afterAll` — do not set
a global `TZ`, other suites assume the host zone) and delete the `zoneHasDst` branch. Note
that this is *not* a re-file of deferred §4's "TZ-pinned DST test": §4 concerns the engine's
signed-shift test, which this phase's `dst-advisory.test.ts` already solved properly by
injection. This finding is a **new** conditional assertion introduced by this diff.

**Confidence:** High.

---

## TESTS-3 [MINOR] features/demo/ui/screens/__tests__/time-offset-advisories.test.tsx:167,182

**Claim.** The clock spy is installed inside the test body and restored as the body's
**last statement**, so any earlier assertion failure leaks a stubbed `clock.now` into the
rest of the file — order-dependence introduced into an otherwise deterministic suite.

**Evidence.**

```ts
it('surfaces the straddle advisory once an offset has been calculated', { timeout: 20000 }, () => {
  vi.spyOn(clock, 'now').mockReturnValue(new Date(2026, 0, 15, 12))   // :167
  …
  if (zoneHasDst) expect(advisory).toBeInTheDocument()                 // :180 — can throw
  else expect(advisory).toBeNull()
  vi.restoreAllMocks()                                                 // :182 — never reached on failure
})
```

The next test in the file (`:185 guards Calculate once extracted scopes exist`) would then
run against a mid-January clock. Compare the correct idiom used elsewhere in this same
diff: `features/demo/ui/__tests__/DemoExperience.ocr.test.tsx:31`
(`afterEach(() => vi.restoreAllMocks())`) and
`features/demo/engine/logic/notes/__tests__/section-reconciler.test.ts:14`.

**Why it matters.** Only manifests on an already-red run, but that is exactly when a
misleading cascade of secondary failures costs the most debugging time — and it is the
mechanism by which a deterministic suite starts to rot.

**Suggested fix.** Hoist to `afterEach(() => vi.restoreAllMocks())` for the describe block
and delete the inline `:182` call.

**Confidence:** High.

---

## TESTS-4 [MINOR] features/demo/engine/store/__tests__/store-actions.test.ts:168-175

**Claim.** `selectCaseNotesData`'s `cameras` and `arrivalDepartures` projection callbacks
are never invoked by any test — the coverage run names them directly as the only uncovered
lines in `selectors.ts` (`96.34 stmts / 95 funcs`, uncovered `271-275`). The Case Notes
PDF's camera table and visit rows are therefore fed from literals in the generator test
and from nothing at all in the selector test.

**Evidence.**

- Production, `features/demo/engine/store/selectors.ts:271,275`:
  ```ts
  cameras: form?.cameras.map((c) => ({ name: c.cameraName, resolution: c.resolution, fps: c.recordingFps })),
  …
  arrivalDepartures: form?.arrivalDepartures.map((a) => ({ arrival: a.arrival, departure: a.departure })),
  ```
- The only `selectCaseNotesData` tests: `store-actions.test.ts:169` (empty store — `form`
  is undefined, both mappers short-circuit) and
  `features/demo/engine/__tests__/engine-flow.test.ts:36,55` (a location with scopes and
  an offset, but **no** `form.cameras` and **no** `form.arrivalDepartures`).
- `features/demo/engine/logic/pdf/__tests__/case-notes.test.ts:34,40` supplies
  `cameras`/`arrivalDepartures` as hand-written literals, so it pins the *generator*, never
  the seam that fills it.

**The bug that slips through.** A value swap inside either mapper — `resolution:
c.recordingFps` / `fps: c.resolution`, or `arrival: a.departure` — is type-correct, so
`tsc` stays silent, every test stays green, and the court document reports each camera's
FPS as its resolution. (A *rename* would be caught by `CaseNotesCamera`; a swap would not.)

**Suggested fix.** Extend the `selectCaseNotesData` describe with a populated-location case:
set `form.cameras` (distinct resolution and fps strings, e.g. `'1080p'` / `'15'`) and
`form.arrivalDepartures` (distinct arrival/departure timestamps) via `updateField`, then
assert the projected objects field by field.

**Confidence:** High.

---

## TESTS-5 [MINOR] features/demo/ui/inputs/__tests__/capture-gps.test.ts:195-204

**Claim.** `captureGps` has three abort checkpoints; two are covered and the **mid-loop**
one is not. The single abort test aborts before the first reading, so nothing pins that an
in-flight multi-sample capture stops issuing `getCurrentPosition` calls once the component
unmounts.

**Evidence.**

- Production, `features/demo/ui/inputs/capture-gps.ts`:
  - `:125` `if (isAborted?.()) return null` — top of each loop iteration.
  - `:179` `if (isAborted?.()) return null` — after the loop.
- `capture-gps.test.ts:195-204` passes `isAborted: () => true`, so the very first
  evaluation of `:125` returns and `getCurrentPosition` is never called — the iteration-≥2
  path is never entered.
- The post-loop checkpoint `:179` **is** covered, indirectly but genuinely, by
  `features/demo/ui/inputs/__tests__/useGpsCapture.test.ts:103-125` (`does not write state
  after unmount`): the delayed reading resolves after `unmount()` sets `abortedRef`, the
  loop breaks on target accuracy, and `:179` returns `null`. That one is fine — this
  finding is only about `:125`.

**The bug that slips through.** Dropping the `:125` check leaves an unmounted component's
capture hammering `navigator.geolocation` for up to `maxAttempts` (10) × `retryDelayMs`
(500 ms) after the visitor has navigated away — permission churn and battery on a real
device. State integrity is still protected by `:179`, which is why this is MINOR rather
than MAJOR.

**Suggested fix.** A test whose first reading misses the target (so the loop continues) and
whose `isAborted` flips true afterwards:

```ts
it('stops sampling as soon as it is aborted mid-capture', async () => {
  const geo = scripted([position(90), position(3)])   // 90m misses the balanced 50m target
  const spy = vi.spyOn(geo, 'getCurrentPosition')
  let aborted = false
  const outcome = await captureGps(buildGpsConfig('balanced'), {
    geolocation: geo, ...noDelay,
    onProgress: () => { aborted = true },             // abort once the first reading lands
    isAborted: () => aborted,
  })
  expect(outcome).toBeNull()
  expect(spy).toHaveBeenCalledTimes(1)                // the second attempt never happens
})
```

**Confidence:** High.

---

## TESTS-6 [NIT] features/demo/ui/screens/__tests__/NotesScreen.test.tsx:188

**Claim.** `Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })`
is installed with no teardown, leaving a stub clipboard on `navigator` for every test that
runs after it in the file.

**Evidence.** Line 188, inside the `Copy all` test; no `afterEach` restores it, and the
`NotesScreen — bridge integration` describe (`:213-245`) runs afterwards. Vitest isolates
per file, so there is no cross-file leak, and no later test in this file reads the
clipboard — hence NIT rather than MINOR.

**Suggested fix.** Capture the original descriptor and restore it in an `afterEach`, or
scope the stub with `vi.stubGlobal` and let `unstubAllGlobals` clean it up.

**Confidence:** High.

---

## Out-of-lane observation (not counted in this lane's totals)

`docs/code-reviews/deferred.md:1014` contains a stray `=======` on its own line — a leftover
git merge conflict marker between the end of §39.5 and the start of §40, almost certainly
from the `parity/p2-*` branch merges into `feat/parity-p2`. It renders as a horizontal rule
so it is easy to miss. Flagged only because the review ledgers are committed artifacts of
this phase; the docs/TS lanes own the fix.

---

## Checked inventory

All 46 changed/added test files were read in full and paired against their production code.
Production modules read in full: `engine/logic/notes/*` (all 15), `engine/logic/gps.ts`,
`engine/logic/dst-advisory.ts`, `engine/logic/final-submission.ts`,
`engine/logic/address-format.ts`, `engine/logic/ocr.ts` (diff),
`engine/logic/date-disambiguation.ts` (diff), `engine/logic/time.ts` (diff),
`engine/logic/pdf/case-notes.ts` (diff), `engine/store/create-store.ts` (diff),
`engine/store/selectors.ts` (diff), `engine/store/persistence.ts` (diff),
`ui/inputs/capture-gps.ts`, `ui/inputs/useGpsCapture.ts`,
`ui/screens/DateDisambiguationWarning.tsx`, `ui/DemoExperience.tsx` (relevant seams),
`vitest.config.mts`, `vitest.setup.ts`.

| Test file | Verdict |
|---|---|
| `__tests__/async-util-timeout.test.ts` | Sound — floor **and** ceiling pinned; red-before/green-after documented |
| `engine/__tests__/barrel.test.ts` | Sound (shape guard; the ~40 new re-exports are not individually asserted, which is consistent with the file's existing spot-check style — not filed) |
| `engine/__tests__/engine-flow.test.ts` | Mostly sound; **TESTS-1** |
| `engine/logic/__tests__/address-format.test.ts` | Strong — whole abbreviation table pinned row by row; idempotence, casing, whitespace, multi-match, null/undefined |
| `engine/logic/__tests__/date-disambiguation.test.ts` | Strong — copy pinned verbatim; the unreachable `equidistant` branch is hand-built with the reason stated |
| `engine/logic/__tests__/dst-advisory.test.ts` | Strong — `isDst` injected throughout, so branches are pinned independently of the host zone; all four scenarios + branch order + the month-boundary case |
| `engine/logic/__tests__/final-submission.test.ts` | Strong — every rule, `.some`-not-`.every`, key order, whitespace-address, the "location name is not an address" trap, null-location |
| `engine/logic/__tests__/gps.test.ts` | Strong — tie-keeps-earlier, exact poles/antimeridian, non-finite, sample counting, full rating table via `it.each` |
| `engine/logic/__tests__/ocr.test.ts` | Strong — the `time-only` union arm replaces the old date-invention; resolver rewrite pinned against the parser's own default; sample frames pinned as load-bearing content |
| `engine/logic/__tests__/time.test.ts` | Sound — the `roundTo5Min` throw replaces silent passthrough, red-first credible |
| `engine/logic/notes/__tests__/format-timestamp.test.ts` | Sound — fixtures chosen to be unparseable by *this* engine, with the reason noted |
| `engine/logic/notes/__tests__/formatters.test.ts` | Strong — byte-exact templates, all tiers, empty arms, pluralization, NaN-poisoning, GPS null-island policy |
| `engine/logic/notes/__tests__/notes-assembler.test.ts` | Strong — ordering, empty-block drop, addendum placement, free text, unknown-id sort, non-mutation |
| `engine/logic/notes/__tests__/notes-relevant-data.test.ts` | Strong — every demo→phone coercion, per-scope isolation on non-canonical input, determinism |
| `engine/logic/notes/__tests__/phone-parity.test.ts` | Strong — full seven-section sequence/labels/content + assembled block rhythm |
| `engine/logic/notes/__tests__/section-meta.test.ts` | Sound (builds a `DemoLocation` literal; no canonical factory exists for that shape — not filed) |
| `engine/logic/notes/__tests__/section-reconciler.test.ts` | Strong — reference preservation, no-clobber across N regenerations, unknown-id heal counts as change, empty-refresh-never-stale |
| `engine/logic/notes/__tests__/section-registry.test.ts` | Strong — order, union exhaustiveness against `NOTE_SECTION_IDS`, the disconnected `cameras` formatter |
| `engine/logic/notes/__tests__/test-utils.ts` | Good — mirrors the phone factory names; used consistently by the notes suites |
| `engine/logic/pdf/__tests__/case-notes.test.ts` | Sound — sectioned input, registry-order assembly, escaping on both section content and free text |
| `engine/store/__tests__/drawer-status.test.ts` | Sound — two-state rule incl. addendum-only |
| `engine/store/__tests__/extracted-scope-domains.test.ts` | Strong — D10 both domains, off-the-5-minute-mark fixtures, an explicit "not the old result" assertion, drop-on-junk both arms, mixed list |
| `engine/store/__tests__/notes-actions.test.ts` | Strong — all of flows A–E2 + free text; zero-write assertions via `locations` identity |
| `engine/store/__tests__/persistence.test.ts` | Sound — `NoteSection.userAddendum` folded into the maximal round-trip |
| `engine/store/__tests__/select-adjusted-scopes.test.ts` | Sound — the inverse `adjLabel` and the DVR-time read-across |
| `engine/store/__tests__/store-actions.test.ts` | Sound for guards (all 7 new actions in the no-location arm); **TESTS-4** for the selector |
| `engine/store/__tests__/store.test.ts` | Sound — the `accuracyM: 0` fabrication removal |
| `ui/__tests__/DemoExperience.completion-gate.test.tsx` | Strong — blocked/unblocked, both CTAs, Cancel/Escape/Save-Progress, auto-clear, R-19 owning-case, cross-location isolation, the deliberate first-tap deviation |
| `ui/__tests__/DemoExperience.coordinates.test.tsx` | Strong — rooftop accuracy passthrough, capture supersedes geocode on one write path |
| `ui/__tests__/DemoExperience.ocr.test.tsx` | Strong — commit vs edit-then-commit, proof records the machine read, assumed-date gate both release routes, snapshot survival |
| `ui/__tests__/DemoExperience.sandbox.test.tsx` | Strong — R-45/R-46/R-49/R-50 each pin a distinct, previously-invisible failure |
| `ui/chrome/__tests__/PdfPreview.test.tsx` | Strong — R-47 late-signal retraction and superseded-verdict, R-48 "attempt the save anyway" |
| `ui/controls/__tests__/AlertDialog.test.tsx` | Strong — role/name/describedby, focus take and return, Escape-yes/scrim-no |
| `ui/inputs/__tests__/capture-gps.test.ts` | Strong; **TESTS-5** |
| `ui/inputs/__tests__/CoordinateDisplay.test.tsx` | Sound — inline-style tone assertions are legitimate here (`css: false` only blocks class computation) |
| `ui/inputs/__tests__/useGpsCapture.test.ts` | Strong — re-entrancy mutex, failure clearing, and a real unmount-mid-flight test that also asserts no `console.error` |
| `ui/screens/__tests__/a11y.test.tsx` | Prop-shape update only |
| `ui/screens/__tests__/hardwareFinale.test.tsx` | Sound — smoke redirected to the new NotesScreen API; the validation card gets its own two cases |
| `ui/screens/__tests__/location-coordinates.test.tsx` | Sound — single stamped write path |
| `ui/screens/__tests__/marquee.test.tsx` | Strong — the OCR confirm surface end to end: editable draft, "Manually edited", empty-block, ambiguity render/silence, assumed-date hold and both releases |
| `ui/screens/__tests__/NotesScreen.test.tsx` | Strong — five confirm dialogs with exact copy, unmount-flush commit, banner conditions, Copy-all success **and** failure; **TESTS-6** |
| `ui/screens/__tests__/screenData.test.ts` | Field-rename only |
| `ui/screens/__tests__/submission-gps.test.tsx` | Strong — render order, verbatim placeholders, geocode toggle both ways, both honest failure paths, live sample readout observed mid-capture |
| `ui/screens/__tests__/time-offset-advisories.test.tsx` | Screen-level parts strong; **TESTS-2**, **TESTS-3** |
| `ui/screens/__tests__/wizard.test.tsx` | Prop-rename only |
| `vitest.setup.ts` | See the `asyncUtilTimeout` assessment above |

### Considered and deliberately not filed

- **`ui/inputs/capture-gps.ts` sitting outside the coverage gate.** It is ~180 lines with
  real branching, in ungated `ui/`. Not a finding: it is the browser-IO boundary by
  construction (`navigator.geolocation` + retry/deadline orchestration), every *decision*
  about samples lives in gated `engine/logic/gps.ts`, and the module carries a
  `GeolocationLike` injection seam with 205 lines of tests exercising every arm. This is
  the correct side of the boundary, not gate-avoidance.
- **`ui/screens/DateDisambiguationWarning.tsx`'s local `formatDateForDisplay`.** UI-local,
  ungated, but covered behaviorally (`marquee.test.tsx:150-153`,
  `DemoExperience.ocr.test.tsx:105-106`) and the copy it wraps is pinned in the engine.
- **Inline `DemoCase`/`DemoLocation` literals** in `final-submission.test.ts`,
  `notes-relevant-data.test.ts`, `phone-parity.test.ts`, `section-meta.test.ts`. No
  canonical factory exists for these shapes — `engine/store/__tests__/test-utils.ts` returns
  *stores* (`freshStore`/`storeWithLocation`) and *inputs* (`newCaseInput`/`newLocationInput`),
  not entities — and each literal is built off `blankLocationForm()` so a new form field
  cannot silently drift. Worth a shared entity factory eventually; not a defect in this diff.
- **Store guard arms for the missing-section id** (`commitNoteSection` / `resetNoteSection`
  when the id is not stored). Unreachable from the UI (the screen renders only stored
  sections), and `create-store.ts` clears the branch gate at 91.34%.
- **Phase-context items**, per the brief: D10 §39.5, §M13 refutation, `asyncUtilTimeout`
  5000 + ceiling pin, AlertDialog semantics, phone bugs not copied, snapshot v4 union,
  orchestrator merge commits, today-guess gate, ledger §29–§42.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 2 |
| MINOR | 3 |
| NIT | 1 |

- **Behaviorally meaningful coverage:** strong. ~340 new tests against a large new surface,
  overwhelmingly behavior-named, byte-exact on ported copy, with the deliberate divergences
  from the phone stated *in the test that pins them*.
- **Engine coverage gate (80% on `lib/**` + `engine/**`):** met — 97.78 / 91.19 / 99.23 / 99.01.
- **Mock strategy:** at the IO edge. `mapbox-gl` / `pdfjs-dist` / `run-import` / geolocation
  stay mocked; engine logic is never mocked over; the store is injected, never mocked.
- **Factory usage:** mixed but defensible — the notes suites introduce a proper shared
  `test-utils.ts`; the entity literals elsewhere have no factory to use.
- **Setup-shim traps:** none. The canvas-`getContext`-null sample path is exercised by tests
  that *claim* the sample path; the geolocation-undefined default is asserted as the honest
  `UNSUPPORTED` contract rather than papered over.
- **Determinism (clock/entropy injected):** one gap — TESTS-2 leaves the *timezone*
  uninjected on the DST bridge path. Wall clocks are injected everywhere
  (`currentTimeMs`, `now: () => Date`, `clock.now` spies).

**Verdict: REVISE** — TESTS-1 and TESTS-2 both leave a load-bearing path pinned only by a
comment or by a conditional that goes vacuous on CI.
