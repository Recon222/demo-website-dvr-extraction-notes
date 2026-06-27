import type { Metadata } from 'next'
import Link from 'next/link'

import PageIllustration from '@/components/page-illustration'
import HeroHome from '@/components/hero-home'
import { FeatureGrid } from '@/components/home/feature-grid'
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

const STEPS = [
  {
    title: 'Import the request',
    body: 'Drop in a PDF or email request — on-device AI pre-fills the case before you type a word.',
  },
  {
    title: 'Calibrate & capture',
    body: 'Lock the DVR clock to an atomic time source, then capture photos, video, and audio by location.',
  },
  {
    title: 'Hand off',
    body: 'Walk away with auto-written notes, a finished PDF report, and an encrypted case package.',
  },
]

export default function Home() {
  const features = getAllFeatures()

  return (
    <>
      <PageIllustration />
      <HeroHome />

      <section id="how-it-works">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className={SECTION_BORDER}>
            <div className="mx-auto max-w-3xl pb-12 text-center">
              <h2 className={HEADING}>From request to court-ready report</h2>
              <p className="text-lg text-indigo-200/65">
                The whole job, in order — with the busywork removed at every step.
              </p>
            </div>
            <ol className="mx-auto grid max-w-sm gap-6 sm:max-w-none md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-gray-800/40 p-6">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300">
                    {index + 1}
                  </span>
                  <h3 className="mb-2 font-nacelle text-xl font-semibold text-gray-100">
                    {step.title}
                  </h3>
                  <p className="text-indigo-200/65">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="features">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className={SECTION_BORDER}>
            <div className="mx-auto max-w-3xl pb-12 text-center">
              <h2 className={HEADING}>Everything the job needs</h2>
              <p className="text-lg text-indigo-200/65">
                Built from 1,500+ extractions — each feature kills a pain point.
              </p>
            </div>
            <FeatureGrid features={features} />
          </div>
        </div>
      </section>

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
