import { describe, it, expect } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from '@/features/demo/engine/store/__tests__/test-utils'
import { selectCaseNotesData, selectCurrentLocation } from '@/features/demo/engine/store/selectors'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'

// The whole engine, headless: a visitor-style pass from the empty boot all the way to the
// real court PDF — the sandbox flow IS the demo now (the guided director no longer exists).
describe('sandbox pass (headless)', () => {
  it('createCase → addLocation → scopes → offset → extracted scopes → notes → Case Notes PDF', () => {
    const store = freshStore()
    expect(store.getState().view).toBe('cases') // the empty boot

    const c = store.getState().createCase(newCaseInput())
    store.getState().addLocation(c, newLocationInput())
    store.getState().updateField('form.scopes', [
      { id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3, 4, 7' },
    ])
    store.getState().updateField('capture.dvrDateTime', '2025-03-08 12:05:30')
    store.getState().updateField('capture.actualDateTime', '2025-03-08 12:00:00')
    store.getState().calculateOffset()
    store.getState().generateExtractedScopes()
    store.getState().generateNotes()

    const loc = selectCurrentLocation(store.getState())
    expect(loc?.businessName).toBe("Kim's Convenience")
    expect(loc?.form.timeOffset?.formattedDifference).toBe('00:05:30')
    expect(loc?.form.extractedScopes.length).toBeGreaterThan(0) // DVR-time scopes from the offset
    expect(loc?.form.notesText).toContain('PR25-0098213')

    const html = generateCaseNotesDoc(selectCaseNotesData(store.getState()))
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('PR25-0098213')
    expect(html).toContain('Extraction Scope')
  })

  it('creates a case + two locations and round-trips updateField per location', () => {
    const store = freshStore()
    const c = store.getState().createCase(newCaseInput())
    const l1 = store.getState().addLocation(c, newLocationInput({ locationName: 'Front' }))
    const l2 = store.getState().addLocation(c, newLocationInput({ locationName: 'Rear' }))

    expect(l1).not.toBe(l2)
    store.getState().switchLocation(l1)
    store.getState().updateField('businessName', 'Front Store')
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Front Store')
    expect(store.getState().locations.find((l) => l.id === l2)?.businessName).toBe("Kim's Convenience")
  })
})
