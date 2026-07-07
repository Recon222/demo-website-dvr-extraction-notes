import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BetaCta } from '@/components/home/beta-cta'

describe('BetaCta (Case-File)', () => {
  it('renders the exhibit tab and the panel heading', () => {
    render(<BetaCta />)
    expect(screen.getByText('EXHIBIT A — YOUR NEXT SCENE')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Be first to run it in the field' }),
    ).toBeInTheDocument()
  })

  it('renders the intake affordance (static until the BetaForm lands in Slice 12)', () => {
    render(<BetaCta />)
    // ponytail: a non-functional visual placeholder per the plan — Slice 12 swaps
    // in the working <BetaForm/> and this test evolves with it.
    expect(screen.getByText('name@agency.gov')).toBeInTheDocument()
    expect(screen.getByText('Request invite')).toBeInTheDocument()
    // The placeholder must not masquerade as interactive: no real form controls
    // until the working form exists (a11y — nothing focusable that does nothing).
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders the trust microcopy', () => {
    render(<BetaCta />)
    expect(screen.getByText('IOS 26+ · TESTFLIGHT · UNSUBSCRIBE ANYTIME')).toBeInTheDocument()
  })
})
