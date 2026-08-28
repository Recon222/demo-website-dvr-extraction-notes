import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DvrInfoScreen, type DvrInfoScreenProps } from '@/features/demo/ui/screens/DvrInfoScreen'
import type { FormFieldId } from '@/features/demo/engine/types'
import { PaneNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { colors } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'
import { severityTone } from '@/features/demo/ui/tokens/status'

/**
 * A69 retires EIGHT status-colour owners. Six are covered where they render — the two `screenData`
 * lookups and the pill in `DashboardScreen.test.tsx` / `ExportHub.test.tsx`, the artifact line in
 * `ExportHub.test.tsx`, and the recorder's two in `AudioRecorderScreen.test.tsx`. The remaining
 * two paint recipes of their own and had no render test at all; this is theirs.
 *
 * F31: this used to name `audio-levels.test.ts` for the recorder. That file covers the TONE — the
 * `'error' | 'warning' | 'neutral'` vocabulary the engine returns — and renders nothing, so it
 * sees no colour. The paint is `STATUS_TONE_COLOR`'s, and it is pinned where it renders.
 *
 * Both assert AGAINST the tokens, never against a hex: a literal would stay green through exactly
 * the re-point these pins exist to catch.
 */

/** jsdom rewrites an inline hex to `rgb(r, g, b)` on read-back. */
const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`

const nav = { nextLabel: "Next: Test Step", onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

/**
 * `getRetentionStatus`: <=0 OVERWRITTEN · <=3 CRITICAL · <=7 WARNING · else SAFE.
 *
 * Returns the `unmount` with the element: jsdom shares ONE document per test file, so a loop
 * that renders four screens without unmounting leaves four badges in it and `getByText` then
 * throws "found multiple elements" on the second pass.
 */
function retentionBadgeFor(daysUntilOverwritten: number): { pill: HTMLElement; unmount: () => void } {
  const form = blankLocationForm()
  const { unmount } = render(
    <DvrInfoScreen
      dvr={{ ...form.dvr, firstRecordedDate: '2025-01-01' }}
      retention={{
        totalRetention: 90,
        scopes: [{ label: 'Scope 1', daysUntilOverwritten, overwrittenDate: '2025-04-01' }],
      }}
      onChange={vi.fn()}
      isFieldVisible={() => true}
      {...nav}
    />,
  )
  return { pill: screen.getByText(/^(Safe|Warning|Critical|Overwritten)$/), unmount }
}

describe('the retention pill (A69 owner 3 — phone RETENTION_SEVERITY)', () => {
  it('maps all four bands, with OVERWRITTEN on the RED pair and not on a neutral', () => {
    // Phone `retention-calculation.ts:34-38`. `OVERWRITTEN` had been the neutral fallback there,
    // which painted the one TERMINAL state as if it carried no severity while the strictly
    // less-bad `CRITICAL` got full red.
    const cases: [days: number, label: string, severity: 'success' | 'warning' | 'error'][] = [
      [30, 'Safe', 'success'],
      [5, 'Warning', 'warning'],
      [2, 'Critical', 'error'],
      [0, 'Overwritten', 'error'],
    ]
    for (const [days, label, severity] of cases) {
      const { pill, unmount } = retentionBadgeFor(days)
      const tone = severityTone(severity)
      expect(pill).toHaveTextContent(label)
      expect(pill).toHaveStyle({ color: tone.color, borderColor: tone.borderColor })
      // Phone `dvr-information.tsx:438`: a 15% TINT of the accent, not the badge's opaque
      // `*Light` fill — this pill is deliberately not `statusBadgeStyle`.
      expect(pill.style.background).toBe(withAlpha(tone.borderColor, 0.15))
      expect(pill.style.background).not.toBe(rgb(tone.background))
      unmount()
    }
  })

  it('takes the phone`s own geometry for THIS badge — radius sm (4), not the pill`s lg (12)', () => {
    const { pill } = retentionBadgeFor(2)
    // Phone `dvr-information.tsx:547-556`: `borderRadius.sm`, `spacing.xs`/`spacing.sm` padding,
    // `fontSize.xs`, semibold. Was: radius 6, `3px 8px`, 11px, weight 700.
    expect(pill).toHaveStyle({ borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: '600' })
    expect(pill).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid' })
  })

  it('never paints the label with the saturated accent (C.3 rule 1)', () => {
    const { pill } = retentionBadgeFor(0)
    // NEGATIVE stays in palette terms — it names the token that must NOT appear, and a seam
    // re-point must not silently redefine what "wrong" means (integrator's ruling).
    expect(pill.style.color).not.toBe(rgb(colors.error))
    // POSITIVE reads the SEAM (W3 F55). Spelled `colors.errorOnLight`, a legitimate re-point of
    // `severityTone` would red this line naming a palette token, and the cheapest repair is to
    // retype the new token — ratifying the change with no oracle. That is the W2/F26 pin class.
    expect(pill.style.color).toBe(rgb(severityTone('error').color))
  })
})

/**
 * U6.4b's plan-row pin: *"a pin that no local `STATUS` map survives"*.
 *
 * `DvrInfoScreen`'s was A69's fourth status-colour owner (matrix row 41 names it at `:20-26`).
 * It is already gone — U3.2 killed it, and `RETENTION_SEVERITY` above is what replaced it — so
 * this is a RATCHET, not a fix: it makes the re-growth of a private status vocabulary in any of
 * U6.4b's four files a red test rather than a review catch.
 *
 * ## Why a SOURCE scan, and why this shape
 *
 * The behavioural block above already proves the retention pill resolves through `severityTone`.
 * What it cannot see is a SECOND, unrendered-in-test map growing beside it — which is exactly
 * how the private trio survived a whole wave (W2 F26): the surfaces and the seam agreed on the
 * values while sharing no source, and no scheduled check observed the divergence.
 *
 * The pattern is "an object literal holding TWO OR MORE severity reads", not "the identifier
 * `STATUS`". A renamed map is the same defect, and a name-keyed guard is the third recurrence of
 * one class in this campaign (W0 F2, W1 F16, W2 F23 — all hand-typed rosters that missed the
 * member which drifted). Two, not one, because a single `colors.error` read is a legitimate
 * one-off; a table of them is a vocabulary.
 */
describe('A69 — no local status-colour map survives in U6.4b`s four files', () => {
  const OWNED = ['TimeOffsetScreen', 'SyncStatusCard', 'CompletionScreen', 'DvrInfoScreen'] as const

  const read = (name: string): string =>
    readFileSync(join(process.cwd(), 'features', 'demo', 'ui', 'screens', `${name}.tsx`), 'utf8')
      .replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

  /**
   * Every object literal in the source, brace-BALANCED — W3 review **F54**.
   *
   * Was `/\{[^{}]*\}/g`, which by construction cannot match a literal containing another literal:
   * the character class excludes the very brace that opens the nested one. So the outer table of
   * `{ SAFE: { fill: colors.successLight } , CRITICAL: { fill: colors.errorLight } }` was never a
   * candidate, and the two inner slices held one read each — under the threshold. The lane's
   * probe confirmed it: P12-nested SURVIVED.
   *
   * A depth counter is the whole fix. It yields the OUTER literal as well as the inner ones, so a
   * vocabulary split across nested entries is counted where it actually lives.
   */
  const literals = (src: string): string[] => {
    const out: string[] = []
    for (let i = 0; i < src.length; i++) {
      if (src[i] !== '{') continue
      let depth = 0
      for (let j = i; j < src.length; j++) {
        if (src[j] === '{') depth++
        else if (src[j] === '}' && --depth === 0) {
          out.push(src.slice(i, j + 1))
          break
        }
      }
    }
    return out
  }

  /**
   * A severity read, in every form this campaign has actually shipped one — **F54**.
   *
   * 1. `colors.error` — the bare name. All the old pattern saw.
   * 2. `colors.errorLight` / `warningOnLight` / `successDark` / `warningAccent` — the `*Light`
   *    family. The old `\b` after the severity name could not match these at all: `error` followed
   *    by `L` is not a word boundary. This is the form the SEAM itself is built from, so it is the
   *    form a hand-rolled copy of the seam takes.
   * 3. `c[`${severity}Light`]` — the computed template-key read. **This is W2/F26's own shape** —
   *    the literal way `severityTone` resolves a trio (`tokens/status.ts:118-127`) — so a private
   *    re-derivation copied from the seam is invisible to a scan that only reads dotted names.
   *    A ratchet citing F26 as its reason that cannot see F26's spelling is the defect F54 names.
   */
  const SEVERITY_READ =
    /(?:colors|palette|c)\s*(?:\.\s*(?:error|warning|success|info)[A-Za-z]*\b|(?:\.\s*\w+|\[[^\]]*\])*\[\s*`[^`]*\$\{[^}]*\}[A-Za-z]*`\s*\])/g

  /** Object literals holding two or more severity reads — a private trio forming. */
  const trios = (src: string): string[] =>
    literals(src).filter((block) => (block.match(SEVERITY_READ) ?? []).length >= 2)

  it('finds none — and PROVES the reader sees all FOUR shipped forms', () => {
    for (const name of OWNED) expect(trios(read(name)), name).toEqual([])

    /**
     * The planted controls. A source scan that matches nothing is indistinguishable from one that
     * is broken, and this campaign has shipped that failure three times — so the roster is
     * asserted for COMPLETENESS, not by example. Three of these four SURVIVED the lane's probes
     * against the previous predicate (F54); the flat one was the only kill.
     */
    const PLANTED: Readonly<Record<string, string>> = {
      flat: 'const STATUS = { SAFE: colors.success, CRITICAL: colors.error }',
      nested:
        'const STATUS = { SAFE: { fill: colors.successLight }, CRITICAL: { fill: colors.errorLight } }',
      light: 'const TONE = { bg: colors.warningLight, fg: colors.warningOnLight }',
      computed:
        'const tone = { background: c[`${severity}Light`], color: c[`${severity}OnLight`] }',
    }
    // Reported as a table so a failure names WHICH form went blind, rather than just a count.
    expect(
      Object.entries(PLANTED).map(([form, src]) => `${form}: ${trios(src).length > 0}`),
      'the scan can no longer see a status map in one of its shipped forms — fix the pattern',
    ).toEqual(Object.keys(PLANTED).map((form) => `${form}: true`))

    // ...and it is not simply matching everything: a lone severity read is a legitimate one-off,
    // and a table of unrelated tokens is not a severity vocabulary. Without this, a predicate that
    // returned every literal would pass the roster above.
    expect(trios('const x = { color: colors.error }'), 'one read is not a vocabulary').toEqual([])
    expect(trios('const x = { a: colors.text, b: colors.textTertiary }'), 'not severities').toEqual([])
  })

  it('routes every status colour in those files through the seam instead', () => {
    // The positive half. `DvrInfoScreen` is the one of the four that paints a severity at all,
    // and it reaches `severityTone` — not `palette` and not a table of its own.
    const src = read('DvrInfoScreen')
    expect(src).toMatch(/severityTone\(/)
    expect(src).not.toMatch(/palette\./)
  })
})

describe('PaneNote (A69 owner 5 — the settings note boxes)', () => {
  /**
   * U6.2 moved the note onto `Banner`'s DOM: box -> icon + message, so the fill and the border
   * live on `[data-pane-note]` and the foreground on the message child. These three pins are
   * U3.2's; only the QUERY moved. The values they assert are unchanged, and the two things they
   * exist to catch — the accent as text, a translucent fill — are asserted on the same
   * elements that now carry them.
   */
  const message = () => screen.getByText('Body')
  /** The note box — `[data-pane-note]`, the message's parent since the Banner-recipe port. */
  const box = () => message().parentElement as HTMLElement

  it('paints all three tones from THE severity recipe', () => {
    for (const tone of ['info', 'warning', 'success'] as const) {
      const { unmount } = render(<PaneNote tone={tone}>Body</PaneNote>)
      const expected = severityTone(tone)
      const note = box()
      expect(note).toHaveAttribute('data-pane-note', tone)
      expect(note).toHaveStyle({ backgroundColor: expected.background })
      // jsdom does not synthesize `borderColor` back from the four side longhands, so the
      // shorthand reads '' — assert per side, which also catches a PARTIAL re-tint that the
      // shorthand read structurally cannot see.
      for (const side of ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const) {
        expect(note.style[side], `${tone}: ${side}`).toBe(rgb(expected.borderColor))
      }
      expect(message()).toHaveStyle({ color: expected.color })
      unmount()
    }
  })

  it('stops spending the accent as the note`s TEXT — the 1.92-2.24:1 pairing', () => {
    render(<PaneNote tone="warning">Body</PaneNote>)
    // What it used to render: `#ffd93d` text on `rgba(255,217,61,0.09)`.
    expect(message().style.color).not.toBe(rgb(colors.warning))
    expect(message().style.color).toBe(rgb(severityTone('warning').color))
    // The fill is OPAQUE now — a translucent one composites over an unknown parent and the
    // ratio stops being measurable. The OPACITY half is asserted below in palette-independent
    // terms; this line asserts WHICH fill, so it reads the seam (F55).
    expect(box().style.backgroundColor).toBe(rgb(severityTone('warning').background))
    expect(box().getAttribute('style')).not.toContain('rgba')
  })

  it('writes border LONGHANDS only, so nothing downstream can erase a side', () => {
    render(<PaneNote tone="info">Body</PaneNote>)
    const note = box()
    expect(note).toHaveStyle({ borderWidth: '1px', borderStyle: 'solid' })
    // Neither `border:` nor `border-color:`. Both are four-side shorthands, so either one
    // written after a longhand erases it — and React writes only CHANGED keys on update.
    expect(note.getAttribute('style')).not.toMatch(/(^|;)\s*border(-color)?:/)
  })
})

/**
 * The rest of matrix row 41 — A75's checkbox, A55's nested retention box, and the two guards
 * U6.1 and U6.4a explicitly handed to this package.
 *
 * Row 41 also carries a standing constraint: *"v1 marks row 41 DEMO-BETTER on the
 * `RetentionView` derivation — do not regress the logic, only the paint."* Nothing below touches
 * the derivation, and the four-band mapping block at the top of this file is what proves it.
 */
describe('DvrInfoScreen — row 41`s paint', () => {
  const render41 = (isFieldVisible: DvrInfoScreenProps['isFieldVisible'] = () => true) => {
    const form = blankLocationForm()
    return render(
      <DvrInfoScreen
        dvr={{ ...form.dvr, firstRecordedDate: '2025-01-01', recordingSchedule: 'continuous' }}
        retention={{ totalRetention: 90, scopes: [{ label: 'Scope 1', daysUntilOverwritten: 30, overwrittenDate: '2025-04-01' }] }}
        onChange={vi.fn()}
        isFieldVisible={isFieldVisible}
        {...nav}
      />,
    )
  }

  it('draws the schedule pills with A75`s box, not a private 16px square', () => {
    render41()
    const checked = screen.getByRole('checkbox', { name: 'Continuous' })
    const box = checked.querySelector('[data-checkbox-box]') as HTMLElement
    // U2.4's seam (`controls/choice-controls.tsx`), which is the phone's `Checkbox.tsx:109-128`:
    // 24x24 at `borderWidth: 2` and `radius.sm`, filled `colors.primary`, glyph `colors.onPrimary`.
    // Was a 16x16 at `borderWidth: 1` and radius 4 with a hand-inlined `#fff` SVG tick.
    expect(box).not.toBeNull()
    expect(box).toHaveStyle({ width: '24px', height: '24px', borderWidth: '2px', borderRadius: '4px' })
    expect(box.style.background).toBe(rgb(colors.primary))
    expect(box.style.color).toBe(rgb(colors.onPrimary))
    // The glyph is a LITERAL character, U+2713 — not an SVG path (phone `Checkbox.tsx:75-85`).
    expect(box.textContent).toBe('\u2713')
    expect(box.querySelector('svg')).toBeNull()
  })

  it('leaves the unchecked pill`s box empty and opaque', () => {
    render41()
    const box = screen.getByRole('checkbox', { name: 'Motion' }).querySelector('[data-checkbox-box]') as HTMLElement
    expect(box.textContent).toBe('')
    // Opaque, not transparent: the seam's docblock records that this is what makes the two
    // states read as one control rather than as "a square" and "a hole".
    expect(box.style.background).toBe(rgb(colors.background))
  })

  it('paints the Total DVR Retention box as the nested tier (A55)', () => {
    render41()
    const box = screen.getByText('Total DVR Retention').parentElement as HTMLElement
    expect(box.style.borderTopColor).not.toBe(box.style.borderRightColor) // the lit edge survives
    expect(box.style.background).toMatch(/^linear-gradient/)
  })

  /**
   * U6.1's **Defect 2**, handed to this package by name: *"a section whose only child is a
   * component that itself returns `null` still counts as one child and renders an empty titled
   * box … `DvrInfoScreen`'s 'Retention' section is the live candidate … **Watch:** U6.4b."*
   *
   * The Retention section's body is a TERNARY, so it always yields exactly one child and
   * `SectionCard`'s own collapse can never fire for it. That is why this screen keeps a
   * call-site guard for Retention and no longer keeps one for the other two.
   */
  it('collapses the Retention card when its last field goes — the ternary defeats SectionCard', () => {
    const retention: FormFieldId[] = ['dvr.firstRecordedDate', 'dvr.totalDvrRetention', 'dvr.daysUntilOverwritten']
    render41((id) => !retention.includes(id))
    expect(screen.queryByText('Retention')).not.toBeInTheDocument()
    // ...and the placeholder that would otherwise have filled an empty titled box is gone too.
    expect(screen.queryByTestId('dvr-retention-empty')).not.toBeInTheDocument()
    expect(screen.getByText('Basic DVR Details')).toBeInTheDocument()
  })

  it('spells no bare hex — every colour is a palette, tier or seam token', () => {
    const src = readFileSync(
      join(process.cwd(), 'features', 'demo', 'ui', 'screens', 'DvrInfoScreen.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
  })
})
