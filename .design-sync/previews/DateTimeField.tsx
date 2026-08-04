// Authored preview — DateTimeField. Labelled Date | Time pair, each a closed picker button.
// Filled shows both halves populated from one value; empty shows the em-dash placeholders.
import { DateTimeField } from 'open-pro-next'

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

export function Filled() {
  return (
    <Frame>
      <DateTimeField label="Arrival Time" value="2026-07-14 14:30:00" onChange={() => {}} />
    </Frame>
  )
}

export function Empty() {
  return (
    <Frame>
      <DateTimeField label="Departure Time" value="" onChange={() => {}} />
    </Frame>
  )
}
