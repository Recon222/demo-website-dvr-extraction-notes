'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  permissionAfterFailure,
  type CaptureFacility,
  type CaptureFailure,
  type CapturePermission,
} from '@/features/demo/engine/logic/media/permissions'
import { selectCaptureDevice, type CaptureDevice } from '@/features/demo/engine/logic/media/devices'
import {
  listCaptureDevices,
  openCaptureStream,
  readBrowserMediaDevices,
  stopStream,
  type MediaDevicesLike,
} from '@/features/demo/ui/inputs/capture-media'

/**
 * Live-stream acquisition as a hook (parity P4.1) — the demo's analog of vision-camera's
 * `useCameraPermission` + `useCameraDevice` + `isActive`, and the counterpart of
 * `useGpsCapture` for the media capability.
 *
 * Three guarantees, the same three the GPS hook makes:
 * 1. one acquisition at a time (a ref, not `isOpening` state — two clicks in the same tick
 *    both read the pre-update value);
 * 2. an acquisition in flight when the component unmounts is abandoned, its stream is stopped
 *    rather than leaked, and it writes no state afterwards;
 * 3. the previous failure clears when a new attempt starts.
 *
 * Plus one this capability needs and GPS does not: **the hardware is released on unmount.**
 * A `MediaStream` left running keeps the camera light on after the visitor has navigated
 * away — the web equivalent of the phone's `isActive={isFocused}`.
 *
 * Consumed directly by P4.7 (OCR camera, no recording) and through `useMediaCapture` by
 * P4.3/P4.6.
 */

export interface UseCaptureStreamOptions {
  facility: CaptureFacility
  /** Camera only: open an audio track too, so a video take carries sound. */
  withAudio?: boolean
  /** Test seam. `mediaDevices: null` forces the unavailable path; omitting the key reads the
   *  browser. */
  deps?: { mediaDevices?: MediaDevicesLike | null }
}

export interface UseCaptureStreamReturn {
  permission: CapturePermission
  failure: CaptureFailure | null
  stream: MediaStream | null
  /** Whether the open stream carries an audio track. */
  hasAudio: boolean
  /** Audio was asked for and refused; the take will be silent and the surface must say so. */
  audioDegraded: boolean
  devices: CaptureDevice[]
  /** Non-null when the device list could not be read — distinct from "there are none". */
  deviceFailure: CaptureFailure | null
  selectedDeviceId: string | null
  isOpening: boolean
  /** Open (or re-open) the stream. Resolves to the stream, or `null` on failure/abandonment. */
  open(deviceId?: string): Promise<MediaStream | null>
  /** Re-open on a different device. Resolves like `open`. */
  selectDevice(deviceId: string): Promise<MediaStream | null>
  /** Stop the tracks and drop the stream, leaving permission and device state intact. */
  close(): void
}

/** The device actually opened, read back off the track rather than assumed from the request —
 *  a browser may honour a constraint differently, and the picker must show what is live. */
function openedDeviceId(stream: MediaStream, requested: string | undefined): string | null {
  const tracks = typeof stream.getTracks === 'function' ? stream.getTracks() : []
  for (const track of tracks) {
    if (typeof track.getSettings !== 'function') continue
    const settings = track.getSettings()
    if (typeof settings.deviceId === 'string' && settings.deviceId !== '') return settings.deviceId
  }
  return requested ?? null
}

export function useCaptureStream(options: UseCaptureStreamOptions): UseCaptureStreamReturn {
  const readDevices = (): MediaDevicesLike | null =>
    optionsRef.current.deps?.mediaDevices !== undefined
      ? (optionsRef.current.deps.mediaDevices ?? null)
      : readBrowserMediaDevices()

  // Read the latest options inside handlers rather than closing over them, so an inline
  // `deps` object does not invalidate every callback's identity each render (the pattern
  // `useGpsCapture` established).
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const [permission, setPermission] = useState<CapturePermission>(() =>
    (options.deps?.mediaDevices !== undefined ? options.deps.mediaDevices : readBrowserMediaDevices()) === null
      ? 'unavailable'
      : 'prompt',
  )
  const [failure, setFailure] = useState<CaptureFailure | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [hasAudio, setHasAudio] = useState(false)
  const [audioDegraded, setAudioDegraded] = useState(false)
  const [devices, setDevices] = useState<CaptureDevice[]>([])
  const [deviceFailure, setDeviceFailure] = useState<CaptureFailure | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isOpening, setIsOpening] = useState(false)

  const abortedRef = useRef(false)
  const openingRef = useRef(false)
  // The live stream, mirrored in a ref so `close` and the unmount cleanup can release it
  // without either depending on the state value (and so re-entrant `open` calls release the
  // previous stream rather than orphaning it).
  const streamRef = useRef<MediaStream | null>(null)

  const releaseStream = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
  }, [])

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
      releaseStream()
    }
  }, [releaseStream])

  const open = useCallback(
    async (deviceId?: string): Promise<MediaStream | null> => {
      if (openingRef.current) return null
      openingRef.current = true

      const { facility, withAudio } = optionsRef.current
      // Release first: a device switch must not leave the previous camera running, and
      // browsers can refuse a second stream while the first holds the hardware.
      releaseStream()
      if (!abortedRef.current) {
        setStream(null)
        setFailure(null)
        setIsOpening(true)
      }

      try {
        const outcome = await openCaptureStream(
          { facility, withAudio, deviceId },
          { mediaDevices: readDevices() },
        )

        if (abortedRef.current) {
          // Unmounted mid-acquisition: the stream still arrived, so stop it here or the
          // camera light stays on with nothing rendering.
          if (outcome.ok) stopStream(outcome.stream)
          return null
        }

        if (!outcome.ok) {
          setFailure(outcome.failure)
          setPermission(permissionAfterFailure(outcome.failure.code))
          return null
        }

        streamRef.current = outcome.stream
        setStream(outcome.stream)
        setHasAudio(outcome.hasAudio)
        setAudioDegraded(outcome.audioDegraded)
        setPermission('granted')
        setSelectedDeviceId(openedDeviceId(outcome.stream, deviceId))

        // Device labels are only readable once permission is granted, so the list is (re)read
        // here rather than on mount.
        const listed = await listCaptureDevices(facility, { mediaDevices: readDevices() })
        if (!abortedRef.current) {
          setDevices(listed.devices)
          setDeviceFailure(listed.failure)
          setSelectedDeviceId((current) => selectCaptureDevice(listed.devices, current)?.deviceId ?? current)
        }
        return outcome.stream
      } finally {
        openingRef.current = false
        if (!abortedRef.current) setIsOpening(false)
      }
    },
    [releaseStream],
  )

  const selectDevice = useCallback((deviceId: string) => open(deviceId), [open])

  const close = useCallback(() => {
    releaseStream()
    setStream(null)
    setHasAudio(false)
    setAudioDegraded(false)
  }, [releaseStream])

  return {
    permission,
    failure,
    stream,
    hasAudio,
    audioDegraded,
    devices,
    deviceFailure,
    selectedDeviceId,
    isOpening,
    open,
    selectDevice,
    close,
  }
}
