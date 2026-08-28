// Authored preview — Banner (U3.3). The demo's ONE severity callout; variant axis = severity.
// Wrapped in <div data-demo-root> with the ported navy backdrop (#002853 = colors.background,
// tokens/palette.ts:99) because demo.css scopes every rule — box-sizing included — to that
// attribute, and the card body is white.
//
// The four messages are real demo copy, not invented strings:
//   error   — CompletionScreen.tsx:21-22 (NO_CASE_MESSAGE)
//   warning — the DST advisory shape TimeOffsetScreen.tsx:170 renders
//   info    — the notice shape AudioRecorderScreen.tsx:296 renders
//   success — the completion confirmation the wizard's last step shows
import { Banner } from 'open-pro-next'

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

export function Info() {
  return (
    <Frame>
      <Banner severity="info" message="Using a sample recording. This demo does not access your microphone." />
    </Frame>
  )
}

export function Warning() {
  return (
    <Frame>
      <Banner
        severity="warning"
        message="The DVR applies daylight saving time. Recorded timestamps between 02:00 and 03:00 on 2 November 2025 are ambiguous."
      />
    </Frame>
  )
}

export function Success() {
  return (
    <Frame>
      <Banner severity="success" message="Extraction notes completed and locked. The PDF is ready to export." />
    </Frame>
  )
}

export function Error() {
  return (
    <Frame>
      <Banner
        severity="error"
        message="No Case Selected. Please create a case and location from the Cases screen before completing the form."
      />
    </Frame>
  )
}
