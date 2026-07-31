import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { CasesScreen } from '@/features/demo/ui/screens/CasesScreen'
import { LONG_PRESS_MS } from '@/features/demo/ui/useLongPress'
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
  it('renders the case timeline and opens a location', () => {
    const onOpenLocation = vi.fn()
    render(<DashboardScreen cases={[card]} onOpenLocation={onOpenLocation} />)
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByText('L. McHugh')).toBeInTheDocument()
    fireEvent.click(screen.getByText("Kim's Convenience"))
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
  })

  it('renders the empty state', () => {
    render(<DashboardScreen cases={[]} onOpenLocation={vi.fn()} />)
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

    it('the per-row actions button opens the chooser (the discoverable, keyboard-reachable path)', () => {
      const onLocationActions = vi.fn()
      const onOpenLocation = vi.fn()
      render(
        <CasesScreen {...base} expandedId="c1" onLocationActions={onLocationActions} onOpenLocation={onOpenLocation} />,
      )
      fireEvent.click(screen.getByRole('button', { name: "Actions for Kim's Convenience" }))
      expect(onLocationActions).toHaveBeenCalledWith('l1')
      expect(onOpenLocation).not.toHaveBeenCalled() // the row itself did not open
    })

    it('holding the row opens the chooser instead of the location (phone long-press)', () => {
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

        expect(onLocationActions).toHaveBeenCalledWith('l1')
        expect(onOpenLocation).not.toHaveBeenCalled()
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
