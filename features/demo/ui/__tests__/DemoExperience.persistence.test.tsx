import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { SNAPSHOT_KEY } from '@/features/demo/engine/store/persistence'

// The refresh loop (P0.4/D2): DemoExperience without an injected store persists to the real
// (jsdom) sessionStorage and rehydrates from it on the next mount. pagehide flushes the
// debounced write, so the loop needs no timer control. Storage is cleared around every test —
// leakage between tests is exactly the bug this hygiene prevents.
// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file
// runs alongside sibling suites under CPU contention (observed 5.8s on a loaded runner) —
// not a loop; isolation runs finish well inside the default.
describe('DemoExperience — sessionStorage persistence wiring (P0.4)', { timeout: 20000 }, () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => window.sessionStorage.clear())

  const createCaseViaUi = (caseNumber: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'New case' }))
    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: caseNumber } })
    fireEvent.click(screen.getByText('Create Case'))
  }

  it('a remount after pagehide restores the visitor’s case (the refresh survives)', () => {
    const first = render(<DemoExperience />)
    createCaseViaUi('PR25-REFRESH')
    fireEvent(window, new Event('pagehide')) // flush the debounced write, like a real refresh
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toContain('PR25-REFRESH')
    first.unmount()

    render(<DemoExperience />)
    expect(screen.getByText('PR25-REFRESH')).toBeInTheDocument() // the case card is back
    expect(screen.queryByText(/No cases yet/)).toBeNull()
  })

  it('a fresh tab (empty sessionStorage) still boots the empty sandbox', () => {
    render(<DemoExperience />)
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })

  it('a corrupt snapshot is discarded silently — boot never crashes', () => {
    window.sessionStorage.setItem(SNAPSHOT_KEY, '{definitely not json')
    render(<DemoExperience />)
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull() // removed, not re-parsed forever
  })

  // NOTE: the uiSeq reseed (`uiSeq = max(uiSeq, maxIdSeq(snapshot) + 1)`) cannot be exercised
  // here — module state survives remounts inside a test file; it only resets on a REAL page
  // load. The store-side equivalent (seq reseed → no id collisions) is pinned in
  // engine/store/__tests__/persistence.test.ts; maxIdSeq itself in helpers.test.ts.

  // R-12: the two "injected stores are never persisted/rehydrated" guards are what keep the
  // ~46 injected-store component renders hermetic. If either were dropped, the whole
  // component suite would go order-dependent (the R-3 failure class) with failures far from
  // the causing edit — so both are pinned here.
  it('R-12: an injected store is never persisted — mutations + pagehide + unmount write nothing', () => {
    const store = createDemoStore()
    const view = render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-INJECTED', displayName: 'Injected', unit: 'Robbery' })
    })
    fireEvent(window, new Event('pagehide')) // the non-injected path would flush here
    view.unmount() // …and the effect cleanup would flush here
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull()
  })

  it('R-12: an injected store is never rehydrated — a valid snapshot on disk is ignored', () => {
    // Seed a genuine snapshot through the real path…
    const first = render(<DemoExperience />)
    createCaseViaUi('PR25-SEEDED')
    fireEvent(window, new Event('pagehide'))
    first.unmount()
    expect(window.sessionStorage.getItem(SNAPSHOT_KEY)).toContain('PR25-SEEDED')
    // …then mount with an injected store: it must boot from the store, not the snapshot.
    render(<DemoExperience store={createDemoStore()} />)
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
    expect(screen.queryByText('PR25-SEEDED')).toBeNull()
  })

  it('R-13: a browser where the sessionStorage PROPERTY ACCESS throws boots empty, not a white screen', () => {
    // Safari private mode / storage-blocked embeds throw on `window.sessionStorage` itself —
    // not on getItem. jsdom defines the property on the instance; shadow it with a throwing
    // getter and restore in finally.
    const desc = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: The operation is insecure.')
      },
    })
    try {
      render(<DemoExperience />)
      expect(screen.getByText(/No cases yet/)).toBeInTheDocument() // empty boot, demo alive
    } finally {
      if (desc) Object.defineProperty(window, 'sessionStorage', desc)
      else Reflect.deleteProperty(window, 'sessionStorage')
    }
  })
})
