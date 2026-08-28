import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { NotesScreen, type NotesScreenProps } from '@/features/demo/ui/screens/NotesScreen'
import type { NoteSectionMeta } from '@/features/demo/engine/logic/notes'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { TERMINAL_PALETTE, TERMINAL_SCHEME } from '@/features/demo/ui/screens/import/terminal-palette'
import { activeScheme, palette, scheme, type ColorScheme } from '@/features/demo/ui/tokens/palette'

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
    nextLabel: "Next: Test Step", onNext: vi.fn(),
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
    // INSIDE the panel is force-dark.
    //
    // W4/F85. The pin this replaces was `screen[scheme] === screen.dark`, which restates "the
    // app currently ships dark" and nothing else: true today, false on the light flip, and
    // blind to the `screen[TERMINAL_SCHEME]` mis-index it is named for in EITHER scheme. What
    // follows asserts the panel takes the arm for the APP scheme and NOT the other one — the
    // mis-index exactly, the moment the two schemes diverge. `activeScheme` because comparing
    // the literal-typed `scheme` is the TS2367 shape W4/F84 closed.
    const otherArm: ColorScheme = activeScheme === 'dark' ? 'light' : 'dark'
    render(<NotesScreen {...props()} />)
    const panel = screen.getByLabelText('address & visits').closest('div[style*="overflow-y"]') as HTMLElement
    expect(panel.style.background).toBe(rgb(TERMINAL_PALETTE.screen[scheme]))
    expect(panel.style.background).not.toBe(rgb(TERMINAL_PALETTE.screen[otherArm]))
    // …and the fork is not decorative: the two arms are different values.
    expect(TERMINAL_PALETTE.screen.light).not.toBe(TERMINAL_PALETTE.screen.dark)
  })
})

/**
 * U7.3 closes U7.1's deferral B — the five hand-held constants INSIDE the forced-dark subtree.
 *
 * The phone wraps this editor's content in `<ForceColorScheme scheme="dark">`
 * (`NotesSectionEditor.tsx:110`) and then reads plain `colors.*` inside it, so every value below
 * is `palette[TERMINAL_SCHEME]` — the U7.1 forced-scheme pattern, never `palette.dark` (which
 * `glass-tokens.test.ts`'s scheme-half scan exempts no file from) and never `colors`, which is
 * the APP scheme and would put light-theme greys on a near-black console the day light opens.
 *
 * Values are asserted THROUGH the palette, not as hexes: a hex pin here would be a second copy
 * of the thing the tokenisation exists to delete.
 */
describe('NotesScreen — the forced-dark foregrounds (U7.1 deferral B / B.6 row 45)', () => {
  const forced = palette[TERMINAL_SCHEME]

  it('paints the section body in the forced-dark `text`, not a private near-copy', () => {
    // Was `#dfe9f3`, which is on no ramp in either repo. Phone `SectionBlock.tsx:266` —
    // `style={[styles.notesText, { color: colors.text }]}` inside the forced-dark subtree.
    render(<NotesScreen {...props()} />)
    const body = screen.getByLabelText('address & visits')
    expect(body.style.color).toBe(rgb(forced.text))
  })

  it('paints the stale caption`s warning and the action links from the palette', () => {
    render(<NotesScreen {...props({ sections: [meta({ stale: true, freshContent: 'fresher line' })] })} />)
    // Phone `SectionBlock.tsx:281` puts `colors.warning` on the stale DOT. The demo has no dot
    // and spends the same token on the caption itself, so the marker survives the port; the
    // token is the phone's either way.
    expect(screen.getByText(/SOURCE DATA CHANGED/).style.color).toBe(rgb(forced.warning))
    // Phone `SectionBlock.tsx:224,300` — `actionText: { color: colors.primaryLight }`.
    expect(screen.getByRole('button', { name: 'Reset to auto-generated' }).style.color).toBe(rgb(forced.primaryLight))
    // Phone `SectionBlock.tsx:287` — `stalePreview: { color: colors.textSecondary }`. Was
    // `#c7d6e4`, a one-off belonging to no token.
    expect(screen.getByText('fresher line').style.color).toBe(rgb(forced.textSecondary))
  })

  it('splits the retired `#7a93ad` the way the phone splits it — label tertiary, hint secondary', () => {
    // One demo constant covered two phone tokens. `#7a93ad` is a drifted near-copy of
    // `textTertiary` (`#7a9fc4`), and the phone spends BOTH tones in this block:
    //   `restoreLabel`  `:212` -> textTertiary   ·   `restoreHint` `:213` -> textSecondary
    // Collapsing them onto one value is what lost the distinction; it comes back here.
    // (D5's rider bans ADDING textTertiary text. This adds none — it names a tone already
    // painted, at the site the phone paints the same one.)
    // The restore ROW is the deleted-and-stale shape (`isDeleted = manuallyEdited && content
    // === ''`), which is the only state that renders the label + hint pair.
    render(<NotesScreen {...props({ sections: [meta({ stale: true, manuallyEdited: true, content: '' })] })} />)
    expect(screen.getByText('address & visits').style.color).toBe(rgb(forced.textTertiary))
    expect(screen.getByText('wizard has new content for this section').style.color).toBe(rgb(forced.textSecondary))
  })

  it('paints the `+ add note` link and the addendum input from the palette', () => {
    // Phone `:317` — `addendumAddText: { color: colors.textTertiary }`.
    const { unmount } = render(<NotesScreen {...props()} />)
    expect(screen.getByRole('button', { name: '+ add note' }).style.color).toBe(rgb(forced.textTertiary))
    unmount()

    // Two more un-tokened one-offs the DIM sweep surfaced, both with a phone counterpart:
    //   `#a9c2d8`               -> textSecondary   phone SectionBlock.tsx:190 (`addendumText`)
    //   rgba(122,147,173,0.4)   -> border          phone SectionBlock.tsx:174 (`addendumWrap`)
    // The second is the retired `#7a93ad` again, spelled as an rgba so a hex sweep missed it.
    render(<NotesScreen {...props({ sections: [meta({ userAddendum: 'a stored note' })] })} />)
    const addendum = screen.getByLabelText('Note added to address & visits')
    expect(addendum.style.color).toBe(rgb(forced.textSecondary))
    expect(addendum.style.borderLeft).toBe(`2px solid ${rgb(forced.border)}`)
  })

  it('keeps the notes body on the EVIDENTIARY mono face (A94 / D13)', () => {
    // D13 names "the notes panel" in JetBrains Mono's role list, and that ruling is what
    // governs: the phone has NO mono face here at all — `grep fontFamily
    // src/features/documentation/notes/components/*.tsx` returns zero hits at `dd5551ec`, so
    // the whole editor renders in the platform sans there. This is therefore demo-originated
    // and D13-ruled, not a drift from a phone value. It stays JetBrains; a move to the scanner
    // face would also red `ui/__tests__/fonts.test.ts`'s policy scan.
    render(<NotesScreen {...props()} />)
    expect(screen.getByLabelText('address & visits').style.fontFamily).toContain('--font-jbmono')
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
