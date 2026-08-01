# P6.1 — TypeScript lane review

**PR:** #35 · `master..feat/parity-p6` (8 commits on `parity/p6-map`, merged at `44d54b3`)
**Scope:** `mapFilters.ts`, `mapCluster.ts`, `mapProximity.ts`, `mapTokens.ts`, `markerElements.ts`,
`MapControls.tsx`, `MapCanvas.tsx`, `MapScreen.tsx`, `LocationDetailCard.tsx`, `mapData.ts`
**Lane:** type safety · async correctness · error handling · demo-architecture compliance
**Read first:** PR #35 body (deliberate choices), `docs/code-reviews/deferred.md` §72, `features/demo/CLAUDE.md`

## Gates

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | clean (zero diagnostics, whole project) |
| `pnpm exec vitest run features/demo/ui/screens/map` | 173 passed / 17 files. One failure is `__tests__/ZZprobe.test.tsx` — an **untracked** always-failing probe left in the shared worktree by another lane, not part of the diff. |
| Dynamic-import discipline (§72 invariant) | **HOLDS.** Every reference to `mapCluster` / `mapProximity` from shipped code is `import type` (`MapCanvas.tsx:10,12`, `markerElements.ts:2`, `MapScreen.tsx:21`), `typeof import()` (`MapCanvas.tsx:42`, `MapScreen.tsx:35`) or a real `import()` (`MapCanvas.tsx:228`, `MapScreen.tsx:123`). All three erase or defer. No value-form static leak anywhere in `app/`, `components/`, `lib/`, `features/`. `mapTokens.ts` correctly holds `PROXIMITY_PRESETS` / `clusterRadiusFor` so the first-paint surfaces never reach for the lazy modules. |
| Store bridge | preserved — `grep -rn "useStore" features/demo/ui` returns nothing outside `DemoExperience.tsx`. New map modules import only `type LocationMapStatus` and the pure `selectLocationMapStatus` (the established, sanctioned exception). |
| Engine purity | n/a — no `engine/**` file in the diff. |
| Single barrel / marketing isolation | preserved — `features/demo/index.ts` untouched; no new `features/demo` import from `app/`, `components/`, `lib/`. |
| Determinism seam | preserved — zero `Date.now()` / `Math.random()` in the new map surface. Cluster ids are supercluster-derived (`cluster-${cluster_id}`), camera ids are the composite `${locationId}:${cameraId}`, React keys are `status` / `preset`. |
| `as any` / `console.log` | none. |

---

## Findings

### [HIGH] Proximity re-fits the camera on every activation and radius change — the phone deliberately keeps camera positioning out of the proximity pipeline

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:332-338` (fit source) · `features/demo/ui/screens/map/MapScreen.tsx:158-164, 282` (fit input)

**Issue.** `MapCanvas`'s index+fit effect keys on `markers`, and `MapScreen` feeds it
`buildMarkers(display)` where `display = proximityResult?.data ?? filtered` — i.e. the
**post-proximity** set. So the moment the visitor drops a proximity ring (long-press, or the
Proximity toggle) the marker set shrinks, the effect re-runs, and `fitToPoints` yanks the camera to
the survivors — away from the point they just long-pressed. Every radius preset tap re-fits again.
When exactly one row survives, `fitToPoints` takes the single-point branch (`MapCanvas.tsx:136-140`)
and hard-sets `setCenter(point)` + `setZoom(15)`, so a 0.5 km ring around a lone location becomes a
full-screen teleport on a 378 px screen.

The phone splits these two concerns on purpose. `useMapData(caseId, filters)` derives
`cameraBounds` / `initialCenter` from **`filteredCollection`** — the status/text-filtered set —
via a `boundsCollection` that additionally strips camera features
(`src/features/location/map-view/hooks/useMapData.ts:96-124`). Proximity narrows only
`displayCollection` (`MapHost.tsx:255-256`), which feeds the ShapeSource and the sheet and
**never** the `Camera` props (`MapHost.tsx:492-493`). Long-pressing a ring on the phone leaves the
camera exactly where it was.

**Evidence.** Instrumented probe against the branch's own `MapScreen` harness (3 locations +
incident, mocked `mapbox-gl`), run and then removed:

```
proximity toggle ON  → fitBounds calls 1 → 2      (a second fit fires on activation)
radius preset 0.5 km → fitBounds calls 2 → 3      (a third fit fires on the preset tap)
```

For contrast, a search keystroke also goes 1 → 2 — but *that* one is phone-consistent, because the
phone's `cameraBounds` genuinely is derived from the filtered collection. Proximity is the half
that diverges.

This is the same defect class the PR already fixed once — "the index/fit effect re-fitting the
camera on a cameras toggle" (PR body; pinned by `MapCanvas.test.tsx:191-199`). The cameras
dimension was separated out of the fit; the proximity dimension was not, and `deferred.md` §72
does not record it as a choice.

**Fix.** Keep the cluster index on `display`-derived `markers` (correct — clustering must reflect
what is plotted) but drive `fitToPoints` from a pre-proximity point set. Smallest shape: give
`MapCanvas` a separate `fitPoints?: Array<[number, number]>` prop that `MapScreen` memoizes off
`filtered` (not `display`), and split the one effect into (a) index rebuild on `markers`,
(b) fit on `fitPoints`. `MapCanvas.test.tsx`'s existing "never re-fits when only the camera markers
change" test extends naturally to "never re-fits when only the proximity ring changes".

---

### [HIGH] `loadProximity()` has no rejection path, and its memoised promise makes a single failure permanent

**File:** `features/demo/ui/screens/map/MapScreen.tsx:121-129`, called at `:239` and `:251`

```ts
const loadProximity = useCallback((): Promise<ProximityModule> => {
  if (!proximityLoadRef.current) {
    proximityLoadRef.current = import('@/features/demo/ui/screens/map/mapProximity').then((mod) => {
      setProximityModule(mod)
      return mod
    })
  }
  return proximityLoadRef.current
}, [])
```

**Issue.** Both call sites fire-and-forget with `void loadProximity()`. If the dynamic import
rejects — the classic Next.js `ChunkLoadError` from a redeploy invalidating chunk hashes mid-session,
or a dropped connection on the first proximity activation — three things happen:

1. **Unhandled promise rejection.** `void` on a rejecting promise has no handler; Next's dev overlay
   pops, production emits an `unhandledrejection`.
2. **The failure is permanent.** The rejected promise is stored in `proximityLoadRef.current`, so the
   `if (!proximityLoadRef.current)` guard short-circuits forever. Every subsequent toggle, long-press
   and preset tap returns the same rejected promise. There is no retry for the rest of the session.
3. **The UI lies.** `setProximityActive(true)` runs unconditionally at `:244` / `:253`, so the pill
   reads **"Proximity ON"** and the four radius presets render — while `proximityResult` stays `null`
   (`:159` requires `proximityModule`), no ring is drawn, and nothing is filtered. That is exactly the
   "a button that cannot do what it says" failure the codebase's own honesty rule forbids (quoted in
   `MapScreen.tsx:50-56` and `LocationDetailCard.tsx` comments, from §49a).

This is a *new* handler repeating `deferred.md` §18's pattern, with an aggravating factor §18 does not
have: §18's un-caught handlers fail once per invocation, this one caches the failure.

**Fix.** Attach a `.catch` inside `loadProximity` that (a) clears `proximityLoadRef.current` so the
next press re-attempts the import, (b) reverts `setProximityActive(false)`, and (c) surfaces it —
the screen already owns `DemoNotification` via `setNotice(...)`, and `console.warn` is the repo's
soft-I/O breadcrumb convention (`MapCanvas.tsx:257,260,322` use it).

---

### [MEDIUM] A failed `import('mapbox-gl')` / `import(mapCluster)` bypasses the new error overlay entirely

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:225-266`

```ts
void (async () => {
  const [mod, clusterMod] = await Promise.all([
    import('mapbox-gl'),
    import('@/features/demo/ui/screens/map/mapCluster'),
  ])
  ...
})()
```

**Issue.** This PR adds `MAP_LOAD_ERROR` + the `map-error-overlay` + `Retry` (`:456-474`) precisely to
give a failed map load an honest surface — but `failed` is set **only** from mapbox's own `'error'`
event (`:253-262`), which requires the `Map` instance to exist. If either dynamic import rejects
(stale chunk after a deploy, offline, CDN blip) the IIFE rejects unhandled, `mapRef.current` stays
`null`, `'load'` never fires, `ready` stays `false`, and the 4 s failsafe (`:383-386`) reveals the
cover onto an empty `<div data-map-canvas>`. The visitor gets a black rectangle with no message and
no Retry — the exact outcome the overlay was added to prevent.

The bare `void (async …)()` is inherited from `master`, so the *pattern* is pre-existing; what is new
in this diff is the overlay that now makes the gap material (and a second import that can reject).

**Fix.** `.catch` the IIFE (or wrap the `await Promise.all` in try/catch): narrow with
`err instanceof Error ? err : new Error(String(err))`, `console.warn` the breadcrumb, and
`if (mounted) setFailed(true)` so Retry — which already bumps `attempt` and re-runs the effect —
becomes a genuine second chance at the import.

---

### [MEDIUM] Every `moveend` destroys and rebuilds the camera markers, wiping an open callout

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:263-265, 288, 308-312` · `features/demo/ui/screens/map/markerElements.ts:150-156`

**Issue.** `renderMarkers` removes and re-creates **all** markers — clusters, pins *and* cameras —
and is wired to `moveend` (`:263-265`). Cameras never cluster, so their re-plot is not a function of
the viewport; but they are rebuilt with everything else. The camera callout's open/closed state lives
in the DOM element created by `createCameraEl` (`callout.style.display`, `aria-expanded`), so it dies
with the element. Concretely: tap a camera to read its name / 6-dp coordinate / accuracy → nudge the
map by one drag → the bubble vanishes and `aria-expanded` resets to `false`. The same happens on the
`flyTo` that `selectItem` fires, and on the fit that any filter change triggers.

**Evidence.** Probe against `MapCanvas` with a single camera marker (run, then removed):

```
after click:  { display: "block", aria-expanded: "true" }
emit 'moveend'
after:        { sameElement: false, display: "none", aria-expanded: "false" }
```

The phone does the opposite deliberately: `CameraMarker` holds `showCallout` in React state
(`CameraMarker.tsx:53-56`), and `CaseMapView` memoises `cameraMarkers` on
`[cameraShape, visibleCameraLocationId]` with a comment stating it recomputes "on toggle/selection
but **NOT** on the throttled `onCameraChanged` re-renders" (`CaseMapView.tsx:386-393`). Camera moves
are exactly the input the phone excluded.

§72a discloses the re-plot cost for *pins* ("pins are re-plotted on every `moveend` rather than being
GPU layers"); it does not disclose that this also resets camera-callout state.

**Fix.** Split camera plotting out of `renderMarkers` into its own effect keyed on `cameras`
(they are never clustered, so nothing about them depends on the viewport), keeping the marker
objects in a separate ref. Secondary benefit: a data change currently plots twice — once from the
render effect (`:342-345`) and once from the `moveend` that `fitToPoints` itself provokes — and the
split halves the camera half of that churn.

---

### [LOW] `normalizeBbox`'s clamp is lossy across the antimeridian, and its stated justification is untrue of supercluster

**File:** `features/demo/ui/screens/map/mapCluster.ts:82-89`

**Issue.** The comment says "mapbox reports wrapped longitudes once the user pans past the
antimeridian; an unclamped bbox returns nothing." Supercluster does not behave that way — verified in
`node_modules/supercluster/dist/supercluster.js`, `getClusters` normalises both longitudes with
`((lng + 180) % 360 + 360) % 360 - 180`, clamps both latitudes to ±90, special-cases a ≥360 span, and
splits the query into two hemispheres when `minLng > maxLng`. The hand-rolled
`Math.max(w, -180) / Math.min(e, 180)` clamp is therefore redundant in the ordinary case and strictly
worse in the wrapped case: a viewport of `[170, s, 190, n]` becomes `[170, s, 180, n]`, silently
discarding the slice supercluster would have recovered via the hemisphere split, so pins in the
wrapped half stop rendering.

Blast radius is near zero for Ontario-policing demo data — filed because the comment asserts a
library behaviour that is not true, which is the kind of note a future maintainer will trust.

**Fix.** Keep the `Number.isFinite` guard and the `>= 360 → WORLD_BBOX` branch (both earn their
keep); drop the min/max clamp and pass the bbox through, or correct the comment to say the clamp is
defensive rather than required.

---

### [LOW] `EMPTY_MAP_FILTERS` is a shared mutable object serving as both the initial state and the reset value

**File:** `features/demo/ui/screens/map/mapFilters.ts:33` · consumed at `MapScreen.tsx:109, 145, 211`

**Issue.** `export const EMPTY_MAP_FILTERS: MapFilterState = { statuses: [], searchText: '' }` is the
`useState` seed, the case-switch reset and the Clear handler's value — three call sites sharing one
object whose `statuses` array is mutable. Nothing mutates it today (`toggleStatus` and both
`setFilters` updaters are spread-only), so this is latent, not live. But a single future
`filters.statuses.push(...)` would corrupt the module-level "unfiltered" baseline for the remainder of
the session, and the corruption would present as the Clear button no longer clearing.

Note the referential sharing is also load-bearing in a *good* way — `setFilters(EMPTY_MAP_FILTERS)`
when already empty is an `Object.is` no-op that React bails out of — so a factory function is not a
free swap.

**Fix.** Freeze it (`Object.freeze` on the object and on `statuses`), which preserves the identity
benefit and makes an accidental mutation throw in strict mode.

---

### [LOW] The proximity fallback centre is a second copy of `MapCanvas`'s default camera centre

**File:** `features/demo/ui/screens/map/MapScreen.tsx:31-33` vs `features/demo/ui/screens/map/MapCanvas.tsx:45`

**Issue.** `FALLBACK_CENTER: [number, number] = [-79.65, 43.61]` is documented as "Matches
`MapCanvas`'s own default camera centre rather than inventing a coordinate" — but it is a second
literal of `MapCanvas.DEFAULT_CENTER`, not a reference to it. The comment states an invariant the
code does not enforce; editing one leaves the other silently wrong, and the failure (a ring anchored
somewhere the camera has never been) is only reachable in the empty-case path nobody exercises.

**Fix.** Export `DEFAULT_CENTER` from `MapCanvas` (or lift it into `mapTokens.ts` alongside the other
shared map constants) and import it in `MapScreen`.

---

## Verified sound (checked, not findings)

- **Referential-stability contract on `MapCanvas` props — the two in-commit fixes are real and complete
  for the props they cover.** `NO_MARKERS` / `NO_CAMERAS` (`MapCanvas.tsx:65-66`, `MapScreen.tsx:29`)
  genuinely fix a per-render array identity that would have changed `renderMarkers`'s `useCallback`
  identity on every commit and re-plotted every marker. Upstream the chain holds end to end:
  `mapData` is memoised in the bridge (`DemoExperience.tsx:534-537`), `filtered` on `[mapData, filters]`,
  `proximityResult` on its five inputs, `markers` on `[display]`, `visibleCameras` on
  `[camerasShown, selectedItem]` — and `selectedItem` is an element reference out of `display.items`,
  which `applyMapFilters`/`computeProximity` preserve by using `.filter()`. `selectItem`'s changing
  identity is absorbed by `onMarkerPressRef`. A probe on a settled 2-pin mount shows 2 marker
  constructions and 1 `fitBounds` — no churn.
- **The filter → proximity → display single-source rule.** `markers`, `MapBottomSheet.items`,
  `statusCounts`, `selectedItem` and `visibleCameras` all read `display`; `locationCount` reads
  `filtered` and `filteredCount` reads `proximityResult ?? locationCount`. That is `MapHost.tsx:250-258`
  verbatim, including the deliberate asymmetry that only proximity produces "N of M". The proximity
  anchor (`filtered.items[0]?.coord`) matches the phone's `filteredCollection.features.find(location|incident)`
  — the demo can't accidentally anchor on a camera because cameras live inside `LocationSheetItem`.
  `showCountBadge = locationCount > 0` and the pluralisation are verbatim (`MapControls.tsx:109,155-168`).
- **Case-switch reset effect.** `[viewerCaseId]` with a `firstCaseRun` ref guard is correct — no stale
  closure (every setter is either a constant or a functional update), and the StrictMode double-invoke
  merely re-applies already-default state. It resets all seven view-local slots the phone gets for free
  by remounting `MapHost`. `proximityModule` / `proximityLoadRef` are correctly *not* reset (module cache).
- **Index/fit effect ordering.** The index effect is declared before the render effect, so within a
  commit the index is rebuilt before it is read — no stale-index window. `clusterModRef` is populated
  before `new mapboxgl.Map`, so it can never be null when `ready` flips. Retry nulls `indexRef` in
  cleanup and rebuilds on the next `ready`.
- **Long-press timer lifecycle.** `cancelLongPress` is `useCallback([])`; `useEffect(() => cancelLongPress, [cancelLongPress])`
  clears on unmount; all four pointer-exit events cancel; the slop check reclassifies travel as a drag.
  The two disclosed edges (§72e) are the only holes I found. Minor unflagged nit: `pointerdown` doesn't
  check `event.isPrimary`/`button`, so a right-button hold can arm the timer.
- **No race in `handleProximityToggle`.** The phone needs an in-flight ref because it awaits a GPS read;
  the demo's handler has no await in its own body (the import is fired-and-forgotten), so there is
  nothing to double-activate. Dropping the guard is correct, not an omission.
- **XSS.** `createCameraEl` is the only new `innerHTML` path carrying visitor data; `displayName` and
  `resolution` go through `escapeHtml` and land in text position, and `formatCoordinate(lat, lng)`
  emits `toFixed(6)` numbers. Attribute interpolations are all `mapTokens` constants. Clean.
- **Type safety.** `isolatedModules` respected (all type re-exports are `export type` / inline `type`
  modifiers). The three `as` casts are each guarded or structurally justified:
  `props.cluster_id as number` under `if (props.cluster)`, the `setData` cast under `'setData' in source`,
  and `turfCircle(...) as ProximityRing` narrowing turf's generic `Properties`. `cam.gps!` /`l.gps!` follow
  `hasCapturedCoordinates`, which *is* a type predicate. `@types/geojson` / `@types/supercluster` as
  devDependencies is correct — both are type-only imports.
- **`'use client'`.** Absent from `mapFilters/mapCluster/mapProximity/mapTokens/markerElements` — correct
  per the documented nuance: pure helper modules inheriting the boundary from their importer, none
  reachable from a server component.

---

## TypeScript Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 2 |
| LOW | 3 |

Store-bridge integrity: preserved
Engine purity: n/a (no engine file in the diff)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Dynamic-import discipline (§72): **preserved — no static leak of `mapCluster` / `mapProximity`**

**Verdict: REVISE**

Notes: The supercluster premise is settled and was not re-litigated. Both HIGHs are wiring defects in
the new proximity path, not architecture breaches — one camera-fit scoping error with a clean phone
reference, one un-caught lazy import that caches its own failure.

---

# Fix-delta r1

**Delta:** `b0381b7..fcfe774` on `feat/parity-p6` (20 commits, merge `fcfe774`)
**Map:** PR #35 fix-round comment · `docs/code-reviews/deferred.md` §72 (amended) + §79 (a–g)
**Method:** re-ran the two instrumented probes from the initial pass against the fixed source, plus a
fresh read of every commit that touched a finding of mine, plus a fresh-diff review of §79a.

**All 7 of my findings are FIXED. Zero regressions in this lane. One new LOW on §79a.**

## Gates (targeted only, per the standing rule)

| Gate | Result |
|---|---|
| `MapCanvas.test.tsx` + `MapScreen.test.tsx` + `MapScreen.proximity-chunk.test.tsx` | 88 passed / 3 files |
| Lane probes (4, written + run + removed) | 4 passed, **bracketed by a clean-tree check before and after** (see the worktree warning below) |
| `pnpm exec tsc --noEmit` | clean over all tracked sources. The one diagnostic emitted — `ZZd3-states.test.tsx(138,57) TS2802` — is in an **untracked** foreign probe file, not this branch. |
| Dynamic-import discipline (§72/§79f) | re-swept: still only `import type` (`MapCanvas.tsx:10,12`, `markerElements.ts:2`, `MapScreen.tsx:22`), `typeof import()` (`:52`, `:47`) and real `import()` (`MapCanvas.tsx:308`, `MapScreen.tsx:145`). No static leak. |
| Store bridge | re-swept: `useStore` still appears nowhere in `features/demo/ui` outside `DemoExperience.tsx`. |

## Disposition of my findings

| # | Finding | Fix | Status |
|---|---|---|---|
| HIGH-1 | Proximity re-fits the camera | R-1 `83b5b95` | **FIXED (+ more than asked)** |
| HIGH-2 | `loadProximity()` unhandled + poisoned ref | R-2 `819f0d0` | **FIXED** |
| MEDIUM-1 | Map-boot import bypasses the error overlay | R-3 `f7d5af3` | **FIXED** |
| MEDIUM-2 | `moveend` wipes the camera callout | R-4 `81c287d` | **FIXED** |
| LOW-1 | `normalizeBbox` clamp lossy across the antimeridian | R-25 `cab59d4` | **FIXED (refutation upheld)** |
| LOW-2 | `EMPTY_MAP_FILTERS` shared mutable | R-13 `af8bf71` | **FIXED** |
| LOW-3 | `FALLBACK_CENTER` duplicates `DEFAULT_CENTER` | R-18 `3281e44` | **FIXED** |

### HIGH-1 — FIXED, and the fix went past the finding

`MapCanvas` now takes a separate `fitPoints?: readonly LngLat[]` (`MapCanvas.tsx:28-37`) which
`MapScreen` feeds from `buildFitPoints(filtered)` — the **pre**-proximity projection
(`MapScreen.tsx:195-197`). The index rebuild stayed keyed on `markers` identity (`:445-449`,
correct — clustering must track what is plotted); only the fit moved into its own effect
(`:477-481`).

The author also fixed the half I had explicitly *not* flagged: the fit now keys on `fitKey`, a
sorted value key (`:469-472`), and reads the array through `fitPointsRef` so identity alone can
never re-trigger it. I had reasoned that the keystroke re-fit was phone-consistent (the phone's
`cameraBounds` is derived from `filteredCollection`, so it does move on a filter change) and left
it. That reasoning was about the *input*, not the *trigger* — a keystroke that leaves the surviving
set byte-identical was still yanking the camera, and the phone's declarative `Camera bounds` only
re-applies on a value change. The fix is right and strictly better than what I asked for.

Probe (re-run, MapScreen harness, 3 locations + incident):

```
mount                → fitBounds 1, setCenter 0
proximity ON         → fitBounds 1, setCenter 0     (was 1 → 2)
radius preset 0.5 km → fitBounds 1, setCenter 0     (was 2 → 3)
search 'a' (set unchanged) → fitBounds unchanged     (was 1 → 2)
search 'dock' (set genuinely narrows) → fit fires    (correctly still re-fits)
```

### HIGH-2 — FIXED

`loadProximity`'s `.catch` (`MapScreen.tsx:150-156`) nulls `proximityLoadRef.current`, reverts
`setProximityActive(false)`, surfaces `PROXIMITY_UNAVAILABLE` through the already-wired
`DemoNotification`, and `console.warn`s the breadcrumb. Three things I checked at source rather
than trusting the commit message:

- **No unhandled rejection remains.** The catch `return null`s, so the stored promise settles
  *fulfilled*; `void loadProximity()` at `:290` and `:306` can no longer produce an
  `unhandledrejection`. The return type widened to `Promise<ProximityModule | null>` to match.
- **The ref-nulling is not racy.** `proximityLoadRef.current = <promise>` completes synchronously;
  the `.catch` that nulls it runs in a later microtask, so the null always wins.
- **Off→on genuinely re-imports.** `MapScreen.proximity-chunk.test.tsx:104-116` mocks the module to
  throw at import and asserts a **second** `console.warn` after a second press — the only signal a
  memoised rejected promise could not produce, since it has already run its single `.catch`. That is
  the right pin for this defect.

### MEDIUM-1 — FIXED, and a sibling hole I missed was closed with it

The boot path is wrapped in try/catch (`MapCanvas.tsx:305-358`) with its own honest copy,
`MAP_ENGINE_ERROR = "The map engine couldn't load."` (`:147`), routed through a `MapFailure =
'engine' | 'style'` discriminant so the overlay says which failure it is (`:617`). Retry re-runs the
effect, and webpack re-attempts a failed chunk on the next `import()`, so it is a real recovery.

R-11 (not mine) closed the inverse hole in the same handler: post-load `'error'` was unconditionally
ignored, so `_revokeAuth`, `AJAXError` 401/403/429 and WebGL context loss all landed in the "just a
tile" arm. `isTerminalMapError` (`:169-176`) now escalates those to the overlay. My original note
said the post-load ignore was "deliberate and correct" — that was right about tiles and wrong about
the event's full range. Good catch by whoever filed it.

### MEDIUM-2 — FIXED

Pins and cameras now plot from separate effects into separate refs (`pinObjsRef` / `cameraObjsRef`,
`:266-267`); `renderRef.current = renderPins` only (`:441`), so `moveend` no longer touches cameras
(`:429-439`, `:490-493`). Probe (re-run):

```
click camera button      → display "block", aria-expanded "true"
emit 'moveend' x2
same marker element?     → TRUE   (was false)
callout display          → "block"  (was "none")
aria-expanded            → "true"   (was "false")
```

### LOWs — all three FIXED

- **LOW-1:** the clamp is gone; `normalizeBbox` keeps only the `Number.isFinite` guard and the
  `>= 360 → WORLD_BBOX` branch, and passes the bbox through (`mapCluster.ts`). The disposition cites
  the same supercluster source evidence I did.
- **LOW-2:** `EMPTY_MAP_FILTERS` is `Object.freeze`d, **including the inner `statuses` array**, and
  `MapFilterState`'s fields are `readonly` (`mapFilters.ts:47-61`). The comment records the exact
  trade-off I described — identity preserved on purpose so the no-op reset stays an `Object.is`
  bail-out, rather than swapping in a factory. Correct call.
- **LOW-3:** one `DEFAULT_MAP_CENTER: LngLat` in `mapTokens.ts:19`, consumed by both `MapCanvas`
  (`:318`) and `MapScreen` (`:293`). The duplicate literal is gone.

## New code reviewed as a fresh diff — §79a `toContainerPoint` (`MapCanvas.tsx:211-232`)

**Correctness: CONFIRMED at source.** I verified the ported formula against the installed library
rather than the commit message. `node_modules/mapbox-gl` is **3.25.0**, and
`dist/mapbox-gl-dev.js:57053-57058` reads:

```js
function getScaledPoint(el, rect, e) {
  const scaling = el.offsetWidth === rect.width ? 1 : el.offsetWidth / rect.width;
  return new index.Point((e.clientX - rect.left) * scaling, (e.clientY - rect.top) * scaling);
}
```

The port matches, and the two differences are both benign or safer:

- mapbox short-circuits `offsetWidth === rect.width → 1`; the port always divides. For equal finite
  non-zero operands IEEE-754 division yields exactly `1`, so the branch is a micro-optimisation, not
  a semantic difference.
- mapbox has **no zero guard**: `rect.width === 0` with `offsetWidth > 0` gives `Infinity` and a
  `NaN` point. The port's `rect.width > 0 && offsetWidth > 0` guard returns `1` instead. Strictly
  safer, and it is what makes jsdom's all-zero rect a no-op rather than a `NaN` coordinate.

Three premises the fix depends on, each checked rather than assumed:

1. **The transform is uniform.** Applying the X-derived scale to the Y axis is only correct under a
   uniform scale. `PhoneFrame.tsx` applies `transform: scale(${scale})` with a single scalar
   (`transformOrigin: 'top center'`) — uniform. The origin is irrelevant because `rect.left`/`rect.top`
   already report the painted position. mapbox has the identical single-axis assumption.
2. **The measured element is the right one.** mapbox measures `map.getCanvasContainer()`; the port
   measures the outer `data-map-canvas` div passed as `container`. `.mapboxgl-canvas-container` fills
   its parent exactly and the div carries `position:absolute; inset:0` with no padding or border, so
   the two rects and both `offsetWidth`s coincide — and that outer box is the space `unproject`
   expects (the transform's `width`/`height` come from the container's untransformed layout box).
3. **The test pins the scaled case.** It does — `toContainerPoint` is exported and unit-covered at
   scale 0.5 (`[200,200]`), scale 1 (`[100,100]`) and the degenerate zero rect
   (`MapCanvas.test.tsx:380-393`). The integration test one block up drives the real `onPointerDown`
   → `unproject([100,100])` path with an offset-but-unscaled box, which pins the *wiring*. Together a
   mutation to the scaling reddens the unit test and a mutation dropping the call reddens the
   integration test. Adequate; no gap worth filing.

### [LOW] The mapbox coupling is documented by a dev-bundle line number under a caret range, and nothing can detect drift

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:220-222` · `package.json:25`

**Issue.** The comment anchors the port to `mapbox-gl-dev.js:57053-57059` — a line number in a
generated bundle, which moves on every release — while `package.json` allows `^3.25.0`. `mousePos` /
`getScaledPoint` are internal to mapbox and not exported, so no test can cross-check the two
implementations; if a 3.x minor changes the formula, the long-press ring silently diverges from
mapbox's own click handling again and the only symptom is a ring landing slightly off the finger.
The same paragraph also carries an unstated dependency on the container having no padding or border
(premise 2 above) — adding either later would silently offset every long press with nothing to catch
it.

This is a documentation-durability nit on otherwise-correct code, not a defect.

**Fix.** Anchor the citation to the *version* rather than the line (`mapbox-gl 3.25.0,
getScaledPoint`), note in the same comment that the outer container must stay padding/border-free
for the two spaces to coincide, and add a §79-style trigger so a mapbox major/minor bump re-checks
the formula.

## Worktree hazard (operational, not a finding)

`parity-p6` is shared, and while I was verifying, another lane ran a **live mutation sweep** on the
map sources. I observed four distinct uncommitted mutations land and revert over ~4 minutes:
`LONG_PRESS_SLOP 10 → 0`; deletion of the R-5 marker-target guard (`MapCanvas.tsx:571`); `markers`
added to the camera effect's deps (`:493`) — which is *inside* the region my R-4 probe measures; then
edits in `mapCluster.ts` and `mapProximity.ts`. Three untracked foreign probe files
(`ZZd1-chunkfail`, `ZZd2-proximity`, `ZZd3-states`) are also present, and `ZZd3` is the sole source of
the `tsc` diagnostic above.

I therefore re-ran my probes only after polling for a clean tree, and bracketed the run with
`git diff --name-only features/demo/ui/screens/map/` immediately before and after — both empty. The
results reported here are against committed `fcfe774` source. Any lane in this worktree that measured
without that bracket should re-check; a mutation-sweeping lane should get its own worktree.

## Fix-delta Summary

| Severity | Count (new this round) |
|---|---|
| CRITICAL | 0 |
| MEDIUM | 0 |
| LOW | 1 |

Prior findings: 7 filed → **7 FIXED**, 0 partial, 0 refuted.
Store-bridge integrity: preserved · Engine purity: n/a · Barrel + isolation: preserved
Determinism seam: preserved · Dynamic-import discipline (§72/§79f): preserved (grep-enforced only)

**Verdict: APPROVE**

Notes: HIGH-1's fix corrected a trigger defect I had reasoned my way past; R-11 closed a post-load
error hole I had explicitly (and wrongly) blessed. §79a's port is correct against the installed
mapbox 3.25.0 source, uniformly-scaled by construction, and its scaled case is genuinely pinned —
the one LOW is about how the coupling is documented, not what it computes.
