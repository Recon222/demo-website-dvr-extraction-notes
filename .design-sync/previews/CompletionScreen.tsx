// Authored preview — CompletionScreen. Variant axis: isComplete (review summary + export
// gate  vs  the "Case Complete" confirmation state).
import { CompletionScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

const SUMMARY = {
  occNumber: 'PR-2026-0114-2287',
  location: 'Northgate Convenience — 1450 Dundas St E, Mississauga',
  dvr: 'Hikvision DS-7208HUHI (8-ch)',
  offset: '2m 30s behind',
  scopes: 2,
  cameras: 4,
  export: 'AES-256 ZIP · 6 files',
}

export function Review() {
  return (
    <Phone>
      <CompletionScreen
        summary={SUMMARY}
        isComplete={false}
        dateTimeCompleted="2026-01-14 09:20:00"
        completedBy="Det. M. Okafor #4471"
        onChange={() => {}}
        onPreviewPdf={() => {}}
        onPreviewTimeOffsetPdf={() => {}}
        onComplete={() => {}}
        onBackToDashboard={() => {}}
        onBackToCases={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

export function Complete() {
  return (
    <Phone>
      <CompletionScreen
        summary={SUMMARY}
        isComplete={true}
        dateTimeCompleted="2026-01-14 09:20:00"
        completedBy="Det. M. Okafor #4471"
        onChange={() => {}}
        onPreviewPdf={() => {}}
        onPreviewTimeOffsetPdf={() => {}}
        onComplete={() => {}}
        onBackToDashboard={() => {}}
        onBackToCases={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
