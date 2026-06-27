import { describe, it, expect } from 'vitest'
import { escapeHtml, formatDocDate, nowStamp } from '@/lib/demo/logic/pdf/shared'

describe('pdf shared helpers', () => {
  it('escapes all HTML entities and leaves other characters intact', () => {
    expect(escapeHtml('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;')
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml('plain')).toBe('plain')
  })

  it('formats a valid date, returns N/A for empty, passes invalid through', () => {
    expect(formatDocDate('2025-03-08 23:45:30')).toBe('03/08/2025 23:45:30')
    expect(formatDocDate('')).toBe('N/A')
    expect(formatDocDate('not-a-date')).toBe('not-a-date')
  })

  it('produces a now-stamp in YYYY-MM-DD HH:MM:SS form', () => {
    expect(nowStamp()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})
