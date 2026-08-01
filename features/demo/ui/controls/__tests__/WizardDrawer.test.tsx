import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

const items = [{ id: 'submission' as const, label: 'Submission', active: true }]
const cb = {
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onBackToCases: vi.fn(),
  onCaptureMedia: vi.fn(),
  onRecordAudio: vi.fn(),
  onOpenMediaLibrary: vi.fn(),
  saveStatus: null,
  mediaTools: { capture: true, audio: true },
}

describe('WizardDrawer', () => {
  it('portals into the PhoneOverlayContext node when present (pins to the phone viewport, outside the scroller)', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <WizardDrawer open items={items} {...cb} />
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy()
    expect(overlay).toHaveTextContent('Submission')
    document.body.removeChild(overlay)
  })

  it('renders inline when there is no overlay (fallback)', () => {
    render(<WizardDrawer open items={items} {...cb} />)
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(<WizardDrawer open={false} items={items} {...cb} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(<WizardDrawer open items={items} {...cb} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<WizardDrawer open items={items} {...cb} onClose={onClose} />)
    fireEvent.click(container.querySelector('[data-drawer-backdrop]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not register the Escape handler when closed', () => {
    const onClose = vi.fn()
    render(<WizardDrawer open={false} items={items} {...cb} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('the media accordion follows the form profile (P7.3)', () => {
  it('drops a capture row the visitor switched off, and never the library', () => {
    render(<WizardDrawer open items={items} {...cb} mediaTools={{ capture: false, audio: true }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
    expect(screen.queryByRole('button', { name: 'Open camera to capture media' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Record audio note' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open media library' })).toBeInTheDocument()
  })

  it('keeps the accordion — and the library — when BOTH capture tools are off', () => {
    render(<WizardDrawer open items={items} {...cb} mediaTools={{ capture: false, audio: false }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
    expect(screen.queryByRole('button', { name: 'Open camera to capture media' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record audio note' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open media library' })).toBeInTheDocument()
  })
})
