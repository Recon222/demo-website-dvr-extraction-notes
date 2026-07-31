import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ExportActionSheet,
  type ExportActionSheetProps,
  type ExportSheetOption,
} from '@/features/demo/ui/screens/ExportActionSheet'

/**
 * P5.3 / matrix row 27 — the ZIP scope chooser (phone
 * `src/components/export/ExportActionSheet.tsx`, configured by `completion.tsx:298-316`).
 */

const OPTIONS: readonly ExportSheetOption[] = [
  {
    id: 'location',
    label: 'Export This Location',
    description: 'ZIP with documents and media for current location',
    icon: 'location',
  },
  {
    id: 'case',
    label: 'Export Full Case',
    description: 'ZIP with all locations, documents, and media',
    icon: 'folder',
  },
  { id: 'cancel', label: 'Cancel', icon: 'close' },
]

function renderSheet(over: Partial<ExportActionSheetProps> = {}) {
  const onSelect = over.onSelect ?? vi.fn()
  const onCancel = over.onCancel ?? vi.fn()
  render(<ExportActionSheet options={OPTIONS} {...over} onSelect={onSelect} onCancel={onCancel} />)
  return { onSelect, onCancel }
}

describe('ExportActionSheet — chrome', () => {
  it('is a menu titled by the caller', () => {
    renderSheet({ title: 'Choose Export Scope' })
    const sheet = screen.getByRole('menu')
    expect(sheet).toHaveAccessibleName('Choose Export Scope')
    expect(screen.getByText('Choose Export Scope')).toBeInTheDocument()
  })

  it("falls back to the phone component's own default title", () => {
    renderSheet()
    expect(screen.getByText('Export Options')).toBeInTheDocument()
  })
})

describe('ExportActionSheet — options', () => {
  it('renders every option with its label and description, in order', () => {
    renderSheet()
    const items = screen.getAllByRole('menuitem')
    expect(items.map((i) => i.getAttribute('data-testid'))).toEqual([
      'export-option-location',
      'export-option-case',
      'export-option-cancel',
    ])
    expect(items[0]).toHaveTextContent('Export This Location')
    expect(items[0]).toHaveTextContent('ZIP with documents and media for current location')
    expect(items[1]).toHaveTextContent('Export Full Case')
    expect(items[1]).toHaveTextContent('ZIP with all locations, documents, and media')
    expect(items[2]).toHaveTextContent('Cancel')
  })

  it('reports the picked option id', () => {
    const { onSelect } = renderSheet()
    fireEvent.click(screen.getByTestId('export-option-case'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('case')
  })

  it('routes Cancel through onSelect too — the caller decides it means "do nothing"', () => {
    const { onSelect, onCancel } = renderSheet()
    fireEvent.click(screen.getByTestId('export-option-cancel'))
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('cancel')
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('separates rows with a hairline, but never below the last row or above Cancel', () => {
    const { container } = render(
      <ExportActionSheet options={OPTIONS} onSelect={vi.fn()} onCancel={vi.fn()} />,
    )
    // location | case  → one hairline; the cancel row carries its own top rule instead.
    expect(container.querySelectorAll('[data-export-sheet-separator]')).toHaveLength(1)
  })
})

describe('ExportActionSheet — dismissal', () => {
  it('cancels on the scrim and on Escape', () => {
    const { onCancel } = renderSheet()
    fireEvent.click(screen.getByTestId('export-sheet-scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})

describe('ExportActionSheet — disabled (bound to isExporting)', () => {
  it('disables every option at once and refuses both escape routes', () => {
    const { onSelect, onCancel } = renderSheet({ disabled: true })
    for (const item of screen.getAllByRole('menuitem')) expect(item).toBeDisabled()

    fireEvent.click(screen.getByTestId('export-option-case'))
    fireEvent.click(screen.getByTestId('export-sheet-scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('ExportActionSheet — keyboard traversal', () => {
  it('moves focus down and wraps, because role="menu" promises it', () => {
    renderSheet()
    const sheet = screen.getByRole('menu')
    const [location, full, cancel] = screen.getAllByRole('menuitem')

    fireEvent.keyDown(sheet, { key: 'ArrowDown' })
    expect(location).toHaveFocus()
    fireEvent.keyDown(sheet, { key: 'ArrowDown' })
    expect(full).toHaveFocus()
    fireEvent.keyDown(sheet, { key: 'ArrowDown' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(sheet, { key: 'ArrowDown' })
    expect(location).toHaveFocus()
  })

  it('ArrowUp from the sheet lands on the last row', () => {
    renderSheet()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })
    expect(screen.getByTestId('export-option-cancel')).toHaveFocus()
  })
})
