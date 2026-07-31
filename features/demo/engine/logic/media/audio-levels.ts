/**
 * Audio metering + recorder-panel labelling — the pure half of the demo's audio recorder
 * (parity P4.6, matrix rows 67-69). Every value on the recorder screen that is DERIVED rather
 * than merely rendered is derived here, so the numbers are unit-testable without an
 * `AudioContext` (jsdom has none, so the screen's honest no-analyser path is the default
 * tested contract — the same posture P4.1 took with `mediaDevices`).
 *
 * ── Where these differ from the phone, and why ───────────────────────────────────────────
 * The phone's `SpectrumVisualizer` shapes its 40 bars from ONE amplitude figure plus a
 * per-bar frequency curve and a random jitter (`SpectrumVisualizer.tsx:218-231`) — the native
 * pipeline hands it a single `amplitude`, so the spectrum's SHAPE is decorative even though
 * its height is real. A browser gives the demo a genuine `AnalyserNode`, so the bars here are
 * bucketed FFT bins: real per-band magnitudes, no jitter. Better data, same panel.
 *
 * The dB readout, its `-inf` floor, the three fill-colour bands and the `READY`/`REC`/`PAUSED`
 * vocabulary are verbatim ports — those are the phone's rules, not artefacts of its library.
 */

import type { RecordingPhase } from '@/features/demo/engine/logic/media/recording'

// ---- Spectrum -------------------------------------------------------------

/** The phone's bar count (`SpectrumVisualizer.tsx:45`). */
export const SPECTRUM_BAR_COUNT = 40

/**
 * How much of the analyser's frequency range the panel shows, as a fraction of the bins.
 *
 * An `AnalyserNode` reports bins evenly across 0 → sampleRate/2 (24kHz at 48k), and a spoken
 * voice note puts effectively all of its energy in the bottom couple of kHz. Rendering the
 * full range would leave three quarters of the bars flat at all times — a display that shows
 * real data but tells the visitor nothing. A quarter of the range is ~6kHz, the band an audio
 * recorder's own analyser typically shows. This is a choice of WHICH real bins to display,
 * never a rescaling of what they say.
 */
export const SPECTRUM_BIN_FRACTION = 0.25

/**
 * Bucket frequency-domain magnitudes (0–255, as `getByteFrequencyData` fills them) into
 * `barCount` bars normalised to 0–1.
 *
 * Each bar is the MEAN of its bucket, not the peak: a peak-per-bucket display latches onto
 * single-bin transients and reads as noise at 40 bars. An empty or absent buffer yields a bar
 * per position at zero rather than an empty array — the panel's geometry must not change
 * shape depending on whether an analyser is attached, or the layout would jump the moment a
 * microphone opens.
 */
export function spectrumBars(
  frequencies: ArrayLike<number>,
  barCount: number = SPECTRUM_BAR_COUNT,
  binFraction: number = SPECTRUM_BIN_FRACTION,
): number[] {
  if (barCount <= 0) return []
  const usable = Math.floor(frequencies.length * clamp01(binFraction))
  if (usable <= 0) return new Array<number>(barCount).fill(0)

  const bars = new Array<number>(barCount).fill(0)
  for (let bar = 0; bar < barCount; bar++) {
    const from = Math.floor((bar * usable) / barCount)
    // A bucket must never be empty (more bars than bins is legal), so the end is pushed past
    // the start rather than allowed to collapse — otherwise the division below is 0/0.
    const to = Math.max(from + 1, Math.floor(((bar + 1) * usable) / barCount))
    let total = 0
    let counted = 0
    for (let bin = from; bin < to && bin < frequencies.length; bin++) {
      total += frequencies[bin]
      counted++
    }
    bars[bar] = counted === 0 ? 0 : clamp01(total / counted / 255)
  }
  return bars
}

// ---- Level ----------------------------------------------------------------

/**
 * Peak level of a time-domain buffer (0–255, 128 = silence, as `getByteTimeDomainData` fills
 * it) as a 0–1 figure — the demo's stand-in for the phone's `analysisData` amplitude.
 *
 * PEAK, not RMS: the meter's job is to show the operator whether the take is clipping, and an
 * RMS meter hides exactly the transient that does it. This is also what makes the phone's
 * `>85%` red band mean the same thing here.
 */
export function waveformLevel(samples: ArrayLike<number>): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const deviation = Math.abs(samples[i] - 128)
    if (deviation > peak) peak = deviation
  }
  return clamp01(peak / 128)
}

/**
 * The phone's dB readout verbatim (`LevelMeter.tsx:148-153`): `-inf dB` below 1% level,
 * otherwise `20·log10(level)` rounded. The floor is the phone's, not a rounding artefact —
 * `log10(0)` is `-Infinity`, and a meter that printed `-Infinity dB` would be reporting a
 * number rather than the absence of one.
 */
export function levelDbLabel(level: number): string {
  const clamped = clamp01(level)
  if (clamped < 0.01) return '-inf dB'
  return `${Math.round(20 * Math.log10(clamped))} dB`
}

/** The phone's three fill bands (`LevelMeter.tsx:47-51`, `colorForLevelPct`): blue ≤70%,
 *  gold 71–85%, red >85%. Thresholds compare the PERCENTAGE, so the edges land exactly where
 *  the phone's do. */
export function levelFillColor(level: number): string {
  const pct = clamp01(level) * 100
  if (pct > 85) return '#ff4757'
  if (pct > 70) return '#ffd93d'
  return '#2B8CC1'
}

// ---- Recorder status vocabulary -------------------------------------------

/** `READY` / `REC` / `PAUSED` — the phone's `getStatusText` (`TimerCard.tsx:123-129`).
 *  `stopped` reads `READY` because the recorder screen is never shown in that phase (the flow
 *  has already moved to review), and a label nobody can see should still be the safe one. */
export function recorderStatusLabel(phase: RecordingPhase): string {
  switch (phase) {
    case 'recording':
      return 'REC'
    case 'paused':
      return 'PAUSED'
    default:
      return 'READY'
  }
}

/** The phone's `getStatusColor` (`TimerCard.tsx:131-137`): error red recording, gold paused,
 *  muted slate idle. */
export function recorderStatusColor(phase: RecordingPhase): string {
  switch (phase) {
    case 'recording':
      return '#ff4757'
    case 'paused':
      return '#ffd93d'
    default:
      return '#5a7a9a'
  }
}

// ---- Format metadata (the phone's TimerCard bottom row) --------------------

/**
 * The phone prints `44.1kHz / AAC` and `MONO / 128k` from its own deep-frozen constants
 * (`AUDIO_CAPTURE_SETTINGS`) — figures it CHOSE, so printing them is truthful there. The demo
 * chooses none of them: the browser picks the container, and the sample rate and channel count
 * come off the live track. So these three read what is actually true and return `null` when
 * nothing is known, which the panel renders as `—` rather than inventing the phone's numbers.
 *
 * The phone's bitrate cell has no honest counterpart at all — `MediaRecorder` does not report
 * the bitrate it settled on — so the row carries the codec in its place (see §61).
 */
export function formatSampleRate(hz: number | null): string | null {
  if (hz === null || !Number.isFinite(hz) || hz <= 0) return null
  return `${(hz / 1000).toFixed(1)}kHz`
}

/** `MONO` / `STEREO` (phone `TimerCard.tsx:147`), extended: a real device can report more than
 *  two channels, and `4CH` is the truthful answer where the phone's ternary has none. */
export function channelLabel(channels: number | null): string | null {
  if (channels === null || !Number.isInteger(channels) || channels <= 0) return null
  if (channels === 1) return 'MONO'
  if (channels === 2) return 'STEREO'
  return `${channels}CH`
}

/**
 * A short codec name for a recorder MIME type: the `codecs=` parameter when the browser states
 * one (`audio/webm;codecs=opus` → `OPUS`), otherwise the container subtype (`audio/mp4` →
 * `MP4`). `null` for an empty or unparseable type — some browsers report nothing, and a guess
 * printed in a format row is a claim about the file that nobody checked.
 */
export function codecLabel(mimeType: string): string | null {
  const type = mimeType.trim()
  if (type === '') return null

  const codecs = /codecs\s*=\s*"?([^";]+)"?/i.exec(type)
  if (codecs) {
    const first = codecs[1].split(',')[0].trim()
    if (first !== '') return first.toUpperCase()
  }

  const subtype = type.split(';')[0].split('/')[1]
  return subtype === undefined || subtype.trim() === '' ? null : subtype.trim().toUpperCase()
}

/** The clock cell: `HH:MM:SS` out of the demo's `YYYY-MM-DD HH:MM:SS` (the phone's
 *  `getCurrentTimeOfDay`, sourced from the injectable clock seam instead of `new Date()`).
 *  Anything that is not a demo datetime yields `''` — an empty cell, never a mangled one. */
export function timeOfDay(formatted: string): string {
  const match = /\b(\d{2}:\d{2}:\d{2})$/.exec(formatted.trim())
  return match === null ? '' : match[1]
}

// ---- Decoration -----------------------------------------------------------

/**
 * The spectrum panel's bottom scale row, replicated AS DECORATION.
 *
 * `SpectrumVisualizer.tsx:326` renders this array literal with no dependency on `durationMs`,
 * `analysisData` or any prop — the phone's own ui-mapping fact-check (10-audio.md:223)
 * confirms nothing ties the labels to elapsed time, and no comment anywhere states what they
 * were meant to mean. The demo copies the row for visual parity and, like the phone, wires it
 * to nothing. Do not "fix" it into a live axis without a phone-side decision first: a scale
 * that suddenly tracked elapsed time would be a demo-invented behaviour presented as parity.
 */
export const RECORDER_SCALE_LABELS: readonly string[] = Object.freeze(['0s', '5s', '10s', '15s', '20s'])

// ---- internals ------------------------------------------------------------

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}
