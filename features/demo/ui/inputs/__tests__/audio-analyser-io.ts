import { vi } from 'vitest'

import type { AnalyserHandle, AnalyserIo } from '@/features/demo/ui/inputs/audio-analyser'

/**
 * Fakes for the recorder's meter (P4.6). jsdom implements no `AudioContext`, so a hand-built
 * analyser is the only way to exercise the LIVE path at all — and it also lets a test drive
 * the buffers frame by frame, which a real one could not.
 */

export interface FakeAnalyser extends AnalyserHandle {
  closes: number
  /** Set the frequency bins the next `frequencies()` returns. */
  setFrequencies(values: readonly number[]): void
  /** Set the time-domain samples the next `waveform()` returns. */
  setWaveform(values: readonly number[]): void
  /** Flip the graph's running state, as a suspended context does. */
  setRunning(running: boolean): void
}

export function fakeAnalyser(binCount = 64): FakeAnalyser {
  let frequencies = new Uint8Array(binCount)
  let waveform = new Uint8Array(binCount).fill(128)
  let running = true
  const handle: FakeAnalyser = {
    closes: 0,
    frequencies: () => frequencies,
    waveform: () => waveform,
    running: () => running,
    close() {
      handle.closes++
    },
    setFrequencies(values) {
      frequencies = Uint8Array.from(values)
    },
    setWaveform(values) {
      waveform = Uint8Array.from(values)
    },
    setRunning(next) {
      running = next
    },
  }
  return handle
}

/** An `AnalyserIo` handing back `handle` (or refusing, with `handle: null`). */
export function fakeAnalyserIo(handle: AnalyserHandle | null): AnalyserIo & { open: ReturnType<typeof vi.fn> } {
  return { open: vi.fn(() => handle) }
}
