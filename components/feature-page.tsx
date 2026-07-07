import Link from 'next/link'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { Feature, FeatureClass, FeatureRow } from '@/lib/content/types'
import { featureHeadline } from '@/lib/content/features'
import { toPublicUrl } from '@/lib/to-public-url'
import { cn } from '@/lib/cn'
import { BoldText } from '@/components/feature/bold-text'
import { TipCard } from '@/components/feature/tip-card'
import { FeatureRowView } from '@/components/feature/feature-row'
import { PrevNext } from '@/components/feature/prev-next'
import { BetaStrip } from '@/components/feature/beta-strip'

const PAD = 'px-10 lg:px-20'

const HATCH =
  'rounded-[10px] border border-dashed border-[rgba(93,122,154,0.5)] bg-[repeating-linear-gradient(45deg,rgba(153,186,221,0.03)_0_10px,transparent_10px_20px)] px-[18px] py-4 font-jbmono text-[11.5px] leading-[1.7] tracking-[1px] text-muted'

// Breadcrumb class chips (no dot — the dotted variants live in the manifest table).
const CLASS_CHIP: Record<FeatureClass, string> = {
  CORE: 'border-gold/40 bg-gold/[0.08] text-gold',
  MARQUEE: 'border-gold/40 bg-gold/[0.08] text-gold',
  FIELD: 'border-blue/40 bg-blue/10 text-[#6fb1d8]',
  TRUST: 'border-cyan/35 bg-cyan/[0.08] text-cyan',
}

const trustIcons = {
  cyan: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
    </svg>
  ),
  gold: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffd93d" strokeWidth="2" aria-hidden="true">
      <path d="M9 11l3 3 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
} as const

const TRUST_TILE = {
  cyan: 'border-cyan/40 bg-cyan/[0.08]',
  gold: 'border-gold/40 bg-gold/[0.08]',
} as const

const TRUST_KICKER = { cyan: 'text-cyan', gold: 'text-gold' } as const

function TrustCard({ row }: { row: FeatureRow }) {
  const accent = row.accent ?? 'cyan'
  return (
    <div className="rounded-[18px] border border-[rgba(30,58,95,0.6)] bg-[linear-gradient(135deg,rgba(19,34,54,0.6),rgba(26,45,68,0.65))] px-9 py-[34px]">
      <div className={cn('mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[14px] border', TRUST_TILE[accent])}>
        {trustIcons[accent]}
      </div>
      <div className={cn('mb-[10px] font-stmono text-[10.5px] tracking-[2.4px]', TRUST_KICKER[accent])}>
        {row.kicker}
      </div>
      <h2 className="mb-3 font-nacelle text-[26px] font-semibold tracking-[-0.5px] text-heading">
        {row.heading}
      </h2>
      <p className="text-[15px] leading-[1.7] text-body">{row.body}</p>
    </div>
  )
}

function UnderTheHood({ feature, number }: { feature: Feature; number: string }) {
  const diagram = feature.diagram!
  const assetExists = existsSync(join(process.cwd(), 'public', diagram.src))
  return (
    <section className={cn(PAD, 'border-t border-[rgba(30,58,95,0.45)] pb-[68px] pt-[60px]')}>
      <div className="mb-[30px] flex items-baseline justify-between">
        <div>
          <div className="mb-3 font-stmono text-[11px] tracking-[2.4px] text-blue">UNDER THE HOOD</div>
          <h2 className="font-nacelle text-[30px] font-semibold tracking-[-0.6px] text-heading">
            {diagram.heading}
          </h2>
        </div>
        <div className="font-jbmono text-[11.5px] text-faint">FIG. {number}-A</div>
      </div>
      <figure className="m-0">
        <div className="rounded-2xl border border-[rgba(30,58,95,0.6)] bg-[rgba(8,16,28,0.6)] p-3.5">
          {assetExists ? (
            // eslint-disable-next-line @next/next/no-img-element -- build-time SVG diagram
            <img
              src={toPublicUrl(diagram.src)}
              alt={`${feature.title} data-flow diagram`}
              className="h-[430px] w-full rounded-lg object-contain"
            />
          ) : (
            <div
              role="img"
              aria-label={`${feature.title} data-flow diagram (coming soon)`}
              className="flex h-[430px] items-center justify-center rounded-lg font-jbmono text-xs tracking-[1px] text-faint"
            >
              DIAGRAM PENDING — PRODUCED SEPARATELY
            </div>
          )}
        </div>
        <figcaption className="mt-4 text-center font-jbmono text-xs uppercase leading-relaxed text-muted">
          {diagram.caption}
        </figcaption>
      </figure>
    </section>
  )
}

export interface FeaturePageProps {
  feature: Feature
  /** Zero-based catalog index — the manifest number (ITEM NN, FIG NN-A) derives from it. */
  index: number
  prev?: Feature
  next?: Feature
}

/**
 * The Case-File feature page: breadcrumb + class chip, (draft banner,) headline +
 * intro beside the tip card, content rows (phone rows / wide callout / trust cards
 * / draft hatching — chosen by the data), under-the-hood, prev/next, beta strip.
 */
export function FeaturePage({ feature, index, prev, next }: FeaturePageProps) {
  const number = String(index + 1).padStart(2, '0')
  const centered = feature.layout === 'trust-cards' // Security (10): centered header, no tip

  const breadcrumb = (
    <div
      className={cn(
        'mb-5 flex items-center gap-[10px] font-stmono text-[11px] tracking-[2px] text-faint',
        centered && 'justify-center',
      )}
    >
      <Link href="/#features" className="transition-colors hover:text-carolina">
        MANIFEST
      </Link>
      <span>/</span>
      <span className="text-gold">
        ITEM {number} — {feature.navLabel.toUpperCase()}
      </span>
      <span
        className={cn(
          'rounded-[10px] border px-[9px] py-[3px] font-stmono text-[9px] tracking-[1.6px]',
          CLASS_CHIP[feature.classLabel],
        )}
      >
        {feature.classLabel}
      </span>
    </div>
  )

  return (
    <article className="relative">
      {feature.draft && feature.draftNote ? (
        <div className={cn(PAD, 'pt-7')}>
          <div className="flex items-center gap-[14px] rounded-xl border border-gold/40 bg-gold/[0.07] px-5 py-[14px]">
            <span className="rounded-lg bg-gold px-[11px] py-1 font-stmono text-[10px] font-bold tracking-[2px] text-[#241d00]">
              DRAFT
            </span>
            <div className="text-[13.5px] leading-normal text-[#e7d9a6]">{feature.draftNote}</div>
          </div>
        </div>
      ) : null}

      {/* feature header */}
      <div className={cn(PAD, 'pb-14 pt-16', !centered && 'flex flex-col items-start gap-16 lg:flex-row')}>
        <div className={cn('flex-1', centered && 'text-center')}>
          {breadcrumb}
          <h1
            className={cn(
              'mb-5 font-nacelle text-4xl font-semibold leading-[1.04] tracking-[-1.2px] text-heading lg:text-[52px]',
              centered && 'mx-auto max-w-[860px]',
            )}
          >
            {featureHeadline(feature)}
          </h1>
          {feature.intro ? (
            feature.draft ? (
              <div className={cn(HATCH, 'max-w-[560px]')}>{feature.intro}</div>
            ) : (
              <p
                className={cn(
                  'text-[17px] leading-[1.65] text-body',
                  centered ? 'mx-auto max-w-[620px]' : 'max-w-[560px]',
                )}
              >
                <BoldText text={feature.intro} />
              </p>
            )
          ) : null}
        </div>
        {feature.tip ? <TipCard tip={feature.tip} /> : null}
      </div>

      {/* content rows */}
      {feature.layout === 'trust-cards' ? (
        <div className={cn(PAD, 'grid gap-6 pb-14 pt-6 md:grid-cols-2')}>
          {feature.rows.map((row) => (
            <TrustCard key={row.heading} row={row} />
          ))}
        </div>
      ) : (
        <div className={cn(PAD, 'flex flex-col gap-16 pb-16 pt-10')}>
          {feature.rows.map((row, rowIndex) => (
            <FeatureRowView
              key={row.heading + rowIndex}
              row={row}
              reversed={rowIndex % 2 === 1}
              draft={feature.draft}
            />
          ))}
        </div>
      )}

      {feature.diagram ? <UnderTheHood feature={feature} number={number} /> : null}

      <div className={cn(PAD, 'flex flex-col gap-11 border-t border-[rgba(30,58,95,0.45)] pb-16 pt-12')}>
        <PrevNext prev={prev} next={next} index={index} />
        {feature.betaStripLine ? <BetaStrip line={feature.betaStripLine} /> : null}
      </div>
    </article>
  )
}
