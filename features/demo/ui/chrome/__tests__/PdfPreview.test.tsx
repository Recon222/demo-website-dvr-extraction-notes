import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

/** The frame's window narrowed to a writable, optional print, as the tests stub it. */
function frameWindow(container: HTMLElement): { print?: () => void } {
  const frame = container.querySelector('iframe')
  if (!frame?.contentWindow) throw new Error('preview iframe has no contentWindow')
  return frame.contentWindow as unknown as { print?: () => void }
}

describe('PdfPreview', () => {
  it('portals into the PhoneOverlayContext node when present (pins to the phone viewport, outside the scroller)', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <PdfPreview title="Case Notes" html="<p>doc</p>" onClose={vi.fn()} />
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay).toHaveTextContent('Case Notes')
    expect(overlay.querySelector('iframe')).toBeTruthy()
    document.body.removeChild(overlay)
  })

  it('renders inline when there is no overlay (fallback)', () => {
    render(<PdfPreview title="Case Notes" html="<p>doc</p>" onClose={vi.fn()} />)
    expect(screen.getByText('Case Notes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save as PDF' })).toBeInTheDocument()
  })

  it('calls onClose from both the header and footer Close buttons', () => {
    const onClose = vi.fn()
    render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  describe('sandbox (pinned)', () => {
    it('the iframe sandbox is EXACTLY "allow-modals allow-same-origin" — it must not silently widen', () => {
      // allow-same-origin lets the parent reach contentWindow.print (an opaque-origin frame
      // throws a cross-origin SecurityError); allow-modals lets the print dialog open (without
      // it, sandboxed print() is silently ignored). allow-scripts must NEVER join this list:
      // scripts + same-origin on a srcDoc frame is a sandbox escape. Anything beyond these two
      // tokens is a deliberate, reviewed decision — update this pin only alongside that review.
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      expect(container.querySelector('iframe')!.getAttribute('sandbox')).toBe('allow-modals allow-same-origin')
    })
  })

  describe('Save as PDF (print path)', () => {
    it('prints the framed court document via its contentWindow', () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const print = vi.fn()
      frameWindow(container).print = print
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(print).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('status')).not.toBeInTheDocument() // no failure notice on success
    })

    it('keeps the preview open after printing (the user closes it explicitly)', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      frameWindow(container).print = vi.fn()
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Save as PDF' })).toBeInTheDocument()
    })

    it('shows the honest blocked notice when the browser throws on print — never a fake success', () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      frameWindow(container).print = () => {
        throw new Error('blocked by browser')
      }
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.getByRole('status')).toHaveTextContent(/blocked the print dialog.*no PDF was saved/i)
    })

    it('shows the honest blocked notice when print is unavailable on the frame window', () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      frameWindow(container).print = undefined
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.getByRole('status')).toHaveTextContent(/no PDF was saved/i)
    })

    it('a later successful print clears the failure notice', () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const win = frameWindow(container)
      win.print = () => {
        throw new Error('blocked')
      }
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.getByRole('status')).toBeInTheDocument()
      win.print = vi.fn()
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('dismissal (deferred §21)', () => {
    it('Escape closes the preview', () => {
      const onClose = vi.fn()
      render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('a non-Escape key does not close', () => {
      const onClose = vi.fn()
      render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      fireEvent.keyDown(document, { key: 'Enter' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('the Escape listener is removed on unmount (no ghost close)', () => {
      const onClose = vi.fn()
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      unmount()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })

    it('clicking the grey document surround (the backdrop) closes', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      fireEvent.click(container.querySelector('[data-pdf-backdrop]')!)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('clicking the document iframe itself does NOT close (only the surround is the backdrop)', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      fireEvent.click(container.querySelector('iframe')!)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('returns focus to the opener element on unmount', () => {
      const opener = document.createElement('button')
      document.body.appendChild(opener)
      opener.focus()
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
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
      const { unmount } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      screen.getByRole('button', { name: 'Close preview' }).focus()
      document.body.removeChild(opener) // opener gone (e.g. screen swapped underneath)
      expect(() => unmount()).not.toThrow()
      expect(document.activeElement).not.toBe(opener)
    })
  })
})
