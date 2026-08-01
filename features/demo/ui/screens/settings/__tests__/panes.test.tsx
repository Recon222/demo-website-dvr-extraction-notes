import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { BRIDGE_PANE_IDS, isBridgePaneId, renderSettingsPane, SETTINGS_PANES, type StubPaneId } from '@/features/demo/ui/screens/settings/panes'
import { SETTINGS_CATEGORY_IDS } from '@/features/demo/engine/content/settings-catalog'
import { DEFAULT_SETTINGS, type DemoSettings } from '@/features/demo/engine/content/settings-values'
import { clock } from '@/features/demo/ui/inputs/clock'

/**
 * The eight stub panes + the two SEAM placeholders (P7.1, decision D6).
 *
 * D6's line is what these pin: a control either changes a value (cosmetically) or refuses to
 * change and says why — and NOTHING claims a capability the browser does not have. So the
 * suite's spine is (a) every pane carries an honest note, (b) the controls that must be inert
 * are inert, (c) the controls that toggle actually emit their patch, and (d) the phone's
 * conditional behaviour that is genuinely portable fires for real.
 */

const patch = (overrides: Partial<DemoSettings> = {}) => ({ ...DEFAULT_SETTINGS, ...overrides })

/** The catalog rows THIS module renders — the bridge-owned ones (P7.2's User Profile, P7.3's
 *  Form Fields) have their own suites, and `renderSettingsPane` no longer accepts their ids.
 *  Derived from the CATALOG, not from `Object.keys(SETTINGS_PANES)`, so the equality below is a
 *  real partition assertion rather than a tautology. */
const STUB_PANE_IDS = SETTINGS_CATEGORY_IDS.filter((id): id is StubPaneId => !isBridgePaneId(id))

function renderPane(id: StubPaneId, settings: DemoSettings = DEFAULT_SETTINGS) {
  const onChange = vi.fn()
  render(<div>{renderSettingsPane(id, { settings, onChange })}</div>)
  return { onChange }
}

afterEach(() => vi.restoreAllMocks())

describe('pane registry', () => {
  it('partitions the catalog: every row is either bridge-owned or in this map, never both', () => {
    // P7.2 and P7.3 each moved their id out of the map and into the bridge's own branch. The
    // exhaustiveness property survives the move — it just spans two collections now — so a
    // category added to the catalog and forgotten in both still fails here (and in `tsc`).
    expect(Object.keys(SETTINGS_PANES).sort()).toEqual([...STUB_PANE_IDS].sort())
    // Together the two sets are the whole catalog — no row can go unrendered by both.
    expect([...STUB_PANE_IDS, ...BRIDGE_PANE_IDS].sort()).toEqual([...SETTINGS_CATEGORY_IDS].sort())
    for (const id of BRIDGE_PANE_IDS) {
      expect(id in SETTINGS_PANES, `"${id}" is resolved twice`).toBe(false)
    }
  })

  it('every pane opens with an honest "in the demo" note — the D6 treatment', () => {
    for (const id of STUB_PANE_IDS) {
      const { unmount } = render(<div>{renderSettingsPane(id, { settings: DEFAULT_SETTINGS, onChange: vi.fn() })}</div>)
      expect(screen.getByTestId('settings-pane-stub-note'), `pane "${id}" ships no honest note`).toBeInTheDocument()
      unmount()
    }
  })
})

describe('inert controls announce their reason (R-6)', () => {
  /**
   * `aria-disabled` is a STATE, not a reason. In focus mode a screen reader reads the focused
   * node's name/role/state and nothing else — so the doc comments' "hears WHY from the copy
   * beside it" was true of the pixels and false of the accessibility tree. Every inert control
   * in these panes now points at the short note next to it, the way `ModalActions` already did.
   *
   * Asserted by RESOLVING the id to real text, not by asserting the attribute exists: a
   * `describedby` pointing at nothing announces exactly as much as no `describedby` at all.
   */
  const describedText = (el: HTMLElement): string => {
    const id = el.getAttribute('aria-describedby')
    expect(id, 'no aria-describedby on an aria-disabled control').toBeTruthy()
    const target = document.getElementById(id as string)
    expect(target, `aria-describedby points at "${id}", which is not in the document`).not.toBeNull()
    return (target as HTMLElement).textContent ?? ''
  }

  it('Dark Mode: the reason resolves and says why it cannot move', () => {
    renderPane('appearance')
    const dark = screen.getByRole('switch', { name: 'Dark Mode' })
    expect(dark).toHaveAttribute('aria-disabled', 'true')
    expect(describedText(dark)).toMatch(/no light theme/i)
  })

  it('Cloud Sync: the reason resolves and names the impression it is avoiding', () => {
    renderPane('cloud-sync')
    const toggle = screen.getByRole('switch', { name: 'Enable cloud sync' })
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    expect(describedText(toggle)).toMatch(/out of scope/i)
  })

  it('Set Default Password: points at the note already beneath it', () => {
    renderPane('export-security', patch({ zipEncryptionEnabled: true }))
    const button = screen.getByTestId('export-security-set-password')
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(describedText(button)).toMatch(/nowhere to keep a password/i)
  })

  it('an ENABLED switch carries no description — there is no reason to point at', () => {
    renderPane('appearance')
    const live = screen.getByRole('switch', { name: 'Show import process details' })
    expect(live).not.toHaveAttribute('aria-disabled')
    expect(live).not.toHaveAttribute('aria-describedby')
  })
})

describe('Appearance pane', () => {
  it('states Dark Mode’s value but refuses to change it (there is no light theme to switch to)', () => {
    const { onChange } = renderPane('appearance')
    const dark = screen.getByRole('switch', { name: 'Dark Mode' })
    expect(dark).toHaveAttribute('aria-checked', 'true')
    expect(dark).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(dark)
    expect(onChange).not.toHaveBeenCalled()
    // Still focusable — the house rule is aria-disabled, never the disabled attribute, so a
    // keyboard visitor can reach it and read the reason beside it.
    expect(dark).toHaveAttribute('tabindex', '0')
  })

  it('toggles the import-detail switch for real', () => {
    const { onChange } = renderPane('appearance')
    fireEvent.click(screen.getByRole('switch', { name: 'Show import process details' }))
    expect(onChange).toHaveBeenCalledWith({ showImportProcessDetails: false })
  })
})

describe('Media Capture pane', () => {
  it('renders the phone’s seven controls with its own labels', () => {
    renderPane('media-capture')
    expect(screen.getByTestId('photo-quality-slider')).toBeInTheDocument()
    expect(screen.getByText('Video Quality')).toBeInTheDocument()
    expect(screen.getByText('Video Codec')).toBeInTheDocument()
    expect(screen.getByText('Maximum Video Duration')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Include GPS coordinates' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Enable shutter sound' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Skip post-processing' })).toBeInTheDocument()
  })

  it('shows the live percentage and clamps the slider the way the phone does', () => {
    const { onChange } = renderPane('media-capture')
    expect(screen.getByText('90%')).toBeInTheDocument()
    fireEvent.change(screen.getByTestId('photo-quality-slider'), { target: { value: '0.55' } })
    expect(onChange).toHaveBeenCalledWith({ photoQuality: 0.55 })
  })

  it('fires the phone’s Unlimited-duration warning for real — it describes the SETTING', () => {
    renderPane('media-capture', patch({ maxVideoDuration: 0 }))
    expect(
      screen.getByText(/Unlimited recording may result in very large files/),
    ).toBeInTheDocument()
  })

  it('fires the phone’s silent-capture legal note for real', () => {
    renderPane('media-capture', patch({ shutterSound: false }))
    expect(screen.getByText(/Silent capture may not be legal in all regions/)).toBeInTheDocument()
  })

  it('never claims GPS is embedded — the phone’s three permission notes are NOT ported', () => {
    renderPane('media-capture', patch({ gpsInMedia: true }))
    // The granted arm's sentence is the one that would be a lie here (the demo writes no EXIF).
    expect(screen.queryByText(/Location permission granted/)).not.toBeInTheDocument()
    expect(screen.queryByText(/will be embedded in captured media/)).not.toBeInTheDocument()
    // …and the honest note says so instead.
    expect(screen.getByTestId('settings-pane-stub-note')).toHaveTextContent(/carries EXIF/)
  })

  it('does not print the phone’s Android codec note — a browser is not Android', () => {
    renderPane('media-capture')
    expect(screen.queryByText(/only available on iOS/)).not.toBeInTheDocument()
  })
})

describe('Location pane', () => {
  it('renders the two pickers and the accuracy switch, and the switch emits', () => {
    const { onChange } = renderPane('location')
    expect(screen.getByText('GPS Accuracy Mode')).toBeInTheDocument()
    expect(screen.getByText('GPS Timeout')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Show accuracy warnings' }))
    expect(onChange).toHaveBeenCalledWith({ showAccuracyWarning: false })
  })

  it('replaces the phone’s "these settings affect…" info box, which would be false here', () => {
    renderPane('location')
    expect(screen.queryByText(/These settings affect location accuracy during case creation/)).not.toBeInTheDocument()
    // The replacement states what the capture ACTUALLY does, including the forced-precise paths.
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).toHaveTextContent(/Balanced \(50 m\)/)
    expect(note).toHaveTextContent(/Precise \(10 m\)/)
  })
})

describe('Time Sync pane', () => {
  it('keeps the phone’s traceability info box verbatim — it is true whoever reads it', () => {
    renderPane('time-sync')
    expect(
      screen.getByText(/Canada uses NRC atomic clocks, USA uses NIST, and Europe uses PTB\/METAS/),
    ).toBeInTheDocument()
  })

  it('names the one server the simulated sync ever reports', () => {
    renderPane('time-sync')
    expect(screen.getByTestId('settings-pane-stub-note')).toHaveTextContent('time.nrc.ca')
  })
})

describe('Export Security pane', () => {
  it('hides the shared config until at least one encryption switch is on (phone gate)', () => {
    renderPane('export-security')
    expect(screen.queryByTestId('export-security-shared-config')).not.toBeInTheDocument()
  })

  it('reveals it for EITHER switch, independently', () => {
    const { unmount } = render(
      <div>{renderSettingsPane('export-security', { settings: patch({ zipEncryptionEnabled: true }), onChange: vi.fn() })}</div>,
    )
    expect(screen.getByTestId('export-security-shared-config')).toBeInTheDocument()
    unmount()

    render(
      <div>
        {renderSettingsPane('export-security', {
          settings: patch({ singleFileEncryptionEnabled: true }),
          onChange: vi.fn(),
        })}
      </div>,
    )
    expect(screen.getByTestId('export-security-shared-config')).toBeInTheDocument()
  })

  it('renders both radio groups with the phone’s testids, and they emit', () => {
    const { onChange } = renderPane('export-security', patch({ zipEncryptionEnabled: true }))
    fireEvent.click(screen.getByTestId('export-security-prompt-always'))
    expect(onChange).toHaveBeenCalledWith({ promptMode: 'always_prompt' })

    fireEvent.click(screen.getByTestId('export-security-strength-standard'))
    expect(onChange).toHaveBeenCalledWith({ encryptionStrength: 'STANDARD' })

    expect(screen.getByTestId('export-security-strength-aes256')).toHaveAttribute('aria-checked', 'true')
  })

  it('asks for NO password anywhere — the affordance renders inert instead', () => {
    const { onChange } = renderPane('export-security', patch({ zipEncryptionEnabled: true }))
    // A demo that stores nothing must never invite a real secret.
    expect(document.querySelector('input[type="password"]')).toBeNull()
    const setPassword = screen.getByTestId('export-security-set-password')
    expect(setPassword).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(setPassword)
    expect(onChange).not.toHaveBeenCalled()
    expect(document.querySelector('input[type="password"]')).toBeNull()
  })
})

describe('Security pane (A1)', () => {
  it('renders the three biometric switches and emits on each', () => {
    const { onChange } = renderPane('security')
    fireEvent.click(screen.getByRole('switch', { name: 'Enable app lock' }))
    expect(onChange).toHaveBeenCalledWith({ appLockEnabled: true })
    fireEvent.click(screen.getByRole('switch', { name: 'Enable export protection' }))
    expect(onChange).toHaveBeenCalledWith({ exportProtectionEnabled: true })
    // Phone default for the fallback is TRUE, so this one turns off.
    fireEvent.click(screen.getByRole('switch', { name: 'Enable passcode fallback' }))
    expect(onChange).toHaveBeenCalledWith({ allowDeviceFallback: false })
  })

  it('says "Biometrics", never a named sensor it cannot detect', () => {
    renderPane('security')
    const pane = screen.getByTestId('settings-pane-security')
    expect(screen.getByText(/Protect your case data with Biometrics authentication/)).toBeInTheDocument()
    // The phone interpolates the DEVICE's biometric name into all three helper lines; a browser
    // cannot read one, so the demo takes the phone's own fallback literal (`useBiometric.ts:39`).
    // Scoped past the honest note, which DOES say "Face ID prompt" — that is a true statement
    // about the phone, not a claim about this tab.
    const controls = within(pane).getAllByRole('group')
    for (const group of controls) {
      expect(group.textContent).toMatch(/Biometrics/)
      expect(group.textContent).not.toMatch(/Face ID|Touch ID/)
    }
  })

  it('states that the padlocked prompt is not simulated', () => {
    renderPane('security')
    expect(screen.getByTestId('settings-pane-stub-note')).toHaveTextContent(/does not simulate the prompt/)
  })
})

describe('Cloud Sync pane', () => {
  it('holds the switch OFF and inert — "on" would read as "my case data just left"', () => {
    const { onChange } = renderPane('cloud-sync')
    const toggle = screen.getByRole('switch', { name: 'Enable cloud sync' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(toggle).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(toggle)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('states that nothing leaves the tab, and names what the app does instead', () => {
    renderPane('cloud-sync')
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).toHaveTextContent(/nothing you enter here leaves your browser tab/)
    expect(note).toHaveTextContent(/Supabase/)
  })
})

describe('About pane', () => {
  it('reports the demo’s own build facts, not the phone’s', () => {
    renderPane('about')
    expect(screen.getByText('DVR Extraction Notes')).toBeInTheDocument()
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument()
    expect(screen.getByText('Web (browser)')).toBeInTheDocument()
    expect(screen.getByText('Interactive demo')).toBeInTheDocument()
    // The phone's Expo SDK row has no true web value and is not rendered over a dash.
    expect(screen.queryByText('Expo SDK:')).not.toBeInTheDocument()
    expect(screen.queryByText('iOS')).not.toBeInTheDocument()
  })

  it('wires Contact Support as a REAL mailto to the site’s published address', () => {
    renderPane('about')
    const link = screen.getByTestId('about-contact-support')
    expect(link).toHaveAttribute(
      'href',
      `mailto:kcfva.dev@gmail.com?subject=${encodeURIComponent('DVR Extraction Notes v1.0.0 demo - Support Request')}`,
    )
  })

  it('takes the copyright year through the injectable clock, not an ambient Date', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2031-04-02T10:00:00Z'))
    renderPane('about')
    expect(screen.getByText(/© 2031 DVR Extraction Notes/)).toBeInTheDocument()
  })
})

describe('SEAM placeholders', () => {
  // Both are closed. User Profile (P7.2) and Form Fields (P7.3) are real, store-connected panes
  // and no longer resolvable through this module at all — `BRIDGE_PANE_IDS` holds both and the
  // bridge branches for each. Their behaviour lives in `__tests__/UserProfilePane.test.tsx`,
  // `__tests__/FormFieldsPane.test.tsx`, and the two `DemoExperience.*` suites.
  it('SEAM(P7.2)/SEAM(P7.3): both panes are bridge-owned, not stubs in this registry', () => {
    expect([...BRIDGE_PANE_IDS].sort()).toEqual(['form-customization', 'user-profile'])
    expect('user-profile' in SETTINGS_PANES).toBe(false)
    expect('form-customization' in SETTINGS_PANES).toBe(false)
  })
})
