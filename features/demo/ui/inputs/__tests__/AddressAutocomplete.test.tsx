import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddressAutocomplete, pickFromFeature } from '@/features/demo/ui/inputs/AddressAutocomplete'

// Mock the Mapbox SDK so the suggest/retrieve flow is deterministic (no network).
const { suggestMock, retrieveMock } = vi.hoisted(() => ({ suggestMock: vi.fn(), retrieveMock: vi.fn() }))
vi.mock('@mapbox/search-js-core', () => ({
  SearchBoxCore: class {},
  SearchSession: class {
    suggest = suggestMock
    retrieve = retrieveMock
  },
}))

describe('pickFromFeature', () => {
  it('extracts street + city from a Search Box retrieve feature', () => {
    const feature = { properties: { name: '1450 Eglinton Avenue West', context: { address: { name: '1450 Eglinton Avenue West' }, place: { name: 'Mississauga' } } } }
    expect(pickFromFeature(feature)).toEqual({ streetAddress: '1450 Eglinton Avenue West', city: 'Mississauga' })
  })

  it('falls back to properties.name / empty city when context is sparse or missing', () => {
    expect(pickFromFeature({ properties: { name: '5 King St' } })).toEqual({ streetAddress: '5 King St', city: '' })
    expect(pickFromFeature(undefined)).toEqual({ streetAddress: '', city: '' })
  })
})

describe('AddressAutocomplete — no token (plain input fallback)', () => {
  it('edits via onChange and shows no suggestions', () => {
    const onChange = vi.fn()
    render(<AddressAutocomplete label="Street Address" value="" onChange={onChange} onPick={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Street Address'), { target: { value: '123 Main St' } })
    expect(onChange).toHaveBeenCalledWith('123 Main St')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('AddressAutocomplete — with token (mocked SDK)', () => {
  beforeEach(() => {
    suggestMock.mockReset()
    retrieveMock.mockReset()
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('suggests on typing and fills street + city on pick', async () => {
    suggestMock.mockResolvedValue({ suggestions: [{ name: '1450 Eglinton Ave W', place_formatted: 'Mississauga, ON' }] })
    retrieveMock.mockResolvedValue({
      features: [{ properties: { name: '1450 Eglinton Avenue West', context: { address: { name: '1450 Eglinton Avenue West' }, place: { name: 'Mississauga' } } } }],
    })
    const onPick = vi.fn()
    render(<AddressAutocomplete label="Street Address" value="1450 Eg" onChange={vi.fn()} onPick={onPick} />)

    const option = await screen.findByText('1450 Eglinton Ave W')
    expect(suggestMock).toHaveBeenCalledWith('1450 Eg', { country: 'ca', types: 'address', limit: 5, proximity: 'ip' })
    fireEvent.click(option)
    await waitFor(() => expect(onPick).toHaveBeenCalledWith({ streetAddress: '1450 Eglinton Avenue West', city: 'Mississauga' }))
  })
})
