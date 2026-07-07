import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Feature } from '@/lib/content/types'
import { FeatureGrid } from '@/components/home/feature-grid'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const features: Feature[] = [
  {
    slug: 'time-calibration',
    navLabel: 'Time Offset',
    eyebrow: 'Time calibration',
    title: 'Defend the timestamp',
    painLine: 'Clocks are wrong.',
    classLabel: 'MARQUEE',
    rows: [{ heading: 'h', body: 'b' }],
    priority: 'p0',
  },
  {
    slug: 'import',
    navLabel: 'Import Request',
    eyebrow: 'Import',
    title: 'Auto-fill the case',
    painLine: 'Re-typing is slow.',
    classLabel: 'CORE',
    rows: [{ heading: 'h', body: 'b' }],
    priority: 'p0',
  },
]

describe('FeatureGrid', () => {
  it('renders a card link per feature to its detail page', () => {
    render(<FeatureGrid features={features} />)
    expect(screen.getByRole('link', { name: /Defend the timestamp/ })).toHaveAttribute(
      'href',
      '/features/time-calibration',
    )
    expect(screen.getByRole('link', { name: /Auto-fill the case/ })).toHaveAttribute(
      'href',
      '/features/import',
    )
  })

  it('renders each feature title and pain line', () => {
    render(<FeatureGrid features={features} />)
    expect(screen.getByText('Defend the timestamp')).toBeInTheDocument()
    expect(screen.getByText('Re-typing is slow.')).toBeInTheDocument()
  })

  it('renders no links when there are no features', () => {
    const { container } = render(<FeatureGrid features={[]} />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })
})
