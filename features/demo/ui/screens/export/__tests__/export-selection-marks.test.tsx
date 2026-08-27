import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { GLASS } from '@/features/demo/ui/glass-tokens'
import { ExportCaseCard, type ExportCaseCardProps } from '@/features/demo/ui/screens/export/ExportCaseCard'
import { ExportLocationRow } from '@/features/demo/ui/screens/export/ExportLocationRow'
import { caseStatusTheme, locationStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/** The same for a border SHORTHAND — jsdom re-spaces the `rgba()` inside it too, so comparing
 *  a rendered `borderTop` against the token byte-for-byte fails on whitespace alone. */
function jsdomBorder(value: string): string {
  const probe = document.createElement('div')
  probe.style.borderTop = value
  return probe.style.borderTop
}

const location = {
  id: 'l1',
  locationName: "Kim's Convenience",
  address: '1450 Eglinton Ave W',
  status: locationStatusTheme('started'),
}

const caseCard: CaseCard = {
  id: 'c1',
  caseNumber: 'PR25-A',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [{ role: 'OIC', name: 'L. McHugh', badge: '4471' }],
  createdLabel: 'Just now',
  locations: [location],
  locationCountLabel: '1 location',
}

const props: ExportCaseCardProps = {
  card: caseCard,
  checkbox: 'none',
  selectedIds: new Set<string>(),
  expanded: false,
  dimmed: false,
  isExporting: false,
  onToggleExpand: vi.fn(),
  onToggleCase: vi.fn(),
  onToggleLocation: vi.fn(),
}

/**
 * A75 — the export hub's two selection marks, which are TWO controls and not one.
 *
 * The case-level control is the shared `Checkbox` on the phone too (`ExportCaseCard.tsx:22`,
 * `:159-165`), so the demo's 20x20 square adopts `CheckboxBox`. The location row's is a 22px
 * circle the phone ALSO hand-rolls (`ExportLocationRow.tsx:121-136`) rather than reaching for
 * `Checkbox` — so it stays its own control and only its literals move onto tokens. Reading A75
 * as "make them both the canonical checkbox" would have deleted a distinction both apps draw.
 */
describe('ExportCaseCard — the case checkbox is the shared recipe (A75)', () => {
  const box = (checkbox: ExportCaseCardProps['checkbox']) => {
    const { container } = render(<ExportCaseCard {...props} checkbox={checkbox} />)
    return container.querySelector('[data-checkbox-box]') as HTMLElement
  }

  it('renders the 24px canonical box, not the old 20px square', () => {
    const el = box('none')
    expect(el.style.width).toBe('24px')
    expect(el.style.borderRadius).toBe(`${radius.sm}px`)
  })

  it('drives all three tri-states off the same value `aria-checked` gets', () => {
    expect(box('all').textContent).toBe('✓')
    expect(box('some').textContent).toBe('−')
    expect(box('none').textContent).toBe('')
    // `some` is FILLED, which is what makes it read as "partially on" rather than as empty.
    expect(box('some').style.backgroundColor).toBe(jsdomColor(colors.primary))
    expect(box('none').style.backgroundColor).toBe(jsdomColor(colors.background))
  })

  it('dims a disabled checkbox at the phone opacity', () => {
    const { container } = render(<ExportCaseCard {...props} isExporting />)
    const button = container.querySelector('[role="checkbox"]') as HTMLElement
    expect(button.style.opacity).toBe('0.5')
  })
})

/**
 * The row mark keeps its geometry (22 / `full` / 2px) and moves its four literals onto tokens.
 * `indicatorSlot`'s `marginRight` is `spacing.base` on the phone (`:118-120`), which the demo
 * had at 10.
 */
describe('ExportLocationRow — the circular row mark (A75)', () => {
  const mark = (selected: boolean) => {
    const { container } = render(
      <ExportLocationRow row={location} selected={selected} disabled={false} onToggle={vi.fn()} />,
    )
    return container.querySelector('[data-row-indicator]') as HTMLElement
  }

  it('fills with `primary` and marks in `onPrimary` when selected', () => {
    const el = mark(true)
    expect(el.style.backgroundColor).toBe(jsdomColor(colors.primary))
    expect(el.style.borderColor).toBe(jsdomColor(colors.primary))
    expect(el.style.color).toBe(jsdomColor(colors.onPrimary))
    expect(el.textContent).toBe('✓')
  })

  it('rings in `textTertiary` when not', () => {
    const el = mark(false)
    expect(el.style.backgroundColor).toBe('transparent')
    expect(el.style.borderColor).toBe(jsdomColor(colors.textTertiary))
  })

  it('sits `spacing.base` from the label, and stays a 22px circle', () => {
    const el = mark(false)
    expect(el.style.marginRight).toBe(`${spacing.base}px`)
    expect(el.style.width).toBe('22px')
    expect(el.style.borderWidth).toBe('2px')
  })
})

/**
 * The row CHROME, as distinct from the mark inside it — phone `styles.row` (`:104-111`).
 *
 * `touchTarget.medium` (46) and not `min` (44) is the whole reason this pin reads a NUMBER.
 * The U6.3 plan row says "`minHeight:44` becomes `touchTarget.min`"; `ExportLocationRow.tsx:107`
 * says `Layout.touchTarget.medium`. Both names are on the scale, both are plausible in a diff,
 * and the demo's pre-port literal was `44` — so the WRONG token renders as a faithful rename
 * with no observable difference. Only the value tells them apart.
 */
describe('ExportLocationRow — the ledger row itself (A49 / A7)', () => {
  const row = () => {
    const { container } = render(
      <ExportLocationRow row={location} selected={false} disabled={false} onToggle={vi.fn()} />,
    )
    return container.firstElementChild as HTMLElement
  }

  it('stands at `touchTarget.medium` (46), not the 44 the plan row names', () => {
    const el = row()
    expect(el.style.minHeight).toBe(`${touchTarget.medium}px`)
    expect(el.style.minHeight).not.toBe(`${touchTarget.min}px`)
    // phone `:108` — `paddingVertical: Layout.spacing.sm`, horizontal none.
    expect(el.style.paddingTop).toBe(`${spacing.sm}px`)
    expect(el.style.paddingLeft).toBe('0px')
  })

  it('separates on `colors.border`, not the pre-A7 navy wash', () => {
    const el = row()
    // Per-SIDE, because a `borderBottom` shorthand is what the component writes and jsdom
    // expands it; reading `.border` here comes back empty and would pass vacuously.
    expect(el.style.borderBottomColor).toBe(jsdomColor(colors.border))
    expect(el.style.borderBottomWidth).toBe('1px')
    // `rgba(30,58,95,0.6)` was a near-miss on TWO axes at once — a pre-A7 navy at an alpha
    // `borderSoft` does not spell (0.5) — which is why neither U0.1's `#1c4e84` re-base nor
    // U1.1's tier derivation could reach it, and why it survived two sweep packages.
    expect(el.style.borderBottomColor).not.toBe(jsdomColor('rgba(30,58,95,0.6)'))
  })
})

/**
 * A30 / A44 — the CARD's own chrome, as opposed to the marks and the rows inside it.
 *
 * The load-bearing distinction is that this card carries TWO hairlines with two different
 * jobs, and the phone gives them two different tokens: the expanded body's division is
 * `glass.card.border` (the card tier's washed edge, `styles.locationsContainer:337-338`) and a
 * location row's separator is the flat `colors.border` (`ExportLocationRow.tsx:110`). The demo
 * painted both as `colors.border`, one of them through a contentless `height: 1` spacer div.
 */
describe('ExportCaseCard — the card`s own chrome (A30 / A44)', () => {
  const expandedCard = () => {
    const { container } = render(<ExportCaseCard {...props} expanded />)
    const row = screen.getByRole('checkbox', { name: `Select ${location.locationName}` })
    return {
      card: container.firstElementChild as HTMLElement,
      body: row.parentElement as HTMLElement,
      row,
    }
  }

  it('rules the expanded body on the CARD TIER, not on the flat border its rows use', () => {
    const { body, row } = expandedCard()
    expect(body.style.borderTopColor).toBe(jsdomColor('rgba(28,78,132,0.5)'))
    expect(body.style.borderTopWidth).toBe('1px')
    // phone `:336` — `paddingTop: Layout.spacing.xs`, i.e. the 4px sits BELOW the line.
    expect(body.style.paddingTop).toBe(`${spacing.xs}px`)
    // Two hairlines, two tokens, deliberately. If a later sweep collapses them onto one value
    // the card's division silently stops carrying the tier — which is how it read before U6.3.
    expect(body.style.borderTopColor).not.toBe(row.style.borderBottomColor)
  })

  it('carries that rule on the body itself, not on a 1px spacer sibling', () => {
    const { body } = expandedCard()
    // The node this replaces was `<div style={{height:1, background: colors.border}} />` — a
    // contentless sibling that any later `gap`/`flex` change could separate from the rows it
    // divides, with nothing observing the drift.
    expect(body.style.borderTop).toBe(jsdomBorder(GLASS.borderSoft))
    expect(body.querySelector(':scope > div[style*="height: 1px"]')).toBeNull()
  })

  it('sets the location count on `textSecondary`, one rung up from where it sat', () => {
    render(<ExportCaseCard {...props} />)
    const count = screen.getByText(caseCard.locationCountLabel)
    // phone `styles.locationCount:316-320`. `#7a9fc4` (= `textTertiary`) was a VALUE drift, not
    // a spelling — the same call D-1 made for the recorder's six `#5a7a9a` sites.
    expect(count.style.color).toBe(jsdomColor(colors.textSecondary))
    expect(count.style.color).not.toBe(jsdomColor(colors.textTertiary))
  })

  it('spaces cards at `spacing.md`, the gap the hub`s list actually spends', () => {
    const { card } = expandedCard()
    // phone `ExportHub.tsx:310-312` — `cardWrapper.marginBottom: Layout.spacing.md`. The demo's
    // 14 was a prototype value two short of the scale it sat beside.
    expect(card.style.marginBottom).toBe(`${spacing.md}px`)
  })
})
