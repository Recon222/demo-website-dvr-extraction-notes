import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'

// Controlled seam for motion/react's useReducedMotion (the ExportHub/ImportTerminalProgress
// precedent, R-18): the real hook latches a module-global on first use, so the setup file's
// `matches: false` matchMedia stub pins it and a per-test matchMedia override cannot flip it.
const motionState = vi.hoisted(() => ({ reduce: false as boolean | null }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}))

import { AUTHORIZED_MS, FADE_MS, HOLD_MS, SCAN_MS, type BootVideo } from '@/features/demo/engine/logic/boot'
import { BootSequence } from '@/features/demo/ui/screens/BootSequence'

const VIDEO: BootVideo = { src: '/demo-media/boot-intro.mp4', poster: '/demo-media/boot-intro-poster.jpg' }

const tapScanner = () => fireEvent.click(screen.getByRole('button', { name: 'Run the simulated biometric scan' }))
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
/** Walk several phases. One `act` per dwell — the next phase's timer is armed by an effect, and
 *  effects only flush at the end of an `act`, so a single combined advance stalls one phase in. */
const tickThrough = (...dwells: number[]) => dwells.forEach(tick)

/**
 * P8.1 — the boot sequence (matrix rows 1–2, decision D7). The machine itself is unit-tested in
 * `engine/logic/__tests__/boot.test.ts`; this pins what the visitor actually experiences: the
 * scan runs on a gesture, the video slot works before the owner's file exists, and nobody is
 * trapped in front of it.
 */
describe('BootSequence', () => {
  beforeEach(() => {
    motionState.reduce = false
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('the simulated scan', () => {
    it('waits on the visitor — nothing advances on its own from idle', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={null} onComplete={onComplete} />)
      expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
      tick(10_000)
      expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('runs SCANNING → AUTHORIZED → app on the phone-pinned dwells', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={null} onComplete={onComplete} />)

      tapScanner()
      expect(screen.getByText('SCANNING')).toBeInTheDocument()

      tick(SCAN_MS)
      expect(screen.getByText('AUTHORIZED')).toBeInTheDocument()
      expect(screen.getByText('ACCESS GRANTED')).toBeInTheDocument()
      expect(onComplete).not.toHaveBeenCalled()

      // The visible sequence is over at SCAN_MS + AUTHORIZED_MS — the plan's ~1.2 s. The fade
      // that follows is the exit, not part of it.
      tick(AUTHORIZED_MS)
      expect(onComplete).not.toHaveBeenCalled()

      tick(FADE_MS)
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('fires onComplete exactly once, even when the parent hands it a new identity each render', () => {
      const calls = { n: 0 }
      const { rerender } = render(<BootSequence video={null} onComplete={() => (calls.n += 1)} />)
      tapScanner()
      tickThrough(SCAN_MS, AUTHORIZED_MS, FADE_MS)
      expect(calls.n).toBe(1)
      rerender(<BootSequence video={null} onComplete={() => (calls.n += 1)} />)
      tick(1000)
      expect(calls.n).toBe(1)
    })
  })

  describe('the intro-video slot (owner supplies the file later — D7)', () => {
    it('mounts no video element at all while the source is null', () => {
      render(<BootSequence video={null} onComplete={vi.fn()} />)
      expect(screen.queryByTestId('demo-boot-video')).toBeNull()
    })

    it('preloads during the scan, then plays through the same sequence slot', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={VIDEO} onComplete={onComplete} />)

      // Mounted from the first frame so it buffers behind the HUD (the phone's own trick).
      const video = screen.getByTestId('demo-boot-video') as HTMLVideoElement
      expect(video).toHaveAttribute('preload', 'auto')
      expect(video).toHaveAttribute('poster', '/demo-media/boot-intro-poster.jpg')
      expect(video.style.opacity).toBe('0')
      expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()

      tapScanner()
      tickThrough(SCAN_MS, AUTHORIZED_MS)

      // The video takes the surface; the HUD is gone.
      expect(video.style.opacity).toBe('1')
      expect(screen.queryByText('AUTHORIZED')).toBeNull()
      expect(onComplete).not.toHaveBeenCalled()

      fireEvent.ended(video)
      tick(HOLD_MS)
      expect(onComplete).not.toHaveBeenCalled()
      tick(FADE_MS)
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('ends the sequence on a video error instead of stranding the visitor', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={VIDEO} onComplete={onComplete} />)
      tapScanner()
      tickThrough(SCAN_MS, AUTHORIZED_MS)
      fireEvent.error(screen.getByTestId('demo-boot-video'))
      expect(onComplete).toHaveBeenCalledOnce()
    })
  })

  describe('escape hatches (the phone has none; a browser gate needs them)', () => {
    it('SKIP ends the sequence from the very first frame', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={VIDEO} onComplete={onComplete} />)
      fireEvent.click(screen.getByRole('button', { name: 'SKIP' }))
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('SKIP is reachable mid-scan, so the dwell can never trap a keyboard visitor', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={null} onComplete={onComplete} />)
      tapScanner()
      expect(screen.getByText('SCANNING')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'SKIP' }))
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('Escape does what SKIP does', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={null} onComplete={onComplete} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onComplete).toHaveBeenCalledOnce()
    })
  })

  describe('reduced motion', () => {
    beforeEach(() => {
      motionState.reduce = true
    })

    it('completes instantly on the gesture — no dwell, no fade', () => {
      const onComplete = vi.fn()
      render(<BootSequence video={null} onComplete={onComplete} />)
      expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
      tapScanner()
      expect(onComplete).toHaveBeenCalledOnce()
    })

    it('never plays the intro video', () => {
      const onComplete = vi.fn()
      const play = vi.fn()
      render(<BootSequence video={VIDEO} onComplete={onComplete} />)
      const video = screen.getByTestId('demo-boot-video') as HTMLVideoElement
      video.play = play
      tapScanner()
      expect(onComplete).toHaveBeenCalledOnce()
      expect(play).not.toHaveBeenCalled()
    })

    it('drops the opacity transition rather than animating the exit', () => {
      render(<BootSequence video={null} onComplete={vi.fn()} />)
      expect((screen.getByTestId('demo-boot') as HTMLElement).style.transition).toBe('')
    })
  })
})
