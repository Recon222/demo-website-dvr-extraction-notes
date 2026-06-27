import type { Metadata } from 'next'

import { FeatureGrid } from '@/components/home/feature-grid'
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

      <FeatureGrid features={features} className="mt-12" />
    </section>
  )
}
