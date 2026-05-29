import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FeaturePage } from '@/components/feature-page'
import { getAdjacentFeatures, getFeatureBySlug, getFeatureSlugs } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

interface FeatureRouteProps {
  params: Promise<{ slug: string }>
}

// Pre-render every feature page at build time.
export function generateStaticParams() {
  return getFeatureSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: FeatureRouteProps): Promise<Metadata> {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)

  if (!feature) {
    return {}
  }

  return {
    title: `${feature.title} — ${siteConfig.name}`,
    description: feature.painLine,
  }
}

export default async function FeatureRoute({ params }: FeatureRouteProps) {
  const { slug } = await params
  const feature = getFeatureBySlug(slug)

  if (!feature) {
    notFound()
  }

  const { prev, next } = getAdjacentFeatures(slug)

  return <FeaturePage feature={feature} prev={prev} next={next} />
}
