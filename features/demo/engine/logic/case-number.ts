/**
 * Case-number uniqueness — the demo's analog of the phone's `cases.case_number TEXT NOT NULL
 * UNIQUE` column (`services/database.ts:264`).
 *
 * WHERE THE RULE LIVES, AND WHY IT DIFFERS HONESTLY FROM THE PHONE
 * On the phone the constraint is enforced by SQLite: `createCase` lets the INSERT fail,
 * `wrapDatabaseError` turns the message into a `ConstraintViolationError`, and
 * `case-service.ts:405-415` narrows it to `DuplicateCaseNumberError` by (table, column).
 * The demo has no database — its cases live in the session store — so the enforcement point
 * is the store's own `createCase`, which calls `assertCaseNumberFree` before it mints an id.
 * Same shape (the write boundary refuses, the modal catches a typed error), truthfully
 * different scope: the phone's uniqueness spans every case ever saved on the device; the
 * demo's spans the cases in THIS browser session. Nothing here claims otherwise.
 *
 * COMPARISON SEMANTICS — deliberately case-SENSITIVE.
 * SQLite's default collation is BINARY and the phone declares no `COLLATE NOCASE`, so
 * `PR25-1` and `pr25-1` are two different cases on the phone. This module matches that:
 * trim only (the modal trims before submit anyway), never lowercase. Do NOT "harmonize" it
 * with the location-name rule — `isLocationNameTaken` (P3.4/P3.5) is trimmed AND
 * case-insensitive because that one is a proactive service-layer check with no DB index
 * behind it (`utils/errors.ts:204-213`). The two rules are different on the phone and must
 * stay different here.
 */

/** The comparison form of a case number: trimmed, case preserved (SQLite BINARY parity). */
export function normalizeCaseNumber(caseNumber: string): string {
  return caseNumber.trim()
}

/** The demo's `DuplicateCaseNumberError` — message lifted verbatim from the phone's
 *  (`src/features/case-management/utils/errors.ts:181-192`), which the New Case banner
 *  renders with a recovery hint appended. `caseNumber` carries the offending value so a
 *  caller never has to re-parse the message. */
export class DuplicateCaseNumberError extends Error {
  constructor(readonly caseNumber: string) {
    super(`A case with number "${caseNumber}" already exists`)
    this.name = 'DuplicateCaseNumberError'
  }
}

/** True when `candidate` collides with an existing case number (trimmed, case-sensitive). */
export function isCaseNumberTaken(
  existing: readonly { caseNumber: string }[],
  candidate: string,
): boolean {
  const wanted = normalizeCaseNumber(candidate)
  return existing.some((c) => normalizeCaseNumber(c.caseNumber) === wanted)
}

/**
 * The write-boundary guard. Throws `DuplicateCaseNumberError` when the number is taken —
 * the store calls this instead of letting a second case quietly shadow the first.
 *
 * A blank candidate is NOT special-cased: two blank numbers collide, exactly as two empty
 * strings would in the phone's UNIQUE column. The modal's required-field gate is what keeps
 * a blank number from ever reaching here.
 */
export function assertCaseNumberFree(
  existing: readonly { caseNumber: string }[],
  candidate: string,
): void {
  if (isCaseNumberTaken(existing, candidate)) {
    throw new DuplicateCaseNumberError(normalizeCaseNumber(candidate))
  }
}
