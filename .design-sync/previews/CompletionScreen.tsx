// Authored preview — CompletionScreen. Variant axis: isComplete (review summary + export
// gate  vs  the "Case Complete" confirmation state).
import { CompletionScreen } from 'open-pro-next'

/* Form customisation (Settings > Form Fields) can hide any wizard field; a screen asks this
   predicate per field id. Every preview shows the DEFAULT state — nothing hidden. */
const allFieldsVisible = () => true

/* The gates the screen renders around: `canComplete` unlocks the Complete button,
   `canExport` the ZIP export, `validationErrors` lists what is still blocking. */
const READY = {
  isFieldVisible: allFieldsVisible,
  canComplete: true,
  canExport: true,
  isExporting: false,
  validationErrors: [] as string[],
  onExportZip: () => {},
  onReviewAgain: () => {},
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
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
        {...READY}
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
        {...READY}
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
