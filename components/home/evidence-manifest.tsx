import Link from 'next/link'

import type { Feature } from '@/lib/content/types'
import { cn } from '@/lib/cn'

const ROW_GRID = 'grid grid-cols-[70px_230px_1fr_46px] items-center gap-4 px-[26px]'

/**
 * The evidence manifest: the feature catalog as a Case-File table
 * (NO. / ITEM / WHAT IT KILLS), one linked row per feature. Numbering derives
 * from array order.
 *
 * EVERY ROW IS IDENTICAL. The table used to single out the MARQUEE feature with a
 * gold tint, a gold number, a gold arrow, brighter pain-line text, and a 3px inset
 * gold left edge. All of it is gone (owner decision): once the CLASS column was
 * removed there was nothing left to explain why one row looked different, so the
 * highlight read as decoration rather than meaning.
 *
 * The taxonomy is gone from the data model too: nothing rendered it once the
 * feature-page breadcrumb chip went, so `classLabel` was dropped from `Feature`.
 *
 * The draft item is marked by its italic muted pain line alone; the DRAFT pill that
 * used to float beside the title was removed with the same pass.
 */
export function EvidenceManifest({ features }: { features: readonly Feature[] }) {
  return (
    <section id="features" className="border-t border-[rgba(30,58,95,0.45)] px-10 pb-[76px] pt-16 lg:px-20">
      <div className="mb-[34px] flex items-baseline justify-between">
        <div>
          <div className="mb-3 font-stmono text-[11px] tracking-[2.4px] text-blue">
            FEATURE MANIFEST
          </div>
          <h2 className="font-nacelle text-[38px] font-semibold tracking-[-0.8px] text-heading">
            Every feature kills a pain point
          </h2>
        </div>
        <div className="hidden font-jbmono text-xs text-faint md:block">
          {features.length} ITEMS · TAP ANY ROW
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline bg-panel-800">
        {/* header row */}
        <div
          className={cn(
            ROW_GRID,
            'border-b border-hairline bg-[rgba(10,20,34,0.8)] py-3 font-stmono text-[9.5px] tracking-[2px] text-faint',
          )}
        >
          <div>NO.</div>
          <div>ITEM</div>
          <div>WHAT IT KILLS</div>
          <div />
        </div>

        {features.map((feature, index) => {
          const isLast = index === features.length - 1
          return (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className={cn(
                ROW_GRID,
                'py-[17px] transition-colors hover:bg-blue/[0.07]',
                !isLast && 'border-b border-row-divider',
              )}
              style={{ contentVisibility: 'auto' }}
            >
              <div className="font-jbmono text-[13px] text-cyan">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex items-center gap-2 font-nacelle text-base font-semibold text-heading">
                {feature.title}
              </div>
              <div
                className={cn(
                  'text-[13.5px] leading-normal',
                  feature.draft ? 'italic text-muted' : 'text-body-2',
                )}
              >
                {feature.painLine}
              </div>
              <div aria-hidden="true" className="text-right font-jbmono text-sm text-faint">
                →
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
