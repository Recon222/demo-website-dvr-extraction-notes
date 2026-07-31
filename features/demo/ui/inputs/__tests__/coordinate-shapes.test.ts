import { describe, it, expect } from 'vitest'

import type { DemoLocation, GpsCoordinates } from '@/features/demo/engine/types'
import type { NewLocationInput } from '@/features/demo/engine/store/create-store'
import type { CoordinateDisplayProps } from '@/features/demo/ui/inputs/CoordinateDisplay'
import type { LocationFieldValues } from '@/features/demo/ui/inputs/LocationFields'
import type { NewLocationFields } from '@/features/demo/ui/screens/NewLocationModal'
import type { SubmissionCoordinates } from '@/features/demo/ui/screens/SubmissionScreen'
import type { NotesCamera } from '@/features/demo/engine/logic/notes/types'

/**
 * R-24 linkage guard. `GpsCoordinates` had seven structural hand-copies with no compile-time
 * link to the canonical declaration, so the `accuracyM?` widening was a seven-site manual edit
 * — and one site (`NotesCamera`) was missed by the authoring branch and repaired by hand at
 * merge time. Each copy is now derived; these assertions are what FAILS TO COMPILE if someone
 * re-flattens one, which is the only way this class of drift can be caught before a reviewer.
 *
 * `tsc --noEmit` covers this file, so the checks are compile-time; the runtime body only exists
 * to give vitest something to report.
 */

/** Every coordinate carrier must still accept a canonical `GpsCoordinates` value. */
type AcceptsCoordinates<T> = GpsCoordinates extends T ? true : never

// A fix that EXISTS: lat/lng required, accuracy optional.
const displayIsDerived: AcceptsCoordinates<CoordinateDisplayProps> = true
const submissionIsDerived: AcceptsCoordinates<Omit<SubmissionCoordinates, 'source'>> = true
const notesCameraIsDerived: AcceptsCoordinates<NonNullable<NotesCamera['gps']>> = true
const newLocationFieldsIsDerived: AcceptsCoordinates<NonNullable<NewLocationFields['coordinates']>> = true
const newLocationInputIsDerived: AcceptsCoordinates<Omit<NonNullable<NewLocationInput['gps']>, 'source'>> = true
const storedFixIsDerived: AcceptsCoordinates<Omit<NonNullable<DemoLocation['gps']>, 'source'>> = true

// The one deliberate projection: a half-filled FORM, so every coordinate key is optional.
const formProjectionIsDerived: Partial<GpsCoordinates> extends Pick<LocationFieldValues, 'lat' | 'lng' | 'accuracyM'>
  ? true
  : never = true

describe('coordinate shapes stay linked to GpsCoordinates (R-24)', () => {
  it('compiles — every carrier is derived from the canonical declaration', () => {
    expect([
      displayIsDerived,
      submissionIsDerived,
      notesCameraIsDerived,
      newLocationFieldsIsDerived,
      newLocationInputIsDerived,
      storedFixIsDerived,
      formProjectionIsDerived,
    ]).toEqual([true, true, true, true, true, true, true])
  })
})
