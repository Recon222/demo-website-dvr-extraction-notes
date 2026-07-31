import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TerminalLine, LEVEL_ACCENT, TERM_ROW } from '@/features/demo/ui/screens/import/TerminalLine'
import type { ImportLogLevel, ImportLogLine } from '@/features/demo/engine/logic/import-log'

const mkLine = (over: Partial<ImportLogLine> = {}): ImportLogLine => ({
  seq: 7,
  elapsedMs: 1230,
  level: 'OK',
  text: 'extract text ✓',
  ...over,
})

function renderLine(line: ImportLogLine, expanded = false) {
  const onToggleDetail = vi.fn()
  const utils = render(<TerminalLine line={line} expanded={expanded} onToggleDetail={onToggleDetail} />)
  return { ...utils, onToggleDetail }
}

describe('TerminalLine (P1.4, matrix row 74)', () => {
  it('renders the phone gutter format T+seconds.xx (TerminalLine.tsx:59), tag, and message', () => {
    renderLine(mkLine({ elapsedMs: 1230 }))
    expect(screen.getByText('T+1.23')).toBeInTheDocument()
    expect(screen.getByText('OK')).toBeInTheDocument()
    expect(screen.getByText('extract text ✓')).toBeInTheDocument()
  })

  it('pins the full 10-level accent map to the phone palette (ImportTerminalProgress.tsx:107-118)', () => {
    const expected: Record<ImportLogLevel, string> = {
      INIT: '#99badd',
      FILE: '#e0a878',
      PDF: '#99badd',
      AI: '#4BA3D4',
      VERB: '#4ECDC4',
      NORM: '#ffd93d',
      CASE: '#4BA3D4',
      OK: '#10d177',
      DONE: '#10d177',
      ERR: '#ff4757',
    }
    expect(LEVEL_ACCENT).toEqual(expected)
    for (const [level, colour] of Object.entries(expected) as [ImportLogLevel, string][]) {
      const { unmount } = render(
        <TerminalLine line={mkLine({ level, text: `msg-${level}` })} expanded={false} onToggleDetail={() => {}} />,
      )
      const tag = screen.getByText(level)
      expect(tag.style.color, `${level} tag accent`).toBe(hexToJsdomRgb(colour))
      unmount()
    }
  })

  it('renders the message in the body colour, and in the error colour for ERR (TerminalLine.tsx:61)', () => {
    renderLine(mkLine({ text: 'normal line' }))
    expect(screen.getByText('normal line').style.color).toBe(hexToJsdomRgb(TERM_ROW.body))
    renderLine(mkLine({ level: 'ERR', text: '✗ failed at normalizing' }))
    expect(screen.getByText('✗ failed at normalizing').style.color).toBe(hexToJsdomRgb(TERM_ROW.error))
  })

  it('pins the gutter geometry: time width 44 / tag width 38 / mono 10 (TerminalLine.tsx:82-84)', () => {
    renderLine(mkLine())
    const time = screen.getByText('T+1.23')
    const tag = screen.getByText('OK')
    expect(time.style.width).toBe('44px')
    expect(time.style.fontSize).toBe('10px')
    expect(tag.style.width).toBe('38px')
    expect(tag.style.fontWeight).toBe('600')
  })

  it('a line without detail renders a plain row — no button, no disclosure glyph', () => {
    renderLine(mkLine())
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('▸')).not.toBeInTheDocument()
    expect(screen.queryByTestId('terminal-detail-7')).not.toBeInTheDocument()
  })

  it('a line with detail is a disclosure button, collapsed by default (demo deviation from the always-open phone block)', () => {
    const { onToggleDetail } = renderLine(mkLine({ detail: 'method: pdf.js · 3184 chars' }))
    const row = screen.getByRole('button')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('terminal-detail-7')).not.toBeInTheDocument()
    expect(screen.getByText('▸')).toBeInTheDocument()
    fireEvent.click(row)
    expect(onToggleDetail).toHaveBeenCalledWith(7)
  })

  it('expanded=true shows the detail block with the phone styling (TerminalLine.tsx:85-94)', () => {
    renderLine(mkLine({ detail: 'warnings: 3' }), true)
    const block = screen.getByTestId('terminal-detail-7')
    expect(block).toHaveTextContent('warnings: 3')
    expect(block.style.marginLeft).toBe('52px')
    expect(block.style.background).toBe(hexToJsdomRgb(TERM_ROW.blockBg))
    expect(block.style.borderLeft).toBe(`2px solid ${hexToJsdomRgb(TERM_ROW.blockBorder)}`)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('▾')).toBeInTheDocument()
    // Short detail (≤120 chars) stays readable by assistive tech.
    expect(block).not.toHaveAttribute('aria-hidden')
  })

  it('an expanded dump stays AT-readable — the disclosure must not reveal aria-hidden content (R-15)', () => {
    // Deliberate divergence from the phone's DETAIL_AT_HIDE_THRESHOLD: the demo's blocks
    // are collapsed behind an explicit disclosure and the log is not a live region, so
    // opening a dump is user opt-in — hiding it would make aria-expanded/aria-controls
    // advertise a toggle over content AT cannot see.
    renderLine(mkLine({ detail: 'x'.repeat(500) }), true)
    const block = screen.getByTestId('terminal-detail-7')
    expect(block).not.toHaveAttribute('aria-hidden')
    expect(screen.getByRole('button')).toHaveAttribute('aria-controls', 'terminal-detail-7')
  })

  it('is memoized so appends never re-render existing rows (keyed by seq in the parent)', () => {
    expect((TerminalLine as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
  })
})

/** jsdom normalizes hex inline colours to rgb(r, g, b). */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}
