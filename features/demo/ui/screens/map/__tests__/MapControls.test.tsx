import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapControls, locationCountLabel, type MapControlsProps } from '@/features/demo/ui/screens/map/MapControls'
import { EMPTY_MAP_FILTERS } from '@/features/demo/ui/screens/map/mapFilters'

function renderControls(over: Partial<MapControlsProps> = {}) {
  const props: MapControlsProps = {
    filters: EMPTY_MAP_FILTERS,
    onToggleStatus: vi.fn(),
    onSearchChange: vi.fn(),
    onClearFilters: vi.fn(),
    activeFilterCount: 0,
    proximityActive: false,
    proximityRadius: 1,
    onProximityToggle: vi.fn(),
    onRadiusChange: vi.fn(),
    locationCount: 3,
    filteredCount: 3,
    ...over,
  }
  render(<MapControls {...props} />)
  return props
}

describe('MapControls — status filters', () => {
  it('renders the three phone status pills in registry order', () => {
    renderControls()
    expect(screen.getByTestId('status-toggle-started')).toHaveTextContent('Started')
    expect(screen.getByTestId('status-toggle-working')).toHaveTextContent('Working')
    expect(screen.getByTestId('status-toggle-complete')).toHaveTextContent('Complete')
  })

  it('carries the phone accessibility label', () => {
    renderControls()
    expect(screen.getByLabelText('Filter by Started')).toBeInTheDocument()
  })

  it('swaps to the -active testid and marks itself pressed when selected', () => {
    renderControls({ filters: { statuses: ['complete'], searchText: '' } })
    expect(screen.getByTestId('status-toggle-complete-active')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByTestId('status-toggle-complete')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-toggle-started')).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the tapped status up', () => {
    const props = renderControls()
    fireEvent.click(screen.getByTestId('status-toggle-working'))
    expect(props.onToggleStatus).toHaveBeenCalledWith('working')
  })
})

describe('MapControls — count badge', () => {
  it('pluralises and hides the "of" half when nothing is narrowing', () => {
    renderControls({ locationCount: 3, filteredCount: 3 })
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('3 locations')
  })

  it('shows "N of M" while a filter is narrowing', () => {
    renderControls({ locationCount: 3, filteredCount: 1 })
    expect(screen.getByTestId('map-location-count')).toHaveTextContent('1 of 3 locations')
  })

  it('is hidden entirely when the case has no plottable locations', () => {
    renderControls({ locationCount: 0, filteredCount: 0 })
    expect(screen.queryByTestId('map-location-count')).not.toBeInTheDocument()
  })

  it('singularises a lone location', () => {
    expect(locationCountLabel(1, 1)).toBe('1 location')
    expect(locationCountLabel(0, 1)).toBe('0 of 1 location')
  })
})

describe('MapControls — search + clear', () => {
  it('renders the phone placeholder and label, bound to the filter text', () => {
    renderControls({ filters: { statuses: [], searchText: 'rear' } })
    const input = screen.getByTestId('map-search-input')
    expect(input).toHaveAttribute('placeholder', 'Search locations...')
    expect(screen.getByLabelText('Search locations')).toBe(input)
    expect(input).toHaveValue('rear')
  })

  it('reports typing up', () => {
    const props = renderControls()
    fireEvent.change(screen.getByTestId('map-search-input'), { target: { value: 'dock' } })
    expect(props.onSearchChange).toHaveBeenCalledWith('dock')
  })

  it('is rendered even with nothing to clear (never conditionally hidden)', () => {
    renderControls({ activeFilterCount: 0 })
    expect(screen.getByTestId('clear-filters-button')).toHaveTextContent('Clear')
    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument()
  })

  it('counts active filters in its label', () => {
    renderControls({ activeFilterCount: 2 })
    expect(screen.getByTestId('clear-filters-button')).toHaveTextContent('Clear (2)')
  })

  it('fires the clear callback', () => {
    const props = renderControls()
    fireEvent.click(screen.getByTestId('clear-filters-button'))
    expect(props.onClearFilters).toHaveBeenCalledTimes(1)
  })
})

describe('MapControls — proximity', () => {
  it('shows no radius presets while proximity is off', () => {
    renderControls({ proximityActive: false })
    expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity')
    expect(screen.getByLabelText('Activate proximity mode')).toBeInTheDocument()
    expect(screen.queryByTestId('radius-preset-1')).not.toBeInTheDocument()
  })

  it('shows all four presets and the ON label when active', () => {
    renderControls({ proximityActive: true })
    expect(screen.getByTestId('proximity-toggle-button')).toHaveTextContent('Proximity ON')
    expect(screen.getByLabelText('Deactivate proximity mode')).toBeInTheDocument()
    for (const preset of [0.5, 1, 2, 5]) {
      expect(screen.getByTestId(`radius-preset-${preset}`)).toHaveTextContent(`${preset}km`)
      expect(screen.getByLabelText(`${preset} km radius`)).toBeInTheDocument()
    }
  })

  it('marks the selected radius pressed and reports a change', () => {
    const props = renderControls({ proximityActive: true, proximityRadius: 2 })
    expect(screen.getByTestId('radius-preset-2')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('radius-preset-1')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByTestId('radius-preset-5'))
    expect(props.onRadiusChange).toHaveBeenCalledWith(5)
  })

  it('fires the toggle', () => {
    const props = renderControls()
    fireEvent.click(screen.getByTestId('proximity-toggle-button'))
    expect(props.onProximityToggle).toHaveBeenCalledTimes(1)
  })
})
