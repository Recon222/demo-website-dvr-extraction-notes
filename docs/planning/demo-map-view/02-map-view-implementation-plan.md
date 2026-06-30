# Map View (demo) — Implementation Plan

**Prerequisite:** Read [`01-map-view-architecture.md`](./01-map-view-architecture.md). Tests are in
[`03-map-view-test-spec.md`](./03-map-view-test-spec.md), **synced slice-for-slice** with this plan.
**Method:** TDD, **one commit per slice** (a slice may split into 2 commits if large). Each slice ends at
a **Gate** (its tests + the full suite + `tsc` green) before commit. Flagship-first; §10 of the
architecture is **not** built here.

## Module layout

```
package.json                                              # EDIT — add mapbox-gl
features/demo/engine/store/selectors.ts                  # EDIT — selectLocationMapStatus (+ test)
features/demo/engine/store/__tests__/selectors.test.ts   # EDIT
features/demo/engine/types/index.ts                      # EDIT — LocationMapStatus (if exported here)
features/demo/ui/screens/map/
├── mapTokens.ts                # NEW — MAP_PIN_COLORS + sheet glass tokens
├── mapData.ts                  # NEW — toMapData(): entities → pins/incident/sheet items/counts
├── MapCanvas.tsx               # NEW — mapbox-gl init/flyTo/markers/cleanup + no-token fallback
├── buildMarkers.ts             # NEW — pure: mapData → marker descriptors (element spec + lnglat + id)
├── MapScreen.tsx               # NEW — orchestrator (local ui state; props in / callbacks out)
├── CaseMapPicker.tsx           # NEW — case-list bottom sheet (mandatory | dismissible)
├── MapBottomSheet.tsx          # NEW — 3-detent drag-snap sheet; list ⇄ detail
├── SheetHandle.tsx             # NEW — count + status badges
├── LocationList.tsx            # NEW — list of rows
├── LocationRow.tsx             # NEW — glass row (location + incident variants)
├── LocationDetailCard.tsx      # NEW — detail (location + incident); contact/requester cards
├── CallConfirmSheet.tsx        # NEW — iOS confirm bubble (call only)
├── DemoNotification.tsx        # NEW — top banner, setTimeout auto-dismiss
└── __tests__/                  # NEW — co-located
features/demo/ui/controls/TabBar.tsx                     # (unchanged — already renders 'map')
features/demo/ui/DemoExperience.tsx                      # EDIT — un-no-op map tab; tab-local mapViewerCaseId; render MapScreen/picker; mapData; showTabs
features/demo/engine/store/create-store.ts               # EDIT — setView('map') keeps currentChapter sane
features/demo/engine/types/index.ts                      # EDIT — view union allows 'map'
features/demo/ui/.../narration or a MAP_NARRATION const  # EDIT — rail copy for the map
.env.example                                             # EDIT — note NEXT_PUBLIC_MAPBOX_TOKEN (if missing)
```

---

## Slice 1 — `mapbox-gl` + `MapCanvas` (empty interactive map)

**Goal:** A client `MapCanvas` that mounts a satellite-streets map, cleans up, and degrades without a token.

- `package.json`: add `mapbox-gl@^3`.
- `MapCanvas.tsx` (`'use client'`):
  ```ts
  export interface MapCanvasHandle { flyTo(lng: number, lat: number, zoom?: number): void }
  export interface MapCanvasProps { markers?: MarkerDescriptor[]; fit?: { bounds?: [...]; center?: [number, number]; zoom?: number } }
  ```
  - `useRef` for container + map instance. In `useEffect([])`: if `!process.env.NEXT_PUBLIC_MAPBOX_TOKEN`
    → render the **fallback** (a styled placeholder; do **not** construct a map). Else
    `const mapboxgl = (await import('mapbox-gl')).default`, `import 'mapbox-gl/dist/mapbox-gl.css'`,
    `new mapboxgl.Map({ accessToken, container, style: 'mapbox://styles/mapbox/satellite-streets-v12', center, zoom })`.
  - **Cleanup:** `return () => map?.remove()`. `mounted` guard so the async import can't set state after unmount.
  - Expose `flyTo` via `useImperativeHandle` (markers/fit are added in Slices 4/6).
- `.env.example`: ensure `NEXT_PUBLIC_MAPBOX_TOKEN=` is present/noted.

**Gate:** `MapCanvas.test.tsx` green (mock `mapbox-gl`); `tsc`; `pnpm build` mounts the dep. **Commit:**
`feat(demo): MapCanvas — mapbox-gl satellite map with no-token fallback`.

---

## Slice 2 — Map-tab wiring + `mapViewerCaseId` + rail narration

**Goal:** The Map tab opens the Map screen in sandbox; a tab-local viewer case exists; the rail shows map copy.

- `types/index.ts`: allow `'map'` in the `view` union (a tab-only view, **not** a `ChapterId`).
- `create-store.ts`: `setView('map')` sets `view='map'` but **does not** set `currentChapter` to `'map'`
  (extend `isChapterId` to exclude `'map'`). `currentChapter` stays on the prior chapter.
- `DemoExperience.tsx`:
  - **`mapViewerCaseId`** — new tab-local `useState<string | null>(null)`, **distinct** from `currentCaseId`.
  - TabBar: `onSelect={(t) => store.getState().setView(t)}` (drop the `t !== 'map'` guard).
  - `showTabs = view === 'dashboard' || view === 'cases' || view === 'map'`.
  - `activeScreen()`: `case 'map': return <MapScreen viewerCaseId={mapViewerCaseId} … />`. With no viewer
    case yet (the picker arrives in Slice 3), render a minimal *"Pick a case"* placeholder.
  - Rail narration: `const narration = view === 'map' ? MAP_NARRATION : NARRATION[currentChapter]`.
- `MAP_NARRATION` (a `ChapterNarration`-shaped const): eyebrow/title/paras/bullets about the map.

**Gate:** store + bridge tests green (mock `mapbox-gl`); `tsc`. **Commit:** `feat(demo): Map tab opens the Map screen (sandbox) + tab-local viewer case + rail narration`.

---

## Slice 3 — `CaseMapPicker` (mandatory + dismissible "Change Case")

**Goal:** Parity with the phone's case picker — choose which case the map views, tab-local.

- `CaseMapPicker.tsx`: a bottom-sheet list of the demo's cases (rows from the `toCaseCards` view-model:
  case number, display name, location count), rendered in the phone overlay root. Props: `cases`,
  `dismissible`, `onPick(caseId)`, `onClose`. Mandatory (no scrim-dismiss / no close button) when
  `dismissible` is false.
- `DemoExperience.tsx`:
  - Show the picker when `view === 'map'` **and** (`mapViewerCaseId == null` *(mandatory)* **or** the user
    invoked **Change Case** *(dismissible)*). `onPick` sets `mapViewerCaseId` (never writes `currentCaseId`).
  - Pass `onChangeCase` to `MapScreen` → renders a **"Change Case"** control (pill) that opens the
    dismissible picker.
- `MapScreen.tsx`: renders the "Change Case" pill; the canvas/sheet now key off the chosen viewer case.

**Gate:** picker + bridge tests green; `tsc`. **Commit:** `feat(demo): map case picker (mandatory + Change Case) — tab-local viewer`.

---

## Slice 4 — Data projection (status + pins + sheet items)

**Goal:** Pure functions turning the viewer case + its locations into everything the map/sheet render.

- `selectors.ts`: `selectLocationMapStatus(loc)` (architecture §5; reuses `selectDrawerStatus`).
- `mapTokens.ts`: `MAP_PIN_COLORS = { started:'#FF9500', working:'#00BFFF', complete:'#34C759', incident:'#e53935' }`
  + sheet glass tokens (lifted from the phone).
- `mapData.ts`:
  ```ts
  export interface MapPin { id: string; lng: number; lat: number; status: LocationMapStatus }
  export interface MapIncident { id: string; caseNumber: string; displayName?: string; lng: number; lat: number }
  export type SheetItem =
    | { kind: 'location'; id; locationName; businessName; address; status; coord: [number, number];
        streetAddress; city; requesterName; requesterBadge; requesterUnit; requesterPhone; requesterEmail;
        locationContact; locationPhone; coordinateSource: 'geocoded' | 'manual' }
    | { kind: 'incident'; id; caseNumber; displayName?; businessName; streetAddress; city; address; coord: [number, number] }
  export interface MapData { pins: MapPin[]; incident: MapIncident | null; items: SheetItem[]; statusCounts: { started: number; working: number; complete: number } }
  export function toMapData(viewerCase: DemoCase | null, locations: DemoLocation[]): MapData
  ```
  - Pins: each location **with `gps`** → `{ id, lng, lat, status: selectLocationMapStatus(loc) }`.
  - Incident: `viewerCase.incidentCoordinates` → `MapIncident` (else null).
  - `items`: incident first (if present) then each **located** location → `SheetItem` (all contact/requester
    fields trimmed → string). `statusCounts` tallies located locations by status.
  - Per-case shape now; an aggregate `toMapDataAll(cases, locations)` is the additive All-Cases hook (§10.1).
- `DemoExperience.tsx`: `const viewerCase = cases.find(c => c.id === mapViewerCaseId) ?? null`;
  `const mapData = useMemo(() => toMapData(viewerCase, locations.filter(l => l.caseId === mapViewerCaseId)), [...])`
  and pass it down to `MapScreen`.

**Gate:** `selectors.test.ts` + `mapData.test.ts` green; `tsc`. **Commit:** `feat(demo): map data projection — derived location status, pins, incident, sheet items`.

---

## Slice 5 — Render pins + incident on the map

**Goal:** Status-coloured location markers + the red incident teardrop, fitted to the case.

- `buildMarkers.ts` (pure): `buildMarkers(mapData) → MarkerDescriptor[]` where each descriptor is
  `{ id; lng; lat; kind: 'location' | 'incident'; color; label? }`. Pure → unit-tested without WebGL.
- `MapCanvas.tsx`: accept `markers` + `fit`. On map `load` (and when `markers` change): remove prior
  `mapboxgl.Marker`s, create one per descriptor with a styled DOM element (status **dot** / red
  **teardrop**), `setLngLat([lng,lat]).addTo(map)`; track them in a ref; `marker.getElement()` carries a
  `data-marker-id` + an `onClick` placeholder (wired in Slice 6). Apply `fit`: `fitBounds` for ≥2 points
  (padding for controls/sheet), else `setCenter`+`zoom` for one, else leave default.
- `MapScreen.tsx`: compute `markers = buildMarkers(mapData)` + `fit` and pass to `MapCanvas`.

**Gate:** `buildMarkers.test.ts` + `MapCanvas` marker tests green (mock `mapbox-gl` Marker/Map); `tsc`. **Commit:** `feat(demo): plot status-coloured location pins + incident teardrop, fit to case`.

---

## Slice 6 — Bottom sheet shell (peek/partial/full + list)

**Goal:** A draggable 3-detent sheet showing the location list and a live peek summary.

- `mapTokens.ts`: `SHEET_SNAP` (peek/partial/full **visible heights** in px, above the tab bar) + glass colours.
- `SheetHandle.tsx`: drag pill + (list mode) `"{n} Locations"` + per-status badges (count by colour);
  (detail mode) `"Location Details"`.
- `LocationRow.tsx` / `LocationList.tsx`: glass rows (status dot + name + business + address + chevron;
  incident variant = red dot + "Incident" chip). `React`-keyed by id.
- `MapBottomSheet.tsx`: a bottom-anchored panel; `snapIndex` (0/1/2) drives its height; pointer handlers
  on the handle (`pointerdown`/`move`/`up`) adjust height live (no transition) and snap to the nearest
  detent on release (CSS `transition: height` only between detents). Renders `LocationList` in list mode.
  Rendered into the phone **overlay root** (`PhoneOverlayContext`) so it anchors to the screen bottom.
- `MapScreen.tsx`: owns `snapIndex` + `sheetMode`; mounts `MapBottomSheet` over `MapCanvas`.

**Gate:** sheet/handle/row tests green (drag→snap, list render); `tsc`. **Commit:** `feat(demo): map bottom sheet — peek/partial/full drag-snap + location list`.

---

## Slice 7 — Tap-to-fly + selection (list ⇄ detail)

**Goal:** Tapping a pin or a row flies the camera and opens the detail.

- `MapScreen.tsx`: `selectItem(id)` → `mapCanvasRef.current.flyTo(coord, FLY_ZOOM)` + `sheetMode='detail'`
  + `selectedId=id` + snap to partial/full. `back()` → `sheetMode='list'`, clear selection, snap to partial.
- `MapCanvas.tsx`: wire each marker element's click → `onMarkerPress(id)` prop. Selected marker gets an
  emphasis class.
- `LocationRow` press → `onSelect(id)`.

**Gate:** select-from-row and select-from-marker tests green (assert `flyTo` called + detail mode); `tsc`.
**Commit:** `feat(demo): tap a pin or row → fly the camera + open the detail`.

---

## Slice 8 — Detail card + call/email mock + Go to Location (the marquee)

**Goal:** The location/incident detail cards, with the iOS call mock + email notification and the form hand-off.

- `LocationDetailCard.tsx`:
  - **Location variant:** back button, name + status badge, address + coordinates row (`formatCoordinate`
    + source chip), **Requester** card (name/badge, unit, phone, email), **Contact** card (person, phone),
    **"Go to Location"** CTA. Phone rows tappable → `onCall(number)`; email row → `onEmail(address)`.
  - **Incident variant:** headline + "Incident" chip, address/coords. (No edit CTA — the incident-edit
    modal is deferred §10.6; show the info only.)
- `CallConfirmSheet.tsx`: iOS action sheet for **calls only** — `"Call {number}?"` + **Call** + Cancel,
  rendered in the overlay root.
- `DemoNotification.tsx`: top banner; `setTimeout` auto-dismiss; counter keys.
- `MapScreen.tsx`: owns `pendingCall` + `notice` state.
  - `onCall(number)` → open `CallConfirmSheet`; **Call** → close sheet + notify `"Calling isn't available in
    the demo."`; **Cancel** → dismiss.
  - `onEmail(address)` → **directly** notify `"Email isn't available in the demo."` (no confirm — per
    product direction).
  - `onGoToLocation(id)` (prop from `DemoExperience` = `openLocation`) leaves the map into the wizard.

**Gate:** detail/confirm-sheet/notification tests green; **full `pnpm test` + `pnpm test:coverage` (≥80%
engine) + `tsc`**. **Commit:** `feat(demo): location detail card + iOS call mock + email notification + Go to Location`.

---

## Appendix A — new dependency
- `mapbox-gl` (`^3`, runtime). Lazy-loaded on `/demo` only. No search-js-react (we keep `@mapbox/search-js-core` for the address fields).

## Appendix B — existing files modified
- `package.json`, `.env.example`
- `features/demo/engine/store/create-store.ts` (`setView('map')`), `types/index.ts` (`view` union, `LocationMapStatus`)
- `features/demo/engine/store/selectors.ts` (`selectLocationMapStatus`)
- `features/demo/ui/DemoExperience.tsx` (tab wiring, tab-local `mapViewerCaseId`, case picker, `mapData`, `showTabs`, rail narration)

## Appendix C — manual verification (needs `NEXT_PUBLIC_MAPBOX_TOKEN`)
`pnpm dev` → `/demo?mode=sandbox` → create a case (pick an address) → **Map** tab → the **mandatory case
picker** appears → pick the case → satellite map with status pins + red incident teardrop; tap a pin →
camera flies + detail opens; tap a phone number → iOS "Call …?" → **Call** → "Calling isn't available in
the demo"; tap an email → "Email isn't available in the demo" (no confirm); **Change Case** → dismissible
picker; **Go to Location** → the submission screen. No token → the styled placeholder (no crash). Build/CI
cover the rest via the mocked `mapbox-gl`.
