import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppDemo } from '@/components/app-demo'

// Control the reduced-motion branch directly.
vi.mock('@/lib/hooks/use-reduced-motion', () => ({
  useReducedMotion: vi.fn(),
}))
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
const mockUseReducedMotion = vi.mocked(useReducedMotion)

beforeEach(() => {
  mockUseReducedMotion.mockReturnValue(false)
})

describe('AppDemo', () => {
  it('renders a labelled placeholder when no media source is provided', () => {
    render(<AppDemo label="Time calibration demo" />)

    expect(screen.getByTestId('app-demo-placeholder')).toBeInTheDocument()
    expect(screen.getByLabelText('Time calibration demo')).toBeInTheDocument()
    expect(screen.queryByTestId('app-demo-video')).not.toBeInTheDocument()
  })

  it('renders an autoplaying, looping, muted video with webm+mp4 sources when motion is allowed', () => {
    render(<AppDemo src="demos/time-calibration/ocr.mp4" poster="demos/time-calibration/ocr.webp" label="OCR demo" />)

    const video = screen.getByTestId('app-demo-video') as HTMLVideoElement
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('aria-label', 'OCR demo')
    expect(video).toHaveAttribute('autoplay')
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
})
