import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { NoteSectionMeta } from '@/features/demo/engine/logic/notes'

/**
 * R-36: the behavioural guard R-14's notes half shipped without. Its P2.5 sibling
 * (`time-offset-advisories.test.tsx`, "recomputes only when the advisory's own inputs
 * change") counts seam calls; this does the same for the two halves of the notes fix —
 * the bridge's `useMemo`'d derivations and the callback identities that make
 * `SectionBlock`'s `React.memo` hold. Without it, an inline arrow prop, a seventh
 * un-`useCallback`'d callback, or a dropped `useMemo` dep silently returns all seven
 * blocks to re-rendering on every keystroke, with the suite green.
 *
 * THE PROBE. `SectionBlock` is not its own module, so the `TerminalLine` counting-delegate
 * trick (`ImportTerminalProgress.memo.test.tsx`) does not apply, and node identity proves
 * nothing — React reconciles the same type + key into the same DOM node whether or not the
 * component re-rendered. Instead, `meta.label` is replaced by a counting getter: the parent
 * (`NotesScreen`) never reads it — it reads `manuallyEdited` for the taken-over banner and
 * nothing else — while `SectionBlock` reads it every render, for the body textarea's
 * `aria-label` and the addendum's. So a non-zero read count means a block re-rendered, with
 * no production code reshaped for the test.
 *
 * Dedicated file: `vi.mock` is module-wide and must not leak into the main NotesScreen suite.
 */
const probe = vi.hoisted(() => {
  const state = { build: 0, labelReads: 0 }
  const counting = (m: NoteSectionMeta): NoteSectionMeta => {
    const { label } = m
    return {
      ...m,
      get label() {
        state.labelReads += 1
        return label
      },
    }
  }
  return { state, counting }
})

vi.mock('@/features/demo/engine/logic/notes/section-meta', async (orig) => {
  const actual = await orig<typeof import('@/features/demo/engine/logic/notes/section-meta')>()
  return {
    ...actual,
    // Pass-through: the real view model, counted on the way out and instrumented per section.
    buildNotesSectionMeta: (loc: Parameters<typeof actual.buildNotesSectionMeta>[0]) => {
      probe.state.build += 1
      return actual.buildNotesSectionMeta(loc).map(probe.counting)
    },
  }
})

import { NotesScreen, type NotesScreenProps } from '@/features/demo/ui/screens/NotesScreen'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

beforeEach(() => {
  probe.state.build = 0
  probe.state.labelReads = 0
  // jsdom shares one window per test file — snapshot hygiene between bridge mounts.
  window.sessionStorage.clear()
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
    sections: [probe.counting(meta())],
    freeText: '',
    copyAllText: '',
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

describe('NotesScreen — SectionBlock memo (R-14 guard)', () => {
  it('free-text keystrokes re-render the editor but not the sections', () => {
    render(<NotesScreen {...props()} />)
    expect(probe.state.labelReads).toBeGreaterThan(0) // the probe counts at all
    probe.state.labelReads = 0

    const tail = screen.getByLabelText('Additional notes')
    fireEvent.change(tail, { target: { value: 'extra observ' } })
    fireEvent.change(tail, { target: { value: 'extra observations' } })
    expect(tail).toHaveValue('extra observations') // the parent DID re-render

    // The whole point of the memo: seven blocks per keystroke is what R-14 removed. An
    // inline `onRequestReset` arrow (the pre-R-14 shape) makes this non-zero.
    expect(probe.state.labelReads).toBe(0)
  })

  it('but a changed section still re-renders its block', () => {
    // The negative control: without it the pin above would pass on a probe that never counts.
    const p = props()
    const { rerender } = render(<NotesScreen {...p} />)
    probe.state.labelReads = 0
    rerender(<NotesScreen {...p} sections={[probe.counting(meta({ content: 'my own account' }))]} />)
    expect(probe.state.labelReads).toBeGreaterThan(0)
    expect(screen.getByLabelText('address & visits')).toHaveValue('my own account')
  })
})

describe('DemoExperience — notes derivations (R-14 guard, bridge half)', () => {
  /** Seed a case + location and land on the Notes screen (Flow A reconciles on entry). */
  function bootAtNotes() {
    const store = createDemoStore()
    act(() => {
      const caseId = store.getState().createCase({ caseNumber: 'PR26-MEMO', displayName: 'M', unit: 'Robbery' })
      store.getState().addLocation(caseId, { locationName: 'Shop', businessName: 'Shop', streetAddress: '1 A St', city: 'Town' })
    })
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().setView('notes')
    })
    return store
  }

  it('re-derives the section view model only when the open location changes', () => {
    const store = bootAtNotes()
    // Take the section over, so the wizard write below has a DOM-visible consequence
    // (staleness is computed live in the derivation, and only edited sections can be stale).
    const body = screen.getByLabelText('address & visits')
    fireEvent.focus(body)
    fireEvent.change(body, { target: { value: 'my own account' } })
    fireEvent.blur(body)
    probe.state.build = 0
    probe.state.labelReads = 0

    // A store write that re-renders the bridge (drawerOpen is a subscribed slice) while
    // touching nothing the notes derivations read.
    act(() => {
      store.getState().setDrawerOpen(true)
    })
    // `buildNotesSectionMeta` walks all seven sections through the formatters on every call.
    expect(probe.state.build).toBe(0)
    // ...and with the derivation memoised AND the six flow callbacks bound once against the
    // stable store ref, the re-rendered NotesScreen hands SectionBlock identical props.
    expect(probe.state.labelReads).toBe(0)

    // A wizard field the address section is built from: the derivation must follow it, and
    // the re-derivation has to reach the DOM — `stale`/`freshContent` are computed there,
    // never stored, so the "would now read" preview IS the visible half of this memo.
    act(() => {
      store.getState().updateField('businessName', "Kim's Convenience")
    })
    expect(probe.state.build).toBeGreaterThan(0)
    expect(probe.state.labelReads).toBeGreaterThan(0)
    expect(screen.getByText(/SOURCE DATA CHANGED/)).toBeInTheDocument()
    expect(
      screen.getByText("• Attended Kim's Convenience, 1 A St, Town to recover requested video evidence."),
    ).toBeInTheDocument()
  })
})
