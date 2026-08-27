import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  MapControls,
  MAP_FILTER_BADGE_FILL,
  type MapControlsProps,
} from '@/features/demo/ui/screens/map/MapControls'
import { EMPTY_MAP_FILTERS } from '@/features/demo/ui/screens/map/mapFilters'
import { MAP_GLASS_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * The collapsed map chrome (U5.2) — port of the phone's PR #127 `MapControls.tsx`
 * (`src/features/location/map-view/components/MapControls.tsx` @ `dd5551ec`).
 *
 * Three wrapping rows of ~9 glass pills became ONE row plus a conditional chip:
 *
 *   [← close]  [🔍 search field ............ ✕  │ ⚙ filters ●]
 *   [◎ 2 km · 5 of 9  ✕]        ← only while proximity is active
 *
 * The status pills, the Clear pill, the proximity toggle and the four radius presets moved
 * into `MapFiltersSheet` (U5.3). Their ABSENCE is pinned here, exactly as the phone pins it
 * (`__tests__/MapControls.test.tsx:186-198`) — a deletion nobody guards comes back.
 */

function renderControls(over: Partial<MapControlsProps> = {}) {
  const props: MapControlsProps = {
    filters: EMPTY_MAP_FILTERS,
    onSearchChange: vi.fn(),
    onOpenFilters: vi.fn(),
    filterBadgeCount: 0,
    proximityActive: false,
    proximityRadius: 1,
    onProximityDeactivate: vi.fn(),
    locationCount: 9,
    filteredCount: 9,
    ...over,
  }
  const view = render(<MapControls {...props} />)
  return { ...props, ...view }
}

describe('MapControls — search field', () => {
  it('carries the phone placeholder and label, bound to the filter text', () => {
    renderControls({ filters: { statuses: [], searchText: 'rear' } })
    const input = screen.getByTestId('map-search-input')
    expect(input).toHaveAttribute('placeholder', 'Search locations...')
    expect(screen.getByLabelText('Search locations')).toBe(input)
    expect(input).toHaveValue('rear')
  })

  it('reports typing up', () => {
    const props = renderControls()
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'CN Tower' } })
    expect(props.onSearchChange).toHaveBeenCalledWith('CN Tower')
  })

  it('shows the inline clear-✕ only while the field has text, and clears through the same callback', () => {
    const { onSearchChange, rerender } = renderControls()
    expect(screen.queryByTestId('map-search-clear')).not.toBeInTheDocument()

    rerender(
      <MapControls
        filters={{ statuses: [], searchText: 'CN Tower' }}
        onSearchChange={onSearchChange}
        onOpenFilters={vi.fn()}
        filterBadgeCount={0}
        proximityActive={false}
        proximityRadius={1}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={9}
      />,
    )
    fireEvent.click(screen.getByTestId('map-search-clear'))
    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })

  it('paints the field text with the map chrome token, not a literal (contrast row 42)', () => {
    renderControls()
    expect(screen.getByTestId('map-search-input')).toHaveStyle({ color: MAP_GLASS_COLORS.text })
  })
})

describe('MapControls — close button', () => {
  it('renders ONLY when onClose is supplied — the phone gate, and the demo honesty rule', () => {
    const { rerender } = renderControls()
    expect(screen.queryByTestId('map-close-button')).not.toBeInTheDocument()

    const onClose = vi.fn()
    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={0}
        onClose={onClose}
        proximityActive={false}
        proximityRadius={1}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={9}
      />,
    )
    expect(screen.getByTestId('map-close-button')).toBeInTheDocument()
  })

  it('carries the phone label and hint verbatim, and fires', () => {
    const props = renderControls({ onClose: vi.fn() })
    const close = screen.getByTestId('map-close-button')
    expect(close).toHaveAttribute('aria-label', 'Change case')
    // RN `accessibilityHint` rides as the tooltip on the web — the repo's own convention
    // (`WizardDrawer.tsx:262-264`).
    expect(close).toHaveAttribute('title', 'Returns to the case picker')
    fireEvent.click(close)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('is a 44×44 circle — the phone touch-target floor, which has no hitSlop on the web', () => {
    renderControls({ onClose: vi.fn() })
    expect(screen.getByTestId('map-close-button')).toHaveStyle({ width: '44px', height: '44px' })
  })
})

describe('MapControls — filters button + count badge', () => {
  it('opens the filters sheet', () => {
    const props = renderControls()
    fireEvent.click(screen.getByTestId('map-open-filters'))
    expect(props.onOpenFilters).toHaveBeenCalledTimes(1)
  })

  it('shows the badge only above zero, and READS the numeral it paints', () => {
    const { rerender } = renderControls({ filterBadgeCount: 0 })
    expect(screen.queryByTestId('map-filter-badge')).not.toBeInTheDocument()

    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={2}
        proximityActive={false}
        proximityRadius={1}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={9}
      />,
    )
    // Presence alone is not enough (the phone's own note): the badge is the only on-map sign
    // that filters are active now that the pill rows are gone, so the number is read. Scoped
    // with `within` so it cannot match the chip's "9 of 9" copy.
    expect(within(screen.getByTestId('map-filter-badge')).getByText('2')).toBeInTheDocument()
  })

  it('announces the active count in the button label, as the phone does', () => {
    const { rerender } = renderControls({ filterBadgeCount: 0 })
    expect(screen.getByLabelText('Open map filters')).toBeInTheDocument()

    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={3}
        proximityActive={false}
        proximityRadius={1}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={9}
      />,
    )
    expect(screen.getByLabelText('Open map filters, 3 active')).toBeInTheDocument()
  })

  it('fills the badge with primaryDark, NOT the phone`s flat primary — D5`s ruled divergence', () => {
    // The phone paints `Colors.dark.onPrimary` on `Colors.dark.primary` (`MapControls.tsx:181`,
    // `:328`) = #ffffff on #2B8CC1 = 3.73:1 under a NUMERAL, below the 4.5 text floor. D5's
    // amendment and A19's rider take the deep shade instead (5.80:1). Pinned at the exported
    // constant, not at `palette.primaryDark`, so a revert to the phone's literal REDS here
    // (the `SwipeDeleteAction` lesson U0.5 records).
    expect(MAP_FILTER_BADGE_FILL).toBe(colors.primaryDark)
    expect(MAP_FILTER_BADGE_FILL).not.toBe(colors.primary)
    renderControls({ filterBadgeCount: 1 })
    expect(screen.getByTestId('map-filter-badge')).toHaveStyle({
      background: MAP_FILTER_BADGE_FILL,
      color: colors.onPrimary,
    })
  })

  it('drops the filters button, its divider and its badge when no sheet is wired (SEAM(U5.3))', () => {
    renderControls({ onOpenFilters: undefined, filterBadgeCount: 4 })
    expect(screen.queryByTestId('map-open-filters')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-filter-badge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-filter-divider')).not.toBeInTheDocument()
    // …and the field is still whole: the bar degrades to a search-only pill, never to a
    // button that swallows every press.
    expect(screen.getByTestId('map-search-input')).toBeInTheDocument()
  })
})

describe('MapControls — proximity summary chip', () => {
  it('renders only while proximity is active, with the radius and the N-of-M count', () => {
    const { rerender } = renderControls()
    expect(screen.queryByTestId('proximity-chip')).not.toBeInTheDocument()

    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={1}
        proximityActive
        proximityRadius={2}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={5}
      />,
    )
    expect(screen.getByTestId('proximity-chip')).toHaveTextContent('2 km · 5 of 9')
  })

  it('announces activation, because the region is EMPTY before it (R-7a, F73)', () => {
    // A live region only speaks what changes AFTER it mounts. The region therefore lives OUTSIDE
    // the `proximityActive` gate: empty while proximity is off, populated when it turns on, so
    // the one event worth announcing — long-pressing the map into proximity mode — is a content
    // change rather than an initial value nobody hears.
    const { rerender } = renderControls({ proximityActive: false })
    const region = screen.getByTestId('proximity-chip-announcement')
    expect(region).toHaveAttribute('role', 'status')
    expect(region).toHaveTextContent('')

    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={1}
        proximityActive
        proximityRadius={2}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={5}
      />,
    )
    expect(screen.getByTestId('proximity-chip-announcement')).toHaveTextContent(
      'Proximity filter on, 2 km showing 5 of 9',
    )
  })

  it('empties the region again on deactivation, so the next activation still announces', () => {
    // Without this half the region stays populated after the chip goes, and the SECOND
    // activation is an initial value again — the recurrence D-5 recorded against the old span.
    const { rerender } = renderControls({ proximityActive: true, filteredCount: 5 })
    expect(screen.getByTestId('proximity-chip-announcement')).not.toHaveTextContent('')

    rerender(
      <MapControls
        filters={EMPTY_MAP_FILTERS}
        onSearchChange={vi.fn()}
        onOpenFilters={vi.fn()}
        filterBadgeCount={0}
        proximityActive={false}
        proximityRadius={1}
        onProximityDeactivate={vi.fn()}
        locationCount={9}
        filteredCount={9}
      />,
    )
    expect(screen.getByTestId('proximity-chip-announcement')).toHaveTextContent('')
  })

  it('leaves the VISIBLE summary a plain span — one region, not two competing ones', () => {
    // It carried `role="status"` before F73. Two live regions holding the same count is how a
    // screen reader ends up saying it twice, and the visible one could never announce anyway.
    renderControls({ proximityActive: true, filteredCount: 5 })
    expect(screen.getByTestId('proximity-chip-summary')).not.toHaveAttribute('role')
  })

  it('keeps its own visible text inside its accessible name (WCAG 2.5.3, F59)', () => {
    // The phone spells "kilometre radius" (`MapControls.tsx:206`). The demo diverges to `km`
    // because that is the token the visitor can SEE and therefore say: a speech-input user
    // addresses this control as "2 km", and an accessible name that never contains those
    // characters is unreachable by voice. Both visible fragments are asserted AGAINST THE
    // RENDERED TEXT rather than retyped, so the two cannot drift apart.
    renderControls({ proximityActive: true, proximityRadius: 0.5, locationCount: 9, filteredCount: 5 })
    const body = screen.getByTestId('proximity-chip-body')
    const name = body.getAttribute('aria-label') ?? ''
    expect(name).toBe('Proximity filter, 0.5 km, showing 5 of 9 locations')
    for (const visible of (body.textContent ?? '').split('·').map((s) => s.trim())) {
      expect(name, `visible "${visible}" must appear in the accessible name`).toContain(visible)
    }
  })

  it('opens the filters sheet from the chip body and deactivates from the ✕', () => {
    const props = renderControls({ proximityActive: true })
    fireEvent.click(screen.getByTestId('proximity-chip-body'))
    expect(props.onOpenFilters).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('proximity-chip-dismiss'))
    expect(props.onProximityDeactivate).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Deactivate proximity mode')).toBeInTheDocument()
  })

  it('keeps the summary readable but NOT pressable when no filters sheet is wired', () => {
    renderControls({ proximityActive: true, onOpenFilters: undefined, filteredCount: 5 })
    const body = screen.getByTestId('proximity-chip-body')
    expect(body.tagName).toBe('DIV')
    expect(body).toHaveTextContent('1 km · 5 of 9')
    // The exit stays live — proximity is activated by long-press, so it must always be
    // escapable from the map itself.
    expect(screen.getByTestId('proximity-chip-dismiss')).toBeInTheDocument()
  })
})

describe('MapControls — retired chrome (the pill-chrome deletion)', () => {
  it('no longer renders the status pills, the Clear pill, the proximity toggle, the radius presets or the count pill', () => {
    renderControls({ proximityActive: true, filterBadgeCount: 3 })
    expect(screen.queryByTestId('status-toggle-started')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-toggle-working')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-toggle-complete')).not.toBeInTheDocument()
    expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proximity-toggle-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('radius-preset-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-location-count')).not.toBeInTheDocument()
  })
})

describe('MapControls — geometry', () => {
  it('clears the demo frame`s status bar instead of the deleted Change Case pill', () => {
    // Phone: outer `top: 0` + `paddingTop: safeAreaTop` then `paddingTop: spacing.sm`
    // (`MapControls.tsx:107`, `:251`). The demo's `safeAreaTop` analog is PhoneFrame's fixed
    // 50px status bar, so the chrome starts at 58 — where the pre-#127 demo used 92 to clear
    // the "Change Case" pill that no longer exists.
    renderControls()
    const container = screen.getByTestId('map-controls-container')
    expect(container).toHaveStyle({ top: '0px' })
    expect(container.firstElementChild).toHaveStyle({ paddingTop: '58px', gap: '8px' })
  })

  it('keeps the demo`s own z-scheme — the phone`s 1000-series is out of scope (D14)', () => {
    // MapBottomSheet 20 · MapCanvas error overlay 25 · CaseMapPicker 30 · CallConfirmSheet 48 ·
    // DemoNotification 60. Importing the phone's 1020 would put the floating chrome above every
    // one of them.
    renderControls()
    expect(screen.getByTestId('map-controls-container')).toHaveStyle({ zIndex: '15' })
  })

  it('lets map drags pass between the controls, and keeps every surface pressable', () => {
    renderControls({ onClose: vi.fn(), proximityActive: true })
    expect(screen.getByTestId('map-controls-container')).toHaveStyle({ pointerEvents: 'none' })
    expect(screen.getByTestId('map-close-button')).toHaveStyle({ pointerEvents: 'auto' })
    expect(screen.getByTestId('map-search-pill')).toHaveStyle({ pointerEvents: 'auto' })
    expect(screen.getByTestId('proximity-chip')).toHaveStyle({ pointerEvents: 'auto' })
  })

  it('paints one surface — the search pill and the close circle share containerBg, no inputBg', () => {
    renderControls({ onClose: vi.fn() })
    expect(screen.getByTestId('map-search-pill')).toHaveStyle({
      background: MAP_GLASS_COLORS.containerBg,
      height: '44px',
      borderRadius: '9999px',
    })
    expect(screen.getByTestId('map-close-button')).toHaveStyle({
      background: MAP_GLASS_COLORS.containerBg,
    })
  })
})
