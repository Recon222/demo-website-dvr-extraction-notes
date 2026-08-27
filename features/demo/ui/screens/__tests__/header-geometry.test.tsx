import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * D15's GEOMETRY HALF (U3.4). The owner ratified porting PR #125 issue 10's header trim and
 * deferring its scroll-materialising blur; this pins the trim.
 *
 * Phone `src/components/layout/MainHeader.tsx:105-135` @ `dd5551ec`, the whole recipe:
 *   paddingHorizontal  Layout.spacing.md      16
 *   paddingTop         Layout.spacing.xs       4
 *   paddingBottom      Layout.spacing.xs       4
 *   minHeight          Layout.touchTarget.min 44   (NOT `large` 56 — the phone's own comment
 *                                                   calls 56 "padding wearing a different name")
 *   container          no marginBottom             (deleted outright, see `:118-121`)
 *
 * WHAT THIS DOES NOT PIN, and why. The plan's row states the outcome as "92pt -> 64pt, first
 * card +108 -> +80". Those are the PHONE's numbers: its old block was `paddingVertical: md`
 * (16 both edges) + `minHeight: large` (56) + `marginBottom: md` (16). The demo never had the
 * 56pt floor or the 16pt margin, so porting the recipe trims the demo's own header block by
 * 18px, not 28. Asserting a 28px trim here would mean inventing padding to delete. The
 * contract is the phone's recipe; the demo's arithmetic follows from it.
 *
 * `padding` is read as a shorthand string because that is what the component writes and what
 * jsdom returns; the two-value form `'4px 16px'` sets all four edges, which is the point.
 */

const noop = vi.fn()

const casesProps = {
  cases: [],
  expandedId: null,
  onToggle: noop,
  onOpenLocation: noop,
  onNewCase: noop,
  onSettings: noop,
  onAddLocation: noop,
  onImport: noop,
  onDeleteCase: noop,
  onDeleteLocation: noop,
  onLocationActions: noop,
  onCaseActions: noop,
}

describe('Cases / Dashboard header geometry (D15 geometry half, A57 neighbours)', () => {
  const headerOf = (title: string): HTMLElement => {
    const el = screen.getByText(title).parentElement
    if (el === null) throw new Error(`no parent for the "${title}" title — the header shape moved`)
    return el
  }

  it.each([
    ['Cases', () => render(<CasesScreen {...casesProps} />)],
    ['Dashboard', () => render(<DashboardScreen cases={[]} onOpenLocation={noop} onCaseActions={noop} onSettings={noop} />)],
  ])('trims the %s header to the phone MainHeader.tsx:105-135 recipe', (title, mount) => {
    mount()
    const header = headerOf(title as string)
    // 4 / 16 — and CRUCIALLY not the pre-port `'8px 18px 18px'` / `'8px 18px 16px'`, whose
    // asymmetric bottom edge is exactly the chrome the trim removes.
    expect(header.style.padding).toBe(`${spacing.xs}px ${spacing.md}px`)
    expect(header.style.minHeight).toBe(`${touchTarget.min}px`)
    // "No bottom margin" is half the phone's change and the half a padding pin cannot see.
    expect(header.style.marginBottom).toBe('')
    // The title stays 30px/700 (§4.9: an off-scale-adjacent literal the phone keeps as
    // `fontSize['3xl']`); the trim is chrome, not type.
    expect(screen.getByText(title as string).style.fontSize).toBe('30px')
  })
})
