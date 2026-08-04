// Authored preview — SyncStatusCard. The atomic-clock (NTP) time-calibration card: status,
// method, server, device offset, uncertainty, network delay, calibrated-at, traceability chain.
import { SyncStatusCard } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#0d1b2a', width: 360, padding: 20, fontFamily: 'system-ui' }}>
      {children}
    </div>
  )
}

// Realistic simulateNtpSync() result: NRC stratum-2 server, small device drift, RFC 5905 math.
const SYNC = {
  method: 'NTP' as const,
  server: 'time.nrc.ca',
  stratum: 2,
  offsetMs: 42.7,
  uncertaintyMs: 11.34,
  rttMs: 18.6,
  traceability: 'NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second',
  timestamp: Date.UTC(2026, 0, 14, 14, 32, 9),
}

export function Synchronized() {
  return (
    <Frame>
      <SyncStatusCard sync={SYNC} syncing={false} />
    </Frame>
  )
}

export function Synchronizing() {
  return (
    <Frame>
      <SyncStatusCard sync={null} syncing={true} />
    </Frame>
  )
}
