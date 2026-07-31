/**
 * Address composition + street-type abbreviation (parity P2.3, matrix row 29).
 *
 * Verbatim port of the phone's `src/lib/utils/address-formatting.ts` —
 * `STREET_TYPE_ABBREVIATIONS` (address-formatting.ts:20-34), `abbreviateStreetTypes`
 * (:58-68) and `formatAddress` (:102-121). The abbreviation table, the letter-run regex,
 * the join order (business → street → city) and the ", " separator are all unchanged.
 *
 * Why it matters for parity: on the phone every consumer of a location address reads the
 * single composed `address` string that `formatAddress` produces — the PDF header, the
 * notes body, export filenames, the map rows — so "348 Langford Boulevard" is rendered
 * "348 Langford Blvd" EVERYWHERE. The demo previously hand-joined the three components at
 * six call sites with no abbreviation; this module is the one source those sites share.
 *
 * `formatLocationLabel` (the export-filename builder, address-formatting.ts:155-188) is
 * deliberately NOT ported: the demo has no export filenames yet (P5). Port it there, with
 * its own tests, rather than shipping an untested dead export now.
 *
 * Engine-pure: no React, no DOM, no clock.
 */

/**
 * Canonical full-word → abbreviation map for common street types.
 *
 * Keys are lowercase full words; values are the canonical abbreviation (no trailing
 * period, Canada-Post style). Inputs that are already abbreviated (e.g. "Blvd", "Ave")
 * are not in the map and pass through unchanged, which keeps the transform idempotent.
 *
 * Lifted key-for-key from phone `src/lib/utils/address-formatting.ts:20-34`.
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
 * Abbreviates common full-word street types within a street address.
 *
 * Each whole word is matched case-insensitively against the fixed list above. Numbers,
 * punctuation, and surrounding whitespace are preserved exactly — the regex matches runs
 * of LETTERS only. Words not in the list (including already-abbreviated forms) pass
 * through unchanged, so the transform is safe to apply more than once.
 *
 * Only street addresses should be passed here — business names and city names are
 * intentionally left untouched by callers (a business called "Lane Bryant" must not
 * become "Ln Bryant").
 *
 * @example abbreviateStreetTypes('348 Langford Boulevard') // '348 Langford Blvd'
 */
export function abbreviateStreetTypes(input: string | null | undefined): string {
  const safe = input ?? ''
  if (!safe) return ''

  return safe.replace(/[A-Za-z]+/g, (word) => {
    const abbreviation = STREET_TYPE_ABBREVIATIONS[word.toLowerCase()]
    return abbreviation ?? word
  })
}

/**
 * Formats structured address components into a comma-separated display string.
 *
 * Components are trimmed and joined with ", "; empty or whitespace-only components are
 * excluded. The order is always businessName, streetAddress, city. The street component
 * — and ONLY the street component — is street-type-abbreviated, so every consumer of a
 * composed address stays consistent.
 *
 * Pass `''` for `businessName` to compose the street+city label used by list rows and map
 * sheet items (the phone does exactly this inside `formatLocationLabel`).
 *
 * @example formatAddress('Kim\'s Convenience', '123 Main Street', 'Toronto')
 * // "Kim's Convenience, 123 Main St, Toronto"
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
