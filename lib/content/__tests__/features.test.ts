import { describe, it, expect } from 'vitest'
import {
  features,
  getAllFeatures,
  getFeatureSlugs,
  getFeatureBySlug,
  getAdjacentFeatures,
} from '@/lib/content/features'

// The feature content model is the backbone the homepage grid and the
// /features/[slug] pages render from. These tests pin the data invariants and the
// query helpers (pure logic) so a content edit can't silently break navigation.
describe('feature content model', () => {
  it('exposes at least the three P0 marquee features', () => {
    const slugs = getFeatureSlugs()
    expect(slugs).toEqual(expect.arrayContaining(['time-calibration', 'import', 'reports']))
  })

  it('has unique, URL-safe slugs', () => {
    const slugs = features.map((f) => f.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('has a unique display order for every feature', () => {
    const orders = features.map((f) => f.order)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('gives every feature an eyebrow, title, pain line, and at least one content row', () => {
    for (const f of features) {
      expect(f.eyebrow.length).toBeGreaterThan(0)
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.painLine.length).toBeGreaterThan(0)
      expect(f.rows.length).toBeGreaterThan(0)
      for (const row of f.rows) {
        expect(row.heading.length).toBeGreaterThan(0)
        expect(row.body.length).toBeGreaterThan(0)
      }
    }
  })

  it('returns features ordered by display order from getAllFeatures()', () => {
    const ordered = getAllFeatures()
    const orders = ordered.map((f) => f.order)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
    expect(ordered.length).toBe(features.length)
  })

  it('looks up a feature by slug', () => {
    expect(getFeatureBySlug('time-calibration')?.slug).toBe('time-calibration')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getFeatureBySlug('does-not-exist')).toBeUndefined()
  })

  it('gives prev/next neighbours in display order without wrapping', () => {
    const ordered = getAllFeatures()
    const first = ordered[0]
    const last = ordered[ordered.length - 1]

    expect(getAdjacentFeatures(first.slug).prev).toBeUndefined()
    expect(getAdjacentFeatures(first.slug).next?.slug).toBe(ordered[1].slug)
    expect(getAdjacentFeatures(last.slug).next).toBeUndefined()
    expect(getAdjacentFeatures(last.slug).prev?.slug).toBe(ordered[ordered.length - 2].slug)
  })

  it('returns empty neighbours for an unknown slug', () => {
    expect(getAdjacentFeatures('nope')).toEqual({ prev: undefined, next: undefined })
  })
})
