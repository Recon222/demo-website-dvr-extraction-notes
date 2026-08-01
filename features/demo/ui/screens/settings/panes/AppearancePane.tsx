'use client'

import { useId } from 'react'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import { PaneGroup, PaneNote, PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Appearance** (matrix row 87; phone `GeneralSettingsSection.tsx`).
 *
 * Two switches, both the phone's, and they are treated DIFFERENTLY on purpose:
 *
 * - **Dark Mode is inert.** The demo has no theme seam at all — the phone frame renders the
 *   app's dark palette and only that, in hardcoded values across the whole feature
 *   (`map/mapTokens.ts:41` "Only the DARK variants exist here"; `MapControls.tsx:26` "phone
 *   frame has no theme switch, unlike the phone's `isDark` prop";
 *   `import/ImportTerminalProgress.tsx:180` "the demo phone is the dark theme"). A switch that
 *   slides while the screen behind it does not move is a fabricated capability, which is
 *   exactly what decision D6 rules out — so this one states its value and refuses to change
 *   it, which is D6's other arm ("no-op with an honest notice"). It stays focusable and
 *   announces `aria-disabled`, the house treatment for an unavailable control.
 * - **Show import process details toggles for real** — as a value. The demo's import terminal
 *   (P1.3/P1.4) always prints its full log, so the note below names that specifically rather
 *   than leaving a visitor to discover it mid-import.
 */
export function AppearancePane({ settings, onChange }: SettingsPaneProps) {
  // R-6: the reason has to be reachable FROM the switch, not merely printed above it — a
  // screen reader in focus mode reads the focused node and nothing else.
  const darkReasonId = `${useId()}-dark-reason`
  return (
    <div data-testid="settings-pane-appearance">
      <PaneStubNote>
        The demo&apos;s phone frame renders the app&apos;s dark theme and only the dark theme —
        there is no light palette here to switch to, so Dark Mode is fixed on. The import switch
        moves, but the live import terminal always prints its full log in the demo; on the phone
        it is what opens and closes the model&apos;s inputs and outputs while a PDF is being read.
      </PaneStubNote>

      <PaneGroup label="Dark Mode">
        <Toggle
          label="Dark Mode"
          on={settings.darkMode}
          disabled
          describedBy={darkReasonId}
          onClick={() => {
            /* inert — see the note directly below */
          }}
        />
        <PaneNote id={darkReasonId}>
          Fixed on — the demo&apos;s phone frame has no light theme to switch to.
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
