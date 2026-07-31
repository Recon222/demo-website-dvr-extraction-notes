/**
 * Exhaustiveness guard for discriminated unions and closed string unions.
 *
 * Ported verbatim from the phone app's `src/lib/utils/assert-never.ts` (same doc comment,
 * same throw shape) — the demo previously spelled this inline as
 * `const exhaustive: never = value` in each switch, which type-checks but throws nothing at
 * runtime when a value slips through a boundary the compiler didn't see (a rehydrated
 * snapshot, a hand-written test fixture).
 *
 * Call in the `default` branch of a `switch` over a finite type. When every case is handled
 * the argument narrows to `never` and this type-checks; if a new member is added and a branch
 * is missed, the argument is no longer `never` and the call becomes a compile error —
 * surfacing the missing case at build time rather than as silent fall-through at runtime.
 *
 * @example
 *   switch (status) {
 *     case 'draft': return handleDraft()
 *     case 'complete': return handleComplete()
 *     default: return assertNever(status) // compile error if a CaseStatus is added
 *   }
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`)
}
