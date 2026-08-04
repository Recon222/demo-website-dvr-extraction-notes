import { ManifestTabStrip } from '@/components/ui/manifest-tab-strip'
import { getAllFeatures } from '@/lib/content/features'

// Minimal serialized props for the one client island in the chrome — never the
// whole Feature objects (RSC boundary serializes everything it's handed).
const tabItems = getAllFeatures().map(({ slug, navLabel }) => ({ slug, navLabel }))

/**
 * Feature-section layout — owns the manifest tab strip.
 *
 * The strip used to sit in the (default) group layout, i.e. on EVERY marketing page.
 * It was moved down here (owner decision) because it is *feature* navigation: on the
 * home page it duplicated the evidence manifest table rendered directly below it, and
 * its two wrapped rows cost ~96px of vertical space above the fold — enough to push
 * the hero phone off screen. Privacy and beta never needed it either.
 *
 * A server component; the strip itself is the client island (active-route highlight).
 */
export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ManifestTabStrip items={tabItems} />
      {children}
    </>
  )
}
