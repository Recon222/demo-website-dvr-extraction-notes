import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { Banner } from '@/features/demo/ui/controls/Banner'
import { palette } from '@/features/demo/ui/tokens/palette'
import { SEVERITIES, severityTone, type StatusSeverity } from '@/features/demo/ui/tokens/status'

/**
 * A71 / U3.3. The phone's `src/components/common/__tests__/Banner.test.tsx` split into the two
 * halves it names, and the split is load-bearing (phone `:37-40`, verbatim):
 *
 *   *"The other half — that Banner actually RENDERS the pair it measures here — lives in
 *   'paints $severity from its own tokens'. Neither block is sufficient alone: this one never
 *   renders a Banner, and that one would pass over a foreground rewired to any colour if it
 *   only read the container."*
 *
 * WHERE THE TWO HALVES DIVERGE FROM THE PHONE'S SUITE, and why:
 *
 *  - The phone renders BOTH schemes through `ForceColorScheme`. The demo has no theme context —
 *    `colors` is `palette[scheme]` with `scheme = 'dark'` at one site (plan §9 clause 12) — so
 *    the RENDER half can only observe dark. The LIGHT half is therefore held at the tokens, in
 *    the contrast and opacity blocks, which is the same shape `palette-contrast.test.ts` uses
 *    for every light row nothing renders yet. A light-half render pin arrives with the flip.
 *  - The contrast block lives here rather than in `palette-contrast.test.ts` for two reasons:
 *    it is where the phone keeps it, and that file is concurrently open to U3.2 this wave.
 *    It needs none of that file's compositing machinery *because the fill is opaque* — which is
 *    itself the thing the opacity block below proves, so the two are a pair.
 */

// `SEVERITIES` is the seam's own export (`tokens/status.ts:45`), not a local re-type. A local
// copy is how the private trio hid: two declarations of the same four names cannot disagree
// loudly, so nothing observed the divergence (W2 F26).
const SCHEMES = ['light', 'dark'] as const

/** jsdom rewrites every inline colour to `rgb()`; pins compare against the TOKEN, never a retyped literal. */
const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/**
 * The four `border*Color` longhands. Banner writes the accent as longhands, never the
 * `borderColor` shorthand (`reports/partner-lit-edge-ruling.md` §1) — and **jsdom does not
 * synthesize the shorthand back from them**: `el.style.borderColor` reads `''` under the ruled
 * form, measured. So every border-colour pin in this repo has to read the four longhands, which
 * is the stronger assertion anyway: it catches a partial re-tint the shorthand read cannot see.
 */
const sides = (el: HTMLElement): string[] => [
  el.style.borderTopColor,
  el.style.borderRightColor,
  el.style.borderBottomColor,
  el.style.borderLeftColor,
]

/** WCAG 2.1 relative luminance — phone `Banner.test.tsx:16-28`, verbatim in behaviour. */
function luminance(hex: string): number {
  const linear = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const mount = (props: Partial<React.ComponentProps<typeof Banner>> = {}) => {
  const { container } = render(<Banner severity="info" message="Heads up" {...props} />)
  const box = container.firstElementChild as HTMLElement
  return { box, icon: box.querySelector('svg') as SVGElement, message: box.lastElementChild as HTMLElement }
}

describe('Banner — the token pairs (ruling D8a, phone Banner.test.tsx:41-55)', () => {
  it.each(SCHEMES)('every severity clears WCAG AA 4.5:1 in %s mode', (scheme) => {
    const c = palette[scheme]
    // Collected rather than asserted one at a time, so a failure names the offending severity
    // and its measured ratio in the diff (phone `:44-45`). A later re-tint of any status colour
    // fails HERE rather than silently shipping unreadable copy.
    const belowAA = SEVERITIES.map((severity) => ({
      severity,
      ratio: Number(contrastRatio(c[`${severity}OnLight`], c[`${severity}Light`]).toFixed(2)),
    })).filter(({ ratio }) => ratio < 4.5)

    expect(belowAA).toEqual([])
  })

  it('keeps every `*Light` fill OPAQUE, in both halves — the AA guarantee depends on it', () => {
    // Phone `Banner.tsx:11-16`: the `*OnLight` foregrounds are measured against the `*Light`
    // tones, and that only holds if the fill IS that tone. A translucent fill composites over an
    // unknown parent and the block above becomes unmeasurable — it would keep passing while the
    // shipped surface failed. So the ratio pin is only worth what this pin is worth.
    const translucent = SCHEMES.flatMap((scheme) =>
      SEVERITIES.map((severity) => ({ scheme, severity, fill: palette[scheme][`${severity}Light`] })).filter(
        // 6-digit hex only: no 8-digit `#rrggbbaa`, no `rgba()`, no `color-mix()`.
        ({ fill }) => !/^#[0-9a-f]{6}$/i.test(fill),
      ),
    )
    expect(translucent, 'a Banner fill gained an alpha channel — see Banner.tsx:11-16').toEqual([])
  })
})

describe('Banner — what it renders (phone Banner.tsx:45-99)', () => {
  it.each(SEVERITIES)('paints %s from its own three tokens', (severity) => {
    const { box, icon, message } = mount({ severity })

    // Read off `severityTone` — the SEAM — never re-derived from `palette` here. That is the
    // whole of W2 F26: a pin that computes the trio itself agrees with a Banner that computes
    // the trio itself, and the two agree all the way through a re-tint of the seam neither of
    // them reads. Mutating `severityTone`'s `background` now reds this line.
    const tone = severityTone(severity)
    // phone `:69` — fill and border are two different tokens on purpose. In DARK all four
    // `*OnLight` collapse to one value, so the foreground carries no severity there and the
    // fill+border pair has to (phone CaseStatusBadge's `getStatusConfig` says the same).
    expect(box.style.backgroundColor).toBe(rgb(tone.background))
    expect(sides(box)).toEqual(Array(4).fill(rgb(tone.borderColor)))

    // phone `:79` — the half that has to be READ, asserted off the rendered node rather than
    // trusting the token pair alone. Rewiring Banner to the saturated accent — the exact defect
    // this component exists to eliminate — passes every container-only assertion above.
    expect(message.style.color).toBe(rgb(tone.color))
  })

  it.each(SEVERITIES)('gives %s an icon that takes the FOREGROUND, never the accent', (severity) => {
    const { icon } = mount({ severity })
    // phone `:49-51`, and this is a measured rule: as an icon the saturated accent drops to
    // 1.92-2.24:1 in three of the eight severity/scheme combinations. `stroke` is an SVG
    // attribute, so it reads back as the raw token rather than jsdom's `rgb()`.
    const tone = severityTone(severity)
    expect(icon.getAttribute('stroke')).toBe(tone.color)
    expect(icon.getAttribute('stroke')).not.toBe(tone.borderColor)
    // `tone.accent` is the bare-mark token and must never reach a foreground either — in three
    // of the eight severity/scheme cells it measures 1.92-2.24:1 on its own tone.
    expect(icon.getAttribute('stroke')).not.toBe(tone.accent)
  })

  it('draws a different glyph per severity — there is no `icon` prop to override it', () => {
    // phone `:30-35` + `1a17b33a` ("drop Banner's unused icon prop"). Four severities, four
    // shapes: a lookup that lost a branch and fell back to one glyph would leave the colour
    // pins above entirely green.
    const glyphs = SEVERITIES.map((severity) => mount({ severity }).icon.innerHTML)
    expect(new Set(glyphs).size).toBe(4)
  })

  it('lands the phone Banner.tsx:84-99 geometry', () => {
    const { box, icon, message } = mount()
    expect(box.style.display).toBe('flex')
    expect(box.style.alignItems).toBe('flex-start') // `:87`
    expect(box.style.gap).toBe('8px') // `:88` spacing.sm
    expect(box.style.borderRadius).toBe('8px') // `:90` borderRadius.md — the NESTED tier (D13)
    expect(box.style.borderWidth).toBe('1px') // `:91`
    expect(box.style.borderStyle).toBe('solid')
    // The lit-edge ruling's signature, and the reason it is asserted as an ABSENCE: a shorthand
    // is what breaks paint 2 once anything in the composition carries a side longhand, and
    // `...style` spreads after the border here. Collapsing the four longhands back to
    // `borderColor` reds this line — the shorthand is the only thing that fills it in.
    expect(box.style.borderColor, 'no border shorthand — partner-lit-edge-ruling.md §1').toBe('')
    expect(box.style.border).toBe('')
    expect(box.style.padding).toBe('12px') // `:92` spacing.base
    // `:95` — jsdom expands the `flex: 1` shorthand to its three longhands, so the pin reads
    // the expansion. `flexGrow` alone would pass over `flex: '1 1 auto'`, which is a different
    // box: `auto` sizes from the content, and a long message would then push the icon out.
    expect(message.style.flex).toBe('1 1 0%')
    expect(message.style.fontSize).toBe('14px') // `:96` fontSize.sm
    expect(message.style.lineHeight).toBe('21px') // `:97` 14 x lineHeight.normal
    expect(icon.getAttribute('width')).toBe('20') // `:73` iconSize.sm
    expect(icon.getAttribute('height')).toBe('20')
  })

  it('paints NO glass — the fill is one flat colour, not a gradient', () => {
    // A71's rule, restated as a pin: `backgroundImage` is where every glass fragment in this
    // repo puts its gradient, so an adopter "upgrading" a Banner to `glassCardNested` reds here.
    const { box } = mount()
    expect(box.style.backgroundImage).toBe('')
    expect(box.style.backgroundColor).not.toContain('rgba')
    expect(box.style.boxShadow).toBe('')
  })
})

describe('Banner — screen-reader semantics (phone Banner.tsx:55-77)', () => {
  it('is an alert whose accessible name carries the severity', () => {
    const { box } = mount({ severity: 'error', message: 'Import failed' })
    expect(box).toHaveAttribute('role', 'alert')
    // phone `:63`. Colour cannot carry severity to a screen reader, and in dark mode the
    // foreground is the same `#f0f4f8` for all four — so the label is the only carrier.
    expect(box).toHaveAttribute('aria-label', 'error: Import failed')
  })

  it.each([
    ['error', 'assertive'],
    ['warning', 'assertive'],
    ['info', 'polite'],
    ['success', 'polite'],
  ] as const)('announces %s as a %s live region', (severity, live) => {
    // phone `:64-68`. Urgent severities interrupt; the rest wait for a pause, so an info
    // note-box does not cut off whatever is being read. `role="alert"` IMPLIES assertive, so
    // dropping this attribute silently re-urgent-ifies info and success.
    expect(mount({ severity }).box).toHaveAttribute('aria-live', live)
  })

  it('hides the decorative icon from assistive tech and exposes the message text', () => {
    const { box, icon } = mount({ message: 'Codec selection is iOS only.' })
    expect(icon).toHaveAttribute('aria-hidden', 'true') // phone `:76-77`
    expect(within(box).getByText('Codec selection is iOS only.')).toBeInTheDocument()
  })
})

describe('Banner — the caller seams', () => {
  it('lets `style` add LAYOUT without displacing the recipe', () => {
    // phone `:69` composes `[styles.banner, {…tokens}, style]`, so a caller's margin lands and
    // the tokens still win over the stylesheet. Five phone call sites pass exactly a margin.
    const { box } = mount({ style: { marginBottom: 16 } })
    expect(box.style.marginBottom).toBe('16px')
    expect(box.style.padding).toBe('12px')
    expect(box.style.backgroundColor).toBe(rgb(severityTone('info').background))
  })

  it('emits `testId` as `data-testid`, and omits the attribute otherwise', () => {
    expect(mount({ testId: 'import-picker-error' }).box).toHaveAttribute('data-testid', 'import-picker-error')
    expect(mount().box).not.toHaveAttribute('data-testid')
  })
})

/**
 * SEAM(U3.3) — THE ADOPTION MAP. This is where U6.2 / U6.4a / U6.4b / U7.2 / U7.3 find their
 * hand-backs, and it is a tripwire rather than a note.
 *
 * D19 re-cut A71: U3.3 builds `Banner` and adopts it ONLY where no other lane touches the file;
 * the cross-lane adoptions move to the phases that already open those files. The brief asked
 * for a `SEAM(U3.3)` comment inside each of those files. **That was not done, deliberately** —
 * plan §6.1's "U2 ∥ U3 shared set" row is exactly those seven files, and D19's whole purpose is
 * that U3.3 does not open them. Writing a comment into all seven re-creates, for an inert
 * marker, the contention the re-cut removed (`_pane-chrome.tsx` is the sharpest: U2.4 holds
 * `:164-233` and U3.2 holds `:69-73`, both live this wave).
 *
 * So the map lives in ONE file U3.3 owns, it is still grep-able (`grep -rn "SEAM(U3.3)"`), and
 * unlike a comment it FAILS when it goes stale: the day a hand-back adopts `Banner`, this block
 * reds and names the package that owes the row an update.
 */
describe('SEAM(U3.3) — the adoption map (A71 / D19)', () => {
  /** Every `ui/**` non-test file that renders `<Banner>` today. Paths relative to `ui/`. */
  const ADOPTED = [
    'screens/DateDisambiguationWarning.tsx',
    'screens/EditIncidentLocationModal.tsx',
    'screens/ExtractedScopeScreen.tsx',
    'screens/import/PickerStage.tsx',
  ]

  /**
   * The D19 hand-backs: SIX entries over SEVEN files — the plan pairs `AudioRecorderScreen`
   * and `AudioPreviewScreen` as one entry, and the loop below checks all seven. Each row names
   * the package that owes it. When you adopt, DELETE your row
   * here and add the file to `ADOPTED` above — do not edit a count, there isn't one.
   * `ImportModal.tsx` is deliberately absent from BOTH lists: see the refutation in
   * `docs/planning/demo-phone-ui-parity/reports/u3.3-implementation-report.md` (D12 defends the
   * FallbackMode amber; the `FailuresCard` is a list, not a status line).
   */
  const HANDED_BACK: Readonly<Record<string, string>> = {
    'screens/TimeOffsetScreen.tsx': 'U6.4b — the dashed amber advisory (:129-136)',
    'screens/CompletionScreen.tsx': 'U6.4b — the error callout (:87-92)',
    'screens/NewCaseModal.tsx': 'U6.4a — the submit-error banner (:201-208)',
    'screens/settings/panes/_pane-chrome.tsx':
      'U6.2 — PaneNote carries the RECIPE (see RECIPE_ONLY); the COMPONENT is deferred (D20)',
    'screens/AudioRecorderScreen.tsx': 'U7.2 — the notice + error pair (:252-264)',
    'screens/AudioPreviewScreen.tsx': 'U7.2 — the notice + error pair (:207-215)',
    'screens/OcrCaptureScreen.tsx': 'U7.3 — the error and assumed-date callouts (:389-423, :476-479)',
  }

  const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

  function sourceFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') out.push(...sourceFiles(full))
      } else if (entry.name.endsWith('.tsx')) {
        out.push(full)
      }
    }
    return out
  }

  /**
   * Files that import ANYTHING from the Banner module. U6.2 split this from the adoption test
   * below: importing the module is no longer the same fact as adopting the component, because
   * `_pane-chrome.tsx` now imports `BannerIcon` while deliberately NOT rendering `<Banner>`
   * (see `RECIPE_ONLY`).
   *
   * Comments stripped first — same reason as the italic census: a docblock naming the import
   * would otherwise count as an adoption. Block then line, as `empty-state.test.tsx` does.
   */
  const stripComments = (file: string): string =>
    readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

  const importsBannerModule = (file: string): boolean =>
    /from\s+'@\/features\/demo\/ui\/controls\/Banner'/.test(stripComments(file))

  /**
   * RENDERS `<Banner …>` — the COMPONENT adoption, which is the fact D19 actually tracks.
   * `<BannerIcon` does not match (the char after `<Banner` must be whitespace, `/` or `>`), and
   * a broken regex cannot pass silently: the adoption test below compares against a FOUR-entry
   * list, so a predicate that matches nothing reds.
   */
  const rendersBanner = (file: string): boolean => /<Banner[\s/>]/.test(stripComments(file))

  /**
   * Imports the module WITHOUT rendering the component — the ruled middle state.
   *
   * `_pane-chrome.tsx`'s `PaneNote` carries every visible part of the phone's settings note
   * (`Banner.tsx:114-144`'s recipe plus its severity glyph, imported so the two cannot draw
   * different icons) and none of its live-region semantics. `<Banner>` is hard-wired to
   * `role="alert"` with an explicit `aria-live` and has no `id`; adopting it would break the
   * three `aria-describedby` targets R-6 added, make six static notes announce on mount
   * (R-34), and turn two polite `role="status"` notes assertive. Those are accessibility-tree
   * BEHAVIOUR changes, and plan §2's D20 carve-out does not name U6.2 — so the component
   * adoption is proposed as a deferral in the U6.2 report rather than taken.
   */
  const RECIPE_ONLY: Readonly<Record<string, string>> = {
    'screens/settings/panes/_pane-chrome.tsx':
      'U6.2 — PaneNote takes Banner’s recipe + BannerIcon; the COMPONENT stays deferred (D20)',
  }

  it('has exactly the four own-lane adoptions D19 left to U3.3', () => {
    const found = sourceFiles(UI_ROOT)
      .filter(rendersBanner)
      .map((f) => relative(UI_ROOT, f).split(sep).join('/'))
      .sort()
    expect(found, 'a Banner adoption landed or vanished — update ADOPTED and say why').toEqual(ADOPTED)
  })

  it('leaves every D19 hand-back file unadopted, each still owned by its own package', () => {
    for (const [file, owner] of Object.entries(HANDED_BACK)) {
      const full = join(UI_ROOT, ...file.split('/'))
      // The file must still EXIST: a rename would silently empty this guard, which is the
      // failure mode a path-keyed list has and a count-keyed one does not even notice.
      expect(existsSync(full), `${file} moved — re-anchor this row (${owner})`).toBe(true)
      expect(
        rendersBanner(full),
        `${file} adopted Banner: that is ${owner}'s row — move it into ADOPTED above and delete this line`,
      ).toBe(false)
    }
  })

  it('records the recipe-only middle state, and holds it to BOTH halves of its ruling', () => {
    for (const [file, why] of Object.entries(RECIPE_ONLY)) {
      const full = join(UI_ROOT, ...file.split('/'))
      expect(existsSync(full), `${file} moved — re-anchor this row (${why})`).toBe(true)
      // Half one: it really does reach into this module (for the glyph), so the two cannot
      // draw different icons for the same severity.
      expect(importsBannerModule(full), `${file} stopped importing Banner at all — ${why}`).toBe(true)
      // Half two: and it still does not render the component. The day it does, this row is
      // wrong and the file belongs in ADOPTED.
      expect(rendersBanner(full), `${file} now renders <Banner> — move it to ADOPTED (${why})`).toBe(false)
    }
  })
})
