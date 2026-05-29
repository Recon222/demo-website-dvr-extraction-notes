import Link from 'next/link'

import type { Feature } from '@/lib/content/types'
import { cn } from '@/lib/cn'

interface FeatureGridProps {
  features: readonly Feature[]
  className?: string
}

/**
 * Grid of feature cards linking to each `/features/<slug>` detail page. Pure and
 * data-driven — the caller passes the features (homepage and the /features index
 * both reuse this). Styling is templated/minimal pending the final styling phase.
 */
export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <ul className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {features.map((feature) => (
        <li key={feature.slug}>
          <Link
            href={`/features/${feature.slug}`}
            className="block h-full rounded-2xl bg-gray-800/40 p-6 transition hover:bg-gray-800/60"
          >
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-indigo-300">
              {feature.eyebrow}
            </p>
            <h3 className="mb-2 font-nacelle text-xl font-semibold text-gray-100">{feature.title}</h3>
            <p className="text-sm text-indigo-200/65">{feature.painLine}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
