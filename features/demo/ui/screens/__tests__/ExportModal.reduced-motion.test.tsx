import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExportModal } from '@/features/demo/ui/screens/ExportModal'

/**
 * P5.3 fix round / review R-18 — the export overlay's spinner under
 * `prefers-reduced-motion: reduce`.
 *
 * Its own file because the shared `vitest.setup.ts` stub pins `matches: false` for every media
 * query, and `useReducedMotion` samples `matchMedia` at mount: overriding it inside the main
 * suite would leak the reduced preference into every neighbouring render. (This is the same gap
 * R-23 records against `ExportHub`'s reduced arm — that one is P5.2's to close.)
 */

const realMatchMedia = window.matchMedia

/** Reports `reduce` for the motion query and leaves every other query alone. */
function preferReducedMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = realMatchMedia
})

describe('ExportModal — progress spinner under reduced motion', () => {
  it('drops the infinite rotation', () => {
    preferReducedMotion()
    render(<ExportModal mode="progress" stage="zipping" onContinueAnyway={vi.fn()} onCancel={vi.fn()} />)

    const spinner = document.querySelector('[data-export-spinner]')
    expect(spinner).toBeInTheDocument()
    expect(spinner).not.toHaveStyle({ animation: 'spin 0.9s linear infinite' })
  })

  it('keeps the ring itself — the only static signal that work is in flight', () => {
    preferReducedMotion()
    render(<ExportModal mode="progress" stage="zipping" onContinueAnyway={vi.fn()} onCancel={vi.fn()} />)

    expect(document.querySelector('[data-export-spinner]')).toHaveStyle({
      borderTopColor: '#35A0D6',
    })
    // …and the overlay still says what it is doing, in both channels.
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Creating ZIP archive...')
  })
})
