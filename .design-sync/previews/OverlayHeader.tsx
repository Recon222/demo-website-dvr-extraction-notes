// Authored preview — OverlayHeader (U7.2). The demo's one overlay header; variant axis =
// `glass` (over an opaque app shell) vs `cameraScrim` (over a live camera feed, palette frozen
// by D17). Wrapped in <div data-demo-root> with the ported navy backdrop (#002853 =
// colors.background, tokens/palette.ts:99) because demo.css scopes every rule to that attribute.
//
// Both stories are the real call sites' props:
//   glass       — AudioPreviewScreen.tsx:116-124 + AudioRecorderScreen.tsx:176-184's trailing badge
//   cameraScrim — MediaCaptureScreen.tsx:521-524
//
// `cameraScrim` paints over a camera feed, so its story sits on a near-black panel: the header's
// own controls carry `CAMERA_CHROME.controlScrim` and only read correctly over dark video.
import { OverlayHeader } from 'open-pro-next'

function Phone({ children, feed = false }: { children: React.ReactNode; feed?: boolean }) {
  return (
    <div
      data-demo-root
      style={{
        background: '#002853',
        width: 378,
        padding: '16px 0',
        fontFamily: 'system-ui',
        overflow: 'hidden',
      }}
    >
      {/* The camera stories need a feed-like ground under the scrim controls. */}
      <div style={feed ? { background: '#141a1f', padding: '16px 0' } : undefined}>{children}</div>
    </div>
  )
}

/* AudioRecorderScreen.tsx:182-185, verbatim. `colors.primary` (#2B8CC1, palette.ts:88) and
   `colors.textSecondary` (#99badd, palette.ts:106); the demo's HUD mono is Share Tech Mono
   (D13 — scanner/terminal/HUD), self-hosted via next/font. */
const CAPTURE_BADGE = (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <span style={{ width: 5, height: 5, borderRadius: 2.5, background: '#2B8CC1', opacity: 0.6 }} />
    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, letterSpacing: 1.5, color: '#99badd' }}>
      AUDIO CAPTURE
    </span>
  </div>
)

export function Glass() {
  return (
    <Phone>
      <OverlayHeader
        variant="glass"
        title="Review Audio"
        onBack={() => {}}
        backLabel="Exit audio recording"
        style={{ padding: '0 20px' }}
      />
    </Phone>
  )
}

export function GlassWithTrailing() {
  return (
    <Phone>
      <OverlayHeader
        variant="glass"
        onBack={() => {}}
        backLabel="Cancel recording"
        trailing={CAPTURE_BADGE}
        style={{ padding: '0 20px' }}
      />
    </Phone>
  )
}

export function CameraScrim() {
  return (
    <Phone feed>
      <OverlayHeader
        variant="cameraScrim"
        onBack={() => {}}
        backLabel="Close camera"
        style={{ padding: '0 20px' }}
      />
    </Phone>
  )
}

/* The no-control arm of the discriminated pair (OverlayHeader.tsx:113-115): a title-only header
   with no leading button, which is what makes the `onBack?: undefined` branch exhaustive. */
export function TitleOnly() {
  return (
    <Phone>
      <OverlayHeader variant="glass" title="Confirm DVR Time" style={{ padding: '0 20px' }} />
    </Phone>
  )
}
