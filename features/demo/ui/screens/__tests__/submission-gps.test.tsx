import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

import { GPS_MESSAGES } from '@/features/demo/engine/logic/gps'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'
import { REVERSE_GEOCODE_UNAVAILABLE } from '@/features/demo/ui/inputs/LocationFields'
import { SubmissionScreen, type SubmissionCoordinates } from '@/features/demo/ui/screens/SubmissionScreen'

const fields = {
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  businessName: '',
  streetAddress: '',
  city: '',
  locationContact: '',
  locationPhone: '',
}

const position = (accuracy: number) =>
  ({
    coords: {
      latitude: 43.608701,
      longitude: -79.650502,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

const geolocation = (accuracy: number): GeolocationLike => ({
  getCurrentPosition: (onSuccess) => onSuccess(position(accuracy)),
})

const denied: GeolocationLike = {
  getCurrentPosition: (_onSuccess, onError) => onError({ code: 1, message: 'denied' } as GeolocationPositionError),
}

function renderSubmission(o: {
  geolocation?: GeolocationLike | null
  coordinates?: SubmissionCoordinates
  onCoordinates?: (c: SubmissionCoordinates) => void
  onChange?: (f: keyof typeof fields, v: string) => void
  reverseGeocode?: (lat: number, lng: number) => Promise<{ streetAddress: string; city: string } | null>
} = {}) {
  return render(
    <SubmissionScreen
      occNumber="PR25-0098213"
      fields={fields}
      coordinates={o.coordinates}
      onChange={o.onChange ?? vi.fn()}
      onCoordinates={o.onCoordinates ?? vi.fn()}
      onNext={vi.fn()}
      onBack={vi.fn()}
      onMenu={vi.fn()}
      gpsDeps={{ geolocation: o.geolocation ?? null, delay: async () => undefined }}
      reverseGeocode={o.reverseGeocode ?? (async () => null)}
    />,
  )
}

describe('Submission — location section shape (ui-mapping 05)', () => {
  it('renders the phone render order: business → street → city → GPS → contacts', () => {
    const { container } = renderSubmission()
    const order = Array.from(container.querySelectorAll('input, [data-testid="gps-capture-control"]')).map(
      (el) => el.getAttribute('aria-label') ?? el.getAttribute('data-testid'),
    )
    const idx = (needle: string) => order.indexOf(needle)

    expect(idx('Business/Location Name')).toBeGreaterThan(-1)
    expect(idx('Street Address')).toBeGreaterThan(idx('Business/Location Name'))
    expect(idx('City')).toBeGreaterThan(idx('Street Address'))
    expect(idx('gps-capture-control')).toBeGreaterThan(idx('City'))
    // THE placement question row 29 asked to verify: the contact pair lives in the Location
    // Information section but AFTER the GPS block (phone submission.tsx:189-207).
    expect(idx('Contact Person')).toBeGreaterThan(idx('gps-capture-control'))
    expect(idx('Contact Phone')).toBeGreaterThan(idx('Contact Person'))
  })

  it('uses the phone placeholders verbatim', () => {
    renderSubmission()
    expect(screen.getByLabelText('Requester Name')).toHaveAttribute('placeholder', 'Who requested video from this location')
    expect(screen.getByLabelText('Requester Unit')).toHaveAttribute('placeholder', 'Unit (defaults to case unit if empty)')
    expect(screen.getByText('Leave empty to use case unit, or override for this location')).toBeInTheDocument()
    expect(screen.getByLabelText('Requester Email')).toHaveAttribute('placeholder', 'e.g., cop@dept.ca')
    expect(screen.getByLabelText('Business/Location Name')).toHaveAttribute('placeholder', 'Optional')
    expect(screen.getByLabelText('City')).toHaveAttribute('placeholder', 'City name')
    expect(screen.getByLabelText('Contact Person')).toHaveAttribute('placeholder', 'Optional')
    expect(screen.getByLabelText('Contact Phone')).toHaveAttribute('placeholder', 'Optional')
  })

  it('offers "Use Current Location" with the Geocode toggle defaulted on', () => {
    renderSubmission()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Reverse-geocode captured coordinates into an address' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('shows no coordinate card until coordinates exist', () => {
    renderSubmission()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })
})

describe('Submission — GPS capture', () => {
  it('captures a fix and writes it stamped `gps`', async () => {
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: geolocation(7), onCoordinates })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(onCoordinates).toHaveBeenCalledWith({
      lat: 43.608701,
      lng: -79.650502,
      accuracyM: 7,
      source: 'gps',
    })
  })

  it('renders the captured fix with its accuracy and rating', () => {
    renderSubmission({ coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 7, source: 'gps' } })

    const card = screen.getByTestId('coordinate-display')
    expect(within(card).getByTestId('coordinate-display-coords')).toHaveTextContent('43.608701, -79.650502')
    expect(within(card).getByTestId('coordinate-display-accuracy')).toHaveTextContent('±7m')
    expect(within(card).getByTestId('coordinate-display-source')).toHaveTextContent('GPS')
    expect(within(card).getByTestId('coordinate-display-rating')).toHaveTextContent('Good')
  })

  it('shows the source but NO accuracy chip for a coordinate nobody measured', () => {
    renderSubmission({ coordinates: { lat: 43.6, lng: -79.6, source: 'geocoded' } })

    const card = screen.getByTestId('coordinate-display')
    expect(within(card).getByTestId('coordinate-display-source')).toHaveTextContent('Geocoded')
    expect(within(card).queryByTestId('coordinate-display-accuracy')).not.toBeInTheDocument()
    expect(within(card).queryByTestId('coordinate-display-rating')).not.toBeInTheDocument()
  })

  it('reverse-geocodes into the address fields when the toggle is on', async () => {
    const onChange = vi.fn()
    const reverseGeocode = vi.fn(async () => ({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' }))
    renderSubmission({ geolocation: geolocation(4), onChange, reverseGeocode })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(reverseGeocode).toHaveBeenCalledWith(43.608701, -79.650502)
    expect(onChange).toHaveBeenCalledWith('streetAddress', '1450 Eglinton Ave W')
    expect(onChange).toHaveBeenCalledWith('city', 'Mississauga')
  })

  it('skips the lookup when the Geocode toggle is off — coordinates only', async () => {
    const reverseGeocode = vi.fn(async () => ({ streetAddress: 'x', city: 'y' }))
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: geolocation(4), reverseGeocode, onCoordinates })

    fireEvent.click(screen.getByRole('switch', { name: 'Reverse-geocode captured coordinates into an address' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(reverseGeocode).not.toHaveBeenCalled()
    expect(onCoordinates).toHaveBeenCalledOnce()
  })

  it('says so — honestly — when the address lookup yields nothing, and keeps the fix', async () => {
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: geolocation(4), reverseGeocode: async () => null, onCoordinates })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('reverse-geocode-notice')).toHaveTextContent(REVERSE_GEOCODE_UNAVAILABLE)
    expect(onCoordinates).toHaveBeenCalledOnce()
  })
})

describe('Submission — GPS honest failure paths', () => {
  it('reports the permission denial verbatim and writes nothing', async () => {
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: denied, onCoordinates })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent(GPS_MESSAGES.PERMISSION_DENIED)
    expect(onCoordinates).not.toHaveBeenCalled()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })

  it('states plainly that nothing was captured when the browser has no location service', async () => {
    // The jsdom default (vitest.setup.ts leaves navigator.geolocation undefined).
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: null, onCoordinates })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent(GPS_MESSAGES.UNSUPPORTED)
    expect(onCoordinates).not.toHaveBeenCalled()
    // The honesty invariant: no coordinate is invented to stand in for the missing capability.
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })
})

describe('Submission — live sample readout', () => {
  it('counts the readings as they land and reports the best accuracy so far', async () => {
    // Two readings, both worse than the 50m balanced target, then a third that meets it.
    const accuracies = [90, 70, 20]
    let i = 0
    let release: (() => void) | null = null
    const geo: GeolocationLike = {
      getCurrentPosition: (onSuccess) => {
        const accuracy = accuracies[Math.min(i++, accuracies.length - 1)]
        if (i === 3) {
          // Hold the last reading so the counter can be observed mid-capture.
          release = () => onSuccess(position(accuracy))
          return
        }
        onSuccess(position(accuracy))
      },
    }

    renderSubmission({ geolocation: geo })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-progress')).toHaveTextContent('Sample 2 of 10 · best ±70m')
    expect(screen.getByRole('button', { name: 'Capturing location, please wait' })).toBeDisabled()

    await act(async () => {
      release?.()
    })
    // Capture finished: the button is live again and the progress line is gone.
    expect(screen.queryByTestId('gps-capture-progress')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toBeEnabled()
  })
})
