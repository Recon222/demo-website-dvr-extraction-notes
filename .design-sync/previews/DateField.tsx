// Authored preview — DateField. The closed "DATE" button (the picker opens on click).
// Filled shows the formatted date; empty shows the em-dash placeholder.
import { DateField } from 'open-pro-next'

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
      <DateField value="2026-07-14 14:30:00" onChange={() => {}} />
    </Frame>
  )
}

export function Empty() {
  return (
    <Frame>
      <DateField value="" onChange={() => {}} />
    </Frame>
  )
}
