import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotesScreen, type NotesScreenProps } from '@/features/demo/ui/screens/NotesScreen'
import type { NoteSectionMeta } from '@/features/demo/engine/logic/notes'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { TERMINAL_PALETTE } from '@/features/demo/ui/screens/import/terminal-palette'
import { scheme } from '@/features/demo/ui/tokens/palette'

/** jsdom normalizes hex inline colours to rgb(r, g, b). */
const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

// The phone's section-editor surface (ui-mapping 08): section states, the five confirm
// dialogs (exact copy), commit-on-blur-and-unmount, the taken-over banner, Copy all.

// R-29: the clipboard stub is torn down after every test — jsdom's navigator has no
// own `clipboard`, so restore means deleting the property (or reinstating a captured
// descriptor if one ever exists).
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard)
  } else {
    delete (navigator as { clipboard?: unknown }).clipboard
  }
})

function meta(over: Partial<NoteSectionMeta> = {}): NoteSectionMeta {
  return {
    id: 'address',
    label: 'address & visits',
    content: '• Attended Shop to recover requested video evidence.',
    manuallyEdited: false,
    stale: false,
    freshContent: '• Attended Shop to recover requested video evidence.',
    ...over,
  }
}

function props(over: Partial<NotesScreenProps> = {}): NotesScreenProps {
  return {
    sections: [meta()],
    freeText: '',
    copyAllText: '• Attended Shop to recover requested video evidence.',
    onCommitSection: vi.fn(),
    onCommitAddendum: vi.fn(),
    onResetSection: vi.fn(),
    onScrapAll: vi.fn(),
    onRestoreAll: vi.fn(),
    onCommitFreeText: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
    onMenu: vi.fn(),
    ...over,
  }
}

describe('NotesScreen — the forced-dark console panel (U7.1 / A85, B.6 row 45)', () => {
  it('takes its ground and outline from the ONE terminal palette, not a second copy', () => {
    // Before U7.1 this screen held `#060a12` / `#141c28` as its own literals while
    // `ImportTerminalProgress` held the same two — the exact duplication the phone's owned
    // module was created to end (phone terminal-palette.ts:10-12). A value-equality pin would
    // pass over a re-pasted copy, so this asserts the RELATIONSHIP: the panel paints what the
    // module says, and the module says what the import terminal's panel says.
    render(<NotesScreen {...props()} />)
    const panel = screen.getByLabelText('address & visits').closest('div[style*="overflow-y"]') as HTMLElement
    expect(panel).not.toBeNull()
    expect(panel.style.background).toBe(rgb(TERMINAL_PALETTE.screen[scheme]))
    expect(panel.style.border).toBe(`1px solid ${rgb(TERMINAL_PALETTE.border)}`)
  })

  it('indexes `screen` with the APP scheme, not the console\'s forced-dark one', () => {
    // The phone leaves exactly this key scheme-forked (`NotesSectionEditor.tsx:105` reads
    // `screen[colorScheme]`) because the inset lifts a few points on a light app; everything
    // INSIDE the panel is force-dark. Same object while the demo renders dark — the pin is
    // that the two arms are different values, so the distinction is not decorative.
    expect(TERMINAL_PALETTE.screen[scheme]).toBe(TERMINAL_PALETTE.screen.dark)
    expect(TERMINAL_PALETTE.screen.light).not.toBe(TERMINAL_PALETTE.screen.dark)
  })
})

describe('NotesScreen — section states', () => {
  it('hides empty auto sections entirely (the cameras section never renders)', () => {
    render(
      <NotesScreen
        {...props({
          sections: [meta(), meta({ id: 'cameras', label: 'cameras', content: '', freshContent: '' })],
        })}
      />,
    )
    expect(screen.getByLabelText('address & visits')).toBeInTheDocument()
    expect(screen.queryByLabelText('cameras')).not.toBeInTheDocument()
  })

  it('edits commit on unmount (navigation must not lose an in-progress edit)', () => {
    const onCommitSection = vi.fn()
    const { unmount } = render(<NotesScreen {...props({ onCommitSection })} />)
    const body = screen.getByLabelText('address & visits')
    fireEvent.focus(body)
    fireEvent.change(body, { target: { value: 'uncommitted edit' } })
    unmount() // no blur — the unmount flush must carry the draft
    expect(onCommitSection).toHaveBeenCalledWith('address', 'uncommitted edit')
  })

  it('stale edited section shows the fresh preview panel and confirms reset (exact dialog copy)', () => {
    const onResetSection = vi.fn()
    render(
      <NotesScreen
        {...props({
          sections: [
            meta({ content: 'my own account', manuallyEdited: true, stale: true, freshContent: '• Attended New Shop…' }),
          ],
          onResetSection,
        })}
      />,
    )
    expect(screen.getByText('SOURCE DATA CHANGED — AUTO-GENERATED WOULD NOW READ')).toBeInTheDocument()
    expect(screen.getByText('• Attended New Shop…')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reset to auto-generated'))
    expect(
      screen.getByText('Your text for "address & visits" will be replaced by the current auto-generated version. A note you added is kept.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('Reset'))
    expect(onResetSection).toHaveBeenCalledWith('address')
  })

  it('deleted+stale renders the compact restore row and confirms restore', () => {
    const onResetSection = vi.fn()
    render(
      <NotesScreen
        {...props({
          sections: [
            meta({ content: '', manuallyEdited: true, stale: true, freshContent: '• fresh again' }),
            // second un-edited section keeps the taken-over banner (its own Restore) away
            meta({ id: 'export', label: 'export', content: '• export line', freshContent: '• export line' }),
          ],
          onResetSection,
        })}
      />,
    )
    expect(screen.getByText('wizard has new content for this section')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Restore'))
    expect(screen.getByText('"address & visits" will return to auto-generated content.')).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Restore').find((el) => el.closest('[role="alertdialog"]'))!)
    expect(onResetSection).toHaveBeenCalledWith('address')
  })

  it('dialog Cancel fires nothing', () => {
    const onResetSection = vi.fn()
    render(
      <NotesScreen
        {...props({ sections: [meta({ content: 'x', manuallyEdited: true, stale: true, freshContent: 'y' })], onResetSection })}
      />,
    )
    fireEvent.click(screen.getByText('Reset to auto-generated'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onResetSection).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('NotesScreen — addendum', () => {
  it('"+ add note" opens the input; blur commits; empty blur closes it again', () => {
    const onCommitAddendum = vi.fn()
    render(<NotesScreen {...props({ onCommitAddendum })} />)
    fireEvent.click(screen.getByText('+ add note'))
    const input = screen.getByLabelText('Note added to address & visits')
    fireEvent.change(input, { target: { value: 'manager was present' } })
    fireEvent.blur(input)
    expect(onCommitAddendum).toHaveBeenCalledWith('address', 'manager was present')
  })

  it('a stored addendum renders without opening', () => {
    render(<NotesScreen {...props({ sections: [meta({ userAddendum: 'stored note' })] })} />)
    expect(screen.getByLabelText('Note added to address & visits')).toHaveValue('stored note')
  })
})

describe('NotesScreen — footer + banner', () => {
  it('confirmations use the shared AlertDialog contract: focus moves in, body copy is described-by (R-5)', () => {
    render(<NotesScreen {...props()} />)
    fireEvent.click(screen.getByText('Write my own notes…'))
    const dialog = screen.getByRole('alertdialog')
    // focus entered the dialog (the R-17 idiom) — a screen reader hears title AND body
    expect(dialog).toHaveFocus()
    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toContain(
      'Auto-generation stops for every section',
    )
  })

  it('scrap-all dialog carries the exact phone copy and routes both modes', () => {
    const onScrapAll = vi.fn()
    render(<NotesScreen {...props({ onScrapAll })} />)
    fireEvent.click(screen.getByText('Write my own notes…'))
    expect(screen.getByText('Auto-generation stops for every section. You can restore the auto-generated notes at any time.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Start from current notes'))
    expect(onScrapAll).toHaveBeenCalledWith('current')
    fireEvent.click(screen.getByText('Write my own notes…'))
    fireEvent.click(screen.getByText('Start blank'))
    expect(onScrapAll).toHaveBeenCalledWith('blank')
  })

  it('taken-over banner appears only when EVERY section is manually edited; empty free text → two-button restore', () => {
    const onRestoreAll = vi.fn()
    const { rerender } = render(
      <NotesScreen {...props({ sections: [meta({ manuallyEdited: true }), meta({ id: 'export', label: 'export' })] })} />,
    )
    expect(screen.queryByText('Auto-generation is off — restore anytime')).not.toBeInTheDocument()
    rerender(
      <NotesScreen
        {...props({
          sections: [meta({ manuallyEdited: true }), meta({ id: 'export', label: 'export', content: 'x', manuallyEdited: true })],
          onRestoreAll,
        })}
      />,
    )
    fireEvent.click(screen.getByText('Restore'))
    expect(screen.getByText('Every section returns to auto-generated content. Sections you rewrote will be replaced.')).toBeInTheDocument()
    fireEvent.click(screen.getAllByText('Restore').find((el) => el.closest('[role="alertdialog"]'))!)
    expect(onRestoreAll).toHaveBeenCalledWith('keep')
  })

  it('with free text present, restore-all offers keep vs clear (clear is the destructive branch)', () => {
    const onRestoreAll = vi.fn()
    render(
      <NotesScreen
        {...props({ sections: [meta({ manuallyEdited: true })], freeText: 'my own notes', onRestoreAll })}
      />,
    )
    fireEvent.click(screen.getByText('Restore'))
    expect(
      screen.getByText(/If you started from your current notes, keeping Additional Notes may repeat the restored sections\./),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('Restore & clear additional notes'))
    expect(onRestoreAll).toHaveBeenCalledWith('clear')
  })

  it('Copy all writes the COMMITTED assembly to the clipboard and confirms; failure is honest', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<NotesScreen {...props({ copyAllText: 'assembled notes' })} />)
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy all notes'))
    })
    expect(writeText).toHaveBeenCalledWith('assembled notes')
    expect(screen.getByText('Copied ✓')).toBeInTheDocument()

    writeText.mockRejectedValueOnce(new Error('blocked'))
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy all notes'))
    })
    expect(screen.getByText('Copy failed')).toBeInTheDocument()
  })

  it('R-12: a re-copy re-arms the reset window — the earlier timer cannot wipe the later confirmation', async () => {
    vi.useFakeTimers()
    try {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      render(<NotesScreen {...props({ copyAllText: 'assembled' })} />)
      const btn = screen.getByLabelText('Copy all notes')
      await act(async () => {
        fireEvent.click(btn)
      })
      await act(async () => {
        vi.advanceTimersByTime(1000) // first window half-elapsed
        fireEvent.click(btn) // second copy re-arms
      })
      await act(async () => {
        vi.advanceTimersByTime(700) // past the FIRST timer's would-be expiry
      })
      expect(screen.getByText('Copied ✓')).toBeInTheDocument() // not wiped early
      await act(async () => {
        vi.advanceTimersByTime(1000) // second window completes
      })
      expect(screen.queryByText('Copied ✓')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('free text commits on blur', () => {
    const onCommitFreeText = vi.fn()
    render(<NotesScreen {...props({ onCommitFreeText })} />)
    const tail = screen.getByLabelText('Additional notes')
    fireEvent.change(tail, { target: { value: 'extra observations' } })
    fireEvent.blur(tail)
    expect(onCommitFreeText).toHaveBeenCalledWith('extra observations')
  })
})

describe('NotesScreen — bridge integration (Flow A wiring)', () => {
  beforeEach(() => {
    // jsdom shares one window per test file — snapshot hygiene between mounts.
    window.sessionStorage.clear()
  })

  it('entering the Notes screen reconciles: sections appear and an edit survives leaving + returning', () => {
    const store = createDemoStore()
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR25-TEST', displayName: 'T', unit: 'U' })
      store.getState().addLocation(caseId, { locationName: 'Shop', businessName: 'Shop', streetAddress: '1 A St', city: 'Town' })
    })
    const view = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().setView('notes')
    })
    // Flow A fired: the address section is populated from the wizard data
    const body = screen.getByLabelText('address & visits')
    expect(body).toHaveValue('• Attended Shop, 1 A St, Town to recover requested video evidence.')
    // edit + blur commits through the bridge
    fireEvent.focus(body)
    fireEvent.change(body, { target: { value: 'my own account' } })
    fireEvent.blur(body)
    // leave and return — the edit survived (manual edits are never clobbered)
    act(() => {
      store.getState().setView('exportInfo')
    })
    act(() => {
      store.getState().setView('notes')
    })
    expect(screen.getByLabelText('address & visits')).toHaveValue('my own account')
    view.unmount()
  })
})
