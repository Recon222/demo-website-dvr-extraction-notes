import { describe, it, expect } from 'vitest'
import { simulateNtpSync } from '@/lib/demo/logic/time-sync'

describe('simulateNtpSync', () => {
  it('produces a realistic NTP sync result and the calibrated device time', () => {
    const now = 1_700_000_000_000
    const { calibratedMs, sync } = simulateNtpSync(now)

    expect(sync.method).toBe('NTP')
    expect(sync.server).toBe('time.nrc.ca')
    expect(sync.stratum).toBe(2)
    expect(sync.traceability).toMatch(/NRC Canada stratum-2/)
    expect(sync.timestamp).toBe(now)

    // calibrated time = now + offset (the relationship is exact even though offset is random)
    expect(calibratedMs).toBe(now + sync.offsetMs)

    expect(Math.abs(sync.offsetMs)).toBeLessThanOrEqual(60)
    expect(sync.rttMs).toBeGreaterThan(0)
    expect(sync.rttMs).toBeLessThanOrEqual(36)
    // RFC 5905 synchronisation distance, floored at 10 ms
    expect(sync.uncertaintyMs).toBeGreaterThanOrEqual(10)
  })
})
