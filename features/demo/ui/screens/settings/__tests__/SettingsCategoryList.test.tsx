import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { DEMO_VERSION_LINE } from '@/features/demo/engine/content/app-info'
import { SettingsCategoryList } from '@/features/demo/ui/screens/settings/SettingsCategoryList'
import type { SettingsSectionView } from '@/features/demo/ui/screens/settings/settingsData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * U6.2 — matrix A78 (the canonical settings LIST-ROW, phone `SettingsCategoryRow.tsx`) and A79
 * (the group card, phone `SettingsCategoryList.tsx`).
 *
 * Colours assert against TOKENS, sizes against the numbers the phone spells. The chip's two
 * alphas are asserted through `withAlpha` for the same reason: a literal would stay green
 * through the `primary` re-base these pins exist to survive.
 */

const SECTIONS: readonly SettingsSectionView[] = [
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'appearance', title: 'Appearance', icon: 'contrast-outline', preview: 'Dark', requiresAuth: false },
      { id: 'security', title: 'Security', icon: 'shield-checkmark-outline', preview: null, requiresAuth: true },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [{ id: 'about', title: 'About', icon: 'information-circle-outline', preview: null, requiresAuth: false }],
  },
]

const renderList = () => {
  const onSelect = vi.fn()
  render(<SettingsCategoryList sections={SECTIONS} onSelect={onSelect} />)
  return { onSelect }
}

const row = (id: string) => screen.getByTestId(`settings-row-${id}`)

describe('A78 — the row', () => {
  it('takes the phone’s spacing.md gap and horizontal padding, at touchTarget.large', () => {
    // Both were 14 — off the scale entirely, and the gap is one of the two terms
    // SEPARATOR_INSET is derived from.
    renderList()
    expect(row('appearance')).toHaveStyle({
      gap: `${spacing.md}px`,
      padding: `0 ${spacing.md}px`,
      minHeight: `${touchTarget.large}px`,
    })
  })

  it('titles at fontSize.base / medium / colors.text', () => {
    renderList()
    expect(screen.getByText('Appearance')).toHaveStyle({
      fontSize: '16px',
      fontWeight: '500',
      letterSpacing: '0.1px',
      color: colors.text,
    })
  })

  it('previews at fontSize.sm in textSecondary, and truncates rather than pushing the chevron out', () => {
    // NOT pinned here: the phone's `preview.flexShrink: 1`. A mutation probe deleting it
    // SURVIVED, and correctly — `flex-shrink: 1` is the CSS INITIAL value (RN's default is 0,
    // which is the only reason the phone has to write it), so nothing observable changes. The
    // declaration stays in the source for key-for-key parity; asserting it would be a
    // change-detector. What IS load-bearing is the truncation, which is asserted instead.
    renderList()
    const preview = screen.getByTestId('settings-preview-appearance')
    expect(preview).toHaveStyle({ fontSize: '14px', color: colors.textSecondary })
    expect(preview).toHaveStyle({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
  })

  it('paints the icon chip at radius.control on the phone’s two primary alphas', () => {
    // The border was `GLASS.borderAccent` — the ELEVATED tier's 0.25 — so a chip inside a card
    // was tinted by a surface tier it is not part of. The phone derives both from `primary`.
    renderList()
    const chip = document.querySelector('[data-settings-glyph="contrast-outline"]')!
      .parentElement as HTMLElement
    expect(chip).toHaveStyle({
      borderRadius: `${radius.control}px`,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: withAlpha(colors.primary, 0.22),
      background: withAlpha(colors.primary, 0.18),
      color: colors.primary,
    })
  })

  it('draws the glyph at the phone’s 19px', () => {
    renderList()
    const glyph = document.querySelector('[data-settings-glyph="contrast-outline"]') as SVGElement
    expect(glyph.getAttribute('width')).toBe('19')
  })

  it('puts the padlock and the chevron on textTertiary, both at the phone’s sizes', () => {
    renderList()
    const lock = screen.getByTestId('settings-lock-security')
    expect(lock.getAttribute('stroke')).toBe(colors.textTertiary)
    expect(lock.getAttribute('width')).toBe('13')
    const trailing = lock.parentElement as HTMLElement
    const chevron = trailing.querySelector('svg:last-child') as SVGElement
    expect(chevron.getAttribute('stroke')).toBe(colors.textTertiary)
    expect(chevron.getAttribute('width')).toBe('17')
  })

  it('insets the separator at 58 — chip 36 + gap 16 + row padding, re-derived', () => {
    // The 64 it replaces was the same arithmetic at the old gap of 14. A78 calls this out by
    // name: it is derived, so it moves when either term moves. Read off the rendered hairline
    // rather than the const, so a decorative re-spelling cannot pass.
    renderList()
    const separator = row('appearance').querySelector('span[aria-hidden="true"]:last-child') as HTMLElement
    expect(separator).toHaveStyle({ left: '58px', background: colors.border })
  })

  it('hangs no separator off the last row in a group', () => {
    renderList()
    expect(row('about').querySelector('span[aria-hidden="true"]:last-child')).toBeNull()
  })

  it('washes on press with link@0.06, and clears on every release path', () => {
    // The phone gets this from `Pressable`; the web equivalent (`:active`) needs a stylesheet
    // the demo forbids, so it is React state — which is also the only form a test can read.
    const { onSelect } = renderList()
    const target = row('appearance')
    expect(target.style.background).toBe('transparent')

    for (const release of ['pointerUp', 'pointerLeave', 'pointerCancel'] as const) {
      fireEvent.pointerDown(target)
      expect(target).toHaveStyle({ background: withAlpha(colors.link, 0.06) })
      fireEvent[release](target)
      expect(target.style.background, `not cleared by ${release}`).toBe('transparent')
    }
    // And it is still a button first: the wash must not have eaten the activation.
    fireEvent.click(target)
    expect(onSelect).toHaveBeenCalledWith('appearance')
  })
})

describe('A79 — the group card and its chrome', () => {
  it('sets the section label at fontSize.xs in textSecondary', () => {
    // The demo's 11.5 was below the phone's pre-campaign 12.5 AND below its new 12; and the
    // colour was `textTertiary`, one step darker than the phone's.
    renderList()
    expect(screen.getByText('System')).toHaveStyle({
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      padding: '0 4px 8px',
      color: colors.textSecondary,
    })
  })

  it('spaces the groups at spacing.lg', () => {
    renderList()
    expect(screen.getByText('System').parentElement).toHaveStyle({ marginBottom: `${spacing.lg}px` })
  })

  it('scrolls on the phone’s content padding, with room under the last card', () => {
    // `content: { padding: spacing.md, paddingBottom: spacing.xxl }` — without the second the
    // footer line sits hard against the bottom of the sheet.
    renderList()
    const scroller = screen.getByText('System').parentElement!.parentElement as HTMLElement
    // Per side: the source spells four longhands (a `padding` shorthand beside its own
    // `paddingBottom` trips React's conflicting-property warning, which vitest.setup makes a
    // failure) and jsdom would collapse the pair back to one shorthand string anyway.
    expect(scroller).toHaveStyle({
      paddingTop: `${spacing.md}px`,
      paddingRight: `${spacing.md}px`,
      paddingBottom: `${spacing.xxl}px`,
      paddingLeft: `${spacing.md}px`,
    })
  })

  it('sets the footer version line at fontSize.xs in textTertiary', () => {
    renderList()
    const footer = screen.getByText(DEMO_VERSION_LINE) as HTMLElement
    expect(footer).toHaveStyle({ fontSize: '12px', color: colors.textTertiary, paddingTop: `${spacing.xs}px` })
  })
})

describe('the version line is ONE colour across the two chromes that render it', () => {
  it('the drawer footer and the settings footer agree', async () => {
    // `DEMO_VERSION_LINE` renders in exactly two places (`app-info.ts`'s two readers). Both
    // were `#46607e`; matrix rows 83 and 93 send that value — which is on no ramp in this
    // palette — to `textTertiary`. Sweeping only the settings one would ship the same string
    // in two colours, so this asserts the pair rather than the site.
    const { WizardDrawer } = await import('@/features/demo/ui/controls/WizardDrawer')
    renderList()
    const settingsFooter = screen.getByText(DEMO_VERSION_LINE)
    expect(settingsFooter).toHaveStyle({ color: colors.textTertiary })

    render(
      <WizardDrawer
        open
        items={[]}
        mediaTools={{ mediaCapture: false, audioRecording: false }}
        saveStatus={null}
        onCaptureMedia={vi.fn()}
        onRecordAudio={vi.fn()}
        onOpenMediaLibrary={vi.fn()}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
        onBackToCases={vi.fn()}
      />,
    )
    const drawerFooter = screen.getAllByText(DEMO_VERSION_LINE).find((el) => el !== settingsFooter)!
    expect(drawerFooter).toHaveStyle({ color: colors.textTertiary })
  })
})
