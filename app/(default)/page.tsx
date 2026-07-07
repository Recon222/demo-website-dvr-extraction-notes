import type { Metadata } from 'next'
import Link from 'next/link'

import { Hero } from '@/components/home/hero'
import { ChainOfWork } from '@/components/home/chain-of-work'
import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
}

const HEADING =
  'animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl'

const SECTION_BORDER =
  'border-t py-12 [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-400/.25),transparent)1] md:py-20'


export default function Home() {
  const features = getAllFeatures()

  return (
    <>
      <Hero />

      <ChainOfWork />

      <EvidenceManifest features={features} />

      <section>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className={`${SECTION_BORDER} text-center`}>
            <h2 className={`${HEADING} pb-6`}>Be first to run it in the field</h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-indigo-200/65">
              An iOS beta via TestFlight. Leave your email and we&apos;ll send your invite when the
              build is ready.
            </p>
            <Link
              className="btn bg-linear-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] text-white shadow-[inset_0px_1px_0px_0px_--theme(--color-white/.16)] hover:bg-[length:100%_150%]"
              href="/beta"
            >
              Join the beta
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
