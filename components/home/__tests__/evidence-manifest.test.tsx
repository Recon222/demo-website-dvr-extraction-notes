import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { getAllFeatures } from '@/lib/content/features'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const features = getAllFeatures()

describe('EvidenceManifest (Case-File)', () => {
  it('anchors #features with the manifest heading', () => {
    const { container } = render(<EvidenceManifest features={features} />)
    expect(container.querySelector('#features')).not.toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Every feature kills a pain point' }),
    ).toBeInTheDocument()
  })

  it('renders one linked row per feature, in order, with zero-padded numbers', () => {
    render(<EvidenceManifest features={features} />)
    const rows = screen.getAllByRole('link')
    expect(rows).toHaveLength(features.length)
    features.forEach((feature, index) => {
      expect(rows[index]).toHaveAttribute('href', `/features/${feature.slug}`)
      expect(rows[index]).toHaveTextContent(String(index + 1).padStart(2, '0'))
      expect(rows[index]).toHaveTextContent(feature.navLabel.toUpperCase())
      expect(rows[index]).toHaveTextContent(feature.painLine)
    })
  })

  // The FEATURE column shows navLabel, not title: the nav label is what the visitor
  // already knows the feature as, and the page title is a headline that should land
  // for the first time ON the feature page rather than be spent in a table row.
  it('lists the nav label in gold, never the page title', () => {
    render(<EvidenceManifest features={features} />)
    expect(screen.getByText('FEATURE')).toBeInTheDocument()
    expect(screen.queryByText('ITEM')).not.toBeInTheDocument()

    const label = screen.getByText('CASES & LOCATIONS')
    expect(label).toHaveClass('text-gold')
    expect(label).toHaveClass('font-stmono')

    // No feature-page headline leaks into the table.
    for (const feature of features) {
      expect(screen.queryByText(feature.title), `title of "${feature.slug}"`).not.toBeInTheDocument()
    }
  })

  // The CLASS column and its CORE/FIELD/TRUST/MARQUEE chips were removed (owner
  // decision): the taxonomy meant nothing to a visitor, and it has since been removed
  // from the data model entirely (see the catalog's own no-class-taxonomy test).
  it('publishes no class taxonomy in the table', () => {
    render(<EvidenceManifest features={features} />)
    expect(screen.queryByText('CLASS')).not.toBeInTheDocument()
    for (const label of ['CORE', 'FIELD', 'TRUST', 'MARQUEE']) {
      expect(screen.queryByText(label), `${label} chip should be gone`).not.toBeInTheDocument()
    }
  })

  // The MARQUEE feature used to be singled out with a gold tint, gold number, gold
  // arrow, brighter pain line, and an inset gold left edge. With the CLASS column gone
  // there was nothing left to explain the difference, so the whole treatment went.
  it('renders every row identically, with no flagship treatment', () => {
    render(<EvidenceManifest features={features} />)
    const exMarquee = screen.getByRole('link', { name: /TIME OFFSET/ })
    const ordinary = screen.getByRole('link', { name: /IMPORT REQUEST/ })

    // Both are mid-table rows, so identical classes is the whole assertion.
    expect(exMarquee.className).toBe(ordinary.className)
    expect(exMarquee).not.toHaveAttribute('data-marquee')
    expect(exMarquee.className).not.toContain('gold')
    expect(exMarquee.className).not.toContain('inset_3px')
    expect(within(exMarquee).getByText('06')).toHaveClass('text-cyan')
    expect(within(ordinary).getByText('02')).toHaveClass('text-cyan')
  })

  it('marks the draft row by its italic pain line, not a floating pill', () => {
    render(<EvidenceManifest features={features} />)
    expect(screen.queryByText('DRAFT')).not.toBeInTheDocument()
    const draftRow = screen.getByRole('link', { name: /NOTES WIZARD/ })
    expect(within(draftRow).getByText(/Copy pending/)).toHaveClass('italic')
  })
})
