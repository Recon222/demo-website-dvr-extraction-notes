// Authored preview — DvrInfoScreen. DVR hardware/recording config + derived retention.
// Variant axis: retention computed (per-scope overwrite countdowns) vs. not-yet-dated.
import { DvrInfoScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

const DVR = {
  dvrLocation: "Manager's office",
  dvrTypeBrand: 'Hikvision DS-7216HGHI',
  serialModelNumber: 'DS7216-2287A',
  dvrUsername: 'admin',
  dvrPassword: 'Peel2026!',
  numberOfChannels: '16',
  activeCameras: '9',
  recordingSchedule: 'continuous, motion',
  resolution: '1920x1080',
  recordingFps: '15fps',
  firstRecordedDate: '2025-12-18',
  totalDvrRetention: '29',
}

export function Filled() {
  return (
    <Phone>
      <DvrInfoScreen
        dvr={DVR}
        retention={{
          totalRetention: 29,
          scopes: [
            { label: 'Scope 1 · Jan 14 08:00–09:30', daysUntilOverwritten: 21, overwrittenDate: '2026-02-06' },
            { label: 'Scope 2 · Jan 09 22:10–23:05', daysUntilOverwritten: 6, overwrittenDate: '2026-01-22' },
            { label: 'Scope 3 · Dec 20 03:40–04:15', daysUntilOverwritten: 0, overwrittenDate: '2026-01-16' },
          ],
        }}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <DvrInfoScreen
        dvr={{ ...DVR, firstRecordedDate: '', totalDvrRetention: '', recordingSchedule: '' }}
        retention={{ totalRetention: null, scopes: [] }}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
