import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useState } from 'react'

import { EditIncidentLocationModal } from '@/features/demo/ui/screens/EditIncidentLocationModal'
import {
  REVERSE_GEOCODE_PARTIAL,
  REVERSE_GEOCODE_UNAVAILABLE,
} from '@/features/demo/ui/inputs/LocationFields'
import { caseToIncidentValues, type IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import type { DemoCase } from '@/features/demo/engine/types'
import { demoCase } from '@/features/demo/engine/store/__tests__/test-utils'
import { colors } from '@/features/demo/ui/tokens/palette'

/** jsdom rewrites inline hex to `rgb()`; pins compare against the token, never a retyped literal. */
const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

type Reverse = (lat: number, lng: number) => Promise<{ streetAddress: string; city: string } | null>

const seededCase: DemoCase = demoCase({
  caseNumber: 'PR25-1',
  displayName: 'Kim B&E',
  unit: 'Central Robbery',
  oicName: 'Liam McHugh',
  incidentBusinessName: 'Kim Convenience',
  incidentStreetAddress: '1450 Eglinton Ave W',
  incidentCity: 'Mississauga',
  incidentCoordinates: { lat: 43.5, lng: -79.5, source: 'geocoded' },
  locationIds: [],
})

/** Drives the modal the way the bridge does: seed once, then apply patches. */
function Host({
  initial,
  onSubmit = vi.fn(),
  onCancel = vi.fn(),
  reverseGeocode,
  onValues,
}: {
  initial: IncidentLocationValues
  onSubmit?(): void
  onCancel?(): void
  reverseGeocode?: Reverse
  onValues?(v: IncidentLocationValues): void
}) {
  const [values, setValues] = useState(initial)
  return (
    <EditIncidentLocationModal
      values={values}
      onChange={(patch) =>
        setValues((s) => {
          const next = { ...s, ...patch }
          onValues?.(next)
          return next
        })
      }
      onSubmit={onSubmit}
      onCancel={onCancel}
      reverseGeocode={reverseGeocode}
    />
  )
}

const blank: IncidentLocationValues = { businessName: '', streetAddress: '', city: '', latitude: '', longitude: '', coordinateSource: '' }

function blurCoordinates(lat: string, lng: string) {
  const latInput = screen.getByLabelText('Latitude')
  const lngInput = screen.getByLabelText('Longitude')
  fireEvent.change(latInput, { target: { value: lat } })
  fireEvent.blur(latInput)
  fireEvent.change(lngInput, { target: { value: lng } })
  fireEvent.blur(lngInput)
}

describe('EditIncidentLocationModal — seeding', () => {
  it('opens seeded from the case, with the stored coordinates and their provenance', () => {
    render(<Host initial={caseToIncidentValues(seededCase)} />)
    expect(screen.getByRole('dialog', { name: 'Edit Incident Location' })).toBeInTheDocument()
    expect(screen.getByLabelText('Business / Scene Name')).toHaveValue('Kim Convenience')
    expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Ave W')
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
    expect(screen.getByLabelText('Latitude')).toHaveValue('43.5')
    expect(screen.getByLabelText('Longitude')).toHaveValue('-79.5')
    expect(screen.getByTestId('coordinate-display-coords')).toHaveTextContent('43.500000, -79.500000')
    expect(screen.getByTestId('coordinate-display-source')).toHaveTextContent(/geocode/i)
  })

  it('shows no coordinate card for a case with no incident coordinates', () => {
    render(<Host initial={caseToIncidentValues({ ...seededCase, incidentCoordinates: undefined })} />)
    expect(screen.getByLabelText('Latitude')).toHaveValue('')
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })

  it('wires Save Changes and Cancel', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(<Host initial={caseToIncidentValues(seededCase)} onSubmit={onSubmit} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Save Changes'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('rejects an out-of-range coordinate inline and withholds the coordinate card', () => {
    render(<Host initial={blank} />)
    const latInput = screen.getByLabelText('Latitude')
    fireEvent.change(latInput, { target: { value: '91' } })
    fireEvent.blur(latInput)
    expect(screen.getByText('Latitude must be between -90 and 90')).toBeInTheDocument()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })
})

describe('EditIncidentLocationModal — reverse-geocode banner', () => {
  it('fills street + city from a manual coordinate pair and shows no banner', async () => {
    const reverseGeocode: Reverse = vi.fn(async () => ({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' }))
    render(<Host initial={blank} reverseGeocode={reverseGeocode} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Ave W'))
    expect(screen.getByLabelText('City')).toHaveValue('Mississauga')
    expect(reverseGeocode).toHaveBeenCalledWith(43.5, -79.5)
    expect(screen.queryByTestId('edit-incident-error')).not.toBeInTheDocument()
  })

  // The wired banner is this surface's whole point (ui-mapping 03:283 — the phone's own
  // fact-check found this trigger undocumented). A failed lookup must SAY so.
  it('raises the banner when the lookup finds nothing, keeping the entered coordinates', async () => {
    render(<Host initial={blank} reverseGeocode={async () => null} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(screen.getByTestId('edit-incident-error')).toHaveTextContent(REVERSE_GEOCODE_UNAVAILABLE))
    expect(screen.getByLabelText('Latitude')).toHaveValue('43.5')
    expect(screen.getByTestId('coordinate-display-coords')).toHaveTextContent('43.500000, -79.500000')
  })

  it('renders that banner through the SHARED Banner, not a private recipe (A71/U3.3)', async () => {
    // The phone's own line is `EditIncidentLocationModal.tsx:125` —
    // `<Banner severity="error" message={submitError} style={styles.errorBanner} />`. Every
    // other case here reads testid and text only, so they pass over a re-inlined local recipe;
    // this is the one that reds. The trio is read off the tokens, never retyped.
    render(<Host initial={blank} reverseGeocode={async () => null} />)
    blurCoordinates('43.5', '-79.5')
    const banner = await screen.findByTestId('edit-incident-error')
    expect(banner.style.backgroundColor).toBe(rgb(colors.errorLight))
    expect(banner.style.borderColor).toBe(rgb(colors.error))
    expect((banner.lastElementChild as HTMLElement).style.color).toBe(rgb(colors.errorOnLight))
    // phone `errorBanner` (`:185-187`) is `marginBottom: Layout.spacing.md` — 16, not the 14
    // the deleted local recipe carried.
    expect(banner.style.marginBottom).toBe('16px')
  })

  it('raises the banner when the lookup throws (an injected seam that breaks its contract)', async () => {
    render(<Host initial={blank} reverseGeocode={async () => { throw new Error('boom') }} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(screen.getByTestId('edit-incident-error')).toHaveTextContent(REVERSE_GEOCODE_UNAVAILABLE))
    expect(screen.queryByTestId('incident-lookup-status')).not.toBeInTheDocument() // spinner not stranded
  })

  it('on a partial result writes only what resolved and says the rest stands', async () => {
    render(
      <Host
        initial={{ ...blank, streetAddress: 'typed by hand', city: 'Brampton' }}
        reverseGeocode={async () => ({ streetAddress: '1450 Eglinton Ave W', city: '' })}
      />,
    )
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(screen.getByTestId('edit-incident-error')).toHaveTextContent(REVERSE_GEOCODE_PARTIAL))
    expect(screen.getByLabelText('Street Address')).toHaveValue('1450 Eglinton Ave W')
    expect(screen.getByLabelText('City')).toHaveValue('Brampton') // NOT blanked
  })

  it('clears a stale banner when a later lookup succeeds', async () => {
    let result: Awaited<ReturnType<Reverse>> = null
    render(<Host initial={blank} reverseGeocode={async () => result} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(screen.getByTestId('edit-incident-error')).toBeInTheDocument())
    result = { streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' }
    blurCoordinates('43.6', '-79.6')
    await waitFor(() => expect(screen.queryByTestId('edit-incident-error')).not.toBeInTheDocument())
  })

  it('does not re-fire for an unchanged pair (phone lastGeocodedRef)', async () => {
    const reverseGeocode: Reverse = vi.fn(async () => ({ streetAddress: 'S', city: 'C' }))
    render(<Host initial={blank} reverseGeocode={reverseGeocode} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(reverseGeocode).toHaveBeenCalledTimes(1))
    fireEvent.blur(screen.getByLabelText('Latitude'))
    fireEvent.blur(screen.getByLabelText('Longitude'))
    expect(reverseGeocode).toHaveBeenCalledTimes(1)
  })

  it('does not look up a half-valid pair', () => {
    const reverseGeocode: Reverse = vi.fn(async () => ({ streetAddress: 'S', city: 'C' }))
    render(<Host initial={blank} reverseGeocode={reverseGeocode} />)
    const latInput = screen.getByLabelText('Latitude')
    fireEvent.change(latInput, { target: { value: '43.5' } })
    fireEvent.blur(latInput)
    expect(reverseGeocode).not.toHaveBeenCalled()
  })

  it('applies only the newest lookup when two overlap', async () => {
    const resolvers: Array<(v: { streetAddress: string; city: string }) => void> = []
    const reverseGeocode: Reverse = () => new Promise((res) => resolvers.push(res))
    render(<Host initial={blank} reverseGeocode={reverseGeocode} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(resolvers).toHaveLength(1))
    // Move ONE axis, so exactly one further lookup starts (editing both re-fires on each blur,
    // which is the phone's behaviour too — `maybeGeocodeManual` runs per field, :244/:268).
    const lngInput = screen.getByLabelText('Longitude')
    fireEvent.change(lngInput, { target: { value: '-79.6' } })
    fireEvent.blur(lngInput)
    await waitFor(() => expect(resolvers).toHaveLength(2))
    // The FIRST (now stale) request settles last — its address must not win.
    resolvers[1]({ streetAddress: 'Newest St', city: 'Newest City' })
    resolvers[0]({ streetAddress: 'Stale St', city: 'Stale City' })
    await waitFor(() => expect(screen.getByLabelText('Street Address')).toHaveValue('Newest St'))
    expect(screen.getByLabelText('Street Address')).toHaveValue('Newest St')
  })

  it('drops a lookup that settles after the modal unmounted', async () => {
    const onValues = vi.fn()
    let resolve!: (v: { streetAddress: string; city: string }) => void
    const reverseGeocode: Reverse = () => new Promise((res) => { resolve = res })
    const { unmount } = render(<Host initial={blank} reverseGeocode={reverseGeocode} onValues={onValues} />)
    blurCoordinates('43.5', '-79.5')
    await waitFor(() => expect(resolve).toBeDefined())
    onValues.mockClear()
    unmount()
    resolve({ streetAddress: 'Late St', city: 'Late City' })
    await Promise.resolve()
    expect(onValues).not.toHaveBeenCalled()
  })
})
