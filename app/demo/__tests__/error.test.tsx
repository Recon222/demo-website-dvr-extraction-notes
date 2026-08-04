import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import DemoError from '@/app/demo/error'
import { clearDemoSnapshot } from '@/features/demo'
// Deep type/token import is fine in a TEST (the barrel rule guards marketing runtime code);
// the barrel itself is mocked below, so GLASS must come from the real module path.
import { GLASS } from '@/features/demo/ui/glass-tokens'

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

  // R-31: the escape hatch's failure arm. A throwing clearDemoSnapshot exercises the same
  // catch as a rejected dynamic import() (the post-redeploy ChunkLoadError case) without
  // module-loader trickery. Pins BOTH halves: the degrade-to-reset contract (moving reset()
  // inside the try would break this) and the breadcrumb (the catch must not be silent).
  it('degrades to a plain reset — with a breadcrumb — when the session-clear module fails (R-31)', async () => {
    const reset = vi.fn()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      vi.mocked(clearDemoSnapshot).mockImplementationOnce(() => {
        throw new Error('chunk load failed')
      })
      render(<DemoError error={new Error('boom')} reset={reset} />)
      fireEvent.click(screen.getByRole('button', { name: /Start fresh/ }))
      await waitFor(() => expect(reset).toHaveBeenCalledTimes(1))
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0][0])).toContain('NOT cleared')
    } finally {
      warn.mockRestore()
    }
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
    // Utility-CLASS strings, not bare token names (R-34): a whole-file includes() of
    // "demo-error" was satisfiable by this file's own cross-reference comment.
    for (const util of ['from-demo-accent-from', 'to-demo-accent-to', 'border-demo-error/']) {
      expect(src.includes(util), `expected the ${util} utility class to be in use`).toBe(true)
    }
  })

  // R-34: R-25's guard pinned error.tsx's SYNTAX only — the @theme mirror's VALUES were
  // unguarded (probe: drifting --color-demo-accent-from AND renaming --color-demo-error
  // left the suite green; Tailwind generates nothing for an orphaned utility, so there is
  // no build error either). Guard the file that drifts: the mirrors must equal the GLASS
  // source of truth in features/demo/ui/glass-tokens.ts.
  it('the @theme demo-token mirrors still equal the GLASS values they twin (R-34)', () => {
    const css = readFileSync(join(process.cwd(), 'app', 'css', 'style.css'), 'utf8')
    const mirror = (name: string): string => {
      const m = css.match(new RegExp(`--color-demo-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
      expect(m, `--color-demo-${name} missing from the @theme block in app/css/style.css`).not.toBeNull()
      return (m as RegExpMatchArray)[1].toLowerCase()
    }
    expect(mirror('accent-from')).toBe(GLASS.accentFrom.toLowerCase())
    expect(mirror('accent-to')).toBe(GLASS.accentTo.toLowerCase())
    // #ff4757 IS the rgb inside GLASS.borderError — the second assertion ties the two
    // representations, so retuning the in-frame error red breaks this pin too.
    expect(mirror('error')).toBe('#ff4757')
    expect(GLASS.borderError).toContain('rgba(255,71,87')
  })
})
