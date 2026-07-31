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

interface SubmissionOptions {
  geolocation?: GeolocationLike | null
  coordinates?: SubmissionCoordinates
  locationId?: string
  onCoordinates?: (c: SubmissionCoordinates) => void
  onChange?: (f: keyof typeof fields, v: string) => void
  reverseGeocode?: (lat: number, lng: number) => Promise<{ streetAddress: string; city: string } | null>
}

const submission = (o: SubmissionOptions = {}) => (
  <SubmissionScreen
    occNumber="PR25-0098213"
    locationId={o.locationId}
    fields={fields}
    coordinates={o.coordinates}
    onChange={o.onChange ?? vi.fn()}
    onCoordinates={o.onCoordinates ?? vi.fn()}
    onNext={vi.fn()}
    onBack={vi.fn()}
    onMenu={vi.fn()}
    gpsDeps={{ geolocation: o.geolocation ?? null, delay: async () => undefined }}
    reverseGeocode={o.reverseGeocode ?? (async () => null)}
  />
)

const renderSubmission = (o: SubmissionOptions = {}) => render(submission(o))

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
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toHaveAttribute('aria-disabled', 'false')
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
    expect(screen.getByRole('button', { name: 'Capturing location, please wait' })).toHaveAttribute('aria-disabled', 'true')

    await act(async () => {
      release?.()
    })
    // Capture finished: the button is live again and the progress line is gone.
    expect(screen.queryByTestId('gps-capture-progress')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toHaveAttribute('aria-disabled', 'false')
  })
})

describe('Submission — cross-location write guard (R-1)', () => {
  it('drops an in-flight reverse-geocode result when the open location changed', async () => {
    // A slow lookup started on location l1; the visitor switches to l2 before it resolves.
    // The bridge's updateField resolves its target at CALL time, so an unguarded write would
    // stamp l1's address onto l2 — the string the completion gate checks and the PDF prints.
    let resolveLookup!: (v: { streetAddress: string; city: string } | null) => void
    const reverseGeocode = () =>
      new Promise<{ streetAddress: string; city: string } | null>((resolve) => {
        resolveLookup = resolve
      })
    const onChange = vi.fn()
    const { rerender } = renderSubmission({ locationId: 'l1', geolocation: geolocation(4), onChange, reverseGeocode })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })
    expect(screen.getByRole('button', { name: 'Looking up address, please wait' })).toBeInTheDocument()

    rerender(submission({ locationId: 'l2', geolocation: geolocation(4), onChange, reverseGeocode }))
    await act(async () => {
      resolveLookup({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    })

    expect(onChange).not.toHaveBeenCalledWith('streetAddress', '1450 Eglinton Ave W')
    expect(onChange).not.toHaveBeenCalledWith('city', 'Mississauga')
    // Nor a stale "lookup unavailable" notice attributed to the location now on screen.
    expect(screen.queryByTestId('reverse-geocode-notice')).not.toBeInTheDocument()
  })

  it('still writes the result when the location did not change', async () => {
    const onChange = vi.fn()
    renderSubmission({
      locationId: 'l1',
      geolocation: geolocation(4),
      onChange,
      reverseGeocode: async () => ({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' }),
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(onChange).toHaveBeenCalledWith('streetAddress', '1450 Eglinton Ave W')
    expect(onChange).toHaveBeenCalledWith('city', 'Mississauga')
  })

  it('abandons an in-flight CAPTURE when the open location changes', async () => {
    // The capture half of the same race: useGpsCapture aborts on unmount, and the control is
    // keyed on locationId so a switch counts as an unmount.
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onCoordinates = vi.fn()
    const { rerender } = renderSubmission({ locationId: 'l1', geolocation: held, onCoordinates })

    fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    rerender(submission({ locationId: 'l2', geolocation: held, onCoordinates }))
    await act(async () => {
      deliver(position(5))
    })

    expect(onCoordinates).not.toHaveBeenCalled()
  })
})

describe('Submission — capture button keeps keyboard focus (R-7)', () => {
  it('stays focused and inert for the whole capture instead of blurring to <body>', async () => {
    // A real `disabled` attribute blurs the element: focus would land on <body> for the entire
    // 30-120s budget, and the permission-denied alert would announce with no route back.
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: held, onCoordinates })

    const button = screen.getByRole('button', { name: 'Use Current Location' })
    button.focus()
    fireEvent.click(button)

    const busy = screen.getByRole('button', { name: 'Capturing location, please wait' })
    expect(busy).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).toBe(busy)

    // Inert: a second activation while busy must not start a second capture.
    fireEvent.click(busy)
    await act(async () => {
      deliver(position(6))
    })
    expect(onCoordinates).toHaveBeenCalledOnce()
  })

  it('keeps focus on the control when the capture fails', async () => {
    renderSubmission({ geolocation: denied })

    const button = screen.getByRole('button', { name: 'Use Current Location' })
    button.focus()
    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent(GPS_MESSAGES.PERMISSION_DENIED)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Use Current Location' }))
  })
})

describe('Submission — malformed provider reading (R-13)', () => {
  it('shows a failure line instead of a dead button when the timestamp is unusable', async () => {
    const malformed: GeolocationLike = {
      getCurrentPosition: (onSuccess) =>
        onSuccess({
          coords: { latitude: 43.6, longitude: -79.65, accuracy: 4, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
          timestamp: Number.NaN,
        } as GeolocationPosition),
    }
    const onCoordinates = vi.fn()
    renderSubmission({ geolocation: malformed, onCoordinates })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent('Invalid timestamp reported by the location service.')
    expect(onCoordinates).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toHaveAttribute('aria-disabled', 'false')
  })
})
