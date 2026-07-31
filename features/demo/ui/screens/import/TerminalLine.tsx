'use client'

import { memo } from 'react'
import type { CSSProperties } from 'react'
import type { ImportLogLevel, ImportLogLine } from '@/features/demo/engine/logic/import-log'

/**
 * TerminalLine — one memoized row of the import terminal (parity P1.4, matrix row 74).
 * Web port of the phone's `src/features/import/pdf-import/components/TerminalLine.tsx`:
 * time gutter · level tag · message, with an optional detail block underneath.
 *
 * Demo deviation (per the P1.4 spec): the detail block is COLLAPSED by default and
 * expands/collapses per line — the phone renders every detail block always-open
 * (TerminalLine.tsx:65-74). On the web the dumps (prompts, raw model output) would
 * dominate the small log viewport, so the row itself becomes a disclosure button when
 * a detail exists. Expansion state lives in the parent (controlled `expanded` +
 * `onToggleDetail`) so this component stays memoizable: on append, existing rows keep
 * identical props and never re-render.
 *
 * Every colour/size below is lifted from the phone with file:line citations. The
 * terminal palette is FIXED (dark in both themes by design — phone-inventory §5.7.3);
 * theme-seeded accents use the phone's DARK theme values, which are the demo phone
 * frame's only theme (src/constants/Colors.ts:68-104).
 */

// NOTE (p1-review R-15): the phone hides >120-char dumps from assistive tech
// (DETAIL_AT_HIDE_THRESHOLD, TerminalLine.tsx:22) because its always-open blocks
// would flood a screen reader. That rationale does not transfer here: the demo's
// blocks are collapsed behind a disclosure BUTTON and the log is not a live region
// (aria-live='off'), so nothing auto-announces — opening a dump is an explicit
// user opt-in, and the revealed content must be AT-readable. No aria-hidden.

/**
 * Syntax-accent colour per level (phone ImportTerminalProgress.tsx:107-118, with the
 * theme tokens resolved against the phone's dark theme, src/constants/Colors.ts:68-104):
 * textSecondary #99badd · primaryLight #4BA3D4 · warning #ffd93d · success #10d177 ·
 * error #ff4757. FILE #e0a878 and VERB #4ECDC4 are fixed literals on the phone too.
 */
export const LEVEL_ACCENT: Record<ImportLogLevel, string> = {
  INIT: '#99badd', // colors.textSecondary
  FILE: '#e0a878',
  PDF: '#99badd', // colors.textSecondary
  AI: '#4BA3D4', // colors.primaryLight
  VERB: '#4ECDC4',
  NORM: '#ffd93d', // colors.warning
  CASE: '#4BA3D4', // colors.primaryLight
  OK: '#10d177', // colors.success
  DONE: '#10d177', // colors.success
  ERR: '#ff4757', // colors.error
}

/** Fixed row palette (phone ImportTerminalProgress.tsx:100-106 `term`). */
export const TERM_ROW = {
  time: '#3a475a',
  body: '#c6d2df',
  error: '#ff4757', // colors.error (dark)
  blockBg: '#080b11',
  blockBorder: '#1c2733',
  blockText: '#6f8296',
} as const

const stmono = "var(--font-stmono),'Share Tech Mono',monospace"

// Phone TerminalLine.tsx:79-84: row marginTop 5, gap 8; time mono 10 width 44;
// tag mono 10 semibold width 38; msg mono 10 flex:1 lineHeight 15.
const rowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  marginTop: 5,
  width: '100%',
  textAlign: 'left',
}
const timeStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 10,
  width: 44,
  flexShrink: 0,
  color: TERM_ROW.time,
}
const tagStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 10,
  fontWeight: 600, // Typography.fontWeight.semibold
  width: 38,
  flexShrink: 0,
}
const msgStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 10,
  lineHeight: '15px',
  flex: 1,
  minWidth: 0,
  overflowWrap: 'anywhere',
}

// Phone TerminalLine.tsx:85-94: block marginTop 3, marginLeft 52 (44 gutter + 8 gap),
// padding 6/9, 2px left border, right-rounded 4; text mono 9 / lineHeight 15.
const blockStyle: CSSProperties = {
  marginTop: 3,
  marginLeft: 52,
  padding: '6px 9px',
  background: TERM_ROW.blockBg,
  borderLeft: `2px solid ${TERM_ROW.blockBorder}`,
  borderTopRightRadius: 4,
  borderBottomRightRadius: 4,
}
const blockTextStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 9,
  lineHeight: '15px',
  color: TERM_ROW.blockText,
  whiteSpace: 'pre-wrap', // RN Text wraps/preserves by default; web needs it explicit
  wordBreak: 'break-word',
  margin: 0,
}
// Disclosure state glyph at the row's right edge (demo-only affordance for the
// collapsed-by-default deviation; the phone has no toggle). Kept out of the message
// text so lifted copy (incl. the emit sites' own trailing ▾) stays verbatim.
const discloseStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: 10,
  lineHeight: '15px',
  flexShrink: 0,
  color: TERM_ROW.blockText,
}

export interface TerminalLineProps {
  line: ImportLogLine
  /** Controlled: whether this line's detail block is open (parent owns the Set). */
  expanded: boolean
  onToggleDetail(seq: number): void
}

export const TerminalLine = memo(function TerminalLine({ line, expanded, onToggleDetail }: TerminalLineProps) {
  // const local so the narrowing carries (no assertion needed — p1-review R-13).
  const detail = line.detail
  const hasDetail = detail !== undefined
  const detailId = `terminal-detail-${line.seq}`

  const rowContent = (
    <>
      {/* Phone gutter format is T+seconds.xx, not mm:ss (TerminalLine.tsx:59, §5.7.3). */}
      <span style={timeStyle}>T+{(line.elapsedMs / 1000).toFixed(2)}</span>
      <span style={{ ...tagStyle, color: LEVEL_ACCENT[line.level] }}>{line.level}</span>
      <span style={{ ...msgStyle, color: line.level === 'ERR' ? TERM_ROW.error : TERM_ROW.body }}>{line.text}</span>
      {hasDetail && (
        <span aria-hidden="true" style={discloseStyle}>
          {expanded ? '▾' : '▸'}
        </span>
      )}
    </>
  )

  return (
    <div data-testid={`terminal-line-${line.seq}`}>
      {hasDetail ? (
        <button
          type="button"
          onClick={() => onToggleDetail(line.seq)}
          aria-expanded={expanded}
          aria-controls={detailId}
          style={{ ...rowStyle, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
        >
          {rowContent}
        </button>
      ) : (
        <div style={rowStyle}>{rowContent}</div>
      )}
      {hasDetail && expanded && (
        // AT-readable by design (R-15): the disclosure advertises aria-expanded /
        // aria-controls, so the revealed block must exist for assistive tech too.
        <div id={detailId} data-testid={detailId} style={blockStyle}>
          <pre style={blockTextStyle}>{detail}</pre>
        </div>
      )}
    </div>
  )
})
