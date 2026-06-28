import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncStatusCard } from '@/components/demo/screens/SyncStatusCard'
import type { SyncResult } from '@/lib/demo/types'

const sync: SyncResult = {
  method: 'NTP',
  server: 'time.nrc.ca',
  offsetMs: 540,
  uncertaintyMs: 12.5,
  rttMs: 18,
  traceability: 'NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second',
  timestamp: Date.UTC(2025, 2, 8, 12, 0, 0),
  stratum: 2,
}

describe('SyncStatusCard', () => {
  it('renders nothing when idle (no sync, not syncing)', () => {
    const { container } = render(<SyncStatusCard sync={null} syncing={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the synchronizing state', () => {
    render(<SyncStatusCard sync={null} syncing />)
    expect(screen.getByText(/Synchronizing/)).toBeInTheDocument()
  })

  it('renders every NTP field at parity with the app card', () => {
    render(<SyncStatusCard sync={sync} syncing={false} />)
    expect(screen.getByText('✓ Synchronized')).toBeInTheDocument()
    expect(screen.getByText('NTP (Atomic Clock)')).toBeInTheDocument()
    expect(screen.getByText('time.nrc.ca')).toBeInTheDocument()
    expect(screen.getByText('0.540s (slow)')).toBeInTheDocument()
    expect(screen.getByText('±12.50ms')).toBeInTheDocument()
    expect(screen.getByText('9.00ms')).toBeInTheDocument() // network delay = rtt/2
    expect(screen.getByText('Calibrated at')).toBeInTheDocument()
    expect(screen.getByText(/NRC Canada stratum-2/)).toBeInTheDocument()
  })

  it('reads a negative offset as fast', () => {
    render(<SyncStatusCard sync={{ ...sync, offsetMs: -1200 }} syncing={false} />)
    expect(screen.getByText('1.200s (fast)')).toBeInTheDocument()
  })
})
