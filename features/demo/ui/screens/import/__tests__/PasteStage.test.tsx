import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PasteStage, PASTE_COPY, PASTE_INPUT_MIN_HEIGHT, PASTE_INPUT_MAX_HEIGHT } from '@/features/demo/ui/screens/import/PasteStage'

function renderStage(text = '', over: Partial<Parameters<typeof PasteStage>[0]> = {}) {
  const props = { text, onTextChange: vi.fn(), onRun: vi.fn(), ...over }
  const utils = render(<PasteStage {...props} />)
  return { ...utils, props }
}

describe('PasteStage (P1.2, matrix row 72)', () => {
  it('renders the hint copy — phone verbatim minus the "on-device" claim (honesty rule)', () => {
    renderStage()
    expect(
      screen.getByText('Paste the recovery request — an email, form text, or notes. The AI extracts the fields, just like a PDF import.'),
    ).toBeInTheDocument()
    // The demo's model call is not on-device; the claim must not survive a copy refresh.
    expect(PASTE_COPY.hint).not.toMatch(/on-device/)
  })

  it('pins the forensic input switches: autocorrect, spellcheck, and autocapitalize all OFF', () => {
    renderStage()
    const input = screen.getByLabelText('Pasted request text')
    expect(input).toHaveAttribute('autocorrect', 'off')
    expect(input).toHaveAttribute('spellcheck', 'false')
    expect(input).toHaveAttribute('autocapitalize', 'off')
  })

  it('pins the load-bearing bounded height: min 240 / max 320 with internal scroll', () => {
    renderStage()
    const input = screen.getByLabelText('Pasted request text') as HTMLTextAreaElement
    expect(PASTE_INPUT_MIN_HEIGHT).toBe(240)
    expect(PASTE_INPUT_MAX_HEIGHT).toBe(320)
    expect(input.style.minHeight).toBe('240px')
    expect(input.style.maxHeight).toBe('320px')
    expect(input.style.overflowY).toBe('auto')
    expect(input.style.resize).toBe('none')
  })

  it('uses the phone placeholder and reports edits through onTextChange', () => {
    const { props } = renderStage()
    const input = screen.getByPlaceholderText('Paste request text here...')
    fireEvent.change(input, { target: { value: 'recover footage from the rear camera' } })
    expect(props.onTextChange).toHaveBeenCalledWith('recover footage from the rear camera')
  })

  it('"Import with AI" is disabled while the text is blank (whitespace counts as blank)', () => {
    const { props } = renderStage('   \n  ')
    const submit = screen.getByRole('button', { name: 'Import with AI' })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(props.onRun).not.toHaveBeenCalled()
  })

  it('with real text the submit is enabled and fires onRun', () => {
    const { props } = renderStage('recover footage')
    const submit = screen.getByRole('button', { name: 'Import with AI' })
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)
    expect(props.onRun).toHaveBeenCalledTimes(1)
  })
})
