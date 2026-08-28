// Authored preview — ExtractedScopeScreen. Auto-generated DVR-time extraction windows
// (editable). Variant axis: filled scope rows vs empty (regenerate-first) state.
import { ExtractedScopeScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

const SCOPES = [
  { id: 's1', startDateTime: '2026-01-13 21:12:30', endDateTime: '2026-01-13 21:42:30', isActualTime: false, cameras: 'Cam 3, Cam 4 (rear lot)' },
  { id: 's2', startDateTime: '2026-01-13 22:27:30', endDateTime: '2026-01-13 22:57:30', isActualTime: false, cameras: 'Cam 1 (front entrance)' },
]

export function Filled() {
  return (
    <Phone>
      <ExtractedScopeScreen
        scopes={SCOPES}
        onChange={() => {}}
        onRemove={() => {}}
        onRegenerate={() => {}}
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
      <ExtractedScopeScreen
        scopes={[]}
        onChange={() => {}}
        onRemove={() => {}}
        onRegenerate={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
