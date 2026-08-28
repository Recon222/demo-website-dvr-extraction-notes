import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

/**
 * SEAM(LM1) — the bridge seeds `settings.darkMode` FROM the live scheme, not from the frozen
 * `DEFAULT_SETTINGS.darkMode: true`.
 *
 * ## Why this file exists and why it mocks
 *
 * The demo's scheme is a `sessionStorage` read performed ONCE at module init
 * (`tokens/palette.ts` SEAM(LM1)), and `setScheme` applies a change by reloading onto it. Under
 * jsdom nothing is stored, so the live scheme is always `'dark'` — which means every assertion
 * about the seed is VACUOUS in the default environment: `activeScheme === 'dark'` is `true`, and
 * so is `DEFAULT_SETTINGS.darkMode`. A pin written against the real module would stay green with
 * the seed deleted, which is the exact defect it exists to catch.
 *
 * So this file mocks ONE export — `activeScheme` — to `'light'`, and nothing else. Not `colors`,
 * not `scheme`: the tree renders in its usual dark values, identical to every other suite, so a
 * failure here can only be the seed. (`activeScheme` is also read at module scope by
 * `button-recipe.ts` and `sheet-chrome.ts` for their two dark-only shadow gates; those shadows
 * simply do not paint under this mock, and nothing here asserts on them.)
 *
 * ## What breaks without it
 *
 * Both of `darkMode`'s consumers, in the one direction a visitor sees: the Appearance switch
 * (`AppearancePane.tsx`) reads ON while the frame is white, and the Settings master row's preview
 * (`settings-values.ts:289`, `s.darkMode ? 'Dark' : 'Light'`) says "Dark" on the light theme. The
 * switch is the worse of the two — it is the control that just performed the flip.
 */
vi.mock('@/features/demo/ui/tokens/palette', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/demo/ui/tokens/palette')>()),
  activeScheme: 'light' as const,
}))

function openAppearance() {
  render(<DemoExperience store={createDemoStore()} />)
  fireEvent.click(screen.getByTestId('header-settings-button'))
}

describe('the bridge seeds settings.darkMode from the live scheme', () => {
  it('the master row previews the LIVE scheme, not the default', () => {
    openAppearance()
    expect(screen.getByTestId('settings-preview-appearance')).toHaveTextContent('Light')
  })

  it('the Appearance switch shows OFF when the demo is rendering light', () => {
    openAppearance()
    fireEvent.click(screen.getByTestId('settings-row-appearance'))
    expect(screen.getByRole('switch', { name: 'Dark Mode' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })
})
