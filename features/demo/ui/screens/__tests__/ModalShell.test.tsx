import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

describe('ModalShell', () => {
  it('portals its dialog into the PhoneOverlayContext node when present (pins to the phone viewport, outside the scroller)', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <ModalShell title="Ported" onClose={vi.fn()}>
          <div>portaled body</div>
        </ModalShell>
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy()
    expect(overlay).toHaveTextContent('portaled body')
    document.body.removeChild(overlay)
  })

  it('renders inline when there is no overlay (fallback for isolated tests)', () => {
    render(
      <ModalShell title="Inline" onClose={vi.fn()}>
        <div>inline body</div>
      </ModalShell>,
    )
    expect(screen.getByRole('dialog', { name: 'Inline' })).toBeInTheDocument()
    expect(screen.getByText('inline body')).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <ModalShell title="x" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ModalShell title="x" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    fireEvent.click(container.querySelector('[data-modal-scrim]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
