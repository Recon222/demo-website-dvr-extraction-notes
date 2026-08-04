// Preview for TipCard — the one tip card per feature page. Two variants off the
// same shape: gold (bulb / insight) and cyan (lock / trust). Real tips from the
// catalog so the **bold** markers render in the variant accent color.
import { TipCard } from 'open-pro-next'
import { getFeatureBySlug } from '@/lib/content/features'

// Gold bulb — the marquee feature's insight tip.
export function GoldTip() {
  return <TipCard tip={getFeatureBySlug('time-calibration')!.tip!} />
}

// Cyan lock — a trust tip, proving the variant axis (icon + border + bold color).
export function CyanTip() {
  return <TipCard tip={getFeatureBySlug('evidence-capture')!.tip!} />
}
