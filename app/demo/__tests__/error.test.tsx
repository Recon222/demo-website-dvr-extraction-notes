import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import DemoError from '@/app/demo/error'
import { clearDemoSnapshot } from '@/features/demo'

// "Start fresh" loads clearDemoSnapshot through the feature barrel (dynamic import) —
// mock the barrel so these tests never pull the full demo module graph.
vi.mock('@/features/demo', () => ({ clearDemoSnapshot: vi.fn() }))

// The /demo route-segment error boundary (parity review R-5): the branded outer net
// for throws ABOVE the in-frame DemoErrorBoundary (bridge view-model derivation).
describe('app/demo/error (route-segment outer net)', () => {
  it('renders the branded fallback with the error detail', () => {
    render(<DemoError error={new Error('bridge exploded')} reset={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByText('bridge exploded')).toBeInTheDocument()
  })

  it('Try again invokes reset (preserving the snapshot) and takes focus on mount', () => {
    const reset = vi.fn()
    render(<DemoError error={new Error('boom')} reset={reset} />)
    const btn = screen.getByRole('button', { name: 'Try again' })
    expect(btn).toHaveFocus() // keyboard/SR users land on the primary recovery control
    fireEvent.click(btn)
    expect(reset).toHaveBeenCalledTimes(1)
    // The transient-error path must NOT wipe the visitor's session.
    expect(vi.mocked(clearDemoSnapshot)).not.toHaveBeenCalled()
  })

  it('Start fresh clears the snapshot BEFORE resetting (the R-24 state-driven-throw escape)', async () => {
    const reset = vi.fn()
    render(<DemoError error={new Error('boom')} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: /Start fresh/ }))
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1))
    const clearMock = vi.mocked(clearDemoSnapshot)
    expect(clearMock).toHaveBeenCalledTimes(1)
    // Order matters: clearing after reset would rehydrate the throwing snapshot first.
    expect(clearMock.mock.invocationCallOrder[0]).toBeLessThan(reset.mock.invocationCallOrder[0])
  })

  // R-25: this file sits outside the demo token guard's scan root
  // (features/demo/ui/__tests__/glass-tokens.test.ts scans features/demo/ui/** only) and
  // Tailwind arbitrary-value syntax is invisible to that guard's BANNED strings anyway.
  // Pin here, source-scan style (the chrome-scope.test.tsx precedent): the glass accent
  // and error colours must come from the @theme mirrors in app/css/style.css
  // (--color-demo-accent-from/-to, --color-demo-error), never re-hardcoded literals.
  it('uses the @theme demo-token mirrors, not re-hardcoded glass colour literals (R-25)', () => {
    const src = readFileSync(join(process.cwd(), 'app', 'demo', 'error.tsx'), 'utf8')
    for (const banned of ['#35A0D6', '#35a0d6', '#2580AD', '#2580ad', 'rgba(255,71,87', 'rgba(255, 71, 87']) {
      expect(src.includes(banned), `hardcoded glass literal "${banned}" — use the --color-demo-* @theme tokens`).toBe(false)
    }
    for (const token of ['demo-accent-from', 'demo-accent-to', 'demo-error']) {
      expect(src.includes(token), `expected the ${token} @theme token utility to be in use`).toBe(true)
    }
  })
})
