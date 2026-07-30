import { describe, it, expect, vi } from 'vitest'
import {
  createImportLogBus,
  importLogBus,
  clipDetail,
  IMPORT_LOG_MAX_LINES,
  type ImportLogEvent,
  type ImportLogLevel,
  type ImportLogLine,
} from '@/features/demo/engine/logic/import-log'

/** Stepping clock: starts at `start`, advances `step` ms per read. */
function steppingClock(start = 1_000, step = 50): () => number {
  let t = start - step
  return () => (t += step)
}

const fixedClock = (t = 0) => () => t

describe('createImportLogBus', () => {
  it('stamps seq (1-based) and elapsedMs from the injected clock — deterministic, no Date.now()', () => {
    const bus = createImportLogBus()
    const dateNow = vi.spyOn(Date, 'now')
    // beginRun reads t0=1000; each log reads 1050, 1100, 1150.
    const em = bus.beginRun(steppingClock(1_000, 50))
    em.log('INIT', 'reading document…')
    em.log('PDF', 'extract text ✓', 'pdf.js · 3184 chars')
    em.log('OK', 'normalize ✓')
    expect(bus.getLines()).toEqual([
      { seq: 1, elapsedMs: 50, level: 'INIT', text: 'reading document…' },
      { seq: 2, elapsedMs: 100, level: 'PDF', text: 'extract text ✓', detail: 'pdf.js · 3184 chars' },
      { seq: 3, elapsedMs: 150, level: 'OK', text: 'normalize ✓' },
    ])
    expect(dateNow).not.toHaveBeenCalled()
    dateNow.mockRestore()
  })

  it('clamps elapsedMs at 0 when the clock runs backwards', () => {
    const bus = createImportLogBus()
    let t = 1_000
    const em = bus.beginRun(() => t)
    t = 400 // clock skew backwards
    em.log('INIT', 'x')
    expect(bus.getLines()[0]!.elapsedMs).toBe(0)
    expect(em.elapsed()).toBe(0)
  })

  it('accepts every level of the phone set verbatim', () => {
    const levels: ImportLogLevel[] = ['INIT', 'FILE', 'PDF', 'AI', 'VERB', 'NORM', 'CASE', 'OK', 'DONE', 'ERR']
    const bus = createImportLogBus()
    const em = bus.beginRun(fixedClock())
    for (const level of levels) em.log(level, `line ${level}`)
    expect(bus.getLines().map((l) => l.level)).toEqual(levels)
  })

  it('replays the full retained run to a new subscriber, then delivers live appends', () => {
    const bus = createImportLogBus()
    const em = bus.beginRun(fixedClock())
    em.log('INIT', 'a')
    em.log('AI', 'b')
    const seen: ImportLogEvent[] = []
    const unsub = bus.subscribe((e) => seen.push(e))
    // Replay is synchronous, in emit order.
    expect(seen.map((e) => (e.kind === 'line' ? e.line.text : 'reset'))).toEqual(['a', 'b'])
    em.log('OK', 'c')
    expect(seen).toHaveLength(3)
    expect(seen[2]).toEqual({ kind: 'line', line: { seq: 3, elapsedMs: 0, level: 'OK', text: 'c' } })
    unsub()
    em.log('DONE', 'd')
    expect(seen).toHaveLength(3) // unsubscribed — no more events
  })

  it(`ring-caps the retained log at ${IMPORT_LOG_MAX_LINES} lines, evicting oldest, seq keeps counting`, () => {
    const bus = createImportLogBus()
    const em = bus.beginRun(fixedClock())
    for (let i = 0; i < IMPORT_LOG_MAX_LINES + 5; i++) em.log('VERB', `line ${i + 1}`)
    const lines = bus.getLines()
    expect(lines).toHaveLength(IMPORT_LOG_MAX_LINES)
    expect(lines[0]!.seq).toBe(6) // first 5 evicted
    expect(lines[lines.length - 1]!.seq).toBe(IMPORT_LOG_MAX_LINES + 5)
    // A late subscriber replays exactly the capped window.
    const replayed: ImportLogLine[] = []
    bus.subscribe((e) => e.kind === 'line' && replayed.push(e.line))
    expect(replayed).toHaveLength(IMPORT_LOG_MAX_LINES)
    expect(replayed[0]!.seq).toBe(6)
  })

  it('beginRun clears the retained log, bumps the epoch, and broadcasts a reset marker', () => {
    const bus = createImportLogBus()
    const em1 = bus.beginRun(fixedClock())
    em1.log('INIT', 'old run')
    const events: ImportLogEvent[] = []
    bus.subscribe((e) => events.push(e))
    const epochBefore = bus.getEpoch()
    const em2 = bus.beginRun(fixedClock())
    expect(bus.getEpoch()).toBe(epochBefore + 1)
    expect(events[events.length - 1]).toEqual({ kind: 'reset', epoch: epochBefore + 1 })
    expect(bus.getLines()).toEqual([]) // old run gone
    em2.log('INIT', 'new run')
    expect(bus.getLines().map((l) => l.text)).toEqual(['new run'])
    expect(bus.getLines()[0]!.seq).toBe(1) // seq restarts per run
  })

  it('drops late lines from a superseded run (generation-token isolation)', () => {
    const bus = createImportLogBus()
    const stale = bus.beginRun(fixedClock())
    stale.log('INIT', 'run 1')
    const live = bus.beginRun(fixedClock())
    live.log('INIT', 'run 2')
    const seen: string[] = []
    bus.subscribe((e) => e.kind === 'line' && seen.push(e.line.text))
    stale.log('DONE', 'late line from cancelled run') // must vanish
    expect(stale.isLive()).toBe(false)
    expect(live.isLive()).toBe(true)
    expect(bus.getLines().map((l) => l.text)).toEqual(['run 2'])
    expect(seen).toEqual(['run 2']) // replay only — the stale append never dispatched
    live.log('OK', 'still live')
    expect(bus.getLines().map((l) => l.text)).toEqual(['run 2', 'still live'])
  })

  it('reset() cancels the current run: clears lines, invalidates the emitter, broadcasts reset', () => {
    const bus = createImportLogBus()
    const em = bus.beginRun(fixedClock())
    em.log('INIT', 'in flight')
    const events: ImportLogEvent[] = []
    bus.subscribe((e) => events.push(e))
    const epochBefore = bus.getEpoch()
    bus.reset()
    expect(bus.getEpoch()).toBe(epochBefore + 1)
    expect(events[events.length - 1]).toEqual({ kind: 'reset', epoch: epochBefore + 1 })
    expect(bus.getLines()).toEqual([])
    em.log('ERR', 'late failure line') // arrives after cancel
    expect(em.isLive()).toBe(false)
    expect(bus.getLines()).toEqual([]) // dropped
  })

  it('getLines returns a snapshot copy — mutating it cannot corrupt the bus', () => {
    const bus = createImportLogBus()
    const em = bus.beginRun(fixedClock())
    em.log('INIT', 'a')
    const snapshot = bus.getLines()
    snapshot.push({ seq: 99, elapsedMs: 0, level: 'ERR', text: 'injected' })
    expect(bus.getLines()).toHaveLength(1)
  })

  it('elapsed() tracks the run clock for duration details', () => {
    const bus = createImportLogBus()
    let t = 5_000
    const em = bus.beginRun(() => t)
    expect(em.elapsed()).toBe(0)
    t = 5_142
    expect(em.elapsed()).toBe(142)
  })
})

describe('clipDetail', () => {
  it('passes short text through untouched', () => {
    expect(clipDetail('abc', 10)).toBe('abc')
  })
  it('clips long text at max with an ellipsis marker', () => {
    expect(clipDetail('a'.repeat(20), 10)).toBe(`${'a'.repeat(10)}…`)
  })
})

describe('importLogBus singleton', () => {
  it('is a working bus instance (the pipeline and the hook share it)', () => {
    const em = importLogBus.beginRun(fixedClock())
    em.log('INIT', 'singleton smoke')
    expect(importLogBus.getLines().map((l) => l.text)).toEqual(['singleton smoke'])
    importLogBus.reset()
    expect(importLogBus.getLines()).toEqual([])
  })
})
