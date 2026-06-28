import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { seededStore, freshStore, newCaseInput, newLocationInput } from '@/features/demo/engine/store/__tests__/test-utils'
import type { DemoStore } from '@/features/demo/engine/store/create-store'
import { runBeat } from '@/features/demo/engine/director/runner'
import { BEATS } from '@/features/demo/engine/director/beats'
import { TOUR_CHAPTERS } from '@/features/demo/engine/content/screens'
import { selectCaseNotesData, selectCurrentLocation } from '@/features/demo/engine/store/selectors'
import { generateCaseNotesDoc } from '@/features/demo/engine/logic/pdf/case-notes'
import type { ChapterId } from '@/features/demo/engine/types'

// The whole engine, headless: run the guided beats against a store (no UI) and a manual
// sandbox flow, asserting the resulting state + the real court PDF.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

async function play(store: DemoStore, chapter: ChapterId) {
  const beat = BEATS[chapter]
  if (!beat) return
  const handle = runBeat(store, beat, { typeSpeedMs: 1 })
  await vi.runAllTimersAsync()
  await handle.done
}

describe('guided happy path (headless)', () => {
  it('plays the tour beats into a populated location + notes + a real Case Notes PDF', async () => {
    const store = seededStore()
    for (const chapter of TOUR_CHAPTERS) await play(store, chapter)

    const loc = selectCurrentLocation(store.getState())
    expect(loc?.businessName).toBe("Kim's Convenience")
    expect(loc?.form.timeOffset?.formattedDifference).toBe('00:05:30') // computed via OCR sub-beat + calculate
    expect(loc?.form.extractedScopes.length).toBeGreaterThan(0) // DVR-time scopes from the offset
    expect(loc?.form.notesText).toContain('PR25-0098213')

    const html = generateCaseNotesDoc(selectCaseNotesData(store.getState()))
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    expect(html).toContain('PR25-0098213')
    expect(html).toContain('Extraction Scope')
  })
})

describe('sandbox path (headless)', () => {
  it('creates a case + two locations and round-trips updateField with no seed data present', () => {
    const store = freshStore()
    store.getState().reset() // blank sandbox slate
    const c = store.getState().createCase(newCaseInput())
    const l1 = store.getState().addLocation(c, newLocationInput({ locationName: 'Front' }))
    const l2 = store.getState().addLocation(c, newLocationInput({ locationName: 'Rear' }))

    expect(l1).not.toBe(l2)
    store.getState().switchLocation(l1)
    store.getState().updateField('businessName', 'Front Store')

    expect(store.getState().cases.some((x) => x.isSeed)).toBe(false)
    expect(store.getState().locations.some((x) => x.isSeed)).toBe(false)
    expect(selectCurrentLocation(store.getState())?.businessName).toBe('Front Store')
  })
})
