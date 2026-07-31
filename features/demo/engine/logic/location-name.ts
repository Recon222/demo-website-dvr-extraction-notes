/**
 * Location-name uniqueness helpers — a verbatim port of the phone's
 * `src/features/case-management/utils/location-name.ts` (P3.4 rows 13 + P3.5 row 14, merged
 * at the P3 assembly: P3.4 ported the predicate and named this module as the home the two
 * suffix generators belonged in; P3.5 ported them).
 *
 * Names are compared trimmed + case-insensitively everywhere — "Main Store" and
 * " main store " are the same location to a human reading a case file, so they collide.
 *
 * Deliberately case-INSENSITIVE, and deliberately NOT harmonized with `case-number.ts`'s
 * case-SENSITIVE duplicate-case check (deferred §50b/§50c): the phone's location-name rule is
 * a proactive service check with no index behind it, while its case-number rule is a SQLite
 * UNIQUE column under the default BINARY collation with no `COLLATE NOCASE`. The two differ on
 * the phone; they must differ here.
 *
 * Two suffix styles, mirroring Windows Explorer:
 * - Duplicate flow:  "X - Copy", "X - Copy (2)", "X - Copy (3)", ...
 * - Dedup flow:      "X (2)", "X (3)", ... (a name arriving twice isn't a "copy" — the
 *   phone uses this for imports; the demo uses it for the new-address card's default name,
 *   `ensureUniqueLocationName('New Location', existingNames)`, phone `cases.tsx:461`).
 *
 * Pure TS, no React — engine layer. The regexes, the fallback guards and the
 * `existingNames.length + 2` loop bound are the phone's, unchanged: the numbering edge
 * cases (gaps, re-duplicating a copy, truncation) are court-visible naming behaviour, so
 * they are ported rather than re-derived.
 */

/**
 * Phone `LIMITS.MAX_LOCATION_NAME_LENGTH`
 * (`src/features/case-management/constants/index.ts:64`). Every name these helpers
 * produce fits inside it — the base is truncated to make room for the suffix, never the
 * other way around (a truncated "- Copy (2)" would silently collide).
 */
export const LOCATION_NAME_MAX_LENGTH = 100

/** Trailing " - Copy" or " - Copy (N)" produced by the duplicate flow. */
const COPY_SUFFIX_PATTERN = /\s*-\s*Copy(?:\s*\(\d+\))?$/i

/** Trailing " (N)" produced by dedup. */
const NUMBER_SUFFIX_PATTERN = /\s*\(\d+\)$/

/** Canonical comparison form: trimmed + lowercased (phone location-name.ts:27-29). */
function normalizeLocationName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Truncates `base` so that `base + suffix` fits within LOCATION_NAME_MAX_LENGTH, then
 * returns the combined name. `trimEnd` keeps a truncation that lands mid-space from
 * producing "Name  - Copy".
 */
function fitWithSuffix(base: string, suffix: string): string {
  const maxBaseLength = LOCATION_NAME_MAX_LENGTH - suffix.length
  const truncatedBase = base.length > maxBaseLength ? base.slice(0, maxBaseLength).trimEnd() : base
  return `${truncatedBase}${suffix}`
}

/**
 * True when `name` collides with any sibling in `existingNames` (phone location-name.ts:49-52).
 *
 * `existingNames` is the set of names already on ONE case: uniqueness is per-case, never global.
 * Two different cases may each hold a "Front Counter" — that is real casework, and rejecting it
 * would be a constraint the phone does not have.
 *
 * A blank `name` collides with a blank sibling, exactly as on the phone. Callers gate blank
 * separately and FIRST (phone NewLocationModal.tsx:113-117), so "required" is never reported as
 * "duplicate" — see `new-location-gate.ts`.
 *
 * @param name - Candidate location name
 * @param existingNames - Location names already present in the case
 */
export function isLocationNameTaken(name: string, existingNames: readonly string[]): boolean {
  const normalized = normalizeLocationName(name)
  return existingNames.some((existing) => normalizeLocationName(existing) === normalized)
}

/**
 * Generates a Windows-style copy name that does not collide with any existing sibling:
 * "X - Copy", then "X - Copy (2)", "X - Copy (3)", ...
 *
 * A trailing " - Copy"/" - Copy (N)" on the source is stripped first, so duplicating a copy
 * yields "X - Copy (2)", never "X - Copy - Copy". Results always fit
 * LOCATION_NAME_MAX_LENGTH.
 *
 * @param sourceName - Name of the location being duplicated
 * @param existingNames - Location names already present in the case
 * @returns First non-colliding copy name
 */
export function generateCopyName(sourceName: string, existingNames: readonly string[]): string {
  const stripped = sourceName.trim().replace(COPY_SUFFIX_PATTERN, '')
  // Guard: a name that was nothing but a copy suffix (e.g. "- Copy") would strip to empty —
  // fall back to the trimmed source so we never emit a bare " - Copy".
  const base = stripped.length > 0 ? stripped : sourceName.trim()

  const firstCandidate = fitWithSuffix(base, ' - Copy')
  if (!isLocationNameTaken(firstCandidate, existingNames)) {
    return firstCandidate
  }

  // existingNames.length + 2 candidates guarantees a free slot.
  for (let n = 2; n <= existingNames.length + 2; n++) {
    const candidate = fitWithSuffix(base, ` - Copy (${n})`)
    if (!isLocationNameTaken(candidate, existingNames)) {
      return candidate
    }
  }

  // Unreachable: the loop above must find a free slot. Kept for type safety.
  return fitWithSuffix(base, ` - Copy (${existingNames.length + 2})`)
}

/**
 * Returns `desiredName` (trimmed) if it is free, otherwise the first free numbered variant:
 * "X (2)", "X (3)", ... A trailing " (N)" on the input is stripped before numbering so
 * suffixes never stack ("X (2) (2)"). Results always fit LOCATION_NAME_MAX_LENGTH.
 *
 * @param desiredName - Requested location name
 * @param existingNames - Location names already present in the case
 * @returns A name guaranteed not to collide with `existingNames`
 */
export function ensureUniqueLocationName(
  desiredName: string,
  existingNames: readonly string[],
): string {
  const trimmed = desiredName.trim()
  if (!isLocationNameTaken(trimmed, existingNames)) {
    return trimmed
  }

  const stripped = trimmed.replace(NUMBER_SUFFIX_PATTERN, '')
  const base = stripped.length > 0 ? stripped : trimmed

  for (let n = 2; n <= existingNames.length + 2; n++) {
    const candidate = fitWithSuffix(base, ` (${n})`)
    if (!isLocationNameTaken(candidate, existingNames)) {
      return candidate
    }
  }

  // Unreachable: the loop above must find a free slot. Kept for type safety.
  return fitWithSuffix(base, ` (${existingNames.length + 2})`)
}
