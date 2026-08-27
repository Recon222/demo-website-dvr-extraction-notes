import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { ModalShell } from '@/features/demo/ui/screens/_shared'
import { SettingsModal } from '@/features/demo/ui/screens/settings/SettingsModal'
import { toSettingsSections } from '@/features/demo/ui/screens/settings/settingsData'
import { DEFAULT_SETTINGS } from '@/features/demo/engine/content/settings-values'

/**
 * The page-sheet entrance under `prefers-reduced-motion: reduce` (U4.2).
 *
 * `modalSheet` used to carry `animation: 'screenIn 0.3s ease'` unconditionally, so nine surfaces
 * — `ModalShell`'s eight callers plus the Settings sheet — slid in for visitors who had asked
 * them not to. Every other inline-styled motion in this feature gates on `useReducedMotion`
 * (plan §4.7; `features/demo/CLAUDE.md`), and U4.1 fixed the same defect on `PickerSheet`'s three
 * sheets. Folding the two copies into one fragment made this a one-site fix, which is the only
 * reason it is in this package rather than deferred.
 *
 * Its own file, for the reason `ExportModal.reduced-motion.test.tsx:8-13` gives: the shared
 * `vitest.setup.ts` stub pins `matches: false` for every query, and `useReducedMotion` samples
 * `matchMedia` at mount, so overriding it inside the main suite leaks the preference into every
 * neighbouring render.
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

const sections = toSettingsSections({ settings: DEFAULT_SETTINGS, profileName: '', formProfile: 'forensic' })

function shell() {
  const { container } = render(
    <ModalShell title="New Case" closeAccessibilityLabel="Close new case" onClose={vi.fn()}>
      <div />
    </ModalShell>,
  )
  return container.querySelector<HTMLElement>('[role="dialog"]')!
}

function settings() {
  const { container } = render(
    <SettingsModal sections={sections} renderPane={() => null} onClose={vi.fn()} />,
  )
  return container.querySelector<HTMLElement>('[role="dialog"]')!
}

describe('the page-sheet entrance is gated on the motion preference', () => {
  // The positive controls. Without these a gate that dropped the animation ALWAYS would pass the
  // two cases below, and "no motion for anyone" is a different defect, not a fix.
  it('slides in by default (the harness stub reports no preference)', () => {
    expect(shell().style.animation).toBe('screenIn 0.3s ease')
  })

  it('slides the Settings sheet in by default too', () => {
    expect(settings().style.animation).toBe('screenIn 0.3s ease')
  })

  it('drops the entrance for a visitor who asked for reduced motion', () => {
    preferReducedMotion()
    // Assert NO animation rather than "not this exact string" — D-7's lesson on
    // `ExportModal.reduced-motion.test.tsx:44`: the negative form stays green over a mutation
    // that merely renames the keyframe.
    expect(shell().style.animation).toBe('')
  })

  it('drops it for the Settings sheet on the same preference', () => {
    preferReducedMotion()
    expect(settings().style.animation).toBe('')
  })
})
