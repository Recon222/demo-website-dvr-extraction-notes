import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { BetaCta } from '@/components/home/beta-cta'
import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
}

/**
 * The Case-File home page: hero → evidence manifest → beta CTA. All
 * server-rendered; the only client leaves live inside the sections (AppDemo video).
 *
 * The chain-of-work section was removed outright (owner decision) — its copy never
 * captured the full process. The sealed roadmap moved to its own route,
 * `/roadmap`, where it is being redesigned. The hero's sub-copy is the only bridge
 * into the manifest table — write it to hand off.
 */
export default function Home() {
  const features = getAllFeatures()

  return (
    // The blue top glow that used to live here moved to the (default) layout —
    // it now shines from the top edge over the whole chrome (seamless-background
    // pass), which <main>'s overflow clip forbade from here.
    <div>
      <Hero />
      <EvidenceManifest features={features} />
      <BetaCta />
    </div>
  )
}
