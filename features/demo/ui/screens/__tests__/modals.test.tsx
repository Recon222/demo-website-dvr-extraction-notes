import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewCaseModal } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal } from '@/features/demo/ui/screens/NewLocationModal'
import { ImportModal } from '@/features/demo/ui/screens/ImportModal'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

function locView(over: Partial<ImportedLocationView> = {}): ImportedLocationView {
  return {
    locId: 'loc-1',
    title: "Kim's Convenience",
    caseNumber: 'PR25-0098213',
    fieldCount: 8,
    timeFrameCount: 1,
    sections: [{ heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. Liam McHugh' }] }],
    scopes: [],
    warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "2015"' }],
    ...over,
  }
}

describe('NewCaseModal', () => {
  const blankCase = { caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '', vcName: '', vcBadge: '', incidentBusinessName: '', incidentStreetAddress: '', incidentCity: '', incidentLatitude: '', incidentLongitude: '', incidentCoordinateSource: '', notes: '' }

  it('edits fields (incl. accordion, incident, notes) and submits', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(<NewCaseModal form={blankCase} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-1' } })
    expect(onChange).toHaveBeenCalledWith('caseNumber', 'PR25-1')
    // accordion fields are in the DOM even while collapsed
    fireEvent.change(screen.getByLabelText('Coordinator Name'), { target: { value: 'M. Reyes' } })
    expect(onChange).toHaveBeenCalledWith('vcName', 'M. Reyes')
    fireEvent.change(screen.getByLabelText('Business / Scene Name'), { target: { value: 'Acme' } })
    expect(onChange).toHaveBeenCalledWith('incidentBusinessName', 'Acme')
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'rear cam' } })
    expect(onChange).toHaveBeenCalledWith('notes', 'rear cam')
    fireEvent.click(screen.getByText('Create Case'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})

describe('NewLocationModal', () => {
  const blankLoc = { locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }

  it('edits contact fields, captures GPS, and submits', () => {
    const onCaptureGps = vi.fn()
    const onSubmit = vi.fn()
    const onChange = vi.fn()
    render(<NewLocationModal form={blankLoc} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} onCaptureGps={onCaptureGps} />)
    fireEvent.change(screen.getByLabelText('Contact Person'), { target: { value: 'Sandeep' } })
    expect(onChange).toHaveBeenCalledWith('locationContact', 'Sandeep')
    fireEvent.change(screen.getByLabelText('Contact Phone'), { target: { value: '905-555-0142' } })
    expect(onChange).toHaveBeenCalledWith('locationPhone', '905-555-0142')
    fireEvent.click(screen.getByText('Capture GPS coordinates'))
    expect(onCaptureGps).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Create Location'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})

describe('ImportModal', () => {
  const cb = {
    onPickPdf: vi.fn(),
    onChoosePaste: vi.fn(),
    onTextChange: vi.fn(),
    onRun: vi.fn(),
    onBack: vi.fn(),
    onRetry: vi.fn(),
    onOpenLocation: vi.fn(),
    onCancel: vi.fn(),
  }

  it('triggers the PDF picker and moves paste → run', () => {
    const onPickPdf = vi.fn()
    const onChoosePaste = vi.fn()
    const onRun = vi.fn()
    const { rerender } = render(<ImportModal stage="picker" text="" stages={[]} result={null} batch={null} {...cb} onPickPdf={onPickPdf} onChoosePaste={onChoosePaste} onRun={onRun} />)
    fireEvent.click(screen.getByText('Pick a PDF'))
    expect(onPickPdf).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Paste text'))
    expect(onChoosePaste).toHaveBeenCalledOnce()
    rerender(<ImportModal stage="paste" text="hi" stages={[]} result={null} batch={null} {...cb} onPickPdf={onPickPdf} onChoosePaste={onChoosePaste} onRun={onRun} />)
    fireEvent.click(screen.getByText('Extract & import'))
    expect(onRun).toHaveBeenCalledOnce()
  })

  it('shows a per-file batch counter in the progress stage', () => {
    render(<ImportModal stage="progress" text="" stages={[]} result={null} batch={{ current: 2, total: 3 }} {...cb} />)
    expect(screen.getByText(/Importing 2 of 3/)).toBeInTheDocument()
  })

  it('single success: renders the detail body + warnings; Open location fires onOpenLocation', () => {
    const onOpenLocation = vi.fn()
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView()], failures: [] }} {...cb} onOpenLocation={onOpenLocation} />,
    )
    expect(screen.getByText('Import complete')).toBeInTheDocument()
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument() // the detail body
    expect(screen.getByText(/1 automatic adjustment/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Open location'))
    expect(onOpenLocation).toHaveBeenCalledWith('loc-1')
  })

  it('batch success: summary + single-open accordions (expanding one reveals its detail)', () => {
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    expect(screen.getByText(/Imported 2 of 2/)).toBeInTheDocument()
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument() // collapsed
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
  })

  it('batch accordions are single-open and toggle off (M6)', () => {
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getAllByText('Requesting Officer')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Store B/ })) // opens B, A collapses
    expect(screen.getAllByText('Requesting Officer')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Store B/ })) // re-click collapses
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument()
  })

  it('resets the open accordion when the result changes (H1)', () => {
    const { rerender } = render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
    rerender(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView({ locId: 'c', title: 'Store C' }), locView({ locId: 'd', title: 'Store D' })], failures: [] }} {...cb} />,
    )
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument() // stale index cleared
  })

  it('partial batch: shows the summary and the failure row', () => {
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView()], failures: [{ filename: 'scan.pdf', error: 'This PDF looks scanned.' }] }} {...cb} />,
    )
    expect(screen.getByText(/Imported 1 of 2/)).toBeInTheDocument()
    expect(screen.getByText(/scan\.pdf/)).toBeInTheDocument()
  })

  it('renders the degraded notice', () => {
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: true, locations: [locView()], failures: [], notice: 'Live model not configured — imported the sample request instead.' }} {...cb} />,
    )
    expect(screen.getByText(/imported the sample request/i)).toBeInTheDocument()
  })

  it('total failure: error view with retry', () => {
    render(<ImportModal stage="result" text="" stages={[]} result={{ ok: false, error: 'Could not read the request.' }} batch={null} {...cb} />)
    expect(screen.getByText('Could not read the request.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('all-failed batch: error summary + per-file failures card (M6)', () => {
    render(
      <ImportModal stage="result" text="" stages={[]} batch={null} result={{ ok: false, error: '2 imports failed.', failures: [{ filename: 'a.pdf', error: 'scanned' }, { filename: 'b.pdf', error: 'no JSON' }] }} {...cb} />,
    )
    expect(screen.getByText('2 imports failed.')).toBeInTheDocument()
    expect(screen.getByText(/a\.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/b\.pdf/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
