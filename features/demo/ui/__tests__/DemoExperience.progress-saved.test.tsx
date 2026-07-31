import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * R-2 — the "Progress Saved" alert must not promise persistence the browser isn't providing.
 *
 * The alert is the blocked completion gate's second arm, and it is the demo's first
 * visitor-facing persistence CLAIM. Two real paths make the unconditional promise false:
 * a blocked/absent `sessionStorage` yields the breadcrumb-free NOOP handle, and a
 * quota/security write failure deliberately CLEARS the snapshot (persistence.ts) — so the
 * refresh the visitor was just told is safe boots empty. Parity plan §4's honesty rule
 * ("never a fake success") binds here, so the copy is gated on `handle.isLive()`.
 *
 * The persistence module is partial-mocked so both arms are drivable with an injected store;
 * `isLive`'s own semantics are pinned in engine/store/__tests__/persistence.test.ts.
 */
const { persistMock, isLive } = vi.hoisted(() => {
  const isLive = { value: true }
  return {
    isLive,
    // Params typed so the call-args assertion below (the null backend) stays type-checked.
    persistMock: vi.fn((_store: unknown, _storage: unknown) => ({
      flush: () => undefined,
      dispose: () => undefined,
      isLive: () => isLive.value,
      // The fake tracks the real handle's shape (P4.2 added `saveState`); `isLive` is derived
      // from it there, so the two agree here too.
      saveState: () => (isLive.value ? ({ kind: 'saved', at: 0 } as const) : ({ kind: 'unavailable' } as const)),
    })),
  }
})
vi.mock('@/features/demo/engine/store/persistence', async (orig) => ({
  ...(await orig<typeof import('@/features/demo/engine/store/persistence')>()),
  persistDemoStore: persistMock,
}))

import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

type Store = ReturnType<typeof createDemoStore>

const PROMISE_LINE = 'survives a refresh'
const NOT_STORED_LINE = "This browser isn't storing the session"
/** True on both arms: the location really is still there, reachable from Cases. */
const SHARED_LINE = 'You can continue this location later from the Cases screen.'

/** Bare case + location → Completion, so "Complete & Save" is blocked and offers Save Progress. */
function openBlockedGate(store: Store) {
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-R2', displayName: 'R2', unit: 'Robbery' })
    const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
    store.getState().switchLocation(locId)
    store.getState().setView('completion')
  })
  fireEvent.click(screen.getByText('Complete & Save'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Progress' }))
  return screen.getByRole('alertdialog', { name: 'Progress Saved' })
}

beforeEach(() => {
  isLive.value = true
  persistMock.mockClear()
})

describe('Progress Saved — the promise is gated on real persistence (R-2)', () => {
  it('promises refresh survival only when the handle is actually storing', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const dialog = openBlockedGate(store)

    expect(dialog).toHaveTextContent(SHARED_LINE)
    expect(dialog).toHaveTextContent(PROMISE_LINE)
    expect(dialog).not.toHaveTextContent(NOT_STORED_LINE)
  })

  it('demotes the promise when storage is unavailable — the NOOP-handle case', () => {
    isLive.value = false
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    const dialog = openBlockedGate(store)

    // The half that is still true survives; the persistence sentence is replaced, not dropped —
    // silence would leave the visitor assuming the demo's usual behaviour.
    expect(dialog).toHaveTextContent(SHARED_LINE)
    expect(dialog).toHaveTextContent(NOT_STORED_LINE)
    expect(dialog).not.toHaveTextContent(PROMISE_LINE)
  })

  it('reads liveness at ALERT time, so a write failure mid-session demotes the next alert', () => {
    // The second adversarial path: persistence was live, then a quota/security failure cleared
    // the snapshot. A value captured at mount would still be promising refresh survival.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    expect(openBlockedGate(store)).toHaveTextContent(PROMISE_LINE)
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))

    isLive.value = false // the write failed while the visitor was working
    act(() => store.getState().setView('completion'))
    fireEvent.click(screen.getByText('Complete & Save'))
    fireEvent.click(screen.getByRole('button', { name: 'Save Progress' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Progress Saved' })
    expect(dialog).toHaveTextContent(NOT_STORED_LINE)
    expect(dialog).not.toHaveTextContent(PROMISE_LINE)
  })

  it('wires persistence for every mount, so the alert always has a handle to ask', () => {
    // An injected store is deliberately not persisted, but it must still be REPRESENTED by a
    // handle: an absent handle is exactly the "unknown state" the unconditional copy assumed
    // away. (Injected stores get a null backend — no writes — via the bridge.)
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    expect(persistMock).toHaveBeenCalledTimes(1)
    expect(persistMock.mock.calls[0]?.[1]).toBeNull() // null storage: the test seam still doesn't write
  })
})
