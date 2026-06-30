import { describe, it, expect } from 'vitest'
import { parseRecordingSchedule, toggleRecordingSchedule } from '@/features/demo/ui/screens/field-options'

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
