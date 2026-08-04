// Authored preview — Dropdown. Real component from the bundle; realistic forensic content.
// Wrapped in <div data-demo-root> with the dark navy backdrop because demo.css scopes every
// rule to [data-demo-root] and the card body is white.
import { Dropdown } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ background: '#0d1b2a', width: 360, padding: 20, fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const RESOLUTIONS = [
  '352x240 (CIF)',
  '704x480 (4CIF)',
  '960x480 (960H)',
  '1280x720 (720p)',
  '1920x1080 (1080p)',
  'Other (Custom)',
]

const FPS = ['1', '5', '10', '15', '30', 'Other (Custom)']

export function Resolution() {
  return (
    <Frame>
      <Dropdown label="Recording Resolution" value="1920x1080 (1080p)" options={RESOLUTIONS} onChange={() => {}} />
    </Frame>
  )
}

export function FrameRate() {
  return (
    <Frame>
      <Dropdown label="Recording FPS" value="15" options={FPS} onChange={() => {}} />
    </Frame>
  )
}

export function Placeholder() {
  return (
    <Frame>
      <Dropdown label="Export Media" value="" placeholder="Select an option" options={['USB Drive', 'External Hard Drive', 'DVD', 'Cloud Upload']} onChange={() => {}} />
    </Frame>
  )
}
