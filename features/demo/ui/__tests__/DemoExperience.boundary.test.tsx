import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

// The Dashboard screen is mocked to throw on render: booting on Cases (which works)
// and tapping the Dashboard tab exercises the boundary through real navigation.
vi.mock('@/features/demo/ui/screens/DashboardScreen', () => ({
  DashboardScreen: () => {
    throw new Error('dashboard exploded')
  },
}))

describe('DemoExperience — error boundary wiring', () => {
  // React logs every caught render error via console.error (onCaughtError default).
  // Silence it for these deliberately-throwing tests; restore after each.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Generous timeouts: the first full-experience render is heavy under jsdom and this
  // suite runs alongside sibling parity agents' suites (CPU contention, not a loop —
  // the later tests repeat the same interaction well inside the default timeout).
  it('a throwing screen shows the fallback inside the frame; the frame and rail survive', { timeout: 20000 }, () => {
    render(<DemoExperience />)
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('dashboard exploded')
    // The fallback renders INSIDE the phone screen slot, not in place of the frame.
    const phoneScreen = document.querySelector('[data-phone-screen]')
    expect(phoneScreen?.contains(alert)).toBe(true)
    // Frame chrome and the narration rail are untouched.
    expect(document.querySelector('[data-phone="frame"]')).toBeTruthy()
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
  })

  it('Return to Cases recovers to the working Cases screen', { timeout: 20000 }, () => {
    render(<DemoExperience />)
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Return to Cases' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })

  it('navigating to another view (tab bar survives the error) resets the boundary', { timeout: 20000 }, () => {
    render(<DemoExperience />)
    fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    // The tab bar lives outside the boundary, so it stays interactive during the error.
    fireEvent.click(screen.getByRole('button', { name: 'Cases' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })
})
