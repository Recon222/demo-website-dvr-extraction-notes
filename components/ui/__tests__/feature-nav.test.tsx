import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeatureNav } from '@/components/ui/feature-nav'
import { getAllFeatures } from '@/lib/content/features'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { mockPathname } = vi.hoisted(() => ({ mockPathname: vi.fn(() => '/') }))
vi.mock('next/navigation', () => ({ usePathname: mockPathname }))

beforeEach(() => {
  mockPathname.mockReturnValue('/')
})

describe('FeatureNav', () => {
  it('exposes a labelled "Features" navigation landmark', () => {
    render(<FeatureNav />)
    expect(screen.getByRole('navigation', { name: 'Features' })).toBeInTheDocument()
  })

  it('renders a routed button for every feature using its navLabel', () => {
    render(<FeatureNav />)
    for (const feature of getAllFeatures()) {
      expect(screen.getByRole('link', { name: feature.navLabel })).toHaveAttribute(
        'href',
        `/features/${feature.slug}`,
      )
    }
  })

  it('renders the links in display order', () => {
    render(<FeatureNav />)
    const renderedLabels = screen.getAllByRole('link').map((link) => link.textContent)
    expect(renderedLabels).toEqual(getAllFeatures().map((feature) => feature.navLabel))
  })

  it('marks exactly the active feature with aria-current="page"', () => {
    mockPathname.mockReturnValue('/features/import')
    render(<FeatureNav />)

    expect(screen.getByRole('link', { name: 'Import Request' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Map' })).not.toHaveAttribute('aria-current')
    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(active).toHaveLength(1)
  })

  it('marks nothing active on a non-feature route', () => {
    render(<FeatureNav />)
    for (const feature of getAllFeatures()) {
      expect(screen.getByRole('link', { name: feature.navLabel })).not.toHaveAttribute(
        'aria-current',
      )
    }
  })
})
