// Authored preview — ExploreChecklist. The rail's numbered exploration manifest; rows light
// green once visited, the active row gets a Carolina-blue marker + inline narration.
import { ExploreChecklist } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 340, padding: 22, fontFamily: 'system-ui' }}>
      {children}
    </div>
  )
}

type Item = {
  id: string
  number: string
  label: string
  visited: boolean
  active: boolean
  jumpTo:
    | 'dashboard'
    | 'cases'
    | 'submission'
    | 'timeOffset'
    | 'dvrInfo'
    | 'cameras'
    | 'notes'
    | 'completion'
    | 'map'
}

const IN_PROGRESS: Item[] = [
  { id: 'dashboard', number: '01', label: 'Dashboard', visited: true, active: false, jumpTo: 'dashboard' },
  { id: 'cases', number: '02', label: 'Cases', visited: true, active: false, jumpTo: 'cases' },
  { id: 'submission', number: '06', label: 'Submission Details', visited: true, active: false, jumpTo: 'submission' },
  { id: 'timeOffset', number: '09', label: 'Time Offset', visited: false, active: true, jumpTo: 'timeOffset' },
  { id: 'dvrInfo', number: '11', label: 'DVR Information', visited: false, active: false, jumpTo: 'dvrInfo' },
  { id: 'cameras', number: '12', label: 'Cameras', visited: false, active: false, jumpTo: 'cameras' },
  { id: 'completion', number: '15', label: 'Completion', visited: false, active: false, jumpTo: 'completion' },
  { id: 'map', number: '16', label: 'Case Map', visited: false, active: false, jumpTo: 'map' },
]

const COMPLETE: Item[] = IN_PROGRESS.map((it) => ({ ...it, visited: true, active: false }))

const Narration = (
  <div style={{ padding: '4px 12px 8px', fontSize: 12, lineHeight: 1.5, color: '#9fc0db' }}>
    Calibrate the DVR clock against an atomic-clock time source, then correct every recovered
    range to true UTC.
  </div>
)

export function InProgress() {
  return (
    <Frame>
      <ExploreChecklist items={IN_PROGRESS} onJump={() => {}} activeDetail={Narration} />
    </Frame>
  )
}

export function Complete() {
  return (
    <Frame>
      <ExploreChecklist items={COMPLETE} onJump={() => {}} />
    </Frame>
  )
}
