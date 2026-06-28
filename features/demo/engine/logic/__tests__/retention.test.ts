import { describe, it, expect } from 'vitest'
import {
  calculateTotalRetention,
  calculateDaysUntilOverwritten,
  calculateOverwrittenDate,
  getRetentionStatus,
  buildRetentionView,
} from '@/features/demo/engine/logic/retention'

// Fixed "today": 2025-04-12 (local). Day math is UTC-based, so the local fixture is fine.
const NOW = () => new Date(2025, 3, 12)

describe('calculateTotalRetention', () => {
  it('returns whole days from first recorded date to today', () => {
    expect(calculateTotalRetention('2025-03-03 00:00:00', NOW)).toBe(40)
    expect(calculateTotalRetention('2025-04-12 09:00:00', NOW)).toBe(0)
  })
  it('returns null for empty or malformed input', () => {
    expect(calculateTotalRetention('', NOW)).toBeNull()
    expect(calculateTotalRetention('nope', NOW)).toBeNull()
  })
  it('returns null when the first recorded date is in the future', () => {
    expect(calculateTotalRetention('2025-05-01 00:00:00', NOW)).toBeNull()
  })
})

describe('calculateDaysUntilOverwritten', () => {
  it('counts days until (scopeStart + retention) reaches today', () => {
    // overwrite = 2025-03-08 + 40 = 2025-04-17; today 2025-04-12 → 5 days left
    expect(calculateDaysUntilOverwritten('2025-03-08 23:45:00', 40, NOW)).toBe(5)
  })
  it('returns 0 when the footage is already overwritten', () => {
    // overwrite = 2025-01-01 + 30 = 2025-01-31; today 2025-04-12 → past
    expect(calculateDaysUntilOverwritten('2025-01-01 00:00:00', 30, NOW)).toBe(0)
  })
})

describe('calculateOverwrittenDate', () => {
  it('returns scopeStart + retention as YYYY-MM-DD', () => {
    expect(calculateOverwrittenDate('2025-03-08 23:45:00', 40)).toBe('2025-04-17')
  })
  it('returns empty string for invalid input', () => {
    expect(calculateOverwrittenDate('', 40)).toBe('')
  })
})

describe('getRetentionStatus', () => {
  it('bands days remaining into a status', () => {
    expect(getRetentionStatus(0)).toBe('OVERWRITTEN')
    expect(getRetentionStatus(2)).toBe('CRITICAL')
    expect(getRetentionStatus(5)).toBe('WARNING')
    expect(getRetentionStatus(30)).toBe('SAFE')
  })
})

describe('buildRetentionView', () => {
  it('returns total + per-scope retention, skipping scopes with no start', () => {
    const view = buildRetentionView(
      [{ startDateTime: '2025-03-08 23:45:00' }, { startDateTime: '' }],
      '2025-03-03 00:00:00',
      NOW,
    )
    expect(view.totalRetention).toBe(40)
    expect(view.scopes).toHaveLength(1)
    expect(view.scopes[0]).toEqual({
      label: 'Scope 1',
      daysUntilOverwritten: 5,
      overwrittenDate: '2025-04-17',
      status: 'WARNING',
    })
  })
  it('returns null total + no scopes when there is no first recorded date', () => {
    const view = buildRetentionView([{ startDateTime: '2025-03-08 00:00:00' }], '', NOW)
    expect(view.totalRetention).toBeNull()
    expect(view.scopes).toEqual([])
  })
})
