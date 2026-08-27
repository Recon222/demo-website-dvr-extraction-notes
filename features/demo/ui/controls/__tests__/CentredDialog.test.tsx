import { describe, it, expect, vi, afterEach } from 'vitest'
import type { CSSProperties } from 'react'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { CentredDialog, DIALOG_SHADOW, dialogSurface } from '@/features/demo/ui/controls/CentredDialog'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U4.3) — matrix A45, A56, B.2 rows 15/25, the `AlertDialog` row.
 *
 * Colour expectations compose their right-hand side from `GLASS_TIER[scheme]`, never from a
 * retyped literal — U1.4's rule, for U1.4's reason: a pin that restates the production string
 * is green through exactly the edit it exists to catch. What these assert is the RELATIONSHIP,
 * that the dialog surface reads the `elevated` tier OF THE CONSUMED SCHEME.
 *
 * The geometry numbers and `DIALOG_SHADOW` are the deliberate exceptions: they are lifted
 * values with no token to derive from, spelled out with their phone `file:line`, and they are
 * change-detectors on purpose.
 *
 * MOTION MODE: every case runs motion-ON unless it calls `preferReducedMotion()`.
 * `vitest.setup.ts:47-60` hard-codes `matchMedia().matches` to false, so that is the default
 * and the gate would otherwise never be exercised.
 */

const elevated = GLASS_TIER[scheme].elevated

/**
 * jsdom REWRITES the inline `rgba()` it accepts — the demo spells `rgba(184,212,240,0.12)` and
 * `element.style` reads back `rgba(184, 212, 240, 0.12)`. Every DOM-side colour read goes
 * through this, the same treatment `glass-tokens.test.ts`'s `norm` applies for the same
 * reason. Fragment-side reads do NOT: those are the literal the module wrote.
 */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

const realMatchMedia = window.matchMedia
function preferReducedMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
afterEach(() => {
  window.matchMedia = realMatchMedia
  cleanup()
})

function mount(props: Partial<React.ComponentProps<typeof CentredDialog>> = {}) {
  const onDismiss = props.onDismiss ?? vi.fn()
  const utils = render(
    <CentredDialog
      z={60}
      labelledBy="t"
      onDismiss={onDismiss}
      dismissOnScrim={false}
      dismissOnEscape
      {...props}
    >
      {props.children ?? (
        <>
          <div id="t">Delete Case?</div>
          <button type="button">Cancel</button>
        </>
      )}
    </CentredDialog>,
  )
  return { ...utils, onDismiss }
}

const panel = () => document.querySelector<HTMLElement>('[data-dialog-panel]')!
const scrim = () => document.querySelector<HTMLElement>('[data-dialog-scrim]')!

// ---------------------------------------------------------------- the surface

describe('dialogSurface — A56, the elevated tier as a modal surface', () => {
  it('paints the elevated tier of the CONSUMED scheme, both stops, top to bottom', () => {
    expect(dialogSurface.background).toBe(
      `linear-gradient(180deg,${elevated.gradient[0]},${elevated.gradient[1]})`,
    )
  })

  it('carries all four parts of the phone composition, not two', () => {
    // `.design-sync/conventions.md:32-45` — gradient, border, lit top edge, inset inner shadow.
    expect(dialogSurface.borderTopColor).toBe(elevated.highlightTop)
    expect(dialogSurface.borderRightColor).toBe(elevated.border)
    expect(dialogSurface.borderBottomColor).toBe(elevated.border)
    expect(dialogSurface.borderLeftColor).toBe(elevated.border)
    expect(dialogSurface.boxShadow).toBe(`inset 0 1px 0 ${elevated.innerShadow}, ${DIALOG_SHADOW}`)
  })

  it('holds NO border shorthand and NO borderColor key — the lit-edge ruling', () => {
    const keys = Object.keys(dialogSurface)
    expect(keys).not.toContain('border')
    expect(keys).not.toContain('borderColor')
    expect(keys).not.toContain('borderTop')
  })

  it('is A43 depth `lg` and the phone Card padding `md`, not the demo copies 16 / 20', () => {
    // `Card.tsx:225,250` (radius) and `Card.tsx:47,183` + `conventions.md:41` (padding).
    expect(dialogSurface.borderRadius).toBe(radius.lg)
    expect(dialogSurface.borderRadius).toBe(12)
    expect(dialogSurface.padding).toBe(spacing.md)
    expect(dialogSurface.padding).toBe(16)
  })

  it('casts A45 downward — `Layout.shadow.dialog.dark`, not the demo 0 24px 60px', () => {
    expect(DIALOG_SHADOW).toBe('0 8px 40px rgba(0,0,0,0.5)')
    // The sheet's cast is the same recipe inverted; a dialog wearing it is phone §1.5's
    // shipped bug. Pin the sign, not just the string.
    expect(DIALOG_SHADOW).not.toContain('-8px')
  })

  it('keeps the lit edge when a consumer re-tints the sides the ruled way, across an update', () => {
    // The ONE override form the ruling permits: three colour longhands after the spread.
    const withTint = (x: string): CSSProperties => ({
      ...dialogSurface,
      borderRightColor: x,
      borderBottomColor: x,
      borderLeftColor: x,
    })
    const { rerender, container } = render(<div data-paint style={withTint('rgb(1, 1, 1)')} />)
    const el = container.querySelector<HTMLElement>('[data-paint]')!
    expect(norm(el.style.borderTopColor)).toBe(norm(elevated.highlightTop))
    rerender(<div data-paint style={withTint('rgb(2, 2, 2)')} />)
    expect(norm(el.style.borderTopColor)).toBe(norm(elevated.highlightTop))
    expect(norm(el.style.borderLeftColor)).toBe('rgb(2,2,2)')
  })

  it('NEGATIVE CONTROL: a `border` shorthand after the spread loses the edge on paint ONE', () => {
    // The whole point of the longhand-only shape: the failure is loud and immediate rather
    // than a paint-1-OK / paint-2-FAIL trap. If this ever passes, the fragment grew a
    // shorthand slot and every consumer override became silently survivable-then-broken.
    const { container } = render(
      <div data-paint style={{ ...dialogSurface, border: '1px solid rgb(1, 1, 1)' }} />,
    )
    const el = container.querySelector<HTMLElement>('[data-paint]')!
    expect(norm(el.style.borderTopColor)).not.toBe(norm(elevated.highlightTop))
  })
})

// ---------------------------------------------------------------- the shell

describe('CentredDialog — the shell', () => {
  it('is an alertdialog, modal, named and described by the ids it is given', () => {
    mount({ describedBy: 'b', children: <><div id="t">T</div><div id="b">B</div></> })
    const dialog = screen.getByRole('alertdialog', { name: 'T' })
    expect(dialog).toBe(panel())
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.getAttribute('aria-describedby')).toBe('b')
  })

  it('omits aria-describedby when the caller has no description element', () => {
    mount()
    expect(panel().hasAttribute('aria-describedby')).toBe(false)
  })

  it('anchors at the phone overlay padding and centres on the screen', () => {
    mount()
    // `Layout.spacing.lg` (24) — `DeleteConfirmationModal.tsx:232`, `ExportModal.tsx:363`.
    expect(panel().style.left).toBe('24px')
    expect(panel().style.right).toBe('24px')
    expect(panel().style.top).toBe('50%')
    expect(panel().style.transform).toBe('translateY(-50%)')
  })

  it('paints the panel one layer above its scrim, at the z the CALLER chose (D14)', () => {
    mount({ z: 40 })
    expect(scrim().style.zIndex).toBe('40')
    expect(panel().style.zIndex).toBe('41')
  })

  it('renders the surface recipe onto the panel, not a hand-rolled copy', () => {
    mount()
    expect(norm(panel().style.borderTopColor)).toBe(norm(elevated.highlightTop))
    expect(norm(panel().style.borderLeftColor)).toBe(norm(elevated.border))
    expect(panel().style.borderRadius).toBe('12px')
    expect(panel().style.padding).toBe('16px')
  })

  it('forwards the test ids its callers suites already name', () => {
    mount({ testId: 'delete-modal-content', scrimTestId: 'delete-modal-overlay' })
    expect(screen.getByTestId('delete-modal-content')).toBe(panel())
    expect(screen.getByTestId('delete-modal-overlay')).toBe(scrim())
  })
})

// ---------------------------------------------------------------- dismissal

describe('CentredDialog — the two dismissal routes stay per-caller', () => {
  it('Escape dismisses when the caller allows it', () => {
    const { onDismiss } = mount({ dismissOnEscape: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Escape does NOT dismiss when the caller gates it off (ExportModal mid-export)', () => {
    const { onDismiss } = mount({ dismissOnEscape: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('the scrim does NOT dismiss by default — AlertDialog blocking semantics', () => {
    const { onDismiss } = mount({ dismissOnScrim: false })
    fireEvent.click(scrim())
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('the scrim DOES dismiss when the caller says so — the phone handleOverlayPress', () => {
    const { onDismiss } = mount({ dismissOnScrim: true })
    fireEvent.click(scrim())
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('only the TOPMOST dialog answers Escape when two are stacked', () => {
    const under = vi.fn()
    const over = vi.fn()
    render(
      <>
        <CentredDialog z={60} labelledBy="u" onDismiss={under} dismissOnScrim dismissOnEscape>
          <div id="u">Delete Case?</div>
        </CentredDialog>
        <CentredDialog z={60} labelledBy="o" onDismiss={over} dismissOnScrim={false} dismissOnEscape>
          <div id="o">Discard changes?</div>
        </CentredDialog>
      </>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(over).toHaveBeenCalledTimes(1)
    expect(under).not.toHaveBeenCalled()
  })

  it('hands Escape back to the one underneath when the top one unmounts', () => {
    const under = vi.fn()
    const over = vi.fn()
    function Stack({ topOpen }: { topOpen: boolean }) {
      return (
        <>
          <CentredDialog z={60} labelledBy="u" onDismiss={under} dismissOnScrim dismissOnEscape>
            <div id="u">Delete Case?</div>
          </CentredDialog>
          {topOpen && (
            <CentredDialog z={60} labelledBy="o" onDismiss={over} dismissOnScrim={false} dismissOnEscape>
              <div id="o">Discard changes?</div>
            </CentredDialog>
          )}
        </>
      )
    }
    const { rerender } = render(<Stack topOpen />)
    rerender(<Stack topOpen={false} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(under).toHaveBeenCalledTimes(1)
    expect(over).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------- focus

describe('CentredDialog — ONE focus mechanism, the capture-phase one', () => {
  it('takes focus on mount so a screen reader hears the whole dialog', () => {
    mount()
    expect(document.activeElement).toBe(panel())
  })

  it('returns focus to the opener when it closes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = mount()
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  /**
   * The regression the survivor closes, and the reason `document.activeElement`-at-mount could
   * not be the consolidation target: a control that disables itself on activation is
   * non-focusable in the same commit that mounts the dialog, HTML's focus fixup drops focus to
   * `<body>` BEFORE React's passive effects, and a mount-time read therefore captures `<body>`.
   */
  it('restores to the control that was PRESSED, not to <body>, when the opener self-disables', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Export Map'
    document.body.appendChild(opener)
    opener.focus()
    fireEvent.pointerDown(opener) // capture-phase: fires before the handler disables it
    opener.blur()
    opener.disabled = true
    expect(document.activeElement).toBe(document.body) // the state a mount-time read captures

    const { unmount } = mount()
    opener.disabled = false // the run finished; the in-flight belt cleared in its `finally`
    unmount()
    expect(document.activeElement).toBe(opener)
    expect(document.activeElement).not.toBe(document.body)
    opener.remove()
  })

  it('leaves focus alone if the pressed control is still disabled at close', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    fireEvent.pointerDown(opener)
    opener.blur()
    opener.disabled = true
    const { unmount } = mount()
    unmount()
    expect(document.activeElement).not.toBe(opener)
    opener.remove()
  })

  it('ignores a stale origin from an earlier interaction', () => {
    const gone = document.createElement('button')
    document.body.appendChild(gone)
    fireEvent.pointerDown(gone)
    gone.remove()

    const current = document.createElement('button')
    document.body.appendChild(current)
    current.focus()
    const { unmount } = mount()
    unmount()
    expect(document.activeElement).toBe(current)
    current.remove()
  })
})

// ---------------------------------------------------------------- motion

describe('CentredDialog — the entrance is gated', () => {
  it('runs `screenIn` under motion-ON', () => {
    mount()
    expect(panel().style.animation).toBe('screenIn 0.2s ease')
  })

  it('drops the 8px translate under prefers-reduced-motion', () => {
    preferReducedMotion()
    mount()
    expect(panel().style.animation).toBe('')
  })
})
