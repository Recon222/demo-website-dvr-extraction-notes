import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { TimeOffsetScreen, type TimeOffsetScreenProps } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore } from '@/features/demo/engine/store/create-store'
import { clock } from '@/features/demo/ui/inputs/clock'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone } from '@/features/demo/ui/tokens/status'

/** What jsdom stores for a colour written into a declaration (it re-spaces and hex->rgb). */
function jsdomColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.color = value
  return probe.style.color
}

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

  /**
   * A71 / D19 — the hand-back `banner.test.tsx` held for this package. The phone did the same
   * move in `4853f9d9`, whose subject IS the ruling: *"route the DST callout through Banner and
   * stop signalling with colour alone."*
   *
   * Both halves are asserted, and F26 is why neither is enough alone: the private trio survived
   * a whole wave because the surfaces that painted it and the seam that owned it agreed on the
   * VALUES while having no shared SOURCE. So one case proves the seam reaches the DOM (asserted
   * against `severityTone('warning')`, never a retyped hex) and one proves the specific pairing
   * the ruling removed is gone.
   */
  describe('the advisory is a warning Banner, not a private dashed callout', () => {
    it('paints from THE severity seam — fill, all four border sides, and the foreground', () => {
      render(<TimeOffsetScreen {...base} dstAdvisory={ADVISORY} />)
      const message = screen.getByText(ADVISORY)
      const box = message.parentElement as HTMLElement
      const tone = severityTone('warning')
      expect(box.style.backgroundColor).toBe(jsdomColor(tone.background))
      // jsdom does not synthesize `borderColor` back from the four longhands, and the per-side
      // read is the stronger assertion anyway — it sees a PARTIAL re-tint the shorthand cannot.
      for (const side of ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'] as const) {
        expect(box.style[side], side).toBe(jsdomColor(tone.borderColor))
      }
      expect(message.style.color).toBe(jsdomColor(tone.color))
    })

    it('stops spending the saturated amber as the advisory`s own TEXT', () => {
      render(<TimeOffsetScreen {...base} dstAdvisory={ADVISORY} />)
      const message = screen.getByText(ADVISORY)
      // What it used to render: `#ffd93d` text, and a 1px DASHED border of the same hue, over a
      // 7% wash of it. C.3 rule 1 bans the accent as text; the dashed outline was the demo's
      // own invention and has no phone counterpart in any revision.
      expect(message.style.color).not.toBe(jsdomColor(colors.warning))
      expect(message.closest('[style*="dashed"]')).toBeNull()
      // OPAQUE. A translucent fill composites over an unknown parent and the measured
      // `*OnLight` ratio stops being a ratio at all (phone `Banner.tsx:11-16`).
      expect((message.parentElement as HTMLElement).style.backgroundColor).toBe(jsdomColor(colors.warningLight))
    })
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

/**
 * W2 integration finding I-4, closed where it was measured.
 *
 * The integrator's probe U2.2-out reverted `TimeOffsetScreen`'s outline button to the exact
 * literal U2.2 deleted (`border: '1px solid #2B8CC1'`, `color: '#4BA3D4'`) and the whole suite
 * stayed green — 754 passed. Two reasons, both still true: the banned-literal scan deliberately
 * exempts those two hexes as too common (`glass-tokens.test.ts:166-168`), and this file, the
 * only one that mounts this screen, carried zero style assertions.
 *
 * This is the second half. It is a RENDER pin, not a source scan, because the observable is
 * what the button paints — and the mutation it must catch is precisely "stop calling
 * `buttonStyle`", which any re-inlined literal fails.
 *
 * See the U2.4 report for why the GENERAL `buttonStyle` adoption scan was declined: 179
 * `<button>` elements under `ui/` against 61 `buttonStyle(` call sites, and the predicate the
 * integrator proposed (`border` + `background: 'transparent'` on a `<button>`) selects 8 sites
 * of which NONE is an outline CTA.
 */
describe('the outline buttons still come from the shared recipe (I-4)', () => {
  it('paints `link`, not the pre-port accent pair, on both outline buttons', () => {
    render(<TimeOffsetScreen {...base} />)
    const outline = buttonStyle({ variant: 'outline' })
    for (const name of ['Use Current Time', 'Capture from DVR']) {
      const el = screen.getByRole('button', { name })
      expect(el.style.color, name).toBe(jsdomColor(String(outline.color)))
      expect(el.style.borderTopColor, name).toBe(jsdomColor(String(outline.borderTopColor)))
      // The literal the probe reverted to. Named explicitly so a reviewer can see the pin is
      // about THIS regression and not about the token happening to match.
      expect(el.style.color, name).not.toBe(jsdomColor('#4BA3D4'))
      expect(el.style.borderTopColor, name).not.toBe(jsdomColor('#2B8CC1'))
    }
  })

  it('keeps the recipe geometry the six hand-rolled outline sites used to re-derive', () => {
    render(<TimeOffsetScreen {...base} />)
    const outline = buttonStyle({ variant: 'outline' })
    const el = screen.getByRole('button', { name: 'Use Current Time' })
    expect(el.style.minHeight).toBe(`${outline.minHeight}px`)
    expect(el.style.fontSize).toBe(`${outline.fontSize}px`)
  })
})
