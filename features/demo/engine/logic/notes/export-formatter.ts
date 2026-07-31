/**
 * Export information section formatter (phone parity:
 * `notes/formatters/export-formatter.ts`, ported verbatim).
 */

import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'

export function formatExport(formData: NotesRelevantFormData): string {
  const { sizeGb, exportMedia, mediaProvidedVia } = formData

  if (!sizeGb || !exportMedia) {
    return ''
  }

  let result = `• ${sizeGb}GB of video was exported to ${exportMedia}`

  if (mediaProvidedVia) {
    result += `, and provided via ${mediaProvidedVia}`
  }

  result += '.'

  return result
}
