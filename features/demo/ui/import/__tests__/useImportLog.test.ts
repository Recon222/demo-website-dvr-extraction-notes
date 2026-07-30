import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useImportLog } from '@/features/demo/ui/import/useImportLog'
import { createImportLogBus, IMPORT_LOG_MAX_LINES, type ImportLogBus, type ImportLogEmitter } from '@/features/demo/engine/logic/import-log'

// Fake timers drive the coalescing frame deterministically (jsdom's rAF is timer-based;
// sinon fakes it — vi.advanceTimersToNextFrame flushes exactly one pending frame).
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

let bus: ImportLogBus
let emitter: ImportLogEmitter

const nextFrame = () => act(() => void vi.advanceTimersToNextFrame())

function freshRun() {
  bus = createImportLogBus()
  emitter = bus.beginRun(() => 0)
}

describe('useImportLog', () => {
  it('replays the retained run on subscribe, committed on the first frame', () => {
    freshRun()
    emitter.log('INIT', 'reading document…')
    emitter.log('PDF', 'extract text ✓')
    const { result } = renderHook(() => useImportLog(true, bus))
    expect(result.current.lines).toEqual([]) // nothing before the frame
    nextFrame()
    expect(result.current.lines.map((l) => l.text)).toEqual(['reading document…', 'extract text ✓'])
    expect(result.current.epoch).toBe(bus.getEpoch())
  })

  it('coalesces an emit burst into ONE state commit per frame', () => {
    freshRun()
    let renders = 0
    const { result } = renderHook(() => {
      renders++
      return useImportLog(true, bus)
    })
    nextFrame() // settle the (empty) replay commit
    const rendersBefore = renders
    act(() => {
      for (let i = 0; i < 25; i++) emitter.log('VERB', `line ${i + 1}`)
    })
    expect(result.current.lines).toHaveLength(0) // buffered — not yet committed
    nextFrame()
    expect(result.current.lines).toHaveLength(25)
    expect(renders).toBe(rendersBefore + 1) // 25 events → exactly one render
    // No pending frame is left behind: nothing further commits without new events.
    nextFrame()
    expect(renders).toBe(rendersBefore + 1)
  })

  it('a reset marker clears the committed lines and bumps the epoch (new-run signal)', () => {
    freshRun()
    emitter.log('INIT', 'old run')
    const { result } = renderHook(() => useImportLog(true, bus))
    nextFrame()
    expect(result.current.lines).toHaveLength(1)
    const epochBefore = result.current.epoch
    act(() => {
      const next = bus.beginRun(() => 0) // reset + new run in the same frame
      next.log('INIT', 'new run')
      next.log('FILE', "▸ file 1/1 'a.pdf'")
    })
    nextFrame()
    expect(result.current.epoch).toBe(epochBefore + 1)
    expect(result.current.lines.map((l) => l.text)).toEqual(['new run', "▸ file 1/1 'a.pdf'"]) // old run gone
  })

  it('mirrors the 400-line ring cap on the committed buffer', () => {
    freshRun()
    for (let i = 0; i < IMPORT_LOG_MAX_LINES + 10; i++) emitter.log('VERB', `l${i + 1}`) // bus retains seq 11..410
    const { result } = renderHook(() => useImportLog(true, bus))
    nextFrame()
    act(() => {
      for (let i = 0; i < 5; i++) emitter.log('OK', `live ${i + 1}`) // committed would be 405
    })
    nextFrame()
    expect(result.current.lines).toHaveLength(IMPORT_LOG_MAX_LINES)
    expect(result.current.lines[0]!.seq).toBe(16) // oldest evicted from the mirror too
  })

  it('active=false clears the lines (and stops consuming) without losing the epoch', () => {
    freshRun()
    emitter.log('INIT', 'x')
    const { result, rerender } = renderHook(({ active }) => useImportLog(active, bus), { initialProps: { active: true } })
    nextFrame()
    expect(result.current.lines).toHaveLength(1)
    const epoch = result.current.epoch
    rerender({ active: false })
    expect(result.current.lines).toEqual([])
    expect(result.current.epoch).toBe(epoch)
    act(() => emitter.log('OK', 'while inactive'))
    nextFrame()
    expect(result.current.lines).toEqual([]) // unsubscribed — nothing arrives
    // Re-activating resubscribes and replays the full retained run.
    rerender({ active: true })
    nextFrame()
    expect(result.current.lines.map((l) => l.text)).toEqual(['x', 'while inactive'])
  })

  it('unmount cancels the pending flush — a buffered burst cannot commit into a dead hook', () => {
    freshRun()
    const { unmount } = renderHook(() => useImportLog(true, bus))
    act(() => emitter.log('INIT', 'buffered'))
    unmount() // pending frame cancelled before it fires
    expect(() => act(() => void vi.advanceTimersToNextFrame())).not.toThrow()
  })

  it('starts with the bus epoch even before any subscription commit', () => {
    freshRun()
    bus.reset()
    bus.beginRun(() => 0)
    const { result } = renderHook(() => useImportLog(false, bus))
    expect(result.current.epoch).toBe(bus.getEpoch())
    expect(result.current.lines).toEqual([])
  })
})
