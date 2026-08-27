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

/**
 * The props are discriminated on `mode` (review R-17), so the old single
 * `Partial<ExportModalProps>` helper no longer typechecks — and that is the point: a
 * `{ mode: 'validation', validationResult: null }` render is now unconstructible. One helper
 * per arm instead.
 */
type ModeProps = Extract<ExportModalProps, { mode: 'progress' | 'validation' }>
type ArmOf<M> = Omit<Extract<ModeProps, { mode: M }>, 'onContinueAnyway' | 'onCancel'>

function renderArm(arm: ArmOf<'progress'> | ArmOf<'validation'>) {
  const onContinueAnyway = vi.fn()
  const onCancel = vi.fn()
  const view = render(
    <ExportModal {...(arm as ModeProps)} onContinueAnyway={onContinueAnyway} onCancel={onCancel} />,
  )
  return { onContinueAnyway, onCancel, ...view }
}

const renderProgress = (arm: Omit<ArmOf<'progress'>, 'mode'> = {}) =>
  renderArm({ mode: 'progress', ...arm })
const renderValidation = (arm: Omit<ArmOf<'validation'>, 'mode'>) =>
  renderArm({ mode: 'validation', ...arm })

describe('ExportModal — hidden', () => {
  it('renders nothing at all', () => {
    const { container } = render(
      <ExportModal mode="hidden" onContinueAnyway={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ExportModal — progress mode', () => {
  it('shows the stage message for each stage the demo pipeline can enter', () => {
    const { rerender } = renderProgress({ stage: 'validating' })
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Validating locations...')

    const noop = vi.fn()
    rerender(<ExportModal mode="progress" stage="generating" onContinueAnyway={noop} onCancel={noop} />)
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Generating PDFs...')

    rerender(<ExportModal mode="progress" stage="zipping" onContinueAnyway={noop} onCancel={noop} />)
    expect(screen.getByTestId('export-progress-overlay')).toHaveTextContent('Creating ZIP archive...')
  })

  it('is a progressbar labelled and value-texted with the stage line', () => {
    renderProgress({ stage: 'zipping' })
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAccessibleName('Creating ZIP archive...')
    // R-6: `progressbar` prunes its children, so the visible text is unreachable through the
    // bar itself — `aria-valuetext` is what a screen reader reads when it lands here.
    expect(bar).toHaveAttribute('aria-valuetext', 'Creating ZIP archive...')
  })

  /**
   * R-6 — the overlay must SPEAK. The old markup put `aria-live` on the progressbar itself,
   * which (a) prunes its own content and (b) mounted with the text already in place, so a live
   * region had nothing to announce. The regression these pin: a screen-reader user pressing the
   * CTA (which immediately disables, dropping focus to `<body>`) heard silence for the whole run.
   */
  describe('the spoken track', () => {
    it('announces the stage on the next tick, not at mount', async () => {
      renderProgress({ stage: 'validating' })
      const live = screen.getByTestId('export-progress-announcement')
      expect(live).toHaveAttribute('aria-live', 'polite')
      expect(await screen.findByText('Validating locations...', { selector: '[role="status"]' })).toBe(live)
    })

    it('re-announces on every location tick, counter and name included', async () => {
      const { rerender } = renderProgress({
        stage: 'generating',
        progress: { current: 1, total: 2 },
        currentLocationName: 'Front Counter',
      })
      const live = screen.getByTestId('export-progress-announcement')
      await vi.waitFor(() =>
        expect(live).toHaveTextContent('Generating PDFs... — Location 1 of 2 — "Front Counter"'),
      )

      const noop = vi.fn()
      rerender(
        <ExportModal
          mode="progress"
          stage="generating"
          progress={{ current: 2, total: 2 }}
          currentLocationName="Rear Alley Camera"
          onContinueAnyway={noop}
          onCancel={noop}
        />,
      )
      await vi.waitFor(() =>
        expect(live).toHaveTextContent('Generating PDFs... — Location 2 of 2 — "Rear Alley Camera"'),
      )
    })

    it('is off-screen, so the announcement never duplicates the visible copy', () => {
      renderProgress({ stage: 'zipping' })
      expect(screen.getByTestId('export-progress-announcement')).toHaveStyle({ position: 'absolute', width: '1px' })
    })
  })

  it('R-18: the spinner rotates only when motion is welcome', () => {
    renderProgress({ stage: 'zipping' })
    // The setup stub pins `prefers-reduced-motion: no-preference`, so the animation is on here;
    // the reduced arm is exercised by `ExportModal.reduced-motion.test.tsx`.
    expect(document.querySelector('[data-export-spinner]')).toHaveStyle({
      animation: 'spin 0.9s linear infinite',
    })
  })

  it('counts locations and names the current one — but only while generating', () => {
    const { rerender } = renderProgress({
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
    renderProgress({ stage: 'generating', progress: { current: 0, total: 0 } })
    expect(screen.queryByText(/^Location \d+ of/)).not.toBeInTheDocument()
  })

  it('is not dismissible — no Escape, no scrim escape, no buttons', () => {
    const { onCancel } = renderProgress({ stage: 'zipping' })
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
    renderValidation({ validationResult: partial() })
    expect(screen.getByText('Some Locations Missing PDF Data')).toBeInTheDocument()
    expect(
      screen.getByText('The following locations will NOT include PDF notes due to missing required fields:'),
    ).toBeInTheDocument()
    expect(screen.getByText('1 of 2 locations will include PDF notes.')).toBeInTheDocument()
  })

  it('lists each invalid location with a "- Missing: {field}" line per error', () => {
    renderValidation({ validationResult: partial() })
    const list = screen.getByTestId('export-invalid-locations')
    expect(list).toHaveTextContent('Rear Alley Camera')
    expect(list).toHaveTextContent('- Missing: Completion date')
    expect(list).toHaveTextContent('- Missing: Completed by')
    // Only the failures are listed — a valid location has nothing to say here.
    expect(list).not.toHaveTextContent('Front Counter')
  })

  it('labels the primary button "Continue" and uses the warning icon', () => {
    renderValidation({ validationResult: partial() })
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
    renderValidation({ validationResult: all() })
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
    renderValidation({ validationResult: result() })
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('All Locations Missing PDF Data')
    expect(dialog).toHaveAccessibleDescription('The ZIP will be created without any PDF notes.')
    expect(dialog).toHaveFocus()
  })

  it('announces the counts to assistive tech when it appears', async () => {
    renderValidation({ validationResult: result() })
    expect(await screen.findByTestId('export-validation-announcement')).toHaveTextContent(
      'Warning: 1 of 1 locations are missing required data for PDF generation.',
    )
  })

  /**
   * U4.3. The live region used to be a SIBLING of the panel. `aria-modal="true"` prunes
   * everything outside the dialog from the accessibility tree — the same trap
   * `MediaLibrarySheet.tsx`'s `MediaFullscreen` docblock names — so out there it announced to
   * nobody. It is inside the dialog now, and this is what keeps it there.
   */
  it('keeps the live region INSIDE the aria-modal dialog, where it can be heard', () => {
    renderValidation({ validationResult: result() })
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toContainElement(screen.getByTestId('export-validation-announcement'))
  })

  /**
   * U4.3. This dialog used to read `document.activeElement` in its mount effect. The export CTA
   * that opens it disables itself in the same commit (`ExportHub`'s footer CTA, the map's
   * Export Map belt), so the old read captured `<body>` and cancelling dropped a keyboard
   * visitor at document start. The shell's capture-phase tracker reads the opener at gesture
   * time.
   */
  it('restores focus to the export CTA that was pressed, even after it disabled itself', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Export'
    document.body.appendChild(opener)
    opener.focus()
    fireEvent.pointerDown(opener)
    opener.blur()
    opener.disabled = true
    expect(document.activeElement).toBe(document.body)

    const { unmount } = renderValidation({ validationResult: result() })
    opener.disabled = false
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('cancels from the button, from Escape and from the scrim', () => {
    const { onCancel, onContinueAnyway } = renderValidation({ validationResult: result() })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel export' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-dialog-scrim]')!)
    expect(onCancel).toHaveBeenCalledTimes(3)
    expect(onContinueAnyway).not.toHaveBeenCalled()
  })

  it('continues from the primary button only', () => {
    const { onContinueAnyway } = renderValidation({ validationResult: result() })
    fireEvent.click(screen.getByRole('button', { name: 'Continue with export' }))
    expect(onContinueAnyway).toHaveBeenCalledOnce()
  })

  it('while exporting: both buttons are disabled and neither escape route fires', () => {
    const { onCancel, onContinueAnyway } = renderValidation({
      validationResult: result(),
      isExporting: true,
    })
    expect(screen.getByRole('button', { name: 'Cancel export' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue with export' })).toBeDisabled()

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(document.querySelector('[data-dialog-scrim]')!)
    expect(onCancel).not.toHaveBeenCalled()
    expect(onContinueAnyway).not.toHaveBeenCalled()
  })

  it('cannot be asked for validation mode without a result (R-17: the props discriminate)', () => {
    // The old runtime guard rendered an empty modal for `{ mode: 'validation', result: null }`.
    // That state is now unconstructible, so the assertion is a compile-time one — `@ts-expect-error`
    // fails the build if the pairing ever loosens back into a nullable field.
    const reject = () => (
      // @ts-expect-error validation mode requires a result
      <ExportModal mode="validation" onContinueAnyway={vi.fn()} onCancel={vi.fn()} />
    )
    expect(typeof reject).toBe('function')
  })
})
