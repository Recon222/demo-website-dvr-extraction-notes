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

  describe('dismissal (deferred §21)', () => {
    it('Escape closes the preview', () => {
      const onClose = vi.fn()
      render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('a non-Escape key does not close', () => {
      const onClose = vi.fn()
      render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('the Escape listener is removed on unmount (no ghost close)', () => {
      const onClose = vi.fn()
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
      unmount()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('clicking the grey document surround (the backdrop) closes', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
      fireEvent.click(container.querySelector('[data-pdf-backdrop]')!)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('clicking the document iframe itself does NOT close (only the surround is the backdrop)', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} onSave={vi.fn()} />)
      fireEvent.click(container.querySelector('iframe')!)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('returns focus to the opener element on unmount', () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} onSave={vi.fn()} />)
      // The user tabs/clicks into the preview chrome…
      screen.getByRole('button', { name: 'Close preview' }).focus()
      expect(document.activeElement).not.toBe(opener)
      // …and closing it hands focus back to where they came from.
      unmount()
      expect(document.activeElement).toBe(opener)
      document.body.removeChild(opener)
    })

    it('does not steal focus back to a detached opener', () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} onSave={vi.fn()} />)
      screen.getByRole('button', { name: 'Close preview' }).focus()
      document.body.removeChild(opener) // opener gone (e.g. screen swapped underneath)
      expect(() => unmount()).not.toThrow()
      expect(document.activeElement).not.toBe(opener)
    })
  })
})
