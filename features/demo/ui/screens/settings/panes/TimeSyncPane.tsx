'use client'

import { NTP_REGION_OPTIONS, type NtpRegion } from '@/features/demo/engine/content/settings-values'
import {
  PaneDescription,
  PaneGroup,
  PaneNote,
  PaneSelect,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Time Sync** (matrix row 90; phone `TimeSyncSettingsSection.tsx`).
 *
 * One picker and one info box. The info box is ported VERBATIM and is not a stub: it states
 * which metrology institute each region traces to, which is true whoever is reading it.
 *
 * The picker is cosmetic for a reason the demo has documented since P0: a browser has no raw
 * UDP socket and the serverless host blocks outbound UDP, so `simulateNtpSync`
 * (`engine/logic/time-sync.ts:17-35`) mocks the exchange and always reports `time.nrc.ca` with
 * the NRC chain. Naming that server in the note is what stops this pane implying the demo would
 * hit NIST if you asked it to.
 */
export function TimeSyncPane({ settings, onChange }: SettingsPaneProps) {
  return (
    <div data-testid="settings-pane-time-sync">
      <PaneStubNote>
        A browser has no raw UDP socket, so the demo cannot speak NTP at all. Its calibration is
        simulated, and it always reports <code>time.nrc.ca</code> with the NRC stratum-2 chain
        whichever region is selected here. The uncertainty maths and the traceability line on the
        time-offset report are the app&apos;s own; only the network exchange is mocked.
      </PaneStubNote>

      <PaneDescription>
        Select the NTP server region used for time calibration. Choose the region matching your
        jurisdiction for optimal latency and forensic traceability.
      </PaneDescription>

      <PaneGroup
        label="NTP Server Region"
        help="Determines which atomic clock authority your timestamps are traceable to."
      >
        <PaneSelect
          a11yLabel="NTP Server Region"
          value={settings.ntpRegion}
          options={NTP_REGION_OPTIONS}
          onChange={(ntpRegion) => onChange({ ntpRegion })}
        />
      </PaneGroup>

      <PaneNote tone="info">
        This setting affects the forensic traceability chain documented in time calibration
        reports. Canada uses NRC atomic clocks, USA uses NIST, and Europe uses PTB/METAS. The
        Global option uses Cloudflare anycast servers.
      </PaneNote>
    </div>
  )
}
