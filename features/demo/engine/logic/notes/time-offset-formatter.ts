/**
 * Time offset section formatter (phone parity:
 * `notes/formatters/time-offset-formatter.ts`, ported verbatim).
 *
 * Keys off the DISPLAYED `formattedDifference` via `isDvrTimeCorrect` — never a
 * `differenceMs` the narrowed notes type deliberately does not carry.
 */

import { isDvrTimeCorrect } from '@/features/demo/engine/logic/time'
import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'

export function formatTimeOffset(formData: NotesRelevantFormData): string {
  const { timeOffsetData } = formData

  if (!timeOffsetData) {
    return ''
  }

  if (isDvrTimeCorrect(timeOffsetData)) {
    return '• Time offset: DVR time is CORRECT.'
  }

  return `• Time offset: DVR is ${timeOffsetData.formattedDifference} ${timeOffsetData.direction} real time.`
}
