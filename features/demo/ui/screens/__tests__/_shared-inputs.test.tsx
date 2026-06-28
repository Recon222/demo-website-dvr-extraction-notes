import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SelectField, DateTimeField } from '@/features/demo/ui/screens/_shared'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import type { DvrInformation, ScopeEntry } from '@/features/demo/engine/types'

beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

describe('_shared.SelectField', () => {
  it('renders the custom Dropdown, not a native <select>', () => {
    const { container } = render(<SelectField label="Resolution" value="" onChange={vi.fn()} options={['1080p', '4K']} />)
    expect(container.querySelector('select')).toBeNull()
    expect(screen.getByRole('button', { name: 'Resolution' })).toBeInTheDocument()
  })
})

describe('_shared.DateTimeField', () => {
  it('renders two buttons (Date/Time), not a datetime-local input', () => {
    const { container } = render(<DateTimeField label="Start" value="2025-03-08 10:20:30" onChange={vi.fn()} />)
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Set date' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set time' })).toBeInTheDocument()
  })
})

describe('screen integration (smoke)', () => {
  it('RequestedScopeScreen renders Date/Time buttons for each scope', () => {
    const scopes: ScopeEntry[] = [
      { id: 's1', startDateTime: '2025-03-08 10:00:00', endDateTime: '2025-03-08 11:00:00', isActualTime: true, cameras: '1,2' },
    ]
    const { container } = render(
      <RequestedScopeScreen
        scopes={scopes}
        onChange={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onMenu={vi.fn()}
      />,
    )
    expect(container.querySelector('input[type="datetime-local"]')).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Set date' })).toHaveLength(2) // start + end
    expect(screen.getAllByRole('button', { name: 'Set time' })).toHaveLength(2)
  })

  it('DvrInfoScreen renders custom dropdowns + a First Recorded Date picker (not a retention text field)', () => {
    const dvr: DvrInformation = {
      dvrLocation: '', dvrTypeBrand: '', serialModelNumber: '', dvrUsername: '', dvrPassword: '',
      numberOfChannels: '', activeCameras: '', recordingSchedule: '', resolution: '', recordingFps: '', firstRecordedDate: '', totalDvrRetention: '',
    }
    const { container } = render(
      <DvrInfoScreen dvr={dvr} retention={{ totalRetention: null, scopes: [] }} onChange={vi.fn()} onNext={vi.fn()} onBack={vi.fn()} onMenu={vi.fn()} />,
    )
    expect(container.querySelector('select')).toBeNull()
    expect(screen.getByRole('button', { name: 'Resolution' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recording FPS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set date' })).toBeInTheDocument() // First Recorded Date
    expect(screen.getByText(/calculate total retention/i)).toBeInTheDocument() // empty-state prompt
  })

  it('DvrInfoScreen shows the derived total + per-scope retention when provided', () => {
    const dvr: DvrInformation = {
      dvrLocation: '', dvrTypeBrand: '', serialModelNumber: '', dvrUsername: '', dvrPassword: '',
      numberOfChannels: '', activeCameras: '', recordingSchedule: '', resolution: '', recordingFps: '', firstRecordedDate: '2025-03-03 00:00:00', totalDvrRetention: '40 days',
    }
    render(
      <DvrInfoScreen
        dvr={dvr}
        retention={{ totalRetention: 40, scopes: [{ label: 'Scope 1', daysUntilOverwritten: 5, overwrittenDate: '2025-04-17' }] }}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onMenu={vi.fn()}
      />,
    )
    expect(screen.getByText('40 days')).toBeInTheDocument()
    expect(screen.getByText('Scope 1')).toBeInTheDocument()
    expect(screen.getByText(/5 days until overwritten/)).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('DvrInfoScreen shows "Already overwritten" + an Overwritten badge for a 0-day scope', () => {
    const dvr: DvrInformation = {
      dvrLocation: '', dvrTypeBrand: '', serialModelNumber: '', dvrUsername: '', dvrPassword: '',
      numberOfChannels: '', activeCameras: '', recordingSchedule: '', resolution: '', recordingFps: '', firstRecordedDate: '2025-01-01 00:00:00', totalDvrRetention: '10 days',
    }
    render(
      <DvrInfoScreen
        dvr={dvr}
        retention={{ totalRetention: 10, scopes: [{ label: 'Scope 1', daysUntilOverwritten: 0, overwrittenDate: '2025-01-11' }] }}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onMenu={vi.fn()}
      />,
    )
    expect(screen.getByText(/Already overwritten/)).toBeInTheDocument()
    expect(screen.getByText('Overwritten')).toBeInTheDocument()
  })
})
