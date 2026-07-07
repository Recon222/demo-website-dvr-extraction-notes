import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { AppDemo } from '@/components/app-demo'

// Control the reduced-motion branch directly.
vi.mock('@/lib/hooks/use-reduced-motion', () => ({
  useReducedMotion: vi.fn(),
}))
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
const mockUseReducedMotion = vi.mocked(useReducedMotion)

// Viewport-driven playback: capture the IntersectionObserver callback so tests
// can scroll the video "into" and "out of" view.
let ioCallback: IntersectionObserverCallback | null = null
const observe = vi.fn()
const disconnect = vi.fn()

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    ioCallback = callback
  }
  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
}

function intersect(isIntersecting: boolean) {
  act(() => {
    ioCallback?.([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver)
  })
}

const play = vi
  .spyOn(HTMLMediaElement.prototype, 'play')
  .mockImplementation(() => Promise.resolve())
const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false)
  ioCallback = null
  observe.mockClear()
  disconnect.mockClear()
  play.mockClear()
  pause.mockClear()
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppDemo', () => {
  it('renders a labelled placeholder when no media source is provided', () => {
    render(<AppDemo label="Time calibration demo" />)

    expect(screen.getByTestId('app-demo-placeholder')).toBeInTheDocument()
    expect(screen.getByLabelText('Time calibration demo')).toBeInTheDocument()
    expect(screen.queryByTestId('app-demo-video')).not.toBeInTheDocument()
  })

  it('renders a looping, muted, metadata-preloading video with webm+mp4 sources (no autoplay attr — playback is viewport-driven)', () => {
    render(<AppDemo src="demos/time-calibration/ocr.mp4" poster="demos/time-calibration/ocr.webp" label="OCR demo" />)

    const video = screen.getByTestId('app-demo-video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('aria-label', 'OCR demo')
    // Playback is driven by the IntersectionObserver, not the autoplay attribute —
    // an autoplay attr would fetch full video bytes for below-the-fold phones.
    expect(video).not.toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video.muted).toBe(true)
    expect(video).toHaveAttribute('poster', '/demos/time-calibration/ocr.webp')

    const sources = video.querySelectorAll('source')
    expect(sources).toHaveLength(2)
    expect(sources[0]).toHaveAttribute('type', 'video/webm')
    expect(sources[0]).toHaveAttribute('src', '/demos/time-calibration/ocr.webm')
    expect(sources[1]).toHaveAttribute('type', 'video/mp4')
    expect(sources[1]).toHaveAttribute('src', '/demos/time-calibration/ocr.mp4')
  })

  it('emits a single source (no fabricated WebM twin) when the src is not an .mp4', () => {
    // WebM is derived by swapping the .mp4 extension. A non-.mp4 src must not
    // produce a bogus video/webm <source> pointing at the same file.
    render(<AppDemo src="demos/clip.mov" label="Non-mp4 demo" />)

    const video = screen.getByTestId('app-demo-video') as HTMLVideoElement
    const sources = video.querySelectorAll('source')
    expect(sources).toHaveLength(1)
    expect(sources[0]).toHaveAttribute('type', 'video/mp4')
    expect(sources[0]).toHaveAttribute('src', '/demos/clip.mov')
  })

  it('renders the poster image (not a video) when the user prefers reduced motion', () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<AppDemo src="demos/x.mp4" poster="demos/x.webp" label="Reduced demo" />)

    const poster = screen.getByTestId('app-demo-poster')
    expect(poster.tagName).toBe('IMG')
    expect(poster).toHaveAttribute('src', '/demos/x.webp')
    expect(poster).toHaveAttribute('alt', 'Reduced demo')
    expect(screen.queryByTestId('app-demo-video')).not.toBeInTheDocument()
  })

  it('falls back to the placeholder under reduced motion when there is no poster', () => {
    mockUseReducedMotion.mockReturnValue(true)
    render(<AppDemo src="demos/x.mp4" label="No poster" />)

    expect(screen.getByTestId('app-demo-placeholder')).toBeInTheDocument()
    expect(screen.queryByTestId('app-demo-video')).not.toBeInTheDocument()
    expect(screen.queryByTestId('app-demo-poster')).not.toBeInTheDocument()
  })

  describe('viewport-driven playback', () => {
    it('observes the video and plays only when it scrolls into view', () => {
      render(<AppDemo src="demos/x.mp4" label="Loop" />)
      expect(observe).toHaveBeenCalledTimes(1)
      expect(play).not.toHaveBeenCalled()

      intersect(true)
      expect(play).toHaveBeenCalledTimes(1)
    })

    it('pauses when the video scrolls out of view (battery/CPU: no off-screen decoding)', () => {
      render(<AppDemo src="demos/x.mp4" label="Loop" />)
      intersect(true)
      intersect(false)
      expect(pause).toHaveBeenCalledTimes(1)
    })

    it('disconnects the observer on unmount', () => {
      const { unmount } = render(<AppDemo src="demos/x.mp4" label="Loop" />)
      unmount()
      expect(disconnect).toHaveBeenCalled()
    })

    it('plays immediately when IntersectionObserver is unavailable (old WebViews)', () => {
      vi.stubGlobal('IntersectionObserver', undefined)
      render(<AppDemo src="demos/x.mp4" label="Loop" />)
      expect(play).toHaveBeenCalledTimes(1)
    })

    it('never constructs an observer for the reduced-motion poster or the placeholder', () => {
      mockUseReducedMotion.mockReturnValue(true)
      render(<AppDemo src="demos/x.mp4" poster="demos/x.webp" label="Reduced" />)
      expect(observe).not.toHaveBeenCalled()
      expect(play).not.toHaveBeenCalled()
    })
  })
})
