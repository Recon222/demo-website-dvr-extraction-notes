import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PickerStage, PICKER_COPY, BATCH_SIZE_WARNING_THRESHOLD } from '@/features/demo/ui/screens/import/PickerStage'
import { severityTone } from '@/features/demo/ui/tokens/status'

/** jsdom rewrites inline hex to `rgb()`; pins compare against the token, never a retyped literal. */
const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/**
 * The four `border*Color` longhands. Banner writes the accent as longhands, never the
 * `borderColor` shorthand (`reports/partner-lit-edge-ruling.md` §1) — and **jsdom does not
 * synthesize the shorthand back from them**: `el.style.borderColor` reads `''` under the ruled
 * form, measured. So every border-colour pin in this repo has to read the four longhands, which
 * is the stronger assertion anyway: it catches a partial re-tint the shorthand read cannot see.
 */
const sides = (el: HTMLElement): string[] => [
  el.style.borderTopColor,
  el.style.borderRightColor,
  el.style.borderBottomColor,
  el.style.borderLeftColor,
]

const pdf = (name = 'request.pdf', type = 'application/pdf') => new File(['%PDF'], name, { type })
const txt = (name = 'notes.txt') => new File(['hello'], name, { type: 'text/plain' })

function renderStage(over: Partial<Parameters<typeof PickerStage>[0]> = {}) {
  const props = {
    onPdfFilesSelected: vi.fn(),
    onClipboardText: vi.fn(),
    onChoosePaste: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  }
  const utils = render(<PickerStage {...props} />)
  const fileInput = () => utils.container.querySelector('input[type="file"]') as HTMLInputElement
  return { ...utils, props, fileInput }
}

describe('PickerStage (P1.2, matrix row 71)', () => {
  it('renders the three phone cards with their copy, D5-adapted where the demo has no JSON path', () => {
    renderStage()
    // Card 1 — verbatim title; description honestly says PDF only (phone: 'JSON or PDF').
    expect(screen.getByText('Pick File')).toBeInTheDocument()
    expect(screen.getByText('Choose a PDF recovery file from your device')).toBeInTheDocument()
    // Card 2 — verbatim title; description describes the demo's AI-text clipboard path.
    expect(screen.getByText('Paste from Clipboard')).toBeInTheDocument()
    expect(screen.getByText('Paste copied request text straight from your clipboard')).toBeInTheDocument()
    // Card 3 — both lines verbatim from the phone.
    expect(screen.getByText('Paste Text')).toBeInTheDocument()
    expect(screen.getByText('Paste a request email or notes — AI fills the form')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('pins the phone card geometry: minHeight 180 on all three action cards', () => {
    renderStage()
    for (const title of ['Pick File', 'Paste from Clipboard', 'Paste Text']) {
      const card = screen.getByText(title).closest('button')!
      expect(card.style.minHeight, `${title} card`).toBe('180px')
    }
  })

  it('clicking "Pick File" forwards the tap to the hidden file input — the card’s only job (R-5)', () => {
    const { fileInput } = renderStage()
    const clickSpy = vi.fn()
    fileInput().addEventListener('click', clickSpy)
    fireEvent.click(screen.getByText('Pick File'))
    expect(clickSpy).toHaveBeenCalledTimes(1)
  })

  it('Cancel fires onCancel; the Paste Text card fires onChoosePaste', () => {
    const { props } = renderStage()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByText('Paste Text'))
    expect(props.onChoosePaste).toHaveBeenCalledTimes(1)
  })

  it('an all-PDF selection is handed up via onPdfFilesSelected', async () => {
    const { props, fileInput } = renderStage()
    const files = [pdf('a.pdf'), pdf('b.pdf')]
    fireEvent.change(fileInput(), { target: { files } })
    await waitFor(() => expect(props.onPdfFilesSelected).toHaveBeenCalledWith(files))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a .pdf extension without a mime type still counts as PDF (mime-then-extension parity)', async () => {
    const { props, fileInput } = renderStage()
    const file = pdf('scan.PDF', '')
    fireEvent.change(fileInput(), { target: { files: [file] } })
    await waitFor(() => expect(props.onPdfFilesSelected).toHaveBeenCalledWith([file]))
  })

  it('a non-PDF selection shows the adapted unsupported-type error and hands nothing up', () => {
    const { props, fileInput } = renderStage()
    fireEvent.change(fileInput(), { target: { files: [txt()] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type. Please select PDF files.')
    expect(props.onPdfFilesSelected).not.toHaveBeenCalled()
  })

  it('renders that error through the SHARED Banner, not a private recipe (A71/U3.3)', () => {
    // The phone routes this banner through `<Banner severity="error">` at
    // `ImportPickerModal.tsx:718`/`:790`. Every assertion above passes over a re-inlined local
    // recipe — they read role and text only — so this is the one that reds if the shared
    // component is unwired. Values are read off the tokens, never retyped.
    const { fileInput } = renderStage()
    fireEvent.change(fileInput(), { target: { files: [txt()] } })
    const alert = screen.getByTestId('import-picker-error') // phone's own testID, lifted
    // The SEAM, not a re-derivation from `palette` — W2 F26: a pin that computes the trio
    // itself agrees with a component that computes it itself, straight through a re-tint.
    const tone = severityTone('error')
    expect(alert.style.backgroundColor).toBe(rgb(tone.background))
    expect(sides(alert)).toEqual(Array(4).fill(rgb(tone.borderColor)))
    expect(alert.style.borderRadius).toBe('8px') // radius.md, not the old local 10
    expect((alert.lastElementChild as HTMLElement).style.color).toBe(rgb(tone.color))
    expect(alert).toHaveAttribute('aria-live', 'assertive')
  })

  it('a mixed PDF + non-PDF selection is also rejected as unsupported (D5: PDF is the only file path)', () => {
    const { props, fileInput } = renderStage()
    fireEvent.change(fileInput(), { target: { files: [pdf(), txt()] } })
    expect(screen.getByRole('alert')).toHaveTextContent(PICKER_COPY.unsupportedType)
    expect(props.onPdfFilesSelected).not.toHaveBeenCalled()
  })

  it('a subsequent valid pick clears the error banner', async () => {
    const { props, fileInput } = renderStage()
    fireEvent.change(fileInput(), { target: { files: [txt()] } })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.change(fileInput(), { target: { files: [pdf()] } })
    await waitFor(() => expect(props.onPdfFilesSelected).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clipboard text is read and handed to the AI path via onClipboardText', async () => {
    const { props } = renderStage({ readClipboardText: () => Promise.resolve('copied request text') })
    fireEvent.click(screen.getByText('Paste from Clipboard'))
    await waitFor(() => expect(props.onClipboardText).toHaveBeenCalledWith('copied request text'))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('an empty clipboard shows the adapted empty-clipboard error', async () => {
    const { props } = renderStage({ readClipboardText: () => Promise.resolve('   ') })
    fireEvent.click(screen.getByText('Paste from Clipboard'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Clipboard is empty. Copy the request text first.')
    expect(props.onClipboardText).not.toHaveBeenCalled()
  })

  it('a blocked clipboard read shows the honest browser notice', async () => {
    const { props } = renderStage({ readClipboardText: () => Promise.reject(new Error('NotAllowedError')) })
    fireEvent.click(screen.getByText('Paste from Clipboard'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Clipboard access is blocked in this browser. Use Paste Text instead.',
    )
    expect(props.onClipboardText).not.toHaveBeenCalled()
  })

  it('without a seam, a browser lacking navigator.clipboard gets the same honest notice (jsdom default)', async () => {
    const { props } = renderStage() // no readClipboardText — falls back to navigator.clipboard
    fireEvent.click(screen.getByText('Paste from Clipboard'))
    expect(await screen.findByRole('alert')).toHaveTextContent(PICKER_COPY.clipboardBlocked)
    expect(props.onClipboardText).not.toHaveBeenCalled()
  })

  it('while the clipboard is being read: busy spinner on that card, all three cards disabled', async () => {
    let resolveRead: (t: string) => void = () => {}
    const { props } = renderStage({ readClipboardText: () => new Promise<string>((res) => { resolveRead = res }) })
    const cardOf = (title: string) => screen.getByText(title).closest('button')!
    fireEvent.click(screen.getByText('Paste from Clipboard'))
    expect(cardOf('Paste from Clipboard')).toHaveAttribute('aria-busy', 'true')
    // Default (no reduced-motion preference): the spinner spins (R-14's other direction).
    expect(screen.getByTestId('clipboard-loading-indicator').style.animation).toContain('spin')
    expect(cardOf('Pick File')).toBeDisabled()
    expect(cardOf('Paste from Clipboard')).toBeDisabled()
    expect(cardOf('Paste Text')).toBeDisabled()
    resolveRead('text from clipboard')
    await waitFor(() => expect(props.onClipboardText).toHaveBeenCalledWith('text from clipboard'))
    expect(cardOf('Pick File')).not.toBeDisabled()
    expect(cardOf('Paste from Clipboard')).not.toHaveAttribute('aria-busy')
  })

  it('reduced motion: the busy spinner renders static — arc visible, no spin animation (R-14)', () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
    try {
      renderStage({ readClipboardText: () => new Promise<string>(() => {}) }) // hangs → stays busy
      fireEvent.click(screen.getByText('Paste from Clipboard'))
      const spinner = screen.getByTestId('clipboard-loading-indicator')
      expect(spinner).toBeInTheDocument() // busy is still communicated (plus aria-busy)…
      expect(spinner.style.animation).toBe('') // …but nothing spins
      expect(screen.getByText('Paste from Clipboard').closest('button')).toHaveAttribute('aria-busy', 'true')
    } finally {
      window.matchMedia = original
    }
  })

  it('a rejecting onPdfFilesSelected surfaces the file-read backstop and re-enables the cards (R-22)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { fileInput } = renderStage({ onPdfFilesSelected: vi.fn().mockRejectedValue(new Error('pipeline boom')) })
      fireEvent.change(fileInput(), { target: { files: [pdf()] } })
      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to read file. Please try again.')
      // The finally must release the busy lock — dropping it would leave every card disabled.
      expect(screen.getByText('Pick File').closest('button')).not.toBeDisabled()
      expect(screen.getByText('Paste from Clipboard').closest('button')).not.toBeDisabled()
      expect(screen.getByText('Paste Text').closest('button')).not.toBeDisabled()
      // R-23a breadcrumb: in production this catch's setError is discarded (stage unmounts
      // first), so the console line must exist as the only remaining signal.
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw', expect.any(Error))
    } finally {
      errSpy.mockRestore()
    }
  })

  it('a rejecting onClipboardText surfaces the text-import backstop and re-enables the cards (R-22)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      renderStage({
        readClipboardText: () => Promise.resolve('copied request'),
        onClipboardText: vi.fn().mockRejectedValue(new Error('pipeline boom')),
      })
      fireEvent.click(screen.getByText('Paste from Clipboard'))
      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start text import. Please try again.')
      expect(screen.getByText('Pick File').closest('button')).not.toBeDisabled()
      expect(screen.getByText('Paste from Clipboard').closest('button')).not.toBeDisabled()
      expect(screen.getByText('Paste Text').closest('button')).not.toBeDisabled()
      expect(errSpy).toHaveBeenCalledWith('[demo/import] import run threw', expect.any(Error)) // R-23a
    } finally {
      errSpy.mockRestore()
    }
  })

  it(`>${BATCH_SIZE_WARNING_THRESHOLD} files: shows the Large Batch Import confirm; Continue hands the batch up`, async () => {
    const { props, fileInput } = renderStage()
    const files = Array.from({ length: BATCH_SIZE_WARNING_THRESHOLD + 1 }, (_, i) => pdf(`r${i}.pdf`))
    fireEvent.change(fileInput(), { target: { files } })
    // Phone copy verbatim (Alert.alert title/message/buttons, ImportPickerModal.tsx:310-316).
    expect(screen.getByText('Large Batch Import')).toBeInTheDocument()
    expect(screen.getByText('You selected 26 files. Import may take several minutes. Continue?')).toBeInTheDocument()
    expect(props.onPdfFilesSelected).not.toHaveBeenCalled() // nothing imports until confirmed
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(props.onPdfFilesSelected).toHaveBeenCalledWith(files))
  })

  it('large-batch Cancel abandons the selection and returns to the cards', () => {
    const { props, fileInput } = renderStage()
    const files = Array.from({ length: BATCH_SIZE_WARNING_THRESHOLD + 1 }, (_, i) => pdf(`r${i}.pdf`))
    fireEvent.change(fileInput(), { target: { files } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' })) // the confirm's Cancel (cards are hidden)
    expect(props.onPdfFilesSelected).not.toHaveBeenCalled()
    expect(screen.getByText('Pick File')).toBeInTheDocument() // back on the picker cards
  })

  it('opening the large-batch confirm moves focus into it; cancelling returns focus to the card (R-17)', () => {
    const { fileInput } = renderStage()
    const files = Array.from({ length: BATCH_SIZE_WARNING_THRESHOLD + 1 }, (_, i) => pdf(`r${i}.pdf`))
    fireEvent.change(fileInput(), { target: { files } })
    // The activated card just unmounted — without explicit management focus drops to <body>.
    expect(screen.getByRole('alertdialog', { name: 'Large Batch Import' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('Pick File').closest('button')).toHaveFocus()
  })

  it('a clipboard failure returns focus to the re-enabled clipboard card (R-17)', async () => {
    renderStage({ readClipboardText: () => Promise.reject(new Error('NotAllowedError')) })
    const card = () => screen.getByText('Paste from Clipboard').closest('button')!
    card().focus()
    fireEvent.click(card())
    await screen.findByRole('alert') // blocked notice announced…
    await waitFor(() => expect(card()).toHaveFocus()) // …and focus is back on the card, not <body>
    expect(card()).not.toBeDisabled()
  })

  it(`exactly ${BATCH_SIZE_WARNING_THRESHOLD} files skips the confirm (threshold is strictly greater-than)`, async () => {
    const { props, fileInput } = renderStage()
    const files = Array.from({ length: BATCH_SIZE_WARNING_THRESHOLD }, (_, i) => pdf(`r${i}.pdf`))
    fireEvent.change(fileInput(), { target: { files } })
    await waitFor(() => expect(props.onPdfFilesSelected).toHaveBeenCalledWith(files))
    expect(screen.queryByText('Large Batch Import')).toBeNull()
  })
})
