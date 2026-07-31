/**
 * DVR retention section formatter (phone parity:
 * `notes/formatters/retention-formatter.ts`, ported verbatim).
 *
 * Expects the bare day count ('35') — the demo stores `totalDvrRetention` WITH its
 * unit ('35 days', written by the retention-derivation effect), and the coercion
 * site (`extractNotesRelevantData`) strips it so this formatter appends ' days'
 * exactly once, matching the phone's output byte-for-byte.
 */

import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'

export function formatRetention(formData: NotesRelevantFormData): string {
  const { totalDvrRetention } = formData

  if (!totalDvrRetention) {
    return ''
  }

  return `• DVR retention period: ${totalDvrRetention} days`
}
