import { describe, it, expect, vi } from 'vitest'
// Controlled seam for motion/react's useReducedMotion — the ExportHub/ImportTerminalProgress
// precedent (R-18/R-23): the real hook latches a module-global on first use, so the setup file's
// `matches: false` matchMedia stub pins it and a per-test override cannot flip it. The mock also
// pins WHICH hook the spinner consumes.
const motionState = vi.hoisted(() => ({ reduce: false as boolean | null }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}))
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SyncStatusCard } from '@/features/demo/ui/screens/SyncStatusCard'
import type { SyncResult } from '@/features/demo/engine/types'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { SEVERITIES, severityTone } from '@/features/demo/ui/tokens/status'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

/**
 * ...and the same for a gradient, which jsdom re-spaces on read-back:
 * `linear-gradient(180deg,rgba(23,65,110,0.7),…)` comes back as
 * `linear-gradient(180deg, rgba(23, 65, 110, 0.7), …)`. Comparing the token's own string
 * against the DOM's would fail on formatting and pass on nothing — so the expectation is put
 * through the same normalisation the actual value went through.
 */
function jsdomBackground(value: string): string {
  const probe = document.createElement('div')
  probe.style.background = value
  return probe.style.background
}

const sync: SyncResult = {
  method: 'NTP',
  server: 'time.nrc.ca',
  offsetMs: 540,
  uncertaintyMs: 12.5,
  rttMs: 18,
  traceability: 'NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second',
  timestamp: Date.UTC(2025, 2, 8, 12, 0, 0),
  stratum: 2,
}

describe('SyncStatusCard', () => {
  it('renders nothing when idle (no sync, not syncing)', () => {
    const { container } = render(<SyncStatusCard sync={null} syncing={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the synchronizing state', () => {
    render(<SyncStatusCard sync={null} syncing />)
    expect(screen.getByText(/Synchronizing/)).toBeInTheDocument()
  })

  // W4/F86. `features/demo/CLAUDE.md`'s convention, and the shape five in-repo siblings already
  // ship. The spinner is an INFINITE rotation — the exact class `prefers-reduced-motion` exists
  // for, and the one this card had missed.
  it('stops the spinner under prefers-reduced-motion, keeping the state itself', () => {
    // Anchored to its own label, not to `svg[aria-hidden]` — the card's FIRST such svg is the
    // header's clock glyph, and a selector that picks that one reads '' in both states and
    // passes over a live animation. (Measured: it did, on the first run of this case.)
    const spinner = () => screen.getByText(/Synchronizing/).querySelector('svg') as HTMLElement
    const { rerender } = render(<SyncStatusCard sync={null} syncing />)
    expect(spinner().style.animation).toContain('spin')

    motionState.reduce = true
    try {
      rerender(<SyncStatusCard sync={null} syncing />)
      expect(spinner().style.animation).toBe('')
      // The half a "just delete the animation" fix takes with it: the glyph and the word are
      // what tell the user anything is happening at all, and both must survive.
      expect(spinner()).toBeInTheDocument()
      expect(screen.getByText(/Synchronizing/)).toBeInTheDocument()
    } finally {
      motionState.reduce = false
    }
  })

  it('renders every NTP field at parity with the app card', () => {
    render(<SyncStatusCard sync={sync} syncing={false} />)
    expect(screen.getByText('Synchronized')).toBeInTheDocument()
    expect(screen.getByText('NTP (Atomic Clock)')).toBeInTheDocument()
    expect(screen.getByText('time.nrc.ca')).toBeInTheDocument()
    expect(screen.getByText('0.540s (slow)')).toBeInTheDocument()
    expect(screen.getByText('±12.50ms')).toBeInTheDocument()
    expect(screen.getByText('9.00ms')).toBeInTheDocument() // network delay = rtt/2
    expect(screen.getByText('Calibrated at')).toBeInTheDocument()
    expect(screen.getByText(/NRC Canada stratum-2/)).toBeInTheDocument()
  })

  it('reads a negative offset as fast', () => {
    render(<SyncStatusCard sync={{ ...sync, offsetMs: -1200 }} syncing={false} />)
    expect(screen.getByText('1.200s (fast)')).toBeInTheDocument()
  })
})

/**
 * Row 35's ruling — *"severity on the icon, text in `colors.text`"* — pinned on the state this
 * card actually HAS.
 *
 * ## The plan row asks for an ERROR-state pin. There is no error state, and there cannot be one.
 *
 * `SyncResult` (`engine/types/index.ts:136-148`) has no failure variant, and `simulateNtpSync`
 * (`engine/logic/time-sync.ts:17-33`) has no error branch — it returns a populated `SyncResult`
 * unconditionally. The demo's sync is a shape simulator, not a request: there is no socket to
 * fail. Growing an `error` prop would mean inventing a failure the engine cannot produce, which
 * is dead code wearing a pin's clothes.
 *
 * The RULING still bites, on the success state, which is where this card actually spent a
 * saturated severity as text: `✓ Synchronized` was `colors.success` at 12.5px semibold. The
 * phone states the rule for its whole card, not just its error row (`SyncStatusCard.tsx:54-58`):
 * *"Status is carried by an Ionicon … The WORDS beside it are always `colors.text`: the
 * saturated status tokens measure 2.1-3.2:1 as body text on this card, and the icon is free to
 * carry the colour because the label carries the meaning."*
 *
 * So the pin is written against ALL of this card's status words rather than one state's, which
 * is both the honest port and the stronger assertion — an error row added later is covered by a
 * pin that already bans a severity token on any status word here.
 */
describe('SyncStatusCard — severity rides the icon, never the words (row 35)', () => {
  /** Every saturated severity token that must never reach text on this surface. */
  const SEVERITY_TOKENS = SEVERITIES.map((s) => severityTone(s).borderColor)

  it('paints the status word in `colors.text`, with the severity on the glyph beside it', () => {
    render(<SyncStatusCard sync={sync} syncing={false} />)
    const word = screen.getByText('Synchronized')
    expect(word.style.color).toBe(jsdomColor(colors.text))
    // The glyph is where the colour went. Read off the SVG's `stroke` attribute, which jsdom
    // leaves as the raw token rather than rewriting to `rgb()`.
    const glyph = (word.parentElement as HTMLElement).querySelector('svg') as SVGElement
    expect(glyph.getAttribute('stroke')).toBe(colors.success)
    // Decorative: the word beside it already carries the meaning (phone `:264-265`).
    expect(glyph).toHaveAttribute('aria-hidden', 'true')
  })

  it('spends no severity token as text in EITHER state', () => {
    // BOTH states, and that is not belt-and-braces: `ok = !!sync && !syncing`, so a single
    // render exercises exactly one branch — and the branch that carried the defect is the
    // SYNCED one. A version of this case that rendered only `syncing` passed over
    // `✓ Synchronized` in `colors.success`, which is the pin lying about the one thing it
    // exists to see.
    const offenders: string[] = []
    for (const props of [{ sync, syncing: false }, { sync: null, syncing: true }]) {
      const { container, unmount } = render(<SyncStatusCard {...props} />)
      // `Array.from`, not a bare `for...of` over the NodeList: `tsconfig` targets es5, where
      // iterating a `NodeListOf` needs `--downlevelIteration` (TS2802).
      for (const el of Array.from(container.querySelectorAll<HTMLElement>('[style]'))) {
        if (el.style.color && SEVERITY_TOKENS.some((t) => el.style.color === jsdomColor(t))) {
          offenders.push(`${el.textContent}: ${el.style.color}`)
        }
      }
      unmount()
    }
    expect(offenders, 'a saturated severity reached a text colour — C.3 rule 1').toEqual([])
  })

  it('draws its glyphs as real icons — no emoji left to ignore the colour it is given', () => {
    render(<SyncStatusCard sync={sync} syncing={false} />)
    // The phone's own reason (`:124-126`): the glyphs were colour emoji, "which ignore the
    // `color` style on both platforms, so the computed colour was a silent no-op there as well
    // and a screen reader announced the emoji instead of a status".
    expect(document.body.textContent).not.toMatch(/[⌚-⏺✅✓❌⬛️]|⏱/)
    expect(screen.getByText('Time Calibration').parentElement?.querySelector('svg')).not.toBeNull()
  })

  it('is a NESTED glass card, not a private severity-tinted box', () => {
    // Phone `:216-221`: `<Card glass glassVariant="nestedCard">` in BOTH states — success is
    // signalled by the glyph, never by re-tinting the whole surface. The demo painted
    // `rgba(16,209,119,0.06)` under a `rgba(16,209,119,0.3)` border when synced and a bare
    // `#0a1320` when not: two hand-rolled surfaces for one card.
    const { container, rerender } = render(<SyncStatusCard sync={sync} syncing={false} />)
    const box = () => container.firstElementChild as HTMLElement
    for (const state of ['synced', 'syncing'] as const) {
      if (state === 'syncing') rerender(<SyncStatusCard sync={null} syncing />)
      expect(box().style.background, state).toBe(jsdomBackground(glassCardNested.background))
      expect(box().style.borderTopColor, state).toBe(jsdomColor(glassCardNested.borderTopColor))
      expect(box().style.borderRightColor, state).toBe(jsdomColor(glassCardNested.borderRightColor))
      // The lit edge is not the sides — the pair IS the tier. A `border`/`borderColor` shorthand
      // written after the spread flattens all four, and this is the line that sees it.
      expect(box().style.borderTopColor, state).not.toBe(box().style.borderRightColor)
    }
  })

  it('spells no bare hex — every colour on this card is a palette or tier token', () => {
    const src = readFileSync(
      join(process.cwd(), 'features', 'demo', 'ui', 'screens', 'SyncStatusCard.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
  })
})
