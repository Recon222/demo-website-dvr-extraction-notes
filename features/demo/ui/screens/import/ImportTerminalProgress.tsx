'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  importLogBus,
  type ImportLogBus,
  type ImportLogLine,
} from '@/features/demo/engine/logic/import-log'
import { useImportLog } from '@/features/demo/ui/import/useImportLog'
import { SAMPLE_FALLBACK_PREFIX, type ImportStageId as RunStageId } from '@/features/demo/ui/import/run-import'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { TerminalLine } from '@/features/demo/ui/screens/import/TerminalLine'

/**
 * ImportTerminalProgress — the live import terminal (parity P1.4, matrix row 74).
 * Web port of the phone's `src/features/import/pdf-import/components/
 * ImportTerminalProgress.tsx`: headline + progress track + dark terminal panel
 * (title bar · log · blinking cursor · jump-to-latest pill) + the fixed-height badge
 * slot that morphs from a processing spinner into the outcome CTA.
 *
 * Renders from the import log bus via `useImportLog` (rAF-coalesced, 400-line ring).
 * Presentational: props in / callbacks out; no store imports. The terminal panel is
 * DARK regardless of site theme — phone parity ("dark in both themes by design",
 * phone-inventory §5.7.3): the demo phone frame renders the phone's dark theme, so
 * the dark-scheme screen value #060a12 applies (phone :97).
 *
 * Honesty (owner rule — never claim on-device): the phone's title bar reads
 * "pdf-import · on-device" / "nothing leaves this phone" because its model IS
 * on-device (§5.7.6). The demo's live path sends the extracted text to a cloud model
 * via the /api/extract server proxy, so the title reads "pdf-import · in-browser"
 * (pdf.js extraction is in-browser) and the trust line follows the run's actual
 * FallbackMode, derived from the bus lines themselves (run-import emits every
 * transition): cloud by default, flipping to the sample wording when a
 * `sample fallback:` line lands.
 *
 * VIRTUALIZATION — deliberately none (phone uses FlatList). The log is hard-capped
 * at 400 lines (IMPORT_LOG_MAX_LINES); rows are 3 spans of inline-styled text.
 * 400 such DOM rows are trivial for a browser (well under typical virtualization
 * thresholds), appends only MOUNT new rows (memoized TerminalLine keyed by seq —
 * history never re-renders), and the rAF coalescer already bounds commits to one per
 * frame. RN virtualizes because native view inflation is expensive and FlatList is
 * the house pattern; neither pressure exists here, and a virtualizer would break the
 * simple measured-bottom tailing below.
 */

// ==================== TYPES ====================

/** Phone parity (ImportTerminalProgress.tsx:48-54): failure carries no counts. */
export type TerminalOutcome =
  | { status: 'success'; successCount: number; totalFiles: number }
  // Batch where some — but not all — files landed. Distinct amber treatment so a
  // partial run never reads as a clean success on a forensic surface.
  | { status: 'partial'; successCount: number; totalFiles: number }
  | { status: 'failure' }

export interface ImportTerminalProgressProps {
  /** The demo pipeline's coarse stage (run-import onStage); null before the run starts. */
  stage: RunStageId | null
  /** null while running; set when the pipeline returns (the "done" signal). */
  outcome: TerminalOutcome | null
  /** 1-based batch position, shown in the processing badge ("File N of M · "). */
  batch: { current: number; total: number } | null
  /** Fired by the CTA to leave the terminal for the result view. */
  onReview(): void
  /** Test seam — defaults to the singleton the pipeline emits into. */
  bus?: ImportLogBus
}

// ==================== TRUST LINE (truthful, per FallbackMode) ====================

export type TerminalTrust = 'cloud' | 'sample'

/**
 * The run's data-path truth, read from the log itself. run-import marks every
 * FallbackMode transition with {@link SAMPLE_FALLBACK_PREFIX} (emitFallback — the
 * shared constant is the typed contract, p1-review R-32); until one lands the demo is
 * on its live path — extracted text leaves the browser for the server proxy, so
 * `cloud` is the honest default in both directions (overclaiming exposure is safe;
 * underclaiming never is).
 *
 * SEGMENT-SCOPED, not run-scoped (p1-review R-1): a batch is ONE bus run, so a sticky
 * latch would label files AFTER an early fallback as "in-browser" while their text
 * goes to the cloud — an underclaim of exposure, the exact failure this line exists
 * to prevent. Each `FILE` marker (emitted per batch file) resets the derivation to
 * `cloud`, so the label always reflects the CURRENT file's mode. Single-file and
 * paste runs have at most one segment — behaviour there is unchanged.
 */
export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
  let trust: TerminalTrust = 'cloud'
  for (const line of lines) {
    if (line.level === 'FILE') trust = 'cloud'
    else if (line.level === 'NORM' && line.text.startsWith(SAMPLE_FALLBACK_PREFIX)) trust = 'sample'
  }
  return trust
}

/**
 * Replaces the phone's "nothing leaves this phone" (ImportTerminalProgress.tsx:317),
 * which would be a lie here. `cloud` wording follows the P1.3 precedent (the AI
 * Request line's own detail: "cloud model via server proxy"); `sample` runs process
 * the built-in sample request locally.
 */
export const TRUST_LINE: Record<TerminalTrust, string> = {
  cloud: 'cloud model via server proxy',
  sample: 'sample import · in-browser',
}

/** Phone: "pdf-import · on-device" (:314). The demo's pdf.js extraction is in-browser. */
export const TERMINAL_TITLE = 'pdf-import · in-browser'

// ==================== STAGE → HEADLINE/PERCENT ====================

/**
 * The demo pipeline's stages mapped onto the phone's PROGRESS_STAGES bands
 * (constants/index.ts:23-30: extracting_text 0 · extracting_fields 15 ·
 * normalizing 55 · validating 65 · importing 80 · complete 100) with the phone's
 * orchestrator headlines (pdf-import-orchestrator.ts:288/428/459/806). The demo has
 * no validating stage; `done` covers geocode + case-store write (the phone's
 * importing band), and "Saving to database..." (:806) is adapted to "Saving to
 * case..." — the demo persists to the in-browser case store, not SQLite.
 */
const STAGE_VIEW: Record<Exclude<RunStageId, 'error'>, { message: string; percent: number }> = {
  extracting_text: { message: 'Extracting text from PDF...', percent: 0 },
  reading_model: { message: 'Extracting fields from document...', percent: 15 },
  normalizing: { message: 'Normalizing extracted data...', percent: 55 },
  done: { message: 'Saving to case...', percent: 80 },
}

const PREPARING = { message: 'Preparing…', percent: 0 } // phone :126

// ==================== AUTO-FOLLOW ====================

/** Phone parity: distance-from-end (px) below which the log counts as pinned (:76). */
export const NEAR_BOTTOM_THRESHOLD = 80

/** Pure pin decision — exported for direct testing (mirrors the phone's isNearBottom, :79-85). */
export function isNearBottom(m: { scrollTop: number; clientHeight: number; scrollHeight: number }): boolean {
  return m.scrollTop + m.clientHeight >= m.scrollHeight - NEAR_BOTTOM_THRESHOLD
}

// ==================== STYLES ====================

const stmono = "var(--font-stmono),'Share Tech Mono',monospace"

/** Fixed slot height — the badge morphs with ZERO reflow (phone minHeight 60, :459). */
export const BADGE_SLOT_HEIGHT = 60

// Terminal chrome palette (phone term object, ImportTerminalProgress.tsx:95-106).
const TERM_CHROME = {
  screen: '#060a12', // dark-scheme value (:97) — the demo phone is the dark theme
  bar: '#0a0f18',
  border: '#141c28',
  cursor: '#4BA3D4', // colors.primaryLight (dark)
  titleText: '#55606b', // :314
  titleMeta: '#4a7c76', // :317
  liveDot: '#4ECDC4', // term.accent.verbose (:316)
  dot: '#242a31', // :434
} as const

// Theme tokens resolved against the phone's dark theme (Colors.ts:68-104).
const C = {
  primary: '#2B8CC1',
  text: '#f0f4f8',
  textSecondary: '#99badd',
  border: '#1e3a5f',
  success: '#10d177',
  warning: '#ffd93d',
  error: '#ff4757',
} as const

const rootStyle: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 8, // Layout.spacing.sm (phone root gap, :414)
}
// Phone headline (:415-420): mono, fontSize xs(12), semibold, letterSpacing 1, 1 line.
const headlineStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: 1,
  color: C.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
// Phone track (:421-422): 3px tall, full radius, border-colour bg, primary fill.
const trackStyle: CSSProperties = {
  height: 3,
  borderRadius: 9999,
  background: C.border,
  overflow: 'hidden',
  flexShrink: 0,
}
const terminalStyle: CSSProperties = {
  flex: 1,
  minHeight: 260,
  borderRadius: 12, // Layout.borderRadius.lg
  border: `1px solid ${TERM_CHROME.border}`,
  background: TERM_CHROME.screen,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}
// Phone title bar (:425-438): bg #0a0f18, 12/8 padding, bottom border #141c28.
const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: TERM_CHROME.bar,
  borderBottom: `1px solid ${TERM_CHROME.border}`,
  flexShrink: 0,
}
const dotStyle: CSSProperties = { width: 8, height: 8, borderRadius: 4, background: TERM_CHROME.dot }
const logStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: 12, // phone logContent (:441)
}
const jumpPillStyle: CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  borderRadius: 9999,
  border: 'none',
  background: C.primary,
  cursor: 'pointer',
}
const badgeBase: CSSProperties = {
  height: BADGE_SLOT_HEIGHT,
  boxSizing: 'border-box',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  borderRadius: 12,
  padding: '0 13px',
  width: '100%',
  textAlign: 'left',
}
const badgeTitleStyle: CSSProperties = {
  fontSize: 14, // Typography.fontSize.sm
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const badgeSubStyle: CSSProperties = {
  fontSize: 12, // Typography.fontSize.xs
  marginTop: 1,
  color: C.textSecondary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

// ==================== ICONS (Ionicons equivalents, house inline-SVG pattern) ====================

function Icon({ path, size, color, circle }: { path: string; size: number; color: string; circle?: boolean }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {circle && <circle cx="12" cy="12" r="9" />}
      <path d={path} />
    </svg>
  )
}

function Spinner() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
    </svg>
  )
}

// ==================== CTA DERIVATION ====================

interface CtaView {
  icon: ReactNode
  titleColor: string
  border: string
  bg: string
  headline: string
  title: string
  sub: string
  a11y: string
}

/**
 * Phone cta switch, copy + colours verbatim (ImportTerminalProgress.tsx:233-281).
 * Exhaustive: a future TerminalOutcome variant is a compile error, not a silent
 * fall-through to the failure treatment.
 */
function ctaView(outcome: TerminalOutcome, isBatchRun: boolean): CtaView {
  switch (outcome.status) {
    case 'success': {
      const batch = outcome.totalFiles > 1
      return {
        icon: <Icon path="M8 12l2.5 2.5L16 9" size={22} color={C.success} circle />, // checkmark-circle
        titleColor: '#7fe6b6', // :240
        border: 'rgba(16,209,119,0.32)',
        bg: 'rgba(16,209,119,0.10)',
        headline: batch ? 'Batch complete' : 'Import ready for review',
        title: batch
          ? `Batch complete — ${outcome.successCount} of ${outcome.totalFiles} location${outcome.totalFiles === 1 ? '' : 's'}`
          : 'Import ready for review',
        sub: 'Review import →',
        a11y: 'Review the import before it saves',
      }
    }
    case 'partial': {
      const failed = outcome.totalFiles - outcome.successCount
      return {
        icon: <Icon path="M12 8v5M12 16h.01" size={22} color={C.warning} circle />, // alert-circle
        titleColor: C.warning,
        border: 'rgba(255,217,61,0.36)',
        bg: 'rgba(255,217,61,0.10)',
        headline: 'Batch partially failed',
        title: `Batch partially failed — ${outcome.successCount} of ${outcome.totalFiles}, ${failed} need${failed === 1 ? 's' : ''} attention`,
        sub: 'Review import →',
        a11y: 'Review the import — some files failed',
      }
    }
    case 'failure':
      return {
        icon: <Icon path="M12 8v5M12 16h.01" size={22} color={C.error} circle />,
        titleColor: C.error,
        border: 'rgba(255,71,87,0.32)',
        bg: 'rgba(255,71,87,0.10)',
        headline: isBatchRun ? 'Batch failed' : 'Import failed',
        title: isBatchRun ? 'Batch failed' : 'Import failed',
        sub: 'See error details →',
        a11y: 'See error details',
      }
    default: {
      const exhaustive: never = outcome
      return exhaustive
    }
  }
}

// ==================== COMPONENT ====================

const EMPTY_SET: ReadonlySet<number> = new Set()

export function ImportTerminalProgress({ stage, outcome, batch, onReview, bus = importLogBus }: ImportTerminalProgressProps) {
  const { lines, epoch } = useImportLog(true, bus)
  const reduce = useReducedMotion()
  // Pin state renders the pill (state) AND gates the tail (ref). The tail effect must
  // read the ref: with `pinned` as an effect dep, a pin restore (epoch reset) re-ran
  // the effect against unchanged lines and tail-scrolled a fresh run's first commit
  // to the bottom — exactly the "start at top" rule being violated.
  const [pinned, setPinnedState] = useState(true)
  const pinnedRef = useRef(true)
  const setPinned = useCallback((v: boolean) => {
    pinnedRef.current = v
    setPinnedState(v)
  }, [])
  const [expandedSeqs, setExpandedSeqs] = useState<ReadonlySet<number>>(EMPTY_SET)
  const logRef = useRef<HTMLDivElement | null>(null)
  // The first NON-EMPTY paint (the subscribe replay burst) stays at the top —
  // "start at top, then follow each stage down" (§5.7.5); an empty log re-arms it.
  const sawContentRef = useRef(false)
  // Set by wheel/touch, consumed by the next scroll event: only USER scrolls may
  // change the pin — the tail's own programmatic scrolls never unpin it (the
  // phone's drag-gesture-only rule, ImportTerminalProgress.tsx:196-213).
  const userScrollRef = useRef(false)

  // stage 'error' freezes the last real stage's headline/percent (the phone leaves
  // progress wherever the pipeline stopped; the outcome CTA then takes the headline).
  const lastViewRef = useRef<{ message: string; percent: number } | null>(null)
  const stageView = stage && stage !== 'error' ? STAGE_VIEW[stage] : null
  useEffect(() => {
    if (stageView) lastViewRef.current = stageView
  }, [stageView])
  const running = stageView ?? lastViewRef.current ?? PREPARING

  const trust = useMemo(() => deriveTrust(lines), [lines])
  const isBatchRun = batch !== null && batch.total > 1
  const cta = outcome === null ? null : ctaView(outcome, isBatchRun)
  const headline = cta ? cta.headline : running.message
  // Success/partial land at 100 (the phone's complete band); failure keeps the bar
  // where the pipeline stopped — a full bar on a failed run would be a lie.
  const percent = outcome && outcome.status !== 'failure' ? 100 : running.percent

  // New run (epoch bump): re-pin, collapse every detail, restart at the top.
  const prevEpochRef = useRef(epoch)
  useEffect(() => {
    if (prevEpochRef.current === epoch) return
    prevEpochRef.current = epoch
    setPinned(true)
    setExpandedSeqs(EMPTY_SET)
    sawContentRef.current = false
    if (logRef.current) logRef.current.scrollTop = 0
  }, [epoch])

  // Tail driver — web translation of the phone's measured-bottom scroll (§5.7.5):
  // scrollTop = scrollHeight - clientHeight on content growth. scrollHeight is the
  // browser's own measured content height, so this reaches the true bottom (the
  // phone needed onContentSizeChange because RN's scrollToEnd estimates; the DOM
  // measures for free).
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    if (lines.length === 0) {
      sawContentRef.current = false // next run starts at the top again
      el.scrollTop = 0
      return
    }
    if (!sawContentRef.current) {
      sawContentRef.current = true // replay burst paints at the top
      return
    }
    if (pinnedRef.current) el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
  }, [lines])

  const markUserScroll = useCallback(() => {
    userScrollRef.current = true
  }, [])
  const handleScroll = useCallback(() => {
    if (!userScrollRef.current) return // programmatic tail scroll — never flips the pin
    userScrollRef.current = false
    const el = logRef.current
    if (!el) return
    // User gesture: scroll-up unpins; releasing near the bottom (≤80px) re-pins.
    setPinned(isNearBottom({ scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight }))
  }, [])
  const jumpToLatest = useCallback(() => {
    setPinned(true)
    const el = logRef.current
    if (el) el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)
  }, [])
  const toggleDetail = useCallback((seq: number) => {
    setExpandedSeqs((prev) => {
      const next = new Set(prev)
      if (next.has(seq)) next.delete(seq)
      else next.add(seq)
      return next
    })
  }, [])

  const trustLine = TRUST_LINE[trust]

  return (
    <div data-testid="import-terminal" style={rootStyle}>
      {/* Human phase headline — polite live region (phone announces on stage change). */}
      <div data-testid="terminal-status" role="status" aria-live="polite" style={headlineStyle}>
        {headline}
      </div>

      {/* Top progress bar (instant width — phone parity, no easing on this track). */}
      <div
        style={trackStyle}
        role="progressbar"
        aria-label={`Import progress: ${percent} percent`}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div data-testid="terminal-progress-fill" style={{ width: `${percent}%`, height: '100%', borderRadius: 9999, background: C.primary }} />
      </div>

      {/* Terminal panel — dark in both themes by design. */}
      <div style={terminalStyle}>
        <div style={titleBarStyle}>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
            <span style={dotStyle} />
            <span style={dotStyle} />
            <span style={dotStyle} />
          </div>
          <span style={{ fontFamily: stmono, fontSize: 10, letterSpacing: 0.5, color: TERM_CHROME.titleText }}>{TERMINAL_TITLE}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: TERM_CHROME.liveDot }} aria-hidden="true" />
            <span data-testid="terminal-trust-line" style={{ fontFamily: stmono, fontSize: 9.5, color: TERM_CHROME.titleMeta }}>
              {trustLine}
            </span>
          </span>
        </div>

        <div
          data-testid="terminal-log"
          ref={logRef}
          style={logStyle}
          onScroll={handleScroll}
          onWheel={markUserScroll}
          onTouchMove={markUserScroll}
        >
          {lines.map((line) => (
            <TerminalLine key={line.seq} line={line} expanded={expandedSeqs.has(line.seq)} onToggleDetail={toggleDetail} />
          ))}
          {outcome === null && (
            <div style={{ marginTop: 5 }}>
              <span
                data-testid="terminal-cursor"
                aria-hidden="true"
                style={{
                  fontFamily: stmono,
                  fontSize: 11,
                  color: TERM_CHROME.cursor,
                  animation: reduce ? undefined : 'termCursorBlink 1s step-end infinite',
                }}
              >
                ▌
              </span>
            </div>
          )}
        </div>

        {!pinned && lines.length > 0 && (
          <button type="button" data-testid="jump-to-latest-pill" aria-label="Jump to latest log line" onClick={jumpToLatest} style={jumpPillStyle}>
            <Icon path="M12 5v13M19 12l-7 7-7-7" size={13} color="#fff" />
            <span style={{ fontFamily: stmono, fontSize: 10, fontWeight: 600, color: '#fff' }}>latest</span>
          </button>
        )}
      </div>

      {/* Morphing status badge → CTA. Fixed-height slot: zero reflow on morph. */}
      {cta ? (
        <button
          type="button"
          data-testid="terminal-review-cta"
          aria-label={cta.a11y}
          onClick={onReview}
          style={{
            ...badgeBase,
            border: `1px solid ${cta.border}`,
            background: cta.bg,
            cursor: 'pointer',
            animation: reduce ? undefined : 'termFadeIn 350ms ease both',
          }}
        >
          {cta.icon}
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...badgeTitleStyle, color: cta.titleColor }}>{cta.title}</span>
            <span style={badgeSubStyle}>{cta.sub}</span>
          </span>
          <Icon path="M9 18l6-6-6-6" size={18} color={C.textSecondary} />
        </button>
      ) : (
        <div
          data-testid="terminal-processing-badge"
          style={{ ...badgeBase, border: '1px solid rgba(43,140,193,0.32)', background: 'rgba(26,45,68,0.55)' }}
        >
          <Spinner />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...badgeTitleStyle, color: C.text }}>
              {isBatchRun ? 'Processing recovery requests' : 'Processing recovery request'}
            </span>
            <span style={badgeSubStyle}>
              {isBatchRun && batch ? `File ${batch.current} of ${batch.total} · ` : ''}
              {trustLine}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
