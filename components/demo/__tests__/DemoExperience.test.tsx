import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const { searchParams } = vi.hoisted(() => ({ searchParams: { get: vi.fn<(k: string) => string | null>(() => null) } }))
vi.mock('next/navigation', () => ({ useSearchParams: () => searchParams }))

const { runBeat } = vi.hoisted(() => ({
  runBeat: vi.fn(() => ({ cancel: vi.fn(), done: Promise.resolve(undefined), warnings: [], degraded: false })),
}))
vi.mock('@/lib/demo/director/runner', () => ({ runBeat, realClock: {} }))

import { DemoExperience } from '@/components/demo/DemoExperience'

beforeEach(() => {
  searchParams.get.mockReset()
  searchParams.get.mockReturnValue(null)
  runBeat.mockClear()
})

describe('DemoExperience', () => {
  it('starts in guided mode by default and locks the phone', () => {
    render(<DemoExperience />)
    expect(screen.getByRole('button', { name: 'Start the tour' })).toBeInTheDocument()
    expect((document.querySelector('[data-phone-screen]') as HTMLElement).style.pointerEvents).toBe('none')
  })

  it('honors ?mode=sandbox (interactive phone + driving callout)', () => {
    searchParams.get.mockImplementation((k) => (k === 'mode' ? 'sandbox' : null))
    render(<DemoExperience />)
    expect(screen.getByText(/You.re driving/)).toBeInTheDocument()
    expect((document.querySelector('[data-phone-screen]') as HTMLElement).style.pointerEvents).toBe('auto')
  })

  it('honors ?step=time-offset (jumps past the splash chapter)', () => {
    searchParams.get.mockImplementation((k) => (k === 'step' ? 'time-offset' : null))
    render(<DemoExperience />)
    expect(screen.queryByText('Biometric lock')).toBeNull() // not on splash anymore
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('advances the chapter and triggers the director on Rail Next', () => {
    render(<DemoExperience />)
    runBeat.mockClear() // ignore the splash beat fired on mount
    fireEvent.click(screen.getByRole('button', { name: 'Start the tour' }))
    expect(runBeat).toHaveBeenCalled()
  })
})
