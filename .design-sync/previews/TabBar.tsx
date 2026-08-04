// Authored preview — TabBar. Bottom tab bar (Dashboard / Cases / Map); variant axis = active.
// It's position:absolute; bottom:0, so it needs a positioned, sized frame to anchor into.
import { TabBar } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#0d1b2a', width: 378, height: 120, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

export function Dashboard() {
  return (
    <Phone>
      <TabBar active="dashboard" onSelect={() => {}} />
    </Phone>
  )
}

export function Cases() {
  return (
    <Phone>
      <TabBar active="cases" onSelect={() => {}} />
    </Phone>
  )
}

export function MapTab() {
  return (
    <Phone>
      <TabBar active="map" onSelect={() => {}} />
    </Phone>
  )
}
