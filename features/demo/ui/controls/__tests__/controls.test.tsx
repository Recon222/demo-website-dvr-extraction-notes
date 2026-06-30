import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '@/features/demo/ui/controls/TabBar'
import { WizardDrawer, type DrawerItem } from '@/features/demo/ui/controls/WizardDrawer'
import { RailNav } from '@/features/demo/ui/controls/RailNav'

describe('TabBar', () => {
  it('renders the three tabs and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<TabBar active="cases" onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('Dashboard'))
    expect(onSelect).toHaveBeenCalledWith('dashboard')
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
  })
})

describe('WizardDrawer', () => {
  const items: DrawerItem[] = [
    { id: 'submission', label: 'Submission', active: true },
    { id: 'timeOffset', label: 'Time Offset', active: false },
  ]

  it('renders nothing when closed', () => {
    const { container } = render(<WizardDrawer open={false} items={items} onClose={vi.fn()} onNavigate={vi.fn()} onBackToCases={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('lists the items and calls onNavigate when open', () => {
    const onNavigate = vi.fn()
    render(<WizardDrawer open items={items} onClose={vi.fn()} onNavigate={onNavigate} onBackToCases={vi.fn()} />)
    expect(screen.getByText('Submission')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Time Offset'))
    expect(onNavigate).toHaveBeenCalledWith('timeOffset')
  })

  it('calls onBackToCases / onClose', () => {
    const onBackToCases = vi.fn()
    const onClose = vi.fn()
    render(<WizardDrawer open items={items} onClose={onClose} onNavigate={vi.fn()} onBackToCases={onBackToCases} />)
    fireEvent.click(screen.getByText('Back to Cases'))
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onBackToCases).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<WizardDrawer open items={items} onClose={onClose} onNavigate={vi.fn()} onBackToCases={vi.fn()} />)
    fireEvent.click(container.querySelector('[data-drawer-backdrop]')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders completion dots from item status (complete/partial; none when absent)', () => {
    const withDots: DrawerItem[] = [
      { id: 'submission', label: 'Submission', active: true, status: 'complete' },
      { id: 'timeOffset', label: 'Time Offset', active: false, status: 'partial' },
      { id: 'dvrInfo', label: 'DVR', active: false },
    ]
    const { container } = render(<WizardDrawer open items={withDots} onClose={vi.fn()} onNavigate={vi.fn()} onBackToCases={vi.fn()} />)
    expect(container.querySelector('[data-dot="complete"]')).toBeTruthy()
    expect(container.querySelector('[data-dot="partial"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(2) // dvrInfo (no status) → no dot
    // status is announced via aria-label, not colour alone (M1)
    expect(screen.getByRole('button', { name: /Submission, complete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Time Offset, partially complete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DVR' })).toBeInTheDocument() // no status → label only
  })
})

describe('RailNav', () => {
  it('renders Back as a real disabled button when there is no prior step', () => {
    render(<RailNav canPrev={false} nextLabel="Next" onPrev={vi.fn()} onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('enables Back and fires both callbacks', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(<RailNav canPrev nextLabel="Next" onPrev={onPrev} onNext={onNext} />)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPrev).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })
})
