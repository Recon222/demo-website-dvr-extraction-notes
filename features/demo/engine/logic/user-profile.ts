/**
 * The analyst profile's pure half (P7.2, matrix rows 85/86) — defaults, the two predicates the
 * pane and the master row discriminate on, the save transform, and the career-duration math.
 *
 * Ported from the phone's `src/features/settings/user-profile/`: `DEFAULT_USER_PROFILE`
 * (`types.ts:30-39`), `isProfileComplete` (`store/user-profile-store.ts:41`), the modal's
 * trim-on-save (`components/UserProfileModal.tsx:103-112`) and `computeDuration`
 * (`utils/compute-duration.ts:22-48`).
 *
 * Everything here is a pure function of its arguments — including the clock, which arrives as
 * `now: () => Date` (the house seam: `buildRetentionView`, `nowParts`). The phone reads
 * `DateTime.now()` inside `computeDuration`; the demo cannot, and a duration line whose value
 * depends on an ambient clock is exactly the kind of render-scope time read the feature's
 * determinism rule forbids.
 */

import { formatStored, nowParts, parsePartsLoose } from '@/features/demo/engine/logic/datetime-parts'
import type { UserProfile } from '@/features/demo/engine/types'

/** Every field empty — the phone's `DEFAULT_USER_PROFILE`, minus the absent `agencyLogoUri`
 *  (see the `UserProfile` doc for why). Frozen like `DEFAULT_SETTINGS`: it is only ever spread.
 *  Annotated `Readonly<…>` (R-25) so the annotation keeps the freeze's guarantee instead of
 *  discarding it — the same one-line change `DEFAULT_SETTINGS` takes in this commit. */
export const DEFAULT_USER_PROFILE: Readonly<UserProfile> = Object.freeze({
  name: '',
  badgeNumber: '',
  timeInFieldStart: '',
  timeAtAgencyStart: '',
  currentAgency: '',
  unitName: '',
  qualifications: '',
})

/** Non-whitespace content. The phone spells this `hasContent` in `UserProfileSection.tsx:25-27`
 *  and `.trim().length > 0` in the store; one predicate here so the pane's four summary lines and
 *  the `hasName` discriminator below can never disagree about what "filled in" means. */
export function hasProfileText(value: string): boolean {
  return value.trim().length > 0
}

/**
 * The configured/unconfigured discriminator (`hasName`, `UserProfileSection.tsx:49`), which is
 * also the phone store's `isProfileComplete()`.
 *
 * NAME ALONE decides — a profile with a badge, an agency and a unit but no name is still
 * "unconfigured", and the pane shows none of those fields. That is the phone's behaviour
 * (ui-mapping 12: "if `name` is empty, none of the other fields are surfaced even if they have
 * values"), and it is coherent: `name` is the only field with a downstream consumer.
 */
export function hasProfileName(profile: UserProfile): boolean {
  return hasProfileText(profile.name)
}

/**
 * What Save commits: every free-text field trimmed, the two date fields untouched
 * (`UserProfileModal.tsx:103-112`). The dates are canonical machine strings — trimming one would
 * either do nothing or corrupt it — and the phone excludes them for the same reason.
 */
export function trimProfile(profile: UserProfile): UserProfile {
  return {
    name: profile.name.trim(),
    badgeNumber: profile.badgeNumber.trim(),
    timeInFieldStart: profile.timeInFieldStart,
    timeAtAgencyStart: profile.timeAtAgencyStart,
    currentAgency: profile.currentAgency.trim(),
    unitName: profile.unitName.trim(),
    qualifications: profile.qualifications.trim(),
  }
}

/**
 * A career start date rendered as the span since it — the phone's `computeDuration`, branch for
 * branch (`compute-duration.ts:22-48`):
 *
 * | Input                                   | Output                     |
 * |-----------------------------------------|----------------------------|
 * | empty / unparseable / a future month     | `null`                     |
 * | this month, on or before today           | `'Less than 1 month'`      |
 * | this month, later than today             | `null`                     |
 * | under a year                             | `'7 months'` / `'1 month'` |
 * | a whole number of years                  | `'2 years'` / `'1 year'`   |
 * | otherwise                                | `'12 years, 3 months'`     |
 *
 * CALENDAR-MONTH arithmetic, not elapsed time: the phone counts `(y₂-y₁)*12 + (mo₂-mo₁)` and
 * never looks at the day except to break the zero-month tie. So a start of the 31st and a
 * "today" of the 1st of the next month reads as one month, on both sides. Ported as-is —
 * this string sits under a date the analyst chose, and a demo that rounded differently from the
 * app would be visibly wrong beside it.
 */
export function computeCareerDuration(startDateTime: string, now: () => Date): string | null {
  const start = parsePartsLoose(startDateTime)
  if (!start) return null

  const current = nowParts(now)
  const totalMonths = (current.y - start.y) * 12 + (current.mo - start.mo)
  if (totalMonths < 0) return null
  if (totalMonths === 0) {
    // Same calendar month: only a start that has actually HAPPENED counts. Compared as canonical
    // zero-padded strings, which sort chronologically — no Date construction, no timezone.
    return formatStored(start) <= formatStored(current) ? 'Less than 1 month' : null
  }

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`
  return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`
}
