import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BetaPageView } from '@/components/beta/beta-page-view'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('BetaPageView — the two-phase beta page', () => {
  it('renders Phase A (intake) when no TestFlight URL is set', () => {
    render(<BetaPageView testflightUrl={null} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Be first in the field.' })).toBeInTheDocument()
    expect(screen.getByText('INTAKE FORM — 60 SECONDS')).toBeInTheDocument()
    expect(screen.getByText(/AWAITING FIRST BUILD/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Request invite' })).toBeInTheDocument()
    // No TestFlight affordance in Phase A
    expect(screen.queryByText('LINK ACTIVE')).toBeNull()
    expect(screen.queryByRole('link', { name: /Join the TestFlight beta/ })).toBeNull()
  })

  it('renders Phase B (live link) when the TestFlight URL is set, keeping email capture secondary', () => {
    const url = 'https://testflight.apple.com/join/TESTCODE'
    render(<BetaPageView testflightUrl={url} />)
    expect(screen.getByText('LINK ACTIVE')).toBeInTheDocument()
    expect(screen.getByText(/APPROVED FOR EXTERNAL TESTING/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Join the TestFlight beta/ })).toHaveAttribute(
      'href',
      url,
    )
    expect(screen.getByText(/SEATS ARE CAPPED BY APPLE AT 10,000/)).toBeInTheDocument()
    // secondary email capture still available
    expect(screen.getByRole('link', { name: /email me about updates instead/i })).toHaveAttribute(
      'href',
      '#invite-form',
    )
    expect(screen.getByRole('button', { name: 'Request invite' })).toBeInTheDocument()
    // Phase A framing is gone
    expect(screen.queryByText('INTAKE FORM — 60 SECONDS')).toBeNull()
  })

  it('renders the three WHAT HAPPENS NEXT cards in both phases', () => {
    render(<BetaPageView testflightUrl={null} />)
    for (const title of [
      'You leave an email',
      'A build clears TestFlight review',
      'You run it in the field',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })
})
