import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { PaneNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'
import { severityTone } from '@/features/demo/ui/tokens/status'

/**
 * A69 retires EIGHT status-colour owners. Six are covered where they render — the two `screenData`
 * lookups and the pill in `DashboardScreen.test.tsx` / `ExportHub.test.tsx`, the artifact line in
 * `ExportHub.test.tsx`, and the recorder's two in `AudioRecorderScreen.test.tsx`. The remaining
 * two paint recipes of their own and had no render test at all; this is theirs.
 *
 * F31: this used to name `audio-levels.test.ts` for the recorder. That file covers the TONE — the
 * `'error' | 'warning' | 'neutral'` vocabulary the engine returns — and renders nothing, so it
 * sees no colour. The paint is `STATUS_TONE_COLOR`'s, and it is pinned where it renders.
 *
 * Both assert AGAINST the tokens, never against a hex: a literal would stay green through exactly
 * the re-point these pins exist to catch.
 */

/** jsdom rewrites an inline hex to `rgb(r, g, b)` on read-back. */
const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

/**
 * `getRetentionStatus`: <=0 OVERWRITTEN · <=3 CRITICAL · <=7 WARNING · else SAFE.
 *
 * Returns the `unmount` with the element: jsdom shares ONE document per test file, so a loop
 * that renders four screens without unmounting leaves four badges in it and `getByText` then
 * throws "found multiple elements" on the second pass.
 */
function retentionBadgeFor(daysUntilOverwritten: number): { pill: HTMLElement; unmount: () => void } {
  const form = blankLocationForm()
  const { unmount } = render(
    <DvrInfoScreen
      dvr={{ ...form.dvr, firstRecordedDate: '2025-01-01' }}
      retention={{
        totalRetention: 90,
        scopes: [{ label: 'Scope 1', daysUntilOverwritten, overwrittenDate: '2025-04-01' }],
      }}
      onChange={vi.fn()}
      isFieldVisible={() => true}
      {...nav}
    />,
  )
  return { pill: screen.getByText(/^(Safe|Warning|Critical|Overwritten)$/), unmount }
}

describe('the retention pill (A69 owner 3 — phone RETENTION_SEVERITY)', () => {
  it('maps all four bands, with OVERWRITTEN on the RED pair and not on a neutral', () => {
    // Phone `retention-calculation.ts:34-38`. `OVERWRITTEN` had been the neutral fallback there,
    // which painted the one TERMINAL state as if it carried no severity while the strictly
    // less-bad `CRITICAL` got full red.
    const cases: [days: number, label: string, severity: 'success' | 'warning' | 'error'][] = [
      [30, 'Safe', 'success'],
      [5, 'Warning', 'warning'],
      [2, 'Critical', 'error'],
      [0, 'Overwritten', 'error'],
    ]
    for (const [days, label, severity] of cases) {
      const { pill, unmount } = retentionBadgeFor(days)
      const tone = severityTone(severity)
      expect(pill).toHaveTextContent(label)
      expect(pill).toHaveStyle({ color: tone.color, borderColor: tone.borderColor })
      // Phone `dvr-information.tsx:438`: a 15% TINT of the accent, not the badge's opaque
      // `*Light` fill — this pill is deliberately not `statusBadgeStyle`.
      expect(pill.style.background).toBe(withAlpha(tone.borderColor, 0.15))
      expect(pill.style.background).not.toBe(rgb(tone.background))
      unmount()
    }
  })

  it('takes the phone`s own geometry for THIS badge — radius sm (4), not the pill`s lg (12)', () => {
    const { pill } = retentionBadgeFor(2)
    // Phone `dvr-information.tsx:547-556`: `borderRadius.sm`, `spacing.xs`/`spacing.sm` padding,
    // `fontSize.xs`, semibold. Was: radius 6, `3px 8px`, 11px, weight 700.
    expect(pill).toHaveStyle({ borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: '600' })
    expect(pill).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid' })
  })

  it('never paints the label with the saturated accent (C.3 rule 1)', () => {
    const { pill } = retentionBadgeFor(0)
    expect(pill.style.color).not.toBe(rgb(colors.error))
    expect(pill.style.color).toBe(rgb(colors.errorOnLight))
  })
})

describe('PaneNote (A69 owner 5 — the settings note boxes)', () => {
  it('paints all three tones from THE severity recipe', () => {
    for (const tone of ['info', 'warning', 'success'] as const) {
      const { unmount } = render(<PaneNote tone={tone}>Body</PaneNote>)
      const note = screen.getByText('Body')
      const expected = severityTone(tone)
      expect(note).toHaveStyle({
        background: expected.background,
        borderColor: expected.borderColor,
        color: expected.color,
      })
      unmount()
    }
  })

  it('stops spending the accent as the note`s TEXT — the 1.92-2.24:1 pairing', () => {
    render(<PaneNote tone="warning">Body</PaneNote>)
    const note = screen.getByText('Body')
    // What it used to render: `#ffd93d` text on `rgba(255,217,61,0.09)`.
    expect(note.style.color).not.toBe(rgb(colors.warning))
    expect(note.style.color).toBe(rgb(colors.warningOnLight))
    // The fill is OPAQUE now — a translucent one composites over an unknown parent and the
    // ratio stops being measurable.
    expect(note.style.background).toBe(rgb(colors.warningLight))
  })

  it('writes border LONGHANDS only, so nothing downstream can erase a side', () => {
    render(<PaneNote tone="info">Body</PaneNote>)
    const note = screen.getByText('Body')
    expect(note).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid' })
    // The `border` shorthand it used to carry is gone: a shorthand written after a longhand
    // erases it, and React writes only CHANGED keys on update.
    expect(note.getAttribute('style')).not.toMatch(/(^|;)\s*border:/)
  })
})
