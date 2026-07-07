'use client'

import { useEffect, useRef } from 'react'

import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { toPublicUrl } from '@/lib/to-public-url'
import { cn } from '@/lib/cn'

interface AppDemoProps {
  /** Path to the MP4 under /public (e.g. `demos/time-calibration/ocr.mp4`). The WebM
   *  source is derived by swapping the extension. Omit until the asset exists. */
  src?: string
  /** Path to a poster image under /public (shown before play and under reduced motion). */
  poster?: string
  /** Accessible label describing the demo. Required. */
  label: string
  width?: number
  height?: number
  className?: string
}

const FRAME_CLASS = 'w-full overflow-hidden rounded-2xl'
const PLACEHOLDER_CLASS =
  'flex aspect-video w-full items-center justify-center rounded-2xl bg-gray-800/40 text-sm text-indigo-200/50'

/**
 * A GIF-style looping demo: a silent, looping `<video>` (WebM + MP4) that swaps to
 * a static poster when the user prefers reduced motion, and renders a labelled
 * placeholder until the media asset exists. See
 * docs/planning/05-media-and-content-production.md.
 *
 * Playback is VIEWPORT-DRIVEN, not autoplay: the element mounts with the page
 * (server markup, no layout shift) at `preload="metadata"` (~30 KB with our
 * faststart files), then an IntersectionObserver starts it when ~25% visible and
 * pauses it off-screen — with 2–3 loops per page, off-screen decoding is pure
 * battery burn. Muted + playsInline keeps programmatic .play() inside every
 * browser's autoplay policy.
 */
export function AppDemo({ src, poster, label, width, height, className }: AppDemoProps) {
  const reducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const posterUrl = poster ? toPublicUrl(poster) : undefined

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return // placeholder / reduced-motion poster branch — nothing to drive
    }
    if (typeof IntersectionObserver !== 'function') {
      // Old WebViews: degrade to immediate playback rather than a frozen frame.
      video.play().catch(() => {})
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {}) // rejected play (policy edge) → poster stays
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [src, reducedMotion])

  const placeholder = (
    <div role="img" aria-label={label} data-testid="app-demo-placeholder" className={cn(PLACEHOLDER_CLASS, className)}>
      Demo coming soon
    </div>
  )

  if (!src) {
    return placeholder
  }

  if (reducedMotion) {
    if (!posterUrl) {
      return placeholder
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static poster; next/image deferred to the media/styling phase
      <img
        data-testid="app-demo-poster"
        src={posterUrl}
        alt={label}
        width={width}
        height={height}
        className={cn(FRAME_CLASS, className)}
      />
    )
  }

  const mp4Url = toPublicUrl(src)
  // WebM is the same path with a .webm extension. Only offer it for genuine
  // .mp4 sources, so a non-.mp4 src can't fabricate a duplicate <source>
  // pointing at the same file.
  const webmUrl = mp4Url.endsWith('.mp4') ? mp4Url.replace(/\.mp4$/, '.webm') : undefined

  return (
    <video
      ref={videoRef}
      data-testid="app-demo-video"
      aria-label={label}
      loop
      muted
      playsInline
      preload="metadata"
      poster={posterUrl}
      width={width}
      height={height}
      className={cn(FRAME_CLASS, className)}
    >
      {webmUrl ? <source src={webmUrl} type="video/webm" /> : null}
      <source src={mp4Url} type="video/mp4" />
    </video>
  )
}
