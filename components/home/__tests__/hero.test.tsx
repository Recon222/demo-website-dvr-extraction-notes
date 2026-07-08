import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '@/components/home/hero'
import { siteConfig } from '@/lib/site-config'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('Hero (Case-File)', () => {
  it('renders the tagline as the H1', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', { level: 1, name: siteConfig.tagline }),
    ).toBeInTheDocument()
  })

  it('renders the bench-credential eyebrow chip', () => {
    render(<Hero />)
    expect(
      screen.getByText('BUILT ON THE BENCH — 15 YEARS · 1,500+ EXTRACTIONS'),
    ).toBeInTheDocument()
  })

  it('renders the gold beta CTA and the ghost demo CTA', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /Join the TestFlight beta/ })).toHaveAttribute(
      'href',
      '/beta',
    )
    expect(screen.getByRole('link', { name: 'Drive the live demo' })).toHaveAttribute(
      'href',
      '/demo',
    )
  })

  it('renders the three-cell cred strip with the gold paperwork stat', () => {
    render(<Hero />)
    expect(screen.getByText('15 yrs')).toBeInTheDocument()
    expect(screen.getByText('1,500+')).toBeInTheDocument()
    expect(screen.getByText('PER-SCENE PAPERWORK')).toBeInTheDocument()
    // The design invariant this test is NAMED for: gold on the marquee stat only.
    expect(screen.getByText('10 min → <5')).toHaveClass('text-gold')
    expect(screen.getByText('15 yrs')).not.toHaveClass('text-gold')
    expect(screen.getByText('1,500+')).not.toHaveClass('text-gold')
  })

  it('renders the hero phone with the live-capture label', () => {
    render(<Hero />)
    expect(screen.getByText('LIVE CAPTURE · 378×786')).toBeInTheDocument()
  })
})
