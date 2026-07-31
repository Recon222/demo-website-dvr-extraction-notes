import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { TimeOffsetScreen, type TimeOffsetScreenProps } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { clock } from '@/features/demo/ui/inputs/clock'

const base: TimeOffsetScreenProps = {
  dvrDateTime: '2026-06-01 12:05:30',
  actualDateTime: '2026-06-01 12:00:00',
  onChangeDvr: vi.fn(),
  onChangeActual: vi.fn(),
  onUseCurrentTime: vi.fn(),
  onCalculate: vi.fn(),
  onCaptureOcr: vi.fn(),
  sync: null,
  syncing: false,
  result: { diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false },
  correctedScopes: [],
  dvrAppliesDST: false,
  onToggleDst: vi.fn(),
  dstAdvisory: null,
  hasExtractedScopes: false,
  onNext: vi.fn(),
  onBack: vi.fn(),
  onMenu: vi.fn(),
}

const ADVISORY =
  "Your requested dates fall on either side of a DST change. Consider enabling 'DVR Applies DST' if the DVR adjusts for Daylight Saving Time."

describe('TimeOffsetScreen — DST advisory surface', () => {
  it('renders the advisory message when one applies', () => {
    render(<TimeOffsetScreen {...base} dstAdvisory={ADVISORY} />)
    expect(screen.getByText(ADVISORY)).toBeInTheDocument()
  })

  it('renders nothing when no scenario applies', () => {
    render(<TimeOffsetScreen {...base} dstAdvisory={null} />)
    expect(screen.queryByText(/DST change/)).toBeNull()
    expect(screen.queryByText(/DST does not affect/)).toBeNull()
  })

  it('keeps the advisory (and the toggle hint) inside the calculated-result block', () => {
    render(<TimeOffsetScreen {...base} result={null} dstAdvisory={ADVISORY} />)
    expect(screen.queryByText(ADVISORY)).toBeNull()
    expect(screen.queryByText('Enable if the DVR clock adjusts for Daylight Saving Time')).toBeNull()
  })

  it('shows the phone’s DVR-Applies-DST hint line under the toggle', () => {
    render(<TimeOffsetScreen {...base} />)
    expect(screen.getByText('Enable if the DVR clock adjusts for Daylight Saving Time')).toBeInTheDocument()
  })
})

describe('TimeOffsetScreen — adjusted-range domain labels', () => {
  // Phone parity: REQUESTED and ADJUSTED carry INVERSE domain labels
  // (`app/(form)/time-offset.tsx:556` vs `:578`; spec `docs/ui-mapping/06-wizard-b-time.md:69-70`).
  const row = (o: Partial<TimeOffsetScreenProps['correctedScopes'][number]>) => ({
    id: 'a',
    reqLabel: 'real time',
    adjLabel: 'DVR time',
    reqStart: '2025-03-08 23:47:30',
    reqEnd: '2025-03-09 01:32:30',
    adjStart: '2025-03-08 23:53:00',
    adjEnd: '2025-03-09 01:38:00',
    cameras: '',
    ...o,
  })

  it('labels a real-time request "Adjusted (DVR time)"', () => {
    render(<TimeOffsetScreen {...base} correctedScopes={[row({})]} />)
    expect(screen.getByText('Requested (real time)')).toBeInTheDocument()
    expect(screen.getByText('Adjusted (DVR time)')).toBeInTheDocument()
  })

  it('labels a DVR-time request "Adjusted (real time)" — not hardcoded to DVR', () => {
    render(<TimeOffsetScreen {...base} correctedScopes={[row({ reqLabel: 'DVR time', adjLabel: 'real time' })]} />)
    expect(screen.getByText('Requested (DVR time)')).toBeInTheDocument()
    expect(screen.getByText('Adjusted (real time)')).toBeInTheDocument()
    expect(screen.queryByText('Adjusted (DVR time)')).toBeNull()
  })
})

describe('TimeOffsetScreen — recalculate guard', () => {
  it('calculates straight through when there is nothing to overwrite', () => {
    const onCalculate = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} hasExtractedScopes={false} />)
    fireEvent.click(screen.getByText('Calculate'))
    expect(onCalculate).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('asks first when extracted scopes exist, with the phone’s copy', () => {
    const onCalculate = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} hasExtractedScopes />)
    fireEvent.click(screen.getByText('Calculate'))
    expect(onCalculate).not.toHaveBeenCalled()
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Recalculate Time Offset?')
    expect(dialog).toHaveTextContent(
      'This will reset your extracted video scopes. Any manual edits to the extracted times will be lost.',
    )
  })

  it('Continue proceeds and closes', () => {
    const onCalculate = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} hasExtractedScopes />)
    fireEvent.click(screen.getByText('Calculate'))
    fireEvent.click(screen.getByText('Continue'))
    expect(onCalculate).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('Cancel aborts the recalculation', () => {
    const onCalculate = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} hasExtractedScopes />)
    fireEvent.click(screen.getByText('Calculate'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCalculate).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('Escape cancels; the scrim deliberately does not', () => {
    const onCalculate = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} hasExtractedScopes />)

    fireEvent.click(screen.getByText('Calculate'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('alertdialog')).toBeNull()

    // AlertDialog's scrim is inert by design (a native alert is answered by choosing a
    // button) — clicking it must NOT let a visitor skip the decision the phone forces.
    fireEvent.click(screen.getByText('Calculate'))
    fireEvent.click(document.querySelector('[data-alert-scrim]') as HTMLElement)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    expect(onCalculate).not.toHaveBeenCalled()
  })
})

describe('DemoExperience — DST advisory wiring', () => {
  beforeEach(() => window.sessionStorage.clear())

  /** Seed a case + location with one real-time scope, then land on the Time Offset screen. */
  function bootAtTimeOffset(scope: { startDateTime: string; endDateTime: string }) {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const st = store.getState()
      const caseId = st.createCase({ caseNumber: 'PR26-DST', displayName: 'DST', unit: 'Robbery' })
      const locId = st.addLocation(caseId, { locationName: 'Rear Door' })
      store.getState().updateField('form.scopes', [
        { id: 's1', startDateTime: scope.startDateTime, endDateTime: scope.endDateTime, isActualTime: true, cameras: '1' },
      ])
      store.getState().updateField('capture.dvrDateTime', '2026-03-08 12:05:30')
      store.getState().updateField('capture.actualDateTime', '2026-03-08 12:00:00')
      store.getState().setView('timeOffset')
      return locId
    })
    return store
  }

  it('surfaces the straddle advisory once an offset has been calculated', { timeout: 20000 }, () => {
    // Mid-January "today" so scenario B (today across the DST line) is the branch under test —
    // this is the only wall-clock input the advisory reads, and it comes through the UI seam.
    vi.spyOn(clock, 'now').mockReturnValue(new Date(2026, 0, 15, 12))
    const store = bootAtTimeOffset({ startDateTime: '2026-06-01 09:00:00', endDateTime: '2026-06-01 17:00:00' })

    // Nothing before Calculate — the advisory lives inside the result block.
    expect(screen.queryByText(/either side of the DST change/)).toBeNull()
    act(() => {
      store.getState().calculateOffset()
    })

    const advisory = screen.queryByText(/either side of the DST change/)
    // A runner in a zone with no DST cannot produce the branch; assert the honest alternative
    // (no advisory) rather than skipping, so the wiring is still exercised end to end.
    const zoneHasDst = new Date(2026, 0, 15).getTimezoneOffset() !== new Date(2026, 6, 15).getTimezoneOffset()
    if (zoneHasDst) expect(advisory).toBeInTheDocument()
    else expect(advisory).toBeNull()
    vi.restoreAllMocks()
  })

  it('guards Calculate once extracted scopes exist', { timeout: 20000 }, () => {
    const store = bootAtTimeOffset({ startDateTime: '2026-06-01 09:00:00', endDateTime: '2026-06-01 17:00:00' })
    act(() => {
      store.getState().calculateOffset()
      store.getState().generateExtractedScopes()
    })
    expect(store.getState().locations[0].form.extractedScopes.length).toBe(1)

    fireEvent.click(screen.getByText('Calculate'))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Recalculate Time Offset?')
  })
})
