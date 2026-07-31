import { describe, it, expect } from 'vitest'

import { freshStore, newCaseInput, newLocationInput, storeWithLocation } from './test-utils'
import { selectCaseNotesData } from '@/features/demo/engine/store/selectors'
import type { CameraEntry, CameraGpsFix } from '@/features/demo/engine/types'

/**
 * `setCameraGps` (P3.7) — the store side of per-camera GPS.
 *
 * The action exists because a per-camera capture is a LONG async write into a list the visitor
 * keeps editing: `PRECISE_GPS_CONFIG` allows 120 s, and in that time a row can be removed, the
 * list re-ordered, or the whole location switched. Every test here is about the write landing on
 * the camera it was taken for — or not landing at all.
 */

const fix = (o: Partial<CameraGpsFix> = {}): CameraGpsFix => ({
  lat: 43.608701,
  lng: -79.650502,
  accuracyM: 6,
  source: 'gps',
  capturedAt: '2026-07-30T14:05:06.000Z',
  ...o,
})

const camera = (id: string, name = id.toUpperCase()): CameraEntry => ({
  id,
  cameraName: name,
  resolution: '',
  recordingFps: '',
})

const camerasOf = (store: ReturnType<typeof freshStore>) =>
  store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!.form.cameras

describe('setCameraGps', () => {
  it('writes the fix onto the addressed camera and leaves its siblings untouched', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.cameras', [camera('c1'), camera('c2'), camera('c3')])

    store.getState().setCameraGps('c2', fix())

    const cams = camerasOf(store)
    expect(cams.map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(cams[1].gps).toEqual(fix())
    expect(cams[0].gps).toBeUndefined()
    expect(cams[2].gps).toBeUndefined()
  })

  it('re-captures over an existing fix', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.cameras', [{ ...camera('c1'), gps: fix({ accuracyM: 40 }) }])

    store.getState().setCameraGps('c1', fix({ accuracyM: 3, capturedAt: '2026-07-30T15:00:00.000Z' }))

    expect(camerasOf(store)[0].gps).toEqual(fix({ accuracyM: 3, capturedAt: '2026-07-30T15:00:00.000Z' }))
  })

  it('addresses by ID, not by position — a re-ordered list still writes the right camera', () => {
    // The reason the action does not take an index: the index a capture started on is not the
    // index its fix arrives at. Here the visitor removed the first row mid-capture, so c2 has
    // moved from position 1 to position 0.
    const store = storeWithLocation()
    store.getState().updateField('form.cameras', [camera('c2'), camera('c3')])

    store.getState().setCameraGps('c2', fix())

    expect(camerasOf(store).find((c) => c.id === 'c2')?.gps).toEqual(fix())
    expect(camerasOf(store).find((c) => c.id === 'c3')?.gps).toBeUndefined()
  })

  it('drops the write when the camera was removed mid-capture — and does NOT resurrect it', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.cameras', [camera('c1'), camera('c2')])
    // The visitor removes c2 while its capture is still running.
    store.getState().updateField('form.cameras', [camera('c1')])

    store.getState().setCameraGps('c2', fix())

    expect(camerasOf(store).map((c) => c.id)).toEqual(['c1'])
    expect(camerasOf(store)[0].gps).toBeUndefined()
  })

  it('does not write a fix into ANOTHER location that happens to be open', () => {
    // Camera ids are globally unique, so "not in the open location" is also the cross-location
    // guard: a capture issued on location A cannot stamp coordinates onto location B.
    const store = freshStore()
    const caseId = store.getState().createCase(newCaseInput())
    const a = store.getState().addLocation(caseId, newLocationInput())
    store.getState().updateField('form.cameras', [camera('c1')])
    const b = store.getState().addLocation(caseId, newLocationInput({ locationName: 'Second' }))
    store.getState().updateField('form.cameras', [camera('c9')])
    expect(store.getState().currentLocationId).toBe(b)

    store.getState().setCameraGps('c1', fix())

    const locA = store.getState().locations.find((l) => l.id === a)!
    const locB = store.getState().locations.find((l) => l.id === b)!
    expect(locA.form.cameras[0].gps).toBeUndefined()
    expect(locB.form.cameras[0].gps).toBeUndefined()
  })

  it('is a no-op with no location open', () => {
    const store = freshStore()
    expect(() => store.getState().setCameraGps('c1', fix())).not.toThrow()
    expect(store.getState().locations).toEqual([])
  })

  it('leaves the rest of the form object identical (a targeted write, not a form rewrite)', () => {
    const store = storeWithLocation()
    store.getState().updateField('form.dvr.dvrTypeBrand', 'Hikvision')
    store.getState().updateField('form.cameras', [camera('c1')])
    const before = store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!.form

    store.getState().setCameraGps('c1', fix())

    const after = store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!.form
    expect(after.dvr).toBe(before.dvr)
    expect(after.scopes).toBe(before.scopes)
    expect(after.notesSections).toBe(before.notesSections)
  })
})

describe('per-camera GPS reaches the court document', () => {
  it('rides into the Case Notes data so the PDF camera table can print it', () => {
    // The `cameras` NOTES section is deliberately '' (PR-86 — the PDF table is the canonical
    // camera surface), so the document is the ONLY output that surfaces a camera fix. If the
    // selector drops it, the five captured keys reach nothing.
    const store = storeWithLocation()
    store.getState().updateField('form.cameras', [{ ...camera('c1', 'Rear entrance'), gps: fix() }])

    const data = selectCaseNotesData(store.getState())

    expect(data.cameras).toEqual([
      { name: 'Rear entrance', resolution: '', fps: '', gps: fix() },
    ])
  })
})
