import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  UNKNOWN_AUDIO_FORMAT,
  readAudioTrackFormat,
  readBrowserAnalyser,
} from '@/features/demo/ui/inputs/audio-analyser'

/** A stream carrying one audio track with the given `getSettings()` answer. */
function streamWithSettings(settings: MediaTrackSettings | undefined): MediaStream {
  const track =
    settings === undefined
      ? ({ kind: 'audio' } as unknown as MediaStreamTrack)
      : ({ kind: 'audio', getSettings: () => settings } as unknown as MediaStreamTrack)
  return { getAudioTracks: () => [track] } as unknown as MediaStream
}

describe('readBrowserAnalyser', () => {
  afterEach(() => {
    delete (globalThis as { AudioContext?: unknown }).AudioContext
    delete (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext
  })

  it('is null under jsdom — the honest no-meter path is the DEFAULT tested contract', () => {
    expect(readBrowserAnalyser()).toBeNull()
  })

  it('accepts the prefixed constructor Safari ships', () => {
    ;(globalThis as { webkitAudioContext?: unknown }).webkitAudioContext = function Ctx() {}
    expect(readBrowserAnalyser()).not.toBeNull()
  })

  it('opens a graph that is NOT wired to the speakers (no microphone feedback loop)', () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 32,
      smoothingTimeConstant: 0,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      disconnect: vi.fn(),
    }
    const source = { connect: vi.fn(), disconnect: vi.fn() }
    const destination = { id: 'speakers' }
    ;(globalThis as { AudioContext?: unknown }).AudioContext = function Ctx(this: Record<string, unknown>) {
      this.state = 'running'
      this.destination = destination
      this.createMediaStreamSource = () => source
      this.createAnalyser = () => analyser
      this.resume = () => Promise.resolve()
      this.close = () => Promise.resolve()
    }

    const handle = readBrowserAnalyser()?.open(streamWithSettings(undefined))

    expect(handle).not.toBeNull()
    expect(source.connect).toHaveBeenCalledTimes(1)
    expect(source.connect).toHaveBeenCalledWith(analyser)
    // The analyser is a TAP. Connecting it onward to `destination` would play the visitor's
    // own microphone back through their speakers.
    expect(source.connect).not.toHaveBeenCalledWith(destination)
  })

  it('reports a suspended context as not running, so the meter can say it has nothing', () => {
    const analyser = {
      fftSize: 0,
      frequencyBinCount: 8,
      smoothingTimeConstant: 0,
      getByteFrequencyData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      disconnect: vi.fn(),
    }
    ;(globalThis as { AudioContext?: unknown }).AudioContext = function Ctx(this: Record<string, unknown>) {
      this.state = 'suspended'
      this.createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() })
      this.createAnalyser = () => analyser
      this.resume = () => Promise.resolve()
      this.close = () => Promise.resolve()
    }

    const handle = readBrowserAnalyser()?.open(streamWithSettings(undefined))
    expect(handle?.running()).toBe(false)
    // Zeros from a suspended graph must never be presented as measured silence.
    expect(handle?.frequencies().every((v) => v === 0)).toBe(true)
  })

  it('returns null — never a half-built handle — when the graph cannot be constructed', () => {
    ;(globalThis as { AudioContext?: unknown }).AudioContext = function Ctx(this: Record<string, unknown>) {
      this.state = 'running'
      this.close = () => Promise.resolve()
      this.createMediaStreamSource = () => {
        throw new Error('not a media stream')
      }
    }
    expect(readBrowserAnalyser()?.open(streamWithSettings(undefined))).toBeNull()
  })

  it('stops touching the analyser once closed', () => {
    const getByteFrequencyData = vi.fn()
    ;(globalThis as { AudioContext?: unknown }).AudioContext = function Ctx(this: Record<string, unknown>) {
      this.state = 'running'
      this.createMediaStreamSource = () => ({ connect: vi.fn(), disconnect: vi.fn() })
      this.createAnalyser = () => ({
        fftSize: 0,
        frequencyBinCount: 8,
        smoothingTimeConstant: 0,
        getByteFrequencyData,
        getByteTimeDomainData: vi.fn(),
        disconnect: vi.fn(),
      })
      this.resume = () => Promise.resolve()
      this.close = () => Promise.resolve()
    }

    const handle = readBrowserAnalyser()?.open(streamWithSettings(undefined))
    handle?.frequencies()
    expect(getByteFrequencyData).toHaveBeenCalledTimes(1)
    handle?.close()
    handle?.frequencies()
    expect(getByteFrequencyData).toHaveBeenCalledTimes(1)
    expect(handle?.running()).toBe(false)
  })
})

describe('readAudioTrackFormat', () => {
  it('reads what the track states', () => {
    expect(readAudioTrackFormat(streamWithSettings({ sampleRate: 48000, channelCount: 1 }))).toEqual({
      sampleRate: 48000,
      channels: 1,
    })
  })

  it('reports the half a browser omits as unknown, never as a default', () => {
    // Firefox states channelCount but not sampleRate. Filling in 44100 would be printing the
    // PHONE's constant next to a recording this browser made.
    expect(readAudioTrackFormat(streamWithSettings({ channelCount: 2 }))).toEqual({
      sampleRate: null,
      channels: 2,
    })
  })

  it('is unknown for no stream, no getSettings, and an empty answer', () => {
    expect(readAudioTrackFormat(null)).toBe(UNKNOWN_AUDIO_FORMAT)
    expect(readAudioTrackFormat(streamWithSettings(undefined))).toBe(UNKNOWN_AUDIO_FORMAT)
    expect(readAudioTrackFormat(streamWithSettings({}))).toBe(UNKNOWN_AUDIO_FORMAT)
    expect(readAudioTrackFormat({} as MediaStream)).toBe(UNKNOWN_AUDIO_FORMAT)
  })
})
