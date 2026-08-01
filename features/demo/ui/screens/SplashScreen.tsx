'use client'

import { useId } from 'react'
import type { CSSProperties } from 'react'
import type { BootHudState } from '@/features/demo/engine/logic/boot'

/** The HUD's three branches. Aliased to the engine's union (`bootHudState`) so the phase machine
 *  and this component cannot drift; the name stays for the callers that already use it. */
export type AuthState = BootHudState

export interface SplashScreenProps {
  authState: AuthState
  /** Run the simulated scan. Only meaningful while `authState` is `'idle'`. */
  onScan(): void
  /** `prefers-reduced-motion: reduce` — resolved by `BootSequence` and passed down (the
   *  `AudioRecorderScreen.tsx:84-86` shape: the owner of the sequence resolves it once). Drops
   *  the flicker, the sweep line and the blinking dots; nothing's presence depends on them. */
  reduceMotion?: boolean
}

const bracket = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', width: 38, height: 38, ...pos })
const status: CSSProperties = { fontFamily: "var(--font-stmono),'Share Tech Mono',monospace", fontSize: 23, letterSpacing: 6 }

/**
 * Biometric-lock splash (**simulated**). Lifted from the prototype; wired into boot by P8.1
 * (matrix rows 1–2, decision D7) through `BootSequence`, which is what makes the `scanning` and
 * `authorized` branches live.
 *
 * Two things changed when it stopped being unreachable:
 *
 * 1. **It says what it is.** A standing line under the HUD names the scan as simulated. The
 *    prototype's chrome reads exactly like the phone's real gate (`BIOMETRIC LOCK`, `SCANNING`,
 *    `AUTHORIZED` — `scanner-hud-constants.ts:116-125`), and the demo's honesty rule does not
 *    let a browser tab wear that without a caption.
 * 2. **The tap target is a real button.** The prototype's `<div onClick>` was unreachable by
 *    keyboard and by AT, which for an unskippable boot gate means locked out of the demo. The
 *    phone's own HUD frame is a `Pressable` with an `accessibilityRole` and label
 *    (`BiometricScannerHUD.tsx`, ui-mapping 14 § BiometricScannerHUD) — this is that, and
 *    "tap anywhere" survives because the button is the full-bleed layer.
 *
 * The button stays MOUNTED and `aria-disabled` once the scan starts rather than unmounting, so a
 * keyboard user's focus is not dropped mid-sequence; `aria-describedby` points at the live status
 * region, so "why can't I press this" is answered by the words already on screen rather than by
 * new copy (the `_shared.tsx` `ModalActions` idiom, deferred §84a).
 */
export function SplashScreen({ authState, onScan, reduceMotion = false }: SplashScreenProps) {
  const statusId = useId()
  const idle = authState === 'idle'
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 786,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 30px',
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-stmono),'Share Tech Mono',monospace",
          fontSize: 18,
          letterSpacing: 8,
          color: '#2B8CC1',
          textTransform: 'uppercase',
          marginBottom: 40,
          animation: reduceMotion ? undefined : 'flicker 8s infinite',
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
        {authState === 'scanning' && !reduceMotion && (
          <div style={{ position: 'absolute', left: 16, right: 16, top: 0, height: 2, background: 'linear-gradient(90deg,transparent,#2B8CC1,transparent)', animation: 'hudScan 2s linear infinite', zIndex: 2 }} />
        )}
      </div>

      {/* The status area is a live region so the state change is announced, and carries a floor
          height so the two-line AUTHORIZED state does not shove the frame upward at the moment
          it lands — the phone reserves the same space for the same reason
          (`STATUS_AREA_MIN_HEIGHT`, scanner-hud-constants.ts:171-172), scaled to these type sizes. */}
      <div id={statusId} role="status" aria-live="polite" style={{ minHeight: 68, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {authState === 'idle' && <div style={{ ...status, color: '#2B8CC1' }}>TAP TO SCAN</div>}
        {authState === 'scanning' && (
          <div style={{ ...status, color: '#2B8CC1', display: 'flex', alignItems: 'flex-end' }}>
            SCANNING
            <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite' }}>.</span>
            <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite 0.2s' }}>.</span>
            <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite 0.4s' }}>.</span>
          </div>
        )}
        {authState === 'authorized' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ ...status, color: '#30D158' }}>AUTHORIZED</div>
            <div style={{ fontFamily: "var(--font-stmono),'Share Tech Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'rgba(48,209,88,0.7)', marginTop: 16 }}>
              ACCESS GRANTED
            </div>
          </div>
        )}
      </div>

      {/* The standing disclosure. Same line `SecurityPane` draws: no sensor exists behind a
          browser tab, so nothing here may read as an authentication that happened.

          The alpha is load-bearing, not taste (review R-6). At the 0.55 this shipped with, the
          one string carrying the package's honesty claim was the LEAST readable text on the
          surface — 3.59:1 over `#000314`, a Level-AA failure, while every decorative string
          around it passed (BIOMETRIC LOCK 5.50, AUTHORIZED 10.15, SKIP 8.22). A low-vision
          visitor was shown a convincing biometric gate and could not read the caption saying it
          was fake. 0.70 measures 5.27:1: comfortably over 4.5, still visually subordinate. */}
      <div
        data-testid="boot-disclosure"
        style={{
          marginTop: 30,
          maxWidth: 250,
          textAlign: 'center',
          fontSize: 11,
          lineHeight: 1.5,
          letterSpacing: 0.3,
          color: 'rgba(153,186,221,0.70)',
        }}
      >
        Simulated scan — a browser tab has no biometric sensor. On the phone this is Face ID.
      </div>

      {/* Full-bleed tap target, last in the DOM so it sits over the chrome above. */}
      <button
        type="button"
        aria-label="Run the simulated biometric scan"
        aria-disabled={!idle}
        aria-describedby={statusId}
        onClick={idle ? onScan : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          background: 'transparent',
          font: 'inherit',
          color: 'inherit',
          cursor: idle ? 'pointer' : 'default',
        }}
      />
    </div>
  )
}
