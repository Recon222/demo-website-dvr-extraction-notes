import { describe, it, expect, vi } from 'vitest'
// Controlled seam for motion/react's useReducedMotion — see the ExportHub precedent (R-23): the
// real hook latches a module-global on first use, so the setup file's `matches: false` matchMedia
// stub pins it and a per-test override cannot flip it.
const motionState = vi.hoisted(() => ({ reduce: false as boolean | null }))
vi.mock('motion/react', async (orig) => ({
  ...(await orig<typeof import('motion/react')>()),
  useReducedMotion: () => motionState.reduce,
}))
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  ExportActionSheet,
  type ExportActionSheetProps,
  type ExportSheetOption,
} from '@/features/demo/ui/screens/ExportActionSheet'
import { colors } from '@/features/demo/ui/tokens/palette'

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

  // W4/F86. `GlassBottomSheet` — this sheet's own sibling, on the same `sheetUp` keyframe —
  // gates it; this one is a hand-rolled copy that missed the treatment. A sheet that slides up
  // from off-screen is vestibular motion, not decoration.
  it('drops the sheetUp entrance under prefers-reduced-motion, keeping the sheet', () => {
    renderSheet({ title: 'Choose Export Scope' })
    expect(screen.getByRole('menu').style.animation).toContain('sheetUp')

    motionState.reduce = true
    try {
      cleanup()
      renderSheet({ title: 'Choose Export Scope' })
      const sheet = screen.getByRole('menu')
      expect(sheet.style.animation).toBe('')
      // It must still be a menu, still titled, still holding its options — the sheet arrives
      // instantly rather than not at all.
      expect(sheet).toHaveAccessibleName('Choose Export Scope')
      expect(screen.getAllByRole('menuitem')).toHaveLength(OPTIONS.length)
    } finally {
      motionState.reduce = false
    }
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

describe('ExportActionSheet — focus management', () => {
  it('takes focus on mount, so the sheet is announced and its keys are reachable', () => {
    renderSheet()
    expect(screen.getByRole('menu')).toHaveFocus()
  })

  it('hands focus back to the opener when it closes', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()

    const { unmount } = render(<ExportActionSheet options={OPTIONS} onSelect={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('menu')).toHaveFocus()

    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('does not chase a focus target that left the document', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(<ExportActionSheet options={OPTIONS} onSelect={vi.fn()} onCancel={vi.fn()} />)

    opener.remove() // the Completion form re-rendered underneath the scrim
    expect(() => unmount()).not.toThrow()
  })
})

describe('ExportActionSheet — keyboard traversal', () => {
  /**
   * Keydown dispatches at `document.activeElement`, so these bubble from wherever focus really
   * is (review R-7) — never fired directly at the container, which a browser never does. The
   * mount effect leaves focus ON the menu, which is the state the primary path opens in.
   */
  it('moves focus down and wraps, because role="menu" promises it', () => {
    renderSheet()
    const [location, full, cancel] = screen.getAllByRole('menuitem')

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(location).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(full).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
    expect(location).toHaveFocus()
  })

  it('ArrowUp from the freshly-opened sheet lands on the last row', () => {
    renderSheet()
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' })
    expect(screen.getByTestId('export-option-cancel')).toHaveFocus()
  })

  it('dims the screen behind it with the ONE backdrop token (A22/U4.4)', () => {
    renderSheet({})
    expect(screen.getByTestId('export-sheet-scrim').style.background).toBe(colors.scrim)
  })
})
