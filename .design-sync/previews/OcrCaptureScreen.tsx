// Authored preview — OcrCaptureScreen. Full-screen OCR capture overlay (position:absolute
// inset:0 → the frame is position:relative with a real height). Variant axis: result stage —
// aim/camera (null), parsed timestamp (ok), and unreadable text (failed).
import { OcrCaptureScreen } from 'open-pro-next'

// Overlay is absolute inset:0 — needs a positioned, height-bearing ancestor to fill.
function PhoneOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, height: 786, position: 'relative', fontFamily: 'system-ui', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

export function Aim() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen result={null} onUseSample={() => {}} onCapture={() => {}} onCancel={() => {}} onRetake={() => {}} onConfirm={() => {}} />
    </PhoneOverlay>
  )
}

export function Parsed() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen
        result={{ ok: true, dvrTime: '2026-01-14 08:49:33', confidence: { label: 'High (0.97)', color: '#10d177' }, actual: '2026-01-14 08:52:03' }}
        onUseSample={() => {}}
        onCapture={() => {}}
        onCancel={() => {}}
        onRetake={() => {}}
        onConfirm={() => {}}
      />
    </PhoneOverlay>
  )
}

export function Unreadable() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen
        result={{ ok: false, rawText: 'D8:U9:33  1U-JHN-2O26' }}
        onUseSample={() => {}}
        onCapture={() => {}}
        onCancel={() => {}}
        onRetake={() => {}}
        onConfirm={() => {}}
      />
    </PhoneOverlay>
  )
}
