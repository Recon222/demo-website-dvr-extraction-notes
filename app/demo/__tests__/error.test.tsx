import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DemoError from '@/app/demo/error'

// The /demo route-segment error boundary (parity review R-5): the branded outer net
// for throws ABOVE the in-frame DemoErrorBoundary (bridge view-model derivation).
describe('app/demo/error (route-segment outer net)', () => {
  it('renders the branded fallback with the error detail', () => {
    render(<DemoError error={new Error('bridge exploded')} reset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('bridge exploded')).toBeInTheDocument()
  })

  it('Try again invokes reset and takes focus on mount', () => {
    const reset = vi.fn()
    render(<DemoError error={new Error('boom')} reset={reset} />)
    const btn = screen.getByRole('button', { name: 'Try again' })
    expect(btn).toHaveFocus() // keyboard/SR users land on the only recovery control
    fireEvent.click(btn)
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
