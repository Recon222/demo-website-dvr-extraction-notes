import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { OcrCaptureScreen, type OcrCaptureScreenProps, type OcrResult } from '@/features/demo/ui/screens/OcrCaptureScreen'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { getConfidenceLevel } from '@/features/demo/engine/logic/ocr'

/** jsdom re-spaces the values it accepts, so every expectation goes through its own writer. */
const cssColor = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.borderTopColor = value
  return probe.style.borderTopColor
}
/** A `background` shorthand carrying a gradient lands on `background-image` in jsdom. */
const cssGradient = (value: string): string => {
  const probe = document.createElement('div')
  probe.style.background = value
  return probe.style.backgroundImage
}

/**
 * U7.3 — the OCR surface's chrome: the mono policy at the one file that carries both faces
 * (A94 / D13), the confirm stage's glass tiers and severity callouts (B.6 row 37), and the
 * D12 sample amber's defence.
 *
 * The camera/live world is `OcrCaptureScreen.live.test.tsx`'s; nothing here injects
 * `mediaDevices`, so every case takes the suite's default sample path
 * (`vitest.setup.ts:74-75` leaves `navigator.mediaDevices` undefined ON PURPOSE — that is the
 * tested contract, not a gap).
 */

const parsed: OcrResult = {
  ok: true,
  dvrTime: '2025-03-08 12:05:30',
  confidence: { label: 'High', level: 'high' as const, measured: true },
  actual: '2025-03-08 12:00:00',
  resolution: { kind: 'exact' },
}

function props(overrides: Partial<OcrCaptureScreenProps> = {}): OcrCaptureScreenProps {
  return {
    result: null,
    dvrDraft: '',
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
    ...overrides,
  }
}

/**
 * The BEHAVIOURAL anchor under `ui/__tests__/fonts.test.ts`'s file-level mono scan. A94 names
 * this file specifically because it is the one surface that paints both faces, so it is the one
 * surface where a render pin can tell the policy's two halves apart at the same time.
 *
 * `fontFamily` is read off the inline style, not a class — jsdom renders no CSS
 * (`vitest.config.mts:31`, `css: false`), so an inline object is the only observable there is.
 */
describe('OcrCaptureScreen — the mono policy, rendered (A94 / D13)', () => {
  it('paints the viewfinder HUD caption in Share Tech Mono', () => {
    render(<OcrCaptureScreen {...props()} />)
    const caption = screen.getByText('AIM AT THE DVR CLOCK')
    expect(caption.style.fontFamily).toContain('--font-stmono')
    expect(caption.style.fontFamily).not.toContain('--font-jbmono')
  })

  it('paints the evidentiary values in JetBrains Mono, never the scanner face', () => {
    render(<OcrCaptureScreen {...props({ result: parsed, dvrDraft: parsed.dvrTime })} />)
    // The parsed DVR time and the atomic actual: the two numbers this screen exists to produce.
    // Phone `ConfirmationScreen.tsx:378-381` paints its counterpart with
    // `Typography.fontFamily.mono`, i.e. the EVIDENTIARY role, not `scannerMono`.
    for (const value of [parsed.dvrTime, parsed.actual]) {
      const node = screen.getByText(value)
      expect(node.style.fontFamily, `${value} must take the evidentiary face`).toContain('--font-jbmono')
      expect(node.style.fontFamily).not.toContain('--font-stmono')
    }
  })

  it('paints an unreadable frame`s raw OCR text in JetBrains Mono', () => {
    render(<OcrCaptureScreen {...props({ result: { ok: false, rawText: '88:88 ??' } })} />)
    const raw = screen.getByText('88:88 ??')
    expect(raw.style.fontFamily).toContain('--font-jbmono')
    expect(raw.style.fontFamily).not.toContain('--font-stmono')
  })
})

/**
 * B.6 row 37 — the confirm stage's surfaces.
 *
 * The phone's `ConfirmationScreen` paints THREE `<Card glass glassVariant="nestedCard">`
 * (`:248` the captured strip, `:301` the detected text, `:327` the recorded-time row) on an
 * ordinary themed form screen. Its `:322-326` comment is the reason the third one exists and
 * is the clause the U7.3 row quotes: *"It was a flat `colors.backgroundTertiary` wash, which
 * against this section's glass measures 1.03:1 (dark) and 1.00:1 (light): the recorded-time
 * block had no visible surface at all."*
 *
 * The demo merges the phone's first two into one evidence card and keeps the recorded-time
 * value as a bare line inside it, so there is no flat wash here to replace — the row's
 * "do not ship one" is satisfied by not building one. What DID have to move is the tier.
 */
/**
 * F65 / ledger §112 — the confidence band's colour moved OUT of `engine/logic/ocr.ts` and into
 * this screen. The engine returns a `ConfidenceLevel` and nothing else, which is what the phone
 * has always returned (`timestamp-parser.ts:339-342`).
 *
 * Driven off the ENGINE's own band vocabulary, not a hand-typed list: a fifth band added to
 * `getConfidenceLevel` without a colour is a compile error in the screen and a red here.
 */
describe('OcrCaptureScreen — the confidence band renders a colour per band (F65)', () => {
  const BANDS = [
    [0.9, 'high', colors.success],
    [0.7, 'medium', colors.warning],
    [0.5, 'low', colors.warningDark],
    [0.2, 'fail', colors.error],
  ] as const

  it.each(BANDS)('score %s paints the %s band', (score, level, expected) => {
    const tier = getConfidenceLevel(score)
    expect(tier.level, 'the engine no longer agrees with this table').toBe(level)
    render(
      <OcrCaptureScreen
        {...props({
          result: { ...parsed, confidence: { label: tier.message, level: tier.level, measured: true } },
          dvrDraft: parsed.dvrTime,
        })}
      />,
    )
    expect(screen.getByText(tier.message).style.color).toBe(cssColor(expected))
  })

  it('carries NO colour out of the engine, and no em dash in the copy it does carry', () => {
    // The engine is presentation-free (F65) ...
    for (const score of [0.9, 0.7, 0.5, 0.2]) {
      expect(Object.keys(getConfidenceLevel(score)).sort()).toEqual(['level', 'message'])
      // ... and `:276`'s message is RENDERED, so the standing copy rule reaches it. The
      // replacement is the PHONE's own punctuation (`timestamp-parser.ts:346` uses a hyphen),
      // so this is a copy port under plan §4.1 rule 7, not a house-style edit.
      expect(getConfidenceLevel(score).message).not.toContain('—')
    }
    expect(getConfidenceLevel(0.9).message).toBe('High confidence - result looks good')
  })
})

describe('OcrCaptureScreen — the confirm stage (B.6 row 37)', () => {
  it('puts the evidence card on the NESTED tier, not a hand-rolled near-black slab', () => {
    // Was `background:'#0a1320'` + `border:'1px solid rgba(30,58,95,0.6)'`. That border is the
    // RETIRED `#1e3a5f` spelled as an rgba, which is why `palette.test.ts`'s retired-hex sweep
    // (a HEX scan) never saw it.
    render(<OcrCaptureScreen {...props({ result: parsed, dvrDraft: parsed.dvrTime })} />)
    const card = screen.getByText('Parsed DVR time').parentElement as HTMLElement
    expect(card.style.backgroundImage).toBe(cssGradient(glassCardNested.background))
    // Per-side, never the shorthand: jsdom does not synthesize `borderColor` from four
    // longhands (HANDOFF §4), and the lit top edge is a different value from the three sides.
    expect(card.style.borderTopColor).toBe(cssColor(glassCardNested.borderTopColor))
    expect(card.style.borderRightColor).toBe(cssColor(glassCardNested.borderRightColor))
    expect(card.style.borderBottomColor).toBe(cssColor(glassCardNested.borderBottomColor))
    expect(card.style.borderLeftColor).toBe(cssColor(glassCardNested.borderLeftColor))
  })

  it('puts the confirm stage on the APP ground — the phone does not force dark here', () => {
    // `OcrCaptureFlow.tsx:109-110`, verbatim: the ForceColorScheme wrap "deliberately does NOT
    // cover the confirmation step above: that is a normal themed form screen with no camera
    // behind it." The demo's confirm stage inherited the CAMERA's near-black `#05080d` purely
    // because both stages live in one component — and a translucent glass tier composited over
    // a near-black parent cannot be measured against the contract that assumes the app ground,
    // which is the same trap `controls/Banner.tsx`'s opacity rule exists to close.
    const { container } = render(<OcrCaptureScreen {...props({ result: parsed, dvrDraft: parsed.dvrTime })} />)
    const shell = container.firstElementChild as HTMLElement
    expect(shell.style.background).toBe(cssColor(colors.background))
  })

  it('keeps the AIM stage near-black — that half IS the phone`s forced-dark camera step', () => {
    const { container } = render(<OcrCaptureScreen {...props()} />)
    const shell = container.firstElementChild as HTMLElement
    expect(shell.style.background).toBe('rgb(5, 8, 13)')
  })

  it('routes the assumed-date blocker through Banner, with its action beside it', () => {
    render(
      <OcrCaptureScreen
        {...props({
          result: { ...parsed, resolution: { kind: 'assumed-date', assumedDate: '2025-03-08' } },
          dvrDraft: parsed.dvrTime,
        })}
      />,
    )
    // D19 handed this callout to U7.3; `banner.test.tsx`'s ledger fires on the adoption itself.
    const banner = screen.getByTestId('ocr-assumed-date')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(banner.getAttribute('aria-label')).toMatch(/^error: No date on the DVR display\./)
    // A Banner is a status line, not a layout slot (phone `Banner.tsx` docblock, and the
    // ExportHub precedent it cites), so the confirm control is a SIBLING — the same shape
    // U7.2 gave the recorder's Dismiss.
    const action = screen.getByRole('button', { name: 'The date is correct' })
    expect(banner.contains(action)).toBe(false)
  })

  it('routes an unreadable frame through Banner and keeps the evidence in a nested card', () => {
    render(<OcrCaptureScreen {...props({ result: { ok: false, rawText: '88:88 ??' } })} />)
    const banner = screen.getByTestId('ocr-read-failed')
    expect(banner).toHaveAttribute('role', 'alert')
    expect(banner.getAttribute('aria-label')).toBe("error: Couldn't read a timestamp.")
    // Phone `ConfirmationScreen.tsx:301` — the detected text lives in its own nested Card.
    const card = screen.getByText('88:88 ??').closest('div[style*="linear-gradient"]') as HTMLElement
    expect(card).not.toBeNull()
    expect(card.style.backgroundImage).toBe(cssGradient(glassCardNested.background))
  })
})
