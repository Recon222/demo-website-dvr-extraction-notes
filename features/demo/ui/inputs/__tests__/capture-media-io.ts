/**
 * Shared fakes for the media-capture I/O tests. jsdom implements no `MediaStream`,
 * `MediaStreamTrack` or `MediaRecorder`, so every one of them is hand-built here — which is
 * also what lets the tests drive a recorder's event sequence deterministically.
 */

import { vi } from 'vitest'

import type { MediaRecorderLike, RecorderIo } from '@/features/demo/ui/inputs/capture-media'

export interface FakeTrack {
  kind: string
  stop: ReturnType<typeof vi.fn>
}

export function fakeTrack(kind: 'video' | 'audio'): FakeTrack {
  return { kind, stop: vi.fn() }
}

/** A `MediaStream` stand-in carrying the given tracks. */
export function fakeStream(kinds: readonly ('video' | 'audio')[] = ['video']): MediaStream & {
  tracks: FakeTrack[]
} {
  const tracks = kinds.map(fakeTrack)
  return {
    tracks,
    getTracks: () => tracks,
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
  } as unknown as MediaStream & { tracks: FakeTrack[] }
}

/** A DOMException-shaped rejection. */
export function domError(name: string): Error & { name: string } {
  const error = new Error(`${name}: synthetic`)
  error.name = name
  return error
}

export interface FakeRecorder extends MediaRecorderLike {
  started: boolean
  paused: boolean
  stopCalls: number
  /** Deliver a data chunk, as the browser would. */
  emitData(bytes: string): void
  /** Deliver `stop`, as the browser would once `stop()` has flushed. */
  emitStop(): void
  /** Deliver `error`. */
  emitError(): void
  /** Make the next `stop()` throw, as a browser does for an inactive recorder. */
  failNextStop: boolean
  /** Make `start()` throw. */
  failStart: boolean
}

export function fakeRecorder(mimeType = 'video/webm'): FakeRecorder {
  const recorder: FakeRecorder = {
    mimeType,
    started: false,
    paused: false,
    stopCalls: 0,
    failNextStop: false,
    failStart: false,
    ondataavailable: null,
    onstop: null,
    onerror: null,
    start() {
      if (recorder.failStart) throw domError('NotSupportedError')
      recorder.started = true
    },
    stop() {
      recorder.stopCalls++
      if (recorder.failNextStop) {
        recorder.failNextStop = false
        throw domError('InvalidStateError')
      }
      recorder.started = false
    },
    pause() {
      recorder.paused = true
    },
    resume() {
      recorder.paused = false
    },
    emitData(bytes) {
      recorder.ondataavailable?.({ data: new Blob([bytes], { type: recorder.mimeType }) })
    },
    emitStop() {
      recorder.onstop?.()
    },
    emitError() {
      recorder.onerror?.({ type: 'error' })
    },
  }
  return recorder
}

/** A `RecorderIo` handing back `recorder`, with a controllable `isTypeSupported`. */
export function fakeRecorderIo(
  recorder: FakeRecorder,
  isTypeSupported: (type: string) => boolean = () => true,
): RecorderIo & { options: { mimeType?: string } | undefined } {
  const io = {
    options: undefined as { mimeType?: string } | undefined,
    create(_stream: MediaStream, options?: { mimeType?: string }) {
      io.options = options
      return recorder
    },
    isTypeSupported,
  }
  return io
}

/** A canvas stand-in: jsdom's own returns no 2d context and implements no `toBlob`. */
export function fakeCanvas(
  over: { context?: boolean; blob?: Blob | null; dataUrl?: string } = {},
): HTMLCanvasElement & { drawCalls: unknown[][] } {
  const drawCalls: unknown[][] = []
  const canvas = {
    width: 0,
    height: 0,
    drawCalls,
    getContext: (id: string) =>
      over.context === false || id !== '2d'
        ? null
        : {
            drawImage: (...args: unknown[]) => {
              drawCalls.push(args)
            },
          },
    toBlob: (cb: (blob: Blob | null) => void) => {
      cb(over.blob === undefined ? new Blob(['jpeg-bytes'], { type: 'image/jpeg' }) : over.blob)
    },
    toDataURL: () => over.dataUrl ?? 'data:image/jpeg;base64,AAAA',
  }
  return canvas as unknown as HTMLCanvasElement & { drawCalls: unknown[][] }
}

/** A frame source with the given intrinsic dimensions. */
export function fakeVideo(videoWidth: number, videoHeight: number): HTMLVideoElement {
  return { videoWidth, videoHeight } as unknown as HTMLVideoElement
}
