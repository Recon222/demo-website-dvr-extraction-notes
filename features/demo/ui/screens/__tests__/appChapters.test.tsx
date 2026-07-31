import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { LONG_PRESS_MS } from '@/features/demo/ui/primitives/useLongPress'
import { caseStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'

const card: CaseCard = {
  id: 'c1',
  caseNumber: 'PR25-0098213',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [{ role: 'OIC', name: 'L. McHugh', badge: '4471' }],
  createdLabel: 'Just now',
  locations: [{ id: 'l1', locationName: "Kim's Convenience", address: '1450 Eglinton Ave W', status: caseStatusTheme('draft') }],
  locationCountLabel: '1 location',
}

describe('DashboardScreen', () => {
  // Depth added by P3.2 (5-recent cap, MoreLocationsPill overflow, the actions entry
  // points) has its own suite in DashboardScreen.test.tsx.
  it('renders the case timeline and opens a location', () => {
    const onOpenLocation = vi.fn()
    render(<DashboardScreen cases={[card]} onOpenLocation={onOpenLocation} onCaseActions={vi.fn()} />)
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByText('L. McHugh')).toBeInTheDocument()
    fireEvent.click(screen.getByText("Kim's Convenience"))
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
  })

  it('renders the empty state', () => {
    render(<DashboardScreen cases={[]} onOpenLocation={vi.fn()} onCaseActions={vi.fn()} />)
    expect(screen.getByText('No cases yet.')).toBeInTheDocument()
  })
})

describe('CasesScreen', () => {
  const base = {
    cases: [card],
    expandedId: null,
    onToggle: vi.fn(),
    onNewCase: vi.fn(),
    onOpenLocation: vi.fn(),
    onAddLocation: vi.fn(),
    onImport: vi.fn(),
    onDeleteCase: vi.fn(),
    onDeleteLocation: vi.fn(),
    onLocationActions: vi.fn(),
  }

  it('lists cases and fires toggle + new-case', () => {
    const onToggle = vi.fn()
    const onNewCase = vi.fn()
    render(<CasesScreen {...base} onToggle={onToggle} onNewCase={onNewCase} />)
    fireEvent.click(screen.getByText('PR25-0098213'))
    expect(onToggle).toHaveBeenCalledWith('c1')
    fireEvent.click(screen.getByLabelText('New case'))
    expect(onNewCase).toHaveBeenCalledOnce()
  })

  it('shows expanded import / add-location actions', () => {
    const onImport = vi.fn()
    const onAddLocation = vi.fn()
    render(<CasesScreen {...base} expandedId="c1" onImport={onImport} onAddLocation={onAddLocation} />)
    fireEvent.click(screen.getByText('Import'))
    expect(onImport).toHaveBeenCalledWith('c1')
    fireEvent.click(screen.getByText('Add Location'))
    expect(onAddLocation).toHaveBeenCalledWith('c1')
  })

  describe('location rows (P3.5 action affordances)', () => {
    it('tap opens the location', () => {
      const onOpenLocation = vi.fn()
      render(<CasesScreen {...base} expandedId="c1" onOpenLocation={onOpenLocation} />)
      fireEvent.click(screen.getByText("Kim's Convenience"))
      expect(onOpenLocation).toHaveBeenCalledWith('l1')
    })

    // P3 assembly: P3.5's own ⋯ button and P3.1's tray trigger were the same affordance built
    // twice. P3.1's survived, so both entries below open the TRAY, and "Duplicate…" inside it
    // is what reaches `onLocationActions` (§48g's marked seam, closed).
    it("the per-row actions trigger reveals the tray, whose Duplicate… opens the chooser", () => {
      const onLocationActions = vi.fn()
      const onOpenLocation = vi.fn()
      render(
        <CasesScreen {...base} expandedId="c1" onLocationActions={onLocationActions} onOpenLocation={onOpenLocation} />,
      )
      fireEvent.click(screen.getByRole('button', { name: "Actions for location Kim's Convenience" }))
      fireEvent.click(within(screen.getByRole('group', { name: "Actions for location Kim's Convenience" })).getByText('Duplicate…'))
      expect(onLocationActions).toHaveBeenCalledWith('l1')
      expect(onOpenLocation).not.toHaveBeenCalled() // the row itself did not open
    })

    it('holding the row reveals the same tray instead of opening the location (phone long-press)', () => {
      vi.useFakeTimers()
      try {
        const onLocationActions = vi.fn()
        const onOpenLocation = vi.fn()
        render(
          <CasesScreen {...base} expandedId="c1" onLocationActions={onLocationActions} onOpenLocation={onOpenLocation} />,
        )
        const row = screen.getByText("Kim's Convenience").closest('button')!

        fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientX: 5, clientY: 5 })
        act(() => void vi.advanceTimersByTime(LONG_PRESS_MS))
        fireEvent.pointerUp(row)
        fireEvent.click(row, { detail: 1 })

        const tray = screen.getByRole('group', { name: "Actions for location Kim's Convenience" })
        expect(onOpenLocation).not.toHaveBeenCalled() // the hold's trailing click was swallowed
        fireEvent.click(within(tray).getByText('Duplicate…'))
        expect(onLocationActions).toHaveBeenCalledWith('l1')
        expect(onOpenLocation).not.toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
