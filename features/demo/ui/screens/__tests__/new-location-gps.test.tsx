import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

// Same faithful stand-in the Submission suite uses: it renders the real labelled input and lets a
// test hold Mapbox's `retrieve` continuation open, so the pick race is reproduced rather than
// approximated. "mock-pick-start" captures the CURRENT `onPick` closure — the one Mapbox's own
// `.then` would call.
const pickHarness = vi.hoisted(() => ({ release: null as null | (() => void) }))
vi.mock('@/features/demo/ui/inputs/AddressAutocomplete', () => ({
  AddressAutocomplete: ({
    label,
    value,
    onChange,
    onPick,
    placeholder,
  }: {
    label: string
    value: string
    onChange(v: string): void
    onPick(p: { streetAddress: string; city: string; coordinates?: { lng: number; lat: number }; accuracyM?: number }): void
    placeholder?: string
  }) => (
    <div>
      <input aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() => {
          pickHarness.release = () =>
            onPick({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga', coordinates: { lng: -79.6505, lat: 43.6087 }, accuracyM: 5 })
        }}
      >
        mock-pick-start
      </button>
    </div>
  ),
}))

import { GPS_MESSAGES } from '@/features/demo/engine/logic/gps'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'
import { REVERSE_GEOCODE_UNAVAILABLE } from '@/features/demo/ui/inputs/LocationFields'
import { NewLocationModal, type NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'

const blank: NewLocationFields = {
  locationName: '',
  businessName: '',
  streetAddress: '',
  city: '',
  locationContact: '',
  locationPhone: '',
}

const position = (accuracy: number) =>
  ({
    coords: { latitude: 43.608701, longitude: -79.650502, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

const geolocation = (accuracy: number): GeolocationLike => ({
  getCurrentPosition: (onSuccess) => onSuccess(position(accuracy)),
})

const denied: GeolocationLike = {
  getCurrentPosition: (_onSuccess, onError) => onError({ code: 1, message: 'denied' } as GeolocationPositionError),
}

interface Options {
  form?: Partial<NewLocationFields>
  draftId?: string
  geolocation?: GeolocationLike | null
  onChange?: (patch: Partial<NewLocationFields>) => void
  reverseGeocode?: (lat: number, lng: number) => Promise<{ streetAddress: string; city: string } | null>
  /** The duplicate flow's copy-to-a-new-address variant (P3.5's caller). */
  requireAddress?: boolean
  subtitle?: string
}

const modal = (o: Options = {}) => (
  <NewLocationModal
    form={{ ...blank, ...o.form }}
    draftId={o.draftId}
    requireAddress={o.requireAddress}
    subtitle={o.subtitle}
    onChange={o.onChange ?? vi.fn()}
    onSubmit={vi.fn()}
    onCancel={vi.fn()}
    gpsDeps={{ geolocation: o.geolocation ?? null, delay: async () => undefined }}
    reverseGeocode={o.reverseGeocode ?? (async () => null)}
  />
)

const renderModal = (o: Options = {}) => render(modal(o))

// `pickHarness` is module-level mutable state shared by every arm (review R-17). Two consumers
// null it by hand today; a third that forgot would silently inherit the previous arm's captured
// `onPick` closure and become order-dependent. Reset centrally instead.
beforeEach(() => {
  pickHarness.release = null
})

describe('NewLocationModal — phone render order (ui-mapping 11:79-85)', () => {
  it('puts the address block (incl. GPS) between the name and the contact pair', () => {
    const { container } = renderModal()
    const order = Array.from(container.querySelectorAll('input, [data-testid="gps-capture-control"]')).map(
      (el) => el.getAttribute('aria-label') ?? el.getAttribute('data-testid'),
    )
    const idx = (needle: string) => order.indexOf(needle)

    expect(idx('Location Name')).toBe(0)
    expect(idx('Business/Location Name')).toBeGreaterThan(idx('Location Name'))
    expect(idx('Street Address')).toBeGreaterThan(idx('Business/Location Name'))
    expect(idx('City')).toBeGreaterThan(idx('Street Address'))
    expect(idx('gps-capture-control')).toBeGreaterThan(idx('City'))
    // The contact pair sits AFTER the GPS block on the phone — the old demo order had a lone
    // no-op GPS button below them.
    expect(idx('Location Contact')).toBeGreaterThan(idx('gps-capture-control'))
    expect(idx('Location Phone')).toBeGreaterThan(idx('Location Contact'))
  })

  it('uses the phone placeholders verbatim', () => {
    renderModal()
    expect(screen.getByLabelText('Location Name')).toHaveAttribute('placeholder', 'e.g., Main Store, Building A')
    expect(screen.getByLabelText('Business/Location Name')).toHaveAttribute('placeholder', 'Optional')
    expect(screen.getByLabelText('City')).toHaveAttribute('placeholder', 'City name')
  })

  it('offers the real capture control with the Geocode toggle defaulted on', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByRole('switch', { name: 'Reverse-geocode captured coordinates into an address' })).toHaveAttribute('aria-checked', 'true')
    // Deferred §24's no-op is gone.
    expect(screen.queryByText('Capture GPS coordinates')).not.toBeInTheDocument()
  })

  it('shows no coordinate card until coordinates exist', () => {
    renderModal()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })
})

describe('NewLocationModal — GPS capture', () => {
  it('captures a fix and patches it stamped `gps`', async () => {
    const onChange = vi.fn()
    renderModal({ geolocation: geolocation(7), onChange })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(onChange).toHaveBeenCalledWith({ coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 7, source: 'gps' } })
  })

  it('renders the captured fix with its accuracy and rating', () => {
    renderModal({ form: { coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 7, source: 'gps' } } })

    const card = screen.getByTestId('coordinate-display')
    expect(within(card).getByTestId('coordinate-display-coords')).toHaveTextContent('43.608701, -79.650502')
    expect(within(card).getByTestId('coordinate-display-accuracy')).toHaveTextContent('±7m')
    expect(within(card).getByTestId('coordinate-display-source')).toHaveTextContent('GPS')
    expect(within(card).getByTestId('coordinate-display-rating')).toHaveTextContent('Good')
  })

  it('reverse-geocodes into the address fields when the toggle is on', async () => {
    const onChange = vi.fn()
    const reverseGeocode = vi.fn(async () => ({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' }))
    renderModal({ geolocation: geolocation(4), onChange, reverseGeocode })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(reverseGeocode).toHaveBeenCalledWith(43.608701, -79.650502)
    expect(onChange).toHaveBeenCalledWith({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
  })

  it('keeps the fix and says so when the address lookup yields nothing', async () => {
    const onChange = vi.fn()
    renderModal({ geolocation: geolocation(4), reverseGeocode: async () => null, onChange })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('reverse-geocode-notice')).toHaveTextContent(REVERSE_GEOCODE_UNAVAILABLE)
    expect(onChange).toHaveBeenCalledWith({ coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 4, source: 'gps' } })
  })

  it('reports a permission denial verbatim and writes nothing', async () => {
    const onChange = vi.fn()
    renderModal({ geolocation: denied, onChange })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent(GPS_MESSAGES.PERMISSION_DENIED)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })

  it('states plainly that nothing was captured when the browser has no location service', async () => {
    // The jsdom default (vitest.setup.ts leaves navigator.geolocation undefined) — the honesty
    // invariant: no coordinate is invented to stand in for a missing capability.
    const onChange = vi.fn()
    renderModal({ geolocation: null, onChange })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    expect(screen.getByTestId('gps-capture-error')).toHaveTextContent(GPS_MESSAGES.UNSUPPORTED)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('NewLocationModal — closing mid-capture must not write', () => {
  // The reason this matters more here than on Submission: `locForm` lives in DemoExperience and
  // OUTLIVES the modal, so a late write would silently seed the NEXT location created.

  it('drops an in-flight CAPTURE when the modal closes', async () => {
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onChange = vi.fn()
    const { unmount } = renderModal({ draftId: 'draft-l1', geolocation: held, onChange })

    fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    unmount() // the visitor cancelled / submitted — the modal is gone
    await act(async () => {
      deliver(position(5))
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops an in-flight reverse-geocode when the modal closes after a successful capture', async () => {
    let resolveLookup!: (v: { streetAddress: string; city: string } | null) => void
    const reverseGeocode = () =>
      new Promise<{ streetAddress: string; city: string } | null>((resolve) => {
        resolveLookup = resolve
      })
    const onChange = vi.fn()
    const { unmount } = renderModal({ draftId: 'draft-l1', geolocation: geolocation(4), onChange, reverseGeocode })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })
    // The coordinates themselves landed before the await — that write is legitimate.
    expect(onChange).toHaveBeenCalledWith({ coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 4, source: 'gps' } })
    onChange.mockClear()

    unmount()
    await act(async () => {
      resolveLookup({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('drops an in-flight address PICK when the modal closes', async () => {
    // The pick path writes more than the geocode path — street, city AND coordinates stamped
    // 'geocoded' — so an escaped late write would fabricate provenance on the next draft.
    const onChange = vi.fn()
    const { unmount } = renderModal({ draftId: 'draft-l1', onChange })

    pickHarness.release = null
    fireEvent.click(screen.getByText('mock-pick-start'))
    unmount()
    await act(async () => {
      pickHarness.release?.()
    })

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('NewLocationModal — the draft is the write-guard identity (deferred §45f)', () => {
  it('drops a lookup issued on a previous draft', async () => {
    // Same modal instance, new draft (the phone's own JSDoc warns about the always-mounted
    // variant of this component): the previous draft's lookup must not fill the new form.
    let resolveLookup!: (v: { streetAddress: string; city: string } | null) => void
    const reverseGeocode = () =>
      new Promise<{ streetAddress: string; city: string } | null>((resolve) => {
        resolveLookup = resolve
      })
    const onChange = vi.fn()
    const { rerender } = renderModal({ draftId: 'draft-l1', geolocation: geolocation(4), onChange, reverseGeocode })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })
    onChange.mockClear()

    rerender(modal({ draftId: 'draft-l2', geolocation: geolocation(4), onChange, reverseGeocode }))
    await act(async () => {
      resolveLookup({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga' })
    })

    expect(onChange).not.toHaveBeenCalled()
    // The notice half of this assertion was decorative and is gone (review R-17):
    // `LocationFields` resets `lookupNotice` on every draft change, so it held whether or not
    // the write guard worked. `onChange` above is the load-bearing half — probe-verified.
  })

  it('accepts a pick issued AFTER the draft changed — the guard tracks identity, not staleness', async () => {
    const onChange = vi.fn()
    const { rerender } = renderModal({ draftId: 'draft-l1', onChange })

    rerender(modal({ draftId: 'draft-l2', onChange }))
    pickHarness.release = null
    fireEvent.click(screen.getByText('mock-pick-start'))
    await act(async () => {
      pickHarness.release?.()
    })

    expect(onChange).toHaveBeenCalledWith({
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
      coordinates: { lat: 43.6087, lng: -79.6505, accuracyM: 5, source: 'geocoded' },
    })
  })
})

/**
 * The duplicate flow's second caller (P3.5's "New Location w/ Sub Info [+ Scopes]" card),
 * closing §56h. Deferred §52.4 required that the card stop inheriting deferred §24's
 * `onCaptureGps={() => undefined}` no-op and mount P3.4's real capture instead. It does — it is
 * the same component — but "the same component" is a claim about construction, and the two arms
 * below are the claim under test: the variant props do not switch the capture off, and a real
 * fix leaves this card stamped `'gps'`, not flattened to `'geocoded'`.
 */
describe('NewLocationModal — the copy-to-a-new-address variant carries the REAL capture (§52.4)', () => {
  it('offers the same live control the plain caller does', () => {
    renderModal({ requireAddress: true, subtitle: 'Submission info copied — enter the new address.' })

    expect(screen.getByText('Submission info copied — enter the new address.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use Current Location' })).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByRole('switch', { name: 'Reverse-geocode captured coordinates into an address' })).toBeInTheDocument()
    expect(screen.queryByText('Capture GPS coordinates')).not.toBeInTheDocument() // §24's no-op
  })

  it("emits a captured fix stamped 'gps' — the provenance the bridge used to flatten", async () => {
    const onChange = vi.fn()
    renderModal({ requireAddress: true, geolocation: geolocation(6), onChange })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
    })

    // `'gps'`, not `'geocoded'`. The bridge's `submitNewAddressLocation` re-stamped every fix
    // `'geocoded'` while the no-op made a real capture impossible; it now passes the coordinates
    // through as `submitLocation` does, and `NewAddressOverrides.gps` accepts the full
    // `GpsSource` (both fixed at the P3 assembly — see §56h).
    expect(onChange).toHaveBeenCalledWith({
      coordinates: { lat: 43.608701, lng: -79.650502, accuracyM: 6, source: 'gps' },
    })
  })
})
