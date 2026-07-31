import { describe, it, expect, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { GPS_MESSAGES, PRECISE_GPS_CONFIG } from '@/features/demo/engine/logic/gps'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'
import { CAMERA_GPS_LABELS } from '@/features/demo/ui/inputs/CameraGpsCapture'
import { CamerasScreen, MAX_CAMERAS, maxCamerasMessage } from '@/features/demo/ui/screens/CamerasScreen'
import type { CameraEntry, CameraGpsFix } from '@/features/demo/engine/types'

/**
 * Per-camera GPS on the Cameras screen (P3.7, matrix row 42; ui-mapping 07:149-158) —
 * the five phone keys, the forced-precise config, and the max-50 row gate.
 */

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

const camera = (id: string, o: Partial<CameraEntry> = {}): CameraEntry => ({
  id,
  cameraName: id.toUpperCase(),
  resolution: '',
  recordingFps: '',
  ...o,
})

const position = (accuracy: number, timestamp = Date.UTC(2026, 6, 30, 14, 5, 6)) =>
  ({
    coords: {
      latitude: 43.608701,
      longitude: -79.650502,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp,
  }) as GeolocationPosition

/** Answers every reading with the given accuracies in order, repeating the last. */
const geolocationSeries = (accuracies: number[]): GeolocationLike => {
  let i = 0
  return { getCurrentPosition: (onSuccess) => onSuccess(position(accuracies[Math.min(i++, accuracies.length - 1)])) }
}

const denied: GeolocationLike = {
  getCurrentPosition: (_ok, onError) => onError({ code: 1, message: 'denied' } as GeolocationPositionError),
}

interface Options {
  cameras?: CameraEntry[]
  geolocation?: GeolocationLike | null
  onCaptureGps?: (cameraId: string, gps: CameraGpsFix) => void
  onAdd?: () => void
}

const cameras = (o: Options = {}) => (
  <CamerasScreen
    cameras={o.cameras ?? [camera('c1')]}
    onChange={vi.fn()}
    onAdd={o.onAdd ?? vi.fn()}
    onRemove={vi.fn()}
    onCaptureGps={o.onCaptureGps ?? vi.fn()}
    gpsDeps={{ geolocation: o.geolocation ?? null, delay: async () => undefined }}
    {...nav}
  />
)

const renderCameras = (o: Options = {}) => render(cameras(o))

const captureButton = (name: string = CAMERA_GPS_LABELS.capture) => screen.getByRole('button', { name })

describe('Cameras — per-camera GPS control (ui-mapping 07)', () => {
  it('gives every camera row its own capture button', () => {
    renderCameras({ cameras: [camera('c1'), camera('c2'), camera('c3')] })

    expect(screen.getByTestId('camera-gps-c1')).toBeInTheDocument()
    expect(screen.getByTestId('camera-gps-c2')).toBeInTheDocument()
    expect(screen.getByTestId('camera-gps-c3')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: CAMERA_GPS_LABELS.capture })).toHaveLength(3)
  })

  it('uses the phone\'s two accessible names — capture before a fix, re-capture after', () => {
    renderCameras({
      cameras: [
        camera('c1'),
        camera('c2', { gps: { lat: 43.6, lng: -79.65, accuracyM: 4, source: 'gps', capturedAt: '2026-07-30T14:05:06.000Z' } }),
      ],
    })

    expect(screen.getAllByRole('button', { name: CAMERA_GPS_LABELS.capture })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: CAMERA_GPS_LABELS.recapture })).toHaveLength(1)
  })

  it('shows no coordinate card for a camera that was never captured', () => {
    renderCameras({ cameras: [camera('c1')] })
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })

  it('renders a stored fix with its accuracy, provenance and rating', () => {
    renderCameras({
      cameras: [camera('c1', { gps: { lat: 43.608701, lng: -79.650502, accuracyM: 7, source: 'gps', capturedAt: '2026-07-30T14:05:06.000Z' } })],
    })

    const card = screen.getByTestId('coordinate-display')
    expect(within(card).getByTestId('coordinate-display-coords')).toHaveTextContent('43.608701, -79.650502')
    expect(within(card).getByTestId('coordinate-display-accuracy')).toHaveTextContent('±7m')
    expect(within(card).getByTestId('coordinate-display-source')).toHaveTextContent('GPS')
    expect(within(card).getByTestId('coordinate-display-rating')).toHaveTextContent('Good')
  })
})

describe('Cameras — capture writes the five phone keys', () => {
  it('emits the camera id plus lat/lng/accuracy/source/capturedAt', async () => {
    const onCaptureGps = vi.fn()
    renderCameras({ cameras: [camera('c1'), camera('c2')], geolocation: geolocationSeries([6]), onCaptureGps })

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('camera-gps-c2')).getByRole('button'))
    })

    expect(onCaptureGps).toHaveBeenCalledExactlyOnceWith('c2', {
      lat: 43.608701,
      lng: -79.650502,
      accuracyM: 6,
      source: 'gps',
      capturedAt: '2026-07-30T14:05:06.000Z',
    })
  })

  it('stamps the READING\'s own time, not the moment the capture finished', async () => {
    const onCaptureGps = vi.fn()
    const stale: GeolocationLike = {
      getCurrentPosition: (onSuccess) => onSuccess(position(4, Date.UTC(2026, 0, 2, 3, 4, 5))),
    }
    renderCameras({ geolocation: stale, onCaptureGps })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(onCaptureGps.mock.calls[0][1].capturedAt).toBe('2026-01-02T03:04:05.000Z')
  })

  it('captures one camera at a time — a second row is untouched', async () => {
    const onCaptureGps = vi.fn()
    renderCameras({ cameras: [camera('c1'), camera('c2')], geolocation: geolocationSeries([6]), onCaptureGps })

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('camera-gps-c1')).getByRole('button'))
    })

    expect(onCaptureGps).toHaveBeenCalledOnce()
    expect(onCaptureGps.mock.calls[0][0]).toBe('c1')
  })
})

describe('Cameras — forced precise accuracy (CAMERA_ACCURACY_OVERRIDE)', () => {
  it('keeps sampling past a reading the BALANCED target would have accepted', async () => {
    // The behavioural pin for `PRECISE_GPS_CONFIG`: 20 m satisfies balanced (50 m) and would
    // end the loop after ONE reading; precise (10 m) must not accept it, so a provider stuck
    // at 20 m is sampled the full attempt budget before the best is committed. Cameras inside
    // one building are metres apart — that is the whole point of the phone's override.
    const onCaptureGps = vi.fn()
    let calls = 0
    const geo: GeolocationLike = {
      getCurrentPosition: (onSuccess) => {
        calls++
        onSuccess(position(20))
      },
    }
    renderCameras({ geolocation: geo, onCaptureGps })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(calls).toBe(PRECISE_GPS_CONFIG.maxAttempts)
    expect(onCaptureGps.mock.calls[0][1].accuracyM).toBe(20)
  })

  it('stops as soon as a reading meets the 10 m precise target', async () => {
    const onCaptureGps = vi.fn()
    let calls = 0
    const geo: GeolocationLike = {
      getCurrentPosition: (onSuccess) => {
        calls++
        onSuccess(position(calls === 1 ? 20 : 8))
      },
    }
    renderCameras({ geolocation: geo, onCaptureGps })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(calls).toBe(2)
    expect(onCaptureGps.mock.calls[0][1].accuracyM).toBe(8)
  })

  it('reports progress against the precise attempt budget', async () => {
    let release: (() => void) | null = null
    let calls = 0
    const geo: GeolocationLike = {
      getCurrentPosition: (onSuccess) => {
        calls++
        if (calls === 2) {
          release = () => onSuccess(position(4))
          return
        }
        onSuccess(position(40))
      },
    }
    renderCameras({ geolocation: geo })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(screen.getByTestId('camera-gps-c1-progress')).toHaveTextContent(
      `Sample 1 of ${PRECISE_GPS_CONFIG.maxAttempts} · best ±40m`,
    )
    await act(async () => {
      release?.()
    })
    expect(screen.queryByTestId('camera-gps-c1-progress')).not.toBeInTheDocument()
  })
})

describe('Cameras — honest failure paths', () => {
  it('reports a permission denial verbatim and writes nothing', async () => {
    const onCaptureGps = vi.fn()
    renderCameras({ geolocation: denied, onCaptureGps })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(screen.getByTestId('camera-gps-c1-error')).toHaveTextContent(GPS_MESSAGES.PERMISSION_DENIED)
    expect(onCaptureGps).not.toHaveBeenCalled()
    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
  })

  it('says plainly that nothing was captured when the browser has no location service', async () => {
    // The jsdom default (vitest.setup.ts leaves navigator.geolocation undefined) — no
    // sample coordinate is ever invented to stand in for the missing capability.
    const onCaptureGps = vi.fn()
    renderCameras({ geolocation: null, onCaptureGps })

    await act(async () => {
      fireEvent.click(captureButton())
    })

    expect(screen.getByTestId('camera-gps-c1-error')).toHaveTextContent(GPS_MESSAGES.UNSUPPORTED)
    expect(onCaptureGps).not.toHaveBeenCalled()
  })

  it('keeps the failure attributed to ITS OWN row', async () => {
    const onCaptureGps = vi.fn()
    renderCameras({ cameras: [camera('c1'), camera('c2')], geolocation: denied, onCaptureGps })

    await act(async () => {
      fireEvent.click(within(screen.getByTestId('camera-gps-c2')).getByRole('button'))
    })

    expect(screen.getByTestId('camera-gps-c2-error')).toBeInTheDocument()
    expect(screen.queryByTestId('camera-gps-c1-error')).not.toBeInTheDocument()
  })
})

describe('Cameras — capture button keeps keyboard focus (R-7)', () => {
  it('stays focused and inert instead of blurring to <body> for the 120 s budget', async () => {
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onCaptureGps = vi.fn()
    renderCameras({ geolocation: held, onCaptureGps })

    const button = captureButton()
    button.focus()
    fireEvent.click(button)

    const busy = screen.getByRole('button', { name: 'Capturing location, please wait' })
    expect(busy).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).toBe(busy)

    // Inert: a second activation while busy must not start a second capture.
    fireEvent.click(busy)
    await act(async () => {
      deliver(position(4))
    })
    expect(onCaptureGps).toHaveBeenCalledOnce()
  })
})

describe('Cameras — a row removed mid-capture never writes (R-1/R-32 discipline)', () => {
  it('abandons the in-flight capture of a row that disappears from the list', async () => {
    // The rows are keyed by camera id, so a removal unmounts that row's control and
    // `useGpsCapture`'s abort fires — no callback, no write, no resurrection.
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onCaptureGps = vi.fn()
    const { rerender } = renderCameras({ cameras: [camera('c1'), camera('c2')], geolocation: held, onCaptureGps })

    fireEvent.click(within(screen.getByTestId('camera-gps-c2')).getByRole('button'))
    rerender(cameras({ cameras: [camera('c1')], geolocation: held, onCaptureGps }))
    await act(async () => {
      deliver(position(4))
    })

    expect(onCaptureGps).not.toHaveBeenCalled()
  })

  it('still commits the capturing row when a DIFFERENT row is removed', async () => {
    let deliver!: (p: GeolocationPosition) => void
    const held: GeolocationLike = { getCurrentPosition: (onSuccess) => { deliver = onSuccess } }
    const onCaptureGps = vi.fn()
    const { rerender } = renderCameras({ cameras: [camera('c1'), camera('c2')], geolocation: held, onCaptureGps })

    fireEvent.click(within(screen.getByTestId('camera-gps-c1')).getByRole('button'))
    rerender(cameras({ cameras: [camera('c1')], geolocation: held, onCaptureGps }))
    await act(async () => {
      deliver(position(4))
    })

    expect(onCaptureGps).toHaveBeenCalledExactlyOnceWith('c1', expect.objectContaining({ source: 'gps' }))
  })
})

describe('Cameras — max-50 gate (ArrayFieldManager parity)', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => camera(`c${i + 1}`))

  it('offers Add Camera below the cap, with no limit notice', () => {
    renderCameras({ cameras: many(MAX_CAMERAS - 1) })
    expect(screen.getByText('+ Add Camera')).toBeInTheDocument()
    expect(screen.queryByTestId('cameras-max-notice')).not.toBeInTheDocument()
  })

  it('replaces Add Camera with the phone\'s limit line at 50 rows', () => {
    renderCameras({ cameras: many(MAX_CAMERAS) })
    expect(screen.queryByText('+ Add Camera')).not.toBeInTheDocument()
    expect(screen.getByTestId('cameras-max-notice')).toHaveTextContent('Maximum 50 items allowed')
  })

  it('pins the cap and the message template to the phone', () => {
    expect(MAX_CAMERAS).toBe(50)
    expect(maxCamerasMessage(MAX_CAMERAS)).toBe('Maximum 50 items allowed')
  })

  it('cannot be added past — the button is GONE, not merely disabled', () => {
    // Phone parity: `ArrayFieldManager` unmounts the Add button at the cap
    // (`canAdd = items.length < maxItems`), it never renders a dead one.
    const onAdd = vi.fn()
    renderCameras({ cameras: many(MAX_CAMERAS), onAdd })
    expect(screen.queryByRole('button', { name: '+ Add Camera' })).not.toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })
})
