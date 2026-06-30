import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExportInfoScreen } from '@/features/demo/ui/screens/ExportInfoScreen'
import { NotesScreen } from '@/features/demo/ui/screens/NotesScreen'
import { CompletionScreen } from '@/features/demo/ui/screens/CompletionScreen'
import { PdfPreview } from '@/features/demo/ui/chrome/PdfPreview'

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }
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
    render(<CamerasScreen cameras={[]} onChange={vi.fn()} onAdd={onAdd} onRemove={vi.fn()} {...nav} />)
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
    render(<CamerasScreen cameras={cameras} onChange={vi.fn()} onAdd={vi.fn()} onRemove={onRemove} {...nav} />)
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

describe('NotesScreen', () => {
  it('regenerates the notes', () => {
    const onRegenerate = vi.fn()
    render(<NotesScreen notes="case notes" onChange={vi.fn()} onRegenerate={onRegenerate} {...nav} />)
    fireEvent.click(screen.getByText('Regenerate'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })
})

describe('CompletionScreen', () => {
  const summary = { occNumber: 'PR25-0098213', location: "Kim's Convenience", dvr: 'Hikvision DS-7608', offset: '00:05:30 AHEAD OF', scopes: 1, cameras: 0, export: 'USB Drive' }

  it('shows the summary + completion fields and fires preview/complete', () => {
    const onPreviewPdf = vi.fn()
    const onComplete = vi.fn()
    const onChange = vi.fn()
    render(<CompletionScreen summary={summary} isComplete={false} dateTimeCompleted="" completedBy="" onChange={onChange} onPreviewPdf={onPreviewPdf} onPreviewTimeOffsetPdf={vi.fn()} onComplete={onComplete} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText(/PR25-0098213/)).toBeInTheDocument()
    expect(screen.getByText('00:05:30 AHEAD OF')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Completed By'), { target: { value: 'Det. X' } })
    expect(onChange).toHaveBeenCalledWith('completedBy', 'Det. X')
    fireEvent.click(screen.getByText('Preview / Export PDF'))
    expect(onPreviewPdf).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('shows the case-complete state', () => {
    render(<CompletionScreen summary={summary} isComplete dateTimeCompleted="" completedBy="" onChange={vi.fn()} onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onComplete={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText('Case Complete')).toBeInTheDocument()
  })
})

describe('PdfPreview', () => {
  it('renders the document HTML in an iframe and closes', () => {
    const onClose = vi.fn()
    render(<PdfPreview title="Case Notes — PDF" html="<!DOCTYPE html><html><body><p>doc</p></body></html>" onClose={onClose} onSave={vi.fn()} />)
    expect(screen.getByTitle('Case Notes — PDF')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sandboxes the preview iframe (defense-in-depth)', () => {
    render(<PdfPreview title="Doc" html="<!DOCTYPE html><html><body><p>x</p></body></html>" onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.getByTitle('Doc')).toHaveAttribute('sandbox', '')
  })
})
