// Authored preview — SplashScreen. Variant axis: authState (idle / scanning / authorized).
// Full phone-screen surface; rendered in a phone-width dark frame.
import { SplashScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}
    >
      {children}
    </div>
  )
}

export function Idle() {
  return (
    <Phone>
      <SplashScreen authState="idle" onScan={() => {}} />
    </Phone>
  )
}

export function Scanning() {
  return (
    <Phone>
      <SplashScreen authState="scanning" onScan={() => {}} />
    </Phone>
  )
}

export function Authorized() {
  return (
    <Phone>
      <SplashScreen authState="authorized" onScan={() => {}} />
    </Phone>
  )
}
