# P6 review — Round 1 VETTED (aggregated)

**PR:** #35 · `master..feat/parity-p6` · lanes reviewed at `945cebc`
**Aggregator:** Fable (P6 review aggregator) · **Mode:** initial
**Inputs:** the five lane files in this directory · PR #35 body (deliberate choices honoured, incl. the settled supercluster refutation) · `docs/code-reviews/deferred.md` §72a–e
**Baseline re-verified in this worktree:** 225 files / 2688 tests green · `tsc --noEmit` clean · tree left clean (every probe reverted, scratch files deleted)

---

## Verdict: REVISE — 0 blockers · 11 majors · 14 minors · 2 nit bundles (12 items)

**Dedupe:** 52 raw lane findings (typescript 7 · web 9 · tests 14 · silent-failures 7 · type-design 15) → **27 vetted findings** (R-1…R-27) + 2 recorded-no-action + 1 struck edge. Every lane item is accounted for exactly once (merge map noted per finding).

**Demo-merits blocker ruling: none.** The strongest candidates were weighed explicitly:
- R-1 (camera yank) degrades a working feature on the happy path every session, but every surface stays reachable and nothing lies about case data — major, not blocker.
- R-2/R-3 (chunk-failure ladders) violate the honesty rule and one is permanent-per-session, but both require adverse network/deploy timing to trigger; the demo's default walkthrough never hits them — major.
- R-6 (filter-empty presented as data-empty) makes a false statement about the visitor's data, but only after a zero-match filter and it is recoverable via Clear — major.
Nothing breaks the demo's core walkthrough unconditionally, so nothing merits blocker.

**Empirical adjudication performed by this aggregator** (all edits reverted, tree verified clean):

| Probe | Result |
|---|---|
| Tests HIGH-1: delete the `readyRef` transient-error guard (`MapCanvas.tsx:256-259`) | **26/26 green — vacuous test CONFIRMED** |
| Tests HIGH-1 fix shape: apply both fix halves, re-delete guard | **transient test RED**; guard restored + fix kept → 26/26 green. **Fix-shape claim fully verified** |
| Tests HIGH-2: revert `markers = NO_MARKERS, cameras = NO_CAMERAS` to `= []` | **50/50 green (MapCanvas + MapScreen) — missing pin CONFIRMED** |
| S-2 repro: `mapProximity` import mocked to reject, 3-location case, toggle proximity | **All defect assertions pass**: toggle "Proximity ON" / `aria-pressed="true"` / radius presets render; badge stays "3 locations" (never "N of 3"); zero `addSource` calls (no ring); off→on re-toggle **never re-attempts the import**; zero `console.warn` breadcrumbs; unhandled rejection emitted |

Code adjudication: every merged finding below was checked against the branch source before merging (fit effect `MapCanvas.tsx:332-338` keys on `markers` identity fed from post-proximity `display`; `loadProximity` memoises with no catch; `handleLongPress` activates unconditionally; `onPointerDown` inspects neither `event.target` nor `event.isPrimary`).

---

## MAJOR findings

### R-1 [major] The camera-fit effect has the wrong input AND the wrong trigger — the camera is yanked on every search keystroke, on proximity activation, and on every radius preset tap

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:332-338` (the index+fit effect) · fed from `features/demo/ui/screens/map/MapScreen.tsx:156-164` (`display`-derived `markers`)
**Lanes:** typescript HIGH-1 + web W-1 (merged) · **Owner:** P6.1 author

One finding, two named sub-defects in the same effect — **merged deliberately** because fixing either alone leaves the other's failure mode live, and the correct fix is one restructure:

- **(a) Wrong fit input.** The fit consumes `buildMarkers(display)` where `display = proximityResult?.data ?? filtered` — the **post-proximity** set. Dropping a proximity ring (long-press or toggle) or tapping a radius preset shrinks the marker set and re-fits the camera away from the point the visitor just pressed; a single survivor triggers the `setCenter` + `setZoom(15)` teleport. The phone deliberately splits this: `useMapData` derives `cameraBounds` from the **status/text-filtered** set only; proximity narrows `displayCollection`, which never feeds the `Camera` props (`MapHost.tsx:255-256`, `:492-493`). TS-lane probe: proximity toggle → fitBounds 1→2; preset tap → 2→3.
- **(b) Wrong fit trigger.** The effect keys on the **identity** of `markers`. Every search keystroke mints a new `filters` → new `MapData` → new array, so the camera snaps back to the overview fit **even when the surviving set is byte-identical**, discarding the visitor's `flyTo`/pan mid-typing. Web-lane repro (run at `44d54b3`): keystroke with identical survivors → fitBounds 1→2→3. The phone's declarative `Camera bounds` only moves on **value** change.

Why one finding: value-keying alone still re-fits on proximity narrowing (the survivor set genuinely changes); input-swapping alone still re-fits on identity-fresh-but-value-identical filter results. Both sub-fixes land in one commit or the defect persists.

This is the unfixed sibling of the cameras-toggle re-fit the PR fixed in-commit and pinned (`MapCanvas.test.tsx:191-199`) — same defect class, and §72 does not record it as a choice.

**Fix shape:** split the effect into (1) index rebuild keyed on `markers` (must stay fresh — clustering reflects what is plotted) and (2) camera fit driven by a **pre-proximity, value-keyed** point set — e.g. `MapScreen` memoizes `fitPoints` off `filtered` (not `display`), and `MapCanvas` keys the fit effect on a value key of those points (sorted `lng,lat` join or equivalent). Extend the existing "never re-fits when only the camera markers change" test with: never re-fits on proximity activation/radius change; never re-fits when a filter change leaves the point set value-identical.

---

### R-2 [major] A failed proximity chunk is an unhandled rejection, the memoised rejected promise disables the feature for the session, and the control lies "Proximity ON"

**File:** `features/demo/ui/screens/map/MapScreen.tsx:121-129` (`loadProximity`), fire-and-forget `void` call sites `:239`, `:251`; dead state gated at `:158-161`
**Lanes:** typescript HIGH-2 + silent-failures S-2 + web W-6 first half (merged) · **Owner:** P6.1 author

**Empirically confirmed by this aggregator** (probe table above). If the turf chunk fails to fetch (post-redeploy `ChunkLoadError` — this chunk loads on first activation, so it is *more* exposed to a mid-session redeploy than the map's; offline blip; blocking proxy): (1) unhandled promise rejection; (2) the rejected promise stays in `proximityLoadRef.current`, so the `if (!proximityLoadRef.current)` guard short-circuits **forever** — off→on never retries (probe: zero re-import attempts); (3) `setProximityActive(true)` ran unconditionally, so the pill reads **Proximity ON**, `aria-pressed="true"`, all four radius presets render and respond — while nothing filters, no ring draws, and nothing is logged. A visitor pressing 1 km and seeing all locations survive concludes everything is within 1 km — a false statement about their data.

In-repo precedent is explicit both ways: `ocr-recognize.ts:76-80` documents *"a boot that failed must not poison every later attempt with the same rejection"* and nulls its memoised loader on failure; §49a/R-9 forbid a control asserting what it cannot do.

**Fix shape:** `.catch` on the import chain that (a) nulls `proximityLoadRef.current` so the next press re-attempts, (b) `setProximityActive(false)`, (c) surfaces it — `setNotice(...)` via the already-wired `DemoNotification` plus a `console.warn` breadcrumb. Add the un-poisoning regression test (the S-2 probe in this doc is a ready template: assert re-toggle triggers a fresh import attempt).

---

### R-3 [major] A failed `mapbox-gl` / `mapCluster` chunk bypasses the new error overlay entirely — blank rectangle, no message, no Retry, no breadcrumb

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:225-266` (un-caught async IIFE) · `:383-386` (failsafe completes the swallow) · `:456` (overlay gated on `failed`)
**Lanes:** typescript MEDIUM-1 + silent-failures S-1 + web W-6 second half (merged) · **Owner:** P6.1 author

Same LADDER as R-2, **distinct site, distinct fix path — kept separate deliberately.** `failed` is set only from `map.on('error')`, which requires the `Map` instance to exist. If either dynamic import rejects — or the `Map` constructor throws synchronously (mapbox-gl 3.25 throws on a malformed token) — the IIFE rejects unhandled, `'load'` never fires, and the 4 s failsafe reveals the cover onto an empty `<div data-map-canvas>`: the visitor gets a dark rectangle with the controls and sheet floating on it, visually indistinguishable from "very dark tiles". The overlay + Retry this PR added to make map failure honest never render, and the 1.80 MB mapbox-gl chunk is the single most likely thing on this screen to fail to download. S-lane repro confirmed: no overlay, no retry, no placeholder, cover unmounts, zero warn/error calls, vitest reports the unhandled rejection. The bare `void (async …)()` predates the diff; the overlay that makes the gap material is new.

**Fix shape:** `.catch` the IIFE (or try/catch the `await`): narrow `err instanceof Error ? err : new Error(String(err))`, `console.warn` breadcrumb, `if (mounted) setFailed(true)`. Retry already bumps `attempt` and re-runs the effect, and webpack re-attempts a failed chunk on the next `import()`, so Retry becomes a genuine recovery. Optional: distinct copy for "the map engine couldn't load" vs. the style/tile failure.

---

### R-4 [major] Every `moveend` destroys and rebuilds the camera markers, wiping an open callout and silently resetting its `aria-expanded`

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:263-265, 288, 308-312` · `features/demo/ui/screens/map/markerElements.ts:150-156`
**Lanes:** typescript MEDIUM-2 + web W-2 (merged) + tests LOW-5 folded in as the test obligation · **Owner:** P6.1 author

Camera-callout open/closed state lives in the DOM element (`callout.style.display`, `aria-expanded`), and `renderMarkers` removes and recreates **all** markers on every `moveend` — cameras included, though they never cluster and nothing about them depends on the viewport. Tap a camera to read its name/6-dp coordinates → nudge the map one drag (or let the `flyTo` that `selectItem` fires settle) → the bubble vanishes and `aria-expanded` flips to `false` unannounced. Both lanes probed it independently (`sameElement: false, display: "none"` after `moveend`). The phone holds `showCallout` in React state and memoises camera markers on toggle/selection, explicitly **not** on camera moves (`CaseMapView.tsx:386-393`). §72a discloses the re-plot cost for pins; it does not disclose the callout reset.

**Fix shape:** split camera plotting out of `renderMarkers` into its own effect keyed `[ready, cameras]`, with the marker objects in a separate ref (secondary win: halves the double-plot a data change currently causes). Add the callout-survives-`moveend` test (tests lane LOW-5: no test currently holds either behaviour).

---

### R-5 [major] §72e RULED — the marker/chrome long-press edge is real, understated, and not touch-only: a 500 ms mouse hold on a pin (or mapbox's attribution) ACTIVATES proximity; the pinch edge is struck as safe

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:406-430` (`onPointerDown`/`onPointerMove`) · `features/demo/ui/screens/map/MapScreen.tsx:249-256` (`handleLongPress`)
**Lanes:** web W-5 + silent-failures S-5 (merged) + typescript lane's `isPrimary` nit folded in · **Owner:** P6.1 author · **Ledger obligation: amend §72e**

Ruling: **new evidence defeats §72e's filed framing** on the marker edge, on three counts, each verified against source:

1. **Activation, not re-centre.** §72e says "a long hold on a pin both selects it and moves the ring". True only when proximity is already on. When it is off (the default), `handleLongPress` unconditionally `setProximityActive(true)` — every other location and the incident drop off the map **and** out of the sheet at the 1 km default, centred on a point the visitor never chose. If nothing survives, the sheet falls into R-6's false copy. Recovery requires spotting the Proximity ON pill.
2. **Not touch-only.** Pointer events fire for mouse. A press-and-hold left button on a pin — a normal "click while reading" — triggers it on the desktop path the demo is primarily viewed on. §72e's own trigger ("a review finding either behaviour on a touch device") is met and exceeded.
3. **Mapbox chrome is inside the container.** `Marker.addTo` appends into `map.getCanvasContainer()` (verified in installed mapbox-gl), and the attribution control is a descendant too — a hold on "Improve this map" activates proximity. Nothing in `onPointerDown` inspects `event.target` or `event.isPrimary` (verified in source).

**Pinch edge STRUCK** (§72e's other disclosure): `pressOrigin` is a single shared ref and every `pointerdown` cancels-then-re-arms from the newest contact, so in a pinch, finger 1's first `pointermove` is compared against finger 2's origin — two fingers on a 378 px surface are essentially never within the 10 px slop, so the timer cancels immediately. The cross-pointer comparison that looks like a bug is what makes the pinch safe. §72e's disclosure was over-cautious; no change needed.

**Fix shape (both guards, ~3 lines total):** at the top of `onPointerDown`: (a) `if (!event.isPrimary) { cancelLongPress(); return }` (kills any residual multi-touch path outright); (b) `const target = event.target as Element | null; if (target?.closest?.('[data-marker-id], .mapboxgl-ctrl')) return` — `data-marker-id` is already on every element `markerElements.ts` produces, so no new plumbing. **Then amend §72e:** consequence is activation (not re-centre), the edge is mouse-reachable, and the pinch analysis above is recorded as safe.

---

### R-6 [major] A filter that matches nothing tells the visitor they have no located locations — and suppresses the "0 of 3" badge that would contradict it

**File:** `features/demo/ui/screens/map/MapScreen.tsx:307` (filtered `display.items` into the sheet) · `features/demo/ui/screens/map/LocationList.tsx:19-21` (data-absent copy) · `features/demo/ui/screens/map/MapControls.tsx:175-179` (`locationCount > 0` gate)
**Lanes:** silent-failures S-3 (standalone; shares the pill gate with R-7's fix — same commit) · **Owner:** P6.1 author

Any zero-match search/status filter (on a case with no incident coordinates — the common case) or any emptying proximity radius (on **any** case — the incident is deliberately not radius-exempt) drops the sheet into "No located locations yet — add an address to a location to plot it here." The visitor has three geocoded locations; the app says they have none and prescribes an action that won't bring the rows back. Aggravations, both new in this diff: the count badge — the one control that could say "0 of 3" — is gated off exactly at 0; and in the proximity case the badge (when `locationCount` is still 3) and the sheet openly contradict each other. S-lane repro confirmed all three paths. (The phone's gate is verbatim, but the phone has *no* empty-state copy at all — blank list, not a false sentence. The false sentence is demo-only.)

**Fix shape:** pass a discriminated empty-reason down (`'none' | 'filters' | 'proximity'` — `MapScreen` already has both facts in scope), one sentence each with a Clear affordance for the filter case, `never`-guarded switch; and let the badge render `0 of M` when `M > 0` — a deliberate, recorded divergence from the phone's `> 0` gate, justified by the demo having empty-state copy the phone lacks. Lands with R-7 (same pill).

---

### R-7 [major] The filter result count is visual-only — no live region, and the zero-match case removes the pill entirely; cluster bubbles announce `role="button"` but are unreachable and un-activatable by keyboard

Two a11y singles from the web lane, kept as one vetted entry with two independent fixes because a fix round will touch them together; they are **not** duplicates of each other.

**(a) Count pill — WCAG 4.1.3 Status Messages (AA).** `MapControls.tsx:175-179`. "N of M locations" is the only feedback the filter/search/proximity controls give and it is announced to nobody; the `locationCount > 0` gate deletes it exactly when the answer is "nothing matched". The repo's own standard is established (eleven `role="status"` uses; R-9 "the refusal, said out loud"; `MediaCaptureScreen.tsx:462-464` documents the one deliberate opt-out — an analysis this pill never got). **Fix:** `role="status"` on the pill + render unconditionally ("No locations match" at zero). Overlaps R-6's badge change — same lines, one commit.
**Lanes:** web W-4 · cross-links silent-failures S-3 (R-6).

**(b) Cluster bubbles — WCAG 2.1.1 Keyboard (A) + 4.1.2.** `markerElements.ts:48-72` sets `role="button"` + `aria-label="Cluster of N locations"` but no `tabindex` and no keydown on a `<div>`; mapbox only adds tab/key handling to markers with popups (verified in installed mapbox-gl). Sighted-keyboard and switch users can neither reach nor operate it, and below `CLUSTER_MAX_ZOOM` some locations are reachable on the map **only** through a cluster. Mitigation that keeps this below blocker: `LocationRow` is a real button and selecting a row flies past the cluster ceiling, so every location stays keyboard-reachable via the sheet. **Fix:** `el.tabIndex = 0` + Enter/Space keydown calling the click handler (the `switchKeyDown` idiom in `ui/screens/_shared.tsx`); for the bare-`div` pins, either plumb an `aria-label` (name not currently on `MarkerDescriptor`) with the same treatment, or `aria-hidden="true"` as the honest interim with the sheet as the declared keyboard path.
**Lanes:** web W-3 · **Owner:** P6.1 author

---

### R-8 [major] The transient-error guard is unprotected in both directions: its test cannot fail, and the mock leak that causes this silently disables `ready` for every test declared after the error block

**File (production, unprotected):** `MapCanvas.tsx:253-262` · **Files (tests):** `__tests__/MapCanvas.test.tsx:59-68` (beforeEach), `:299-303`/`:324-328` (leaking overrides), `:312-320` (the vacuous test)
**Lanes:** tests HIGH-1 + tests MEDIUM-1 (merged — same root, same fix) · **Owner:** P6.1 author

**Empirically confirmed twice over by this aggregator:** deleting the entire `if (readyRef.current) {…return}` guard — making one dropped tile blank the map behind the full-screen retry overlay — leaves 26/26 green. Two independent causes: (1) the preceding test's `mapInstance.on.mockImplementation` (never fires `'load'`) survives `beforeEach`'s `mockClear()`, so the transient test runs against a map that never loads and takes the wrong branch — and the same leak poisons every later test in the file (the file is green today only because the one subsequent describe doesn't depend on `ready`); (2) the negative `waitFor(...not.toBeInTheDocument())` is satisfied by its first synchronous check regardless of branch. **Fix-shape verified end-to-end:** with the default-`on` reinstall in `beforeEach` + the positive assertion `expect(warn).toHaveBeenCalledWith('[demo/map] mapbox reported a transient error after load:', expect.anything())`, the guard deletion goes RED and clean code stays green.

**Fix shape:** exactly those two halves (both required; `mockReset()` is not a substitute — it strips the default). Optionally a plain-mount-still-plots guard test at end of file so the leak cannot re-establish. Land the `MapScreen.test.tsx` beforeEach hygiene (R-27c) in the same commit.

---

### R-9 [major] The fresh-default-array re-plot defect — one of the two the PR body says its tests caught — has no regression pin

**File (production contract):** `MapCanvas.tsx:60-66` (`NO_MARKERS`/`NO_CAMERAS`), consumed `:184` · **Tests:** none cover it
**Lanes:** tests HIGH-2 · relates to R-1's effect but is a distinct test-gap · **Owner:** P6.1 author

**Empirically confirmed by this aggregator:** reverting to `{ markers = [], cameras = [] }` leaves MapCanvas + MapScreen **50/50 green**. The existing counts are `waitFor`-transient and the `elFor`/`liveMarkers` helpers filter to zero-`remove()` markers — structurally blind to churn. The tests lane measured 4 Marker constructions for a settled 2-pin mount under the defect (2 when fixed), and the churn is user-visible via R-4 (re-plot wipes callouts). The companion in-commit fix (cameras-toggle re-fit) IS genuinely pinned — verified by the tests lane via mutation; only this twin is missing.

**Fix shape:** settled-total assertion a re-plot cannot satisfy (mount with `cameras` omitted, flush the ready/reveal commits, `expect(MarkerMock).toHaveBeenCalledTimes(pins.length)` + zero `remove` calls) — the tests lane's draft is ready to lift.

---

### R-10 [major] The long-press coordinate conversion is unpinned — deleting the container-offset conversion leaves the whole map suite green

**File:** `MapCanvas.tsx:412-413` · **Tests:** `MapCanvas.test.tsx:249-259` asserts only the stub's constant
**Lanes:** tests HIGH-3 · **Owner:** P6.1 author

Lane-verified mutation (not re-run here; structurally certain — jsdom rects are all zeros, so the conversion is a no-op under test): mutating the point to raw `clientX/clientY` leaves 170/170 green. In production the container is **always** offset (phone frame inside a scaled page), so ring placement — the §72e feature itself — has zero test signal. **Fix shape:** stub `getBoundingClientRect` with a non-zero rect and assert `mapInstance.unproject` received the converted point (lane's draft is ready). **Carry-through note for the fix round:** `getBoundingClientRect()` returns the CSS-*scaled* rect while `unproject` expects unscaled container px — whether `usePhoneScale`'s transform must be divided out is a production question the new test should be written to surface; if it reveals a real offset under scale, file it as a new finding in the fix-delta.

---

### R-11 [major] Post-load `'error'` collapse: auth revocation, 401/403/429 and WebGL context loss are all logged as "transient" and Retry is withheld

**File:** `MapCanvas.tsx:248-262` (the after-load arm)
**Lanes:** silent-failures S-4 (elevated to major in the vetted merge: same handler as R-8's guard, and the lane proved the outcome — pins floating over a void with no message and no Retry) · **Owner:** P6.1 author

The guard's tile rationale is right and *incomplete about the event*: installed mapbox-gl 3.25 routes terminal conditions through the same post-load `'error'` — `_revokeAuth()` clears the GL buffers then fires the access-token ErrorEvent (its async session round-trip resolves after `'load'`, so it **always** lands in the ignored arm); `AJAXError` 429 (public token over free tier) / 403 (URL-restricted token on a new origin); WebGL context loss. S-lane repro: overlay absent, retry absent, two "transient" warns for a permanent auth revocation. Two causes with opposite remedies collapse to one outcome and one log line.

**Fix shape:** branch the after-load arm: escalate terminal causes — `(cause as { status?: number })?.status` in `{401, 403, 429}` or the mapbox access-token message — via `console.error` + `setFailed(true)`; keep warn-and-ignore for the rest, and reword the breadcrumb to "ignored after load" (the handler cannot establish transience). Lands after R-8 so the new test discriminates both arms.

---

## MINOR findings

### R-12 [minor] supercluster's cluster/point union is cast-laundered into an all-optional bag — three unsound `as`, a fabricated `count: 0`, and an open `any` generic

`mapCluster.ts:66-68, 99, 111-127` · **Lanes:** type-design T1 · probe-verified by the lane: narrowing with `'cluster' in feature.properties` + closing the second generic (`Record<string, never>`) compiles clean with all fields required — a strict deletion. Minor on demo merits (no reachable invalid state), but **recommended to land in the fix round regardless**: it removes the only `any` surface the diff opens and is the one place the code chose against the house discriminated-result precedent.

### R-13 [minor] Mutable shared module-level constants; `EMPTY_MAP_FILTERS`'s array is the live filter state on every mount and case switch

`mapFilters.ts:25-33` (`MapFilterState.statuses`, `EMPTY_MAP_FILTERS`) · `mapCluster.ts:56` (`WORLD_BBOX`, returned into caller hands) · `MapCanvas.tsx:65-66` + `MapScreen.tsx:29,33` · **Lanes:** typescript LOW-2 + type-design T2 + type-design L6 (merged). Latent, not live (all updaters are spread-only today). **Fix:** `readonly`/`as const` across the table the TD lane produced, `statuses: readonly LocationMapStatus[]` cascading into `toggleStatus`/`matchesStatusFilter` params, plus `ReadonlyArray` on the new pure-module params (L6). Preserve the load-bearing identity semantics — `setFilters(EMPTY_MAP_FILTERS)` when already empty is an `Object.is` bail-out, so freeze, don't factory.

### R-14 [minor] Four pipeline stages share one nominal `MapData`; the "N of M" rule is enforced only by identifier choice, and `locationCountLabel` takes two swappable positional numbers

`MapScreen.tsx:156-173` (six read sites over four same-typed stages) · `MapControls.tsx:128-133, 177` (declared prop order is the reverse of the call's argument order — correct today, transposable silently) · **Lanes:** type-design T3. Owner-judgement item: the full `MapProjection` single-result shape touches the P5.4 `Export Map` seam the PR body flags — cheaper to do once during that reconciliation. **Minimum for this round:** make `locationCountLabel` take `{ filteredCount, locationCount }`. Defer-eligible (ledger §75+) beyond that minimum.

### R-15 [minor] `MapData.pins`/`incident` are pure functions of `items`; the diff took the hand-rolled derivation from one construction site to three

`mapData.ts:86-91, 201` · `mapFilters.ts:86-93` · `mapProximity.ts:80-92` (keptIds filter duplicated verbatim) · **Lanes:** type-design T4. The diff already fixed the third such field the right way (`countStatuses` shared by all three stages); `pins`/`incident` are the two it didn't finish. **Fix:** shrink `MapData` and derive at the render boundary (`buildMarkers(items)`), per the `ScopeRetention` omit-so-it-can't-drift precedent. Defer-eligible.

### R-16 [minor] `LocationDetailCardProps` is a flat shape over a union `item`; `camerasShown: true` without `onToggleCameras` renders plotted cameras with no way to hide them

`LocationDetailCard.tsx:8-26` (the two new "Location variant only" props) · `MapScreen.tsx:258-269` · **Lanes:** type-design T5. One caller today; P5.4 adds another imminently. **Fix:** discriminate the props on `item` (RetentionView precedent), or minimally pair the two new props into one optional object (`cameras?: { shown; onToggle }`). Defer-eligible with a §75+ entry if the union churn is deemed P5.4's job.

### R-17 [minor] `MAP_FILTER_STATUSES` completeness is unenforced — a fourth `LocationMapStatus` would compile everywhere else and leave its pill silently un-toggleable

`mapFilters.ts:23, 47-55` (`toggleStatus` re-derives *through* the registry, so the new member is dropped) vs. `mapTokens.ts:7,14` (both siblings are exhaustive `Record`s) · **Lanes:** type-design T6. **Fix:** derive the order from `satisfies Record<LocationMapStatus, number>` — or fold into ledger §4 (same class, §4's stated direction) and defer.

### R-18 [minor] The proximity fallback chain: undisclosed synthetic anchor, a duplicated fallback literal, and only the first of its three steps tested

`MapScreen.tsx:31-33, 240-243` · **Lanes:** silent-failures S-6 + typescript LOW-3 + tests MEDIUM-3 (merged — one code site, one commit). (a) When the anchor comes from `getCenter()`/`FALLBACK_CENTER` rather than a plotted item (reachable via a zero-match filter, since the chain reads the **post-filter** list), nothing tells the visitor the ring's centre was picked for them — cheapest honest close is a one-time `setNotice` ("Proximity centred on the current view — long-press the map to move it"), or anchor from unfiltered `mapData`. (b) `FALLBACK_CENTER` is a second literal of `MapCanvas.DEFAULT_CENTER` with a comment asserting an identity the code doesn't enforce — lift `DEFAULT_CENTER` into `mapTokens.ts` and import both sides. (c) Tests: both fallback steps and the keep-previous-centre guard are mutation-invisible (lane table) — add the two `MapScreen — proximity` tests the tests lane drafted (no-plottable-case anchors on `getCenter()`; long-pressed centre survives off→on).

### R-19 [minor] Cameras without a GPS fix are dropped from the map projection uncounted — `Show cameras (2)` when the wizard lists 5

`mapData.ts:118-134` (`toCameraMarkers`) · `LocationDetailCard.tsx:159-173` · **Lanes:** silent-failures S-7. The lane's consistency check cleared the single-source wiring (markers/count/toggle can never disagree; Null-Island guarded). The residual is the repo's own partial-result standard (`generateExtractedScopes` counts + flags + dev-warns; this does none). **Fix:** `Show cameras (2 of 5)` (or minimally a dev-only warn naming the location and omitted count).

### R-20 [minor] `aria-expanded` on the Show/Hide-cameras toggle announces a disclosure that isn't there

`LocationDetailCard.tsx:159-171` · **Lanes:** web W-7. The diff's own `MapControls` uses `aria-pressed` for all four toggle groups; this is the internal mismatch. **Fix:** `aria-pressed={camerasShown}`. (The `aria-expanded` on the camera *marker* button is correct — it really discloses an adjacent callout.)

### R-21 [minor] The long-press timer and slop are pinned one-sided — 500→250 ms and 10→0 px both stay green

`MapCanvas.tsx:56,58` · **Lanes:** tests MEDIUM-2 (mutation table: 400/250 ms and slop 0 all MISSED; upper bounds caught). At 250 ms a tap-and-hold-to-drag starts firing rings; at slop 0 touch long-press dies of finger jitter. **Fix:** the two two-sided tests the lane drafted (499/500 boundary; 8 px jitter inside slop).

### R-22 [minor] Two phone-parity constants are asserted against themselves — `CLUSTER_EXPANSION_MAX_ZOOM` (20) and `RING_STEPS` (64) can drift silently

`mapCluster.ts:36` / `mapProximity.ts:21` vs. their self-referential assertions · **Lanes:** tests MEDIUM-4. Internal inconsistency: the same files pin `CLUSTER_RADIUS`/`CLUSTER_MAX_ZOOM`/presets to literals. **Fix:** two literal pins in the existing config-parity describes.

### R-23 [minor] The case-switch reset: 4 of its 7 statements are deletable with the suite green; the user-visible one is the sheet detent

`MapScreen.tsx:145-152` · `MapScreen.test.tsx:368-380` · **Lanes:** tests MEDIUM-5 (honest framing kept: two are masked-by-design rather than untested; `setSnapIndex(0)` is the consequential one). **Fix:** extend the case-switch test — select (detent ≥1), switch case, assert collapsed detent + no detail card.

### R-24 [minor] No canonical map fixture factory — five hand-rolled `LocationSheetItem` shapes and two `MapData` builders, five of them touched by hand for this diff's one field add

`__tests__/{LocationDetailCard,LocationRow,MapBottomSheet}.test.tsx` inline literals + `mapFilters.test.ts:14-59` / `mapProximity.test.ts:13-59` builders · **Lanes:** tests MEDIUM-6. **Fix:** `map/__tests__/test-utils.ts` with `sheetLocation`/`sheetIncident`/`cameraMarker`/`mapDataFrom`; fold the five sites (every call site is already an object spread). Do this **first** in the test-debt commit — R-21/R-22/R-23's new tests should consume it.

### R-25 [minor] `normalizeBbox`'s antimeridian clamp is lossy and its comment asserts library behaviour that is untrue of supercluster

`mapCluster.ts:82-89` · **Lanes:** typescript LOW-1 (verified against installed supercluster source: `getClusters` self-normalises and hemisphere-splits wrapped queries; the hand clamp discards the wrapped slice). Near-zero blast radius for Ontario data; filed because the comment will be trusted. **Fix:** keep the `Number.isFinite` + `>=360` branches, drop the min/max clamp (or correct the comment to "defensive").

---

## NIT bundles (deduped, land opportunistically)

### R-26 [nit bundle] Test hygiene

**Lanes:** tests LOW-1..LOW-4 · (a) fake-timer teardown not exception-safe at 4 sites — move to a file-level `afterEach(() => vi.useRealTimers())`; (b) three uncovered defensive arms in `MapCanvas` (`:161`, `:170`, `:322`) — two-line `mockImplementationOnce(throw)` each; (c) `MapScreen.test.tsx:63-65` clears 3 of 13 map-stub spies — mirror the `Object.values(...).mockClear?.()` loop **plus the default-`on` reinstall, in R-8's commit**; (d) four unpinned arithmetic details in `mapCluster` (round-vs-floor ×2, NaN-zoom fallback, the `>= 360` boundary) — one `it.each` if the block is touched, not worth a round.

### R-27 [nit bundle] Type-design polish

**Lanes:** type-design L1-L5, L7-L9 · (a) redundant `as ProximityRing` (`mapProximity.ts:67`) and (b) redundant `cam.gps!` (`mapData.ts:122`) — both probe-verified deletable (the five `l.gps!` in `toMapData` are NOT removable; leave them); (c) `'setData' in source` already narrows to `GeoJSONSource` — drop the structural cast (`MapCanvas.tsx:358-360`); (d) `export type MarkerKind` in `mapTokens.ts` for the four scattered kind literals + test helpers; (e) `PointProps.marker: LocationMarker` (split the union) so the index literally cannot hold an incident; (f) labelled tuple `export type LngLat = readonly [lng: number, lat: number]` for the five positional pairs sitting beside `(lat, lng)`-ordered `formatCoordinate` — at minimum the missing `// [lng, lat]` comment on `ClusterCameraTarget.center`; (g) `MapCameraMarker.locationId` written-never-read + `resolution` truthy-only doc vs. re-guarding consumer — pick one; (h) `export type StatusCounts = Record<LocationMapStatus, number>` replacing the four written-out copies.

---

## Recorded — no action (kept out of the fix round deliberately)

- **W-8 (web LOW):** the 600 ms loading-cover cross-fade has no reduced-motion gate — opacity-only, the category reduced-motion guidance exempts; mapbox's own animations are gated (`respectPrefersReducedMotion` default) and `fitToPoints` is `duration: 0`. The completeness sweep is answered, not skipped.
- **W-9 (web LOW):** glass-pill text over bright satellite tiles has no contrast floor — tokens are phone-verbatim, the exposure is pre-existing on the phone and the sheet, and raising `containerBg` alpha is a design decision, not a review call. Recorded here so a design round can find it.
- **Type-design observation:** the §72 dynamic-import discipline is enforced only by review-time grep — an ESLint `no-restricted-imports` scoped to the eager map modules (or a chunk-content CI assertion) is the durable enforcement. Worth a §75+ ledger entry, not a P6 code change.

## Struck findings

- **§72e "stationary pinch can fire" (half of web W-5 / referenced by S-5):** STRUCK. The shared single `pressOrigin` ref plus cancel-then-re-arm on every `pointerdown` means finger 1's first move is measured against finger 2's origin — beyond the 10 px slop essentially always — and the timer cancels immediately. Verified against `onPointerDown`/`onPointerMove` source. §72e's disclosure was over-cautious; the amendment in R-5 records the analysis so it isn't re-derived.
- No other lane finding was refuted. The supercluster premise was settled in the PR body and correctly not re-litigated by any lane.

---

## Suggested fix-round commit grouping

One code owner (P6.1's author). Granular, red+green together; groupings below are severity-ordered and dependency-aware.

| # | Commit | Findings |
|---|---|---|
| 1 | fix(map): fit camera from the pre-proximity set, keyed by value — with the two "never re-fits" pins | R-1 |
| 2 | test(map): settled-total re-plot pin for the stable-empty-defaults contract | R-9 |
| 3 | fix(map): proximity chunk rejection path — un-poison, revert the toggle, notify + breadcrumb, retry pin | R-2 |
| 4 | fix(map): route map-boot chunk/constructor failure into the error overlay | R-3 |
| 5 | fix(map): camera markers out of the moveend re-plot + callout-survives pin | R-4 |
| 6 | fix(map): long-press guards (isPrimary + marker/ctrl target exclusion) **and the §72e ledger amendment** | R-5 |
| 7 | fix(map): honest empty states — discriminated sheet reason, 0-of-M badge, role="status" | R-6 + R-7a |
| 8 | fix(map): cluster/pin keyboard access | R-7b |
| 9 | test(map): un-vacuous error suite — default-`on` reinstall, positive transient assertion, MapScreen beforeEach hygiene | R-8 + R-26c |
| 10 | fix(map): escalate terminal post-load error causes to the overlay (after #9 so the test discriminates both arms) | R-11 |
| 11 | test(map): long-press coordinate-conversion pin (surfacing the CSS-scale question) | R-10 |
| 12 | refactor(map): supercluster union narrowing (strict deletion) | R-12 |
| 13 | refactor(map): readonly constants + ReadonlyArray params | R-13 |
| 14 | test(map): shared fixture factory, then constant pins / reset-detent / long-press bounds | R-24 → R-21, R-22, R-23 |
| 15 | fix(map): proximity fallback honesty — notice, shared DEFAULT_CENTER, fallback-chain tests | R-18 |
| 16 | Small singles, one commit each when clean | R-19, R-20, R-25 |
| 17 | Owner-ruling minors: fix now or ledger §75+ with rationale | R-14 (min: object param), R-15, R-16, R-17 (fold into §4?) |
| 18 | polish: nit bundles, opportunistic | R-26 (rest), R-27 |

**Standing obligations for the fix round:** every deferred item from rows 17-18 gets a `deferred.md` §75+ entry before merge; §72e is amended per R-5; the commit→finding mapping table is posted as a PR comment; the fix-delta re-review resumes the five lane reviewers.
