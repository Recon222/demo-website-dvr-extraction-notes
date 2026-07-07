import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
      expect(rows[index]).toHaveTextContent(feature.title)
      expect(rows[index]).toHaveTextContent(feature.painLine)
    })
  })

  it('renders each feature’s class chip', () => {
    render(<EvidenceManifest features={features} />)
    // 3 CORE + 5 FIELD + 1 TRUST + 1 MARQUEE per the catalog
    expect(screen.getAllByText('CORE')).toHaveLength(3)
    expect(screen.getAllByText('FIELD')).toHaveLength(5)
    expect(screen.getAllByText('TRUST')).toHaveLength(1)
    expect(screen.getAllByText('MARQUEE')).toHaveLength(1)
  })

  it('flags the marquee row (gold edge treatment)', () => {
    render(<EvidenceManifest features={features} />)
    const marqueeRow = screen.getByRole('link', { name: /The timestamp you can defend/ })
    expect(marqueeRow).toHaveAttribute('data-marquee', 'true')
  })

  it('shows a DRAFT chip on the Notes row only', () => {
    render(<EvidenceManifest features={features} />)
    expect(screen.getAllByText('DRAFT')).toHaveLength(1)
    expect(screen.getByRole('link', { name: /wizard that walks the scene/ })).toHaveTextContent(
      'DRAFT',
    )
  })
})
