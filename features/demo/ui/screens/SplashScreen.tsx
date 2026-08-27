'use client'

import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { BootHudState } from '@/features/demo/engine/logic/boot'
import {
  SCANNER_COLORS,
  SCANNER_DISCLOSURE_TEXT,
} from '@/features/demo/ui/screens/scanner-hud-colors'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/** The HUD's three branches, aliased to the engine's `BootHudState` so the NAME cannot drift —
 *  that is all an alias buys (review R-9). What closes the branch set is `statusBody` below. The
 *  alias name stays for the callers that already use it. */
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
 *    `AUTHORIZED` — `scanner-hud-constants.ts:154-163`, corrected from `:116-125`, which is
 *    the timing block), and the demo's honesty rule does not let a browser tab wear that
 *    without a caption.
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
  /**
   * The state's trio (A87). `text` paints every string, `primary` every mark, `glow` the
   * halo — see `scanner-hud-colors.ts`. Before U8.1 this file spelled `#2B8CC1` twelve times
   * and `#30D158` once, and nothing on the surface changed colour when the state did.
   */
  const hud = SCANNER_COLORS[authState]
  /**
   * One body per HUD state, as a TOTAL record (review R-9).
   *
   * These were three independent `&&` blocks, so a fourth `BootHudState` rendered an EMPTY live
   * region under an `aria-disabled` dead button: worse than a wrong default, and silent.
   *
   * This record is what stops that, and it is the ONLY thing that stops it — the engine's
   * `HUD_STATE` is keyed by `BootPhase`, so growing `BootHudState` leaves it green. Probed while
   * fixing R-9: adding a member yields exactly one `TS2741`, here.
   */
  const statusBody: Record<AuthState, ReactNode> = {
    idle: <div style={{ ...status, color: hud.text }}>TAP TO SCAN</div>,
    scanning: (
      <div style={{ ...status, color: hud.text, display: 'flex', alignItems: 'flex-end' }}>
        SCANNING
        <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite' }}>.</span>
        <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite 0.2s' }}>.</span>
        <span style={{ animation: reduceMotion ? undefined : 'blinkDot 1.2s infinite 0.4s' }}>.</span>
      </div>
    ),
    authorized: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...status, color: hud.text }}>AUTHORIZED</div>
        {/* A87: was `rgba(48,209,88,0.7)` — the fifth green at 0.7 opacity, 4.27:1 on the new
            ground. The phone's `authorized.text` is `success` at full strength, and it is the
            one state whose text DOES stay saturated: 7.29:1 (`scanner-hud-constants.ts:53`). */}
        <div style={{ fontFamily: "var(--font-stmono),'Share Tech Mono',monospace", fontSize: 14, letterSpacing: 5, color: hud.text, marginTop: 16 }}>
          ACCESS GRANTED
        </div>
      </div>
    ),
  }
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
          color: hud.text,
          textTransform: 'uppercase',
          marginBottom: 40,
          animation: reduceMotion ? undefined : 'flicker 8s infinite',
        }}
      >
        Biometric Lock
      </div>

      {/* The MARKS. Geometry is the demo's own (220px, not the phone's 280px `FRAME_SIZE`);
          the hue follows the state, which is the parity win A87 actually buys — the frame
          turns green with the AUTHORIZED beat instead of staying blue through it, exactly as
          `BiometricScannerHUD.tsx:421-470` paints it. */}
      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 46 }}>
        <div style={bracket({ top: 0, left: 0, borderTop: `4px solid ${hud.primary}`, borderLeft: `4px solid ${hud.primary}` })} />
        <div style={bracket({ top: 0, right: 0, borderTop: `4px solid ${hud.primary}`, borderRight: `4px solid ${hud.primary}` })} />
        <div style={bracket({ bottom: 0, left: 0, borderBottom: `4px solid ${hud.primary}`, borderLeft: `4px solid ${hud.primary}` })} />
        <div style={bracket({ bottom: 0, right: 0, borderBottom: `4px solid ${hud.primary}`, borderRight: `4px solid ${hud.primary}` })} />
        {/* Phone `:461-470`: the glow panel is filled with `glow` and haloed with `primary`.
            The demo's fill was a flat `rgba(43,140,193,0.14)` that took no state; the halo's
            geometry (48px 8px) and its 0.30 are the demo's own. */}
        <div style={{ position: 'absolute', inset: 26, borderRadius: 16, background: hud.glow, boxShadow: `0 0 48px 8px ${withAlpha(hud.primary, 0.3)}` }} />
        {authState === 'scanning' && !reduceMotion && (
          <div style={{ position: 'absolute', left: 16, right: 16, top: 0, height: 2, background: `linear-gradient(90deg,transparent,${hud.primary},transparent)`, animation: 'hudScan 2s linear infinite', zIndex: 2 }} />
        )}
      </div>

      {/* The status area is a live region so the state change is announced, and carries a floor
          height so the two-line AUTHORIZED state does not shove the frame upward at the moment
          it lands — the phone reserves the same space for the same reason
          (`STATUS_AREA_MIN_HEIGHT`, scanner-hud-constants.ts:223, corrected from `:171-172`),
          scaled to these type sizes. */}
      <div id={statusId} role="status" aria-live="polite" style={{ minHeight: 68, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {statusBody[authState]}
      </div>

      {/* The standing disclosure. Same line `SecurityPane` draws: no sensor exists behind a
          browser tab, so nothing here may read as an authentication that happened.

          The alpha is load-bearing, not taste (review R-6), and D8's lighter ground moved it a
          second time. Over the retired `#000314` the arithmetic was 0.55 → 3.59:1 (the
          Level-AA failure this comment was written for), 0.70 → 5.27. Over `SCANNER_GROUND`
          the same scale reads 0.55 → 3.20, 0.65 → 3.92, **0.70 → 4.31, still under the
          floor**, 0.75 → 4.77, 0.80 → 5.19. The value and the reasoning now live on
          `SCANNER_DISCLOSURE_TEXT`, so the pin can measure the ratio rather than guess at the
          alpha — the exact hole v1's lane report left open here. */}
      <div
        data-testid="boot-disclosure"
        style={{
          marginTop: 30,
          maxWidth: 250,
          textAlign: 'center',
          fontSize: 11,
          lineHeight: 1.5,
          letterSpacing: 0.3,
          color: SCANNER_DISCLOSURE_TEXT,
        }}
      >
        Simulated scan. A browser tab has no biometric sensor. On the phone this is Face ID.
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
