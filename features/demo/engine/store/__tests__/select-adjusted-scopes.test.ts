import { describe, it, expect } from 'vitest'
import { storeWithLocation } from '@/features/demo/engine/store/__tests__/test-utils'
import { selectAdjustedScopes, selectCaseNotesData } from '@/features/demo/engine/store/selectors'

describe('selectAdjustedScopes', () => {
  it('returns the EXACT corrected times — no 5-minute rounding (that belongs to the extracted scope)', () => {
    const store = storeWithLocation() // current location selected, blank form
    store.getState().updateField('form.scopes', [
      { id: 's1', startDateTime: '2025-03-08 23:47:30', endDateTime: '2025-03-09 01:32:30', isActualTime: true, cameras: '3, 4' },
    ])
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().calculateOffset() // DVR ahead of real by 00:05:30

    const rows = selectAdjustedScopes(store.getState())
    expect(rows).toHaveLength(1)
    // real-time request + DVR ahead → add the offset. Exact, NOT rounded:
    //   rounded would be 23:50:00 / 01:40:00 — the extracted-scope screen does that, not this.
    expect(rows[0].adjStart).toBe('2025-03-08 23:53:00')
    expect(rows[0].adjEnd).toBe('2025-03-09 01:38:00')
    expect(rows[0].reqLabel).toBe('real time')
    expect(rows[0].reqStart).toBe('2025-03-08 23:47:30')

    // And the extracted scope (separate step) DOES round the same adjusted times:
    store.getState().generateExtractedScopes()
    const ext = store.getState().locations.find((l) => l.id === store.getState().currentLocationId)?.form.extractedScopes
    expect(ext?.[0].startDateTime).toBe('2025-03-08 23:50:00') // floored
    expect(ext?.[0].endDateTime).toBe('2025-03-09 01:40:00') // ceiled

    // The Case Notes PDF's "Adjusted Scope (Calculated Times)" uses the EXACT corrected, not rounded.
    const notes = selectCaseNotesData(store.getState())
    expect(notes.adjustedScopes?.[0]).toEqual({ start: '2025-03-08 23:53:00', end: '2025-03-09 01:38:00' })
  })

  it('returns [] before an offset is calculated', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.scopes', [
      { id: 's1', startDateTime: '2025-03-08 23:47:30', endDateTime: '2025-03-09 01:32:30', isActualTime: true, cameras: '' },
    ])
    expect(selectAdjustedScopes(store.getState())).toEqual([])
  })
})
