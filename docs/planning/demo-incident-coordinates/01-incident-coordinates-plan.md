# Incident & Location Coordinates — Sliced Plan + Inline Test Spec

**Status:** Draft v1.0 · prerequisite for the Map View feature (the map reads these coordinates).
**Mode:** TDD, one commit per slice (each slice has a **Gate** that must be green before commit).
**House style:** mirrors `docs/planning/demo-pdf-import/*` (phased plan + Vitest/RTL inline test spec).

---

## 1. Purpose

Capture and persist **geographic coordinates** in the demo so the Map View has pins to plot.
Today every address pick already returns coordinates from Mapbox and we **throw them away**
(`pickFromFeature` reads only street + city). This feature keeps them.

Parity target — the phone app's `src/features/location/components/IncidentLocationForm.tsx`:

- **Incident location (the occurrence scene)** has **manual Latitude / Longitude fields**. They are
  auto-filled by the address autocomplete (`source: 'geocoded'`) **and** independently editable by
  hand (`source: 'manual'`), with strict numeric parsing and range validation (−90..90 / −180..180).
  *Why manual matters:* the incident can be anywhere — a body in the woods has no street address —
  so coordinates must be enterable without an address.
- **Recovery location (the DVR site)** has **no manual coordinate fields** — a DVR always has a real
  street address, so its coordinates come **only** from the autocomplete geocode (`source:
  'geocoded'`). (This mirrors the phone: the recovery-location form geocodes; manual entry lives on
  the incident form.)

This is **not** the deferred device-GPS work (#24): geocoding hands us coordinates for free with no
device API or permission prompt. Device geolocation (`navigator.geolocation`) and per-camera GPS stay
deferred.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Coordinate source for addresses | The Mapbox `retrieve()` feature already in hand | `feature.geometry.coordinates = [lng, lat]`; zero extra API calls — rides the token already wired. |
| Incident manual entry | Lat/Lng text fields, blur-validated | Parity with phone `IncidentLocationForm`; covers the no-address scene. |
| Recovery-location manual entry | **None** (geocode-only) | Parity; a DVR site always has an address. The existing no-op "Capture GPS" button is left as-is (device GPS = #24). |
| Validation | Pure `parseCoordinate` in the engine (strict parse + range) | Mirrors the phone's `strictParseNumber` + range guards; unit-testable, no DOM. |
| `source` values | `'geocoded'` (pick) · `'manual'` (typed) | Phone also has `'gps'`; not reachable in the demo (no device GPS) — omitted. |
| Incident coord shape | `incidentCoordinates?: { lat; lng; source }` on `DemoCase` (new) | Incident has no device-accuracy concept; minimal shape. |
| Location coord shape | existing `DemoLocation.gps` (`{ lat; lng; accuracyM; source }`) | Field already typed; geocoded picks set `accuracyM: 0` (display keys off `source`). |
| Determinism | Seed coords are literals; no `Date`/`Math.random` | Demo is SSR/replay-safe by convention. |
| New dependencies | **None** | `@mapbox/search-js-core` already installed; renderer (`mapbox-gl`) comes in the Map plan, not here. |

---

## 3. Module layout

```
features/demo/engine/logic/
├── coordinates.ts                       # NEW — pure parseCoordinate + formatCoordinate
└── __tests__/coordinates.test.ts        # NEW
features/demo/engine/types/index.ts      # EDIT — DemoCase.incidentCoordinates
features/demo/engine/store/create-store.ts # EDIT — NewCaseInput/NewLocationInput coords; createCase/addLocation persist
features/demo/engine/content/seed.ts     # EDIT — seed incident + location coords
features/demo/engine/index.ts            # EDIT — barrel-export coordinates helpers
features/demo/ui/inputs/AddressAutocomplete.tsx        # EDIT — AddressPick.coordinates; pickFromFeature reads geometry
features/demo/ui/inputs/__tests__/AddressAutocomplete.test.tsx # EDIT — assert coordinates extracted
features/demo/ui/screens/NewCaseModal.tsx              # EDIT — Latitude/Longitude fields + geocode fill + summary chip
features/demo/ui/screens/NewLocationModal.tsx          # EDIT — capture geocoded coords on pick
features/demo/ui/screens/SubmissionScreen.tsx          # EDIT — capture geocoded coords on pick
features/demo/ui/DemoExperience.tsx                    # EDIT — thread coords through caseForm/locForm + submit + updateField
+ co-located __tests__ updates per slice
```

---

## Slice 1 — Pure coordinate helpers + capture from the autocomplete feature

**Goal:** Stop discarding the geocode coordinates, and add a pure, tested coordinate parser/validator.

**`features/demo/engine/logic/coordinates.ts`** (new, pure — no React/DOM):
```ts
export type CoordKind = 'lat' | 'lng'
export type ParseCoordinateResult = { ok: true; value: number } | { ok: false; error: string }

/** Strict parse (rejects "43.6abc", "", junk) + range (lat ±90, lng ±180). Mirrors the phone's
 *  strictParseNumber + range guards in IncidentLocationForm. */
export function parseCoordinate(raw: string, kind: CoordKind): ParseCoordinateResult

/** Display helper: fixed 6-dp "43.608700, -79.650500" (forensic precision, matches the phone chip). */
export function formatCoordinate(lat: number, lng: number): string
```
- `parseCoordinate`: trim → `''` is `{ ok:false, error:'Enter a valid number' }`; regex `^[-+]?(\d+\.?\d*|\.\d+)$` else `'Enter a valid number'`; `Number.isFinite` guard; range → `'Latitude must be between -90 and 90'` / `'Longitude must be between -180 and 180'`.

**`features/demo/ui/inputs/AddressAutocomplete.tsx`** (edit):
- Extend the return type:
  ```ts
  export interface AddressPick { streetAddress: string; city: string; coordinates?: { lng: number; lat: number } }
  ```
- `pickFromFeature` reads `feature.geometry?.coordinates` (a `[lng, lat]` pair) — fallback
  `feature.properties.coordinates` (`{ longitude, latitude }`). Returns `coordinates` **only** when a
  finite `[lng, lat]` is present (so no-geometry features and the no-token path stay coord-less).
  Widen the param type to include `geometry?: { coordinates?: number[] }`.

**`features/demo/engine/index.ts`** — barrel-export `parseCoordinate`, `formatCoordinate`.

### Test spec — Slice 1
`engine/logic/__tests__/coordinates.test.ts` (new, pure):
- `parseCoordinate('43.65','lat')` → `{ ok:true, value:43.65 }`; `'-79.38','lng'` → ok.
- `'.5','lat'`, `'-.5','lng'`, `'+12','lat'` → ok; `'43.6abc'`, `'abc'`, `''`, `'  '`, `'1e'` → `{ ok:false, error:'Enter a valid number' }`.
- `'95','lat'` → range error; `'-91','lat'` → range error; `'181','lng'` / `'-181','lng'` → range error; `'90','lat'` / `'-180','lng'` (inclusive bounds) → ok.
- `formatCoordinate(43.6087,-79.6505)` → `'43.608700, -79.650500'`.

`ui/inputs/__tests__/AddressAutocomplete.test.tsx` (edit — these `toEqual`s change shape):
- `pickFromFeature` with `geometry:{ coordinates:[-79.65,43.61] }` → result includes `coordinates:{ lng:-79.65, lat:43.61 }`.
- `pickFromFeature` with **no** geometry (existing property-only fixtures) → `coordinates` is `undefined` (street/city unchanged).
- `pickFromFeature` falls back to `properties.coordinates:{ longitude, latitude }` when `geometry` is absent.
- mocked-SDK "fills street + city on pick": `retrieveMock` now yields a feature with `geometry.coordinates`; assert `onPick` receives `{ streetAddress, city, coordinates:{ lng, lat } }`.

**Gate:** new + edited tests green; `tsc` clean. **Commit:** `feat(demo): capture geocode coordinates from address picks + coordinate validator`.

---

## Slice 2 — Model, store actions, and seed

**Goal:** Persist coordinates on cases/locations and seed the default case so the map has pins.

**`features/demo/engine/types/index.ts`** (edit):
```ts
export interface DemoCase {
  // …existing…
  /** Incident scene coordinates — geocoded from the address or entered by hand. */
  incidentCoordinates?: { lat: number; lng: number; source: 'geocoded' | 'manual' }
}
```
(`DemoLocation.gps` already exists: `GpsCoordinates & { source: 'gps'|'geocoded'|'manual' }`.)

**`features/demo/engine/store/create-store.ts`** (edit):
- `NewCaseInput` gains `incidentCoordinates?: { lat; lng; source: 'geocoded'|'manual' }`; `createCase`
  writes it onto the new `DemoCase` (undefined when absent).
- `NewLocationInput` gains `gps?: { lat; lng; source: 'geocoded'|'manual' }`; `addLocation` writes
  `gps: input.gps ? { ...input.gps, accuracyM: 0 } : undefined`.
- Submission edits reuse the existing `updateField('gps', { lat, lng, accuracyM:0, source:'geocoded' })`
  (top-level `setPath`, already supported — no new action).

**`features/demo/engine/content/seed.ts`** (edit) — Kim's Convenience, 1450 Eglinton Ave W, Mississauga
(approx coords; demo-illustrative):
- `SEED_CASE.incidentCoordinates = { lat: 43.6087, lng: -79.6505, source: 'geocoded' }`
- `SEED_LOCATION.gps = { lat: 43.6087, lng: -79.6505, accuracyM: 0, source: 'geocoded' }`

### Test spec — Slice 2
`engine/store/__tests__/store.test.ts` (extend):
- `createCase({ …, incidentCoordinates:{ lat, lng, source:'geocoded' } })` → the case carries it; omitting it → `incidentCoordinates` is `undefined`.
- `addLocation(caseId,{ locationName:'x', gps:{ lat, lng, source:'geocoded' } })` → location `gps` is `{ lat, lng, accuracyM:0, source:'geocoded' }`; omitting `gps` → `gps` undefined.
- `updateField('gps', { lat, lng, accuracyM:0, source:'geocoded' })` on the current location persists it.

`engine/content/__tests__` (seed coverage, extend existing seed test or add):
- `SEED_CASE.incidentCoordinates` and `SEED_LOCATION.gps` are present with finite lat/lng and `source:'geocoded'`.

**Gate:** store + seed tests green; `tsc`. **Commit:** `feat(demo): persist incident/location coordinates + seed default case coords`.

---

## Slice 3 — Incident Latitude/Longitude fields (New Case modal + bridge)

**Goal:** Parity with the phone incident form — autocomplete-filled, manually-editable, validated lat/lng.

**`features/demo/ui/screens/NewCaseModal.tsx`** (edit):
- `NewCaseFields` gains `incidentLatitude: string`, `incidentLongitude: string`,
  `incidentCoordinateSource?: 'geocoded' | 'manual'` (string-form for the inputs; parsed at submit).
- Below the City field, render a two-column row of `Field`s: **Latitude** (`e.g., 43.65`) and
  **Longitude** (`e.g., -79.38`).
  - Typing → `onChange('incidentLatitude'|'incidentLongitude', v)` and marks the source `'manual'`.
  - On blur, validate with the engine `parseCoordinate`; invalid → local inline error state
    (`'Enter a valid number'` / range message). Local UI error state only — no data in the modal.
- The address autocomplete's `onPick` (now carrying `p.coordinates`) calls a new prop
  `onPickIncidentCoords(c: { lat; lng })` → fills both lat/lng strings + source `'geocoded'`.
- When both coords parse, render a read-only summary chip `📍 {formatCoordinate} · {Geocoded|Manual}`
  (parity with the phone `CoordinateDisplay`).

**`features/demo/ui/DemoExperience.tsx`** (edit):
- `blankCaseForm` gains `incidentLatitude:''`, `incidentLongitude:''`, `incidentCoordinateSource:undefined`.
- Wire `onPickIncidentCoords` → `setCaseForm(s => ({ ...s, incidentLatitude:String(lat), incidentLongitude:String(lng), incidentCoordinateSource:'geocoded' }))`.
- `onChange` for the lat/lng fields also sets `incidentCoordinateSource:'manual'`.
- `submitCase`: parse both via `parseCoordinate`; if **both** ok → pass
  `incidentCoordinates:{ lat, lng, source: caseForm.incidentCoordinateSource ?? 'manual' }` to
  `createCase`; otherwise omit (don't block case creation — required-field enforcement is out of scope,
  per the field-parity audit).

### Test spec — Slice 3
`ui/screens/__tests__/NewCaseModal.test.tsx` (new or extend):
- renders Latitude + Longitude fields.
- picking an address (mock the autocomplete → fire `onPick` with `coordinates`) fills both lat/lng inputs and shows the `Geocoded` summary chip.
- typing a valid latitude + longitude shows the `Manual` summary chip; no error.
- typing `'43.6abc'` in Latitude then blurring shows `Enter a valid number`; typing `'95'` shows the lat range error; `'200'` in Longitude shows the lng range error.

`ui/__tests__/DemoExperience.*.test.tsx` (extend; inject a store, `mode=sandbox`):
- creating a case after an address pick → `store` case has `incidentCoordinates` with `source:'geocoded'` and the picked lat/lng.
- creating a case with hand-typed valid coords → `incidentCoordinates` with `source:'manual'`.
- creating a case with an invalid latitude → case is created with `incidentCoordinates` **undefined** (no crash).

**Gate:** modal + bridge tests green; `tsc`. **Commit:** `feat(demo): incident Latitude/Longitude fields (geocode-fill + manual entry + validation)`.

---

## Slice 4 — Recovery-location geocode coordinates (New Location + Submission)

**Goal:** Capture geocoded coords for recovery locations (no manual fields).

**`features/demo/ui/screens/NewLocationModal.tsx`** (edit):
- `onPick` (now carrying `p.coordinates`) calls a new prop `onPickCoords(c: { lat; lng })`.
- No manual lat/lng fields; the existing "Capture GPS coordinates" button stays a no-op (device GPS = #24).

**`features/demo/ui/screens/SubmissionScreen.tsx`** (edit):
- `onPick` calls a new prop `onPickCoords(c: { lat; lng })`.

**`features/demo/ui/DemoExperience.tsx`** (edit):
- `NewLocation` flow: stash picked coords in `locForm` (gains optional `coordinates`); `submitLocation`
  passes `gps:{ lat, lng, source:'geocoded' }` into `addLocation`.
- `Submission` flow: `onPickCoords` → `store.updateField('gps', { lat, lng, accuracyM:0, source:'geocoded' })`
  on the current location.

### Test spec — Slice 4
`ui/screens/__tests__/NewLocationModal.test.tsx` (extend): firing `onPick` with `coordinates` calls `onPickCoords` with `{ lat, lng }`.
`ui/screens/__tests__/SubmissionScreen.test.tsx` (extend): firing `onPick` with `coordinates` calls `onPickCoords`.
`ui/__tests__/DemoExperience.*.test.tsx` (extend):
- creating a location after an address pick → the new location's `gps` is `{ lat, lng, accuracyM:0, source:'geocoded' }`.
- picking an address on the Submission screen → the current location's `gps` is updated with `source:'geocoded'`.

**Gate:** screen + bridge tests green; full `pnpm test` + `tsc` clean. **Commit:** `feat(demo): geocode coordinates for recovery locations (new-location + submission)`.

---

## Appendix A — Deliberate divergences from the phone

- **No device-GPS / reverse-geocode toggle on the incident form.** The phone's `IncidentLocationForm`
  also has a forced-precise `GpsCaptureControl` + reverse-geocode toggle. The demo omits both (device
  GPS is deferred #24); autocomplete + manual entry cover the parity-critical paths.
- **`accuracyM: 0` for geocoded location coords.** Mapbox forward-geocode gives no metric accuracy;
  display keys off `source` (`Geocoded`), not accuracy.
- **No required-field enforcement.** Consistent with the field-parity audit — invalid/blank coords
  simply yield no `incidentCoordinates`; case/location creation is never blocked.

## Appendix B — Manual verification (needs `NEXT_PUBLIC_MAPBOX_TOKEN`)
`pnpm dev` → `/demo?mode=sandbox` → New Case → type an address, pick a suggestion → Latitude/Longitude
auto-fill + `Geocoded` chip; overtype a coordinate → `Manual` chip; enter `999` → range error. New
Location → pick an address → (verified via store/Map slice once the map lands). Build/CI cover the rest
via the mocked SDK.

## Appendix C — Downstream
The Map View plan (separate, next) reads `DemoCase.incidentCoordinates` (red incident teardrop) and
`DemoLocation.gps` (status-coloured pins). Locations/incidents without coordinates (typed-without-pick,
imported) simply don't plot — the honest "no coordinate" case.
