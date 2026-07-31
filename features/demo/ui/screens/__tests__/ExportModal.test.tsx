import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportModal, type ExportModalProps } from '@/features/demo/ui/screens/ExportModal'
import type { CasePdfValidationResult, LocationPdfValidation } from '@/features/demo/engine/logic/export'

/**
 * P5.3 / matrix row 25 — the unified export modal, both modes
 * (phone `src/components/export/ExportModal.tsx`, ui-mapping 04 + 08).
 */

const invalid = (id: string, name: string, errors: string[]): LocationPdfValidation => ({
  locationId: id,
  locationName: name,
  valid: false,
  errors,
})

function result(over: Partial<CasePdfValidationResult> = {}): CasePdfValidationResult {
  const invalidLocations = over.invalidLocations ?? [invalid('l1', 'Rear Alley Camera', ['Completion date'])]
  const validLocations = over.validLocations ?? []
  return {
    caseId: 'c1',
    caseNumber: 'PR25-0098213',
    validLocations,
    invalidLocations,
    allValid: invalidLocations.length === 0,
    totalLocations: validLocations.length + invalidLocations.length,
    validCount: validLocations.length,
    invalidCount: invalidLocations.length,
    ...over,
  }
}

function renderModal(over: Partial<ExportModalProps> = {}) {
  const onContinueAnyway = over.onContinueAnyway ?? vi.fn()
  const onCancel = over.onCancel ?? vi.fn()
  const view = render(
    <ExportModal mode="hidden" {...over} onContinueAnyway={onContinueAnyway} onCancel={onCancel} />,
  )
  return { onContinueAnyway, onCancel, ...view }
}

describe('ExportModal — hidden', () => {
  it('renders nothing at all', () => {
    const { container } = renderModal({ mode: 'hidden', stage: 'zipping' })
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ExportModal — progress mode', () => {
  it('shows the stage message for each stage the demo pipeline can enter', () => {
    const { rerender } = renderModal({ mode: 'progress', stage: 'validating' })
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')

    const noop = vi.fn()
    rerender(<ExportModal mode="progress" stage="generating" onContinueAnyway={noop} onCancel={noop} />)
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Generating PDFs...')

    rerender(<ExportModal mode="progress" stage="zipping" onContinueAnyway={noop} onCancel={noop} />)
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
  })

  it('is a polite progressbar labelled with the stage message', () => {
    renderModal({ mode: 'progress', stage: 'zipping' })
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAccessibleName('Creating ZIP archive...')
    expect(bar).toHaveAttribute('aria-live', 'polite')
  })

  it('counts locations and names the current one — but only while generating', () => {
    const { rerender } = renderModal({
      mode: 'progress',
      stage: 'generating',
      progress: { current: 2, total: 3 },
      currentLocationName: "Kim's Convenience",
    })
    expect(screen.getByText('Location 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('"Kim\'s Convenience"')).toBeInTheDocument()

    // Zipping is one archive, not k of n — and a leftover name would keep naming a location
    // the export has already moved past.
    const noop = vi.fn()
    rerender(
      <ExportModal
        mode="progress"
        stage="zipping"
        progress={{ current: 2, total: 3 }}
        currentLocationName="Kim's Convenience"
        onContinueAnyway={noop}
        onCancel={noop}
      />,
    )
    expect(screen.queryByText('Location 2 of 3')).not.toBeInTheDocument()
    expect(screen.queryByText('"Kim\'s Convenience"')).not.toBeInTheDocument()
  })

  it('omits the counter when the total is unknown', () => {
    renderModal({ mode: 'progress', stage: 'generating', progress: { current: 0, total: 0 } })
    expect(screen.queryByText(/^Location \d+ of/)).not.toBeInTheDocument()
  })

  it('is not dismissible — no Escape, no scrim escape, no buttons', () => {
    const { onCancel } = renderModal({ mode: 'progress', stage: 'zipping' })
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-export-scrim]')!)
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('ExportModal — validation mode, some locations invalid', () => {
  const partial = () =>
    result({
      validLocations: [{ locationId: 'l0', locationName: 'Front Counter', valid: true, errors: [] }],
      invalidLocations: [invalid('l1', 'Rear Alley Camera', ['Completion date', 'Completed by'])],
    })

  it('renders the partial-invalid title, description and summary verbatim', () => {
    renderModal({ mode: 'validation', validationResult: partial() })
    expect(screen.getByText('Some Locations Missing PDF Data')).toBeInTheDocument()
    expect(
      screen.getByText('The following locations will NOT include PDF notes due to missing required fields:'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 2 locations will include PDF notes.')).toBeInTheDocument()
  })

  it('lists each invalid location with a "- Missing: {field}" line per error', () => {
    renderModal({ mode: 'validation', validationResult: partial() })
    const list = screen.getByTestId('export-invalid-locations')
    expect(list).toHaveTextContent('Rear Alley Camera')
    expect(list).toHaveTextContent('- Missing: Completion date')
    expect(list).toHaveTextContent('- Missing: Completed by')
    // Only the failures are listed — a valid location has nothing to say here.
    expect(list).not.toHaveTextContent('Front Counter')
  })

  it('labels the primary button "Continue" and uses the warning icon', () => {
    renderModal({ mode: 'validation', validationResult: partial() })
    expect(screen.getByRole('button', { name: 'Continue with export' })).toHaveTextContent('Continue')
    expect(screen.getByTestId('export-validation-icon-some')).toBeInTheDocument()
    expect(screen.queryByTestId('export-validation-icon-all')).not.toBeInTheDocument()
  })
})

describe('ExportModal — validation mode, every location invalid', () => {
  const all = () =>
    result({
      validLocations: [],
      invalidLocations: [
        invalid('l1', 'Rear Alley Camera', ['Completion date']),
        invalid('l2', 'Plaza Office', ['Case number']),
      ],
    })

  it('switches to the louder framing: title, description, summary and Export Anyway', () => {
    renderModal({ mode: 'validation', validationResult: all() })
    expect(screen.getByText('All Locations Missing PDF Data')).toBeInTheDocument()
    expect(
      screen.getByText('None of the locations have the required fields for PDF generation:'),
    ).toBeInTheDocument()
    // §70k: this sentence describes the artifact, so the honest "no downloads here" treatment
    // belongs at the terminal step, not here.
    expect(screen.getByText('The ZIP will be created without any PDF notes.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue with export' })).toHaveTextContent('Export Anyway')
    expect(screen.getByTestId('export-validation-icon-all')).toBeInTheDocument()
  })
})

describe('ExportModal — validation mode, behaviour', () => {
  it('is a focused alertdialog labelled by its title and described by its summary', () => {
    renderModal({ mode: 'validation', validationResult: result() })
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('All Locations Missing PDF Data')
    expect(dialog).toHaveAccessibleDescription('The ZIP will be created without any PDF notes.')
    expect(dialog).toHaveFocus()
  })

  it('announces the counts to assistive tech when it appears', async () => {
    renderModal({ mode: 'validation', validationResult: result() })
    expect(await screen.findByTestId('export-validation-announcement')).toHaveTextContent(
      'Warning: 1 of 1 locations are missing required data for PDF generation.',
    )
  })

  it('cancels from the button, from Escape and from the scrim', () => {
    const { onCancel, onContinueAnyway } = renderModal({ mode: 'validation', validationResult: result() })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-export-scrim]')!)
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(onContinueAnyway).not.toHaveBeenCalled()
  })

  it('continues from the primary button only', () => {
    const { onContinueAnyway } = renderModal({ mode: 'validation', validationResult: result() })
    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))
    expect(onContinueAnyway).toHaveBeenCalledOnce()
  })

  it('while exporting: both buttons are disabled and neither escape route fires', () => {
    const { onCancel, onContinueAnyway } = renderModal({
      mode: 'validation',
      validationResult: result(),
      isExporting: true,
    })
    expect(screen.getByRole('button', { name: 'Cancel export' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue with export' })).toBeDisabled()

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-export-scrim]')!)
    expect(onCancel).not.toHaveBeenCalled()
    expect(onContinueAnyway).not.toHaveBeenCalled()
  })

  it('renders nothing in validation mode without a result (the phone guards the same way)', () => {
    const { container } = renderModal({ mode: 'validation', validationResult: null })
    expect(container).toBeEmptyDOMElement()
  })
})
