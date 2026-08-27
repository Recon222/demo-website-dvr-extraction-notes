'use client'

import type { CSSProperties } from 'react'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

// A33/A34/A35/A55 (U1.3) - was a hand-rolled near-miss of the nested tier: the old card
// stops at 0.6/0.7 and a `rgba(43,140,193,0.18)` hairline. Deferral §31 named this one.
const card: CSSProperties = {
  ...glassCardNested,
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
const mono = "var(--font-jbmono),'JetBrains Mono',monospace"

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
            <div key={`${r.label}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '5px 0', borderTop: i === 0 ? 'none' : hairline }}>
              <span style={{ fontSize: 13, color: '#8fa9c4', flexShrink: 0 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: '#e6eef6', textAlign: 'right', wordBreak: 'break-word', fontFamily: MONO_LABELS.has(r.label) ? mono : undefined }}>{r.value}</span>
            </div>
          ))}
        </div>
      ))}

      {view.scopes.length > 0 && (
        <div style={card}>
          <div style={heading}>Extraction scopes</div>
          {view.scopes.map((sc, i) => {
            // Phone `:120` -- `const tone = actual ? colors.success : colors.warning`.
            const tone = sc.isActualTime ? colors.success : colors.warning
            return (
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
                    // Matrix row 79's "two chip labels neutralised". The phone's `ScopeRow`
                    // (`ImportResultBody.tsx:145-159`) states the reason in full: "These five
                    // words are the ONLY thing in the row that says whether a requested video
                    // window is on the DVR's clock or on real time - the times below render in
                    // `colors.text` with no other marker. Painted with `tone` they measured
                    // 1.81-1.88:1 (DVR) and 2.09-2.17:1 (ACTUAL) in light, and 4.02-4.48:1 for
                    // ACTUAL in dark. The tint and border keep the colour coding; the label
                    // carries the words."
                    // The ACTUAL-TIME label's old hex was matrix row 79's "fourth green" and
                    // dies with it (not spelled here: U7.1's D-4 -- a comment is source to
                    // every literal scan in this repo, so naming a retired hex re-inlines it). The
                    // GEOMETRY is the demo's lifted 10/700/0.4/r4 (demo §0.4; §4.9 gives no
                    // package here a font-size move) -- only the colour treatment moves.
                    color: colors.text,
                    background: withAlpha(tone, 0.16),
                    borderStyle: 'solid',
                    borderWidth: 1,
                    borderTopColor: withAlpha(tone, 0.4),
                    borderRightColor: withAlpha(tone, 0.4),
                    borderBottomColor: withAlpha(tone, 0.4),
                    borderLeftColor: withAlpha(tone, 0.4),
                  }}
                >
                  {sc.isActualTime ? 'ACTUAL TIME' : 'DVR TIME'}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: '#e6eef6', fontFamily: mono }}>{sc.range}</div>
              {sc.cameras && <div style={{ fontSize: 12, color: '#9fc0db', marginTop: 2 }}>{sc.cameras}</div>}
            </div>
            )
          })}
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
