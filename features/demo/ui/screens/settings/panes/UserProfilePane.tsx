'use client'

import { PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'

/**
 * SEAM(P7.2) — Detail pane: **User Profile** (matrix rows 85/86).
 *
 * **This is an interim placeholder. P7.2 owns this pane and replaces this body.**
 *
 * What lands here: the phone's two-state summary (configured → `Name:` / `Badge:` / `Agency:` /
 * `Unit:` lines + "Edit Profile"; unconfigured → "No profile configured." + "Set Up Profile",
 * discriminated on `hasName = name.trim().length > 0`), plus `UserProfileModal` with all seven
 * fields and the computed career-duration lines. No `agencyLogoUri` UI and no `resetProfile()` —
 * both explicitly excluded by matrix row 86.
 *
 * What P7.2 has to change beyond this file:
 * 1. **The pane's props.** A profile is store data, so the profile pane cannot be a
 *    `SettingsPaneProps` component. The shell takes a `renderPane` callback precisely so the
 *    store bridge can resolve `'user-profile'` to its own node — branch there, before falling
 *    through to `SETTINGS_PANES`, and delete this file's entry.
 * 2. **The master-row preview.** `settingsPreview`'s `profileName` context field is the seam:
 *    `DemoExperience` passes `''` today, which makes the row read the phone's own `Not set`.
 *    Pass the live trimmed name instead and the row is correct with no other edit.
 * 3. **Persistence.** P7.1 persists NOTHING (deferred §80c); a profile is exactly the kind of
 *    thing that should survive a refresh, so P7.2 owns that call — and with it the three
 *    compile-time snapshot devices moving together (`SNAPSHOT_VERSION` + key suffix + the shape
 *    literals). Settings values are not in the snapshot and must not be swept in by accident.
 *
 * Until then the pane renders the phone's own empty-state line, which is true: there is no
 * profile. It renders NO "Set Up Profile" button — an affordance that opens nothing is the one
 * thing worse than an absent one.
 */
export function UserProfilePane() {
  return (
    <div data-testid="settings-pane-user-profile">
      <PaneStubNote>
        The analyst profile — name, badge, agency, unit, qualifications and time in the field —
        is not built in the demo yet. On the phone it is stored on the device and its name
        auto-fills &ldquo;Completed By&rdquo; on the Completion screen, which is what carries it
        into the Case Notes report.
      </PaneStubNote>

      <div data-testid="user-profile-section-empty" style={{ fontSize: 14, color: '#99badd' }}>
        No profile configured.
      </div>
    </div>
  )
}
