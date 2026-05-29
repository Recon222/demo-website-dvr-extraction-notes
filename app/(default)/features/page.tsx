import type { Metadata } from 'next'
import Link from 'next/link'

import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Features — ${siteConfig.name}`,
  description: 'From request to court-ready report — every step the app takes off your plate.',
}

export default function FeaturesIndexPage() {
  const features = getAllFeatures()

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 md:py-20">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="mb-4 font-nacelle text-4xl font-semibold text-gray-100 md:text-5xl">
          Features
        </h1>
        <p className="text-lg text-indigo-200/65">
          From request to court-ready report — every step the app takes off your plate.
        </p>
      </header>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.slug}>
            <Link
              href={`/features/${feature.slug}`}
              className="block h-full rounded-2xl bg-gray-800/40 p-6 transition hover:bg-gray-800/60"
            >
              <p className="mb-2 text-sm font-medium uppercase tracking-wide text-indigo-300">
                {feature.eyebrow}
              </p>
              <h2 className="mb-2 font-nacelle text-xl font-semibold text-gray-100">
                {feature.title}
              </h2>
              <p className="text-sm text-indigo-200/65">{feature.painLine}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
