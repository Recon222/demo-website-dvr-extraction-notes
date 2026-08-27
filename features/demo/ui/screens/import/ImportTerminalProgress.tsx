'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  importLogBus,
  type ImportLogBus,
  type ImportLogLine,
} from '@/features/demo/engine/logic/import-log'
import { useImportLog } from '@/features/demo/ui/import/useImportLog'
import { SAMPLE_FALLBACK_PREFIX, type ImportStageId as RunStageId, type ImportRealStageId } from '@/features/demo/ui/import/run-import'
// The DEMO's reduced-motion hook (p1-review R-18): motion/react seeds from a global on
// the FIRST render, so a reduced-motion visitor never gets one committed frame with
// animations armed — the marketing hook (@/lib/hooks) starts false and corrects in an
// effect. Same source ScreenStage / WizardDrawer / ExploreChecklist use.
import { useReducedMotion } from 'motion/react'
import { TerminalLine } from '@/features/demo/ui/screens/import/TerminalLine'
import { colors } from '@/features/demo/ui/tokens/palette'
import {
  TERMINAL_PALETTE,
  TERMINAL_FONT_SIZE,
  TERMINAL_SCHEME,
} from '@/features/demo/ui/screens/import/terminal-palette'
import { severityTone } from '@/features/demo/ui/tokens/status'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

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
 * the dark arm of `TERMINAL_PALETTE.screen` applies (phone :97).
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
  /**
   * The last real (non-error) stage, tracked by the bridge in its functional updater
   * (p1-review R-11): React batches onStage('normalizing') with the following
   * onStage('error'), so a component-side "last rendered stage" ref would never see
   * stages that never rendered — a normalize failure froze the bar at 15%. When
   * `stage` is 'error', the bar/headline freeze on THIS.
   */
  lastRealStage: ImportRealStageId | null
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
 * RUN-scoped substitution flag — the outcome CTA's source (p1-review-fixdelta R-35).
 * One value cannot serve both scopes: segment-scoped {@link deriveTrust} feeds the
 * LIVE surfaces (title bar, per-file badge), where 'cloud' is the safe overclaim of
 * exposure — but the CTA is a run-scoped SUMMARY, where 'cloud' is unsafe
 * under-disclosure. A mixed batch whose substitution happened on any file but the
 * last must still say so at the CTA moment: Escape during the dwell discards the
 * result view, so the notice + per-card badges may never paint. Kept as a separate
 * boolean (not a second TerminalTrust) so a consumer cannot silently take the wrong
 * scope again. Ring-cap note: FIFO eviction can only drop OLDER lines, so a wholly
 * evicted fallback line degrades this toward false — at ~15 lines/file that needs a
 * ~27-file batch, beyond the 25-file confirm gate; accepted.
 */
export function runHadSampleFallback(lines: readonly ImportLogLine[]): boolean {
  return lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX))
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

// U7.1 (A85/A91): the console chrome moved to the ONE owned palette,
// `screens/import/terminal-palette.ts`. Two token sets meet in this file and the split is
// the phone's, not a stylistic choice:
//
//   * inside the terminal panel — the phone's `<ForceColorScheme scheme="dark">` subtree
//     (phone ImportTerminalProgress.tsx:343-404) — every value comes from TERMINAL_PALETTE,
//     which resolves through TERMINAL_SCHEME and therefore stays dark if the app flips;
//   * outside it — headline, progress track, outcome badge/CTA — the phone reads the APP
//     theme, so those take `colors.*` and SHOULD follow a scheme flip.
//
// The local `C` object that used to re-type seven palette hexes here is gone (A85: "`C.*`
// re-expresses GLASS/T values under new names").
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
  color: colors.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
// Phone track (:421-422): 3px tall, full radius, border-colour bg, primary fill.
const trackStyle: CSSProperties = {
  height: 3,
  borderRadius: 9999,
  background: colors.border,
  overflow: 'hidden',
  flexShrink: 0,
}
const terminalStyle: CSSProperties = {
  flex: 1,
  minHeight: 260,
  borderRadius: 12, // Layout.borderRadius.lg
  border: `1px solid ${TERMINAL_PALETTE.border}`,
  background: TERMINAL_PALETTE.screen[TERMINAL_SCHEME],
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}
// Phone title bar (:425-438): `TERMINAL_PALETTE.bar` ground, 12/8 padding, `.border` divider.
const titleBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: TERMINAL_PALETTE.bar,
  borderBottom: `1px solid ${TERMINAL_PALETTE.border}`,
  flexShrink: 0,
}
const dotStyle: CSSProperties = { width: 8, height: 8, borderRadius: 4, background: TERMINAL_PALETTE.dot }
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
  // `primaryDark`, not the flat `primary` — the phone's own reason at its :108-112: "`onPrimary`
  // on `primary` measures 3.73:1 in dark, and this pill's label is 13px normal weight, so AA's
  // 4.5 applies with no large-text relief. On `primaryDark`: 5.80 dark / 8.72 light." That is
  // DEF-UI-001, the ceiling D5 inherits everywhere the phone has NOT already fixed it — and here
  // it has (phone :113).
  background: colors.primaryDark,
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
  color: colors.textSecondary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
/** Visually hidden but AT-readable (the CTA's supplementary description, R-3). */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
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

/** Reduced-motion gated (p1-review R-14): inline-styled motion must gate in JS. */
function Spinner({ reduce }: { reduce: boolean | null }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.primary}
      strokeWidth="2.5"
      data-testid="terminal-spinner"
      style={{ animation: reduce ? undefined : 'spin 0.9s linear infinite', flexShrink: 0 }}
    >
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
  subColor: string
  a11y: string
}

/**
 * Phone cta switch, copy + colours verbatim (ImportTerminalProgress.tsx:233-281).
 * Exhaustive: a future TerminalOutcome variant is a compile error, not a silent
 * fall-through to the failure treatment.
 *
 * Sample attribution (p1-review R-25, re-scoped by fix-delta R-35): with the P1.5
 * dwell, the result notice + per-card badge only paint AFTER the CTA tap — Escape
 * during the dwell used to discard a sample-substituted import with the substitution
 * never marked on this surface. When ANY file in the run fell back to the sample
 * (`runHadSample` — run-scoped, NOT the segment-scoped trust, which resets per FILE
 * marker and went blind to mid-batch substitutions), the success/partial sub carries
 * the attribution in the amber warning colour, so the CTA moment itself says so.
 */
function ctaView(outcome: TerminalOutcome, isBatchRun: boolean, runHadSample: boolean): CtaView {
  const reviewSub = runHadSample
    ? { sub: 'sample import · review →', subColor: colors.warning }
    : { sub: 'Review import →', subColor: colors.textSecondary }
  switch (outcome.status) {
    case 'success': {
      const batch = outcome.totalFiles > 1
      return {
        icon: <Icon path="M8 12l2.5 2.5L16 9" size={22} color={colors.success} circle />, // checkmark-circle
        // F63: through the seam, not a private read of the same token. `severityTone` is
        // where D8a's `*OnLight` foreground lives (`tokens/status.ts:123`), and its docblock
        // claims every severity surface resolves through it — three arms here were reading
        // the palette directly, which is the F26 class in a file outside `status-owners`'
        // OWNED scope.
        titleColor: severityTone('success').color, // phone :242 (D8a)
        border: withAlpha(colors.success, 0.32), // phone :243
        bg: withAlpha(colors.success, 0.1), // phone :244
        headline: batch ? 'Batch complete' : 'Import ready for review',
        title: batch
          ? `Batch complete: ${outcome.successCount} of ${outcome.totalFiles} location${outcome.totalFiles === 1 ? '' : 's'}`
          : 'Import ready for review',
        ...reviewSub,
        a11y: 'Review the import before it saves',
      }
    }
    case 'partial': {
      const failed = outcome.totalFiles - outcome.successCount
      return {
        icon: <Icon path="M12 8v5M12 16h.01" size={22} color={colors.warning} circle />, // alert-circle
        titleColor: severityTone('warning').color, // phone :283 (D8a)
        border: withAlpha(colors.warning, 0.36), // phone :284
        bg: withAlpha(colors.warning, 0.1), // phone :285
        headline: 'Batch partially failed',
        title: `Batch partially failed: ${outcome.successCount} of ${outcome.totalFiles}, ${failed} need${failed === 1 ? 's' : ''} attention`,
        ...reviewSub,
        a11y: 'Review the import; some files failed', // phone :292 — the semicolon IS the phone's
      }
    }
    case 'failure':
      return {
        icon: <Icon path="M12 8v5M12 16h.01" size={22} color={colors.error} circle />,
        titleColor: severityTone('error').color, // phone :298 (D8a)
        border: withAlpha(colors.error, 0.32), // phone :299
        bg: withAlpha(colors.error, 0.1), // phone :300
        headline: isBatchRun ? 'Batch failed' : 'Import failed',
        title: isBatchRun ? 'Batch failed' : 'Import failed',
        sub: 'See error details →',
        subColor: colors.textSecondary,
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

/** Keys that scroll a focused scroll container — user intent for the pin (R-2). */
const SCROLL_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export function ImportTerminalProgress({ stage, lastRealStage, outcome, batch, onReview, bus = importLogBus }: ImportTerminalProgressProps) {
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
  // The freeze source is the bridge-tracked lastRealStage prop, not a rendered-stage
  // ref — batching made intermediate stages unrenderable (R-11, see the prop's doc).
  const effectiveStage = stage === 'error' ? lastRealStage : stage
  const running = effectiveStage ? STAGE_VIEW[effectiveStage] : PREPARING

  const trust = useMemo(() => deriveTrust(lines), [lines])
  const runHadSample = useMemo(() => runHadSampleFallback(lines), [lines])
  const isBatchRun = batch !== null && batch.total > 1
  const cta = outcome === null ? null : ctaView(outcome, isBatchRun, runHadSample)
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
  /**
   * Keyboard scrolling is user intent too (p1-review R-2, WCAG 2.1.1): scrollbars are
   * hidden inside the phone frame and wheel/touch were the only pin producers, so a
   * keyboard user could never unpin (the tail re-yanked them) and the jump pill never
   * mounted for them. Scroll keys arm the same flag the wheel does; the resulting
   * scroll event settles the pin exactly like every other user gesture. Pointer-down
   * covers any future visible-scrollbar surface for free.
   */
  const handleKeyDown = useCallback(
    (e: { key: string }) => {
      if (SCROLL_KEYS.has(e.key)) markUserScroll()
    },
    [markUserScroll],
  )
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
        <div data-testid="terminal-progress-fill" style={{ width: `${percent}%`, height: '100%', borderRadius: 9999, background: colors.primary }} />
      </div>

      {/* Terminal panel — dark in both themes by design. */}
      <div style={terminalStyle}>
        <div style={titleBarStyle}>
          <div style={{ display: 'flex', gap: 5 }} aria-hidden="true">
            <span style={dotStyle} />
            <span style={dotStyle} />
            <span style={dotStyle} />
          </div>
          <span style={{ fontFamily: stmono, fontSize: TERMINAL_FONT_SIZE.row, letterSpacing: 0.5, color: TERMINAL_PALETTE.titleText }}>{TERMINAL_TITLE}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: TERMINAL_PALETTE.cursor }} aria-hidden="true" />
            <span data-testid="terminal-trust-line" style={{ fontFamily: stmono, fontSize: TERMINAL_FONT_SIZE.meta, color: TERMINAL_PALETTE.titleMeta }}>
              {trustLine}
            </span>
          </span>
        </div>

        <div
          data-testid="terminal-log"
          ref={logRef}
          style={logStyle}
          // First-class keyboard target (R-2): focusable, named, and scroll keys count
          // as user intent. role="log" is implicitly aria-live="polite" — explicitly
          // off, so the terminal-status headline stays the sole polite region.
          tabIndex={0}
          role="log"
          aria-live="off"
          aria-label="Import log"
          onScroll={handleScroll}
          onWheel={markUserScroll}
          onTouchMove={markUserScroll}
          onPointerDown={markUserScroll}
          onKeyDown={handleKeyDown}
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
                  fontSize: TERMINAL_FONT_SIZE.cursor,
                  color: TERMINAL_PALETTE.cursor,
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
            {/* Phone :115-116 — `colors.onPrimary`, the token that pairs with `primaryDark`
                above. The bare `'#fff'` here was the same value under no name, which is what
                let the pill's fill and its label drift apart in the first place. */}
            <Icon path="M12 5v13M19 12l-7 7-7-7" size={13} color={colors.onPrimary} />
            <span style={{ fontFamily: stmono, fontSize: TERMINAL_FONT_SIZE.row, fontWeight: 600, color: colors.onPrimary }}>latest</span>
          </button>
        )}
      </div>

      {/* Morphing status badge → CTA. Fixed-height slot: zero reflow on morph.
          Accessible name = the VISIBLE title + sub (R-3): the batch counts are the
          load-bearing fact and must be announced; an aria-label would replace them
          (accname override) and break Label-in-Name for voice control. cta.a11y
          SUPPLEMENTS as the description via aria-describedby. */}
      {cta ? (
        <>
          <button
            type="button"
            data-testid="terminal-review-cta"
            aria-describedby="terminal-cta-desc"
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
              <span style={{ ...badgeSubStyle, color: cta.subColor }}>{cta.sub}</span>
            </span>
            <Icon path="M9 18l6-6-6-6" size={18} color={colors.textSecondary} />
          </button>
          {/* Sibling, NOT a child: inside the button it would join the accname. */}
          <span id="terminal-cta-desc" style={visuallyHidden}>
            {cta.a11y}
          </span>
        </>
      ) : (
        <div
          data-testid="terminal-processing-badge"
          // The fill was `rgba(26,45,68,0.55)`. The phone names it at its :439-441: it is "the
          // PRE-recolor `backgroundTertiary`, orphaned when the ramp moved" to the current one,
          // and "it never adapted". The demo carried the identical orphan. Both parts derive
          // now (phone :444-446). The two hexes the phone quotes are left out on purpose: to
          // `glass-tokens.test.ts`'s banned-literal scan a comment is source (U7.1's D-4).
          style={{ ...badgeBase, border: `1px solid ${withAlpha(colors.primary, 0.32)}`, background: withAlpha(colors.backgroundTertiary, 0.55) }}
        >
          <Spinner reduce={reduce} />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...badgeTitleStyle, color: colors.text }}>
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
