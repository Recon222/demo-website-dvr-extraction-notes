'use client'

import { Toggle } from '@/features/demo/ui/screens/_shared'
import {
  GPS_ACCURACY_OPTIONS,
  GPS_TIMEOUT_OPTIONS,
} from '@/features/demo/engine/content/settings-values'
import {
  PaneDescription,
  PaneGroup,
  PaneSelect,
  PaneStubNote,
} from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'

/**
 * Detail pane: **Location** (matrix row 89; phone `LocationSettingsSection.tsx`).
 *
 * The demo's GPS capture is REAL (`navigator.geolocation`, ported multi-sample loop, P2.3/P3.4/
 * P3.7) — it just isn't settings-driven yet: `buildGpsConfig()` runs at its own defaults, which
 * happen to be exactly the two values this pane opens on. So the note here says something
 * unusually concrete: the numbers on screen ARE what the capture does; changing them is what
 * does nothing. Wiring is two props to `GpsCaptureControl`'s existing optional `config` —
 * deferred §80b, with the recipe.
 *
 * The phone's closing info box ("Note: These settings affect location accuracy during case
 * creation and site arrival documentation.") is NOT ported: that sentence is the one claim in
 * the pane that is false here, and replacing it with the truth is the whole point.
 *
 * Its two no-UI type fields (`incidentReverseGeocode`, `locationReverseGeocode`) are absent for
 * the phone's own reason — those toggles live inline beside each "Use Current Location" button,
 * not in settings (`LocationSettingsSection.tsx:106-108`), and the demo does the same.
 */
export function LocationPane({ settings, onChange }: SettingsPaneProps) {
  return (
    <div data-testid="settings-pane-location">
      <PaneStubNote>
        GPS capture is real in the demo: it samples <code>navigator.geolocation</code> and keeps
        the most accurate fix, just as the app does. What it does not do yet is read these two
        values: every recovery-location capture runs at Balanced (50 m) with a 30-second budget,
        and the incident-pin and per-camera captures force Precise (10 m) over 120 seconds,
        exactly as they do on the phone. The accuracy warning is not wired either.
      </PaneStubNote>

      <PaneDescription>
        Configure how the app acquires and processes location data for case documentation.
      </PaneDescription>

      <PaneGroup
        label="GPS Accuracy Mode"
        help="Balances speed vs precision when acquiring GPS coordinates."
      >
        <PaneSelect
          a11yLabel="GPS Accuracy Mode"
          value={settings.gpsAccuracyMode}
          options={GPS_ACCURACY_OPTIONS}
          onChange={(gpsAccuracyMode) => onChange({ gpsAccuracyMode })}
        />
      </PaneGroup>

      <PaneGroup label="GPS Timeout" help="Maximum time to wait for GPS signal before showing an error.">
        <PaneSelect
          a11yLabel="GPS Timeout"
          value={settings.gpsTimeout}
          options={GPS_TIMEOUT_OPTIONS}
          onChange={(gpsTimeout) => onChange({ gpsTimeout })}
        />
      </PaneGroup>

      <PaneGroup label="Accuracy Warning" help="Warn when GPS accuracy exceeds 100 meters.">
        <Toggle
          label="Show accuracy warnings"
          on={settings.showAccuracyWarning}
          onClick={() => onChange({ showAccuracyWarning: !settings.showAccuracyWarning })}
        />
      </PaneGroup>
    </div>
  )
}
