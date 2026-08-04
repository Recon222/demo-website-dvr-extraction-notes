// Preview for FeatureRowView — one feature-page content row. Three data-driven
// shapes: a media row (bracketed phone + copy, alternating sides via `reversed`),
// and the media-less wide callout card. Authored from the real catalog so the
// kicker/heading/body/chips and the AppDemo phone frame all exercise real content.
import { FeatureRowView } from 'open-pro-next'
import { getFeatureBySlug } from '@/lib/content/features'

const time = getFeatureBySlug('time-calibration')!
const cases = getFeatureBySlug('cases-locations')!

// Media row, phone on the left (default). REC 01 — OCR CAPTURE.
export function MediaRow() {
  return <FeatureRowView row={time.rows[0]} reversed={false} />
}

// Media row, phone flipped to the right — the alternating-side axis.
export function MediaRowReversed() {
  return <FeatureRowView row={time.rows[1]} reversed={true} />
}

// A row with no media renders as the wide horizontal callout card
// (icon tile + kicker/heading/body + chips). cases-locations row 3 is the one.
export function CalloutRow() {
  return <FeatureRowView row={cases.rows[2]} reversed={false} />
}
