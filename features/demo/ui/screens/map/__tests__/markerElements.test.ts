import { describe, it, expect } from 'vitest'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'
import type { ClusterDescriptor } from '@/features/demo/ui/screens/map/mapCluster'
import type { MapCameraMarker } from '@/features/demo/ui/screens/map/mapData'
import { createCameraEl, createClusterEl, createMarkerEl } from '@/features/demo/ui/screens/map/markerElements'

const cluster = (count: number, label = String(count)): ClusterDescriptor => ({
  kind: 'cluster',
  id: `cluster-${count}`,
  clusterId: count,
  lng: -79.6,
  lat: 43.6,
  count,
  label,
})

const camera = (over: Partial<MapCameraMarker> = {}): MapCameraMarker => ({
  id: 'l1:cam-1',
  locationId: 'l1',
  cameraName: 'Front entry',
  lng: -79.61,
  lat: 43.61,
  ...over,
})

describe('markerElements — pins', () => {
  it('tags a location dot with its id and kind', () => {
    const d: MarkerDescriptor = { id: 'l1', lng: -79.6, lat: 43.6, kind: 'location', color: '#00BFFF' }
    const el = createMarkerEl(d)
    expect(el.getAttribute('data-marker-id')).toBe('l1')
    expect(el.getAttribute('data-marker-kind')).toBe('location')
    expect(el.style.background).toContain('rgb(0, 191, 255)')
  })

  it('hides unnamed pins from the accessibility tree — the sheet row is their keyboard twin', () => {
    expect(createMarkerEl({ id: 'l1', lng: -79.6, lat: 43.6, kind: 'location', color: '#00BFFF' }).getAttribute('aria-hidden')).toBe('true')
    expect(createMarkerEl({ id: 'c1', lng: -79.6, lat: 43.6, kind: 'incident', color: '#e53935' }).getAttribute('aria-hidden')).toBe('true')
    // The cluster is NOT hidden — it has a name and is the only on-map route to its members.
    expect(createClusterEl(cluster(4)).getAttribute('aria-hidden')).toBeNull()
  })

  it('renders the incident as an SVG teardrop', () => {
    const el = createMarkerEl({ id: 'c1', lng: -79.6, lat: 43.6, kind: 'incident', color: '#e53935' })
    expect(el.getAttribute('data-marker-kind')).toBe('incident')
    expect(el.querySelector('svg')).not.toBeNull()
  })
})

describe('markerElements — cluster bubble', () => {
  it('carries the count, the label and an accessible name', () => {
    const el = createClusterEl(cluster(12))
    expect(el.getAttribute('data-marker-kind')).toBe('cluster')
    expect(el.getAttribute('data-cluster-count')).toBe('12')
    expect(el.getAttribute('aria-label')).toBe('Cluster of 12 locations')
    expect(el.textContent).toBe('12')
  })

  it('is focusable — below the cluster ceiling it is the only on-map route to its members', () => {
    expect(createClusterEl(cluster(12)).tabIndex).toBe(0)
  })

  it('sizes the disc off the phone step expression (16 / 22 / 28 radius)', () => {
    expect(createClusterEl(cluster(4)).style.width).toBe('32px')
    expect(createClusterEl(cluster(12)).style.width).toBe('44px')
    expect(createClusterEl(cluster(60)).style.width).toBe('56px')
  })

  it('renders the abbreviated label it is given', () => {
    expect(createClusterEl(cluster(1500, '1.5k')).textContent).toBe('1.5k')
  })
})

describe('markerElements — camera marker', () => {
  it('labels the glyph with the camera name and starts collapsed', () => {
    const el = createCameraEl(camera())
    const button = el.querySelector('[data-camera-button]')!
    expect(el.getAttribute('data-marker-kind')).toBe('camera')
    expect(el.getAttribute('data-marker-id')).toBe('l1:cam-1')
    expect(button.getAttribute('aria-label')).toBe('Camera Front entry')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(el.querySelector<HTMLElement>('[data-camera-callout]')!.style.display).toBe('none')
  })

  it('falls back to the literal "Camera" for a blank name', () => {
    const el = createCameraEl(camera({ cameraName: '   ' }))
    expect(el.querySelector('[data-camera-button]')!.getAttribute('aria-label')).toBe('Camera Camera')
    expect(el.querySelector('[data-camera-callout]')!.textContent).toContain('Camera')
  })

  it('toggles the callout open and closed on tap', () => {
    const el = createCameraEl(camera())
    const button = el.querySelector<HTMLElement>('[data-camera-button]')!
    const callout = el.querySelector<HTMLElement>('[data-camera-callout]')!
    button.click()
    expect(callout.style.display).toBe('block')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    button.click()
    expect(callout.style.display).toBe('none')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('stops the tap from reaching the map — a camera never selects or flies', () => {
    const el = createCameraEl(camera())
    const parent = document.createElement('div')
    let bubbled = 0
    parent.addEventListener('click', () => {
      bubbled += 1
    })
    parent.appendChild(el)
    el.querySelector<HTMLElement>('[data-camera-button]')!.click()
    expect(bubbled).toBe(0)
  })

  it('renders the 6-decimal coordinate line always, resolution and accuracy only when present', () => {
    const bare = createCameraEl(camera())
    expect(bare.querySelector('[data-camera-callout]')!.textContent).toContain('43.610000, -79.610000')
    expect(bare.querySelector('[data-camera-callout]')!.textContent).not.toContain('±')

    const full = createCameraEl(camera({ resolution: '1080p', accuracyM: 4.25 }))
    const text = full.querySelector('[data-camera-callout]')!.textContent!
    expect(text).toContain('1080p')
    expect(text).toContain('±4.3m')
  })

  it('escapes a name that would otherwise inject markup into the callout', () => {
    const el = createCameraEl(camera({ cameraName: '<img src=x onerror=1>' }))
    const callout = el.querySelector('[data-camera-callout]')!
    expect(callout.querySelector('img')).toBeNull()
    expect(callout.textContent).toContain('<img src=x onerror=1>')
  })
})
