'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

export interface DemoNotificationProps {
  message: string
  onDismiss(): void
  durationMs?: number
}

const banner: CSSProperties = {
  position: 'absolute',
  top: 56,
  left: 16,
  right: 16,
  zIndex: 60,
  padding: '12px 16px',
  borderRadius: 12,
  background: 'rgba(20,30,46,0.96)',
  border: '1px solid rgba(75,163,212,0.4)',
  color: '#e7eef6',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'center',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
}

/** A top iOS-style banner that auto-dismisses. setTimeout is fine (the demo already uses it); the
 *  onDismiss is read via a ref so a fresh callback identity never resets the timer. */
export function DemoNotification({ message, onDismiss, durationMs = 2600 }: DemoNotificationProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), durationMs)
    return () => clearTimeout(t)
  }, [durationMs])
  return (
    <div data-testid="demo-notification" style={banner}>
      {message}
    </div>
  )
}
