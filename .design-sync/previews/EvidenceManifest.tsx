// Preview for EvidenceManifest — the feature catalog as a Case-File table
// (NO. / ITEM / WHAT IT KILLS / CLASS), one linked row per feature. Authored from
// the repo's OWN catalog (getAllFeatures) rather than invented props, so numbering,
// the class-chip palette (CORE gold · FIELD blue · TRUST cyan · MARQUEE gold+dot),
// the marquee gold edge, and any DRAFT chip all reflect real data.
import { EvidenceManifest } from 'open-pro-next'
import { getAllFeatures } from '@/lib/content/features'

export function Canonical() {
  return <EvidenceManifest features={getAllFeatures()} />
}
