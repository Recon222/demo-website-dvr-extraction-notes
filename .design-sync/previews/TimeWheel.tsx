// Authored preview — TimeWheel. HH:MM:SS scroll-snap drum with a center selection band.
// The controlled value is reflected as scroll position on mount, so the chosen time centers.
import { TimeWheel } from 'open-pro-next'

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

export function Afternoon() {
  return (
    <Frame>
      <TimeWheel value={{ h: 14, mi: 30, s: 5 }} onChange={() => {}} />
    </Frame>
  )
}

export function EarlyMorning() {
  return (
    <Frame>
      <TimeWheel value={{ h: 6, mi: 9, s: 45 }} onChange={() => {}} />
    </Frame>
  )
}
