/**
 * Time on scene section formatter (phone parity:
 * `notes/formatters/time-on-scene-formatter.ts`, ported verbatim).
 *
 * NaN propagation is deliberate (phone PR-84 fix-delta M1 residual): an unparseable
 * timestamp poisons the total so the section renders an honest
 * "unable to calculate (invalid timestamp)" instead of a confidently-wrong
 * "Total time: 0 minutes" in the court document.
 */

import { formatTimestamp } from '@/features/demo/engine/logic/notes/format-timestamp'
import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'

/** A visit as the notes shape carries it (R-27: derived from the canonical field, never
 *  a local interface shadowing the store's `ArrivalDeparture` entity with disjoint keys). */
type NotesVisit = NotesRelevantFormData['arrivalDepartures'][number]

/**
 * Formats a duration in minutes to a human-readable string
 * (e.g. "2 hours 15 minutes"; "0 minutes" when zero).
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  let formattedTime = ''

  if (hours > 0) {
    formattedTime += `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  if (remainingMinutes > 0) {
    if (formattedTime.length > 0) {
      formattedTime += ' '
    }
    formattedTime += `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
  }

  return formattedTime || '0 minutes'
}

/**
 * Duration between two timestamps in whole minutes; negative differences clamp to 0;
 * unparseable input propagates as NaN (never silently clamped).
 */
function calculateDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0

  const start = new Date(startTime)
  const end = new Date(endTime)

  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs)) return NaN

  return Math.max(0, Math.round(diffMs / (1000 * 60)))
}

export function formatTimeOnScene(formData: NotesRelevantFormData): string {
  const { arrivalDepartures } = formData

  if (!arrivalDepartures || arrivalDepartures.length === 0) {
    return ''
  }

  // Filter out incomplete visits
  const validVisits = arrivalDepartures.filter(
    (visit: NotesVisit) => visit.arrivalDateTime && visit.departureDateTime
  )

  if (validVisits.length === 0) {
    return ''
  }

  // Total time across all visits. NaN from any visit with an unparseable timestamp
  // poisons the sum — deliberately (honest "unable to calculate" beats summing
  // around the bad visit).
  const totalMinutes = validVisits.reduce((total: number, visit: NotesVisit) => {
    return total + calculateDuration(visit.arrivalDateTime, visit.departureDateTime)
  }, 0)

  const totalLabel = Number.isNaN(totalMinutes)
    ? 'unable to calculate (invalid timestamp)'
    : formatDuration(totalMinutes)

  // For a single visit, show the specific arrival/departure times
  if (validVisits.length === 1) {
    const visit = validVisits[0]
    const arrivalTime = formatTimestamp(visit.arrivalDateTime)
    const departureTime = formatTimestamp(visit.departureDateTime)

    return `• On scene from ${arrivalTime} to ${departureTime}\n• Total time: ${totalLabel}`
  }

  // For multiple visits, show the visit list with the total
  let result = '• On scene for multiple visits:\n'
  validVisits.forEach((visit: NotesVisit, index: number) => {
    const arrivalTime = formatTimestamp(visit.arrivalDateTime)
    const departureTime = formatTimestamp(visit.departureDateTime)
    result += `   Visit ${index + 1}: ${arrivalTime} to ${departureTime}\n`
  })

  result += `• Total time: ${totalLabel}`

  return result
}
