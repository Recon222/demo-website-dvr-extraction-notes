import { BetaForm } from '@/components/beta/beta-form'

/**
 * The gold beta-recruitment panel (canvas artboard 1a §beta CTA): exhibit tab,
 * pitch copy, and the working email intake (BetaForm — Slice 12). Deliberate
 * canvas deviation: the compact consent checkbox rides along here too, because
 * the schema requires consent and a form that always fails is worse than 16px
 * of checkbox.
 */
export function BetaCta() {
  return (
    <section className="border-t border-[rgba(30,58,95,0.45)] px-10 pb-[84px] pt-[72px] lg:px-20">
      <div className="relative flex flex-col items-start gap-10 rounded-[20px] border border-gold/30 bg-[linear-gradient(135deg,rgba(255,217,61,0.07),rgba(255,217,61,0.02)_55%,rgba(43,140,193,0.05))] px-[52px] py-[46px] lg:flex-row lg:items-center lg:gap-14">
        <div className="absolute -top-px left-11 rounded-b-lg bg-gold px-3 py-[3px] font-stmono text-[10px] tracking-[2.4px] text-[#241d00]">
          EXHIBIT A — YOUR NEXT SCENE
        </div>

        <div className="flex-1">
          <h2 className="mb-3 font-nacelle text-[34px] font-semibold tracking-[-0.7px] text-heading">
            Be first to run it in the field
          </h2>
          <p className="max-w-[520px] text-[15.5px] leading-relaxed text-body">
            iOS beta via TestFlight. Leave your email — you&apos;ll get the invite the moment a
            build clears review. No case data ever touches our servers; we only ever hold your
            address.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-[380px] lg:flex-none">
          <BetaForm />
          <div className="flex items-center gap-2 font-stmono text-[10px] tracking-[1.4px] text-faint">
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ecdc4"
              strokeWidth="2.4"
            >
              <path d="M9 11l3 3 8-8" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            IOS 26+ · TESTFLIGHT · UNSUBSCRIBE ANYTIME
          </div>
        </div>
      </div>
    </section>
  )
}
