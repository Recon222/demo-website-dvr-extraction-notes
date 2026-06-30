import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CallConfirmSheet } from '@/features/demo/ui/screens/map/CallConfirmSheet'

describe('CallConfirmSheet', () => {
  it('shows the number and confirms / cancels', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<CallConfirmSheet number="905-555-0142" onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByText(/905-555-0142/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Call'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
