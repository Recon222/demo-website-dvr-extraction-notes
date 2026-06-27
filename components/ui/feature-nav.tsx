'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getAllFeatures } from '@/lib/content/features'
import { cn } from '@/lib/cn'

/**
 * Second-row navigation strip: one routed button per feature, in display order,
 * linking straight to its `/features/<slug>` page (distinct from the top-row
 * "Features" anchor, which jumps to the homepage grid). Highlights the active
 * feature via the current path, and scrolls horizontally on narrow screens so all
 * buttons stay reachable. Styling is templated/minimal pending the styling phase.
 */
export function FeatureNav() {
  const pathname = usePathname()
  const features = getAllFeatures()

  return (
    <nav aria-label="Features" className="w-full border-b border-gray-800/60 bg-gray-950/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ul className="flex items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {features.map((feature) => {
            const href = `/features/${feature.slug}`
            const isActive = pathname === href
            return (
              <li key={feature.slug}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-200'
                      : 'text-indigo-200/65 hover:bg-gray-800/50 hover:text-white',
                  )}
                >
                  {feature.navLabel}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
