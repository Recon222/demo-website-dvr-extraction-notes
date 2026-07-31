import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { SaveState } from '@/features/demo/engine/logic/save-status'

/**
 * P4.2 / matrix row 80 — the drawer footer's save-status line.
 *
 * The phone's row-80 entry names an `isDirty`/`saveStatus` indicator; the phone's drawer has
 * no such widget (its `useSaveStatus` READER has zero production callers — only the
 * `setSaveStatus` writer is wired), so there is no copy to lift and the demo's line is an
 * honest original. What it must never do is inherit the phone's meaning: "saved" there is
 * SQLite on the device, and here it is a per-tab sessionStorage snapshot that dies with the
 * tab. Every arm below is about that boundary.
 *
 * The persistence module is partial-mocked (same seam as DemoExperience.progress-saved) so
 * each save state is drivable; `saveState`'s own semantics are pinned in
 * engine/store/__tests__/persistence.test.ts and the wording in engine/logic/__tests__.
 */
const { persistMock, current } = vi.hoisted(() => {
  const current = { state: { kind: 'saved', at: 0 } as SaveState, flushes: 0 }
  return {
    current,
    persistMock: vi.fn((_store: unknown, _storage: unknown) => ({
      flush: () => {
        current.flushes++
      },
      dispose: () => undefined,
      isLive: () => current.state.kind === 'saved',
      saveState: () => current.state,
    })),
  }
})
vi.mock('@/features/demo/engine/store/persistence', async (orig) => ({
  ...(await orig<typeof import('@/features/demo/engine/store/persistence')>()),
  persistDemoStore: persistMock,
}))

import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { clock } from '@/features/demo/ui/inputs/clock'

const T0 = 1_700_000_000_000
let nowSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  current.state = { kind: 'saved', at: T0 }
  current.flushes = 0
  persistMock.mockClear()
  nowSpy = vi.spyOn(clock, 'now').mockReturnValue(new Date(T0))
})
afterEach(() => {
  nowSpy.mockRestore()
})

const openDrawer = (store: DemoStore) => act(() => store.getState().setDrawerOpen(true))
const closeDrawer = (store: DemoStore) => act(() => store.getState().setDrawerOpen(false))
const statusLine = () => document.querySelector('[data-save-status]')

describe('drawer save-status line (row 80)', () => {
  it('reports a landed write as saved TO THIS TAB, with its recency', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openDrawer(store)

    const line = statusLine()
    expect(line).toHaveAttribute('data-save-status', 'saved')
    expect(line).toHaveTextContent('Saved to this tab · just now')
    // The claim the demo may never make, in any state.
    expect(line).not.toHaveTextContent(/device|phone|disk|cloud/i)
  })

  it('says the browser is not storing when persistence is unavailable — never a bare "Saved"', () => {
    current.state = { kind: 'unavailable' }
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openDrawer(store)

    const line = statusLine()
    expect(line).toHaveAttribute('data-save-status', 'unavailable')
    expect(line).toHaveTextContent("Not saved · this browser isn't storing the session")
  })

  it('distinguishes a failed write from an absent one — the snapshot was CLEARED', () => {
    current.state = { kind: 'failed' }
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openDrawer(store)

    expect(statusLine()).toHaveAttribute('data-save-status', 'failed')
    expect(statusLine()).toHaveTextContent('the last save to this tab failed')
  })

  it('flushes the debounced write BEFORE describing it, so the reading is not one save behind', () => {
    // Type, then open the menu inside the 250ms debounce: without the flush the line would
    // report the age of the write BEFORE the visitor's, which is the one moment the number
    // actually matters.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    expect(current.flushes).toBe(0)
    openDrawer(store)
    expect(current.flushes).toBe(1)
  })

  it('re-samples on every open — a reading taken once can never go stale in the footer', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openDrawer(store)
    expect(statusLine()).toHaveTextContent('just now')

    closeDrawer(store)
    nowSpy.mockReturnValue(new Date(T0 + 90_000)) // 90s of work later
    openDrawer(store)

    expect(statusLine()).toHaveTextContent('Saved to this tab · 1 min ago')
  })

  // NOT pinned here, deliberately: the bridge's `?? { kind: 'unavailable' }` for an absent
  // handle. `persistDemoStore` cannot return one (the type is non-nullable, and the effect that
  // sets the ref commits before any interaction), so the only way to exercise it is to make the
  // mock break the module's contract — a test of the mock. The fallback stays as the same
  // never-assume default `saveProgress` uses for `isLive()` (R-2).
})

describe('drawer version chrome (row 80)', () => {
  it('labels the footer as the demo, not as a build of the app', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openDrawer(store)

    // The phone's product line, verbatim…
    expect(screen.getByText('DVR Extraction Notes')).toBeInTheDocument()
    // …and its version chrome, qualified: a bare "v1.0.0" in a browser would read as a build.
    expect(screen.getByText('Interactive demo · v1.0.0')).toBeInTheDocument()
  })
})
