// Authored preview — ExitDialog. Page-level "before you go" overlay (position:fixed, inset:0);
// lists the unlit manifest rows the visitor hasn't explored. open=true so it renders.
import { ExitDialog } from 'open-pro-next'

// transform makes the frame the containing block for ExitDialog's position:fixed backdrop,
// so overflow:hidden clips it to the frame (uniform dim, not a two-tone viewport bleed).
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', transform: 'translateZ(0)', background: '#002853', width: 460, height: 520, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const MANY = [
  { number: '09', label: 'Time Offset' },
  { number: '11', label: 'DVR Information' },
  { number: '12', label: 'Cameras' },
  { number: '14', label: 'Notes' },
  { number: '15', label: 'Completion' },
  { number: '16', label: 'Case Map' },
]

const FEW = [
  { number: '15', label: 'Completion' },
  { number: '16', label: 'Case Map' },
]

export function ManyUnseen() {
  return (
    <Frame>
      <ExitDialog open unseen={MANY} leaveHref="/" onStay={() => {}} />
    </Frame>
  )
}

export function AlmostDone() {
  return (
    <Frame>
      <ExitDialog open unseen={FEW} leaveHref="/" onStay={() => {}} />
    </Frame>
  )
}
