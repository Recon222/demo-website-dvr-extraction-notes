// Authored preview — CamerasScreen. Camera inventory (name/location + resolution + FPS).
// Variant axis: a populated inventory vs. the empty "add the ones in the recovery" state.
import { CamerasScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Filled() {
  return (
    <Phone>
      <CamerasScreen
        cameras={[
          { id: 'c1', cameraName: 'Front Entrance', resolution: '1920x1080', recordingFps: '15fps', gps: { lat: 43.5891, lng: -79.6441, accuracyM: 4 } },
          { id: 'c2', cameraName: 'Rear Loading Dock', resolution: '2560x1440', recordingFps: '12fps' },
          { id: 'c3', cameraName: 'Cash Register 1', resolution: '1280x720', recordingFps: '30fps' },
        ]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
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
      <CamerasScreen
        cameras={[]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
