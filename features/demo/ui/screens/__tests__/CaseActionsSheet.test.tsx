import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { CaseActionsSheet, reportScrollGate } from '@/features/demo/ui/screens/CaseActionsSheet'
import { toCaseSheet } from '@/features/demo/ui/screens/screenData'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { CaseStatus, DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { demoCase, demoLocation } from '@/features/demo/engine/store/__tests__/test-utils'

const aCase = (over: Partial<DemoCase> = {}): DemoCase => demoCase(over)

const aLoc = (over: Partial<DemoLocation> = {}): DemoLocation => demoLocation(over)

const handlers = () => ({
  onComplete: vi.fn(),
  onReopen: vi.fn(),
  onArchive: vi.fn(),
  onClose: vi.fn(),
})

function renderSheet(over: Partial<DemoCase> = {}, extra: { onEdit?: () => void } = {}) {
  const h = handlers()
  const caseData = toCaseSheet(aCase(over), [aLoc()])
  const utils = render(<CaseActionsSheet caseData={caseData} {...h} {...extra} />)
  return { ...h, ...utils }
}

const buttonNames = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.textContent?.trim() ?? '')
    .filter((t) => t.length > 0)

describe('CaseActionsSheet — status-aware action stack (phone actionsForStatus matrix)', () => {
  it('DRAFT offers Complete + Archive and no Reopen', () => {
    renderSheet({ status: 'draft' })
    expect(buttonNames()).toEqual(['Complete Case', 'Archive Case', 'Cancel'])
  })

  it('COMPLETE swaps Complete for Reopen, keeping Archive', () => {
    renderSheet({ status: 'complete' })
    expect(buttonNames()).toEqual(['Reopen Case', 'Archive Case', 'Cancel'])
  })

  it('ARCHIVED offers Reopen only — no Complete, no second Archive', () => {
    renderSheet({ status: 'archived' })
    expect(buttonNames()).toEqual(['Reopen Case', 'Cancel'])
  })

  it('renders Edit Case FIRST when the bridge supplies onEdit (P3.3 seam)', () => {
    const onEdit = vi.fn()
    renderSheet({ status: 'draft' }, { onEdit })
    expect(buttonNames()).toEqual(['Edit Case', 'Complete Case', 'Archive Case', 'Cancel'])
    fireEvent.click(screen.getByRole('button', { name: 'Edit Case' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it.each([
    ['draft', 'Complete Case', 'onComplete'],
    ['complete', 'Reopen Case', 'onReopen'],
    ['draft', 'Archive Case', 'onArchive'],
    ['draft', 'Cancel', 'onClose'],
  ] as const)('%s: "%s" fires %s', (status, label, handler) => {
    const sheet = renderSheet({ status: status as CaseStatus })
    fireEvent.click(screen.getByRole('button', { name: label }))
    expect(sheet[handler]).toHaveBeenCalledOnce()
  })
})

describe('CaseActionsSheet — header', () => {
  it('shows the case number, the display name, and the status line', () => {
    renderSheet({ status: 'draft' })
    expect(screen.getByRole('dialog', { name: 'PR25-0001' })).toBeInTheDocument()
    expect(screen.getByText("Kim's — B&E")).toBeInTheDocument()
    // Phone quirk lifted verbatim: DRAFT reads 'Active'.
    expect(screen.getByText('Status: Active')).toBeInTheDocument()
  })

  it('renders the raw lowercase status for non-draft cases (phone CaseActionsSheet.tsx:133)', () => {
    renderSheet({ status: 'archived' })
    expect(screen.getByText('Status: archived')).toBeInTheDocument()
  })

  it('suppresses a display name identical to the case number', () => {
    renderSheet({ displayName: 'PR25-0001' })
    expect(screen.queryAllByText('PR25-0001')).toHaveLength(1) // the title only
  })
})

describe('CaseActionsSheet — read-only case report', () => {
  it('groups personnel, incident, notes and details, in the phone order', () => {
    renderSheet({
      vcName: 'A. Okafor',
      vcBadge: '8812',
      incidentBusinessName: "Kim's Convenience",
      incidentStreetAddress: '1450 Eglinton Ave W',
      incidentCity: 'Mississauga',
      incidentCoordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
      notes: 'Suspect fled east on foot.',
    })
    const groups = Array.from(document.querySelectorAll('[data-report-group]')).map((el) =>
      el.getAttribute('data-report-group'),
    )
    expect(groups).toEqual(['personnel', 'incident', 'notes', 'meta'])
    expect(screen.getByText('Officer in Charge')).toBeInTheDocument()
    expect(screen.getByText('L. McHugh · #4471')).toBeInTheDocument()
    expect(screen.getByText('A. Okafor · #8812')).toBeInTheDocument()
    expect(screen.getByText('Unit')).toBeInTheDocument()
    expect(screen.getByText('Incident Location')).toBeInTheDocument()
    expect(screen.getByText('43.608700, -79.650500')).toBeInTheDocument()
    expect(screen.getByText('Suspect fled east on foot.')).toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Locations')).toBeInTheDocument()
    expect(screen.getByText('Just now')).toBeInTheDocument()
  })

  it('omits every empty group but Details, which always renders', () => {
    renderSheet({ oicName: '', oicBadge: '', unit: '' })
    expect(screen.queryByText('Case Personnel')).toBeNull()
    expect(screen.queryByText('Incident Location')).toBeNull()
    expect(screen.queryByText('Notes')).toBeNull()
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  it('never renders a (0,0) incident position as a captured coordinate (BUG-008 parity)', () => {
    renderSheet({ incidentCoordinates: { lat: 0, lng: 0, source: 'manual' }, incidentCity: 'Mississauga' })
    expect(screen.getByText('Incident Location')).toBeInTheDocument() // the city still shows
    expect(screen.queryByText('Coordinates')).toBeNull()
    expect(screen.queryByText('0.000000, 0.000000')).toBeNull()
  })
})

describe('reportScrollGate — the measured-overflow gate', () => {
  it('is OFF until both heights are measured (no scrollable first frame)', () => {
    expect(reportScrollGate({ bodyHeight: null, contentHeight: null })).toEqual({ maxHeight: undefined, scrollable: false })
    expect(reportScrollGate({ bodyHeight: 400, contentHeight: null })).toEqual({ maxHeight: 400, scrollable: false })
    expect(reportScrollGate({ bodyHeight: null, contentHeight: 900 })).toEqual({ maxHeight: undefined, scrollable: false })
  })

  it('caps the report at the measured body height and only scrolls on REAL overflow', () => {
    expect(reportScrollGate({ bodyHeight: 400, contentHeight: 320 })).toEqual({ maxHeight: 400, scrollable: false })
    expect(reportScrollGate({ bodyHeight: 400, contentHeight: 401 })).toEqual({ maxHeight: 400, scrollable: false }) // +1 slack
    expect(reportScrollGate({ bodyHeight: 400, contentHeight: 402 })).toEqual({ maxHeight: 400, scrollable: true })
  })

  it('treats a zero/unlaid-out body as unmeasured rather than capping the report to nothing', () => {
    expect(reportScrollGate({ bodyHeight: 0, contentHeight: 900 })).toEqual({ maxHeight: undefined, scrollable: false })
  })
})

describe('CaseActionsSheet — the report reacts to measurement', () => {
  const realRO = globalThis.ResizeObserver
  afterEach(() => {
    globalThis.ResizeObserver = realRO
  })

  it('leaves the panel un-scrollable in an unlaid-out document and turns scrolling ON once content overflows', () => {
    // jsdom performs no layout, so drive the phone's onLayout/onContentSizeChange pair
    // ourselves: a controllable ResizeObserver plus patched box metrics.
    let fire: (() => void) | null = null
    class ControllableRO {
      constructor(private cb: () => void) {
        fire = () => this.cb()
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    globalThis.ResizeObserver = ControllableRO as unknown as typeof ResizeObserver

    renderSheet()
    const report = document.querySelector('[data-case-report]') as HTMLElement
    // Unmeasured (jsdom): hugs its content, no scrollbar, no cap.
    expect(report.style.overflowY).toBe('hidden')
    expect(report.style.maxHeight).toBe('')

    const body = report.parentElement as HTMLElement
    // The CONTENT wrapper is what gets measured — the scroller's own box is pinned by the
    // cap and would stop reporting growth once applied.
    const content = document.querySelector('[data-case-report-content]') as HTMLElement
    Object.defineProperty(body, 'clientHeight', { configurable: true, value: 300 })
    Object.defineProperty(content, 'offsetHeight', { configurable: true, value: 900 })
    act(() => fire?.())

    expect(report.style.maxHeight).toBe('300px')
    expect(report.style.overflowY).toBe('auto')
  })
})
