import type { FeatureTip } from '@/lib/content/types'
import { BoldText } from './bold-text'

// Gold = bulb (insight); cyan = lock (trust) — per the handoff README's tip spec.
const bulbIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffd93d"
    strokeWidth="2"
    className="mt-0.5 flex-none"
    aria-hidden="true"
  >
    <path
      d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.2 1 2v.5h6V15.5c0-.8.3-1.3 1-2A6 6 0 0 0 12 3z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const lockIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4ecdc4"
    strokeWidth="2"
    className="mt-0.5 flex-none"
    aria-hidden="true"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
  </svg>
)

const VARIANT = {
  gold: {
    box: 'border-gold/30 bg-gold/[0.07] text-[#e7d9a6]',
    bold: 'font-semibold text-gold',
    icon: bulbIcon,
  },
  cyan: {
    box: 'border-cyan/30 bg-cyan/[0.06] text-[#aecbc8]',
    bold: 'font-semibold text-cyan',
    icon: lockIcon,
  },
} as const

/** The one tip card per feature page (gold bulb / cyan lock), right of the header. */
export function TipCard({ tip }: { tip: FeatureTip }) {
  const variant = VARIANT[tip.variant]
  return (
    <div
      className={`mt-[46px] flex w-full flex-none gap-3 rounded-[14px] border px-5 py-[18px] lg:w-[400px] ${variant.box}`}
    >
      {variant.icon}
      <div className="text-sm leading-relaxed">
        <BoldText text={tip.body} boldClassName={variant.bold} />
      </div>
    </div>
  )
}
