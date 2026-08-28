// Authored preview — MapFiltersSheet (U5.3). The map's filter surface: status chips, the
// proximity ring toggle + radius presets, and a Clear all / Done footer. It mounts through
// GlassBottomSheet, which portals via PhoneOverlayPortal and falls back to rendering INLINE
// with no context — so it needs a position:relative, explicitly sized frame to anchor into.
//
// Wrapped in <div data-demo-root> with the ported navy backdrop (#002853 = colors.background,
// tokens/palette.ts:99): demo.css scopes every rule, box-sizing included, to that attribute.
//
// Values come from the live modules, not invented:
//   activeStatuses  — MAP_FILTER_STATUSES' members, in the phone's pill order
//                     ('started' | 'working' | 'complete', mapFilters.ts:32-39)
//   proximityRadius — a PROXIMITY_PRESETS member (0.5 | 1 | 2 | 5, mapTokens.ts:215)
//
// `canPlaceRing` is the axis worth showing: false swaps the sheet's hint for the honest line
// F58 added — "The live map is unavailable, so the proximity ring cannot be moved." — which is
// the state the demo is in whenever there is no Mapbox token, and the one a design pass is most
// likely to forget exists.
import { MapFiltersSheet } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 720, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const noop = () => {}

export function NoFiltersActive() {
  return (
    <Phone>
      <MapFiltersSheet
        visible
        onClose={noop}
        activeStatuses={[]}
        onStatusToggle={noop}
        proximityActive={false}
        proximityRadius={1}
        onProximityToggle={noop}
        onRadiusChange={noop}
        onClearAll={noop}
        locationCount={7}
        filteredCount={7}
        canPlaceRing
      />
    </Phone>
  )
}

export function StatusAndProximityActive() {
  return (
    <Phone>
      <MapFiltersSheet
        visible
        onClose={noop}
        activeStatuses={['started', 'working']}
        onStatusToggle={noop}
        proximityActive
        proximityRadius={2}
        onProximityToggle={noop}
        onRadiusChange={noop}
        onClearAll={noop}
        locationCount={7}
        filteredCount={3}
        canPlaceRing
      />
    </Phone>
  )
}

export function RingUnplaceable() {
  return (
    <Phone>
      <MapFiltersSheet
        visible
        onClose={noop}
        activeStatuses={['complete']}
        onStatusToggle={noop}
        proximityActive
        proximityRadius={0.5}
        onProximityToggle={noop}
        onRadiusChange={noop}
        onClearAll={noop}
        locationCount={7}
        filteredCount={1}
        canPlaceRing={false}
      />
    </Phone>
  )
}
