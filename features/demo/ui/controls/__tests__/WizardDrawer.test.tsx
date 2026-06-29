import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

const items = [{ id: 'submission' as const, label: 'Submission', active: true }]
const cb = { onClose: vi.fn(), onNavigate: vi.fn(), onBackToCases: vi.fn() }

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
})
