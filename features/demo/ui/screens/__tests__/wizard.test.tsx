import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubmissionScreen } from '@/features/demo/ui/screens/SubmissionScreen'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { ArrivalDepartureScreen } from '@/features/demo/ui/screens/ArrivalDepartureScreen'

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

describe('SubmissionScreen', () => {
  const fields = {
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    businessName: '',
    streetAddress: '',
    city: '',
    locationContact: '',
    locationPhone: '',
  }
  it('shows the occ number, edits a field, and advances', () => {
    const onChange = vi.fn()
    const onNext = vi.fn()
    render(<SubmissionScreen occNumber="PR25-0098213" fields={fields} onChange={onChange} {...nav} onNext={onNext} />)
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Requester Name'), { target: { value: 'Liam' } })
    expect(onChange).toHaveBeenCalledWith('requesterName', 'Liam')
    fireEvent.click(screen.getByText('Next: Requested Scope'))
    expect(onNext).toHaveBeenCalledOnce()
  })
})

describe('RequestedScopeScreen', () => {
  const scope = { id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3,4,7' }
  it('switches time type, edits cameras, and adds a scope', () => {
    const onChange = vi.fn()
    const onAdd = vi.fn()
    render(<RequestedScopeScreen scopes={[scope]} onChange={onChange} onAdd={onAdd} onRemove={vi.fn()} {...nav} />)
    fireEvent.click(screen.getByText('DVR Time'))
    expect(onChange).toHaveBeenCalledWith(0, { isActualTime: false })
    fireEvent.change(screen.getByLabelText('Cameras'), { target: { value: '1,2' } })
    expect(onChange).toHaveBeenCalledWith(0, { cameras: '1,2' })
    fireEvent.click(screen.getByText('+ Add Scope'))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('fires onRemove for the right index when more than one scope is present', () => {
    const onRemove = vi.fn()
    const scopes = [scope, { ...scope, id: 's2' }]
    render(<RequestedScopeScreen scopes={scopes} onChange={vi.fn()} onAdd={vi.fn()} onRemove={onRemove} {...nav} />)
    const removes = screen.getAllByText('Remove')
    expect(removes).toHaveLength(2)
    fireEvent.click(removes[1])
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})

describe('ArrivalDepartureScreen', () => {
  it('renders the empty state and adds a visit', () => {
    const onAdd = vi.fn()
    render(<ArrivalDepartureScreen visits={[]} onChange={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} {...nav} />)
    expect(screen.getByText(/No visits recorded/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('+ Add Visit'))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('removes the right visit by index', () => {
    const onRemove = vi.fn()
    const visits = [
      { id: 'v1', arrival: '', departure: '' },
      { id: 'v2', arrival: '', departure: '' },
    ]
    render(<ArrivalDepartureScreen visits={visits} onChange={vi.fn()} onAdd={vi.fn()} onRemove={onRemove} {...nav} />)
    fireEvent.click(screen.getAllByText('Remove')[1])
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})
