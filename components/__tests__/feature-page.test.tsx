import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Feature } from '@/lib/content/types'
import { FeaturePage } from '@/components/feature-page'

// Render next/link as a plain anchor in tests (no router context needed).
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const feature: Feature = {
  slug: 'time-calibration',
  eyebrow: 'Time calibration',
  title: 'The timestamp you can defend',
  painLine: 'DVR clocks are almost always wrong.',
  rows: [
    { heading: 'Read the clock', body: 'On-device OCR reads it.', media: 'demos/tc/ocr.mp4' },
    { heading: 'Calibrate', body: 'Sync to an atomic clock.' },
  ],
  diagram: { src: 'diagrams/time-calibration.svg', caption: 'The traceability chain.' },
  priority: 'p0',
  order: 1,
}

const prev: Feature = { ...feature, slug: 'intro', title: 'Intro', order: 0 }
const next: Feature = { ...feature, slug: 'import', title: 'Request import', order: 2 }

describe('FeaturePage', () => {
  it('renders the title, eyebrow, and pain line', () => {
    render(<FeaturePage feature={feature} />)
    expect(screen.getByRole('heading', { level: 1, name: feature.title })).toBeInTheDocument()
    expect(screen.getByText(feature.eyebrow)).toBeInTheDocument()
    expect(screen.getByText(feature.painLine)).toBeInTheDocument()
  })

  it('renders every content row heading and body', () => {
    render(<FeaturePage feature={feature} />)
    for (const row of feature.rows) {
      expect(screen.getByText(row.heading)).toBeInTheDocument()
      expect(screen.getByText(row.body)).toBeInTheDocument()
    }
  })

  it('renders the diagram caption when a diagram is present', () => {
    render(<FeaturePage feature={feature} />)
    expect(screen.getByText('The traceability chain.')).toBeInTheDocument()
  })

  it('omits the diagram section when there is no diagram', () => {
    const noDiagram: Feature = { ...feature, diagram: undefined }
    render(<FeaturePage feature={noDiagram} />)
    expect(screen.queryByText('The traceability chain.')).not.toBeInTheDocument()
  })

  it('links to previous and next features when provided', () => {
    render(<FeaturePage feature={feature} prev={prev} next={next} />)

    const prevLink = screen.getByRole('link', { name: /Intro/ })
    const nextLink = screen.getByRole('link', { name: /Request import/ })
    expect(prevLink).toHaveAttribute('href', '/features/intro')
    expect(nextLink).toHaveAttribute('href', '/features/import')
  })

  it('omits prev/next links when not provided', () => {
    render(<FeaturePage feature={feature} />)
    expect(screen.queryByRole('link', { name: /Intro/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Request import/ })).not.toBeInTheDocument()
  })
})
