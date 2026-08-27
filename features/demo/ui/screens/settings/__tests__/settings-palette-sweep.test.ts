import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { palette } from '@/features/demo/ui/tokens/palette'

/**
 * U6's exit line, mechanised: *"`census.mjs` shows the settings package's bare-hex count at
 * zero"*, and demo §4.7's brief for this file — *"it is already the right shape; it just needs
 * to source from `T`/`GLASS` instead of bare hexes"*.
 *
 * The rule this holds is D2 as amended, which is absolute: **nothing hard-codes a dark value
 * that has a light sibling.** Every `#99badd` in this subtree WAS such a value — a dark token
 * spelled out, invisible to `palette[scheme]`, and therefore a site the one-line scheme flip
 * (plan §9 clause 12) would silently leave on the dark half.
 *
 * NOT a general ban on hex literals. It bans exactly the ones the palette already owns, which
 * makes it falsifiable in the direction that matters: re-inlining `colors.text` as `#f0f4f8`
 * reds, and an unrelated demo-only literal does not. The two literals with no palette sibling
 * are listed below WITH their reason, because "leave unique unchanged literals alone" is D3 and
 * an unexplained survivor is indistinguishable from a missed one.
 *
 * Comments are stripped first: `glass-tokens.test.ts`'s own sweep does not, and U6.1's report
 * (§8 item 7) records that costing a commit. A docblock naming a token's value is prose.
 */

const SETTINGS_ROOT = join(process.cwd(), 'features', 'demo', 'ui', 'screens', 'settings')

/**
 * Hex literals that survive on purpose. Each needs a reason a reader can check, not a shrug.
 *
 * **Keyed by SITE, not by hex (W3/F66 - W2/F32's remedy with the axes swapped).** Every reason
 * below names ONE file, and a hex-keyed map exempted the value across the whole
 * `screens/settings/**` walk: the tests lane's SP2 probe planted the exempt hex in a SECOND file
 * and SURVIVED. A template-literal key puts the path inside what tsc checks and inside what the
 * inventory case compares, so a second site spelling an exempt hex is a NEW key and reds naming
 * its file. `field-recipe-sweep.test.tsx:94`'s file-keyed `ALLOWED` is the sibling this agrees
 * with now.
 *
 * The BAN case is deliberately not exempted at all - a palette hex is an offender wherever it
 * appears - which is why F66 lands LOW rather than higher.
 */
const ALLOWED: Readonly<Record<Site, string>> = {
  // `#cdd9e6` was here, exempted as `T.textDim` with U6.4a named as its trigger. U6.4a fired:
  // the key is deleted from `inputs/input-theme.ts`, the eight hand-rolled copies of the label
  // it carried read `fieldLabelStyle`, and this subtree's three sites — `_pane-chrome`'s stub
  // note, `FormFieldsPane`'s field rows and `UserProfileModal`'s label — take `colors.text`.
  // The row goes with the literal: a reason kept for a literal that no longer exists is
  // exactly the stale exemption the third case below tests for.
  'panes/FormFieldsPane.tsx:#5d7a9a':
    'The footnote tone at `:315`. No palette sibling, no matrix row names it, and it is not ' +
    'the `#5a7a9a` U7.2’s D-1 rules on (different hex). D3: an unchanged unique literal is left ' +
    'alone.',
}

/** `<path relative to the settings root>:<lowercased hex>` - the unit an exemption is granted in. */
type Site = `${string}:#${string}`

const siteKey = (file: string, hex: string): Site =>
  `${relative(SETTINGS_ROOT, file).split(sep).join('/')}:${hex.toLowerCase()}` as Site

/** Every palette value, both halves, lowercased — the set this sweep bans. */
const PALETTE_HEXES = new Set(
  [...Object.values(palette.light), ...Object.values(palette.dark)]
    .filter((v) => v.startsWith('#'))
    .map((v) => v.toLowerCase()),
)

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('the settings package sources its colours from the palette (U6 exit / D2)', () => {
  const files = sourceFiles(SETTINGS_ROOT)

  it('walks a non-empty tree — a broken root would pass silently', () => {
    // The positive control this whole scan needs: an empty file list makes every assertion
    // below vacuously true, which is the exact "opposite of the truth" failure a source scan
    // has and a behaviour test does not.
    expect(files.length).toBeGreaterThan(10)
    expect(PALETTE_HEXES.has('#f0f4f8')).toBe(true)
  })

  it('spells no hex the palette already owns', () => {
    const offenders: string[] = []
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'))
      for (const hex of src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        if (PALETTE_HEXES.has(hex.toLowerCase())) {
          offenders.push(`${relative(SETTINGS_ROOT, file).split(sep).join('/')}: ${hex}`)
        }
      }
    }
    expect(
      offenders,
      'a palette token was re-inlined as a literal — it is invisible to `palette[scheme]`, so ' +
        'the one-line light flip would leave it on the dark half (D2, §9 clause 12)',
    ).toEqual([])
  })

  it('leaves EXACTLY the literals that have a recorded reason — no more, and no fewer', () => {
    const found = new Set<Site>()
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'))
      for (const hex of src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) found.add(siteKey(file, hex))
    }
    expect(
      Array.from(found).sort(),
      'the surviving literals no longer match ALLOWED. A NEW site: add it with a reason, or ' +
        'route it through the palette - and note that an exemption granted to one file no ' +
        'longer excuses the same hex in another (F66). A site that VANISHED: delete its row — a reason kept for ' +
        'a literal that no longer exists is how a stale exemption outlives the thing it excused.',
    ).toEqual(Object.keys(ALLOWED).sort())
  })
})
