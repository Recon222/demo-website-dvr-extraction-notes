/**
 * Address & visits section formatter — progressive Tier 0–3 (phone parity:
 * `notes/formatters/address-formatter.ts`, ported verbatim).
 *
 * Tier 0: no location string → ''.
 * Tier 1: address known, no renderable scope → single attendance bullet ending '.'.
 * Tier 2: attendance header ending 'from:' + per-scope requested-time lines.
 * Tier 3: + corrected-time line per scope, only once BOTH corrected times exist.
 */

import { formatTimestamp } from '@/features/demo/engine/logic/notes/format-timestamp'
import { formatAddress } from '@/features/demo/engine/logic/notes/address-formatting'
import type { NotesRelevantFormData, NotesScope } from '@/features/demo/engine/logic/notes/types'

/**
 * Formats the address and visit information section with embedded scope data.
 */
export function formatAddressAndVisits(formData: NotesRelevantFormData): string {
  const { address, businessName, streetAddress, city, scopes } = formData

  // Build the location string from structured components when available; fall back to
  // the pre-formatted `address` field (legacy/import path — always '' in the demo).
  const locationString = formatAddress(businessName, streetAddress, city) || address

  // Tier 0 — no address (structured or legacy)
  if (!locationString) {
    return ''
  }

  // Progressive tiers, evaluated PER SCOPE: a scope renders at all only with both
  // requested times; its corrected line appends only when both corrected times are
  // present. Numbering counts RENDERED scopes (filtered-out ones consume no number).
  const renderedScopes = scopes?.filter(
    (scope: NotesScope) => scope.startDateTime && scope.endDateTime
  ) || []

  // Tier 1 — address known, no renderable scope yet
  if (renderedScopes.length === 0) {
    return `• Attended ${locationString} to recover requested video evidence.`
  }

  // Tier 2/3 — attendance header + per-scope lines
  let result = `• Attended ${locationString} to recover requested video evidence from:\n`

  renderedScopes.forEach((scope: NotesScope, index: number) => {
    const requestedLabel = scope.isActualTime ? 'Real Time' : 'DVR Time'
    const correctedLabel = scope.isActualTime ? 'DVR Time' : 'Real Time'

    const requestedStart = formatTimestamp(scope.startDateTime)
    const requestedEnd = formatTimestamp(scope.endDateTime)

    result += `Scope ${index + 1}:\n`
    result += `${requestedLabel}: ${requestedStart} to ${requestedEnd}`

    // Tier 3 — corrected line only once the offset calculation has produced both times
    if (scope.correctedStartDateTime && scope.correctedEndDateTime) {
      const correctedStart = formatTimestamp(scope.correctedStartDateTime)
      const correctedEnd = formatTimestamp(scope.correctedEndDateTime)
      result += `\n${correctedLabel}: ${correctedStart} to ${correctedEnd}`
    }

    // Single newline between scopes (except after last scope)
    if (index < renderedScopes.length - 1) {
      result += '\n'
    }
  })

  return result
}
