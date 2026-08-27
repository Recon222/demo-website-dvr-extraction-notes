'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { UserProfile } from '@/features/demo/engine/types'
import { computeCareerDuration, trimProfile } from '@/features/demo/engine/logic/user-profile'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { Field, MODAL_LAYER, ModalShell } from '@/features/demo/ui/screens/_shared'
import { DateField } from '@/features/demo/ui/inputs/DateField'
import { clock } from '@/features/demo/ui/inputs/clock'

/**
 * The User Profile editor — the demo's port of the phone's `UserProfileModal`
 * (`src/features/settings/user-profile/components/UserProfileModal.tsx`, P7.2, matrix row 86).
 *
 * ## Draft in, commit on Save
 *
 * The seven fields are edited in LOCAL state seeded once from `profile`, and only `Save Profile`
 * calls back. Closing — the header ×, the scrim, Escape — discards, exactly as on the phone
 * ("close without save discards changes", `UserProfileModal.tsx:8`). The seed is a `useState`
 * initialiser rather than the phone's `useEffect(…, [visible])` because this component MOUNTS on
 * open instead of living permanently behind a `visible` flag; reopening after a discard therefore
 * reseeds from the store the same way.
 *
 * ## Deliberate differences from the phone, all internal
 *
 * - The phone's inputs are UNCONTROLLED (`defaultValue` + `onEndEditing`, committing to its draft
 *   on blur). The demo's shared `Field` is controlled, so the draft updates per keystroke. Same
 *   user-visible contract — nothing reaches the store until Save — and it is the idiom every
 *   other form in this feature uses.
 * - **No Cancel button.** Phone parity, stated because it looks like an omission: the footer holds
 *   `Save Profile` alone and the header × is the only cancel path (ui-mapping 12; matrix row 86).
 * - No validation and no disabled state: Save is always live and always succeeds, as on the phone.
 */

export interface UserProfileModalProps {
  /** The stored profile — the draft's seed. */
  profile: UserProfile
  /** Save: the trimmed record, committed in one write. */
  onSave(profile: UserProfile): void
  /** Any dismissal. Discards the draft. */
  onClose(): void
}

const labelLine: CSSProperties = { fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }
const durationLine: CSSProperties = { fontSize: 12.5, color: '#7a9fc4', marginTop: 6 }

/**
 * One `mode="date"` career-start field: label, the date button, and the computed span below it
 * when there is one to show.
 */
function CareerDateField({
  label,
  testId,
  durationLabel,
  today,
  value,
  onChange,
}: {
  label: string
  testId: string
  /** The phone's `accessibilityLabel` prefix on the duration line ("Time in field", …). */
  durationLabel: string
  /** "Now", read once by the modal — never here, and never at render scope. */
  today: Date
  value: string
  onChange(value: string): void
}) {
  const duration = computeCareerDuration(value, () => today)
  return (
    <div data-testid={testId} style={{ marginBottom: 14 }}>
      <div style={labelLine}>{label}</div>
      <div role="group" aria-label={label}>
        {/* The phone's empty-value literal for a date-mode picker, not the demo's em-dash. */}
        <DateField value={value} onChange={onChange} emptyLabel="No date" />
        {duration && (
          <div role="note" aria-label={`${durationLabel}: ${duration}`} style={durationLine}>
            {duration}
          </div>
        )}
      </div>
    </div>
  )
}

export function UserProfileModal({ profile, onSave, onClose }: UserProfileModalProps) {
  const [draft, setDraft] = useState<UserProfile>(profile)
  // "Today" for the two duration lines, read ONCE at mount through the injectable seam — the
  // `AboutPane` copyright-year precedent. A per-render `clock.now()` would be a render-scope clock
  // read (forbidden here), and neither line can change while the sheet is open anyway.
  const [today] = useState(() => clock.now())
  const set = <K extends keyof UserProfile>(key: K) => (value: UserProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <ModalShell
      title="User Profile"
      // Verbatim, phone `UserProfileModal.tsx:141`.
      closeAccessibilityLabel="Close user profile"
      onClose={onClose}
      // Opens over the Settings sheet — the demo's one modal-over-modal (see `MODAL_LAYER`).
      elevation={MODAL_LAYER.overSheet}
      footer={
        <button
          type="button"
          data-testid="user-profile-save-button"
          onClick={() => onSave(trimProfile(draft))}
          style={{ width: '100%', ...buttonStyle() }}
        >
          Save Profile
        </button>
      }
    >
      {/* Order, labels and placeholders are the phone's, field for field
          (UserProfileModal.tsx:164-243 / ui-mapping 12 § User Profile Modal). */}
      <Field label="Full Name" value={draft.name} onChange={set('name')} placeholder="Your full name" />
      <Field
        label="Badge / ID Number"
        value={draft.badgeNumber}
        onChange={set('badgeNumber')}
        placeholder="Badge or employee number"
        autoCorrect={false}
      />
      <CareerDateField
        label="Start Date in Field"
        testId="profile-time-in-field"
        durationLabel="Time in field"
        today={today}
        value={draft.timeInFieldStart}
        onChange={set('timeInFieldStart')}
      />
      <CareerDateField
        label="Start Date at Current Agency"
        testId="profile-time-at-agency"
        durationLabel="Time at agency"
        today={today}
        value={draft.timeAtAgencyStart}
        onChange={set('timeAtAgencyStart')}
      />
      <Field
        label="Current Agency"
        value={draft.currentAgency}
        onChange={set('currentAgency')}
        placeholder="Police service or employer"
      />
      <Field
        label="Unit / Section Name"
        value={draft.unitName}
        onChange={set('unitName')}
        placeholder="e.g., Forensic Video Unit, FVU, Forensic Multimedia"
      />
      <Field
        label="Qualifications & Education"
        value={draft.qualifications}
        onChange={set('qualifications')}
        placeholder="Paste your qualifications, education, certifications..."
        multiline
      />
    </ModalShell>
  )
}
