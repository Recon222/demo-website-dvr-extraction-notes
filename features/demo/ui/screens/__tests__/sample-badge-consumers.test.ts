import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SAMPLE_BADGE } from '@/features/demo/ui/controls/sample-badge'

/**
 * W3 r1 F51 — the OWNERSHIP half of D12's freeze-and-defend arm.
 *
 * The three render-site pins (in `MediaCaptureScreen.test.tsx`, `AudioPreviewScreen.test.tsx` and
 * `MediaLibrarySheet.test.tsx`) assert that each badge PAINTS the trio, and they kill a re-inline
 * that DRIFTS. They provably do not kill a re-inline at the identical value — measured, probes
 * Q1/Q2 SURVIVED — because there is no rendered difference for a behavioural test to see.
 *
 * That gap is the finding. F51's own words are that the defence held "by five hand-typed literals
 * happening to agree": the danger is not today's paint, it is the fourth copy that drifts on the
 * authorised re-derive day. So the value pins guard the VALUE and this guards the OWNERSHIP, and
 * neither is sufficient alone.
 *
 * ## Scoped, not repo-wide, and that is measured rather than cautious
 *
 * `glass-tokens.test.ts`'s `BANNED` list is the repo's global mechanism and it is the wrong one
 * here: its own rule is that a value is banned only when it "cannot be reached for innocently",
 * and two of these three CAN be. `#ffd07a` is live as advisory TEXT at four sites in
 * `MediaCaptureScreen` alone plus `ExpiredMediaNotice`'s copy, and `rgba(255,200,90,0.3)` is the
 * sample-data CARD's border at `MediaCaptureScreen.tsx:891` — the chip's own wrapper, which F51
 * explicitly excludes as part of "the looser 0.06-0.28 amber family". A repo-wide ban would
 * report every one of them as a badge re-inline. Same judgement, same shape and the same reason
 * as `camera-chrome.test.ts`'s scoped sweep.
 *
 * ## The control exercises the CLAIM (F67's lesson, applied here on purpose)
 *
 * An empty offender list is also what an unreadable file, an empty file or a typo'd path
 * produces. The second case below proves each named file is really being read and really reaches
 * for the seam, so "zero offenders" means zero offenders rather than zero bytes.
 */

/** The three files F51 names. Paths relative to `features/demo/ui/`. */
const CONSUMERS = [
  'screens/MediaLibrarySheet.tsx',
  'screens/MediaCaptureScreen.tsx',
  'screens/AudioPreviewScreen.tsx',
] as const

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')
const read = (rel: string): string => readFileSync(join(UI_ROOT, ...rel.split('/')), 'utf8')

/** Whitespace-stripped, lower-cased. §4.7: every hex sweep in this repo is case-insensitive, and
 *  the demo and `Colors.ts` spell `rgba()` differently. `glass-tokens.test.ts`'s own `norm`. */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

/**
 * The two values that CANNOT be reached for innocently — a fill and a hairline at alphas nothing
 * else in the demo paints. `foreground` (`#ffd07a`) is deliberately absent: it is a live advisory
 * TEXT colour at five sites across these same files, so banning it would report the excluded
 * amber family as badge drift. The render-site pins cover the foreground; this covers what a
 * source scan can honestly cover.
 */
const OWNED = ['background', 'border'] as const

describe('SAMPLE_BADGE ownership (W3 r1 F51 / D12)', () => {
  it.each(CONSUMERS)('%s reaches for the seam, never a re-typed literal', (file) => {
    const text = norm(read(file))
    const offenders = OWNED.filter((key) => text.includes(norm(`'${SAMPLE_BADGE[key]}'`))).map(
      (key) => `${file} re-inlines SAMPLE_BADGE.${key} (${SAMPLE_BADGE[key]})`,
    )
    expect(
      offenders,
      `import SAMPLE_BADGE from ui/controls/sample-badge instead — D12's provenance mark is a\n` +
        `correctness constraint, and it held only by hand-typed literals happening to agree:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it.each(CONSUMERS)('%s is really being read, and really imports the seam', (file) => {
    const text = read(file)
    expect(text.length).toBeGreaterThan(5_000)
    expect(text).toContain("from '@/features/demo/ui/controls/sample-badge'")
    expect(text).toContain('SAMPLE_BADGE.')
  })

  it('bans only what cannot be reached for innocently', () => {
    // The scan's own scope, asserted rather than described: the foreground is EXCLUDED because it
    // is a live advisory-text colour in these files, and the excluded amber family must not be
    // reportable as badge drift.
    expect(OWNED).not.toContain('foreground')
    expect(norm(read('screens/MediaCaptureScreen.tsx'))).toContain(norm(SAMPLE_BADGE.foreground))
  })
})
