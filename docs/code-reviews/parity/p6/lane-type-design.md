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
