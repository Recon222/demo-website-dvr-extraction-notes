import { describe, it, expect } from 'vitest'

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
