import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { DemoNotification } from '@/features/demo/ui/screens/map/DemoNotification'

describe('DemoNotification', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders the message and auto-dismisses', () => {
    const onDismiss = vi.fn()
    render(<DemoNotification message="Calling isn't available in the demo." onDismiss={onDismiss} />)
    expect(screen.getByText(/Calling isn't available/)).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('clears its timer on unmount (no post-unmount dismiss)', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(<DemoNotification message="x" onDismiss={onDismiss} />)
    unmount()
    act(() => vi.advanceTimersByTime(5000))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
