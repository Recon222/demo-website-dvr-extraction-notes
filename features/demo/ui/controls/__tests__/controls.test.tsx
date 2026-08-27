import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar, TAB_BAR_HEIGHT } from '@/features/demo/ui/controls/TabBar'
import { TAB_LABELS, TAB_VIEWS } from '@/features/demo/engine/content/screens'
import { WizardDrawer, type DrawerItem } from '@/features/demo/ui/controls/WizardDrawer'
import { colors } from '@/features/demo/ui/tokens/palette'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

describe('TabBar', () => {
  it('renders the four tabs and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<TabBar active="cases" onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('Dashboard'))
    expect(onSelect).toHaveBeenCalledWith('dashboard')
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Export'))
    expect(onSelect).toHaveBeenCalledWith('export')
  })

  it('takes its order and labels from the registry, and gives every tab an icon', () => {
    // Order is DERIVED (TAB_VIEWS), never hand-listed in the component — the 4th tab needed no
    // new button here and a 5th won't either.
    const { container } = render(<TabBar active="export" onSelect={vi.fn()} />)
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(TAB_VIEWS.map((t) => TAB_LABELS[t]))
    for (const b of buttons) expect(b.querySelector('svg'), `${b.getAttribute('aria-label')} has no icon`).not.toBeNull()
  })

  it('highlights the active tab only', () => {
    // U8.3/A63: the tints are the phone's navigator options, not demo one-offs —
    // `tabBarActiveTintColor: colors.primary` / `tabBarInactiveTintColor: colors.textSecondary`
    // (`app/(tabs)/_layout.tsx:13-14`). Composed from the palette so the pin moves with the
    // token rather than freezing `#2B8CC1`/`#99badd`; the RED this replaced was
    // `#4BA3D4`/`#5d7a9a` (the pre-port pair, owned by this package per plan §4.4).
    const { container } = render(<TabBar active="export" onSelect={vi.fn()} />)
    const stroke = (label: string) => {
      const svg = container.querySelector(`button[aria-label="${label}"] svg`)!
      return svg.getAttribute('stroke') ?? svg.getAttribute('fill')
    }
    expect(stroke('Export')).toBe(colors.primary)
    expect(stroke('Map')).toBe(colors.textSecondary)
    // Anti-vacuity: the two tints are actually DIFFERENT, so an accident that collapses the
    // ternary to one arm cannot satisfy both lines above.
    expect(stroke('Export')).not.toBe(stroke('Map'))
  })

  it('paints the phone tab-bar chrome: flat `card` fill, `border` hairline, paddingTop 6, icons 24', () => {
    // Phone `app/(tabs)/_layout.tsx:15-19` — `backgroundColor: colors.card`,
    // `borderTopColor: colors.border`, `paddingTop: Layout.spacing.xsm` (= 6). The icons take
    // the navigator-supplied `size`, which is @react-navigation's 24 on both platforms.
    const { container } = render(<TabBar active="map" onSelect={vi.fn()} />)
    const bar = container.firstElementChild as HTMLElement

    expect(bar.style.backgroundColor).toBe(jsdomColor(colors.card))
    // A FLAT fill, not the demo's old `linear-gradient(180deg,#1e3450,#16283c)`.
    expect(bar.style.backgroundImage).toBe('')
    expect(bar.style.borderTopColor).toBe(jsdomColor(colors.border))
    expect(bar.style.borderTopWidth).toBe('1px')
    expect(bar.style.paddingTop).toBe('6px')

    for (const svg of container.querySelectorAll('svg')) {
      expect(svg.getAttribute('width')).toBe('24')
      expect(svg.getAttribute('height')).toBe('24')
    }
  })

  it('keeps TAB_BAR_HEIGHT at 50 — D6, the phone sets no height (three overlays bottom-align here)', () => {
    // Phone delta inventory §2.B: "HEIGHT IS NOT SET. There is no `height` key anywhere in
    // `tabBarStyle`." `ExportHub`, `CaseMapPicker` and `MapBottomSheet` all bottom-align
    // against this export, so it is a demo-side constant with nothing to port.
    expect(TAB_BAR_HEIGHT).toBe(50)
    const { container } = render(<TabBar active="map" onSelect={vi.fn()} />)
    expect((container.firstElementChild as HTMLElement).style.height).toBe('50px')
  })

  it('announces the active tab, not just tints it (R-19)', () => {
    // Colour alone was the only cue across four destinations. Exactly one tab is current.
    const { container, rerender } = render(<TabBar active="export" onSelect={vi.fn()} />)
    const current = () =>
      Array.from(container.querySelectorAll('button[aria-current="page"]')).map((b) => b.getAttribute('aria-label'))
    expect(current()).toEqual(['Export'])
    rerender(<TabBar active="dashboard" onSelect={vi.fn()} />)
    expect(current()).toEqual(['Dashboard'])
  })
})

describe('WizardDrawer', () => {
  const items: DrawerItem[] = [
    { id: 'submission', label: 'Submission', active: true },
    { id: 'timeOffset', label: 'Time Offset', active: false },
  ]
  /** Fresh spies per render — the drawer's required callbacks, overridable per case. */
  const cb = () => ({
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    onBackToCases: vi.fn(),
    onCaptureMedia: vi.fn(),
    onRecordAudio: vi.fn(),
    onOpenMediaLibrary: vi.fn(),
    saveStatus: null,
    // Both capture tools in the flow — the forensic default. The P7.3 gating has its own arm.
    mediaTools: { mediaCapture: true, audioRecording: true },
  })

  it('renders nothing when closed', () => {
    const { container } = render(<WizardDrawer open={false} items={items} {...cb()} />)
    expect(container.firstChild).toBeNull()
  })

  it('lists the items and calls onNavigate when open', () => {
    const onNavigate = vi.fn()
    render(<WizardDrawer open items={items} {...cb()} onNavigate={onNavigate} />)
    expect(screen.getByText('Submission')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Time Offset'))
    expect(onNavigate).toHaveBeenCalledWith('timeOffset')
  })

  it('calls onBackToCases / onClose', () => {
    const onBackToCases = vi.fn()
    const onClose = vi.fn()
    render(<WizardDrawer open items={items} {...cb()} onClose={onClose} onBackToCases={onBackToCases} />)
    fireEvent.click(screen.getByText('Back to Cases'))
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onBackToCases).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<WizardDrawer open items={items} {...cb()} onClose={onClose} />)
    fireEvent.click(container.querySelector('[data-drawer-backdrop]')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders completion dots from item status (complete/partial; none when absent)', () => {
    const withDots: DrawerItem[] = [
      { id: 'submission', label: 'Submission', active: true, status: 'complete' },
      { id: 'timeOffset', label: 'Time Offset', active: false, status: 'partial' },
      { id: 'dvrInfo', label: 'DVR', active: false },
    ]
    const { container } = render(<WizardDrawer open items={withDots} {...cb()} />)
    expect(container.querySelector('[data-dot="complete"]')).toBeTruthy()
    expect(container.querySelector('[data-dot="partial"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-dot]')).toHaveLength(2) // dvrInfo (no status) → no dot
    // status is announced via aria-label, not colour alone (M1)
    expect(screen.getByRole('button', { name: /Submission, complete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Time Offset, partially complete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'DVR' })).toBeInTheDocument() // no status → label only
  })

  it('renders no save-status line until one is sampled, then renders exactly what it is given', () => {
    // `null` is "not sampled yet" (the bridge samples on open), and the honest rendering of
    // that is NOTHING — a placeholder would be a claim about a state nobody has read.
    const { rerender, container } = render(<WizardDrawer open items={items} {...cb()} />)
    expect(container.querySelector('[data-save-status]')).toBeNull()

    rerender(
      <WizardDrawer open items={items} {...cb()} saveStatus={{ kind: 'unavailable', text: 'Not saved · x' }} />,
    )
    const line = container.querySelector('[data-save-status]')
    expect(line).toHaveAttribute('data-save-status', 'unavailable')
    // Presentational: the drawer never words the status itself.
    expect(line).toHaveTextContent('Not saved · x')
  })

  /**
   * P4.2 — the Media accordion (matrix row 80's missing half; phone
   * CustomDrawerContent.tsx:265-400). Copy and a11y labels are lifted verbatim.
   */
  describe('Media accordion', () => {
    const CAPTURE = 'Open camera to capture media'
    const AUDIO = 'Record audio note'
    const LIBRARY = 'Open media library'

    it('renders collapsed, with the section header and no sub-rows', () => {
      render(<WizardDrawer open items={items} {...cb()} />)
      const header = screen.getByRole('button', { name: 'Media section' })
      expect(header).toHaveAttribute('aria-expanded', 'false')
      expect(header).toHaveAttribute('title', 'Expand media options')
      expect(screen.getByText('Media')).toBeInTheDocument()
      for (const label of [CAPTURE, AUDIO, LIBRARY]) {
        expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument()
      }
    })

    it('expands to the phone’s three rows, in the phone’s order, and collapses again', () => {
      render(<WizardDrawer open items={items} {...cb()} />)
      const header = screen.getByRole('button', { name: 'Media section' })
      fireEvent.click(header)

      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(header).toHaveAttribute('title', 'Collapse media options')
      // a11y labels, verbatim, in render order — the header then the phone's three rows.
      const labels = Array.from(
        document.querySelectorAll('[data-media-accordion] button[aria-label]'),
      ).map((b) => b.getAttribute('aria-label'))
      expect(labels).toEqual(['Media section', CAPTURE, AUDIO, LIBRARY])
      expect(screen.getByText('Capture Media')).toBeInTheDocument()
      expect(screen.getByText('Record Audio')).toBeInTheDocument()
      expect(screen.getByText('Media Library')).toBeInTheDocument()

      fireEvent.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
      // Unmounted, not merely clipped: a collapsed row must not be focusable or announced.
      expect(screen.queryByRole('button', { name: CAPTURE })).not.toBeInTheDocument()
    })

    it.each([
      [CAPTURE, 'onCaptureMedia'],
      [AUDIO, 'onRecordAudio'],
      [LIBRARY, 'onOpenMediaLibrary'],
    ] as const)('%s fires %s and nothing else', (label, key) => {
      const props = cb()
      render(<WizardDrawer open items={items} {...props} />)
      fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
      fireEvent.click(screen.getByRole('button', { name: label }))

      expect(props[key]).toHaveBeenCalledOnce()
      // Wrong-row wiring is the failure this pins: assert every OTHER media callback is silent.
      for (const other of ['onCaptureMedia', 'onRecordAudio', 'onOpenMediaLibrary'] as const) {
        if (other !== key) expect(props[other]).not.toHaveBeenCalled()
      }
      // The rows never close the drawer themselves — the bridge decides (the phone's Media
      // Library row deliberately leaves it open behind the no-location toast).
      expect(props.onClose).not.toHaveBeenCalled()
    })

    it('leaves the completion dots alone (regression pin)', () => {
      const withDots: DrawerItem[] = [
        { id: 'submission', label: 'Submission', active: true, status: 'complete' },
        { id: 'timeOffset', label: 'Time Offset', active: false, status: 'partial' },
      ]
      const { container } = render(<WizardDrawer open items={withDots} {...cb()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
      // The accordion is appended after the step list and adds no dots of its own.
      expect(container.querySelectorAll('[data-dot]')).toHaveLength(2)
      expect(container.querySelector('[data-media-accordion] [data-dot]')).toBeNull()
    })
  })
})

