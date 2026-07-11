import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExploreChecklist } from '@/features/demo/ui/controls/ExploreChecklist'
import type { ExploreStatus } from '@/features/demo/engine/store/selectors'

const items: ExploreStatus[] = [
  { id: 'dashboard', number: '01', label: 'Dashboard', visited: false, active: false, jumpTo: 'dashboard' },
  { id: 'cases', number: '02', label: 'Cases & Locations', visited: true, active: true, jumpTo: 'cases' },
  { id: 'map', number: '03', label: 'Case Map', visited: false, active: false, jumpTo: 'map' },
]

describe('ExploreChecklist', () => {
  it('renders one numbered row per item, in registry order', () => {
    render(<ExploreChecklist items={items} onJump={vi.fn()} />)
    const rows = screen.getAllByRole('button')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('01')
    expect(rows[0]).toHaveTextContent('Dashboard')
    expect(rows[2]).toHaveTextContent('Case Map')
  })

  it('announces visited state via aria-label (LED dots are decoration)', () => {
    render(<ExploreChecklist items={items} onJump={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Cases & Locations, visited' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dashboard, not visited yet' })).toBeInTheDocument()
  })

  it('clicking a row jumps to its target view', () => {
    const onJump = vi.fn()
    render(<ExploreChecklist items={items} onJump={onJump} />)
    fireEvent.click(screen.getByRole('button', { name: /Case Map/ }))
    expect(onJump).toHaveBeenCalledWith('map')
  })

  it('shows the explored count and exactly one lit LED / active marker', () => {
    const { container } = render(<ExploreChecklist items={items} onJump={vi.fn()} />)
    expect(screen.getByText(/1\/3 explored/i)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-led="on"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-explore-active]')).toHaveLength(1)
  })
})
