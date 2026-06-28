'use client'

import type { CaseCard } from '@/features/demo/ui/screens/screenData'

export interface CasesScreenProps {
  cases: CaseCard[]
  expandedId: string | null
  onToggle(caseId: string): void
  onNewCase(): void
  onOpenLocation(locationId: string): void
  onAddLocation(caseId: string): void
  onImport(caseId: string): void
}

/** The Cases list — expandable cards with per-case Import / Add Location actions. */
export function CasesScreen({ cases, expandedId, onToggle, onNewCase, onOpenLocation, onAddLocation, onImport }: CasesScreenProps) {
  return (
    <div style={{ minHeight: 786, padding: '58px 0 96px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 18px 18px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#f0f4f8' }}>Cases</div>
        <button type="button" aria-label="New case" onClick={onNewCase} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M12 11v5M9.5 13.5h5" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {cases.length === 0 && <div style={{ fontSize: 14, color: '#7a9fc4', fontStyle: 'italic' }}>No cases yet — tap + to create one.</div>}
        {cases.map((c) => {
          const expanded = expandedId === c.id
          return (
            <div key={c.id} style={{ marginBottom: 14, borderRadius: 16, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', overflow: 'hidden' }}>
              <button type="button" onClick={() => onToggle(c.id)} style={{ width: '100%', textAlign: 'left', padding: 16, cursor: 'pointer', background: 'transparent', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>{c.caseNumber}</div>
                    {c.displayName && <div style={{ fontSize: 13, color: '#99badd', marginTop: 4 }}>{c.displayName}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 10 }}>
                    <div style={{ padding: '3px 9px', borderRadius: 20, border: `1px solid ${c.status.border}`, background: c.status.bg }}>
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: c.status.color }}>{c.status.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#7a9fc4' }}>{c.locationCountLabel}</div>
                  </div>
                </div>
              </button>

              {expanded && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ height: 1, background: '#1e3a5f', marginBottom: 12 }} />
                  {c.locations.length > 0 ? (
                    c.locations.map((loc) => (
                      <button key={loc.id} type="button" onClick={() => onOpenLocation(loc.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', marginBottom: 8, borderRadius: 8, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ flex: 1, marginRight: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{loc.locationName}</div>
                          {loc.address && <div style={{ fontSize: 12, color: '#99badd', marginTop: 2 }}>{loc.address}</div>}
                        </div>
                        <div style={{ padding: '3px 8px', borderRadius: 12, background: loc.status.bg }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: loc.status.color }}>{loc.status.label}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic', padding: '6px 0 14px' }}>No locations yet</div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="button" onClick={() => onImport(c.id)} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Import</button>
                    <button type="button" onClick={() => onAddLocation(c.id)} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Location</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
