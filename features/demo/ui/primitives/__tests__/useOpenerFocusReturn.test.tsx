import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { useRef } from 'react'

import { useOpenerFocusReturn } from '@/features/demo/ui/primitives/useOpenerFocusReturn'

/**
 * W3 rider F80 — the hook's own suite. It has four callers (`CentredDialog`, `MediaLibrarySheet`'s
 * fullscreen layer, `ExportActionSheet`, `PdfPreview`) and, until this file, no direct test: every
 * assertion on it went through a consumer, which is why the staleness gap was invisible.
 *
 * The finding: `isConnected` proves an element still EXISTS, not that the gesture which set
 * `activationOrigin` raised THIS overlay. The fix makes the capture single-use.
 */

/** A minimal overlay: takes focus on mount, hands it back on unmount. */
function Layer({ testId }: { testId: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useOpenerFocusReturn(ref)
  return <div ref={ref} tabIndex={-1} data-testid={testId} />
}

function Harness({ first, second }: { first: boolean; second: boolean }) {
  return (
    <>
      <button type="button">opener</button>
      <button type="button">unrelated</button>
      {first && <Layer testId="first" />}
      {second && <Layer testId="second" />}
    </>
  )
}

describe('useOpenerFocusReturn — the gesture origin is SINGLE-USE (F80)', () => {
  /**
   * MUTATION: delete `activationOrigin = null` from the mount effect (the pre-rider state).
   *
   * Then BOTH layers capture the same button, and dismissing the second yanks focus out of the
   * still-open first — the stacked `AlertDialog`-over-confirmation case `DemoExperience` actually
   * renders. With the fix the second layer falls back to `document.activeElement`, which is the
   * first layer's own panel.
   */
  it('does not let a second overlay claim the first overlay’s opener', () => {
    const { rerender } = render(<Harness first={false} second={false} />)
    const opener = screen.getByRole('button', { name: 'opener' })
    opener.focus()
    fireEvent.pointerDown(opener)

    rerender(<Harness first second={false} />)
    expect(document.activeElement).toBe(screen.getByTestId('first'))

    // No new gesture — the second layer is raised by a state change, exactly as an alert is.
    rerender(<Harness first second />)
    expect(document.activeElement).toBe(screen.getByTestId('second'))

    // Dismiss the SECOND only. Focus must return to the layer still on screen, not to the button
    // behind it.
    rerender(<Harness first second={false} />)
    expect(document.activeElement).toBe(screen.getByTestId('first'))
    expect(document.activeElement).not.toBe(opener)

    // ...and the first still holds the real opener, so the whole stack unwinds correctly.
    rerender(<Harness first={false} second={false} />)
    expect(document.activeElement).toBe(opener)
  })

  /**
   * The other half of the same claim: a gesture on an UNRELATED, still-connected control must not
   * become the opener of an overlay raised later with no gesture of its own. `isConnected` cannot
   * tell those apart, which is precisely F80.
   *
   * MUTATION: the same deletion. Without it the stale `unrelated` button wins over live focus.
   */
  it('falls back to live focus when the last gesture was not this overlay’s (F80)', () => {
    const { rerender } = render(<Harness first={false} second={false} />)
    const unrelated = screen.getByRole('button', { name: 'unrelated' })
    const opener = screen.getByRole('button', { name: 'opener' })

    // A gesture that opens nothing, and is CONSUMED by the layer it does raise.
    fireEvent.pointerDown(unrelated)
    rerender(<Harness first second={false} />)
    rerender(<Harness first={false} second={false} />)

    // Now focus sits on a different control and a layer mounts with no gesture at all.
    opener.focus()
    rerender(<Harness first={false} second />)
    rerender(<Harness first={false} second={false} />)

    expect(document.activeElement).toBe(opener)
    expect(document.activeElement).not.toBe(unrelated)
  })

  /** The behaviour F64 bought, re-pinned here at the hook rather than only at a consumer: an
   *  opener blurred by its own activation (a self-disabling control) still gets focus back. */
  it('still returns focus to an opener that lost it before the layer mounted', () => {
    const { rerender } = render(<Harness first={false} second={false} />)
    const opener = screen.getByRole('button', { name: 'opener' })
    opener.focus()

    fireEvent.pointerDown(opener)
    opener.blur()
    expect(document.activeElement).toBe(document.body)

    rerender(<Harness first second={false} />)
    rerender(<Harness first={false} second={false} />)

    expect(document.activeElement).toBe(opener)
  })
})
