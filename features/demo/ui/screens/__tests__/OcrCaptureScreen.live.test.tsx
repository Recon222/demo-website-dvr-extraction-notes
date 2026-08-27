import { describe, expect, it, vi, type Mock } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { captureFailureMessage } from '@/features/demo/engine/logic/media'
import { OcrCaptureScreen, type OcrCaptureScreenProps, type OcrLiveRead, type OcrResult } from '@/features/demo/ui/screens/OcrCaptureScreen'
import type { OcrRecognizeOutcome } from '@/features/demo/ui/inputs/ocr-recognize'
import type { MediaDevicesLike } from '@/features/demo/ui/inputs/capture-media'
import { domError, fakeCanvas, fakeStream, type FakeTrack } from '@/features/demo/ui/inputs/__tests__/capture-media-io'

/**
 * P4.7 — the OCR camera's LIVE world, reached only by injecting `deps` (the suite's default
 * world has no `navigator.mediaDevices`, which is the sample contract pinned by the existing
 * marquee/bridge tests). What is pinned here:
 *
 * - the landscape viewfinder's permission ladder (phone CameraPermissions copy verbatim);
 * - the shutter's grab: the STRIP crop — the phone's 80% × 17% + 5% width-only buffer,
 *   asserted down to source-rect pixels — with the data URL for `OcrProof`;
 * - recognition wiring: raw text + measured confidence out through `onLiveRead`, and every
 *   failure surfaced as an honest notice, never a fabricated read;
 * - the camera's lifecycle around the confirm stage: released when a result is up, reopened
 *   for the retake.
 */

const parsedResult: OcrResult = {
  ok: true,
  dvrTime: '2025-03-08 12:05:30',
  confidence: { label: 'High', color: '#10d177', measured: true },
  actual: '2025-03-08 12:00:00',
  resolution: { kind: 'exact' },
}

interface Harness {
  props: OcrCaptureScreenProps
  reads: OcrLiveRead[]
  getUserMedia: Mock<(constraints: MediaStreamConstraints) => Promise<MediaStream>>
  streams: (MediaStream & { tracks: FakeTrack[] })[]
  recognize: Mock<(image: Blob) => Promise<OcrRecognizeOutcome>>
  canvas: ReturnType<typeof fakeCanvas>
}

function harness(
  options: {
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
    recognize?: (image: Blob) => Promise<OcrRecognizeOutcome>
    devices?: MediaDeviceInfo[]
    enumerateDevices?: () => Promise<MediaDeviceInfo[]>
    canvas?: ReturnType<typeof fakeCanvas>
  } = {},
): Harness {
  const streams: Harness['streams'] = []
  const getUserMedia = vi.fn(
    options.getUserMedia ??
      (async () => {
        const stream = fakeStream(['video'])
        streams.push(stream)
        return stream
      }),
  )
  const mediaDevices: MediaDevicesLike = {
    getUserMedia,
    enumerateDevices: options.enumerateDevices ?? (async () => options.devices ?? []),
  }
  const recognize = vi.fn(
    options.recognize ?? (async (): Promise<OcrRecognizeOutcome> => ({ ok: true, text: '2025-03-08 12:05:30', confidence: 0.91 })),
  )
  const canvas = options.canvas ?? fakeCanvas({ dataUrl: 'data:image/jpeg;base64,STRIP' })
  const reads: OcrLiveRead[] = []

  const props: OcrCaptureScreenProps = {
    result: null,
    dvrDraft: '',
    onChangeDvrDraft: vi.fn(),
    dateConfirmed: false,
    onConfirmDate: vi.fn(),
    hasExtractedScopes: false,
    onUseSample: vi.fn(),
    onCapture: vi.fn(),
    onLiveRead: (read) => {
      reads.push(read)
    },
    onCancel: vi.fn(),
    onRetake: vi.fn(),
    onConfirm: vi.fn(),
    deps: { mediaDevices, createCanvas: () => canvas, recognize },
  }
  return { props, reads, getUserMedia, streams, recognize, canvas }
}

async function grant() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Grant Camera Permission' }))
  })
}

function sizeVideo(width: number, height: number) {
  const video = screen.getByLabelText('Live camera preview')
  Object.defineProperty(video, 'videoWidth', { value: width, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: height, configurable: true })
}

const shutterCapture = () => screen.getByRole('button', { name: 'Capture' })

describe('permission ladder (phone CameraPermissions, browser-corrected)', () => {
  it('asks with the phone’s message and button verbatim, and keeps the sample path alongside', () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)

    // Phone CameraPermissions.tsx:38-43.
    expect(screen.getByText('Camera permission is required to capture DVR timestamps')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grant Camera Permission' })).toBeInTheDocument()
    // Unlike the media screen, the samples STAY: the confirm step's hard cases live there.
    expect(screen.getByText('Use sample DVR clock')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Capture sample frame' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Live camera preview')).not.toBeInTheDocument()
  })

  it('opens VIDEO ONLY on grant — OCR has no use for a microphone — and lands on the strip', async () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)
    await grant()

    expect(h.getUserMedia).toHaveBeenCalledExactlyOnceWith({ video: true, audio: false })
    expect(screen.getByLabelText('Live camera preview')).toBeInTheDocument()
    // Phone CameraInstructions.tsx:20, verbatim, over the live strip.
    expect(screen.getByText('Align DVR timestamp to fill the bounding box')).toBeInTheDocument()
    // A live shutter is a capture again.
    expect(shutterCapture()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Capture sample frame' })).not.toBeInTheDocument()
  })

  it('a refusal shows the browser-corrected denied copy with a retry — and the samples remain', async () => {
    const h = harness({
      getUserMedia: async () => {
        throw domError('NotAllowedError')
      },
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()

    expect(screen.getByText(/Camera access is blocked for this page/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByText('Use sample DVR clock')).toBeInTheDocument()
  })
})

describe('the live shutter', () => {
  it('grabs the phone’s strip — 90% × 17% of the frame, centered — and hands the read out', async () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720) // 16:9 — matches the viewfinder, so the crop is the phone's exactly

    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    // Source rect: x = 0.05 × 1280 = 64, y = 0.415 × 720 = 299 (rounded), 1152 × 122 —
    // (0.80 + 2 × 0.05) width, 0.17 height, buffer on the width ONLY (phone
    // ocr-capture-service.ts:65-70). No downscale below the 1280 px bound.
    expect(h.canvas.drawCalls[0].slice(1)).toEqual([64, 299, 1152, 122, 0, 0, 1152, 122])
    expect(h.recognize).toHaveBeenCalledTimes(1)
    expect(h.recognize.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(h.reads).toEqual([
      { rawText: '2025-03-08 12:05:30', confidence: 0.91, imageDataUrl: 'data:image/jpeg;base64,STRIP' },
    ])
    // R-15: the recogniser's blob keeps the phone's max quality; the PERSISTED data URL is
    // encoded at its own 0.85 — the sessionStorage copy must not pay q=1.0 bytes.
    expect(h.canvas.blobCalls[0]).toEqual(['image/jpeg', 1.0])
    expect(h.canvas.dataUrlCalls[0]).toEqual(['image/jpeg', 0.85])
  })

  it('narrows the crop to the VISIBLE band for a camera that does not match the viewfinder', async () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(640, 480) // 4:3 stream in the 16:9 view — cover hides the top/bottom quarters

    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    // Visible height fraction = (4/3) ÷ (16/9) = 0.75 → strip height 0.17 × 0.75 × 480 ≈ 61,
    // centered; width stays 0.9 × 640 = 576. The crop never includes pixels the operator
    // could not see.
    expect(h.canvas.drawCalls[0].slice(1)).toEqual([32, 209, 576, 61, 0, 0, 576, 61])
  })

  it('announces the read in progress and refuses a second shutter press meanwhile', async () => {
    let release: (outcome: OcrRecognizeOutcome) => void = () => {}
    const h = harness({
      recognize: () =>
        new Promise<OcrRecognizeOutcome>((resolve) => {
          release = resolve
        }),
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })
    expect(screen.getByText('Reading timestamp…')).toBeInTheDocument()
    expect(shutterCapture()).toBeDisabled()

    await act(async () => {
      release({ ok: true, text: 'x', confidence: 0.5 })
    })
    expect(screen.queryByText('Reading timestamp…')).not.toBeInTheDocument()
    expect(h.recognize).toHaveBeenCalledTimes(1)
  })

  // R-10 (T-4): the 1280 px bound is what §64a's persist-the-proof decision rests on — an
  // unbounded 4K strip is ~an order of magnitude more base64, and a quota overflow CLEARS the
  // whole snapshot. The two smaller-resolution tests above never reach the cap, so this is
  // the only case that fails if `targetWidth` is dropped from the screen's grab call.
  it('caps a 4K strip at 1280 px — full-res source rect, downscaled output, aspect preserved', async () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(3840, 2160)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    // Source rect stays the full-res strip (crop math), the destination is the bound:
    // 3456 × 367 → 1280 × 136 (the numbers capture-media.test.ts derives at unit level).
    expect(h.canvas.drawCalls[0].slice(1)).toEqual([192, 896, 3456, 367, 0, 0, 1280, 136])
    expect(h.canvas.width).toBe(1280)
    expect(h.canvas.height).toBe(136)
    expect(h.reads).toHaveLength(1)
  })

  // R-4 (S-2): the belt half — a slow first recognition must not leave the sample paths open
  // to land a SECOND result while the first is still in flight.
  it('holds the sample paths while a live read is in flight, and releases them after', async () => {
    let release: (outcome: OcrRecognizeOutcome) => void = () => {}
    const h = harness({
      recognize: () =>
        new Promise<OcrRecognizeOutcome>((resolve) => {
          release = resolve
        }),
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })
    for (const name of ['Use sample DVR clock', 'Ambiguous date', 'Time only']) {
      expect(screen.getByText(name)).toBeDisabled()
    }
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(h.props.onUseSample).not.toHaveBeenCalled()

    await act(async () => {
      release({ ok: true, text: 'x', confidence: 0.5 })
    })
    for (const name of ['Use sample DVR clock', 'Ambiguous date', 'Time only']) {
      expect(screen.getByText(name)).toBeEnabled()
    }
  })

  // R-4 (S-2): the token half — a read that comes back AFTER a result arrived from anywhere
  // else is stale, and writes nothing: no onLiveRead (which would replace the value the
  // operator is correcting), and no notice detached from its cause.
  it('discards a live read that lands after a result is already up — success arm', async () => {
    let release: (outcome: OcrRecognizeOutcome) => void = () => {}
    const h = harness({
      recognize: () =>
        new Promise<OcrRecognizeOutcome>((resolve) => {
          release = resolve
        }),
    })
    const view = render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)
    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    // The bridge presents a result (a sample frame the visitor picked) while recognition is
    // still pending…
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={parsedResult} dvrDraft="2025-03-08 12:05:30" />)
    })
    // …then the slow live read resolves. It must NOT reach the bridge.
    await act(async () => {
      release({ ok: true, text: '2099-12-31 23:59:59', confidence: 0.99 })
    })
    expect(h.reads).toHaveLength(0)
  })

  it('discards a live read that lands after a result is already up — failure arm leaves no orphan notice', async () => {
    let release: (outcome: OcrRecognizeOutcome) => void = () => {}
    const h = harness({
      recognize: () =>
        new Promise<OcrRecognizeOutcome>((resolve) => {
          release = resolve
        }),
    })
    const view = render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)
    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={parsedResult} dvrDraft="2025-03-08 12:05:30" />)
    })
    await act(async () => {
      release({ ok: false, message: 'Text recognition failed. Nothing was read from the frame. Try again, or use the sample DVR clock below.' })
    })

    // Retake returns to the aim stage: the stale failure must not materialise out of context,
    // and the shutter must not come back still held by the read that no longer owns it.
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={null} />)
    })
    expect(screen.queryByText(/Text recognition failed/)).not.toBeInTheDocument()
    expect(screen.queryByText('Reading timestamp…')).not.toBeInTheDocument()
    expect(shutterCapture()).toBeEnabled()
  })

  it('choosing a sample clears a lingering failure notice — it described a read that no longer matters', async () => {
    const h = harness({
      recognize: async () => ({ ok: false, message: 'Text recognition failed. Nothing was read from the frame. Try again, or use the sample DVR clock below.' }),
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)
    await act(async () => {
      fireEvent.click(shutterCapture())
    })
    expect(screen.getByText(/Text recognition failed/)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(h.props.onUseSample).toHaveBeenCalledExactlyOnceWith('clean')
    expect(screen.queryByText(/Text recognition failed/)).not.toBeInTheDocument()
  })

  it('surfaces a recognition failure as the honest notice — no read is fabricated', async () => {
    const h = harness({
      recognize: async () => ({ ok: false, message: 'Text recognition failed. Nothing was read from the frame. Try again, or use the sample DVR clock below.' }),
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    expect(h.reads).toHaveLength(0)
    expect(screen.getByText(/Text recognition failed\. Nothing was read/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/Text recognition failed/)).not.toBeInTheDocument()
  })

  it('surfaces a frame grab that produced nothing instead of recognising a blank', async () => {
    const h = harness({ canvas: fakeCanvas({ context: false }) })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(1280, 720)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })

    expect(h.recognize).not.toHaveBeenCalled()
    expect(h.reads).toHaveLength(0)
    expect(screen.getByText(/could not turn the camera frame into an image/)).toBeInTheDocument()
  })

  it('a camera with no frame yet fails the same honest way (degenerate dimensions)', async () => {
    const h = harness()
    render(<OcrCaptureScreen {...h.props} />)
    await grant()
    sizeVideo(0, 0)

    await act(async () => {
      fireEvent.click(shutterCapture())
    })
    expect(h.recognize).not.toHaveBeenCalled()
    expect(screen.getByText(/could not turn the camera frame into an image/)).toBeInTheDocument()
  })
})

describe('camera lifecycle around the confirm stage', () => {
  it('releases the camera while a result is up, and reopens it for the retake', async () => {
    const h = harness()
    const view = render(<OcrCaptureScreen {...h.props} />)
    await grant()
    expect(h.streams).toHaveLength(1)

    // A read arrives → the confirm stage replaces the camera; the light must go off.
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={parsedResult} dvrDraft={parsedResult.ok ? parsedResult.dvrTime : ''} />)
    })
    expect(h.streams[0].tracks[0].stop).toHaveBeenCalled()

    // Retake → back to the aim stage; the stream WE closed comes back on its own.
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={null} />)
    })
    expect(h.getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('never opens a camera on retake that the visitor did not have before', async () => {
    const h = harness()
    const view = render(<OcrCaptureScreen {...h.props} />)
    // No grant — the confirm stage comes and goes on the sample path.
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={parsedResult} dvrDraft="x" />)
    })
    await act(async () => {
      view.rerender(<OcrCaptureScreen {...h.props} result={null} />)
    })
    expect(h.getUserMedia).not.toHaveBeenCalled()
  })

  it('releases the camera on unmount', async () => {
    const h = harness()
    const view = render(<OcrCaptureScreen {...h.props} />)
    await grant()
    view.unmount()
    expect(h.streams[0].tracks[0].stop).toHaveBeenCalled()
  })
})

describe('device picker', () => {
  const deviceInfo = (deviceId: string, label: string) => ({ deviceId, kind: 'videoinput', label, groupId: 'g' }) as MediaDeviceInfo

  it('offers the switch only when there is another camera, and re-opens pinned to it', async () => {
    const single = harness({ devices: [deviceInfo('cam-a', 'FaceTime HD')] })
    const view = render(<OcrCaptureScreen {...single.props} />)
    await grant()
    expect(screen.queryByRole('button', { name: 'Switch camera' })).not.toBeInTheDocument()
    view.unmount()

    const many = harness({ devices: [deviceInfo('cam-a', 'FaceTime HD'), deviceInfo('cam-b', 'Rear')] })
    render(<OcrCaptureScreen {...many.props} />)
    await grant()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch camera' }))
    })
    expect(many.getUserMedia).toHaveBeenCalledTimes(2)
    expect(many.getUserMedia.mock.calls[1][0]).toEqual({ video: { deviceId: { exact: 'cam-b' } }, audio: false })
  })

  // R-29 (T-6): an unreadable device list is NOT "there are no other cameras" — P4.1 keeps
  // the two apart precisely so this line can explain the picker's absence. It was unpinned:
  // deleting the render line left every suite green.
  it('explains an UNREADABLE device list instead of silently hiding the picker', async () => {
    const h = harness({
      enumerateDevices: async () => {
        throw new Error('enumeration blew up')
      },
    })
    render(<OcrCaptureScreen {...h.props} />)
    await grant()

    expect(screen.getByLabelText('Live camera preview')).toBeInTheDocument()
    expect(screen.getByText(captureFailureMessage('DEVICE_LIST_UNAVAILABLE', 'camera'))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Switch camera' })).not.toBeInTheDocument()
  })
})
