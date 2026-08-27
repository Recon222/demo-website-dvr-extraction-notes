import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaseMapPicker } from '@/features/demo/ui/screens/map/CaseMapPicker'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'

/** jsdom rewrites an inline hex to `rgb(r, g, b)` and re-spaces `rgba(...)` on read-back. */
const hexToJsdomRgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
const respace = (value: string) => value.replace(/,(?=\S)/g, ', ')

const cases = [
  { id: 'c1', caseNumber: 'PR25-1', displayName: 'Case One', locationCountLabel: '2 locations', status: 'draft' as const },
  { id: 'c2', caseNumber: 'PR25-2', displayName: 'Case Two', locationCountLabel: '1 location', status: 'complete' as const },
]

function renderPicker(over: Partial<Parameters<typeof CaseMapPicker>[0]> = {}) {
  const props = { cases, dismissible: true, preselectedId: null, onPick: vi.fn(), onClose: vi.fn(), ...over }
  render(<CaseMapPicker {...props} />)
  return props
}

describe('CaseMapPicker (full-screen)', () => {
  it('renders the "Pick a Case" header and a row per case, and picks one', () => {
    const props = renderPicker()
    expect(screen.getByText('Pick a Case')).toBeInTheDocument()
    expect(screen.getByText('PR25-1')).toBeInTheDocument()
    expect(screen.getByText('Case Two')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Case One'))
    expect(props.onPick).toHaveBeenCalledWith('c1')
  })

  it('shows a disabled "All Cases — coming soon" row that does not pick', () => {
    const props = renderPicker()
    const allCases = screen.getByText('All Cases')
    expect(allCases).toBeInTheDocument()
    fireEvent.click(allCases)
    expect(props.onPick).not.toHaveBeenCalled()
  })

  it('mandatory (non-dismissible) renders no Cancel button', () => {
    renderPicker({ dismissible: false })
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('dismissible renders a Cancel button that closes', () => {
    const props = renderPicker({ dismissible: true })
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('marks the preselected case row as selected', () => {
    renderPicker({ preselectedId: 'c2' })
    expect(screen.getByTestId('case-row-c2')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('case-row-c1')).toHaveAttribute('data-selected', 'false')
  })

  it('shows an empty state when there are no cases', () => {
    renderPicker({ cases: [] })
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })

  // D4 + PR #127 `7df5148b`, and matrix row 18's end state: "nested glass fill, uniform 1px
  // border on all four sides, NO accent bar". The phone's `MapPicker.tsx:143-153` carries the
  // reason inline: the reserved 4px LEFT edge was painted `transparent` when unselected, "so
  // every unselected card read as though its left border were missing, and the selected one wore
  // a heavy bar down one side. Selection is now the border's weight and colour, evenly: 2px
  // primary against 1px glass."
  it('draws four even sides and no left accent bar (D4)', () => {
    renderPicker({ preselectedId: 'c2' })
    const unselected = screen.getByTestId('case-row-c1')
    const selected = screen.getByTestId('case-row-c2')

    expect(unselected.style.borderWidth).toBe('1px')
    expect(selected.style.borderWidth).toBe('2px')

    const primary = hexToJsdomRgb(colors.primary)
    for (const side of ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const) {
      expect(selected.style[side], `selected ${side}`).toBe(primary)
    }
    // The unselected row's four sides are the nested tier's, and its left is not special.
    const glassSide = respace(GLASS_TIER[scheme].nestedCard.border)
    expect(unselected.style.borderLeftColor).toBe(glassSide)
    expect(unselected.style.borderRightColor).toBe(glassSide)
    // No `borderLeft` shorthand survives anywhere in the declaration.
    expect(selected.getAttribute('style')).not.toMatch(/border-left:/)
    expect(unselected.getAttribute('style')).not.toMatch(/border-left:/)
    // Selection ADDS: the fill is the same on both rows (D1(a)'s surviving principle).
    expect(selected.style.backgroundImage).toBe(unselected.style.backgroundImage)
    expect(selected.style.backgroundImage).toBe(respace(glassCardNested.background))
  })

  // Matrix row 18: "`accent = '#4ba3d4'` (`:28`) is `MAP_GLASS_COLORS.primaryLight` un-imported."
  // The phone tints the selected title with `colors.primary` (`MapPicker.tsx:163`), not with the
  // light shade — so the fix is the phone's token, not an import of the demo's literal.
  it('tints the selected case number with the palette accent, not a bare literal', () => {
    renderPicker({ preselectedId: 'c2' })
    expect(screen.getByText('PR25-2').style.color).toBe(hexToJsdomRgb(colors.primary))
    expect(screen.getByText('PR25-1').style.color).toBe(hexToJsdomRgb(colors.text))
  })

  // Deferral D-2's trigger: the last retired-ramp `rgba()` inside `screens/map/`. A hex sweep
  // cannot see `rgba(19, 34, 54, ...)`, which is why this file survived U0 and U1 untouched.
  it('spells no retired-ramp navy anywhere in its rendered styles', () => {
    renderPicker({ preselectedId: 'c2' })
    const styles = Array.from(document.querySelectorAll<HTMLElement>('*'))
      .map((el) => el.getAttribute('style') ?? '')
      .join(' ')
      .replace(/\s+/g, '')
      .toLowerCase()
    // Positive control: an empty read must not pass as a clean one.
    expect(styles).toContain('background')
    for (const retired of ['rgba(19,34,54', 'rgba(13,27,42', 'rgba(30,58,95', 'rgb(10,22,36']) {
      expect(styles, `retired ramp: ${retired}`).not.toContain(retired)
    }
  })
})
