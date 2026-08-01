'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import {
  FADE_MS,
  bootHudState,
  bootPhaseDurationMs,
  nextBootPhase,
  type BootPhase,
  type BootVideo,
} from '@/features/demo/engine/logic/boot'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'

export interface BootSequenceProps {
  /** `BOOT_VIDEO` from the engine — null until the owner's intro video is dropped in. ONE value,
   *  not a correlated src/poster pair (review R-1d). Passed as a prop rather than read here so
   *  tests can drive the video phases. */
  video: BootVideo | null
  /** Fired exactly once, when the sequence reaches `done` (skip included). */
  onComplete(): void
}

const MONO = "var(--font-stmono),'Share Tech Mono',monospace"

const skipButton: CSSProperties = {
  position: 'absolute',
  // Clear of the status bar (50px) and the dynamic island, both drawn by PhoneFrame above this.
  top: 60,
  right: 16,
  zIndex: 2,
  padding: '6px 13px',
  borderRadius: 999,
  border: '1px solid rgba(43,140,193,0.45)',
  background: 'rgba(4,8,14,0.55)',
  color: 'rgba(153,186,221,0.9)',
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: 3,
  cursor: 'pointer',
}

const videoStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  pointerEvents: 'none',
}

/**
 * The app's opening sequence (P8.1 · matrix rows 1–2 · owner decision D7) — the demo's answer to
 * the phone's `AuthenticatedSplashScreen`.
 *
 * It owns the timers; `engine/logic/boot.ts` owns the machine. Rendered two ways, both by the
 * bridge: as the boot gate (`DemoExperience`'s `booting` state, the phone's `showSplash` in
 * `app/_layout.tsx:137`) and as the `splash` view's screen, so there is exactly one
 * implementation of the sequence.
 *
 * **Escape hatches, deliberately more than the phone has.** The phone's splash cannot be
 * skipped, but its dwell is an OS biometric prompt the user is actively answering; this one is a
 * 1.2 s decoration in front of the content, and later an intro video of unknown length. A
 * sequence with no exit would trap a keyboard or AT visitor for its full duration, so there is a
 * focusable SKIP control in every phase and Escape does the same thing. Deviation recorded in
 * `docs/code-reviews/deferred.md` §87.
 *
 * **Reduced motion** collapses the whole thing: the machine goes straight to `done` on the
 * visitor's gesture, no dwell, no fade and no video. That is the house instant-complete idiom
 * (`ScreenStage.tsx:39-49`) applied to a surface whose entire content is motion.
 *
 * **The video slot.** The `<video>` is mounted as soon as a source exists — not when its phase
 * arrives — so it buffers during the scan, which is the phone's own trick ("always mounted to
 * preload during auth, plays when phase transitions", `AuthenticatedSplashScreen.tsx:249-269`).
 * `ended` advances; a load/playback/autoplay error ends the sequence instead of stranding the
 * visitor on a black rectangle, matching the phone's skip-to-completion error path
 * (`AuthenticatedSplashScreen.tsx:173-201`). See `BOOT_VIDEO_SRC` for the drop-in procedure.
 */
export function BootSequence({ video, onComplete }: BootSequenceProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [phase, setPhase] = useState<BootPhase>('idle')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const advance = useCallback(() => {
    setPhase((p) => nextBootPhase(p, { video, reduceMotion }) ?? p)
  }, [video, reduceMotion])

  const skip = useCallback(() => setPhase('done'), [])

  // Timed phases. `null` means this phase waits on something else — the visitor's tap, the
  // video's `ended` — so no timer is armed and nothing advances on its own.
  useEffect(() => {
    const ms = bootPhaseDurationMs(phase)
    if (ms === null) return
    const timer = setTimeout(advance, ms)
    return () => clearTimeout(timer)
  }, [phase, advance])

  // Completion fires once, even if the parent hands us a fresh `onComplete` identity every render.
  const completedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'done' || completedRef.current) return
    completedRef.current = true
    onComplete()
  }, [phase, onComplete])

  // Escape is the keyboard twin of SKIP (the `ModalShell` idiom, `_shared.tsx:103`).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  // Start playback when the video phase arrives. A rejected `play()` (autoplay policy, decode
  // failure) ends the sequence rather than leaving the visitor staring at a stalled frame.
  useEffect(() => {
    if (phase !== 'video') return
    const el = videoRef.current
    if (!el) {
      setPhase('done')
      return
    }
    el.muted = true // belt and braces: React's `muted` prop does not always reach the property
    const started: unknown = el.play()
    if (started instanceof Promise) started.catch(() => setPhase('done'))
  }, [phase])

  const hasVideo = video !== null
  // The video takes over the moment its phase begins and keeps the surface until unmount; with
  // no video the HUD holds it instead. Neither swaps out early — a gap would paint one frame of
  // bare background between the fade and the parent's unmount.
  const showVideo = hasVideo && phase !== 'idle' && phase !== 'scanning' && phase !== 'authorized'
  const showHud = !showVideo

  return (
    <div
      data-testid="demo-boot"
      style={{
        position: 'absolute',
        inset: 0,
        // The phone's splash background (`AuthenticatedSplashScreen.tsx:288`).
        background: '#000314',
        // `done` stays hidden too: it renders for one frame before the parent unmounts us, and
        // at opacity 1 that frame is a black flash on top of the app.
        opacity: phase === 'fading' || phase === 'done' ? 0 : 1,
        transition: reduceMotion ? undefined : `opacity ${FADE_MS}ms linear`,
      }}
    >
      {video !== null && (
        <video
          ref={videoRef}
          data-testid="demo-boot-video"
          src={video.src}
          poster={video.poster ?? undefined}
          muted
          playsInline
          preload="auto"
          onEnded={advance}
          onError={skip}
          style={{ ...videoStyle, opacity: showVideo ? 1 : 0 }}
        />
      )}

      {showHud && <SplashScreen authState={bootHudState(phase)} onScan={advance} reduceMotion={reduceMotion} />}

      <button type="button" onClick={skip} style={skipButton}>
        SKIP
      </button>
    </div>
  )
}
