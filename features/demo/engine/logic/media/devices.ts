/**
 * Capture-device enumeration + selection — pure (parity P4.1).
 *
 * The phone flips between a fixed `'back'`/`'front'` pair (vision-camera's `useCameraDevice`);
 * a browser instead hands back an open-ended `enumerateDevices()` list, so the demo's analog
 * of the flip button is a device PICKER over that list. Everything about turning the raw list
 * into something selectable is decided here, so `ui/inputs/capture-media.ts` only has to call
 * the API.
 */

import type { CaptureFacility } from '@/features/demo/engine/logic/media/permissions'

/** The slice of `MediaDeviceInfo` this module reads. Declared structurally so the engine
 *  stays free of DOM lib types and tests can hand in plain objects. */
export interface MediaDeviceInfoLike {
  readonly deviceId: string
  readonly kind: string
  readonly label: string
}

export interface CaptureDevice {
  deviceId: string
  /** Always non-empty: browsers report `''` until permission is granted, so an unlabelled
   *  device gets a positional name rather than a blank row in the picker. */
  label: string
  facility: CaptureFacility
  /** True when the label was synthesized because the browser withheld the real one. */
  labelSynthesized: boolean
}

/** `MediaDeviceInfo.kind` → facility. `audiooutput` is deliberately unmapped: the demo never
 *  selects a speaker. */
const KIND_TO_FACILITY: Readonly<Record<string, CaptureFacility>> = Object.freeze({
  videoinput: 'camera',
  audioinput: 'microphone',
})

export function facilityForDeviceKind(kind: string): CaptureFacility | null {
  return KIND_TO_FACILITY[kind] ?? null
}

/** Positional fallback name, 1-based — "Camera 1", "Microphone 2". */
export function positionalDeviceLabel(facility: CaptureFacility, index: number): string {
  return `${facility === 'camera' ? 'Camera' : 'Microphone'} ${index + 1}`
}

/**
 * Raw `enumerateDevices()` output → the selectable devices for one facility.
 *
 * Two filters, both load-bearing:
 * - other facilities (and `audiooutput`) are dropped;
 * - entries with an EMPTY `deviceId` are dropped. Before permission is granted browsers
 *   return placeholder entries with no id and no label; listing one in a picker would offer
 *   the visitor a device the demo provably cannot switch to. A picker row that does nothing
 *   is the UI version of a fake success.
 *
 * The positional index used for a synthesized label counts only the KEPT devices of this
 * facility, so "Camera 1" is the first camera in the list the visitor is actually shown.
 */
export function toCaptureDevices(
  infos: readonly MediaDeviceInfoLike[],
  facility: CaptureFacility,
): CaptureDevice[] {
  const devices: CaptureDevice[] = []
  for (const info of infos) {
    if (facilityForDeviceKind(info.kind) !== facility) continue
    if (info.deviceId === '') continue
    const label = info.label.trim()
    devices.push({
      deviceId: info.deviceId,
      label: label === '' ? positionalDeviceLabel(facility, devices.length) : label,
      facility,
      labelSynthesized: label === '',
    })
  }
  return devices
}

/**
 * Which device a surface should be on: the preferred one if it is still in the list,
 * otherwise the first available, otherwise none.
 *
 * The "still in the list" re-check is the point — a device can be unplugged between the
 * enumeration that populated the picker and the next `getUserMedia`, and silently keeping a
 * stale `deviceId` would produce an `OverconstrainedError` the visitor cannot explain.
 */
export function selectCaptureDevice(
  devices: readonly CaptureDevice[],
  preferredId: string | null,
): CaptureDevice | null {
  if (preferredId !== null) {
    const preferred = devices.find((d) => d.deviceId === preferredId)
    if (preferred) return preferred
  }
  return devices[0] ?? null
}
