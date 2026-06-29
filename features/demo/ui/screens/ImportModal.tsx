'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import { ImportResultAccordion } from '@/features/demo/ui/screens/ImportResultAccordion'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

export interface ImportStage {
  label: string
  state: 'done' | 'active' | 'pending'
}
export interface ImportFailure {
  filename: string
  error: string
}
export type ImportResult =
  | {
      ok: true
      locations: ImportedLocationView[]
      failures: ImportFailure[]
      /** Set when a fallback to the sample occurred (keyless or live failure); shown as a notice. */
      notice?: string
    }
  | { ok: false; error: string }

export type ImportStageId = 'picker' | 'paste' | 'progress' | 'result'

export interface ImportModalProps {
  stage: ImportStageId
  text: string
  stages: ImportStage[]
  result: ImportResult | null
  /** Current file index for a batch import (shown as "Importing 2 of 3…"). */
  batch: { current: number; total: number } | null
  onPickPdf(): void
  onChoosePaste(): void
  onTextChange(value: string): void
  onRun(): void
  onBack(): void
  onRetry(): void
  onOpenLocation(locId: string | null): void
  onCancel(): void
}

const card: CSSProperties = {
  borderRadius: 14,
  border: '1px solid rgba(43,140,193,0.25)',
  background: 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))',
  padding: 22,
  marginBottom: 14,
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: 9,
  width: '100%',
}

export function ImportModal(props: ImportModalProps) {
  const { stage, text, stages, result, batch } = props
  const [openIndex, setOpenIndex] = useState(-1) // batch accordions, single-open (-1 = all collapsed)
  return (
    <ModalShell title="Import Recovery Request" onClose={props.onCancel}>
      {stage === 'picker' && (
        <>
          <button type="button" onClick={props.onPickPdf} style={{ ...card, border: card.border }}>
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#5AB4E6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h4" />
            </svg>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>Pick a PDF</div>
            <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.45 }}>Choose one or more PDF requests — parsed in your browser, then read by the model.</div>
          </button>
          <button type="button" onClick={props.onChoosePaste} style={card}>
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#5AB4E6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /><path d="M9 12h6M9 16h4" />
            </svg>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>Paste text</div>
            <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.45 }}>Paste any request text — email or form — and the model extracts the fields.</div>
          </button>
          <button type="button" onClick={props.onCancel} style={{ width: '100%', padding: 13, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        </>
      )}

      {stage === 'paste' && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 8 }}>Paste the recovery request (email or form)</div>
          <textarea
            value={text}
            onChange={(e) => props.onTextChange(e.target.value)}
            aria-label="Request text"
            placeholder="Paste any request text here…"
            style={{ width: '100%', height: 300, resize: 'none', borderRadius: 10, border: '1px solid #2a4a6f', background: '#0a1320', color: '#dfe9f3', fontSize: 12.5, lineHeight: 1.5, padding: 12, fontFamily: "'JetBrains Mono',monospace", outline: 'none', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={props.onBack} style={{ padding: '13px 18px', borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Back</button>
            <button type="button" onClick={props.onRun} style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Extract &amp; import</button>
          </div>
        </>
      )}

      {stage === 'progress' && (
        <div role="status" aria-live="polite">
          <div style={{ fontSize: 13, color: '#9fc0db', marginBottom: batch ? 10 : 22 }}>Running the extraction pipeline…</div>
          {batch && batch.total > 1 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cfe6f5', marginBottom: 18 }}>Importing {batch.current} of {batch.total}…</div>
          )}
          {stages.map((st, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              {st.state === 'done' && (
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10d177" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
              {st.state === 'active' && (
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5AB4E6" strokeWidth="2.5" style={{ animation: 'spin 0.9s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" /></svg>
              )}
              {st.state === 'pending' && (
                <div style={{ width: 20, display: 'flex', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: 4, background: '#2a4a6f' }} /></div>
              )}
              <div style={{ fontSize: 15, color: st.state === 'pending' ? '#5d7a9a' : '#cdd9e6' }}>{st.label}</div>
            </div>
          ))}
        </div>
      )}

      {stage === 'result' && result && (
        <div role="status" aria-live="polite" style={{ paddingTop: 4 }}>
          {!result.ok || result.locations.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: 16 }}>
              <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              <div style={{ fontSize: 15, color: '#ff8a93', lineHeight: 1.5 }}>
                {result.ok ? result.failures.map((f) => `${f.filename}: ${f.error}`).join('; ') || 'Import failed.' : result.error}
              </div>
              <button type="button" onClick={props.onRetry} style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
            </div>
          ) : result.locations.length === 1 && result.failures.length === 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 19, background: 'rgba(16,209,119,0.13)', border: '1px solid rgba(16,209,119,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10d177" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8' }}>Import complete</div>
              </div>
              <ImportResultBody view={result.locations[0]} />
              {result.notice && (
                <div style={{ fontSize: 12.5, color: '#ffd07a', background: 'rgba(255,200,90,0.1)', border: '1px solid rgba(255,200,90,0.28)', borderRadius: 8, padding: '8px 12px', margin: '4px 0 10px' }}>{result.notice}</div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={props.onCancel} style={{ padding: '13px 18px', borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Done</button>
                <button type="button" onClick={() => props.onOpenLocation(result.locations[0].locId)} style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Open location</button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>Import complete</div>
              <div style={{ fontSize: 13, color: '#9fc0db', marginBottom: 14 }}>
                Imported {result.locations.length} of {result.locations.length + result.failures.length} requests.
              </div>
              {result.notice && (
                <div style={{ fontSize: 12.5, color: '#ffd07a', background: 'rgba(255,200,90,0.1)', border: '1px solid rgba(255,200,90,0.28)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{result.notice}</div>
              )}
              {result.locations.map((v, i) => (
                <ImportResultAccordion key={v.locId ?? `loc-${i}`} view={v} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} onOpenLocation={props.onOpenLocation} />
              ))}
              {result.failures.length > 0 && (
                <div style={{ borderRadius: 10, border: '1px solid rgba(255,71,87,0.3)', background: 'rgba(255,71,87,0.08)', padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ff8a93', marginBottom: 6 }}>{result.failures.length} failed</div>
                  {result.failures.map((f, i) => (
                    <div key={`${f.filename}-${i}`} style={{ fontSize: 12, color: '#cdd9e6', marginBottom: 2 }}>{f.filename} — {f.error}</div>
                  ))}
                </div>
              )}
              <button type="button" onClick={props.onCancel} style={{ width: '100%', padding: 13, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </>
          )}
        </div>
      )}
    </ModalShell>
  )
}
