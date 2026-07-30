import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { SNAPSHOT_KEY } from '@/features/demo/engine/store/persistence'

// The refresh loop (P0.4/D2): DemoExperience without an injected store persists to the real
// (jsdom) sessionStorage and rehydrates from it on the next mount. pagehide flushes the
// debounced write, so the loop needs no timer control. Storage is cleared around every test —
// leakage between tests is exactly the bug this hygiene prevents.
describe('DemoExperience — sessionStorage persistence wiring (P0.4)', () => {
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
})
