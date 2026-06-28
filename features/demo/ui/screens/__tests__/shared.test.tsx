import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateTimeField } from '@/features/demo/ui/screens/_shared'

describe('DateTimeField', () => {
  it('keeps canonical seconds — appends :00 when the picker omits them', () => {
    const onChange = vi.fn()
    render(<DateTimeField label="Start" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '2025-03-08T23:45' } })
    expect(onChange).toHaveBeenCalledWith('2025-03-08 23:45:00')
  })

  // Note: a seconds-bearing value (e.g. '…T23:45:30') passes through untouched (the length===16
  // guard only fires for minute-precision) — but jsdom strips seconds from datetime-local inputs,
  // so that path is browser-verified rather than unit-tested here.

  it('leaves a cleared value empty', () => {
    const onChange = vi.fn()
    render(<DateTimeField label="Start" value="2025-03-08 23:45:00" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Start'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
