import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaseMapPicker } from '@/features/demo/ui/screens/map/CaseMapPicker'

const cases = [
  { id: 'c1', caseNumber: 'PR25-1', displayName: 'Case One', locationCountLabel: '2 locations', status: 'draft' as const },
  { id: 'c2', caseNumber: 'PR25-2', displayName: 'Case Two', locationCountLabel: '1 location', status: 'complete' as const },
]

function renderPicker(over: Partial<Parameters<typeof CaseMapPicker>[0]> = {}) {
  const props = { cases, dismissible: true, preselectedId: null, onPick: vi.fn(), onClose: vi.fn(), ...over }
  render(<CaseMapPicker {...props} />)
  return props
}

describe('CaseMapPicker (full-screen)', () => {
  it('renders the "Pick a Case" header and a row per case, and picks one', () => {
    const props = renderPicker()
    expect(screen.getByText('Pick a Case')).toBeInTheDocument()
    expect(screen.getByText('PR25-1')).toBeInTheDocument()
    expect(screen.getByText('Case Two')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Case One'))
    expect(props.onPick).toHaveBeenCalledWith('c1')
  })

  it('shows a disabled "All Cases — coming soon" row that does not pick', () => {
    const props = renderPicker()
    const allCases = screen.getByText('All Cases')
    expect(allCases).toBeInTheDocument()
    fireEvent.click(allCases)
    expect(props.onPick).not.toHaveBeenCalled()
  })

  it('mandatory (non-dismissible) renders no Cancel button', () => {
    renderPicker({ dismissible: false })
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('dismissible renders a Cancel button that closes', () => {
    const props = renderPicker({ dismissible: true })
    fireEvent.click(screen.getByText('Cancel'))
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('marks the preselected case row as selected', () => {
    renderPicker({ preselectedId: 'c2' })
    expect(screen.getByTestId('case-row-c2')).toHaveAttribute('data-selected', 'true')
    expect(screen.getByTestId('case-row-c1')).toHaveAttribute('data-selected', 'false')
  })

  it('shows an empty state when there are no cases', () => {
    renderPicker({ cases: [] })
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })
})
