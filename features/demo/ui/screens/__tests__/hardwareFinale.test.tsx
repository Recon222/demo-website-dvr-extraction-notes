import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExportInfoScreen } from '@/features/demo/ui/screens/ExportInfoScreen'
import { NotesScreen } from '@/features/demo/ui/screens/NotesScreen'
import { CompletionScreen } from '@/features/demo/ui/screens/CompletionScreen'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'

// `isFieldVisible` is the P7.3 visibility gate; the forensic default shows everything, which
// is the baseline these option/render tests are about. The gating arms live in
// `field-visibility.test.tsx`.
const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn(), isFieldVisible: () => true }
/** CamerasScreen additionally takes the per-camera GPS callback (P3.7). */
const camNav = { ...nav, onCaptureGps: vi.fn() }
const form = blankLocationForm()

describe('DvrInfoScreen', () => {
  it('edits a DVR field', () => {
    const onChange = vi.fn()
    render(<DvrInfoScreen dvr={form.dvr} retention={{ totalRetention: null, scopes: [] }} onChange={onChange} {...nav} />)
    fireEvent.change(screen.getByLabelText('DVR Type / Brand'), { target: { value: 'Hikvision' } })
    expect(onChange).toHaveBeenCalledWith('dvrTypeBrand', 'Hikvision')
  })
})

describe('CamerasScreen', () => {
  it('renders the empty state and adds a camera', () => {
    const onAdd = vi.fn()
    render(<CamerasScreen cameras={[]} onChange={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} {...camNav} />)
    expect(screen.getByText(/No cameras yet/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('+ Add Camera'))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('removes the right camera by index', () => {
    const onRemove = vi.fn()
    const cameras = [
      { id: 'c1', cameraName: 'A', resolution: '', recordingFps: '' },
      { id: 'c2', cameraName: 'B', resolution: '', recordingFps: '' },
    ]
    render(<CamerasScreen cameras={cameras} onChange={vi.fn()} onAdd={vi.fn()} onRemove={onRemove} {...camNav} />)
    fireEvent.click(screen.getAllByText('Remove')[1])
    expect(onRemove).toHaveBeenCalledWith(1)
  })
})

describe('ExportInfoScreen', () => {
  it('toggles media player included', () => {
    const onToggle = vi.fn()
    render(<ExportInfoScreen data={form.export} onChange={vi.fn()} onToggleMediaPlayer={onToggle} {...nav} />)
    fireEvent.click(screen.getByText('Media player included'))
    expect(onToggle).toHaveBeenCalledOnce()
  })
})

describe('NotesScreen (smoke — full behavioral suite in NotesScreen.test.tsx)', () => {
  it('renders a section paragraph and commits an edit on blur', () => {
    const onCommitSection = vi.fn()
    render(
      <NotesScreen
        sections={[
          {
            id: 'address',
            label: 'address & visits',
            content: '• Attended Shop to recover requested video evidence.',
            manuallyEdited: false,
            stale: false,
            freshContent: '• Attended Shop to recover requested video evidence.',
          },
        ]}
        freeText=""
        copyAllText=""
        onCommitSection={onCommitSection}
        onCommitAddendum={vi.fn()}
        onResetSection={vi.fn()}
        onScrapAll={vi.fn()}
        onRestoreAll={vi.fn()}
        onCommitFreeText={vi.fn()}
        {...nav}
      />,
    )
    const body = screen.getByLabelText('address & visits')
    fireEvent.change(body, { target: { value: 'my own account' } })
    fireEvent.blur(body)
    expect(onCommitSection).toHaveBeenCalledWith('address', 'my own account')
  })
})

describe('CompletionScreen', () => {
  const summary = { occNumber: 'PR25-0098213', location: "Kim's Convenience", dvr: 'Hikvision DS-7608', offset: '00:05:30 AHEAD OF', scopes: 1, cameras: 0, export: 'USB Drive' }

  it('shows the summary + completion fields and fires preview/complete', () => {
    const onPreviewPdf = vi.fn()
    const onComplete = vi.fn()
    const onChange = vi.fn()
    render(<CompletionScreen summary={summary} validationErrors={[]} isComplete={false} canComplete dateTimeCompleted="" completedBy="" onChange={onChange} onPreviewPdf={onPreviewPdf} onPreviewTimeOffsetPdf={vi.fn()} onExportZip={vi.fn()} canExport isExporting={false} onComplete={onComplete} onReviewAgain={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText(/PR25-0098213/)).toBeInTheDocument()
    expect(screen.getByText('00:05:30 AHEAD OF')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: 'Det. X' } })
    expect(onChange).toHaveBeenCalledWith('completedBy', 'Det. X')
    fireEvent.click(screen.getByText('Preview / Export PDF'))
    expect(onPreviewPdf).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('shows the location-complete state with a way back to the review form (R-1)', () => {
    const onReviewAgain = vi.fn()
    render(<CompletionScreen summary={summary} validationErrors={[]} isComplete canComplete dateTimeCompleted="" completedBy="" onChange={vi.fn()} onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onExportZip={vi.fn()} canExport isExporting={false} onComplete={vi.fn()} onReviewAgain={onReviewAgain} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Review / Export again'))
    expect(onReviewAgain).toHaveBeenCalledOnce()
  })

  it('renders the phone’s Required Fields Missing card, one `- rule` line each (P2.4/G9)', () => {
    render(<CompletionScreen summary={summary} validationErrors={['OCC number is required', 'Address is required']} isComplete={false} canComplete dateTimeCompleted="" completedBy="" onChange={vi.fn()} onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onExportZip={vi.fn()} canExport isExporting={false} onComplete={vi.fn()} onReviewAgain={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('Required Fields Missing')
    expect(card).toHaveTextContent('- OCC number is required')
    expect(card).toHaveTextContent('- Address is required')
  })

  it('never shows the card on the completed confirmation — nothing left to fix there', () => {
    render(<CompletionScreen summary={summary} validationErrors={['OCC number is required']} isComplete canComplete dateTimeCompleted="" completedBy="" onChange={vi.fn()} onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onExportZip={vi.fn()} canExport isExporting={false} onComplete={vi.fn()} onReviewAgain={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText('Location Complete')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('disables Complete & Save when no location is open (R-1: no silent no-op)', () => {
    const onComplete = vi.fn()
    render(<CompletionScreen summary={summary} validationErrors={[]} isComplete={false} canComplete={false} dateTimeCompleted="" completedBy="" onChange={vi.fn()} onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onExportZip={vi.fn()} canExport isExporting={false} onComplete={onComplete} onReviewAgain={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    const btn = screen.getByRole('button', { name: 'Complete & Save' })
    // D10 / review F39: this CTA is `aria-disabled`, not `disabled` — a `disabled` attribute
    // drops the control out of the tab order, so a keyboard visitor cannot reach it to hear
    // why it is unavailable. `toBeDisabled()` reads the ATTRIBUTE only, so both halves are
    // asserted here: the announced state, and the refusal (`aria-disabled` is advisory — the
    // handler has to decline for itself, which is the half `disabled` used to give for free).
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(btn)
    expect(onComplete).not.toHaveBeenCalled()
  })
})

describe('PdfPreview', () => {
  it('renders the document HTML in an iframe and closes', () => {
    const onClose = vi.fn()
    render(<PdfPreview title="Case Notes — PDF" html="<!DOCTYPE html><html><body><p>doc</p></body></html>" onClose={onClose} />)
    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sandboxes the preview iframe (defense-in-depth: print-only tokens, never allow-scripts)', () => {
    render(<PdfPreview title="Doc" html="<!DOCTYPE html><html><body><p>x</p></body></html>" onClose={vi.fn()} />)
    // Pinned exactly (see the PdfPreview suite for the per-token rationale).
    expect(screen.getByTitle('Doc')).toHaveAttribute('sandbox', 'allow-modals allow-same-origin')
  })
})
