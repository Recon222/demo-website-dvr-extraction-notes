import { BetaForm } from './beta-form'
import { BetaNextSteps } from './beta-next-steps'

const planeIcon = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#241d00"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const checkIcon = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#4ecdc4"
    strokeWidth="2.4"
    aria-hidden="true"
    className="flex-none"
  >
    <path d="M9 11l3 3 8-8" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * The two-phase beta page (canvas artboard 2a). Phase A (no TestFlight URL):
 * the gold intake panel. Phase B (URL set): the cyan live-link panel with the
 * big gold TestFlight button, email capture demoted to secondary. The design
 * shows both states stacked for review; production renders exactly one.
 * Presentational — the route injects siteConfig.testflightUrl.
 */
export function BetaPageView({ testflightUrl }: { testflightUrl: string | null }) {
  return (
    <div className="relative isolate">
      {/* gold top glow (the beta page's variant of the hero glow) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[260px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(550px_260px_at_50%_0%,rgba(255,217,61,0.10),transparent_70%)]"
      />

      {/* page header */}
      <div className="px-10 pb-10 pt-[72px] text-center lg:px-20">
        <div className="mb-[22px] inline-flex items-center gap-[10px] font-stmono text-[11px] tracking-[2px] text-faint">
          <span>MANIFEST</span>
          <span>/</span>
          <span className="text-gold">BETA ACCESS</span>
        </div>
        <h1 className="mx-auto mb-5 max-w-[860px] font-nacelle text-5xl font-semibold leading-[1.03] tracking-[-1.3px] text-heading lg:text-[56px]">
          Be first in the field.
        </h1>
        <p className="mx-auto max-w-[600px] text-[17px] leading-[1.65] text-body">
          The beta is the full analyst app, on your phone, via TestFlight. Leave your email now —
          the invite ships the moment a build clears Apple&apos;s beta review.
        </p>
      </div>

      {testflightUrl ? (
        <>
          {/* PHASE B — the live link */}
          <div className="px-10 pb-7 pt-8 lg:px-20">
            <div className="relative rounded-[20px] border border-cyan/35 bg-[linear-gradient(135deg,rgba(78,205,196,0.06),rgba(19,34,54,0.5))] px-[52px] py-12 text-center">
              <div className="absolute -top-px left-11 rounded-b-lg bg-cyan px-3 py-[3px] font-stmono text-[10px] tracking-[2.4px] text-[#00201c]">
                LINK ACTIVE
              </div>
              <div className="mb-[22px] inline-flex items-center gap-[9px]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-[blinkDot_2s_ease-in-out_infinite] rounded-full bg-cyan shadow-[0_0_10px_rgba(78,205,196,0.9)]"
                />
                <span className="font-stmono text-[11px] tracking-[2.4px] text-cyan">
                  BUILD APPROVED FOR EXTERNAL TESTING
                </span>
              </div>
              <div className="mb-[18px]">
                <a
                  href={testflightUrl}
                  className="inline-flex items-center gap-3 rounded-[13px] bg-[linear-gradient(180deg,#ffe06a,#f5c62e)] px-[38px] py-[18px] text-lg font-bold text-[#241d00] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_18px_44px_-14px_rgba(255,217,61,0.6)] transition-colors hover:bg-[linear-gradient(180deg,#ffe786,#ffd93d)]"
                >
                  {planeIcon}
                  Join the TestFlight beta
                </a>
              </div>
              <div className="mb-[14px] font-stmono text-[10.5px] tracking-[1.8px] text-faint">
                REQUIRES IOS 26+ AND THE TESTFLIGHT APP · SEATS ARE CAPPED BY APPLE AT 10,000 — NOT
                A MARKETING LINE
              </div>
              <a
                href="#invite-form"
                className="text-[13px] text-carolina underline transition-colors hover:text-[#cfe6f5]"
              >
                or email me about updates instead
              </a>
            </div>
          </div>

          {/* secondary email capture */}
          <div id="invite-form" className="px-10 pb-11 lg:px-20">
            <div className="mx-auto flex max-w-[520px] flex-col gap-4">
              <h2 className="text-center font-nacelle text-xl font-semibold text-heading">
                Get update emails instead
              </h2>
              <BetaForm />
            </div>
          </div>
        </>
      ) : (
        /* PHASE A — the intake panel */
        <div id="invite-form" className="px-10 pb-11 pt-8 lg:px-20">
          <div className="relative flex flex-col items-start gap-10 rounded-[20px] border border-gold/[0.32] bg-[linear-gradient(135deg,rgba(255,217,61,0.07),rgba(255,217,61,0.02)_55%,rgba(43,140,193,0.05))] px-[52px] py-11 lg:flex-row lg:items-center lg:gap-14">
            <div className="absolute -top-px left-11 rounded-b-lg bg-gold px-3 py-[3px] font-stmono text-[10px] tracking-[2.4px] text-[#241d00]">
              INTAKE FORM — 60 SECONDS
            </div>
            <div className="flex-1">
              <h2 className="mb-3 font-nacelle text-[30px] font-semibold tracking-[-0.6px] text-heading">
                Get on the invite list
              </h2>
              <p className="mb-[18px] max-w-[520px] text-[15px] leading-[1.65] text-body">
                One field. No account, no vendor onboarding call. When the build is approved you
                get a TestFlight link — until then, silence.
              </p>
              <div className="flex items-center gap-[10px] font-stmono text-[10px] tracking-[1.4px] text-faint">
                {checkIcon}
                WE KEEP YOUR ADDRESS AND NOTHING ELSE — CASE DATA NEVER TOUCHES OUR SERVERS
              </div>
            </div>
            <div className="flex w-full flex-col gap-[14px] lg:w-[420px] lg:flex-none">
              <BetaForm />
              <div className="flex items-center gap-2 font-stmono text-[10px] tracking-[1.4px] text-faint">
                <span
                  aria-hidden="true"
                  className="h-[6px] w-[6px] animate-[blinkDot_2.4s_ease-in-out_infinite] rounded-full bg-gold"
                />
                STATUS: AWAITING FIRST BUILD — BETA APP REVIEW PENDING
              </div>
            </div>
          </div>
        </div>
      )}

      <BetaNextSteps />
    </div>
  )
}
