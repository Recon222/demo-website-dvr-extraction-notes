/**
 * Shared fixtures for the notes-module tests — mirrors the phone's
 * `notes/services/__tests__/test-utils.ts` factory shapes (createMockFormData /
 * createMockSection) so parity assertions read side-by-side with the phone suite.
 */

import type { NoteSection, NoteSectionId } from '@/features/demo/engine/types'
import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'

/** A complete NotesRelevantFormData with every field populated (phone factory analog). */
export function mockFormData(overrides?: Partial<NotesRelevantFormData>): NotesRelevantFormData {
  return {
    address: '',
    businessName: 'Test Business',
    streetAddress: '123 Main St',
    city: 'Springfield',
    arrivalDepartures: [
      { arrivalDateTime: '2024-06-01 09:00:00', departureDateTime: '2024-06-01 12:00:00' },
    ],
    scopes: [
      {
        startDateTime: '2024-06-01 09:00:00',
        endDateTime: '2024-06-01 12:00:00',
        isActualTime: true,
        cameras: 'Camera 1',
        correctedStartDateTime: '2024-06-01 10:00:00',
        correctedEndDateTime: '2024-06-01 13:00:00',
      },
    ],
    extractedScopes: [],
    timeOffsetData: { formattedDifference: '01:00:00', direction: 'AHEAD OF' },
    cameras: [],
    totalDvrRetention: '30',
    exportMedia: 'USB Drive',
    sizeGb: '15.5',
    mediaProvidedVia: 'Hand delivery',
    ...overrides,
  }
}

/** An empty NotesRelevantFormData — every formatter's Tier-0/'' case. */
export function emptyFormData(overrides?: Partial<NotesRelevantFormData>): NotesRelevantFormData {
  return {
    address: '',
    businessName: undefined,
    streetAddress: undefined,
    city: undefined,
    arrivalDepartures: [],
    scopes: [],
    extractedScopes: [],
    timeOffsetData: undefined,
    cameras: [],
    totalDvrRetention: '',
    exportMedia: '',
    sizeGb: '',
    mediaProvidedVia: '',
    ...overrides,
  }
}

/** A NoteSection with `generatedContent` mirroring `content` unless overridden. */
export function mockSection(id: NoteSectionId, overrides?: Partial<NoteSection>): NoteSection {
  const content = overrides?.content ?? ''
  return {
    id,
    content,
    generatedContent: content,
    manuallyEdited: false,
    ...overrides,
  }
}
