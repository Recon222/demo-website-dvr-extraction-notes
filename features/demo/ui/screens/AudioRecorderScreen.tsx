'use client'

import { useId, type CSSProperties, type ReactNode } from 'react'

import {
  RECORDER_SCALE_LABELS,
  formatDuration,
  levelDbLabel,
  levelFillBand,
  recorderStatusLabel,
  recorderStatusTone,
  type LevelFillBand,
  type RecorderStatusTone,
  type RecordingPhase,
} from '@/features/demo/engine/logic/media'
import { OverlayHeader } from '@/features/demo/ui/chrome/OverlayHeader'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { buttonStyle, SAMPLE_TINT } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'
import type { AudioMeter } from '@/features/demo/ui/inputs/useAudioAnalyser'

/**
 * The recorder screen (parity P4.6, matrix row 67 + row 68's denied view) — the phone's
 * `RecorderScreen.tsx` composition: CRT overlay · header badge · timer card · waveform panel ·
 * level meter · morphing record button + glass pills.
 *
 * Presentational: props in, callbacks out. It owns no capture state, no clock and no analyser
 * — `AudioRecordingFlow` holds all three, which is what lets every state on this screen
 * (including the ones a browser rarely produces) be rendered from a prop in a test.
 *
 * ── Deliberate deviations from the phone, each with its reason ──────────────────────────
 * 1. **The Stop gate binds BOTH controls.** The phone gates only the Stop pill on the 500ms
 *    minimum and never passes `disabled` to the big button (its own ui-mapping records the
 *    guard as "currently inert", 10-audio.md:62/70), so a sub-500ms take can leave by the
 *    other door and lands on an error toast. A guard with a way around it is not a guard.
 * 2. **The pills are named by their visible text** (`Pause` / `Resume` / `Stop`), not by the
 *    phone's `accessibilityLabel="Stop recording"` — which is byte-identical to the big
 *    button's, leaving two controls on one screen indistinguishable to a screen reader. The
 *    big button keeps the phone's phrases; the pills say what is written on them.
 * 3. **The format row prints what is true.** See `engine/logic/media/audio-levels.ts`.
 * 4. **The 0s/5s/…/20s scale row is decoration**, exactly as on the phone (10-audio.md:223).
 */

/** What this screen can offer right now — the flow resolves it from the capability layer.
 *  Every arm renders a different set of controls, so it is one value rather than four
 *  booleans that could contradict each other. */
export type RecorderMode =
  /** A microphone stream is open: the full recorder. */
  | 'live'
  /** `getUserMedia` is in flight. */
  | 'connecting'
  /** The browser can capture, but nothing is open yet — offer to open it. */
  | 'offer'
  /** Refused. The phone's permission view, with the browser's remedy. */
  | 'denied'
  /** No capture capability on this page at all — the bundled sample is the only way on. */
  | 'sample'

export interface RecorderFormat {
  /** e.g. `48.0kHz`; `null` where the track states nothing. */
  sampleRate: string | null
  /** e.g. `MONO`. */
  channels: string | null
  /** e.g. `OPUS`. */
  codec: string | null
}

export interface AudioRecorderScreenProps {
  mode: RecorderMode
  phase: RecordingPhase
  /** Recorded milliseconds, paused time excluded. */
  elapsedMs: number
  /** The phone's Stop gate: active and past 500ms. */
  canStop: boolean
  meter: AudioMeter
  format: RecorderFormat
  /** Wall clock as `HH:MM:SS`, ticked by the flow off the clock seam. */
  timeOfDay: string
  /** The permission-denied body — `CAPTURE_PERMISSION_COPY.microphone.deniedBody`, passed in
   *  so the copy has exactly one home (P4.1's `permissions.ts`). */
  deniedTitle: string
  deniedBody: string
  /** The no-capability explanation — `SAMPLE_MEDIA_NOTICE.microphone`. */
  sampleNotice: string
  /** An informational line (today: the 1-hour auto-stop). Not a failure — it gets the neutral
   *  treatment, never the red one. */
  notice: string | null
  /**
   * `prefers-reduced-motion: reduce`, resolved by the flow (review R-17). A prop rather than a
   * `useReducedMotion()` call inside here, unlike `MediaCaptureScreen.tsx:183`, because this
   * screen is prop-driven end to end — that is what lets every one of its states be rendered in
   * a test — and because the flow already has to resolve the same answer for the meter's tick
   * rate. Two readers of one preference must not be able to disagree.
   */
  reduceMotion: boolean
  /** Operator-facing failure text from the capability layer; `null` when there is none. */
  failure: string | null
  onDismissFailure(): void
  onStart(): void
  onPause(): void
  onResume(): void
  onStop(): void
  onEnableMicrophone(): void
  onUseSample(): void
  onCancel(): void
}

/**
 * The two status→colour maps the engine used to hold (U3.2, A69's engine owner). They live here
 * for the same reason the phone's live in `TimerCard` and `LevelMeter`: `engine/` takes nothing
 * from `ui/`, so the engine decides WHICH band or tone applies and this screen decides what that
 * looks like.
 *
 * Neither is `severityTone()`. Both paint a bare mark and a bare label — no fill behind text —
 * and the phone spends the plain tokens on both (`TimerCard.tsx:130-139`, `LevelMeter.tsx:86`).
 *
 * `neutral` moved `#5a7a9a` -> `colors.textSecondary`: the old slate belonged to no token and is
 * below AA on this ground, and `textSecondary` is what the phone's own default arm returns.
 */
const STATUS_TONE_COLOR: Record<RecorderStatusTone, string> = {
  error: colors.error,
  warning: colors.warning,
  neutral: colors.textSecondary,
}

/** Phone `LevelMeter.tsx:86`, byte for byte: `{ normal: primary, warm: warning, hot: error }`. */
const LEVEL_BAND_COLOR: Record<LevelFillBand, string> = {
  normal: colors.primary,
  warm: colors.warning,
  hot: colors.error,
}

const MONO = "var(--font-jbmono),'JetBrains Mono',monospace"
const BAR_WIDTH = 4
const BAR_GAP = 3

const monoLabel: CSSProperties = { fontFamily: MONO, fontSize: 10, color: colors.textSecondary, letterSpacing: 0.5 }

export function AudioRecorderScreen(props: AudioRecorderScreenProps) {
  const { mode, phase, elapsedMs, canStop, meter, format, timeOfDay, failure, notice, reduceMotion } = props
  const blockedId = `${useId()}-stop-blocked`
  const active = phase === 'recording' || phase === 'paused'
  // The gate applies to every stop affordance, not just the pill (deviation 1 above).
  const stopBlocked = active && !canStop

  if (mode === 'denied') {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '0 30px', textAlign: 'center' }}>
          <MicOffIcon />
          <div style={{ fontSize: 19, fontWeight: 600, color: '#f0f4f8' }}>{props.deniedTitle}</div>
          <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.55, marginBottom: 6 }}>{props.deniedBody}</div>
          {/* Not on the phone: iOS will not re-prompt once refused, so its view has no retry.
              A browser's site permission is one click away in the address bar, so a retry
              here is a real affordance rather than a button that cannot work. */}
          <button type="button" onClick={props.onEnableMicrophone} style={{ ...pillButton, borderColor: 'rgba(43,140,193,0.45)', color: '#9fd4ee' }}>
            Try again
          </button>
          <button type="button" onClick={props.onCancel} style={{ ...pillButton, color: '#cdd9e6' }}>
            Cancel
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* SEAM(U7.2): `OverlayHeader`'s reference adopter (A61) — phone RecorderScreen.tsx:284-302.
          The close pill GREW to 44x44 on the phone (`Layout.touchTarget.min`, `:281-282`) and
          took the card tier's top gradient stop as its fill (`:78-79`); both live in the seam.
          `padding` is the phone's own `paddingHorizontal: mdlg` / `paddingVertical: sm`
          (`:276-277`), which is also the margin every body block below already uses. */}
      <OverlayHeader
        variant="glass"
        onBack={props.onCancel}
        backLabel="Cancel recording"
        style={{ padding: '0 20px 8px' }}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: 2.5, background: colors.primary, opacity: 0.6 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: colors.textSecondary }}>AUDIO CAPTURE</span>
          </div>
        }
      />

      {/* Timer card — phone TimerCard.tsx. The `borderRadius: 16` override that used to sit at
          the end of this object is DELETED, not re-spelled: matrix row 67-69 is
          "`TimerCard`'s hand-rolled glass → `<Card glass>`, radius `xl` (16) → `lg` (12)", and
          U1.2 already put `glassCard` (whose radius IS `lg`) underneath, so the whole change is
          the removal. `shadow.card` arrives the same way — it is fused into `glassCard`'s
          `boxShadow` beside the tier inset, which is also why nothing here may override that
          key (glass-tokens.ts's module header). */}
      <div style={{ ...glassCard, position: 'relative', margin: '0 20px 8px', padding: '20px 20px 14px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'rgba(153,186,221,0.25)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            data-testid="recording-duration"
            style={{ fontFamily: MONO, fontSize: 42, fontWeight: 700, letterSpacing: 2, lineHeight: '48px', color: phase === 'paused' ? '#ffd93d' : '#f0f4f8' }}
          >
            {formatDuration(elapsedMs)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              data-testid="recording-status-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: STATUS_TONE_COLOR[recorderStatusTone(phase)],
                // Recording: a smooth 1s pulse. Paused: the phone's hard blink (its Easing.steps).
                // Idle: invisible, as the phone fades it to opacity 0 (TimerCard.tsx:114).
                opacity: phase === 'idle' || phase === 'stopped' ? 0 : 1,
                // Gated: an infinite loop is exactly what the preference is about, and the
                // colour + READY/REC/PAUSED text carry the state without it.
                animation: reduceMotion
                  ? undefined
                  : phase === 'recording'
                    ? 'blinkDot 1s ease-in-out infinite'
                    : phase === 'paused'
                      ? 'blinkDot 1.4s steps(1,end) infinite'
                      : undefined,
              }}
            />
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: STATUS_TONE_COLOR[recorderStatusTone(phase)] }}>
              {recorderStatusLabel(phase)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(30,58,95,0.3)' }}>
          <span style={monoLabel}>
            {format.sampleRate ?? '—'} <span style={{ color: '#7a9fc4' }}>/ {format.channels ?? '—'}</span>
          </span>
          <span style={monoLabel}>{timeOfDay}</span>
          <span style={monoLabel}>{format.codec ?? '—'}</span>
        </div>
      </div>

      {/* Waveform monitor — phone SpectrumVisualizer.tsx, whose own container is
          `borderRadius: Layout.borderRadius.lg` (`:361`) — 12, not 16. Same deletion as the
          timer card above; `partner-legwork-w3.md` W3-C7 found both spread-overrides and
          A43's radius-16 card sweep is what they belong to.
          DEF-UI-008's carve-out is untouched: the panel keeps its own `flex: 1` and the bars
          keep their gradients — only the corner moves. */}
      <div style={{ ...glassCard, position: 'relative', flex: 1, minHeight: 150, margin: '0 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, color: colors.textSecondary }}>WAVEFORM MONITOR</span>
          {meter.available ? (
            <span
              data-testid="waveform-live-dot"
              style={{ width: 6, height: 6, borderRadius: 3, background: '#2B8CC1', animation: reduceMotion || phase !== 'recording' ? undefined : 'blinkDot 2s ease-in-out infinite' }}
            />
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.4, color: '#7a6a3a' }}>NO LIVE INPUT</span>
          )}
        </div>

        <div data-testid="waveform-bars" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: BAR_GAP, padding: '8px 16px' }}>
          <div style={{ position: 'absolute', left: 16, right: 16, top: '48%', height: 1, background: meter.available ? 'rgba(43,140,193,0.2)' : 'rgba(153,186,221,0.08)' }} />
          {meter.bars.map((value, index) => (
            <Bar key={index} value={value} live={meter.available} paused={phase === 'paused'} reduceMotion={reduceMotion} />
          ))}
        </div>

        {/* Decoration, wired to nothing — exactly as on the phone. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 10px' }} aria-hidden>
          {RECORDER_SCALE_LABELS.map((label) => (
            <span key={label} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: 1, color: colors.textSecondary, opacity: 0.5 }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Level meter — phone LevelMeter.tsx, visible only while active */}
      {active && (
        <div data-testid="level-meter" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 20px 0' }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1, color: colors.textSecondary }}>LEVEL</span>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(30,58,95,0.5)', overflow: 'hidden' }}>
            <div
              data-testid="level-fill"
              style={{ height: '100%', borderRadius: 2, width: `${Math.round(meter.level * 100)}%`, background: LEVEL_BAND_COLOR[levelFillBand(meter.level)], transition: reduceMotion ? undefined : 'width 120ms linear' }}
            />
          </div>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#7a9fc4', minWidth: 48, textAlign: 'right' }}>
            {meter.available ? levelDbLabel(meter.level) : '—'}
          </span>
        </div>
      )}

      {/* D19 hand-back, the recorder's half: U3.3 built `Banner` and handed this file's PAIR
          here. A71 — one severity callout, and the fill goes OPAQUE (`*Light`) because that is
          the only ground the `*OnLight` foregrounds are measured against (`Banner.tsx:11-16`). */}
      {notice !== null && <Banner severity="info" message={notice} style={{ margin: '12px 20px 0' }} />}

      {failure !== null && (
        /* Dismiss sits BESIDE the Banner, not inside it — a Banner is a status line, not a
           layout slot, and it has never had a dismiss affordance in any phone revision
           (`Banner.tsx`'s docblock). The row is the phone's own `errorBannerRow`
           (`export-hub/ExportHub.tsx:278-282` + `:185-194`): flex row, `alignItems: center`,
           `gap: Layout.spacing.md`, the Banner at `flex: 1`, and a `secondary`/`small` Button
           next to it. That also replaces the bare transparent text link this screen had. */
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, margin: '12px 20px 0' }}>
          <Banner severity="error" message={failure} style={{ flex: 1 }} />
          <button
            type="button"
            onClick={props.onDismissFailure}
            style={buttonStyle({ variant: 'secondary', size: 'small' })}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={{ padding: '16px 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {mode === 'sample' ? (
          <>
            <div style={{ fontSize: 12, color: '#ff8a93', lineHeight: 1.5, textAlign: 'center' }}>{props.sampleNotice}</div>
            <button type="button" onClick={props.onUseSample} style={{ ...sampleButton }}>
              Attach a sample audio note
            </button>
          </>
        ) : mode === 'live' ? (
          <>
            {stopBlocked && (
              <div id={blockedId} role="status" style={{ fontSize: 11, color: '#7a9fc4' }}>
                Stop unlocks after half a second of recording.
              </div>
            )}
            <RecordButton
              phase={phase}
              reduceMotion={reduceMotion}
              blocked={stopBlocked}
              describedBy={stopBlocked ? blockedId : undefined}
              onPress={active ? props.onStop : props.onStart}
            />
            {active && (
              <div style={{ display: 'flex', gap: 12 }}>
                {phase === 'recording' ? (
                  <PillButton label="Pause" tint="#f0f4f8" borderColor="rgba(43,140,193,0.25)" onPress={props.onPause} icon={<PauseIcon />} />
                ) : (
                  <PillButton label="Resume" tint="#10d177" borderColor="rgba(16,209,119,0.25)" onPress={props.onResume} icon={<PlayIcon />} />
                )}
                <PillButton
                  label="Stop"
                  tint="#ff4757"
                  borderColor="rgba(255,71,87,0.2)"
                  onPress={props.onStop}
                  blocked={stopBlocked}
                  describedBy={stopBlocked ? blockedId : undefined}
                  icon={<StopIcon />}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#7a9fc4', lineHeight: 1.5, textAlign: 'center' }}>
              {mode === 'connecting'
                ? 'Opening the microphone…'
                : 'The recorder needs the microphone. Your browser will ask before it opens.'}
            </div>
            <button
              type="button"
              onClick={props.onEnableMicrophone}
              aria-disabled={mode === 'connecting'}
              style={{ ...sampleButton, opacity: mode === 'connecting' ? 0.5 : 1, cursor: mode === 'connecting' ? 'default' : 'pointer' }}
            >
              Enable microphone
            </button>
          </>
        )}
      </div>
    </Shell>
  )
}

// ---- pieces ---------------------------------------------------------------

/** The full-screen launch surface + the phone's CRT scan-line overlay. The phone stacks 200
 *  1px Views at 3px spacing (`CrtOverlay.tsx`); one repeating gradient at the same 4px period
 *  and the same 0.03 opacity is the identical picture without 200 nodes. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 0 0', display: 'flex', flexDirection: 'column' }}>
      <div
        aria-hidden
        data-testid="crt-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.03,
          backgroundImage: 'repeating-linear-gradient(180deg,#99badd 0 1px,transparent 1px 4px)',
        }}
      />
      {children}
    </div>
  )
}

/** One spectrum column: the bar above the centre line and the phone's dimmed reflection below
 *  it (`SpectrumVisualizer.tsx:92-118`). */
function Bar({
  value,
  live,
  paused,
  reduceMotion,
}: {
  value: number
  live: boolean
  paused: boolean
  reduceMotion: boolean
}) {
  const color = !live
    ? 'rgba(153,186,221,0.2)'
    : paused
      ? 'rgba(255,217,61,0.45)'
      : 'rgba(43,140,193,0.65)'
  // `scaleY` on a full-height box, not an animated `height` (review R-20). The old shape
  // re-ran style + layout + paint for 80 nodes every 60ms tick, for the whole take, beside a
  // live recorder and an AudioContext; a transform is composited, so the same picture costs
  // the compositor alone. The factors are the previous percentages over the same half-box
  // (46% / 18%), so the geometry is unchanged — this is a rendering change, not a restyle.
  const scale = Math.max(0.02, value * 0.46)
  const reflection = Math.max(0.01, value * 0.18)
  const glide = reduceMotion ? undefined : 'transform 90ms linear'
  return (
    <div style={{ width: BAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div
          data-testid="waveform-bar"
          style={{ width: '100%', height: '100%', background: color, borderRadius: 1, transform: `scaleY(${scale})`, transformOrigin: 'bottom', transition: glide }}
        />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
        <div
          style={{ width: '100%', height: '100%', background: color, opacity: 0.3, borderRadius: 1, transform: `scaleY(${reflection})`, transformOrigin: 'top', transition: glide }}
        />
      </div>
    </div>
  )
}

/** The oversized morphing record/stop control (`RecordButton.tsx`): a light circle when idle,
 *  a small red square while recording, a full red circle while paused. */
function RecordButton({
  phase,
  reduceMotion,
  blocked,
  describedBy,
  onPress,
}: {
  phase: RecordingPhase
  reduceMotion: boolean
  blocked: boolean
  describedBy: string | undefined
  onPress(): void
}) {
  const active = phase === 'recording' || phase === 'paused'
  const inner: CSSProperties = active
    ? { width: phase === 'recording' ? 30 : 64, height: phase === 'recording' ? 30 : 64, borderRadius: phase === 'recording' ? 7 : 32, background: '#ff4757' }
    : { width: 64, height: 64, borderRadius: 32, background: '#e8edf2' }
  return (
    <button
      type="button"
      // Phone verbatim (RecordButton.tsx:162-168).
      aria-label={active ? 'Stop recording' : 'Start recording'}
      aria-disabled={blocked}
      aria-describedby={describedBy}
      // aria-disabled, not `disabled`: the demo's convention keeps a refused control focusable
      // so a keyboard user can land on it and hear WHY. The refusal lives in the handler.
      onClick={() => {
        if (blocked) return
        onPress()
      }}
      style={{
        position: 'relative',
        width: 90,
        height: 90,
        borderRadius: 45,
        border: GLASS.borderSoft,
        background: GLASS.gradientCard,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.55 : 1,
      }}
    >
      <span style={{ ...inner, transition: reduceMotion ? undefined : 'width 320ms ease, height 320ms ease, border-radius 320ms ease' }} />
    </button>
  )
}

/** The glass pill controls (`GlassPillButton.tsx`). Named by their visible text — see the
 *  deviation note at the top of this file. */
function PillButton({
  label,
  tint,
  borderColor,
  icon,
  onPress,
  blocked = false,
  describedBy,
}: {
  label: string
  tint: string
  borderColor: string
  icon: ReactNode
  onPress(): void
  blocked?: boolean
  describedBy?: string
}) {
  return (
    <button
      type="button"
      aria-disabled={blocked}
      aria-describedby={describedBy}
      onClick={() => {
        if (blocked) return
        onPress()
      }}
      style={{
        height: 42,
        padding: '0 22px',
        borderRadius: 21,
        border: `1px solid ${borderColor}`,
        background: GLASS.gradientCard,
        color: tint,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 500,
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.3 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

const pillButton: CSSProperties = {
  padding: '11px 26px',
  borderRadius: 10,
  border: GLASS.borderBtn,
  background: 'transparent',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

/** The second site of the demo-only tinted-fill recipe documented at
 *  `OcrCaptureScreen.tsx`'s `panelButton`. `outline` + the wash, never a sixth variant. */
const sampleButton: CSSProperties = {
  width: '100%',
  ...buttonStyle({ variant: 'outline' }),
  background: SAMPLE_TINT,
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5l11 7-11 7z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

function MicOffIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.11 1.23M12 19v3" />
      <path d="M2 2l20 20" />
    </svg>
  )
}
