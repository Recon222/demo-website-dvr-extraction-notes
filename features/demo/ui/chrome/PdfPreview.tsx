'use client'

import { useEffect, useRef, useState } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

export interface PdfPreviewProps {
  title: string
  /** The real generated court-document HTML (generateCaseNotesDoc / generateTimeOffsetDoc). */
  html: string
  onClose(): void
}

/** Honest treatment when the browser refuses to open the print dialog — never a fake success. */
const PRINT_BLOCKED_NOTICE =
  'Your browser blocked the print dialog for this preview — no PDF was saved. Try again, or use a different browser.'

/**
 * Renders the real generated PDF HTML into an iframe preview (the demo's "export").
 * "Save as PDF" prints the framed document itself via its contentWindow — the native print
 * dialog's Save-as-PDF destination produces the vector-perfect court document (@page letter
 * rules live in the generated HTML), named after the document's own deterministic <title>.
 */
export function PdfPreview({ title, html, onClose }: PdfPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const saveBtnRef = useRef<HTMLButtonElement | null>(null)
  const [printNotice, setPrintNotice] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  // R-47: teardown for the in-flight print attempt (armed beforeprint listener + pending
  // verdict timer). Torn down at the start of the next attempt and on unmount — never
  // mid-attempt, so a late success signal can still retract a wrong verdict.
  const printAttemptCleanup = useRef<(() => void) | null>(null)

  // Unmount: drop the armed listener and cancel any pending verdict timer (R-47).
  useEffect(() => {
    return () => {
      printAttemptCleanup.current?.()
    }
  }, [])

  const printDocument = () => {
    // A new attempt supersedes the previous one: kill its armed listener and pending verdict
    // so an orphaned timer can never re-assert an old verdict over this attempt's outcome.
    printAttemptCleanup.current?.()
    printAttemptCleanup.current = null
    try {
      // The probe lives INSIDE the try (R-12): touching `print` on a cross-origin contentWindow
      // throws a SecurityError — the exact failure the sandbox rationale below documents — and
      // that must render the honest notice, not escape as an uncaught error.
      const win = frameRef.current?.contentWindow
      if (!win || typeof win.print !== 'function') {
        setPrintNotice(PRINT_BLOCKED_NOTICE)
        return
      }
      // Positive success signal (R-12): the printing steps fire `beforeprint` on the framed
      // window before the dialog opens. A browser that swallows the call ("Ignored call to
      // 'print()'" in Chromium) returns normally WITHOUT firing it — so absence-of-throw is
      // never treated as success, and a prior failure notice is never cleared by a second
      // failed attempt. R-36 hardens the read against the mirror failure — a definitive
      // "blocked" notice over a print that does happen:
      // (a) capability: an engine without the print events gives no positive signal at all,
      //     so degrade to absence-of-throw there instead of branding every save "blocked";
      // (b) timing: Blink/WebKit postpone the printing steps (and the beforeprint they fire)
      //     while the frame is still loading — and load can be several tasks out for a
      //     data-URI-heavy document (the time-offset report embeds the OCR capture). The
      //     verdict after one macrotask is therefore only the honest "no signal yet" reading:
      //     the listener STAYS armed afterwards, and a late signal retracts the wrong notice
      //     instead of being discarded (R-47).
      const canDetect = 'onbeforeprint' in win
      let dialogOpened = false
      const markOpened = () => {
        dialogOpened = true
        setPrintNotice(null) // the signal proves the dialog — retract any wrong "blocked" verdict
      }
      let verdictTimer: number | undefined
      win.addEventListener('beforeprint', markOpened)
      const cleanup = () => {
        win.removeEventListener('beforeprint', markOpened)
        if (verdictTimer !== undefined) window.clearTimeout(verdictTimer)
      }
      printAttemptCleanup.current = cleanup
      try {
        win.focus() // some browsers print the focused frame's parent otherwise
        win.print()
      } catch (err) {
        cleanup()
        printAttemptCleanup.current = null
        throw err // → outer catch renders the notice; a throw is a definitive verdict
      } finally {
        // R-16: win.focus() moved keyboard focus INTO the sandboxed frame — a scriptless
        // document where nothing forwards keys, so the parent document's Escape listener
        // (deferred §21) would go deaf after a save. Whatever the print attempt did (dialog,
        // throw, silent ignore), hand focus back to the parent chrome. Focusing a parent
        // element is what restores it (and implicitly blurs the frame) — window.focus()
        // requests top-level browser-window activation, moves no DOM focus, and is not
        // needed here (R-37).
        saveBtnRef.current?.focus()
      }
      if (!canDetect || dialogOpened) {
        // Settled synchronously: the success signal already fired, or no signal exists to wait
        // for (degrade to absence-of-throw). Nothing left to hear — tear the attempt down.
        cleanup()
        printAttemptCleanup.current = null
        setPrintNotice(null)
      } else {
        verdictTimer = window.setTimeout(() => {
          verdictTimer = undefined
          if (!dialogOpened) setPrintNotice(PRINT_BLOCKED_NOTICE)
          // The listener stays armed (until the next attempt or unmount): a beforeprint
          // arriving after this interim verdict retracts the notice via markOpened (R-47).
        }, 0)
      }
    } catch {
      setPrintNotice(PRINT_BLOCKED_NOTICE)
    }
  }

  // Escape closes, like every other overlay (ModalShell, WizardDrawer, PickerSheet) — deferred §21.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Focus return (deferred §21): remember the opener at mount, hand focus back on unmount so a
  // keyboard user lands back on the "Preview / Export" button they came from.
  useEffect(() => {
    const opener = document.activeElement
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  const content = (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'absolute', inset: 0, zIndex: 43, background: '#11151c', display: 'flex', flexDirection: 'column', animation: reducedMotion ? undefined : 'screenIn 0.3s ease', pointerEvents: 'auto' }}>
      <div style={{ padding: '50px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a3340' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
        <button type="button" aria-label="Close preview" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {/* The grey surround of the document page is this overlay's backdrop (the panel itself is
          full-screen, so there is no scrim like ModalShell's): clicking it — not the document —
          closes the preview, PDF-viewer style. Clicks inside the iframe never reach this handler. */}
      <div
        data-pdf-backdrop
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        style={{ flex: 1, overflow: 'hidden', padding: 14, background: '#3a3f47' }}
      >
        {/* Sandbox: exactly `allow-modals allow-same-origin` — the minimum that lets the parent
            print the framed court document; the value is PINNED by a test so it cannot silently
            widen. Why each token: (1) allow-same-origin — a fully-sandboxed srcDoc frame is an
            opaque origin, so the parent touching contentWindow.print throws a cross-origin
            SecurityError; the frame must share our origin for the parent to invoke printing on
            it. Safe because allow-scripts stays OFF: the framed document is inert, fully-escaped
            static markup, and without scripts it cannot exercise the origin grant (the dangerous
            sandbox-escape combo is allow-scripts + allow-same-origin). (2) allow-modals — the
            print dialog is a modal; a sandboxed document without it silently ignores print()
            ("Ignored call to 'print()'" in Chromium). Scripts, forms, popups, top-navigation,
            downloads and pointer-lock all remain blocked. */}
        <iframe ref={frameRef} title={title} srcDoc={html} sandbox="allow-modals allow-same-origin" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 3, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }} />
      </div>
      {printNotice && (
        <div role="status" style={{ margin: '10px 18px 0', fontSize: 12.5, color: '#ffd07a', background: 'rgba(255,200,90,0.1)', border: '1px solid rgba(255,200,90,0.28)', borderRadius: 8, padding: '8px 12px' }}>{printNotice}</div>
      )}
      <div style={{ padding: '14px 18px 24px', borderTop: '1px solid #2a3340', display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} style={{ ...buttonStyle({ variant: 'secondary' }) }}>Close</button>
        <button type="button" ref={saveBtnRef} onClick={printDocument} style={{ flex: 1, ...buttonStyle() }}>Save as PDF</button>
      </div>
    </div>
  )
  return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>
}
