import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabBar } from '@/features/demo/ui/controls/TabBar'
import { WizardDrawer, type DrawerItem } from '@/features/demo/ui/controls/WizardDrawer'

describe('TabBar', () => {
  it('renders the three tabs and calls onSelect', () => {
    const onSelect = vi.fn()
    render(<TabBar active="cases" onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText('Dashboard'))
    expect(onSelect).toHaveBeenCalledWith('dashboard')
    expect(screen.getByLabelText('Map')).toBeInTheDocument()
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

