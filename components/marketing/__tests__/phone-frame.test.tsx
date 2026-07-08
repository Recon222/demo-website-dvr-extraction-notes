import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MarketingPhoneFrame } from '@/components/marketing/phone-frame'

describe('MarketingPhoneFrame', () => {
  it('renders the corner-bracket label chip', () => {
    render(
      <MarketingPhoneFrame scale={0.62} label="REC 01 — CASES">
        <div>screen content</div>
      </MarketingPhoneFrame>,
    )
    expect(screen.getByText('REC 01 — CASES')).toBeInTheDocument()
  })

  it('renders children in the screen slot', () => {
    render(
      <MarketingPhoneFrame scale={0.62} label="LIVE CAPTURE · 378×786">
        <div data-testid="loop">video goes here</div>
      </MarketingPhoneFrame>,
    )
    expect(screen.getByTestId('loop')).toBeInTheDocument()
  })

  it('applies the given fixed scale transform (hero 0.78, rows 0.62)', () => {
    const { container } = render(
      <MarketingPhoneFrame scale={0.78} label="L">
        <div />
      </MarketingPhoneFrame>,
    )
    expect(container.innerHTML).toContain('scale(0.78)')
  })

  it('sizes the wrapper box to the scaled device footprint at BOTH shipped scales', () => {
    // Ceil contract: 404×812 at 0.62 → the design's hand-picked 251×504 row box;
    // at 0.78 (the hero) → 316×634 (1px over the canvas's 315×633 — transparent,
    // un-clipped, never under-fits; see the component's rationale comment).
    const rows = render(
      <MarketingPhoneFrame scale={0.62} label="L">
        <div />
      </MarketingPhoneFrame>,
    )
    expect(rows.container.innerHTML).toContain('width: 251px')
    expect(rows.container.innerHTML).toContain('height: 504px')

    const hero = render(
      <MarketingPhoneFrame scale={0.78} label="L">
        <div />
      </MarketingPhoneFrame>,
    )
    expect(hero.container.innerHTML).toContain('width: 316px')
    expect(hero.container.innerHTML).toContain('height: 634px')
  })

  it('never imports from @/features/demo (bundle isolation — CRITICAL)', () => {
    // The demo barrel transitively pulls mapbox-gl/pdfjs-dist/motion; one import
    // here would ship them to every marketing page. Pixel constants are COPIED.
    // Guard covers every import form: static `from '…'`, dynamic `import('…')`
    // (the in-repo idiom — see app/demo/page.tsx), and `require('…')`.
    for (const file of ['phone-frame.tsx', 'corner-brackets.tsx']) {
      const source = readFileSync(
        join(process.cwd(), 'components', 'marketing', file),
        'utf8',
      )
      expect(source, `${file} must not import features/demo`).not.toMatch(
        /(from\s+|import\(\s*|require\(\s*)['"][^'"]*features\/demo/,
      )
    }
  })
})
