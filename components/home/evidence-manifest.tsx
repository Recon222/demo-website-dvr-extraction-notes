import Link from 'next/link'

import type { Feature, FeatureClass } from '@/lib/content/types'
import { cn } from '@/lib/cn'

// Class-chip palette per the canvas: CORE gold · FIELD blue · TRUST cyan ·
// MARQUEE bright gold with a blinking dot.
const CHIP: Record<FeatureClass, { box: string; dot: string; blink?: true }> = {
  CORE: { box: 'border-gold/35 bg-gold/[0.08] text-[#e7cf6a]', dot: 'bg-gold' },
  FIELD: { box: 'border-blue/35 bg-blue/10 text-[#6fb1d8]', dot: 'bg-blue' },
  TRUST: { box: 'border-cyan/35 bg-cyan/[0.08] text-cyan', dot: 'bg-cyan' },
  MARQUEE: { box: 'border-gold/50 bg-gold/[0.12] text-gold', dot: 'bg-gold', blink: true },
}

const ROW_GRID = 'grid grid-cols-[70px_230px_1fr_120px_46px] items-center gap-4 px-[26px]'

function ClassChip({ classLabel }: { classLabel: FeatureClass }) {
  const chip = CHIP[classLabel]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl border px-[10px] py-1 font-stmono text-[9.5px] tracking-[1px]',
        chip.box,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-[6px] w-[6px] rounded-full',
          chip.dot,
          chip.blink && 'animate-[blinkDot_2.4s_ease-in-out_infinite]',
        )}
      />
      {classLabel}
    </span>
  )
}

/**
 * The evidence manifest: the feature catalog as a Case-File table
 * (NO. / ITEM / WHAT IT KILLS / CLASS), one linked row per feature. Numbering
 * derives from array order. The marquee item gets the gold edge + tinted row;
 * the draft item gets a DRAFT chip + italic muted pain line.
 */
export function EvidenceManifest({ features }: { features: readonly Feature[] }) {
  return (
    <section id="features" className="border-t border-[rgba(30,58,95,0.45)] px-10 pb-[76px] pt-16 lg:px-20">
      <div className="mb-[34px] flex items-baseline justify-between">
        <div>
          <div className="mb-3 font-stmono text-[11px] tracking-[2.4px] text-blue">
            EVIDENCE MANIFEST
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
          <div>CLASS</div>
          <div />
        </div>

        {features.map((feature, index) => {
          const isMarquee = feature.classLabel === 'MARQUEE'
          const isLast = index === features.length - 1
          return (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              data-marquee={isMarquee ? 'true' : undefined}
              className={cn(
                ROW_GRID,
                'py-[17px] transition-colors hover:bg-blue/[0.07]',
                !isLast && 'border-b border-row-divider',
                isMarquee && 'bg-gold/[0.04] shadow-[inset_3px_0_0_#ffd93d]',
              )}
              style={{ contentVisibility: 'auto' }}
            >
              <div className={cn('font-jbmono text-[13px]', isMarquee ? 'text-gold' : 'text-cyan')}>
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="flex items-center gap-2 font-nacelle text-base font-semibold text-heading">
                {feature.title}
                {feature.draft ? (
                  <span className="rounded-lg border border-gold/40 bg-gold/[0.08] px-[7px] py-0.5 font-stmono text-[8.5px] tracking-[1.4px] text-gold">
                    DRAFT
                  </span>
                ) : null}
              </div>
              <div
                className={cn(
                  'text-[13.5px] leading-normal',
                  feature.draft ? 'italic text-muted' : isMarquee ? 'text-[#cdd9e6]' : 'text-body-2',
                )}
              >
                {feature.painLine}
              </div>
              <div>
                <ClassChip classLabel={feature.classLabel} />
              </div>
              <div
                aria-hidden="true"
                className={cn('text-right font-jbmono text-sm', isMarquee ? 'text-gold' : 'text-faint')}
              >
                →
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
