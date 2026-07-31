import { describe, it, expect, vi, afterEach } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import { selectCurrentLocation } from '@/features/demo/engine/store/selectors'
import type { DemoStore } from '@/features/demo/engine/store/create-store'
import type { ScopeEntry } from '@/features/demo/engine/types'

/**
 * D10 (owner ruling): `generateExtractedScopes` derives the extracted window differently per
 * time domain — real-time requests are converted onto the DVR clock and padded outward to
 * 5-minute marks; DVR-time requests pass through untouched, because the requester read those
 * times off the device itself.
 */

const REAL_SCOPE: ScopeEntry = {
  id: 's-real',
  startDateTime: '2025-03-08 23:45:00',
  endDateTime: '2025-03-09 01:30:00',
  isActualTime: true,
  cameras: '3, 4, 7',
}

// Deliberately OFF the 5-minute marks and with non-zero seconds: if either the offset or the
// rounding leaked into the passthrough branch, every one of these digits would change.
const DVR_SCOPE: ScopeEntry = {
  id: 's-dvr',
  startDateTime: '2025-03-08 23:47:13',
  endDateTime: '2025-03-09 01:32:41',
  isActualTime: false,
  cameras: '1, 2',
}

/** A store with a committed non-zero offset (DVR ahead by 00:05:30) and the given scopes. */
function storeWithOffset(scopes: ScopeEntry[]): DemoStore {
  const store = freshStore()
  const c = store.getState().createCase(newCaseInput())
  store.getState().addLocation(c, newLocationInput())
  store.getState().updateField('form.scopes', scopes)
  store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
  store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
  store.getState().calculateOffset()
  return store
}

const extractedOf = (store: DemoStore) => selectCurrentLocation(store.getState())?.form.extractedScopes ?? []

afterEach(() => vi.restoreAllMocks())

describe('generateExtractedScopes — DVR-time requests pass through (D10)', () => {
  it('applies neither the offset nor the 5-minute rounding', () => {
    const store = storeWithOffset([DVR_SCOPE])
    // Premise: a real, non-zero offset is committed — so an untouched result is meaningful.
    expect(selectCurrentLocation(store.getState())?.form.timeOffset?.formattedDifference).toBe('00:05:30')

    store.getState().generateExtractedScopes()
    const ex = extractedOf(store)
    expect(ex).toHaveLength(1)
    expect(ex[0].startDateTime).toBe('2025-03-08 23:47:13')
    expect(ex[0].endDateTime).toBe('2025-03-09 01:32:41')
    // Already DVR-domain, so the DVR stamp is honest here (it was a lie under the old branch).
    expect(ex[0].isActualTime).toBe(false)
    expect(ex[0].cameras).toBe('1, 2')
  })

  it('is not the old convert-then-round result', () => {
    // What the pre-D10 code produced: calculateCorrectedTimeRange with isActualTime=false
    // subtracted the offset (DVR→real, the reverse direction), then rounded out.
    const store = storeWithOffset([DVR_SCOPE])
    store.getState().generateExtractedScopes()
    const ex = extractedOf(store)
    expect(ex[0].startDateTime).not.toBe('2025-03-08 23:40:00')
    expect(ex[0].endDateTime).not.toBe('2025-03-09 01:30:00')
  })

  it('still drops a non-canonical DVR-time scope rather than carrying junk forward', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = storeWithOffset([{ ...DVR_SCOPE, startDateTime: 'not-a-date' }])
    store.getState().generateExtractedScopes()
    expect(extractedOf(store)).toHaveLength(0)
    expect(selectCurrentLocation(store.getState())?.form.extractedScopesPartial).toBe(true)
  })

  it('still drops a DVR-time scope with an unset bound', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const store = storeWithOffset([{ ...DVR_SCOPE, endDateTime: '' }])
    store.getState().generateExtractedScopes()
    expect(extractedOf(store)).toHaveLength(0)
    expect(selectCurrentLocation(store.getState())?.form.extractedScopesPartial).toBe(true)
  })
})

describe('generateExtractedScopes — real-time requests still convert and round outward (D10)', () => {
  it('offsets onto the DVR clock, floors the start and ceils the end', () => {
    const store = storeWithOffset([REAL_SCOPE])
    store.getState().generateExtractedScopes()
    const ex = extractedOf(store)
    expect(ex).toHaveLength(1)
    expect(ex[0].startDateTime).toBe('2025-03-08 23:50:00') // 23:45:00 + 5:30 → floor 5min
    expect(ex[0].endDateTime).toBe('2025-03-09 01:40:00') // 01:30:00 + 5:30 → ceil 5min
    expect(ex[0].isActualTime).toBe(false)
  })
})

describe('generateExtractedScopes — a mixed list treats each row by its own domain', () => {
  it('converts the real-time row and passes the DVR-time row through, in order', () => {
    const store = storeWithOffset([REAL_SCOPE, DVR_SCOPE])
    store.getState().generateExtractedScopes()
    const ex = extractedOf(store)
    expect(ex).toHaveLength(2)
    expect(ex.map((e) => [e.startDateTime, e.endDateTime])).toEqual([
      ['2025-03-08 23:50:00', '2025-03-09 01:40:00'],
      ['2025-03-08 23:47:13', '2025-03-09 01:32:41'],
    ])
    expect(selectCurrentLocation(store.getState())?.form.extractedScopesPartial).toBe(false)
  })
})
