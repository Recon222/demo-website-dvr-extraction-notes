'use client'

/**
 * Web Audio I/O for the recorder's live meter (parity P4.6) — the analyser counterpart of
 * `capture-media.ts`, and the demo's stand-in for the phone's native `analysisData` feed.
 *
 * Same two conventions as every other input module here:
 * - the browser API is read through `read*()` at CALL time, never at module scope, so a test
 *   can install a stub first and an SSR import cannot touch `window`;
 * - the absence of the API is a first-class answer (`null`), not an exception — jsdom has no
 *   `AudioContext`, so the honest "no live meter" path is the DEFAULT tested contract.
 *
 * ── Why the handle reports `running()` ──────────────────────────────────────────────────
 * An `AudioContext` constructed outside a user gesture starts SUSPENDED, and a suspended
 * analyser fills its buffers with zeros. Flat bars over a live recording would read as "the
 * microphone is hearing silence" — a false statement about the take, which is exactly the
 * class of thing this demo refuses to render. So the handle exposes whether the graph is
 * actually running, the hook re-checks it every tick, and a suspended context degrades to the
 * same explicit "no live meter" notice as a browser with no Web Audio at all.
 *
 * The graph is deliberately NOT connected to `ctx.destination`: an analyser tap on the
 * microphone routed to the speakers is a feedback loop in the visitor's room.
 */

// ---- Injection seams ------------------------------------------------------

export interface AnalyserHandle {
  /** Frequency-domain magnitudes, 0–255. Returns the SAME buffer every call (it is refilled
   *  in place) — the caller must consume it before the next tick, which the hook does. */
  frequencies(): Uint8Array
  /** Time-domain samples, 0–255 centred on 128. Same buffer-reuse contract. */
  waveform(): Uint8Array
  /** Whether the audio graph is actually processing. `false` means the buffers above are
   *  zeros for a reason that has nothing to do with what the microphone heard. */
  running(): boolean
  /** Tear the graph down and release the context. */
  close(): void
}

export interface AnalyserIo {
  /** Attach an analyser to `stream`, or `null` when this browser cannot. */
  open(stream: MediaStream): AnalyserHandle | null
}

/** FFT size: 512 bins. Enough resolution for a recognisable voice spectrum at 40 bars, small
 *  enough that a tick costs nothing. */
const FFT_SIZE = 1024

/** Inter-frame smoothing. The phone lerps its bars in the animation loop
 *  (`BAR_LERP_SPEED_RECORDING`); the analyser does the equivalent for free. */
const SMOOTHING = 0.7

type AudioContextCtor = new () => AudioContext

function readAudioContextCtor(): AudioContextCtor | null {
  const scope = globalThis as { AudioContext?: unknown; webkitAudioContext?: unknown }
  const ctor = scope.AudioContext ?? scope.webkitAudioContext
  return typeof ctor === 'function' ? (ctor as AudioContextCtor) : null
}

/** The browser's Web Audio analyser, or `null` where there is none (jsdom, a hardened
 *  browser). Read at call time. */
export function readBrowserAnalyser(): AnalyserIo | null {
  const Ctor = readAudioContextCtor()
  if (Ctor === null) return null
  return { open: (stream) => openAnalyser(Ctor, stream) }
}

function openAnalyser(Ctor: AudioContextCtor, stream: MediaStream): AnalyserHandle | null {
  let context: AudioContext
  try {
    context = new Ctor()
  } catch {
    return null
  }

  try {
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = SMOOTHING
    source.connect(analyser)

    // Best-effort: a context created outside a gesture starts suspended, and the page has
    // sticky activation by the time the recorder is on screen (the visitor pressed a drawer
    // row to get here). If it stays suspended anyway, `running()` reports it — nothing is
    // swallowed, the meter just says it has nothing to show.
    void context.resume?.()?.catch?.(() => undefined)

    const frequencyBuffer = new Uint8Array(analyser.frequencyBinCount)
    const waveformBuffer = new Uint8Array(analyser.fftSize)
    let closed = false

    return {
      frequencies() {
        if (!closed) analyser.getByteFrequencyData(frequencyBuffer)
        return frequencyBuffer
      },
      waveform() {
        if (!closed) analyser.getByteTimeDomainData(waveformBuffer)
        return waveformBuffer
      },
      running() {
        return !closed && context.state === 'running'
      },
      close() {
        if (closed) return
        closed = true
        try {
          source.disconnect()
          analyser.disconnect()
        } catch {
          // Already torn down by the track ending — nothing left to release.
        }
        void context.close?.()?.catch?.(() => undefined)
      },
    }
  } catch {
    void context.close?.()?.catch?.(() => undefined)
    return null
  }
}

// ---- Track facts ----------------------------------------------------------

/** What the live audio track reports about itself. `null` for anything it does not state —
 *  the recorder's format row prints an em dash rather than the phone's constants (see
 *  `engine/logic/media/audio-levels.ts`). */
export interface AudioTrackFormat {
  sampleRate: number | null
  channels: number | null
}

export const UNKNOWN_AUDIO_FORMAT: AudioTrackFormat = Object.freeze({ sampleRate: null, channels: null })

/**
 * Read the sample rate and channel count off the opened microphone track.
 *
 * `getSettings` is optional in practice (older Safari, every hand-built stream in the test
 * suite), and it may report neither field even where it exists — Firefox omits `sampleRate`.
 * Both cases yield `null`, which the panel renders as unknown. Nothing here falls back to a
 * plausible default: an unverified 44.1kHz printed next to a real recording is the phone's
 * truth, not this browser's.
 */
export function readAudioTrackFormat(stream: MediaStream | null): AudioTrackFormat {
  if (!stream || typeof stream.getAudioTracks !== 'function') return UNKNOWN_AUDIO_FORMAT
  for (const track of stream.getAudioTracks()) {
    if (typeof track.getSettings !== 'function') continue
    const settings = track.getSettings()
    const sampleRate = typeof settings.sampleRate === 'number' ? settings.sampleRate : null
    const channels = typeof settings.channelCount === 'number' ? settings.channelCount : null
    if (sampleRate !== null || channels !== null) return { sampleRate, channels }
  }
  return UNKNOWN_AUDIO_FORMAT
}
