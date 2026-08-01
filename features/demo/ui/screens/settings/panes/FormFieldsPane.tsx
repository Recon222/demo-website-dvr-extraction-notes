'use client'

import { PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'

/**
 * SEAM(P7.3) — Detail pane: **Form Fields** (matrix row A2, decision D9).
 *
 * **This is an interim placeholder. P7.3 owns this pane and replaces this body.**
 *
 * What lands here: the Forensic / Limited / Canvas profile chips, the 12-screen × 57-field
 * toggle grid, the "Always on" locks, and the precedence rule *always-on > user override >
 * profile default*. D9 upgraded this from optional to full — it is real behaviour, not a stub,
 * because the plumbing already exists: `selectVisibleWizardScreens` and `selectDrawerItems` are
 * profile-filtered today and `hiddenFields` is already typed on `ProfileConfig`.
 *
 * What P7.3 has to change beyond this file:
 * 1. **The pane's props.** The active profile and the override set are store data, so like the
 *    User Profile pane this cannot be a `SettingsPaneProps` component. Branch in the bridge's
 *    `renderPane` before falling through to `SETTINGS_PANES`, and delete this file's entry.
 * 2. **The master-row preview.** `settingsPreview`'s `formProfileLabel` context field is the
 *    seam, and it is already live: `DemoExperience` maps the store's `profile` through
 *    `FORM_PROFILE_SHORT`, so the row is truthful before P7.3 makes it changeable. Nothing to
 *    change there unless the profile set widens.
 * 3. **Persistence.** P7.1 persists nothing (deferred §80c). A chosen profile plus 57 overrides
 *    is real state a visitor would expect to survive a refresh, so P7.3 owns that call — and
 *    with it the three compile-time snapshot devices moving together (`SNAPSHOT_VERSION` + key
 *    suffix + the shape literals).
 *
 * The placeholder deliberately does not name the active profile: the master row beside it
 * already shows the live value, and a second, hardcoded copy of it here is how the two drift.
 */
export function FormFieldsPane() {
  return (
    <div data-testid="settings-pane-form-customization">
      <PaneStubNote>
        The demo runs one fixed form profile — which is why the wizard shows the steps it shows.
        On the phone you pick a profile (Forensic, Limited, Canvas) and can then switch individual
        fields on or off across all twelve screens, with the forensically required ones locked on.
        That grid is being built for the demo next.
      </PaneStubNote>
    </div>
  )
}
