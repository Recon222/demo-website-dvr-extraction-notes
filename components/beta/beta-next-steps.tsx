// Copy transcribed from the design canvas (artboard 2a §what happens next).
const STEPS = [
  {
    kicker: '01 · TODAY',
    kickerClass: 'text-cyan',
    title: 'You leave an email',
    body: "That's the whole ask. No forms about your agency, no sales call.",
  },
  {
    kicker: '02 · APPLE REVIEW',
    kickerClass: 'text-gold',
    title: 'A build clears TestFlight review',
    body: 'Apple vets every beta build before outsiders can install it. This page flips to the live link the same day.',
  },
  {
    kicker: '03 · YOUR NEXT SCENE',
    kickerClass: 'text-blue',
    title: 'You run it in the field',
    body: 'Real extractions, your feedback straight to the analyst who built it. What you log stays on your phone.',
  },
] as const

/** The three WHAT-HAPPENS-NEXT cards under the beta panels. */
export function BetaNextSteps() {
  return (
    <section className="border-t border-[rgba(30,58,95,0.45)] px-10 pb-16 pt-10 lg:px-20">
      <div className="mb-[26px] font-stmono text-[11px] tracking-[2.4px] text-blue">
        WHAT HAPPENS NEXT
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.title}
            className="rounded-[14px] border border-hairline bg-[rgba(10,20,34,0.6)] px-[26px] py-6"
          >
            <div className={`mb-[10px] font-stmono text-[10.5px] tracking-[2px] ${step.kickerClass}`}>
              {step.kicker}
            </div>
            <div className="mb-2 font-nacelle text-lg font-semibold text-heading">{step.title}</div>
            <div className="text-[13.5px] leading-relaxed text-body-2">{step.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
