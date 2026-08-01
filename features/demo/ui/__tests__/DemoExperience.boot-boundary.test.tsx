import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// The boot sequence is mocked to throw on render — the boot subtree's only realistic failure
// mode, and the one the shipped recovery control could not escape (review R-8).
vi.mock('@/features/demo/ui/screens/BootSequence', () => ({
  BootSequence: () => {
    throw new Error('boot exploded')
  },
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

describe('DemoExperience — a throw inside the boot gate is recoverable', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    // React logs every caught render error via console.error; silence it for a deliberate throw.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('"Return to Cases" lifts the gate as well as clearing the error', { timeout: 20000 }, () => {
    render(<DemoExperience boot />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')

    fireEvent.click(screen.getByRole('button', { name: 'Return to Cases' }))

    // Before the fix the gate remounted, threw again, and the card returned — a loudly
    // surfaced, permanently dead recovery control, with SKIP and Escape inside the thrown tree.
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText(/No cases yet/)).toBeInTheDocument()
  })
})
