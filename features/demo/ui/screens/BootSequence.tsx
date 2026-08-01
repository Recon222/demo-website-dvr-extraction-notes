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

/**
 * The `video` phase's upper bound when the element has not yet said how long it is. Generous on
 * purpose — it exists to end a stall, never to cut a healthy intro short (review R-1b).
 */
export const VIDEO_CEILING_MS = 20_000
/** Slack allowed past a KNOWN duration before the watchdog calls it stalled. */
export const VIDEO_OVERRUN_MS = 5_000

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
 * `ended` advances. A failure is handled by where it lands (review R-1a): before the video owns
 * the surface it is a decoration that never arrived, so the sequence degrades to the no-video
 * route; once it owns the surface the sequence fades out from there, matching the phone's
 * `startFadeOut()` (`AuthenticatedSplashScreen.tsx:173-201`). Every arm breadcrumbs its cause.
 * See `BOOT_VIDEO` for the drop-in procedure.
 */
export function BootSequence({ video, onComplete }: BootSequenceProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [phase, setPhase] = useState<BootPhase>('idle')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  /**
   * The element reported a failure before it ever owned the surface (review R-1a).
   *
   * `preload="auto"` means a 404, a dropped deploy or a bad codec can fire `error` during `idle`
   * or `scanning` — while the visitor is looking at the scan and the simulation disclosure. The
   * old handler ended the sequence outright, deleting the boot before it began. This flag
   * degrades instead: the machine is fed a null source, so `authorized` routes to `fading`
   * exactly as the already-built, already-tested no-video path does. Nobody loses the boot
   * because a decoration failed to download.
   */
  const [videoFailed, setVideoFailed] = useState(false)
  /** The element's own duration, once `loadedmetadata` reports a finite one — the watchdog's
   *  honest bound. Null until then (and for streams that never report one). */
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null)
  /** What the machine is allowed to believe about the video. */
  const liveVideo = videoFailed ? null : video

  const advance = useCallback(() => {
    setPhase((p) => nextBootPhase(p, { video: liveVideo, reduceMotion }) ?? p)
  }, [liveVideo, reduceMotion])

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

  /**
   * The element's own failure report (review R-1a + R-1c).
   *
   * Phase-scoped, because "the video broke" means two different things. Before it owns the
   * surface, it is a decoration that failed to arrive: mark it failed and let the sequence run
   * the no-video route. Once it owns the surface there is nothing left to degrade to, so fade
   * out from here — which is what the phone does (`startFadeOut()`,
   * `AuthenticatedSplashScreen.tsx:173-201`), rather than the hard cut to `done` this used to do.
   *
   * Both arms breadcrumb. A 404, an undecodable codec and a blocked autoplay are three different
   * operator problems, and the phone this component is ported from logs every one of them
   * (`[AuthSplash] Video load error` / `playback error`) — the port had kept the completion half
   * and dropped the diagnosis, on a path whose failure is *more* likely here (a network fetch,
   * not a bundled `require()`).
   */
  const handleVideoError = useCallback(() => {
    const err = videoRef.current?.error
    console.warn(
      `[demo/boot] the intro video failed (code ${err?.code ?? 'unknown'}): ${err?.message || 'no detail'} —`,
      phase === 'video' || phase === 'holding' ? 'fading out early' : 'continuing without it',
    )
    if (phase === 'video' || phase === 'holding') setPhase('fading')
    else setVideoFailed(true)
  }, [phase])

  // Start playback when the video phase arrives. A rejected `play()` (autoplay policy — iOS Low
  // Power Mode blocks even muted autoplay — or a decode failure) fades out rather than leaving
  // the visitor staring at a frozen frame.
  useEffect(() => {
    if (phase !== 'video') return
    const el = videoRef.current
    if (!el) {
      setPhase('fading')
      return
    }
    el.muted = true // belt and braces: React's `muted` prop does not always reach the property
    const started: unknown = el.play()
    if (started instanceof Promise) {
      started.catch((reason: unknown) => {
        console.warn('[demo/boot] the intro video was not allowed to play — fading out early:', reason)
        setPhase('fading')
      })
    }
  }, [phase])

  /**
   * The stall watchdog (review R-1b).
   *
   * `video` is the only phase with no dwell (`PHASE_MS.video === null`, correctly — it waits on
   * `ended`) AND an exit entirely outside the app's control. A `stalled`/`waiting` fetch, a
   * mid-stream freeze or a paused decode raises no `error`, and a `play()` promise that already
   * resolved has nothing left to reject: probed, the sequence parked in `video` for ten minutes
   * behind an opaque empty rectangle, with no log and no advance. SKIP and Escape mean nobody is
   * trapped, but that is mitigation, not handling.
   *
   * So: a ceiling, armed on entry and torn down by leaving the phase. Derived from the element's
   * own duration once metadata says what it is (the honest bound), and a flat generous ceiling
   * until then — `onStalled` alone would not do, because `stalled` does not fire for every freeze.
   */
  useEffect(() => {
    if (phase !== 'video') return
    const ceiling = videoDurationMs === null ? VIDEO_CEILING_MS : videoDurationMs + VIDEO_OVERRUN_MS
    const watchdog = setTimeout(() => {
      console.warn(
        `[demo/boot] the intro video never finished within ${ceiling} ms — fading out early. ` +
          'A stalled fetch or a frozen decode raises no error event, so this ceiling is the only exit.',
      )
      setPhase('fading')
    }, ceiling)
    return () => clearTimeout(watchdog)
  }, [phase, videoDurationMs])

  // The video takes over the moment its phase begins and keeps the surface until unmount; with
  // no video (configured, or left after a preload failure) the HUD holds it instead. Neither
  // swaps out early — a gap would paint one frame of bare background between the fade and the
  // parent's unmount.
  const showVideo = liveVideo !== null && phase !== 'idle' && phase !== 'scanning' && phase !== 'authorized'
  const showHud = !showVideo

  /**
   * The mid-sequence focus hand-off (review R-2).
   *
   * `authorized → video` unmounts `SplashScreen` while its scan button may hold focus, dropping
   * the keyboard visitor to `<body>` halfway through the app's first interaction. SKIP is the one
   * control that outlives every phase, so it takes the hand-off — but only if the visitor was
   * actually in here: `hadFocus` tracks the boot subtree, so a mouse visitor is never yanked and
   * neither is someone who has tabbed out to the rail.
   */
  const skipRef = useRef<HTMLButtonElement | null>(null)
  const hadFocusRef = useRef(false)
  useEffect(() => {
    if (showHud || !hadFocusRef.current) return
    skipRef.current?.focus()
  }, [showHud])

  return (
    <div
      data-testid="demo-boot"
      onFocus={() => {
        hadFocusRef.current = true
      }}
      onBlur={(e) => {
        // Still ours only if focus stayed inside the gate.
        hadFocusRef.current = e.currentTarget.contains(e.relatedTarget)
      }}
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
      {liveVideo !== null && (
        <video
          ref={videoRef}
          data-testid="demo-boot-video"
          src={liveVideo.src}
          poster={liveVideo.poster ?? undefined}
          muted
          playsInline
          preload="auto"
          onEnded={advance}
          onError={handleVideoError}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            setVideoDurationMs(Number.isFinite(d) && d > 0 ? d * 1000 : null)
          }}
          style={{ ...videoStyle, opacity: showVideo ? 1 : 0 }}
        />
      )}

      {showHud && <SplashScreen authState={bootHudState(phase)} onScan={advance} reduceMotion={reduceMotion} />}

      <button ref={skipRef} type="button" onClick={skip} style={skipButton}>
        SKIP
      </button>
    </div>
  )
}
