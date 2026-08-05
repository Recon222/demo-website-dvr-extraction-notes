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
      screen.getByText('BUILT ON EXPERIENCE — 15 YEARS · 1,500+ EXTRACTIONS'),
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

  // The cred strip was removed (owner decision): it restated the eyebrow chip, and its
  // third cell published a per-scene time saving that is NOT confirmed for publication.
  // This replaces the old three-cell test — it pins the removal so the unverified claim
  // cannot quietly return, which is the invariant that actually matters now.
  it('publishes no unconfirmed per-scene time-saving claim', () => {
    render(<Hero />)
    expect(screen.queryByText(/10 min/)).not.toBeInTheDocument()
    expect(screen.queryByText(/PER-SCENE PAPERWORK/)).not.toBeInTheDocument()
  })

  it('keeps the confirmed credentials, carried by the eyebrow chip alone', () => {
    render(<Hero />)
    // Confirmed and publishable (PRODUCT.md §Evidence on Hand) — but stated ONCE.
    expect(screen.getByText(/15 YEARS · 1,500\+ EXTRACTIONS/)).toBeInTheDocument()
    expect(screen.queryByText('15 yrs')).not.toBeInTheDocument()
    expect(screen.queryByText('1,500+')).not.toBeInTheDocument()
  })

  it('renders the hero phone with the live-capture label', () => {
    render(<Hero />)
    expect(screen.getByText('LIVE PHONE CAPTURE')).toBeInTheDocument()
  })
})
