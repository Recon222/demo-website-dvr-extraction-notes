/**
 * The New Location modal's submit gate (parity P3.4, matrix row 13).
 *
 * The phone expresses the same three rules TWICE — once in `validateForm`
 * (`NewLocationModal.tsx:110-127`, which sets the field errors) and once in the Create-Location
 * button's `disabled` condition (:296-301, which greys it out). Two hand-maintained lists of the
 * same rules is exactly the shape that drifts, so the demo derives both from one function: the
 * button state and the message the visitor reads can never disagree about WHY submit is blocked.
 *
 * Pure and React-free, like `final-submission.ts` (the Completion gate) — the modal renders the
 * result, it does not re-derive it.
 */

import { isLocationNameTaken } from '@/features/demo/engine/logic/location-name'

/** The rules that can block submit, in the phone's own evaluation order. */
export const NEW_LOCATION_BLOCKS = ['nameRequired', 'duplicateName', 'addressRequired'] as const
export type NewLocationBlock = (typeof NEW_LOCATION_BLOCKS)[number]

export interface NewLocationGateInput {
  locationName: string
  streetAddress: string
  /** Location names already on the target case — uniqueness is per-case (see `location-name`). */
  existingNames: readonly string[]
  /**
   * The new-address-copy variant (phone `requireAddress`, NewLocationModal.tsx:54-59): a blank
   * street address blocks submit. Off for the ordinary "Add Location" flow, where the phone
   * shows Street Address's red asterisk but never enforces it (ui-mapping 11:385) — the demo
   * reproduces that asymmetry rather than "fixing" it into a divergence.
   */
  requireAddress: boolean
}

/** Phone copy, verbatim. */
export const NEW_LOCATION_BLOCK_MESSAGES: Readonly<Record<NewLocationBlock, string>> = Object.freeze({
  /** NewLocationModal.tsx:114 */
  nameRequired: 'Location name is required',
  /** NewLocationModal.tsx:104 and :116 — the live check and the submit-time backstop share it. */
  duplicateName: 'A location with this name already exists in this case',
  /** NewLocationModal.tsx:122 */
  addressRequired: 'Street address is required',
})

/**
 * The FIRST rule blocking submit, or `null` when the form may be created.
 *
 * Order is the phone's and is load-bearing: a blank name reports `nameRequired`, never
 * `duplicateName` — even when a blank-named sibling exists, which `isLocationNameTaken` would
 * happily match (phone NewLocationModal.tsx:113-117 has the same `else if` shape).
 *
 * The phone's fourth term, `isSubmitting`, is deliberately absent: `onSubmit` here is a
 * synchronous in-memory store write, so there is no in-flight window to disable against and a
 * fabricated one would be theatre.
 */
export function newLocationBlock(input: NewLocationGateInput): NewLocationBlock | null {
  if (!input.locationName.trim()) return 'nameRequired'
  if (isLocationNameTaken(input.locationName, input.existingNames)) return 'duplicateName'
  if (input.requireAddress && !input.streetAddress.trim()) return 'addressRequired'
  return null
}
