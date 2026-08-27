'use client'

import { useId } from 'react'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Cloud Sync** (matrix row 92; phone `CloudSyncSettingsSection.tsx`).
 *
 * **The ui-mapping spec for this pane is stale, and the phone has moved.** `12-settings.md`
 * (fact-checked 2026-07-16) documents a locked toggle plus a "will be available when agencies
 * can connect their own cloud database" info box. That build is gone: the live pane is the
 * BYO-Supabase agency-cloud status home — provisioning wizard, enrollment QR, user management,
 * paused-project recovery, disconnect (`CloudSyncSettingsSection.tsx:129-277`), and its master
 * row's preview now answers `Paused`/`Connected` too (`settings-catalog.tsx:146-152`).
 *
 * None of that is buildable here: plan §2 puts "cloud sync / agency-cloud / Supabase /
 * canvas-hub anything" out of scope wholesale, and D6's stub ruling widens the SETTINGS surface,
 * not that exclusion. So the pane keeps the shape the demo can honestly hold — the description
 * (lifted verbatim from the LIVE component, because it describes what the app genuinely does)
 * and the one switch, disabled — and the note names the real feature rather than pretending the
 * gap is a coming-soon.
 *
 * The toggle is disabled rather than cosmetic on purpose. Every other stub in this package moves
 * a value nobody reads; a cloud-sync switch that flips to "on" in a browser tab would be read as
 * "my case data just went somewhere", which is the one wrong impression this app must never
 * give.
 */
export function CloudSyncPane({ settings }: SettingsPaneProps) {
  // R-6 — the inert switch's reason, reachable from the switch itself.
  const reasonId = `${useId()}-cloud-reason`
  return (
    <div data-testid="settings-pane-cloud-sync">
      <PaneStubNote>
        Cloud sync is out of scope for the demo entirely. Nothing you enter here leaves your
        browser tab, and this switch is fixed off so it cannot suggest otherwise. In the app it is
        the front door to an agency&apos;s own Supabase project: an admin provisions it, enrols
        devices by QR, and every save pushes in the background. The agency owns the database;
        nothing is shared with anyone else.
      </PaneStubNote>

      <PaneDescription>
        Sync case data to your agency&apos;s own cloud database after each save. Your agency owns
        the database — nothing is shared with anyone else.
      </PaneDescription>

      <PaneGroup label="Cloud Sync">
        <Toggle
          label="Enable cloud sync"
          on={settings.cloudSyncEnabled}
          disabled
          describedBy={reasonId}
          onClick={() => {
            /* inert — see the note directly below */
          }}
        />
        <PaneNote id={reasonId}>
          Fixed off. Cloud sync is out of scope for the demo, and a switch reading &ldquo;on&rdquo;
          would suggest case data had left this tab.
        </PaneNote>
      </PaneGroup>
    </div>
  )
}
