// Authored preview — CamerasScreen. Camera inventory (name/location + resolution + FPS).
// Variant axis: a populated inventory vs. the empty "add the ones in the recovery" state.
import { CamerasScreen } from 'open-pro-next'

/* Form customisation (Settings > Form Fields) can hide any wizard field; a screen asks this
   predicate per field id. Every preview shows the DEFAULT state — nothing hidden. */
const allFieldsVisible = () => true

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Filled() {
  return (
    <Phone>
      <CamerasScreen
        isFieldVisible={allFieldsVisible}
        onCaptureGps={() => {}}
        cameras={[
          { id: 'c1', cameraName: 'Front Entrance', resolution: '1920x1080', recordingFps: '15fps', gps: { source: 'gps' as const, capturedAt: '2026-01-14 08:22:10', lat: 43.5891, lng: -79.6441, accuracyM: 4 } },
          { id: 'c2', cameraName: 'Rear Loading Dock', resolution: '2560x1440', recordingFps: '12fps' },
          { id: 'c3', cameraName: 'Cash Register 1', resolution: '1280x720', recordingFps: '30fps' },
        ]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        nextLabel="Next: Export Information" onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <CamerasScreen
        isFieldVisible={allFieldsVisible}
        onCaptureGps={() => {}}
        cameras={[]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        nextLabel="Next: Export Information" onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
