import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExitDialog } from '@/features/demo/ui/controls/ExitDialog'

const unseen = [
  { number: '05', label: 'Time Offset' },
  { number: '14', label: 'Case Map' },
]

describe('ExitDialog', () => {
  it('renders nothing when closed', () => {
    render(<ExitDialog open={false} unseen={unseen} leaveHref="/" onStay={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is a modal dialog listing the unseen items as numbered rows', () => {
    render(<ExitDialog open unseen={unseen} leaveHref="/" onStay={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText(/before you go/i)).toBeInTheDocument()
    expect(screen.getByText('05')).toBeInTheDocument()
    expect(screen.getByText('Time Offset')).toBeInTheDocument()
    expect(screen.getByText('Case Map')).toBeInTheDocument()
  })

  it('“Keep exploring” calls onStay', () => {
    const onStay = vi.fn()
    render(<ExitDialog open unseen={unseen} leaveHref="/" onStay={onStay} />)
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }))
    expect(onStay).toHaveBeenCalledOnce()
  })

  it('Escape and backdrop click also call onStay', () => {
    const onStay = vi.fn()
    render(<ExitDialog open unseen={unseen} leaveHref="/" onStay={onStay} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-exit-backdrop]') as HTMLElement)
    expect(onStay).toHaveBeenCalledTimes(2)
  })

  it('“Leave anyway” is a real link to leaveHref', () => {
    render(<ExitDialog open unseen={unseen} leaveHref="/" onStay={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Leave anyway' })).toHaveAttribute('href', '/')
  })
})
