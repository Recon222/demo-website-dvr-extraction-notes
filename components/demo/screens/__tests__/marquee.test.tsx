import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeOffsetScreen } from '@/components/demo/screens/TimeOffsetScreen'
import { OcrCaptureScreen } from '@/components/demo/screens/OcrCaptureScreen'
import { ExtractedScopeScreen } from '@/components/demo/screens/ExtractedScopeScreen'

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

describe('TimeOffsetScreen', () => {
  const base = {
    dvrDateTime: '2025-03-08 12:05:30',
    actualDateTime: '2025-03-08 12:00:00',
    onChangeDvr: vi.fn(),
    onChangeActual: vi.fn(),
    onUseCurrentTime: vi.fn(),
    onCalculate: vi.fn(),
    onCaptureOcr: vi.fn(),
    captureMethod: 'ocr' as const,
    result: null,
    correctedScopes: [],
    dvrAppliesDST: false,
    onToggleDst: vi.fn(),
    ...nav,
  }

  it('calculates and launches OCR', () => {
    const onCalculate = vi.fn()
    const onCaptureOcr = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} onCaptureOcr={onCaptureOcr} />)
    fireEvent.click(screen.getByText('Calculate'))
    expect(onCalculate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Capture from DVR'))
    expect(onCaptureOcr).toHaveBeenCalledOnce()
  })

  it('shows the computed offset', () => {
    render(<TimeOffsetScreen {...base} result={{ diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false }} />)
    expect(screen.getByText('00:05:30')).toBeInTheDocument()
    expect(screen.getByText(/AHEAD OF/)).toBeInTheDocument()
  })

  it('disables Calculate until both datetimes are present', () => {
    const { rerender } = render(<TimeOffsetScreen {...base} dvrDateTime="" actualDateTime="" />)
    expect(screen.getByText('Calculate')).toBeDisabled()
    rerender(<TimeOffsetScreen {...base} dvrDateTime="2025-03-08 12:05:30" actualDateTime="" />)
    expect(screen.getByText('Calculate')).toBeDisabled()
    rerender(<TimeOffsetScreen {...base} dvrDateTime="2025-03-08 12:05:30" actualDateTime="2025-03-08 12:00:00" />)
    expect(screen.getByText('Calculate')).toBeEnabled()
  })

  it('renders the adjusted-time-ranges table for corrected scopes (the payoff)', () => {
    const correctedScopes = [
      { id: 'a', reqLabel: 'real time', reqStart: '2025-03-08 23:45:00', reqEnd: '2025-03-09 01:30:00', adjStart: '2025-03-08 23:50:30', adjEnd: '2025-03-09 01:35:30', cameras: '3, 4, 7' },
      { id: 'b', reqLabel: 'real time', reqStart: '2025-03-10 10:00:00', reqEnd: '2025-03-10 11:00:00', adjStart: '2025-03-10 10:05:30', adjEnd: '2025-03-10 11:05:30', cameras: '1' },
    ]
    render(<TimeOffsetScreen {...base} result={{ diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false }} correctedScopes={correctedScopes} />)
    expect(screen.getByText('Adjusted Time Ranges')).toBeInTheDocument()
    expect(screen.getByText('Scope 1')).toBeInTheDocument()
    expect(screen.getByText('Scope 2')).toBeInTheDocument()
    expect(screen.getByText('2025-03-08 23:50:30')).toBeInTheDocument()
    expect(screen.getByText(/Cameras: 3, 4, 7/)).toBeInTheDocument()
  })
})

describe('OcrCaptureScreen', () => {
  it('runs the sample on the aim stage', () => {
    const onUseSample = vi.fn()
    render(<OcrCaptureScreen result={null} onUseSample={onUseSample} onCapture={vi.fn()} onCancel={vi.fn()} onRetake={vi.fn()} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(onUseSample).toHaveBeenCalledOnce()
  })

  it('confirms a parsed result', () => {
    const onConfirm = vi.fn()
    render(
      <OcrCaptureScreen
        result={{ ok: true, dvrTime: '2025-03-08 12:05:30', confidence: { label: 'High', color: '#10d177' }, actual: '2025-03-08 12:00:00' }}
        onUseSample={vi.fn()}
        onCapture={vi.fn()}
        onCancel={vi.fn()}
        onRetake={vi.fn()}
        onConfirm={onConfirm}
      />,
    )
    expect(screen.getByText('2025-03-08 12:05:30')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('shows the failed-parse branch and retakes', () => {
    const onRetake = vi.fn()
    render(<OcrCaptureScreen result={{ ok: false, rawText: 'garbled 88:99' }} onUseSample={vi.fn()} onCapture={vi.fn()} onCancel={vi.fn()} onRetake={onRetake} onConfirm={vi.fn()} />)
    expect(screen.getByText(/Couldn't read a timestamp/)).toBeInTheDocument()
    expect(screen.getByText(/garbled 88:99/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(onRetake).toHaveBeenCalledOnce()
  })
})

describe('ExtractedScopeScreen', () => {
  it('regenerates from the offset and shows the empty hint', () => {
    const onRegenerate = vi.fn()
    render(<ExtractedScopeScreen scopes={[]} onChange={vi.fn()} onRemove={vi.fn()} onRegenerate={onRegenerate} {...nav} />)
    expect(screen.getByText(/Calculate the time offset first/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Regenerate from offset'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })
})
