import { describe, it, expect, vi, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { CSSProperties } from 'react'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import {
  CentredDialog,
  DIALOG_SHADOW,
  DIALOG_SHADOWS,
  dialogScrim,
  dialogSurface,
} from '@/features/demo/ui/controls/CentredDialog'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { DeleteConfirmationModal } from '@/features/demo/ui/screens/DeleteConfirmationModal'
import { ExportModal } from '@/features/demo/ui/screens/ExportModal'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
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

// ---------------------------------------------------------------- the fold

/**
 * §9 clause 7's census shape, as tests rather than a report line: ONE centred dialog.
 *
 * TWO pins, because either alone is weak. The scan catches a NEW hand-rolled panel (jsdom
 * renders no CSS, so the source IS the invariant — `glass-tokens.test.ts`'s anti-re-drift
 * argument, and its `norm`). The behavioural pin catches the likelier regression: a caller
 * that imports the shell and then overrides the surface back on the element it renders.
 */
const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/** Whole-line comments are not code. `census.mjs:65` skips them for the same reason: this
 *  file's own docblock names the literal it bans. */
const isComment = (line: string): boolean => /^\s*(\/\/|\*|\/\*)/.test(line)

function uiSourceLines(dir: string, out: Array<[string, string]> = []): Array<[string, string]> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') uiSourceLines(p, out)
    } else if (/\.tsx?$/.test(entry.name)) {
      const rel = relative(UI_ROOT, p).split(sep).join('/')
      for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
        if (!isComment(line)) out.push([rel, line])
      }
    }
  }
  return out
}

/** The keys the shell owns. A caller may position and stack; it may not repaint. */
const SURFACE_KEYS = [
  'background',
  'borderRadius',
  'borderStyle',
  'borderWidth',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'boxShadow',
  'padding',
  'left',
  'right',
  'top',
  'transform',
] as const

const surfaceOf = (el: HTMLElement): string =>
  SURFACE_KEYS.map((k) => `${k}:${norm(el.style[k as 'background'] ?? '')}`).join(';')

describe('the fold — one centred dialog, not three', () => {
  it('no UI source re-declares the old shared dialog cast', () => {
    const banned = norm('0 24px 60px rgba(0,0,0,0.55)')
    const offenders = uiSourceLines(UI_ROOT)
      .filter(([, line]) => norm(line).includes(banned))
      .map(([rel]) => rel)
    expect(offenders.filter((f, i) => offenders.indexOf(f) === i)).toEqual([])
  })

  it('DIALOG_SHADOW is declared in exactly one UI source', () => {
    const needle = norm(DIALOG_SHADOW)
    const holders = uiSourceLines(UI_ROOT)
      .filter(([, line]) => norm(line).includes(needle))
      .map(([rel]) => rel)
    expect(holders.filter((f, i) => holders.indexOf(f) === i)).toEqual(['controls/CentredDialog.tsx'])
  })

  it('all three callers render the SAME shell element shape', () => {
    const shapes: Record<string, string> = {}

    render(<AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />)
    shapes.alert = surfaceOf(panel())
    cleanup()

    render(
      <DeleteConfirmationModal
        target={{ type: 'location', locationName: 'Kim', address: '' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    shapes.delete = surfaceOf(panel())
    cleanup()

    render(
      <ExportModal
        mode="validation"
        validationResult={{
          caseId: 'c1',
          caseNumber: 'PR25-0098213',
          validLocations: [],
          invalidLocations: [
            { locationId: 'l1', locationName: 'Rear Alley Camera', valid: false, errors: ['Completion date'] },
          ],
          allValid: false,
          totalLocations: 1,
          validCount: 0,
          invalidCount: 1,
        }}
        onContinueAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    shapes.export = surfaceOf(panel())
    cleanup()

    expect(shapes.delete).toBe(shapes.alert)
    expect(shapes.export).toBe(shapes.alert)
    // …and it is the recipe's, not three matching hand-rolls.
    expect(shapes.alert).toContain('borderRadius:12px')
    expect(shapes.alert).toContain('padding:16px')
    expect(shapes.alert).toContain(`borderTopColor:${norm(elevated.highlightTop)}`)
    expect(shapes.alert).toContain('left:24px;right:24px')
  })
})

/**
 * W2 F41. The phone spells the dialog action row's gap `Layout.spacing.md` (16) in BOTH of its
 * centred-dialog files — `DeleteConfirmationModal.tsx:313-316` and
 * `export/ExportModal.tsx:439-442`, each `actions: { flexDirection: 'row', gap: Layout.spacing.md }`.
 * All three demo dialogs shipped 8.
 *
 * The row is the CALLERS' content, not the shell's surface, so it is pinned across the three
 * callers here rather than three times in three files — one place to read, one place to break.
 */
describe('the dialog action row — F41, the phone gap', () => {
  const rowOf = (buttonName: string): HTMLElement =>
    screen.getByRole('button', { name: buttonName }).parentElement!

  it('AlertDialog, DeleteConfirmationModal and ExportModal all space their actions at spacing.md', () => {
    render(<AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />)
    expect(rowOf('OK').style.gap).toBe(`${spacing.md}px`)
    cleanup()

    render(
      <DeleteConfirmationModal
        target={{ type: 'location', locationName: 'Kim', address: '' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(rowOf('Cancel').style.gap).toBe(`${spacing.md}px`)
    cleanup()

    render(
      <ExportModal
        mode="validation"
        validationResult={{
          caseId: 'c1',
          caseNumber: 'PR25-0098213',
          validLocations: [],
          invalidLocations: [
            { locationId: 'l1', locationName: 'Rear Alley Camera', valid: false, errors: ['Completion date'] },
          ],
          allValid: false,
          totalLocations: 1,
          validCount: 0,
          invalidCount: 1,
        }}
        onContinueAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(rowOf('Cancel export').style.gap).toBe(`${spacing.md}px`)
    cleanup()

    // …and 16 is the phone's value, not a coincidence of the scale.
    expect(spacing.md).toBe(16)
  })
})

/**
 * W2 F43 — the backdrop ruling, settled at phone source this round.
 *
 * A22's "three darknesses collapse into one" is refuted for the DIALOG subset. The phone paints
 * TWO backdrop values, and the half of A22 that survives is its own sentence saying so:
 *   - sheet family -> `colors.scrim` (0.32). Shipped by U4.4, `sheet-chrome.test.tsx:208-214`.
 *   - centred dialogs -> `colors.overlay` (0.9): `DeleteConfirmationModal.tsx:229`,
 *     `export/ExportModal.tsx:325,360` — both `backgroundColor: colors.overlay`.
 * The shipped `rgba(4,8,14,0.66)` matched NEITHER token.
 *
 * Pinned as a DIFFERENCE as well as a value, for the reason `palette-contrast.test.ts:675-686`
 * gives about the same pair: "do NOT resync the two" is the finding, and a resync to `scrim`
 * would pass a value pin written independently.
 */
describe('the dialog backdrop — F43, colors.overlay and not colors.scrim', () => {
  it('dialogScrim paints colors.overlay and owns no layering of its own', () => {
    expect(dialogScrim.background).toBe(colors.overlay)
    expect(dialogScrim.background).not.toBe(colors.scrim)
    // `zIndex` stays the shell's — D14 froze the numbers per caller.
    expect(dialogScrim).not.toHaveProperty('zIndex')
  })

  it('the rendered dialog backdrop is the token, not a literal', () => {
    mount()
    expect(norm(scrim().style.background)).toBe(norm(colors.overlay))
  })

  it("ExportModal's PROGRESS backdrop follows the dialogs, not the sheets", () => {
    // Not a dialog panel — a full-bleed centred column — but it is the same overlay behind the
    // same export flow, and DIFF.md counted it among the surviving 0.66 literals.
    render(<ExportModal mode="progress" stage="zipping" onContinueAnyway={vi.fn()} onCancel={vi.fn()} />)
    const progressScrim = document.querySelector<HTMLElement>('[data-export-scrim]')!
    expect(norm(progressScrim.style.background)).toBe(norm(colors.overlay))
  })
})

/**
 * W2 F47. `AlertDialog`'s action buttons carried `padding` / `fontSize` / `fontWeight` /
 * `cursor` BEFORE the `buttonStyle(…)` spread — four keys the recipe sets itself
 * (`button-recipe.ts:137` `SIZES.medium`, `:251` weight, `:256` cursor), so the spread
 * overrode all four and the locals were dead. Deleting them changes no pixel.
 *
 * "Dead" is only true while they stay ahead of the spread, and that is the falsifiable part:
 * the same four keys written AFTER it would silently take the button off the recipe. This pins
 * the recipe as the source, so the resurrection has somewhere to fail.
 */
describe('the alert action button — F47, the recipe is the only source', () => {
  it('takes its geometry, weight and cursor from buttonStyle, not from local keys', () => {
    const recipe = buttonStyle({ variant: 'primary' })
    render(<AlertDialog title="T" message="m" actions={[{ label: 'OK', onPress: vi.fn() }]} onDismiss={vi.fn()} />)
    const ok = screen.getByRole('button', { name: 'OK' })
    expect(ok.style.padding).toBe(recipe.padding)
    expect(ok.style.fontSize).toBe(`${recipe.fontSize}px`)
    expect(ok.style.fontWeight).toBe(String(recipe.fontWeight))
    expect(ok.style.cursor).toBe(recipe.cursor)
    // The four locals were 12 / 14.5 / 600 / pointer; the recipe is 16px 24px / 16 / 600 /
    // pointer. Two of the four genuinely differ, so this is not a tautology.
    expect(ok.style.fontSize).not.toBe('14.5px')
    expect(ok.style.padding).not.toBe('12px')
  })
})

/**
 * W2 F34' + F38' — the two rider pins.
 *
 * F34': `DIALOG_SHADOW` was a lone DARK literal. On D2's flip day every centred dialog would
 * have cast a pure-black 40px shadow onto a pale surface. Both halves now ship as a record read
 * through `[scheme]`, the shape `SHEET_SHADOWS` established in the same wave.
 *
 * F38': `dialogSurface` and `dialogScrim` were `: CSSProperties`-annotated and MUTABLE. The
 * falsifiable pin is a COMPILE-TIME one — `@ts-expect-error` on an assignment, which goes unused
 * (and therefore reds `tsc`) the moment either `as const` is dropped. jsdom cannot see readonly.
 */
describe('DIALOG_SHADOWS — F34′, both halves of Layout.shadow.dialog', () => {
  it('ships light as well as dark, and the demo consumes the scheme half', () => {
    expect(DIALOG_SHADOW).toBe(DIALOG_SHADOWS[scheme])
    // `Layout.ts:158-163` — `rgba(30, 58, 138, 0.15)` / offset `0 8` / opacity 1 / radius 28.
    expect(DIALOG_SHADOWS.light).toBe('0 8px 28px rgba(30, 58, 138, 0.15)')
    expect(DIALOG_SHADOWS.dark).toBe('0 8px 40px rgba(0,0,0,0.5)')
    expect(DIALOG_SHADOWS.light).not.toBe(DIALOG_SHADOWS.dark)
    // The whole finding: neither half casts a pure black onto the other's ground.
    expect(DIALOG_SHADOWS.light).not.toContain('rgba(0,0,0')
  })

  it('casts DOWNWARD in both halves — the sheet tier is the inverted one', () => {
    // A45/A46, phone §1.5's shipped bug: Phase 5 put `sheet` on a dialog and inverted its cast.
    // `SHEET_SHADOWS` is `0 -8px`; a dialog is `0 8px` in BOTH schemes.
    expect(DIALOG_SHADOWS.dark).not.toContain('-8px')
    expect(DIALOG_SHADOWS.light).not.toContain('-8px')
  })
})

describe('the fragments are readonly — F38′', () => {
  it('rejects a write to dialogSurface and dialogScrim at COMPILE time', () => {
    // Each `@ts-expect-error` IS the assertion, and it is a COMPILE-time one: `as const`
    // constrains the type, not the runtime object. So the writes live in a function that is
    // never called - the repo's own idiom (`ExportModal.test.tsx`'s R-17 pin) - because
    // executing them would really mutate a module-level fragment and leak into every later case
    // in this file. Drop either `as const satisfies CSSProperties` and the errors disappear, the
    // directives go unused, and `tsc --noEmit` fails. That is the only place this is observable.
    const reject = () => {
      // @ts-expect-error dialogSurface is readonly
      dialogSurface.padding = 99
      // @ts-expect-error dialogScrim is readonly
      dialogScrim.background = 'red'
    }
    expect(typeof reject).toBe('function')
    // ...and the fragments still hold what the recipe wrote.
    expect(dialogSurface.padding).toBe(spacing.md)
    expect(dialogScrim.background).toBe(colors.overlay)
  })
})
