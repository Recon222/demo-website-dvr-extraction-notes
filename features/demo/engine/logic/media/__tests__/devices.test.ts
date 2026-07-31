import { describe, expect, it } from 'vitest'

import {
  facilityForDeviceKind,
  positionalDeviceLabel,
  selectCaptureDevice,
  toCaptureDevices,
  type MediaDeviceInfoLike,
} from '@/features/demo/engine/logic/media/devices'

const info = (over: Partial<MediaDeviceInfoLike>): MediaDeviceInfoLike => ({
  deviceId: 'dev-1',
  kind: 'videoinput',
  label: 'FaceTime HD Camera',
  ...over,
})

describe('facilityForDeviceKind', () => {
  it('maps the two input kinds', () => {
    expect(facilityForDeviceKind('videoinput')).toBe('camera')
    expect(facilityForDeviceKind('audioinput')).toBe('microphone')
  })

  it('leaves audiooutput unmapped — the demo never selects a speaker', () => {
    expect(facilityForDeviceKind('audiooutput')).toBeNull()
    expect(facilityForDeviceKind('somethingelse')).toBeNull()
  })
})

describe('toCaptureDevices', () => {
  it('keeps only the requested facility', () => {
    const devices = toCaptureDevices(
      [
        info({ deviceId: 'cam', kind: 'videoinput', label: 'Cam' }),
        info({ deviceId: 'mic', kind: 'audioinput', label: 'Mic' }),
        info({ deviceId: 'spk', kind: 'audiooutput', label: 'Speaker' }),
      ],
      'microphone',
    )
    expect(devices).toEqual([
      { deviceId: 'mic', label: 'Mic', facility: 'microphone', labelSynthesized: false },
    ])
  })

  it('drops entries with an empty deviceId — an unaddressable device is not selectable', () => {
    // Browsers return exactly this shape before permission is granted. A picker row that
    // cannot be switched to is a control that lies about what it does.
    const devices = toCaptureDevices(
      [info({ deviceId: '', label: '' }), info({ deviceId: 'real', label: 'Real Cam' })],
      'camera',
    )
    expect(devices).toEqual([
      { deviceId: 'real', label: 'Real Cam', facility: 'camera', labelSynthesized: false },
    ])
  })

  it('synthesizes a positional label when the browser withholds the real one, and flags it', () => {
    const devices = toCaptureDevices(
      [info({ deviceId: 'a', label: '' }), info({ deviceId: 'b', label: '   ' })],
      'camera',
    )
    expect(devices.map((d) => d.label)).toEqual(['Camera 1', 'Camera 2'])
    expect(devices.every((d) => d.labelSynthesized)).toBe(true)
  })

  it('numbers synthesized labels over the KEPT devices, not the raw list', () => {
    // The mic and the id-less placeholder must not consume "Camera 1".
    const devices = toCaptureDevices(
      [
        info({ deviceId: 'mic', kind: 'audioinput', label: 'Mic' }),
        info({ deviceId: '', label: '' }),
        info({ deviceId: 'a', label: '' }),
        info({ deviceId: 'b', label: '' }),
      ],
      'camera',
    )
    expect(devices.map((d) => d.label)).toEqual(['Camera 1', 'Camera 2'])
  })

  it('trims a padded real label rather than treating it as present-but-blank', () => {
    const devices = toCaptureDevices([info({ deviceId: 'a', label: '  Studio Cam  ' })], 'camera')
    expect(devices[0]).toMatchObject({ label: 'Studio Cam', labelSynthesized: false })
  })

  it('returns an empty list for an empty enumeration', () => {
    expect(toCaptureDevices([], 'camera')).toEqual([])
  })
})

describe('positionalDeviceLabel', () => {
  it('is 1-based per facility', () => {
    expect(positionalDeviceLabel('camera', 0)).toBe('Camera 1')
    expect(positionalDeviceLabel('microphone', 2)).toBe('Microphone 3')
  })
})

describe('selectCaptureDevice', () => {
  const devices = toCaptureDevices(
    [info({ deviceId: 'a', label: 'A' }), info({ deviceId: 'b', label: 'B' })],
    'camera',
  )

  it('honours a preferred device that is still present', () => {
    expect(selectCaptureDevice(devices, 'b')?.deviceId).toBe('b')
  })

  it('falls back to the first device when the preferred one has been unplugged', () => {
    // Silently keeping the stale id would surface later as an unexplainable
    // OverconstrainedError instead of a working camera.
    expect(selectCaptureDevice(devices, 'gone')?.deviceId).toBe('a')
  })

  it('falls back to the first device when nothing is preferred', () => {
    expect(selectCaptureDevice(devices, null)?.deviceId).toBe('a')
  })

  it('returns null when there is nothing to select', () => {
    expect(selectCaptureDevice([], 'a')).toBeNull()
    expect(selectCaptureDevice([], null)).toBeNull()
  })
})
