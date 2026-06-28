import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DateTimeField } from '@/features/demo/ui/screens/_shared'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'

// The old datetime-local DateTimeField was replaced by the custom Date/Time picker
// (features/demo/ui/inputs/*). The canonical "seconds always present" guarantee now lives
// in engine/logic/datetime-parts (formatStored/mergeDate/mergeTime), exercised here at the
// _shared boundary.
beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('_shared.DateTimeField', () => {
  it('renders separate Date and Time buttons (no datetime-local input)', () => {
    const { container } = render(<DateTimeField label="Start" value="2025-03-08 23:45:00" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Set date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set time' })).toBeInTheDocument()
  })

  it('emits a canonical "YYYY-MM-DD HH:MM:SS" string (seconds always present) on edit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DateTimeField label="Start" value="2025-03-08 23:45:00" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '9' }))
    expect(onChange).toHaveBeenCalledWith('2025-03-09 23:45:00')
    expect(onChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})
