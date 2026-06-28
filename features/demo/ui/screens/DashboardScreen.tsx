'use client'

import type { CaseCard } from '@/features/demo/ui/screens/screenData'

export interface DashboardScreenProps {
  cases: CaseCard[]
  onOpenLocation(locationId: string): void
}

/** The dashboard "Recent Activity" timeline of cases (read-only; tap a location pill to open). */
export function DashboardScreen({ cases, onOpenLocation }: DashboardScreenProps) {
  return (
    <div style={{ minHeight: 786, padding: '58px 0 96px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 18px 16px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#f0f4f8' }}>Dashboard</div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#7a9fc4', textTransform: 'uppercase', letterSpacing: 1.5, margin: '8px 0 16px 42px' }}>
        Recent Activity
      </div>

      {cases.length === 0 && <div style={{ padding: '0 18px', fontSize: 14, color: '#7a9fc4', fontStyle: 'italic' }}>No cases yet.</div>}

      {cases.map((c, ci) => (
        <div key={c.id} style={{ display: 'flex', padding: '0 16px', marginBottom: 14 }}>
          <div style={{ width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', paddingTop: 24 }}>
            <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, background: c.status.color, opacity: 0.4, filter: 'blur(3px)' }} />
              <div style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${c.status.color}`, background: c.status.bg, zIndex: 1 }} />
            </div>
            {ci < cases.length - 1 && <div style={{ width: 2, flex: 1, background: '#1e3a5f', marginTop: 6, minHeight: 30 }} />}
          </div>

          <div style={{ flex: 1, marginLeft: 8, borderRadius: 16, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>{c.caseNumber}</div>
              <div style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${c.status.border}`, background: c.status.bg }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: c.status.color }}>{c.status.label}</div>
              </div>
            </div>
            {c.displayName && <div style={{ fontSize: 13, color: '#99badd', marginBottom: 10 }}>{c.displayName}</div>}
            {c.personnel.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {c.personnel.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1a2d44', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#7a9fc4' }}>{p.role}</span>
                    <span style={{ fontSize: 11, color: '#f0f4f8' }}>{p.name}</span>
                    {p.badge && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#4ecdc4' }}>#{p.badge}</span>}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 13, color: '#99badd', marginBottom: 12 }}>Created: {c.createdLabel}</div>
            {c.locations.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {c.locations.map((loc) => (
                  <button key={loc.id} type="button" onClick={() => onOpenLocation(loc.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 20, border: '1px solid rgba(43,140,193,0.3)', background: 'rgba(43,140,193,0.10)', cursor: 'pointer' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 4, background: loc.status.color }} />
                    <span style={{ fontSize: 12, color: '#f0f4f8' }}>{loc.locationName}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic' }}>No locations yet</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
