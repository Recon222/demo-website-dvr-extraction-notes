import { escapeHtml, formatDocDate, nowStamp } from '@/lib/demo/logic/pdf/shared'

/**
 * The Time-Offset Calibration report — a print-ready HTML reproduction of the app's
 * `time-offset-template`. Carries the forensic methodology: the OCR/manual capture
 * record, the NTP atomic-clock calibration, and the traceability chain.
 */

export interface TimeOffsetSync {
  method: string
  server?: string
  offsetMs: number
  uncertaintyMs: number
  rttMs?: number
  traceability?: string
}

export interface TimeOffsetDocData {
  occNumber?: string
  address?: string
  isCorrect?: boolean
  formattedDiff?: string
  direction?: string
  dvrDateTime?: string
  actualDateTime?: string
  captureMethod?: string
  ocrImageDataUrl?: string
  ocrRawText?: string
  ocrCleanedText?: string
  ocrParsedDateTime?: string
  dvrAppliesDST?: boolean
  sync?: TimeOffsetSync | null
  generatedAt?: string
}

const ACCENT = '#b3261e'
const TIME_OFFSET_STYLES = `
  @page { margin: 0.75in; size: letter portrait; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .document-header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 16px; margin-bottom: 26px; }
  .document-title-main { font-size: 19pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #000; margin-bottom: 10px; }
  .document-badge { display: inline-block; border: 1px solid #000; color: #000; padding: 3px 12px; font-size: 10.5pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
  .document-location { font-size: 11pt; color: #333; margin-top: 10px; }
  .section { margin-bottom: 26px; }
  .section-title { font-size: 13pt; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 14px; page-break-after: avoid; }
  .subsection { margin: 20px 0; }
  .subsection-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #bbb; padding-bottom: 4px; margin-bottom: 10px; }
  .time-offset-hero { border: 1.5px solid #000; background: #f5f5f5; text-align: center; padding: 20px 16px; margin: 8px 0; page-break-inside: avoid; }
  .time-offset-hero-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #444; margin-bottom: 8px; }
  .time-offset-hero-value { font-family: 'Courier New', monospace; font-size: 30pt; font-weight: 700; letter-spacing: 0.02em; color: #000; line-height: 1.05; }
  .time-offset-hero-direction { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${ACCENT}; margin-top: 8px; }
  .comparison-grid { display: flex; gap: 14px; margin: 14px 0; }
  .comparison-column { flex: 1; border: 1px solid #000; background: #fff; padding: 14px; text-align: center; }
  .comparison-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #444; margin-bottom: 6px; }
  .comparison-value { font-family: 'Courier New', monospace; font-size: 13pt; font-weight: 700; color: #000; white-space: nowrap; }
  .comparison-date { font-size: 8.5pt; color: #555; margin-top: 6px; }
  .methodology-box { border: 1px solid #ccc; border-left: 3px solid #000; background: #fafafa; padding: 14px 16px; margin: 14px 0; page-break-inside: avoid; }
  .methodology-box.warning { border-left-color: ${ACCENT}; }
  .methodology-box h3 { font-size: 11.5pt; font-weight: 700; color: #000; margin: 0 0 8px 0; }
  .methodology-box.warning h3 { color: ${ACCENT}; }
  .methodology-box h4 { font-size: 10pt; font-weight: 700; color: #000; margin: 10px 0 5px 0; }
  .methodology-box p { font-size: 11pt; color: #000; line-height: 1.55; margin: 0 0 8px 0; }
  .formula-box { border: 1px solid #ccc; background: #fff; padding: 14px 16px; margin: 12px 0; }
  .formula-box h4 { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .formula-box code { display: block; font-family: 'Courier New', monospace; font-size: 11pt; color: #000; background: #f5f5f5; border: 1px solid #ddd; padding: 7px 12px; margin: 3px 0; }
  .image-evidence { border: 1px solid #000; background: #fff; padding: 10px; margin: 10px 0; page-break-inside: avoid; }
  .image-evidence-title { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
  .image-container { text-align: center; border: 1px solid #000; background: #fff; padding: 5px; }
  .image-container img { max-width: 100%; height: auto; max-height: 90px; object-fit: contain; display: block; margin: 0 auto; }
  .image-caption { margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd; }
  .tech-specs { display: table; width: 100%; margin: 14px 0; }
  .tech-spec-row { display: table-row; }
  .tech-spec-label { display: table-cell; width: 210px; padding: 8px 16px 8px 0; vertical-align: top; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #444; border-bottom: 1px solid #e2e2e2; }
  .tech-spec-value { display: table-cell; padding: 8px 0; vertical-align: top; font-size: 11pt; color: #000; border-bottom: 1px solid #e2e2e2; }
  .methodology-detail { margin: 16px 0; line-height: 1.55; color: #1a1a1a; font-size: 11pt; }
  .methodology-detail h3 { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #bbb; padding-bottom: 5px; margin: 0 0 12px 0; }
  .accuracy-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  .accuracy-table th { background: #e8e8e8; color: #000; border: 1px solid #000; padding: 8px 10px; text-align: left; font-weight: 700; }
  .accuracy-table td { border: 1px solid #555; padding: 7px 10px; }
  .traceability-chain { font-family: 'Courier New', monospace; background: #f5f5f5; border: 1px solid #999; color: #000; padding: 14px 16px; font-size: 9.5pt; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; }
  .traceability-explanation { font-size: 9.5pt; color: #555; font-style: italic; margin-top: 10px; line-height: 1.55; }
  .document-footer { margin-top: 36px; padding-top: 16px; border-top: 2px solid #000; text-align: center; color: #666; font-size: 9pt; }
  .document-footer-badge { display: inline-block; border: 1px solid #999; padding: 3px 12px; margin-bottom: 8px; font-size: 8pt; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
`

export function generateTimeOffsetDoc(d: TimeOffsetDocData): string {
  const e = escapeHtml
  const isCorrect = !!d.isCorrect
  const heroValue = isCorrect ? 'CORRECT' : e(d.formattedDiff || '--:--:--')
  const heroDir = isCorrect ? 'DVR time is CORRECT' : 'DVR is ' + e(d.direction || 'UNKNOWN') + ' real time'

  const interpretation = isCorrect
    ? `<div class="methodology-box"><h3>Interpretation</h3><p>The DVR's internal clock matches the calibrated actual time. The displayed timestamps can be read as-is &mdash; <strong>no offset adjustment is needed</strong>.</p></div>`
    : `<div class="methodology-box"><h3>Interpretation</h3><p>The DVR's internal clock is running <strong>${
        d.direction === 'BEHIND' ? 'behind' : 'ahead'
      }</strong> of actual time. The displayed timestamps are ${
        d.direction === 'BEHIND' ? 'earlier' : 'later'
      } than the real time the video represents.</p></div>`

  const applying = isCorrect
    ? ''
    : `
  <div class="methodology-box"><h3>Applying the Time Offset</h3>
    <p>The time offset converts DVR time to actual time:</p>
    <div class="formula-box"><h4>DVR Time to Actual Time</h4>
      <p><strong>If DVR is ahead:</strong></p><code>Actual Time = DVR Time - Offset</code>
      <p><strong>If DVR is behind:</strong></p><code>Actual Time = DVR Time + Offset</code></div>
  </div>`

  // DVR Time Offset Process — OCR (with captured image) or manual.
  let processSection: string
  if (d.captureMethod === 'ocr') {
    const img = d.ocrImageDataUrl
      ? `<div class="image-evidence"><div class="image-evidence-title">Captured DVR Display</div><div class="image-container"><img src="${e(
          d.ocrImageDataUrl,
        )}" alt="DVR Time Offset Process - Processed Image" /></div><div class="image-caption">This image shows the DVR timestamp display as captured and cropped for OCR extraction.</div></div>`
      : ''
    const specs = d.ocrRawText
      ? `<div class="tech-specs">
      <div class="tech-spec-row"><div class="tech-spec-label">Capture Method:</div><div class="tech-spec-value">Camera + OCR</div></div>
      <div class="tech-spec-row"><div class="tech-spec-label">Raw OCR Output:</div><div class="tech-spec-value"><strong>${e(
        d.ocrRawText,
      )}</strong></div></div>
      ${
        d.ocrCleanedText
          ? `<div class="tech-spec-row"><div class="tech-spec-label">Cleaned Text:</div><div class="tech-spec-value"><strong>${e(
              d.ocrCleanedText,
            )}</strong></div></div>`
          : ''
      }
      ${
        d.ocrParsedDateTime
          ? `<div class="tech-spec-row"><div class="tech-spec-label">Parsed Date/Time:</div><div class="tech-spec-value"><strong>${e(
              d.ocrParsedDateTime,
            )}</strong></div></div>`
          : ''
      }
    </div>`
      : ''
    processSection = `<section class="section"><h2 class="section-title">DVR Time Offset Process</h2>
      <div class="methodology-box"><h3>Automated OCR Capture</h3><p>The DVR timestamp was captured using the device camera and automatically extracted using <strong>text recognition</strong>. This eliminates manual transcription errors and provides a visual record of the DVR display at the moment of capture.</p></div>
      ${img}${specs}</section>`
  } else {
    processSection = `<section class="section"><h2 class="section-title">DVR Time Offset Process</h2>
      <div class="methodology-box"><h3>Manual Entry</h3><p>The DVR timestamp was <strong>entered manually</strong> by the user. No automated OCR capture was performed for this location.</p></div></section>`
  }

  const dstBox = d.dvrAppliesDST
    ? `<div class="methodology-box warning"><h3>DST Adjustment Applied</h3><p>The DVR system accounts for Daylight Saving Time (DST). This has been factored into the time offset calculation.</p></div>`
    : ''

  // Device Time Calibration — NTP sync, or no-sync warning.
  let calibrationSection: string
  const s = d.sync
  if (s && s.method === 'NTP') {
    const offText =
      Math.abs(s.offsetMs) < 1
        ? 'Less than 1ms (device synchronized)'
        : Math.abs(s.offsetMs).toFixed(2) + 'ms ' + (s.offsetMs > 0 ? 'slow' : 'fast')
    calibrationSection = `<section class="section"><h2 class="section-title">Device Time Calibration</h2>
      <div class="methodology-box"><h3>Atomic Clock Synchronization</h3><p>Device time was calibrated using <strong>NTP (Network Time Protocol)</strong> prior to DVR timestamp capture, traceable to international atomic time standards (UTC).</p></div>
      <div class="tech-specs">
        <div class="tech-spec-row"><div class="tech-spec-label">Sync Method:</div><div class="tech-spec-value"><strong>NTP (Network Time Protocol)</strong></div></div>
        <div class="tech-spec-row"><div class="tech-spec-label">Time Server:</div><div class="tech-spec-value">${e(
          s.server || 'Unknown',
        )}</div></div>
        <div class="tech-spec-row"><div class="tech-spec-label">Device Offset:</div><div class="tech-spec-value">${e(
          offText,
        )}</div></div>
        <div class="tech-spec-row"><div class="tech-spec-label">Uncertainty:</div><div class="tech-spec-value">+/-${e(
          Number(s.uncertaintyMs).toFixed(2),
        )}ms (NTP-grade accuracy)</div></div>
        ${
          s.rttMs !== undefined
            ? `<div class="tech-spec-row"><div class="tech-spec-label">Network Delay:</div><div class="tech-spec-value">${e(
                (s.rttMs / 2).toFixed(2),
              )}ms</div></div>`
            : ''
        }
        <div class="tech-spec-row"><div class="tech-spec-label">Calibration Time:</div><div class="tech-spec-value">${e(
          formatDocDate(d.actualDateTime),
        )}</div></div>
      </div>
      <div class="methodology-detail">
        <h3>Network Time Protocol and Global Time Synchronization</h3>
        <h4>Accuracy by Level</h4>
        <table class="accuracy-table"><thead><tr><th>Level</th><th>Typical Accuracy to UTC</th></tr></thead><tbody>
          <tr><td>Stratum 1</td><td>Microseconds</td></tr>
          <tr><td>Stratum 2</td><td>Milliseconds</td></tr>
          <tr><td>End Device (Internet)</td><td>10–100 milliseconds</td></tr>
        </tbody></table>
      </div>
      <div class="subsection"><div class="subsection-title">Traceability Chain</div>
        <div class="traceability-chain">${e(
          s.traceability || 'App → NTP → ' + (s.server || 'NTP Server') + ' → UTC(NIST) → UTC',
        )}</div>
        <p class="traceability-explanation">This chain demonstrates that the device time used for timestamp capture is traceable to atomic clocks maintained by national standards laboratories.</p>
      </div>
    </section>`
  } else {
    calibrationSection = `<section class="section"><h2 class="section-title">Device Time Calibration</h2>
      <div class="methodology-box warning"><h3>Manual Time Entry - Device Time Not Verified</h3><p>Device time was <strong>not synchronized</strong> with an atomic clock prior to timestamp capture. Time offset accuracy depends entirely on the device's internal clock, which may drift.</p><p style="color:${ACCENT};font-weight:600;"><strong>Recommendation:</strong> Use the "Calibrate Time" feature to synchronize with NTP atomic clock servers before capturing DVR timestamps.</p></div></section>`
  }

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Time Offset Calibration - ${e(
    d.occNumber,
  )}</title><style>${TIME_OFFSET_STYLES}</style></head><body>
  <header class="document-header"><h1 class="document-title-main">Time Offset Report</h1><span class="document-badge">${e(
    d.occNumber || 'N/A',
  )}</span><p class="document-location">${e(d.address || '')}</p></header>
  <section class="section"><h2 class="section-title">Time Offset Summary</h2>
    <div class="time-offset-hero"><div class="time-offset-hero-label">Calculated Time Offset</div><div class="time-offset-hero-value">${heroValue}</div><div class="time-offset-hero-direction">${heroDir}</div></div>
  </section>
  <div class="comparison-grid">
    <div class="comparison-column"><div class="comparison-label">DVR Time</div><div class="comparison-value">${e(
      formatDocDate(d.dvrDateTime),
    )}</div><div class="comparison-date">As displayed on DVR system</div></div>
    <div class="comparison-column"><div class="comparison-label">Actual Time</div><div class="comparison-value">${e(
      formatDocDate(d.actualDateTime),
    )}</div><div class="comparison-date">Calibrated device time</div></div>
  </div>
  ${interpretation}
  ${applying}
  ${processSection}
  ${dstBox}
  ${calibrationSection}
  <footer class="document-footer"><div class="document-footer-badge">Forensic Documentation</div><p>Report generated on ${e(
    d.generatedAt || nowStamp(),
  )}</p><p>DVR Extraction Notes - Time Offset Calibration System v1.0</p></footer>
  </body></html>`
}
