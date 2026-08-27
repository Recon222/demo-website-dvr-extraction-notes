import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'

import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { IncidentLocationFields } from '@/features/demo/ui/inputs/IncidentLocationFields'
import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'
import { SubmissionScreen } from '@/features/demo/ui/screens/SubmissionScreen'
import { Field } from '@/features/demo/ui/screens/_shared'
import { palette, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * U2.1 — the field-input recipe asserted where it actually lands: on the DOM of every former
 * copy, not on the exported function alone. Matrix A72.
 *
 * Why here and not only in `tokens/__tests__/field-input.test.ts`: a unit pin on
 * `fieldInputStyle()` stays green over a consumer that never calls it. The mutation this file
 * exists to kill is "one of the five sites keeps (or re-grows) its own copy" — which is
 * invisible to the function's own tests and was the state of the tree before this package.
 *
 * Every expectation is composed from `tokens/palette.ts` and `tokens/scale.ts` — NEVER from
 * `fieldInputStyle()`. Reading the seam under test for the expectation is the SURVIVED shape
 * U1.2 measured twice (`glass-card-recipe.test.tsx:78-84`): a mutation inside the recipe moves
 * both sides of the comparison and the file stays green.
 *
 * jsdom rewrites colour spellings (`#1c4e84` -> `rgb(28, 78, 132)`), so colours go through a
 * real declaration rather than a byte comparison (§4.7).
 */
const c = palette[scheme]

// The Mapbox SDK, mocked to the shape the two existing suites use — this file never exercises
// suggest/retrieve, it only needs the module to import.
vi.mock('@mapbox/search-js-core', () => ({
  SearchBoxCore: class {},
  SearchSession: class {
    suggest = vi.fn()
    retrieve = vi.fn()
  },
}))

/** What jsdom stores for a colour written into a `border-color` declaration. */
function normColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.borderColor = value
  return probe.style.borderColor
}

const BORDER = normColor(c.border)
const PRIMARY = normColor(c.primary)
const ERROR = normColor(c.error)
const DISABLED = normColor(c.disabled)
const TEXT = normColor(c.text)
const TEXT_SECONDARY = normColor(c.textSecondary)
const BACKGROUND = normColor(c.background)

/** The geometry every text input in the product must carry (phone `TextInput.tsx:166-173`). */
function expectSharedGeometry(el: HTMLElement): void {
  expect(el.style.borderRadius).toBe(`${radius.md}px`)
  expect(el.style.padding).toBe(`${spacing.md}px`)
  expect(el.style.minHeight).toBe(`${touchTarget.min}px`)
  expect(el.style.fontSize).toBe('16px')
  expect(el.style.width).toBe('100%')
  expect(normColor(el.style.backgroundColor)).toBe(BACKGROUND)
}

describe('Field — screens/_shared.tsx (U2.1 / A72)', () => {
  const base = { label: 'Case Number', value: '2025-004821', onChange: vi.fn() }

  it('paints the shared recipe, with colors.border at rest', () => {
    render(<Field {...base} />)
    const input = screen.getByLabelText('Case Number')
    expectSharedGeometry(input)
    expect(input.style.borderWidth).toBe('1px')
    expect(normColor(input.style.borderColor)).toBe(BORDER)
    expect(normColor(input.style.color)).toBe(TEXT)
  })

  it('paints colors.primary while focused — the indicator `outline: none` suppresses', () => {
    render(<Field {...base} />)
    const input = screen.getByLabelText('Case Number')
    expect(input.style.outline).toBe('none')
    fireEvent.focus(input)
    expect(normColor(input.style.borderColor)).toBe(PRIMARY)
    fireEvent.blur(input)
    expect(normColor(input.style.borderColor)).toBe(BORDER)
  })

  it('thickens the edge to 2px in colors.error when a message is showing', () => {
    render(<Field {...base} error="Case number is required" />)
    const input = screen.getByLabelText('Case Number')
    expect(input.style.borderWidth).toBe('2px')
    expect(normColor(input.style.borderColor)).toBe(ERROR)
  })

  it('outranks focus with the error, and the error with disabled', () => {
    const { rerender } = render(<Field {...base} error="nope" />)
    const input = screen.getByLabelText('Case Number')
    fireEvent.focus(input)
    expect(normColor(input.style.borderColor)).toBe(ERROR)
    rerender(<Field {...base} error="nope" readOnly />)
    expect(normColor(input.style.borderColor)).toBe(DISABLED)
  })

  it('takes the phone disabled path when readOnly, and stops fading the LABEL', () => {
    render(<Field {...base} readOnly />)
    const input = screen.getByLabelText('Case Number')
    expect(input).toHaveAttribute('readonly')
    expect(normColor(input.style.borderColor)).toBe(DISABLED)
    expect(normColor(input.style.color)).toBe(TEXT_SECONDARY)
    // D10, and the whole point of the phone's PR #115: the label carries data the analyst has
    // to read. `_shared.tsx:270` used to fade the WRAPPER, which took the label down with it.
    const label = screen.getByText('Case Number')
    expect(label.style.opacity).toBe('')
    expect(label.closest('div')?.parentElement?.style.opacity).toBe('')
  })

  it('treats an empty-string error as NO error, exactly as `aria-invalid` does', () => {
    // `describedBy`/`invalid` are truthiness checks (`error ? … : undefined`), so a `''`
    // error must not redden the box either — otherwise the field paints a validation state
    // that no message and no `aria-invalid` back up.
    render(<Field {...base} error="" />)
    const input = screen.getByLabelText('Case Number')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input.style.borderWidth).toBe('1px')
    expect(normColor(input.style.borderColor)).toBe(BORDER)
  })

  it('applies the same recipe to the multiline textarea', () => {
    render(<Field {...base} multiline />)
    const box = screen.getByLabelText('Case Number')
    expect(box.tagName).toBe('TEXTAREA')
    expect(box.style.padding).toBe(`${spacing.md}px`)
    expect(box.style.fontSize).toBe('16px')
    expect(normColor(box.style.borderColor)).toBe(BORDER)
  })
})

describe('AddressAutocomplete — inputs/AddressAutocomplete.tsx (U2.1 / A72)', () => {
  const render1 = () =>
    render(<AddressAutocomplete label="Street Address" value="" onChange={vi.fn()} onPick={vi.fn()} />)

  it('paints the shared recipe instead of its own `inputStyle` copy', () => {
    render1()
    const input = screen.getByLabelText('Street Address')
    expectSharedGeometry(input)
    expect(input.style.borderWidth).toBe('1px')
    expect(normColor(input.style.borderColor)).toBe(BORDER)
  })

  it('takes the focused branch without losing its own suggestion-reopen handler', () => {
    render1()
    const input = screen.getByLabelText('Street Address')
    fireEvent.focus(input)
    expect(normColor(input.style.borderColor)).toBe(PRIMARY)
    expect(input).toHaveAttribute('aria-expanded', 'false') // no suggestions loaded -> stays closed
    fireEvent.blur(input)
    expect(normColor(input.style.borderColor)).toBe(BORDER)
  })
})

const blankIncident: IncidentLocationValues = {
  businessName: '',
  streetAddress: '',
  city: '',
  latitude: '',
  longitude: '',
  coordinateSource: '',
}

function IncidentHost() {
  const [values, setValues] = useState(blankIncident)
  return <IncidentLocationFields values={values} onChange={(p) => setValues((v) => ({ ...v, ...p }))} />
}

describe('IncidentLocationFields — inputs/IncidentLocationFields.tsx (U2.1 / A72)', () => {
  it('paints the shared recipe instead of its own `coordInput` copy', () => {
    render(<IncidentHost />)
    const lat = screen.getByLabelText('Latitude')
    expectSharedGeometry(lat)
    expect(lat.style.borderWidth).toBe('1px')
    expect(normColor(lat.style.borderColor)).toBe(BORDER)
  })

  it('reddens and thickens on the blur-time parse failure, and focuses to primary', () => {
    render(<IncidentHost />)
    const lat = screen.getByLabelText('Latitude')
    fireEvent.focus(lat)
    expect(normColor(lat.style.borderColor)).toBe(PRIMARY)
    fireEvent.change(lat, { target: { value: 'not a latitude' } })
    fireEvent.blur(lat)
    expect(lat.style.borderWidth).toBe('2px')
    expect(normColor(lat.style.borderColor)).toBe(ERROR)
  })
})

const blankCase: NewCaseFields = {
  caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '', vcName: '', vcBadge: '',
  incidentBusinessName: '', incidentStreetAddress: '', incidentCity: '',
  incidentLatitude: '', incidentLongitude: '', incidentCoordinateSource: '', notes: '',
}

/** The modal is fully controlled, and `CoordinateField` validates the value it is HANDED —
 *  so a stateless `onChange={vi.fn()}` would blur an empty field and clear the error. */
function CaseHost() {
  const [form, setForm] = useState(blankCase)
  return (
    <NewCaseModal
      form={form}
      onChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  )
}

describe('NewCaseModal — screens/NewCaseModal.tsx (U2.1 / A72)', () => {
  const renderModal = () => render(<CaseHost />)

  it('paints the shared recipe instead of its own `coordInput` copy', () => {
    renderModal()
    const lat = screen.getByLabelText('Latitude')
    expectSharedGeometry(lat)
    expect(lat.style.borderWidth).toBe('1px')
    expect(normColor(lat.style.borderColor)).toBe(BORDER)
  })

  it('reddens and thickens on its own blur-time validation, and focuses to primary', () => {
    renderModal()
    const lat = screen.getByLabelText('Latitude')
    fireEvent.focus(lat)
    expect(normColor(lat.style.borderColor)).toBe(PRIMARY)
    fireEvent.change(lat, { target: { value: 'not a latitude' } })
    fireEvent.blur(lat)
    expect(lat.style.borderWidth).toBe('2px')
    expect(normColor(lat.style.borderColor)).toBe(ERROR)
  })
})

describe('SubmissionScreen — screens/SubmissionScreen.tsx (U2.1 / A72, D10)', () => {
  const fields = {
    requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '',
    businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '',
  }

  /** The read-only case number is a DIV, not an input — `getByText` is the only handle. */
  const renderScreen = () =>
    render(
      <SubmissionScreen
        occNumber="2025-004821"
        fields={fields}
        isFieldVisible={() => true}
        onChange={vi.fn()}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onMenu={vi.fn()}
        onCoordinates={vi.fn()}
      />,
    )

  it('takes the recipe GEOMETRY and keeps opacity 0.6 + aria-disabled (D10 amended)', () => {
    renderScreen()
    const box = screen.getByText('2025-004821')
    expectSharedGeometry(box)
    // D10 governs here and the geometry half is all that ports: `disabledText` would measure
    // 2.54/3.57 against this opacity's 4.60/5.22 on a field carrying the occurrence number,
    // which is the "label that carries data" D10 forbids fading. So the DEFAULT branch, not
    // the disabled one — colours unchanged from what this div shipped.
    expect(normColor(box.style.borderColor)).toBe(BORDER)
    expect(normColor(box.style.color)).toBe(TEXT)
    expect(box.style.opacity).toBe('0.6')
    expect(box).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not fade the label that sits beside it', () => {
    renderScreen()
    expect(screen.getByText('Case Number').style.opacity).toBe('')
  })
})
