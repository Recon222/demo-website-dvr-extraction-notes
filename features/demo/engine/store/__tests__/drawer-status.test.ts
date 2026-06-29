import { describe, it, expect } from 'vitest'
import { selectDrawerStatus } from '@/features/demo/engine/store/selectors'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoLocation, LocationForm } from '@/features/demo/engine/types'

function loc(over: Partial<DemoLocation> = {}, formOver: Partial<LocationForm> = {}): DemoLocation {
  return {
    id: 'L',
    caseId: 'C',
    locationName: '',
    businessName: '',
    streetAddress: '',
    city: '',
    requesterName: '',
    requesterBadge: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    isSeed: false,
    form: { ...blankLocationForm(), ...formOver },
    ...over,
  }
}

describe('selectDrawerStatus', () => {
  it('null location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(null)).every((v) => v === 'empty')).toBe(true)
  })

  it('blank location → every screen empty', () => {
    expect(Object.values(selectDrawerStatus(loc())).every((v) => v === 'empty')).toBe(true)
  })

  it('submission: all counted fields filled → complete; some → partial', () => {
    const full = loc({ requesterName: 'A', requesterBadge: 'B', requesterPhone: 'C', requesterEmail: 'D', businessName: 'E', streetAddress: 'F', city: 'G', locationContact: 'H', locationPhone: 'I' })
    expect(selectDrawerStatus(full).submission).toBe('complete')
    expect(selectDrawerStatus(loc({ requesterName: 'A' })).submission).toBe('partial')
  })

  it('dvrInfo: serialModelNumber alone does not count → stays empty', () => {
    const dvr = { ...blankLocationForm().dvr, serialModelNumber: 'SN-123' }
    expect(selectDrawerStatus(loc({}, { dvr })).dvrInfo).toBe('empty')
  })

  it('exportInfo: mediaPlayerIncluded alone does not count → stays empty', () => {
    const exp = { ...blankLocationForm().export, mediaPlayerIncluded: true }
    expect(selectDrawerStatus(loc({}, { export: exp })).exportInfo).toBe('empty')
  })

  it('requestedScope array: full item → complete; mixed → partial; [] → empty', () => {
    const full = [{ id: '1', startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: true, cameras: '3' }]
    const mixed = [...full, { id: '2', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    expect(selectDrawerStatus(loc({}, { scopes: full })).requestedScope).toBe('complete')
    expect(selectDrawerStatus(loc({}, { scopes: mixed })).requestedScope).toBe('partial')
    expect(selectDrawerStatus(loc()).requestedScope).toBe('empty')
  })

  it('extractedScope: a present-but-blank item is partial (not empty); [] is empty', () => {
    const blankItem = [{ id: '1', startDateTime: '', endDateTime: '', isActualTime: false, cameras: '' }]
    expect(selectDrawerStatus(loc({}, { extractedScopes: blankItem })).extractedScope).toBe('partial')
    expect(selectDrawerStatus(loc()).extractedScope).toBe('empty')
  })

  it('timeOffset: committed offset → complete; null → empty', () => {
    const off = {
      dvrDateTime: '2025-03-08 23:45',
      actualDateTime: '2025-03-08 23:50',
      differenceMs: 0,
      formattedDifference: '',
      direction: 'AHEAD OF' as const,
      isDvrAhead: false,
      isCorrect: true,
      dvrAppliesDST: false,
      sync: null,
      captureMethod: 'manual' as const,
    }
    expect(selectDrawerStatus(loc({}, { timeOffset: off })).timeOffset).toBe('complete')
    expect(selectDrawerStatus(loc()).timeOffset).toBe('empty')
  })

  it('notes is two-state: text → complete; blank → empty (never partial)', () => {
    expect(selectDrawerStatus(loc({}, { notesText: 'Some notes' })).notes).toBe('complete')
    expect(selectDrawerStatus(loc()).notes).toBe('empty')
  })

  it('completion is always empty (no editable fields in the demo)', () => {
    expect(selectDrawerStatus(loc({ requesterName: 'A' }, { notesText: 'x' })).completion).toBe('empty')
  })
})
