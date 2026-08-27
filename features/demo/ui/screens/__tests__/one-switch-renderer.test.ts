import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * U2.3 — anti-re-drift: `screens/_shared.tsx`'s `Toggle` is the ONLY switch renderer.
 *
 * Before this package there were four (demo §4.7 leverage point 4, matrix A76): `Toggle` plus
 * three verbatim re-implementations of its track — `FormFieldsPane`'s `RowSwitch`,
 * `TimeOffsetScreen`'s DST row and `GpsCaptureControl`'s geocode toggle. Every one drifted
 * separately; the off-track colour had to be re-based in four places, `aria-hidden` on the thumb
 * existed in one of the four, and `describedBy` in two.
 *
 * Plan §9 clause 7 states the end condition as a census shape — "one switch renderer (not four)" —
 * so the source IS the invariant here, exactly as it is for `glass-tokens.test.ts`'s banned
 * literals. jsdom renders no CSS and no behavioural test can observe "this control was written
 * out a second time"; a rendered fourth switch passes every other test in the suite.
 *
 * Like that guard this reads source TEXT, so a code COMMENT quoting `role="switch"` outside
 * `_shared.tsx` trips it too. That is the intended strictness: name the component, not the role.
 */

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/** The one file allowed to declare a switch. Adding a path here is a reviewable act. */
const SWITCH_RENDERER = 'screens/_shared.tsx'

/** `role="switch"`, `role='switch'`, `role={'switch'}` and the `role: 'switch'` prop-object form. */
const DECLARES_SWITCH = /\brole\s*[=:]\s*\{?\s*(['"`])switch\1/

/**
 * The track's own geometry — `46×28` in one style object. `\b` after 46 so `width: 460`
 * (`ExitDialog.tsx:54`) is not a hit. Whitespace is stripped first, matching the sibling guard's
 * `norm`, so a reflow across lines cannot walk past it.
 */
const DECLARES_TRACK = /width:46,height:28|height:28,width:46/

/** Every .ts/.tsx under ui/, minus `__tests__` dirs — asserting a literal in a test is a pin. */
function sourceFiles(): string[] {
  return readdirSync(UI_ROOT, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name))
    .filter((full) => !relative(UI_ROOT, full).split(sep).includes('__tests__'))
}

const rel = (full: string): string => relative(UI_ROOT, full).split(sep).join('/')

describe('one switch renderer (U2.3 / A76 / plan §9 clause 7)', () => {
  it('has files to scan at all (guard against a walker that silently finds nothing)', () => {
    const files = sourceFiles()
    expect(files.length).toBeGreaterThan(100)
    expect(files.map(rel)).toContain(SWITCH_RENDERER)
  })

  it('declares role="switch" in exactly one file — screens/_shared.tsx', () => {
    const offenders = sourceFiles()
      .filter((full) => rel(full) !== SWITCH_RENDERER)
      .filter((full) => DECLARES_SWITCH.test(readFileSync(full, 'utf8')))
      .map(rel)
    expect(
      offenders,
      'import `Toggle` from screens/_shared instead — `hideLabel` covers a host that draws its own label',
    ).toEqual([])
  })

  it('draws the 46×28 switch track in exactly one file — screens/_shared.tsx', () => {
    const offenders = sourceFiles()
      .filter((full) => rel(full) !== SWITCH_RENDERER)
      .filter((full) => DECLARES_TRACK.test(readFileSync(full, 'utf8').replace(/\s+/g, '')))
      .map(rel)
    expect(offenders, 'the track geometry lives once, inside `Toggle`').toEqual([])
  })
})
