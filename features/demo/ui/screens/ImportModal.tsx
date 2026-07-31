'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { PickerStage } from '@/features/demo/ui/screens/import/PickerStage'
import { PasteStage, PASTE_COPY } from '@/features/demo/ui/screens/import/PasteStage'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import { ImportResultAccordion } from '@/features/demo/ui/screens/ImportResultAccordion'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'
import { ImportTerminalProgress, type TerminalOutcome } from '@/features/demo/ui/screens/import/ImportTerminalProgress'
import type {
  ImportStageId as RunStageId,
  ImportRealStageId,
  ImportErrorCode,
  ImportErrorDetails,
  ImportPartialData,
} from '@/features/demo/ui/import/run-import'
import type { ImportLogBus } from '@/features/demo/engine/logic/import-log'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

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
  | {
      ok: false
      error: string
      failures?: ImportFailure[]
      /** Single-run enrichment (row 79): keys the friendly ERROR_MESSAGES copy. */
      code?: ImportErrorCode
      /** Raw failure context — rendered in the collapsible "Technical Details" block. */
      details?: ImportErrorDetails
      /** What the pipeline DID find — rendered in the "Data Found" block. */
      partialData?: ImportPartialData
    }

/**
 * Friendly message per failure code — the phone's ERROR_MESSAGES pattern
 * (ImportFlowModal.tsx:82-94), rebuilt over the demo's REAL failure modes instead
 * of copying the phone's JSON-import codes (the demo has no JSON import; owner
 * decision D5). PDF_SCANNED and NO_FIELDS_FOUND are deliberately absent: their
 * pipeline messages are already the honest user-facing copy, so the fallback
 * `ERROR_MESSAGES[code] || error` renders them verbatim — the phone's own
 * precedent for PDF codes (§5.7.8). Render rule matches the phone exactly:
 * `ERROR_MESSAGES[result.error.code] || result.error.message` (:328-330).
 *
 * Keyed by the code union (p1-review R-8): a typo'd/renamed code is a compile
 * error, and reads honestly type `string | undefined` — the `|| result.error`
 * fallback is visibly load-bearing for the deliberately unmapped codes.
 */
export const ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>> = {
  PDF_READ_FAILED: 'This PDF could not be read. It may be corrupted or password-protected.',
  MODEL_OUTPUT_UNPARSEABLE: "The model's reply couldn't be read as form data. Please try the import again.",
}

export type ImportStageId = 'picker' | 'paste' | 'progress' | 'result'

export interface ImportModalProps {
  stage: ImportStageId
  text: string
  /** The pipeline's coarse stage (run-import onStage) — drives the terminal's headline/bar. */
  activeStage: RunStageId | null
  /** The last real (non-error) stage — the terminal freezes its bar here on failure (R-11). */
  lastRealStage: ImportRealStageId | null
  result: ImportResult | null
  /** 1-based batch position, shown in the terminal's processing badge ("File 2 of 3 · …"). */
  batch: { current: number; total: number } | null
  /** A validated all-PDF selection from the picker stage (1..n files). */
  onPdfFilesSelected(files: File[]): void | Promise<void>
  /** Non-empty clipboard text — routed to the same AI pipeline as the paste stage (D5). */
  onClipboardText(text: string): void | Promise<void>
  onChoosePaste(): void
  onTextChange(value: string): void
  onRun(): void
  onBack(): void
  onRetry(): void
  onOpenLocation(locId: string | null): void
  onCancel(): void
  /**
   * Fired by the terminal's outcome CTA — the dwell's ONLY exit (p1-review R-4):
   * computeImportStage holds 'progress' until the acknowledge this callback writes,
   * so an omitted/no-op handler would leave the CTA clicking into nothing forever.
   * REQUIRED for exactly that reason.
   */
  onReviewImport(): void
  /** Test seam forwarded to the terminal — defaults to the singleton import log bus. */
  logBus?: ImportLogBus
  /** Test seam forwarded to PickerStage — defaults to navigator.clipboard.readText. */
  readClipboardText?(): Promise<string>
}

/**
 * ImportResult → the terminal's outcome union. null result = still running. The
 * counts follow the phone's derivation (cases.tsx:949-967): every file failed →
 * failure (no counts); some failed → amber partial; else success. LIVE since the
 * P1.5 dwell: computeImportStage keeps the modal on 'progress' after the result
 * lands, so this derivation is what morphs the badge into the outcome CTA the
 * visitor must tap to reach the result view.
 */
export function deriveTerminalOutcome(result: ImportResult | null): TerminalOutcome | null {
  if (result === null) return null
  if (!result.ok) return { status: 'failure' }
  const successCount = result.locations.length
  const totalFiles = successCount + result.failures.length
  if (result.failures.length === 0) return { status: 'success', successCount, totalFiles }
  return { status: 'partial', successCount, totalFiles }
}

// Shared result-action button styles (override padding/width per use).
const secondaryBtn: CSSProperties = { ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }
const primaryBtn: CSSProperties = { ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }

const stmono = "var(--font-stmono),'Share Tech Mono',monospace"

/**
 * Collapsible raw-failure context — the phone's "Technical Details" block
 * (ImportFlowModal.tsx:332-352): chevron toggle, collapsed by default, content =
 * JSON.stringify(details, null, 2) in a mono face.
 */
function TechnicalDetails({ details }: { details: ImportErrorDetails }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ width: '100%', textAlign: 'left' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="import-technical-details"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#99badd' }}>Technical Details</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <pre
          id="import-technical-details"
          data-testid="import-technical-details"
          style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: 8, background: '#0a1626', border: GLASS.borderSoft, fontFamily: stmono, fontSize: 11, lineHeight: '16px', color: '#8aa3bd', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  )
}

/**
 * "Data Found" — the phone's partial-extraction block (ImportFlowModal.tsx:353-368),
 * label verbatim: what the pipeline honestly recovered before the run failed. The
 * phone's second row ('Business:') is deliberately not ported — that value is
 * structurally unreachable in the demo pipeline (R-30, see ImportPartialData's doc).
 */
function DataFoundCard({ partial }: { partial: ImportPartialData }) {
  if (!partial.caseNumber) return null
  return (
    <div data-testid="import-data-found" style={{ width: '100%', textAlign: 'left', borderRadius: 10, border: GLASS.borderSoft, background: 'rgba(26,45,68,0.45)', padding: '10px 12px' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#99badd', marginBottom: 6 }}>Data Found</div>
      <div style={{ fontSize: 13, color: '#f0f4f8' }}>Case Number: {partial.caseNumber}</div>
    </div>
  )
}

/** Per-file failures, shown identically in the all-failed view and a partial batch. */
function FailuresCard({ failures }: { failures: ImportFailure[] }) {
  return (
    <div style={{ borderRadius: 10, border: GLASS.borderError, background: 'rgba(255,71,87,0.08)', padding: '10px 12px', marginBottom: 10, textAlign: 'left' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#ff8a93', marginBottom: 6 }}>{failures.length} failed</div>
      {failures.map((f, i) => (
        <div key={`${f.filename}-${i}`} style={{ fontSize: 12, color: '#cdd9e6', marginBottom: 2 }}>{f.filename} — {f.error}</div>
      ))}
    </div>
  )
}

export function ImportModal(props: ImportModalProps) {
  const { stage, text, activeStage, lastRealStage, result, batch } = props
  const [openIndex, setOpenIndex] = useState(-1) // batch accordions, single-open (-1 = all collapsed)
  // Reset on a new result so a stale index can't pre-expand the wrong accordion after Retry (H1).
  useEffect(() => setOpenIndex(-1), [result])
  return (
    <ModalShell
      // Paste step gets the phone's own header: chevron-back · "Paste Request Text" · close
      // (ImportPickerModal.tsx:641-662); every other stage keeps the picker title.
      title={stage === 'paste' ? PASTE_COPY.title : 'Import Recovery Request'}
      onBack={stage === 'paste' ? props.onBack : undefined}
      backLabel={PASTE_COPY.backLabel}
      onClose={props.onCancel}
    >
      {stage === 'picker' && (
        <PickerStage
          onPdfFilesSelected={props.onPdfFilesSelected}
          onClipboardText={props.onClipboardText}
          onChoosePaste={props.onChoosePaste}
          onCancel={props.onCancel}
          readClipboardText={props.readClipboardText}
        />
      )}

      {stage === 'paste' && <PasteStage text={text} onTextChange={props.onTextChange} onRun={props.onRun} />}

      {stage === 'progress' && (
        // The live terminal IS the progress screen (phone-inventory §5.7, web note 1) —
        // it replaced the old 3-row checklist. It carries its own live region + progressbar.
        <ImportTerminalProgress
          stage={activeStage}
          lastRealStage={lastRealStage}
          outcome={deriveTerminalOutcome(result)}
          batch={batch}
          onReview={props.onReviewImport}
          bus={props.logBus}
        />
      )}

      {stage === 'result' && result && (
        <div style={{ paddingTop: 4 }}>
          {!result.ok ? (
            // Failure card (row 79). The phone's ErrorOrDryRunContent also renders a
            // dry-run/validation-only view — deliberately NOT ported: the demo has no
            // JSON import and no validate-only mode, so there is nothing to dry-run.
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, paddingTop: 16 }}>
              <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
              {/* Phone render rule (:328-330): friendly map by code, else the pipeline's own honest string. */}
              <div role="status" aria-live="polite" style={{ fontSize: 15, color: '#ff8a93', lineHeight: 1.5 }}>
                {(result.code && ERROR_MESSAGES[result.code]) || result.error}
              </div>
              {result.details && <TechnicalDetails details={result.details} />}
              {result.partialData && <DataFoundCard partial={result.partialData} />}
              {result.failures && result.failures.length > 0 && <div style={{ width: '100%' }}><FailuresCard failures={result.failures} /></div>}
              <button type="button" onClick={props.onRetry} style={{ ...secondaryBtn, padding: '12px 24px' }}>Try again</button>
            </div>
          ) : result.locations.length === 1 && result.failures.length === 0 ? (
            <>
              <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
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
                <button type="button" onClick={props.onCancel} style={{ ...secondaryBtn, padding: '13px 18px' }}>Done</button>
                <button type="button" onClick={() => props.onOpenLocation(result.locations[0].locId)} style={{ ...primaryBtn, flex: 1, padding: 13 }}>Open location</button>
              </div>
            </>
          ) : (
            <>
              <div role="status" aria-live="polite">
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8', marginBottom: 4 }}>Import complete</div>
                <div style={{ fontSize: 13, color: '#9fc0db', marginBottom: 14 }}>
                  Imported {result.locations.length} of {result.locations.length + result.failures.length} requests.
                </div>
              </div>
              {result.notice && (
                <div style={{ fontSize: 12.5, color: '#ffd07a', background: 'rgba(255,200,90,0.1)', border: '1px solid rgba(255,200,90,0.28)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{result.notice}</div>
              )}
              {result.locations.map((v, i) => (
                <ImportResultAccordion key={v.locId ?? `loc-${i}`} view={v} open={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} onOpenLocation={props.onOpenLocation} />
              ))}
              {result.failures.length > 0 && <FailuresCard failures={result.failures} />}
              <button type="button" onClick={props.onCancel} style={{ ...secondaryBtn, width: '100%', padding: 13 }}>Done</button>
            </>
          )}
        </div>
      )}
    </ModalShell>
  )
}
