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
