import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  METER_TICK_MS,
  METER_TICK_MS_REDUCED,
  RESTING_METER,
  useAudioAnalyser,
  type UseAudioAnalyserOptions,
} from '@/features/demo/ui/inputs/useAudioAnalyser'
import { fakeAnalyser, fakeAnalyserIo, type FakeAnalyser } from '@/features/demo/ui/inputs/__tests__/audio-analyser-io'

const STREAM = { id: 'mic' } as unknown as MediaStream

function mount(over: Partial<UseAudioAnalyserOptions> = {}) {
  const options: UseAudioAnalyserOptions = { stream: STREAM, ...over }
  return renderHook(() => useAudioAnalyser(options))
}

/** Advance past `count` meter ticks. */
function tick(count = 1, period = METER_TICK_MS) {
  act(() => {
    vi.advanceTimersByTime(period * count + 1)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useAudioAnalyser', () => {
  it('rests — flat bars, explicitly unavailable — when the browser has no Web Audio', () => {
    const hook = mount({ deps: { analyser: null } })
    expect(hook.result.current).toBe(RESTING_METER)
    expect(hook.result.current.available).toBe(false)
    expect(hook.result.current.bars.every((bar) => bar === 0)).toBe(true)
  })

  it('rests with no stream, and never opens an analyser for one that does not exist', () => {
    const io = fakeAnalyserIo(fakeAnalyser())
    const hook = mount({ stream: null, deps: { analyser: io } })
    expect(hook.result.current).toBe(RESTING_METER)
    expect(io.open).not.toHaveBeenCalled()
  })

  it('rests when the browser refuses to build the graph', () => {
    const hook = mount({ deps: { analyser: fakeAnalyserIo(null) } })
    expect(hook.result.current).toBe(RESTING_METER)
  })

  it('reports live figures from the analyser buffers', () => {
    const analyser = fakeAnalyser(64)
    analyser.setFrequencies(new Array<number>(64).fill(255))
    analyser.setWaveform([128, 255, 128, 0])
    const hook = mount({ deps: { analyser: fakeAnalyserIo(analyser) } })

    expect(hook.result.current.available).toBe(true)
    expect(hook.result.current.level).toBe(1)
    expect(hook.result.current.bars.every((bar) => bar === 1)).toBe(true)
  })

  it('keeps re-reading on the tick, so the meter follows the microphone', () => {
    const analyser = fakeAnalyser(64)
    const hook = mount({ deps: { analyser: fakeAnalyserIo(analyser) } })
    expect(hook.result.current.level).toBe(0)

    analyser.setWaveform([128, 192, 128])
    tick()

    expect(hook.result.current.level).toBeCloseTo(64 / 128, 6)
  })

  it('falls back to rest the moment the graph stops running — zeros are never sold as silence', () => {
    // Mutation probe: delete the `running()` check in `tick` and this fails — the hook would
    // keep publishing `available: true` over an analyser filling zeros.
    const analyser = fakeAnalyser(64)
    analyser.setFrequencies(new Array<number>(64).fill(200))
    const hook = mount({ deps: { analyser: fakeAnalyserIo(analyser) } })
    expect(hook.result.current.available).toBe(true)

    analyser.setRunning(false)
    tick()

    expect(hook.result.current).toBe(RESTING_METER)
  })

  it('closes the analyser on unmount — an orphaned AudioContext keeps an audio thread alive', () => {
    // Mutation probe: drop `handle.close()` from the effect cleanup and this fails.
    const analyser = fakeAnalyser()
    const hook = mount({ deps: { analyser: fakeAnalyserIo(analyser) } })
    expect(analyser.closes).toBe(0)

    hook.unmount()

    expect(analyser.closes).toBe(1)
  })

  it('closes the old analyser and opens a new one when the stream is replaced', () => {
    const first = fakeAnalyser()
    const second = fakeAnalyser()
    const opened: FakeAnalyser[] = []
    const io = {
      open: vi.fn(() => {
        const next = opened.length === 0 ? first : second
        opened.push(next)
        return next
      }),
    }
    const other = { id: 'mic-2' } as unknown as MediaStream

    const hook = renderHook(({ stream }: { stream: MediaStream }) => useAudioAnalyser({ stream, deps: { analyser: io } }), {
      initialProps: { stream: STREAM },
    })
    hook.rerender({ stream: other })

    expect(io.open).toHaveBeenCalledTimes(2)
    expect(first.closes).toBe(1)
    expect(second.closes).toBe(0)
  })

  it('slows the refresh under prefers-reduced-motion without going dark', () => {
    const analyser = fakeAnalyser(64)
    const hook = mount({ deps: { analyser: fakeAnalyserIo(analyser), reducedMotion: true } })
    // The data is still live — reduced motion changes the rate, not the honesty.
    expect(hook.result.current.available).toBe(true)

    analyser.setWaveform([128, 255])
    tick(1, METER_TICK_MS)
    expect(hook.result.current.level).toBe(0)

    tick(1, METER_TICK_MS_REDUCED)
    expect(hook.result.current.level).toBeCloseTo(127 / 128, 6)
  })
})
