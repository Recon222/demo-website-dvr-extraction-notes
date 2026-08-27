// Authored preview — OcrCaptureScreen. Full-screen OCR capture overlay (position:absolute
// inset:0 → the frame is position:relative with a real height). Variant axis: result stage —
// aim/camera (null), a cleanly parsed timestamp, the ambiguous-date branch, and unreadable text.
//
// `result`'s shape moved since v1: `confidence` is now `{ label, level, measured }` (the old
// `color` is gone — the screen derives the tone from `level`), and a parsed result carries a
// `resolution` discriminated on `kind`: 'exact' | 'assumed-date' | 'ambiguous'. Reading
// `resolution.kind` off the v1 shape is what made this card throw.
import { OcrCaptureScreen } from 'open-pro-next'

// Overlay is absolute inset:0 — needs a positioned, height-bearing ancestor to fill.
function PhoneOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, height: 786, position: 'relative', fontFamily: 'system-ui', overflow: 'hidden' }}>
      {children}
    </div>
  )
}

const noop = () => {}
const callbacks = {
  onUseSample: noop,
  onCapture: noop,
  onCancel: noop,
  onRetake: noop,
  onConfirm: noop,
  onConfirmDate: noop,
  onLiveRead: noop,
  onChangeDvrDraft: noop,
}

/* The DVR-time field the visitor can correct by hand before confirming, and the two flags the
   confirm step branches on. `hasExtractedScopes` decides whether confirming offers to
   regenerate the extracted scopes from the new offset. */
const DRAFT = { dvrDraft: '2026-01-14 08:49:33', dateConfirmed: false, hasExtractedScopes: true }

export function Aim() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen result={null} {...DRAFT} {...callbacks} />
    </PhoneOverlay>
  )
}

export function Parsed() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen
        result={{
          ok: true,
          dvrTime: '2026-01-14 08:49:33',
          confidence: { label: 'High (0.97)', level: 'high' as const, measured: true },
          actual: '2026-01-14 08:52:03',
          resolution: { kind: 'exact' as const },
        }}
        {...DRAFT}
        {...callbacks}
      />
    </PhoneOverlay>
  )
}

/* The branch worth showing a design pass: the recogniser read 01-02 and cannot tell 1 February
   from 2 January, so the screen asks rather than guessing silently. */
export function AmbiguousDate() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen
        result={{
          ok: true,
          dvrTime: '2026-01-02 22:14:07',
          confidence: { label: 'Medium (0.71)', level: 'medium' as const, measured: true },
          actual: '2026-01-02 22:16:37',
          resolution: {
            kind: 'ambiguous' as const,
            ambiguity: {
              chosenDate: '2026-01-02',
              chosenFormat: 'MM-DD' as const,
              alternativeDate: '2026-02-01',
              confidence: 'low' as const,
              reason: 'close_call' as const,
              chosenDistanceDays: 12,
              alternativeDistanceDays: 18,
            },
          },
        }}
        {...DRAFT}
        {...callbacks}
      />
    </PhoneOverlay>
  )
}

export function Unreadable() {
  return (
    <PhoneOverlay>
      <OcrCaptureScreen result={{ ok: false, rawText: 'D8:U9:33  1U-JHN-2O26' }} {...DRAFT} {...callbacks} />
    </PhoneOverlay>
  )
}
