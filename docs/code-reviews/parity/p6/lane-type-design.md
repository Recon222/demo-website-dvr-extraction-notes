# P6.1 — Type Design lane review (PR #35, `master..feat/parity-p6`)

**Lane:** type-design-analyzer · **Mode:** initial · **Scope:** the map-depth type surface —
`mapData.ts`, `mapFilters.ts`, `mapCluster.ts`, `mapProximity.ts`, `mapTokens.ts`,
`markerElements.ts`, `buildMarkers.ts`, `MapCanvas.tsx`, `MapControls.tsx`, `MapScreen.tsx`,
`LocationDetailCard.tsx`.

**Pre-flight:** `npx tsc --noEmit` clean on the branch (verified). Every finding below was checked
against the compiler; the four marked **probe-verified** were confirmed by editing the source,
running `tsc --noEmit`, and reverting. Worktree left clean (no source changes, nothing committed).

**Context read first:** PR #35 body (deliberate-choices list honoured — see *Not re-flagged*),
`docs/code-reviews/deferred.md` §72 (a–e) and the tracked type gaps §4/§5/§16/§27,
`features/demo/CLAUDE.md`.

**Headline:** no CRITICAL, no HIGH. The marker lattice is structurally sound (a camera cannot reach
the pin factory and vice-versa — the compiler stops it), the units are consistently named, the
first-paint boundary holds, and there is no parallel entity declaration anywhere in the diff
including the tests. What the diff does leave is a cluster of **shape-honesty** gaps: the one place
the code opts *out* of a discriminated union the library already provides (T1), a four-stage
pipeline whose stages are all the same nominal type (T3), and a handful of correlated/derived
fields modelled flat where this repo's own precedents say union or derive (T4, T5).

---

## MEDIUM

### T1 — supercluster's cluster/point union is cast-laundered into an all-optional bag; three unsound `as` and a fabricated `count: 0`

```
Type:              PointProps + the `props` cast at features/demo/ui/screens/map/mapCluster.ts:66-68, 99, 111-127
Invariant violated: "a cluster feature always has point_count and cluster_id; a point feature always has marker"
Construction site:  mapCluster.ts:113  (the cast), :115 (`?? 0`), :119 (`as number`), :126 (`as MarkerDescriptor`)
```

`buildClusterIndex` instantiates `new Supercluster<PointProps>({…})` (`:99`) and then discards the
return union:

```ts
const props = feature.properties as Partial<Supercluster.ClusterProperties> & Partial<PointProps>
if (props.cluster) {
  const count = props.point_count ?? 0            // :115
  return { …, clusterId: props.cluster_id as number, count, label: abbreviateCount(count) }
}
return props.marker as MarkerDescriptor           // :126
```

`getClusters` is declared `Array<ClusterFeature<C> | PointFeature<P>>` — a genuine discriminated
union. The `as Partial<…> & Partial<…>` collapses it to a flat bag where **every** field is
optional, and the three subsequent assertions exist purely to undo the damage the first one did.
Consequences the type now permits:

- `count: 0` is representable. `abbreviateCount(0)` → `"0"`, `clusterRadiusFor(0)` → 16, and
  `createClusterEl` (`markerElements.ts:53-55`) writes `data-cluster-count="0"` and
  `aria-label="Cluster of 0 locations"`. supercluster's `minPoints` default of 2 is the only thing
  preventing it — the type asserts nothing.
- `props.cluster_id as number` silently types `undefined` as `number`. It reaches
  `expansionZoom(clusterId)` → `getClusterExpansionZoom(undefined)`.
- `props.marker as MarkerDescriptor` is unchecked: if a future `index.load` site changes the
  property shape, `undefined` flows out as a `MarkerDescriptor` and `createMarkerEl(d)` dereferences
  `d.id`/`d.kind` at render time. Nothing compiles-red.

**Probe-verified fix (zero casts, strictly stronger, compiles today with the *existing* generics):**

```ts
for (const feature of index.getClusters(normalizeBbox(bbox), safeZoom)) {
  const [lng, lat] = feature.geometry.coordinates
  if ('cluster' in feature.properties) {
    const count = feature.properties.point_count          // number, required
    const clusterId = feature.properties.cluster_id       // number, required
    …
  } else {
    out.push(feature.properties.marker)                   // MarkerDescriptor, required
  }
}
```

I compiled exactly this against the branch's `@types/supercluster@7.1.3` — `tsc --noEmit` clean, no
assertions, `point_count`/`cluster_id`/`marker` all non-optional. The `?? 0` and both `as` can go.

Secondary (same fix site): the class's **second** generic is left at its default,
`C = Supercluster.AnyProps = { [name: string]: any }`. Probe-confirmed that
`feature.properties.totally_made_up_key` compiles and is `any` on the cluster arm — an open `any`
surface on a boundary the module otherwise types carefully. Since the module supplies no
`map`/`reduce` option there are no extra cluster props, so `new Supercluster<PointProps, Record<string, never>>(…)`
closes it (also probe-verified clean).

**Fix:** narrow with `'cluster' in feature.properties`, delete all four assertions and the `?? 0`
sentinel, and close the second generic. Repo precedent: the house discriminates on a tag and lets
payload live only on the arm that owns it (`ImportRunResult`, `ExtractClientResult`, `OcrResult`) —
here the library already handed that union over and the module gave it back.

---

### T2 — new module-level shared constants are mutable; `EMPTY_MAP_FILTERS`'s array is the live filter state on every mount and every case switch

```
Types: MapFilterState at features/demo/ui/screens/map/mapFilters.ts:25-30
       EMPTY_MAP_FILTERS at mapFilters.ts:33
       WORLD_BBOX        at mapCluster.ts:56
       NO_MARKERS / NO_CAMERAS at MapCanvas.tsx:65-66
       NO_CAMERAS / FALLBACK_CENTER at MapScreen.tsx:29, 33
Permitted invalid state: any consumer can mutate a constant every other consumer shares
```

`MapFilterState.statuses` is `LocationMapStatus[]` (mutable) and `EMPTY_MAP_FILTERS` is a plain
object literal, not `as const`, not frozen. `MapScreen` seeds state with it (`:109`) **and** resets
to it on every case switch (`:145`), so the module-level array instance *is* the live
`filters.statuses` for every fresh mount. One `filters.statuses.push(…)` or `.sort()` anywhere
downstream corrupts the constant for the rest of the session. This is the exact failure the PR #8
shared-catalog fix hardened against — precedent #7, "new module-level registries must be
`readonly`" — and it is why `WIZARD_SCREENS`/`CHAPTERS`/`DRAWER_DEFS`/`EXPLORE_ITEMS` all carry it.

Nothing mutates them today (`toggleStatus` is `.includes`/`.filter`/spread throughout), so this is a
defense-in-depth gap, not a live bug.

Completeness sweep — every module-level shared value the diff added, and its state:

| Constant | File:line | `readonly`? |
|---|---|---|
| `MAP_FILTER_STATUSES` | mapFilters.ts:23 | ✅ `readonly LocationMapStatus[]` |
| `PROXIMITY_PRESETS` | mapTokens.ts:95 | ✅ `as const` |
| `MAP_GLASS_COLORS` / `PROXIMITY_COLORS` / `CLUSTER_COLORS` / `CAMERA_MARKER` / `MAP_SURFACE_COLORS` | mapTokens.ts:25/45/59/100/115 | ✅ `as const` |
| `EMPTY_MAP_FILTERS` | mapFilters.ts:33 | ❌ mutable object + mutable array |
| `WORLD_BBOX` | mapCluster.ts:56 | ❌ mutable tuple, and **returned by** `normalizeBbox` (`:86-87`) into caller hands |
| `NO_MARKERS`, `NO_CAMERAS` | MapCanvas.tsx:65-66 | ❌ mutable arrays, handed to `buildClusterIndex`/`renderMarkers` |
| `NO_CAMERAS`, `FALLBACK_CENTER` | MapScreen.tsx:29, 33 | ❌ mutable |

**Fix:** `MapFilterState.statuses: readonly LocationMapStatus[]`; `as const` (or
`readonly [number, number, number, number]` for `ClusterBbox`) on the five bare constants. Cascades
to `toggleStatus`/`matchesStatusFilter` param types, which is the same change as T-LOW-6 below —
they should land together.

---

### T3 — the pipeline's four stages share one nominal type, and the "N of M" single-tally rule is two bare `number`s in a swappable order

```
Types: MapData at mapData.ts:86-91 (the type of all four stages)
       MapControlsProps.locationCount / filteredCount at MapControls.tsx:39-42
Permitted invalid state: reading the wrong stage, or transposing the two counts, both compile
```

`MapScreen` holds four values of the identical type `MapData`:

| Stage | MapScreen.tsx | Meaning |
|---|---|---|
| `mapData` (prop) | `:41`, `:156` | raw projection |
| `filtered` | `:156` | post status/text filter — the **"of M"** denominator |
| `proximityResult.data` | `:158-161` | post-radius |
| `display` | `:163` | what renders |

The rule §72 and the PR body describe — *"`locationCount` is the POST-filter count; only proximity
produces N of M"* — is enforced entirely by which of the four identifiers each of the six read sites
happens to name (`:164` markers ← `display`, `:169` locationCount ← `filtered`, `:170` filteredCount
← proximity, `:173` selection ← `display`, `:241` proximity anchor ← `filtered`,
`:307-308` sheet ← `display`). All six are correct today. All six would still compile if any one of
them named a different stage, and the tally would silently change meaning — e.g.
`countLocations(mapData.items)` at `:169` makes "of M" the *unfiltered* total, which is exactly the
phone behaviour §72 says was ported verbatim to avoid.

The same rule surfaces again as two adjacent same-typed numbers:

```ts
// MapControls.tsx:128-133
export function locationCountLabel(filteredCount: number, locationCount: number): string
// MapControls.tsx:177 — declared prop order is (locationCount, filteredCount); the call is reversed
{locationCountLabel(filteredCount, locationCount)}
```

Transposing them compiles and renders `"7 of 3 locations"`.

**Fix (house pattern, not new machinery):** have the pipeline return **one resolved result** rather
than four interchangeable ones — the "parser/mapper output completeness" rule and the
`ImportRunResult`/`MappedImport` precedent ("half-resolved types push the same work to every
consumer and drift"):

```ts
interface MapProjection {
  display: MapData                   // post-everything — the only thing that renders
  locationCount: number              // "of M" — post-filter
  filteredCount: number              // "N"    — post-proximity
  ring: ProximityRing | null
}
```

built by one function so the tally rule has a single home, and `locationCountLabel` takes the object
instead of two positional numbers. If the split stays, at minimum make `locationCountLabel` take
`{ filteredCount, locationCount }`.

---

### T4 — `MapData` stores `pins` and `incident`, which are pure functions of `items`; this diff took the construction sites from one to three

```
Type: MapData at mapData.ts:86-91
Permitted invalid state: { pins: [10 pins], items: [], incident: {…} } — a map showing ten markers over an empty sheet
Construction sites: mapData.ts:201 · mapFilters.ts:88-93 · mapProximity.ts:83-92
```

`MapPin { id, lng, lat, status }` is entirely derivable from `LocationSheetItem { id, coord, status }`,
and `MapIncident { id, caseNumber, displayName?, lng, lat }` entirely from `IncidentSheetItem`.
`buildMarkers` (`buildMarkers.ts:15-35`) reads only `pins` and `incident`; `MapBottomSheet` reads only
`items`. So the same facts are carried twice, in two fields that must agree, with the type unable to
say so.

Master had one construction site. This diff added two more, and each hand-rolls the same derivation:

```ts
// mapFilters.ts:86-89  and  mapProximity.ts:80-85 — duplicated verbatim
const keptIds = new Set(items.filter((i) => i.kind === 'location').map((i) => i.id))
pins: data.pins.filter((p) => keptIds.has(p.id)),
```

plus a third correlated field only `computeProximity` maintains (`incident: incidentKept ? data.incident : null`,
mapProximity.ts:81/86 — `applyMapFilters` correctly doesn't need it because the incident is filter-exempt,
but the type doesn't record *why* one stage nulls it and the other doesn't).

Credit where due: the diff **fixed** the third such field — `statusCounts` was an inline loop in
master and is now the shared `countStatuses(items)` called by all three stages (mapData.ts:201,
mapFilters.ts:92, mapProximity.ts:88). That is precisely the right move; `pins`/`incident` are the
two it didn't finish.

**Fix:** shrink `MapData` to `{ items, incident }` — or to `{ items }` — and derive the plot set at
the render boundary (`buildMarkers(items)`). Repo precedent #4: `ScopeRetention` deliberately omits
`status` "so the two can't drift." This isn't a captured record (the `TimeOffsetData`
counter-precedent) — it is a render-time convenience recomputed from live store state on every
projection, so the derive side is the right call.

---

### T5 — `LocationDetailCardProps` gained a second pair of variant-only props on a flat shape whose `item` is a union; `camerasShown` without `onToggleCameras` is representable

```
Type: LocationDetailCardProps at LocationDetailCard.tsx:8-26 (camerasShown :22, onToggleCameras :25 — both NEW)
Permitted invalid state: { item: IncidentSheetItem, camerasShown: true, onToggleCameras: fn }
                         { item: LocationSheetItem, camerasShown: true }   ← no handler
Construction site: MapScreen.tsx:258-269 (all props passed unconditionally, both variants)
```

`item: SheetItem` is already a discriminated union (`kind: 'location' | 'incident'`), and four of the
props are documented "*variant only*" in their own doc comments — `onEditIncident` "Incident variant
only" (pre-existing, R-14, not re-flagged), and the two the diff adds, both "Location variant only".
The props type doesn't correlate them with `item.kind`, so `MapScreen` passes the incident handler
and the camera handlers on every render regardless of which variant is showing.

The concrete new hole: the render guard is `item.cameras.length > 0 && onToggleCameras`
(`:159`), so `camerasShown: true` with `onToggleCameras` omitted renders **no toggle row at all**
while `MapScreen`'s `visibleCameras` (`:177-180`) still plots the markers — cameras on the map with
no way to turn them off. One caller today, but the PR body flags P5.4 reconciling props through this
same surface, so a second caller is imminent.

**Fix:** discriminate the props on the item, precedent #1 (`RetentionView`: "the union makes
'no total ⇒ no scopes' unrepresentable otherwise"):

```ts
type LocationDetailCardProps =
  | { item: IncidentSheetItem; onBack(): void; onEditIncident(caseId: string): void }
  | { item: LocationSheetItem; onBack(): void; onCall(n: string): void; onEmail(a: string): void
      onGoToLocation(id: string): void; camerasShown: boolean; onToggleCameras(): void }
```

Note this also removes the `camerasShown = false` default and makes the pair required-together,
which is what the component actually needs. If the union is judged too much churn for the caller,
the minimum is to pair the two new props into one optional object
(`cameras?: { shown: boolean; onToggle(): void }`) so half of it can't arrive alone.

---

### T6 — `MAP_FILTER_STATUSES` completeness is unenforced while its two siblings in the same feature are `Record<LocationMapStatus, …>`; a fourth status would be silently un-toggleable

```
Type: MAP_FILTER_STATUSES at mapFilters.ts:23  (`readonly LocationMapStatus[]`)
Permitted invalid state: a LocationMapStatus member absent from the array
Downstream: toggleStatus (mapFilters.ts:47-55) re-sorts through the registry and DROPS the member
```

```ts
export const MAP_FILTER_STATUSES: readonly LocationMapStatus[] = ['started', 'working', 'complete']
…
return MAP_FILTER_STATUSES.filter((s) => next.includes(s))   // :54
```

The element type is bound to the union (good), but nothing checks the array is *complete*. Add a
fourth member to `LocationMapStatus` (selectors.ts:215) and the build breaks in `mapTokens.ts` —
`MAP_PIN_COLORS` (`:7`) and `STATUS_LABEL` (`:14`) are both `Record<LocationMapStatus, string>`, so
they are exhaustive-by-construction. The author fixes those two, and `MAP_FILTER_STATUSES` — in a
different file — stays three-wide. The result is not just a missing pill: `toggleStatus` re-derives
the active set by filtering *through the registry*, so pressing the new pill would return a set
without it and the filter could never be turned on. Silent, and only visible by clicking.

This is the same class as tracked **§4** ("registry exhaustiveness … should become a
`satisfies Record<Union, …>` so an unregistered screen is a compile error"). It is a *new* registry
in a new file rather than §4's surface, so it is filed rather than folded — but folding it into §4
and deferring is a defensible call for the fix round.

**Fix:** derive the order from an exhaustive record, §4's stated direction:

```ts
const STATUS_PILL_ORDER = { started: 0, working: 1, complete: 2 } satisfies Record<LocationMapStatus, number>
export const MAP_FILTER_STATUSES: readonly LocationMapStatus[] =
  (Object.keys(STATUS_PILL_ORDER) as LocationMapStatus[]).sort((a, b) => STATUS_PILL_ORDER[a] - STATUS_PILL_ORDER[b])
```

---

## LOW

### L1 — `as ProximityRing` is redundant (probe-verified)

`mapProximity.ts:67`. `@turf/circle` is declared
`circle<P extends GeoJsonProperties = GeoJsonProperties>(…): Feature<Polygon, P>`; with
`point(center)` supplying no properties, `P` resolves to `GeoJsonProperties` and the return type is
already `Feature<Polygon>` ≡ `ProximityRing`. Removing the `as` compiles clean (verified, reverted).
An assertion that isn't doing work is one that will keep compiling when the upstream signature
changes.

### L2 — `cam.gps!` is redundant (probe-verified)

`mapData.ts:122`. `hasCapturedCoordinates` is a real type predicate
(`coordinates.ts:63`: `value is { lat: number; lng: number }`), so `cam.gps` is already narrowed to
`CameraGpsFix` after the `continue` guard. `const gps = cam.gps` compiles clean (verified,
reverted). (The five `l.gps!` in `toMapData` are *not* removable — `Array.prototype.filter` with a
non-predicate arrow doesn't narrow — and are pre-existing; leaving those alone is correct.)

### L3 — the mapbox `Source` union is cast away where it narrows (probe-verified)

`MapCanvas.tsx:358-360`:
```ts
if (source && 'setData' in source) (source as { setData(data: ProximityRing): void }).setData(proximityRing)
```
`map.getSource()` returns mapbox's own `Source` union. Both `source.type === 'geojson'` and the
existing `'setData' in source` narrow to `GeoJSONSource` and let `setData(ring)` type-check with no
assertion (both verified clean, reverted). The hand-written structural type would also accept any
unrelated object carrying a `setData`, and hides a future signature change.

### L4 — the marker-**kind** value space is four string literals with no type; `MapCameraMarker` carries no discriminant

`buildMarkers.ts:9` (`'location' | 'incident'`), `mapCluster.ts:41` (`'cluster'`),
`mapData.ts:39-47` (a camera marker with *no* `kind` field), and the DOM writes at
`markerElements.ts:20` (from `d.kind`), `:52` (literal `'cluster'`), `:93` (literal `'camera'`).
`data-marker-kind` is the tap/assertion seam §72a calls out as load-bearing, and its value space
exists only as scattered literals — the test helpers read it as bare `string`
(`MapCanvas.test.tsx:79`, `MapScreen.test.tsx:57`). A typo in `'camera'` is caught by a test
(`markerElements.test.ts:66`), not by the compiler.

The lattice is *structurally* safe, which is why this is LOW and not higher: `createCameraEl` takes
`MapCameraMarker` and `createMarkerEl` takes `MarkerDescriptor`, and the two shapes are disjoint, so
neither can be passed to the other's factory. **Fix:** `export type MarkerKind = 'location' | 'incident' | 'cluster' | 'camera'`
in `mapTokens.ts`, have all three `setAttribute` sites and the test helpers take it. Precedent #5
(`motion.ts` types its params to the view union "so a typo'd literal is a compile error").

### L5 — §72's "only location clusters" is a runtime filter, not a type

`mapCluster.ts:96-97` partitions with `markers.filter(m => m.kind === 'location')` /
`filter(m => m.kind !== 'location')`, and `PointProps.marker` (`:66-68`) is the whole
`MarkerDescriptor`. The invariant §72a and the module header both assert — the incident teardrop
never aggregates into a cluster circle — is therefore convention. No reachable invalid state (the
filter is the only load path, and the `!==` partition fails *safe*: a future kind would land in
passthrough, i.e. un-clustered), hence LOW.

**Cheap fix that makes it type-visible:** split the union at the source and narrow the index's
payload:
```ts
export interface LocationMarker { kind: 'location'; id: string; lng: number; lat: number; color: string }
export interface IncidentMarker { kind: 'incident'; … }
export type MarkerDescriptor = LocationMarker | IncidentMarker
interface PointProps { marker: LocationMarker }   // the index literally cannot hold an incident
```

### L6 — read-only parameters and payloads typed as mutable arrays across the new pure modules

`countStatuses(items: SheetItem[])` / `countLocations(items: SheetItem[])` (mapData.ts:100, :109),
`toggleStatus(statuses: LocationMapStatus[], …)` / `matchesStatusFilter(item, statuses: LocationMapStatus[])`
(mapFilters.ts:48, :58), `itemsWithinRadius(items: SheetItem[], …)` (mapProximity.ts:47),
`buildClusterIndex(markers: MarkerDescriptor[])` (mapCluster.ts:95),
`LocationSheetItem.cameras: MapCameraMarker[]` (mapData.ts:69). All are read-only in practice.
Precedent: `buildRetentionView` takes `ReadonlyArray<{ startDateTime: string }>`. Land this with T2.

### L7 — `[number, number]` position tuples sit beside a `(lat, lng)`-ordered function

Five distinct positional pairs in the diff, all `[lng, lat]`: `SheetItem.coord` (mapData.ts:56, :81 —
these two *do* carry the `// [lng, lat]` comment), `ClusterCameraTarget.center` (mapCluster.ts:137 —
does **not**), `computeProximity`/`generateRadiusCircle`/`itemsWithinRadius`'s `center` params
(mapProximity.ts:48, :60, :76), `MapCanvasHandle.getCenter()` (MapCanvas.tsx:22), `FALLBACK_CENTER`
(MapScreen.tsx:33) — while `formatCoordinate(lat, lng)` (coordinates.ts:36) takes the **opposite**
order and is called from two of those sites (`LocationDetailCard.tsx:90` as `(coord[1], coord[0])`,
`markerElements.ts:119` as `(camera.lat, camera.lng)`). Both call sites are correct and tested; a
transposition is silent. No brand recommendation (house rule), but a labelled tuple alias costs
nothing and shows up in editor hints:
`export type LngLat = readonly [lng: number, lat: number]` in `mapTokens.ts`, applied to all five.
At minimum, give `ClusterCameraTarget.center` the `// [lng, lat]` comment its siblings carry.

### L8 — `MapCameraMarker`'s two soft fields don't match their documented invariants

`mapData.ts:39-47`:
- `locationId: string` is **written and never read** — the only reference outside the constructor
  (`:125`) is a test fixture (`MapCanvas.test.tsx:183`). It also duplicates the prefix of `id`
  (`` `${loc.id}:${cam.id}` ``, `:124`), so two fields must agree with no type link — the
  derived-and-stored shape precedent #4 argues against. Either drop it or document it as reserved
  for the aggregate All-Cases projection `mapData.ts:10` already names.
- `resolution?: string` is documented "emitted truthy-only … so the callout can rely on key presence
  rather than re-testing for the empty string", but the type permits `resolution: ''`. The consumer
  doesn't take the offer — `markerElements.ts:115` re-tests `if (camera.resolution)` anyway. Either
  the doc claim or the consumer's guard is redundant; the type should decide which. (`accuracyM` has
  the same pattern: constructed `!= null`-gated at `:130`, re-checked `!= null && Number.isFinite`
  at `:121`.)

### L9 — `{ started: number; working: number; complete: number }` is written out four times instead of `Record<LocationMapStatus, number>`

`mapData.ts:90`, `mapData.ts:100` (**new** in this diff — `countStatuses`'s return annotation),
`MapBottomSheet.tsx:13`, `SheetHandle.tsx:10`. The tally's *write* site is union-checked
(`counts[item.status]++` would go red if `LocationMapStatus` grew), so there's no reachable invalid
state — but the shape has no link to the union it enumerates, and the diff added the fourth copy.
One-line fix: `export type StatusCounts = Record<LocationMapStatus, number>` in `mapData.ts`, used
by all four.

---

## Observations (no action; recorded so the fix-delta doesn't re-derive them)

**The first-paint boundary holds, and here is why.** Every eager reference to the two
dependency-carrying modules is in type position — `import type` at `markerElements.ts:2`,
`MapCanvas.tsx:10`, `MapCanvas.tsx:12`, `MapScreen.tsx:21`; `typeof import(…)` at `MapCanvas.tsx:42`
and `MapScreen.tsx:35` — and the only value paths are the real dynamic `import()`s at
`MapCanvas.tsx:228` and `MapScreen.tsx:123` (grep-verified: no other importer outside `__tests__/`).
Moving `PROXIMITY_PRESETS`/`RadiusPreset`/`clusterRadiusFor`/`clusterFontSizeFor` into `mapTokens.ts`
(mapTokens.ts:66-97) was the right call and is correctly reasoned in its doc comments.

The residual is not fixable in the type system and should not be attempted there: nothing stops a
future eager module from adding a *value* import of `mapCluster`/`mapProximity` and pulling
supercluster/Turf into the demo chunk. The enforcement available is an ESLint
`no-restricted-imports` rule scoped to the eager map files, or a chunk-content assertion — the PR's
own bundle grep is currently the only check, and it isn't in CI. Flagging as a lane observation
rather than a type finding.

**Canonical homes are clean.** No entity shape from `engine/types/index.ts`, `create-store.ts` or
`selectors.ts` is re-declared anywhere in the diff, including all nine new/changed test files
(grep-verified: zero `interface`/`type` declarations across `map/__tests__/*`); the tests import
`MarkerDescriptor`, `ClusterDescriptor`, `MapCameraMarker`, `LocationMapStatus` from their homes and
build fixtures with local factory *functions*, not parallel types. `LocationMapStatus` is imported
from `engine/store/selectors` by all four new UI modules rather than re-spelled.

**Exhaustiveness is fine where it matters.** `PlottedMarker`'s only consumer
(`MapCanvas.tsx:295-306`) narrows with `if (d.kind === 'cluster')` and then passes `d` to
`createMarkerEl(d: MarkerDescriptor)` — so adding a fourth variant to `PlottedMarker` is a **compile
error at the call**, not a silent fall-through. No `default:`-swallowing switch anywhere in the diff.

**`RadiusPreset` is modelled correctly.** `PROXIMITY_PRESETS` is `as const`, `RadiusPreset` is
derived from it (`(typeof PROXIMITY_PRESETS)[number]`), `DEFAULT_PROXIMITY_RADIUS` is typed to it,
and both `MapControlsProps.proximityRadius`/`onRadiusChange` use it — ordering derived from array
position, no hand-typed duplicate list. Precedent #9 satisfied. Units are consistently named
throughout (`radiusKm`, `accuracyM`, `*_MS`, pixel constants unqualified but local); I found no
km/metre/degree/pixel confusion.

**Not re-flagged** (PR body / §72 / tracked): the supercluster-over-`cluster:true` choice (§72a); the
minimal Turf set; "N of M" verbatim semantics and the incident's filter-exempt/proximity-included
asymmetry; §72b's three copy/behaviour adaptations; §72c scale bar; §72d cluster members; §72e
long-press seam; `onEditIncident` being required (R-14/§49a); `TimeOffsetData`-style stored-derived
fields; `updateField(path: string)` (§5); `ExploreItem.covers` test-over-type (§27).

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 6 |
| LOW | 9 |

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **partial** — `SheetItem`/`PlottedMarker`/`ClusterDescriptor` yes;
`LocationDetailCardProps` is a flat shape over a union `item` (T5); the supercluster union is cast
away (T1)
Exhaustiveness enforced (never-checked switches): **n/a** — no switch over a new union; the one
narrowing site is exhaustive-by-construction through the callee's param type
Correlated state modelled as a union: **flat shape found** — T4 (`pins`/`incident`/`items`), T5
(`camerasShown`/`onToggleCameras`/`item.kind`)
Id spaces typed (no bare-string registries/keys): **regression found** — the marker-kind literal
space (L4); `MAP_FILTER_STATUSES` completeness (T6)
readonly discipline on shared data: **gap found** — T2 (five mutable module-level constants), L6
Boundary types honest about untrusted input: **n/a** — no untrusted input in this diff (the one
external-library boundary is T1, where the honest union was available and discarded)

**Verdict: APPROVE with comments.**

No CRITICAL and no HIGH — nothing here permits a state a realistic run reaches, and the lattice that
matters (which factory can receive which marker) is compiler-enforced. T1 is the one I would land
before merge regardless of the rest: it is a strict deletion (four assertions and a sentinel come
out, the types get stronger, `tsc` stays green — probe-verified), it removes the only `any` surface
the diff opens, and it is the single place the code chose *against* the repo's own
discriminated-result precedent. T2 and T4 are cheap and follow directly from PR #8's and
`ScopeRetention`'s established fixes. T3, T5, T6 are judgement calls worth an owner ruling — T3 in
particular touches the P5.4 seam the PR body already flags for reconciliation, so it may be cheaper
to do once, there, than twice.

---

# Fix-delta r1

**Diff reviewed:** `b0381b7..fcfe774` (19 commits, merged head `fcfe774`). **Mode:** fix-delta,
same lane. **Gate:** the orchestrator's merged-head gate is authoritative (226 files / 2744 green,
cold `tsc` clean); per the standing rule I ran no full suite. Every claim below was checked against
the merged head; the five marked **probe-verified** were confirmed with a throwaway `tsc --noEmit`
probe and reverted. Worktree left clean; nothing committed.

**Verdict: APPROVE.** All six MEDIUMs are discharged — three fixed outright (T1, T2, T6), three
partial-with-ledger (T3/§79d, T4/§79b, T5/§79c) where the *named invalid state* is gone in every
case and only the shape change is deferred. Seven of nine LOWs fixed. §79a's maths is correct and
version-verified against the installed dependency. Four fresh nits, all one-token-to-one-line, none
blocking.

## Original findings — disposition

| # | Item | Status | Where |
|---|---|---|---|
| T1 | supercluster cast-laundering | **FIXED** | `mapCluster.ts:126, 149-160` |
| T2 | mutable module-level constants | **FIXED** | `mapFilters.ts:41-61`, `mapCluster.ts:55-59`, `MapCanvas.tsx:74-75`, `mapTokens.ts:19` |
| T3 | stage typing / single-tally rule | **PARTIAL** — minimum landed, shape → §79d | `MapControls.tsx:143-152, 203` |
| T4 | `MapData` derived fields | **PARTIAL** — duplication closed, shape → §79b | `mapData.ts:136-144` |
| T5 | `LocationDetailCardProps` flat over a union | **PARTIAL** — invalid state closed, union → §79c | `LocationDetailCard.tsx:18-30` |
| T6 | `MAP_FILTER_STATUSES` completeness | **FIXED** | `mapFilters.ts:31-39` |
| L1 | redundant `as ProximityRing` | **FIXED** | `mapProximity.ts:64-67` |
| L2 | redundant `cam.gps!` | **FIXED** | `mapData.ts:161-162` |
| L3 | mapbox `Source` structural cast | **FIXED** | `MapCanvas.tsx:509` |
| L4 | `MarkerKind` for the four kind literals | **NOT FIXED, unrouted** | `markerElements.ts:29, 65, 107` |
| L5 | "only locations cluster" as a type | **FIXED** | `mapCluster.ts:74-79, 121` |
| L6 | `readonly` params | **FIXED** (folded into R-13) | `mapData.ts:119,147`, `mapFilters.ts:76,86`, `mapProximity.ts:47`, `mapCluster.ts:120` |
| L7 | `LngLat` for the positional pairs | **PARTIAL** — alias added, 5 of ~12 sites | `mapTokens.ts:8` |
| L8a | `locationId` written-never-read | **REFUSED — accepted** (see below) | `mapData.ts:42-50` |
| L8b | `resolution` truthy-only doc vs re-guarding consumer | **NOT FIXED** | `mapData.ts:37-38, 52` vs `markerElements.ts:129` |
| L9 | `StatusCounts` alias | **FIXED** — all four copies | `mapTokens.ts:17` + 3 importers |

## T1 (R-12) — FIXED, verified

`buildClusterIndex` now closes **both** generics (`new Supercluster<PointProps, Record<string, never>>`,
`mapCluster.ts:126`) and narrows with `'cluster' in props` (`:149`). All four assertions and the
`?? 0` sentinel are gone; `count: props.point_count` and `clusterId: props.cluster_id` read straight
off the narrowed arm, and the point arm is `return props.marker` (`:160`).

**Probe:** `const bad: string = f.properties.point_count` on the cluster arm fails with
`TS2322: Type 'number' is not assignable to type 'string'` — the field is a required `number`, not
`any`. The fabricated-`count: 0` state is no longer representable.

One precision note for the record: with `C = Record<string, never>` an arbitrary key still
*resolves* — through that record's `[x: string]: never` index signature — but to `never`, not `any`.
I probed for a hard error and my `@ts-expect-error` came back unused; the probe's expectation was
wrong, not the fix. The `any` surface the finding named is genuinely gone, and `never` is inert.

**Bonus, same commit:** R-27e landed too — `PointProps.marker: LocationMarker` (`:74-79`) with a
type-predicate filter (`:121`), so my **L5** is fixed as well: "only locations cluster" is now a
compile-time fact rather than the convention §72a described.

## T2 (R-13) — FIXED; the freeze-not-factory call is SOUND

`MapFilterState.statuses`/`searchText` are `readonly` (`mapFilters.ts:43-45`); `EMPTY_MAP_FILTERS`
is frozen at **both** levels — object and inner array (`:58-61`); `WORLD_BBOX` (`mapCluster.ts:59`),
`NO_MARKERS`/`NO_CAMERAS` (`MapCanvas.tsx:74-75`) and the new single-sourced `DEFAULT_MAP_CENTER`
(`mapTokens.ts:19`) are frozen; `ClusterBbox` is now a `readonly` labelled tuple (`:55`). L6's
`readonly` params landed across all six pure functions.

**Judging "freeze, don't factory":** correct, and better than either option I offered. The identity
claim is real — `EMPTY_MAP_FILTERS` is both the initial state and the case-switch reset value
(`MapScreen.tsx:109`, `:174`), so `setFilters(EMPTY_MAP_FILTERS)` on an already-empty state hits
React's `Object.is` bail-out. A factory would have minted a new object and forced a render on every
no-op reset. Freezing keeps the bail-out *and* removes the poisoning hazard. Shallow-freeze would
have left the array writable; they froze it too. Endorsed without reservation.

## T3 (R-14) — PARTIAL as declared; **the deferral's cost grew during the round**

The stated minimum landed: `locationCountLabel({ filteredCount, locationCount })`
(`MapControls.tsx:143-152`, called at `:203`), so the transposable positional pair is gone.

§79d defers the `MapProjection` single-result shape to the P5.4 seam. **The reason is sound** — one
type read by every map surface, second consumer imminent, churn-once is cheaper — and I would make
the same call. But the round itself added two new stage-derived readers on top of the six the
finding counted:

- **`totalCount`** ← `mapData.items` (`MapScreen.tsx:205`) — a **third** bare-`number` stage count on
  `MapControlsProps` (`:43-45`), now sitting beside `locationCount` and `filteredCount`, all three
  `number`, distinguishable only by name and doc comment.
- **`emptyReason`** (`MapScreen.tsx:214-221`) — one expression that reads **three** stages
  (`display.items`, `filtered.items`, `proximityResult`) to decide which one did the emptying.

So the surface went 6 read sites / 2 counts → **9 read sites / 3 counts + a three-stage
discriminator**. That does not overturn the deferral, but it does mean **§79d's trigger is not
specific enough**. As written it fires on "the P5.4 export-map reconciliation, or any third `MapData`
consumer" — neither of which describes what actually happened this round. Recommend amending it to
also fire on *"any new stage-derived count or reader added to `MapScreen`'s projection block"*, which
is the cheaper early warning and the thing that has now happened once.

## T4 (R-15) — PARTIAL as declared; deferral sound, one wording overstatement

`narrowProjection` (`mapData.ts:136-144`) is the single derivation; `applyMapFilters` (`:117`) and
`computeProximity` (`:83`) both call it and the byte-identical `keptIds` filter is gone. The
duplication half of the finding is genuinely closed, and the deferred half is now *less* risky than
when it was filed, because the invariant lives in one function instead of three. §79b's trigger
("the P5.4 export-map reconciliation, or any third `MapData` consumer — whichever comes first") is
specific and checkable. **Accept the deferral.**

One residual worth a line so it is not lost: `narrowProjection` covers *narrowing* stages only.
`toMapData` (`mapData.ts:242`) still builds `pins`/`items`/`statusCounts` independently — it has no
prior `MapData` to narrow, so it structurally cannot use the helper. The invariant is therefore
enforced at 2 of 3 construction sites, not 3 of 3; §79b's "cannot disagree with `items`" reads
stronger than what shipped. A half-sentence amendment, not a fix.

## T5 (R-16) — PARTIAL as declared; deferral sound

`cameras?: { shown: boolean; onToggle(): void }` (`LocationDetailCard.tsx:18-30`) makes the invalid
state the finding named — cameras plotted with no way to hide them — unrepresentable: `shown` cannot
exist without `onToggle`. Verified at the render guard (`:172`) and the caller (`MapScreen.tsx:320`).

§79c defers the full `item.kind` discrimination with a specific trigger ("P5.4's detail-card caller
landing"). **Accept** — one caller today, and the union is worth writing once against both. The
residual is exactly what 79c says it is: `MapScreen.tsx:320` still passes `cameras={{…}}`
unconditionally for both variants, and an `IncidentSheetItem` can still be handed `onCall`/`onEmail`/
`onGoToLocation`. Correctly scoped.

## T6 (R-17) — FIXED

`STATUS_PILL_ORDER … satisfies Record<LocationMapStatus, number>` (`mapFilters.ts:31-35`) with the
array derived by sorting its keys (`:37-39`) — §4's stated direction, exactly. A fourth
`LocationMapStatus` now breaks the build at the record instead of silently vanishing from
`toggleStatus`'s re-derivation. The `Object.keys(…) as LocationMapStatus[]` cast is unavoidable
(`Object.keys` is typed `string[]` in lib.dom) and is the standard idiom.

## L8a — the `locationId` refusal: ACCEPT, minus one false clause

The finding asked the author to "pick one" of drop-it or document-it-as-reserved. They documented it
(`mapData.ts:42-50`), which is a valid discharge: a silently-dead field became a stated one, with a
real forward-parity citation (the phone's `visibleCameraLocationId` gate, `CaseMapView.tsx:397-400`).
**Refusal endorsed.**

One correction: the third justification — *"dropping it would make the composite id a string nobody
could decompose"* — is false. `id` is `` `${locationId}:${cameraId}` ``, so `locationId` is exactly
`id.slice(0, id.indexOf(':'))`; that decomposability **is** the duplication the finding named, now
restated as a reason to keep the duplicate. The first two justifications carry the decision on their
own. Recommend deleting the third clause so a future reader does not inherit a false premise.

## L8b — NOT FIXED, and the claim got louder

`MapCameraMarker.resolution` is still `?: string`, so `resolution: ''` remains representable, and
`markerElements.ts:129` still truthiness-re-tests it. Meanwhile the round *added* a second assertion
of the invariant: the interface doc (`mapData.ts:37-38`) and now a field-level doc (`:52`) both say
the callout "can test presence rather than emptiness" — which it demonstrably does not do. Net effect
of the round on this sub-item: an unenforced claim asserted twice instead of once. Still a nit.
Either drop the consumer's guard or stop claiming presence-implies-non-empty; the same applies to
`accuracyM`, guarded at construction (`:170`) and re-guarded at read (`markerElements.ts:135`).

## L4 — NOT FIXED and unrouted

R-27d (`export type MarkerKind` in `mapTokens.ts`) is the one R-27 sub-item with no commit and no
§79 entry. `data-marker-kind` is still written three ways — `d.kind` (`markerElements.ts:29`), the
literal `'cluster'` (`:65`), the literal `'camera'` (`:107`) — and both test helpers still take
`kind: string` (`MapCanvas.test.tsx:105`, `MapScreen.test.tsx:56`). Six lines of change, or one
ledger line; either is fine, but it should not fall between the two.

## §79a (`toContainerPoint`) — fresh code, judged

### The maths is correct, and I verified it against the installed dependency, not the citation

`mapbox-gl@3.25.0` → `dist/mapbox-gl-dev.js:57053`:

```js
function getScaledPoint(el, rect, e) {
  const scaling = el.offsetWidth === rect.width ? 1 : el.offsetWidth / rect.width;
  return new index.Point((e.clientX - rect.left) * scaling, (e.clientY - rect.top) * scaling);
}
```

`toContainerPoint` (`MapCanvas.tsx:224-234`) is the same formula — `offsetWidth / rect.width`, single
X-derived factor applied to both axes (correct for a uniform `transform: scale()`, which is what
`PhoneFrame` applies). Its guard is **strictly safer** than mapbox's: mapbox's equality
short-circuit yields `Infinity` when a detached or zero-width node reports `rect.width === 0` while
`offsetWidth` is non-zero; the demo's `rect.width > 0 && offsetWidth > 0` returns `1`. The cited line
number is accurate at the installed version. Good fix, correctly reasoned.

### FD-3 [LOW] — the fix put a *pixel* `[number, number]` in the file that just gained `LngLat` for *degrees*

`toContainerPoint(): [number, number]` is container pixels; `MapCanvasHandle.getCenter(): [number, number] | null`
(`MapCanvas.tsx:22`) is degrees. Both anonymous, both in the same module, one imported alongside
`LngLat`. **Probe-verified** that mapbox's own surface accepts either for both: `map.unproject([lng, lat])`
and `map.project([x, y])` compile with no complaint. Labels will not *enforce* the distinction
(structural identity; brands are out of house), so this is a readability fix —
`export type ScreenPoint = readonly [x: number, y: number]` — and it belongs with L7's unfinished
migration rather than as its own change.

### FD-4 [LOW] — the coupling is to a mapbox internal, pinned only by an unversioned citation

`getScaledPoint` is not exported, so nothing can detect a divergence after a mapbox upgrade — no
test, no type. The comment cites `mapbox-gl-dev.js:57053-57059`: accurate today, but it names a line
in a **dev bundle the app never loads** (`package.json` `main` is `dist/mapbox-gl.js`) with no
version qualifier. Cheapest durable fix: put the version in the citation.

The fix that deletes the coupling: mapbox already hands both values over, typed. `map.on('mousedown' | 'touchstart', e => …)`
gives `e.point` — already scale-corrected by mapbox's own `mousePos` — **and** `e.lngLat`, already
unprojected. Building the long-press seam on those would remove the rect maths, the duplicated
formula, the version-coupled citation, `toContainerPoint` and its three unit tests, and FD-3 along
with them, because the handler would receive degrees and never hold a pixel pair at all. That
reopens §72e's shape decision, so it is a **trigger to record, not a demand for this round**.

### Not a finding — recorded so the fix-delta does not churn it

The hand-written param type `container: { getBoundingClientRect(): { left; top; width }; offsetWidth }`
is right as it stands. `Pick<HTMLElement, 'getBoundingClientRect' | 'offsetWidth'>` reads tidier but
would require the stub to return a full `DOMRect`, which breaks the three-case unit test
(`MapCanvas.test.tsx:391-397`) that exporting the function exists to enable.

## Fresh nits from this round

### FD-1 [LOW] — three avoidable `Object.freeze(...) as X` assertions, added while three others were being deleted

`mapCluster.ts:59`, `mapFilters.ts:59`, `mapTokens.ts:19`. **Probe-verified** all three compile with
no assertion:

```ts
const bbox: ClusterBbox = Object.freeze([-180, -85, 180, 85] as const)
const center: LngLat = Object.freeze([-79.65, 43.61] as const)
const statuses: readonly LocationMapStatus[] = Object.freeze([])   // no `as const` needed
```

Same round, same lane's territory: R-27a/b/c deleted three assertions and R-13 added three. One
token each.

### FD-2 [LOW] — an R-18b doc comment was orphaned onto the wrong symbol

`mapTokens.ts:10-15` — the four-line block *"First-paint camera centre, and the proximity toggle's
last-resort anchor … (review R-18b)"* now sits immediately above
`/** The sheet-header / projection status tally … (review R-27h) */` and `export type StatusCounts`
(`:16-17`), so TypeScript attaches it to `StatusCounts`, while `DEFAULT_MAP_CENTER` (`:19`) has no
doc at all. Two review rationales collided during the merge. In a repo where the doc comment *is* the
review record, this loses one of them. One-line move.

### L7 — partial, and probe-verified why it stopped

`LngLat` (`mapTokens.ts:8`) is adopted at five sites (`buildFitPoints`, `ClusterCameraTarget.center`,
`computeClusterExpansionCamera`, `DEFAULT_MAP_CENTER`, `MapCanvasProps.fitPoints`/`fitToPoints`) but
not at the ones that motivated it: `LocationSheetItem.coord` / `IncidentSheetItem.coord`
(`mapData.ts:66`, `:100` — still `[number, number] // [lng, lat]`, the very comment the alias
replaces), `AddressCard`'s `coord` (`LocationDetailCard.tsx:94`) which feeds
`formatCoordinate(coord[1], coord[0])`, `mapProximity`'s three `center` params (`:48`, `:60`, `:76`),
`MapScreen`'s `proximityCenter` state (`:130`), and `MapCanvasHandle.getCenter()` (`MapCanvas.tsx:22`)
in the file that imports the alias.

**Probe-verified cause and cure:** `readonly LngLat` is not assignable to a mutable `[number, number]`
param, so `coord` cannot migrate until `mapProximity`'s three params do — and widening those to
`LngLat` is backward-compatible for every existing caller (a mutable pair satisfies `LngLat`). So
finishing it is ~7 mechanical sites in one direction with zero caller breakage. Worth doing with
FD-3 in a single pass.

## Also checked, no finding

**`SheetEmptyReason`** (`LocationList.tsx:17`), new this round via R-6: a clean three-member union
with an exhaustive `EMPTY_COPY: Record<SheetEmptyReason, string>` (`:44`), consulted only when the
list is empty, and that constraint is stated in the prop's doc (`:24`). Registry↔type linkage done
the house way. No action.

## Fix-delta Summary

| Severity | Original | Now |
|---|---|---|
| CRITICAL | 0 | 0 |
| HIGH | 0 | 0 |
| MEDIUM | 6 | 0 open (3 fixed, 3 partial with §79b/c/d ledger entries) |
| LOW | 9 | 2 open (L4 unrouted, L8b) + L7 partial |
| Fresh | — | 4 LOW (FD-1, FD-2, FD-3, FD-4) |

Deferrals judged: **§79b sound** (trigger specific; add the `toMapData` caveat) · **§79c sound**
(trigger specific) · **§79d sound but under-triggered** (amend to fire on a new stage-derived
reader in `MapScreen`, which already happened once this round).

**Verdict: APPROVE.** Nothing open blocks the merge. If one thing lands before it, make it FD-2 —
a review rationale is currently attached to the wrong symbol, and that is the kind of loss this
repo's doc-comment discipline exists to prevent.

---

## Spot-delta (micro-round `b621472..bd5baa1`, MR-6 `985ddb1`)

**FIXED — all six spot-checked items, and §79j's routing is real.** FD-4: the citation is now
version + symbol (`getScaledPoint` in mapbox-gl 3.25.0) with the line number dropped and the reason
stated (`MapCanvas.tsx:227-235`). FD-2: the R-18b block sits on `DEFAULT_MAP_CENTER` and
`StatusCounts` has its own doc (`mapTokens.ts:10-17`). L8a: the false third justification is deleted
*and* preserved as a parenthetical saying why it was false (`mapData.ts:44-56`) — better than the
plain deletion I asked for. L8b: both the interface and field docs now describe truthy-only emission
as a producer discipline and point at the guard (`mapData.ts:37-39, 57-65`). Ledger: §79b carries the
2-of-3 caveat, §79d's trigger is amended to fire on any new stage-derived count/reader in
`MapScreen`'s projection block, §72e's trigger is corrected.

**§79j routing confirmed real, not a hand-wave** (`deferred.md:4106-4116`): a named entry that
enumerates all four of my open items by name — R-27d's `MarkerKind` with the three write sites and
the two `kind: string` test helpers (L4), the ~7 remaining positional pairs for `LngLat` (L7), a
`ScreenPoint` labelled tuple (FD-3), and the three `Object.freeze(...) as X` assertions (FD-1) —
with a checkable trigger ("the next refactor commit in `features/demo/ui/screens/map/`") and an
explicit rationale for batching. §79i separately carries FD-4's structural half (`toContainerPoint`
retirement via `e.point`/`e.lngLat`) with its own trigger. Nothing of mine is unrouted.

**One new nit, in the sentence MR-6 added — SD-1 [LOW], `MapCanvas.tsx:232-235`.** The new
PRECONDITION's conclusion is right; its stated mechanism is not. It says a padded container "makes
the ratio lie about the transform" because "`offsetWidth` includes both, `rect.width` scales both."
Both measures are the **border box** — `offsetWidth` is the laid-out border box, `getBoundingClientRect().width`
is the same border box after transform — so padding and border cancel exactly and the ratio is
`1/scale` regardless. What actually breaks under padding is the **origin**, not the scale:
`rect.left` is the border-box left edge, while mapbox's canvas container (which `unproject`'s pixel
space is anchored to) begins at the *content* edge, so a padded container offsets every converted
point by `padding-left × scale` — a constant translation, not a scale error. Keep the rule, fix the
reason: this lane deleted a false justification (L8a) one commit earlier for exactly this reason, and
the container is verified compliant today (`MapCanvas.tsx:628-630`, `position: absolute; inset: 0`).
Belongs in §79j's sweep or §79i's retirement, whichever lands first.

**Spot-delta verdict: APPROVE.** No source change requested; SD-1 is a comment-accuracy nit.
