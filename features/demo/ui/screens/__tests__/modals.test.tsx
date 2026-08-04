import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { NewCaseModal } from '@/features/demo/ui/screens/NewCaseModal'
import { blankCaseForm } from '@/features/demo/ui/screens/caseFormData'
import { NewLocationModal } from '@/features/demo/ui/screens/NewLocationModal'
import { ImportModal, deriveTerminalOutcome, ERROR_MESSAGES } from '@/features/demo/ui/screens/ImportModal'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

function locView(over: Partial<ImportedLocationView> = {}): ImportedLocationView {
  return {
    locId: 'loc-1',
    title: "Kim's Convenience",
    caseNumber: 'PR25-0098213',
    fieldCount: 8,
    timeFrameCount: 1,
    sections: [{ heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. Liam McHugh' }] }],
    scopes: [],
    warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "2015"' }],
    isSample: false,
    ...over,
  }
}

describe('NewCaseModal', () => {
  // The shared blank, not a hand-rolled twin: R-13 narrowed `incidentCoordinateSource` to a
  // union and this literal stopped compiling, which is the drift the union exists to catch.
  const blankCase = blankCaseForm

  it('edits fields (incl. accordion, incident, notes) and submits', () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    // The modal is controlled, so typing does not change `form` — the required fields
    // (Case Number / Unit, P3.3's gate) have to be satisfied by the props for the submit
    // half of this test to reach `onSubmit`. Gate behaviour itself: NewCaseModal.gate.test.
    render(<NewCaseModal form={{ ...blankCase, caseNumber: 'PR25-1', unit: 'Robbery' }} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Case Number'), { target: { value: 'PR25-2' } })
    expect(onChange).toHaveBeenCalledWith('caseNumber', 'PR25-2')
    // accordion fields are in the DOM even while collapsed
    fireEvent.change(screen.getByLabelText('Coordinator Name'), { target: { value: 'M. Reyes' } })
    expect(onChange).toHaveBeenCalledWith('vcName', 'M. Reyes')
    fireEvent.change(screen.getByLabelText('Business / Scene Name'), { target: { value: 'Acme' } })
    expect(onChange).toHaveBeenCalledWith('incidentBusinessName', 'Acme')
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'rear cam' } })
    expect(onChange).toHaveBeenCalledWith('notes', 'rear cam')
    // Create mode routes through the immutable-case-number confirmation (P3.3); the alert's
    // own "Create Case" arm is what submits. Confirmation behaviour: NewCaseModal.gate.test.
    fireEvent.click(screen.getByText('Create Case'))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Create Case'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})

describe('NewLocationModal', () => {
  const blankLoc = { locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }

  it('edits the contact fields (phone labels + placeholders) and submits', () => {
    const onSubmit = vi.fn()
    const onChange = vi.fn()
    render(<NewLocationModal form={{ ...blankLoc, locationName: 'Rear Door' }} onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
    const contact = screen.getByLabelText('Location Contact')
    expect(contact).toHaveAttribute('placeholder', 'Contact person name')
    fireEvent.change(contact, { target: { value: 'Sandeep' } })
    expect(onChange).toHaveBeenCalledWith({ locationContact: 'Sandeep' })
    const phone = screen.getByLabelText('Location Phone')
    expect(phone).toHaveAttribute('placeholder', '(555) 123-4567')
    fireEvent.change(phone, { target: { value: '905-555-0142' } })
    expect(onChange).toHaveBeenCalledWith({ locationPhone: '905-555-0142' })
    fireEvent.click(screen.getByText('Create Location'))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  // The gate itself (blank name, duplicate name, `requireAddress`, the reason region and the
  // focusable-while-blocked rule) is P3.4's `new-location-validation.test.tsx` — 17 arms against
  // the live modal. P3.5 shipped four narrower copies here against the pre-P3.4 prop shape
  // (`onCaptureGps`/`onPickCoords`, a hard-`disabled` submit); they were dropped at the P3
  // assembly rather than rewritten, because every assertion in them is already made there.
})

describe('ImportModal', () => {
  const cb = {
    onPdfFilesSelected: vi.fn(),
    onClipboardText: vi.fn(),
    onChoosePaste: vi.fn(),
    onTextChange: vi.fn(),
    onRun: vi.fn(),
    onBack: vi.fn(),
    onRetry: vi.fn(),
    onOpenLocation: vi.fn(),
    onCancel: vi.fn(),
    onReviewImport: vi.fn(), // required since R-4 — the dwell's only exit
  }

  it('routes picker → paste: three cards, then the phone paste header (title + back chevron) and run', () => {
    const onChoosePaste = vi.fn()
    const onBack = vi.fn()
    const onRun = vi.fn()
    const { rerender } = render(<ImportModal stage="picker" text="" activeStage={null} lastRealStage={null} result={null} batch={null} {...cb} onChoosePaste={onChoosePaste} onBack={onBack} onRun={onRun} />)
    expect(screen.getByRole('dialog', { name: 'Import Recovery Request' })).toBeInTheDocument()
    expect(screen.getByText('Pick File')).toBeInTheDocument() // PickerStage mounted
    fireEvent.click(screen.getByText('Paste Text'))
    expect(onChoosePaste).toHaveBeenCalledOnce()
    rerender(<ImportModal stage="paste" text="hi" activeStage={null} lastRealStage={null} result={null} batch={null} {...cb} onChoosePaste={onChoosePaste} onBack={onBack} onRun={onRun} />)
    // The paste step takes the phone's own header title + back chevron (row 72).
    expect(screen.getByRole('dialog', { name: 'Paste Request Text' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to import options' }))
    expect(onBack).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Import with AI'))
    expect(onRun).toHaveBeenCalledOnce()
  })

  it('picker: a PDF selection reaches onPdfFilesSelected through the stage seam', async () => {
    const onPdfFilesSelected = vi.fn()
    const { container } = render(<ImportModal stage="picker" text="" activeStage={null} lastRealStage={null} result={null} batch={null} {...cb} onPdfFilesSelected={onPdfFilesSelected} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF'], 'request.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(onPdfFilesSelected).toHaveBeenCalledWith([file]))
  })

  it('progress stage renders the live terminal (P1.4) with the batch counter in its processing badge', () => {
    render(<ImportModal stage="progress" text="" activeStage="extracting_text" lastRealStage="extracting_text" result={null} batch={{ current: 2, total: 3 }} {...cb} />)
    expect(screen.getByTestId('import-terminal')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-status')).toHaveTextContent('Extracting text from PDF...')
    expect(screen.getByTestId('terminal-processing-badge')).toHaveTextContent('File 2 of 3 ·')
  })

  it('deriveTerminalOutcome mirrors the phone derivation: null → running, all-failed → failure, mixed → partial', () => {
    expect(deriveTerminalOutcome(null)).toBeNull()
    expect(deriveTerminalOutcome({ ok: false, error: 'x' })).toEqual({ status: 'failure' })
    expect(deriveTerminalOutcome({ ok: true, locations: [locView()], failures: [] })).toEqual({
      status: 'success',
      successCount: 1,
      totalFiles: 1,
    })
    expect(
      deriveTerminalOutcome({ ok: true, locations: [locView(), locView({ locId: 'loc-2' })], failures: [{ filename: 'c.pdf', error: 'scanned' }] }),
    ).toEqual({ status: 'partial', successCount: 2, totalFiles: 3 })
  })

  it('single success: renders the detail body + warnings; Open location fires onOpenLocation', () => {
    const onOpenLocation = vi.fn()
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView()], failures: [] }} {...cb} onOpenLocation={onOpenLocation} />,
    )
    expect(screen.getByText('Import complete')).toBeInTheDocument()
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument() // the detail body
    expect(screen.getByText(/1 automatic adjustment/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Open location'))
    expect(onOpenLocation).toHaveBeenCalledWith('loc-1')
  })

  it('batch success: summary + single-open accordions (expanding one reveals its detail)', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    expect(screen.getByText(/Imported 2 of 2/)).toBeInTheDocument()
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument() // collapsed
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
  })

  it('batch accordions are single-open and toggle off (M6)', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getAllByText('Requesting Officer')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Store B/ })) // opens B, A collapses
    expect(screen.getAllByText('Requesting Officer')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: /Store B/ })) // re-click collapses
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument()
  })

  it('resets the open accordion when the result changes (H1)', () => {
    const { rerender } = render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView({ locId: 'a', title: 'Store A' }), locView({ locId: 'b', title: 'Store B' })], failures: [] }} {...cb} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Store A/ }))
    expect(screen.getByText('Requesting Officer')).toBeInTheDocument()
    rerender(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView({ locId: 'c', title: 'Store C' }), locView({ locId: 'd', title: 'Store D' })], failures: [] }} {...cb} />,
    )
    expect(screen.queryByText('Requesting Officer')).not.toBeInTheDocument() // stale index cleared
  })

  it('partial batch: shows the summary and the failure row', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView()], failures: [{ filename: 'scan.pdf', error: 'This PDF looks scanned.' }] }} {...cb} />,
    )
    expect(screen.getByText(/Imported 1 of 2/)).toBeInTheDocument()
    expect(screen.getByText(/scan\.pdf/)).toBeInTheDocument()
  })

  it('renders the degraded notice', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: true, locations: [locView()], failures: [], notice: 'Live model not configured — imported the sample request instead.' }} {...cb} />,
    )
    expect(screen.getByText(/imported the sample request/i)).toBeInTheDocument()
  })

  it('total failure: error view with retry', () => {
    render(<ImportModal stage="result" text="" activeStage={null} lastRealStage={null} result={{ ok: false, error: 'Could not read the request.' }} batch={null} {...cb} />)
    expect(screen.getByText('Could not read the request.')).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('all-failed batch: error summary + per-file failures card (M6)', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: '2 imports failed.', failures: [{ filename: 'a.pdf', error: 'scanned' }, { filename: 'b.pdf', error: 'no JSON' }] }} {...cb} />,
    )
    expect(screen.getByText('2 imports failed.')).toBeInTheDocument()
    expect(screen.getByText(/a\.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/b\.pdf/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  // ---- row 79 enrichment: ERROR_MESSAGES + Technical Details + Data Found ----

  it('a coded failure renders the friendly ERROR_MESSAGES copy, not the raw pipeline string', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'Could not read this PDF.', code: 'PDF_READ_FAILED' }} {...cb} />,
    )
    // Reads type string | undefined since R-8 — pin presence before use.
    const friendly = ERROR_MESSAGES.PDF_READ_FAILED
    expect(friendly).toBeDefined()
    expect(screen.getByText(friendly as string)).toBeInTheDocument()
    expect(screen.queryByText('Could not read this PDF.')).not.toBeInTheDocument()
  })

  it('a code outside the map falls back to the pipeline\'s own honest string (phone §5.7.8 precedent)', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'This PDF looks scanned or image-only — no selectable text was found. Paste the request text instead.', code: 'PDF_SCANNED' }} {...cb} />,
    )
    expect(ERROR_MESSAGES.PDF_SCANNED).toBeUndefined() // deliberately unmapped
    expect(ERROR_MESSAGES.NO_FIELDS_FOUND).toBeUndefined() // deliberately unmapped
    expect(screen.getByText(/This PDF looks scanned or image-only/)).toBeInTheDocument()
  })

  it('Technical Details: collapsed by default, expands to the JSON details, collapses again', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'Could not read this PDF.', code: 'PDF_READ_FAILED', details: { stage: 'extracting_text', detail: 'boom' } }} {...cb} />,
    )
    const toggle = screen.getByRole('button', { name: 'Technical Details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('import-technical-details')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const block = screen.getByTestId('import-technical-details')
    expect(block).toHaveTextContent('"stage": "extracting_text"')
    expect(block).toHaveTextContent('"detail": "boom"')
    fireEvent.click(toggle)
    expect(screen.queryByTestId('import-technical-details')).not.toBeInTheDocument()
  })

  it('Technical Details is absent when the failure carries no details', () => {
    render(<ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'x' }} {...cb} />)
    expect(screen.queryByRole('button', { name: 'Technical Details' })).not.toBeInTheDocument()
  })

  it('Data Found renders the phone-verbatim Case Number label for the recovered OCC#', () => {
    render(
      <ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'x', code: 'NO_FIELDS_FOUND', partialData: { caseNumber: 'PR25-777' } }} {...cb} />,
    )
    const block = screen.getByTestId('import-data-found')
    expect(block).toHaveTextContent('Data Found')
    expect(block).toHaveTextContent('Case Number: PR25-777')
    // R-30: the phone's 'Business:' row is deliberately not ported — structurally
    // unreachable in the demo pipeline (fieldCount === 0 gate counts businessName).
    expect(block).not.toHaveTextContent('Business:')
  })

  it('Data Found is absent without partialData, and when partialData has no values', () => {
    const { rerender } = render(<ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'x' }} {...cb} />)
    expect(screen.queryByTestId('import-data-found')).not.toBeInTheDocument()
    rerender(<ImportModal stage="result" text="" activeStage={null} lastRealStage={null} batch={null} result={{ ok: false, error: 'x', partialData: {} }} {...cb} />)
    expect(screen.queryByTestId('import-data-found')).not.toBeInTheDocument()
  })
})
