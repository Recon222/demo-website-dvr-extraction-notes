// Authored preview — WizardDrawer. Compound overlay: right-anchored nav with completion dots.
// PhoneOverlayPortal falls back to inline rendering with no context, so open=true renders here.
import { WizardDrawer } from 'open-pro-next'

const ITEMS = [
  { id: 'submission' as const, label: 'Submission Details', active: false, status: 'complete' as const },
  { id: 'requestedScope' as const, label: 'Requested Scope', active: false, status: 'complete' as const },
  { id: 'arrivalDeparture' as const, label: 'Arrival & Departure', active: true, status: 'partial' as const },
  { id: 'timeOffset' as const, label: 'Time Offset', active: false, status: 'partial' as const },
  { id: 'dvrInfo' as const, label: 'DVR Information', active: false },
  { id: 'cameras' as const, label: 'Cameras', active: false },
  { id: 'exportInfo' as const, label: 'Export Information', active: false },
  { id: 'notes' as const, label: 'Case Notes', active: false },
  { id: 'completion' as const, label: 'Completion', active: false },
]

export function Open() {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 720, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      <WizardDrawer
        open
        items={ITEMS}
        onClose={() => {}}
        onNavigate={() => {}}
        onBackToCases={() => {}}
        /* The media launchers the drawer lists. Both on = the drawer's full footer; a tool
           switched off in Settings > Media Capture drops its row. */
        mediaTools={{ mediaCapture: true, audioRecording: true }}
        onCaptureMedia={() => {}}
        onOpenMediaLibrary={() => {}}
        onRecordAudio={() => {}}
        /* The save indicator. `null` is "nothing to report"; the four `kind`s are
           unavailable / pending / saved / failed. */
      />
    </div>
  )
}
