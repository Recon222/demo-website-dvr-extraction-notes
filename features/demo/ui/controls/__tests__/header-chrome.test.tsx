import { describe, it, expect, vi } from 'vitest'
import type { CSSProperties } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import {
  glassHeaderBar,
  glassWizardHeaderBar,
  glassHeaderFooterBar,
} from '@/features/demo/ui/controls/header-chrome'
import { WizardHeader } from '@/features/demo/ui/screens/_shared'
import { WizardDrawer } from '@/features/demo/ui/controls/WizardDrawer'
import { CaseMapPicker } from '@/features/demo/ui/screens/map/CaseMapPicker'
import { APP_NAME } from '@/features/demo/engine/content/app-info'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'

/**
 * The header tier's ONE recipe — matrix A37, package U1.4.
 *
 * Every expectation below composes its right-hand side from `GLASS_TIER[scheme].header`, never
 * from a retyped literal. That is the same device U1.1's derivation pin uses and it is here for
 * the same reason: a pin that restates the production string is green through exactly the edit
 * it exists to catch. What these assert is the RELATIONSHIP — that these three fragments read
 * the `header` tier, of the consumed scheme, in the right places — so sourcing a bar from
 * `card` or reading `GLASS_TIER.dark` directly reddens the file.
 */

const header = GLASS_TIER[scheme].header

/**
 * `jest-dom`'s `toHaveStyle` is typed for `Record<string, unknown>`, which `CSSProperties` is
 * not (no index signature). One widening in one place, so no call site carries a cast.
 */
function decl(fragment: CSSProperties): Record<string, unknown> {
  return { ...fragment }
}

/** `linear-gradient(<angle>,<stop>,<stop>)` → its parts. Throws rather than returning null: a
 *  fragment that stopped being a two-stop linear gradient must fail loudly, not compare against
 *  `undefined` and pass. */
function gradient(value: CSSProperties['background']): { angle: string; stops: [string, string] } {
  const m = /^linear-gradient\((\d+deg),(rgba?\([^)]*\)),(rgba?\([^)]*\))\)$/.exec(String(value ?? ''))
  if (!m) throw new Error(`not a two-stop linear gradient: ${value}`)
  return { angle: m[1], stops: [m[2], m[3]] }
}

describe('the header tier recipe (A37 / U1.4)', () => {
  it('paints the header tier of the CONSUMED scheme, top to bottom', () => {
    expect(gradient(glassHeaderBar.background)).toEqual({
      angle: '180deg',
      stops: [header.gradient[0], header.gradient[1]],
    })
  })

  it('puts the tier border on the bottom edge alone, as a longhand', () => {
    expect(glassHeaderBar.borderBottom).toBe(`1px solid ${header.border}`)
    // A shorthand `border` after this would erase the single-edge hairline (§4.3), and a
    // `borderTop` would draw an edge the phone's bars do not have.
    expect(glassHeaderBar.border).toBeUndefined()
    expect(glassHeaderBar.borderTop).toBeUndefined()
  })

  it("carries the wizard header's lit top edge as an inset shadow, not a border-top-color", () => {
    // `borderTopColor` is A40's spelling for a CARD, which has four borders for the longhand to
    // override. On a one-edge bar it paints nothing — the phone builds a real 1px strip over
    // the gradient instead (`Header.tsx:113-117,168-175`), and `inset 0 1px 0` is that.
    expect(glassWizardHeaderBar.boxShadow).toBe(`inset 0 1px 0 ${header.highlightTop}`)
    expect(glassWizardHeaderBar.borderTopColor).toBeUndefined()
  })

  it('builds the wizard header FROM the shared bar, so a tier re-tint reaches both', () => {
    expect(glassWizardHeaderBar.background).toBe(glassHeaderBar.background)
    expect(glassWizardHeaderBar.borderBottom).toBe(glassHeaderBar.borderBottom)
  })

  it("renders no innerShadow anywhere — the phone's header consumers paint none", () => {
    // Not an omission: zero of the six phone components that read `GlassColors[…].header` touch
    // `innerShadow`. Painting one here would be invention. If the phone ever does, this line is
    // the one that has to change, deliberately.
    expect(glassHeaderBar.boxShadow).toBeUndefined()
    expect(glassHeaderFooterBar.boxShadow).toBeUndefined()
    expect(glassWizardHeaderBar.boxShadow).not.toContain(header.innerShadow)
  })

  it('flips the SAME two stops for a bar that sits below its content, and moves the hairline', () => {
    const bar = gradient(glassHeaderBar.background)
    const footer = gradient(glassHeaderFooterBar.background)
    // The phone reverses the array and keeps the direction (`CustomDrawerContent.tsx:437`);
    // `0deg` with the stops in source order is the same paint in CSS.
    expect(footer.stops).toEqual(bar.stops)
    expect([bar.angle, footer.angle]).toEqual(['180deg', '0deg'])
    expect(glassHeaderFooterBar.borderTop).toBe(`1px solid ${header.border}`)
    expect(glassHeaderFooterBar.borderBottom).toBeUndefined()
  })
})

const drawerProps = {
  open: true,
  items: [{ id: 'submission' as const, label: 'Submission', active: true }],
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onBackToCases: vi.fn(),
  onCaptureMedia: vi.fn(),
  onRecordAudio: vi.fn(),
  onOpenMediaLibrary: vi.fn(),
  saveStatus: null,
  mediaTools: { mediaCapture: true, audioRecording: true },
}

/** Each demo bar that reads the tier, and the element that must carry the recipe. */
const BARS: [name: string, mount: () => HTMLElement][] = [
  [
    'WizardHeader',
    () => render(<WizardHeader title="Case Details" onBack={vi.fn()} onMenu={vi.fn()} />).container
      .firstElementChild as HTMLElement,
  ],
  [
    'WizardDrawer header',
    () => {
      render(<WizardDrawer {...drawerProps} />)
      return screen.getByText('Navigation').parentElement as HTMLElement
    },
  ],
  [
    'CaseMapPicker header',
    () => {
      render(
        <CaseMapPicker cases={[]} dismissible preselectedId={null} onPick={vi.fn()} onClose={vi.fn()} />,
      )
      return screen.getByTestId('case-map-picker').firstElementChild as HTMLElement
    },
  ],
]

/**
 * The consumers. One recipe means every chrome bar in the demo reads it — so this asserts on
 * RENDERED elements, not on the fragments, and it loops rather than picking one component. The
 * phone's whole A37 finding was four bars that each looked *nearly* right on its own screen;
 * the only assertion that catches that class is one that compares them to each other and to
 * the tier.
 *
 * The plan's Tests column asks for "a pin that `WizardHeader` and `SettingsNavBar` render the
 * same background". `SettingsNavBar` is NOT in this set — the phone's own
 * `SettingsNavBar.tsx:43` reads `GlassColors[colorScheme ?? 'light'].elevated`, not `.header`,
 * and the demo's `GLASS.gradientPanel` is that same tier's gradient since U1.1 (its R-8). The
 * demo bar is already byte-exact; pinning it to the header tier would pin a divergence. See the
 * U1.4 report's refutation R-2.
 */
describe('the header tier reaches the screen (A37 / U1.4)', () => {
  it.each(BARS)('%s paints the shared bar — gradient and hairline', (_name, mount) => {
    expect(mount()).toHaveStyle(decl(glassHeaderBar))
  })

  it('every bar paints the SAME ground — four hand-rolled navies become one', () => {
    // The A37 failure mode is not "a bar is wrong", it is "four bars are each nearly right".
    // Only comparing them to each other catches the next one that drifts alone.
    const backgrounds = BARS.map(([, mount]) => {
      cleanup()
      return getComputedStyle(mount()).background
    })
    expect(new Set(backgrounds).size).toBe(1)
    expect(backgrounds[0]).not.toBe('')
  })

  it('the lit top edge lands on WizardHeader and NOWHERE else', () => {
    // Exclusivity, not just presence. `highlightTop` has exactly one consumer on the phone
    // (`Header.tsx:113-117`); the drawer's header and the picker's paint no strip, and a
    // "helpful" move of the shadow into the shared fragment would light three bars the phone
    // leaves flat. Asserting only that WizardHeader HAS it would not see that.
    const edge = { boxShadow: glassWizardHeaderBar.boxShadow as string }
    const [wizard, drawer, picker] = BARS.map(([, mount]) => {
      cleanup()
      const el = mount()
      return el.style.boxShadow
    })
    cleanup()
    expect(render(<WizardHeader title="X" onBack={vi.fn()} onMenu={vi.fn()} />).container.firstElementChild)
      .toHaveStyle(edge)
    expect(wizard).toBe(edge.boxShadow)
    expect([drawer, picker]).toEqual(['', ''])
  })

  it("the drawer's footer paints the same stops flipped, hairline on top", () => {
    render(<WizardDrawer {...drawerProps} />)
    expect(screen.getByText(APP_NAME).parentElement).toHaveStyle(decl(glassHeaderFooterBar))
  })
})
