import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  DuplicateLocationModal,
  NAME_TAKEN_ERROR,
  type DuplicateLocationModalProps,
} from '@/features/demo/ui/screens/DuplicateLocationModal'

/**
 * P3.5 — the six-action chooser (matrix row 14; phone `DuplicateLocationModal`, ui-mapping 11).
 *
 * These pin the phone's copy, the render ORDER of the three action groups, which actions the
 * name field gates (only the two duplicates), and the conditional sections.
 */

function props(over: Partial<DuplicateLocationModalProps> = {}): DuplicateLocationModalProps {
  return {
    name: 'Main Store - Copy',
    onChangeName: vi.fn(),
    existingNames: ['Main Store'],
    onClose: vi.fn(),
    onDuplicate: vi.fn(),
    onNewAddress: vi.fn(),
    onExportZip: vi.fn(),
    onExportGeoJSON: vi.fn(),
    ...over,
  }
}

const btn = (name: string) => screen.getByRole('button', { name })

describe('DuplicateLocationModal', () => {
  it('renders the phone header, subtitle and pre-deduped name', () => {
    render(<DuplicateLocationModal {...props()} />)

    expect(screen.getByRole('dialog', { name: 'Duplicate Location' })).toBeInTheDocument()
    expect(screen.getByText('Enter a name for the duplicate location.')).toBeInTheDocument()
    const field = screen.getByLabelText('Location Name')
    expect(field).toHaveValue('Main Store - Copy')
    expect(field).toHaveAttribute('placeholder', 'e.g., Main Store - Copy')
  })

  it('renders the six actions plus Cancel in the phone order', () => {
    const { container } = render(<DuplicateLocationModal {...props()} />)
    const labels = Array.from(container.querySelectorAll('button'))
      .map((b) => b.textContent?.trim())
      .filter((t) => t && t !== 'Close')

    expect(labels).toEqual([
      'Duplicate Location',
      'Duplicate Location with Scopes',
      'New Location w/ Sub Info',
      'New Location w/ Sub Info + Scopes',
      'Export ZIP',
      'Export GeoJSON',
      'Cancel',
    ])
    expect(screen.getByText('Copy info to a new address')).toBeInTheDocument()
    expect(screen.getByText('Export this location')).toBeInTheDocument()
  })

  it('reports the edited name upward (the bridge owns the value)', () => {
    const p = props()
    render(<DuplicateLocationModal {...p} />)
    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Rear entrance' } })
    expect(p.onChangeName).toHaveBeenCalledWith('Rear entrance')
  })

  it('fires each duplicate mode with the trimmed name', () => {
    const p = props({ name: '  Main Store - Copy  ' })
    render(<DuplicateLocationModal {...p} />)

    fireEvent.click(btn('Duplicate Location'))
    expect(p.onDuplicate).toHaveBeenCalledWith('Main Store - Copy', 'submission-only')

    fireEvent.click(btn('Duplicate Location with Scopes'))
    expect(p.onDuplicate).toHaveBeenCalledWith('Main Store - Copy', 'with-scopes')
  })

  it('fires each new-address mode; those two never carry the name', () => {
    const p = props()
    render(<DuplicateLocationModal {...p} />)

    fireEvent.click(btn('New Location w/ Sub Info'))
    expect(p.onNewAddress).toHaveBeenCalledWith('submission-only')

    fireEvent.click(btn('New Location w/ Sub Info + Scopes'))
    expect(p.onNewAddress).toHaveBeenCalledWith('with-scopes')
  })

  it('fires the two export actions', () => {
    const p = props()
    render(<DuplicateLocationModal {...p} />)

    fireEvent.click(btn('Export ZIP'))
    expect(p.onExportZip).toHaveBeenCalledOnce()

    fireEvent.click(btn('Export GeoJSON'))
    expect(p.onExportGeoJSON).toHaveBeenCalledOnce()
  })

  it('Cancel and the shell close button both dismiss', () => {
    const p = props()
    render(<DuplicateLocationModal {...p} />)

    fireEvent.click(btn('Cancel'))
    fireEvent.click(btn('Close'))
    expect(p.onClose).toHaveBeenCalledTimes(2)
  })

  describe('name gating', () => {
    it('shows the phone error and disables ONLY the duplicates when the name is taken', () => {
      const p = props({ name: 'main store  ', existingNames: ['Main Store', 'Back Office'] })
      render(<DuplicateLocationModal {...p} />)

      // Trimmed + case-insensitive, like every other name comparison in the app.
      expect(screen.getByRole('alert')).toHaveTextContent(NAME_TAKEN_ERROR)
      expect(screen.getByLabelText('Location Name')).toHaveAttribute('aria-invalid', 'true')
      expect(btn('Duplicate Location')).toBeDisabled()
      expect(btn('Duplicate Location with Scopes')).toBeDisabled()
      // The other four ignore the name field entirely.
      expect(btn('New Location w/ Sub Info')).toBeEnabled()
      expect(btn('New Location w/ Sub Info + Scopes')).toBeEnabled()
      expect(btn('Export ZIP')).toBeEnabled()
      expect(btn('Export GeoJSON')).toBeEnabled()
      expect(btn('Cancel')).toBeEnabled()
    })

    it('disables the duplicates on a blank name, with no error text', () => {
      const p = props({ name: '   ' })
      render(<DuplicateLocationModal {...p} />)

      expect(screen.queryByRole('alert')).toBeNull() // empty is not "taken"
      expect(btn('Duplicate Location')).toBeDisabled()
      expect(btn('Duplicate Location with Scopes')).toBeDisabled()
    })

    it('emits nothing while gated', () => {
      // What this pins is the OUTCOME (no duplicate intent escapes on a colliding name), not
      // the mechanism: the `disabled` attribute and the commit-path guard share one predicate,
      // and a DOM click can only exercise the first. The second is the phone's belt-and-braces
      // for a future caller that renders the buttons enabled.
      const p = props({ name: 'Main Store' })
      render(<DuplicateLocationModal {...p} />)
      fireEvent.click(btn('Duplicate Location'))
      fireEvent.click(btn('Duplicate Location with Scopes'))
      expect(p.onDuplicate).not.toHaveBeenCalled()
    })

    it('clears the error once the name is free again', () => {
      const p = props({ name: 'Main Store' })
      const { rerender } = render(<DuplicateLocationModal {...p} />)
      expect(screen.getByRole('alert')).toBeInTheDocument()

      rerender(<DuplicateLocationModal {...p} name="Main Store - Copy" />)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(btn('Duplicate Location')).toBeEnabled()
    })
  })

  describe('conditional sections', () => {
    it('hides the new-address section without its handler', () => {
      render(<DuplicateLocationModal {...props({ onNewAddress: undefined })} />)

      expect(screen.queryByText('Copy info to a new address')).toBeNull()
      expect(screen.queryByRole('button', { name: 'New Location w/ Sub Info' })).toBeNull()
      expect(screen.getByText('Export this location')).toBeInTheDocument()
    })

    it('hides the export section unless BOTH export handlers are supplied', () => {
      const { rerender } = render(<DuplicateLocationModal {...props({ onExportGeoJSON: undefined })} />)
      expect(screen.queryByText('Export this location')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Export ZIP' })).toBeNull()

      rerender(<DuplicateLocationModal {...props({ onExportZip: undefined })} />)
      expect(screen.queryByText('Export this location')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Export GeoJSON' })).toBeNull()

      rerender(<DuplicateLocationModal {...props()} />)
      const section = screen.getByText('Export this location').parentElement!
      expect(within(section).getByRole('button', { name: 'Export ZIP' })).toBeInTheDocument()
      expect(within(section).getByRole('button', { name: 'Export GeoJSON' })).toBeInTheDocument()
    })
  })
})
