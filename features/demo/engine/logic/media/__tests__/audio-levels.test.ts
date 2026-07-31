import { describe, it, expect } from 'vitest'

import {
  RECORDER_SCALE_LABELS,
  SPECTRUM_BAR_COUNT,
  SPECTRUM_BIN_FRACTION,
  channelLabel,
  codecLabel,
  formatSampleRate,
  levelDbLabel,
  levelFillColor,
  recorderStatusColor,
  recorderStatusLabel,
  spectrumBars,
  timeOfDay,
  waveformLevel,
} from '@/features/demo/engine/logic/media/audio-levels'

/** A frequency buffer whose bins are `fill(binIndex)` — so a bucket's mean is knowable. */
function bins(length: number, fill: (index: number) => number): Uint8Array {
  const out = new Uint8Array(length)
  for (let i = 0; i < length; i++) out[i] = fill(i)
  return out
}

describe('spectrumBars', () => {
  it('averages each bucket of the displayed range and normalises to 0–1', () => {
    // 16 bins, quarter fraction → 4 usable bins, 2 bars → buckets [0,1] and [2,3].
    const bars = spectrumBars(bins(16, (i) => i * 17), 2, 0.25)
    expect(bars).toHaveLength(2)
    expect(bars[0]).toBeCloseTo((0 + 17) / 2 / 255, 6)
    expect(bars[1]).toBeCloseTo((34 + 51) / 2 / 255, 6)
  })

  it('shows only the low end of the range — the bins above the fraction never reach a bar', () => {
    // Silence in the bottom quarter, full scale above it. A display that read the whole range
    // would light up; the panel must stay dark, because a voice note has nothing up there.
    const loud = spectrumBars(bins(64, (i) => (i < 16 ? 0 : 255)), 8, 0.25)
    expect(loud.every((bar) => bar === 0)).toBe(true)
  })

  it('keeps the panel geometry fixed when there is no analyser attached', () => {
    // The bar COUNT must not depend on having data — otherwise the layout jumps the instant a
    // microphone opens, which is exactly when the visitor is looking at it.
    expect(spectrumBars(new Uint8Array(0), 40)).toHaveLength(40)
    expect(spectrumBars(new Uint8Array(0), 40).every((bar) => bar === 0)).toBe(true)
  })

  it('never divides by an empty bucket when bars outnumber bins', () => {
    const bars = spectrumBars(bins(8, () => 255), 40, 1)
    expect(bars).toHaveLength(40)
    expect(bars.every((bar) => Number.isFinite(bar))).toBe(true)
  })

  it('clamps out-of-range inputs rather than propagating them', () => {
    expect(spectrumBars(bins(8, () => 255), 0)).toEqual([])
    expect(spectrumBars(bins(8, () => 255), 4, 0)).toEqual([0, 0, 0, 0])
    // Bins above 255 (a plain array, not the byte-truncating Uint8Array an analyser fills)
    // must not push a bar past full height.
    expect(spectrumBars([1000, 1000, 1000, 1000], 2, 1).every((bar) => bar === 1)).toBe(true)
  })

  it('defaults to the phone bar count and the documented display range', () => {
    expect(SPECTRUM_BAR_COUNT).toBe(40)
    expect(SPECTRUM_BIN_FRACTION).toBe(0.25)
    expect(spectrumBars(bins(1024, () => 128))).toHaveLength(40)
  })
})

describe('waveformLevel', () => {
  it('reads silence (a buffer pinned at the 128 midpoint) as zero', () => {
    expect(waveformLevel(bins(64, () => 128))).toBe(0)
  })

  it('reads a full-scale excursion as 1 in either direction', () => {
    expect(waveformLevel([128, 255, 128])).toBeCloseTo(127 / 128, 6)
    expect(waveformLevel([128, 0, 128])).toBe(1)
  })

  it('is a PEAK, not an average — one transient in a quiet buffer still registers', () => {
    const quiet = bins(64, (i) => (i === 40 ? 255 : 128))
    // An RMS meter would report ~0.01 here; the peak is what tells the operator it clipped.
    expect(waveformLevel(quiet)).toBeGreaterThan(0.9)
  })

  it('is zero for an empty buffer', () => {
    expect(waveformLevel(new Uint8Array(0))).toBe(0)
  })
})

describe('levelDbLabel (phone LevelMeter.tsx:148-153)', () => {
  it('floors at -inf below 1% rather than printing -Infinity', () => {
    expect(levelDbLabel(0)).toBe('-inf dB')
    expect(levelDbLabel(0.009)).toBe('-inf dB')
  })

  it('is the phone formula at and above the floor', () => {
    expect(levelDbLabel(0.01)).toBe('-40 dB')
    expect(levelDbLabel(1)).toBe('0 dB')
    expect(levelDbLabel(0.5)).toBe('-6 dB')
  })
})

describe('levelFillColor (phone colorForLevelPct)', () => {
  it('lands the band edges exactly where the phone does', () => {
    expect(levelFillColor(0.7)).toBe('#2B8CC1')
    expect(levelFillColor(0.701)).toBe('#ffd93d')
    expect(levelFillColor(0.85)).toBe('#ffd93d')
    expect(levelFillColor(0.851)).toBe('#ff4757')
  })
})

describe('recorder status vocabulary (phone TimerCard.tsx:123-137)', () => {
  it('maps each phase to the phone label and colour', () => {
    expect(recorderStatusLabel('idle')).toBe('READY')
    expect(recorderStatusLabel('recording')).toBe('REC')
    expect(recorderStatusLabel('paused')).toBe('PAUSED')
    expect(recorderStatusColor('recording')).toBe('#ff4757')
    expect(recorderStatusColor('paused')).toBe('#ffd93d')
    expect(recorderStatusColor('idle')).toBe('#5a7a9a')
  })

  it('reads the terminal phase as READY, never as a live state', () => {
    // `stopped` never renders (the flow is on the review screen by then) — but if it ever did,
    // showing REC over a finished take would be a lie about what the microphone is doing.
    expect(recorderStatusLabel('stopped')).toBe('READY')
    expect(recorderStatusColor('stopped')).toBe('#5a7a9a')
  })
})

describe('format metadata — real values or nothing', () => {
  it('formats a sample rate the phone way', () => {
    expect(formatSampleRate(44100)).toBe('44.1kHz')
    expect(formatSampleRate(48000)).toBe('48.0kHz')
  })

  it('returns null rather than a fabricated rate when the track says nothing', () => {
    expect(formatSampleRate(null)).toBeNull()
    expect(formatSampleRate(0)).toBeNull()
    expect(formatSampleRate(Number.NaN)).toBeNull()
  })

  it('labels channels, including counts the phone ternary has no answer for', () => {
    expect(channelLabel(1)).toBe('MONO')
    expect(channelLabel(2)).toBe('STEREO')
    expect(channelLabel(4)).toBe('4CH')
    expect(channelLabel(null)).toBeNull()
    expect(channelLabel(0)).toBeNull()
    expect(channelLabel(1.5)).toBeNull()
  })

  it('prefers the stated codec, falls back to the container subtype', () => {
    expect(codecLabel('audio/webm;codecs=opus')).toBe('OPUS')
    expect(codecLabel('audio/webm; codecs="opus"')).toBe('OPUS')
    expect(codecLabel('video/mp4;codecs=avc1,mp4a.40.2')).toBe('AVC1')
    expect(codecLabel('audio/mp4')).toBe('MP4')
    expect(codecLabel('audio/ogg')).toBe('OGG')
  })

  it('returns null for a type that says nothing, rather than guessing one', () => {
    expect(codecLabel('')).toBeNull()
    expect(codecLabel('   ')).toBeNull()
    expect(codecLabel('audio')).toBeNull()
  })
})

describe('timeOfDay', () => {
  it('takes the clock half of a demo datetime', () => {
    expect(timeOfDay('2026-07-31 14:05:09')).toBe('14:05:09')
  })

  it('is empty for anything that is not one, rather than a mangled slice', () => {
    expect(timeOfDay('')).toBe('')
    expect(timeOfDay('2026-07-31')).toBe('')
    expect(timeOfDay('not a datetime')).toBe('')
  })
})

describe('RECORDER_SCALE_LABELS', () => {
  it('is the phone row verbatim and frozen (decoration, wired to nothing)', () => {
    expect(RECORDER_SCALE_LABELS).toEqual(['0s', '5s', '10s', '15s', '20s'])
    expect(Object.isFrozen(RECORDER_SCALE_LABELS)).toBe(true)
  })
})
