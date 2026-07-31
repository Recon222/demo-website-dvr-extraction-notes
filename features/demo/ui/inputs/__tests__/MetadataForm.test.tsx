import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

import { MAX_CAPTION_LENGTH, MAX_FILENAME_LENGTH } from '@/features/demo/engine/logic/media'
import type { MediaKind } from '@/features/demo/engine/types'
import {
  FILENAME_REQUIRED_MESSAGE,
  MetadataForm,
  type MetadataFormValue,
} from '@/features/demo/ui/inputs/MetadataForm'

/**
 * P4.4 — the shared filename + notes form (matrix row 56).
 *
 * The rules under test are the PHONE's (`src/features/media/shared/components/MetadataForm.tsx`,
 * ui-mapping 09:242-268): both labels, both placeholders, both helper texts, the 100/500 caps,
 * strip-on-keystroke sanitization, and validity = trimmed 1–100.
 *
 * Two deliberate divergences carry their own pins here, because a reviewer will look for them:
 * validity is DERIVED by the parent from the engine predicate rather than pushed out through an
 * `onValidChange` effect, and an unsaveable filename SAYS SO instead of only greying a button.
 */

const filenameBox = () => screen.getByLabelText('Filename')
const notesBox = () => screen.getByLabelText('Notes')

/** A controlled host, because the form is controlled — testing it against a frozen `value`
 *  would pin the props rather than the behaviour. */
function Host({
  mediaType = 'photo',
  initial = { filename: 'rack front', caption: '' },
  savingAs,
  onValue,
}: {
  mediaType?: MediaKind
  initial?: MetadataFormValue
  savingAs?: string
  onValue?: (value: MetadataFormValue) => void
}) {
  const [value, setValue] = useState<MetadataFormValue>(initial)
  return (
    <MetadataForm
      value={value}
      onChange={(next) => {
        onValue?.(next)
        setValue(next)
      }}
      mediaType={mediaType}
      savingAs={savingAs}
    />
  )
}

describe('MetadataForm — the phone’s copy', () => {
  it.each<[MediaKind, string, string]>([
    ['photo', 'Enter image filename', 'Required. File name for the photo.'],
    ['video', 'Enter video filename', 'Required. File name for the video.'],
    // The phone says "audio note", not "audio" (`MetadataForm.tsx:102`).
    ['audio', 'Enter audio filename', 'Required. File name for the audio note.'],
  ])('branches the filename placeholder and helper on mediaType=%s', (mediaType, placeholder, helper) => {
    render(<Host mediaType={mediaType} />)

    expect(filenameBox()).toHaveAttribute('placeholder', placeholder)
    expect(screen.getByText(helper)).toBeInTheDocument()
  })

  it('labels the second field Notes and marks it optional in both places the phone does', () => {
    render(<Host />)

    expect(notesBox()).toHaveAttribute('placeholder', 'Add a description (optional)')
    expect(screen.getByText('Optional. Describe the content.')).toBeInTheDocument()
  })
})

describe('MetadataForm — the filename rules', () => {
  it('strips exactly the phone’s illegal set on every keystroke', async () => {
    // Mutation probe: drop `sanitizeFilename` from the change handler and the parent receives
    // the raw string, which would then reach a stored filename.
    const onValue = vi.fn()
    render(<Host initial={{ filename: '', caption: '' }} onValue={onValue} />)

    fireEvent.change(filenameBox(), { target: { value: 'DVR<rack>:"a"/b\\c|d?e*f' } })

    expect(onValue).toHaveBeenCalledWith({ filename: 'DVRrackabcdef', caption: '' })
    expect(filenameBox()).toHaveValue('DVRrackabcdef')
  })

  it('leaves spaces and dashes alone — a filename is not an identifier', () => {
    const onValue = vi.fn()
    render(<Host initial={{ filename: '', caption: '' }} onValue={onValue} />)

    fireEvent.change(filenameBox(), { target: { value: 'front door - cam 2' } })

    expect(onValue).toHaveBeenCalledWith({ filename: 'front door - cam 2', caption: '' })
  })

  it('refuses the 101st character rather than accepting an invalid name', async () => {
    const user = userEvent.setup()
    render(<Host initial={{ filename: '', caption: '' }} />)

    await user.type(filenameBox(), 'a'.repeat(MAX_FILENAME_LENGTH + 20))

    expect(filenameBox()).toHaveValue('a'.repeat(MAX_FILENAME_LENGTH))
  })

  it('caps the notes field at the phone’s 500', () => {
    render(<Host />)
    expect(notesBox()).toHaveAttribute('maxlength', String(MAX_CAPTION_LENGTH))
  })

  it('turns the browser’s text assists off on the filename and leaves them on for prose', () => {
    // The phone's `autoCapitalize="none"` + `autoCorrect={false}` on the filename only — the
    // caption is prose and gets the browser's help.
    render(<Host />)

    expect(filenameBox()).toHaveAttribute('autocorrect', 'off')
    expect(filenameBox()).toHaveAttribute('autocapitalize', 'off')
    expect(filenameBox()).toHaveAttribute('spellcheck', 'false')
    expect(notesBox()).not.toHaveAttribute('autocorrect')
    expect(notesBox()).not.toHaveAttribute('spellcheck', 'false')
  })

  it('keeps the two halves independent — editing one never clears the other', () => {
    const onValue = vi.fn()
    render(<Host initial={{ filename: 'rack front', caption: 'north wall' }} onValue={onValue} />)

    fireEvent.change(notesBox(), { target: { value: 'north wall, 3rd shelf' } })

    expect(onValue).toHaveBeenCalledWith({ filename: 'rack front', caption: 'north wall, 3rd shelf' })
    expect(filenameBox()).toHaveValue('rack front')
  })
})

describe('MetadataForm — an unsaveable filename says so', () => {
  it('replaces the helper with a reason, reddens the field and announces it', () => {
    // The phone shows NOTHING here (ui-mapping 09:268) — the Save button simply greys. This is
    // the deliberate divergence, and this is its pin.
    render(<Host initial={{ filename: '', caption: '' }} />)

    const message = screen.getByRole('alert')
    expect(message).toHaveTextContent(FILENAME_REQUIRED_MESSAGE)
    expect(filenameBox()).toHaveAttribute('aria-invalid', 'true')
    expect(filenameBox()).toHaveAccessibleDescription(FILENAME_REQUIRED_MESSAGE)
    // One line, not two: the phone's `TextInput` renders the error OR the helper.
    expect(screen.queryByText('Required. File name for the photo.')).not.toBeInTheDocument()
  })

  it('treats a whitespace-only name as empty, exactly as the trim rule says', () => {
    render(<Host initial={{ filename: '   ', caption: '' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(FILENAME_REQUIRED_MESSAGE)
  })

  it('clears the reason the moment a real name is typed', () => {
    render(<Host initial={{ filename: '', caption: '' }} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    fireEvent.change(filenameBox(), { target: { value: 'rack front' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Required. File name for the photo.')).toBeInTheDocument()
    expect(filenameBox()).not.toHaveAttribute('aria-invalid')
  })
})

describe('MetadataForm — the “Saving as” line', () => {
  it('shows the caller’s resolved filename, extension and all', () => {
    render(<Host savingAs="rack front.jpg" />)

    expect(screen.getByText('Saving as')).toBeInTheDocument()
    expect(screen.getByText('rack front.jpg')).toBeInTheDocument()
  })

  it('does not render at all when the caller has no container to name', () => {
    render(<Host />)
    expect(screen.queryByText('Saving as')).not.toBeInTheDocument()
  })

  it('hides while the name is unsaveable — never promises a file called “.jpg”', () => {
    // Mutation probe for the `!filenameInvalid` guard: drop it and this renders a bare
    // extension as though it were a filename the visitor would get.
    render(<Host initial={{ filename: '', caption: '' }} savingAs=".jpg" />)

    expect(screen.queryByText('Saving as')).not.toBeInTheDocument()
    expect(screen.queryByText('.jpg')).not.toBeInTheDocument()
  })
})
