import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaseMapPicker } from '@/features/demo/ui/screens/map/CaseMapPicker'

const cases = [
  { id: 'c1', caseNumber: 'PR25-1', displayName: 'Case One', locationCountLabel: '2 locations' },
  { id: 'c2', caseNumber: 'PR25-2', displayName: 'Case Two', locationCountLabel: '1 location' },
]

describe('CaseMapPicker', () => {
  it('renders a row per case and picks one', () => {
    const onPick = vi.fn()
    render(<CaseMapPicker cases={cases} dismissible onPick={onPick} onClose={vi.fn()} />)
    expect(screen.getByText('PR25-1')).toBeInTheDocument()
    expect(screen.getByText('PR25-2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Case One'))
    expect(onPick).toHaveBeenCalledWith('c1')
  })

  it('mandatory (non-dismissible): no close affordance, scrim click ignored', () => {
    const onClose = vi.fn()
    render(<CaseMapPicker cases={cases} dismissible={false} onPick={vi.fn()} onClose={onClose} />)
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('case-picker-scrim'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('dismissible: close button and scrim both close', () => {
    const onClose = vi.fn()
    render(<CaseMapPicker cases={cases} dismissible onPick={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('case-picker-scrim'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
