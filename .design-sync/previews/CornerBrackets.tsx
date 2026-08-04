// Preview for CornerBrackets — the Case File corner-bracket framing.
// The floor card rendered near-blank because the crash-prevention props gave it a
// label but no children, so it framed empty space. These stories give it real
// content to frame, which is the only way the component reads as itself.
//
// Imports: component from the shipped bundle ('open-pro-next' → window.CaseFile),
// per the sync's story-import rules.
import { CornerBrackets } from 'open-pro-next'

export function AroundAStat() {
  return (
    <CornerBrackets label="EXHIBIT A">
      <div style={{ textAlign: 'center', padding: '18px 28px' }}>
        <div className="font-jbmono text-4xl text-heading">04:17:22</div>
        <div className="font-stmono text-[11px] tracking-[2px] text-muted" style={{ marginTop: 6 }}>
          DVR OFFSET — VERIFIED
        </div>
      </div>
    </CornerBrackets>
  )
}

export function AroundACaption() {
  return (
    <CornerBrackets label="FIG. 06-A">
      <p className="text-body" style={{ maxWidth: 320, padding: '8px 20px', lineHeight: 1.6 }}>
        The traceability chain, printed into every report: DVR clock → phone OCR → NTP
        server → atomic clock → your defensible offset.
      </p>
    </CornerBrackets>
  )
}

export function TightLabel() {
  return (
    <CornerBrackets label="CHAIN OF CUSTODY">
      <div className="font-stmono text-[12px] text-carolina" style={{ padding: '14px 22px' }}>
        SEALED · SHA-256 · 2026-07-16T04:17:22Z
      </div>
    </CornerBrackets>
  )
}
