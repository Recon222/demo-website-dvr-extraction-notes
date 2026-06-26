import Link from 'next/link'
import type { Feature } from '@/lib/content/types'
import { AppDemo } from '@/components/app-demo'
import { cn } from '@/lib/cn'

interface FeaturePageProps {
  feature: Feature
  prev?: Feature
  next?: Feature
}

/**
 * Renders a single feature page from the content model: header (eyebrow/title/pain),
 * alternating media+copy rows, an optional "under the hood" diagram, and prev/next
 * navigation. Presentational only — visual theming is intentionally minimal here and
 * handled in the dedicated styling phase.
 */
export function FeaturePage({ feature, prev, next }: FeaturePageProps) {
  return (
    <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-20">
      <header className="mx-auto max-w-3xl text-center">
        {feature.draft ? (
          <p className="mb-3">
            <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              Draft — copy pending
            </span>
          </p>
        ) : null}
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-indigo-300">
          {feature.eyebrow}
        </p>
        <h1 className="mb-4 font-nacelle text-4xl font-semibold text-gray-100 md:text-5xl">
          {feature.title}
        </h1>
        <p className="text-lg text-indigo-200/65">{feature.painLine}</p>
      </header>

      <div className="mt-12 flex flex-col gap-12 md:mt-20 md:gap-20">
        {feature.rows.map((row, index) => (
          <section
            key={row.heading}
            className={cn(
              'grid items-center gap-8 md:grid-cols-2 md:gap-12',
              index % 2 === 1 && 'md:[&>*:first-child]:order-2',
            )}
          >
            <AppDemo src={row.media} label={row.heading} />
            <div>
              <h2 className="mb-3 font-nacelle text-2xl font-semibold text-gray-100">
                {row.heading}
              </h2>
              <p className="text-indigo-200/65">{row.body}</p>
            </div>
          </section>
        ))}
      </div>

      {feature.diagram ? (
        <section className="mx-auto mt-16 max-w-3xl text-center md:mt-24">
          <h2 className="mb-6 font-nacelle text-2xl font-semibold text-gray-100">Under the hood</h2>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG diagram; next/image unnecessary and deferred */}
            <img
              src={`/${feature.diagram.src}`}
              alt={`${feature.title} data-flow diagram`}
              className="w-full rounded-2xl"
            />
            <figcaption className="mt-4 text-sm text-indigo-200/50">
              {feature.diagram.caption}
            </figcaption>
          </figure>
        </section>
      ) : null}

      <nav
        aria-label="Feature pages"
        className="mt-16 flex items-center justify-between gap-4 border-t border-gray-800 pt-8 text-sm md:mt-24"
      >
        {prev ? (
          <Link href={`/features/${prev.slug}`} className="text-indigo-300 hover:text-indigo-200">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/features/${next.slug}`} className="text-indigo-300 hover:text-indigo-200">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  )
}
