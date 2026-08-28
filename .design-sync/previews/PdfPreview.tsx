// Authored preview — PdfPreview. Renders the generated court-document HTML into a sandboxed
// iframe (the demo's "export"). Absolute inset:0, so it anchors into a sized phone frame.
import { PdfPreview } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 760, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

// A trimmed case-notes document — the iframe is its own sandboxed doc, so styling is inline.
const CASE_NOTES_HTML = `
<div style="font-family:Georgia,serif;color:#1a1a1a;padding:26px 24px;line-height:1.5">
  <div style="font-size:11px;letter-spacing:1px;color:#666;text-transform:uppercase">Peel Regional Police — Video Recovery Unit</div>
  <h1 style="font-size:19px;margin:8px 0 2px">CCTV Evidence Recovery Notes</h1>
  <div style="font-size:12px;color:#444">OCC PR-2026-0114-2287 &nbsp;·&nbsp; Northgate Convenience, 1450 Dundas St E, Mississauga</div>
  <hr style="border:none;border-top:1px solid #ccc;margin:14px 0" />
  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#222">Time Calibration</h2>
  <p style="font-size:12.5px;margin:4px 0">DVR clock measured <b>42.7 s SLOW</b> of true UTC, verified against NTP source <b>time.nrc.ca</b> (stratum 2, ±11.34 ms). All extracted ranges below are corrected to true time.</p>
  <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#222;margin-top:14px">Extracted Video Scope</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
    <tr style="background:#f0f0f0"><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Camera</th><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Corrected Range (UTC)</th></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd">Cam 3 — Front Till</td><td style="padding:6px 8px;border:1px solid #ddd">2026-01-13 22:14:03 → 22:41:57</td></tr>
    <tr><td style="padding:6px 8px;border:1px solid #ddd">Cam 7 — Rear Exit</td><td style="padding:6px 8px;border:1px solid #ddd">2026-01-13 22:16:40 → 22:39:12</td></tr>
  </table>
  <p style="font-size:11px;color:#666;margin-top:16px">Recovered by Det. M. Okafor #4471 · 2026-01-14 14:32 UTC</p>
</div>`

const TIME_OFFSET_HTML = `
<div style="font-family:Georgia,serif;color:#1a1a1a;padding:26px 24px;line-height:1.5">
  <div style="font-size:11px;letter-spacing:1px;color:#666;text-transform:uppercase">Peel Regional Police — Video Recovery Unit</div>
  <h1 style="font-size:19px;margin:8px 0 2px">DVR Time-Offset Calibration Report</h1>
  <div style="font-size:12px;color:#444">OCC PR-2026-0114-2287</div>
  <hr style="border:none;border-top:1px solid #ccc;margin:14px 0" />
  <table style="width:100%;border-collapse:collapse;font-size:12.5px">
    <tr><td style="padding:6px 0;color:#444">DVR displayed time</td><td style="padding:6px 0;text-align:right"><b>2026-01-13 22:13:20</b></td></tr>
    <tr><td style="padding:6px 0;color:#444">Verified actual time</td><td style="padding:6px 0;text-align:right"><b>2026-01-13 22:14:03</b></td></tr>
    <tr><td style="padding:6px 0;color:#444">Measured offset</td><td style="padding:6px 0;text-align:right"><b>42.7 s (DVR SLOW)</b></td></tr>
    <tr><td style="padding:6px 0;color:#444">Time source</td><td style="padding:6px 0;text-align:right">NTP · time.nrc.ca · ±11.34 ms</td></tr>
  </table>
  <p style="font-size:11px;color:#666;margin-top:18px">Traceable to NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second</p>
</div>`

export function CaseNotes() {
  return (
    <Phone>
      <PdfPreview title="Case Notes" html={CASE_NOTES_HTML} onClose={() => {}} />
    </Phone>
  )
}

export function TimeOffsetReport() {
  return (
    <Phone>
      <PdfPreview title="Time-Offset Report" html={TIME_OFFSET_HTML} onClose={() => {}} />
    </Phone>
  )
}
