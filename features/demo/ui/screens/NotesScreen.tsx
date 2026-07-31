'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { NoteSectionId } from '@/features/demo/engine/types'
import type { NoteSectionMeta } from '@/features/demo/engine/logic/notes'
// R-22: the store's own mode unions (via the engine barrel — exported for exactly this
// call site), never re-declared inline: a widened store union must reach this surface
// as a compile error, not compile clean while the UI can never emit the new member.
import type { RestoreAllMode, ScrapAllMode } from '@/features/demo/engine'
import { WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'

/**
 * The Notes screen — the phone's seven-section notes editor (P2.1, ui-mapping 08
 * "Notes Screen"). A forced-dark terminal-style panel over independently-tracked
 * sections: the paragraph IS the editor (tap to edit), edits commit on blur AND
 * unmount, per-section reset/restore, addendum sub-lines, the taken-over banner,
 * and the Copy all / "Write my own notes…" footer. All state flows in via props;
 * all intent flows out via the flow callbacks (store bridge in DemoExperience).
 *
 * Deviation from the old demo screen, per the phone spec: there is NO "Regenerate"
 * button — regeneration is automatic on screen entry (Flow A reconcile, wired by the
 * bridge) and per-section via "Reset to auto-generated" (ui-mapping 08 lists no
 * Regenerate affordance).
 */

export interface NotesScreenProps {
  /** Per-section view model (buildNotesSectionMeta), stored/registry order. */
  sections: NoteSectionMeta[]
  /** COMMITTED free-text tail. */
  freeText: string
  /** COMMITTED assembled notes for "Copy all" — like the phone, this reads committed
   *  store values, so a tap mid-edit can be one uncommitted keystroke stale
   *  (documented, accepted micro-edge — ui-mapping 08). */
  copyAllText: string
  onCommitSection(id: NoteSectionId, text: string): void
  onCommitAddendum(id: NoteSectionId, text: string): void
  onResetSection(id: NoteSectionId): void
  onScrapAll(mode: ScrapAllMode): void
  onRestoreAll(mode: RestoreAllMode): void
  onCommitFreeText(text: string): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

// Forced-dark terminal panel tokens (ui-mapping 08: PANEL_BG dark #060a12, border #141c28).
const PANEL_BG = '#060a12'
const PANEL_BORDER = '1px solid #141c28'
const TEXT = '#dfe9f3'
const DIM = '#7a93ad'
const PRIMARY = '#4BA3D4'
const WARNING = '#ffd93d'
const MONO = "var(--font-jbmono),'JetBrains Mono',monospace"

const bodyText: CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  resize: 'none',
  background: 'transparent',
  color: TEXT,
  fontSize: 13,
  lineHeight: '24px',
  padding: 0,
  fontFamily: MONO,
  overflow: 'hidden',
}

const linkBtn: CSSProperties = {
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  padding: 0,
  fontSize: 12.5,
  fontWeight: 600,
  color: PRIMARY,
  fontFamily: 'inherit',
}

/** Auto-grow a textarea to its content (the paragraph-is-the-editor illusion). */
function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [ref, value])
}

// ---- Section block -----------------------------------------------------------------

interface SectionBlockProps {
  meta: NoteSectionMeta
  onCommitSection(id: NoteSectionId, text: string): void
  onCommitAddendum(id: NoteSectionId, text: string): void
  /** Opens the confirm dialog (reset for edited/stale, restore for deleted+stale). */
  onRequestReset(id: NoteSectionId, label: string, deleted: boolean): void
}

/** One notes section: paragraph-as-editor, edited/stale rails, stale preview panel,
 *  deleted restore row, and the addendum sub-input. Memo'd — free-text keystrokes
 *  re-render the parent editor. */
const SectionBlock = memo(function SectionBlock({
  meta,
  onCommitSection,
  onCommitAddendum,
  onRequestReset,
}: SectionBlockProps) {
  const [draft, setDraft] = useState(meta.content)
  const [focused, setFocused] = useState(false)
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [addendumDraft, setAddendumDraft] = useState(meta.userAddendum ?? '')
  const [addendumFocused, setAddendumFocused] = useState(false)

  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const addendumRef = useRef<HTMLTextAreaElement | null>(null)
  useAutoGrow(bodyRef, draft)
  useAutoGrow(addendumRef, addendumDraft)

  // Draft syncs from committed content ONLY while unfocused (a focused block is never
  // re-synced; re-syncing on blur would flash pre-commit text).
  useEffect(() => {
    if (!focused) setDraft(meta.content)
  }, [meta.content, focused])
  useEffect(() => {
    if (!addendumFocused) setAddendumDraft(meta.userAddendum ?? '')
  }, [meta.userAddendum, addendumFocused])

  // Commit on blur AND unmount — a ref mirror keeps the unmount closure fresh.
  // Double-fire is safe: commits no-op against stored content.
  const flushRef = useRef<() => void>(() => undefined)
  flushRef.current = () => {
    onCommitSection(meta.id, draft)
    if (addendumOpen || (meta.userAddendum ?? '') !== '') onCommitAddendum(meta.id, addendumDraft)
  }
  useEffect(() => () => flushRef.current(), [])

  const isDeleted = meta.manuallyEdited && meta.content === ''
  const isEmptyAuto = !meta.manuallyEdited && meta.content === ''
  const hasAddendum = addendumOpen || (meta.userAddendum ?? '') !== ''

  const addendumInput = (
    <textarea
      ref={addendumRef}
      rows={1}
      value={addendumDraft}
      placeholder="Note for this section"
      aria-label={`Note added to ${meta.label}`}
      autoFocus={addendumOpen && (meta.userAddendum ?? '') === ''}
      onChange={(e) => setAddendumDraft(e.target.value)}
      onFocus={() => setAddendumFocused(true)}
      onBlur={() => {
        setAddendumFocused(false)
        onCommitAddendum(meta.id, addendumDraft)
        if (addendumDraft.trim() === '') setAddendumOpen(false) // empty blur closes it again
      }}
      style={{ ...bodyText, fontSize: 12.5, color: '#a9c2d8', borderLeft: '2px solid rgba(122,147,173,0.4)', paddingLeft: 10, marginTop: 6 }}
    />
  )

  // Deleted: body hidden. Compact restore row only when stale; addendum still renders.
  if (isDeleted) {
    if (!meta.stale && !hasAddendum) return null
    return (
      <div style={{ marginBottom: 24 }}>
        {meta.stale && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: DIM }}>{meta.label}</span>
            <span style={{ fontSize: 12, color: DIM }}>wizard has new content for this section</span>
            <button type="button" style={linkBtn} onClick={() => onRequestReset(meta.id, meta.label, true)}>
              Restore
            </button>
          </div>
        )}
        {hasAddendum && addendumInput}
      </div>
    )
  }

  // Empty auto section: hidden — unless it carries an addendum.
  if (isEmptyAuto && !hasAddendum) return null

  const rail: CSSProperties = meta.manuallyEdited
    ? {
        borderLeft: `3px solid ${meta.stale ? 'rgba(255,217,61,0.9)' : 'rgba(75,163,212,0.55)'}`,
        paddingLeft: 10,
      }
    : {}

  return (
    <div style={{ marginBottom: 24, ...rail }}>
      {!isEmptyAuto && (
        <textarea
          ref={bodyRef}
          rows={1}
          value={draft}
          aria-label={meta.label}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onCommitSection(meta.id, draft)
          }}
          style={bodyText}
        />
      )}
      {meta.stale && (
        <div style={{ marginTop: 10, borderRadius: 10, border: '1px solid rgba(255,217,61,0.25)', background: 'rgba(255,217,61,0.06)', padding: '10px 12px' }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.2, color: WARNING, marginBottom: 6 }}>
            SOURCE DATA CHANGED — AUTO-GENERATED WOULD NOW READ
          </div>
          <div style={{ fontSize: 12.5, lineHeight: '20px', color: '#c7d6e4', whiteSpace: 'pre-wrap', fontFamily: MONO, marginBottom: 8 }}>
            {meta.freshContent}
          </div>
          <button type="button" style={linkBtn} onClick={() => onRequestReset(meta.id, meta.label, false)}>
            Reset to auto-generated
          </button>
        </div>
      )}
      {hasAddendum ? (
        addendumInput
      ) : (
        <button
          type="button"
          onClick={() => setAddendumOpen(true)}
          style={{ ...linkBtn, color: DIM, opacity: 0.5, fontWeight: 500, marginTop: 4 }}
        >
          + add note
        </button>
      )}
    </div>
  )
})

// ---- The screen --------------------------------------------------------------------

type DialogState =
  | { kind: 'reset'; id: NoteSectionId; label: string }
  | { kind: 'restoreSection'; id: NoteSectionId; label: string }
  | { kind: 'restoreAll' }
  | { kind: 'scrapAll' }
  | null

export function NotesScreen({
  sections,
  freeText,
  copyAllText,
  onCommitSection,
  onCommitAddendum,
  onResetSection,
  onScrapAll,
  onRestoreAll,
  onCommitFreeText,
  onNext,
  onBack,
  onMenu,
}: NotesScreenProps) {
  const [dialog, setDialog] = useState<DialogState>(null)
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle')

  // Free-text draft: same commit-on-blur-and-unmount contract as the sections.
  const [freeDraft, setFreeDraft] = useState(freeText)
  const [freeFocused, setFreeFocused] = useState(false)
  const freeRef = useRef<HTMLTextAreaElement | null>(null)
  useAutoGrow(freeRef, freeDraft)
  useEffect(() => {
    if (!freeFocused) setFreeDraft(freeText)
  }, [freeText, freeFocused])
  const freeFlushRef = useRef<() => void>(() => undefined)
  freeFlushRef.current = () => onCommitFreeText(freeDraft)
  useEffect(() => () => freeFlushRef.current(), [])

  const allTakenOver = sections.length > 0 && sections.every((s) => s.manuallyEdited)

  // R-12: the reset timer is tracked — re-arming clears the previous handle (rapid
  // copies keep the LATEST confirmation on screen for its full window) and unmount
  // clears the pending one (the syncTimer/PdfPreview idiom).
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
    },
    [],
  )
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(copyAllText)
      setCopied('done')
    } catch {
      setCopied('failed') // honest: no fake success when the browser blocks clipboard
    }
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied('idle'), 1600)
  }

  // All six Notes confirmations route through the shared AlertDialog primitive (R-5 —
  // the §39.1 consolidation): full a11y contract (labelledby + describedby, focus
  // in/out) and the demo's blocking-dialog semantics (inert scrim, Escape cancels) come
  // from the primitive. Copy and button order stay phone-verbatim (ui-mapping 08);
  // Cancel is an explicit action, as the phone's Alert.alert declares it.
  const closeDialog = useCallback(() => setDialog(null), [])
  // R-14: stable identity so SectionBlock's memo holds (a fresh arrow per render was
  // defeating it — every parent keystroke re-rendered all seven blocks).
  const requestReset = useCallback(
    (id: NoteSectionId, label: string, deleted: boolean) =>
      setDialog(deleted ? { kind: 'restoreSection', id, label } : { kind: 'reset', id, label }),
    [],
  )
  const act = (fn: () => void) => () => {
    setDialog(null)
    fn()
  }
  let dialogNode: ReactNode = null
  if (dialog?.kind === 'reset') {
    dialogNode = (
      <AlertDialog
        title="Reset to auto-generated?"
        message={`Your text for "${dialog.label}" will be replaced by the current auto-generated version. A note you added is kept.`}
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: closeDialog },
          { label: 'Reset', style: 'destructive', onPress: act(() => onResetSection(dialog.id)) },
        ]}
        onDismiss={closeDialog}
      />
    )
  } else if (dialog?.kind === 'restoreSection') {
    dialogNode = (
      <AlertDialog
        title="Restore this section?"
        message={`"${dialog.label}" will return to auto-generated content.`}
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: closeDialog },
          { label: 'Restore', onPress: act(() => onResetSection(dialog.id)) },
        ]}
        onDismiss={closeDialog}
      />
    )
  } else if (dialog?.kind === 'restoreAll') {
    // The phone branches on the free-text DRAFT (ui-mapping 08): with text present the
    // restore offers keep-vs-clear; empty free text restores directly ('keep').
    dialogNode = freeDraft.trim() !== '' ? (
      <AlertDialog
        title="Restore auto-generated notes?"
        message="Every section returns to auto-generated content; sections you rewrote will be replaced. If you started from your current notes, keeping Additional Notes may repeat the restored sections."
        actions={[
          { label: 'Restore & keep my notes', onPress: act(() => onRestoreAll('keep')) },
          { label: 'Restore & clear additional notes', style: 'destructive', onPress: act(() => onRestoreAll('clear')) },
          { label: 'Cancel', style: 'cancel', onPress: closeDialog },
        ]}
        onDismiss={closeDialog}
      />
    ) : (
      <AlertDialog
        title="Restore auto-generated notes?"
        message="Every section returns to auto-generated content. Sections you rewrote will be replaced."
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: closeDialog },
          { label: 'Restore', onPress: act(() => onRestoreAll('keep')) },
        ]}
        onDismiss={closeDialog}
      />
    )
  } else if (dialog?.kind === 'scrapAll') {
    dialogNode = (
      <AlertDialog
        title="Write your own notes?"
        message="Auto-generation stops for every section. You can restore the auto-generated notes at any time."
        actions={[
          { label: 'Start from current notes', onPress: act(() => onScrapAll('current')) },
          { label: 'Start blank', style: 'destructive', onPress: act(() => onScrapAll('blank')) },
          { label: 'Cancel', style: 'cancel', onPress: closeDialog },
        ]}
        onDismiss={closeDialog}
      />
    )
  }

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Case Notes" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {/* Terminal-dark editor panel — the page's only scrollable (ui-mapping 08). */}
        <div style={{ borderRadius: 12, border: PANEL_BORDER, background: PANEL_BG, height: 500, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14, marginBottom: 10 }}>
          {allTakenOver && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 10, border: '1px solid rgba(30,58,95,0.6)', background: 'rgba(13,27,42,0.7)', padding: '9px 12px', marginBottom: 16 }}>
              <span style={{ fontSize: 12.5, color: '#a9c2d8' }}>Auto-generation is off — restore anytime</span>
              <button type="button" style={linkBtn} onClick={() => setDialog({ kind: 'restoreAll' })}>
                Restore
              </button>
            </div>
          )}
          {sections.map((meta) => (
            <SectionBlock
              key={meta.id}
              meta={meta}
              onCommitSection={onCommitSection}
              onCommitAddendum={onCommitAddendum}
              onRequestReset={requestReset}
            />
          ))}
          <textarea
            ref={freeRef}
            rows={2}
            value={freeDraft}
            placeholder="Additional notes"
            aria-label="Additional notes"
            onChange={(e) => setFreeDraft(e.target.value)}
            onFocus={() => setFreeFocused(true)}
            onBlur={() => {
              setFreeFocused(false)
              onCommitFreeText(freeDraft)
            }}
            style={{ ...bodyText, minHeight: 48 }}
          />
        </div>
        {/* Sticky footer actions (outside the scrollable inset, above Next). */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 12px' }}>
          <button type="button" aria-label="Copy all notes" style={linkBtn} onClick={copyAll}>
            {copied === 'idle' ? 'Copy all' : copied === 'done' ? 'Copied ✓' : 'Copy failed'}
          </button>
          <button type="button" style={{ ...linkBtn, color: '#99badd' }} onClick={() => setDialog({ kind: 'scrapAll' })}>
            Write my own notes…
          </button>
        </div>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
      {dialogNode}
    </div>
  )
}
