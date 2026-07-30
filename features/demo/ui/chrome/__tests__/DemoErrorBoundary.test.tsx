import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DemoErrorBoundary } from '@/features/demo/ui/chrome/DemoErrorBoundary'

/** Renders fine when disarmed; throws during render when armed. */
function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error('boom')
  return <div>all good</div>
}

/** Same, but throws a non-Error value (React boundaries catch those too). */
function StringBomb(): never {
  // Deliberately a non-Error throw — boundaries must normalize these too.
  // eslint-disable-next-line no-throw-literal
  throw 'plain string failure'
}

describe('DemoErrorBoundary', () => {
  // React logs every caught render error via console.error (onCaughtError default).
  // Silence it for these deliberately-throwing tests; restore after each.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <DemoErrorBoundary view="cases" onReturnToCases={vi.fn()}>
        <Bomb armed={false} />
      </DemoErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a throwing child renders the glass fallback with the generic copy and the error detail', () => {
    render(
      <DemoErrorBoundary view="cases" onReturnToCases={vi.fn()}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    expect(alert).toHaveTextContent('This screen hit an unexpected error — your session data is still here.')
    expect(alert).toHaveTextContent('boom')
    expect(screen.getByRole('button', { name: 'Return to Cases' })).toBeInTheDocument()
  })

  it('launch flows get the phone route-fallback copy (OCR / media / audio)', () => {
    const { rerender } = render(
      <DemoErrorBoundary view="ocr" onReturnToCases={vi.fn()}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('An unexpected error occurred during OCR capture')

    // A view change resets the boundary, so the still-armed bomb is re-caught
    // under the next view and shows that view's copy.
    rerender(
      <DemoErrorBoundary view="mediaCapture" onReturnToCases={vi.fn()}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('An unexpected error occurred during media capture')

    rerender(
      <DemoErrorBoundary view="audioRecording" onReturnToCases={vi.fn()}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'An unexpected error occurred during audio recording. Please try again.',
    )
  })

  it('normalizes a non-Error throw into the detail line', () => {
    render(
      <DemoErrorBoundary view="cases" onReturnToCases={vi.fn()}>
        <StringBomb />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('plain string failure')
  })

  it('Return to Cases fires the bridge callback and re-renders the (recovered) children', () => {
    const onReturnToCases = vi.fn()
    const { rerender } = render(
      <DemoErrorBoundary view="cases" onReturnToCases={onReturnToCases}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    // Disarm the child while the boundary is still in its error state: the fallback
    // must persist (children are not rendered) until an explicit reset.
    rerender(
      <DemoErrorBoundary view="cases" onReturnToCases={onReturnToCases}>
        <Bomb armed={false} />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Return to Cases' }))
    expect(onReturnToCases).toHaveBeenCalledTimes(1)
    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('resets on view change (derived state, no key remount) and recovers to a working screen', () => {
    const { rerender } = render(
      <DemoErrorBoundary view="cases" onReturnToCases={vi.fn()}>
        <Bomb armed />
      </DemoErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <DemoErrorBoundary view="dashboard" onReturnToCases={vi.fn()}>
        <Bomb armed={false} />
      </DemoErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
