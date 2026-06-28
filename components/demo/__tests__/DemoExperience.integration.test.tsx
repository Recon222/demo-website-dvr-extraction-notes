import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { createDemoStore } from '@/lib/demo/store/create-store'

// NOTE: runBeat is deliberately NOT mocked here — these tests drive the real director so the
// launch/closeLaunch round-trip runs. This is what catches the view-oscillation regression.
const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

import { DemoExperience } from '@/components/demo/DemoExperience'

beforeEach(() => {
  vi.useFakeTimers()
  searchParams.get.mockReset()
  searchParams.get.mockReturnValue(null)
})
afterEach(() => {
  vi.useRealTimers()
})

describe('DemoExperience — director integration (un-mocked runBeat)', () => {
  it('plays the timeOffset beat through to calculateOffset without oscillating', async () => {
    searchParams.get.mockImplementation((k) => (k === 'step' ? 'time-offset' : null))
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    await act(async () => {
      await vi.runAllTimersAsync() // would hang/throw on the oscillation loop
    })
    const s = store.getState()
    const loc = s.locations.find((l) => l.id === s.currentLocationId)
    expect(loc?.form.timeOffset?.formattedDifference).toBeTruthy() // the marquee payoff ran
    expect(s.capture.sync?.method).toBe('NTP') // the scripted atomic-clock sync drives the card
    expect(s.currentChapter).toBe('timeOffset')
    expect(s.view).toBe('timeOffset') // settled (closeLaunch → currentChapter), not stuck on 'ocr'
  })

  it('fires a touch pulse during a beat and clears it after the timeout', async () => {
    const store = createDemoStore()
    const { container } = render(<DemoExperience store={store} />) // splash beat taps 'scanner'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(container.querySelectorAll('[data-pulse]').length).toBeGreaterThan(0)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(container.querySelectorAll('[data-pulse]').length).toBe(0) // cleared after 650 ms
  })

  it('cancels the beat and clears all timers on unmount mid-beat (no leak)', async () => {
    const store = createDemoStore()
    const { unmount } = render(<DemoExperience store={store} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
    expect(() => unmount()).not.toThrow()
    expect(vi.getTimerCount()).toBe(0)
  })
})
