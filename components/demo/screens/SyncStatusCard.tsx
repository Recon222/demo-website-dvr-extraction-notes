'use client'

import type { SyncResult } from '@/lib/demo/types'

const mono = "'JetBrains Mono',monospace"

function formatOffset(offsetMs: number): { text: string; direction: string } {
  const text = `${Math.abs(offsetMs / 1000).toFixed(3)}s`
  const direction = offsetMs > 0 ? 'slow' : offsetMs < 0 ? 'fast' : 'synchronized'
  return { text, direction }
}

function format24h(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export interface SyncStatusCardProps {
  sync: SyncResult | null
  syncing: boolean
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 }}>
      <span style={{ fontSize: 12, color: '#7a9fc4' }}>{label}</span>
      <span style={{ fontSize: 12.5, color: accent ? '#4BA3D4' : '#f0f4f8', fontWeight: accent ? 700 : 500, fontFamily: mono, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

/**
 * The atomic-clock (NTP) time-sync card — full parity with the phone app's SyncStatusCard:
 * status, method, server, device offset, uncertainty, network delay, calibrated-at, and the
 * traceability chain. Presentational; the values come from the (mocked) simulateNtpSync.
 */
export function SyncStatusCard({ sync, syncing }: SyncStatusCardProps) {
  if (!syncing && !sync) return null
  const ok = !!sync && !syncing
  const offset = sync ? formatOffset(sync.offsetMs) : null
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: `1px solid ${ok ? 'rgba(16,209,119,0.3)' : '#2a4a6f'}`,
        background: ok ? 'rgba(16,209,119,0.06)' : '#0a1320',
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4f8', marginBottom: 10 }}>⏱️ Time Calibration</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginBottom: ok ? 8 : 0 }}>
        <span style={{ fontSize: 12, color: '#7a9fc4' }}>Status</span>
        {syncing ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#9fc0db' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4BA3D4" strokeWidth="2.5" style={{ animation: 'spin 0.9s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
            </svg>
            Synchronizing…
          </span>
        ) : (
          <span style={{ fontSize: 12.5, color: '#10d177', fontWeight: 600 }}>✓ Synchronized</span>
        )}
      </div>

      {ok && sync && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="Method" value="NTP (Atomic Clock)" />
          <Row label="Server" value={sync.server} />
          {offset && <Row label="Device Offset" value={`${offset.text} (${offset.direction})`} accent />}
          <Row label="Uncertainty" value={`±${sync.uncertaintyMs.toFixed(2)}ms`} />
          {sync.rttMs !== undefined && <Row label="Network Delay" value={`${(sync.rttMs / 2).toFixed(2)}ms`} />}
          {sync.timestamp !== undefined && <Row label="Calibrated at" value={format24h(sync.timestamp)} />}
          {sync.traceability && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1e3a5f' }}>
              <div style={{ fontSize: 10, color: '#7a9fc4', marginBottom: 4 }}>Traceable to</div>
              <div style={{ fontSize: 10.5, color: '#9fc0db', fontStyle: 'italic', lineHeight: 1.5 }}>{sync.traceability}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
