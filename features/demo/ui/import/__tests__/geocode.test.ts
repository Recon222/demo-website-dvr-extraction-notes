import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildGeocodeQuery, forwardGeocode } from '@/features/demo/ui/import/geocode'

const { forwardMock } = vi.hoisted(() => ({ forwardMock: vi.fn() }))
vi.mock('@mapbox/search-js-core', () => ({
  GeocodingCore: class {
    forward = forwardMock
  },
}))

// Ported from the phone's persistMappedImport.buildGeocodeQuery — street+city is most precise;
// city-only is skipped because it returns a city centroid, not the premises.
describe('buildGeocodeQuery', () => {
  it('prefers street+city, then business+city, then street; skips city-only', () => {
    expect(buildGeocodeQuery('1450 Eglinton Ave W', 'Mississauga', 'Kim')).toBe('1450 Eglinton Ave W, Mississauga')
    expect(buildGeocodeQuery('', 'Mississauga', 'Kim Convenience')).toBe('Kim Convenience, Mississauga')
    expect(buildGeocodeQuery('1450 Eglinton Ave W', '', '')).toBe('1450 Eglinton Ave W')
    expect(buildGeocodeQuery('', 'Mississauga', '')).toBeNull()
    expect(buildGeocodeQuery('', '', '')).toBeNull()
  })
})

describe('forwardGeocode', () => {
  beforeEach(() => forwardMock.mockReset())
  afterEach(() => vi.unstubAllEnvs())

  it('returns null without a token (no network call)', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '')
    expect(await forwardGeocode('1450 Eglinton Ave W, Mississauga')).toBeNull()
    expect(forwardMock).not.toHaveBeenCalled()
  })

  it('returns [lng,lat] from the first feature with a token', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    forwardMock.mockResolvedValue({ features: [{ geometry: { coordinates: [-79.6505, 43.6087] } }] })
    expect(await forwardGeocode('1450 Eglinton Ave W, Mississauga')).toEqual({ lng: -79.6505, lat: 43.6087 })
  })

  it('returns null on no match', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
    forwardMock.mockResolvedValue({ features: [] })
    expect(await forwardGeocode('nowhere')).toBeNull()
  })
  // The geocoder-error → null path (forwardGeocode's try/catch) is non-blocking and is verified at
  // the integration level in DemoExperience.sandbox.test ("an unresolvable address still creates the
  // location"); a throwing-mock unit assertion here trips vitest's error reporter even though the
  // error is caught.
})
