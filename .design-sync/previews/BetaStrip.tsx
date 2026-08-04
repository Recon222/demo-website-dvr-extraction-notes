// Preview for BetaStrip — the gold per-page beta strip: the feature's closing
// line + the fixed "Join the TestFlight beta" CTA. Real betaStripLines from the
// catalog; the line varies, the CTA is constant.
import { BetaStrip } from 'open-pro-next'
import { getFeatureBySlug } from '@/lib/content/features'

// The marquee feature's closing line.
export function MarqueeLine() {
  return <BetaStrip line={getFeatureBySlug('time-calibration')!.betaStripLine!} />
}

// A different line — proves the copy slot is data-driven, CTA unchanged.
export function ImportLine() {
  return <BetaStrip line={getFeatureBySlug('import')!.betaStripLine!} />
}
