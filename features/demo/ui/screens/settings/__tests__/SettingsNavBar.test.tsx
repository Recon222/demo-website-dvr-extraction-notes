import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SettingsNavBar } from '@/features/demo/ui/screens/settings/SettingsNavBar'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * U6.2 — matrix row 82 / A37 / A48 / A60 against phone
 * `src/features/settings/components/SettingsNavBar.tsx` at `dd5551ec`.
 *
 * The bar reads the ELEVATED tier, not `header` — phone `:43`,
 * `GlassColors[colorScheme ?? 'light'].elevated`. That correction is already recorded in
 * HANDOFF §4's plan-corrections list; these pins are what hold it.
 */

const master = () => render(<SettingsNavBar variant="master" onClose={vi.fn()} />)
const detail = () =>
  render(<SettingsNavBar variant="detail" title="Export Security" titleId="t" onBack={vi.fn()} />)

const bar = () => screen.getByTestId('settings-close-button').parentElement as HTMLElement

describe('the bar itself', () => {
  it('is genuinely OPAQUE — the ground under the gradient, not the gradient alone', () => {
    // The component's own docblock says list content must not bleed through as it scrolls
    // under; the elevated stops are rgba(…,0.88)/(…,0.95), so the gradient alone did not
    // deliver that. The phone paints `colors.background` and lays the gradient over it.
    master()
    expect(bar()).toHaveStyle({
      backgroundColor: colors.background,
      backgroundImage: GLASS.gradientPanel,
    })
    // Two longhands and no `background:` shorthand beside them — React's conflicting-property
    // warning is a repo-wide test failure.
    expect(bar().getAttribute('style')).not.toMatch(/(^|;)\s*background:/)
  })

  it('draws its hairline from the ELEVATED tier, not the flat border token', () => {
    master()
    expect(bar()).toHaveStyle({ borderBottom: `1px solid ${GLASS_TIER[scheme].elevated.border}` })
    expect(bar()).not.toHaveStyle({ borderBottom: `1px solid ${colors.border}` })
  })

  it('takes the phone’s row padding — spacing.sm vertical, spacing.md horizontal', () => {
    master()
    expect(bar()).toHaveStyle({ padding: `${spacing.sm}px ${spacing.md}px`, minHeight: '52px' })
  })
})

describe('master variant', () => {
  it('titles at fontSize[2xl] / bold / colors.text', () => {
    master()
    expect(screen.getByText('Settings')).toHaveStyle({
      fontSize: '24px',
      fontWeight: '700',
      letterSpacing: '0.2px',
      color: colors.text,
    })
  })

  it('draws the gear at 22 in colors.primary', () => {
    master()
    const gear = bar().querySelector('svg') as SVGElement
    expect(gear.getAttribute('width')).toBe('22')
    expect(gear.getAttribute('stroke')).toBe(colors.primary)
  })

  it('washes the close chip off colors.text, never a bare white — and pills it at radius.full', () => {
    // Phone `:74`: a NEUTRAL wash off the foreground, so it flips with the scheme. The demo
    // carried the white-on-dark literal that comment describes replacing.
    master()
    const close = screen.getByTestId('settings-close-button')
    expect(close).toHaveStyle({
      width: '30px',
      height: '30px',
      borderRadius: `${radius.full}px`,
      background: withAlpha(colors.text, 0.06),
    })
    const glyph = close.querySelector('svg') as SVGElement
    expect(glyph.getAttribute('width')).toBe('20')
    expect(glyph.getAttribute('stroke')).toBe(colors.textSecondary)
  })
})

describe('detail variant', () => {
  it('titles at fontSize.lg / semibold / colors.text', () => {
    detail()
    expect(screen.getByText('Export Security')).toHaveStyle({
      fontSize: '18px',
      fontWeight: '600',
      color: colors.text,
    })
  })

  it('sets the back label at fontSize.lg / medium', () => {
    detail()
    expect(screen.getByText('Settings')).toHaveStyle({ fontSize: '18px', fontWeight: '500' })
  })

  it('tints the back chevron and label from colors.link — one token, both parts', () => {
    // The DELIBERATE divergence (matrix row 82, plan §5): the phone paints `colors.primary`
    // here, which measures 2.91:1 on this bar's own ground at 18px/500 — normal-size text, so
    // the floor is 4.5. `link` measures 7.10. The phone's own audit flagged the line
    // (00-UI-CONSISTENCY-AUDIT.md:580) and DEF-UI-018's closure did not reach it.
    //
    // Both parts, asserted together: a fork between the chevron and the label is exactly the
    // 2.5x-gap-on-one-control defect DEF-UI-018's round-2 finding describes.
    detail()
    const back = screen.getByTestId('settings-back-button')
    expect((back.querySelector('svg') as SVGElement).getAttribute('stroke')).toBe(colors.link)
    expect(screen.getByText('Settings')).toHaveStyle({ color: colors.link })
    expect(screen.getByText('Settings')).not.toHaveStyle({ color: colors.primary })
  })

  it('draws the back chevron at the phone’s 24', () => {
    detail()
    const chevron = screen.getByTestId('settings-back-button').querySelector('svg') as SVGElement
    expect(chevron.getAttribute('width')).toBe('24')
  })

  it('centres the title on the WHOLE bar, so the 92px spacer cannot pull it off centre', () => {
    // The plan warns that `width: 92` is hand-balanced and must be retuned when the back
    // label's type size moves (16 -> 18 here). It does not: the title's container is
    // absolutely positioned over the bar, which is also how the phone's `centerTitle`
    // (`absoluteFillObject`) works. This pin is what makes that claim checkable.
    detail()
    const centre = screen.getByText('Export Security').parentElement as HTMLElement
    expect(centre).toHaveStyle({
      position: 'absolute',
      inset: '0px',
      justifyContent: 'center',
      pointerEvents: 'none',
    })
  })
})
