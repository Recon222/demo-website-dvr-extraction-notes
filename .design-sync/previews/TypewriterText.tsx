// Authored preview — TypewriterText. Narration text that types in progressively when active;
// authored with active={false} so the full string renders statically for the sheet.
import { TypewriterText } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#0d1b2a', width: 360, padding: 24, fontFamily: 'system-ui' }}>
      {children}
    </div>
  )
}

export function Narration() {
  return (
    <Frame>
      <TypewriterText
        active={false}
        text="Every recovered clip is stamped against an atomic-clock time source, so the offset between DVR time and true UTC is court-defensible."
        style={{ fontSize: 15, lineHeight: 1.6, color: '#cfe0f2' }}
      />
    </Frame>
  )
}

export function MonoCallout() {
  return (
    <Frame>
      <TypewriterText
        active={false}
        text="DVR clock is 42.7s SLOW vs UTC — correcting all extracted ranges."
        style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.6, color: '#4BA3D4' }}
      />
    </Frame>
  )
}
