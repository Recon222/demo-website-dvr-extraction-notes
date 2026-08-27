'use client'

import type { CSSProperties } from 'react'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS } from '@/features/demo/ui/glass-tokens'

/**
 * Paste-text step — step 2 of the phone's ImportPickerModal, ported for P1.2 (matrix row 72).
 *
 * The back chevron lives in the modal header (ModalShell's onBack — the phone's
 * chevron-back · "Paste Request Text" · close row, ImportPickerModal.tsx:642-661);
 * this component renders the body: hint · bounded textarea · full-width submit.
 */

export const PASTE_COPY = {
  title: 'Paste Request Text', // ImportPickerModal.tsx:652 — consumed by ImportModal's ModalShell title
  backLabel: 'Back to import options', // :646 — consumed by ImportModal's ModalShell onBack
  // Phone (:704-707): 'Paste the recovery request — an email, form text, or notes. The
  // on-device AI extracts the fields, just like a PDF import.' The demo's extraction is NOT
  // on-device — it calls the configured model API (with a sample fallback) — so the honesty
  // rule drops the 'on-device' claim rather than fake it. Everything else is verbatim.
  hint: 'Paste the recovery request — an email, form text, or notes. The AI extracts the fields, just like a PDF import.',
  placeholder: 'Paste request text here...', // :722
  inputLabel: 'Pasted request text', // :735
  submit: 'Import with AI', // :746
} as const

/** Phone parity: PASTE_INPUT_MIN/MAX_HEIGHT (ImportPickerModal.tsx:54-55). */
export const PASTE_INPUT_MIN_HEIGHT = 240
export const PASTE_INPUT_MAX_HEIGHT = 320

const pasteInput: CSSProperties = {
  width: '100%',
  // Bounded, not content-driven (phone PR #78 review H2): past the cap the text scrolls
  // INSIDE the box instead of growing it and shoving the submit button off-screen — a
  // pasted 2-page email stays one scroll away from "Import with AI". Never remove the cap.
  minHeight: PASTE_INPUT_MIN_HEIGHT,
  maxHeight: PASTE_INPUT_MAX_HEIGHT,
  overflowY: 'auto',
  resize: 'none',
  borderRadius: 10,
  border: GLASS.borderBtn,
  background: '#0a1320',
  color: '#dfe9f3',
  fontSize: 12.5,
  lineHeight: 1.5,
  padding: 12,
  fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
  outline: 'none',
}

export interface PasteStageProps {
  text: string
  onTextChange(value: string): void
  onRun(): void
}

export function PasteStage({ text, onTextChange, onRun }: PasteStageProps) {
  const blank = !text.trim()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.5 }}>{PASTE_COPY.hint}</div>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        aria-label={PASTE_COPY.inputLabel}
        placeholder={PASTE_COPY.placeholder}
        /* Forensic field (phone PR #78 review M1): an edit to pasted text — trimming a
           header, fixing a typo — must not let the browser silently rewrite an adjacent
           identifier (a DVR model like DS-7216HUHI-K2, an OCC or badge number) before the
           AI extracts it. Pastes are unaffected either way; typed edits are the exposure. */
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="off"
        style={pasteInput}
      />
      <button
        type="button"
        onClick={onRun}
        disabled={blank}
        style={{
          width: '100%',
          ...buttonStyle({ disabled: blank }),
        }}
      >
        {PASTE_COPY.submit}
      </button>
    </div>
  )
}
