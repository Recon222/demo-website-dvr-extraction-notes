import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DemoError from '@/app/demo/error'
import { clearDemoSnapshot } from '@/features/demo'

// "Start fresh" loads clearDemoSnapshot through the feature barrel (dynamic import) —
// mock the barrel so these tests never pull the full demo module graph.
vi.mock('@/features/demo', () => ({ clearDemoSnapshot: vi.fn() }))

// The /demo route-segment error boundary (parity review R-5): the branded outer net
// for throws ABOVE the in-frame DemoErrorBoundary (bridge view-model derivation).
describe('app/demo/error (route-segment outer net)', () => {
  it('renders the branded fallback with the error detail', () => {
    render(<DemoError error={new Error('bridge exploded')} reset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('bridge exploded')).toBeInTheDocument()
  })

  it('Try again invokes reset (preserving the snapshot) and takes focus on mount', () => {
    const reset = vi.fn()
    render(<DemoError error={new Error('boom')} reset={reset} />)
    const btn = screen.getByRole('button', { name: 'Try again' })
    expect(btn).toHaveFocus() // keyboard/SR users land on the primary recovery control
    fireEvent.click(btn)
    expect(reset).toHaveBeenCalledTimes(1)
    // The transient-error path must NOT wipe the visitor's session.
    expect(vi.mocked(clearDemoSnapshot)).not.toHaveBeenCalled()
  })

  it('Start fresh clears the snapshot BEFORE resetting (the R-24 state-driven-throw escape)', async () => {
    const reset = vi.fn()
    render(<DemoError error={new Error('boom')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /Start fresh/ }))
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1))
    const clearMock = vi.mocked(clearDemoSnapshot)
    expect(clearMock).toHaveBeenCalledTimes(1)
    // Order matters: clearing after reset would rehydrate the throwing snapshot first.
    expect(clearMock.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0])
  })
})
