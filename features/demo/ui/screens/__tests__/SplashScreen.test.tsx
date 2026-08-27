import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BOOT_HUD_STATES } from '@/features/demo/engine/logic/boot'
import { SplashScreen } from '@/features/demo/ui/screens/SplashScreen'
import {
  SCANNER_COLORS,
  SCANNER_DISCLOSURE_TEXT,
} from '@/features/demo/ui/screens/scanner-hud-colors'
import { asJsdom } from '@/features/demo/ui/__tests__/jsdom-colour'

const scanner = () => screen.getByRole('button', { name: 'Run the simulated biometric scan' })

describe('SplashScreen', () => {
  it('renders TAP TO SCAN when idle and calls onScan on tap', () => {
    const onScan = vi.fn()
    render(<SplashScreen authState="idle" onScan={onScan} />)
    expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
    fireEvent.click(scanner())
    expect(onScan).toHaveBeenCalledOnce()
  })

  it('shows the scanning state', () => {
    render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
    expect(screen.getByText('SCANNING')).toBeInTheDocument()
    expect(screen.queryByText('TAP TO SCAN')).toBeNull()
  })

  it('shows the authorized state', () => {
    render(<SplashScreen authState="authorized" onScan={vi.fn()} />)
    expect(screen.getByText('AUTHORIZED')).toBeInTheDocument()
    expect(screen.getByText('ACCESS GRANTED')).toBeInTheDocument()
  })


/**
 * F53 — the A94/D13 mono policy's RENDER pin for this surface.
 *
 * `ui/__tests__/fonts.test.ts`'s scan proves the file SPELLS the scanner face; it cannot prove
 * anything RENDERS it, because membership is `text.includes` and a dead constant or a docblock
 * satisfies that (the reviewer's MONO1/2/3 all survived the full suite). `css: false`
 * (`vitest.config.mts:31`) makes an inline `fontFamily` the only observable there is, so the
 * scan and a render pin are two halves of one guard: the scan owns OWNERSHIP, this owns PAINT.
 *
 * Shape is `OcrCaptureScreen.test.tsx`'s: assert the scanner var IS there and the evidentiary
 * one is NOT. The negative half is what catches a swap, which is the drift D13 actually names.
 */
  it('paints the biometric HUD in the scanner face (A94 / D13)', () => {
    render(<SplashScreen authState="authorized" onScan={vi.fn()} />)
    for (const node of [screen.getByText('AUTHORIZED'), screen.getByText('ACCESS GRANTED')]) {
      expect(node.style.fontFamily).toContain('--font-stmono')
      expect(node.style.fontFamily).not.toContain('--font-jbmono')
    }
  })

  /**
   * A87 — the always-dark trio, and the half of deferred.md §89 (successor finding W3/F52)
   * that was re-cut to this package.
   *
   * §89's three splash sites were `#2B8CC1` spent as TEXT on the app ground: 4.66:1 before
   * U0.1 re-based `background`, **3.94 after**, against a 4.5 floor. The rule the campaign
   * settled on is that a saturated accent is fine as a MARK and not as text (§C.3 rule 1), so
   * every string takes the state's `text` and every mark takes its `primary`.
   *
   * Both sweeps are derived, never hand-listed — the F23 lesson, three recurrences deep in
   * this campaign: *"the record that forgets to enrol is exactly the one that drifts."* A
   * fourth string added to this surface joins the text sweep by existing, and each sweep
   * carries its own anti-vacuity assertion so a selector that stops matching reds instead of
   * passing over an empty set.
   */
  describe('the scanner palette (A87 / deferred §89)', () => {
    /** Every element painting an inline colour, less the disclosure — which is subordinate on
     *  purpose and owns its own pin above. The full-bleed button's `color: inherit` is not a
     *  colour and is excluded by value, not by name. */
    const hudText = (container: HTMLElement): HTMLElement[] =>
      Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
        (el) =>
          el.style.color !== '' &&
          el.style.color !== 'inherit' &&
          el.dataset.testid !== 'boot-disclosure',
      )

    it.each(BOOT_HUD_STATES)("paints every %s string in that state's `text`", (authState) => {
      const { container } = render(<SplashScreen authState={authState} onScan={vi.fn()} />)
      const painted = hudText(container)
      // Anti-vacuity: a sweep that matches nothing passes. Every state paints at least the
      // header and its status line, and the header is present in all three.
      expect(painted.length).toBeGreaterThanOrEqual(2)
      expect(painted.map((el) => el.textContent)).toContain('Biometric Lock')
      for (const el of painted) {
        expect(el.style.color).toBe(asJsdom(SCANNER_COLORS[authState].text))
      }
    })

    it.each(BOOT_HUD_STATES)("paints the %s corner brackets in that state's `primary`", (authState) => {
      const { container } = render(<SplashScreen authState={authState} onScan={vi.fn()} />)
      const brackets = Array.from(container.querySelectorAll<HTMLElement>('div')).filter((el) =>
        /^4px solid/.test(el.style.borderTop || el.style.borderBottom),
      )
      // Anti-vacuity: four brackets, always — the frame is the demo's own geometry and does
      // not change with the state.
      expect(brackets).toHaveLength(4)
      for (const el of brackets) {
        for (const edge of [el.style.borderTop, el.style.borderRight, el.style.borderBottom, el.style.borderLeft]) {
          if (edge !== '') expect(edge).toBe(`4px solid ${asJsdom(SCANNER_COLORS[authState].primary)}`)
        }
      }
    })

    it('carries the state all the way to the marks: AUTHORIZED turns the frame green', () => {
      // The discriminating assertion. Before A87 the whole HUD was one blue whatever the state
      // was, so a trio that only ever resolved to `idle`'s would look identical — this is what
      // separates "the palette is keyed by state" from "the palette is a constant".
      expect(SCANNER_COLORS.authorized.primary).not.toBe(SCANNER_COLORS.idle.primary)
      const glowOf = (authState: (typeof BOOT_HUD_STATES)[number]) => {
        const { container, unmount } = render(<SplashScreen authState={authState} onScan={vi.fn()} />)
        const panel = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
          (el) => el.style.boxShadow !== '',
        )
        expect(panel).toHaveLength(1)
        const glow = panel[0].style.background
        const halo = panel[0].style.boxShadow
        unmount()
        return { glow, halo }
      }
      const authorized = glowOf('authorized')
      expect(authorized.glow).toBe(asJsdom(SCANNER_COLORS.authorized.glow))
      expect(authorized.halo).toContain(asJsdom('rgba(16, 209, 119, 0.3)'))
      expect(authorized.glow).not.toBe(glowOf('idle').glow)
    })
  })

  describe('honesty (the demo cannot do biometrics)', () => {
    // Derived, not hand-listed — the same R-11b treatment as the phase list one file over: the
    // union is DEFINED by this tuple, so a fourth HUD state joins this sweep automatically.
    it.each(BOOT_HUD_STATES)('discloses the simulation in %s', (authState) => {
      render(<SplashScreen authState={authState} onScan={vi.fn()} />)
      expect(
        screen.getByText(/Simulated scan\. A browser tab has no biometric sensor\./),
      ).toBeInTheDocument()
    })

    /**
     * U8.1 replaces the `α >= 0.65` floor this used to assert, and the reason is D8 firing.
     *
     * That floor read the alpha out of the rendered colour and compared it to a number whose
     * meaning lived in a comment — `rgba(153,186,221,α)` over `#000314`. v1's own test lane
     * wrote down what that could not see (`parity/p8/lane-tests.md:408`): *"a change to the
     * boot background would move the real ratio without moving this assertion."* That is
     * precisely what D8 did. The old floor of 0.65 measures **3.92:1 over the new ground** —
     * it would have stayed green over an AA failure, which is the one outcome the pin exists
     * to prevent.
     *
     * So the claim splits in two, each half asserting exactly what its mechanism enforces:
     * this pin owns the PAINT (the rendered disclosure is the measured constant, not a
     * hand-typed near-miss), and `ui/__tests__/palette-contrast.test.ts` owns the RATIO
     * (`SCANNER_DISCLOSURE_TEXT` over `SCANNER_GROUND` >= 4.5, measured, not inferred from an
     * alpha). Neither half can drift without reddening: re-typing the colour here reds this,
     * and lightening the ground or thinning the alpha reds that.
     */
    it('paints the disclosure in the measured token (its AA ratio is pinned in palette-contrast)', () => {
      render(<SplashScreen authState="idle" onScan={vi.fn()} />)
      expect(screen.getByTestId('boot-disclosure').style.color).toBe(
        asJsdom(SCANNER_DISCLOSURE_TEXT),
      )
    })

    it('never claims Face ID happened here — only that the phone uses it', () => {
      render(<SplashScreen authState="authorized" onScan={vi.fn()} />)
      const faceId = screen.getByText(/Face ID/)
      expect(faceId.textContent).toContain('On the phone this is Face ID')
    })
  })

  describe('accessibility (the boot gate must not lock anyone out)', () => {
    it('the tap target is a real button, so keyboard and AT can pass the gate', () => {
      const onScan = vi.fn()
      render(<SplashScreen authState="idle" onScan={onScan} />)
      const btn = scanner()
      expect(btn.tagName).toBe('BUTTON')
      // Native button semantics: Enter/Space fire click, which RTL models as a click.
      fireEvent.click(btn)
      expect(onScan).toHaveBeenCalledOnce()
    })

    it('stays mounted and aria-disabled once the scan starts (focus is not dropped mid-sequence)', () => {
      const onScan = vi.fn()
      render(<SplashScreen authState="scanning" onScan={onScan} />)
      const btn = scanner()
      expect(btn).toHaveAttribute('aria-disabled', 'true')
      expect(btn).not.toBeDisabled() // `disabled` would blur it — aria-disabled does not
      fireEvent.click(btn)
      expect(onScan).not.toHaveBeenCalled()
    })

    it('describes the button with the live status region rather than new copy', () => {
      render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
      const described = scanner().getAttribute('aria-describedby')
      expect(described).toBeTruthy()
      const region = document.getElementById(described as string)
      expect(region).not.toBeNull()
      expect(region).toHaveAttribute('aria-live', 'polite')
      expect(region?.textContent).toContain('SCANNING')
    })
  })

  describe('reduced motion', () => {
    it('keeps every element but drops the flicker, the sweep line and the blinking dots', () => {
      const { container } = render(<SplashScreen authState="scanning" onScan={vi.fn()} reduceMotion />)
      expect(screen.getByText('SCANNING')).toBeInTheDocument()
      expect(container.innerHTML).not.toContain('flicker')
      expect(container.innerHTML).not.toContain('hudScan')
      expect(container.innerHTML).not.toContain('blinkDot')
    })

    it('runs them by default', () => {
      const { container } = render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
      expect(container.innerHTML).toContain('flicker')
      expect(container.innerHTML).toContain('hudScan')
      expect(container.innerHTML).toContain('blinkDot')
    })
  })
})
