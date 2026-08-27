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
 */
const ALLOWED: Readonly<Record<string, string>> = {
  // `#cdd9e6` was here, exempted as `T.textDim` with U6.4a named as its trigger. U6.4a fired:
  // the key is deleted from `inputs/input-theme.ts`, the eight hand-rolled copies of the label
  // it carried read `fieldLabelStyle`, and this subtree's three sites — `_pane-chrome`'s stub
  // note, `FormFieldsPane`'s field rows and `UserProfileModal`'s label — take `colors.text`.
  // The row goes with the literal: a reason kept for a literal that no longer exists is
  // exactly the stale exemption the third case below tests for.
  '#5d7a9a':
    'FormFieldsPane’s footnote tone. No palette sibling, no matrix row names it, and it is not ' +
    'the `#5a7a9a` U7.2’s D-1 rules on (different hex). D3: an unchanged unique literal is left ' +
    'alone.',
}

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
    const found = new Set<string>()
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'))
      for (const hex of src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) found.add(hex.toLowerCase())
    }
    expect(
      Array.from(found).sort(),
      'the surviving literals no longer match ALLOWED. A NEW hex: add it with a reason, or ' +
        'route it through the palette. A hex that VANISHED: delete its row — a reason kept for ' +
        'a literal that no longer exists is how a stale exemption outlives the thing it excused.',
    ).toEqual(Object.keys(ALLOWED).sort())
  })
})
