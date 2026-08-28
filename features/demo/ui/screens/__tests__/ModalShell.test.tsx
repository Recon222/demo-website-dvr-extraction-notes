import { describe, it, expect, vi } from 'vitest'
import type { CSSProperties } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModalShell, modalHeaderBar, modalSheet } from '@/features/demo/ui/screens/_shared'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { iconSize, spacing } from '@/features/demo/ui/tokens/scale'

describe('ModalShell', () => {
  it('portals its dialog into the PhoneOverlayContext node when present (pins to the phone viewport, outside the scroller)', () => {
    const overlay = document.createElement('div')
    document.body.appendChild(overlay)
    render(
      <PhoneOverlayContext.Provider value={overlay}>
        <ModalShell title="Ported" closeAccessibilityLabel="Close ported" onClose={vi.fn()}>
          <div>portaled body</div>
        </ModalShell>
      </PhoneOverlayContext.Provider>,
    )
    expect(overlay.querySelector('[role="dialog"]')).toBeTruthy()
    expect(overlay).toHaveTextContent('portaled body')
    document.body.removeChild(overlay)
  })

  it('renders inline when there is no overlay (fallback for isolated tests)', () => {
    render(
      <ModalShell title="Inline" closeAccessibilityLabel="Close inline" onClose={vi.fn()}>
        <div>inline body</div>
      </ModalShell>,
    )
    expect(screen.getByRole('dialog', { name: 'Inline' })).toBeInTheDocument()
    expect(screen.getByText('inline body')).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders no back chevron unless onBack is provided', () => {
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
  })

  it('with onBack renders a labelled chevron that fires onBack, not onClose', () => {
    const onBack = vi.fn()
    const onClose = vi.fn()
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={onClose} onBack={onBack} backLabel="Back to import options">
        <div />
      </ModalShell>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Back to import options' }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    fireEvent.click(container.querySelector('[data-modal-scrim]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

/**
 * A60 — the page-sheet header (`ModalHeader.tsx:54-97`, package U4.2).
 *
 * The phone shipped this header byte-for-byte in five modals plus every page sheet in
 * `case-management` (`NewCaseModal.tsx:252-260` is the same `elevated` gradient over the same
 * `padding: Layout.spacing.lg` / `borderBottomWidth: 1` block). `ModalShell` is the demo's one
 * copy of it, so these pin the RELATIONSHIP — the bar reads `elevated`, of the CONSUMED scheme,
 * at the phone's scale steps — rather than restating the literals the production file writes.
 */
const elevated = GLASS_TIER[scheme].elevated

/** `linear-gradient(<angle>,<stop>,<stop>)` → its parts. Throws rather than returning null: a
 *  fragment that stopped being a two-stop linear gradient must fail loudly, not compare against
 *  `undefined` and pass. (Same helper, same reason, as `header-chrome.test.tsx:38`.) */
function gradient(value: CSSProperties['background']): { angle: string; stops: [string, string] } {
  const m = /^linear-gradient\((\d+deg),(rgba?\([^)]*\)),(rgba?\([^)]*\))\)$/.exec(String(value ?? ''))
  if (!m) throw new Error(`not a two-stop linear gradient: ${value}`)
  return { angle: m[1], stops: [m[2], m[3]] }
}

describe('A60 — the modal header bar', () => {
  it('paints the ELEVATED tier of the consumed scheme, top to bottom, with the tier hairline under it', () => {
    expect(gradient(modalHeaderBar.background)).toEqual({
      angle: '180deg',
      stops: [elevated.gradient[0], elevated.gradient[1]],
    })
    expect(modalHeaderBar.borderBottomColor).toBe(elevated.border)
    expect(modalHeaderBar.borderBottomWidth).toBe(1)
    expect(modalHeaderBar.borderBottomStyle).toBe('solid')
  })

  it('carries NO border shorthand of any kind, so a consumer`s colour longhand cannot conflict', () => {
    // The lit-edge ruling, §1: the longhand-only fragment is the only measured shape with no
    // first-paint-OK / update-FAIL trap. A `border` / `borderColor` / `borderBottom` key here
    // reintroduces exactly that trap for eight surfaces.
    //
    // THIS RUNTIME ASSERTION IS THE ONLY THING GUARDING IT. `satisfies CSSProperties` admits
    // `border` — it is a perfectly valid CSS property — so adding the shorthand back compiles
    // clean. Measured (W2/F50, type-design PROBE F, re-run here): planting
    // `border: '1px solid red'` in `modalHeaderBar` gives cold `tsc --noEmit` EXIT 0, and only
    // this case reds — `expected '1px solid red' to be undefined`. So do not delete it on the
    // theory that the type layer has this covered; it does not.
    //
    // The widening cast is a READ mechanism, nothing more: W2/F38' closed the table with
    // `as const`, so its literal type carries only the keys actually present and indexing it
    // by an absent key is a TS7053. A type that genuinely forbade the shorthands (W1's
    // `NoBorderShorthand`, i.e. `satisfies CSSProperties & { border?: never; … }`) was
    // DECLINED, so the compile-time guarantee does not exist.
    const fragment = modalHeaderBar as CSSProperties
    for (const key of ['border', 'borderColor', 'borderBottom', 'borderTop'] as const) {
      expect(fragment[key]).toBeUndefined()
    }
  })

  it('is the phone`s row block: padding lg, gap sm, centred (ModalHeader.tsx:82-88)', () => {
    expect(modalHeaderBar.padding).toBe(spacing.lg)
    expect(modalHeaderBar.gap).toBe(spacing.sm)
    expect(modalHeaderBar.display).toBe('flex')
    expect(modalHeaderBar.alignItems).toBe('center')
  })

  it('is what the rendered header actually carries (a fragment nothing spreads is decoration)', () => {
    const { container } = render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    const bar = container.querySelector<HTMLElement>('[data-modal-header]')!
    expect(bar.style.padding).toBe(`${spacing.lg}px`)
    expect(bar.style.gap).toBe(`${spacing.sm}px`)
    // jsdom re-spaces `rgba()`; compare on the value, not on its whitespace.
    expect(bar.style.borderBottomColor.replace(/\s/g, '')).toBe(elevated.border)
  })

  it('titles at 2xl/bold in the text token, flexed so the close glyph is pushed to the edge', () => {
    render(
      <ModalShell title="Import Recovery Request" closeAccessibilityLabel="Close import picker" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    const title = screen.getByText('Import Recovery Request')
    expect(title).toHaveStyle({ fontSize: '24px', fontWeight: '700', color: colors.text })
    expect(title.parentElement).toHaveStyle({ flex: '1' })
  })

  it('closes with a 24px glyph in the textSecondary tone (ModalHeader.tsx:75)', () => {
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    const glyph = screen.getByRole('button', { name: 'Close x' }).querySelector('svg')!
    expect(glyph.getAttribute('width')).toBe(String(iconSize.md))
    expect(glyph.getAttribute('height')).toBe(String(iconSize.md))
    expect(glyph.getAttribute('stroke')).toBe(colors.textSecondary)
  })

  it('gives the close control a 52x52 HIT box while its layout box stays 32x32 (the web`s hitSlop)', () => {
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close x" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    const close = screen.getByRole('button', { name: 'Close x' })
    const pad = Number.parseInt(close.style.padding, 10)
    const bleed = Number.parseInt(close.style.margin, 10)
    // The painted+clickable box, and the box the flex row measures.
    expect(iconSize.md + pad * 2).toBe(52)
    expect(iconSize.md + pad * 2 + bleed * 2).toBe(iconSize.md + spacing.xs * 2)
  })
})

/**
 * A60's required close label — `ModalHeader.tsx:32-38`, verbatim:
 *
 *   "Required, not defaulted to 'Close': five near-identical page sheets that all announce
 *    'Close' are indistinguishable to a screen-reader user, which is the regression DEF-UI-006
 *    records for `GlassBottomSheet`'s hardcoded scrim label."
 *
 * The demo had EIGHT of them. The type is what enforces "required" (a missing prop is a compile
 * error, and the cold `tsc` gate is what proves it); these pin the half a type cannot: that the
 * caller's words reach the accessible name, and that no default survives to collide with them.
 *
 * NOTE the name: `closeAccessibilityLabel`, not `GlassBottomSheet`'s `closeLabel`. Two different
 * phone components with two different phone prop names, labelling two different ELEMENTS — see
 * the U4.2 report, R-1.
 */
describe('the page-sheet ground', () => {
  it('is `background`, not `modal` — the token with no consumer in either repo', () => {
    // Every page sheet on the phone paints `colors.background` behind `GridBackground`, ten for
    // ten at `dd5551ec` (UserProfileModal.tsx:133, EnrollDeviceModal.tsx:281,
    // EnrollmentQRModal.tsx:41, ProvisioningWizardModal.tsx:188, UserManagementModal.tsx:313,
    // NewCaseModal.tsx:250, NewLocationModal.tsx:201, DuplicateLocationModal.tsx:104,
    // EditIncidentLocationModal.tsx:104, CaseActionsSheet.tsx:257). `Colors.dark.modal`
    // (`Colors.ts:213`) is consumed by NOTHING there.
    //
    // Both halves matter. Plan §5's U4.2 row asked for A38's tier here and matrix A5 reads as if
    // `colors.modal` finds its adopter here; the second assertion is what stops either from being
    // quietly applied later. A38's tier is the BOTTOM-sheet ground and belongs to
    // `GlassBottomSheet` — putting it on a page sheet is A45's mistake-to-avoid in reverse.
    //
    // W4/F85. The second half used to be spelled `not.toBe(colors.modal)`. That assertion can
    // never carry information: where the two tokens DIFFER (dark — `#002853` vs `#17416e`) the
    // positive above already fails on a swap, and where they are the SAME literal (light —
    // `#ffffff` both, Colors.ts:16 and Colors.ts:113) it is unsatisfiable no matter what the
    // component paints. A rendered-value pin cannot see which of two equal tokens was spelled;
    // the positive is the whole guard, and the paragraph above is the record of the intent.
    expect(modalSheet.background).toBe(colors.background)
  })

  it('keeps the demo-owned page-sheet geometry the phone has no number for', () => {
    // `presentationStyle="pageSheet"` is OS chrome: the inset and the corner radius are iOS's,
    // not values in any phone file. Same finding D6 ratified for `TAB_BAR_HEIGHT` and U1.4 for
    // `WizardHeader`'s 56px — pinned so a later package does not "correct" them to `radius.sheet`.
    expect(modalSheet.top).toBe(34)
    expect(modalSheet.borderTopLeftRadius).toBe(24)
    expect(modalSheet.borderTopRightRadius).toBe(24)
  })
})

describe('A60 — closeAccessibilityLabel', () => {
  it('announces the caller`s own name, not "Close"', () => {
    render(
      <ModalShell title="User Profile" closeAccessibilityLabel="Close user profile" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    expect(screen.getByRole('button', { name: 'Close user profile' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('fires onClose from the labelled control', () => {
    const onClose = vi.fn()
    render(
      <ModalShell title="x" closeAccessibilityLabel="Close import picker" onClose={onClose}>
        <div />
      </ModalShell>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close import picker' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps the back chevron`s label distinct from the close control`s', () => {
    render(
      <ModalShell
        title="Paste Request Text"
        closeAccessibilityLabel="Close import picker"
        backLabel="Back to import options"
        onBack={vi.fn()}
        onClose={vi.fn()}
      >
        <div />
      </ModalShell>,
    )
    expect(screen.getByRole('button', { name: 'Back to import options' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close import picker' })).toBeInTheDocument()
  })
})
