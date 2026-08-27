import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Controlled seam for motion/react's useReducedMotion (the ImportTerminalProgress precedent,
// R-18): the real hook latches a module-global on first use, so the setup file's
// `matches: false` matchMedia stub pins it and a per-test override cannot flip it. The mock
// also pins WHICH hook the footer consumes.
const motionState = vi.hoisted(() => ({ reduce: false as boolean | null }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}))
import { resolveExportPlan, type ExportSelection } from '@/features/demo/engine/logic/export'
import { ExportHub, type ExportHubProps } from '@/features/demo/ui/screens/export/ExportHub'
import { caseStatusTheme, locationStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone } from '@/features/demo/ui/tokens/status'

/**
 * P5.2 — the Export tab's hub (matrix rows 7/24, ui-mapping 04). Behavioural coverage of the
 * three things the phone's design package makes load-bearing: the single-open accordion, the
 * tri-state case checkbox, and the lit-vs-dimmed card treatment — plus the footer, which must
 * never say anything the engine's plan didn't decide.
 */

const cardA: CaseCard = {
  id: 'c1',
  caseNumber: 'PR25-A',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [],
  createdLabel: 'Just now',
  locations: [
    { id: 'l1', locationName: "Kim's Convenience", address: '1450 Eglinton Ave W', status: locationStatusTheme('started') },
    { id: 'l2', locationName: 'Rear Alley', address: '', status: locationStatusTheme('working') },
  ],
  locationCountLabel: '2 locations',
}
const cardB: CaseCard = {
  ...cardA,
  id: 'c2',
  caseNumber: 'PR25-B',
  displayName: '',
  locations: [{ id: 'l3', locationName: 'Loading Dock', address: '', status: locationStatusTheme('started') }],
  locationCountLabel: '1 location',
}
/** A case with nothing exportable — a real state on the phone, not an error. */
const cardEmpty: CaseCard = { ...cardA, id: 'c3', caseNumber: 'PR25-C', displayName: '', locations: [], locationCountLabel: '0 locations' }

const selectionOf = (caseId: string, ids: string[], armedFullCase = false): ExportSelection => ({
  caseId,
  locationIds: new Set(ids),
  armedFullCase,
})

function footerFor(card: CaseCard, selection: ExportSelection) {
  return { caseNumber: card.caseNumber, plan: resolveExportPlan(selection, card.locations.length) }
}

function renderHub(over: Partial<ExportHubProps> = {}) {
  const props: ExportHubProps = {
    cases: [cardA, cardB],
    selection: null,
    footer: null,
    isExporting: false,
    onToggleCase: vi.fn(),
    onToggleLocation: vi.fn(),
    onClearSelection: vi.fn(),
    onExportPress: vi.fn(),
    ...over,
  }
  const view = render(<ExportHub {...props} />)
  return { ...props, rerender: (next: Partial<ExportHubProps>) => view.rerender(<ExportHub {...props} {...next} />) }
}

const caseHeader = (caseNumber: string) => screen.getByRole('button', { name: `Case ${caseNumber}` })
const caseCheckbox = (caseNumber: string) => screen.getByRole('checkbox', { name: `Select all locations in ${caseNumber}` })
/** The card element itself — the header button's grandparent (button → header row → card). */
const cardEl = (caseNumber: string) => caseHeader(caseNumber).parentElement!.parentElement as HTMLElement

/**
 * A69's `medium` half. The demo's six pill sites split 2 medium / 4 small, mirroring the phone's
 * own call sites, and this is one of the two mediums (phone
 * `export-hub/ExportCaseCard.tsx:182` renders `<CaseStatusBadge status={...} />` at its default
 * size, alongside the location count). Dashboard's test covers `small`; `CasesScreen`'s two
 * sites take the same two shapes through the same recipe.
 */
describe('the ONE status pill (A69)', () => {
  it('renders the export card`s badge at `medium` — 4/8 @14, from THE recipe', () => {
    renderHub()
    const pill = screen.getAllByText('Active')[0]
    expect(pill).toHaveStyle({ padding: '4px 8px', fontSize: '14px', borderRadius: '12px', borderWidth: '1px' })
    const tone = severityTone('warning')
    expect(pill).toHaveStyle({ background: tone.background, color: tone.color, borderColor: tone.borderColor })
  })

  it('renders a location row`s badge at `small` inside the same card', () => {
    renderHub()
    fireEvent.click(caseHeader('PR25-A'))
    const pill = screen.getAllByText('Started')[0]
    expect(pill).toHaveStyle({ padding: '2px 6px', fontSize: '12px' })
    // The row badge kept its own layout key; the recipe must not have been erased by it.
    expect(pill).toHaveStyle({ flex: '0 0 auto', borderWidth: '1px' })
  })
})

describe('ExportHub — empty state', () => {
  it('says "No cases to export" and renders no footer', () => {
    renderHub({ cases: [] })
    expect(screen.getByText('No cases to export')).toBeInTheDocument()
    expect(document.querySelector('[data-export-footer]')).toBeNull()
  })
})

describe('ExportHub — single-open accordion', () => {
  it('opens a case on press and closes it on a second press', () => {
    renderHub()
    expect(screen.queryByRole('checkbox', { name: "Select Kim's Convenience" })).toBeNull()
    fireEvent.click(caseHeader('PR25-A'))
    expect(screen.getByRole('checkbox', { name: "Select Kim's Convenience" })).toBeInTheDocument()
    fireEvent.click(caseHeader('PR25-A'))
    expect(screen.queryByRole('checkbox', { name: "Select Kim's Convenience" })).toBeNull()
  })

  it('opening a second case closes the first — exactly one open at a time', () => {
    renderHub()
    fireEvent.click(caseHeader('PR25-A'))
    fireEvent.click(caseHeader('PR25-B'))
    expect(screen.queryByRole('checkbox', { name: "Select Kim's Convenience" })).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select Loading Dock' })).toBeInTheDocument()
  })

  it('lights the open card and dims every other one (dimmed cards stay interactive)', () => {
    const { onToggleCase } = renderHub()
    // Nothing open: no card is dimmed.
    expect(cardEl('PR25-A').style.opacity).toBe('1')
    expect(cardEl('PR25-B').style.opacity).toBe('1')

    fireEvent.click(caseHeader('PR25-A'))
    expect(cardEl('PR25-A').style.opacity).toBe('1')
    expect(cardEl('PR25-B').style.opacity).toBe('0.5')
    // Lit = accent border + accent glow; the dimmed sibling keeps the idle treatment.
    // (jsdom normalises colour literals, hence the rgb() forms — colors.link is #b8d4f0.
    //  W0-F1: the lit outline is an accent MARK, so it is `link`, not the CTA fill shade.)
    expect(cardEl('PR25-A').style.border).toContain('rgb(184, 212, 240)')
    expect(cardEl('PR25-A').style.boxShadow).toContain('rgba(184, 212, 240, 0.35)')
    expect(cardEl('PR25-B').style.border).not.toContain('rgb(184, 212, 240)')

    // Opacity only — the dimmed card still takes presses.
    fireEvent.click(caseCheckbox('PR25-B'))
    expect(onToggleCase).toHaveBeenCalledWith('c2')
  })

  it('surfaces a newly armed case, but never steals the accordion on mount', () => {
    // Mounting WITH a selection must not auto-expand (phone's ref guard).
    const armed = selectionOf('c1', ['l1'])
    const { rerender } = renderHub({ selection: armed, footer: footerFor(cardA, armed) })
    expect(screen.queryByRole('checkbox', { name: "Select Kim's Convenience" })).toBeNull()

    // Arming a DIFFERENT case afterwards opens it.
    const armedB = selectionOf('c2', ['l3'], true)
    rerender({ selection: armedB, footer: footerFor(cardB, armedB) })
    expect(screen.getByRole('checkbox', { name: 'Select Loading Dock' })).toBeInTheDocument()
  })

  it('resolves a stale open id against the live list rather than dimming everything', () => {
    const { rerender } = renderHub()
    fireEvent.click(caseHeader('PR25-B'))
    expect(cardEl('PR25-A').style.opacity).toBe('0.5')
    // Case B disappears (deleted elsewhere): nothing is open, so nothing is dimmed.
    rerender({ cases: [cardA] })
    expect(cardEl('PR25-A').style.opacity).toBe('1')
  })
})

describe('ExportHub — tri-state case checkbox', () => {
  it('reads none / some / all from the engine, counting only the rows it renders', () => {
    const { rerender } = renderHub({ selection: null })
    expect(caseCheckbox('PR25-A')).toHaveAttribute('aria-checked', 'false')

    rerender({ selection: selectionOf('c1', ['l1']) })
    expect(caseCheckbox('PR25-A')).toHaveAttribute('aria-checked', 'mixed')
    // One-case rule: every other card reads none.
    expect(caseCheckbox('PR25-B')).toHaveAttribute('aria-checked', 'false')

    rerender({ selection: selectionOf('c1', ['l1', 'l2']) })
    expect(caseCheckbox('PR25-A')).toHaveAttribute('aria-checked', 'true')
  })

  it('disables the checkbox of a case with no locations and says why when opened', () => {
    renderHub({ cases: [cardEmpty] })
    expect(caseCheckbox('PR25-C')).toBeDisabled()
    fireEvent.click(caseHeader('PR25-C'))
    expect(screen.getByText('No locations, nothing exportable')).toBeInTheDocument() // phone ExportCaseCard.tsx:218, verbatim
  })

  it('reports location toggles with both ids', () => {
    const { onToggleLocation } = renderHub()
    fireEvent.click(caseHeader('PR25-A'))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Rear Alley' }))
    expect(onToggleLocation).toHaveBeenCalledWith('c1', 'l2')
  })

  it('locks every checkbox and the CTA during a run — but not Clear', () => {
    const selection = selectionOf('c1', ['l1'])
    renderHub({ selection, footer: footerFor(cardA, selection), isExporting: true })
    fireEvent.click(caseHeader('PR25-A'))
    expect(caseCheckbox('PR25-A')).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: "Select Kim's Convenience" })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export 1 Location' })).toBeDisabled()
    // Observed phone behaviour (ui-mapping 04): Clear alone is never gated on isExporting.
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()
  })
})

describe('ExportHub — pre-flight footer', () => {
  it('renders the engine plan verbatim for a single location', () => {
    const selection = selectionOf('c1', ['l1'])
    renderHub({ selection, footer: footerFor(cardA, selection) })
    expect(screen.getByText('LOCATION ZIP · SINGLE LOCATION')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 locations selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export 1 Location' })).toBeInTheDocument()
    // The armed case is named in the footer AND echoed above the list.
    expect(screen.getAllByText('PR25-A').length).toBeGreaterThanOrEqual(2)
  })

  it('renders the engine plan verbatim for a full case', () => {
    const selection = selectionOf('c1', ['l1', 'l2'], true)
    renderHub({ selection, footer: footerFor(cardA, selection) })
    expect(screen.getByText('CASE ZIP · CANONICAL · INCLUDES CASE MAP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export Full Case (2 locations)' })).toBeInTheDocument()
  })

  it('renders the engine plan verbatim for a partial subset', () => {
    const card: CaseCard = {
      ...cardA,
      locations: [...cardA.locations, { id: 'l9', locationName: 'Side Door', address: '', status: locationStatusTheme('started') }],
      locationCountLabel: '3 locations',
    }
    const selection = selectionOf('c1', ['l1', 'l2'])
    renderHub({ cases: [card], selection, footer: footerFor(card, selection) })
    expect(screen.getByText('SUBSET ZIP · PARTIAL · 2 OF 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export 2 of 3 Locations' })).toBeInTheDocument()
  })

  it('colours the artifact line by the plan kind, not by a second branch', () => {
    const full = selectionOf('c1', ['l1', 'l2'], true)
    const { rerender } = renderHub({ selection: full, footer: footerFor(cardA, full) })
    // Read off the tokens (phone `export-hub/ExportHub.tsx:329-337`: `colors.success` /
    // `colors.textSecondary` / `colors.warning`). The literals these replace would have stayed
    // green through a re-point of any of the three.
    expect(screen.getByText('CASE ZIP · CANONICAL · INCLUDES CASE MAP')).toHaveStyle({ color: colors.success })
    const one = selectionOf('c1', ['l1'])
    rerender({ selection: one, footer: footerFor(cardA, one) })
    expect(screen.getByText('LOCATION ZIP · SINGLE LOCATION')).toHaveStyle({ color: colors.textSecondary })
    const subset = selectionOf('c1', ['l1', 'l2'])
    rerender({ cases: [{ ...cardA, locationCountLabel: '3 locations' }], selection: subset, footer: footerFor({ ...cardA, locations: [...cardA.locations, { id: 'l3', locationName: 'Side', address: '', status: locationStatusTheme('started') }] }, subset) })
    expect(screen.getByText(/^SUBSET ZIP/)).toHaveStyle({ color: colors.warning })
  })

  it('drops the rise animation under prefers-reduced-motion, keeping the footer itself (R-23)', () => {
    const selection = selectionOf('c1', ['l1'])
    const { rerender } = renderHub({ selection, footer: footerFor(cardA, selection) })
    const footerEl = () => document.querySelector('[data-export-footer]') as HTMLElement
    expect(footerEl().style.animation).toContain('exportFooterRise')

    motionState.reduce = true
    try {
      rerender({ selection, footer: footerFor(cardA, selection) })
      // Nothing moves — but the pre-flight panel and its CTA are still there, which is the
      // half a "just disable the animation" refactor tends to take with it.
      expect(footerEl().style.animation).toBe('')
      expect(screen.getByRole('button', { name: 'Export 1 Location' })).toBeInTheDocument()
    } finally {
      motionState.reduce = false
    }
  })

  it('hands the CTA and Clear presses straight out', () => {
    const selection = selectionOf('c1', ['l1'])
    const { onExportPress, onClearSelection } = renderHub({ selection, footer: footerFor(cardA, selection) })
    fireEvent.click(screen.getByRole('button', { name: 'Export 1 Location' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onExportPress).toHaveBeenCalledOnce()
    expect(onClearSelection).toHaveBeenCalledOnce()
  })
})
