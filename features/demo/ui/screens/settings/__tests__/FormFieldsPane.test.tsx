import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { FormFieldsPane, type FormFieldsPaneProps } from '@/features/demo/ui/screens/settings/panes/FormFieldsPane'
import {
  ADDITIVE_FORM_STEPS,
  FORM_FIELDS,
  LINEAR_FORM_STEPS,
  getStepFields,
} from '@/features/demo/engine/content/form-customization'
import { resolveFieldVisible, resolveStepVisible } from '@/features/demo/engine/logic/form-visibility'
import type { FormVisibility, Profile } from '@/features/demo/engine/types'

/**
 * The Form Fields pane (P7.3). Presentational: visibility in, intent out. These pin the ROWS —
 * that the grid is the wizard's own step and field inventory, that locks render locked and stay
 * inert, and that the profile line is the derived count rather than the blurb.
 */

function renderPane(over: Partial<FormFieldsPaneProps> = {}, profile: Profile = 'forensic') {
  const vis: FormVisibility = { profile, formOverrides: { steps: {}, fields: {} } }
  const props: FormFieldsPaneProps = {
    profile,
    isStepVisible: (id) => resolveStepVisible(id, vis),
    isFieldVisible: (id) => resolveFieldVisible(id, vis),
    onApplyProfile: vi.fn(),
    onToggleStep: vi.fn(),
    onToggleField: vi.fn(),
    ...over,
  }
  render(<FormFieldsPane {...props} />)
  return props
}

describe('the grid is the wizard inventory', () => {
  it('renders a row per step — 10 linear + 2 tools, in registry order', () => {
    renderPane()
    for (const step of [...LINEAR_FORM_STEPS, ...ADDITIVE_FORM_STEPS]) {
      expect(screen.getByTestId(`fc-screen-toggle-${step.id}`), `no row for "${step.id}"`).toBeInTheDocument()
    }
    const groups = screen.getAllByTestId(/^fc-group-/)
    expect(groups).toHaveLength(12)
    expect(groups.map((g) => g.getAttribute('data-testid'))).toEqual(
      [...LINEAR_FORM_STEPS, ...ADDITIVE_FORM_STEPS].map((s) => `fc-group-${s.id}`),
    )
  })

  it('expands a field-capable row into every one of that screen fields', () => {
    renderPane()
    fireEvent.click(screen.getByTestId('fc-group-dvrInfo'))
    const body = screen.getByTestId('fc-body-dvrInfo')
    for (const f of getStepFields('dvrInfo')) {
      expect(within(body).getByTestId(`fc-toggle-${f.id}`), `no toggle for "${f.id}"`).toBeInTheDocument()
    }
  })

  it('reaches all 58 registry fields across the field-capable rows once expanded', () => {
    renderPane()
    for (const step of LINEAR_FORM_STEPS) fireEvent.click(screen.getByTestId(`fc-group-${step.id}`))
    const rendered = screen.getAllByTestId(/^fc-toggle-/).map((el) => el.getAttribute('data-testid'))
    // The screen-only steps (Time Offset, Extracted Scope, Notes) contribute a note, not
    // toggles — on the phone too. Everything else is switchable.
    const expected = FORM_FIELDS.filter((f) => {
      const step = LINEAR_FORM_STEPS.find((s) => s.id === f.screen)
      return step?.classification === 'field-capable'
    })
    expect(expected).toHaveLength(50)
    expect(rendered.sort()).toEqual(expected.map((f) => `fc-toggle-${f.id}`).sort())
  })

  it('explains a screen-only row instead of offering toggles that control nothing', () => {
    renderPane()
    fireEvent.click(screen.getByTestId('fc-group-timeOffset'))
    const body = screen.getByTestId('fc-body-timeOffset')
    expect(body).toHaveTextContent('Required time calibration — always shown.')
    expect(within(body).queryAllByRole('switch')).toHaveLength(0)

    fireEvent.click(screen.getByTestId('fc-group-mediaCapture'))
    expect(screen.getByTestId('fc-body-mediaCapture')).toHaveTextContent('A capture tool opened from the wizard drawer.')
  })
})

describe('the row expander names itself once (R-31)', () => {
  it('keeps the state in aria-expanded and out of the accessible name', () => {
    renderPane()
    const row = screen.getByTestId('fc-group-dvrInfo')
    expect(row).toHaveAttribute('aria-label', 'DVR Information')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(row)
    // The name is stable across the state change — only `aria-expanded` moves, so AT does not
    // announce "collapsed" twice (the rule `MediaAccordion` states and the other eight
    // `aria-expanded` sites in the repo follow).
    expect(screen.getByTestId('fc-group-dvrInfo')).toHaveAttribute('aria-label', 'DVR Information')
    expect(screen.getByTestId('fc-group-dvrInfo')).toHaveAttribute('aria-expanded', 'true')
  })

  it('points the expander at the body it opens', () => {
    renderPane()
    fireEvent.click(screen.getByTestId('fc-group-dvrInfo'))
    const controls = screen.getByTestId('fc-group-dvrInfo').getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    expect(document.getElementById(controls!)).toBe(screen.getByTestId('fc-body-dvrInfo'))
  })
})

describe('locks', () => {
  it('renders must-stay screens locked, on and inert', () => {
    const props = renderPane()
    for (const id of ['submission', 'requestedScope', 'timeOffset', 'completion'] as const) {
      const sw = screen.getByTestId(`fc-screen-toggle-${id}`)
      expect(sw).toHaveAttribute('aria-checked', 'true')
      expect(sw).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByTestId(`fc-screen-lock-${id}`)).toHaveTextContent('Always on')
      fireEvent.click(sw)
    }
    expect(props.onToggleStep).not.toHaveBeenCalled()
  })

  it('points every locked switch at the pill that says why (R-6)', () => {
    // `aria-disabled` announces "dimmed" and no reason. Without the description a screen-reader
    // visitor cannot tell a deliberate lock from a broken control — the pill is an unlabelled
    // span two nodes away and is never read at that moment.
    renderPane()
    fireEvent.click(screen.getByTestId('fc-group-submission'))
    for (const [sw, pill] of [
      ['fc-screen-toggle-submission', 'fc-screen-lock-submission'],
      ['fc-toggle-submission.occNumber', 'fc-field-lock-submission.occNumber'],
    ] as const) {
      const described = screen.getByTestId(sw).getAttribute('aria-describedby')
      expect(described, `${sw} announces "dimmed" with no reason`).toBeTruthy()
      expect(document.getElementById(described!)).toBe(screen.getByTestId(pill))
      expect(screen.getByTestId(pill)).toHaveTextContent('Always on')
    }
    // …and an UNLOCKED switch describes nothing: there is no reason to give.
    expect(screen.getByTestId('fc-screen-toggle-cameras')).not.toHaveAttribute('aria-describedby')
  })

  it('renders always-on fields locked, on and inert — and keeps them focusable', () => {
    const props = renderPane()
    fireEvent.click(screen.getByTestId('fc-group-submission'))
    const occ = screen.getByTestId('fc-toggle-submission.occNumber')
    expect(occ).toHaveAttribute('aria-checked', 'true')
    expect(occ).toHaveAttribute('aria-disabled', 'true')
    expect(occ).toHaveAttribute('tabindex', '0') // house rule: aria-disabled, never `disabled`
    fireEvent.click(occ)
    fireEvent.keyDown(occ, { key: 'Enter' })
    expect(props.onToggleField).not.toHaveBeenCalled()
    expect(screen.getByTestId('fc-field-lock-submission.occNumber')).toBeInTheDocument()
  })

  it('leaves an unlocked toggle working, by click and by keyboard', () => {
    const props = renderPane()
    fireEvent.click(screen.getByTestId('fc-group-submission'))
    fireEvent.click(screen.getByTestId('fc-toggle-submission.requesterName'))
    expect(props.onToggleField).toHaveBeenCalledWith('submission.requesterName', false)

    fireEvent.keyDown(screen.getByTestId('fc-screen-toggle-cameras'), { key: ' ' })
    expect(props.onToggleStep).toHaveBeenCalledWith('cameras', false)
  })
})

describe('a hidden screen', () => {
  it('offers no field toggles and says why', () => {
    const props = renderPane({}, 'canvas')
    const sw = screen.getByTestId('fc-screen-toggle-cameras')
    expect(sw).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByTestId('fc-group-cameras'))
    const body = screen.getByTestId('fc-body-cameras')
    expect(body).toHaveTextContent('This screen is hidden. Turn it on above to customize its fields.')
    expect(within(body).queryAllByRole('switch')).toHaveLength(0)
    // …and the row's own switch still turns it back on.
    fireEvent.click(sw)
    expect(props.onToggleStep).toHaveBeenCalledWith('cameras', true)
  })

  it('shows a canvas-hidden field as off while its screen stays visible', () => {
    renderPane({}, 'canvas')
    fireEvent.click(screen.getByTestId('fc-group-dvrInfo'))
    expect(screen.getByTestId('fc-toggle-dvr.serialModelNumber')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('fc-toggle-dvr.dvrTypeBrand')).toHaveAttribute('aria-checked', 'true')
  })
})

describe('the profile picker', () => {
  it('marks the active chip and reports every profile', () => {
    renderPane({}, 'canvas')
    expect(screen.getByTestId('fc-profile-canvas')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('fc-profile-forensic')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('fc-profile-limited')).toBeInTheDocument()
  })

  it('reports the intent rather than applying it — the confirm is the bridge’s', () => {
    const props = renderPane()
    fireEvent.click(screen.getByTestId('fc-profile-canvas'))
    expect(props.onApplyProfile).toHaveBeenCalledWith('canvas')
  })

  it('states the reduction as a DERIVED count, not as the blurb', () => {
    renderPane({}, 'limited')
    // The phone's copy — carried verbatim — promises a reduction…
    expect(screen.getByText('Comprehensive, lightly reduced (SPC/SOCO).')).toBeInTheDocument()
    // …and the count, read off the same map the resolver reads, tells the truth.
    expect(screen.getByTestId('fc-profile-reduction')).toHaveTextContent('Hides nothing — every screen and field is on.')
  })

  it('pluralises the canvas reduction correctly', () => {
    renderPane({}, 'canvas')
    expect(screen.getByTestId('fc-profile-reduction')).toHaveTextContent('Hides 1 screen · 12 fields.')
  })
})

describe('the output-policy footnote', () => {
  it('tells the visitor hidden screens do not remove data from the report', () => {
    renderPane()
    expect(
      screen.getByText(
        'Hidden screens are removed from the wizard flow only — any data already entered is still saved and still appears in the generated report.',
      ),
    ).toBeInTheDocument()
  })
})
