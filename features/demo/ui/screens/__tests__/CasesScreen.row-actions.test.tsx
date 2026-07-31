import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CasesScreen, type CasesScreenProps } from '@/features/demo/ui/screens/CasesScreen'
import { caseStatusTheme, locationStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'
import { LONG_PRESS_MS } from '@/features/demo/ui/primitives/useLongPress'

/**
 * P3.1 — the Cases list's row-actions affordance: the honest web stand-in for the phone's
 * swipe-to-reveal delete (parity plan §5 P3.1, "match intent, not gesture").
 */

const cardA: CaseCard = {
  id: 'c1',
  caseNumber: 'PR25-A',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [],
  createdLabel: 'Just now',
  locations: [
    { id: 'l1', locationName: "Kim's Convenience", address: '1450 Eglinton Ave W', status: locationStatusTheme('started') },
    { id: 'l2', locationName: 'Rear Alley', address: '', status: locationStatusTheme('started') },
  ],
  locationCountLabel: '2 locations',
}
const cardB: CaseCard = { ...cardA, id: 'c2', caseNumber: 'PR25-B', displayName: '', locations: [], locationCountLabel: '0 locations' }

function renderScreen(over: Partial<CasesScreenProps> = {}) {
  const props: CasesScreenProps = {
    cases: [cardA, cardB],
    expandedId: null,
    onToggle: vi.fn(),
    onNewCase: vi.fn(),
    onOpenLocation: vi.fn(),
    onAddLocation: vi.fn(),
    onImport: vi.fn(),
    onDeleteCase: vi.fn(),
    onDeleteLocation: vi.fn(),
    ...over,
  }
  const view = render(<CasesScreen {...props} />)
  return { ...props, rerender: (next: Partial<CasesScreenProps>) => view.rerender(<CasesScreen {...props} {...next} />) }
}

/** Hold the row for the full long-press beat, then release. */
function longPress(el: HTMLElement) {
  fireEvent.pointerDown(el, { button: 0 })
  act(() => {
    vi.advanceTimersByTime(LONG_PRESS_MS)
  })
  fireEvent.pointerUp(el)
}

const caseHeader = (caseNumber: string) => screen.getByText(caseNumber).closest('button') as HTMLElement
const locationRow = (name: string) => screen.getByText(name).closest('button') as HTMLElement

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('CasesScreen row actions — reveal', () => {
  it('a hold on a case header reveals its Delete action; a plain tap does not', () => {
    renderScreen()
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
    fireEvent.click(caseHeader('PR25-A'))
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
    longPress(caseHeader('PR25-A'))
    expect(screen.getByRole('group', { name: 'Actions for case PR25-A' })).toBeInTheDocument()
  })

  it('a hold released early never reveals anything', () => {
    renderScreen()
    const header = caseHeader('PR25-A')
    fireEvent.pointerDown(header, { button: 0 })
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 50)
    })
    fireEvent.pointerUp(header)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
  })

  it('a pointer leaving the row cancels the hold', () => {
    renderScreen()
    const header = caseHeader('PR25-A')
    fireEvent.pointerDown(header, { button: 0 })
    fireEvent.pointerLeave(header)
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS)
    })
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
  })

  it('a secondary-button press is not a long press', () => {
    renderScreen()
    const header = caseHeader('PR25-A')
    fireEvent.pointerDown(header, { button: 2 })
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS)
    })
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
  })

  it('swallows the click that ends the hold, so the row’s own action never fires', () => {
    // THE trap the phone doesn't have: its swipe and its tap are different gestures, but on the
    // web the hold ends in a click on an already-interactive row.
    const { onToggle, onOpenLocation } = renderScreen({ expandedId: 'c1' })
    const header = caseHeader('PR25-B') // collapsed — an expanded card's actions are gated off
    longPress(header)
    fireEvent.click(header)
    expect(onToggle).not.toHaveBeenCalled()

    const row = locationRow("Kim's Convenience")
    longPress(row)
    fireEvent.click(row)
    expect(onOpenLocation).not.toHaveBeenCalled()

    // …and only the ONE click is swallowed — the row still works afterwards.
    fireEvent.click(row)
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
  })

  it('exposes the same tray through a keyboard-reachable trigger', () => {
    // The phone needs a screen-reader-only accessibilityAction because its gesture is
    // invisible; the web answer is a real focusable control.
    const { onDeleteCase } = renderScreen()
    const trigger = screen.getByRole('button', { name: 'Actions for case PR25-A' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeleteCase).toHaveBeenCalledWith('c1')
  })
})

describe('CasesScreen row actions — single open', () => {
  it('opening one row’s actions closes the previously open one', () => {
    renderScreen({ expandedId: 'c1' })
    longPress(caseHeader('PR25-B'))
    expect(screen.getByRole('group', { name: 'Actions for case PR25-B' })).toBeInTheDocument()

    longPress(locationRow("Kim's Convenience"))
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-B' })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: "Actions for location Kim's Convenience" })).toBeInTheDocument()

    longPress(locationRow('Rear Alley'))
    expect(screen.queryByRole('group', { name: "Actions for location Kim's Convenience" })).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Actions for location Rear Alley' })).toBeInTheDocument()
  })

  it('a second hold on the same row closes it again', () => {
    renderScreen()
    longPress(caseHeader('PR25-B'))
    expect(screen.getByRole('group', { name: 'Actions for case PR25-B' })).toBeInTheDocument()
    longPress(caseHeader('PR25-B'))
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-B' })).not.toBeInTheDocument()
  })
})

describe('CasesScreen row actions — the expanded gate (phone: enabled={!isExpanded})', () => {
  it('hides the case trigger while the card is expanded, and keeps the location triggers', () => {
    renderScreen({ expandedId: 'c1' })
    expect(screen.queryByRole('button', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions for case PR25-B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Actions for location Kim's Convenience" })).toBeInTheDocument()
  })

  it('a hold on an expanded card’s header reveals nothing', () => {
    renderScreen({ expandedId: 'c1' })
    longPress(caseHeader('PR25-A'))
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-A' })).not.toBeInTheDocument()
  })

  it('toggling a card closes any tray belonging to it', () => {
    const { rerender } = renderScreen({ expandedId: 'c1' })
    longPress(locationRow('Rear Alley'))
    expect(screen.getByRole('group', { name: 'Actions for location Rear Alley' })).toBeInTheDocument()
    // Collapse: the screen's toggle handler clears the tray, then the parent flips expandedId.
    fireEvent.click(caseHeader('PR25-A'))
    rerender({ expandedId: null })
    expect(screen.queryByRole('group', { name: 'Actions for location Rear Alley' })).not.toBeInTheDocument()
    // Re-expanding does not resurrect it.
    rerender({ expandedId: 'c1' })
    expect(screen.queryByRole('group', { name: 'Actions for location Rear Alley' })).not.toBeInTheDocument()
  })
})

describe('CasesScreen row actions — hand-off', () => {
  it('a location Delete closes the tray and reports the location id', () => {
    const { onDeleteLocation } = renderScreen({ expandedId: 'c1' })
    longPress(locationRow('Rear Alley'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeleteLocation).toHaveBeenCalledWith('l2')
    expect(screen.queryByRole('group', { name: 'Actions for location Rear Alley' })).not.toBeInTheDocument()
  })

  it('the case Delete reports the case id and closes the tray', () => {
    const { onDeleteCase } = renderScreen()
    longPress(caseHeader('PR25-B'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDeleteCase).toHaveBeenCalledWith('c2')
    expect(screen.queryByRole('group', { name: 'Actions for case PR25-B' })).not.toBeInTheDocument()
  })

  it('still opens locations and fires the expanded actions normally', () => {
    const { onOpenLocation, onImport, onAddLocation } = renderScreen({ expandedId: 'c1' })
    fireEvent.click(locationRow("Kim's Convenience"))
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
    fireEvent.click(screen.getByText('Import'))
    expect(onImport).toHaveBeenCalledWith('c1')
    fireEvent.click(screen.getByText('Add Location'))
    expect(onAddLocation).toHaveBeenCalledWith('c1')
  })
})
