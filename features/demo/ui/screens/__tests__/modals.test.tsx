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
    onChoosePdf: vi.fn(),
    onChoosePaste: vi.fn(),
    onTextChange: vi.fn(),
    onRun: vi.fn(),
    onBack: vi.fn(),
    onRetry: vi.fn(),
    onOpen: vi.fn(),
    onCancel: vi.fn(),
  }

  it('moves picker → paste → run', () => {
    const onChoosePaste = vi.fn()
    const onRun = vi.fn()
    const { rerender } = render(<ImportModal stage="picker" text="" stages={[]} result={null} {...cb} onChoosePaste={onChoosePaste} onRun={onRun} />)
    fireEvent.click(screen.getByText('Paste text'))
    expect(onChoosePaste).toHaveBeenCalledOnce()
    rerender(<ImportModal stage="paste" text="hi" stages={[]} result={null} {...cb} onChoosePaste={onChoosePaste} onRun={onRun} />)
    fireEvent.click(screen.getByText('Extract & import'))
    expect(onRun).toHaveBeenCalledOnce()
  })

  it('shows the success result with an open-location action', () => {
    render(<ImportModal stage="result" text="" stages={[]} result={{ ok: true, fieldCount: 8, timeFrames: 1, locName: "Kim's Convenience" }} {...cb} />)
    expect(screen.getByText('Location created')).toBeInTheDocument()
    expect(screen.getByText('Open location')).toBeInTheDocument()
  })

  it('shows the error result with retry', () => {
    render(<ImportModal stage="result" text="" stages={[]} result={{ ok: false, error: 'Could not read the request.' }} {...cb} />)
    expect(screen.getByText('Could not read the request.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })
})
