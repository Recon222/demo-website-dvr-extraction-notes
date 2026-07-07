import type { Metadata } from 'next'

import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Features — ${siteConfig.name}`,
  description: 'From request to court-ready report — every step the app takes off your plate.',
}

/**
 * The /features index reuses the evidence manifest — it IS the feature list, and
 * the Case-File design has exactly one canonical rendering of it. (The header nav
 * links to /#features; this route stays for direct URLs and the footer.)
 */
export default function FeaturesIndexPage() {
  return (
    <div className="pb-8 pt-4">
      <h1 className="sr-only">Features</h1>
      <EvidenceManifest features={getAllFeatures()} />
    </div>
  )
}
