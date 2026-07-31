import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCaptureStream } from '@/features/demo/ui/inputs/useCaptureStream'
import type { MediaDevicesLike } from '@/features/demo/ui/inputs/capture-media'
import { domError, fakeStream } from '@/features/demo/ui/inputs/__tests__/capture-media-io'

const infos = (list: readonly { deviceId: string; kind: string; label: string }[]) =>
  list as unknown as MediaDeviceInfo[]

function media(over: Partial<MediaDevicesLike> = {}): MediaDevicesLike {
  return {
    getUserMedia: vi.fn(async () => fakeStream(['video'])),
    enumerateDevices: vi.fn(async () => infos([{ deviceId: 'cam-a', kind: 'videoinput', label: 'Cam A' }])),
    ...over,
  }
}

describe('useCaptureStream — the unavailable default', () => {
  it('starts unavailable when the page has no capture API (the suite default)', () => {
    // vitest.setup.ts leaves `navigator.mediaDevices` undefined on purpose; this is what
    // routes every screen to the sample fallback without a stub.
    const { result } = renderHook(() => useCaptureStream({ facility: 'camera' }))
    expect(result.current.permission).toBe('unavailable')
    expect(result.current.stream).toBeNull()
  })

  it('reports UNSUPPORTED without inventing a stream when opened anyway', async () => {
    const { result } = renderHook(() => useCaptureStream({ facility: 'camera', deps: { mediaDevices: null } }))
    await act(async () => {
      expect(await result.current.open()).toBeNull()
    })
    expect(result.current.stream).toBeNull()
    expect(result.current.failure).toMatchObject({ code: 'UNSUPPORTED' })
    expect(result.current.permission).toBe('unavailable')
  })
})

describe('useCaptureStream — opening', () => {
  it('starts at prompt when the API exists but nothing has been asked yet', () => {
    const { result } = renderHook(() => useCaptureStream({ facility: 'camera', deps: { mediaDevices: media() } }))
    expect(result.current.permission).toBe('prompt')
  })

  it('opens the stream, flips to granted and lists the devices', async () => {
    const { result } = renderHook(() => useCaptureStream({ facility: 'camera', deps: { mediaDevices: media() } }))
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.permission).toBe('granted')
    expect(result.current.stream).not.toBeNull()
    expect(result.current.devices).toEqual([
      { deviceId: 'cam-a', label: 'Cam A', facility: 'camera', labelSynthesized: false },
    ])
    expect(result.current.selectedDeviceId).toBe('cam-a')
  })

  it('reads back the device the browser actually opened, not the one requested', async () => {
    // A browser may honour a constraint differently; the picker must show what is live.
    const stream = fakeStream(['video'])
    ;(stream.getTracks()[0] as unknown as { getSettings(): MediaTrackSettings }).getSettings = () =>
      ({ deviceId: 'cam-b' }) as MediaTrackSettings
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({
            getUserMedia: async () => stream,
            enumerateDevices: async () =>
              infos([
                { deviceId: 'cam-a', kind: 'videoinput', label: 'A' },
                { deviceId: 'cam-b', kind: 'videoinput', label: 'B' },
              ]),
          }),
        },
      }),
    )
    await act(async () => {
      await result.current.open('cam-a')
    })
    expect(result.current.selectedDeviceId).toBe('cam-b')
  })

  it('surfaces a device-enumeration failure alongside a working stream', async () => {
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({ enumerateDevices: async () => Promise.reject(domError('NotAllowedError')) }),
        },
      }),
    )
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.stream).not.toBeNull()
    expect(result.current.deviceFailure).toMatchObject({ code: 'DEVICE_LIST_UNAVAILABLE' })
  })

  it('reports the honest denied state — never a stream', async () => {
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: { mediaDevices: media({ getUserMedia: async () => Promise.reject(domError('NotAllowedError')) }) },
      }),
    )
    await act(async () => {
      expect(await result.current.open()).toBeNull()
    })
    expect(result.current.permission).toBe('denied')
    expect(result.current.failure).toMatchObject({ code: 'PERMISSION_DENIED' })
    expect(result.current.stream).toBeNull()
  })

  it('leaves a busy device at prompt so the retry affordance stays live', async () => {
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'microphone',
        deps: { mediaDevices: media({ getUserMedia: async () => Promise.reject(domError('NotReadableError')) }) },
      }),
    )
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.permission).toBe('prompt')
    expect(result.current.failure).toMatchObject({ code: 'DEVICE_BUSY' })
  })

  it('clears the previous failure when a new attempt starts', async () => {
    let deny = true
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({
            getUserMedia: async () => {
              if (deny) throw domError('NotReadableError')
              return fakeStream(['video'])
            },
          }),
        },
      }),
    )
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.failure).not.toBeNull()

    deny = false
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.failure).toBeNull()
  })

  it('reports the silent-video degradation so the surface can say the take has no sound', async () => {
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      if (constraints.audio !== false) throw domError('NotFoundError')
      return fakeStream(['video'])
    })
    const { result } = renderHook(() =>
      useCaptureStream({ facility: 'camera', withAudio: true, deps: { mediaDevices: media({ getUserMedia }) } }),
    )
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.hasAudio).toBe(false)
    expect(result.current.audioDegraded).toBe(true)
    expect(result.current.permission).toBe('granted')
  })
})

describe('useCaptureStream — hardware release', () => {
  it('stops the previous stream when switching device', async () => {
    const first = fakeStream(['video'])
    const second = fakeStream(['video'])
    let call = 0
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({
            getUserMedia: async () => (call++ === 0 ? first : second),
            enumerateDevices: async () =>
              infos([
                { deviceId: 'cam-a', kind: 'videoinput', label: 'A' },
                { deviceId: 'cam-b', kind: 'videoinput', label: 'B' },
              ]),
          }),
        },
      }),
    )
    await act(async () => {
      await result.current.open('cam-a')
    })
    await act(async () => {
      await result.current.selectDevice('cam-b')
    })
    expect(first.tracks[0].stop).toHaveBeenCalled()
    expect(second.tracks[0].stop).not.toHaveBeenCalled()
  })

  it('close() stops the tracks but keeps permission and devices', async () => {
    const stream = fakeStream(['video'])
    const { result } = renderHook(() =>
      useCaptureStream({ facility: 'camera', deps: { mediaDevices: media({ getUserMedia: async () => stream }) } }),
    )
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.close()
    })
    expect(stream.tracks[0].stop).toHaveBeenCalledTimes(1)
    expect(result.current.stream).toBeNull()
    expect(result.current.permission).toBe('granted')
    expect(result.current.devices).toHaveLength(1)
  })

  it('releases the hardware on unmount — the web analog of isActive={isFocused}', async () => {
    const stream = fakeStream(['video', 'audio'])
    const { result, unmount } = renderHook(() =>
      useCaptureStream({ facility: 'camera', deps: { mediaDevices: media({ getUserMedia: async () => stream }) } }),
    )
    await act(async () => {
      await result.current.open()
    })
    unmount()
    expect(stream.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
  })

  it('stops a stream that arrives AFTER unmount instead of leaking the camera light', async () => {
    const stream = fakeStream(['video'])
    let settle: (() => void) | null = null
    const gate = new Promise<void>((resolve) => {
      settle = resolve
    })
    const { result, unmount } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({
            getUserMedia: async () => {
              await gate
              return stream
            },
          }),
        },
      }),
    )

    let pending: Promise<MediaStream | null> = Promise.resolve(null)
    act(() => {
      pending = result.current.open()
    })
    unmount()
    await act(async () => {
      settle?.()
      expect(await pending).toBeNull()
    })
    expect(stream.tracks[0].stop).toHaveBeenCalledTimes(1)
  })
})

describe('useCaptureStream — re-entrancy', () => {
  it('ignores a second open() while one is in flight', async () => {
    const getUserMedia = vi.fn(async () => fakeStream(['video']))
    const { result } = renderHook(() =>
      useCaptureStream({ facility: 'camera', deps: { mediaDevices: media({ getUserMedia }) } }),
    )
    await act(async () => {
      // Two clicks in the same tick both read the pre-update `isOpening`, which is exactly
      // why the guard is a ref.
      const [a, b] = await Promise.all([result.current.open(), result.current.open()])
      expect(a === null || b === null).toBe(true)
    })
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('clears the in-flight guard after a failure, so a retry works', async () => {
    let deny = true
    const { result } = renderHook(() =>
      useCaptureStream({
        facility: 'camera',
        deps: {
          mediaDevices: media({
            getUserMedia: async () => {
              if (deny) throw domError('NotReadableError')
              return fakeStream(['video'])
            },
          }),
        },
      }),
    )
    await act(async () => {
      await result.current.open()
    })
    deny = false
    await act(async () => {
      await result.current.open()
    })
    await waitFor(() => expect(result.current.stream).not.toBeNull())
  })
})
