import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { IncidentLocationFields } from '@/features/demo/ui/inputs/IncidentLocationFields'
import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'

// Mock the Mapbox SDK so the suggest/retrieve flow is deterministic (no network) — same shape as
// the AddressAutocomplete suite.
const { suggestMock, retrieveMock } = vi.hoisted(() => ({ suggestMock: vi.fn(), retrieveMock: vi.fn() }))
vi.mock('@mapbox/search-js-core', () => ({
  SearchBoxCore: class {},
  SearchSession: class {
    suggest = suggestMock
    retrieve = retrieveMock
  },
}))

type Reverse = (lat: number, lng: number) => Promise<{ streetAddress: string; city: string } | null>

const blank: IncidentLocationValues = { businessName: '', streetAddress: '', city: '', latitude: '', longitude: '', coordinateSource: '' }

function Host({ reverseGeocode }: { reverseGeocode?: Reverse }) {
  const [values, setValues] = useState(blank)
  return (
    <>
      <IncidentLocationFields values={values} onChange={(p) => setValues((s) => ({ ...s, ...p }))} reverseGeocode={reverseGeocode} />
      <div data-testid="source">{values.coordinateSource}</div>
    </>
  )
}

/** Type into the street field, wait for the suggestion, and pick it. */
async function pickSuggestion() {
  fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '1450 Eg' } })
  await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())
  fireEvent.click(screen.getByText('1450 Eglinton Ave W'))
}

beforeEach(() => {
  suggestMock.mockReset()
  retrieveMock.mockReset()
  suggestMock.mockResolvedValue({ suggestions: [{ name: '1450 Eglinton Ave W', place_formatted: 'Mississauga, ON' }] })
  retrieveMock.mockResolvedValue({
    features: [
      {
        geometry: { coordinates: [-79.6505, 43.6087] },
        properties: { name: '1450 Eglinton Avenue West', context: { address: { name: '1450 Eglinton Avenue West' }, place: { name: 'Mississauga' } } },
      },
    ],
  })
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('IncidentLocationFields — address pick', () => {
  it('fills street, city and the coordinates, stamped geocoded', async () => {
    render(<Host />)
    await pickSuggestion()
    await waitFor(() => expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Avenue West'))
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
    expect(screen.getByLabelText('Latitude')).toHaveValue('43.6087')
    expect(screen.getByLabelText('Longitude')).toHaveValue('-79.6505')
    expect(screen.getByTestId('source')).toHaveTextContent('geocoded')
  })

  it('does not reverse-geocode coordinates the pick just handed it', async () => {
    const reverseGeocode: Reverse = vi.fn(async () => ({ streetAddress: 'S', city: 'C' }))
    render(<Host reverseGeocode={reverseGeocode} />)
    await pickSuggestion()
    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveValue('43.6087'))
    // Blurring the (now populated) coordinate fields must not re-derive the address we were
    // handed with them.
    fireEvent.blur(screen.getByLabelText('Latitude'))
    fireEvent.blur(screen.getByLabelText('Longitude'))
    expect(reverseGeocode).not.toHaveBeenCalled()
  })

  // A pick is newer AND authoritative — it brings the address and the coordinates it belongs to.
  // A lookup started from the previous coordinates must not land on top of it.
  it('supersedes a reverse-geocode still in flight, and takes its spinner with it', async () => {
    let settle!: (v: { streetAddress: string; city: string }) => void
    const reverseGeocode: Reverse = () => new Promise((res) => { settle = res })
    render(<Host reverseGeocode={reverseGeocode} />)

    const lat = screen.getByLabelText('Latitude')
    const lng = screen.getByLabelText('Longitude')
    fireEvent.change(lat, { target: { value: '43.5' } })
    fireEvent.blur(lat)
    fireEvent.change(lng, { target: { value: '-79.5' } })
    fireEvent.blur(lng)
    await waitFor(() => expect(screen.getByTestId('incident-lookup-status')).toBeInTheDocument())

    await pickSuggestion()
    await waitFor(() => expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Avenue West'))
    expect(screen.queryByTestId('incident-lookup-status')).not.toBeInTheDocument() // spinner not stranded

    settle({ streetAddress: 'Stale St', city: 'Stale City' })
    await Promise.resolve()
    expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Avenue West')
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
  })
})

describe('IncidentLocationFields — coordinate error a11y (R-16)', () => {
  it('associates and announces the message, not just the red border', async () => {
    // The treatment the shared `Field` gained in this same phase (§56e), applied to the one
    // input that missed it. Before this the message was a bare <div>: an SR visitor heard
    // "invalid entry" from `aria-invalid` and never why.
    render(<Host />)
    const lat = screen.getByLabelText('Latitude')
    fireEvent.change(lat, { target: { value: '43.6abc' } })
    fireEvent.blur(lat)

    const message = await screen.findByRole('alert')
    expect(message).toHaveTextContent('Enter a valid number')
    expect(lat).toHaveAttribute('aria-invalid', 'true')
    expect(lat).toHaveAccessibleDescription('Enter a valid number')
  })
})
