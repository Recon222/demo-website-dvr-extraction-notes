'use client'

import type { CSSProperties } from 'react'

import {
  MAX_CAPTION_LENGTH,
  MAX_FILENAME_LENGTH,
  isValidFilename,
  sanitizeFilename,
} from '@/features/demo/engine/logic/media'
import type { MediaKind } from '@/features/demo/engine/types'
import { Field } from '@/features/demo/ui/screens/_shared'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * The shared filename + notes form (parity P4.4, matrix row 56) — the phone's
 * `src/features/media/shared/components/MetadataForm.tsx`, one component with three callers
 * (photo/video review, audio review, and P4.5's library). It closes the last four open field
 * keys: media `filename` + `caption`, audio `filename` + `caption`.
 *
 * Controlled, exactly like the phone's: the parent owns the value, this owns the rules. It
 * touches no store, no capture hook and no `CapturedMedia` — a caller that has one resolves the
 * `savingAs` line itself, which is what keeps this usable by a surface editing an item that was
 * saved a while ago.
 *
 * ── What is ported, and what is not ─────────────────────────────────────────────────────────
 * PORTED verbatim: both labels, both placeholders (`mediaType`-branched), both helper texts
 * (including the phone's `audio note` substring for audio), the 100/500 caps, the
 * strip-on-keystroke sanitizer, `autoCapitalize`/`autoCorrect` off on the filename, and the
 * validity rule — trimmed 1–100 characters (`MetadataForm.tsx:64-68`, ui-mapping 09:256).
 *
 * NOT ported — `onValidChange`. The phone pushes validity out through a mount effect because
 * its rule lives inside the component. Here the rule is a pure engine predicate the parent
 * already imports (`isValidFilename`), so a parent gates its own Save button by CALLING it.
 * That is one fact derived at the point of use instead of a second copy kept in sync by an
 * effect — and it removes the phone's mount-order hazard, where a consumer that forgets to wire
 * the callback silently never learns the filename is empty.
 *
 * NOT ported — the phone's silent refusal. `MetadataForm` never passes its `TextInput`'s
 * `error` prop, so an empty filename shows no message at all and the Save button is simply grey
 * (ui-mapping 09:268 records this explicitly). The demo says why: the field goes red with a
 * `role="alert"` line, which is the same `error` mechanism the phone has and does not use.
 */

export interface MetadataFormValue {
  /** The filename BASE — no extension. `mediaFilename`/`buildMediaItem` are the only extension
   *  authors in the demo (§58c), so nothing here ever appends one. */
  filename: string
  /** Free-form notes, stored as `MediaItem.caption`. Optional. */
  caption: string
}

export interface MetadataFormProps {
  value: MetadataFormValue
  onChange(value: MetadataFormValue): void
  /** Drives the filename placeholder and helper text (the phone's only `mediaType` use). */
  mediaType: MediaKind
  /**
   * The full filename this base will be stored under, extension included — rendered under the
   * field so the visitor can see what is actually written. Optional: a caller with no container
   * to name omits it and the line does not render.
   */
  savingAs?: string
}

/** The phone's filename placeholder, branched on `mediaType` (`MetadataForm.tsx:85-89`). */
const PLACEHOLDER: Readonly<Record<MediaKind, string>> = Object.freeze({
  photo: 'Enter image filename',
  video: 'Enter video filename',
  audio: 'Enter audio filename',
})

/** The phone's helper text, which says `audio note` rather than `audio` (`MetadataForm.tsx:102`). */
export function filenameHelperText(mediaType: MediaKind): string {
  return `Required. File name for the ${mediaType === 'audio' ? 'audio note' : mediaType}.`
}

/**
 * What replaces the helper text when the filename cannot be saved. The ONLY reachable invalid
 * state: `maxLength` refuses the 101st character, so an over-length name is impossible rather
 * than invalid, and there is no second message to write.
 */
export const FILENAME_REQUIRED_MESSAGE = 'Enter a file name — this is what the file is stored as.'

const savingAsLabel: CSSProperties = { fontSize: 12, color: '#7a9fc4' }
/** U6.4a: the filename the visitor is about to save under is DATA they must read, so it takes
 *  `colors.text` — it read the retired form-label hex, which had no palette sibling at all. */
const savingAsValue: CSSProperties = {
  fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
  fontSize: 13,
  color: colors.text,
  wordBreak: 'break-all',
}

export function MetadataForm({ value, onChange, mediaType, savingAs }: MetadataFormProps) {
  // Sanitize on every keystroke, as the phone does — the illegal set never reaches the value,
  // so no other layer has to defend against it. `mediaFilename` sanitizes again on the way to
  // storage; that is a boundary guard, not a duplicate of this.
  const setFilename = (text: string) => onChange({ ...value, filename: sanitizeFilename(text) })
  const setCaption = (text: string) => onChange({ ...value, caption: text })

  const filenameInvalid = !isValidFilename(value.filename)

  return (
    <div>
      <Field
        label="Filename"
        required
        value={value.filename}
        onChange={setFilename}
        placeholder={PLACEHOLDER[mediaType]}
        hint={filenameHelperText(mediaType)}
        error={filenameInvalid ? FILENAME_REQUIRED_MESSAGE : undefined}
        maxLength={MAX_FILENAME_LENGTH}
        autoCorrect={false}
      />
      {savingAs !== undefined && !filenameInvalid && (
        <div style={{ marginTop: -8, marginBottom: 14 }}>
          <div style={savingAsLabel}>Saving as</div>
          <div style={savingAsValue}>{savingAs}</div>
        </div>
      )}
      <Field
        label="Notes"
        value={value.caption}
        onChange={setCaption}
        placeholder="Add a description (optional)"
        hint="Optional. Describe the content."
        maxLength={MAX_CAPTION_LENGTH}
        multiline
      />
    </div>
  )
}
