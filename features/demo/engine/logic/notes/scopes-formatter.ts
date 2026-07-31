/**
 * Scopes (recovered footage) section formatter (phone parity:
 * `notes/formatters/scopes-formatter.ts`, ported verbatim).
 *
 * Path A — extracted scopes (auto-calculated DVR-time) win when any are valid:
 * simple "(DVR time)" suffix. Path B — fall back to requested scopes: complex
 * dual "requested / corrected" form.
 */

import { formatTimestamp } from '@/features/demo/engine/logic/notes/format-timestamp'
import type {
  NotesExtractedScope,
  NotesRelevantFormData,
  NotesScope,
} from '@/features/demo/engine/logic/notes/types'

/** Processes camera names from raw string to a clean, comma-separated list. */
function processCameraNames(rawCameraNames: string): string {
  if (!rawCameraNames || rawCameraNames.trim() === '') {
    return 'requested cameras'
  }

  return rawCameraNames
    .split(/[,\n]/)
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .join(', ')
}

/** Formats extracted scopes with the simple "(DVR time)" suffix. */
function formatExtractedScopes(extractedScopes: NotesExtractedScope[]): string {
  const validScopes = extractedScopes.filter(
    scope => scope.startDateTime && scope.endDateTime
  )

  if (validScopes.length === 0) {
    return ''
  }

  if (validScopes.length === 1) {
    const scope = validScopes[0]
    const cameraNames = processCameraNames(scope.cameras)
    const formattedStart = formatTimestamp(scope.startDateTime)
    const formattedEnd = formatTimestamp(scope.endDateTime)

    if (!formattedStart || !formattedEnd) {
      return ''
    }

    return `• Recovered ${cameraNames} from ${formattedStart} to ${formattedEnd} (DVR time)`
  }

  let result = '• Recovered the following footage:\n'
  result += validScopes.map((scope, index) => {
    const cameraNames = processCameraNames(scope.cameras)
    const formattedStart = formatTimestamp(scope.startDateTime)
    const formattedEnd = formatTimestamp(scope.endDateTime)
    return `   ${index + 1}. ${cameraNames} from ${formattedStart} to ${formattedEnd} (DVR time)`
  }).join('\n')

  return result
}

/** Formats scope information, prioritizing extracted scopes over requested scopes. */
export function formatScopes(formData: NotesRelevantFormData): string {
  const { scopes, extractedScopes } = formData

  // Use extracted scopes if available (simple format)
  if (extractedScopes && extractedScopes.length > 0) {
    const result = formatExtractedScopes(extractedScopes)
    if (result) return result
  }

  // Fall back to requested scopes (complex dual format)
  if (!scopes || scopes.length === 0) return ''

  const validScopes = scopes.filter(
    (scope: NotesScope) => scope.startDateTime && scope.endDateTime
  )

  if (validScopes.length === 0) return ''

  const formatRequestedScope = (scope: NotesScope): string => {
    const cameraNames = processCameraNames(scope.cameras)
    const formattedStart = formatTimestamp(scope.startDateTime)
    const formattedEnd = formatTimestamp(scope.endDateTime)

    if (!formattedStart || !formattedEnd) return ''

    const timeType = scope.isActualTime ? 'actual' : 'DVR'
    let text = `${cameraNames} from ${formattedStart} to ${formattedEnd} (${timeType} time`

    if (scope.correctedStartDateTime && scope.correctedEndDateTime) {
      const correctedStart = formatTimestamp(scope.correctedStartDateTime)
      const correctedEnd = formatTimestamp(scope.correctedEndDateTime)
      const correctedType = scope.isActualTime ? 'DVR' : 'actual'
      text += `, requested) / ${correctedStart} to ${correctedEnd} (${correctedType} time, corrected)`
    } else {
      text += ')'
    }

    return text
  }

  if (validScopes.length === 1) {
    const text = formatRequestedScope(validScopes[0])
    return text ? `• Recovered ${text}` : ''
  }

  let result = '• Recovered the following footage:\n'
  result += validScopes.map((scope: NotesScope, index: number) =>
    `   ${index + 1}. ${formatRequestedScope(scope)}`
  ).join('\n')

  return result
}
