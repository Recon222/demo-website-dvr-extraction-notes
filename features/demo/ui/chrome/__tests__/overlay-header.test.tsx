import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { CONTROL, OverlayHeader, type OverlayHeaderProps } from '@/features/demo/ui/chrome/OverlayHeader'
import { CAMERA_CHROME } from '@/features/demo/ui/screens/camera-chrome'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U7.2) pins — matrix A61.
 *
 * jsdom renders no CSS, so every assertion here reads the INLINE style the component wrote
 * (plan §4.2). Each pin below names, in its own comment, the production change that reds it;
 * all six were probed in `probe-u7.2-header` and all six KILLED — see the U7.2 report §3.
 */

const tier = GLASS_TIER[scheme]

/**
 * jsdom RE-SPACES every `rgba()` it accepts, so a byte-equality assertion against the demo's
 * unspaced spelling reds on formatting rather than on value (mutation-testing SKILL, project
 * hazards; §4.7). Strip whitespace on BOTH sides, exactly as `glass-tokens.test.ts`'s `norm`
 * does and for the same reason.
 */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

/** jsdom also rewrites `#rrggbb` to `rgb(r, g, b)` on read-back. Compare through the same
 *  normalisation the DOM applies rather than by hex. */
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = (full.match(/../g) as string[]).map((p) => parseInt(p, 16))
  return `rgb(${r}, ${g}, ${b})`
}

describe('OverlayHeader — the leading control', () => {
  // MUTATION: `glass: { size: touchTarget.min }` -> `40` (the recorder's pre-U7.2 size).
  it('is 44x44 in the glass variant — the phone grew the recorder pill to touchTarget.min', () => {
    render(<OverlayHeader variant="glass" onBack={() => {}} backLabel="Cancel recording" />)
    const button = screen.getByRole('button', { name: 'Cancel recording' })
    expect(button).toHaveStyle({ width: `${touchTarget.min}px`, height: `${touchTarget.min}px` })
  })

  // MUTATION: `cameraScrim: { size: touchTarget.comfortable }` -> `touchTarget.min`, i.e. the
  // "both converge at 44" the plan's A61 row asks for. This pin is the record that the camera's
  // 48 is the phone's live value and must NOT be shrunk (D17).
  it('stays 48x48 in the cameraScrim variant — VisionCameraScreen still ships 48 (D17)', () => {
    render(<OverlayHeader variant="cameraScrim" onBack={() => {}} backLabel="Close camera" />)
    const button = screen.getByRole('button', { name: 'Close camera' })
    expect(button).toHaveStyle({ width: '48px', height: '48px' })
    expect(touchTarget.comfortable).toBe(48)
  })

  // MUTATION: `background: tier.card.gradient[0]` -> the old `rgba(19,34,54,0.85)` navy.
  // Phone `RecorderScreen.tsx:78-79`: the flat close pill takes the glass CARD's TOP stop.
  it('fills the glass control from the card tier, border included', () => {
    render(<OverlayHeader variant="glass" onBack={() => {}} backLabel="Cancel recording" />)
    const button = screen.getByRole('button', { name: 'Cancel recording' })
    expect(norm(button.style.background)).toBe(norm(tier.card.gradient[0]))
    expect(norm(button.style.borderColor)).toBe(norm(tier.card.border))
    expect(button.style.borderWidth).toBe('1px')
  })

  // MUTATION: `background: CAMERA_CHROME.controlScrim` -> `colors.overlay` — i.e. D17 item (ii)
  // applied to the wrong surface. The camera palette is FROZEN; this is the tripwire.
  it('keeps the camera control on the frozen black scrim, never a palette overlay', () => {
    render(<OverlayHeader variant="cameraScrim" onBack={() => {}} backLabel="Close camera" />)
    const button = screen.getByRole('button', { name: 'Close camera' })
    expect(norm(button.style.background)).toBe(norm(CAMERA_CHROME.controlScrim))
    expect(norm(button.style.background)).not.toBe(norm(colors.overlay))
  })

  // MUTATION: swap the two `stroke` values between the CONTROL arms.
  it('strokes the glyph per variant — textSecondary on glass, on-camera white over a feed', () => {
    const { rerender } = render(<OverlayHeader variant="glass" onBack={() => {}} backLabel="Cancel recording" />)
    const glassGlyph = screen.getByRole('button', { name: 'Cancel recording' }).querySelector('svg')
    expect(glassGlyph?.getAttribute('stroke')).toBe(colors.textSecondary)

    rerender(<OverlayHeader variant="cameraScrim" onBack={() => {}} backLabel="Close camera" />)
    const cameraGlyph = screen.getByRole('button', { name: 'Close camera' }).querySelector('svg')
    expect(cameraGlyph?.getAttribute('stroke')).toBe(CAMERA_CHROME.onCamera)
    // Phone `VisionCameraScreen.tsx:651` — `size={28}`, larger than the glass variant's 20.
    expect(cameraGlyph?.getAttribute('width')).toBe('28')
  })

  it('routes the control to onBack and announces the caller-supplied name', () => {
    const onBack = vi.fn()
    render(<OverlayHeader variant="glass" onBack={onBack} backLabel="Exit audio recording" />)
    fireEvent.click(screen.getByRole('button', { name: 'Exit audio recording' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('renders no control at all when the caller passes no onBack (the OCR confirm stage)', () => {
    render(<OverlayHeader variant="glass" title="Captured timestamp" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Captured timestamp')).toBeInTheDocument()
  })
})

describe('OverlayHeader — the title', () => {
  // MUTATION: `fontSize: 18` -> `16` (the A61 row's un-sourced value), or `fontWeight: 600`
  // -> `700` (the demo's pre-U7.2 value). Phone `Header.tsx:198-201` is `fontSize.lg` (18) +
  // `fontWeight.semibold` (600), and `:88` paints it `colors.text`.
  it('takes the phone Header recipe — 18/600 in colors.text, flex 1 and LEFT', () => {
    render(<OverlayHeader variant="glass" title="Review Audio" />)
    const title = screen.getByText('Review Audio')
    expect(title).toHaveStyle({ fontSize: '18px', fontWeight: '600', flex: '1' })
    expect(title.style.color).toBe(hexToRgb(colors.text))
    // Not centred: the phone's title is `flex: 1` with RN's default (left) alignment, and a
    // `textAlign` here would be the invention this pin exists to catch.
    expect(title.style.textAlign).toBe('')
  })

  // MUTATION: move `{title}` above the control in the JSX (i.e. keep AudioPreview's old
  // trailing-✕ order). Phone `Header.tsx:67-88` renders back/exit, THEN the title.
  it('puts the leading control before the title, as the phone header does', () => {
    const { container } = render(
      <OverlayHeader variant="glass" title="Review Audio" onBack={() => {}} backLabel="Exit audio recording" />,
    )
    const row = container.firstElementChild as HTMLElement
    expect(row.children[0].tagName).toBe('BUTTON')
    expect(row.children[1]).toHaveTextContent('Review Audio')
  })
})

describe('OverlayHeader — placement is the caller’s', () => {
  // MUTATION: give the row a `padding: '0 16px'` of its own BEFORE the `...style` spread —
  // A61's merged target. Every caller then has to override it, and the two that pass only a
  // margin silently gain a double inset.
  it('writes no padding and no position of its own', () => {
    const { container } = render(<OverlayHeader variant="glass" title="Review Audio" />)
    const row = container.firstElementChild as HTMLElement
    expect(row.style.padding).toBe('')
    expect(row.style.position).toBe('')
    expect(row).toHaveStyle({ display: 'flex', justifyContent: 'space-between' })
  })

  /**
   * MUTATION: spread `...style` BEFORE `...row` so the recipe wins over the caller.
   *
   * THE FIRST SHAPE OF THIS PIN SURVIVED that mutation, and the reason is worth keeping: it
   * asserted only `position` / `top` / `padding`, none of which `row` sets — so the spread order
   * was invisible to its input and it was pinning nothing. An override pin has to override
   * something. `justifyContent` is a key BOTH sides write, which is the only kind that can tell
   * the two orders apart. (Probe P9, U7.2 report §3.)
   */
  it('lets the caller’s style win — that is the whole placement contract', () => {
    const { container } = render(
      <OverlayHeader
        variant="cameraScrim"
        style={{ position: 'absolute', top: 44, padding: '0 20px', justifyContent: 'flex-start' }}
      />,
    )
    const row = container.firstElementChild as HTMLElement
    expect(row).toHaveStyle({ position: 'absolute', top: '44px', padding: '0 20px' })
    // The discriminating assertion: the recipe's own `space-between` must have LOST.
    expect(row.style.justifyContent).toBe('flex-start')
  })
})

describe('OverlayHeader — W3 r1 fixes', () => {
  /**
   * F74. `backLabel` was prose-required and type-optional, so a nameless icon-only button was
   * constructible. The pin is a COMPILE-TIME one — the repo's established idiom for a type
   * invariant no runtime assertion can reach (`CentredDialog.test.tsx:605-638`,
   * `sheet-chrome.test.tsx:109-111`): each `@ts-expect-error` IS the assertion, and relaxing the
   * type back to two optionals makes it UNUSED, which reds `tsc`.
   *
   * MUTATION: `type OverlayHeaderControl = { onBack?(): void; backLabel?: string }`.
   */
  it('cannot be given a leading control without an accessible name (F74)', () => {
    // @ts-expect-error onBack without backLabel renders a button with no accessible name
    const nameless: OverlayHeaderProps = { variant: 'glass', onBack: () => {} }
    // @ts-expect-error backLabel without onBack labels a control that is never rendered
    const orphanLabel: OverlayHeaderProps = { variant: 'glass', backLabel: 'Close camera' }
    // Both legal arms still compile — the pair is exhaustive, not merely restrictive.
    const withControl: OverlayHeaderProps = { variant: 'glass', onBack: () => {}, backLabel: 'Close camera' }
    const without: OverlayHeaderProps = { variant: 'glass', title: 'Captured timestamp' }
    expect([nameless, orphanLabel, withControl, without]).toHaveLength(4)
  })

  /**
   * F61. The three module-level tables ship readonly — third recurrence of the F20/F38 class.
   * `as const satisfies` and not an annotation: `satisfies` keeps `CONTROL`'s literal types, so
   * a missing variant is still a compile error.
   *
   * MUTATION: drop `as const` from `row`, `titleText` or `CONTROL`.
   */
  it('ships its style tables readonly (F61)', () => {
    // `as const` constrains the TYPE, not the runtime object, so the writes live in a function
    // that is never called — the repo's own idiom (`CentredDialog.test.tsx:627-641`). Executing
    // them would really mutate a module singleton and leak into every later case in this file.
    const reject = () => {
      // @ts-expect-error CONTROL is readonly
      CONTROL.glass.size = 40
      // @ts-expect-error CONTROL's variant records are readonly
      CONTROL.cameraScrim.stroke = 'red'
    }
    expect(typeof reject).toBe('function')
    // ...and the tables still hold what the recipe wrote.
    expect(CONTROL.glass.size).toBe(touchTarget.min)
    expect(CONTROL.cameraScrim.size).toBe(48)
  })
})
