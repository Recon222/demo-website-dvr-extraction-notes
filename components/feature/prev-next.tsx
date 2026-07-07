import Link from 'next/link'
import type { Feature } from '@/lib/content/types'

const CARD =
  'flex flex-col gap-2 rounded-[14px] border border-[rgba(30,58,95,0.6)] bg-[rgba(10,20,34,0.6)] px-[26px] py-[22px] transition-colors hover:border-blue/50 hover:bg-blue/[0.07]'
const EDGE =
  'flex flex-col gap-2 rounded-[14px] border border-dashed border-[rgba(30,58,95,0.5)] bg-[rgba(8,16,28,0.35)] px-[26px] py-[22px]'

function DraftChip() {
  return (
    <span className="rounded-lg border border-gold/40 bg-gold/[0.08] px-[7px] py-0.5 font-stmono text-[8.5px] tracking-[1.4px] text-gold">
      DRAFT
    </span>
  )
}

/** Prev/next manifest navigation; dashed non-link cards at the manifest edges. */
export function PrevNext({
  prev,
  next,
  index,
}: {
  prev?: Feature
  next?: Feature
  index: number
}) {
  return (
    <nav aria-label="Feature pages" className="grid gap-5 md:grid-cols-2">
      {prev ? (
        <Link href={`/features/${prev.slug}`} className={CARD}>
          <span className="flex items-center gap-2 font-stmono text-[10px] tracking-[2px] text-faint">
            ← PREV · {String(index).padStart(2, '0')} {prev.navLabel.toUpperCase()}
            {prev.draft ? <DraftChip /> : null}
          </span>
          <span className="font-nacelle text-lg font-semibold text-tab-label">{prev.title}</span>
        </Link>
      ) : (
        <div className={EDGE}>
          <span className="font-stmono text-[10px] tracking-[2px] text-ghost">START OF MANIFEST</span>
          <span className="font-nacelle text-lg font-semibold text-faint">This is item 01</span>
        </div>
      )}

      {next ? (
        <Link href={`/features/${next.slug}`} className={`${CARD} md:text-right`}>
          <span className="flex items-center gap-2 font-stmono text-[10px] tracking-[2px] text-faint md:justify-end">
            NEXT · {String(index + 2).padStart(2, '0')} {next.navLabel.toUpperCase()}
            {next.draft ? <DraftChip /> : null}
            <span aria-hidden="true">→</span>
          </span>
          <span className="font-nacelle text-lg font-semibold text-tab-label">{next.title}</span>
        </Link>
      ) : (
        <div className={`${EDGE} md:text-right`}>
          <span className="font-stmono text-[10px] tracking-[2px] text-ghost">END OF MANIFEST</span>
          <span className="font-nacelle text-lg font-semibold text-faint">That&apos;s all ten</span>
        </div>
      )}
    </nav>
  )
}
