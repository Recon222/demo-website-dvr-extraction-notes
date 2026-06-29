'use client'

import type { CSSProperties } from 'react'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

const card: CSSProperties = {
  borderRadius: 12,
  border: '1px solid rgba(43,140,193,0.18)',
  background: 'linear-gradient(180deg,rgba(26,45,68,0.6),rgba(19,34,54,0.7))',
  padding: '12px 14px',
  marginBottom: 10,
  textAlign: 'left',
}
const heading: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  color: '#7fa8cc',
  marginBottom: 6,
}
const hairline = '1px solid rgba(255,255,255,0.05)'
const mono = "'JetBrains Mono',monospace"

const MONO_LABELS = new Set(['Badge', 'Phone', 'Email', 'Username', 'Password', 'Contact phone'])

/** One imported location's detail (header + grouped sections + scopes + warnings). Presentational. */
export function ImportResultBody({ view }: { view: ImportedLocationView }) {
  return (
    <div style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8' }}>{view.title}</div>
        <div style={{ fontSize: 13, color: '#7fa8cc', fontFamily: mono, marginTop: 2 }}>{view.caseNumber}</div>
        <div style={{ fontSize: 12, color: '#9fc0db', marginTop: 4 }}>
          {view.fieldCount} field{view.fieldCount === 1 ? '' : 's'} · {view.timeFrameCount} time range{view.timeFrameCount === 1 ? '' : 's'}
        </div>
      </div>

      {view.sections.map((s) => (
        <div key={s.heading} style={card}>
          <div style={heading}>{s.heading}</div>
          {s.rows.map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderTop: i === 0 ? 'none' : hairline }}>
              <span style={{ fontSize: 13, color: '#8fa9c4', flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: '#e6eef6', textAlign: 'right', wordBreak: 'break-word', fontFamily: MONO_LABELS.has(r.label) ? mono : undefined }}>{r.value}</span>
            </div>
          ))}
        </div>
      ))}

      {view.scopes.length > 0 && (
        <div style={card}>
          <div style={heading}>Extraction scopes</div>
          {view.scopes.map((sc, i) => (
            <div key={sc.label} style={{ padding: '7px 0', borderTop: i === 0 ? 'none' : hairline }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#cfe6f5' }}>{sc.label}</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    padding: '1px 6px',
                    borderRadius: 4,
                    color: sc.isActualTime ? '#7fe3b4' : '#ffd07a',
                    background: sc.isActualTime ? 'rgba(16,209,119,0.12)' : 'rgba(255,200,90,0.12)',
                  }}
                >
                  {sc.isActualTime ? 'ACTUAL TIME' : 'DVR TIME'}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#e6eef6', fontFamily: mono }}>{sc.range}</div>
              {sc.cameras && <div style={{ fontSize: 12, color: '#9fc0db', marginTop: 2 }}>{sc.cameras}</div>}
            </div>
          ))}
        </div>
      )}

      {view.warnings.length > 0 && (
        <details style={{ marginBottom: 4 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: '#9fc0db' }}>
            {view.warnings.length} automatic adjustment{view.warnings.length === 1 ? '' : 's'}
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#9fc0db', lineHeight: 1.5 }}>
            {view.warnings.map((w, i) => (
              <li key={`${w.field}-${i}`}>{w.reason}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
