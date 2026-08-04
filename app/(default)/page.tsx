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
 * The Case-File home page: hero → evidence manifest → chain of work → roadmap
 * tease → beta CTA. All server-rendered; the only client leaves live inside the
 * sections (AppDemo video).
 *
 * ORDER (owner decision): the manifest was moved ABOVE the chain of work so the
 * features are the first thing a visitor meets on scroll. The chain-of-work copy
 * does not yet capture the full process and is being reworked; it sits below
 * until it earns the second slot back. This makes the hero's sub-copy the only
 * bridge into the manifest table — write it to hand off.
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
      <ChainOfWork />
      <RoadmapTease />
      <BetaCta />
    </div>
  )
}
