// Copy transcribed from the design canvas (artboard 3b). Deliberately muted —
// the design reserves warm accents for shipping work; the roadmap gets none.
const CARDS = [
  {
    title: 'Investigator mode',
    body: 'The door-knock canvass, documented the same way — for the investigators who work the file after you.',
  },
  {
    title: 'Live desk view',
    body: 'Field work, mirrored to a desktop at the office as it happens — for the day a scene needs a second set of eyes.',
  },
  {
    title: 'Will-say statements',
    body: 'The statement drafted from the case record the same way the notes already are — verified by you, typed by the app.',
  },
] as const

/** The sealed roadmap section — dashed cards, NOT-IN-BETA tags, no dates, no promises. */
export function RoadmapTease() {
  return (
    <section className="px-10 pb-[72px] pt-16 lg:px-20">
      <div className="mb-[14px] flex items-baseline justify-between">
        <div>
          <div className="mb-3 font-stmono text-[11px] tracking-[2.4px] text-faint">
            SEALED — OPENS AFTER THE BETA
          </div>
          <h2 className="font-nacelle text-[38px] font-semibold tracking-[-0.8px] text-heading">
            Where this is headed
          </h2>
        </div>
        <div className="hidden font-jbmono text-xs text-faint md:block">NO DATES · NO PROMISES</div>
      </div>
      <p className="mb-9 max-w-[620px] text-[15.5px] leading-[1.65] text-body-2">
        The beta is the analyst app, complete. These are the pieces being built around it — teased
        here because people ask, sealed because they&apos;re not done.
      </p>

      <div className="grid gap-5 md:grid-cols-3">
        {CARDS.map((card, index) => (
          <div
            key={card.title}
            className="relative rounded-2xl border border-dashed border-[rgba(93,122,154,0.45)] bg-[rgba(8,16,28,0.45)] px-7 pb-6 pt-[26px]"
          >
            <div className="absolute -top-px right-6 rounded-b-[7px] bg-chip px-[10px] py-[3px] font-stmono text-[9px] tracking-[2px] text-muted">
              ROADMAP · NOT IN BETA
            </div>
            <div className="mb-3 font-stmono text-[10.5px] tracking-[2px] text-faint">
              NEXT {String(index + 1).padStart(2, '0')}
            </div>
            <div className="mb-[9px] font-nacelle text-xl font-semibold text-tab-label">
              {card.title}
            </div>
            <div className="text-sm leading-relaxed text-[#8ba7c4]">{card.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
