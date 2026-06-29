import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

describe('PdfPreview', () => {
  it('portals into the PhoneOverlayContext node when present (pins to the phone viewport, outside the scroller)', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <PdfPreview title="Case Notes" html="<p>doc</p>" onClose={vi.fn()} onSave={vi.fn()} />
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay).toHaveTextContent('Case Notes')
    expect(overlay.querySelector('iframe')).toBeTruthy()
    document.body.removeChild(overlay)
  })

  it('renders inline when there is no overlay (fallback)', () => {
    render(<PdfPreview title="Case Notes" html="<p>doc</p>" onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByText('Case Notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save as PDF' })).toBeInTheDocument()
  })

  it('calls onClose from both the header and footer Close buttons', () => {
    const onClose = vi.fn()
    render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('calls onSave from the Save button', () => {
    const onSave = vi.fn()
    render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
