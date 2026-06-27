'use client'

import type { CSSProperties } from 'react'

export interface Pulse {
  id: string
  x: number
  y: number
}

const ripple: CSSProperties = {
  position: 'absolute',
  width: 90,
  height: 90,
  borderRadius: '50%',
  background: 'radial-gradient(circle,rgba(43,140,193,0.45),rgba(43,140,193,0) 70%)',
  transform: 'translate(-50%,-50%)',
  animation: 'demoPulse 0.6s ease-out forwards',
}

/**
 * Overlay that renders a cyan ripple at each active pulse target. Driven by the director's
 * tap pulses (passed as a `pulses` prop). Pointer-events are off so it never blocks taps.
 */
export function TouchIndicator({ pulses }: { pulses: Pulse[] }) {
  if (!pulses.length) return null
  return (
    <div
      data-touch-layer
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35 }}
    >
      {pulses.map((p) => (
        <span key={p.id} data-pulse style={{ ...ripple, left: p.x, top: p.y }} />
      ))}
    </div>
  )
}
