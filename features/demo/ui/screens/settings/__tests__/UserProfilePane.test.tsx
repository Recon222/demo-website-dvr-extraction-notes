import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { UserProfilePane } from '@/features/demo/ui/screens/settings/panes/UserProfilePane'
import { DEFAULT_USER_PROFILE } from '@/features/demo/engine/logic/user-profile'
import { clock } from '@/features/demo/ui/inputs/clock'
import { MODAL_LAYER } from '@/features/demo/ui/screens/_shared'
import { SETTINGS_SHEET_Z } from '@/features/demo/ui/screens/settings/SettingsModal'
import { PICKER_SHEET_Z } from '@/features/demo/ui/inputs/PickerSheet'
import type { UserProfile } from '@/features/demo/engine/types'
import type { SaveStateKind } from '@/features/demo/engine/logic/save-status'
import { palette } from '@/features/demo/ui/tokens/palette'

/**
 * The User Profile pane + its editor (P7.2, matrix rows 85/86).
 *
 * The pane is presentational — profile in, saved record out — so everything here is driven by
 * props, and the bridge half (persistence, the master-row preview, the Completed-By autofill)
 * is pinned in `ui/__tests__/DemoExperience.user-profile.test.tsx`.
 */

const profile = (o: Partial<UserProfile> = {}): UserProfile => ({ ...DEFAULT_USER_PROFILE, ...o })

const FULL = profile({
  name: 'K. Vasilyev',
  badgeNumber: '4471',
  timeInFieldStart: '2016-03-01 00:00:00',
  timeAtAgencyStart: '2019-11-04 00:00:00',
  currentAgency: 'Peel Regional Police',
  unitName: 'Forensic Video Unit',
  qualifications: 'Adobe certified; FVA member',
})

function renderPane(p: UserProfile = DEFAULT_USER_PROFILE, saveState: SaveStateKind = 'saved') {
  const onSave = vi.fn()
  render(<UserProfilePane profile={p} onSave={onSave} saveState={saveState} />)
  return { onSave }
}

/** Open the editor and hand back the dialog. */
function openEditor(p: UserProfile = DEFAULT_USER_PROFILE) {
  const handles = renderPane(p)
  fireEvent.click(screen.getByTestId('user-profile-section-edit-button'))
  return { ...handles, dialog: screen.getByRole('dialog', { name: 'User Profile' }) }
}

afterEach(() => vi.restoreAllMocks())

describe('the pane — unconfigured', () => {
  it('shows the phone’s empty line and a Set Up Profile button', () => {
    renderPane()
    expect(screen.getByTestId('user-profile-section-empty')).toHaveTextContent('No profile configured.')
    expect(screen.getByTestId('user-profile-section-edit-button')).toHaveTextContent('Set Up Profile')
  })

  it('surfaces no summary line at all', () => {
    renderPane()
    for (const id of ['name', 'badge', 'agency', 'unit']) {
      expect(screen.queryByTestId(`user-profile-section-${id}`)).not.toBeInTheDocument()
    }
  })

  it('is unconfigured for a whitespace-only name — trim decides, not truthiness', () => {
    renderPane(profile({ name: '   ' }))
    expect(screen.getByTestId('user-profile-section-empty')).toBeInTheDocument()
  })

  it('hides badge/agency/unit even when they have content — hasName gates the whole block', () => {
    renderPane(profile({ badgeNumber: '4471', currentAgency: 'Peel Regional Police', unitName: 'FVU' }))
    expect(screen.getByTestId('user-profile-section-empty')).toBeInTheDocument()
    expect(screen.queryByText(/4471/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Peel Regional Police/)).not.toBeInTheDocument()
  })
})

describe('the pane — configured', () => {
  it('summarises name, badge, agency and unit, and relabels the button', () => {
    renderPane(FULL)
    expect(screen.getByTestId('user-profile-section-name')).toHaveTextContent('Name: K. Vasilyev')
    expect(screen.getByTestId('user-profile-section-badge')).toHaveTextContent('Badge: 4471')
    expect(screen.getByTestId('user-profile-section-agency')).toHaveTextContent('Agency: Peel Regional Police')
    expect(screen.getByTestId('user-profile-section-unit')).toHaveTextContent('Unit: Forensic Video Unit')
    expect(screen.getByTestId('user-profile-section-edit-button')).toHaveTextContent('Edit Profile')
    expect(screen.queryByTestId('user-profile-section-empty')).not.toBeInTheDocument()
  })

  it('paints its edit button with the shared outline recipe, not a hand-rolled accent pair (A66)', () => {
    // demo §3.5 flags this site explicitly, and it is the ONE A66 site where the phone names a
    // size: `src/features/settings/user-profile/components/UserProfileSection.tsx:95-102`,
    // `variant="outline" size="small"`.
    //
    // This is the ADOPTION pin. `controls/__tests__/button-recipe.test.tsx` proves the recipe
    // holds the phone's values; nothing there can fail if the seam is never CALLED, which is the
    // dead-import failure a seam-only suite is blind to by construction. One real surface reading
    // it closes that, and this is the only A66 site with a test file to put it in.
    renderPane(FULL)
    expect(screen.getByTestId('user-profile-section-edit-button')).toHaveStyle({
      color: palette.dark.link, // was `#4BA3D4` — 2.81:1 as 16px semibold on the pane's glass
      borderTopColor: palette.dark.link, // was `#2B8CC1`; the recipe emits four side longhands
      borderRadius: '10px', // was a hand-rolled 8; A68 makes the corner one value
      minHeight: '44px', // `touchTarget.min` — the demo had no min-height on any button
      padding: '8px 16px', // `spacing.sm` / `spacing.md`; was '9px 16px'
    })
  })

  it('drops only the lines that are empty — a name with no badge keeps the rest', () => {
    renderPane(profile({ name: 'K. Vasilyev', unitName: 'Forensic Video Unit' }))
    expect(screen.getByTestId('user-profile-section-name')).toBeInTheDocument()
    expect(screen.getByTestId('user-profile-section-unit')).toBeInTheDocument()
    expect(screen.queryByTestId('user-profile-section-badge')).not.toBeInTheDocument()
    expect(screen.queryByTestId('user-profile-section-agency')).not.toBeInTheDocument()
  })

  it('never summarises the career dates or the qualifications block (matrix row 85)', () => {
    renderPane(FULL)
    const pane = screen.getByTestId('user-profile-section')
    expect(pane).not.toHaveTextContent('2016')
    expect(pane).not.toHaveTextContent('Adobe certified')
  })

  it('says what is different about the demo without claiming the pane is stubbed', () => {
    renderPane(FULL)
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).toHaveTextContent(/kept for this browser tab/)
    expect(note).toHaveTextContent(/Completed By/)
  })

  it('withdraws the storage promise when the tab is not storing [R-3]', () => {
    // `persistence.ts`'s `isLive()` rule: a surface may only promise refresh survival while the
    // handle is actually writing. Private-browsing tabs never store at all.
    renderPane(FULL, 'unavailable')
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).not.toHaveTextContent(/kept for this browser tab/)
    expect(note).toHaveTextContent(/isn’t storing the session/)
    expect(note).toHaveTextContent(/lasts until you leave or reload this page/)
    // The rest of the note is unchanged — the autofill still happens, and still reaches the report.
    expect(note).toHaveTextContent(/Completed By/)
    expect(note).toHaveTextContent(/On the phone it lives on the device instead/)
  })

  it('gives the QUOTA case its own diagnosis, not the never-stored one [FD-7]', () => {
    // The case R-3 was filed about: the browser stored fine until it ran out of room, the
    // snapshot was cleared, and "this browser isn't storing the session" would be a wrong
    // description of what just happened.
    renderPane(FULL, 'failed')
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).toHaveTextContent(/the last save to this tab failed/)
    expect(note).toHaveTextContent(/gone if you reload/)
    expect(note).not.toHaveTextContent(/isn’t storing the session/)
    expect(note).not.toHaveTextContent(/kept for this browser tab/)
  })

  it('does not promise, or deny, before the first write has landed [FD-7]', () => {
    renderPane(FULL, 'pending')
    const note = screen.getByTestId('settings-pane-stub-note')
    expect(note).toHaveTextContent(/hasn’t stored anything yet, but it will as you go/)
    expect(note).not.toHaveTextContent(/kept for this browser tab/)
    expect(note).not.toHaveTextContent(/failed/)
  })

  it('says exactly one true thing per state — the four clauses are mutually exclusive', () => {
    // The promise sentence may appear in the `saved` arm and nowhere else; every other state
    // must say something, and never that one.
    const seen = new Set<string>()
    for (const kind of ['saved', 'pending', 'failed', 'unavailable'] as const) {
      const { unmount } = render(<UserProfilePane profile={FULL} onSave={vi.fn()} saveState={kind} />)
      const text = screen.getByTestId('settings-pane-stub-note').textContent ?? ''
      expect(text.includes('kept for this browser tab'), kind).toBe(kind === 'saved')
      expect(text, kind).toContain('This one is real')
      seen.add(text)
      unmount()
    }
    expect(seen.size, 'two states share a sentence').toBe(4)
  })
})

describe('the editor — what it renders', () => {
  it('is closed until the button is pressed', () => {
    renderPane()
    expect(screen.queryByRole('dialog', { name: 'User Profile' })).not.toBeInTheDocument()
  })

  it('renders all seven fields with the phone’s labels and placeholders, in order', () => {
    const { dialog } = openEditor(FULL)
    const inputs = [
      ['Full Name', 'Your full name'],
      ['Badge / ID Number', 'Badge or employee number'],
      ['Current Agency', 'Police service or employer'],
      ['Unit / Section Name', 'e.g., Forensic Video Unit, FVU, Forensic Multimedia'],
      ['Qualifications & Education', 'Paste your qualifications, education, certifications...'],
    ] as const
    for (const [label, placeholder] of inputs) {
      expect(within(dialog).getByLabelText(label)).toHaveAttribute('placeholder', placeholder)
    }
    expect(within(dialog).getByTestId('profile-time-in-field')).toHaveTextContent('Start Date in Field')
    expect(within(dialog).getByTestId('profile-time-at-agency')).toHaveTextContent('Start Date at Current Agency')
  })

  it('opens seeded from the stored profile', () => {
    const { dialog } = openEditor(FULL)
    expect(within(dialog).getByLabelText('Full Name')).toHaveValue('K. Vasilyev')
    expect(within(dialog).getByLabelText('Qualifications & Education')).toHaveValue('Adobe certified; FVA member')
  })

  it('has NO Cancel button — the header × is the only cancel path (phone parity)', () => {
    const { dialog } = openEditor(FULL)
    expect(within(dialog).queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(within(dialog).getByTestId('user-profile-save-button')).toHaveTextContent('Save Profile')
  })

  it('offers no reset, and no agency-logo control (matrix row 86: neither exists)', () => {
    const { dialog } = openEditor(FULL)
    expect(within(dialog).queryByRole('button', { name: /reset|clear profile/i })).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/logo/i)).not.toBeInTheDocument()
    expect(dialog.querySelector('input[type="file"]')).toBeNull()
  })

  it('leaves Save always live — there is no validation on this form', () => {
    const { onSave } = openEditor()
    const save = screen.getByTestId('user-profile-save-button')
    expect(save).not.toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(save)
    expect(onSave).toHaveBeenCalledWith(DEFAULT_USER_PROFILE)
  })
})

describe('the editor — the career-duration lines', () => {
  it('renders the computed span under a set start date', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2024-07-15T12:00:00'))
    const { dialog } = openEditor(FULL)
    expect(within(dialog).getByTestId('profile-time-in-field')).toHaveTextContent('8 years, 4 months')
    expect(within(dialog).getByTestId('profile-time-at-agency')).toHaveTextContent('4 years, 8 months')
  })

  it('names each line for AT the way the phone does', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2024-07-15T12:00:00'))
    openEditor(FULL)
    expect(screen.getByRole('note', { name: 'Time in field: 8 years, 4 months' })).toBeInTheDocument()
    expect(screen.getByRole('note', { name: 'Time at agency: 4 years, 8 months' })).toBeInTheDocument()
  })

  it('shows the phone’s "No date" for an unset picker, and no duration line', () => {
    const { dialog } = openEditor()
    const field = within(dialog).getByTestId('profile-time-in-field')
    expect(field).toHaveTextContent('No date')
    expect(within(field).queryByRole('note')).not.toBeInTheDocument()
  })

  it('appears as soon as a date is picked — the wiring, end to end', () => {
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2024-07-15T12:00:00'))
    const { dialog } = openEditor()
    // Opening the calendar seeds today, exactly as every other date field in the demo does.
    fireEvent.click(within(within(dialog).getByTestId('profile-time-in-field')).getByRole('button', { name: 'Set date' }))
    expect(within(dialog).getByTestId('profile-time-in-field')).toHaveTextContent('Less than 1 month')
  })

  it('reads the clock through the seam, once — never an ambient Date', () => {
    const now = vi.spyOn(clock, 'now').mockReturnValue(new Date('2024-07-15T12:00:00'))
    openEditor(FULL)
    expect(now).toHaveBeenCalledTimes(1)
  })
})

describe('the editor — save and discard', () => {
  it('commits the whole record, trimmed, in one call', () => {
    const { onSave, dialog } = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Full Name'), { target: { value: '  K. Vasilyev  ' } })
    fireEvent.change(within(dialog).getByLabelText('Badge / ID Number'), { target: { value: ' 4471 ' } })
    fireEvent.click(screen.getByTestId('user-profile-save-button'))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_USER_PROFILE, name: 'K. Vasilyev', badgeNumber: '4471' })
  })

  it('closes the editor on save', () => {
    const { dialog } = openEditor()
    fireEvent.change(within(dialog).getByLabelText('Full Name'), { target: { value: 'K. Vasilyev' } })
    fireEvent.click(screen.getByTestId('user-profile-save-button'))
    expect(screen.queryByRole('dialog', { name: 'User Profile' })).not.toBeInTheDocument()
  })

  it('discards the draft on × — nothing is committed', () => {
    const { onSave, dialog } = openEditor(FULL)
    fireEvent.change(within(dialog).getByLabelText('Full Name'), { target: { value: 'Someone Else' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'User Profile' })).not.toBeInTheDocument()
    // The pane still shows the stored name.
    expect(screen.getByTestId('user-profile-section-name')).toHaveTextContent('Name: K. Vasilyev')
  })

  it('reopens on the STORED values, not the discarded draft', () => {
    const { dialog } = openEditor(FULL)
    fireEvent.change(within(dialog).getByLabelText('Full Name'), { target: { value: 'Someone Else' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))

    fireEvent.click(screen.getByTestId('user-profile-section-edit-button'))
    expect(screen.getByLabelText('Full Name')).toHaveValue('K. Vasilyev')
  })

  it('discards on the scrim too', () => {
    const { onSave } = openEditor(FULL)
    fireEvent.click(document.querySelectorAll('[data-modal-scrim]')[0])
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'User Profile' })).not.toBeInTheDocument()
  })
})

describe('the editor’s layer (R-29 / FD-2)', () => {
  /**
   * Both neighbours are READ from the surfaces that own them. Re-typing either as a literal
   * (the first version of this test did both) unpins the invariant in that direction: the
   * neighbour can move and the assertion happily keeps comparing against the old number.
   */
  const editorZ = SETTINGS_SHEET_Z + MODAL_LAYER.overSheet

  it('sits above the sheet it opens from and below the pickers it opens itself', () => {
    expect(MODAL_LAYER.base).toBe(0)
    expect(editorZ).toBeGreaterThan(SETTINGS_SHEET_Z)
    expect(editorZ).toBeLessThan(PICKER_SHEET_Z)
  })

  it('renders on exactly that layer', () => {
    openEditor(FULL)
    expect(screen.getByRole('dialog', { name: 'User Profile' }).style.zIndex).toBe(String(editorZ))
  })

  it('is the layer the Settings sheet and the pickers actually paint on', () => {
    // The relational assertions above are only worth anything if the two constants are the
    // values their own surfaces render — otherwise the ordering holds between two numbers that
    // no longer describe the DOM.
    openEditor(FULL)
    fireEvent.click(within(screen.getByTestId('profile-time-in-field')).getByRole('button', { name: 'Set date' }))
    expect(screen.getByRole('dialog', { name: 'Select Date' }).style.zIndex).toBe(String(PICKER_SHEET_Z + 1))
    expect(document.querySelector('[data-sheet-scrim]')).toHaveStyle({ zIndex: String(PICKER_SHEET_Z) })
  })
})
