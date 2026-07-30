import { describe, it, expect } from 'vitest'
import { FORM_OPTIONS, mapAiToForm } from '@/features/demo/engine/logic/import'
import {
  normalizeTimePeriodType,
  normalizeYesNo,
  normalizeExtractedFields,
} from '@/features/demo/engine/logic/import-normalize'
import {
  EXPORT_MEDIA_OPTIONS,
  FILE_TYPE_OPTIONS,
  MEDIA_PROVIDED_OPTIONS,
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  optionValues,
} from '@/features/demo/engine/content/form-options'

/** Fixed reference clock for the date pipeline (the engine bans ambient Date.now in tests). */
const NOW = new Date(2025, 2, 10, 12, 0, 0).getTime()

/**
 * Adversarial inputs for the property-style checks: enum-ish variants, junk, injection-ish
 * strings, unicode, whitespace and null-indicators. Every enum normalizer must map ALL of
 * these into its displayable set — never pass one through verbatim.
 */
const JUNK = [
  '', ' ', '  \t ', 'null', 'N/A', 'not specified', 'unknown', '-', '---',
  'ACTUAL TIME', 'actual', 'Real-Time', 'wall clock', 'LIVE', 'dvr', 'DVR TIME', 'recorder time',
  'system time', 'approximate', 'both', 'Actual Time (approx)', 'DVR',
  'yes', 'Y', 'TRUE', 'no', 'N', 'False', 'maybe', 'probably', '1', '0',
  'SD Card', 'Cloud Link', 'Mixed', 'Secure Upload', 'Picked Up',
  '1080p', '1920x1080 (1080p)', '30fps', 'custom', 'Other',
  'a'.repeat(500), '💾 usb', '"; DROP TABLE cases; --', '<script>alert(1)</script>',
  '---BEGIN DOCUMENT---',
]

describe('FORM_OPTIONS is a values-only view of the canonical lists', () => {
  it('every key mirrors engine/content/form-options exactly', () => {
    expect(FORM_OPTIONS.exportMedia).toEqual(optionValues(EXPORT_MEDIA_OPTIONS))
    expect(FORM_OPTIONS.fileType).toEqual(optionValues(FILE_TYPE_OPTIONS))
    expect(FORM_OPTIONS.mediaProvided).toEqual(optionValues(MEDIA_PROVIDED_OPTIONS))
    expect(FORM_OPTIONS.resolution).toEqual(optionValues(RESOLUTION_OPTIONS))
    expect(FORM_OPTIONS.fps).toEqual(optionValues(FPS_OPTIONS))
  })
})

describe('import normalization only emits displayable enum values', () => {
  it('normalizeTimePeriodType maps EVERY input into the two displayable values', () => {
    for (const junk of JUNK) {
      const out = normalizeTimePeriodType(junk)
      expect(['Actual Time', 'DVR Time'], `input "${junk.slice(0, 40)}"`).toContain(out)
    }
  })

  it('normalizeYesNo maps EVERY input into Yes / No / "" (blank = not provided)', () => {
    for (const junk of JUNK) {
      const out = normalizeYesNo(junk)
      expect(['Yes', 'No', ''], `input "${junk.slice(0, 40)}"`).toContain(out)
    }
  })

  it('the full pipeline never lets junk through the enum-backed fields', () => {
    for (const junk of JUNK) {
      const { fields } = normalizeExtractedFields(
        {
          hasVideoMonitor: junk,
          extractionTimeFrames: [
            { extractionStartTime: '2025-03-08 23:45', extractionEndTime: '', timePeriodType: junk, cameraDetails: '' },
          ],
        },
        { currentTimeMs: NOW },
      )
      expect(['Yes', 'No', '']).toContain(fields.hasVideoMonitor)
      expect(['Actual Time', 'DVR Time']).toContain(fields.extractionTimeFrames[0].timePeriodType)
      // …and the mapped form patch renders it as the boolean the scope screen's
      // Real Time / DVR Time toggle displays.
      const patch = mapAiToForm(fields)
      expect(typeof patch._import.timeFrames[0].isActualTime).toBe('boolean')
    }
  })

  it('the import patch writes NO dropdown-enum field at all (they cannot go undisplayable)', () => {
    // exportMedia / fileType / mediaProvidedVia / resolution / recordingFps are wizard-only:
    // the phone's import doesn't extract them and neither does the demo's. Pinning the patch
    // shape means a future field addition must consciously route through the canonical lists.
    const patch = mapAiToForm({})
    expect(Object.keys(patch).sort()).toEqual([
      '_import', 'businessName', 'city', 'locationContact', 'locationPhone',
      'requesterBadgeNumber', 'requesterEmail', 'requesterName', 'requesterPhone', 'streetAddress',
    ])
    expect(Object.keys(patch._import).sort()).toEqual([
      'dvrPassword', 'dvrTypeBrand', 'dvrUsername', 'hasVideoMonitor', 'offenceType',
      'timeFrames', 'totalDvrRetention',
    ])
  })
})
