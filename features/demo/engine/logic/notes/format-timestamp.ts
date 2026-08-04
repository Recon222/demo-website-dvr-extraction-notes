/**
 * Timestamp formatter — leaf module, no imports (phone parity:
 * `notes/formatters/format-timestamp.ts`, ported verbatim).
 *
 * Failure modes are deliberate and load-bearing (phone PR-84 C1):
 * - empty/whitespace input → `''` (absent data — downstream empty-gates drop the line)
 * - present but UNPARSEABLE → the RAW input string (visible in the document; returning
 *   `''` made bad data indistinguishable from absent and silently dropped whole
 *   sections from the court PDF — a visible "TBD:00" is the correct failure mode)
 */

/**
 * Formats a timestamp for display in notes.
 * @param timestamp - ISO/canonical timestamp string
 * @returns `YYYY-MM-DD HH:MM:SS` via LOCAL getters; `''` for blank; raw input when unparseable
 */
export function formatTimestamp(timestamp: string): string {
  if (!timestamp || !timestamp.trim()) return ''

  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return timestamp

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
