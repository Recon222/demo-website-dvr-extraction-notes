import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Banner } from '@/features/demo/ui/controls/Banner'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneSlider,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

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

describe('PaneNote IS Banner’s recipe — the drift guard for a ruled duplication', () => {
  /**
   * `PaneNote` draws the phone's settings note itself instead of importing `<Banner>`, because
   * `<Banner>` is hard-wired to `role="alert"` with no `id` and swapping the panes' live-region
   * semantics is a BEHAVIOUR change plan §2's D20 carve-out does not grant U6.2 (the full
   * ruling is in `_pane-chrome.tsx`'s `PaneNote` docblock and the U6.2 report).
   *
   * A duplication that nobody watches drifts, so this watches it. Every phone settings caller
   * passes `<Banner style={styles.note}>` and `styles.note` is a lone
   * `marginTop: Layout.spacing.xs` — so a Banner spelled that way and a PaneNote must be the
   * SAME PICTURE, key for key. If this reds, the two have diverged and one of them is wrong;
   * the cheapest repair may well be to delete `PaneNote` and take the deferral.
   */
  const declared = (el: Element): Record<string, string> => {
    const style = (el as HTMLElement).style
    const out: Record<string, string> = {}
    for (let i = 0; i < style.length; i++) out[style[i]] = style.getPropertyValue(style[i])
    return out
  }

  it('paints the box exactly as `<Banner style={styles.note}>` does', () => {
    const { container: bannerHost } = render(
      <Banner severity="warning" message="Body" style={{ marginTop: spacing.xs }} />,
    )
    const banner = bannerHost.firstElementChild as HTMLElement

    const { container: noteHost } = render(<PaneNote tone="warning">Body</PaneNote>)
    const note = noteHost.firstElementChild as HTMLElement

    expect(declared(note)).toEqual(declared(banner))
  })

  it('sets the message on Banner’s own `messageStyle`', () => {
    const { container: bannerHost } = render(<Banner severity="info" message="Body" />)
    const { container: noteHost } = render(<PaneNote tone="info">Body</PaneNote>)
    expect(declared(noteHost.firstElementChild!.lastElementChild!)).toEqual(
      declared(bannerHost.firstElementChild!.lastElementChild!),
    )
  })

  it('draws the SAME severity glyph, because it imports Banner’s', () => {
    // Two hand-drawn icon tables for one severity set is the drift this import exists to stop.
    for (const severity of ['info', 'warning', 'success'] as const) {
      const { container: bannerHost, unmount: a } = render(<Banner severity={severity} message="Body" />)
      const { container: noteHost, unmount: b } = render(<PaneNote tone={severity}>Body</PaneNote>)
      expect(noteHost.querySelector('svg')?.innerHTML).toBe(bannerHost.querySelector('svg')?.innerHTML)
      a()
      b()
    }
  })

  it('keeps the semantics Banner cannot give it — an id target and an optional polite role', () => {
    // The two facts the ruling turns on. `<Banner>` renders neither: no `id` prop, and
    // `role="alert"` is unconditional.
    render(
      <PaneNote tone="info" id="why" role="status">
        Body
      </PaneNote>,
    )
    const note = document.getElementById('why')
    expect(note, 'the aria-describedby target R-6 added').not.toBeNull()
    expect(note).toHaveAttribute('role', 'status')
    expect(note).not.toHaveAttribute('aria-live')
  })

  it('stays out of the live-region business when no role is asked for (R-34)', () => {
    render(<PaneNote tone="warning">Body</PaneNote>)
    const note = screen.getByText('Body').parentElement as HTMLElement
    expect(note).not.toHaveAttribute('role')
    expect(note).not.toHaveAttribute('aria-live')
  })
})

describe('PaneSlider (phone `styles.slider` / `sliderLabels` / `sliderLabel`)', () => {
  const renderSlider = () =>
    render(
      <PaneSlider
        label="Photo Quality"
        testId="q"
        value={0.9}
        valueText="90%"
        min={0.5}
        max={1}
        step={0.05}
        onChange={() => {}}
        minLabel="50% (Smallest)"
        maxLabel="100% (Best)"
      />,
    )

  it('takes the phone’s track height and paints the fill + thumb from colors.primary', () => {
    // `accentColor` is `minimumTrackTintColor` + `thumbTintColor` in one property. The phone's
    // third tint (`maximumTrackTintColor`) needs a pseudo-element and is a recorded divergence.
    renderSlider()
    expect(screen.getByTestId('q')).toHaveStyle({
      width: '100%',
      height: '40px',
      accentColor: colors.primary,
    })
  })

  it('sets the min/max captions at fontSize.xs in textTertiary — the phone’s own token here', () => {
    // textTertiary is right at THIS site and wrong on the help line above it: the phone spends
    // `sliderLabel: colors.textTertiary` (`:186-187`) and `settingHelp: colors.textSecondary`.
    renderSlider()
    const captions = screen.getByText('50% (Smallest)').parentElement as HTMLElement
    expect(captions).toHaveStyle({
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: colors.textTertiary,
    })
  })
})

describe('PaneStubNote (demo-only, D12’s "follow" arm)', () => {
  it('derives its wash from colors.primary instead of spelling the alpha', () => {
    render(<PaneStubNote>Body</PaneStubNote>)
    expect(screen.getByTestId('settings-pane-stub-note')).toHaveStyle({
      backgroundColor: withAlpha(colors.primary, 0.08),
    })
  })

  it('puts its eyebrow on textTertiary', () => {
    render(<PaneStubNote>Body</PaneStubNote>)
    expect(screen.getByText('In the demo')).toHaveStyle({ color: colors.textTertiary })
  })
})
