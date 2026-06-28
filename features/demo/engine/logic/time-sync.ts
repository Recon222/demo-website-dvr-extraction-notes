import type { SyncResult } from '@/lib/demo/types'

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Simulated NTP atomic-clock sync.
 *
 * The phone app speaks real RFC 5905 NTP over UDP (`react-native-udp`) against regional
 * atomic-clock servers. A browser has no raw UDP socket, and the demo's serverless host blocks
 * outbound UDP — so real NTP is impossible here and we mock it. The shape, the uncertainty math
 * (RFC 5905 synchronisation distance = RTT/2 + root dispersion), and the traceability chain all
 * mirror the app's `precision-time-sync` feature so the card and PDF read identically.
 *
 * Returns the calibrated device time (now + offset) plus the SyncResult the card renders.
 * `now` is injectable for deterministic tests.
 */
export function simulateNtpSync(now: number = Date.now()): { calibratedMs: number; sync: SyncResult } {
  const rttMs = round2(6 + Math.random() * 30) // ~6–36 ms regional round-trip
  const rootDispersionMs = 0.4 + Math.random() * 2.6
  const offsetMs = round2(Math.random() * 120 - 60) // ±60 ms device drift (positive = device slow)
  const uncertaintyMs = round2(Math.max(10, rttMs / 2 + rootDispersionMs))
  return {
    calibratedMs: now + offsetMs,
    sync: {
      method: 'NTP',
      server: 'time.nrc.ca',
      stratum: 2,
      offsetMs,
      uncertaintyMs,
      rttMs,
      traceability: 'NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second',
      timestamp: now,
    },
  }
}
