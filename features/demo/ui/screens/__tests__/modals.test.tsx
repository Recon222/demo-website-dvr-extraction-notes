import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewCaseModal } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal } from '@/features/demo/ui/screens/NewLocationModal'
import { ImportModal } from '@/features/demo/ui/screens/ImportModal'

describe('NewCaseModal', () => {
  it('edits a field and submits', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    render(<NewCaseModal form={{ caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '' }} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-1' } })
    expect(onChange).toHaveBeenCalledWith('caseNumber', 'PR25-1')
    fireEvent.click(screen.getByText('Create Case'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})

describe('NewLocationModal', () => {
  it('captures GPS and submits', () => {
    const onCaptureGps = vi.fn()
    const onSubmit = vi.fn()
    render(<NewLocationModal form={{ locationName: '', businessName: '', streetAddress: '', city: '' }} onChange={vi.fn()} onSubmit={onSubmit} onCancel={vi.fn()} onCaptureGps={onCaptureGps} />)
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
    onOpen: vi.fn(),
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

  it('shows the success result with field counts, warnings, and an open-location action', () => {
    render(
      <ImportModal
        stage="result"
        text=""
        stages={[]}
        batch={null}
        result={{ ok: true, fieldCount: 8, timeFrames: 1, locName: "Kim's Convenience", warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "2015" from officer name' }] }}
        {...cb}
      />,
    )
    expect(screen.getByText('Location created')).toBeInTheDocument()
    expect(screen.getByText('Open location')).toBeInTheDocument()
    expect(screen.getByText(/1 automatic adjustment/)).toBeInTheDocument()
  })

  it('shows the degraded notice and a batch summary', () => {
    render(
      <ImportModal
        stage="result"
        text=""
        stages={[]}
        batch={null}
        result={{ ok: true, fieldCount: 5, timeFrames: 0, locName: '2 locations', warnings: [], notice: 'Live model not configured — imported the sample request instead.', batch: { succeeded: 2, total: 3 } }}
        {...cb}
      />,
    )
    expect(screen.getByText('Import complete')).toBeInTheDocument()
    expect(screen.getByText(/of 3 requests/)).toBeInTheDocument()
    expect(screen.getByText(/imported the sample request/i)).toBeInTheDocument()
  })

  it('shows the error result with retry', () => {
    render(<ImportModal stage="result" text="" stages={[]} result={{ ok: false, error: 'Could not read the request.' }} batch={null} {...cb} />)
    expect(screen.getByText('Could not read the request.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
