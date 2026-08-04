import { describe, it, expect } from 'vitest'
import {
  features,
  featureHeadline,
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

  it('gives every feature a short navLabel for the nav strip', () => {
    for (const f of features) {
      expect(f.navLabel.length).toBeGreaterThan(0)
    }
  })

  it('has unique navLabels for the nav strip', () => {
    // navLabel is the accessible name of each link in <FeatureNav>; duplicates would
    // make two links indistinguishable to assistive tech and break getByRole lookups.
    const labels = features.map((f) => f.navLabel)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps placeholder copy out of every feature', () => {
    // Applies to the whole catalog now: the `draft` flag that used to exempt one
    // feature is gone. NOTE this only catches the literal word "placeholder" — Notes
    // still carries scaffolding phrased as real copy ("Copy pending.", "LANDS HERE"),
    // which this guard deliberately does not fail on, or the suite would be red until
    // that copy is rewritten. It is not marked on-page either; see the catalog header.
    for (const f of features) {
      const copy = [
        f.eyebrow,
        f.title,
        f.painLine,
        ...f.rows.flatMap((row) => [row.heading, row.body]),
        f.diagram?.caption ?? '',
      ].join(' ')
      expect(copy, `feature "${f.slug}" still contains placeholder copy`).not.toMatch(
        /placeholder/i,
      )
    }
  })

  it('includes the new Cases & Locations, Notes, and Location features (camera-gps folded into Location)', () => {
    const slugs = getFeatureSlugs()
    expect(slugs).toEqual(expect.arrayContaining(['cases-locations', 'notes', 'location']))
    expect(slugs).not.toContain('camera-gps')
  })

  it('returns features in declaration order from getAllFeatures()', () => {
    const ordered = getAllFeatures()
    expect(ordered.map((f) => f.slug)).toEqual(features.map((f) => f.slug))
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

    const firstAdjacent = getAdjacentFeatures(first.slug)
    expect(firstAdjacent).not.toBeNull()
    expect(firstAdjacent!.prev).toBeUndefined()
    expect(firstAdjacent!.next?.slug).toBe(ordered[1].slug)

    const lastAdjacent = getAdjacentFeatures(last.slug)
    expect(lastAdjacent).not.toBeNull()
    expect(lastAdjacent!.next).toBeUndefined()
    expect(lastAdjacent!.prev?.slug).toBe(ordered[ordered.length - 2].slug)
  })

  it('returns null for an unknown slug (distinct from a feature with no neighbour)', () => {
    expect(getAdjacentFeatures('nope')).toBeNull()
  })
})

// Case-File redesign fields (docs/features/case-file-redesign/). These carry the
// manifest class chips, page intros, tip cards, row kickers/chips/REC labels, and
// per-page beta lines — all transcribed from the design canvas (final intent).
describe('Case-File content fields', () => {
  // The CORE / FIELD / TRUST / MARQUEE taxonomy was removed from the data model after
  // its last rendering site went (the feature-page breadcrumb chip). This pins the
  // removal: it was internal vocabulary a visitor could not decode, so it should not
  // come back as a field before it comes back as a design.
  it('carries no class taxonomy', () => {
    for (const f of features) {
      expect(f, `feature "${f.slug}"`).not.toHaveProperty('classLabel')
    }
  })

  // The draft machinery (a `draft: true` flag plus a `draftNote` banner, hatched
  // scaffolding blocks, and a prev/next chip) was removed from the data model: it
  // marked one feature's copy as placeholder, which stopped meaning anything once
  // every page's copy was slated for a rewrite.
  it('carries no draft flag or draft note', () => {
    for (const f of features) {
      expect(f, `feature "${f.slug}"`).not.toHaveProperty('draft')
      expect(f, `feature "${f.slug}"`).not.toHaveProperty('draftNote')
    }
  })

  it('gives every feature an intro paragraph', () => {
    for (const f of features) {
      expect(f.intro?.length, `feature "${f.slug}" intro`).toBeGreaterThan(0)
    }
  })

  // Notes is the one feature without a beta strip line — it never had one, because it
  // used to be exempt as a draft. Now that nothing marks it, this is the only place
  // the gap is recorded: when its copy lands, it needs a line like every other page.
  it('gives every feature a beta strip line except Notes', () => {
    for (const f of features) {
      if (f.slug === 'notes') {
        expect(f.betaStripLine, 'Notes still needs a beta strip line').toBeUndefined()
      } else {
        expect(f.betaStripLine?.length, `feature "${f.slug}" betaStripLine`).toBeGreaterThan(0)
      }
    }
  })

  it('formats row kickers and REC labels per the design system', () => {
    for (const f of features) {
      for (const row of f.rows) {
        if (row.kicker) {
          expect(row.kicker, `"${f.slug}" kicker "${row.kicker}"`).toMatch(/^0\d — [A-Z]/)
        }
        if (row.recLabel) {
          expect(row.recLabel, `"${f.slug}" recLabel "${row.recLabel}"`).toMatch(/^REC 0\d — [A-Z]/)
          expect(row.media, `"${f.slug}" REC label requires media`).toBeTruthy()
        }
      }
    }
  })

  it('uses the trust-cards layout only for Security & Privacy, with accented rows', () => {
    for (const f of features) {
      if (f.slug === 'on-device') {
        expect(f.layout).toBe('trust-cards')
        expect(f.rows.map((r) => r.accent)).toEqual(['cyan', 'gold'])
      } else {
        expect(f.layout, `"${f.slug}" must not set layout`).toBeUndefined()
        // accent is only meaningful under the trust-cards layout — a stray accent
        // on a normal feature row would silently style nothing (or worse, later).
        for (const row of f.rows) {
          expect(row.accent, `"${f.slug}" rows must not set accent`).toBeUndefined()
        }
      }
    }
  })

  it('keeps the marquee tip variants: one tip max, gold or cyan', () => {
    for (const f of features) {
      if (f.tip) {
        expect(['gold', 'cyan'], `"${f.slug}" tip variant`).toContain(f.tip.variant)
        expect(f.tip.body.length).toBeGreaterThan(0)
      }
    }
    // Security & Privacy intentionally has no tip card (trust cards carry the page).
    expect(getFeatureBySlug('on-device')?.tip).toBeUndefined()
  })

  it('derives the page H1 via featureHeadline (explicit headline, else title + period)', () => {
    // 04/07/09 carry explicit display headlines; everything else falls back.
    expect(featureHeadline(getFeatureBySlug('location')!)).toBe(
      'Pin the site, and every camera on it.',
    )
    expect(featureHeadline(getFeatureBySlug('secure-export')!)).toBe(
      'The whole case, sealed for handoff.',
    )
    expect(featureHeadline(getFeatureBySlug('cases-locations')!)).toBe(
      'Every case, every location, in order.',
    )
  })

  it('gives map no diagram and every other feature a headed diagram', () => {
    for (const f of features) {
      if (f.slug === 'map') {
        expect(f.diagram).toBeUndefined()
      } else {
        expect(f.diagram, `"${f.slug}" diagram`).toBeDefined()
        expect(f.diagram!.heading?.length, `"${f.slug}" diagram heading`).toBeGreaterThan(0)
      }
    }
  })
})
