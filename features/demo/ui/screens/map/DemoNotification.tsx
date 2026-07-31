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

/**
 * A top iOS-style banner that auto-dismisses. `setTimeout` is fine (the demo already uses it);
 * `onDismiss` is read via a ref so a fresh callback identity never resets the timer.
 *
 * `message` IS in the effect deps (review R-8). It was not, and the bridge renders this
 * element positionally, so a second notice within the 2.6 s window re-used the same instance:
 * the text swapped and the timer did not restart. P3 took this component from one producer to
 * eight, and for the export and failure arms the banner is the ENTIRE outcome (§52.2's honest
 * answer in place of a fake download) — raised at t≈2.4 s after a previous notice it lived
 * ~200 ms, which is the dead-button impression the honest-notice treatment exists to prevent.
 *
 * `role="status"` (review R-9): for Export ZIP / Export GeoJSON, the location-not-found arm and
 * the two failure arms, this banner is the only feedback there is. Without a live region a
 * screen-reader visitor got a closed dialog and silence — §52.2's truth told to sighted
 * visitors only. Announcement-on-insert is the right mode for a conditionally rendered,
 * short-lived banner, and it composes with the deps fix: a message change now also restarts the
 * timer, and `role="status"` re-announces on content change.
 */
export function DemoNotification({ message, onDismiss, durationMs = 2600 }: DemoNotificationProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss
  useEffect(() => {
    const t = setTimeout(() => onDismissRef.current(), durationMs)
    return () => clearTimeout(t)
  }, [durationMs, message])
  return (
    <div data-testid="demo-notification" role="status" style={banner}>
      {message}
    </div>
  )
}
