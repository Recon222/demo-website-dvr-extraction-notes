'use client'

import { generateDisambiguationWarning, type DateDisambiguationResult } from '@/features/demo/engine/logic/date-disambiguation'

/** Phone dark-theme `colors.warning` (`src/constants/Colors.ts:102`). */
const WARNING = '#ffd93d'

const MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `YYYY-MM-DD` → `Mon D, YYYY` (phone `DateDisambiguationWarning.tsx:83-90`). */
function formatDateForDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${MONTHS_SHORT[parseInt(month, 10)]} ${parseInt(day, 10)}, ${year}`
}

export interface DateDisambiguationWarningProps {
  result: DateDisambiguationResult
}

/**
 * Inline warning for an MM/DD-vs-DD/MM ambiguous OCR date — the demo's port of the phone's
 * `src/features/ocr-time-capture/components/DateDisambiguationWarning.tsx` (spec: ui-mapping
 * 06 "Surface: DateDisambiguationWarning"). Same render order (header row · description ·
 * suggestion box · chosen/alternative columns), same copy, same early return on `'high'`
 * confidence — a confident resolution is not something to interrupt the operator over.
 *
 * Styled with the demo's inline glass idiom rather than the phone's `Card`; the accent is the
 * phone's dark-theme warning yellow verbatim.
 */
export function DateDisambiguationWarning({ result }: DateDisambiguationWarningProps) {
  if (result.confidence === 'high') return null

  const warning = generateDisambiguationWarning(result)

  return (
    <div
      role="alert"
      style={{
        borderRadius: 12,
        border: `2px solid ${WARNING}`,
        borderLeftWidth: 4,
        background: 'rgba(255,217,61,0.06)',
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            border: `2px solid ${WARNING}`,
            color: WARNING,
            fontSize: 18,
            fontWeight: 700,
            lineHeight: '24px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          !
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, color: WARNING }}>{warning.title}</span>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.6, color: '#f0f4f8', marginBottom: 12 }}>{warning.description}</div>

      <div style={{ padding: 10, borderRadius: 4, background: 'rgba(13,27,42,0.7)', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontStyle: 'italic', color: '#9fc0db' }}>{warning.suggestion}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#7a9fc4', marginBottom: 3 }}>Chosen Interpretation:</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f4f8' }}>
            {formatDateForDisplay(result.chosenDate)} ({result.chosenFormat})
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#7a9fc4', marginBottom: 3 }}>Alternative:</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#7a9fc4' }}>{formatDateForDisplay(result.alternativeDate)}</div>
        </div>
      </div>
    </div>
  )
}
