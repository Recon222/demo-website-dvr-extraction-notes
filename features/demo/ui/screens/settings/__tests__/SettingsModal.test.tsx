import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SettingsModal, SETTINGS_SHEET_Z } from '@/features/demo/ui/screens/settings/SettingsModal'
import {
  ModalShell,
  modalScrim,
  modalSheet,
  MODAL_SCRIM_Z,
  MODAL_SHEET_Z,
} from '@/features/demo/ui/screens/_shared'
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

  it('R-10: the detail pane is a NAMED group, so its label is not discarded by the a11y tree', () => {
    // A role-less div maps to ARIA `generic`, whose name-from is prohibited — the
    // `aria-labelledby` was being thrown away and the focus-time announcement never fired.
    // Asserted through the ROLE+NAME query, which is exactly what a discarded name fails.
    renderShell()
    fireEvent.click(screen.getByTestId('settings-row-export-security'))
    const detail = screen.getByRole('group', { name: 'Export Security' })
    expect(detail).toContainElement(screen.getByTestId('settings-detail-body'))
    // …and it is still the element focus lands on.
    expect(document.activeElement).toBe(detail)
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

/**
 * The chrome collapse — matrix B.2 row 16 / B.7 row 81, package U4.2.
 *
 * `SettingsModal.tsx:64-96` was a byte-identical second copy of `ModalShell`'s scrim + sheet,
 * built from the same z-index constants but not from the component. The demo inventory's warning
 * (§4, leverage point 2) was exact: *"Change `ModalShell`'s sheet look and Settings will silently
 * diverge."*
 *
 * The two surfaces still do NOT share a component — `:17-25`'s reason survives contact with the
 * port and is restated there — so what is shared is the scrim + sheet SEAM, which is the
 * alternative plan §5's U4.2 row names in as many words. These pins are what makes "shared" mean
 * something: the copy cannot regrow without one of them reddening.
 */
describe('the modal chrome is ONE recipe (B.2 row 16)', () => {
  function chrome(root: ParentNode) {
    return {
      scrim: root.querySelector<HTMLElement>('[data-modal-scrim]')!,
      sheet: root.querySelector<HTMLElement>('[role="dialog"]')!,
    }
  }

  it('renders the same scrim and the same sheet as ModalShell, declaration for declaration', () => {
    const { container: settings } = render(
      <SettingsModal sections={sections} renderPane={() => null} onClose={vi.fn()} />,
    )
    const { container: shell } = render(
      <ModalShell title="New Case" closeAccessibilityLabel="Close new case" onClose={vi.fn()}>
        <div />
      </ModalShell>,
    )
    const a = chrome(settings)
    const b = chrome(shell)
    expect(a.scrim.style.cssText).toBe(b.scrim.style.cssText)
    expect(a.sheet.style.cssText).toBe(b.sheet.style.cssText)
  })

  it('and both carry the exported fragments, not two identical hand-rolls', () => {
    // Compared against what REACT makes of the fragment (a bare div carrying it), not against a
    // hand-listed set of declarations: `toHaveStyle` does not px-suffix a numeric `top`, so an
    // object comparison silently passes over half the keys.
    const { container: reference } = render(
      <>
        <div data-ref-scrim style={modalScrim} />
        <div data-ref-sheet style={modalSheet} />
      </>,
    )
    const { container } = render(
      <SettingsModal sections={sections} renderPane={() => null} onClose={vi.fn()} />,
    )
    const { scrim, sheet } = chrome(container)
    expect(scrim.style.cssText).toBe(reference.querySelector<HTMLElement>('[data-ref-scrim]')!.style.cssText)
    expect(sheet.style.cssText).toBe(reference.querySelector<HTMLElement>('[data-ref-sheet]')!.style.cssText)
  })

  it('keeps the frozen layers exactly where D14 left them', () => {
    const { container } = render(
      <SettingsModal sections={sections} renderPane={() => null} onClose={vi.fn()} />,
    )
    const { scrim, sheet } = chrome(container)
    expect(scrim.style.zIndex).toBe(String(MODAL_SCRIM_Z))
    expect(sheet.style.zIndex).toBe(String(SETTINGS_SHEET_Z))
    expect(SETTINGS_SHEET_Z).toBe(MODAL_SHEET_Z)
  })
})
