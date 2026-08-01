import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { NARRATION } from '@/features/demo/engine/content/narration'
import { AUTHORIZED_MS, FADE_MS, HOLD_MS, SCAN_MS } from '@/features/demo/engine/logic/boot'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
/**
 * Walk the gate from the tap to the app. One `act` per dwell — the next phase's timer is armed by
 * an effect — and, on drop-in day, one `ended` in the middle: with `BOOT_VIDEO` set the sequence
 * parks in `video` until the element says it finished, and a helper that only ticks would stall
 * there. Review R-17: this is the whole reason the drop-in is one constant and not one constant
 * plus three bridge-test edits.
 */
const runSequence = () => {
  tick(SCAN_MS)
  tick(AUTHORIZED_MS)
  const video = screen.queryByTestId('demo-boot-video')
  if (video) {
    fireEvent.ended(video)
    tick(HOLD_MS)
  }
  tick(FADE_MS)
}
const tapScanner = () => fireEvent.click(screen.getByRole('button', { name: 'Run the simulated biometric scan' }))
const railTitle = (name: string) => screen.queryByRole('heading', { level: 2, name })

/**
 * P8.1 — the boot gate at the bridge (matrix rows 1–2, decision D7).
 *
 * The sequence itself is covered in `screens/__tests__/BootSequence.test.tsx`. What is pinned
 * here is the thing that only the bridge can get wrong: boot is a GATE, not a view, so it must
 * hide the phone completely while it is up and hand back the position the snapshot restored —
 * never reset it.
 */
describe('DemoExperience — boot gate', { timeout: 20000 }, () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not boot unless the route asks for it', () => {
    render(<DemoExperience />)
    expect(screen.queryByTestId('demo-boot')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })

  it('covers the whole phone while it is up — no screen, no tab bar', () => {
    render(<DemoExperience boot />)
    expect(screen.getByTestId('demo-boot')).toBeInTheDocument()
    expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
    // The screen tree is not mounted behind it, so nothing is reachable underneath.
    expect(screen.queryByText(/No cases yet/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Dashboard' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cases' })).toBeNull()
  })

  it('lands a first-time visitor on Cases, with the tab bar back', () => {
    render(<DemoExperience boot />)
    tapScanner()
    runSequence()
    expect(screen.queryByTestId('demo-boot')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cases' })).toBeInTheDocument()
  })

  it('hands a returning visitor back the view their snapshot restored — boot resets nothing', () => {
    // A refresh is the demo's cold start: the phone re-runs its splash on every cold start too,
    // and its splash likewise leaves the app's own navigation alone.
    const store = createDemoStore()
    store.getState().setView('dashboard')

    render(<DemoExperience store={store} boot />)
    expect(screen.getByTestId('demo-boot')).toBeInTheDocument()

    tapScanner()
    runSequence()

    expect(screen.queryByTestId('demo-boot')).toBeNull()
    expect(store.getState().view).toBe('dashboard')
    expect(railTitle(NARRATION.dashboard.title)).toBeInTheDocument()
  })

  it('the rail narrates the splash chapter while the gate is up, then follows the screen', () => {
    const store = createDemoStore()
    store.getState().setView('dashboard')

    render(<DemoExperience store={store} boot />)
    expect(railTitle(NARRATION.splash.title)).toBeInTheDocument()
    expect(railTitle(NARRATION.dashboard.title)).toBeNull()

    tapScanner()
    runSequence()

    expect(railTitle(NARRATION.dashboard.title)).toBeInTheDocument()
    expect(railTitle(NARRATION.splash.title)).toBeNull()
  })

  it('a rail jump lifts the gate too — the checklist is outside the phone and stays clickable', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} boot />)
    expect(screen.getByTestId('demo-boot')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Dashboard, / }))

    expect(screen.queryByTestId('demo-boot')).toBeNull()
    expect(store.getState().view).toBe('dashboard')
    expect(railTitle(NARRATION.dashboard.title)).toBeInTheDocument()
  })

  it('hands focus to the revealed screen when the gate lifts (R-2)', () => {
    render(<DemoExperience boot />)
    const scanner = screen.getByRole('button', { name: 'Run the simulated biometric scan' })
    scanner.focus()

    tapScanner()
    runSequence()

    // Not <body>: the keyboard visitor who just passed the app's first interaction keeps their
    // place, and their next Tab starts inside the phone rather than at the top of the page.
    expect(document.activeElement).toBe(document.querySelector('[data-phone-screen]'))
  })

  it('SKIP gets the visitor straight in', () => {
    render(<DemoExperience boot />)
    fireEvent.click(screen.getByRole('button', { name: 'SKIP' }))
    expect(screen.queryByTestId('demo-boot')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })
})
