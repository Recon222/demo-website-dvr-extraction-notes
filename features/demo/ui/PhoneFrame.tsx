'use client'

import type { CSSProperties, ReactNode } from 'react'
import { usePhoneScale } from '@/features/demo/ui/usePhoneScale'

const grid: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  pointerEvents: 'none',
  zIndex: 0,
}

export interface PhoneFrameProps {
  children?: ReactNode
  /** Slot rendered above the home indicator (e.g. the bottom TabBar). */
  tabBar?: ReactNode
  /** Guided mode locks the phone — the screen subtree gets pointer-events:none. */
  interactive?: boolean
}

/** The device shell — lifted verbatim from the prototype (404 frame · 378×786 screen · status
 *  bar · dynamic island · scan sweep · home indicator). Children render in the screen slot. */
export function PhoneFrame({ children, tabBar, interactive = true }: PhoneFrameProps) {
  const scale = usePhoneScale()
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flex: '0 0 auto' }}>
      <div
        data-phone="frame"
        style={{
          position: 'relative',
          width: 404,
          padding: 13,
          borderRadius: 58,
          background: 'linear-gradient(150deg,#4a4f57 0%,#23272e 42%,#191c22 58%,#3c4148 100%)',
          boxShadow:
            '0 60px 100px -34px rgba(0,0,0,0.85),0 0 0 1.5px rgba(255,255,255,0.05) inset,0 2px 3px rgba(255,255,255,0.10) inset',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 378,
            height: 786,
            borderRadius: 46,
            overflow: 'hidden',
            background: '#0d1b2a',
            boxShadow: '0 0 0 2px #05080d inset',
          }}
        >
          <div style={grid} />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 2,
              background: 'linear-gradient(90deg,transparent,rgba(78,205,196,0.35),transparent)',
              boxShadow: '0 0 12px rgba(78,205,196,0.6)',
              animation: 'scanSweep 7s linear infinite',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          {/* dynamic island */}
          <div
            style={{
              position: 'absolute',
              top: 11,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 112,
              height: 33,
              background: '#04060a',
              borderRadius: 18,
              zIndex: 30,
            }}
          />
          {/* status bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 30px 0',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#f0f4f8',
                letterSpacing: '0.3px',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              9:41
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="18" height="12" viewBox="0 0 18 12" fill="#f0f4f8">
                <rect x="0" y="8" width="3" height="4" rx="1" />
                <rect x="5" y="5" width="3" height="7" rx="1" />
                <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                <rect x="15" y="0" width="3" height="12" rx="1" />
              </svg>
              <svg width="17" height="12" viewBox="0 0 17 12" fill="#f0f4f8">
                <path d="M8.5 2C5.6 2 2.9 3.1.9 5l1.4 1.4C4 4.9 6.1 4 8.5 4s4.5.9 6.2 2.4L16.1 5C14.1 3.1 11.4 2 8.5 2zm0 4c-1.7 0-3.3.7-4.5 1.8L8.5 12l4.5-4.2C11.8 6.7 10.2 6 8.5 6z" />
              </svg>
              <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
                <rect x="0.5" y="0.5" width="22" height="12" rx="3" stroke="#f0f4f8" strokeOpacity="0.5" />
                <rect x="2" y="2" width="16.5" height="9" rx="1.5" fill="#f0f4f8" />
                <rect x="24" y="4.5" width="2" height="4" rx="1" fill="#f0f4f8" fillOpacity="0.6" />
              </svg>
            </div>
          </div>
          {/* screen content */}
          <div
            data-phone-screen
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              overflowY: 'auto',
              overflowX: 'hidden',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
          >
            {children}
          </div>
          {tabBar}
          {/* home indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: 9,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 134,
              height: 5,
              borderRadius: 3,
              background: 'rgba(240,244,248,0.45)',
              zIndex: 25,
            }}
          />
        </div>
      </div>
    </div>
  )
}
