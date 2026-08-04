// Preview for AppDemo — the GIF-style looping video demo. No media ships in the
// bundle, so with no `src` it renders its labelled placeholder branch ("Demo
// coming soon") — which is exactly the correct static render for this
// viewport-driven video. Two cells with different labels prove the accessible
// label is wired through and the placeholder frame holds its aspect-video box.
import { AppDemo } from 'open-pro-next'

export function TimeCalibration() {
  return <AppDemo label="Time calibration — OCR capture" />
}

export function ReportExport() {
  return <AppDemo label="Court-ready report — PDF export" />
}
