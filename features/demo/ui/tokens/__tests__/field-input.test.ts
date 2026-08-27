import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { fieldInputStyle } from '@/features/demo/ui/tokens/field-input'
import { palette, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * U2.1 — the ONE field-input recipe (matrix A72).
 *
 * Every expectation below is composed from `tokens/palette.ts` and `tokens/scale.ts`, NEVER
 * from `fieldInputStyle`'s own output. That is what makes them falsifiable: with the
 * expectation read off the function under test, re-pointing the recipe at a different token
 * moves both sides of the comparison and the file stays green (the SURVIVED shape U1.2's
 * `glass-card-recipe.test.tsx` measured twice). Two modules, two sides.
 */
const c = palette[scheme]

describe('fieldInputStyle (U2.1 / A72)', () => {
  it('transcribes the phone TextInput geometry (TextInput.tsx:166-173)', () => {
    expect(fieldInputStyle()).toEqual({
      // `width: '100%'` is the demo's own: RN's TextInput fills its flex parent, CSS's does
      // not. All four deleted copies carried it and every consumer depends on it.
      width: '100%',
      borderRadius: radius.md, // Layout.borderRadius.md = 8
      border: `1px solid ${c.border}`, // borderWidth: 1 + the precedence default
      background: c.background,
      color: c.text,
      fontSize: 16, // Typography.fontSize.base; §4.9 keeps 16 a literal, there is no type scale module
      padding: spacing.md, // paddingHorizontal + paddingVertical = Layout.spacing.md = 16
      minHeight: touchTarget.min, // Layout.touchTarget.min = 44
      // The demo's own: CSS paints a focus ring, RN does not. It is only safe because the
      // `focused` branch below paints the border instead — deleting one without the other
      // leaves a keyboard visitor with no focus indicator at all.
      outline: 'none',
    })
  })

  // `TextInput.tsx:70-75`: isDisabled -> disabled; else error -> error; else isFocused ->
  // primary; else border. The pairs matter more than the singles: a mutation that reorders
  // two arms is invisible to four one-state assertions.
  it('resolves the border colour by the phone precedence disabled > error > focused > border', () => {
    const borderOf = (s: Parameters<typeof fieldInputStyle>[0]) => fieldInputStyle(s).border
    expect(borderOf(undefined)).toBe(`1px solid ${c.border}`)
    expect(borderOf({ focused: true })).toBe(`1px solid ${c.primary}`)
    expect(borderOf({ error: true })).toBe(`2px solid ${c.error}`)
    expect(borderOf({ disabled: true })).toBe(`1px solid ${c.disabled}`)
    expect(borderOf({ error: true, focused: true })).toBe(`2px solid ${c.error}`)
    expect(borderOf({ disabled: true, focused: true })).toBe(`1px solid ${c.disabled}`)
    // Disabled wins the COLOUR, and `error && styles.inputError` still thickens the edge —
    // the phone's style array applies the width unconditionally on `error` (`:78-90`).
    expect(borderOf({ disabled: true, error: true })).toBe(`2px solid ${c.disabled}`)
  })

  it('spends textSecondary on a disabled field, deliberately NOT disabledText', () => {
    expect(fieldInputStyle({ disabled: true }).color).toBe(c.textSecondary)
    // `TextInput.tsx:55-66` and matrix A72: disabledText measures 2.54/3.57 against
    // textSecondary's 4.83/7.30, and a disabled field here carries data the analyst reads.
    expect(fieldInputStyle({ disabled: true }).color).not.toBe(c.disabledText)
  })

  it('never dims the fill: the disabled and error states keep colors.background (DEF-UI-011)', () => {
    for (const state of [{ disabled: true }, { error: true }, { focused: true }] as const) {
      expect(fieldInputStyle(state).background).toBe(c.background)
      expect(fieldInputStyle(state).background).not.toBe(c.backgroundSecondary)
    }
  })
})

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/** §4.7: case-insensitive, whitespace-stripped — the same `norm` the two other source scans use. */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

/**
 * The retired recipe, as it was spelled in all five places (`_shared.tsx:188`,
 * `AddressAutocomplete.tsx:36`, `IncidentLocationFields.tsx:88`, `NewCaseModal.tsx:53`,
 * `SubmissionScreen.tsx:148`): `fontSize: 15` immediately beside `padding: '11px 12px'`.
 * Both key orders, because a re-paste can arrive either way.
 *
 * KNOWN LIMIT, stated rather than papered over: this catches the OLD recipe pasted back, not
 * a fresh copy typed in the NEW values. The durable half of that invariant is behavioural and
 * lives in `ui/__tests__/field-input-recipe.test.tsx`, which drives every consumer's DOM.
 * `padding: '11px 12px'` alone is NOT bannable — `Dropdown.tsx:73` (a picker option row, U2.4)
 * and `DvrInfoScreen.tsx:142` (a checkbox chip, U2.4) both spell it and neither is an input.
 */
const RETIRED_RECIPE: ReadonlyArray<[order: string, needle: string]> = [
  ['fontSize before padding', "fontsize:15,padding:'11px12px'"],
  ['padding before fontSize', "padding:'11px12px',fontsize:15"],
]

describe('the field-input recipe exists exactly once', () => {
  it('finds no re-declaration of the retired 15/11px-12px input recipe under ui/', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(UI_ROOT)) {
      const text = norm(readFileSync(file, 'utf8'))
      for (const [order, needle] of RETIRED_RECIPE) {
        if (text.includes(needle)) {
          offenders.push(`${relative(UI_ROOT, file).split(sep).join('/')} re-declares the field-input recipe (${order}) — call fieldInputStyle() instead`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
