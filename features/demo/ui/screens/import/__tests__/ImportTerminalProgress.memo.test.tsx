import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

/**
 * R-27/R-42: the no-RE-RENDER invariant, counted for real. Node-identity checks pass
 * even when a parent mutation (inline onToggleDetail) re-renders every row — React
 * reconciles same type + same key into the same DOM node. Only a render COUNTER
 * discriminates: the row module is replaced by a memo-wrapped counting delegate with
 * the same shallow-compare semantics, so an unstable parent prop re-renders history
 * and fails this test, while the real contract (stable line objects + per-seq
 * expanded + useCallback'd toggle) keeps history at exactly one render each.
 * Dedicated file: vi.mock is module-wide and must not leak into the main suite.
 */
const renderCounts = vi.hoisted(() => new Map<number, number>())
vi.mock('@/features/demo/ui/screens/import/TerminalLine', async () => {
  const { memo, createElement } = await import('react')
  interface Props {
    line: { seq: number; text: string }
    expanded: boolean
    onToggleDetail(seq: number): void
  }
  const TerminalLine = memo(function TerminalLine({ line }: Props) {
    renderCounts.set(line.seq, (renderCounts.get(line.seq) ?? 0) + 1)
    return createElement('div', { 'data-testid': `terminal-line-${line.seq}` }, line.text)
  })
  return { TerminalLine }
})

import { ImportTerminalProgress } from '@/features/demo/ui/screens/import/ImportTerminalProgress'
import { createImportLogBus } from '@/features/demo/engine/logic/import-log'

beforeEach(() => {
  vi.useFakeTimers()
  renderCounts.clear()
})
afterEach(() => vi.useRealTimers())

const nextFrame = () => act(() => void vi.advanceTimersToNextFrame())

describe('ImportTerminalProgress row render counts (R-42)', () => {
  it('appending a line renders ONLY the new row — history renders exactly once each', () => {
    const bus = createImportLogBus()
    const emitter = bus.beginRun(() => 0)
    render(
      <ImportTerminalProgress stage="reading_model" lastRealStage={null} outcome={null} batch={null} onReview={() => {}} bus={bus} />,
    )
    nextFrame()
    act(() => {
      emitter.log('INIT', 'a')
      emitter.log('OK', 'b')
      emitter.log('OK', 'c')
    })
    nextFrame()
    expect(Object.fromEntries(renderCounts)).toEqual({ 1: 1, 2: 1, 3: 1 })
    act(() => emitter.log('OK', 'd'))
    nextFrame()
    // The load-bearing claim behind shipping no virtualization at the 400-line cap:
    // an unstable onToggleDetail / non-per-seq expanded would bump 1..3 here.
    expect(Object.fromEntries(renderCounts)).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1 })
  })
})
