import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { glassWell } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { flattenOver, radius } from '@/features/demo/ui/tokens/scale'

import { Calendar } from '@/features/demo/ui/inputs/Calendar'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
import { TimeWheel } from '@/features/demo/ui/inputs/TimeWheel'

/**
 * U2.4 — the `recessed` well, asserted on the DOM of every consumer, not on the fragment alone.
 *
 * Same shape and the same reason as `glass-card-recipe.test.tsx` (U1.2): the well's top and
 * bottom edges are the parts an override erases SILENTLY. The difference is the fragment's
 * SHAPE — `glassWell` is the lit-edge ruling's longhands-only form (no `border`, no
 * `borderColor` key), so a consumer that writes either shorthand after the spread fails on the
 * FIRST paint instead of on the second. `partner-lit-edge-ruling.md` §1/§3 measured that in
 * jsdom and in Chromium; the negative controls below are this package's tripwire for it.
 *
 * The three consumers are the three surfaces the phone punches a well into — `Picker`'s option
 * list (`Picker.tsx:179-188`), `TimePicker`'s drum (`TimePicker.styles.ts:227-242`) and the
 * calendar, which had no core at all (`DateTimePicker.tsx:288-298`). All three set BOTH
 * `borderTopColor` and `borderBottomColor` to `recessed.highlightTop`: a well's lip is in
 * shadow at the top AND the bottom, which is what makes it read as a hole rather than a tile.
 *
 * Expectations are composed from `tokens/glass-tiers.ts`, NEVER from the fragment under test —
 * reading them off `glassWell` would make every line below pass over a fragment re-pointed at
 * the wrong tier.
 */

const tier = GLASS_TIER[scheme]

/** What jsdom stores for a colour written into a `border-top-color` declaration. */
function normColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.borderTopColor = value
  return probe.style.borderTopColor
}

/** What jsdom stores for a `background` shorthand carrying a gradient (it lands on `background-image`). */
function normGradient(value: string): string {
  const probe = document.createElement('div')
  probe.style.background = value
  return probe.style.backgroundImage
}

const WELL_GRADIENT = normGradient(
  `linear-gradient(180deg,${tier.recessed.gradient[0]},${tier.recessed.gradient[1]})`,
)
const WELL_BORDER = normColor(tier.recessed.border)
const WELL_LIP = normColor(tier.recessed.highlightTop)

/** Assert one element carries the whole four-part composition, edges included. */
function expectWell(el: HTMLElement, where: string): void {
  expect(el.style.backgroundImage, `${where}: the well's gradient`).toBe(WELL_GRADIENT)
  expect(el.style.borderLeftColor, `${where}: the well's side border`).toBe(WELL_BORDER)
  expect(el.style.borderRightColor, `${where}: the well's side border`).toBe(WELL_BORDER)
  expect(el.style.borderTopColor, `${where}: the well's shadowed TOP lip`).toBe(WELL_LIP)
  expect(el.style.borderBottomColor, `${where}: the well's shadowed BOTTOM lip`).toBe(WELL_LIP)
  expect(el.style.borderTopWidth, `${where}: 1px`).toBe('1px')
  expect(el.style.boxShadow, `${where}: the well's inset`).toContain('inset')
}

describe('the recessed well fragment (A39 / A59)', () => {
  it('carries the tier verbatim — gradient, sides, BOTH lips, inset, radius', () => {
    expect(glassWell).toEqual({
      borderRadius: radius.lg,
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightColor: tier.recessed.border,
      borderLeftColor: tier.recessed.border,
      borderTopColor: tier.recessed.highlightTop,
      borderBottomColor: tier.recessed.highlightTop,
      background: `linear-gradient(180deg,${tier.recessed.gradient[0]},${tier.recessed.gradient[1]})`,
      boxShadow: `inset 0 1px 0 ${tier.recessed.innerShadow}`,
    })
  })

  /**
   * THE LIT-EDGE RULE, as a structural pin. `partner-lit-edge-ruling.md` §1: a glass fragment
   * carries ONLY longhands. The measured reason is in §3's matrix — every other shape has a
   * cell where an override is correct on the first paint and wrong on the second, and the
   * demo's ~95 style pins all read the first paint. This is the one shape with no such trap.
   *
   * Not a tautology with the `toEqual` above: that one moves WITH any key added to the
   * fragment (a reviewer updating it is one keystroke), this one names the two keys that must
   * never exist, so re-introducing `border: GLASS.borderSoft` reds a line whose message says
   * why.
   */
  it('carries NO border shorthand and NO borderColor — the lit-edge fragment shape', () => {
    expect(Object.keys(glassWell)).not.toContain('border')
    expect(Object.keys(glassWell)).not.toContain('borderColor')
    expect(Object.keys(glassWell)).not.toContain('borderTop')
  })
})

describe('every well consumer paints the whole recipe', () => {
  it('the time drum (TimeWheel — phone TimePicker.styles.ts:227-242)', () => {
    const { container } = render(<TimeWheel value={{ h: 0, mi: 0, s: 0 }} onChange={vi.fn()} />)
    expectWell(container.firstElementChild as HTMLElement, 'TimeWheel drum')
  })

  it('the option list (Dropdown — phone Picker.tsx:179-188)', () => {
    render(<Dropdown value="a" onChange={vi.fn()} options={['a', 'b']} label="Pick" />)
    fireEvent.click(screen.getByRole('button', { name: /Pick/ }))
    expectWell(screen.getByRole('menu'), 'Dropdown option list')
  })

  it('the calendar, which had no core at all (Calendar — phone DateTimePicker.tsx:288-298)', () => {
    const { container } = render(
      <Calendar
        viewYear={2024}
        viewMonth={3}
        selected={null}
        today={{ y: 2024, mo: 3, d: 4 }}
        onPrevMonth={vi.fn()}
        onNextMonth={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    )
    expectWell(container.firstElementChild as HTMLElement, 'Calendar well')
  })
})

/**
 * The two negative controls the ruling asks for (§4 item 1). Both prove the fragment's SHAPE,
 * not a consumer's behaviour — they mutate a spread here in the test and assert jsdom drops the
 * lips, which is what makes the three pins above meaningful rather than decorative.
 */
describe('the shapes a consumer must never write', () => {
  it('a `border:` shorthand after the spread erases both lips ON THE FIRST PAINT', () => {
    const { container } = render(
      <div style={{ ...glassWell, border: `1px solid ${colors.error}` }} data-probe />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderTopColor).not.toBe(WELL_LIP)
    expect(el.style.borderBottomColor).not.toBe(WELL_LIP)
  })

  it('a `borderColor:` shorthand after the spread erases both lips ON THE FIRST PAINT', () => {
    const { container } = render(
      <div style={{ ...glassWell, borderColor: colors.error }} data-probe />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderTopColor).not.toBe(WELL_LIP)
    expect(el.style.borderBottomColor).not.toBe(WELL_LIP)
  })

  it('the four colour LONGHANDS survive a spread — the one override shape that is allowed', () => {
    const { container } = render(
      <div
        style={{ ...glassWell, borderRightColor: colors.error, borderLeftColor: colors.error }}
        data-probe
      />,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderTopColor).toBe(WELL_LIP)
    expect(el.style.borderBottomColor).toBe(WELL_LIP)
    expect(el.style.borderLeftColor).toBe(normColor(colors.error))
  })
})

/**
 * Contrast row 33 bounds `recessed` against the SHEET TIER's values. That is the phone's
 * ground and U4.1's; it is not the ground the demo paints on today, because `PickerSheet`'s
 * panel is still `T.raised` (`inputs/PickerSheet.tsx:66`). This measures the well where it
 * actually lands, so "the well went flat against the sheet it is IN" is observable one package
 * before U4.1 re-tiers that panel — and reds the day the panel moves without the well.
 */
describe('the well is a well on the ground the demo actually paints it on', () => {
  /**
   * NORMALISED TO `rgb()` FIRST, and this is not tidiness — it is a SURVIVED probe.
   *
   * `deltaE` parses with `/\d+/g`, so handing it the raw `#0e3965` yielded `[0, 3965, NaN]`:
   * `e` is not a digit, and `#0e3965` reads as the two numbers `0` and `3965`. The pin was
   * measuring against a constant nonsense colour and passed at baseline by luck. Probe P11
   * (retuning `recessed` back to the phone's shipped near-black `rgb(6,12,22)`, a real dE 31.56
   * against this panel) SURVIVED it while killing `palette-contrast.test.ts` row 33 next door —
   * which is how the defect surfaced. `normColor` runs it through jsdom, the same way every
   * other expectation in this file is normalised.
   */
  const PANEL = normColor(colors.backgroundSecondary)

  function deltaE(a: string, b: string): number {
    const lab = (c: string): [number, number, number] => {
      const [r, g, bl] = (c.match(/\d+/g) as string[]).map(Number)
      const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
      const [R, G, B] = [lin(r), lin(g), lin(bl)]
      const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
      const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
      const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
      const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
      return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
    }
    const [l1, a1, b1] = lab(a)
    const [l2, a2, b2] = lab(b)
    return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
  }

  it('holds row 33s two-sided 3-12 dE per stop against PickerSheets panel', () => {
    const offenders = tier.recessed.gradient
      .map((stop, index) => ({ index, dE: deltaE(flattenOver(stop, PANEL), PANEL) }))
      .filter(({ dE }) => dE < 3 || dE > 12)
    expect(offenders).toEqual([])
  })
})
