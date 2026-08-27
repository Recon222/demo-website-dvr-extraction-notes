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
 * ## Scoped, not repo-wide, and NARROW — both measured rather than cautious
 *
 * `glass-tokens.test.ts`'s `BANNED` list is the repo's global mechanism and it is the wrong one
 * here: its own rule is that a value is banned only when it "cannot be reached for innocently",
 * and two of the three CAN be — see `OWNED` below for both, with counts. So the scan is scoped to
 * the three files F51 names (the shape and reason of `camera-chrome.test.ts`'s sweep) AND to the
 * single trio member that is unambiguous.
 *
 * That narrowing is the point rather than a shortfall. This round's pipeline notes name the
 * wave's theme as "source-scan guards whose pattern or exemption is narrower than the claim
 * written beside them", four waves running. The honest response is to shrink the CLAIM to the
 * pattern, not to widen the pattern until it lies.
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
 * ONE value — the 12% fill. The claim is deliberately no wider than the pattern can carry, which
 * is this round's own pipeline lesson (four waves of guards whose comment out-promised their
 * regex). Both other members of the trio have LEGITIMATE non-badge uses in these same files, so a
 * text scan cannot tell a re-inline from a live sibling:
 *
 *   `foreground` `#ffd07a` — advisory TEXT at five sites in `MediaCaptureScreen` plus
 *     `ExpiredMediaNotice`'s copy.
 *   `border` `rgba(255,200,90,0.3)` — the sample-data CARD's own border at
 *     `MediaCaptureScreen.tsx:891`, which is the chip's WRAPPER and which F51 excludes by name as
 *     part of "the looser 0.06-0.28 amber family". Measured: two live occurrences outside the
 *     seam, one of them legitimate.
 *
 * The fill has exactly ONE occurrence in the whole of `features/demo/` outside `sample-badge.ts`
 * (measured), so it is the member that can be owned mechanically. It is also the discriminating
 * one: nothing else in the demo paints an amber at 12%.
 *
 * What this does NOT cover, stated so no one reads the file name as a wider promise: a re-inline
 * of the foreground or the border ALONE, at the same value. Those are covered by the three
 * render-site pins, which kill any re-inline that drifts — measured, probes Q3/Q4.
 */
const OWNED = ['background'] as const

describe('SAMPLE_BADGE ownership (W3 r1 F51 / D12)', () => {
  it.each(CONSUMERS)('%s reaches for the seam, never a re-typed literal', (file) => {
    const text = norm(read(file))
    // The bare value, NOT quote-wrapped: `AudioPreviewScreen` composes its hairline as
    // `` `1px solid ${...}` ``, so a re-inline arrives as `'1px solid rgba(...)'` and a
    // quote-anchored needle walks straight past it (measured — probe Q2b SURVIVED on the
    // quote-wrapped form). The closing paren is what keeps 0.12 from matching 0.125.
    const offenders = OWNED.filter((key) => text.includes(norm(SAMPLE_BADGE[key]))).map(
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
    // The scope, ASSERTED rather than described, so it cannot be widened without this reddening.
    expect(OWNED).toEqual(['background'])
    // Both exclusions are live in the scanned files for legitimate, non-badge reasons — that is
    // the whole reason they are excluded, and it is checked rather than claimed.
    const camera = norm(read('screens/MediaCaptureScreen.tsx'))
    expect(camera, 'foreground is a live advisory-text colour here').toContain(norm(SAMPLE_BADGE.foreground))
    expect(camera, "border is the sample-data CARD's own hairline here").toContain(norm(SAMPLE_BADGE.border))
  })
})
