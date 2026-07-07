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
    <div className="relative">
      {/* hero top glow (blue radial, per artboard 1a) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[260px] left-1/2 h-[520px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(43,140,193,0.16),transparent_70%)]"
      />
      <Hero />
      <ChainOfWork />
      <EvidenceManifest features={features} />
      <RoadmapTease />
      <BetaCta />
    </div>
  )
}
