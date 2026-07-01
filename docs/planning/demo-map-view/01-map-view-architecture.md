# Map View (demo) — Architecture & Design

**Feature:** The phone app's flagship single-case **Map View** — an interactive Mapbox map of a
case's recovery locations + incident scene, with a draggable bottom sheet that drills into each
location's detail (including tap-to-call / tap-to-email, mocked for the demo).
**Siblings:** `02-map-view-implementation-plan.md` (the slices) · `03-map-view-test-spec.md` (the proof).
**Status:** Draft v1.0 · **sandbox-only**, **flagship-first** (clustering, filters, proximity, camera
markers, the case picker, and the incident-edit modal are explicitly **later** — see §10).
**Prerequisite (done):** `docs/planning/demo-incident-coordinates/` — `DemoCase.incidentCoordinates`
and `DemoLocation.gps` now carry the coordinates this feature plots.

---

## 1. Purpose

Recreate the phone app's map experience (`src/features/location/map-view/`) for the demo's **free
sandbox**, at parity with the rest of the demo: the satellite map, status-coloured location pins, the
red incident teardrop, and the three-detent **bottom sheet** that lists locations and opens a rich
**detail card**. The detail card's tap-to-call / tap-to-email is the marquee — in the demo it raises an
**iOS-style confirm bubble** and then a "not available in the demo" notification (no real `tel:` /
`mailto:` — that would eject the visitor from the demo).

This is **sandbox-only**: the guided tour does not include the map (its end-to-end overhaul is a
separate deferred item). A visitor in `?mode=sandbox` reaches the map via the bottom **Map tab**
(already present in `TabBar`, currently a no-op).

---

## 2. Parity target (what the phone does)

From the phone's `map-view` sub-feature (read for this design):

- **Map:** Mapbox **`satellite-streets-v12`**. Location pins are circles **coloured by `LocationStatus`**
  (`started` `#FF9500` · `working` `#00BFFF` · `complete` `#34C759`); the case **incident** is a red
  (`#e53935`) teardrop; cameras are an opt-in white CCTV overlay. Native clustering. Tap a pin → camera
  **flies** to it and the sheet opens its **detail**. Long-press → a proximity ring.
- **Bottom sheet:** three detents — **peek** (88pt: handle + count + status badges), **partial** (40%),
  **full** (65%) — and two content modes: **list** (glass `LocationRow`s) and **detail**
  (`LocationDetailCard`).
- **Detail card:** back button, name + status badge, address + copy-able coordinates, a **Requester**
  card (name/badge, unit, **phone → `tel:`**, **email → `mailto:`**), a **Contact** card (on-site
  person, **phone → `tel:`**), and a **"Go to Location"** CTA that switches the form to that location.
- Always-dark navy "glass" chrome (the satellite tiles are dark).

The demo reproduces the **flagship subset** of this; the rest is staged (§10).

---

## 3. What's already in place vs. what's missing

| Need | Status in the demo |
|---|---|
| Coordinates to plot | ✅ `DemoCase.incidentCoordinates` + `DemoLocation.gps` (incident-coordinates feature) |
| Mapbox token | ✅ `NEXT_PUBLIC_MAPBOX_TOKEN` (already used by `AddressAutocomplete`) |
| A Map tab | ✅ `TabBar` renders it — but `DemoExperience` no-ops it (`t !== 'map'`) |
| A web map **renderer** | ❌ only `@mapbox/search-js-core` is installed — **`mapbox-gl` is new** (§8) |
| A per-location **status** for pin colour | ❌ the demo has **no** `LocationStatus`; `screenData.ts` hard-codes every row to `'draft'`. **Derived** here (§5) |
| A bottom sheet | ❌ built fresh in CSS/pointer-drag (no `@gorhom` — that's React Native) |
| tap-to-call / email | ❌ mocked via an iOS-style confirm + notification (§6) |

---

## 4. System architecture

```
app/demo/page.tsx  (already next/dynamic ssr:false + Suspense)
        │
        ▼
features/demo/ui/DemoExperience.tsx   (the ONLY store-touching component — the bridge)
  · holds tab-local mapViewerCaseId (NOT the form's currentCaseId)
  · view === 'map'  → renders <MapScreen> (or the mandatory <CaseMapPicker> when no viewer case)
  · derives mapData = toMapData(viewerCase, viewerCaseLocations)   [pure, memoized]
  · passes mapData + onChangeCase + onGoToLocation (= existing openLocation) down
  · un-no-ops the TabBar: onSelect('map') → setView('map')
        │ props in / callbacks out (callback isolation preserved)
        ▼
features/demo/ui/screens/map/
  MapScreen.tsx        orchestrator (LOCAL ui state only: selectedId, sheetMode, snapIndex, pendingCall, notice)
   ├── CaseMapPicker.tsx   case-list bottom sheet (mandatory | dismissible) — picks mapViewerCaseId
   ├── MapCanvas.tsx       mapbox-gl instance (init/flyTo/markers/cleanup); no store, no app data
   ├── MapBottomSheet.tsx  3-detent drag-snap sheet (peek/partial/full) · list ⇄ detail
   │     ├── SheetHandle.tsx       count + status badges
   │     ├── LocationList.tsx / LocationRow.tsx
   │     └── LocationDetailCard.tsx  → CallConfirmSheet (call only) / DemoNotification (call+email)
   ├── mapData.ts        toMapData(): viewer case's entities → pins/incident/sheet items (UI mapper, pure)
   └── mapTokens.ts      MAP_PIN_COLORS + glass tokens (lifted from the phone constants)

features/demo/engine/store/selectors.ts
  selectLocationMapStatus(loc) → 'started' | 'working' | 'complete'   [pure; reuses selectDrawerStatus]
```

`MapScreen` is the demo analog of the phone's `MapHost`: presentational (data + callbacks via props),
owns only ephemeral interaction state, never imports the store. `MapCanvas` owns the imperative
`mapbox-gl` map and exposes a tiny ref API (`flyTo`). The store boundary stays exactly where the rest of
the demo keeps it.

---

## 5. The derived location status (pin colour)

The phone colours pins by `LocationStatus`; the demo has none. We **derive** one from the same
per-screen completion the wizard drawer already shows (`selectDrawerStatus`, which mirrors the phone's
`checkFields`/`checkArray`):

```ts
export type LocationMapStatus = 'started' | 'working' | 'complete'
// all wizard screens 'empty'    → 'started'  (#FF9500, just created)
// all wizard screens 'complete' → 'complete' (#34C759, done)
// otherwise                     → 'working'  (#00BFFF, in progress)
export function selectLocationMapStatus(loc: DemoLocation): LocationMapStatus
```

Reuses `selectDrawerStatus(loc)` (no new completion logic), so the map pin, the drawer dots, and the
underlying form stay one source of truth. `MAP_PIN_COLORS` reuses the phone's exact hex values for
visual parity.

---

## 6. The call / email mock (the marquee)

Real `tel:` / `mailto:` would navigate the visitor out of the demo. Instead:

```
tap requester/contact phone  → CallConfirmSheet (iOS action-sheet)
     "Call 905-555-0142?"  [ Call ] [ Cancel ]
        · Call   → DemoNotification: "Calling isn't available in the demo."
        · Cancel → dismiss

tap requester email          → DemoNotification: "Email isn't available in the demo."   (direct — no confirm)
```

The **call** path gets the iOS confirm bubble (a phone call is a deliberate action worth confirming);
**email** goes straight to the notification (per product direction — no confirm step).

- **`CallConfirmSheet`** — a bottom-anchored iOS-style action sheet rendered in the phone's overlay
  root (`PhoneOverlayContext`), with the number, a **Call** action, and Cancel. Pure presentational
  (value + callbacks). (Call-only; email needs no sheet.)
- **`DemoNotification`** — a small iOS-style banner pinned to the top of the phone screen, auto-dismissed
  via `setTimeout` (the demo already uses `setTimeout` for pulses/sync; no `Date.now`/`Math.random`).
  Keys come from a module-level counter (determinism convention).

Both are reusable and fully DOM-testable (no map needed).

---

## 7. Which case the map shows — the case picker (parity)

The phone's map is **single-case**, chosen via a **tab-local viewer + a case picker** (mandatory when no
case is chosen, a dismissible "Change Case" overlay otherwise — `app/(tabs)/map.tsx` +
`CaseSelectionSheet`). The demo reproduces this for parity:

- **`mapViewerCaseId`** — a **tab-local** viewer case held by `DemoExperience`, **distinct from**
  `currentCaseId` (the form's case). Viewing a case on the map must not clobber the wizard's current
  location — exactly the phone's reasoning. (Note: **"Go to Location"** is the one deliberate cross-over —
  it *does* switch the form's case/location and leave the map for the wizard.)
- **`CaseMapPicker`** — a bottom-sheet list of the demo's cases (reuses the `toCaseCards` view-model),
  rendered in the overlay root. **Mandatory** (non-dismissible) when `mapViewerCaseId == null`; opened as a
  **dismissible** overlay by a **"Change Case"** control on the map when a case is already viewed.
- `mapData` = the **viewer case's** incident + its locations **that have coordinates**. Coord-less
  locations/incidents don't plot — the honest "no coordinate" case (consistent with the incident-coords
  feature). If the viewed case has nothing plottable, the canvas shows a small *"add an address to plot
  this case"* state (the picker is still the primary no-case surface).

> The map still shows the bottom **TabBar** (so the visitor can switch tabs), so the sheet's peek detent
> sits **above** the tab bar.

**All-Cases (aggregate) is deliberately NOT built** — the phone app hasn't shipped it either. The door is
kept open: `toMapData` is per-case now, and an aggregate `toMapDataAll(cases, locations)` + an "All Cases"
entry in the picker is a purely additive follow-up **the demo will take as soon as the app does** (§10).

---

## 8. Dependencies

| Package | Purpose | Notes |
|---|---|---|
| `mapbox-gl` (`^3`) | The web map renderer — the direct analog of the phone's `@rnmapbox/maps` | **The only new runtime dependency.** **Lazy** `await import('mapbox-gl')` inside the effect (mirrors how `pdfjs-dist` is lazy-loaded for import), so it never enters the marketing bundle and never evaluates under SSR. `import 'mapbox-gl/dist/mapbox-gl.css'` in `MapCanvas`. Token via `process.env.NEXT_PUBLIC_MAPBOX_TOKEN`. |

No `@mapbox/search-js-react`, no Framer Motion. The sheet is CSS + pointer events; the notification is
CSS + `setTimeout`.

---

## 9. Key technical decisions

| Decision | Choice | Rationale (rejected) |
|---|---|---|
| Renderer | **Mapbox GL JS v3**, lazy dynamic-import, `map.remove()` on cleanup | True parity (pan/zoom/flyTo, satellite-streets). *Rejected:* Static Images API — no interactivity, not a flagship. |
| Pins | **`mapboxgl.Marker` with styled DOM elements** built by a pure `buildMarkers(mapData)` helper | Easy to style to parity (status dot / red teardrop) and unit-test the build logic without WebGL. *Rejected (this slice):* GeoJSON source + circle layer — needed for clustering, which is a **later** slice. |
| Bottom sheet | **Bespoke CSS/pointer-drag** with 3 detents | `@gorhom/bottom-sheet` is RN-only. The phone's snap/list/detail model maps cleanly to a height-animated div + pointer handlers. |
| Location status | **Derived from `selectDrawerStatus`** | Reuses existing completion; one source of truth. *Rejected:* a new stored status field — duplicates state. |
| Map scope | **Tab-local `mapViewerCaseId` + a case picker** (single-case) | Parity with the phone's tab-local viewer + `CaseSelectionSheet`. **All-Cases is NOT built** (the app hasn't either) — kept additive so the demo follows the app. |
| call vs email | **Call → iOS confirm bubble → notification; email → notification directly (no confirm)** | Per product direction. Neither ever navigates away. |
| Determinism / SSR | lazy import; `'use client'`; `setTimeout` (not `Date.now`); counter keys | Matches the demo's conventions; `/demo` is already `ssr:false`. |
| Testing the map | **mock `mapbox-gl`** | jsdom has no WebGL. Map-render tests assert constructor/flyTo/marker calls; the sheet/detail/call-mock are plain DOM. |

---

## 10. Scope boundaries

**In scope (flagship — this plan, 8 slices):** the **case picker** (tab-local viewer, mandatory +
dismissible), the `mapbox-gl` canvas, status-coloured location pins + red incident teardrop, fit-to-case
camera, the 3-detent bottom sheet (list + detail), tap-to-fly + select, the location/incident detail cards,
the **call/email mock**, "Go to Location", the Map-tab wiring + empty/picker state + rail narration.

**Out of scope (later — each additive, its own plan):**
1. **All-Cases (aggregate) map** — an "All Cases" picker entry + `toMapDataAll`. **Not in the app yet;**
   the demo adopts it the moment the app does (door kept open by the per-case `toMapData` shape).
2. **Clustering** (migrate location markers → GeoJSON source + cluster layer + tap-to-expand).
3. **Floating controls** — status filter pills + location search.
4. **Proximity** ring + radius presets (long-press).
5. **Camera markers** (per-location, opt-in) — needs per-camera GPS (deferred #24).
6. **Edit Incident Location** modal from the incident detail card (deferred #26).
7. **Export Map** footer action.
8. **Guided-tour** map chapter (the tour overhaul is its own deferred item).

---

## 11. Risks

- **Bundle / Turbopack:** `mapbox-gl` is large; the lazy dynamic-import keeps it off the initial chunk
  (verify `pnpm build`). Worker/WASM (if any) mirrors the pdf.js precedent (copy to `public/` if the URL
  trips the build).
- **No-token deploys:** `MapCanvas` must degrade to a styled placeholder (no thrown error) when the env
  token is absent — same graceful path as `AddressAutocomplete`.
- **Sheet gesture fidelity:** pointer-drag snap must feel native; keep it simple (drag the handle → height
  follows pointer; snap to nearest detent on release; CSS transition only between detents).
- **`view: 'map'` is not a `ChapterId`:** the store/rail must treat `'map'` as a tab-only view without
  corrupting `currentChapter`/narration (handled in Slice 2).
