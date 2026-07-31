/**
 * Notes assembler — structured sections → the flat display/export string (phone
 * parity: `notes/services/notes-assembler.ts`, ported verbatim). The single function
 * every flat-string consumer calls (Copy all, the Case Notes PDF).
 */

import type { NoteSection, NoteSectionId } from '@/features/demo/engine/types'
import { SECTION_DEFINITIONS } from '@/features/demo/engine/logic/notes/section-registry'

/** Canonical section order derived from SECTION_DEFINITIONS, computed once. */
const SECTION_ORDER: NoteSectionId[] = SECTION_DEFINITIONS.map(d => d.id)

/**
 * Assembles the flat notes string from structured sections (addendum-aware).
 *
 * Per section, in canonical registry order, the block is
 * `[content, userAddendum].filter(nonEmpty).join('\n')` — an addendum renders on its
 * own line inside the section, and a deleted section that still carries an addendum
 * renders that addendum alone. Empty blocks are dropped (no stray newlines). Blocks
 * join with `'\n\n'`; `freeText` is appended last, `'\n\n'`-separated.
 */
export function assembleNotesString(
  sections: NoteSection[],
  freeText: string
): string {
  // Sort by canonical order; unknown ids (defensive) sort after known ones.
  const ordered = [...sections].sort((a, b) => {
    const idxA = SECTION_ORDER.indexOf(a.id)
    const idxB = SECTION_ORDER.indexOf(b.id)
    return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB)
  })

  const blocks = ordered
    .map(section =>
      [section.content, section.userAddendum]
        .filter((part): part is string => !!part && part.length > 0)
        .join('\n')
    )
    .filter(block => block.length > 0)

  const parts: string[] = []

  if (blocks.length > 0) {
    parts.push(blocks.join('\n\n'))
  }

  if (freeText.length > 0) {
    parts.push(freeText)
  }

  return parts.join('\n\n')
}
