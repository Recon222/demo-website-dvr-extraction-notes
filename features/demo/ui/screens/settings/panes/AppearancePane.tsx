'use client'

import { Toggle } from '@/features/demo/ui/screens/_shared'
import { PaneGroup, PaneNote, PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'
import { setScheme } from '@/features/demo/ui/tokens/palette'

/**
 * Detail pane: **Appearance** (matrix row 87; phone `GeneralSettingsSection.tsx`).
 *
 * Two switches, both the phone's, and both real:
 *
 * - **Dark Mode switches the demo's palette for real** (SEAM(LM1)). It used to be the pane's
 *   one inert control, correctly so: the whole feature read `palette.dark` and a switch that
 *   slides while the screen behind it does not move is the fabricated capability D6 rules out.
 *   The UI-parity port closed that gap — `tokens/palette.ts` ships both of the phone's scheme
 *   halves and every surface resolves through `colors`/`GLASS_TIER[scheme]` — so the switch is
 *   wired to the seam instead of apologising for its absence. It does NOT go through `onChange`:
 *   the settings record is bridge state that resets with the tab, while the scheme is a
 *   `sessionStorage` choice read at module init, and `setScheme` reloads onto it. `DemoExperience`
 *   seeds `settings.darkMode` from that same read, so `on` below is correct on every load.
 * - **Show import process details toggles for real** — as a value. The demo's import terminal
 *   (P1.3/P1.4) always prints its full log, so the note below names that specifically rather
 *   than leaving a visitor to discover it mid-import.
 */
export function AppearancePane({ settings, onChange }: SettingsPaneProps) {
  return (
    <div data-testid="settings-pane-appearance">
      <PaneStubNote>
        Dark Mode switches the demo&apos;s palette between the app&apos;s two themes. Flipping it
        restarts the demo so the whole frame repaints, and your case stays where it is. The import
        switch moves, but the live import terminal always prints its full log in the demo; on the
        phone it is what opens and closes the model&apos;s inputs and outputs while a PDF is being
        read.
      </PaneStubNote>

      <PaneGroup label="Dark Mode">
        <Toggle
          label="Dark Mode"
          on={settings.darkMode}
          onClick={() => setScheme(settings.darkMode ? 'light' : 'dark')}
        />
        <PaneNote>
          The demo restarts to repaint on the new theme. Light mode is the phone&apos;s own light
          palette and is still being tuned here.
        </PaneNote>
      </PaneGroup>

      <PaneGroup label="Show import process details">
        <Toggle
          label="Show import process details"
          on={settings.showImportProcessDetails}
          onClick={() => onChange({ showImportProcessDetails: !settings.showImportProcessDetails })}
        />
      </PaneGroup>
    </div>
  )
}
