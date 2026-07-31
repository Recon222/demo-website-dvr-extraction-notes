import { z } from 'zod'

import { formatAddress } from '@/features/demo/engine/logic/address-format'

import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'

/**
 * The Completion screen's gate — a verbatim port of the phone's `finalSubmissionSchema`
 * (`src/lib/schemas/form-schema.ts:137-149`).
 *
 * This is the phone's ONLY runtime validation gate. Every other schema in that file is
 * deliberately relaxed so the operator can move freely through the wizard
 * (`form-schema.ts:3-13`, and the PF-09 note at :120-126 recording that the per-screen
 * `sectionSchemas` map was deleted because nothing ever consumed it). Matching just this
 * one gate — not per-screen validation, which the phone does not have either — is the
 * honest parity move (matrix G9).
 *
 * Three rules, three messages, nothing else:
 *   occNumber  non-empty   → 'OCC number is required'
 *   address    non-empty   → 'Address is required'
 *   scopes     ≥1 row with BOTH times → 'At least one extraction scope with start and end
 *                                        times is required'
 */

/** The literal messages, so UI copy pins reference the schema instead of re-typing it. */
export const FINAL_SUBMISSION_MESSAGES = {
  occNumber: 'OCC number is required',
  address: 'Address is required',
  scopes: 'At least one extraction scope with start and end times is required',
} as const

export const finalSubmissionSchema = z.object({
  occNumber: z.string().min(1, FINAL_SUBMISSION_MESSAGES.occNumber),
  address: z.string().min(1, FINAL_SUBMISSION_MESSAGES.address),
  scopes: z
    .array(
      z.object({
        startDateTime: z.string(),
        endDateTime: z.string(),
      }),
    )
    // `.some`, not `.every` — the phone accepts one complete scope among half-filled rows.
    .refine((scopes) => scopes.some((s) => s.startDateTime && s.endDateTime), {
      message: FINAL_SUBMISSION_MESSAGES.scopes,
    }),
})

export type FinalSubmissionInput = z.input<typeof finalSubmissionSchema>

/** Discriminated so a caller cannot read `errors` off a passing gate. */
export type FinalSubmissionOutcome = { ok: true } | { ok: false; errors: readonly string[] }

/**
 * Run the gate. Failure carries the messages in schema-key order (occNumber → address →
 * scopes), which is the order the phone renders them in its `Required Fields Missing` card
 * (`app/(form)/completion.tsx:141` maps the zod issues straight to their messages).
 */
export function validateFinalSubmission(input: FinalSubmissionInput): FinalSubmissionOutcome {
  const result = finalSubmissionSchema.safeParse(input)
  if (result.success) return { ok: true }
  return { ok: false, errors: result.error.issues.map((issue) => issue.message) }
}

/**
 * Project the demo's shape onto the phone's gate input.
 *
 * The phone keeps `occNumber` and `address` on the location's form; the demo splits them —
 * the occurrence number lives on the CASE (`DemoCase.caseNumber`) and the address on the
 * LOCATION. `owningCase` is therefore a parameter, not a lookup: the caller derives it from
 * `location.caseId` (the R-19 law — "the open location owns the case"), never from a
 * separately tracked case selection.
 *
 * The address goes through the shared `formatAddress` — the single producer of a composed
 * address since P2.3 landed it (deferred §38's strike-trigger). That matters beyond tidiness:
 * the phone's `address` is only ever written by its own `formatAddress`
 * (`src/lib/utils/address-formatting.ts:102-119`), so gating on anything else would validate a
 * different string from the one the PDF header, the notes body and the Cases row display.
 * Emptiness semantics are what the gate actually depends on and they are identical — each
 * component trimmed, blanks dropped — so a whitespace-only address still fails `min(1)`
 * exactly as it does on the phone.
 *
 * The location NAME is deliberately not a fallback here — the summary card falls back to it
 * for display, but a location with no address must not pass.
 */
export function toFinalSubmissionInput(
  location: DemoLocation | null,
  owningCase: DemoCase | null,
): FinalSubmissionInput {
  return {
    occNumber: owningCase?.caseNumber ?? '',
    address: location
      ? formatAddress(location.businessName, location.streetAddress, location.city)
      : '',
    scopes:
      location?.form.scopes.map((s) => ({
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
      })) ?? [],
  }
}
