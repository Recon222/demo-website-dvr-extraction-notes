'use client'

import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
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

/** Prefix a /public-relative path with a leading slash (leaves absolute/remote URLs alone). */
function toPublicUrl(path: string): string {
  return path.startsWith('/') || path.startsWith('http') ? path : `/${path}`
}

/**
 * A GIF-style looping demo: a silent, autoplaying, looping `<video>` (WebM + MP4)
 * that swaps to a static poster when the user prefers reduced motion, and renders
 * a labelled placeholder until the media asset exists. See
 * docs/planning/05-media-and-content-production.md.
 */
export function AppDemo({ src, poster, label, width, height, className }: AppDemoProps) {
  const reducedMotion = useReducedMotion()
  const posterUrl = poster ? toPublicUrl(poster) : undefined

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
  const webmUrl = mp4Url.replace(/\.mp4$/, '.webm')

  return (
    <video
      data-testid="app-demo-video"
      aria-label={label}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      poster={posterUrl}
      width={width}
      height={height}
      className={cn(FRAME_CLASS, className)}
    >
      <source src={webmUrl} type="video/webm" />
      <source src={mp4Url} type="video/mp4" />
    </video>
  )
}
