import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExportInfoScreen } from '@/features/demo/ui/screens/ExportInfoScreen'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import {
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  EXPORT_MEDIA_OPTIONS,
  FILE_TYPE_OPTIONS,
  MEDIA_PROVIDED_OPTIONS,
  RECORDING_SCHEDULE_OPTIONS,
} from '@/features/demo/engine/content/form-options'
import type { CameraEntry, DvrInformation } from '@/features/demo/engine/types'

// Heavy dropdown-driving suite: under full-suite CPU contention the default 5 s per-test
// budget flakes (review R-6) — same guard as DemoExperience.boundary.test.tsx.
vi.setConfig({ testTimeout: 20_000 })

beforeEach(() => stubClock())
afterEach(() => vi.restoreAllMocks())

// `isFieldVisible` is the P7.3 visibility gate; the forensic default shows everything, which
// is the baseline these option/render tests are about. The gating arms live in
// `field-visibility.test.tsx`.
const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn(), isFieldVisible: () => true }
/** CamerasScreen additionally takes the per-camera GPS callback (P3.7). */
const camNav = { ...nav, onCaptureGps: vi.fn() }

const blankDvr = (): DvrInformation => blankLocationForm().dvr
const camera = (patch: Partial<CameraEntry> = {}): CameraEntry => ({ id: 'c1', cameraName: 'A', resolution: '', recordingFps: '', ...patch })

/** Open the dropdown whose accessible name starts with `trigger` (the name also carries the
 *  current selection since R-10), read the rendered option labels, close it again. */
async function renderedOptions(trigger: RegExp): Promise<string[]> {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: trigger }))
  const labels = screen.getAllByRole('menuitemradio').map((el) => el.textContent ?? '')
  fireEvent.keyDown(document, { key: 'Escape' })
  return labels
}

const labelsOf = (options: readonly { label: string }[]) => options.map((o) => o.label)

// The anti-drift guard for parity gap G5: what the screens actually RENDER must equal the
// engine's canonical lists. A screen that hardcodes (or forgets) an option fails here.
describe('rendered option lists === engine/content/form-options', () => {
  it('DvrInfoScreen renders the canonical Resolution + FPS lists and schedule checkboxes', async () => {
    render(<DvrInfoScreen dvr={blankDvr()} retention={{ totalRetention: null, scopes: [] }} onChange={vi.fn()} {...nav} />)
    expect(await renderedOptions(/^Resolution/)).toEqual(labelsOf(RESOLUTION_OPTIONS))
    expect(await renderedOptions(/^Recording FPS/)).toEqual(labelsOf(FPS_OPTIONS))
    const checkboxes = screen.getAllByRole('checkbox').map((el) => el.textContent ?? '')
    expect(checkboxes).toEqual([...RECORDING_SCHEDULE_OPTIONS])
  })

  it('CamerasScreen renders the canonical Resolution + FPS lists', async () => {
    render(<CamerasScreen cameras={[camera()]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    expect(await renderedOptions(/^Resolution/)).toEqual(labelsOf(RESOLUTION_OPTIONS))
    expect(await renderedOptions(/^FPS/)).toEqual(labelsOf(FPS_OPTIONS))
  })

  it('ExportInfoScreen renders the canonical Export Media / File Type / Provided Via lists', async () => {
    render(<ExportInfoScreen data={blankLocationForm().export} onChange={vi.fn()} onToggleMediaPlayer={vi.fn()} {...nav} />)
    expect(await renderedOptions(/^Export Media/)).toEqual(labelsOf(EXPORT_MEDIA_OPTIONS))
    expect(await renderedOptions(/^File Type/)).toEqual(labelsOf(FILE_TYPE_OPTIONS))
    expect(await renderedOptions(/^Provided Via/)).toEqual(labelsOf(MEDIA_PROVIDED_OPTIONS))
  })
})

describe('DVR Information custom Resolution/FPS path (phone dvr-information.tsx:124-142)', () => {
  it('selecting Other (Custom) reveals the free-text input WITHOUT writing to the store', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DvrInfoScreen dvr={blankDvr()} retention={{ totalRetention: null, scopes: [] }} onChange={onChange} {...nav} />)
    expect(screen.queryByLabelText('Custom Resolution')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(screen.getByLabelText('Custom Resolution')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled() // phone parity: stored value left untouched
  })

  it('typing into the custom input stores the free text', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DvrInfoScreen dvr={blankDvr()} retention={{ totalRetention: null, scopes: [] }} onChange={onChange} {...nav} />)
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    fireEvent.change(screen.getByLabelText('Custom Resolution'), { target: { value: '1440x900' } })
    expect(onChange).toHaveBeenCalledWith('resolution', '1440x900')
  })

  it('a stored free-text value reopens in custom mode with the pill on Other (Custom)', () => {
    render(<DvrInfoScreen dvr={{ ...blankDvr(), resolution: '1440x900', recordingFps: '12' }} retention={{ totalRetention: null, scopes: [] }} onChange={vi.fn()} {...nav} />)
    expect(screen.getByLabelText('Custom Resolution')).toHaveValue('1440x900')
    expect(screen.getByLabelText('Custom FPS')).toHaveValue('12')
    expect(screen.getAllByText('Other (Custom)')).toHaveLength(2) // both pills
  })

  it('switching back to a standard value writes it and hides the custom input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<DvrInfoScreen dvr={{ ...blankDvr(), recordingFps: '12' }} retention={{ totalRetention: null, scopes: [] }} onChange={onChange} {...nav} />)
    expect(screen.getByLabelText('Custom FPS')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Recording FPS/ }))
    await user.click(screen.getByRole('menuitemradio', { name: '30 FPS' }))
    expect(onChange).toHaveBeenCalledWith('recordingFps', '30')
    expect(screen.queryByLabelText('Custom FPS')).not.toBeInTheDocument()
  })

  it('an empty value is NOT custom mode — it renders the placeholder (PF-14)', () => {
    render(<DvrInfoScreen dvr={blankDvr()} retention={{ totalRetention: null, scopes: [] }} onChange={vi.fn()} {...nav} />)
    expect(screen.queryByLabelText('Custom Resolution')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Custom FPS')).not.toBeInTheDocument()
  })
})

describe('Cameras custom Resolution/FPS path (phone cameras.tsx:43-61)', () => {
  it('selecting Other (Custom) CLEARS that camera\'s stored value and reveals the input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CamerasScreen cameras={[camera({ resolution: '1920x1080' })]} onChange={onChange} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(onChange).toHaveBeenCalledWith(0, { resolution: '' }) // phone parity: cameras clear on switch
    expect(screen.getByLabelText('Custom Resolution')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Custom Resolution'), { target: { value: '1440x900' } })
    expect(onChange).toHaveBeenCalledWith(0, { resolution: '1440x900' })
  })

  it('custom mode is per-camera: only the toggled row shows the input', async () => {
    const user = userEvent.setup()
    render(
      <CamerasScreen
        cameras={[camera(), camera({ id: 'c2', cameraName: 'B' })]}
        onChange={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        {...camNav}
      />,
    )
    await user.click(screen.getAllByRole('button', { name: /^FPS/ })[1])
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(screen.getAllByLabelText('Custom FPS')).toHaveLength(1)
    expect(screen.queryByLabelText('Custom Resolution')).not.toBeInTheDocument()
  })

  it('switching back to a standard value writes it and hides the input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<CamerasScreen cameras={[camera()]} onChange={onChange} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(screen.getByLabelText('Custom Resolution')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Resolution/ }))
    await user.click(screen.getByRole('menuitemradio', { name: '704x480 (4CIF)' }))
    expect(onChange).toHaveBeenCalledWith(0, { resolution: '704x480' })
    expect(screen.queryByLabelText('Custom Resolution')).not.toBeInTheDocument()
  })

  // R-2: the custom-mode flags key on CameraEntry.id, so a removal that re-indexes the
  // list can neither strip custom mode off the surviving camera (destroying its typed
  // value on the next custom tap) nor transfer it to an innocent neighbour.
  it('R-2: custom mode survives another camera\'s removal (the data-destroying direction)', async () => {
    const user = userEvent.setup()
    const a = camera({ id: 'cA', cameraName: 'A', resolution: '1920x1080' })
    const b = camera({ id: 'cB', cameraName: 'B' })
    const { rerender } = render(<CamerasScreen cameras={[a, b]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    // put camera B (row index 1) into custom mode…
    await user.click(screen.getAllByRole('button', { name: /^Resolution/ })[1])
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    expect(screen.getByLabelText('Custom Resolution')).toBeInTheDocument()
    // …the visitor types a value and removes camera A → B re-indexes from 1 to 0
    rerender(<CamerasScreen cameras={[{ ...b, resolution: '1440x900' }]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    // B keeps its editable custom field and typed value (index-keyed flags lost it here)
    expect(screen.getByLabelText('Custom Resolution')).toHaveValue('1440x900')
  })

  it('R-2: removing the custom camera does not transfer custom mode to the survivor', async () => {
    const user = userEvent.setup()
    const a = camera({ id: 'cA', cameraName: 'A' })
    const b = camera({ id: 'cB', cameraName: 'B', resolution: '1920x1080' })
    const { rerender } = render(<CamerasScreen cameras={[a, b]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    // camera A (row index 0) goes custom, then A is removed → B re-indexes from 1 to 0
    await user.click(screen.getAllByRole('button', { name: /^Resolution/ })[0])
    await user.click(screen.getByRole('menuitemradio', { name: 'Other (Custom)' }))
    rerender(<CamerasScreen cameras={[b]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...camNav} />)
    // B stays a standard row (index-keyed flags rendered it spuriously custom here)
    expect(screen.queryByLabelText('Custom Resolution')).not.toBeInTheDocument()
    expect(screen.getByText('1920x1080 (1080p)')).toBeInTheDocument()
  })

  it('R-2: stored free-text values seed custom mode on mount (matches DvrInfoScreen)', () => {
    render(
      <CamerasScreen
        cameras={[camera({ resolution: '1440x900', recordingFps: '12' })]}
        onChange={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        {...camNav}
      />,
    )
    expect(screen.getByLabelText('Custom Resolution')).toHaveValue('1440x900')
    expect(screen.getByLabelText('Custom FPS')).toHaveValue('12')
  })
})

describe('Export Information "Other" (phone export-information.tsx:52-103 — NO free-text path)', () => {
  it('selecting Other stores the literal value and reveals no input', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <ExportInfoScreen data={blankLocationForm().export} onChange={onChange} onToggleMediaPlayer={vi.fn()} {...nav} />,
    )
    const inputsBefore = container.querySelectorAll('input').length
    await user.click(screen.getByRole('button', { name: /^Export Media/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Other' }))
    expect(onChange).toHaveBeenCalledWith('exportMedia', 'Other')
    expect(container.querySelectorAll('input')).toHaveLength(inputsBefore)
  })
})
