import { useEffect, useState } from 'react'

/** The 404×812 device's layout height — 786 screen + 13 bezel top and bottom. */
export const PHONE_FRAME_H = 812

/**
 * The sticky phone column's vertical padding, summed (28 top + 28 bottom, `DemoExperience`).
 *
 * The scale MUST reserve it. It used to reserve 28 — half the real figure — so on a viewport
 * shorter than the frame the sticky box came out taller than the viewport and the frame could
 * not stay fully in view at the bottom of the page (DP-8, measured: 80% visible at 700px).
 * Pinned against the padding literal by test so the two cannot drift.
 */
export const PHONE_COLUMN_PADDING_Y = 56

/**
 * Port of the prototype's `applyScale`: fit the 404×812 device into the available viewport
 * height (minus a margin), capped at 1:1. Returns the scale; `PhoneFrame` applies the
 * transform with `transform-origin: top center` AND compensates the layout height, since a
 * transform shrinks only the paint (DP-8).
 */
export function usePhoneScale(frameHeight = PHONE_FRAME_H, margin = PHONE_COLUMN_PADDING_Y): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const compute = () => {
      const avail = window.innerHeight - margin
      setScale(Math.min(1, avail / frameHeight))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [frameHeight, margin])

  return scale
}
