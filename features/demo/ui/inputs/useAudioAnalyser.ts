'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import {
  SPECTRUM_BAR_COUNT,
  spectrumBars,
  waveformLevel,
} from '@/features/demo/engine/logic/media/audio-levels'
import {
  prefersReducedMotion,
  readBrowserAnalyser,
  type AnalyserHandle,
  type AnalyserIo,
} from '@/features/demo/ui/inputs/audio-analyser'

/**
 * The recorder's live meter as a hook (parity P4.6) — the demo's analog of the phone's
 * `analysisData` prop chain, which arrives from the native audio pipeline already sampled.
 *
 * All it does is poll: open an analyser on the stream, read its two buffers on a timer, and
 * hand the pure functions in `engine/logic/media/audio-levels.ts` the result. Nothing here
 * decides anything, which is why the bucketing and the dB rules are testable without a DOM.
 *
 * ── The one invariant worth naming ──────────────────────────────────────────────────────
 * `available: false` is never accompanied by non-zero data, and non-zero data is never
 * reported as unavailable. A meter that showed movement it could not source, or sat flat
 * while claiming to be live, would be lying about what the microphone heard — so the resting
 * value is a single frozen constant and every un-live path returns exactly it.
 */

export interface AudioMeter {
  /** Per-bar magnitudes, 0–1, always `SPECTRUM_BAR_COUNT` long so the panel never reflows. */
  bars: readonly number[]
  /** Peak level, 0–1. */
  level: number
  /** Whether these figures came from a running analyser. `false` = there is no live meter
   *  here, and the panel must say so rather than render the zeros as silence. */
  available: boolean
}

/** How often the meter re-reads the analyser. ~16/sec: smooth enough to look live, far below
 *  a render-per-frame. */
export const METER_TICK_MS = 60

/** The reduced-motion rate. The bars are DATA, so they keep updating — but a display that
 *  moves 16 times a second is still motion, and 4/sec reads as a level meter rather than an
 *  animation. */
export const METER_TICK_MS_REDUCED = 250

/** The resting meter: flat bars, no level, and honest about not being live. Frozen because
 *  every un-live path returns this exact object — identity is the pin. */
export const RESTING_METER: AudioMeter = Object.freeze({
  bars: Object.freeze(new Array<number>(SPECTRUM_BAR_COUNT).fill(0)) as readonly number[],
  level: 0,
  available: false,
})

export interface UseAudioAnalyserOptions {
  /** The live microphone stream, or `null` when there is none yet. */
  stream: MediaStream | null
  deps?: {
    /** Test seam. An explicit `null` forces the no-analyser path. */
    analyser?: AnalyserIo | null
    /** Override the media query (the hook reads `prefers-reduced-motion` otherwise). */
    reducedMotion?: boolean
  }
}

export function useAudioAnalyser({ stream, deps }: UseAudioAnalyserOptions): AudioMeter {
  // Resolved once per mount: a browser does not grow a Web Audio implementation mid-session.
  const io = useMemo<AnalyserIo | null>(
    () => (deps?.analyser !== undefined ? deps.analyser : readBrowserAnalyser()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time capability probe
    [],
  )
  const reducedMotion = deps?.reducedMotion
  const [meter, setMeter] = useState<AudioMeter>(RESTING_METER)
  const handleRef = useRef<AnalyserHandle | null>(null)

  useEffect(() => {
    if (io === null || stream === null) {
      setMeter(RESTING_METER)
      return
    }

    const handle = io.open(stream)
    if (handle === null) {
      setMeter(RESTING_METER)
      return
    }
    handleRef.current = handle

    const tick = (): void => {
      // Re-checked every tick, not once at open: a context can be suspended by the browser
      // after the fact (a backgrounded tab), and the buffers go to zeros when it is.
      if (!handle.running()) {
        setMeter(RESTING_METER)
        return
      }
      setMeter({
        bars: spectrumBars(handle.frequencies()),
        level: waveformLevel(handle.waveform()),
        available: true,
      })
    }

    tick()
    const period = (reducedMotion ?? prefersReducedMotion()) ? METER_TICK_MS_REDUCED : METER_TICK_MS
    const id = window.setInterval(tick, period)
    return () => {
      window.clearInterval(id)
      handleRef.current = null
      // Releasing the context matters as much as releasing the tracks: an abandoned
      // AudioContext keeps an audio thread alive for the life of the tab.
      handle.close()
      setMeter(RESTING_METER)
    }
  }, [io, stream, reducedMotion])

  return meter
}
