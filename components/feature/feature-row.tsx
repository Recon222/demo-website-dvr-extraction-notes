import { AppDemo } from '@/components/app-demo'
import { MarketingPhoneFrame } from '@/components/marketing/phone-frame'
import type { FeatureRow } from '@/lib/content/types'
import { cn } from '@/lib/cn'

const HATCH =
  'rounded-xl border border-dashed border-[rgba(93,122,154,0.5)] bg-[repeating-linear-gradient(45deg,rgba(153,186,221,0.03)_0_10px,transparent_10px_20px)] px-6 py-[22px] font-jbmono text-xs leading-[1.8] tracking-[1px] text-muted'

function Chips({ chips }: { chips?: readonly string[] }) {
  if (!chips?.length) return null
  return (
    <div className="mt-[22px] flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-lg bg-chip px-3 py-1.5 font-jbmono text-[11px] text-muted">
          {chip}
        </span>
      ))}
    </div>
  )
}

const calloutIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6fb1d8" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
  </svg>
)

/**
 * One feature-page content row. Three shapes, chosen by the data:
 *  - media row: bracketed phone (0.62, REC label, AppDemo) ⇄ copy, alternating sides
 *  - media-less row: the wide horizontal callout card (Cases row 3)
 *  - draft row: kicker + hatched scaffolding copy beside the phone
 */
export function FeatureRowView({
  row,
  reversed,
  draft,
}: {
  row: FeatureRow
  reversed: boolean
  draft?: boolean
}) {
  if (!row.media) {
    return (
      <div className="flex items-center gap-10 rounded-2xl border border-[rgba(30,58,95,0.6)] bg-[linear-gradient(135deg,rgba(19,34,54,0.6),rgba(26,45,68,0.65))] px-9 py-[30px]">
        <div className="hidden h-[54px] w-[54px] flex-none items-center justify-center rounded-[14px] border border-blue/40 bg-blue/10 md:flex">
          {calloutIcon}
        </div>
        <div className="flex-1">
          {row.kicker ? (
            <div className="mb-2 font-stmono text-[10.5px] tracking-[2.4px] text-blue">{row.kicker}</div>
          ) : null}
          <div className="mb-[7px] font-nacelle text-[22px] font-semibold text-heading">{row.heading}</div>
          <div className="max-w-[720px] text-[14.5px] leading-relaxed text-body">{row.body}</div>
        </div>
        <div className="hidden flex-none gap-2 lg:flex">
          {row.chips?.map((chip) => (
            <span key={chip} className="rounded-lg bg-chip px-3 py-1.5 font-jbmono text-[11px] text-muted">
              {chip}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-10 lg:gap-[72px]',
        reversed ? 'lg:flex-row-reverse' : 'lg:flex-row',
      )}
    >
      <MarketingPhoneFrame scale={0.62} label={row.recLabel ?? row.heading}>
        <AppDemo src={row.media} label={row.heading} className="absolute inset-0 h-full w-full rounded-none" />
      </MarketingPhoneFrame>

      <div className="flex-1">
        {row.kicker ? (
          <div className="mb-[14px] font-stmono text-[11px] tracking-[2.4px] text-blue">{row.kicker}</div>
        ) : null}
        {draft ? (
          <div className={cn(HATCH, 'max-w-[560px]')}>{row.body}</div>
        ) : (
          <>
            <h2 className="mb-4 font-nacelle text-[32px] font-semibold tracking-[-0.6px] text-heading">
              {row.heading}
            </h2>
            <p className="max-w-[520px] text-[15.5px] leading-[1.7] text-body">{row.body}</p>
            <Chips chips={row.chips} />
          </>
        )}
      </div>
    </div>
  )
}
