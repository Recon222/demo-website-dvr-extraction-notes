'use client'

import { useState } from 'react'
import type { CSSProperties, ReactNode, RefObject } from 'react'
import { usePhoneScale } from '@/features/demo/ui/usePhoneScale'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * A88/A89 (U8.2) — the scan line, off the teal and onto the palette.
 *
 * The demo painted `rgba(78,205,196,0.35)` with a `0 0 12px rgba(78,205,196,0.6)` glow. That is
 * the exact colour the phone purged wholesale in P6 (#115). The phone's own `GridBackground`
 * (`GridBackground.tsx:75-119`) spells the line `backgroundColor: withAlpha(colors.primary, 0.3)`
 * with `shadowColor: colors.primary` at `shadowOpacity: 0.8`, so both are DERIVED here the same
 * way rather than typed as the `rgba(43,140,193,0.3)` / `#2B8CC1` the matrix quotes — a
 * phone-side re-tint of `primary` then moves the sweep with everything else it tints. The
 * matrix's `#2B8CC1` for the glow is the shadow COLOUR alone and drops the opacity beside it;
 * see `SCAN_GLOW`.
 *
 * NOT changed: the 7s duration (the phone's is 8000ms). The plan's U8.2 row moves the colour and
 * the glow and says nothing about timing, and `scanSweep` itself is one of the 17 keyframes D9
 * freezes. A duration is a separate row nobody has written.
 */
const SCAN_LINE = withAlpha(colors.primary, 0.3)

/**
 * The glow. `shadowColor: colors.primary` AND `shadowOpacity: 0.8` on the phone
 * (`GridBackground.tsx:86` + `:145-155`); CSS has one colour where RN has a colour and an
 * opacity, so the 0.8 is composed into the colour here.
 *
 * W4 capture round (`_captures/w4/DIFF.md`): this shipped at an implicit 1.0. Not visible — the
 * composite measured DIMMER than the teal it replaced (81.9 -> 64.8), so nothing looked wrong —
 * but wrong by construction, and a value that is only right by accident is the kind a pin exists
 * for. `__tests__/PhoneFrame.test.tsx` reads it back off the rendered style.
 *
 * The 12px BLUR is NOT `shadowRadius: 10` re-expressed. RN's five shadow props do not carry to
 * CSS at a fixed ratio — this repo's own ruling, at `glass-tokens.ts`'s `glassWell` docblock —
 * 12px is the demo's lifted value, and the plan's U8.2 row spells `0 0 12px`. Colour only.
 */
const SCAN_GLOW = withAlpha(colors.primary, 0.8)

const grid: CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: GLASS.gridOverlay,
  pointerEvents: 'none',
  zIndex: 0,
}

export interface PhoneFrameProps {
  children?: ReactNode
  /** Slot rendered above the home indicator (e.g. the bottom TabBar). */
  tabBar?: ReactNode
  /**
   * Handle on the screen slot, so the bridge can move focus INTO the phone when something
   * outside the tab order reveals it — today, the boot gate lifting (review R-2). The slot
   * carries `tabIndex={-1}` for the same reason: programmatically focusable, never tabbable.
   */
  screenRef?: RefObject<HTMLDivElement | null>
}

/** The device shell — lifted verbatim from the prototype (404 frame · 378×786 screen · status
 *  bar · dynamic island · scan sweep · home indicator). Children render in the screen slot;
 *  the screen is always interactive (the guided tour's pointer lock was removed with it). */
export function PhoneFrame({ children, tabBar, screenRef }: PhoneFrameProps) {
  const scale = usePhoneScale()
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  return (
    <PhoneOverlayContext.Provider value={overlay}>
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
            background: colors.background,
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
              background: `linear-gradient(90deg,transparent,${SCAN_LINE},transparent)`,
              boxShadow: `0 0 12px ${SCAN_GLOW}`,
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
          {/* screen content — clip/position context only; each screen (ScreenStage) owns its
              own vertical scroll so screens can overlay and cross-slide during transitions */}
          <div
            data-phone-screen
            ref={screenRef}
            tabIndex={-1}
            style={{
              outline: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              overflow: 'hidden',
              pointerEvents: 'auto',
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
          {/* Overlay root for picker bottom-sheets — pinned to the screen viewport, OUTSIDE
              the scrolling screen content, so sheets anchor to the visible bottom at any scroll. */}
          <div ref={setOverlay} style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none' }} />
        </div>
      </div>
    </div>
    </PhoneOverlayContext.Provider>
  )
}
