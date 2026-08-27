'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode, Ref } from 'react'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { Banner } from '@/features/demo/ui/controls/Banner'

/**
 * Import picker — step 1 of the phone's ImportPickerModal, ported for P1.2 (matrix row 71).
 *
 * Copy is lifted from the phone source (src/features/import/json-import/components/
 * ImportPickerModal.tsx) — verbatim where the demo genuinely has the path, adapted where it
 * doesn't (owner decision D5: the demo has NO JSON import; honesty beats copy-parity).
 * Every adapted string cites the phone original beside it.
 *
 * Presentational only: files/text go up through callbacks; the store bridge (DemoExperience)
 * owns the pipeline. Error/loading/confirm state is local UI state, exactly as on the phone.
 */

export const PICKER_COPY = {
  pickFileTitle: 'Pick File', // ImportPickerModal.tsx:804
  // Phone (:812-814): 'Choose a JSON or PDF recovery file from your device'. D5: the demo
  // imports PDF only — say so honestly instead of promising a JSON path that doesn't exist.
  pickFileDescription: 'Choose a PDF recovery file from your device',
  clipboardTitle: 'Paste from Clipboard', // ImportPickerModal.tsx:852
  // Phone (:860): 'Paste recovery export from clipboard' — that is the JSON-only path.
  // The demo's clipboard feeds the pasted-text AI pipeline instead (D5) — describe that.
  clipboardDescription: 'Paste copied request text straight from your clipboard',
  pasteTextTitle: 'Paste Text', // ImportPickerModal.tsx:900
  pasteTextDescription: 'Paste a request email or notes — AI fills the form', // :908
  cancel: 'Cancel', // :923
  // Phone (:253): 'Unsupported file type. Please select JSON or PDF files.' — D5-adapted.
  // PDF is the demo's only file path, so a mixed selection is also just 'unsupported'.
  unsupportedType: 'Unsupported file type. Please select PDF files.',
  fileReadFailed: 'Failed to read file. Please try again.', // :554 verbatim
  // Phone (:590): 'Clipboard is empty. Copy JSON content first.' — the demo path is text.
  clipboardEmpty: 'Clipboard is empty. Copy the request text first.',
  // No phone equivalent (expo-clipboard needs no permission). Honest browser treatment:
  // navigator.clipboard.readText is missing or denied → say so, point at the card that works.
  clipboardBlocked: 'Clipboard access is blocked in this browser — use Paste Text instead.',
  textImportFailed: 'Failed to start text import. Please try again.', // :175 verbatim
  largeBatchTitle: 'Large Batch Import', // :311
  largeBatchMessage: (n: number) => `You selected ${n} files. Import may take several minutes. Continue?`, // :312
  largeBatchContinue: 'Continue', // :315
} as const

/** Phone parity: BATCH_SIZE_WARNING_THRESHOLD = 25 (ImportPickerModal.tsx:42). */
export const BATCH_SIZE_WARNING_THRESHOLD = 25

/** mimeType first, then extension — adapted from the phone's getFileType (ImportPickerModal.tsx:65-76). */
function isPdfFile(file: File): boolean {
  if (file.type.toLowerCase() === 'application/pdf') return true
  return file.name.toLowerCase().split('.').pop() === 'pdf'
}

/** Browser clipboard read; rejects when the API is unavailable (http, jsdom) or permission-denied. */
function defaultReadClipboardText(): Promise<string> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
    return Promise.reject(new Error('Clipboard API unavailable'))
  }
  return navigator.clipboard.readText()
}

export interface PickerStageProps {
  /** A validated all-PDF selection (1..n files). The parent runs the pipeline + closes stages. */
  onPdfFilesSelected(files: File[]): void | Promise<void>
  /** Non-empty clipboard text — fed to the same AI pipeline as the Paste Text step (D5). */
  onClipboardText(text: string): void | Promise<void>
  onChoosePaste(): void
  onCancel(): void
  /** Injectable clipboard reader (test seam) — defaults to navigator.clipboard.readText. */
  readClipboardText?(): Promise<string>
}

// Phone actionCard: minHeight 180, centered icon @48 + title + description (ImportPickerModal.tsx:969-988).
const actionCard: CSSProperties = {
  minHeight: 180,
  borderRadius: 14,
  border: GLASS.borderAccent,
  background: GLASS.gradientPanel,
  padding: 22,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  gap: 9,
  width: '100%',
}

const ICON_STROKE = '#5AB4E6'
const DISABLED_STROKE = '#5d7a9a'

/** Per-render reduced-motion check (review R-14). Deliberately NOT motion/react's
 *  useReducedMotion: that hook caches its matchMedia subscription module-globally
 *  (motion-dom's hasReducedMotionListener), which buys nothing for a spinner that only
 *  exists for the seconds a read is in flight — and a direct read is correct on the very
 *  first frame (no armed-animation flash) and honors the suite's per-test overrides. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Spinner({ testId }: { testId: string }) {
  // Reduced motion keeps the static arc (the card also carries aria-busy) — motion is
  // the only thing gated, matching the terminal's cursor/CTA treatment.
  const reduce = prefersReducedMotion()
  return (
    <svg
      data-testid={testId}
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={ICON_STROKE}
      strokeWidth="2.5"
      style={{ animation: reduce ? undefined : 'spin 0.9s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
    </svg>
  )
}

/** One glass action card: icon @48 · title · description · optional busy spinner. */
function ActionCard({
  icon,
  title,
  description,
  busy,
  busyTestId,
  disabled,
  onClick,
  ref,
}: {
  icon: ReactNode
  title: string
  description: string
  busy?: boolean
  /** data-testid for the busy spinner (phone testID parity, phone-inventory §5.2). */
  busyTestId?: string
  disabled: boolean
  onClick(): void
  /** React 19 ref-as-prop — used by the R-17 focus restores. */
  ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      style={{ ...actionCard, cursor: disabled ? 'default' : 'pointer' }}
    >
      {icon}
      <div style={{ fontSize: 17, fontWeight: 600, color: disabled ? DISABLED_STROKE : '#f0f4f8' }}>{title}</div>
      <div style={{ fontSize: 13, color: disabled ? DISABLED_STROKE : '#9fc0db', lineHeight: 1.45 }}>{description}</div>
      {busy && <Spinner testId={busyTestId ?? 'picker-loading-indicator'} />}
    </button>
  )
}

export function PickerStage(props: PickerStageProps) {
  const readClipboard = props.readClipboardText ?? defaultReadClipboardText
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [isReadingClipboard, setIsReadingClipboard] = useState(false)
  // The >25-file confirm (phone: native Alert.alert, ImportPickerModal.tsx:308-334). The browser
  // has no honest equivalent of a native alert, so the confirm replaces the card list in place.
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)

  // R-17 focus management. Opening the confirm unmounts the just-activated "Pick File"
  // card (focus would drop to <body>), so the confirm takes focus on mount; cancelling it
  // hands focus back to the card. The clipboard card is disabled while its read is in
  // flight — a failure re-enables it, and focus returns to it so a keyboard user isn't
  // stranded on <body> while the role="alert" banner announces.
  const confirmRef = useRef<HTMLDivElement | null>(null)
  const fileCardRef = useRef<HTMLButtonElement | null>(null)
  const clipboardCardRef = useRef<HTMLButtonElement | null>(null)
  const confirmWasOpen = useRef(false)
  const clipboardErrored = useRef(false)
  useEffect(() => {
    const open = pendingFiles !== null
    if (open) confirmRef.current?.focus()
    else if (confirmWasOpen.current) fileCardRef.current?.focus()
    confirmWasOpen.current = open
  }, [pendingFiles])
  useEffect(() => {
    if (!isReadingClipboard && clipboardErrored.current) {
      clipboardErrored.current = false
      clipboardCardRef.current?.focus()
    }
  }, [isReadingClipboard])

  const isLoading = isReadingFile || isReadingClipboard

  const startPdfImport = async (files: File[]) => {
    setIsReadingFile(true)
    try {
      await props.onPdfFilesSelected(files)
    } catch (e) {
      // Backstop, mirroring the phone's general file-read catch (:545-554); the parent
      // pipeline normally converts its own failures into a result-stage failure card.
      // Breadcrumb first (review R-23a): in production the parent flips the stage and
      // unmounts this component before a pipeline throw lands here, so React discards
      // the setError below — the console line is then the ONLY signal the run threw.
      // The pipeline-level backstop that releases the dwell lives in DemoExperience.
      console.error('[demo/import] import run threw', e)
      setError(PICKER_COPY.fileReadFailed)
    } finally {
      setIsReadingFile(false)
    }
  }

  const handleFilesChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same file
    if (files.length === 0) return
    setError(null)
    if (!files.every(isPdfFile)) {
      setError(PICKER_COPY.unsupportedType)
      return
    }
    if (files.length > BATCH_SIZE_WARNING_THRESHOLD) {
      setPendingFiles(files)
      return
    }
    await startPdfImport(files)
  }

  const handlePasteClipboard = async () => {
    setError(null)
    setIsReadingClipboard(true)
    try {
      let text: string
      try {
        text = await readClipboard()
      } catch {
        clipboardErrored.current = true // R-17: restore focus to the card once re-enabled
        setError(PICKER_COPY.clipboardBlocked)
        return
      }
      if (!text.trim()) {
        clipboardErrored.current = true
        setError(PICKER_COPY.clipboardEmpty)
        return
      }
      try {
        await props.onClipboardText(text)
      } catch (e) {
        // Clipboard text feeds the same AI pipeline as Paste Text — same backstop copy (:175).
        // Same R-23a breadcrumb as the file path: the text pipeline also unmounts this
        // stage on start, so a late throw's setError is discarded — log it.
        console.error('[demo/import] import run threw', e)
        clipboardErrored.current = true
        setError(PICKER_COPY.textImportFailed)
      }
    } finally {
      setIsReadingClipboard(false)
    }
  }

  // Large-batch confirm replaces the card list (see pendingFiles above). role="alertdialog"
  // without aria-modal: the ModalShell header (close) stays reachable, so claiming modality
  // without a focus trap would overstate; focus lands here on mount (R-17) via tabIndex -1.
  if (pendingFiles) {
    return (
      <div
        role="alertdialog"
        aria-label={PICKER_COPY.largeBatchTitle}
        aria-describedby="import-batch-confirm-message"
        tabIndex={-1}
        ref={confirmRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 14, outline: 'none' }}
      >
        <div style={{ borderRadius: 14, border: GLASS.borderAccent, background: GLASS.gradientPanel, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#f0f4f8' }}>{PICKER_COPY.largeBatchTitle}</div>
          <div id="import-batch-confirm-message" style={{ fontSize: 13, color: '#cdd9e6', lineHeight: 1.5 }}>{PICKER_COPY.largeBatchMessage(pendingFiles.length)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setPendingFiles(null)}
              style={{ flex: 1, padding: 13, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              {PICKER_COPY.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                const files = pendingFiles
                setPendingFiles(null)
                void startPdfImport(files)
              }}
              style={{ flex: 1, padding: 13, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              {PICKER_COPY.largeBatchContinue}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input
        type="file"
        accept="application/pdf,.pdf"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesChosen}
        aria-hidden="true"
        tabIndex={-1}
        ref={fileInputRef}
      />

      {/* A71/U3.3. The phone routes this exact banner through `<Banner severity="error">` at
          `ImportPickerModal.tsx:718` and `:790`, testID and all; PR #117 measured the win as
          light 3.08 -> 6.80, dark 1.92 -> 5.79. The local recipe it replaces was the family
          Banner exists to absorb: a translucent `rgba(255,71,87,0.08)` fill with the saturated
          accent family as its text, which is unmeasurable by construction. */}
      {error && <Banner severity="error" message={error} testId="import-picker-error" />}

      <ActionCard
        icon={
          <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isLoading ? DISABLED_STROKE : ICON_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6M9 17h4" />
          </svg>
        }
        title={PICKER_COPY.pickFileTitle}
        description={PICKER_COPY.pickFileDescription}
        busy={isReadingFile}
        busyTestId="file-loading-indicator"
        ref={fileCardRef}
        disabled={isLoading}
        onClick={() => fileInputRef.current?.click()}
      />

      <ActionCard
        icon={
          <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isLoading ? DISABLED_STROKE : ICON_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="3" width="8" height="4" rx="1" />
            <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        }
        title={PICKER_COPY.clipboardTitle}
        description={PICKER_COPY.clipboardDescription}
        busy={isReadingClipboard}
        busyTestId="clipboard-loading-indicator"
        ref={clipboardCardRef}
        disabled={isLoading}
        onClick={() => void handlePasteClipboard()}
      />

      <ActionCard
        icon={
          <svg aria-hidden="true" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={isLoading ? DISABLED_STROKE : ICON_STROKE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l1.5 4.5L15 11l-4.5 1.5L9 17l-1.5-4.5L3 11l4.5-1.5L9 5z" />
            <path d="M18 4l.8 2.2L21 7l-2.2.8L18 10l-.8-2.2L15 7l2.2-.8L18 4z" />
            <path d="M18.5 15l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
          </svg>
        }
        title={PICKER_COPY.pasteTextTitle}
        description={PICKER_COPY.pasteTextDescription}
        disabled={isLoading}
        onClick={props.onChoosePaste}
      />

      <button
        type="button"
        onClick={props.onCancel}
        style={{ width: '100%', padding: 13, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
      >
        {PICKER_COPY.cancel}
      </button>
    </div>
  )
}
