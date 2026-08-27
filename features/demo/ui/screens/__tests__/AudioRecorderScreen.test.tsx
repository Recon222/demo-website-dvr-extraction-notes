import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import {
  CAPTURE_PERMISSION_COPY,
  RECORDER_SCALE_LABELS,
  SAMPLE_MEDIA_NOTICE,
  SPECTRUM_BAR_COUNT,
} from '@/features/demo/engine/logic/media'
import {
  AudioRecorderScreen,
  type AudioRecorderScreenProps,
} from '@/features/demo/ui/screens/AudioRecorderScreen'
import { RESTING_METER } from '@/features/demo/ui/inputs/useAudioAnalyser'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'

/** jsdom rewrites `#rrggbb` to `rgb(r, g, b)` on read-back (mutation-testing SKILL, project
 *  hazards) — compare through the same normalisation rather than by hex. */
function hexToRgb(hex: string): string {
  const [r, g, b] = (hex.replace('#', '').match(/../g) as string[]).map((p) => parseInt(p, 16))
  return `rgb(${r}, ${g}, ${b})`
}

/**
 * The recorder screen (matrix rows 67-68), rendered from props alone — which is why every
 * state a browser makes hard to reach (denied, no analyser, sub-500ms) is testable here.
 */

function props(over: Partial<AudioRecorderScreenProps> = {}): AudioRecorderScreenProps {
  return {
    mode: 'live',
    phase: 'idle',
    elapsedMs: 0,
    canStop: false,
    meter: RESTING_METER,
    format: { sampleRate: '48.0kHz', channels: 'MONO', codec: 'OPUS' },
    timeOfDay: '14:05:09',
    deniedTitle: CAPTURE_PERMISSION_COPY.microphone.title,
    deniedBody: CAPTURE_PERMISSION_COPY.microphone.deniedBody,
    sampleNotice: SAMPLE_MEDIA_NOTICE.microphone,
    notice: null,
    reduceMotion: false,
    failure: null,
    onDismissFailure: vi.fn(),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onStop: vi.fn(),
    onEnableMicrophone: vi.fn(),
    onUseSample: vi.fn(),
    onCancel: vi.fn(),
    ...over,
  }
}

const liveMeter = (level: number) => ({
  bars: new Array<number>(SPECTRUM_BAR_COUNT).fill(level),
  level,
  available: true,
})

describe('AudioRecorderScreen — idle', () => {
  it('renders the phone chrome: badge, timer, READY, and the decorative scale row', () => {
    render(<AudioRecorderScreen {...props()} />)

    expect(screen.getByText('AUDIO CAPTURE')).toBeInTheDocument()
    expect(screen.getByTestId('recording-duration')).toHaveTextContent('00:00')
    expect(screen.getByText('READY')).toBeInTheDocument()
    expect(screen.getByText('WAVEFORM MONITOR')).toBeInTheDocument()
    for (const label of RECORDER_SCALE_LABELS) expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows the format row as read off the track, not the phone constants', () => {
    render(<AudioRecorderScreen {...props()} />)
    expect(screen.getByText('48.0kHz')).toBeInTheDocument()
    expect(screen.getByText('/ MONO')).toBeInTheDocument()
    expect(screen.getByText('OPUS')).toBeInTheDocument()
    expect(screen.getByText('14:05:09')).toBeInTheDocument()
    // The phone's constants are never printed by this screen.
    expect(screen.queryByText(/44\.1kHz/)).not.toBeInTheDocument()
    expect(screen.queryByText(/128k/)).not.toBeInTheDocument()
  })

  it('prints an em dash for every fact the browser did not state', () => {
    render(<AudioRecorderScreen {...props({ format: { sampleRate: null, channels: null, codec: null } })} />)
    expect(screen.getAllByText(/—/).length).toBeGreaterThanOrEqual(2)
  })

  it('offers Start, and neither pill until a take is running', () => {
    const p = props()
    render(<AudioRecorderScreen {...p} />)

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))

    expect(p.onStart).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    // The level meter is an active-only surface on the phone too.
    expect(screen.queryByTestId('level-meter')).not.toBeInTheDocument()
  })

  it('cancels through the header close button (phone label verbatim)', () => {
    const p = props()
    render(<AudioRecorderScreen {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel recording' }))
    expect(p.onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('AudioRecorderScreen — the 500ms Stop gate', () => {
  it('refuses BOTH stop affordances below the minimum, and says why', () => {
    // Deviation from the phone, deliberate: it gates only the pill and leaves the big button
    // ungated (ui-mapping 10-audio.md:62/70), so its guard has a way around it.
    const p = props({ phase: 'recording', elapsedMs: 200, canStop: false })
    render(<AudioRecorderScreen {...p} />)

    const big = screen.getByRole('button', { name: 'Stop recording' })
    const pill = screen.getByRole('button', { name: 'Stop' })
    expect(big).toHaveAttribute('aria-disabled', 'true')
    expect(pill).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(big)
    fireEvent.click(pill)
    expect(p.onStop).not.toHaveBeenCalled()

    // aria-disabled (not `disabled`) keeps the control focusable, so the reason must be
    // announced and tied to it.
    const reason = screen.getByText(/Stop unlocks after half a second/)
    expect(reason).toHaveAttribute('role', 'status')
    expect(big).toHaveAttribute('aria-describedby', reason.id)
    expect(pill).toHaveAttribute('aria-describedby', reason.id)
  })

  it('lets both through once the gate opens, and drops the reason', () => {
    const p = props({ phase: 'recording', elapsedMs: 900, canStop: true })
    render(<AudioRecorderScreen {...p} />)

    expect(screen.queryByText(/Stop unlocks/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(p.onStop).toHaveBeenCalledTimes(2)
  })
})

describe('AudioRecorderScreen — recording and paused', () => {
  it('shows REC, the elapsed take, Pause and the level meter while recording', () => {
    render(<AudioRecorderScreen {...props({ phase: 'recording', elapsedMs: 65_000, canStop: true, meter: liveMeter(0.5) })} />)

    expect(screen.getByText('REC')).toBeInTheDocument()
    expect(screen.getByTestId('recording-duration')).toHaveTextContent('01:05')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument()
    expect(screen.getByTestId('level-meter')).toBeInTheDocument()
    expect(screen.getByText('-6 dB')).toBeInTheDocument()
    expect(screen.getByTestId('level-fill')).toHaveStyle({ width: '50%' })
  })

  it('swaps Pause for Resume and reads PAUSED', () => {
    const p = props({ phase: 'paused', elapsedMs: 3000, canStop: true, meter: liveMeter(0.1) })
    render(<AudioRecorderScreen {...p} />)

    expect(screen.getByText('PAUSED')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(p.onResume).toHaveBeenCalledTimes(1)
  })

  it('routes Pause to onPause', () => {
    const p = props({ phase: 'recording', elapsedMs: 3000, canStop: true })
    render(<AudioRecorderScreen {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(p.onPause).toHaveBeenCalledTimes(1)
  })

  it('colours the level bar by the phone bands', () => {
    const { rerender } = render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.9) })} />)
    expect(screen.getByTestId('level-fill')).toHaveStyle({ background: '#ff4757' })

    rerender(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.2) })} />)
    expect(screen.getByTestId('level-fill')).toHaveStyle({ background: '#2B8CC1' })
  })
})

describe('AudioRecorderScreen — reduced motion (R-17)', () => {
  it('runs no infinite loop and no transition when the visitor asked for less motion', () => {
    render(
      <AudioRecorderScreen
        {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.4), reduceMotion: true })}
      />,
    )

    // The state is still fully legible without any of it: colour, the REC text, and a bar
    // height that is DATA rather than decoration.
    expect(screen.getByTestId('recording-status-dot').style.animation).toBe('')
    expect(screen.getByTestId('waveform-live-dot').style.animation).toBe('')
    expect(screen.getByTestId('level-fill').style.transition).toBe('')
    expect(screen.getAllByTestId('waveform-bar')[0].style.transition).toBe('')
    expect(screen.getByText('REC')).toBeInTheDocument()
  })

  it('animates by default', () => {
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.4) })} />)
    expect(screen.getByTestId('recording-status-dot').style.animation).toContain('blinkDot')
    expect(screen.getByTestId('waveform-live-dot').style.animation).toContain('blinkDot')
    expect(screen.getAllByTestId('waveform-bar')[0].style.transition).toContain('transform')
  })

  it('drives the bars with a composited transform, not an animated height (R-20)', () => {
    // 80 nodes re-laid-out every 60ms tick for a whole take, beside a live recorder and an
    // AudioContext, is what the height animation cost. The factor is the old percentage.
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(1) })} />)
    const bar = screen.getAllByTestId('waveform-bar')[0]
    expect(bar.style.transform).toBe('scaleY(0.46)')
    expect(bar.style.transformOrigin).toBe('bottom')
    expect(bar.style.height).toBe('100%')
  })
})

describe('AudioRecorderScreen — the meter is never faked', () => {
  it('says NO LIVE INPUT and withholds the dB figure when no analyser is attached', () => {
    // The panel geometry is unchanged (the bars are still there, flat) but nothing claims the
    // flat line is measured silence.
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: RESTING_METER })} />)

    expect(screen.getByText('NO LIVE INPUT')).toBeInTheDocument()
    expect(screen.queryByTestId('waveform-live-dot')).not.toBeInTheDocument()
    expect(screen.queryByText(/dB$/)).not.toBeInTheDocument()
    expect(screen.getByTestId('waveform-bars').children).toHaveLength(SPECTRUM_BAR_COUNT + 1) // + centre line
  })

  it('shows the live dot and a dB readout only when the analyser is running', () => {
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.25) })} />)
    expect(screen.getByTestId('waveform-live-dot')).toBeInTheDocument()
    expect(screen.queryByText('NO LIVE INPUT')).not.toBeInTheDocument()
    expect(screen.getByText('-12 dB')).toBeInTheDocument()
  })
})

describe('AudioRecorderScreen — the modes that are not a live recorder', () => {
  it('denied: the phone headline, the BROWSER remedy, a retry and a cancel', () => {
    const p = props({ mode: 'denied' })
    render(<AudioRecorderScreen {...p} />)

    expect(screen.getByText('Microphone Access Required')).toBeInTheDocument()
    expect(screen.getByText(CAPTURE_PERMISSION_COPY.microphone.deniedBody)).toBeInTheDocument()
    // §58b: the phone's remedy points at a device setting that cannot fix a site permission.
    expect(screen.queryByText(/device settings/)).not.toBeInTheDocument()
    // No recorder chrome at all — the phone replaces the whole screen.
    expect(screen.queryByText('AUDIO CAPTURE')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(p.onEnableMicrophone).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(p.onCancel).toHaveBeenCalledTimes(1)
  })

  it('sample: the honest notice and the sample CTA — never a record button that cannot record', () => {
    const p = props({ mode: 'sample' })
    render(<AudioRecorderScreen {...p} />)

    expect(screen.getByText(SAMPLE_MEDIA_NOTICE.microphone)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    expect(p.onUseSample).toHaveBeenCalledTimes(1)
  })

  it('offer: the microphone is not opened until the visitor asks', () => {
    const p = props({ mode: 'offer' })
    render(<AudioRecorderScreen {...p} />)

    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enable microphone' }))
    expect(p.onEnableMicrophone).toHaveBeenCalledTimes(1)
  })

  it('connecting: the CTA refuses a second concurrent open', () => {
    const p = props({ mode: 'connecting' })
    render(<AudioRecorderScreen {...p} />)
    expect(screen.getByText('Opening the microphone…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable microphone' })).toHaveAttribute('aria-disabled', 'true')
  })
})

describe('AudioRecorderScreen — failures', () => {
  it('announces the capability layer’s message and can dismiss it', () => {
    const p = props({ failure: 'The recording failed and produced no audio or video — nothing was saved.' })
    render(<AudioRecorderScreen {...p} />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('nothing was saved')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(p.onDismissFailure).toHaveBeenCalledTimes(1)
  })

  it('renders no alert region when there is nothing wrong', () => {
    render(<AudioRecorderScreen {...props()} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('AudioRecorderScreen — U7.2 chrome (matrix rows 67-69, A43, A61, D-1)', () => {
  /**
   * MUTATION: put `borderRadius: 16` back on either card object.
   *
   * `partner-legwork-w3.md` W3-C7 found two `{ ...glassCard, …, borderRadius: 16 }` spread
   * overrides that A43's radius sweep could not see because they are not literals in a card
   * const. Deleting them is the whole change — `glassCard`'s own radius is `lg`, and the phone
   * agrees on both surfaces: `TimerCard` is `<Card glass>` (matrix rows 67-69, `xl` -> `lg`) and
   * `SpectrumVisualizer.tsx:361` is `Layout.borderRadius.lg`.
   */
  it('drops both glass cards to radius lg — the two surviving radius-16 overrides are gone', () => {
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.4) })} />)
    const timer = screen.getByTestId('recording-duration').closest('div[style]')?.parentElement
      ?.parentElement as HTMLElement
    const waveformPanel = screen.getByTestId('waveform-bars').parentElement as HTMLElement

    expect(timer.style.borderRadius).toBe(`${radius.lg}px`)
    expect(waveformPanel.style.borderRadius).toBe(`${radius.lg}px`)
    // `shadow.card` arrives fused into `glassCard`'s boxShadow beside the tier inset (A44/A32),
    // so an override of that key would silently drop the inset — pin that it was not written.
    expect(timer.style.boxShadow).toBe(glassCard.boxShadow)
  })

  /**
   * MUTATION: restore `const MUTED = '#5a7a9a'` and point any one label back at it.
   *
   * D-1 is binding (matrix rows 67-69): the phone's six `#5a7a9a` sites took `textSecondary`,
   * NOT `textTertiary` (2.32:1). Verified at `dd5551ec` on every counterpart —
   * `RecorderScreen.tsx:297` (badge), `SpectrumVisualizer.tsx:314,348` (panel + scale),
   * `LevelMeter.tsx:168` (LEVEL), `TimerCard.tsx:151` (the meta row), `RecorderScreen.tsx:252`
   * (the denied view's icon).
   */
  it('paints every mono label textSecondary — D-1, not the retired slate and not textTertiary', () => {
    render(<AudioRecorderScreen {...props({ phase: 'recording', canStop: true, meter: liveMeter(0.4) })} />)
    const expected = hexToRgb(colors.textSecondary)

    for (const label of ['AUDIO CAPTURE', 'WAVEFORM MONITOR', 'LEVEL', RECORDER_SCALE_LABELS[0]]) {
      expect(screen.getByText(label).style.color, `${label} is not textSecondary`).toBe(expected)
    }
    // The timer card's format row, which reads the shared `monoLabel` fragment.
    expect(screen.getByText('OPUS').style.color).toBe(expected)
    expect(hexToRgb(colors.textSecondary)).not.toBe(hexToRgb(colors.textTertiary))
  })

  it('paints the denied view’s mic glyph textSecondary too (RecorderScreen.tsx:252)', () => {
    const { container } = render(<AudioRecorderScreen {...props({ mode: 'denied' })} />)
    const glyph = container.querySelector('svg[width="64"]')
    expect(glyph?.getAttribute('stroke')).toBe(colors.textSecondary)
  })

  /**
   * MUTATION: hand `variant="cameraScrim"` to the header, or drop back to the pre-U7.2 inline
   * 40x40 pill. The phone grew this control to `Layout.touchTarget.min`
   * (`RecorderScreen.tsx:281-282`) and filled it from the glass CARD's top stop (`:78-79`).
   */
  it('adopts OverlayHeader’s glass variant — 44x44 on the card tier, badge in the trailing slot', () => {
    render(<AudioRecorderScreen {...props()} />)
    const close = screen.getByRole('button', { name: 'Cancel recording' })
    expect(close).toHaveStyle({ width: `${touchTarget.min}px`, height: `${touchTarget.min}px` })
    expect(close.style.background.replace(/\s+/g, '')).toBe(GLASS_TIER[scheme].card.gradient[0].replace(/\s+/g, ''))
    // The badge is the header's `trailing`, so it is a SIBLING of the control, not a child.
    const row = close.parentElement as HTMLElement
    expect(row).toHaveTextContent('AUDIO CAPTURE')
    expect(row.children[0]).toBe(close)
  })
})

describe('AudioRecorderScreen — the D19 Banner hand-back (A71)', () => {
  /**
   * MUTATION: give either Banner a translucent fill — `style={{ background: 'rgba(...)' }}` —
   * or swap `severity="error"` for `"warning"`.
   *
   * A71's single non-negotiable is the OPAQUE fill (`Banner.tsx:35-42`): the `*OnLight`
   * foregrounds are measured against the `*Light` tones and a wash over an unknown parent
   * cannot be measured at all. Both notices here used to be exactly such washes — 8% accent
   * and 6% error over the CRT shell.
   */
  it.each([
    ['info', { notice: 'Recording stops automatically after one hour.' }, 'one hour'],
    ['error', { failure: 'The recording failed and produced no audio or video — nothing was saved.' }, 'nothing was saved'],
  ] as const)('routes the %s notice through Banner on an opaque severity ground', (severity, over, text) => {
    render(<AudioRecorderScreen {...props(over)} />)
    const banner = screen.getByRole('alert')

    expect(banner).toHaveTextContent(text)
    // The accessible name carries the severity, which the colour cannot (phone `Banner.tsx:63`).
    expect(banner.getAttribute('aria-label')).toMatch(new RegExp(`^${severity}: `))
    expect(banner.style.backgroundColor).toBe(hexToRgb(colors[`${severity}Light`]))
    // Opaque: `*Light` is a flat hex in both halves, so jsdom reads back `rgb(...)`, never `rgba`.
    expect(banner.style.backgroundColor).not.toContain('rgba')
    expect(banner.style.borderTopColor).toBe(hexToRgb(colors[severity]))
  })

  /**
   * MUTATION: move the Dismiss button back INSIDE the Banner's box (a `children` slot), or drop
   * it to the old transparent text link.
   *
   * A Banner is a status line, not a layout slot, and has never carried a dismiss affordance.
   * The row is phone `export-hub/ExportHub.tsx:185-194` + `:278-282`.
   */
  it('puts Dismiss BESIDE the error Banner, on the secondary/small button recipe', () => {
    const p = props({ failure: 'The recording failed and produced no audio or video — nothing was saved.' })
    render(<AudioRecorderScreen {...p} />)
    const banner = screen.getByRole('alert')
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })

    expect(banner.contains(dismiss)).toBe(false)
    expect(dismiss.parentElement).toBe(banner.parentElement)
    expect(banner.parentElement).toHaveStyle({ gap: `${spacing.md}px`, alignItems: 'center' })
    expect(banner.style.flex).toBe('1 1 0%')
    // `toHaveStyle` takes a plain record; `CSSProperties` has no index signature, hence the cast.
    expect(dismiss).toHaveStyle(buttonStyle({ variant: 'secondary', size: 'small' }) as Record<string, unknown>)

    fireEvent.click(dismiss)
    expect(p.onDismissFailure).toHaveBeenCalledTimes(1)
  })
})
