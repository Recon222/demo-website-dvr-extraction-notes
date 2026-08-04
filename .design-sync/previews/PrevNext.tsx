// Preview for PrevNext — prev/next manifest navigation. Two solid link cards in
// the middle of the manifest; dashed non-link "edge" cards at the ends (START /
// END OF MANIFEST). Adjacency + index come straight from the catalog helper.
import { PrevNext } from 'open-pro-next'
import { getAdjacentFeatures } from '@/lib/content/features'

const mid = getAdjacentFeatures('time-calibration')!
const first = getAdjacentFeatures('cases-locations')!
const last = getAdjacentFeatures('on-device')!

// Mid-manifest: both cards are real links (prev = Map, next = Media Capture).
export function BothSides() {
  return <PrevNext prev={mid.prev} next={mid.next} index={5} />
}

// First item: no prev — the dashed START OF MANIFEST edge card on the left.
export function FirstItem() {
  return <PrevNext prev={first.prev} next={first.next} index={0} />
}

// Last item: no next — the dashed END OF MANIFEST edge card on the right.
export function LastItem() {
  return <PrevNext prev={last.prev} next={last.next} index={9} />
}
