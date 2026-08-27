import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { AboutPane } from '@/features/demo/ui/screens/settings/panes/AboutPane'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { APP_NAME, APP_VERSION } from '@/features/demo/engine/content/app-info'
import { colors } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing } from '@/features/demo/ui/tokens/scale'

/**
 * U6.2 — matrix B.7 row 93 against phone `src/features/settings/components/AboutSection.tsx`
 * at `dd5551ec`. The BEHAVIOUR of this pane (the mailto, the printed address, the injected
 * clock, the demo-specific Platform/Build rows) is pinned in `panes.test.tsx` and untouched;
 * this file is its recipe.
 */

describe('AboutPane — the phone’s AboutSection recipe', () => {
  it('sizes the app-icon chip at the phone’s 80 square, radius.xl', () => {
    render(<AboutPane />)
    const chip = screen.getByText(APP_NAME).previousElementSibling as HTMLElement
    expect(chip).toHaveStyle({ width: '80px', height: '80px', borderRadius: `${radius.xl}px` })
  })

  it('paints the chip glyph in onPrimary, not a bare white', () => {
    // A19: a glyph on a filled primary surface takes `onPrimary`. Same value today, but a
    // literal is invisible to the scheme flip.
    render(<AboutPane />)
    const glyph = (screen.getByText(APP_NAME).previousElementSibling as HTMLElement)
      .querySelector('svg') as SVGElement
    expect(glyph.getAttribute('stroke')).toBe(colors.onPrimary)
  })

  it('sets the app name at fontSize[2xl] and the version at fontSize.base', () => {
    render(<AboutPane />)
    expect(screen.getByText(APP_NAME)).toHaveStyle({ fontSize: '24px', fontWeight: '700' })
    expect(screen.getByText(`Version ${APP_VERSION}`)).toHaveStyle({
      fontSize: '16px',
      color: colors.textSecondary,
    })
  })

  it('sets both info-row halves at fontSize.sm, label secondary and value text', () => {
    render(<AboutPane />)
    expect(screen.getByText('Platform:')).toHaveStyle({
      fontSize: '14px',
      fontWeight: '500',
      color: colors.textSecondary,
    })
    expect(screen.getByText('Web (browser)')).toHaveStyle({
      fontSize: '14px',
      fontWeight: '600',
      color: colors.text,
    })
  })

  it('sets the description at fontSize.sm on the phone’s absolute 28px line', () => {
    render(<AboutPane />)
    expect(screen.getByText(/A professional tool for law enforcement/)).toHaveStyle({
      fontSize: '14px',
      lineHeight: '28px',
      color: colors.textSecondary,
    })
  })

  it('builds Contact Support from the shared outline recipe, not a hand-rolled border', () => {
    // A66's last settings site. The phone wraps this row in `<Button variant="outline"
    // fullWidth>` and mirrors the recipe on the children by hand, because `Button` renders
    // non-string children verbatim (DEF-UI-018's PR #123 closure).
    render(<AboutPane />)
    const link = screen.getByTestId('about-contact-support')
    const recipe = buttonStyle({ variant: 'outline' })
    expect(link).toHaveStyle({
      borderRadius: `${recipe.borderRadius}px`,
      borderTopColor: recipe.borderTopColor as string,
      color: recipe.color as string,
      width: '100%',
      justifyContent: 'flex-start',
      gap: `${spacing.sm}px`,
    })
  })

  it('tints the mail glyph and the label link, and leaves the chevron on the secondary tone', () => {
    // The phone's ruling verbatim (`AboutSection.tsx:101-103`): the trailing chevron is "a
    // decorative affordance rather than the label" and stays `textSecondary`. The demo had it
    // on `textTertiary` and both the glyph and the label on the saturated `primary`.
    render(<AboutPane />)
    const link = screen.getByTestId('about-contact-support')
    const svgs = link.querySelectorAll('svg')
    expect(svgs[0].getAttribute('stroke')).toBe(colors.link)
    expect(svgs[0].getAttribute('width')).toBe(String(iconSize.sm))
    expect(svgs[1].getAttribute('stroke')).toBe(colors.textSecondary)
    expect(screen.getByText('Contact Support')).toHaveStyle({ fontSize: '16px', fontWeight: '500' })
  })

  it('sets the copyright lines at fontSize.xs in textTertiary', () => {
    // `#46607e` was on no ramp in this palette at all, which is why row 93 names it.
    render(<AboutPane />)
    expect(screen.getByText('All rights reserved')).toHaveStyle({
      fontSize: '12px',
      color: colors.textTertiary,
    })
  })
})
