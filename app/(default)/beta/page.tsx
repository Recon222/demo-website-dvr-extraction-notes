import type { Metadata } from 'next'

import { BetaPageView } from '@/components/beta/beta-page-view'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `Join the beta — ${siteConfig.name}`,
  description: `Be first to run ${siteConfig.name} in the field. iOS beta via TestFlight.`,
}

/** Phase A (email intake) ⇄ Phase B (live TestFlight link) on one env flag. */
export default function BetaPage() {
  return <BetaPageView testflightUrl={siteConfig.testflightUrl} />
}
