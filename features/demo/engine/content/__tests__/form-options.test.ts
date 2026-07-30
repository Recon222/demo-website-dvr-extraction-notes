import { describe, it, expect } from 'vitest'
import {
  CUSTOM_VALUE,
  EXPORT_MEDIA_OPTIONS,
  FILE_TYPE_OPTIONS,
  MEDIA_PROVIDED_OPTIONS,
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  RECORDING_SCHEDULE_OPTIONS,
  optionValues,
  isCustomResolution,
  isCustomFps,
  parseRecordingSchedule,
  toggleRecordingSchedule,
} from '@/features/demo/engine/content/form-options'

// These lists are lifted verbatim from the phone app's src/constants/FormOptions.ts
// (line citations in the module header). The literals below pin them: a demo-side edit
// that drifts any list away from the phone fails here, on the exact value that moved.
describe('canonical form options (phone parity)', () => {
  it('Export Media matches the phone exactly (FormOptions.ts:16-23)', () => {
    expect(optionValues(EXPORT_MEDIA_OPTIONS)).toEqual([
      'USB Drive', 'External Hard Drive', 'DVD', 'Cloud Upload', 'Network Transfer', 'Other',
    ])
  })

  it('File Type matches the phone exactly (FormOptions.ts:25-32)', () => {
    expect(optionValues(FILE_TYPE_OPTIONS)).toEqual([
      'MP4', 'AVI', 'MOV', 'MKV', 'Proprietary', 'Other',
    ])
  })

  it('Media Provided Via matches the phone exactly (FormOptions.ts:34-40)', () => {
    expect(optionValues(MEDIA_PROVIDED_OPTIONS)).toEqual([
      'Hand Delivered', 'Mailed', 'Left with Contact', 'Electronic Transfer', 'Other',
    ])
  })

  it('Resolution matches the phone exactly — 8 options incl. CIF/4CIF/960H + custom (FormOptions.ts:45-54)', () => {
    expect(RESOLUTION_OPTIONS.map((o) => [o.label, o.value])).toEqual([
      ['352x240 (CIF)', '352x240'],
      ['704x480 (4CIF)', '704x480'],
      ['960x480 (960H)', '960x480'],
      ['1280x720 (720p)', '1280x720'],
      ['1920x1080 (1080p)', '1920x1080'],
      ['2560x1440 (1440p)', '2560x1440'],
      ['3840x2160 (4K)', '3840x2160'],
      ['Other (Custom)', CUSTOM_VALUE],
    ])
  })

  it('FPS matches the phone exactly — 1/5/10/15/20/25/30 + custom (FormOptions.ts:59-68)', () => {
    expect(FPS_OPTIONS.map((o) => [o.label, o.value])).toEqual([
      ['1 FPS', '1'],
      ['5 FPS', '5'],
      ['10 FPS', '10'],
      ['15 FPS', '15'],
      ['20 FPS', '20'],
      ['25 FPS', '25'],
      ['30 FPS', '30'],
      ['Other (Custom)', CUSTOM_VALUE],
    ])
  })

  it('Recording Schedule matches the phone checkbox set (dvr-information.tsx:287-305)', () => {
    expect([...RECORDING_SCHEDULE_OPTIONS]).toEqual(['Continuous', 'Motion'])
  })

  it('the dropped demo-only values are really gone from every list', () => {
    const all = [
      ...EXPORT_MEDIA_OPTIONS, ...FILE_TYPE_OPTIONS, ...MEDIA_PROVIDED_OPTIONS,
      ...RESOLUTION_OPTIONS, ...FPS_OPTIONS,
    ].flatMap((o) => [o.label, o.value])
    for (const dropped of ['SD Card', 'Cloud Link', 'Mixed', 'Secure Upload', 'Picked Up', '10fps', '12fps']) {
      expect(all, `"${dropped}" should have been dropped`).not.toContain(dropped)
    }
  })
})

describe('isCustomResolution / isCustomFps (phone FormOptions.ts:73-93)', () => {
  it('empty string means "not yet selected" — NOT custom mode (PF-14)', () => {
    expect(isCustomResolution('')).toBe(false)
    expect(isCustomFps('')).toBe(false)
  })

  it('standard values are not custom', () => {
    expect(isCustomResolution('1920x1080')).toBe(false)
    expect(isCustomResolution('352x240')).toBe(false)
    expect(isCustomFps('30')).toBe(false)
    expect(isCustomFps('1')).toBe(false)
  })

  it('the custom sentinel and free text are custom', () => {
    expect(isCustomResolution(CUSTOM_VALUE)).toBe(true)
    expect(isCustomResolution('1440x900')).toBe(true)
    expect(isCustomFps(CUSTOM_VALUE)).toBe(true)
    expect(isCustomFps('12')).toBe(true)
    expect(isCustomFps('12.5')).toBe(true)
  })

  it('labels are not values — an annotated label is treated as custom free text', () => {
    // Guards against accidentally storing the display label instead of the value.
    expect(isCustomResolution('1920x1080 (1080p)')).toBe(true)
    expect(isCustomFps('30 FPS')).toBe(true)
  })
})

describe('recording schedule helpers', () => {
  it('parses the comma-joined string to a lowercase list', () => {
    expect(parseRecordingSchedule('continuous, motion')).toEqual(['continuous', 'motion'])
    expect(parseRecordingSchedule('Continuous')).toEqual(['continuous'])
    expect(parseRecordingSchedule('')).toEqual([])
  })

  it('toggles an option, returning the canonical comma-joined value (continuous before motion)', () => {
    expect(toggleRecordingSchedule('continuous', 'Motion')).toBe('continuous, motion')
    expect(toggleRecordingSchedule('continuous, motion', 'Continuous')).toBe('motion')
    expect(toggleRecordingSchedule('', 'Continuous')).toBe('continuous')
    // order is canonical regardless of toggle order
    expect(toggleRecordingSchedule('motion', 'Continuous')).toBe('continuous, motion')
  })
})
