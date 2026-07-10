import type { Variants } from 'motion/react'
import { CHAPTERS, LAUNCHABLE } from '@/features/demo/engine/content/screens'
import type { ChapterId, LaunchableId } from '@/features/demo/engine/types'

/**
 * Motion spec + helpers for the demo's screen cross-slide and drawer push.
 *
 * This module is the single source of truth for the transition values and DOUBLES as the port
 * template for the React Native app (which re-expresses these same transforms/durations/easings in
 * Reanimated). Keep the numbers here authoritative.
 */

export type SlideDirection = 'forward' | 'back' | 'none'

// Includes the tab-only 'map' view: it has no tour position, so it intentionally fades ('none').
type ViewId = ChapterId | LaunchableId | 'map'

/**
 * Direction of a screen change, from position in the tour order:
 * - 'forward' when advancing (slide in from the right), 'back' when retreating (from the left).
 * - 'none' when the view is unchanged OR either side is a launchable (OCR/media) that has no linear
 *   position in the tour — those fade instead of sliding.
 *
 * Params are typed to the view union so a typo'd literal is a compile error; a view that is in the
 * type but in NEITHER registry (e.g. a new screen wired into `view` but forgotten in
 * `WIZARD_SCREENS`/`CHAPTERS`) silently fades, so we dev-warn about it.
 */
export function slideDirection(prev: ViewId, next: ViewId): SlideDirection {
  if (prev === next) return 'none'
  const order = CHAPTERS as readonly string[]
  const a = order.indexOf(prev)
  const b = order.indexOf(next)
  if (process.env.NODE_ENV === 'development') {
    const known = (id: string) => id === 'map' || order.includes(id) || (LAUNCHABLE as readonly string[]).includes(id)
    for (const v of [prev, next]) {
      if (!known(v)) {
        console.warn(
          `[demo] slideDirection: "${v}" is in neither CHAPTERS nor LAUNCHABLE — it will fade ` +
            `instead of slide. Register it in WIZARD_SCREENS/CHAPTERS.`,
        )
      }
    }
  }
  if (a < 0 || b < 0) return 'none'
  return b > a ? 'forward' : 'back'
}

// ---- Reference tokens (mirror these in the RN/Reanimated app) ----
export const DUR = { screen: 0.34, drawer: 0.3 } as const
/** iOS-like decelerate curve. */
export const EASE_STANDARD = [0.32, 0.72, 0, 1] as const
export const DRAWER_W = 300
/** How far the screen host slides left while the drawer is open (px). Tuned visually. */
export const DRAWER_PUSH = -72

export const screenTransition = { duration: DUR.screen, ease: EASE_STANDARD }
export const drawerTransition = { duration: DUR.drawer, ease: EASE_STANDARD }

/**
 * Variants for the screen `motion.div`. The active screen sits at `center`; the incoming screen
 * enters from the side implied by `direction` and the outgoing one exits to the opposite side with
 * a subtle parallax + fade (the native push feel). `direction` is passed via the `custom` prop.
 * Offsets use percentage strings throughout so the values translate 1:1 to the RN port template.
 */
export const screenVariants: Variants = {
  enter: (dir: SlideDirection) => ({
    x: dir === 'forward' ? '100%' : dir === 'back' ? '-28%' : '0%',
    opacity: dir === 'none' ? 0 : 1,
  }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: SlideDirection) => ({
    x: dir === 'forward' ? '-28%' : dir === 'back' ? '100%' : '0%',
    opacity: dir === 'forward' || dir === 'none' ? 0 : 1,
  }),
}
