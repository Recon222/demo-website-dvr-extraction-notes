import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

import { MapFiltersSheet, MAP_FILTER_SECTION_LABEL } from '@/features/demo/ui/screens/map/MapFiltersSheet'
import { MAP_FILTER_STATUSES } from '@/features/demo/ui/screens/map/mapFilters'
import { PROXIMITY_PRESETS } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { STATUS_ACCENT, STATUS_SEVERITY, severityTone } from '@/features/demo/ui/tokens/status'

/**
 * `MapFiltersSheet` — the demo's port of the phone's PR #127 filters sheet
 * (`src/features/location/map-view/components/MapFiltersSheet.tsx` @ `dd5551ec`). Matrix A82,
 * plan §5 U5.3.
 *
 * Presentational, so every case here drives the component directly. The SCREEN wiring — the
 * filters actually narrowing the map — is pinned in `MapScreen.test.tsx`, which is where the
 * eight `it.todo`s U5.2 parked for this package live.
 */

const noop = () => {}

function mount(over: Partial<Parameters<typeof MapFiltersSheet>[0]> = {}) {
  const props = {
    visible: true,
    onClose: noop,
    activeStatuses: [] as const,
    onStatusToggle: noop,
    proximityActive: false,
    proximityRadius: 1 as const,
    onProximityToggle: noop,
    onRadiusChange: noop,
    onClearAll: noop,
    locationCount: 3,
    filteredCount: 3,
    ...over,
  }
  return render(<MapFiltersSheet {...props} />)
}

describe('MapFiltersSheet — the shell it composes', () => {
  it('mounts on GlassBottomSheet with the phone`s title, close label and no header ✕', () => {
    mount()
    // The shell names the dialog off `title`; A82 fixes the string.
    const dialog = screen.getByRole('dialog', { name: 'Map Filters' })
    expect(dialog).toBeInTheDocument()
    // `closeLabel` labels the SCRIM (U4.1 §8.2) — the phone's own string, verbatim
    // (`MapFiltersSheet.tsx:106`). It exists because this sheet renders NO visible close
    // control in the header: Done in the footer is the affordance.
    expect(screen.getByRole('button', { name: 'Close map filters' })).toHaveAttribute('data-sheet-scrim')
    // The shell owns no ✕ and this caller passes no `headerRight`.
    expect(within(dialog).queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument()
  })

  it('renders nothing when not visible', () => {
    mount({ visible: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-filters-sheet')).not.toBeInTheDocument()
  })

  it('keeps the accent strip ON — A82 is U4.1 R-9`s named exception', () => {
    const { container } = mount()
    expect(container.querySelector('[data-sheet-accent-strip]')).toBeInTheDocument()
  })

  it('closes on the scrim, on Escape and on Done — one handler, three of the four routes', () => {
    const onClose = vi.fn()
    mount({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Close map filters' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('filter-done'))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('closes on a swipe-down past the dismiss threshold — the fourth route', () => {
    const onClose = vi.fn()
    const { container } = mount({ onClose })
    const grab = container.querySelector('[data-sheet-grab]')!
    // `shouldDismissSheet` falls back to the frozen 786px screen when the panel measures 0 in
    // jsdom, so 0.25 * 786 = 196.5 is the distance to beat.
    fireEvent.pointerDown(grab, { clientY: 0, buttons: 1 })
    fireEvent.pointerMove(grab, { clientY: 100, buttons: 1 })
    fireEvent.pointerMove(grab, { clientY: 300, buttons: 1 })
    fireEvent.pointerUp(grab, { clientY: 300 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

/**
 * Each subtitle string appears TWICE — once visibly in the shell's header, once in the sr-only
 * live region that mirrors it (see the D-5 block at the bottom of this file). `getAllByText` is
 * asserting that pairing, not working around it: if the region ever stops tracking the subtitle
 * these reds at 1.
 */
const subtitleNodes = (text: string) => screen.getAllByText(text)

describe('MapFiltersSheet — the subtitle`s two forms', () => {
  it('states the plain count when nothing is filtered out', () => {
    mount({ locationCount: 3, filteredCount: 3 })
    expect(subtitleNodes('3 locations')).toHaveLength(2)
  })

  it('states "N of M … shown" when the set is narrowed', () => {
    mount({ locationCount: 3, filteredCount: 1 })
    expect(subtitleNodes('1 of 3 locations shown')).toHaveLength(2)
  })

  it('uses the singular for a single location', () => {
    mount({ locationCount: 1, filteredCount: 1 })
    expect(subtitleNodes('1 location')).toHaveLength(2)
  })
})

describe('MapFiltersSheet — status chips', () => {
  it('renders one chip per registry status, labelled and in registry order', () => {
    mount()
    const chips = MAP_FILTER_STATUSES.map((s) => screen.getByTestId(`filter-status-${s}`))
    expect(chips.map((c) => c.textContent)).toEqual(['Started', 'Working', 'Complete'])
    chips.forEach((chip, i) =>
      expect(chip).toHaveAttribute('aria-label', `Filter by ${['Started', 'Working', 'Complete'][i]}`),
    )
  })

  it('ADDS a status to the emitted set, and emits the FULL array (A82)', () => {
    const onStatusToggle = vi.fn()
    mount({ activeStatuses: ['started'], onStatusToggle })
    fireEvent.click(screen.getByTestId('filter-status-complete'))
    expect(onStatusToggle).toHaveBeenCalledWith(['started', 'complete'])
  })

  it('REMOVES an active status, still emitting the full remaining array', () => {
    const onStatusToggle = vi.fn()
    mount({ activeStatuses: ['started', 'complete'], onStatusToggle })
    fireEvent.click(screen.getByTestId('filter-status-started'))
    expect(onStatusToggle).toHaveBeenCalledWith(['complete'])
  })

  it('emits in REGISTRY order, not tap order — the exhaustive registry stays load-bearing', () => {
    // `mapFilters.ts:31-39` derives the order from an exhaustive `Record` (review R-17) so a
    // fourth `LocationMapStatus` cannot be silently dropped. The phone appends
    // (`MapFiltersSheet.tsx:88`); routing through `toggleStatus` keeps the demo's guarantee and
    // is otherwise the same set.
    const onStatusToggle = vi.fn()
    mount({ activeStatuses: ['complete'], onStatusToggle })
    fireEvent.click(screen.getByTestId('filter-status-started'))
    expect(onStatusToggle).toHaveBeenCalledWith(['started', 'complete'])
  })

  it('paints the ACTIVE chip from the severity trio and the INACTIVE one from the muted ramp', () => {
    mount({ activeStatuses: ['complete'] })
    // `severityTone` takes a SEVERITY, never a status — `STATUS_SEVERITY` is the hop between
    // them, and skipping it silently returns a tone of `undefined`s.
    const tone = severityTone(STATUS_SEVERITY.complete)
    const active = screen.getByTestId('filter-status-complete')
    // jsdom writes the border per side, so the side longhands are what reads back (§4 standing rule).
    expect(active).toHaveStyle({
      backgroundColor: tone.background,
      color: tone.color,
      borderTopColor: tone.borderColor,
      borderLeftColor: tone.borderColor,
    })
    expect(active).toHaveAttribute('aria-pressed', 'true')

    const inactive = screen.getByTestId('filter-status-started')
    expect(inactive).toHaveStyle({ color: colors.textSecondary, borderTopColor: colors.border })
    expect(inactive.style.background).toBe('transparent')
    expect(inactive).toHaveAttribute('aria-pressed', 'false')
  })

  it('the chip DOT is two-state: `*OnLight` when active, STATUS_ACCENT when not (W3-C10)', () => {
    // `MapFiltersSheet.tsx:139`. Painting every dot from STATUS_ACCENT loses the distinction the
    // chip depends on; painting every dot from `*OnLight` spends a foreground as a bare mark,
    // which is the defect `tokens/status.ts:19-23` exists to prevent.
    mount({ activeStatuses: ['complete'] })
    expect(screen.getByTestId('filter-status-complete-dot')).toHaveStyle({
      backgroundColor: severityTone(STATUS_SEVERITY.complete).color,
    })
    expect(screen.getByTestId('filter-status-started-dot')).toHaveStyle({
      backgroundColor: colors[STATUS_ACCENT.started],
    })
  })

  it('is NOT the shared badge recipe — the chip carries its own geometry (U5.4 R2)', () => {
    mount()
    const chip = screen.getByTestId('filter-status-started')
    // `statusBadgeStyle` is radius `lg` (12) with `BADGE_PADDING`; this is a full-radius
    // 44-high control. A "tidy this onto statusBadgeStyle" refactor must red here.
    expect(chip).toHaveStyle({ borderRadius: '9999px', minHeight: '44px' })
    expect(screen.getByTestId('filter-status-started-dot')).toHaveStyle({ width: '7px', height: '7px' })
  })
})

describe('MapFiltersSheet — proximity', () => {
  it('renders the demo`s ONE switch, reflecting state and naming both directions', () => {
    mount({ proximityActive: false })
    const sw = screen.getByTestId('filter-proximity')
    expect(sw).toHaveAttribute('role', 'switch')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(sw).toHaveAttribute('aria-label', 'Activate proximity mode')
    expect(screen.getByText('Filter by radius')).toBeInTheDocument()
  })

  it('names the OFF direction when proximity is already running', () => {
    mount({ proximityActive: true })
    const sw = screen.getByTestId('filter-proximity')
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveAttribute('aria-label', 'Deactivate proximity mode')
  })

  it('flips proximity from the switch', () => {
    const onProximityToggle = vi.fn()
    mount({ onProximityToggle })
    fireEvent.click(screen.getByTestId('filter-proximity'))
    expect(onProximityToggle).toHaveBeenCalledTimes(1)
  })

  it('hides the radius chips until proximity is active', () => {
    mount({ proximityActive: false })
    PROXIMITY_PRESETS.forEach((p) => expect(screen.queryByTestId(`filter-radius-${p}`)).not.toBeInTheDocument())
  })

  it('renders all four presets with a SPACE before km, on the info pair when selected', () => {
    const onRadiusChange = vi.fn()
    mount({ proximityActive: true, proximityRadius: 2, onRadiusChange })
    expect(PROXIMITY_PRESETS.map((p) => screen.getByTestId(`filter-radius-${p}`).textContent)).toEqual([
      '0.5 km',
      '1 km',
      '2 km',
      '5 km',
    ])
    const info = severityTone('info')
    const selected = screen.getByTestId('filter-radius-2')
    expect(selected).toHaveStyle({
      backgroundColor: info.background,
      color: info.color,
      borderTopColor: info.borderColor,
    })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('filter-radius-5')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByTestId('filter-radius-5'))
    expect(onRadiusChange).toHaveBeenCalledWith(5)
    expect(screen.getByTestId('filter-radius-0.5')).toHaveAttribute('aria-label', '0.5 kilometre radius')
  })

  it('states the long-press hint verbatim', () => {
    mount()
    expect(screen.getByText('Long-press the map to place or move the proximity ring.')).toBeInTheDocument()
  })
})

describe('MapFiltersSheet — footer', () => {
  it('offers Clear All and Done as the two flex:1 medium buttons A68 prescribes', () => {
    mount()
    const clear = screen.getByTestId('filter-clear-all')
    const done = screen.getByTestId('filter-done')
    expect(clear).toHaveTextContent('Clear All')
    expect(done).toHaveTextContent('Done')
    // `outline` is `colors.link`-labelled on a transparent fill; `primary` is the CTA gradient.
    // `flexGrow`/`flexShrink`/`flexBasis`, never the `flex` shorthand: jsdom serialises
    // `flex-basis: 0` as `0px` while `flex: 1` expands to `0%`, so a shorthand pin compares
    // against a normalisation rather than the value.
    expect(clear).toHaveStyle({ color: colors.link, flexGrow: '1', flexShrink: '1' })
    expect(done).toHaveStyle({ color: colors.onPrimary, flexGrow: '1', flexShrink: '1' })
    // A68: medium, not large. `buttonStyle`'s medium is 48 high.
    expect(clear).toHaveStyle({ minHeight: '48px' })
    expect(clear).toHaveAttribute('aria-label', 'Clear all filters')
    expect(done).toHaveAttribute('aria-label', 'Apply filters and close')
  })

  it('fires onClearAll from Clear All and NOT onClose', () => {
    const onClearAll = vi.fn()
    const onClose = vi.fn()
    mount({ onClearAll, onClose })
    fireEvent.click(screen.getByTestId('filter-clear-all'))
    expect(onClearAll).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('MapFiltersSheet — the live region D-5 asked this package to place', () => {
  it('announces the filtered count politely, from a region that mounts EMPTY', () => {
    // U5.2's D-5: the map chrome lost its live region for filter feedback when the count pill
    // went. This is where it lands — the one surface that states the count in every filter
    // state. Mounted empty and written on the next tick, which is `ExportModal.tsx:124-139`'s
    // idiom and the whole reason it exists: "an aria-live region only announces what changes
    // AFTER it mounts".
    const { rerender } = mount({ locationCount: 3, filteredCount: 3 })
    const region = screen.getByTestId('map-filters-announcement')
    expect(region).toHaveAttribute('role', 'status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('3 locations')

    rerender(
      <MapFiltersSheet
        visible
        onClose={noop}
        activeStatuses={['complete']}
        onStatusToggle={noop}
        proximityActive={false}
        proximityRadius={1}
        onProximityToggle={noop}
        onRadiusChange={noop}
        onClearAll={noop}
        locationCount={1}
        filteredCount={1}
      />,
    )
    expect(screen.getByTestId('map-filters-announcement')).toHaveTextContent('1 location')
  })

  it('clears the region when the sheet closes, so the NEXT open announces too', () => {
    // Without the reset the region is re-shown already-populated on every open after the
    // first, and a region that appears already-populated is announced inconsistently — the
    // exact defect D-5 named for the proximity chip. The sheet is still mounted during its
    // 200ms exit, which is what makes the reset observable at all.
    const { rerender } = mount({ locationCount: 3, filteredCount: 3 })
    expect(screen.getByTestId('map-filters-announcement')).toHaveTextContent('3 locations')
    rerender(
      <MapFiltersSheet
        visible={false}
        onClose={noop}
        activeStatuses={[]}
        onStatusToggle={noop}
        proximityActive={false}
        proximityRadius={1}
        onProximityToggle={noop}
        onRadiusChange={noop}
        onClearAll={noop}
        locationCount={3}
        filteredCount={3}
      />,
    )
    expect(screen.getByTestId('map-filters-announcement')).toBeEmptyDOMElement()
  })
})

describe('MapFiltersSheet — the section-label constant row 45 pins', () => {
  it('exports the label recipe the contrast row measures, at 12/700/uppercase', () => {
    // U0.5's structural rule: the ratio is pinned AT the constant the component paints, so the
    // pin moves with the value. `palette-contrast.test.ts` row 45 reads this same export.
    mount()
    expect(screen.getByText('Location Status')).toHaveStyle({
      fontSize: '12px',
      fontWeight: '700',
      textTransform: 'uppercase',
      color: colors.textSecondary,
    })
    expect(MAP_FILTER_SECTION_LABEL.color).toBe(colors.textSecondary)
  })
})
