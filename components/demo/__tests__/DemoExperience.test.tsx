import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NARRATION } from '@/lib/demo/content/narration'

const { searchParams } = vi.hoisted(() => ({
  searchParams: { get: vi.fn<(k: string) => string | null>(() => null) },
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

const { runBeat, cancelSpy } = vi.hoisted(() => {
  const cancelSpy = vi.fn()
  return {
    cancelSpy,
    runBeat: vi.fn(() => ({ cancel: cancelSpy, done: Promise.resolve(undefined), warnings: [], degraded: false })),
  }
})
vi.mock('@/lib/demo/director/runner', () => ({ runBeat, realClock: {} }))

import { DemoExperience } from '@/components/demo/DemoExperience'

beforeEach(() => {
  searchParams.get.mockReset()
  searchParams.get.mockReturnValue(null)
  runBeat.mockClear()
  cancelSpy.mockClear()
})

describe('DemoExperience', () => {
  it('starts in guided mode by default and locks the phone', () => {
    render(<DemoExperience />)
    expect(screen.getByRole('button', { name: 'Start the tour' })).toBeInTheDocument()
    expect((document.querySelector('[data-phone-screen]') as HTMLElement).style.pointerEvents).toBe('none')
  })

  it('renders the active screen inside the phone (splash for the splash view)', () => {
    render(<DemoExperience />)
    expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument() // the SplashScreen, in the phone
  })

  it('honors ?mode=sandbox (interactive phone + driving callout)', () => {
    searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null))
    render(<DemoExperience />)
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
    expect((document.querySelector('[data-phone-screen]') as HTMLElement).style.pointerEvents).toBe('auto')
  })

  it('does not run the director in sandbox mode', () => {
    searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null))
    render(<DemoExperience />)
    expect(runBeat).not.toHaveBeenCalled()
  })

  it('honors ?step=time-offset by showing that chapter’s real narration title', () => {
    searchParams.get.mockImplementation((k) => (k === 'step' ? 'time-offset' : null))
    render(<DemoExperience />)
    expect(screen.getByRole('heading', { level: 2, name: NARRATION.timeOffset.title })).toBeInTheDocument()
    expect(screen.queryByText(NARRATION.splash.title)).toBeNull()
  })

  it('advances the chapter and triggers the director on Rail Next', () => {
    render(<DemoExperience />)
    runBeat.mockClear() // ignore the splash beat fired on mount
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    expect(runBeat).toHaveBeenCalled()
  })

  it('cancels the director on unmount', () => {
    const { unmount } = render(<DemoExperience />)
    cancelSpy.mockClear()
    unmount()
    expect(cancelSpy).toHaveBeenCalled()
  })
})
