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
 * merge time. Each copy is now derived; these assertions fail to compile if someone re-flattens
 * one and it then falls behind the canonical shape.
 *
 * DIRECTION MATTERS (p2-review R-34). The first version of this file asserted
 * `GpsCoordinates extends T`, which is assignability TO a looser type — unaffected by a copy
 * that is MISSING a member, i.e. silent for exactly the historical drift it claimed to catch,
 * and noisy only for copies that narrow or add required members. The check below is
 * key-exhaustiveness in the direction the drift runs, the same property `persistence.ts`'s
 * `FullShape` device enforces on the snapshot schema — the one mirrored layer that never drifted.
 *
 * `tsc --noEmit` covers this file, so the checks are compile-time; the runtime body only exists
 * to give vitest something to report.
 */

/** Every key of `GpsCoordinates` — required and optional alike — must appear on the carrier.
 *  `Exclude` is not a naked type parameter here, so the conditional does not distribute and a
 *  fully-covering carrier resolves to `never extends never` → `true`. */
type CarriesEveryCoordinateKey<T> = Exclude<keyof GpsCoordinates, keyof T> extends never ? true : never

// A fix that EXISTS: lat/lng required, accuracy optional.
const displayIsDerived: CarriesEveryCoordinateKey<CoordinateDisplayProps> = true
const submissionIsDerived: CarriesEveryCoordinateKey<SubmissionCoordinates> = true
const notesCameraIsDerived: CarriesEveryCoordinateKey<NonNullable<NotesCamera['gps']>> = true
const newLocationFieldsIsDerived: CarriesEveryCoordinateKey<NonNullable<NewLocationFields['coordinates']>> = true
const newLocationInputIsDerived: CarriesEveryCoordinateKey<NonNullable<NewLocationInput['gps']>> = true
const storedFixIsDerived: CarriesEveryCoordinateKey<NonNullable<DemoLocation['gps']>> = true

// The one deliberate projection — a half-filled FORM, so every coordinate key is optional — is
// held to the same key-exhaustiveness rule; only the optionality differs.
const formProjectionIsDerived: CarriesEveryCoordinateKey<LocationFieldValues> = true

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
