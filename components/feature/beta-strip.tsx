import Link from 'next/link'

/** The gold per-page beta strip: the feature's closing line + the recruiting CTA. */
export function BetaStrip({ line }: { line: string }) {
  return (
    <div className="flex flex-col items-start gap-5 rounded-2xl border border-gold/30 bg-gold/[0.06] px-8 py-[26px] md:flex-row md:items-center md:justify-between">
      <div className="font-nacelle text-xl font-semibold text-heading">{line}</div>
      <Link
        href="/beta"
        className="inline-flex items-center gap-[9px] whitespace-nowrap rounded-[10px] bg-[linear-gradient(180deg,#ffe06a,#f5c62e)] px-[22px] py-3 text-sm font-bold text-[#241d00] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset] transition-colors hover:bg-[linear-gradient(180deg,#ffe786,#ffd93d)]"
      >
        Join the TestFlight beta
      </Link>
    </div>
  )
}
