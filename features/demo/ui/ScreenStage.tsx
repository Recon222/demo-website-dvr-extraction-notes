'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import {
  screenVariants,
  screenTransition,
  drawerTransition,
  DRAWER_PUSH,
  type SlideDirection,
} from '@/features/demo/ui/motion'

const screenStyle = {
  position: 'absolute',
  inset: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  overscrollBehavior: 'contain',
} as const

/**
 * The screen stage: a push layer (shifts the whole stack left while the drawer is open) wrapping an
 * AnimatePresence that cross-slides screens on `view` change. Each screen is absolutely positioned
 * and owns its own scroll, so the incoming and outgoing screens overlay and slide simultaneously
 * (mode="sync"). `direction` drives which side a screen enters/exits from (passed via `custom`).
 * Presentational — no store access. Honors prefers-reduced-motion (instant, no transforms).
 */
export function ScreenStage({
  view,
  direction,
  drawerOpen,
  children,
}: {
  view: string
  direction: SlideDirection
  drawerOpen: boolean
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const slide = reduce
    ? {}
    : {
        variants: screenVariants,
        custom: direction,
        initial: 'enter' as const,
        animate: 'center' as const,
        exit: 'exit' as const,
        transition: screenTransition,
      }
  return (
    <motion.div
      animate={{ x: reduce ? 0 : drawerOpen ? DRAWER_PUSH : 0 }}
      transition={reduce ? { duration: 0 } : drawerTransition}
      style={{ position: 'absolute', inset: 0 }}
    >
      <AnimatePresence mode="sync" initial={false} custom={direction}>
        <motion.div key={view} {...slide} style={screenStyle}>
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
