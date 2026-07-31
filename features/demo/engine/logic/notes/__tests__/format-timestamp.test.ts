import { describe, it, expect } from 'vitest'
import { formatTimestamp } from '@/features/demo/engine/logic/notes/format-timestamp'

// Ported behavior contract: phone `notes/formatters/__tests__/format-timestamp.test.ts`
// + the PR-84 C1 failure-mode spec (raw passthrough for unparseable-but-present input).
describe('formatTimestamp', () => {
  it('formats a canonical datetime with local getters, 2-padded', () => {
    expect(formatTimestamp('2023-05-15 09:30:45')).toBe('2023-05-15 09:30:45')
    expect(formatTimestamp('2024-06-01T09:00:00')).toBe('2024-06-01 09:00:00')
  })

  it('pads single-digit fields', () => {
    expect(formatTimestamp('2025-03-08 01:05:09')).toBe('2025-03-08 01:05:09')
  })

  it('returns "" for empty and whitespace-only input (absent data)', () => {
    expect(formatTimestamp('')).toBe('')
    expect(formatTimestamp('   ')).toBe('')
  })

  it('returns the RAW input for present-but-unparseable values (PR-84 C1: visible, never dropped)', () => {
    // NB: fixtures must be unparseable by THIS engine — V8's lenient fallback parser
    // accepts surprising strings (e.g. 'TBD:00' parses as a time), and anything it
    // accepts is formatted, not passed through.
    expect(formatTimestamp('not a timestamp')).toBe('not a timestamp')
    expect(formatTimestamp('11:45 PM on March 8 2025-ish garbage!')).toBe(
      '11:45 PM on March 8 2025-ish garbage!',
    )
  })
})
