'use client'

import type { CSSProperties } from 'react'

export type AuthState = 'idle' | 'scanning' | 'authorized'

export interface SplashScreenProps {
  authState: AuthState
  onScan(): void
}

const bracket = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', width: 38, height: 38, ...pos })
const status: CSSProperties = { fontFamily: "'Share Tech Mono',monospace", fontSize: 23, letterSpacing: 6 }

/** Biometric-lock splash (simulated). Tap anywhere to scan. Lifted from the prototype. */
export function SplashScreen({ authState, onScan }: SplashScreenProps) {
  return (
    <div
      onClick={onScan}
      style={{
        minHeight: 786,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 30px',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontFamily: "'Share Tech Mono',monospace",
          fontSize: 18,
          letterSpacing: 8,
          color: '#2B8CC1',
          textTransform: 'uppercase',
          marginBottom: 40,
          animation: 'flicker 8s infinite',
        }}
      >
        Biometric Lock
      </div>

      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 46 }}>
        <div style={bracket({ top: 0, left: 0, borderTop: '4px solid #2B8CC1', borderLeft: '4px solid #2B8CC1' })} />
        <div style={bracket({ top: 0, right: 0, borderTop: '4px solid #2B8CC1', borderRight: '4px solid #2B8CC1' })} />
        <div style={bracket({ bottom: 0, left: 0, borderBottom: '4px solid #2B8CC1', borderLeft: '4px solid #2B8CC1' })} />
        <div style={bracket({ bottom: 0, right: 0, borderBottom: '4px solid #2B8CC1', borderRight: '4px solid #2B8CC1' })} />
        <div style={{ position: 'absolute', inset: 26, borderRadius: 16, background: 'rgba(43,140,193,0.14)', boxShadow: '0 0 48px 8px rgba(43,140,193,0.30)' }} />
        {authState === 'scanning' && (
          <div style={{ position: 'absolute', left: 16, right: 16, top: 0, height: 2, background: 'linear-gradient(90deg,transparent,#2B8CC1,transparent)', animation: 'hudScan 2s linear infinite', zIndex: 2 }} />
        )}
      </div>

      {authState === 'idle' && <div style={{ ...status, color: '#2B8CC1' }}>TAP TO SCAN</div>}
      {authState === 'scanning' && (
        <div style={{ ...status, color: '#2B8CC1', display: 'flex', alignItems: 'flex-end' }}>
          SCANNING
          <span style={{ animation: 'blinkDot 1.2s infinite' }}>.</span>
          <span style={{ animation: 'blinkDot 1.2s infinite 0.2s' }}>.</span>
          <span style={{ animation: 'blinkDot 1.2s infinite 0.4s' }}>.</span>
        </div>
      )}
      {authState === 'authorized' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...status, color: '#30D158' }}>AUTHORIZED</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'rgba(48,209,88,0.7)', marginTop: 16 }}>
            ACCESS GRANTED
          </div>
        </div>
      )}
    </div>
  )
}
