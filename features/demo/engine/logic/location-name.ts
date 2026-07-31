/**
 * Per-case location-name uniqueness — the demo's port of the phone's
 * `src/features/case-management/utils/location-name.ts` (parity P3.4, matrix row 13).
 *
 * Names are compared **trimmed + case-insensitively** (phone location-name.ts:6-8): "Main Store"
 * and " main store " are the same location to a human reading a case file, so they collide.
 *
 * Only the predicate is ported here. The phone file's two suffix generators —
 * `generateCopyName` ("X - Copy", "X - Copy (2)", …) for the duplicate flow and
 * `ensureUniqueLocationName` ("X (2)", "X (3)", …) for import dedup — are **P3.5's** to port,
 * and they belong in THIS module when they land: both are built on the same
 * `normalizeLocationName` below plus the phone's `LIMITS.MAX_LOCATION_NAME_LENGTH` (100,
 * phone `case-management/constants/index.ts:64`) that they truncate against.
 */

/** Canonical comparison form: trimmed + lowercased (phone location-name.ts:27-29). */
function normalizeLocationName(name: string): string {
  return name.trim().toLowerCase()
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
 */
export function isLocationNameTaken(name: string, existingNames: readonly string[]): boolean {
  const normalized = normalizeLocationName(name)
  return existingNames.some((existing) => normalizeLocationName(existing) === normalized)
}
