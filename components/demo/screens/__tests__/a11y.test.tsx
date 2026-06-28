import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle } from '@/components/demo/screens/_shared'
import { TimeOffsetScreen } from '@/components/demo/screens/TimeOffsetScreen'

const toBase = {
  dvrDateTime: '2025-03-08 12:05:30',
  actualDateTime: '2025-03-08 12:00:00',
  onChangeDvr: vi.fn(),
  onChangeActual: vi.fn(),
  onUseCurrentTime: vi.fn(),
  onCalculate: vi.fn(),
  onCaptureOcr: vi.fn(),
  captureMethod: 'ocr' as const,
  result: { diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false },
  correctedScopes: [],
  dvrAppliesDST: true,
  onToggleDst: vi.fn(),
  onNext: vi.fn(),
  onBack: vi.fn(),
  onMenu: vi.fn(),
}

describe('Toggle a11y', () => {
  it('is a labelled switch that reflects state and responds to keyboard', () => {
    const onClick = vi.fn()
    render(<Toggle label="Media player included" on={false} onClick={onClick} />)
    const sw = screen.getByRole('switch', { name: 'Media player included' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.keyDown(sw, { key: 'Enter' })
    fireEvent.keyDown(sw, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(2)
  })
})

describe('TimeOffsetScreen DST toggle a11y', () => {
  it('exposes the DST control as a checked switch', () => {
    render(<TimeOffsetScreen {...toBase} dvrAppliesDST />)
    expect(screen.getByRole('switch', { name: 'DVR Applies DST' })).toHaveAttribute('aria-checked', 'true')
  })
})
