'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/cn'

/**
 * Minimal serialized shape for one tab. Callers (server layouts) map the feature
 * catalog down to this — never pass whole Feature objects across the RSC boundary.
 */
export interface ManifestTabItem {
  slug: string
  navLabel: string
}

/**
 * The manifest tab strip (replaces FeatureNav): one numbered tab per feature in
 * catalog order — zero-padded numbers derive from array position, so reordering
 * the catalog renumbers the site. The ONLY client island in the marketing chrome:
 * it exists solely for the active-route (gold) state via usePathname.
 */
export function ManifestTabStrip({ items }: { items: readonly ManifestTabItem[] }) {
  const pathname = usePathname()

  return (
    <nav aria-label="Features" className="px-10 pb-[14px] pt-[10px]">
      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const href = `/features/${item.slug}`
          const isActive = pathname === href
          const number = String(index + 1).padStart(2, '0')
          return (
            <li key={item.slug}>
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-[7px] rounded-lg border px-[11px] py-[7px] transition-colors',
                  isActive
                    ? 'border-gold/55 bg-gold/10 shadow-[0_0_14px_-4px_rgba(255,217,61,0.4)]'
                    : 'border-tab bg-[rgba(10,20,34,0.7)] hover:border-blue/55 hover:bg-blue/10',
                )}
              >
                <span className={cn('font-stmono text-[10px]', isActive ? 'text-gold' : 'text-cyan')}>
                  {number}
                </span>{' '}
                <span
                  className={cn(
                    'text-[12px]',
                    isActive ? 'font-semibold text-[#ffe786]' : 'text-tab-label',
                  )}
                >
                  {item.navLabel}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
