# P6 review — WEB lane (platform / a11y / perf)

**PR:** #35 · `master..feat/parity-p6` · reviewed at `44d54b3`
**Worktree:** `scratchpad/worktrees/parity-p6` (deps installed; `pnpm build` and targeted `vitest` runs executed here)
**Lane contract:** `.claude/agents/web-reviewer.md` — browser-platform concerns only. TS correctness, missing tests and swallowed errors are other lanes.

Context read before flagging: PR #35 body ("Deliberate choices — DO NOT RE-FLAG"), `docs/code-reviews/deferred.md` §72 (a–e), `features/demo/CLAUDE.md`, root `CLAUDE.md`, phone `MapHost.tsx` / `useMapData.ts` / `CaseMapView.tsx` (read-only) for the parity claims that bear on browser behaviour.

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL/HIGH/MEDIUM is given alongside so the mapping is auditable.

**Gates run in this worktree**

| Gate | Result |
|---|---|
| `pnpm build` | ✅ clean, 19/19 static pages |
| `/demo` First Load JS | **107 kB — matches the PR claim** |
| supercluster chunk | `static/chunks/551.*.js` = **10,226 B (10.2 kB)** — matches |
| turf chunk | `static/chunks/454.*.js` = **3,358 B (3.4 kB)** — matches |
| mapbox-gl chunk | `static/chunks/85e7e0c4.*.js` = 1.80 MB, separate |
| `/demo` first-load chunks contain supercluster / turf / mapbox-gl? | **No** — verified per-chunk against `app-build-manifest.json` |
| Marketing↔demo wall (`grep -rn "features/demo" components app/\(default\) lib`) | intact (doc comment + the guard test only) |
| `pnpm vitest run features/demo/ui/screens/map` | 16 files / **170 passed** (tracked files only) |

Three findings below are backed by a scratch repro suite I ran in this worktree and then deleted (`ZZweb-lane-repro.test.tsx`, 4/4 passing). Each repro is reproduced inline so it can be re-run or promoted into the tracked suite.

---

## Findings

### [MAJOR · lane-HIGH] W-1 — Every search keystroke re-fits the map camera, discarding the visitor's `flyTo`/pan even when the plotted set is unchanged

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:329-338` (the index/fit effect)
**Upstream:** `features/demo/ui/screens/map/MapScreen.tsx:156-164` (`filtered` → `display` → `markers`), `mapFilters.ts:80-94` (`applyMapFilters` returns a **new** `MapData` whenever any filter is active)
**Correct pattern, same file, same PR:** `MapCanvas.tsx:329-331` comment + `__tests__/MapCanvas.test.tsx:191-200` ("never re-fits the camera when only the camera markers change")

**Issue.** The fit effect keys on the **identity** of the `markers` array, not on the bounds it implies:

```ts
useEffect(() => {
  const map = mapRef.current
  const clusterMod = clusterModRef.current
  if (!ready || !map || !clusterMod) return
  indexRef.current = clusterMod.buildClusterIndex(markers)
  fitToPoints(map, markers.map((d) => [d.lng, d.lat] as [number, number]))
}, [ready, markers])
```

`markers` is `useMemo(() => buildMarkers(display), [display])`, and `display` derives from `filtered = useMemo(() => applyMapFilters(mapData, filters), [mapData, filters])`. `handleSearchChange` mints a new `filters` object per keystroke (`MapScreen.tsx:207-209`), so `applyMapFilters` returns a new `MapData`, `buildMarkers` returns a new array, and the effect re-runs — **even when the surviving marker set is byte-identical**. `fitToPoints` then hard-snaps the camera (`fitBounds(..., { duration: 0 })` for ≥2 points, `setCenter` + `setZoom(15)` for one).

This is the exact defect class the PR fixed one line above for the cameras toggle; the filter path is its unfixed sibling.

**Concrete failure.** `/demo` → Map tab → tap a location pin (the camera flies to it at zoom 16 and the detail card opens) → type one character in **Search locations**. The camera is yanked back to the whole-case overview fit before the second character is typed, and again on every character after that. Same on a pan: drag the map, type, lose the pan. It also fires on a *narrowing* change while the finger is still down — a long-press that activates proximity immediately re-fits, fighting mapbox's still-active drag-pan.

The phone does not behave this way: `useMapData` recomputes `cameraBounds` on filter change but feeds it into `@rnmapbox/maps`' declarative `Camera bounds` prop (`CaseMapView.tsx:787-798`), whose `nativeStop` memo (`node_modules/@rnmapbox/maps/src/components/Camera.tsx:390-422`) only issues a camera stop when the bounds **value** changes. Equal bounds ⇒ no camera move. Here, equal bounds still move the camera.

**Repro (passes on `44d54b3`).**

```tsx
render(<MapScreen viewerCaseId="x" mapData={data} onEditIncident={vi.fn()} />)
await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(1))   // initial fit
fireEvent.click(screen.getByText('Rear door'))
expect(mapInstance.flyTo).toHaveBeenCalledTimes(1)                            // visitor's camera
// one character; 'r' matches "Rear door", the incident always passes → identical result set
fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'r' } })
expect(screen.getByText('Location Details')).toBeInTheDocument()              // nothing changed
expect(mapInstance.fitBounds).toHaveBeenCalledTimes(2)                        // …camera yanked
fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 're' } })
await waitFor(() => expect(mapInstance.fitBounds).toHaveBeenCalledTimes(3))   // …and again
```

Secondary cost on the same line: `buildClusterIndex` rebuilds the supercluster KD-tree per keystroke. Negligible at demo scale, but it is the same wasted work.

**Fix.** Split the two jobs the effect currently conflates. Rebuild the index on `markers` identity (cheap, must stay fresh); gate the camera fit on the **fit input**, not the array:

```ts
const fitKey = useMemo(
  () => markers.map((d) => `${d.lng},${d.lat}`).sort().join('|'),
  [markers],
)
useEffect(() => { /* index rebuild */ }, [ready, markers])
useEffect(() => { /* fitToPoints */ }, [ready, fitKey])   // identical points ⇒ no camera move
```

That reproduces the phone's value-equality semantics exactly and leaves the intended "filter narrows the set ⇒ refit" behaviour intact. Either shape works; the requirement is that an unchanged point set must not move the camera.

---

### [MAJOR · lane-MEDIUM] W-2 — Any map movement silently destroys an open camera callout (and resets its `aria-expanded`)

**File:** `features/demo/ui/screens/map/markerElements.ts:150-156` (callout state lives in the DOM node) + `features/demo/ui/screens/map/MapCanvas.tsx:263-265, 282-314` (`moveend` → full re-plot of *every* marker, cameras included)

**Issue.** The camera callout's open/closed state is held on the DOM element itself (`callout.style.display`, `button.aria-expanded`), and `renderMarkers` removes and recreates **all** markers on every `moveend`:

```ts
map.on('moveend', () => { if (mounted) renderRef.current() })
// …
markerObjsRef.current.forEach((m) => m.remove())
const cameraObjs = cameras.map((camera) =>
  new mod.default.Marker({ element: createCameraEl(camera), anchor: 'center' })…)
```

Cameras never cluster, so nothing about them depends on the viewport — they are re-created purely as collateral of the cluster re-plot. `createCameraEl` always starts at `display:none` / `aria-expanded="false"`, so the visitor's open bubble vanishes with no state anywhere to restore it.

**Concrete failure.** `/demo` → Map → select a location with geolocated cameras → **Show cameras (N)** → tap a camera pin to read its name / resolution / 6-dp coordinates → nudge the map one pixel (or let any `flyTo` settle). The bubble disappears mid-read. A screen-reader user gets an `aria-expanded` that flips back to `false` with no announcement, so the control's reported state and reality diverge until they re-query it. The phone does not have this failure mode — `CameraMarker` holds `showCallout` in React state, which survives camera moves.

**Repro (passes on `44d54b3`).**

```tsx
render(<MapCanvas markers={[]} cameras={[camera]} />)
await waitFor(() => expect(live('camera')).toHaveLength(1))
const el = live('camera')[0]._el
fireEvent.click(el.querySelector('[data-camera-button]')!)
expect(el.querySelector('[data-camera-callout]').style.display).toBe('block')
emit('moveend')                                     // the visitor nudges the map
await waitFor(() => expect(live('camera')).toHaveLength(1))
const after = live('camera')[0]._el
expect(after.querySelector('[data-camera-callout]').style.display).toBe('none')      // ← lost
expect(after.querySelector('[data-camera-button]').getAttribute('aria-expanded'))
  .toBe('false')                                                                     // ← lied
```

**Fix.** Either (preferred) move the camera markers out of `renderMarkers` into their own effect keyed on `[ready, cameras]` — they are never clustered, so `moveend` has no business re-plotting them — or keep an `openCalloutIdRef` in `MapCanvas`, set it from the click handler (pass a callback into `createCameraEl`), and re-apply it after each re-plot.

---

### [MAJOR · lane-MEDIUM] W-3 — Cluster bubbles declare `role="button"` but are neither focusable nor key-activatable; location/incident pins are bare `div`s

**File:** `features/demo/ui/screens/map/markerElements.ts:48-72` (`createClusterEl` — new in this PR), `:17-38` (`createMarkerEl` — moved verbatim, folded in per the completeness sweep)
**Wired at:** `features/demo/ui/screens/map/MapCanvas.tsx:295-306` (`el.addEventListener('click', …)`)

**Issue.** `createClusterEl` sets `role="button"` + `aria-label="Cluster of N locations"` and attaches a `click` listener, but never sets `tabindex`, and the element is a `<div>`, so there is no implicit Enter/Space activation:

```ts
el.setAttribute('role', 'button')
el.setAttribute('aria-label', `Cluster of ${d.count} locations`)
```

Nothing downstream supplies the missing tab stop. mapbox-gl only adds `role`/`tabindex="0"`/keypress handling to a marker element when a **popup** is attached via `Marker.setPopup()` (`node_modules/mapbox-gl/dist/mapbox-gl.js`, `setPopup`: `this._element.setAttribute("role","button"); this._originalTabIndex || this._element.setAttribute("tabindex","0")`), and this code uses neither popups nor the default marker (whose `aria-label="Map marker"` / `role="img"` are `_defaultMarker`-only). Custom marker elements get nothing.

Result: a control that announces itself as a button to assistive tech but cannot be reached with Tab and cannot be operated with Enter/Space — WCAG **2.1.1 Keyboard (A)** with an aggravating **4.1.2 Name, Role, Value** mismatch. The pins have the inverse problem: clickable, no role, no name, no tab stop.

This matters more after P6.1 than before it: below `CLUSTER_MAX_ZOOM` (14) some locations are now reachable on the map *only* through a cluster.

**Repro (passes on `44d54b3`).**

```ts
const el = createClusterEl({ kind: 'cluster', id: 'cluster-1', clusterId: 1, lng: 0, lat: 0, count: 12, label: '12' })
expect(el.getAttribute('role')).toBe('button')
expect(el.getAttribute('tabindex')).toBeNull()   // ← not in the tab order
expect(el.tagName).toBe('DIV')                   // ← no implicit Enter/Space
```

**Mitigation that keeps this out of BLOCKER territory.** The bottom sheet's `LocationRow` (`LocationRow.tsx:36, 50`) is a real `<button type="button">` for every item including the incident, and selecting a row flies to zoom 16 — past `CLUSTER_MAX_ZOOM`, where pins stand alone. So a keyboard-only visitor can still reach every location; they just cannot use the map layer itself. Screen-reader users on a virtual cursor can activate the cluster (AT dispatches a click); sighted keyboard and switch-access users cannot.

**Fix.** In `createClusterEl`, add `el.tabIndex = 0` and a `keydown` handler for `Enter`/`Space` that calls the same handler as `click` (`preventDefault` on Space to stop page scroll). The in-repo idiom for exactly this is `switchKeyDown` in `ui/screens/_shared.tsx`. For the pins, the cheapest correct shape is `role="button"` + `tabindex="0"` + `aria-label` (e.g. the location name, which `MarkerDescriptor` does not currently carry — plumbing it is the only non-trivial part) + the same keydown; if that plumbing is out of scope for a fix round, `aria-hidden="true"` on the pins plus the cluster fix is the honest interim (the sheet is then the declared keyboard path).

---

### [MAJOR · lane-MEDIUM] W-4 — The filter result count is a silent visual-only status; the load state has no AT surface at all

**File:** `features/demo/ui/screens/map/MapControls.tsx:175-179`

```tsx
{locationCount > 0 && (
  <span data-testid="map-location-count" style={countPill}>
    {locationCountLabel(filteredCount, locationCount)}
  </span>
)}
```

**Issue.** "N of M locations" is the only feedback the filter/search/proximity controls give, and it is announced to nobody. A screen-reader user typing in **Search locations** stays in the input; the count changes behind them, the sheet list changes behind them, and nothing is spoken. This is the canonical WCAG **4.1.3 Status Messages (AA)** failure (a search-result count that changes without a role change or focus change). It compounds with the `locationCount > 0` guard: a search that matches nothing removes the pill entirely, so the *worst* case — "your filter matched nothing" — produces the least feedback.

**Evidence this is a repo standard, not an invented bar.** The demo already uses `role="status"` for exactly this class of thing in eleven places, and a prior review finding (R-9, cited at `DemoNotification.tsx:40-45` and `MediaCaptureScreen.tsx:529`) established the rule as "the refusal, said out loud". `ImportModal.tsx:248-275` pairs `role="status"` with `aria-live="polite"`. `MediaCaptureScreen.tsx:462-464` documents the one place the demo *deliberately* opts out (a per-second recording timer) — which is precisely the analysis this pill never got.

**Second instance, same class, lower severity.** The loading cover (`MapCanvas.tsx:455`) is an opaque `<div>` with no text, so during the map load neither sighted nor AT users get a "loading" state. That half is phone-parity (`MapHost.tsx:537-540` documents having *removed* its loading text) — recorded here only so the pair is judged together, not as a separate ask.

**Correct by contrast:** the error overlay (`MapCanvas.tsx:456-474`) is right — `role="alert"`, real `<button type="button">` for Retry, announced on appearance. No change needed there.

**Fix.** `role="status"` on the count pill, and render it unconditionally (or render an explicit "No locations match" when the filtered count is 0) so the empty result is announced rather than removed:

```tsx
<span data-testid="map-location-count" role="status" style={countPill}>
  {locationCount > 0 ? locationCountLabel(filteredCount, locationCount) : 'No locations match'}
</span>
```

---

### [MAJOR · lane-MEDIUM] W-5 — §72e judged: the pinch edge is a non-issue, but the marker edge is understated — a 500 ms hold on a pin *activates* proximity, and it fires with a mouse too

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:406-430` (`onPointerDown` / `onPointerMove`), `:443-454` (the container the handlers sit on)
**Downstream:** `features/demo/ui/screens/map/MapScreen.tsx:249-256` (`handleLongPress`)
**Ledger:** `docs/code-reviews/deferred.md` §72e

I was asked to judge the two disclosed edges. Verdicts differ:

**Edge 1 (stationary pinch can fire) — not a finding; the disclosure is over-cautious.** `pressOrigin` is a *single* ref shared across pointers, and every `pointerdown` calls `cancelLongPress()` then re-arms from the new contact. In a two-finger pinch, finger 2's `pointerdown` re-anchors the origin to finger 2; the first `pointermove` from finger 1 is then compared against finger 2's origin, and two fingers on a 378 px surface are essentially never within the 10 px slop of each other, so the timer is cancelled almost immediately. The cross-pointer comparison that looks like a bug is what makes the pinch safe. Nothing to change.

**Edge 2 (hold on a marker) — real, and the disclosure under-describes the consequence.** §72e says "a long hold on a pin both selects it and moves the ring". When proximity is **off**, it does not move a ring — it *turns proximity on*:

```ts
const handleLongPress = useCallback((lng: number, lat: number) => {
  void loadProximity()
  setProximityCenter([lng, lat])
  setProximityActive(true)          // ← unconditional activation
}, [loadProximity])
```

The bubbling is not speculative: `Marker.addTo(map)` calls `map.getCanvasContainer().appendChild(this._element)` (verified in `node_modules/mapbox-gl/dist/mapbox-gl.js`), i.e. every pin, cluster bubble and camera button is a **descendant** of the `[data-map-canvas]` div carrying `onPointerDown`. Nothing in `onPointerDown` inspects `event.target`.

Two corrections to the ledger's framing:

1. **It is not touch-only.** Pointer events fire for mouse. Press-and-hold the left button on a pin for half a second — a normal "click while reading the label" — and proximity activates centred on that pin at the 1 km default. Every other location and the incident drop off the map *and* out of the bottom-sheet list. Recovery requires spotting the **Proximity ON** pill and toggling it off. §72e's trigger ("a review finding either behaviour on a touch device") is satisfied on the desktop path the demo is primarily viewed on.
2. **The same handler swallows mapbox's own chrome.** The attribution control (`.mapboxgl-ctrl-bottom-right`, containing the Mapbox logo link and "Improve this map") is also inside the container. A 500 ms hold on it activates proximity too.

The container-level timer itself is sound otherwise, and I confirmed the two platform questions it raises:
- **No `touch-action` / gesture interference.** With both `dragPan` and `touchZoomRotate` enabled (the defaults), `mapbox-gl.css` sets `touch-action: none` on `.mapboxgl-canvas-container` and the canvas, so the browser never steals the gesture and never emits a `pointercancel` mid-hold. `-webkit-user-select: none` and a transparent `-webkit-tap-highlight-color` are set on the interactive container, so no selection/highlight artefacts.
- **No timer leak.** `useEffect(() => cancelLongPress, [cancelLongPress])` (`MapCanvas.tsx:404`) clears it on unmount, and `pointerup` / `pointercancel` / `pointerleave` all cancel.

**Fix (one line).** Exclude marker and control descendants at the top of `onPointerDown`:

```ts
const target = event.target as Element | null
if (target?.closest?.('[data-marker-id], .mapboxgl-ctrl')) return
```

`data-marker-id` is already on every element `markerElements.ts` produces, so this needs no new plumbing. Worth updating §72e's text either way: activation ≠ re-centring, and the edge is not touch-specific.

---

### [MINOR · lane-MEDIUM] W-6 — A failed proximity chunk fetch is an unhandled rejection and permanently disables the feature

**File:** `features/demo/ui/screens/map/MapScreen.tsx:121-129`, called `void`-style at `:239` and `:251`

```ts
const loadProximity = useCallback((): Promise<ProximityModule> => {
  if (!proximityLoadRef.current) {
    proximityLoadRef.current = import('@/features/demo/ui/screens/map/mapProximity').then((mod) => {
      setProximityModule(mod); return mod
    })
  }
  return proximityLoadRef.current
}, [])
```

**Issue.** No `.catch` anywhere on the chain, and both call sites are `void loadProximity()`. If the 3.4 kB turf chunk fails to fetch — a redeploy while the tab is open (`ChunkLoadError` is the standard Next.js symptom), an offline blip, a blocking proxy — the browser reports an **unhandled promise rejection**, and `proximityLoadRef.current` is left holding a *rejected* promise, so the toggle can never re-attempt for the life of the mount. `proximityModule` stays `null`, `proximityResult` stays `null` (`:158-161`), so the pill reads **Proximity ON**, no ring is drawn, and nothing is filtered — a state the demo's honesty rule exists to prevent.

Contrast the established pattern one file over: `MapCanvas` degrades a missing token to a *labelled* `data-map-fallback` placeholder (`MapCanvas.tsx:432-441`).

**Note on lane overlap.** A `ZZrepro-proximity.test.tsx` transiently present in this shared worktree (another lane's scratch file, since removed) carried the assertion "button reads 'Proximity ON' while nothing is filtered and nothing is logged" — the silent-failure lane appears to own the *messaging* half. I flag only the browser-platform half here: the unhandled rejection and the non-retryable cached rejection. Dedupe at the vetting step.

**Related, same class, pre-existing root:** `MapCanvas.tsx:225-266` runs `void (async () => { const [mod, clusterMod] = await Promise.all([import('mapbox-gl'), import('…/mapCluster')]) … })()` with no catch either. `failed` is only ever set from `map.on('error')`, which requires the map object to exist — so if the **1.80 MB mapbox-gl chunk** itself fails to download (ad-blocker, proxy, flaky network — the single most likely way this map fails to appear), the new error+Retry overlay this PR introduces never shows. The cover reveals on the 4 s failsafe and the visitor is left with a blank dark rectangle, no message, no Retry, and an unhandled rejection in the console. The uncaught `import` predates this diff; the error state that should have covered it does not.

**Fix.** Give both dynamic imports a `catch`. For proximity, null the ref so a retry is possible and surface it through the `DemoNotification` the screen already renders:

```ts
proximityLoadRef.current = import('…/mapProximity')
  .then((mod) => { setProximityModule(mod); return mod })
  .catch((err) => { proximityLoadRef.current = null; setProximityActive(false); setNotice('Proximity needs to load — check your connection and try again.'); throw err })
```

For the map, route the import failure into the existing `setFailed(true)` so Retry (which already bumps `attempt` and re-runs the effect) becomes the recovery path it was built to be.

---

### [MINOR · lane-LOW] W-7 — `aria-expanded` on the cameras toggle announces "collapsed/expanded" for something that is not a disclosure

**File:** `features/demo/ui/screens/map/LocationDetailCard.tsx:159-171`

The Show/Hide cameras control is a real `<button type="button">` with a good `aria-label` — the button itself is right. But `aria-expanded={camerasShown}` tells AT that pressing it reveals a region *at that point in the document*; what it actually does is plot markers on a canvas elsewhere. `aria-pressed` is the accurate state for a toggle, and it is what this PR's own `MapControls` uses for its four toggle groups (`MapControls.tsx:161, 222, 244`). The mismatch is internal to the diff.

(`aria-expanded` on the *camera marker* button, `markerElements.ts:130`, is correct — that one really does show an adjacent callout. Adding `aria-controls` pointing at the callout would be a nice-to-have there, not a requirement.)

**Fix.** `aria-pressed={camerasShown}` on `LocationDetailCard.tsx:164`.

---

### [MINOR · lane-LOW] W-8 — The loading cover's cross-fade is the one new animation with no reduced-motion consideration

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:86-94` (`transition: opacity 600ms ease`)

Everything else animated in this diff is already covered: `map.flyTo` (selection and cluster expansion) is gated by mapbox-gl itself — `respectPrefersReducedMotion` defaults to `true` in v3.25.0 and converts eased camera moves to jumps — and `fitToPoints` passes `duration: 0`. No new CSS keyframes were added.

That leaves a 600 ms opacity cross-fade. I'm filing it LOW and recommending **no change**: it is opacity-only with no transform or positional movement, which is the category `prefers-reduced-motion` guidance generally exempts, and gating it would mean introducing a `useReducedMotion()` call into a component the repo has deliberately kept free of `motion/react`. Recorded so the completeness sweep on "new animation ⇒ reduced-motion" is visibly answered rather than skipped.

---

### [MINOR · lane-LOW] W-9 — Glass-pill text over satellite tiles has no contrast floor

**File:** `features/demo/ui/screens/map/mapTokens.ts:25-42` + `MapControls.tsx:86-97` (count pill), `:113-123` (search input)

`MAP_GLASS_COLORS.textTertiary` (`#7a9fc4`) on `containerBg` (`rgba(13,27,42,0.65)`) computes to **6.28:1** against the app's dark background — comfortably AA. But the pill is only 65 % opaque and the map style is `satellite-streets-v12`; composited over a bright roof or a concrete lot the effective background lightens toward the tile and the ratio collapses (against white the same text is under 1.5:1). Same exposure for the 11 px count text and the `#f0f4f8` search input text.

Filing as LOW and **not** asking for a change: the tokens are lifted verbatim from the phone's `MAP_GLASS_COLORS`, the same exposure exists there and on the pre-existing sheet and Change Case pill, and "make the glass opaque" is a design decision, not a review call. If a future round wants a floor, the cheap fix is raising `containerBg` alpha for the pills that carry text (0.65 → ~0.85) without touching the container.

---

## Explicitly checked and clean (not findings)

- **Bundle boundary.** No marketing file imports `@/features/demo`. No heavy dep moved to a static import — `mapbox-gl` + `mapCluster` stay behind the effect's `await import` (`MapCanvas.tsx:226-229`), `mapProximity` behind `MapScreen.tsx:123`. The `mapbox-gl/dist/mapbox-gl.css` static import at `MapCanvas.tsx:8` is CSS-only and pre-existing (present on `master`).
- **The token-split in `mapTokens.ts` works as documented.** `clusterRadiusFor` / `clusterFontSizeFor` / `PROXIMITY_PRESETS` live in `mapTokens` specifically so `markerElements` and `MapControls` can render on first paint without importing `mapCluster` (supercluster) or `mapProximity` (turf). Verified against the built chunks: neither symbol set reaches any `/demo` first-load chunk.
- **New deps.** `supercluster` + three individual `@turf/*` packages (not the `@turf/turf` monolith) + two `@types/*`. Bundle rationale documented in §72a and in `mapProximity.ts:14-17`, and confirmed by the chunk measurements above.
- **Resource cleanup is complete.** Map torn down (`map.remove()`), every marker `.remove()`d, `indexRef` nulled (frees the KD-tree), long-press timer cleared on unmount and on up/cancel/leave, both cover timers cleared, marker `click` listeners die with their detached nodes. Retry (`attempt`) runs the full cleanup before re-creating. No `createObjectURL`, no new observers, no un-aborted fetches in this diff.
- **The error overlay covering the sheet is phone parity,** not a web trap: `MapHost.tsx:579-587` uses the same full-bleed `zIndex: Layout.zIndex.modal` overlay. `ScreenStage`'s `motion.div` transform (`ScreenStage.tsx:50-54`) creates a stacking context, so the `zIndex: 25` overlay stays inside the phone screen and the TabBar remains reachable.
- **`MapControls` overlay mechanics.** `pointerEvents: 'none'` on the container with `'auto'` restored per pill is the correct web analog of the phone's `box-none`; map drags pass between the pills. The controls are siblings of the map container, so their pointer events never reach the long-press handler. `top: 92` clears the Change Case pill (top 58, ~31 px tall) by 3 px; `flexWrap` absorbs the "N of M locations" widening at 378 px.
- **Control semantics in `MapControls` are right:** real `<button type="button">` throughout, `aria-pressed` on all four toggle groups, `aria-label` on every control including the search input, no `<div onClick>`.
- **Render discipline in `MapScreen`.** `mapData` is memoized upstream (`DemoExperience.tsx:534-537`), `filtered` / `proximityResult` / `markers` / `visibleCameras` are all memoized, `selectedItem` is an O(n) `.find` over a stable array, and no store subscription was added — `MapScreen` stays presentational. The live `onMarkerPressRef` / `onLongPressRef` pattern correctly keeps fresh callback identities from rebuilding the map or the markers. (W-1 is an effect-dependency bug, not a memoization gap.)
- **No SSR/hydration exposure.** No `window` / `document` / `navigator` at module scope; `document.createElement` in `markerElements.ts` only ever runs from inside the effect-driven `renderMarkers`. No `Date.now()` / `Math.random()` added.
- **Styling half is correct.** All new UI is inline `CSSProperties` under `features/demo/ui/**`; no Tailwind classes leaked in, no `demo.css` change, no lifted pixel values altered.
- **§72c (no scale bar), §72d (clusters don't list members):** out of scope, correctly ledgered, not re-flagged.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 5 |
| LOW | 3 |

Orchestrator mapping: **0 blockers · 5 majors (W-1…W-5) · 4 minors (W-6…W-9)**.

Marketing↔demo isolation: **preserved**
Bundle impact: **none on First Load — 107 kB confirmed by `pnpm build`; supercluster (10.2 kB) and turf (3.4 kB) verified lazy by chunk inspection**
Browser-resource cleanup: **complete**
Accessibility: **gaps found** — W-3 (cluster `role="button"` with no tab stop / key activation), W-4 (no live region on the filter count), W-7 (`aria-expanded` on a non-disclosure toggle)
Style-convention adherence: **correct half; lifted rules untouched**

**Verdict: REVISE**

Notes: W-1 is the one that changes behaviour the visitor will notice every session — it is the unfixed sibling of the cameras-toggle refit this PR already fixed and tested. W-5 is a §72e judgment, not a re-flag: the pinch edge is a non-issue, the marker edge is real, fires on mouse as well as touch, and *activates* proximity rather than merely re-centring the ring — the ledger text needs correcting either way.

---

# Fix-delta r1

**Diff reviewed:** `b0381b7..fcfe774` (merge `fcfe774`, 19 commits on `parity/p6-fix-map`) · worktree `parity-p6`
**Map read first:** PR #35's fix-round comment, `deferred.md` §72e (amended) and §79 (a–g).
**Gate run here (targeted, per the standing rule):** `pnpm vitest run features/demo/ui/screens/map` → **17 files / 226 tests green** (orchestrator's merged-head gate is authoritative for the full suite).
**Verification suite:** a 17-assertion scratch file (`ZZweb-delta-repro.test.tsx`, 17/17 passing, deleted after the run) — every claim below is a green or red assertion, not a reading.

## Disposition of the r0 findings

| # | Finding | Fix commit | Verdict |
|---|---|---|---|
| W-1 | Identity-keyed fit snapped the camera per keystroke | R-1 `83b5b95` | **FIXED** |
| W-2 | `moveend` destroyed open camera callouts | R-4 `81c287d` | **FIXED** |
| W-3 | Cluster announced-but-unreachable; pins unnamed | R-7b `86dc425` | **FIXED** (both branches judged sound) |
| W-4 | Count pill inaudible / vanished at zero | R-7a `e6b3d1b` | **FIXED** |
| W-5 | Held press on a pin / attribution activated proximity | R-5 `720a988` | **FIXED for the two named surfaces · residual → NEW-1** |
| W-6 | Uncaught chunk rejections (proximity + map engine) | R-2 `819f0d0`, R-3 `f7d5af3` | **FIXED** (both halves) |
| W-7 | `aria-expanded` on a non-disclosure toggle | R-20 `cab59d4` | **FIXED** |
| W-8 / W-9 | Cover cross-fade · glass contrast | §79g, no code change | **Agreed closed** — that was this lane's own recommendation |

### W-1 — FIXED

`MapCanvas.tsx:428-455` now derives a `fitKey` (`lng,lat` pairs, sorted, joined) and keys the fit effect on that value, reading the point array through `fitPointsRef` so array identity can never re-trigger it; and `MapScreen.tsx:197` feeds `fitPoints` from `buildFitPoints(filtered)` — the **pre**-proximity projection. The index rebuild stayed identity-keyed, which is correct (clustering must track the plotted set).

Three assertions, all green:

- two search keystrokes over an unchanged result set, after a `flyTo`: `fitBounds` call count **1** (was 3 in the r0 repro), selection intact;
- a search that genuinely drops a location still re-frames (falls to the single-point `setCenter([-79.5, 43.5])` branch) — the fix did not buy stability by disabling re-framing;
- activating proximity and then tapping a radius preset: `fitBounds` still **1**, `setCenter` never called — the (a) half of the finding, which r0 only observed as a side effect of the long-press path.

The `fitKey`'s `.sort()` runs on the array `.map()` produces, not the source, so `fitPoints` is not mutated; a fresh `Object.freeze([])` default and `readonly` prop types close the mutation route as well.

### W-2 — FIXED

Cameras moved out of `renderPins` into their own `renderCameras` (`MapCanvas.tsx:414-429`) with separate `pinObjsRef` / `cameraObjsRef`, and `renderRef.current = renderPins` — so `moveend` no longer touches camera markers. Verified: open a callout, fire `moveend` twice, and the **same element instance** is still mounted with `display:block` and `aria-expanded="true"`.

Worth stating because it looks like a risk and is not: the camera markers still follow the map. `Marker.addTo` registers its own `map.on('move'/'moveend', …)` repositioning (verified in `node_modules/mapbox-gl/dist/mapbox-gl.js`), so dropping them from the demo's re-plot loses nothing.

### W-3 — FIXED, and the §79e branch is the right one

`createClusterEl` now sets `el.tabIndex = 0` alongside `role="button"` + `aria-label`, and `MapCanvas.tsx:394-399` attaches an Enter/Space `keydown` that `preventDefault()`s and calls the same `expandCluster` as the click. Verified: Enter expands, Space expands, `a` does nothing.

**Judging §79e (pins → `aria-hidden="true"`, sheet as the declared path).** This was one of the two shapes r0 offered and it is the defensible one here. It is not "hiding the problem": each pin has a real `<button>` twin in `LocationList` that selects the same item and flies the camera to it, so nothing is lost from the a11y tree that is not reachable elsewhere — and an unnamed, unfocusable `role`-less `div` announced as a clickable thing would have been strictly worse than silence (WCAG 4.1.2 is about correct name/role/value, not about maximum node count). The asymmetry with the cluster is also correct and correctly reasoned in the ledger: below `CLUSTER_MAX_ZOOM` the bubble is the only on-map route to its members and it *does* have a name, so it stays exposed. The recorded trigger (give pins `tabIndex`/`aria-label` and drop `aria-hidden` in the same commit if `MarkerDescriptor` ever gains a display name) is the right carry-through. **No further action.**

### W-4 — FIXED

`MapControls.tsx:198-205`: `role="status"` on the pill, gated on the new pre-filter `totalCount` instead of the post-filter `locationCount`, and `locationCountLabel` returns `'No locations match'` at zero. So the live region **persists** across a filter session and only its text changes — which is the announcement-safe shape (a region inserted at the same moment its content appears is the pattern AT sometimes misses). Two behaviours checked and deliberately not flagged: a per-keystroke `polite` update is coalesced by AT and is the standard result-count contract (the repo's one documented opt-out, `MediaCaptureScreen.tsx:462-464`, is a per-second timer, a different case); and the pill still disappears when the case has nothing plottable at all, which is now correct because that case is carried by the sheet's own `'no-data'` copy.

### W-6 — FIXED, both halves

`MapScreen.tsx:135-155` catches the proximity import, **nulls `proximityLoadRef`** (so off→on re-attempts rather than replaying a parked rejection), reverts `proximityActive`, and raises `PROXIMITY_UNAVAILABLE` through the existing notification. `MapCanvas.tsx:300-357` wraps the whole engine-boot path — chunk fetch *and* `new Map()` — in a `try`, routing failure to `setFailure('engine')` with its own sentence (`MAP_ENGINE_ERROR`) rather than borrowing the style/tile copy. Both were the fix shapes this lane proposed; the `'engine'` vs `'style'` discrimination is a better answer than the one-message version I suggested.

## New findings

### [MINOR · lane-MEDIUM] NEW-1 — W-5 residual: a held **non-primary mouse button** still activates proximity

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:562` (`if (!event.isPrimary) return`)

`isPrimary` means *"the first pointer of this pointerType"* — it is `true` for **every** mouse button, so it filters secondary *contacts* (the pinch case, correctly) but not secondary *buttons*. The `closest('[data-marker-id], .mapboxgl-ctrl')` guard on the next line closes the two surfaces r0 named; the bare canvas is still armed by a right or middle press.

**Concrete failure.** Right-click the map and hold ~0.5 s without moving — a reflex on any map (people right-click looking for "measure distance"/"what's here"). mapbox's `dragRotate` claims right-button drag, so a *stationary* right-press rotates nothing, the 500 ms timer fires, and proximity activates at the 1 km default: every other location and the incident drop off the map and out of the sheet, centred on a point nobody chose. On release, mapbox's own `DragRotateHandler.contextmenu` calls `preventDefault()`, so **no context menu appears either** — the visitor right-clicked, got nothing they asked for, and silently got a filtered map. Identical consequence to W-5, narrower trigger.

**Repro (both red on `fcfe774`).**

```tsx
fireEvent.pointerDown(canvas, { clientX: 100, clientY: 120, isPrimary: true, button: 2 })
vi.advanceTimersByTime(600)
expect(onLongPress).toHaveBeenCalledWith(-79.7, 43.7)   // ← fires; should not
// same for button: 1 (middle)
```
Controls in the same run: pin → not called ✓, `.mapboxgl-ctrl > a` → not called ✓, bare canvas + button 0 → called ✓.

**Fix (one line, and it is the repo's own).** Add the guard the shared primitive already has (`ui/primitives/useLongPress.ts:194`, `if (e.button !== 0) return // primary button only; a right-click is the context-menu path`) next to the `isPrimary` check.

### [MINOR · lane-MEDIUM] NEW-2 — this is the **fourth** hand-rolled long-press in `ui/`, and §72e's "trigger (unchanged)" has already fired

**Files:** `features/demo/ui/screens/map/MapCanvas.tsx:64-67, 545-590` vs `features/demo/ui/primitives/useLongPress.ts` · `docs/code-reviews/deferred.md` §72e (amended text)

§72e now closes with: *"What genuinely remains of 72e is only the shape: this is a hand-rolled pointer timer rather than a gesture primitive. **Trigger (unchanged):** the arrival of a pointer-gesture helper in `ui/primitives/`."*

That helper is already there, and predates this work: `git ls-tree` finds `features/demo/ui/primitives/useLongPress.ts` at **`master`, `44d54b3` (P6 head), `b0381b7` and `fcfe774`**, with its own test file and four live callers (`CasesScreen.tsx:129, 226`, `DashboardScreen.tsx:82`, `MediaLibrarySheet.tsx:551`). Its module header is explicit about why a fifth copy matters:

> *"ONE HOOK, for real this time (P3 review R-1). THREE shipped in P3 … the surviving lesson is worth stating plainly: **a shared primitive re-implemented at a new path, or inline in a screen, will not conflict with the copy it duplicates.**"*

and about the constant specifically:

> *"THE one definition: P3.2's card re-declared its own `LONG_PRESS_MS = 500` while three suites imported this one, so the shared beat could have been changed with the dashboard left behind and every test green."*

`MapCanvas.tsx:65-67` re-declares `LONG_PRESS_MS = 500` and `LONG_PRESS_SLOP = 10` (the primitive's `LONG_PRESS_MS` / `MOVE_TOLERANCE_PX = 10`), and the fix round hardened the copy rather than converging it. NEW-1 is the concrete cost: the primitive's `e.button !== 0` lesson exists and this copy does not have it.

**What I am *not* claiming.** The contextmenu half of the primitive's contract is not a live defect here: `DragRotateHandler`/`DragPitchHandler` call `e.preventDefault()` on `contextmenu` by default (verified in the mapbox dist), and `MapCanvas` registers no map `'contextmenu'` listener, so no OS menu appears over the ring and there is no double-fire to latch against. Nor is the hook drop-in — it invokes its callback with no coordinates (this caller needs `unproject`), and its `isNestedControl` selector (`button, a, input, select, textarea, [role="button"]`) covers cluster bubbles, camera buttons and attribution links but **not** the bare-`div` pins.

**Fix (choose one).**
1. Converge: extend `useLongPress` with an optional extra bail selector and pass the originating `PointerEvent` (or a `{clientX, clientY}`) to the callback, then delete `MapCanvas`'s timer. That also retires §72e's shape residual for real.
2. Minimum: add the `e.button !== 0` guard (NEW-1) and import `LONG_PRESS_MS` from the primitive instead of re-declaring it.

Either way, **§72e's closing trigger sentence should be corrected** — it currently defers to an event that happened before this branch existed.

### [MINOR · lane-LOW] NEW-3 — §79a sweep answer: `MapBottomSheet`'s drag does the same unit mixing, uncorrected

**Assigned question:** *does anything else read `getBoundingClientRect` for pointer math and need the same fix?*

**Direct answer: no** — `MapCanvas.tsx:229` is the only `getBoundingClientRect` in `features/demo`, `lib` and `components`. But the *class* of defect §79a names (a pointer quantity in viewport px consumed as an untransformed local px) has one more instance, without a `getBoundingClientRect`:

**File:** `features/demo/ui/screens/map/MapBottomSheet.tsx:59-93` (`endDrag`, `onPointerMove`)

```ts
const delta = start - clientY                 // viewport px
if (delta > DRAG_THRESHOLD) onSnapChange(…)   // DRAG_THRESHOLD = 40, the sheet's own px
setDragOffset(dragStart.current - e.clientY)  // viewport px → a height in local px
```

`PhoneFrame.tsx:42` scales the whole subtree by `usePhoneScale()` = `min(1, (innerHeight - 28) / 812)`, so `s < 1` on any viewport under ~840 px tall — ~0.81 on a 1366×768 laptop, ~0.70 in a 600 px-tall window. At `s = 0.7` the sheet grows only 0.7 px per px of finger travel (it visibly lags the drag), and the detent threshold needs 40 viewport px = 57 local px of sheet movement.

**Repro (green on `fcfe774`, i.e. the mixing is real):** a 41-client-px drag on the handle calls `onSnapChange(2)` — a threshold expressed in the sheet's own px, crossed by a delta measured in the viewport's.

**Provenance / severity.** Pre-existing (P3-era `MapBottomSheet`); this diff only threaded `emptyReason`/`onClearFilters` through it. Cosmetic (drag feel), never wrong data, and invisible at `s = 1`. Filed at LOW as the honest completion of the assigned sweep, not as a P6 ask.

**Fix if taken:** same divide — multiply the delta by `offsetHeight / rect.height` of the sheet element, or lift `toContainerPoint`'s scaling half into a tiny shared helper next to it.

**Two more places checked and cleared:** `MapCanvas.tsx:586`'s 10 px slop stays in client px, which is correct (finger travel is a viewport-space quantity) and matches `useLongPress.ts:212`'s `MOVE_TOLERANCE_PX`; `useLongPress.ts` itself never unprojects, so it needs no scale correction.

## §79a judged as fresh code — the formula is right

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:211-233` (`toContainerPoint`)

Verified character-for-character against the mapbox source it cites (`node_modules/mapbox-gl/dist/mapbox-gl.js`, the `getScaledPoint` helper):

```js
function T(t,i,o){ const r = t.offsetWidth === i.width ? 1 : t.offsetWidth / i.width;
                   return new Point((o.clientX - i.left) * r, (o.clientY - i.top) * r) }
```

Same formula, plus a `rect.width > 0 && offsetWidth > 0` guard mapbox lacks (mapbox would yield `NaN`/`Infinity` on a zero-size box). Matching mapbox exactly is the *point*: the long-press coordinate and a mapbox click must resolve identically, so being independently "more correct" would be a bug.

Correctness for scale + offset combinations, all four assertions green:

- **scale only** — `offsetWidth 378`, `rect {left 40, width 189}` (s = 0.5), client `(140, 200)` → `(200, 200)` ✓
- **1:1** — no-op ✓
- **scale + translation / transform-origin** — `PhoneFrame` uses `transform-origin: top center` and `ScreenStage` adds a `translateX` push and percentage slide variants. Origin and translation are already folded into `rect.left`/`rect.top`, and neither changes `rect.width`, so the ratio is unaffected: `rect.left 300` at the same 0.5 scale still resolves `(400, 50)` → `(200, 100)` ✓
- **degenerate box** — `offsetWidth 0`, `rect.width 0` → falls back to scale 1 rather than `NaN` ✓

Three residual assumptions, all satisfied here and worth naming rather than discovering later:
1. **Uniform scale.** The width ratio is applied to both axes. `scale(s)` is uniform and nothing in the demo uses `scale(sx, sy)`; a non-uniform scale would skew `y`. (Inherited from mapbox by design.)
2. **No rotation/skew.** `getBoundingClientRect` would return the axis-aligned hull and both `left/top` and `width` would be wrong. Not used.
3. **`offsetWidth` is integer-rounded.** The container is `position:absolute; inset:0` inside the 378 px screen, so `offsetWidth === 378` exactly; a fractional-width container would introduce up to ~0.13 % error. Negligible, non-blocking.

One thing checked and cleared: mapbox applies this against `map.getCanvasContainer()`, not the outer container this helper is handed. They are the same box — the canvas container is a full-width child at the same origin — so `rect.left/top` and the ratio are identical, and the two conversions agree.

## R-6 judged — the discriminated empty state and its Clear affordance are a11y-sound

**Files:** `LocationList.tsx:9-58`, `MapScreen.tsx:206-219`

- The recovery affordance is a real `<button type="button">` with a visible, self-describing label ("Clear filters") — the in-repo idiom, no `div onClick`, no icon-only control needing a label.
- It is rendered **only** for the `'filters'` reason and only when a handler exists (§49a's honesty rule), so there is no button that cannot do what it says.
- Nothing steals or strands focus; no colour-only signalling.
- **The empty block has no live region, and does not need one:** the count pill next door is now `role="status"` and says "No locations match" for exactly the state that produces this copy, so the information *is* announced; and the recovery is duplicated by the always-present, `aria-label`led `clear-filters-button` in the controls overlay. A second live region on the same event would double-announce.
- The discrimination order (`filters` before `proximity`, inner-to-outer) is right: if the status/text stage already emptied the list, proximity had nothing to remove, so naming proximity would be the false sentence the finding was about.

**No finding.**

## Fix-delta Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 1 |

Orchestrator mapping: **0 blockers · 0 majors · 3 minors, all new (NEW-1, NEW-2, NEW-3)**. All nine r0 findings verified fixed or agreed-closed; W-5 is fixed for both surfaces it named, with NEW-1 as its last input path.

Marketing↔demo isolation: **preserved** (no marketing file touched)
Bundle impact: **none** — no new dependency, no import-shape change; the lazy boundaries are unchanged and the orchestrator's merged-head gate re-measured 107 kB
Browser-resource cleanup: **complete** — the split `pinObjsRef`/`cameraObjsRef` are both swept in the create-map effect's cleanup; the new `try/catch` cannot leave a `Map` unreferenced (the local `map` binding is still what cleanup removes)
Accessibility: **all three r0 gaps closed** (W-3, W-4, W-7); R-6's new empty state adds no gap
Style-convention adherence: **correct half; lifted rules untouched**

**Verdict: APPROVE with comments** — nothing here should hold the merge. NEW-1 is a one-line guard worth taking now (it is the last 10 % of W-5 and the fix is the repo's own primitive); NEW-2 and NEW-3 are ledger items, and §72e's closing trigger sentence should be corrected either way since the helper it waits for shipped before P6 began.

---

## Spot-delta (micro-round `b621472..bd5baa1`)

**NEW-1 — FIXED.** `MapCanvas.tsx:578` now carries `if (event.button !== 0) return` beside the `isPrimary` check, with the two-kinds-of-secondary distinction spelled out at the site. Re-ran the button matrix on `bd5baa1` (11/11 green, scratch file deleted): right (2), middle (1), back/forward (3, 4) and pen-eraser (5) **no longer fire**; primary (0) still fires with the unprojected coordinate; a **touch** contact still fires (`button: 0, buttons: 1, pointerType: 'touch'` — per spec a finger contact reports `button 0`, so the new guard cannot regress the touch path, which was the one way this fix could have gone wrong). Target guards re-verified unchanged under the new ordering: pin, cluster bubble and `.mapboxgl-ctrl` attribution link all still bail; the slop cancel still fires at tolerance + 1 px; the beat still fires at 501 ms and not at 499 ms.

**Constant-export shape — sound, no finding.** `LONG_PRESS_MS` / `LONG_PRESS_MOVE_TOLERANCE_PX` both resolve to the primitive and are unchanged in value (500 / 10, asserted). Judged on four axes: **layering** — `screens/map/` → `ui/primitives/` is the correct direction and `useLongPress.ts` imports only `react`, so no cycle; **bundle** — the primitive is already in the demo chunk via its four existing callers and `MapCanvas` sits in that same eager chunk, so this adds zero bytes and drags nothing across the mapbox/turf lazy boundaries; **naming** — renaming the private `MOVE_TOLERANCE_PX` to `LONG_PRESS_MOVE_TOLERANCE_PX` on export is right, since an unprefixed `MOVE_TOLERANCE_PX` at an import site would read ambiguously next to `MapBottomSheet`'s own `DRAG_THRESHOLD`; **home** — keeping both beats in the module that owns the gesture, with the "why this is exported" note at the definition, is more durable than a neutral tokens module would be for two numbers, and preserves the RN `delayLongPress` provenance next to the value. `LONG_PRESS_SURFACE_STYLE` correctly not imported — `mapbox-gl.css` already sets `-webkit-user-select: none` on `.mapboxgl-canvas-container.mapboxgl-interactive`.

**NEW-2 residual — correctly ledgered, not re-flagged.** The convergence half (retire the hand-rolled copy by giving `useLongPress` a bail selector + originating coordinates) is out of a micro-round's scope; §72e's stale trigger sentence is struck and corrected, and the work is now §79i with a real trigger. NEW-3 (`MapBottomSheet` drag unit-mixing) is untouched by this round, as expected.

**Spot-delta verdict: FIXED — 0 new findings.**
