'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { UserProfile } from '@/features/demo/engine/types'
import { hasProfileName, hasProfileText } from '@/features/demo/engine/logic/user-profile'
import { PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { UserProfileModal } from '@/features/demo/ui/screens/settings/UserProfileModal'

/**
 * Detail pane: **User Profile** (matrix row 85; phone `UserProfileSection.tsx`).
 *
 * Two states, discriminated on `hasName` — the phone's own rule, and the reason the summary shows
 * nothing at all for a profile that has a badge but no name (see `hasProfileName`):
 *
 * - **configured** → `Name:` plus a `Badge:` / `Agency:` / `Unit:` line for each of those that has
 *   content, then `Edit Profile`;
 * - **unconfigured** → `No profile configured.` and `Set Up Profile` — the same button, relabelled.
 *
 * The other three fields (both career dates and the qualifications block) are deliberately NOT
 * summarised here, on either side.
 *
 * ## Why this one is not a `SettingsPaneProps` pane
 *
 * It renders store data and writes it back, so `DemoExperience` resolves this id itself, before
 * falling through to `SETTINGS_PANES` (see `panes/index.tsx`). Props in, callback out, like every
 * other screen in this feature — the pane still never touches the store.
 *
 * ## Why it keeps an honest note
 *
 * Nothing here is stubbed: the profile is real, it persists, and its name reaches the Case Notes
 * PDF. The note says what is DIFFERENT — the phone keeps this on the device, the demo keeps it in
 * one browser tab — because a screen that invites a real name and badge owes the visitor that
 * sentence. It is the same treatment the eight stub panes carry, used for a fact rather than a gap.
 * Its first clause is CONDITIONAL on `persisted`, because a promise the storage layer cannot keep
 * is worse than the gap the note exists to disclose (see the prop).
 *
 * The modal's open state lives here, exactly as it does on the phone
 * (`UserProfileSection.tsx:39`): which sheet is open is not something the store, the snapshot or
 * the `ModalId` union has any use for.
 */

export interface UserProfilePaneProps {
  profile: UserProfile
  /** Save from the editor — the whole trimmed record, in one write. */
  onSave(profile: UserProfile): void
  /**
   * Is this tab's snapshot actually being written RIGHT NOW (review R-3)?
   *
   * `persistence.ts`'s `isLive()` doc states the governing rule in bold: *any surface that tells
   * the visitor their work will survive a refresh must gate that sentence on it* — and both other
   * promise sites in this feature do (`saveProgress`'s alert body, the drawer's save-status line).
   * This pane makes exactly that promise in its opening sentence, so it takes the fact as a prop
   * rather than asserting it: a private-browsing or quota-exhausted tab (OCR data-URLs are the
   * big payload) reaches `{ kind: 'failed' }`, the snapshot is CLEARED, and an unconditional
   * "kept for this browser tab" would keep promising storage that no longer exists.
   *
   * The bridge samples it when the Settings sheet opens — the drawer's rule: read the handle when
   * a surface is about to make the claim, never capture it at mount.
   */
  persisted: boolean
}

const line: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: '#f0f4f8', marginBottom: 6 }
const emptyLine: CSSProperties = { fontSize: 14, lineHeight: 1.5, color: '#99badd' }

const editButton: CSSProperties = {
  marginTop: 12,
  padding: '9px 16px',
  borderRadius: 8,
  border: '1px solid #2B8CC1',
  background: 'transparent',
  color: '#4BA3D4',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
}

/** One `Label: value` summary row, rendered only when the value has content. */
function SummaryLine({ testId, label, value }: { testId: string; label: string; value: string }) {
  if (!hasProfileText(value)) return null
  return (
    <div data-testid={testId} style={line}>
      {label}
      {value}
    </div>
  )
}

export function UserProfilePane({ profile, onSave, persisted }: UserProfilePaneProps) {
  const [editing, setEditing] = useState(false)
  const configured = hasProfileName(profile)

  return (
    <div data-testid="settings-pane-user-profile">
      <PaneStubNote>
        {persisted ? (
          <>
            This one is real: what you enter is kept for this browser tab, and the name auto-fills
            &ldquo;Completed By&rdquo; on the Completion screen, which is what carries it into the
            Case Notes report.
          </>
        ) : (
          <>
            This one is real, but this browser isn&rsquo;t storing the session — what you enter
            lasts until you leave or reload this page. The name still auto-fills &ldquo;Completed
            By&rdquo; on the Completion screen, which is what carries it into the Case Notes report.
          </>
        )}{' '}
        On the phone it lives on the device instead, entered once and reused by every case — and the
        career fields feed the will-say document.
      </PaneStubNote>

      <div data-testid="user-profile-section">
        {configured ? (
          <>
            {/* The phone's four summary lines, each independently gated
                (UserProfileSection.tsx:56-88). */}
            <SummaryLine testId="user-profile-section-name" label="Name: " value={profile.name} />
            <SummaryLine testId="user-profile-section-badge" label="Badge: " value={profile.badgeNumber} />
            <SummaryLine testId="user-profile-section-agency" label="Agency: " value={profile.currentAgency} />
            <SummaryLine testId="user-profile-section-unit" label="Unit: " value={profile.unitName} />
          </>
        ) : (
          <div data-testid="user-profile-section-empty" style={emptyLine}>
            No profile configured.
          </div>
        )}
        {/* One button, one testid — only the label changes with the state (phone parity). */}
        <button
          type="button"
          data-testid="user-profile-section-edit-button"
          onClick={() => setEditing(true)}
          style={editButton}
        >
          {configured ? 'Edit Profile' : 'Set Up Profile'}
        </button>
      </div>

      {editing && (
        <UserProfileModal
          profile={profile}
          onSave={(next) => {
            onSave(next)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
