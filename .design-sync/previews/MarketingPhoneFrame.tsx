// Preview for MarketingPhoneFrame — the corner-bracketed, blueprint-grid device
// shell wrapping screen content. It reads as itself only with a real screen
// inside, so each cell fills the 378×786 slot with a plausible capture UI in DS
// tokens. Two cells sweep the two fixed scales it ships at: feature rows (0.62)
// and the hero (0.78).
import { MarketingPhoneFrame } from 'open-pro-next'

// A plausible on-device capture screen (stmono/jbmono, cyan/gold/carolina) that
// fills the whole slot so the frame frames something real, not empty grid.
function CaptureScreen({ clock, offset, cam }: { clock: string; offset: string; cam: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '54px 22px 30px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-stmono text-cyan" style={{ fontSize: 11, letterSpacing: 2 }}>
          ● REC
        </span>
        <span className="font-stmono text-muted" style={{ fontSize: 11, letterSpacing: 2 }}>
          {cam}
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
        <div className="font-stmono text-faint" style={{ fontSize: 10, letterSpacing: 3 }}>
          DVR CLOCK
        </div>
        <div className="font-jbmono text-heading" style={{ fontSize: 46, lineHeight: 1 }}>
          {clock}
        </div>
        <div
          style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(153,186,221,0.14)' }}
        >
          <div className="font-stmono text-faint" style={{ fontSize: 10, letterSpacing: 3 }}>
            VERIFIED OFFSET
          </div>
          <div className="font-jbmono text-gold" style={{ fontSize: 22, marginTop: 4 }}>
            {offset}
          </div>
        </div>
      </div>

      <div className="font-stmono text-carolina" style={{ fontSize: 10, letterSpacing: 2 }}>
        NTP-CALIBRATED · SHA-256 SEALED
      </div>
    </div>
  )
}

// Feature-row scale.
export function RowScale() {
  return (
    <MarketingPhoneFrame scale={0.62} label="REC 02 — OCR CAPTURE">
      <CaptureScreen clock="04:17:22" offset="+00:03:11" cam="CAM 03" />
    </MarketingPhoneFrame>
  )
}

// Hero scale.
export function HeroScale() {
  return (
    <MarketingPhoneFrame scale={0.78} label="REC 01 — TIME CALIBRATION">
      <CaptureScreen clock="21:58:40" offset="−00:01:47" cam="CAM 01" />
    </MarketingPhoneFrame>
  )
}
