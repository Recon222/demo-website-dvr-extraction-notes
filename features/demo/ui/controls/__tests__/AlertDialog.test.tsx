import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'

describe('AlertDialog — the in-phone blocking alert (Alert.alert analog)', () => {
  it('announces itself as an alertdialog carrying the title and body', () => {
    render(
      <AlertDialog
        title="Missing Required Fields"
        message={'OCC number is required\nAddress is required'}
        actions={[{ label: 'OK', onPress: vi.fn() }]}
        onDismiss={vi.fn()}
      />,
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Missing Required Fields' })
    expect(dialog).toBeInTheDocument()
    // Both lines of a '\n'-joined Alert.alert message survive as one described-by body.
    const bodyId = dialog.getAttribute('aria-describedby')!
    const body = document.getElementById(bodyId)!
    expect(body.textContent).toBe('OCC number is required\nAddress is required')
    // …and are rendered as separate lines, not run together.
    expect(body).toHaveStyle({ whiteSpace: 'pre-line' })
  })

  it('renders every action and calls the one that was pressed, only that one', () => {
    const cancel = vi.fn()
    const save = vi.fn()
    render(
      <AlertDialog
        title="Missing Required Fields"
        message="body"
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: cancel },
          { label: 'Save Progress', onPress: save },
        ]}
        onDismiss={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save Progress' }))
    expect(save).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })

  it('takes focus on mount so a screen reader hears the whole alert (R-17 idiom)', () => {
    render(
      <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
    )
    expect(document.activeElement).toBe(screen.getByRole('alertdialog'))
  })

  it('returns focus to the opener when it closes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(
      <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
    )
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  /**
   * D-2. The regression this closes: a control that disables itself on activation (the map's
   * Export Map in-flight belt; ExportHub's footer CTA) is non-focusable in the same commit that
   * mounts the dialog, HTML's focus fixup moves focus to `<body>` BEFORE React's passive
   * effects, and the old `document.activeElement` read therefore captured `<body>` as opener —
   * so dismissing dropped a keyboard visitor at document start.
   */
  describe('the opener is captured at gesture time, not at mount', () => {
    function selfDisablingOpener() {
      const opener = document.createElement('button')
      opener.textContent = 'Export Map'
      document.body.appendChild(opener)
      opener.focus()
      // The activation, in order: capture-phase pointerdown fires FIRST, then the handler
      // disables the control, and the focus fixup drops focus to <body>.
      fireEvent.pointerDown(opener)
      // jsdom refuses to blur an already-disabled element, so the two writes are ordered the
      // other way round here; the observable end state — disabled control, focus on <body> —
      // is the one a browser reaches.
      opener.blur()
      opener.disabled = true
      return opener
    }

    it('restores to the control that was pressed, not to <body>', () => {
      const opener = selfDisablingOpener()
      expect(document.activeElement).toBe(document.body) // the state the old read captured

      const { unmount } = render(
        <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
      )
      opener.disabled = false // the run finished; the in-flight belt cleared in its `finally`

      unmount()
      expect(document.activeElement).toBe(opener)
      expect(document.activeElement).not.toBe(document.body)
      opener.remove()
    })

    it('still leaves focus alone if the control is disabled when the dialog closes', () => {
      const opener = selfDisablingOpener()
      const { unmount } = render(
        <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
      )
      unmount() // still disabled — forcing focus onto it would be a no-op the browser rejects
      expect(document.activeElement).not.toBe(opener)
      opener.remove()
    })

    it('leaves focus alone when the pressed control is gone by dismiss time', () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      fireEvent.pointerDown(opener)
      const { unmount } = render(
        <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
      )
      opener.remove() // e.g. the row it lived on was deleted by the very action that alerted
      expect(() => unmount()).not.toThrow()
    })

    it('ignores a stale origin from an earlier interaction', () => {
      const gone = document.createElement('button')
      document.body.appendChild(gone)
      fireEvent.pointerDown(gone)
      gone.remove()

      // Nothing was pressed for THIS dialog, so it falls back to whatever holds focus.
      const current = document.createElement('button')
      document.body.appendChild(current)
      current.focus()
      const { unmount } = render(
        <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />,
      )
      unmount()
      expect(document.activeElement).toBe(current)
      current.remove()
    })
  })

  it('Escape dismisses; clicking the scrim does NOT — it is a blocking alert', () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={onDismiss} />,
    )
    fireEvent.click(container.querySelector('[data-alert-scrim]')!)
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('styles a destructive action apart from the others (RN Alert button styles)', () => {
    render(
      <AlertDialog
        title="T"
        message="m"
        actions={[
          { label: 'Cancel', style: 'cancel', onPress: vi.fn() },
          { label: 'Discard', style: 'destructive', onPress: vi.fn() },
        ]}
        onDismiss={vi.fn()}
      />,
    )
    const discard = screen.getByRole('button', { name: 'Discard' })
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(discard.style.color).not.toBe(cancel.style.color)
  })

  it('stacks 3+ actions into a column (the iOS multi-option shape); 2 stay side-by-side (R-5)', () => {
    const three = [
      { label: 'Keep', onPress: vi.fn() },
      { label: 'Replace', style: 'destructive' as const, onPress: vi.fn() },
      { label: 'Cancel', style: 'cancel' as const, onPress: vi.fn() },
    ]
    const { unmount } = render(<AlertDialog title="T" message="m" actions={three} onDismiss={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Keep' }).parentElement?.style.flexDirection).toBe('column')
    unmount()
    render(<AlertDialog title="T" message="m" actions={three.slice(0, 2)} onDismiss={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Keep' }).parentElement?.style.flexDirection).not.toBe('column')
  })
})
