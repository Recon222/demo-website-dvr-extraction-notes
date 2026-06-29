import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

const view: ImportedLocationView = {
  locId: 'L',
  title: "Kim's Convenience",
  caseNumber: 'PR25-0098213',
  fieldCount: 9,
  timeFrameCount: 1,
  sections: [
    { heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. Liam McHugh' }, { label: 'Badge', value: '4471' }] },
    { heading: 'Recovery Location', rows: [{ label: 'Business', value: "Kim's Convenience" }] },
  ],
  scopes: [{ label: 'Scope 1', range: '2025-03-08 23:45 → 2025-03-09 01:30', isActualTime: false, cameras: 'cameras 3, 4 and 7' }],
  warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "4471"' }],
}

describe('ImportResultBody', () => {
  it('renders the header, case number, and stat line', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByText(/9 fields · 1 time range/)).toBeInTheDocument()
  })
  it('renders each section heading and its rows', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
    expect(screen.getByText('Det. Liam McHugh')).toBeInTheDocument()
    expect(screen.getByText('Recovery Location')).toBeInTheDocument()
  })
  it('renders scope rows with the time tag and the canonical range', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText('DVR TIME')).toBeInTheDocument()
    expect(screen.getByText('2025-03-08 23:45 → 2025-03-09 01:30')).toBeInTheDocument()
    expect(screen.getByText('cameras 3, 4 and 7')).toBeInTheDocument()
  })
  it('shows the warnings disclosure with the reasons', () => {
    render(<ImportResultBody view={view} />)
    expect(screen.getByText(/1 automatic adjustment/)).toBeInTheDocument()
    expect(screen.getByText(/Extracted badge/)).toBeInTheDocument()
  })
  it('renders the ACTUAL-TIME badge for a real-time scope', () => {
    render(<ImportResultBody view={{ ...view, scopes: [{ label: 'Scope 1', range: '2025-03-08 23:45', isActualTime: true, cameras: '' }] }} />)
    expect(screen.getByText('ACTUAL TIME')).toBeInTheDocument()
  })
})
