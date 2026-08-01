import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SettingsModal } from '@/features/demo/ui/screens/settings/SettingsModal'
import { toSettingsSections } from '@/features/demo/ui/screens/settings/settingsData'
import { DEFAULT_SETTINGS } from '@/features/demo/engine/content/settings-values'
import { SETTINGS_CATEGORY_IDS } from '@/features/demo/engine/content/settings-catalog'

/**
 * The Settings master/detail shell (P7.1, matrix rows 81–84).
 *
 * Driven with real sections from the engine registry rather than a hand-built fixture: the
 * grouping, the order and the preview strings are what a visitor sees, and a fixture would let
 * the registry drift out from under this suite.
 */

const sections = toSettingsSections({
  settings: DEFAULT_SETTINGS,
  profileName: '',
  formProfile: 'forensic',
})

function renderShell(overrides: Partial<Parameters<typeof SettingsModal>[0]> = {}) {
  const onClose = vi.fn()
  const renderPane = vi.fn((id: string) => <div data-testid={`pane-${id}`}>pane body for {id}</div>)
  render(<SettingsModal sections={sections} renderPane={renderPane} onClose={onClose} {...overrides} />)
  return { onClose, renderPane }
}

describe('SettingsModal — master list', () => {
  it('opens on the master list with the four phone groups in order', () => {
    renderShell()
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(within(dialog).getByText('Account')).toBeInTheDocument()
    expect(within(dialog).getByText('Capture & Time')).toBeInTheDocument()
    expect(within(dialog).getByText('Data & Security')).toBeInTheDocument()
    expect(within(dialog).getByText('System')).toBeInTheDocument()
    // No detail chrome until a row is pressed.
    expect(screen.queryByTestId('settings-back-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-detail-body')).not.toBeInTheDocument()
  })

  it('renders every catalog row, each addressable by the phone’s own testid', () => {
    renderShell()
    for (const id of SETTINGS_CATEGORY_IDS) {
      expect(screen.getByTestId(`settings-row-${id}`), `row "${id}" missing`).toBeInTheDocument()
    }
    // The one row the demo never builds (matrix §7 D6).
    expect(screen.queryByTestId('settings-row-developer')).not.toBeInTheDocument()
  })

  it('shows the phone’s preview value on the right of each row', () => {
    renderShell()
    expect(screen.getByTestId('settings-preview-appearance')).toHaveTextContent('Dark')
    expect(screen.getByTestId('settings-preview-media-capture')).toHaveTextContent('1080p')
    expect(screen.getByTestId('settings-preview-location')).toHaveTextContent('Balanced')
    expect(screen.getByTestId('settings-preview-time-sync')).toHaveTextContent('Canada (NRC)')
    expect(screen.getByTestId('settings-preview-security')).toHaveTextContent('Unavailable')
    expect(screen.getByTestId('settings-preview-user-profile')).toHaveTextContent('Not set')
  })

  it('draws the padlock on Security and on nothing else', () => {
    renderShell()
    expect(screen.getByTestId('settings-lock-security')).toBeInTheDocument()
    for (const id of SETTINGS_CATEGORY_IDS.filter((c) => c !== 'security')) {
      expect(screen.queryByTestId(`settings-lock-${id}`), `"${id}" drew a padlock`).not.toBeInTheDocument()
    }
  })

  it('names each row for AT the way the phone does', () => {
    renderShell()
    expect(screen.getByRole('button', { name: 'Media Capture settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export Security settings' })).toBeInTheDocument()
  })

  it('carries the demo’s version chrome in the footer, not a bare app version', () => {
    renderShell()
    expect(screen.getByText('Interactive demo · v1.0.0')).toBeInTheDocument()
  })
})

describe('SettingsModal — master/detail navigation', () => {
  it('pushes the selected pane, titles the bar, and renders only that pane’s body', () => {
    const { renderPane } = renderShell()
    fireEvent.click(screen.getByTestId('settings-row-time-sync'))

    expect(screen.getByTestId('pane-time-sync')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Time Sync' })).toBeInTheDocument()
    // The master list is GONE while the detail is up (one pane at a time) — so nothing behind
    // the pushed pane stays in the tab order.
    expect(screen.queryByTestId('settings-row-about')).not.toBeInTheDocument()
    // Exactly one pane is ever asked for.
    expect(renderPane).toHaveBeenCalledTimes(1)
    expect(renderPane).toHaveBeenCalledWith('time-sync')
  })

  it('labels the back button "Settings" whichever row opened the pane (phone parity)', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('settings-row-about'))
    const back = screen.getByTestId('settings-back-button')
    expect(back).toHaveAccessibleName('Back to settings')
    expect(back).toHaveTextContent('Settings')
  })

  it('back returns to the master list without closing the sheet', () => {
    const { onClose } = renderShell()
    fireEvent.click(screen.getByTestId('settings-row-location'))
    fireEvent.click(screen.getByTestId('settings-back-button'))

    expect(screen.getByTestId('settings-row-location')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-detail-body')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus into the pane on open and back to its row on close', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('settings-row-cloud-sync'))
    // The pane container itself takes focus, so AT reads the pane title, not the first control.
    expect(document.activeElement).toBe(screen.getByTestId('settings-detail-body').parentElement)

    fireEvent.click(screen.getByTestId('settings-back-button'))
    // Synchronous: the restore is a post-commit effect, so the row exists by the time it runs.
    // A `requestAnimationFrame` here would be a guess about when React re-rendered.
    expect(document.activeElement).toBe(screen.getByTestId('settings-row-cloud-sync'))
  })

  it('restores focus to the row a SECOND pane was opened from, not the first', () => {
    // The return target is re-armed on every open — a stale one would send a keyboard visitor
    // back to whichever row they happened to visit first.
    renderShell()
    fireEvent.click(screen.getByTestId('settings-row-location'))
    fireEvent.click(screen.getByTestId('settings-back-button'))
    fireEvent.click(screen.getByTestId('settings-row-about'))
    fireEvent.click(screen.getByTestId('settings-back-button'))
    expect(document.activeElement).toBe(screen.getByTestId('settings-row-about'))
  })
})

describe('SettingsModal — dismissal', () => {
  it('Escape pops the detail first, and only then closes the sheet (phone handleRequestClose)', () => {
    const { onClose } = renderShell()
    fireEvent.click(screen.getByTestId('settings-row-export-security'))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('settings-row-export-security')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the close button closes from the master list', () => {
    const { onClose } = renderShell()
    fireEvent.click(screen.getByTestId('settings-close-button'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the scrim closes the sheet outright (house convention, not the phone’s inert dimmer)', () => {
    const { onClose } = renderShell()
    const scrim = document.querySelector('[data-modal-scrim]')
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render a close button while a detail pane is up — back is the only exit there', () => {
    renderShell()
    fireEvent.click(screen.getByTestId('settings-row-about'))
    expect(screen.queryByTestId('settings-close-button')).not.toBeInTheDocument()
  })
})
