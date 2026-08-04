// Preview for BoldText — the renderer for the content model's `**bold**` markers.
// It returns INLINE ReactNode (text + <strong>), so each cell wraps it in a sized
// text block to be visible. Real intro copy from the catalog exercises the parser.
import { BoldText } from 'open-pro-next'
import { getFeatureBySlug } from '@/lib/content/features'

// Default emphasis: heading color / 600 — the intro treatment.
export function DefaultBold() {
  return (
    <p className="max-w-md text-lg leading-relaxed text-body">
      <BoldText text={getFeatureBySlug('time-calibration')!.intro!} />
    </p>
  )
}

// Custom bold color via boldClassName — here the gold tip accent.
export function CustomColor() {
  return (
    <p className="max-w-md text-lg leading-relaxed text-body">
      <BoldText
        text={getFeatureBySlug('cases-locations')!.intro!}
        boldClassName="font-semibold text-gold"
      />
    </p>
  )
}
