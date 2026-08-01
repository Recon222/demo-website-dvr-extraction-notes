# P6 review — TESTS lane

**PR:** #35 — P6 map feature depth (`master..feat/parity-p6`)
**Lane:** `test-analyzer` (Vitest 4 + jsdom + RTL)
**Worktree:** `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/parity-p6`
**Mode:** initial

---

## Pre-flight (run, not assumed)

| Gate | Result |
|---|---|
| `pnpm exec vitest run` (full) | **225 files / 2688 tests passed** — matches the PR body exactly |
| `pnpm exec tsc --noEmit` | clean (exit 0) |
| `pnpm exec vitest run features/demo/ui/screens/map` | 16 files / 170 tests passed |
| `act()` warnings across the map suite | **none** |
| v8 coverage, `features/demo/ui/screens/map/**` (gate forced off) | **96.68 % stmts · 89.85 % branch · 95.95 % funcs · 98.71 % lines** |

No pre-existing failures. Nothing in this diff is flaky under repeat runs.

**Note on the worktree:** another lane's untracked scratch file (`features/demo/ui/screens/map/__tests__/ZZweb-lane-repro.test.tsx`) appeared and disappeared mid-session. It did not affect any probe below (every probe was measured against `git status --short` clean-of-my-edits before and after). All mutations in this document were reverted; the tree is clean.

---

## Method

Every claim below was **mutation-probed**, not reasoned about. 22 mutations were applied to production
code (and, for the fix-shape verifications, to test code), each followed by a scoped `vitest run` and a
revert. A deliberate no-op mutation was included as a control and correctly reported MISSED, confirming
the harness discriminates.

Sweep result on the four new pure modules: **9 of 13 real mutations CAUGHT**. The four misses are
itemised below (M4, L3).

---

## Findings

### [HIGH] The "transient error after load" test never reaches the branch it names, and cannot fail when that branch is deleted

**Production code:** `features/demo/ui/screens/map/MapCanvas.tsx:253-262` — the `map.on('error', …)` handler, specifically the after-load arm at **256-259**:

```ts
if (readyRef.current) {
  console.warn('[demo/map] mapbox reported a transient error after load:', cause)
  return
}
```

**Tests covering it:** `features/demo/ui/screens/map/__tests__/MapCanvas.test.tsx:312-320` — `it('does NOT cover a working map when a transient tile error arrives after load')`

**Uncovered case:** an `error` event arriving *after* `load`. The test's name is the contract; the test never reaches it.

**Why it takes a different path — two independent causes, both verified:**

1. **Leaked mock implementation.** The preceding test (`MapCanvas.test.tsx:299-303`) replaces
   `mapInstance.on` with an implementation that deliberately does **not** fire `'load'`. The shared
   `beforeEach` (`MapCanvas.test.tsx:66`) does `Object.values(mapInstance).forEach((fn) => fn.mockClear?.())`
   — and `mockClear()` does not undo `mockImplementation()`. So by the time the transient test runs,
   the map never loads, `readyRef.current` is `false`, and the handler takes the `setFailed(true)` arm
   at 260-261 instead.
2. **Vacuous negative assertion.** `await waitFor(() => expect(screen.queryByTestId('map-error-overlay')).not.toBeInTheDocument())`
   is satisfied by `waitFor`'s *first synchronous check*, which runs before React flushes the
   `setFailed(true)` scheduled by the un-`act`-wrapped `emit('error', …)`. The assertion therefore
   cannot fail regardless of which branch ran.

**Proof (all three independent):**

- v8 coverage of `MapCanvas.tsx` over the whole test file reports **lines 257-258 UNCOVERED** (alongside 161, 170, 322).
- **Mutation:** deleting the entire `if (readyRef.current) { … return }` guard — i.e. making *every*
  mapbox error, including transient tile 404s on a working map, cover the map with the full-screen
  retry overlay — leaves **26/26 MapCanvas tests green**.
- **Fix-shape verification:** applying both halves of the fix below turns the test **red on that
  mutation** and **green on clean code**, and closes coverage lines 257-258 (uncovered set drops to
  `161,170,322`).

**Why it matters:** the guard is the difference between "one dropped satellite tile is a console
breadcrumb" and "one dropped satellite tile blanks the map behind an error overlay + Retry button".
It is the honesty behaviour §72 leans on, it is currently unprotected in both directions, and the
suite advertises that it is protected.

**Fix (both halves are required — either alone leaves the test unable to fail):**

1. Re-install the default `on` implementation in `beforeEach` (extract the hoisted default to a named
   `defaultOn` and call `mapInstance.on.mockImplementation(defaultOn)` after the `mockClear` loop at
   `MapCanvas.test.tsx:66`). `mockReset()` is *not* a substitute — it would strip the default too.
2. Replace the negative `waitFor` with the discriminating positive assertion, which is synchronous and
   branch-specific:
   ```ts
   expect(warn).toHaveBeenCalledWith('[demo/map] mapbox reported a transient error after load:', expect.anything())
   ```
   (keep the overlay-absence check after it as a secondary).

---

### [HIGH] The fresh-default-array re-plot defect — one of the two the PR says its tests caught — has no regression pin

**Production code:** `features/demo/ui/screens/map/MapCanvas.tsx:65-66` (`NO_MARKERS` / `NO_CAMERAS`) consumed at `:184`. The comment at 60-64 states the contract: a `= []` default parameter mints a fresh array per render, changing `renderMarkers`'s identity (`:325`) and re-running the plot effect (`:342-345`) on every commit.

**Tests covering it:** **none.**

- `MapCanvas.test.tsx:117` and `:126` (`await waitFor(() => expect(MarkerMock).toHaveBeenCalledTimes(2 | 1))`) are satisfied by a **transient** value — `waitFor` resolves the moment the count momentarily equals N and never observes the settled total.
- `elFor()` (`MapCanvas.test.tsx:78-79`) and `liveMarkers()` (`MapScreen.test.tsx:56-57`) filter to markers with zero `.remove()` calls, i.e. they measure the *live* set and are structurally blind to churn.

**Uncovered case:** mount with `markers` supplied and `cameras` omitted. The component's own
`setReady` → `setRevealed` commits then re-plot the entire marker set.

**Proof (measured, not reasoned):** reverting `:184` to `{ markers = [], cameras = [], … }` —

- an instrumented probe measured **4 Marker constructions for a settled 2-pin mount** (fixed code: 2);
- `MapCanvas.test.tsx` + `MapScreen.test.tsx` stayed **50/50 green**.

**Why it matters:** the defect the PR says its tests caught can be reintroduced by any future edit to
the props signature and the suite will not notice. It is also user-visible, not merely a perf nit:
`renderMarkers` destroys and rebuilds every marker element, so an open camera callout
(`markerElements.ts:150-156`, DOM-local state) is wiped by any unrelated commit.

**Fix:** add a settled-total assertion that a re-plot cannot satisfy — e.g. in
`describe('MapCanvas — markers + fit')`:

```ts
it('plots each marker exactly once across the mount commits (no fresh-default re-plot)', async () => {
  render(<MapCanvas markers={pins} />)                    // cameras deliberately omitted
  await waitFor(() => expect(MarkerMock).toHaveBeenCalled())
  await act(async () => { await Promise.resolve() })      // let ready/revealed commits settle
  expect(MarkerMock).toHaveBeenCalledTimes(pins.length)   // 4 under the defect
  expect(markerInstances.every((m) => m.remove.mock.calls.length === 0)).toBe(true)
})
```

The companion defect (**cameras-toggle re-fit**) *is* correctly pinned — verified: re-adding
`renderMarkers` to the index/fit effect's deps (`MapCanvas.tsx:338`) reddens exactly
`MapCanvas.test.tsx:191` with `expected "vi.fn()" to be called 1 times, but got 2 times`. That one is a
genuine regression pin; only its twin is missing.

---

### [HIGH] The long-press coordinate conversion is unpinned — the ring can land anywhere and stay green

**Production code:** `features/demo/ui/screens/map/MapCanvas.tsx:412-413`

```ts
const rect = container.getBoundingClientRect()
const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]
```

**Tests covering it:** `MapCanvas.test.tsx:249-259` — asserts `onLongPress` was called with `(-79.7, 43.7)`, which is the **stub's constant return value** (`:29`). The argument handed to `map.unproject` is never asserted.

**Uncovered case:** a container whose bounding rect is not at the viewport origin — which in production is *always*, since the map lives inside the 378 px phone screen, itself inside a 404 px frame, itself offset and CSS-scaled by `usePhoneScale`. jsdom's `getBoundingClientRect()` returns all zeros, so the conversion is a no-op under test.

**Proof:** mutating `:413` to `[event.clientX, event.clientY]` — dropping the container-offset
conversion entirely — leaves the **whole map suite 170/170 green**.

**Why it matters:** long-press → proximity ring placement *is* the feature (§72e). With the offset
dropped, every long-press places the ring at a coordinate offset by the frame's page position; a
visitor pressing on a pin gets a ring hundreds of metres away. Zero test signal.

**Fix:** stub the container rect and assert the projected point, not just the unprojected result:

```ts
const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 30, top: 50, /* … */ } as DOMRect)
fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120 })
vi.advanceTimersByTime(500)
expect(mapInstance.unproject).toHaveBeenCalledWith([70, 70])
expect(onLongPress).toHaveBeenCalledWith(-79.7, 43.7)
```

*(Note for the web lane, not a test finding: `getBoundingClientRect()` returns the **CSS-scaled** rect
while `map.unproject` expects unscaled container pixels. Whether `usePhoneScale`'s transform needs
dividing out here is a production question this lane does not adjudicate — but the test above should be
written so it would surface the answer.)*

---

### [MEDIUM] Order dependence: the overridden `on` implementation leaks to every test declared after the error block

**Production code:** n/a — this is a suite-health finding.
**Tests:** `MapCanvas.test.tsx:59-68` (`beforeEach`), overrides installed at `:299-303` and `:324-328`.

`mockClear()` (`:66`) resets call records but not implementations. From `MapCanvas.test.tsx:296`
onward, every test gets a map stub that never emits `'load'`, so `ready` stays `false` and the index,
plot and proximity-ring effects (`:332`, `:342`, `:349` — all guarded on `ready`) never run.

**Proof:** appending a trivial marker test after the error `describe` fails with
`AssertionError: expected [] to have a length of 1 but got +0`. The file is green today only because the
one subsequent `describe` (`MapCanvas — handle`, `:341`) asserts `getCenter()`, which does not depend on `ready`.

**Why it matters:** this is exactly how a deterministic suite rots — the next test appended to this file
silently exercises a map that never loads. It is also the mechanism behind the HIGH above.

**Fix:** same as HIGH #1 half (1) — re-install the default `on` in `beforeEach`. Optionally add a guard
test at the end of the file asserting a plain mount still plots, so the leak can never re-establish.

---

### [MEDIUM] The long-press timer and slop arms are one-sided on both axes

**Production code:** `MapCanvas.tsx:56` (`LONG_PRESS_MS = 500`) and `:58` (`LONG_PRESS_SLOP = 10`) — both are phone-parity constants that §72e explicitly flags as a seam a future round will revisit.

**Tests:** `MapCanvas.test.tsx:249-259` (fires at 500), `:261-273` (cancels after 200 + release), `:275-286` (cancels after a 60 px travel).

**Uncovered cases + mutation results:**

| Mutation | Result |
|---|---|
| `LONG_PRESS_MS` 500 → 700 | **CAUGHT** (2 tests) |
| `LONG_PRESS_MS` 500 → 400 | **MISSED** — 50/50 green |
| `LONG_PRESS_MS` 500 → 250 | **MISSED** — 50/50 green |
| `LONG_PRESS_SLOP` 10 → 100 | **CAUGHT** (1 test) |
| `LONG_PRESS_SLOP` 10 → 0 | **MISSED** — 50/50 green |

The timer's lower bound is pinned only at 200 ms (the cancel test's advance), so it can drift anywhere in
(200, 500] silently — at 250 ms a normal map tap-and-hold-to-drag starts firing the proximity ring.
The slop's lower bound is pinned nowhere: a slop of 0 makes long-press unusable on any touch device
(a finger always jitters 2-5 px) and the suite stays fully green.

**Fix:** make both arms two-sided, in `describe('MapCanvas — long press')`:

```ts
it('does not fire one tick early', () => {
  … vi.advanceTimersByTime(499); expect(onLongPress).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1);     expect(onLongPress).toHaveBeenCalledTimes(1)
})
it('tolerates finger jitter inside the slop', () => {
  fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120 })
  fireEvent.pointerMove(canvas, { clientX: 108, clientY: 126 })   // 8 px / 6 px — inside 10
  vi.advanceTimersByTime(500);   expect(onLongPress).toHaveBeenCalledTimes(1)
})
```

---

### [MEDIUM] The proximity fallback chain — a documented §72b deviation — has only its first step covered

**Production code:** `features/demo/ui/screens/map/MapScreen.tsx:240-243`

```ts
const anchor = filtered.items[0]?.coord ?? mapRef.current?.getCenter() ?? FALLBACK_CENTER
```

plus the `if (!proximityCenter)` guard at `:240` (phone step 1: reuse a previously-set centre).

**Tests:** `MapScreen.test.tsx:248-303`. Every fixture (`buildRichMapData`) has an incident, and the
incident item is never filtered out (`mapFilters.ts:59`), so `filtered.items[0]` is always defined —
**only the first branch of the chain is ever taken.**

**Uncovered cases + mutation results:**

| Mutation | Result |
|---|---|
| drop `mapRef.current?.getCenter() ??` (leave `?? FALLBACK_CENTER`) | **MISSED** — 24/24 green |
| `if (!proximityCenter)` → always recompute the anchor | **MISSED** — 24/24 green |

Both are user-visible: the first means a case with no incident coordinates and no located locations
anchors its ring at a hard-coded Mississauga coordinate no matter where the visitor has panned (this is
precisely the substitution §72b argues for over the phone's static continent centre). The second means
long-pressing to place the ring, toggling proximity off, then on again silently snaps the ring back to
the first list item instead of keeping the visitor's chosen centre.

**Fix:** two tests in `describe('MapScreen — proximity')`:

```ts
it('anchors on the map centre when the case has nothing plottable', …)
   // mapData with no incident + no located locations; assert the ring's centre matches
   // mapInstance.getCenter()'s stub value, and that a mutation to FALLBACK_CENTER would differ
it('keeps a long-pressed centre when proximity is toggled off and back on', …)
   // long-press → toggle off → toggle on → the same location set survives
```

---

### [MEDIUM] Two phone-parity constants are asserted against themselves, so their values can drift silently

**Production code / tests:**

| Constant | Declared | Asserted at | Mutation | Result |
|---|---|---|---|---|
| `CLUSTER_EXPANSION_MAX_ZOOM` (20) | `mapCluster.ts:36` | `mapCluster.test.ts:116` — `expect(…zoom).toBe(CLUSTER_EXPANSION_MAX_ZOOM)` | 20 → 25 | **MISSED** |
| `RING_STEPS` (64) | `mapProximity.ts:21` | `mapProximity.test.ts:94` — `expect(coords).toHaveLength(RING_STEPS + 1)` | 64 → 32 | **MISSED** |

Both are ported phone values (`cluster-press-service.ts:42`, `proximity-service.ts:82`). The clamp is
the thing that stops "a very tight cluster rockets the camera to roof level" (the module's own comment);
the ring vertex count is what makes the polygon read as a circle at 5 km.

This is an *internal inconsistency*, not a house-style gap: the same two test files pin
`CLUSTER_RADIUS`/`CLUSTER_MAX_ZOOM` to the literals `50`/`14` (`mapCluster.test.ts:25-26`) and
`PROXIMITY_PRESETS`/`DEFAULT_PROXIMITY_RADIUS` to `[0.5, 1, 2, 5]`/`1` (`mapProximity.test.ts:63-64`).
`CLUSTER_EXPANSION_ZOOM_NUDGE` is also correctly pinned indirectly (11 → 11.5 at `mapCluster.test.ts:112`;
mutating it to 0.25 **CAUGHT** 2 tests).

**Fix:** extend the existing config-parity blocks with the literals —
`expect(CLUSTER_EXPANSION_MAX_ZOOM).toBe(20)` in `describe('mapCluster — config parity')`, and
`expect(RING_STEPS).toBe(64)` in `describe('mapProximity — presets')`.

---

### [MEDIUM] The case-switch reset effect has 7 statements; 4 can be deleted with the suite green

**Production code:** `MapScreen.tsx:145-152` (the effect at `:140-153`).
**Tests:** `MapScreen.test.tsx:368-380` — the only case-switch test; it asserts the search input clears,
the proximity toggle label reverts, and the Clear pill loses its badge (i.e. `setFilters` + `setProximityActive`).

**Uncovered cases + mutation results:**

| Mutation | Result |
|---|---|
| delete `setCameraShownIds(new Set())` (`:149`) | **MISSED** — 24/24 green |
| delete `setSelectedId(null)` + `setSheetMode('list')` + `setSnapIndex(0)` (`:150-152`) | **MISSED** — 24/24 green |

Being honest about severity: two of the four are *masked* rather than untested —
`cameraShownIds` is keyed by location id and `selectedItem` falls back through
`display.items.find(…) ?? null` (`MapScreen.tsx:173`), so a new case's ids simply never match. The one
with a real user-visible consequence is `setSnapIndex(0)`: without it the bottom sheet stays at the
expanded detent after a case switch, showing the new case's list at the old case's height.

**Fix:** extend the existing case-switch test with a detent + selection assertion — select a location
(which drives `snapIndex` to ≥ 1 via `:192`), switch `viewerCaseId`, and assert the sheet is back at its
collapsed detent and no detail card is mounted.

---

### [MEDIUM] No canonical `SheetItem` / `MapData` factory — this diff hand-edits five inline fixture sites and adds two more

Adding one field (`cameras`) to `LocationSheetItem` (`mapData.ts:67`) required touching, by hand:

- `__tests__/LocationDetailCard.test.tsx:10` (inline `fullLoc` literal)
- `__tests__/LocationRow.test.tsx:10` (inline `locItem` literal)
- `__tests__/MapBottomSheet.test.tsx:8` (inline literal inside an array)

and the two **new** suites each hand-rolled their own builders rather than sharing one:

- `__tests__/mapFilters.test.ts:14-38` (`loc`) and `:51-59` (`data`)
- `__tests__/mapProximity.test.ts:13-32` (`loc`), `:34-43` (`incident`), `:50-59` (`data`)

That is five near-identical `LocationSheetItem` shapes and two near-identical `MapData` builders. The
repo already establishes the counter-pattern (`engine/store/__tests__/test-utils.ts`,
`ui/__tests__/test-utils.tsx`, `ui/inputs/__tests__/test-utils.ts`), and `features/demo/CLAUDE.md`'s own
guidance treats drift of this kind as the maintenance landmine it is.

**Why it matters:** the next field added to `LocationSheetItem` is a seven-file change again, and each
inline literal that happens to still satisfy the shape silently stops representing production data.

**Fix:** add `features/demo/ui/screens/map/__tests__/test-utils.ts` exporting `sheetLocation(overrides)`,
`sheetIncident(overrides)`, `cameraMarker(overrides)` and `mapDataFrom(items)`; fold the five sites into
it. (Doing this at fix time is cheap — every call site is already an object spread.)

---

### [LOW] Fake-timer teardown is not exception-safe (4 sites)

`MapCanvas.test.tsx:250`, `:262`, `:276` and `MapScreen.test.tsx:283` call
`vi.useFakeTimers({ shouldAdvanceTime: true })` in the test body and `vi.useRealTimers()` as the last
statement, with no `try/finally` and no `afterEach` safety net. If any assertion before that last line
throws, fake timers leak into the rest of the file. Blast radius today is small (the next long-press test
re-installs them; the suite's `waitFor` calls survive `shouldAdvanceTime`), which is why this is LOW —
but the `MapCanvas — loading + error states` block that follows depends on real `setTimeout`
(`COVER_FAILSAFE_MS`, `COVER_FADE_DURATION_MS`).

**Fix:** move teardown to a file-level `afterEach(() => vi.useRealTimers())`.

---

### [LOW] Three defensive arms in `MapCanvas` are uncovered

v8 reports `MapCanvas.tsx` **161, 170, 322** uncovered (after the HIGH #1 fix, that is the complete set):

- `:161` — `viewportBbox`'s `catch` (a map whose `getBounds()` throws → degrade to the world bbox, i.e. "cluster everything" rather than "plot nothing")
- `:170` — `currentZoom`'s `catch` → `DEFAULT_ZOOM`
- `:322` — the cluster-expansion `onError` breadcrumb (`console.warn('[demo/map] cluster expansion failed:', …)`)

`mapCluster.test.ts:129-160` covers `expandCluster`'s error contract at unit level, so `:322` is only the
wiring. Each is a two-line addition (`mapInstance.getBounds.mockImplementationOnce(() => { throw … })`).

---

### [LOW] Four unpinned arithmetic details in `mapCluster`

Mutation sweep misses, all low-consequence at demo scale, recorded so they are not re-derived:

| Mutation | Result | Note |
|---|---|---|
| `markersFor`'s `Math.round(zoom)` → `Math.floor` (`mapCluster.ts:110`) | MISSED | tests use integer zooms only |
| `markersFor`'s non-finite-zoom → `0` fallback (`:110`) | untested | no test passes `NaN` zoom |
| `abbreviateCount`'s `Math.round(thousands*10)/10` → `Math.floor` (`:78`) | MISSED | no fixture between the `.05` rounding boundaries; also unreachable at demo scale |
| `normalizeBbox`'s `e - w >= 360` → `> 360` (`:87`) | MISSED | the fixture spans 400°, so the boundary itself is untested |

Worth one `it.each` in `describe('mapCluster — bbox normalisation')` / `— badge sizing + label` if the
block is touched; not worth a round on its own.

---

### [LOW] `MapScreen.test`'s `beforeEach` clears 3 of the 13 map-stub spies

`MapScreen.test.tsx:63-65` clears only `flyTo`, `addSource`, `removeSource`. `fitBounds`, `setCenter`,
`setZoom`, `unproject`, `remove`, `addLayer`, `removeLayer`, `getLayer`, `on` and `getCenter` accumulate
calls across all 24 tests on a shared singleton. No current assertion reads them, so this is latent —
but the first test that asserts a `fitBounds` call count will inherit a poisoned baseline.
**Fix:** mirror `MapCanvas.test.tsx:66`'s `Object.values(mapInstance).forEach((fn) => fn.mockClear?.())`
(plus the default-`on` re-install from HIGH #1).

---

### [LOW] No test pins camera-callout state across a re-plot

`renderMarkers` (`MapCanvas.tsx:288`) removes and rebuilds every marker on each `moveend`. The camera
callout's open/closed state lives in the DOM element (`markerElements.ts:150-156`), so panning the map
silently closes an open callout. `markerElements.test.ts:79-89` pins the toggle in isolation and
`MapCanvas.test.tsx:202-210` pins it at canvas level, but neither covers what a `moveend` does to it —
so whichever behaviour the web lane decides is correct, no test currently holds it.

---

## Verified-good (do not re-flag; recorded so a fix round does not undo them)

- **Cameras-toggle re-fit pin is genuine.** Re-adding `renderMarkers` to the index/fit effect deps
  (`MapCanvas.tsx:338`) reddens exactly `MapCanvas.test.tsx:191` (`called 1 times, but got 2 times`).
- **The "N of M" semantics claim is genuinely pinned.** Making `locationCount` the pre-filter count
  (so a status filter alone would read "1 of 3") reddens `MapScreen.test.tsx:295` ("stacks with the
  status filter"). The phone-verbatim rule is protected.
- **The incident asymmetry (exempt from status/text, subject to proximity) is pinned in both
  directions** — `mapFilters.test.ts:87/100/119` and `mapProximity.test.ts:75`, both confirmed by
  mutation.
- **`markerElements` XSS escaping and `stopPropagation` are real pins** — removing `event.stopPropagation()`
  reddens `markerElements.test.ts:91`; the escaping test at `:114` asserts on the parsed DOM, not the string.
- **The proximity-ring source lifecycle is meaningfully modelled.** The stub's `sources`/`layers` Maps are
  genuinely stateful, so `MapCanvas.test.tsx:227` (setData vs re-add) and `:236` (teardown order) exercise
  the real `getSource`/`getLayer` guards rather than tautologies.
- **`mapTokens` step expressions are two-sided** — `>=` → `>` on both `clusterRadiusFor` and
  `clusterFontSizeFor` is CAUGHT.
- **Determinism is clean.** No `Date.now()` / `Math.random()` anywhere in the new tests; the store
  fixtures use the engine's monotonic ids; no `act()` warnings across the map suite.

## Observations (not findings)

- **Coverage boundary.** All five new pure modules (`mapCluster`, `mapFilters`, `mapProximity`,
  `mapTokens`, `markerElements`) landed in `features/demo/ui/**`, outside the 80 % gate. Two of them
  (`mapCluster`, `mapProximity`) have a hard reason — they carry `supercluster`/`@turf/*` and must stay
  behind `MapCanvas`/`MapScreen`'s dynamic imports; the other three follow the `mapData.ts` /
  `screenData.ts` precedent that `features/demo/CLAUDE.md` explicitly sanctions. Measured against the
  gate's thresholds anyway, the directory scores **96.68 / 89.85 / 95.95 / 98.71** — comfortably clear.
  No action; recorded so a later round does not re-litigate it from first principles.
- **The `getZoom`-pinned-to-16 pattern** (`MapScreen.test.tsx:67`) is sound, not fragile: it is
  re-established every `beforeEach` (no leak), it is documented in-line, and `CLUSTER_MAX_ZOOM`'s value
  is independently pinned to the literal `14` at `mapCluster.test.ts:26`, so a change to either side
  fails loudly rather than silently. Its only consequence is that `MapScreen` never exercises the cluster
  path — which `MapCanvas.test.tsx:139-179` covers directly. Acceptable.

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 5 |

Behaviorally meaningful coverage: **adequate** — the pure modules are genuinely behavioural (9/13 real
mutations caught, incident asymmetry and "N of M" both pinned in both directions), but the `MapCanvas`
component surface has one false-coverage trap, one unpinned claimed-caught defect, and one unpinned
coordinate conversion.
Engine coverage gate (80 % on `lib/**` + `engine/**`): **not applicable** — no `engine/`/`lib/` files
changed. Measured against `ui/screens/map/**` anyway: 96.68 / 89.85 / 95.95 / 98.71, clear.
Mock strategy: **at the IO edge** — `mapbox-gl` mocked with constructable non-arrow `Map`/`Marker`;
`supercluster` and `@turf/*` run for real; the store is real and injected. Correct on every axis.
Factory usage: **inline fixtures introduced** — five hand-rolled `LocationSheetItem` shapes, two
hand-rolled `MapData` builders, no shared map test-utils.
Setup-shim traps: **present** — `mapInstance.on.mockImplementation` leaks past `mockClear()` from
`MapCanvas.test.tsx:299`, silently disabling `ready` for every later test in the file (HIGH #1, MEDIUM #1).
Determinism (clock/entropy injected): **yes** — fake timers are used explicitly and advanced explicitly;
no real-clock dependence; no `Math.random()`.

**Verdict: REVISE**

---

# Fix-delta r1

**Diff reviewed:** `b0381b7..fcfe774` (P6 fix round 1, 19 commits + merge)
**Mode:** fix-delta — every r0 finding re-verified by re-running its original mutation against the merged head.
**Method:** 30 mutations applied to production code and reverted, scoped to an explicit target list of
13 map test files (212 tests) so concurrent lanes' untracked scratch suites in the same `__tests__/`
directory could not contaminate counts. Baseline for that set: **212/212 green**. Tree left clean.

## r0 disposition

| r0 finding | Commit | Original mutation, re-run | Disposition |
|---|---|---|---|
| **HIGH-1** transient-tile test cannot fail | R-8 `0ce33ea` | delete the whole after-load arm (`MapCanvas.tsx:336-345`) → **4 tests RED** | **FIXED** |
| **HIGH-2** fresh-`[]` re-plot unpinned | R-9 `213d5dd` + R-4 `81c287d` | see note below | **FIXED** |
| **HIGH-3** long-press conversion unpinned | R-10 `25e4aad` + §79a | scale-divide deleted → **RED**; call-site bypassed → **GREEN** | **PARTIAL** → NEW-1 |
| **MED-1** `on`-mock order dependence | R-8 `0ce33ea` | remove `defaultOn` reinstall from `beforeEach` → **5 tests RED** | **FIXED + guarded** |
| **MED-2** one-sided long-press arms | R-21 `3cb5041` | 500→400 **RED** · 500→250 **RED** · slop 10→0 **RED** | **FIXED** |
| **MED-3** proximity anchor chain | R-18 `3281e44` | drop map-centre step **RED** · always re-derive **RED** · drop notice **RED** | **FIXED** |
| **MED-4** self-referential constants | R-22 `3cb5041` | `CLUSTER_EXPANSION_MAX_ZOOM` 20→25 **RED** · `RING_STEPS` 64→32 **RED** | **FIXED** |
| **MED-5** case-switch reset 4-of-7 unpinned | R-23 `3cb5041` | delete `setSnapIndex(0)` **RED** · delete `setSelectedId`+`setSheetMode` **RED** · delete `setCameraShownIds` **GREEN** | **FIXED** (consequential half; residual accepted, see L-2) |
| **MED-6** no fixture factory | R-24 `3cb5041` | n/a — zero `LocationSheetItem` literals remain outside `test-utils.ts` | **FIXED** |
| **LOW-1** fake-timer teardown | R-8 `0ce33ea` | file-level `afterEach(vi.useRealTimers)` in both map suites | **FIXED** |
| **LOW-2** uncovered defensive arms | R-27 `93044be` | `viewportBbox`/`currentZoom` catches now covered; `onError` wiring still **GREEN** under deletion | **MOSTLY FIXED** → L-1 |
| **LOW-3** cluster arithmetic | R-27 `93044be` | `Math.round`→`floor` **RED** · NaN-zoom→22 **RED** · `abbreviateCount` round→floor **GREEN** · `normalizeBbox` `>=`→`>` **GREEN** | **MOSTLY FIXED** → L-3 |
| **LOW-4** `MapScreen.test` cleared 3 of 13 stubs | R-26c `0ce33ea` | now `Object.values(...).mockClear?.()` + `on` reinstall | **FIXED** |
| **LOW-5** camera callout across a re-plot | R-4 `81c287d` | re-plot cameras on `moveend` → **2 tests RED** (incl. `MapCanvas.test.tsx:287`) | **FIXED** |

**HIGH-2 note (verification claim no longer reproduces — behaviour is nonetheless correct).**
`213d5dd`'s message states "restoring the `= []` defaults reddens it". At the merged head it does not:
reverting `cameras = NO_CAMERAS` alone, `markers = NO_MARKERS` alone, or both, all leave 212/212 green.
That is **not** a weak pin — it is R-4 (`81c287d`, which landed *after* R-9) having closed the root cause
structurally: splitting pins and cameras into separate effects/refs removed the coupling by which an
unstable `cameras` default churned the *pins*. Post-split, an absent prop means an empty list means zero
marker work, so both constants are now inert belt-and-braces. The pin itself is genuinely sensitive —
restoring the pre-R-4 coupling (`renderPins` deps back to `[markers, cameras]` + `cameras = []`) reddens
`MapCanvas.test.tsx:158` and nothing else. Recorded as **L-4** so the next reader does not re-derive it.

**HIGH-3 answer to the delta question — "does it exercise a non-identity scale, or would `getScaledPoint`'s
deletion survive?"** Both halves, separately:
- The **unit** test (`MapCanvas.test.tsx:384`) *does* exercise a non-identity scale (`width: 189` painted /
  `offsetWidth: 378` laid out → factor 2). Replacing `scaling` with a literal `1` reddens it. **The formula
  is pinned.**
- The **integration** test (`MapCanvas.test.tsx:367`) stubs `width: 378` / `offsetWidth: 378` → factor **1**.
  So the *wiring* is only asserted at identity, and the call site can revert to the pre-§79a raw
  subtraction with the whole suite green. See NEW-1.

## New findings

### [MEDIUM] NEW-1 — §79a's scale fix can be reverted at the call site with the suite green

**Production code:** `features/demo/ui/screens/map/MapCanvas.tsx:572` — `const point = toContainerPoint(container, event.clientX, event.clientY)`
**Tests covering it:** `MapCanvas.test.tsx:367-382` (integration, identity scale) and `:384-398` (unit, scaled)

**Uncovered case:** `onPointerDown` stops calling `toContainerPoint` and inlines
`[clientX - rect.left, clientY - rect.top]` — i.e. exactly the pre-§79a code the fix round replaced.

**Proof:** mutating `:572` to the raw subtraction leaves **212/212 green**. The unit test still passes
(it calls the exported function directly); the integration test still passes (its stubbed rect is
identity-scaled, so both formulas agree).

**Why it matters:** §79a is flagged in the ledger as *new, unreviewed production behaviour* — the one
place in this diff most likely to be touched again — and it is the difference between a long-press ring
landing under the finger and landing progressively short of it on every viewport that scales the phone
frame (i.e. most of them). The formula has a pin; its use does not.

**Fix (verified):** change one stub in the integration test so it is non-identity, and the expectation
with it — `width: 189` (painted) against `offsetWidth: 378` (laid out), asserting
`expect(mapInstance.unproject).toHaveBeenCalledWith([200, 200])`. Verified: clean code stays **212/212
green**, and the call-site bypass goes **RED on exactly that test**. No new test file needed.

### [MEDIUM] NEW-2 — the two `DemoExperience` sibling mapbox-gl mocks are still broken; they ride, latent

**Tests:** `features/demo/ui/__tests__/DemoExperience.map.test.tsx:13-15` and
`features/demo/ui/__tests__/DemoExperience.incident-edit.test.tsx:13-15`
**Production code they claim to exercise:** `MapCanvas.tsx:390-408` / `:429-438` (`new Marker(...).setLngLat(...).addTo(...)`)

Neither file was touched by the fix round (R-24's `test-utils.ts` is a `SheetItem`/`MapData` fixture
factory — unrelated to the mapbox stubs). Both still declare `Marker: vi.fn()`, which is **not
constructable-chainable**: `new Marker({...})` yields a bare object with no `setLngLat`, so the first
plotted pin would throw `TypeError: ….setLngLat is not a function`. Their shared `mapInstance` also
omits eight methods the current `MapCanvas` reaches for (`getBounds`, `getZoom`, `getCenter`,
`unproject`, `addSource`/`getSource`/`removeSource`, `addLayer`/`getLayer`/`removeLayer`) — the optional-call
guards absorb the reads, but nothing absorbs the `Marker` chain.

**Proof:** replacing `Marker: vi.fn()` with a constructor that throws on construction leaves both suites
**15/15 green** — the mock is never constructed. Cause: every test in those two files is fully
synchronous (`fireEvent.click` → immediate assert, no `await`/`waitFor`), so `MapCanvas`'s
`await import('mapbox-gl')` never resolves inside the test body and the map never boots.

**Why it matters, two ways:** (a) those 15 tests assert Map-tab/incident-edit wiring against a canvas
that never initialises — fine for what they claim, but worth knowing; (b) it is a live booby-trap: the
first `await`/`waitFor`/`findBy*` any author adds to either file turns green tests red with a
`setLngLat` TypeError that reads as a production bug. The three map-directory suites all use the correct
chainable form (`MapCanvas.test.tsx:44-53`, `MapScreen.test.tsx:29-34`,
`MapScreen.proximity-chunk.test.tsx:28-32`), so this is now the only inconsistent corner.

**Fix:** lift the chainable `Marker` stub and the full `mapInstance` shape into a shared helper (natural
home: `features/demo/ui/screens/map/__tests__/test-utils.ts`, which R-24 already created) and have both
`DemoExperience.*` suites import it. Two-line change per file; no behaviour change to the 15 tests.

### [LOW] L-1 — the cluster-expansion `onError` wiring is still unpinned

`MapCanvas.tsx:418` (`onError: (error) => console.warn('[demo/map] cluster expansion failed:', error)`)
is the only line v8 still reports uncovered for that file, and deleting it leaves 212/212 green.
`mapCluster.test.ts` pins `expandCluster`'s error contract at unit level, so this is the wiring only.
One `mapInstance`-level test (make `expansionZoom` throw, assert the breadcrumb) closes it.

### [LOW] L-2 — `setCameraShownIds(new Set())` in the case-switch reset remains deletable

Unchanged from r0 and consistent with what r0 said: masked by location-id scoping (a new case's ids
never match the retained set), so no user-visible consequence. R-23 correctly targeted the one statement
that *does* have one. Recorded as accepted, not re-filed.

### [LOW] L-3 — two immaterial arithmetic details still unpinned in `mapCluster`

`abbreviateCount`'s `Math.round(thousands*10)/10` → `Math.floor` and `normalizeBbox`'s `e - w >= 360` →
`> 360` both survive (212/212 green). Unreachable at demo scale (a case never reaches 1000 clustered
pins) and a pure boundary respectively. R-27 closed the two that mattered (`Math.round(zoom)`, the
NaN-zoom fallback), both now caught.

### [LOW] L-4 — `213d5dd`'s stated mutation verification no longer reproduces at the merged head

See the HIGH-2 note above. The commit message asserts a mutation result that R-4 subsequently made
un-reproducible. Behaviour is correct and the pin is sound; only the message is now misleading to
someone re-verifying it. Worth one line in the disposition report rather than a code change.

## Also verified good in this round (do not undo)

- **R-4's split is pinned in both directions** — re-plotting cameras on `moveend` reddens
  `MapCanvas.test.tsx:287` ("an open callout SURVIVES a map move") *and* the clustering re-plot test.
- **R-5's new long-press guards are pinned** — dropping `isPrimary` reddens `:414`; dropping the
  `[data-marker-id], .mapboxgl-ctrl` target guard reddens `:426` and its attribution sibling.
- **R-25's `normalizeBbox` narrowing kept its non-finite guard pinned** — deleting the guard reddens
  `mapCluster.test.ts`. The clamp removal did not leave a hole.
- **`MapScreen.proximity-chunk.test.tsx` is a strong new suite** — own file (so the rejecting module mock
  can't leak), chainable `Marker`, positive breadcrumb assertions, and a re-attempt test whose
  discriminator (`warn` called **twice**) genuinely distinguishes a re-import from a parked rejected
  promise. No findings.
- **The leak repair is itself guarded** — `MapCanvas.test.tsx:569` ("a plain mount still plots") reddens
  if the `defaultOn` reinstall is removed from `beforeEach`.

## Fix-delta Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |

r0 findings: **14 raised · 12 FIXED · 1 FIXED-with-note (HIGH-2) · 1 PARTIAL (HIGH-3 → NEW-1)**.
Coverage on the scoped set: `MapCanvas.tsx` **95.12 / 87.14 / 94.64 / 99.57** (uncovered: line 418 only,
down from 161/170/257-258/322); `mapCluster.ts` 100 % lines.
Behaviorally meaningful coverage: **strong** — 24 of 30 delta mutations caught; every miss is either an
inert constant, an immaterial boundary, or NEW-1/L-1.
Mock strategy: **at the IO edge**, and now consistent across the three map suites — the two
`DemoExperience.*` siblings are the sole holdout (NEW-2).
Factory usage: **canonical** — `map/__tests__/test-utils.ts` with derived `mapDataFrom`; no inline
`LocationSheetItem` literals remain.
Setup-shim traps: **none** — the `on`-implementation leak is repaired and guarded.
Determinism: **yes** — file-level `afterEach(vi.useRealTimers)` in both map suites; no real-clock use.

**Verdict: APPROVE with comments** (no HIGH remains open; NEW-1 is a one-stub change with a verified
fix shape, NEW-2 is a latent trap in two files this diff did not touch).
