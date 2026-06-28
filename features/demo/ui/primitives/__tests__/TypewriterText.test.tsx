import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TypewriterText } from '@/features/demo/ui/primitives/TypewriterText'

describe('TypewriterText', () => {
  it('renders the full text when not animating', () => {
    render(<TypewriterText text="Kim's Convenience" active={false} />)
    expect(screen.getByText("Kim's Convenience")).toBeInTheDocument()
  })

  it('reveals characters progressively under fake timers', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(<TypewriterText text="Mississauga" active perCharMs={10} />)
      expect(container.textContent).toBe('')
      act(() => void vi.advanceTimersByTime(10))
      expect(container.textContent).toBe('M')
      act(() => void vi.advanceTimersByTime(30))
      expect(container.textContent).toBe('Miss')
      act(() => void vi.advanceTimersByTime(1000))
      expect(container.textContent).toBe('Mississauga')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows no per-keystroke caret dot', () => {
    const { container } = render(<TypewriterText text="abc" active={false} />)
    expect(container.textContent).toBe('abc') // exactly the text — no caret/cursor glyph appended
  })

  it('clears its typing interval on unmount', () => {
    vi.useFakeTimers()
    try {
      const { unmount } = render(<TypewriterText text="abcdef" active perCharMs={10} />)
      act(() => void vi.advanceTimersByTime(10))
      expect(vi.getTimerCount()).toBe(1) // the typing interval is live
      unmount()
      expect(vi.getTimerCount()).toBe(0) // cleared on unmount
    } finally {
      vi.useRealTimers()
    }
  })
})
