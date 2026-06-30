# Map View (demo) — Test Specification

**Prerequisites:** [`01-map-view-architecture.md`](./01-map-view-architecture.md) ·
[`02-map-view-implementation-plan.md`](./02-map-view-implementation-plan.md). Sections map **1:1** to
the plan's slices — write the slice's tests first (red), implement to green, commit.

## Conventions

- Runner: Vitest + jsdom + Testing Library (existing config); co-located `__tests__/`.
- **`mapbox-gl` is always mocked** (jsdom has no WebGL). A shared mock exposes `Map` (with `on`, `once`,
  `remove`, `flyTo`, `fitBounds`, `setCenter`, `setZoom`, `addControl`) and `Marker` (with `setLngLat`,
  `addTo`, `remove`, `getElement`). Map-render tests assert **calls**, not pixels.
- Pure logic (`selectLocationMapStatus`, `toMapData`, `buildMarkers`) mocks **nothing**.
- `next/navigation` mocked to `?mode=sandbox` for bridge tests; `DemoExperience` gets an **injected store**.
- Determinism: no real `Date`/`Math.random`; notification auto-dismiss uses fake timers.
- Engine coverage gate (`features/demo/engine/**`) stays **≥80%**; the new UI map components are
  behaviorally tested but not coverage-gated (per repo convention).

## Shared fixtures
- `gpsLoc(over)` — a `DemoLocation` with `gps: { lat, lng, accuracyM:0, source:'geocoded' }`.
- `caseWithIncident(over)` — a `DemoCase` with `incidentCoordinates: { lat, lng, source:'geocoded' }`.
- `mapboxMock` — the `vi.mock('mapbox-gl', …)` factory above, with `vi.fn()` spies returned for assertions.

---

## Slice 1 — `MapCanvas.test.tsx`

- mounts a map: with `NEXT_PUBLIC_MAPBOX_TOKEN` set, constructs `mapboxgl.Map` once with
  `style: 'mapbox://styles/mapbox/satellite-streets-v12'` and the container element.
- **cleanup**: unmount calls `map.remove()` exactly once.
- **no-token fallback**: with the env token unset, renders the placeholder text and **does not** construct
  a `Map` (assert the `Map` spy not called).
- `flyTo(lng,lat,zoom)` on the handle calls `map.flyTo` with `{ center:[lng,lat], zoom }`.
- async-import safety: unmounting before the dynamic import resolves does not throw / setState (mounted guard).

---

## Slice 2 — store + bridge

**`create-store` (extend `store.test.ts`)**
- `setView('map')` sets `view === 'map'` and leaves `currentChapter` unchanged (e.g. still `'cases'`).
- a subsequent `setView('submission')` still sets `currentChapter === 'submission'` (no corruption).

**`DemoExperience` (new `DemoExperience.map.test.tsx`, mock `mapbox-gl` + `next/navigation`)**
- clicking the **Map** tab (`aria-label="Map"`) calls `setView('map')` → the Map screen renders
  (`data-map-screen` present).
- on the map view, the rail shows `MAP_NARRATION.title` (not a wizard chapter's).
- **empty state**: a fresh sandbox store (no current case) shows the empty-state copy and **no** canvas.
- `showTabs` is true on the map view (the TabBar is present).

---

## Slice 3 — `selectors.test.ts` + `mapData.test.ts`

**`selectLocationMapStatus`**
- a location with every wizard screen blank → `'started'`.
- the seed-style location (contact + requester filled, rest blank) → `'working'`.
- a fully-filled location (all `selectDrawerStatus` screens complete) → `'complete'`.

**`toMapData`**
- `null` case → `{ pins:[], incident:null, items:[], statusCounts:{0,0,0} }`.
- a case with `incidentCoordinates` → `incident` populated; `items[0].kind === 'incident'`.
- only locations **with `gps`** become pins/items; a coord-less location is **excluded** from both.
- `pins[i].status` matches `selectLocationMapStatus`; `statusCounts` tallies located locations by status.
- a `SheetItem` of kind `'location'` carries the trimmed requester/contact fields + `coord` `[lng,lat]`.

---

## Slice 4 — `buildMarkers.test.ts` + `MapCanvas` markers

**`buildMarkers`**
- N located locations + 1 incident → N+1 descriptors; location colours come from `MAP_PIN_COLORS[status]`,
  the incident descriptor is `kind:'incident'` with the incident colour and the incident `lng/lat`.
- no incident → only location descriptors.

**`MapCanvas` (markers)**
- given `markers`, constructs one `mapboxgl.Marker` per descriptor, each `setLngLat([lng,lat]).addTo(map)`;
  the created element carries `data-marker-id`.
- changing `markers` removes the prior markers (`marker.remove` called) before adding the new set.
- `fit` with ≥2 points calls `fitBounds`; exactly 1 calls `setCenter`+`setZoom`.
- unmount removes all markers.

---

## Slice 5 — sheet shell

**`SheetHandle.test.tsx`**
- list mode renders `"{n} Locations"` and a status badge per non-zero count (correct colour/label).
- detail mode renders `"Location Details"` and hides the badges.

**`LocationRow.test.tsx`**
- location variant renders name + business + address + a status-coloured dot; press calls `onSelect(id)`.
- incident variant renders the headline + an "Incident" chip + a red dot.

**`MapBottomSheet.test.tsx`**
- renders the handle + a `LocationList` of all `items` in list mode.
- a `pointerdown`→`move`(up)→`pointerup` on the handle increases `snapIndex` (peek→partial); a downward
  drag past the threshold decreases it (partial→peek). (Assert via the resulting height/`data-snap` attr.)

---

## Slice 6 — select + fly

**`MapScreen.test.tsx` (mock `mapbox-gl`)**
- clicking a `LocationRow` calls the canvas `flyTo` with the item's `coord` and switches the sheet to
  detail mode (the `LocationDetailCard` for that id renders).
- a marker element click (`data-marker-id`) drives the **same** select path (flyTo + detail).
- **back** from detail returns to list mode and clears the selection.

---

## Slice 7 — detail + call/email mock + Go to Location

**`LocationDetailCard.test.tsx`**
- location variant renders the requester card (name/badge, unit, phone, email) and the contact card
  (person, phone) for a populated item; absent fields hide their rows.
- tapping the requester **phone** calls `onCall('905-555-0142')`; tapping the **email** calls
  `onEmail('det@dept.ca')`; **Go to Location** calls `onGoToLocation(id)`.
- incident variant renders the headline + "Incident" chip + coordinates; no requester/contact cards.

**`ContactActionSheet.test.tsx`**
- mode `'call'` renders `"Call 905-555-0142?"` + a Call button + Cancel; Call → `onConfirm`, Cancel → `onCancel`.
- mode `'email'` renders `"Email det@dept.ca?"` + an Email button + Cancel.

**`DemoNotification.test.tsx` (fake timers)**
- renders the message; auto-dismisses (calls `onDismiss`) after the timeout; unmount clears the timer (no
  post-unmount callback).

**`MapScreen` (integration, mock `mapbox-gl`)**
- tap a phone row → the action sheet shows `"Call …?"`; **Call** → the action sheet closes and the
  notification reads `"Calling isn't available in the demo."`; **Cancel** → no notification.
- tap an email row → **Email** → notification `"Email isn't available in the demo."`.
- **Go to Location** invokes the `onGoToLocation` prop with the selected id (the bridge wires it to
  `openLocation`, asserted at the `DemoExperience` level: the store's `currentLocationId` + `view` change).

**Full-suite gate:** `pnpm test` all green, `pnpm test:coverage` ≥80% on the engine
(`selectLocationMapStatus` + `mapData` fully covered), `tsc` clean.

---

## Out of scope for tests
- Real WebGL rendering, real tile fetches, real pan/zoom physics (no engine in jsdom) — verified manually
  (plan Appendix C).
- The deferred features (clustering, filters, proximity, camera markers, incident-edit, case picker,
  export footer) — each ships with its own slice + tests later.
