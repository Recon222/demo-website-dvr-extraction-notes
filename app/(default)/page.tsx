import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { ChainOfWork } from '@/components/home/chain-of-work'
import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { RoadmapTease } from '@/components/home/roadmap-tease'
import { BetaCta } from '@/components/home/beta-cta'
import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
}

/**
 * The Case-File home page, in design order: hero → chain of work → evidence
 * manifest → roadmap tease → beta CTA. All server-rendered; the only client
 * leaves live inside the sections (AppDemo video, chrome tab strip).
 */
export default function Home() {
  const features = getAllFeatures()

  return (
    // The blue top glow that used to live here moved to the (default) layout —
    // it now shines from the tab strip's top edge over the whole chrome
    // (seamless-background pass), which <main>'s overflow clip forbade from here.
    <div>
      <Hero />
      <ChainOfWork />
      <EvidenceManifest features={features} />
      <RoadmapTease />
      <BetaCta />
    </div>
  )
}
