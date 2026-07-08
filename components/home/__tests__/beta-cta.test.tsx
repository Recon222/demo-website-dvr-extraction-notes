import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BetaCta } from '@/components/home/beta-cta'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('BetaCta (Case-File)', () => {
  it('renders the exhibit tab and the panel heading', () => {
    render(<BetaCta />)
    expect(screen.getByText('EXHIBIT A — YOUR NEXT SCENE')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Be first to run it in the field' }),
    ).toBeInTheDocument()
  })

  it('renders the WORKING intake form (Slice 12: BetaForm replaced the placeholder)', () => {
    render(<BetaCta />)
    // The M-D M4 assertions inverted by design: real controls now exist.
    expect(screen.getByRole('textbox', { name: /email/i })).toHaveAttribute(
      'placeholder',
      'name@agency.gov',
    )
    expect(screen.getByRole('button', { name: 'Request invite' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeRequired()
  })

  it('renders the trust microcopy', () => {
    render(<BetaCta />)
    expect(screen.getByText('IOS 26+ · TESTFLIGHT · UNSUBSCRIBE ANYTIME')).toBeInTheDocument()
  })
})
