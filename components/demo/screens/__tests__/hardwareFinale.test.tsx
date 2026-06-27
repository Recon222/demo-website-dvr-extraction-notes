import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { blankLocationForm } from '@/lib/demo/content/seed'
import { DvrInfoScreen } from '@/components/demo/screens/DvrInfoScreen'
import { CamerasScreen } from '@/components/demo/screens/CamerasScreen'
import { ExportInfoScreen } from '@/components/demo/screens/ExportInfoScreen'
import { NotesScreen } from '@/components/demo/screens/NotesScreen'
import { CompletionScreen } from '@/components/demo/screens/CompletionScreen'
import { PdfPreview } from '@/components/demo/chrome/PdfPreview'

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }
const form = blankLocationForm()

describe('DvrInfoScreen', () => {
  it('edits a DVR field', () => {
    const onChange = vi.fn()
    render(<DvrInfoScreen dvr={form.dvr} onChange={onChange} {...nav} />)
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

  it('shows the summary and fires preview/complete', () => {
    const onPreviewPdf = vi.fn()
    const onComplete = vi.fn()
    render(<CompletionScreen summary={summary} isComplete={false} onPreviewPdf={onPreviewPdf} onPreviewTimeOffsetPdf={vi.fn()} onComplete={onComplete} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
    expect(screen.getByText(/PR25-0098213/)).toBeInTheDocument()
    expect(screen.getByText('00:05:30 AHEAD OF')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Preview / Export PDF'))
    expect(onPreviewPdf).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Complete & Save'))
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('shows the case-complete state', () => {
    render(<CompletionScreen summary={summary} isComplete onPreviewPdf={vi.fn()} onPreviewTimeOffsetPdf={vi.fn()} onComplete={vi.fn()} onBackToDashboard={vi.fn()} onBackToCases={vi.fn()} {...nav} />)
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
})
