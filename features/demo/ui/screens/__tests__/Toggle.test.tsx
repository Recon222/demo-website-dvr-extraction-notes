import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * U2.3 — `Toggle` is THE switch renderer (matrix A76; plan §5 U2.3).
 *
 * Three verbatim re-implementations were deleted onto it — `FormFieldsPane`'s `RowSwitch`,
 * `TimeOffsetScreen`'s DST row and `GpsCaptureControl`'s geocode track. Two of those three
 * drew NO inline label (the grid row and the compact GPS column draw their own), which is
 * exactly what `hideLabel` exists for.
 *
 * These pins exist so the collapse cannot silently drop a behaviour one of the three carried:
 * the keyboard idiom, `role="switch"` + its `aria-label`, `aria-checked`, focusability, the
 * D10 disabled idiom (`aria-disabled` + opacity, never the `disabled` attribute), the
 * `describedBy` that says WHY a locked switch is inert, and `RowSwitch`'s `data-testid`.
 *
 * `_shared.tsx`'s own labelled-row keyboard/role pin lives at `a11y.test.tsx:29-38` and is not
 * repeated here; `describedBy`/`disclosure` in the LABELLED mode are pinned by
 * `settings/__tests__/panes.test.tsx:76-121,296`. Everything below is the hideLabel half, the
 * recipe values, or a behaviour no existing test reaches.
 */

const HIDDEN_NAME = 'Reverse-geocode captured coordinates into an address'

/** jsdom normalizes hex inline colours to rgb(r, g, b). Same helper as `TerminalLine.test.tsx:116`. */
function hexToJsdomRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** In `hideLabel` the switch element IS the track; otherwise the track is the row's last child. */
function trackOf(sw: HTMLElement, hidden: boolean): HTMLElement {
  return hidden ? sw : (sw.lastElementChild as HTMLElement)
}

describe('Toggle — the one switch renderer (U2.3 / A76)', () => {
  describe('hideLabel — the grid row and the compact GPS control', () => {
    it('renders no visible label but keeps role="switch" and its aria-label', () => {
      render(<Toggle hideLabel label={HIDDEN_NAME} on={false} onClick={() => {}} />)
      const sw = screen.getByRole('switch', { name: HIDDEN_NAME })
      // The accessible name survives; the printed text does not.
      expect(sw).toHaveAttribute('aria-label', HIDDEN_NAME)
      expect(screen.queryByText(HIDDEN_NAME)).toBeNull()
      expect(sw.textContent).toBe('')
    })

    it('reflects state in aria-checked and stays keyboard-operable (Enter and Space)', () => {
      const onClick = vi.fn()
      render(<Toggle hideLabel label={HIDDEN_NAME} on onClick={onClick} />)
      const sw = screen.getByRole('switch', { name: HIDDEN_NAME })
      expect(sw).toHaveAttribute('aria-checked', 'true')
      expect(sw).toHaveAttribute('tabindex', '0')
      fireEvent.keyDown(sw, { key: 'Enter' })
      fireEvent.keyDown(sw, { key: ' ' })
      fireEvent.click(sw)
      expect(onClick).toHaveBeenCalledTimes(3)
    })

    it('carries the caller testId (RowSwitch’s `data-testid`, which the pane tests address it by)', () => {
      render(<Toggle hideLabel label={HIDDEN_NAME} on={false} onClick={() => {}} testId="fc-toggle-x" />)
      expect(screen.getByTestId('fc-toggle-x')).toBe(screen.getByRole('switch', { name: HIDDEN_NAME }))
    })

    it('is inert while disabled and points at the copy that says why (D10, R-6)', () => {
      const onClick = vi.fn()
      render(
        <>
          <span id="why">Always on</span>
          <Toggle hideLabel label={HIDDEN_NAME} on disabled describedBy="why" onClick={onClick} />
        </>,
      )
      const sw = screen.getByRole('switch', { name: HIDDEN_NAME })
      expect(sw).toHaveAttribute('aria-disabled', 'true')
      expect(sw).toHaveAttribute('aria-describedby', 'why')
      expect(sw).toHaveAttribute('tabindex', '0') // house rule: aria-disabled, never `disabled`
      expect(sw).not.toHaveAttribute('disabled')
      fireEvent.click(sw)
      fireEvent.keyDown(sw, { key: 'Enter' })
      expect(onClick).not.toHaveBeenCalled()
    })

    it('fades the track itself, since there is no row to fade (RowSwitch.tsx’s opacity)', () => {
      const { rerender } = render(<Toggle hideLabel label={HIDDEN_NAME} on onClick={() => {}} />)
      expect(screen.getByRole('switch', { name: HIDDEN_NAME }).style.opacity).toBe('1')
      rerender(<Toggle hideLabel label={HIDDEN_NAME} on disabled describedBy="why" onClick={() => {}} />)
      expect(screen.getByRole('switch', { name: HIDDEN_NAME }).style.opacity).toBe('0.55')
    })
  })

  describe('the labelled row — the phone Switch recipe (Switch.tsx:74-81)', () => {
    it('paints the label 16/500 in colors.text', () => {
      render(<Toggle label="Media player included" on={false} onClick={() => {}} />)
      const label = screen.getByText('Media player included')
      expect(label.style.fontSize).toBe('16px')
      expect(label.style.fontWeight).toBe('500')
      expect(label.style.color).toBe(hexToJsdomRgb(colors.text))
    })

    it('lets the label take the slack so the track can never be squeezed (Switch.tsx:78-80)', () => {
      render(<Toggle label="Media player included" on={false} onClick={() => {}} />)
      const label = screen.getByText('Media player included')
      expect(label.style.flex).toBe('1 1 0%') // jsdom expands the `flex: 1` shorthand
      expect(label.style.marginRight).toBe('16px')
      const track = trackOf(screen.getByRole('switch', { name: 'Media player included' }), false)
      expect(track.style.flex).toBe('0 0 auto')
    })
  })

  describe('the track and thumb — one recipe, both modes', () => {
    for (const hidden of [false, true]) {
      const mode = hidden ? 'hideLabel' : 'labelled'

      it(`${mode}: the track is 46×28 r14, colors.primary when on and colors.border when off`, () => {
        const { rerender } = render(<Toggle hideLabel={hidden} label="X" on onClick={() => {}} />)
        const onTrack = trackOf(screen.getByRole('switch', { name: 'X' }), hidden)
        expect(onTrack.style.width).toBe('46px')
        expect(onTrack.style.height).toBe('28px')
        expect(onTrack.style.borderRadius).toBe('14px')
        expect(onTrack.style.background).toBe(hexToJsdomRgb(colors.primary))

        rerender(<Toggle hideLabel={hidden} label="X" on={false} onClick={() => {}} />)
        const offTrack = trackOf(screen.getByRole('switch', { name: 'X' }), hidden)
        expect(offTrack.style.background).toBe(hexToJsdomRgb(colors.border))
      })

      it(`${mode}: the thumb is a 22×22 r11 puck that slides right when on`, () => {
        const { rerender } = render(<Toggle hideLabel={hidden} label="X" on onClick={() => {}} />)
        const onThumb = trackOf(screen.getByRole('switch', { name: 'X' }), hidden).firstElementChild as HTMLElement
        expect(onThumb).toHaveAttribute('aria-hidden', 'true')
        expect(onThumb.style.width).toBe('22px')
        expect(onThumb.style.height).toBe('22px')
        expect(onThumb.style.borderRadius).toBe('11px')
        expect(onThumb.style.top).toBe('3px')
        expect(onThumb.style.right).toBe('3px')
        expect(onThumb.style.left).toBe('')
        // Recorded divergence (plan §5 U2.3): the phone's thumb is `colors.background`; the
        // demo keeps white-on / faint-off, a web-legibility choice with no platform switch.
        expect(onThumb.style.background).toBe('rgb(255, 255, 255)')

        rerender(<Toggle hideLabel={hidden} label="X" on={false} onClick={() => {}} />)
        const offThumb = trackOf(screen.getByRole('switch', { name: 'X' }), hidden).firstElementChild as HTMLElement
        expect(offThumb.style.left).toBe('3px')
        expect(offThumb.style.right).toBe('')
        expect(offThumb.style.background).toBe('rgb(122, 159, 196)')
      })
    }
  })
})
