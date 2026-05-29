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
  it('renders a routed button for every feature using its navLabel', () => {
    render(<FeatureNav />)
    for (const feature of getAllFeatures()) {
      expect(screen.getByRole('link', { name: feature.navLabel })).toHaveAttribute(
        'href',
        `/features/${feature.slug}`,
      )
    }
  })

  it('marks the active feature with aria-current="page"', () => {
    mockPathname.mockReturnValue('/features/import')
    render(<FeatureNav />)

    expect(screen.getByRole('link', { name: 'Import Request' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Map' })).not.toHaveAttribute('aria-current')
  })

  it('marks nothing active on a non-feature route', () => {
    mockPathname.mockReturnValue('/')
    render(<FeatureNav />)
    for (const feature of getAllFeatures()) {
      expect(screen.getByRole('link', { name: feature.navLabel })).not.toHaveAttribute(
        'aria-current',
      )
    }
  })
})
