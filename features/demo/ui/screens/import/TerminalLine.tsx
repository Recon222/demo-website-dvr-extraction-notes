'use client'

import { memo } from 'react'
import type { CSSProperties } from 'react'
import type { ImportLogLine } from '@/features/demo/engine/logic/import-log'
import { TERMINAL_PALETTE, TERMINAL_FONT_SIZE } from '@/features/demo/ui/screens/import/terminal-palette'

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

// U7.1 (A85): the row's colours and its sub-xs type ramp (A86) moved to the ONE owned
// console palette. `LEVEL_ACCENT` and `TERM_ROW` were two of the four parallel copies
// `terminal-palette.ts` exists to end; the phone passes the same subset down as a `term`
// prop (its TerminalLine.tsx:41-53), which the demo deliberately does NOT copy — a new
// prop on a memoized row is a signature change D20's carve-out does not grant U7.1, and a
// module import keeps every style object below module-level and referentially stable.

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
  fontSize: TERMINAL_FONT_SIZE.row,
  width: 44,
  flexShrink: 0,
  color: TERMINAL_PALETTE.time,
}
const tagStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: TERMINAL_FONT_SIZE.row,
  fontWeight: 600, // Typography.fontWeight.semibold
  width: 38,
  flexShrink: 0,
}
const msgStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: TERMINAL_FONT_SIZE.row,
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
  background: TERMINAL_PALETTE.blockBg,
  borderLeft: `2px solid ${TERMINAL_PALETTE.blockBorder}`,
  borderTopRightRadius: 4,
  borderBottomRightRadius: 4,
}
const blockTextStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: TERMINAL_FONT_SIZE.detail,
  lineHeight: '15px',
  color: TERMINAL_PALETTE.blockText,
  whiteSpace: 'pre-wrap', // RN Text wraps/preserves by default; web needs it explicit
  wordBreak: 'break-word',
  margin: 0,
}
// Disclosure state glyph at the row's right edge (demo-only affordance for the
// collapsed-by-default deviation; the phone has no toggle). Kept out of the message
// text so lifted copy (incl. the emit sites' own trailing ▾) stays verbatim.
const discloseStyle: CSSProperties = {
  fontFamily: stmono,
  fontSize: TERMINAL_FONT_SIZE.row,
  lineHeight: '15px',
  flexShrink: 0,
  color: TERMINAL_PALETTE.blockText,
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
      <span style={{ ...tagStyle, color: TERMINAL_PALETTE.accent[line.level] }}>{line.level}</span>
      <span style={{ ...msgStyle, color: line.level === 'ERR' ? TERMINAL_PALETTE.error : TERMINAL_PALETTE.body }}>{line.text}</span>
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
