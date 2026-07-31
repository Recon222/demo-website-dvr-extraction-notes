import { describe, it, expect } from 'vitest'
import { freshStore, newCaseInput, newLocationInput } from './test-utils'
import type { DemoStore } from '@/features/demo/engine/store/create-store'
import type { DemoLocation, ScopeEntry } from '@/features/demo/engine/types'

/**
 * P3.5 — the two duplicate store actions (phone `duplicateLocation` / `duplicateToNewAddress`,
 * `src/features/case-management/services/duplicate-location-service.ts`).
 *
 * What these pin: WHAT travels (the whole submission block, incl. every requester field) and
 * what deliberately does not (anything DVR-specific), the two modes' scope semantics, and the
 * contract differences between the two actions — requester-always-from-source, address-from-
 * the-card, no selection move.
 */

const SCOPES: ScopeEntry[] = [
  { id: 'sc-a', startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-09 02:00:00', isActualTime: true, cameras: 'ch 3, 4' },
  { id: 'sc-b', startDateTime: '2025-03-09 06:00:00', endDateTime: '2025-03-09 07:30:00', isActualTime: false, cameras: 'ch 1' },
]

/** A case with one fully-populated source location, worked well past the submission screen. */
function storeWithSource(): { store: DemoStore; caseId: string; sourceId: string } {
  const store = freshStore()
  const caseId = store.getState().createCase(newCaseInput())
  const sourceId = store.getState().addLocation(
    caseId,
    newLocationInput({
      locationName: 'Main Store',
      requesterName: 'Liam McHugh',
      requesterBadge: '4471',
      requesterPhone: '905-555-0110',
      requesterEmail: 'l.mchugh@example.ca',
      locationContact: 'Sandeep Gill',
      locationPhone: '905-555-0142',
      gps: { lat: 43.5789, lng: -79.6583, accuracyM: 5, source: 'geocoded' },
    }),
  )
  const st = store.getState()
  st.updateField('requesterUnit', 'Central Robbery')
  st.updateField('form.scopes', SCOPES)
  st.updateField('form.dvr.dvrTypeBrand', 'Hikvision DS-7608')
  st.updateField('form.dvr.dvrPassword', 'admin123')
  st.updateField('form.cameras', [{ id: 'cam-1', cameraName: 'Till', resolution: '1080p', recordingFps: '15' }])
  st.updateField('form.export.exportMedia', 'USB')
  st.updateField('form.notesFreeText', 'source notes')
  st.updateField('form.completed', true)
  return { store, caseId, sourceId }
}

const loc = (store: DemoStore, id: string | null): DemoLocation =>
  store.getState().locations.find((l) => l.id === id)!

describe('duplicateLocation', () => {
  it('copies every submission-level field, including all five requester fields', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Main Store - Copy', 'submission-only')
    const copy = loc(store, id)
    const source = loc(store, sourceId)

    expect(copy.locationName).toBe('Main Store - Copy')
    expect(copy.businessName).toBe(source.businessName)
    expect(copy.streetAddress).toBe(source.streetAddress)
    expect(copy.city).toBe(source.city)
    expect(copy.locationContact).toBe('Sandeep Gill')
    expect(copy.locationPhone).toBe('905-555-0142')
    // The phone's BUG-010 class: a hand-written field list silently dropped two of these.
    expect(copy.requesterName).toBe('Liam McHugh')
    expect(copy.requesterBadge).toBe('4471')
    expect(copy.requesterUnit).toBe('Central Robbery')
    expect(copy.requesterPhone).toBe('905-555-0110')
    expect(copy.requesterEmail).toBe('l.mchugh@example.ca')
  })

  it('clones the coordinates by value, not by reference', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Copy', 'submission-only')
    const copy = loc(store, id)

    expect(copy.gps).toEqual({ lat: 43.5789, lng: -79.6583, accuracyM: 5, source: 'geocoded' })
    expect(copy.gps).not.toBe(loc(store, sourceId).gps)
  })

  it('starts every DVR-specific field fresh', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Copy', 'with-scopes')
    const copy = loc(store, id)

    expect(copy.form.timeOffset).toBeNull()
    expect(copy.form.extractedScopes).toEqual([])
    expect(copy.form.dvr.dvrTypeBrand).toBe('')
    expect(copy.form.dvr.dvrPassword).toBe('')
    expect(copy.form.cameras).toEqual([])
    expect(copy.form.export.exportMedia).toBe('')
    expect(copy.form.notesFreeText).toBe('')
    expect(copy.form.completed).toBe(false)
  })

  it("'submission-only' carries no scopes", () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Copy', 'submission-only')
    expect(loc(store, id).form.scopes).toEqual([])
    expect(loc(store, sourceId).form.scopes).toHaveLength(2) // source untouched
  })

  it("'with-scopes' clones times + domain with fresh ids and blank cameras", () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Copy', 'with-scopes')
    const copied = loc(store, id).form.scopes

    expect(copied).toHaveLength(2)
    expect(copied.map((s) => s.startDateTime)).toEqual(SCOPES.map((s) => s.startDateTime))
    expect(copied.map((s) => s.endDateTime)).toEqual(SCOPES.map((s) => s.endDateTime))
    expect(copied.map((s) => s.isActualTime)).toEqual([true, false])
    // Channel labels are DVR-specific — the duplicate is a different DVR.
    expect(copied.every((s) => s.cameras === '')).toBe(true)
    expect(copied.map((s) => s.id)).not.toEqual(['sc-a', 'sc-b'])
    expect(new Set(copied.map((s) => s.id)).size).toBe(2)
  })

  it('registers the copy on the same case and appends it to the list', () => {
    const { store, caseId, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, 'Copy', 'submission-only')!
    const c = store.getState().cases.find((x) => x.id === caseId)!

    expect(loc(store, id).caseId).toBe(caseId)
    expect(c.locationIds).toEqual([sourceId, id])
    expect(store.getState().locations.map((l) => l.id)).toEqual([sourceId, id])
  })

  it('does NOT move the selection pair (the phone stays on the Cases list)', () => {
    const { store, caseId, sourceId } = storeWithSource()
    const before = store.getState()
    expect(before.currentLocationId).toBe(sourceId) // set by addLocation

    store.getState().duplicateLocation(sourceId, 'Copy', 'with-scopes')

    expect(store.getState().currentLocationId).toBe(sourceId)
    expect(store.getState().currentCaseId).toBe(caseId)
  })

  it('trims the name', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateLocation(sourceId, '  Main Store - Copy  ', 'submission-only')
    expect(loc(store, id).locationName).toBe('Main Store - Copy')
  })

  it('returns null and writes nothing for a missing source or a blank name', () => {
    const { store, sourceId } = storeWithSource()
    const count = store.getState().locations.length

    expect(store.getState().duplicateLocation('nope', 'Copy', 'submission-only')).toBeNull()
    expect(store.getState().duplicateLocation(sourceId, '   ', 'submission-only')).toBeNull()
    expect(store.getState().locations).toHaveLength(count)
  })
})

describe('duplicateToNewAddress', () => {
  const overrides = {
    locationName: 'New Location',
    businessName: 'Gas Bar',
    streetAddress: '99 Queen St W',
    city: 'Brampton',
    locationContact: 'Rita Osei',
    locationPhone: '905-555-0180',
  }

  it('takes address + contact from the card and the requester block from the source', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateToNewAddress(sourceId, overrides, 'submission-only')
    const created = loc(store, id)

    expect(created.locationName).toBe('New Location')
    expect(created.businessName).toBe('Gas Bar')
    expect(created.streetAddress).toBe('99 Queen St W')
    expect(created.city).toBe('Brampton')
    expect(created.locationContact).toBe('Rita Osei')
    expect(created.locationPhone).toBe('905-555-0180')
    // Requester fields ALWAYS from the source — the card never renders them.
    expect(created.requesterName).toBe('Liam McHugh')
    expect(created.requesterBadge).toBe('4471')
    expect(created.requesterUnit).toBe('Central Robbery')
    expect(created.requesterPhone).toBe('905-555-0110')
    expect(created.requesterEmail).toBe('l.mchugh@example.ca')
  })

  it("stores a card-captured fix with its own provenance, GPS included (§56h)", () => {
    // `NewAddressOverrides.gps` was typed `Exclude<GpsSource, 'gps'>` while the card inherited
    // deferred §24's capture no-op, so an address pick was the only reachable source. P3.4's
    // real capture made `'gps'` reachable and the type was widened at the P3 assembly; this is
    // the arm that fails if anyone narrows it back or re-introduces a flat re-stamp.
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateToNewAddress(
      sourceId,
      { ...overrides, gps: { lat: 43.608701, lng: -79.650502, accuracyM: 6, source: 'gps' } },
      'submission-only',
    )

    expect(loc(store, id).gps).toEqual({ lat: 43.608701, lng: -79.650502, accuracyM: 6, source: 'gps' })
  })

  it("does NOT inherit the source's address, business name or coordinates", () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateToNewAddress(
      sourceId,
      { locationName: 'New Location', streetAddress: '99 Queen St W' },
      'submission-only',
    )
    const created = loc(store, id)

    expect(created.businessName).toBe('')
    expect(created.city).toBe('')
    expect(created.streetAddress).not.toBe(loc(store, sourceId).streetAddress)
    expect(created.gps).toBeUndefined() // a different scene — the source's fix is not this one
  })

  it('carries the card-supplied coordinates when the address pick provided them', () => {
    const { store, sourceId } = storeWithSource()
    const id = store.getState().duplicateToNewAddress(
      sourceId,
      { ...overrides, gps: { lat: 43.6852, lng: -79.7597, source: 'geocoded' } },
      'submission-only',
    )
    expect(loc(store, id).gps).toEqual({ lat: 43.6852, lng: -79.7597, source: 'geocoded' })
  })

  it("'with-scopes' clones the source's scopes; 'submission-only' does not", () => {
    const { store, sourceId } = storeWithSource()
    const withScopes = store.getState().duplicateToNewAddress(sourceId, overrides, 'with-scopes')
    const without = store.getState().duplicateToNewAddress(
      sourceId,
      { ...overrides, locationName: 'New Location (2)' },
      'submission-only',
    )

    expect(loc(store, withScopes).form.scopes).toHaveLength(2)
    expect(loc(store, withScopes).form.scopes[0].cameras).toBe('')
    expect(loc(store, without).form.scopes).toEqual([])
  })

  it('lands in the source case without moving the selection pair', () => {
    const { store, caseId, sourceId } = storeWithSource()
    const id = store.getState().duplicateToNewAddress(sourceId, overrides, 'submission-only')!

    expect(loc(store, id).caseId).toBe(caseId)
    expect(store.getState().cases.find((c) => c.id === caseId)!.locationIds).toEqual([sourceId, id])
    expect(store.getState().currentLocationId).toBe(sourceId)
  })

  it('refuses a missing source, a blank name, or a blank street address', () => {
    const { store, sourceId } = storeWithSource()
    const count = store.getState().locations.length

    expect(store.getState().duplicateToNewAddress('nope', overrides, 'submission-only')).toBeNull()
    expect(
      store.getState().duplicateToNewAddress(sourceId, { ...overrides, locationName: ' ' }, 'submission-only'),
    ).toBeNull()
    // The whole point of the flow is a NEW address — the phone's service backstop for the
    // card's require-address mode.
    expect(
      store.getState().duplicateToNewAddress(sourceId, { ...overrides, streetAddress: '  ' }, 'submission-only'),
    ).toBeNull()
    expect(
      store.getState().duplicateToNewAddress(sourceId, { locationName: 'X' }, 'submission-only'),
    ).toBeNull()
    expect(store.getState().locations).toHaveLength(count)
  })
})
