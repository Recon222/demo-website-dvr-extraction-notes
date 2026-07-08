// Copy + accents transcribed from the design canvas (artboard 1a §chain of work).
// Accent order cyan/gold/blue/cyan with glowPulse halos staggered 0.4s apart.
const STEPS = [
  {
    title: 'Import the request',
    body: 'Drop in the PDF or email. On-device AI pre-fills the case before you type a word.',
    chips: ['PDF', 'EMAIL', 'APPLE AI'],
    accent: '#4ecdc4',
    accentBg: 'rgba(78,205,196,0.12)',
  },
  {
    title: 'Calibrate the clock',
    body: "Point the camera at the DVR's timestamp. OCR reads it; an atomic time source stamps the offset.",
    chips: ['OCR', 'NTP', 'OFFSET'],
    accent: '#ffd93d',
    accentBg: 'rgba(255,217,61,0.12)',
  },
  {
    title: 'Capture by location',
    body: 'Photos, video, audio, GPS-marked cameras — filed under the right address automatically.',
    chips: ['PHOTO', 'VIDEO', 'AUDIO', 'GPS'],
    accent: '#2b8cc1',
    accentBg: 'rgba(43,140,193,0.15)',
  },
  {
    title: 'Hand off',
    body: 'Auto-written notes, a finished PDF report, and an encrypted case package. Verified by you, typed by the app.',
    chips: ['NOTES', 'PDF', 'AES-256'],
    accent: '#4ecdc4',
    accentBg: 'rgba(78,205,196,0.12)',
  },
] as const

/** The 4-column chain-of-work section: glowing halo dots, connector lines, step copy + chips. */
export function ChainOfWork() {
  return (
    <section id="how-it-works" className="border-t border-[rgba(30,58,95,0.45)] px-10 pb-[72px] pt-16 lg:px-20">
      <div className="mb-11 flex items-baseline justify-between">
        <div>
          <div className="mb-3 font-stmono text-[11px] tracking-[2.4px] text-blue">
            CHAIN OF WORK
          </div>
          <h2 className="font-nacelle text-[38px] font-semibold tracking-[-0.8px] text-heading">
            From request to court-ready report
          </h2>
        </div>
        <div className="hidden font-jbmono text-xs text-faint md:block">
          ONE GUIDED PASS · NO LOOSE ENDS
        </div>
      </div>

      <ol className="grid gap-y-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-y-0">
        {STEPS.map((step, index) => (
          <li key={step.title} className={index < STEPS.length - 1 ? 'relative lg:pr-7' : 'relative'}>
            {/* halo dot + connector */}
            <div className="mb-[18px] flex items-center gap-3">
              <div className="relative flex h-4 w-4 items-center justify-center">
                <div
                  aria-hidden="true"
                  className="absolute h-4 w-4 animate-[glowPulse_3s_ease-in-out_infinite] rounded-full opacity-40 blur-[3px]"
                  style={{ background: step.accent, animationDelay: `${index * 0.4}s` }}
                />
                <div
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border-2"
                  style={{ borderColor: step.accent, background: step.accentBg }}
                />
              </div>
              <div
                aria-hidden="true"
                className="h-0.5 flex-1"
                style={{
                  background:
                    index === STEPS.length - 1
                      ? 'linear-gradient(90deg,#1e3a5f,transparent)'
                      : '#1e3a5f',
                }}
              />
            </div>

            <div className="mb-[10px] font-stmono text-[10.5px] tracking-[2px]" style={{ color: step.accent }}>
              STEP {String(index + 1).padStart(2, '0')}
            </div>
            <div className="mb-[9px] font-nacelle text-xl font-semibold text-heading">
              {step.title}
            </div>
            <div className="text-sm leading-relaxed text-body-2">{step.body}</div>
            <div className="mt-[14px] flex flex-wrap gap-1.5">
              {step.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md bg-chip px-2 py-1 font-jbmono text-[10px] text-muted"
                >
                  {chip}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
