import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportResultAccordion } from '@/features/demo/ui/screens/ImportResultAccordion'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

const view: ImportedLocationView = {
  locId: 'loc-1',
  title: "Kim's Convenience",
  caseNumber: 'PR25-0098213',
  fieldCount: 5,
  timeFrameCount: 1,
  sections: [{ heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. McHugh' }] }],
  scopes: [],
  warnings: [],
  isSample: false,
}

describe('ImportResultAccordion', () => {
  it('collapsed: shows title + case number, aria-expanded=false, body hidden', () => {
    render(<ImportResultAccordion view={view} open={false} onToggle={vi.fn()} onOpenLocation={vi.fn()} />)
    expect(screen.getByText("Kim's Convenience")).toBeInTheDocument()
    expect(screen.getByText('PR25-0098213')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kim's Convenience/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument()
  })
  it('fires onToggle on header click', () => {
    const onToggle = vi.fn()
    render(<ImportResultAccordion view={view} open={false} onToggle={onToggle} onOpenLocation={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Kim's Convenience/ }))
    expect(onToggle).toHaveBeenCalledOnce()
  })
  it('open: reveals the body + Open location, which fires onOpenLocation with the locId', () => {
    const onOpenLocation = vi.fn()
    render(<ImportResultAccordion view={view} open onToggle={vi.fn()} onOpenLocation={onOpenLocation} />)
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Open location'))
    expect(onOpenLocation).toHaveBeenCalledWith('loc-1')
  })

  it('badges a sample-derived card so it is attributable inside a batch (review M1)', () => {
    render(<ImportResultAccordion view={{ ...view, isSample: true }} open={false} onToggle={vi.fn()} onOpenLocation={vi.fn()} />)
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })

  it('renders no sample badge on a live-derived card', () => {
    render(<ImportResultAccordion view={view} open={false} onToggle={vi.fn()} onOpenLocation={vi.fn()} />)
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
  })

  it('links the toggle to its panel via aria-controls/id when open (M2)', () => {
    render(<ImportResultAccordion view={view} open onToggle={vi.fn()} onOpenLocation={vi.fn()} />)
    const panelId = screen.getByRole('button', { name: /Kim's Convenience/ }).getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId!)).toBeInTheDocument()
  })
})
