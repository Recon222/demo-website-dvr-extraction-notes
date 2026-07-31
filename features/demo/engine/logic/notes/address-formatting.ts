/**
 * Address formatting — structured components → display string (phone parity:
 * `src/lib/utils/address-formatting.ts`, `abbreviateStreetTypes` + `formatAddress`
 * ported verbatim).
 *
 * Lives inside the notes module for now because the address section formatter is its
 * first demo consumer. P2.3 (Submission depth) also needs `formatAddress` for the
 * derived-address field — when that lands, lift this file to a shared engine/logic
 * location and point both at it (noted in the P2.1 report for the orchestrator).
 */

/**
 * Canonical full-word → abbreviation map for common street types. Keys are lowercase
 * full words; values are the canonical abbreviation (no trailing period, Canada-Post
 * style). Already-abbreviated inputs ("Blvd", "Ave") are not in the map and pass
 * through unchanged, keeping the transform idempotent.
 */
const STREET_TYPE_ABBREVIATIONS: Readonly<Record<string, string>> = Object.freeze({
  boulevard: 'Blvd',
  avenue: 'Ave',
  drive: 'Dr',
  street: 'St',
  road: 'Rd',
  court: 'Ct',
  crescent: 'Cres',
  lane: 'Ln',
  place: 'Pl',
  highway: 'Hwy',
  terrace: 'Ter',
  circle: 'Cir',
  parkway: 'Pkwy',
})

/**
 * Abbreviates common full-word street types within a street address. Whole words are
 * matched case-insensitively; numbers, punctuation, and whitespace are preserved
 * exactly. Words not in the list pass through unchanged (idempotent). Only street
 * addresses should be passed here — business and city names stay untouched by callers.
 *
 * @example abbreviateStreetTypes('348 Langford Boulevard') // '348 Langford Blvd'
 */
export function abbreviateStreetTypes(input: string | null | undefined): string {
  const safe = input ?? ''
  if (!safe) return ''

  // Match runs of letters only; this leaves digits, commas, periods and
  // whitespace (including repeated spaces) exactly where they were.
  return safe.replace(/[A-Za-z]+/g, (word) => {
    const abbreviation = STREET_TYPE_ABBREVIATIONS[word.toLowerCase()]
    return abbreviation ?? word
  })
}

/**
 * Formats structured address components into a comma-separated display string.
 * Components are trimmed; empty ones are excluded; order is always
 * businessName, streetAddress, city. Street types are abbreviated here so every
 * consumer (notes body, PDF header) stays consistent.
 *
 * @example formatAddress('ABC Store', '123 Main Street', 'Springfield')
 * // 'ABC Store, 123 Main St, Springfield'
 */
export function formatAddress(
  businessName: string | null | undefined,
  streetAddress: string | null | undefined,
  city: string | null | undefined,
): string {
  const parts: string[] = []

  const safeBusiness = businessName ?? ''
  const safeStreet = streetAddress ?? ''
  const safeCity = city ?? ''

  if (safeBusiness.trim()) parts.push(safeBusiness.trim())
  if (safeStreet.trim()) parts.push(abbreviateStreetTypes(safeStreet.trim()))
  if (safeCity.trim()) parts.push(safeCity.trim())

  return parts.join(', ')
}
