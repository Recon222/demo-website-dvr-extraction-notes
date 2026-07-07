import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SheetHandle } from '@/features/demo/ui/screens/map/SheetHandle'

describe('SheetHandle', () => {
  it('list mode shows the count and a badge per non-zero status', () => {
    render(<SheetHandle contentMode="list" locationCount={3} statusCounts={{ started: 1, working: 2, complete: 0 }} />)
    expect(screen.getByText('3 Locations')).toBeInTheDocument()
    expect(screen.getByText(/1 Started/)).toBeInTheDocument()
    expect(screen.getByText(/2 Working/)).toBeInTheDocument()
    expect(screen.queryByText(/Complete/)).not.toBeInTheDocument() // 0 → hidden
  })

  it('uses the singular for one location', () => {
    render(<SheetHandle contentMode="list" locationCount={1} statusCounts={{ started: 1, working: 0, complete: 0 }} />)
    expect(screen.getByText('1 Location')).toBeInTheDocument()
  })

  it('detail mode shows "Location Details" and hides the badges', () => {
    render(<SheetHandle contentMode="detail" locationCount={3} statusCounts={{ started: 1, working: 2, complete: 0 }} />)
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    expect(screen.queryByText(/Started/)).not.toBeInTheDocument()
  })
})
