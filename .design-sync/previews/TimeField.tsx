// Authored preview — TimeField. The closed "TIME" button (the HH:MM:SS wheel opens on click).
// Filled shows the formatted time; empty shows the em-dash placeholder.
import { TimeField } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ background: '#002853', width: 360, padding: 20, fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

export function Filled() {
  return (
    <Frame>
      <TimeField value="2026-07-14 14:30:00" onChange={() => {}} />
    </Frame>
  )
}

export function Empty() {
  return (
    <Frame>
      <TimeField value="" onChange={() => {}} />
    </Frame>
  )
}
