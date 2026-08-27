'use client'

import { Toggle } from '@/features/demo/ui/screens/_shared'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Security** (matrix row A1; phone
 * `src/features/biometrics/components/SecuritySettingsSection.tsx`).
 *
 * A1 is the appendix row the ui-mapping set never documented — `12-settings.md:620` defers it
 * onward to `@/features/biometrics` — so this pane is ported from that component directly.
 *
 * **`Biometrics`, not `Face ID`.** The phone interpolates the device's own biometric name into
 * every helper line; `useBiometric` falls back to the literal `'Biometrics'` when it cannot read
 * one (`useBiometric.ts:39`). A browser tab cannot read one, so the demo takes the phone's own
 * fallback. Naming Face ID here would be inventing hardware — the exact thing decision D6 rules
 * out, and the same reason the master row's preview reads `Unavailable`.
 *
 * The phone shows its `!isAvailable` branch (a warning box + "Open Device Settings") on a device
 * with no enrolled biometrics. That branch is NOT ported: its button opens the OS settings app,
 * which a web page cannot do, and its warning tells the reader to go enrol a fingerprint —
 * advice that would be nonsense in a browser. The three switches plus an honest note say more.
 */
export function SecurityPane({ settings, onChange }: SettingsPaneProps) {
  return (
    <div data-testid="settings-pane-security">
      <PaneStubNote>
        There is no biometric sensor behind a browser tab, so none of these can do anything here.
        On the phone this whole row sits behind a Face ID prompt (that is what the padlock beside
        it means), and the demo does not simulate the prompt either: a fake Face ID sheet would be
        the one thing worse than an unavailable one. The scanner on the opening screen is the one
        exception, and it says so on its own face: it is an animation, it gates nothing, and these
        switches do not control it.
      </PaneStubNote>

      <PaneDescription>
        Protect your case data with Biometrics authentication. These settings control when
        authentication is required.
      </PaneDescription>

      <PaneGroup
        label="App Lock"
        help="Require Biometrics to open the app after it has been in the background."
      >
        <Toggle
          label="Enable app lock"
          on={settings.appLockEnabled}
          onClick={() => onChange({ appLockEnabled: !settings.appLockEnabled })}
        />
      </PaneGroup>

      <PaneGroup
        label="Protect Exports"
        help="Require Biometrics before exporting PDFs, case backups, or sensitive data."
      >
        <Toggle
          label="Enable export protection"
          on={settings.exportProtectionEnabled}
          onClick={() => onChange({ exportProtectionEnabled: !settings.exportProtectionEnabled })}
        />
      </PaneGroup>

      <PaneGroup
        label="Allow Device Passcode"
        help="Use device PIN or password as a fallback if Biometrics fails or is unavailable."
      >
        <Toggle
          label="Enable passcode fallback"
          on={settings.allowDeviceFallback}
          onClick={() => onChange({ allowDeviceFallback: !settings.allowDeviceFallback })}
        />
      </PaneGroup>

      <PaneNote tone="info">
        Note: Security settings protect sensitive case data and exports with biometric
        authentication.
      </PaneNote>
    </div>
  )
}
