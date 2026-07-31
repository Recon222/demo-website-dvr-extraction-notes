import { describe, it, expect } from 'vitest'

import {
  DEMO_EXPORT_STAGES,
  EXPORT_MODAL_MODES,
  EXPORT_STAGES,
  STAGE_MESSAGES,
  describeExportProgress,
  describeValidationPrompt,
  missingFieldLine,
  resolveExportModalMode,
} from '@/features/demo/engine/logic/export/stage'
import {
  validateLocationsForPdf,
  type CasePdfValidationResult,
} from '@/features/demo/engine/logic/export/validation'

const CASE = { id: 'case-a', caseNumber: 'PR26-0001' }

const location = (id: string, complete: boolean): Parameters<typeof validateLocationsForPdf>[1][number] => ({
  id,
  locationName: `Location ${id}`,
  form: {
    scopes: complete
      ? [{ startDateTime: '2026-03-01 08:00:00', endDateTime: '2026-03-01 09:00:00' }]
      : [],
    dateTimeCompleted: complete ? '2026-03-01 12:00:00' : '',
    completedBy: complete ? 'PC 1234 Reid' : '',
  },
})

const result = (flags: boolean[]): CasePdfValidationResult =>
  validateLocationsForPdf(CASE, flags.map((complete, i) => location(`l${i + 1}`, complete)))

describe('STAGE_MESSAGES — the phone\'s stage copy', () => {
  it('covers every stage with the phone\'s exact wording', () => {
    expect(STAGE_MESSAGES).toEqual({
      idle: '',
      validating: 'Validating locations...',
      generating: 'Generating PDFs...',
      zipping: 'Creating ZIP archive...',
      sharing: 'Opening share dialog...',
    })
  })

  it('has a message for every declared stage', () => {
    for (const stage of EXPORT_STAGES) {
      expect(STAGE_MESSAGES[stage]).toBeTypeOf('string')
    }
  })

  it('keeps "sharing" OUT of the stages the demo pipeline may enter', () => {
    // "Opening share dialog..." precedes a real OS share sheet on the phone. A browser tab has
    // none, and the demo's ZIP ends in an honest "not available here" notice (D4) — printing
    // this line over nothing would be the fake success the honesty rule forbids.
    expect(DEMO_EXPORT_STAGES).not.toContain('sharing')
    expect(DEMO_EXPORT_STAGES).not.toContain('idle')
    expect(DEMO_EXPORT_STAGES).toEqual(['validating', 'generating', 'zipping'])
    for (const stage of DEMO_EXPORT_STAGES) {
      expect(EXPORT_STAGES).toContain(stage)
    }
  })
})

describe('describeExportProgress', () => {
  it('renders the stage line alone while zipping', () => {
    expect(describeExportProgress('zipping', { current: 2, total: 3 }, 'Rear Door')).toEqual({
      stageMessage: 'Creating ZIP archive...',
      progressLabel: null,
      locationLabel: null,
    })
  })

  it('counts locations only while generating PDFs', () => {
    expect(describeExportProgress('generating', { current: 2, total: 3 })).toEqual({
      stageMessage: 'Generating PDFs...',
      progressLabel: 'Location 2 of 3',
      locationLabel: null,
    })
  })

  it('quotes the current location name, matching the phone\'s literal quotes', () => {
    expect(describeExportProgress('generating', { current: 1, total: 2 }, 'Rear Door').locationLabel).toBe(
      '"Rear Door"',
    )
  })

  it('suppresses the counter when the total is unknown', () => {
    expect(describeExportProgress('generating', { current: 0, total: 0 }).progressLabel).toBeNull()
    expect(describeExportProgress('generating').progressLabel).toBeNull()
  })

  it('renders nothing at idle', () => {
    expect(describeExportProgress('idle')).toEqual({
      stageMessage: '',
      progressLabel: null,
      locationLabel: null,
    })
  })
})

describe('resolveExportModalMode — one precedence for the phone\'s three copies', () => {
  it('hides when nothing is happening', () => {
    expect(
      resolveExportModalMode({ showValidationModal: false, validationResult: null, stage: 'idle' }),
    ).toBe('hidden')
  })

  it('shows progress for any non-idle stage', () => {
    expect(
      resolveExportModalMode({ showValidationModal: false, validationResult: null, stage: 'zipping' }),
    ).toBe('progress')
  })

  it('lets validation outrank progress', () => {
    expect(
      resolveExportModalMode({
        showValidationModal: true,
        validationResult: result([true, false]),
        stage: 'validating',
      }),
    ).toBe('validation')
  })

  it('refuses to show a validation prompt for an allValid result', () => {
    // A modal flagged open with nothing wrong would blank the screen with an empty warning.
    expect(
      resolveExportModalMode({
        showValidationModal: true,
        validationResult: result([true, true]),
        stage: 'idle',
      }),
    ).toBe('hidden')
  })

  it('falls through to progress when an allValid result is flagged open mid-export', () => {
    expect(
      resolveExportModalMode({
        showValidationModal: true,
        validationResult: result([true, true]),
        stage: 'generating',
      }),
    ).toBe('progress')
  })

  it('needs a result, not just the flag', () => {
    expect(
      resolveExportModalMode({ showValidationModal: true, validationResult: null, stage: 'idle' }),
    ).toBe('hidden')
  })

  it('declares its whole union', () => {
    expect(EXPORT_MODAL_MODES).toEqual(['hidden', 'progress', 'validation'])
  })
})

describe('describeValidationPrompt', () => {
  it('uses the "some" framing when at least one location survives', () => {
    const view = describeValidationPrompt(result([true, false, false]))
    expect(view).toMatchObject({
      allInvalid: false,
      title: 'Some Locations Missing PDF Data',
      description:
        'The following locations will NOT include PDF notes due to missing required fields:',
      summary: '1 of 3 locations will include PDF notes.',
      continueLabel: 'Continue',
      cancelLabel: 'Cancel',
    })
  })

  it('escalates to the "all" framing when nothing can produce a PDF', () => {
    const view = describeValidationPrompt(result([false, false]))
    expect(view).toMatchObject({
      allInvalid: true,
      title: 'All Locations Missing PDF Data',
      description: 'None of the locations have the required fields for PDF generation:',
      summary: 'The ZIP will be created without any PDF notes.',
      continueLabel: 'Export Anyway',
    })
  })

  it('announces the invalid count for screen readers', () => {
    expect(describeValidationPrompt(result([true, false, false])).announcement).toBe(
      'Warning: 2 of 3 locations are missing required data for PDF generation.',
    )
  })

  it('passes the invalid rows through in the validator\'s order', () => {
    const view = describeValidationPrompt(result([false, true, false]))
    expect(view.invalidLocations.map((v) => v.locationId)).toEqual(['l1', 'l3'])
    expect(view.invalidLocations[0].errors).toContain('Completed by')
  })

  it('does not claim allInvalid for an empty case', () => {
    // totalLocations 0 is "nothing was asked", not "everything failed" — the phone gates
    // allInvalid on `totalCount > 0` for exactly this.
    expect(describeValidationPrompt(result([])).allInvalid).toBe(false)
  })

  it('formats each missing field the way the list renders it', () => {
    expect(missingFieldLine('Completed by')).toBe('- Missing: Completed by')
  })
})
