import { describe, it, expect } from 'vitest'
import {
  AUTHORIZED_MS,
  BOOT_SEQUENCE_MS,
  BOOT_VIDEO,
  FADE_MS,
  HOLD_MS,
  SCAN_MS,
  bootHudState,
  bootPhaseDurationMs,
  nextBootPhase,
  type BootPhase,
  type BootVideo,
} from '@/features/demo/engine/logic/boot'

/** A stand-in for the owner's file. One value, so a half-configured video cannot be expressed. */
const FAKE_VIDEO: BootVideo = { src: '/demo-media/boot-intro.mp4', poster: null }

/**
 * Compile guard for the R-1d collapse: the drop-in's step-2-without-step-3 edit — a poster with
 * no source — must not be a `BootVideo`. This is the half of the fix runtime cannot assert; it
 * reds under `tsc` the moment `src` becomes optional again.
 */
type Assert<T extends true> = T
type PosterOnly = { readonly poster: string | null }
type _PosterAloneIsNotAVideo = Assert<PosterOnly extends BootVideo ? false : true>

const ALL_PHASES: readonly BootPhase[] = ['idle', 'scanning', 'authorized', 'video', 'holding', 'fading', 'done']

/** Walk the machine from `idle` to `done`, collecting the phases it visits. */
function walk(cfg: { video: BootVideo | null; reduceMotion: boolean }): BootPhase[] {
  const seen: BootPhase[] = ['idle']
  let cur: BootPhase = 'idle'
  for (let i = 0; i < ALL_PHASES.length + 1; i++) {
    const next = nextBootPhase(cur, cfg)
    if (next === null) return seen
    seen.push(next)
    cur = next
  }
  throw new Error('nextBootPhase did not terminate')
}

describe('boot phase machine', () => {
  describe('nextBootPhase', () => {
    it('runs scan → authorized → fade → done when no video source is configured', () => {
      expect(walk({ video: null, reduceMotion: false })).toEqual([
        'idle',
        'scanning',
        'authorized',
        'fading',
        'done',
      ])
    })

    it('routes through the video phases when a source IS configured — the drop-in slot', () => {
      expect(walk({ video: FAKE_VIDEO, reduceMotion: false })).toEqual([
        'idle',
        'scanning',
        'authorized',
        'video',
        'holding',
        'fading',
        'done',
      ])
    })

    it('collapses to done from ANY phase under prefers-reduced-motion', () => {
      for (const phase of ALL_PHASES) {
        const next = nextBootPhase(phase, { video: FAKE_VIDEO, reduceMotion: true })
        expect(next).toBe(phase === 'done' ? null : 'done')
      }
    })

    it('never advances past done', () => {
      expect(nextBootPhase('done', { video: null, reduceMotion: false })).toBeNull()
      expect(nextBootPhase('done', { video: FAKE_VIDEO, reduceMotion: false })).toBeNull()
    })

    it('returns a successor for every non-terminal phase (no undefined arm)', () => {
      for (const phase of ALL_PHASES.filter((p) => p !== 'done')) {
        expect(nextBootPhase(phase, { video: FAKE_VIDEO, reduceMotion: false })).not.toBeNull()
      }
    })
  })

  describe('bootPhaseDurationMs', () => {
    it('carries the phone-pinned dwells', () => {
      expect(bootPhaseDurationMs('scanning')).toBe(SCAN_MS)
      expect(bootPhaseDurationMs('authorized')).toBe(AUTHORIZED_MS)
      expect(bootPhaseDurationMs('holding')).toBe(HOLD_MS)
      expect(bootPhaseDurationMs('fading')).toBe(FADE_MS)
    })

    it('returns null for the three phases that wait on something other than the clock', () => {
      // idle waits for the visitor's gesture, video for the element's `ended`, done for nothing.
      expect(bootPhaseDurationMs('idle')).toBeNull()
      expect(bootPhaseDurationMs('video')).toBeNull()
      expect(bootPhaseDurationMs('done')).toBeNull()
    })

    it('is total over the phase union', () => {
      for (const phase of ALL_PHASES) expect(bootPhaseDurationMs(phase)).not.toBeUndefined()
    })
  })

  describe('timings', () => {
    it('the visible scan is the plan’s ~1.2 s', () => {
      expect(BOOT_SEQUENCE_MS).toBe(1200)
      expect(SCAN_MS + AUTHORIZED_MS).toBe(BOOT_SEQUENCE_MS)
    })

    it('lifts the phone’s three splash constants verbatim', () => {
      // scanner-hud-constants.ts:91 · AuthenticatedSplashScreen.tsx:33,36
      expect(AUTHORIZED_MS).toBe(800)
      expect(HOLD_MS).toBe(500)
      expect(FADE_MS).toBe(300)
    })
  })

  describe('bootHudState', () => {
    it('maps the two live pre-auth branches', () => {
      expect(bootHudState('idle')).toBe('idle')
      expect(bootHudState('scanning')).toBe('scanning')
    })

    it('holds AUTHORIZED for every phase past the scan', () => {
      for (const phase of ['authorized', 'video', 'holding', 'fading', 'done'] as const) {
        expect(bootHudState(phase)).toBe('authorized')
      }
    })

    it('is total over the phase union', () => {
      for (const phase of ALL_PHASES) expect(bootHudState(phase)).toBeTypeOf('string')
    })
  })

  describe('the intro-video slot', () => {
    it('ships empty — the owner supplies the bunker-doors video later (D7)', () => {
      // Filling in this ONE constant is the entire drop-in (review R-1d collapsed the old
      // src/poster pair, which could be half-flipped without a type error). If this ever fails,
      // the video landed: check that `public/demo-media/` actually holds the file.
      expect(BOOT_VIDEO).toBeNull()
    })

    it('the machine already handles a source without any restructuring', () => {
      expect(nextBootPhase('authorized', { video: null, reduceMotion: false })).toBe('fading')
      expect(nextBootPhase('authorized', { video: FAKE_VIDEO, reduceMotion: false })).toBe('video')
    })
  })
})
