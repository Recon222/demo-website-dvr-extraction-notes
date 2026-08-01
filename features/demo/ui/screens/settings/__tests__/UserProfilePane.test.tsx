import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { UserProfilePane } from '@/features/demo/ui/screens/settings/panes/UserProfilePane'
import { DEFAULT_USER_PROFILE } from '@/features/demo/engine/logic/user-profile'
import { clock } from '@/features/demo/ui/inputs/clock'
import type { UserProfile } from '@/features/demo/engine/types'

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

function renderPane(p: UserProfile = DEFAULT_USER_PROFILE) {
  const onSave = vi.fn()
  render(<UserProfilePane profile={p} onSave={onSave} />)
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
