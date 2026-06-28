import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle, ModalShell } from '@/features/demo/ui/screens/_shared'
import { TimeOffsetScreen } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'

const toBase = {
  dvrDateTime: '2025-03-08 12:05:30',
  actualDateTime: '2025-03-08 12:00:00',
  onChangeDvr: vi.fn(),
  onChangeActual: vi.fn(),
  onUseCurrentTime: vi.fn(),
  onCalculate: vi.fn(),
  onCaptureOcr: vi.fn(),
  sync: null,
  syncing: false,
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

describe('ModalShell a11y', () => {
  it('is an aria-modal dialog that closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <ModalShell title="New Case" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    const dialog = screen.getByRole('dialog', { name: 'New Case' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('WizardDrawer a11y', () => {
  it('is an aria-modal dialog that closes on Escape', () => {
    const onClose = vi.fn()
    render(<WizardDrawer open items={[]} onClose={onClose} onNavigate={vi.fn()} onBackToCases={vi.fn()} />)
    const dialog = screen.getByRole('dialog', { name: 'Navigation' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})
