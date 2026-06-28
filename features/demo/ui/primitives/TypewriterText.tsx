'use client'

import type { CSSProperties } from 'react'
import { useTypewriter } from '@/features/demo/ui/primitives/useTypewriter'

export interface TypewriterTextProps {
  text: string
  /** When true, type the text in progressively; otherwise render it in full. */
  active?: boolean
  perCharMs?: number
  className?: string
  style?: CSSProperties
}

/** Renders text, optionally typed in progressively. No per-keystroke caret (per the spec). */
export function TypewriterText({
  text,
  active = false,
  perCharMs,
  className,
  style,
}: TypewriterTextProps) {
  const shown = useTypewriter(text, { active, perCharMs })
  return (
    <span className={className} style={style}>
      {shown}
    </span>
  )
}
