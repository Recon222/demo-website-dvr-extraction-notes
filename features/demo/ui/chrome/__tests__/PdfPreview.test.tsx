import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

/** The frame's window with `print` writable/optional, as the tests stub it — full Window otherwise
 *  so stubs can dispatch real events (`beforeprint`) on it. */
type StubbableFrameWindow = Omit<Window, 'print'> & { print?: () => void }

function frameWindow(container: HTMLElement): StubbableFrameWindow {
  const frame = container.querySelector('iframe')
  if (!frame?.contentWindow) throw new Error('preview iframe has no contentWindow')
  return frame.contentWindow as unknown as StubbableFrameWindow
}

/** Stub print the way a real, unblocked browser behaves: the printing steps fire `beforeprint`
 *  on the framed window before the dialog opens. That event is the component's positive success
 *  signal (R-12) — a stub that merely returns models a silently-swallowed print, not a save. */
function stubDialogPrint(win: StubbableFrameWindow) {
  const print = vi.fn(() => {
    win.dispatchEvent(new Event('beforeprint'))
  })
  win.print = print
  return print
}

/** Flush one macrotask inside act() — long enough for the component's deferred blocked-verdict
 *  (and any deferred `beforeprint` dispatch scheduled before it) to settle (R-36). */
async function settlePrintVerdict() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
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
      const print = stubDialogPrint(frameWindow(container))
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(print).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('status')).not.toBeInTheDocument() // no failure notice on success
    })

    it('keeps the preview open after printing (the user closes it explicitly)', () => {
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      stubDialogPrint(frameWindow(container))
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
      stubDialogPrint(win)
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('shows the honest blocked notice when even probing the frame window throws (cross-origin SecurityError) — R-12', () => {
      // The sandbox rationale in PdfPreview documents this exact failure: an opaque-origin frame
      // throws on any contentWindow property touch. The probe must live inside the try — the
      // notice must render, not an uncaught error.
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      Object.defineProperty(frameWindow(container), 'print', {
        configurable: true,
        get() {
          throw new Error('SecurityError: Blocked a frame from accessing a cross-origin frame.')
        },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.getByRole('status')).toHaveTextContent(/no PDF was saved/i)
    })

    it('treats a print() that returns without opening the dialog as blocked — silent-ignore is not success (R-12)', async () => {
      // Chromium's sandboxed behaviour: "Ignored call to 'print()'" — the call returns normally,
      // no dialog, no beforeprint. Absence-of-throw must not be rewarded as a save. The verdict
      // is deferred one macrotask (R-36), hence the findBy.
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const win = frameWindow(container)
      win.print = vi.fn()
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(await screen.findByRole('status')).toHaveTextContent(/no PDF was saved/i)
    })

    it('does not brand the save "blocked" on an engine without the print events — no positive signal exists to read (R-36)', async () => {
      // ~Safari/iOS ≤12-era engines never fire beforeprint. There the component must degrade to
      // absence-of-throw (pre-R-12 behaviour) rather than report every successful save as blocked.
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const win = frameWindow(container)
      delete (win as { onbeforeprint?: unknown }).onbeforeprint // capability probe now fails
      win.print = vi.fn()
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      await settlePrintVerdict()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('waits one macrotask for a deferred beforeprint — engines postpone printing while the frame is still loading (R-36)', async () => {
      // Blink/WebKit defer the printing steps (and the beforeprint they fire) when print() is
      // called on a frame that has not finished loading. The signal arriving a task late must
      // not produce a definitive "no PDF was saved" over a dialog that then opens.
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const win = frameWindow(container)
      win.print = vi.fn(() => {
        setTimeout(() => win.dispatchEvent(new Event('beforeprint')), 0)
      })
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      await settlePrintVerdict()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('returns focus to the Save button after printing — Escape-to-close must survive a save — R-16', () => {
      // win.focus() hands keyboard focus to the sandboxed frame (needed so the right document
      // prints). Nothing in that scriptless document forwards keys, so unless focus comes back
      // to the parent chrome, the document-level Escape listener goes deaf after a save.
      const onClose = vi.fn()
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={onClose} />)
      stubDialogPrint(frameWindow(container))
      const saveBtn = screen.getByRole('button', { name: 'Save as PDF' })
      fireEvent.click(saveBtn)
      expect(document.activeElement).toBe(saveBtn) // not stranded inside the frame
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('recovers focus to the Save button even when print throws (the frame already took focus) — R-16', () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      frameWindow(container).print = () => {
        throw new Error('blocked')
      }
      const saveBtn = screen.getByRole('button', { name: 'Save as PDF' })
      fireEvent.click(saveBtn)
      expect(document.activeElement).toBe(saveBtn)
    })

    it('a silently-ignored retry does NOT clear a prior failure notice (never a fake success) — R-12', async () => {
      const { container } = render(<PdfPreview title="t" html="<p>d</p>" onClose={vi.fn()} />)
      const win = frameWindow(container)
      win.print = () => {
        throw new Error('blocked')
      }
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      expect(screen.getByRole('status')).toBeInTheDocument()
      win.print = vi.fn() // second attempt swallowed silently — two failed saves, notice must survive
      fireEvent.click(screen.getByRole('button', { name: 'Save as PDF' }))
      await settlePrintVerdict() // the deferred verdict must re-affirm the notice, not clear it
      expect(screen.getByRole('status')).toHaveTextContent(/no PDF was saved/i)
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
