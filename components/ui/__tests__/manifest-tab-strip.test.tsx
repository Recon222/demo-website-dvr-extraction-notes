import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ManifestTabStrip } from '@/components/ui/manifest-tab-strip'
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

// The strip is a client island fed minimal props (server-serialization rule):
// callers map the catalog to {slug, navLabel} — numbering derives from position.
const items = getAllFeatures().map(({ slug, navLabel }) => ({ slug, navLabel }))

describe('ManifestTabStrip', () => {
  it('exposes a labelled "Features" navigation landmark', () => {
    render(<ManifestTabStrip items={items} />)
    expect(screen.getByRole('navigation', { name: 'Features' })).toBeInTheDocument()
  })

  it('renders a routed tab for every feature with its zero-padded manifest number', () => {
    render(<ManifestTabStrip items={items} />)
    items.forEach((item, index) => {
      const number = String(index + 1).padStart(2, '0')
      const link = screen.getByRole('link', { name: `${number} ${item.navLabel}` })
      expect(link).toHaveAttribute('href', `/features/${item.slug}`)
    })
  })

  it('renders the tabs in catalog order', () => {
    render(<ManifestTabStrip items={items} />)
    const labels = screen.getAllByRole('link').map((link) => link.textContent?.trim())
    expect(labels).toEqual(
      items.map((item, i) => `${String(i + 1).padStart(2, '0')} ${item.navLabel}`),
    )
  })

  it('marks exactly the active feature with aria-current="page" (gold state)', () => {
    mockPathname.mockReturnValue('/features/import')
    render(<ManifestTabStrip items={items} />)

    expect(screen.getByRole('link', { name: '02 Import Request' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const active = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(active).toHaveLength(1)
  })

  it('marks nothing active on a non-feature route', () => {
    render(<ManifestTabStrip items={items} />)
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current')
    }
  })
})
