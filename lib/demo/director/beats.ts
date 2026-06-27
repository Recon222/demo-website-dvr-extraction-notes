import type { ChapterId, LaunchableId } from '@/lib/demo/types'
import type { Beat } from '@/lib/demo/director/types'

/**
 * Per-chapter choreography for the guided tour. Keyed by chapter (and the OCR launch
 * screen). Values are the literal demo data the director types/sets — this is where "what
 * the tour types" lives. Screens that are pure narration (no store interaction) can omit a
 * beat. Expanded as the screens land in M3+.
 */
export const BEATS: Partial<Record<ChapterId | LaunchableId, Beat>> = {
  splash: {
    chapter: 'splash',
    steps: [
      { kind: 'tap', target: 'scanner' },
      { kind: 'set', patch: { auth: 'authorized' } },
      { kind: 'wait', ms: 300 },
    ],
  },
  dashboard: { chapter: 'dashboard', steps: [{ kind: 'wait', ms: 300 }] },
  cases: { chapter: 'cases', steps: [{ kind: 'wait', ms: 300 }] },

  submission: {
    chapter: 'submission',
    steps: [
      { kind: 'type', field: 'businessName', value: "Kim's Convenience" },
      { kind: 'type', field: 'streetAddress', value: '1450 Eglinton Ave W' },
      { kind: 'type', field: 'city', value: 'Mississauga' },
    ],
  },

  requestedScope: {
    chapter: 'requestedScope',
    steps: [
      {
        kind: 'field',
        field: 'form.scopes',
        value: [
          {
            id: 'sc-seed',
            startDateTime: '2025-03-08 23:45:00',
            endDateTime: '2025-03-09 01:30:00',
            isActualTime: true,
            cameras: '3, 4, 7',
          },
        ],
      },
    ],
  },

  timeOffset: {
    chapter: 'timeOffset',
    steps: [
      { kind: 'field', field: 'capture.actualDateTime', value: '2025-03-08 12:00:00' },
      { kind: 'launch', screen: 'ocr' },
      { kind: 'tap', target: 'calculate', action: 'calculateOffset' },
    ],
  },

  extractedScope: {
    chapter: 'extractedScope',
    steps: [{ kind: 'call', action: 'generateExtractedScopes' }],
  },

  dvrInfo: {
    chapter: 'dvrInfo',
    steps: [
      { kind: 'type', field: 'form.dvr.dvrTypeBrand', value: 'Hikvision DS-7608' },
      { kind: 'type', field: 'form.dvr.totalDvrRetention', value: '35 days' },
    ],
  },

  notes: { chapter: 'notes', steps: [{ kind: 'call', action: 'generateNotes' }] },
  completion: { chapter: 'completion', steps: [{ kind: 'wait', ms: 300 }] },

  // ---- launch-only ----
  ocr: {
    chapter: 'ocr',
    steps: [
      { kind: 'field', field: 'capture.method', value: 'ocr' },
      { kind: 'tap', target: 'use-sample' },
      { kind: 'type', field: 'capture.dvrDateTime', value: '2025-03-08 12:05:30' },
    ],
  },
}
