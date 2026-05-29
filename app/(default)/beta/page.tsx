import type { Metadata } from 'next'
import Link from 'next/link'

import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Join the beta — ${siteConfig.name}`,
  description: `Be first to run ${siteConfig.name} in the field. iOS beta via TestFlight.`,
}

// Landing stub: the working email-capture form (wired to the signup service) lands
// in a follow-up PR once the beta logic is integrated. Kept as a real page so the
// "Join the beta" CTA resolves.
export default function BetaPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 md:py-20">
      <h1 className="mb-4 font-nacelle text-4xl font-semibold text-gray-100 md:text-5xl">
        Be first to run it in the field
      </h1>
      <p className="mb-8 text-lg text-indigo-200/65">
        {siteConfig.name} is launching its iOS beta through TestFlight. Leave your email and
        we&apos;ll send your invite the moment the build is approved.
      </p>

      <div className="rounded-2xl bg-gray-800/40 p-8 text-indigo-200/65">
        Email signups open shortly — the form arrives in the next update.
      </div>

      <p className="mt-6 text-sm">
        <Link className="text-indigo-300 transition hover:text-indigo-200" href="/features">
          Explore the features →
        </Link>
      </p>
    </section>
  )
}
