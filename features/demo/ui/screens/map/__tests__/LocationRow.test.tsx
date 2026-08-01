import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { sheetIncident, sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'

const locItem = sheetLocation({
  businessName: 'Kim', address: '1450 Eglinton, Mississauga',
  streetAddress: '1450 Eglinton', city: 'Mississauga',
})
const incItem = sheetIncident({
  displayName: 'Kim B&E', businessName: 'Kim',
  streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.6, 43.6],
})

describe('LocationRow', () => {
  it('location variant renders name + business + address and selects on press', () => {
    const onSelect = vi.fn()
    render(<LocationRow item={locItem} selected={false} onSelect={onSelect} />)
    expect(screen.getByText('Rear door')).toBeInTheDocument()
    expect(screen.getByText('1450 Eglinton, Mississauga')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Rear door'))
    expect(onSelect).toHaveBeenCalledWith('l1')
  })

  it('incident variant renders the headline + an "Incident" chip', () => {
    render(<LocationRow item={incItem} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('Kim B&E')).toBeInTheDocument()
    expect(screen.getByText('Incident')).toBeInTheDocument()
  })
})
