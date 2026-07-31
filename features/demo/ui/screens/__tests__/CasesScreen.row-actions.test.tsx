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
    onLocationActions: vi.fn(),
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

  it('a TOUCH hold leaves the tray open — the trailing contextmenu must not toggle it shut', () => {
    // Review R-1, the defect at its call site. A touch hold fires the timer AND raises the OS
    // `contextmenu`; both rows pass `toggleActions` as the callback, so a second fire read as
    // open-then-close — the hold on the surface carrying Delete and Duplicate… appeared to do
    // nothing at all. Desktop mouse never reproduced it (a left release raises no
    // `contextmenu`), which is why every pre-R-1 test passed.
    renderScreen({ expandedId: 'c1' })
    const row = locationRow("Kim's Convenience")

    // `pointerType: 'touch'` is load-bearing since R-20 — the latch that consumes the trailing
    // `contextmenu` is armed only for touch, because only touch raises one. This arm was
    // written with the default (mouse) and passed for the wrong reason until then.
    fireEvent.pointerDown(row, { button: 0, pointerType: 'touch' })
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS)
    })
    fireEvent.contextMenu(row)
    fireEvent.pointerUp(row)

    expect(screen.getByRole('group', { name: "Actions for location Kim's Convenience" })).toBeInTheDocument()
  })

  it('the ⋯ trigger is outside the gesture — holding it does not double-toggle its own tray', () => {
    // The trigger is a SIBLING of the row button the hook rides, so a press on it never reaches
    // the hook (R-1's nested-control rule, achieved structurally here). Its own click is all
    // that runs.
    renderScreen({ expandedId: 'c1' })
    const trigger = screen.getByRole('button', { name: "Actions for location Kim's Convenience" })

    fireEvent.pointerDown(trigger, { button: 0 })
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS)
    })
    fireEvent.pointerUp(trigger)
    fireEvent.click(trigger, { detail: 1 })

    expect(screen.getByRole('group', { name: "Actions for location Kim's Convenience" })).toBeInTheDocument()
  })

  it('swallows the click that ends the hold, so the row’s own action never fires', () => {
    // THE trap the phone doesn't have: its swipe and its tap are different gestures, but on the
    // web the hold ends in a click on an already-interactive row.
    // `detail: 1` is not decoration: a pointer-originated click always carries a click count,
    // and the hook keys its keyboard exemption on `detail === 0` (a click synthesised by
    // Enter/Space, which must never be swallowed). `fireEvent.click` defaults to 0, so an
    // unqualified click here would be simulating the keyboard and pass for the wrong reason.
    const { onToggle, onOpenLocation } = renderScreen({ expandedId: 'c1' })
    const header = caseHeader('PR25-B') // collapsed — an expanded card's actions are gated off
    longPress(header)
    fireEvent.click(header, { detail: 1 })
    expect(onToggle).not.toHaveBeenCalled()

    const row = locationRow("Kim's Convenience")
    longPress(row)
    fireEvent.click(row, { detail: 1 })
    expect(onOpenLocation).not.toHaveBeenCalled()

    // …and only the ONE click is swallowed — the row still works afterwards.
    fireEvent.click(row, { detail: 1 })
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
  })

  it('does not eat a later tap when the hold ended off the row', () => {
    // The hold fires, the pointer is released elsewhere, so no click ever consumes the swallow
    // flag. The next gesture must start clean or the row would silently ignore a real tap.
    const { onOpenLocation } = renderScreen({ expandedId: 'c1' })
    const row = locationRow('Rear Alley')
    fireEvent.pointerDown(row, { button: 0 })
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS)
    })
    fireEvent.pointerLeave(row) // released off the row — no click follows

    fireEvent.pointerDown(row, { button: 0 })
    fireEvent.pointerUp(row)
    // `detail: 1` — without it this click is keyboard-shaped (jsdom defaults to 0), so
    // `onClickCapture` consumed the armed flag at the KEYBOARD exemption and returned before
    // any swallow could happen: the arm passed with or without the reset it claims to pin.
    // 2b18a0a's "probe-verified red" was true on P3.1's branch, before the §56f assembly merged
    // the `detail` check in — the assembly silently made it vacuous (R-19).
    fireEvent.click(row, { detail: 1 })
    expect(onOpenLocation).toHaveBeenCalledWith('l2')
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
