import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { CheckboxBox, RadioOption, UNCHECKED_MARK_EDGE } from '@/features/demo/ui/controls/choice-controls'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, touchTarget, withAlpha } from '@/features/demo/ui/tokens/scale'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

const LINK = jsdomColor(colors.link)
// F27: the unchecked/unselected edge is `textTertiary`, NOT `colors.border`. Composed from the
// exported constant so this pin moves WITH the control rather than freezing a hex — and the
// RATIO is bounded at that same constant in `palette-contrast.test.ts` (row 1.4.11-mark), which
// is what a hex equality could never see: the shipped `colors.border` measured 1.33:1.
const UNCHECKED = jsdomColor(UNCHECKED_MARK_EDGE)

function radio(selected: boolean, direction: 'row' | 'column' = 'row') {
  // Scoped to THIS render's container: several cases below render more than one option, and a
  // bare `screen.getByRole('radio')` throws "found multiple" the moment they do.
  const utils = render(
    <RadioOption label="Real Time" selected={selected} onSelect={vi.fn()} direction={direction} />,
  )
  const row = utils.container.querySelector('[role="radio"]') as HTMLElement
  return {
    ...utils,
    row,
    ring: row.querySelector('[data-radio-ring]') as HTMLElement,
    dot: row.querySelector('[data-radio-dot]') as HTMLElement | null,
    label: row.querySelector('[data-radio-label]') as HTMLElement,
  }
}

/**
 * A74 — the selected treatment is `colors.link` on ALL FOUR parts. DEF-UI-018's third instance:
 * the phone measured `primary` at 3.46:1 as the label against the very tint this branch paints,
 * and 2.81:1 as the ring and border, which are the only visual carriers of the selected state
 * (`RadioGroup.tsx:60-68`). `link` clears both at 6.86 dark.
 *
 * The ratio itself is NOT re-measured here — `palette-contrast.test.ts` row 10 already bounds
 * `link` >= 4.5 on every dark tier, and U2.2's consume-me (R10) names a second assertion of it
 * as a tautology. What these pin is that this control reaches for that token on every part.
 */
describe('RadioOption — the selected treatment (A74)', () => {
  it('lights the border, the ring, the dot AND the label with `link`', () => {
    const { row, ring, dot, label } = radio(true)
    expect(row.style.borderColor).toBe(LINK)
    expect(ring.style.borderColor).toBe(LINK)
    expect(dot!.style.backgroundColor).toBe(LINK)
    expect(label.style.color).toBe(LINK)
  })

  it('leaves an unselected option on `border` + `text`, with no dot at all', () => {
    const { row, ring, dot, label } = radio(false)
    expect(row.style.borderColor).toBe(UNCHECKED)
    expect(ring.style.borderColor).toBe(UNCHECKED)
    expect(dot).toBeNull()
    expect(label.style.color).toBe(jsdomColor(colors.text))
  })

  /**
   * The HUE change the plan's row calls out: the demo washed with `primary`
   * (`rgba(43,140,193,0.08)`), the phone washes with `primaryLight`
   * (`rgba(75,163,212,0.08)`, `RadioGroup.tsx:75`). Composed through `withAlpha` so the pin
   * moves with the token instead of freezing a rendered literal.
   */
  it('washes the selected row with primaryLight at 8%, not primary', () => {
    expect(radio(true).row.style.backgroundColor).toBe(
      jsdomColor(withAlpha(colors.primaryLight, 0.08)),
    )
    expect(radio(true).row.style.backgroundColor).not.toBe(
      jsdomColor(withAlpha(colors.primary, 0.08)),
    )
  })

  it('carries the phone geometry — 44 floor, radius md, 20px ring, 10px dot', () => {
    const { row, ring, dot } = radio(true)
    expect(row.style.minHeight).toBe(`${touchTarget.min}px`)
    expect(row.style.borderRadius).toBe(`${radius.md}px`)
    expect(row.style.padding).toBe('8px 16px')
    expect(ring.style.width).toBe('20px')
    expect(ring.style.borderWidth).toBe('2px')
    expect(dot!.style.width).toBe('10px')
  })

  /**
   * `flexShrink: 1` (`RadioGroup.tsx:175-191`) is inert at two-up and load-bearing at three-up:
   * with the ring, its margin and the 16px side paddings a 3-up group leaves ~39px of text
   * budget, and without it the label overflows under the neighbour's border.
   */
  it('lets the label shrink, and shares the row evenly only when asked', () => {
    expect(radio(true).label.style.flexShrink).toBe('1')
    // jsdom expands the `flex: 1` shorthand to its longhand triple; assert what it stores.
    expect(radio(true, 'row').row.style.flex).toBe('1 1 0%')
    expect(radio(true, 'row').row.style.width).toBe('')
    expect(radio(true, 'column').row.style.width).toBe('100%')
    expect(radio(true, 'column').row.style.flex).toBe('')
  })
})

/**
 * A75 — the canonical 24x24 box. The three states are the three `aria-checked` values, so a
 * consumer needs no second vocabulary; `mixed` is FILLED with a dash, not empty
 * (`Checkbox.tsx:36-37`).
 */
describe('CheckboxBox (A75)', () => {
  const box = (checked: boolean | 'mixed') => {
    const { container } = render(<CheckboxBox checked={checked} />)
    return container.querySelector('[data-checkbox-box]') as HTMLElement
  }

  it('is 24x24 at radius sm with a 2px ring', () => {
    const el = box(false)
    expect(el.style.width).toBe('24px')
    expect(el.style.height).toBe('24px')
    expect(el.style.borderRadius).toBe(`${radius.sm}px`)
    expect(el.style.borderWidth).toBe('2px')
  })

  it('fills border AND background with `primary` when checked, and marks in `onPrimary`', () => {
    const el = box(true)
    expect(el.style.borderColor).toBe(jsdomColor(colors.primary))
    expect(el.style.backgroundColor).toBe(jsdomColor(colors.primary))
    expect(el.style.color).toBe(jsdomColor(colors.onPrimary))
    expect(el.textContent).toBe('✓')
  })

  it('reads `mixed` as partially ON — filled, with the U+2212 minus sign', () => {
    const el = box('mixed')
    expect(el.style.backgroundColor).toBe(jsdomColor(colors.primary))
    expect(el.textContent).toBe('−')
    expect(el.textContent).not.toBe('-') // a hyphen is a different glyph and reads thinner
  })

  /**
   * The unfilled box is OPAQUE `colors.background` (`Checkbox.tsx:62`), not transparent. On the
   * export card that box sits on a glass gradient, so "transparent" and "filled" read as two
   * different controls rather than two states of one.
   */
  it('leaves an unchecked box opaque on `background` with a `border` ring and no glyph', () => {
    const el = box(false)
    expect(el.style.backgroundColor).toBe(jsdomColor(colors.background))
    expect(el.style.borderColor).toBe(jsdomColor(UNCHECKED_MARK_EDGE))
    expect(el.textContent).toBe('')
  })

  it('sizes the glyph at 16/700 — the mark, not the box, is what a screen shows', () => {
    const el = box(true)
    expect(el.style.fontSize).toBe('16px')
    expect(el.style.fontWeight).toBe('700')
  })
})

/**
 * THE ADOPTION SCAN (integration finding I-4's shape, applied to this package's own recipes).
 *
 * The render pins above prove the recipe. They cannot prove that a CONSUMER still uses it: a
 * site that re-inlines its own ring is invisible to every one of them, which is exactly the
 * hole I-4 measured for `buttonStyle` (probe U2.2-out SURVIVED, whole suite green).
 *
 * The predicate is deliberately narrow — "declares the ARIA role, therefore is this control" —
 * rather than a colour needle, because the colours a re-inlined copy would use are the
 * pre-port literals the banned-literal scan exempts as too common.
 *
 * EVERY EXEMPTION IS A REVIEWABLE ACT and carries the reason plus the package that owns it.
 * There are two, both genuinely different controls on the phone as well as here.
 */
describe('no hand-rolled copy of either control survives', () => {
  const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

  /** The two roles this module owns, and the component each one must render. */
  const CONTROLS = { radio: 'RadioOption', checkbox: 'CheckboxBox' } as const
  type Role = keyof typeof CONTROLS

  /**
   * Controls the phone ALSO hand-rolls, so importing the shared recipe would be wrong.
   *
   * KEYED BY `<role>:<path>`, not by path (W2 review F32). Both entries are CHECKBOX rulings,
   * and a file-keyed exemption silently excused those files from the RADIO scan too: the review
   * planted a hand-rolled radio in `DvrInfoScreen.tsx` and the whole suite stayed green
   * (290 files / 3,881), while the identical block in a non-exempt file was caught. An
   * exemption may only excuse the control it was argued for.
   */
  const EXEMPT: ReadonlyMap<`${Role}:${string}`, string> = new Map([
    [
      'checkbox:screens/export/ExportLocationRow.tsx',
      // 22px circle, 2px ring — the phone hand-rolls it too (`ExportLocationRow.tsx:121-136`)
      // rather than using its shared `Checkbox`. A row mark, not a checkbox.
      'circular row indicator, hand-rolled on the phone as well',
    ],
    [
      'checkbox:screens/DvrInfoScreen.tsx',
      // A 16px box inside a 2-up pill. The phone uses two stacked shared `Checkbox` rows
      // (`app/(form)/dvr-information.tsx:318-329`), so porting it is a LAYOUT change, not a
      // recipe adoption — and `DvrInfoScreen.tsx` is U6.4b's file (matrix B.5 row 41), open
      // concurrently by U3.2 in this wave.
      'checkbox pill — a layout port, owned by U6.4b',
    ],
  ])

  function sourceFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') out.push(...sourceFiles(full))
      } else if (/\.tsx$/.test(entry.name)) out.push(full)
    }
    return out
  }

  /**
   * The needle is the JSX OPEN TAG (`<RadioOption`), not the bare identifier.
   *
   * SURVIVED PROBE, and the reason this comment exists. Probe P7 replaced `<RadioOption` in
   * `_pane-chrome.tsx` with a hand-rolled `<button role="radio" style={{ border: '1px solid
   * #2B8CC1' }}` — the exact regression this scan exists for — and the first draft's
   * `text.includes('RadioOption')` stayed GREEN, because the file still carried the now-unused
   * `import { RadioOption }` line and two mentions in a docblock. That is the string-presence
   * trap the mutation-testing skill names: the scan was asserting that a file MENTIONS the
   * component, which a dead import satisfies forever. `tsc` would not have caught it either —
   * this repo sets no `noUnusedLocals` (integration finding I-5).
   *
   * Requiring the role NOT to appear at all would be sharper still for the radio, but it is
   * wrong for the checkbox: `ExportCaseCard`'s pressable legitimately owns `role="checkbox"`
   * while `CheckboxBox` paints an `aria-hidden` box beneath it. "Declares the role, therefore
   * renders the component" is the predicate that holds for both.
   */
  /** Would this file be reported for this role, exemptions aside? The one predicate. */
  function reported(role: Role, text: string): boolean {
    return text.includes(`role="${role}"`) && !text.includes(`<${CONTROLS[role]}`)
  }

  function offenders(role: Role): string[] {
    const found: string[] = []
    for (const file of sourceFiles(UI_ROOT)) {
      const rel = relative(UI_ROOT, file).split(sep).join('/')
      if (rel === 'controls/choice-controls.tsx' || EXEMPT.has(`${role}:${rel}`)) continue
      if (reported(role, readFileSync(file, 'utf8'))) found.push(rel)
    }
    return found
  }

  it('every radio site renders `RadioOption`', () => {
    expect(
      offenders('radio'),
      'import RadioOption from ui/controls/choice-controls instead of re-inlining the ring',
    ).toEqual([])
  })

  it('every checkbox site renders `CheckboxBox`', () => {
    expect(
      offenders('checkbox'),
      'import CheckboxBox from ui/controls/choice-controls instead of re-inlining the box',
    ).toEqual([])
  })

  /**
   * The exemption list is itself pinned, and the predicate is **"would this file be reported
   * were the entry removed?"** — not "does the file still declare the role" (W2 review F32).
   *
   * The old question could never go false through an ADOPTION: `ExportCaseCard` keeps
   * `role="checkbox"` on its pressable while `CheckboxBox` paints beneath it, by design, so a
   * file that adopts the recipe still declares the role and its exemption would outlive its
   * reason permanently. Deferral ledger §100's close condition depends on this test firing, so
   * the predicate has to be the one that actually fires.
   */
  it('carries no dead exemptions', () => {
    // `Array.from`, not a spread: tsconfig targets es5 and spreading a Map iterator there needs
    // `--downlevelIteration` (the same trap `tokens/scale.ts:97-99` records). Vitest transpiles
    // it happily; `tsc` does not.
    const dead = Array.from(EXEMPT.keys()).filter((key) => {
      const [role, rel] = [key.slice(0, key.indexOf(':')) as Role, key.slice(key.indexOf(':') + 1)]
      return !reported(role, readFileSync(join(UI_ROOT, ...rel.split('/')), 'utf8'))
    })
    expect(dead, 'this entry excuses nothing — the file would not be reported. Drop it.').toEqual([])
  })
})

/**
 * W2 F29 — the 3-up profile group overflowed its pane by ~42px, with the SELECTED `Canvas`
 * chip clipped at the frame edge (verification captures `10-settings/12-15`).
 *
 * `flexShrink: 1` alone is a no-op on a flex item whose content is one unbreakable word: the
 * default `min-width: auto` resolves to that word's min-content width, and shrink can never go
 * below it. `minWidth: 0` is what releases the floor. Two docblocks asserted the opposite and
 * are corrected in the same commit.
 *
 * WHAT THIS PIN CAN AND CANNOT DO, stated plainly: **jsdom performs no layout**, so the
 * overflow itself is not observable here and the honest evidence is the verification re-cut of
 * the four settings shots. What IS observable, and what a revert would break, is that both keys
 * are present on every label at 3-up — `flexShrink` without `minWidth` is precisely the shipped
 * defect, so the pair is the falsifiable part.
 */
describe('RadioOption at 3-up (W2 F29)', () => {
  const LABELS = ['Forensic', 'Limited', 'Canvas']

  it('gives every label BOTH shrink keys — `flexShrink` alone is the shipped defect', () => {
    const { container } = render(
      // The pane's own container: `FormFieldsPane`'s row, at the 378px phone-frame width.
      <div role="radiogroup" style={{ display: 'flex', gap: 8, width: 378 - 32 }}>
        {LABELS.map((l) => (
          <RadioOption key={l} label={l} selected={l === 'Canvas'} onSelect={vi.fn()} />
        ))}
      </div>,
    )
    const labels = Array.from(container.querySelectorAll('[data-radio-label]')) as HTMLElement[]
    expect(labels).toHaveLength(3)
    // A plain index loop, not `labels.entries()`: tsconfig targets es5 and iterating an array
    // iterator there needs `--downlevelIteration` (`tokens/scale.ts:97-99`'s trap). Vitest
    // transpiles it happily; the cold `tsc` gate does not.
    labels.forEach((el, i) => {
      expect(el.style.flexShrink, LABELS[i]).toBe('1')
      expect(el.style.minWidth, LABELS[i]).toBe('0px')
    })
  })

  it('does not truncate — the phone wraps to two lines rather than ellipsing', () => {
    const { container } = render(
      <RadioOption label="Forensic" selected={false} onSelect={vi.fn()} />,
    )
    const label = container.querySelector('[data-radio-label]') as HTMLElement
    expect(label.style.whiteSpace).toBe('')
    expect(label.style.textOverflow).toBe('')
  })
})
