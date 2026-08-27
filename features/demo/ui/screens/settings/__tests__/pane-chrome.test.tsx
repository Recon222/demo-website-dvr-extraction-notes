import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { PaneDescription, PaneGroup } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * U6.2 — the settings pane chrome against the phone's `*SettingsSection` stylesheet
 * (`MediaCaptureSettingsSection.tsx:378-424`, the copy every other section repeats).
 *
 * Every colour assertion reads a TOKEN, never a hex: a literal would stay green through exactly
 * the re-point these pins exist to catch (the `status-owners.test.tsx` precedent). Every size
 * assertion is a number the phone spells, so a "tidy" back to the demo's old off-ladder value
 * reds here rather than on a screenshot.
 */

describe('PaneDescription (phone `styles.description`)', () => {
  it('renders at fontSize.sm on the phone’s absolute 28px line, in textSecondary', () => {
    render(<PaneDescription>Configure photo and video capture quality.</PaneDescription>)
    const p = screen.getByText('Configure photo and video capture quality.')
    expect(p).toHaveStyle({ fontSize: '14px', lineHeight: '28px', color: colors.textSecondary })
  })

  it('carries BOTH of the phone’s gaps — its own marginBottom plus the container’s', () => {
    // `description.marginBottom` is spacing.sm (8) and the section container adds
    // `gap: spacing.lg` (24) between every child. 8 alone (the demo's old 18, or a "fix" to 8)
    // puts the first setting group two thirds of the way too close.
    render(<PaneDescription>Body</PaneDescription>)
    expect(screen.getByText('Body')).toHaveStyle({ marginBottom: `${spacing.sm + spacing.lg}px` })
  })
})

describe('PaneGroup (phone `settingGroup` / `settingHeader` / `settingLabel` / `settingHelp`)', () => {
  const renderGroup = () =>
    render(
      <PaneGroup label="Photo Quality" value="90%" help="JPEG compression quality.">
        <button type="button">control</button>
      </PaneGroup>,
    )

  it('labels at fontSize.base / semibold / colors.text', () => {
    renderGroup()
    expect(screen.getByText('Photo Quality')).toHaveStyle({
      fontSize: '16px',
      fontWeight: '600',
      color: colors.text,
    })
  })

  it('renders the live value at fontSize.base / bold / colors.primary', () => {
    // The phone spends `colors.primary` here and only here in the section (`:166`); it is the
    // one place in a pane where the accent is a NUMERAL rather than prose.
    renderGroup()
    expect(screen.getByText('90%')).toHaveStyle({
      fontSize: '16px',
      fontWeight: '700',
      color: colors.primary,
    })
  })

  it('sets the help line at fontSize.sm on a 21px line — and in textSecondary, NOT textTertiary', () => {
    // D5's rider: do not ADD text to `textTertiary` (the documented M2(b) 4.23:1 ceiling). The
    // phone's `settingHelp` is `colors.textSecondary` at every one of its call sites; the demo
    // had eight lines on the ceiling token. The negative is the half that catches a revert.
    renderGroup()
    const help = screen.getByText('JPEG compression quality.')
    expect(help).toHaveStyle({ fontSize: '14px', lineHeight: '21px', color: colors.textSecondary })
    expect(help).not.toHaveStyle({ color: colors.textTertiary })
  })

  it('spaces its children with the phone’s settingGroup gap, not per-child margins', () => {
    // gap xs (4) between the label row and the help; the help's own marginBottom xs adds to it
    // for the 8 the phone puts before the control. A package that re-spells these as margins
    // gets the same picture today and drifts on the first inserted child.
    renderGroup()
    const group = screen.getByRole('group', { name: 'Photo Quality' })
    expect(group).toHaveStyle({ display: 'flex', flexDirection: 'column', gap: `${spacing.xs}px` })
    expect(screen.getByText('JPEG compression quality.')).toHaveStyle({ marginBottom: `${spacing.xs}px` })
  })

  it('carries the section container’s lg gap as its own bottom margin', () => {
    renderGroup()
    expect(screen.getByRole('group', { name: 'Photo Quality' })).toHaveStyle({
      marginBottom: `${spacing.lg}px`,
    })
  })

  it('leaves the header row on space-between alone — the phone has no gap there', () => {
    // A demo-only gap moves the value the moment the label wraps, which is the case a 378px
    // frame reaches first.
    renderGroup()
    const header = screen.getByText('Photo Quality').parentElement as HTMLElement
    expect(header).toHaveStyle({ justifyContent: 'space-between' })
    expect(header.style.gap).toBe('')
  })
})
