// Authored preview — TimeOffsetScreen. The marquee calibration screen: DVR clock vs actual
// time, NTP sync card, computed offset, and requested ranges corrected onto the DVR clock.
// Variant axis: input-only (pre-calculate) vs the full calculated state with sync + scopes.
import { TimeOffsetScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

const SYNC = {
  method: 'NTP' as const,
  server: 'time.nrc.ca',
  offsetMs: 412,
  uncertaintyMs: 8.4,
  rttMs: 23.6,
  timestamp: new Date('2026-01-14T08:52:03').getTime(),
  stratum: 2,
  traceability: 'NRC (National Research Council Canada) → GPS/Cesium (stratum 2)',
}

const CORRECTED = [
  { id: 's1', reqLabel: 'Requested #1', adjLabel: 'Adjusted #1', reqStart: '2026-01-13 21:15:00', reqEnd: '2026-01-13 21:45:00', adjStart: '2026-01-13 21:12:30', adjEnd: '2026-01-13 21:42:30', cameras: 'Cam 3, Cam 4 (rear lot)' },
  { id: 's2', reqLabel: 'Requested #2', adjLabel: 'Adjusted #2', reqStart: '2026-01-13 22:30:00', reqEnd: '2026-01-13 23:00:00', adjStart: '2026-01-13 22:27:30', adjEnd: '2026-01-13 22:57:30', cameras: 'Cam 1 (front entrance)' },
]

const CALLBACKS = {
  onChangeDvr: () => {},
  onChangeActual: () => {},
  onUseCurrentTime: () => {},
  onCalculate: () => {},
  onCaptureOcr: () => {},
  onToggleDst: () => {},
  nextLabel: "Next: Extracted Video Scope", onNext: () => {},
  onBack: () => {},
  onMenu: () => {},
}

/* Both required, both added after this preview was authored. `dstAdvisory` is the Banner copy the
   screen renders when the DVR applies DST (`TimeOffsetScreen.tsx:170`); `null` is the no-advisory
   state. `hasExtractedScopes` gates whether confirming offers to regenerate the extracted scopes. */
const GATES = { dstAdvisory: null, hasExtractedScopes: true }

export function Calculated() {
  return (
    <Phone>
      <TimeOffsetScreen
        dvrDateTime="2026-01-14 08:49:33"
        actualDateTime="2026-01-14 08:52:03"
        sync={SYNC}
        syncing={false}
        result={{ diff: '2m 30s', direction: 'behind', isCorrect: false }}
        correctedScopes={CORRECTED}
        dvrAppliesDST={true}
        {...GATES}
        {...CALLBACKS}
      />
    </Phone>
  )
}

export function InputOnly() {
  return (
    <Phone>
      <TimeOffsetScreen
        dvrDateTime="2026-01-14 08:49:33"
        actualDateTime=""
        sync={null}
        syncing={false}
        result={null}
        correctedScopes={[]}
        dvrAppliesDST={false}
        {...GATES}
        {...CALLBACKS}
      />
    </Phone>
  )
}
