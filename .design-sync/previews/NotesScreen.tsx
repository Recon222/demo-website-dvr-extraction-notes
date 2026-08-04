// Authored preview — NotesScreen. Auto-generated, editable case notes (mono textarea) with
// a Regenerate action. Variant axis = generated notes vs empty.
import { NotesScreen } from 'open-pro-next'

const noop = () => {}
const callbacks = { onChange: noop, onRegenerate: noop, onNext: noop, onBack: noop, onMenu: noop }

const NOTES = `CCTV EVIDENCE RECOVERY — CASE NOTES
Occurrence: PR-2026-0114-2287
Location: Northgate Convenience, 1450 Dundas St E, Mississauga

On 2026-01-14 at approximately 09:20 hrs, Det. M. Okafor
(Badge 4471), Major Crime — Video Unit, attended the above
location to recover CCTV footage relating to a commercial
break & enter.

DVR: Hikvision DS-7208HQHI-K1, 8-channel. Retention ~21 days.
System time verified against NTP and found running 00:04:12
FAST of actual time. All ranges below stated in ACTUAL
(corrected) time.

Cameras of interest: Ch1 (front counter), Ch3 (entrance),
Ch4 (rear stockroom). 1920x1080 (1080p) @ 15 fps, H.264.

Recovered scopes:
  - 2026-01-12 22:00:00 -> 2026-01-13 02:30:00 (Ch1, Ch3, Ch4)
  - 2026-01-13 07:15:00 -> 2026-01-13 08:00:00 (Ch1)

Footage exported to USB and sealed in evidence bag
PR-EV-33418. Continuity maintained; no gaps observed in the
recorded timeline for the requested period.`

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Generated() {
  return (
    <Phone>
      <NotesScreen notes={NOTES} {...callbacks} />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <NotesScreen notes="" {...callbacks} />
    </Phone>
  )
}
