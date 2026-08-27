import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeOffsetScreen } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { OcrCaptureScreen } from '@/features/demo/ui/screens/OcrCaptureScreen'
import { ExtractedScopeScreen } from '@/features/demo/ui/screens/ExtractedScopeScreen'

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

describe('TimeOffsetScreen', () => {
  const base = {
    dvrDateTime: '2025-03-08 12:05:30',
    actualDateTime: '2025-03-08 12:00:00',
    onChangeDvr: vi.fn(),
    onChangeActual: vi.fn(),
    onUseCurrentTime: vi.fn(),
    onCalculate: vi.fn(),
    onCaptureOcr: vi.fn(),
    sync: null,
    syncing: false,
    result: null,
    correctedScopes: [],
    dvrAppliesDST: false,
    onToggleDst: vi.fn(),
    dstAdvisory: null,
    hasExtractedScopes: false,
    ...nav,
  }

  it('calculates and launches OCR', () => {
    const onCalculate = vi.fn()
    const onCaptureOcr = vi.fn()
    render(<TimeOffsetScreen {...base} onCalculate={onCalculate} onCaptureOcr={onCaptureOcr} />)
    fireEvent.click(screen.getByText('Calculate'))
    expect(onCalculate).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByText('Capture from DVR'))
    expect(onCaptureOcr).toHaveBeenCalledOnce()
  })

  it('shows the computed offset', () => {
    render(<TimeOffsetScreen {...base} result={{ diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false }} />)
    expect(screen.getByText('00:05:30')).toBeInTheDocument()
    expect(screen.getByText(/AHEAD OF/)).toBeInTheDocument()
  })

  it('disables Calculate until both datetimes are present', () => {
    const { rerender } = render(<TimeOffsetScreen {...base} dvrDateTime="" actualDateTime="" />)
    expect(screen.getByText('Calculate')).toBeDisabled()
    rerender(<TimeOffsetScreen {...base} dvrDateTime="2025-03-08 12:05:30" actualDateTime="" />)
    expect(screen.getByText('Calculate')).toBeDisabled()
    rerender(<TimeOffsetScreen {...base} dvrDateTime="2025-03-08 12:05:30" actualDateTime="2025-03-08 12:00:00" />)
    expect(screen.getByText('Calculate')).toBeEnabled()
  })

  it('renders the adjusted-time-ranges table for corrected scopes (the payoff)', () => {
    const correctedScopes = [
      { id: 'a', reqLabel: 'real time', adjLabel: 'DVR time', reqStart: '2025-03-08 23:45:00', reqEnd: '2025-03-09 01:30:00', adjStart: '2025-03-08 23:50:30', adjEnd: '2025-03-09 01:35:30', cameras: '3, 4, 7' },
      { id: 'b', reqLabel: 'real time', adjLabel: 'DVR time', reqStart: '2025-03-10 10:00:00', reqEnd: '2025-03-10 11:00:00', adjStart: '2025-03-10 10:05:30', adjEnd: '2025-03-10 11:05:30', cameras: '1' },
    ]
    render(<TimeOffsetScreen {...base} result={{ diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false }} correctedScopes={correctedScopes} />)
    expect(screen.getByText('Adjusted Time Ranges')).toBeInTheDocument()
    expect(screen.getByText('Scope 1')).toBeInTheDocument()
    expect(screen.getByText('Scope 2')).toBeInTheDocument()
    expect(screen.getByText('2025-03-08 23:50:30')).toBeInTheDocument()
    expect(screen.getByText(/Cameras: 3, 4, 7/)).toBeInTheDocument()
  })
})

describe('OcrCaptureScreen', () => {
  const ocrBase = {
    dvrDraft: '2025-03-08 12:05:30',
    onChangeDvrDraft: vi.fn(),
    dateConfirmed: false,
    onConfirmDate: vi.fn(),
    hasExtractedScopes: false,
    onUseSample: vi.fn(),
    onCapture: vi.fn(),
    onLiveRead: vi.fn(),
    onCancel: vi.fn(),
    onRetake: vi.fn(),
    onConfirm: vi.fn(),
  }
  const parsed = {
    ok: true as const,
    dvrTime: '2025-03-08 12:05:30',
    confidence: { label: 'High', color: '#10d177', measured: false },
    actual: '2025-03-08 12:00:00',
    resolution: { kind: 'exact' } as const,
  }
  /** A low-confidence resolution — what `disambiguateDateFormat` returns for a stale year. */
  const ambiguity = {
    chosenDate: '2024-06-07',
    chosenFormat: 'MM-DD' as const,
    alternativeDate: '2024-07-06',
    confidence: 'low' as const,
    reason: 'year_outside_proximity_window' as const,
    chosenDistanceDays: 784,
    alternativeDistanceDays: 755,
  }

  it('runs the sample on the aim stage', () => {
    const onUseSample = vi.fn()
    render(<OcrCaptureScreen {...ocrBase} result={null} onUseSample={onUseSample} />)
    fireEvent.click(screen.getByText('Use sample DVR clock'))
    expect(onUseSample).toHaveBeenCalledExactlyOnceWith('clean')
  })

  it('offers the two awkward sample frames the confirm step exists for', () => {
    const onUseSample = vi.fn()
    render(<OcrCaptureScreen {...ocrBase} result={null} onUseSample={onUseSample} />)
    fireEvent.click(screen.getByText('Ambiguous date'))
    expect(onUseSample).toHaveBeenCalledExactlyOnceWith('ambiguous')
    fireEvent.click(screen.getByText('Time only'))
    expect(onUseSample).toHaveBeenLastCalledWith('timeOnly')
  })

  it('confirms a parsed result — regenerating scopes, since there are none to lose', () => {
    const onConfirm = vi.fn()
    render(<OcrCaptureScreen {...ocrBase} result={parsed} onConfirm={onConfirm} />)
    expect(screen.getByText('2025-03-08 12:05:30')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Use this & calculate'))
    // Phone: no scopes ⇒ `performOcrCalculation(result, true)` runs with no dialog.
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(true)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  // R-4: committing runs `generateExtractedScopes`, which replaces the editable list wholesale.
  // The phone asks first (`app/(form)/ocr-capture.tsx:288-317`); the demo used to just do it.
  describe('recalculate guard (extracted scopes exist)', () => {
    const withScopes = { ...ocrBase, result: parsed, hasExtractedScopes: true }

    it('asks instead of committing, with the phone’s title and message verbatim', () => {
      const onConfirm = vi.fn()
      render(<OcrCaptureScreen {...withScopes} onConfirm={onConfirm} />)
      fireEvent.click(screen.getByText('Use this & calculate'))

      expect(onConfirm).not.toHaveBeenCalled()
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Recalculate Time Offset')).toBeInTheDocument()
      expect(
        screen.getByText('Recalculating will update the time offset. What would you like to do with your extracted video scopes?'),
      ).toBeInTheDocument()
    })

    it('offers all three phone arms', () => {
      render(<OcrCaptureScreen {...withScopes} />)
      fireEvent.click(screen.getByText('Use this & calculate'))
      for (const label of ['Cancel', 'Keep My Edits', 'Regenerate Scopes']) {
        expect(screen.getByText(label)).toBeInTheDocument()
      }
    })

    it('“Keep My Edits” commits WITHOUT regenerating', () => {
      const onConfirm = vi.fn()
      render(<OcrCaptureScreen {...withScopes} onConfirm={onConfirm} />)
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Keep My Edits'))
      expect(onConfirm).toHaveBeenCalledExactlyOnceWith(false)
    })

    it('“Regenerate Scopes” commits WITH regeneration', () => {
      const onConfirm = vi.fn()
      render(<OcrCaptureScreen {...withScopes} onConfirm={onConfirm} />)
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Regenerate Scopes'))
      expect(onConfirm).toHaveBeenCalledExactlyOnceWith(true)
    })

    it('“Cancel” leaves the OCR flow without committing (the phone’s cancel arm)', () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      render(<OcrCaptureScreen {...withScopes} onConfirm={onConfirm} onCancel={onCancel} />)
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.click(screen.getByText('Cancel'))
      expect(onCancel).toHaveBeenCalledOnce()
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('Escape backs out to the confirm step with the read intact — it is not the Cancel arm', () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      render(<OcrCaptureScreen {...withScopes} onConfirm={onConfirm} onCancel={onCancel} />)
      fireEvent.click(screen.getByText('Use this & calculate'))
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(onCancel).not.toHaveBeenCalled()
      expect(onConfirm).not.toHaveBeenCalled()
      expect(screen.getByText('Use this & calculate')).toBeInTheDocument()
    })
  })

  it('shows the failed-parse branch and retakes', () => {
    const onRetake = vi.fn()
    render(<OcrCaptureScreen {...ocrBase} result={{ ok: false, rawText: 'garbled 88:99' }} onRetake={onRetake} />)
    expect(screen.getByText(/Couldn't read a timestamp/)).toBeInTheDocument()
    expect(screen.getByText(/garbled 88:99/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Try again'))
    expect(onRetake).toHaveBeenCalledOnce()
  })

  // R-16: the SAMPLE confidence score is a fabricated number; it must not read as measured,
  // and it must not look like it is contradicting the warnings under it.
  it('badges the sample confidence score as sample-derived and says what it does not describe', () => {
    render(<OcrCaptureScreen {...ocrBase} result={{ ...parsed, resolution: { kind: 'ambiguous', ambiguity } }} />)
    expect(screen.getByText('Sample')).toBeInTheDocument()
    expect(screen.getByText(/no live frame was scored here/i)).toBeInTheDocument()
    expect(screen.getByText(/never which date they mean/i)).toBeInTheDocument()
    // …and it still shows the score rather than hiding the feature
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('a MEASURED (live camera) confidence carries no Sample badge and no disclaimer', () => {
    // P4.7: the recogniser's own score for a live frame is a real number — badging it
    // "Sample" would be the inverse dishonesty.
    render(<OcrCaptureScreen {...ocrBase} result={{ ...parsed, confidence: { label: 'High', color: '#10d177', measured: true } }} />)
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Sample')).not.toBeInTheDocument()
    expect(screen.queryByText(/no live frame was scored here/i)).not.toBeInTheDocument()
  })

  it('exposes the parsed DVR time as an editable field, pre-filled with the read', () => {
    render(<OcrCaptureScreen {...ocrBase} result={parsed} />)
    // The demo's DateTimeField renders the value across a Date and a Time button.
    expect(screen.getByLabelText('Set date')).toHaveTextContent('2025-03-08')
    expect(screen.getByLabelText('Set time')).toHaveTextContent('12:05:30')
  })

  it('marks a corrected value as manually edited', () => {
    const { rerender } = render(<OcrCaptureScreen {...ocrBase} result={parsed} />)
    expect(screen.queryByText('Manually edited')).not.toBeInTheDocument()
    rerender(<OcrCaptureScreen {...ocrBase} result={parsed} dvrDraft="2025-03-08 12:07:00" />)
    expect(screen.getByText('Manually edited')).toBeInTheDocument()
    // the read itself is still shown, unedited — it is the evidence line
    expect(screen.getByText('2025-03-08 12:05:30')).toBeInTheDocument()
  })

  it('blocks the commit with the phone’s copy when the DVR time is empty', () => {
    const onConfirm = vi.fn()
    render(<OcrCaptureScreen {...ocrBase} result={parsed} dvrDraft="" onConfirm={onConfirm} />)
    const hint = screen.getByText(/DVR Time Required/)
    const commit = screen.getByText('Use this & calculate')
    // R-15: the CTA stays focusable (aria-disabled) and NAMES the blocking reason, which is
    // itself a live region so it announces when an edit produces it.
    expect(commit).toHaveAttribute('aria-disabled', 'true')
    expect(commit).toHaveAccessibleDescription(/DVR Time Required/)
    expect(hint.closest('[role="status"]')).not.toBeNull()
    fireEvent.click(commit)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('names the assumed-date reason on the CTA too, and drops the description once it clears', () => {
    const timeOnlyResult = { ...parsed, dvrTime: '2026-07-31 12:05:30', resolution: { kind: 'assumed-date', assumedDate: '2026-07-31' } } as const
    const { rerender } = render(<OcrCaptureScreen {...ocrBase} result={timeOnlyResult} dvrDraft="2026-07-31 12:05:30" />)
    const commit = screen.getByText('Use this & calculate')
    expect(commit).toHaveAttribute('aria-disabled', 'true')
    expect(commit).toHaveAccessibleDescription(/Confirm or correct the assumed date/)

    rerender(<OcrCaptureScreen {...ocrBase} result={timeOnlyResult} dvrDraft="2026-07-31 12:05:30" dateConfirmed />)
    expect(commit).toHaveAttribute('aria-disabled', 'false')
    expect(commit).toHaveAccessibleDescription('')
  })

  it('renders the ambiguity warning when the resolver was unsure', () => {
    render(<OcrCaptureScreen {...ocrBase} result={{ ...parsed, resolution: { kind: 'ambiguous', ambiguity } }} />)
    expect(screen.getByTestId('date-disambiguation-warning')).toHaveTextContent(
      'Date Format Ambiguity Detected',
    )
    expect(screen.getByText(/Jun 7, 2024 \(MM-DD\)/)).toBeInTheDocument()
    expect(screen.getByText('Jul 6, 2024')).toBeInTheDocument()
  })

  it('stays silent when the resolver was confident', () => {
    render(<OcrCaptureScreen {...ocrBase} result={{ ...parsed, resolution: { kind: 'ambiguous', ambiguity: { ...ambiguity, confidence: 'high' } } }} />)
    expect(screen.queryByTestId('date-disambiguation-warning')).not.toBeInTheDocument()
  })

  it('stays silent when the date was never ambiguous', () => {
    render(<OcrCaptureScreen {...ocrBase} result={parsed} />)
    expect(screen.queryByTestId('date-disambiguation-warning')).not.toBeInTheDocument()
  })

  it('holds the commit until an assumed date is confirmed', () => {
    const onConfirm = vi.fn()
    const onConfirmDate = vi.fn()
    const timeOnly = { ...parsed, dvrTime: '2026-07-31 12:05:30', resolution: { kind: 'assumed-date', assumedDate: '2026-07-31' } } as const
    const { rerender } = render(
      <OcrCaptureScreen {...ocrBase} result={timeOnly} dvrDraft="2026-07-31 12:05:30" onConfirm={onConfirm} onConfirmDate={onConfirmDate} />,
    )
    expect(screen.getByText('No date on the DVR display')).toBeInTheDocument()
    expect(screen.getByText('Use this & calculate')).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(screen.getByText('The date is correct'))
    expect(onConfirmDate).toHaveBeenCalledOnce()

    rerender(
      <OcrCaptureScreen {...ocrBase} result={timeOnly} dvrDraft="2026-07-31 12:05:30" dateConfirmed onConfirm={onConfirm} onConfirmDate={onConfirmDate} />,
    )
    expect(screen.getByText('Date confirmed')).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(screen.getByText('Use this & calculate'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('leaves the confirmed date button focusable and refuses the repeat click in the handler (R-35)', () => {
    const onConfirmDate = vi.fn()
    const timeOnly = { ...parsed, dvrTime: '2026-07-31 12:05:30', resolution: { kind: 'assumed-date', assumedDate: '2026-07-31' } } as const
    render(<OcrCaptureScreen {...ocrBase} result={timeOnly} dvrDraft="2026-07-31 12:05:30" dateConfirmed onConfirmDate={onConfirmDate} />)
    const confirmed = screen.getByText('Date confirmed')
    // §44b's rule, applied to the button that trips it: a native `disabled` is dropped by the
    // browser from the tab order and blurs the pressed element, so confirming the date would
    // throw focus to <body> at the exact moment the blocked-reason clears and the commit CTA
    // (aria-disabled for this same reason) becomes the thing to press.
    expect(confirmed).not.toBeDisabled()
    expect(confirmed).toHaveAttribute('aria-disabled', 'true')
    confirmed.focus()
    expect(confirmed).toHaveFocus()
    // Still focusable and still clickable — so the refusal has to live in the handler.
    fireEvent.click(confirmed)
    expect(onConfirmDate).not.toHaveBeenCalled()
  })

  it('also releases the commit when the operator corrects the assumed date instead of confirming it', () => {
    const onConfirm = vi.fn()
    const timeOnly = { ...parsed, dvrTime: '2026-07-31 12:05:30', resolution: { kind: 'assumed-date', assumedDate: '2026-07-31' } } as const
    // dateConfirmed stays false — the draft's date no longer IS the assumption.
    render(<OcrCaptureScreen {...ocrBase} result={timeOnly} dvrDraft="2025-03-08 12:05:30" onConfirm={onConfirm} />)
    expect(screen.getByText('Manually edited')).toBeInTheDocument()
    const commit = screen.getByText('Use this & calculate')
    expect(commit).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(commit)
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

describe('ExtractedScopeScreen', () => {
  it('regenerates from the offset and shows the empty hint', () => {
    const onRegenerate = vi.fn()
    render(<ExtractedScopeScreen scopes={[]} onChange={vi.fn()} onRemove={vi.fn()} onRegenerate={onRegenerate} {...nav} />)
    expect(screen.getByText(/Calculate the time offset first/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Regenerate from offset'))
    expect(onRegenerate).toHaveBeenCalledOnce()
  })
})
