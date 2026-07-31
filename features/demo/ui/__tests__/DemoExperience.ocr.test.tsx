import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'

/**
 * The OCR confirm bridge (parity rows 38/39). The confirmation step is where an OCR read stops
 * being a machine's opinion and becomes evidence, so what gets committed — and what gets
 * committed when the operator disagrees with the read — is the thing worth pinning.
 *
 * The picker clock is stubbed at 2026-07-31 so the "today" the assumed-date path falls back to,
 * and the proximity window the disambiguation resolver uses, are both deterministic.
 */
const NOW = () => new Date(2026, 6, 31, 12, 0, 0)

function openOcr(): DemoStore {
  const store = createDemoStore()
  render(<DemoExperience store={store} />)
  act(() => {
    const c = store.getState().createCase({ caseNumber: 'PR26-OCR', displayName: 'X', unit: 'Robbery' })
    store.getState().addLocation(c, { locationName: 'Rear Door' })
    store.getState().launch('ocr')
  })
  return store
}

beforeEach(() => stubClock(NOW))
afterEach(() => vi.restoreAllMocks())

describe('DemoExperience — OCR confirmation', { timeout: 20000 }, () => {
  it('commits the read when the operator accepts it, and calculates the offset', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Use this & calculate'))

    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(store.getState().capture.method).toBe('ocr')
    const loc = store.getState().locations[0]
    expect(loc.form.timeOffset?.dvrDateTime).toBe('2025-03-08 12:05:30')
    expect(loc.form.timeOffset?.formattedDifference).toBe('00:05:30')
  })

  it('commits the CORRECTED value, not the read, when the operator edits it', async () => {
    const user = userEvent.setup()
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))

    // Correct the date: Mar 8 → Mar 15 (the picker preserves the time).
    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.getByText('Manually edited')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-15 12:05:30')
    // …while the OCR proof still records what the machine actually read.
    expect(store.getState().capture.ocr?.parsedDateTime).toBe('2025-03-08 12:05:30')
    expect(store.getState().capture.ocr?.rawText).toBe('2025-03-08 12:05:30')
  })

  it('writes nothing to the store until the operator commits', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(screen.getByText('Use this & calculate')).toBeInTheDocument()
    expect(store.getState().capture.dvrDateTime).toBe('')
    expect(store.getState().capture.method).toBe('manual')
  })

  it('a read that is abandoned (Retake → Cancel) leaves the capture untouched', () => {
    // The confirm stage's exits are Retake and commit; Cancel lives on the aim stage.
    const store = openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Retake'))
    fireEvent.click(screen.getByText('Cancel'))

    expect(store.getState().capture.dvrDateTime).toBe('')
    expect(store.getState().capture.ocr).toBeNull()
    expect(store.getState().view).not.toBe('ocr')
  })

  it('Retake drops the read and returns to the aim stage', () => {
    openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    fireEvent.click(screen.getByText('Retake'))

    expect(screen.getByText('AIM AT THE DVR CLOCK')).toBeInTheDocument()
    expect(screen.queryByText('Use this & calculate')).not.toBeInTheDocument()
  })

  it('the shutter runs the same clean sample frame as the sample button', () => {
    const store = openOcr()
    fireEvent.click(screen.getByLabelText('Capture'))
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2025-03-08 12:05:30')
  })

  it('warns on an ambiguous date and commits the resolver’s choice', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Ambiguous date'))

    expect(screen.getByText('Date Format Ambiguity Detected')).toBeInTheDocument()
    expect(screen.getByText(/Jun 7, 2024 \(MM-DD\)/)).toBeInTheDocument()
    expect(screen.getByText('Jul 6, 2024')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2024-06-07 23:45:30')
  })

  it('no warning on the unambiguous sample frame', () => {
    openOcr()
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(screen.queryByText('Date Format Ambiguity Detected')).not.toBeInTheDocument()
  })

  it('holds a dateless read until the assumed date is confirmed, then commits it', () => {
    const store = openOcr()
    fireEvent.click(screen.getByText('Time only'))

    expect(screen.getByText('No date on the DVR display')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('')

    fireEvent.click(screen.getByText('The date is correct'))
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2026-07-31 12:05:30')
  })

  it('a dateless read can be committed by correcting the date instead of confirming it', async () => {
    const user = userEvent.setup()
    const store = openOcr()
    fireEvent.click(screen.getByText('Time only'))

    await user.click(screen.getByRole('button', { name: 'Set date' }))
    await user.click(screen.getByRole('button', { name: '15' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))

    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(store.getState().capture.dvrDateTime).toBe('2026-07-15 12:05:30')
  })
})
