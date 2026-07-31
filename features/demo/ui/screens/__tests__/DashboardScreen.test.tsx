import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DashboardScreen, DASHBOARD_CASE_LIMIT } from '@/features/demo/ui/screens/DashboardScreen'
import { caseStatusTheme, locationStatusTheme, type CaseCard, type CaseLocationRow } from '@/features/demo/ui/screens/screenData'

const loc = (n: number): CaseLocationRow => ({
  id: `l${n}`,
  locationName: `Location ${n}`,
  address: `${n} Eglinton Ave W, Mississauga`,
  status: locationStatusTheme('started'),
})

const card = (over: Partial<CaseCard> = {}): CaseCard => ({
  id: 'c1',
  caseNumber: 'PR25-0001',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [{ role: 'OIC', name: 'L. McHugh', badge: '4471' }],
  createdLabel: 'Just now',
  locations: [loc(1)],
  locationCountLabel: '1 location',
  ...over,
})

const base = { onOpenLocation: vi.fn(), onCaseActions: vi.fn() }

afterEach(() => {
  vi.useRealTimers()
})

describe('DashboardScreen — recent-cases cap (phone useCases({ pageSize: 5 }))', () => {
  it('renders only the 5 most recent cases, newest first', () => {
    const many = Array.from({ length: 7 }, (_, i) => card({ id: `c${i}`, caseNumber: `PR25-000${i}` }))
    render(<DashboardScreen {...base} cases={many} />)
    for (let i = 0; i < DASHBOARD_CASE_LIMIT; i++) {
      expect(screen.getByText(`PR25-000${i}`)).toBeInTheDocument()
    }
    expect(screen.queryByText('PR25-0005')).toBeNull()
    expect(screen.queryByText('PR25-0006')).toBeNull()
  })

  it('keeps the empty state', () => {
    render(<DashboardScreen {...base} cases={[]} />)
    expect(screen.getByText('No cases yet.')).toBeInTheDocument()
  })
})

describe('DashboardScreen — MoreLocationsPill overflow', () => {
  it('shows one location pill and no "+N" when a case has a single location', () => {
    render(<DashboardScreen {...base} cases={[card()]} />)
    expect(screen.getByText('Location 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /more locations/ })).toBeNull()
    expect(screen.queryByText('All Locations:')).toBeNull()
  })

  it('collapses the rest behind "+N" and expands to the full list on tap', () => {
    const onOpenLocation = vi.fn()
    render(<DashboardScreen {...base} onOpenLocation={onOpenLocation} cases={[card({ locations: [loc(1), loc(2), loc(3)] })]} />)

    // Only the first location is a pill; the other two hide behind +2.
    const pill = screen.getByRole('button', { name: '2 more locations' })
    expect(pill).toHaveTextContent('+2')
    expect(pill).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('All Locations:')).toBeNull()

    fireEvent.click(pill)
    expect(screen.getByText('All Locations:')).toBeInTheDocument()
    expect(pill).toHaveAttribute('aria-expanded', 'true')
    // The expanded list repeats EVERY location, the pilled one included (phone parity).
    expect(screen.getAllByRole('button', { name: /^Location: / })).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Location: Location 3' }))
    expect(onOpenLocation).toHaveBeenCalledWith('l3')

    fireEvent.click(pill)
    expect(screen.queryByText('All Locations:')).toBeNull()
  })

  it('expands one card without expanding its neighbour', () => {
    const cases = [
      card({ id: 'c1', caseNumber: 'PR25-0001', locations: [loc(1), loc(2)] }),
      card({ id: 'c2', caseNumber: 'PR25-0002', locations: [loc(3), loc(4)] }),
    ]
    render(<DashboardScreen {...base} cases={cases} />)
    fireEvent.click(screen.getAllByRole('button', { name: '1 more locations' })[0])
    expect(screen.getAllByText('All Locations:')).toHaveLength(1)
  })
})

describe('DashboardScreen — Case Actions entry points (the phone long-press)', () => {
  const renderOne = () => {
    const onCaseActions = vi.fn()
    render(<DashboardScreen {...base} onCaseActions={onCaseActions} cases={[card({ locations: [loc(1), loc(2)] })]} />)
    const cardEl = document.querySelector('[data-case-card="c1"]') as HTMLElement
    return { onCaseActions, cardEl }
  }

  it('opens the sheet after a 500ms hold, and not a millisecond earlier', () => {
    vi.useFakeTimers()
    const { onCaseActions, cardEl } = renderOne()
    fireEvent.pointerDown(cardEl, { button: 0 })
    act(() => void vi.advanceTimersByTime(499))
    expect(onCaseActions).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(1))
    expect(onCaseActions).toHaveBeenCalledWith('c1')
  })

  it('a tap (press released early) does nothing — the phone card has no onPress', () => {
    vi.useFakeTimers()
    const { onCaseActions, cardEl } = renderOne()
    fireEvent.pointerDown(cardEl, { button: 0 })
    act(() => void vi.advanceTimersByTime(200))
    fireEvent.pointerUp(cardEl)
    act(() => void vi.advanceTimersByTime(1000))
    expect(onCaseActions).not.toHaveBeenCalled()
  })

  it('a hold that wanders off the card is cancelled', () => {
    vi.useFakeTimers()
    const { onCaseActions, cardEl } = renderOne()
    fireEvent.pointerDown(cardEl, { button: 0 })
    fireEvent.pointerLeave(cardEl)
    act(() => void vi.advanceTimersByTime(1000))
    expect(onCaseActions).not.toHaveBeenCalled()
  })

  it('does NOT arm on a nested control — a slow tap on a location pill still opens the location', () => {
    vi.useFakeTimers()
    const onOpenLocation = vi.fn()
    const onCaseActions = vi.fn()
    render(<DashboardScreen onOpenLocation={onOpenLocation} onCaseActions={onCaseActions} cases={[card({ locations: [loc(1), loc(2)] })]} />)
    const pill = screen.getByText('Location 1')
    fireEvent.pointerDown(pill, { button: 0 })
    act(() => void vi.advanceTimersByTime(1000))
    expect(onCaseActions).not.toHaveBeenCalled()
    fireEvent.click(pill)
    expect(onOpenLocation).toHaveBeenCalledWith('l1')
  })

  it('right-click opens the sheet and suppresses the browser menu', () => {
    const { onCaseActions, cardEl } = renderOne()
    const prevented = !fireEvent.contextMenu(cardEl)
    expect(onCaseActions).toHaveBeenCalledWith('c1')
    expect(prevented).toBe(true)
  })

  it('a touch hold that also raises contextmenu opens the sheet ONCE', () => {
    vi.useFakeTimers()
    const { onCaseActions, cardEl } = renderOne()
    fireEvent.pointerDown(cardEl, { button: 0 })
    act(() => void vi.advanceTimersByTime(500))
    // iOS/Android raise the OS context menu at the end of the same hold.
    fireEvent.contextMenu(cardEl)
    expect(onCaseActions).toHaveBeenCalledTimes(1)

    // …and the latch does not swallow a genuine right-click afterwards.
    fireEvent.contextMenu(cardEl)
    expect(onCaseActions).toHaveBeenCalledTimes(2)
  })

  it('the ⋯ button opens the sheet — the keyboard/screen-reader path', () => {
    const { onCaseActions } = renderOne()
    const btn = screen.getByRole('button', { name: 'Case actions for PR25-0001' })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(btn)
    expect(onCaseActions).toHaveBeenCalledWith('c1')
  })

  it('a pending hold cannot fire after the card unmounts', () => {
    vi.useFakeTimers()
    const onCaseActions = vi.fn()
    const { unmount } = render(<DashboardScreen {...base} onCaseActions={onCaseActions} cases={[card()]} />)
    const cardEl = document.querySelector('[data-case-card="c1"]') as HTMLElement
    fireEvent.pointerDown(cardEl, { button: 0 })
    unmount()
    act(() => void vi.advanceTimersByTime(1000))
    expect(onCaseActions).not.toHaveBeenCalled()
  })
})
