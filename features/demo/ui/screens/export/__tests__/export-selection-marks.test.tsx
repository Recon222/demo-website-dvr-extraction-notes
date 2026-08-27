import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

import { ExportCaseCard, type ExportCaseCardProps } from '@/features/demo/ui/screens/export/ExportCaseCard'
import { ExportLocationRow } from '@/features/demo/ui/screens/export/ExportLocationRow'
import { caseStatusTheme, locationStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing } from '@/features/demo/ui/tokens/scale'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
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
