import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    fireEvent.click(document.querySelector('[data-dialog-scrim]') as HTMLElement)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    expect(onCalculate).not.toHaveBeenCalled()
  })
})

/**
 * North-American DST rule for the years these tests use, injected through the bridge's host-time
 * seam (review R-9). Without it the only end-to-end pin of the advisory wiring depended on the
 * runner's timezone and went vacuous on a UTC runner — deleting the `dstAdvisory` prop kept CI
 * green. The engine's own branch tests use the same technique (`dst-advisory.test.ts`).
 */
const US_DST: Record<number, { start: string; end: string }> = {
  2026: { start: '2026-03-08', end: '2026-11-01' },
}
const usIsDst = (dateTime: string): boolean => {
  const date = dateTime.slice(0, 10)
  const table = US_DST[Number(date.slice(0, 4))]
  if (!table) throw new Error(`test fake has no DST table for ${date}`)
  return date >= table.start && date < table.end
}

describe('DemoExperience — DST advisory wiring', () => {
  beforeEach(() => window.sessionStorage.clear())
  // Restore the host-time spies in a hook, not at the end of a test body (review R-19): an
  // inline restore is unreachable when an assertion above it throws, which leaks a stubbed
  // clock/zone into every later test in the file — order-dependence that bites exactly when
  // the run is already red.
  afterEach(() => vi.restoreAllMocks())

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
    // Mid-January "today" against a June scope: scenario B (today across the DST line). Both
    // host-time inputs are stubbed, so this asserts UNCONDITIONALLY in any runner timezone.
    vi.spyOn(clock, 'now').mockReturnValue(new Date(2026, 0, 15, 12))
    vi.spyOn(clock, 'isDst').mockImplementation(usIsDst)
    const store = bootAtTimeOffset({ startDateTime: '2026-06-01 09:00:00', endDateTime: '2026-06-01 17:00:00' })

    // Nothing before Calculate — the advisory lives inside the result block.
    expect(screen.queryByText(/either side of the DST change/)).toBeNull()
    act(() => {
      store.getState().calculateOffset()
    })
    expect(screen.getByText(/either side of the DST change/)).toBeInTheDocument()
  })

  it('stays silent when today sits on the same side of the change as the scope', { timeout: 20000 }, () => {
    // The negative control: same wiring, same seam, only "today" moves. Without it the pin above
    // could pass on a screen that renders the advisory unconditionally.
    vi.spyOn(clock, 'now').mockReturnValue(new Date(2026, 6, 15, 12))
    vi.spyOn(clock, 'isDst').mockImplementation(usIsDst)
    const store = bootAtTimeOffset({ startDateTime: '2026-06-01 09:00:00', endDateTime: '2026-06-01 17:00:00' })
    act(() => {
      store.getState().calculateOffset()
    })
    expect(screen.queryByText(/either side of the DST change/)).toBeNull()
  })

  it('recomputes only when the advisory’s own inputs change', { timeout: 20000 }, () => {
    // R-14: scenario A scans the year for the zone's transition dates (~23 `isDst` probes) and
    // the bridge re-renders on every store write, so the derivation is memoised. Counting seam
    // calls pins that — a plain render-body call would fire on the unrelated write below.
    vi.spyOn(clock, 'now').mockReturnValue(new Date(2026, 0, 15, 12))
    const isDst = vi.spyOn(clock, 'isDst').mockImplementation(usIsDst)
    const store = bootAtTimeOffset({ startDateTime: '2026-06-01 09:00:00', endDateTime: '2026-06-01 17:00:00' })
    act(() => {
      store.getState().calculateOffset()
    })
    expect(screen.getByText(/either side of the DST change/)).toBeInTheDocument()

    // An unrelated field: re-renders the bridge, touches none of the advisory's inputs.
    isDst.mockClear()
    act(() => {
      store.getState().updateField('businessName', "Kim's Convenience")
    })
    expect(isDst).not.toHaveBeenCalled()

    // The DVR-Applies-DST toggle IS an input — the advisory must follow it.
    act(() => {
      store.getState().updateField('capture.dvrAppliesDST', true)
    })
    expect(isDst).toHaveBeenCalled()
    expect(screen.getByText(/DST does not affect the dates you selected/)).toBeInTheDocument()
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
