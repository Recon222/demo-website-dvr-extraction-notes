'use client'

import { useCallback, useRef, useState, type CSSProperties } from 'react'

import {
  formatDuration,
  formatFileSize,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media'
import { GLASS, glassBtnPrimary, glassBtnSecondary, glassCard } from '@/features/demo/ui/glass-tokens'

/**
 * Review Audio (parity P4.6, matrix row 69) — the phone's `AudioPreview.tsx`: a player card
 * with a 72px play control, a seekable progress bar, elapsed/total times and a file-info row,
 * then Record Again / Save Audio.
 *
 * ── The auto-reset decision (plan §5 P4.6 asks for this one deliberately) ────────────────
 * The phone's `expo-audio` player does not rewind when playback finishes — its ui-mapping
 * calls that a library quirk (10-audio.md:165) — and `AudioPreview.handlePlayPause` works
 * around it by seeking to 0 when the head is within 0.1s of the end.
 *
 * This port does NOT auto-reset either, and that is a decision on the merits rather than an
 * inherited quirk:
 * - a finished take should still READ as finished. The bar sitting full is information
 *   ("you have heard all of this"); snapping it to zero makes a played clip look untouched;
 * - `HTMLMediaElement` behaves the same way natively — `ended` leaves `currentTime` at the
 *   duration — so auto-resetting would be the deviation here, not the parity;
 * - the part of the phone's behaviour that actually matters to a visitor is that pressing
 *   Play at the end replays instead of doing nothing. THAT is ported verbatim, including the
 *   0.1s tolerance, so the control is never dead.
 * Recorded in `docs/code-reviews/deferred.md` §61.
 */

/** Phone `AudioPreview.tsx:106` — treat "within 0.1s of the end" as finished, because a
 *  media element rarely lands exactly on its own duration. */
const END_TOLERANCE_SEC = 0.1

export interface AudioPreviewScreenProps {
  captured: CapturedMedia
  /** The filename this take will be stored under, extension included. Displayed so the
   *  visitor can see what is being written — P4.4 replaces it with an editable field. */
  filename: string
  /** An informational line carried over from the recorder (today: the 1-hour auto-stop, which
   *  lands the visitor HERE without them pressing anything — an unexplained screen change is a
   *  silent event). Not a failure; never the red treatment. */
  notice: string | null
  onSave(): void
  onRecordAgain(): void
  onCancel(): void
}

export function AudioPreviewScreen({ captured, filename, notice, onSave, onRecordAgain, onCancel }: AudioPreviewScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [elementDuration, setElementDuration] = useState<number | null>(null)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)

  /**
   * Total length. The RECORDED figure leads and the element's own `duration` is the fallback,
   * which is the opposite of the obvious order for a good reason: a `MediaRecorder` WebM blob
   * reports `duration: Infinity` until it has been seeked, so trusting the element first would
   * put `Infinity` in the time row of most live takes. `durationSec` came from the recording
   * state machine and is always a real number.
   */
  const totalSec =
    captured.durationSec ?? (elementDuration !== null && Number.isFinite(elementDuration) ? elementDuration : 0)

  const togglePlay = useCallback(() => {
    const element = audioRef.current
    if (!element) return
    if (playing) {
      element.pause()
      return
    }
    // The phone's replay guard (AudioPreview.tsx:106-109), ported: at the end, rewind first so
    // the control is never dead.
    if (totalSec > 0 && element.currentTime >= totalSec - END_TOLERANCE_SEC) {
      element.currentTime = 0
      setCurrentTime(0)
    }
    const started = element.play()
    // `play()` returns a promise in browsers and `undefined` in jsdom. A rejection is a real
    // refusal (an autoplay policy, a decode failure) and gets said out loud — never swallowed
    // into a play button that silently does nothing.
    if (started && typeof started.catch === 'function') {
      started.catch(() => setPlaybackBlocked(true))
    }
  }, [playing, totalSec])

  const seek = useCallback((seconds: number) => {
    const element = audioRef.current
    if (element) element.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Phone title verbatim (AudioRecordingFlow.tsx:130). */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8' }}>Review Audio</div>
        <button
          type="button"
          // The phone's label here is "Exit form" — it names the wizard form this screen sits
          // inside on the device. The demo reaches the recorder as a launch surface, not a
          // wizard step, so the label names what leaving actually does.
          aria-label="Exit audio recording"
          onClick={onCancel}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={{ ...glassCard, padding: '20px 16px 14px', marginBottom: 14 }}>
        <audio
          ref={audioRef}
          data-testid="audio-element"
          src={captured.url}
          preload="metadata"
          onPlay={() => {
            setPlaying(true)
            setPlaybackBlocked(false)
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setElementDuration(event.currentTarget.duration)}
        />

        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
          <button
            type="button"
            aria-label={playing ? 'Pause audio' : 'Play audio'}
            onClick={togglePlay}
            style={{ width: 72, height: 72, borderRadius: 36, border: 'none', background: GLASS.gradientAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {playing ? (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                <path d="M8 5l11 7-11 7z" />
              </svg>
            )}
          </button>
        </div>

        {/* The phone builds a touchable track with accessibilityRole="adjustable" and explicit
            increment/decrement actions. A range input IS that control on the web: it announces
            as a slider and comes with arrow-key seeking, so the phone's two custom a11y
            actions are native behaviour here rather than hand-rolled. */}
        <input
          type="range"
          aria-label="Audio progress"
          aria-valuetext={`${formatDuration(currentTime * 1000)} of ${formatDuration(totalSec * 1000)}`}
          min={0}
          max={totalSec > 0 ? totalSec : 0}
          step={0.1}
          value={Math.min(currentTime, totalSec)}
          disabled={totalSec <= 0}
          onChange={(event) => seek(Number(event.currentTarget.value))}
          style={{ width: '100%', accentColor: '#2B8CC1', cursor: totalSec > 0 ? 'pointer' : 'default' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span data-testid="audio-elapsed" style={timeText}>
            {formatDuration(currentTime * 1000)}
          </span>
          <span data-testid="audio-total" style={timeText}>
            {formatDuration(totalSec * 1000)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(30,58,95,0.4)' }}>
          <span style={infoText}>Duration: {formatDuration(totalSec * 1000)}</span>
          {/* Absent on sample captures by design (§58f) — nothing measured those files at
              runtime, so a byte count here would be a number nobody verified. */}
          <span style={infoText}>{captured.sizeBytes === undefined ? 'Size not measured' : formatFileSize(captured.sizeBytes)}</span>
        </div>
      </div>

      {captured.sample && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#ffd07a', background: 'rgba(255,200,90,0.12)', border: '1px solid rgba(255,200,90,0.3)', borderRadius: 6, padding: '1px 6px' }}>
            Sample
          </span>
          <span style={{ fontSize: 11, color: '#9fc0db', lineHeight: 1.45 }}>
            A bundled sample note — no microphone was used to make this.
          </span>
        </div>
      )}

      {notice !== null && (
        <div role="status" style={{ borderRadius: 12, border: GLASS.borderAccent, background: 'rgba(43,140,193,0.08)', padding: '12px 14px', marginBottom: 14, fontSize: 12, color: '#9fd4ee', lineHeight: 1.5 }}>
          {notice}
        </div>
      )}

      {playbackBlocked && (
        <div role="alert" style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: '12px 14px', marginBottom: 14, fontSize: 12, color: '#ff8a93', lineHeight: 1.5 }}>
          The browser refused to start playback. The recording itself is unaffected — it is still here and still saveable.
        </div>
      )}

      {/* SEAM(P4.4): MetadataForm inserts between preview-accept and addMedia — the filename +
          notes fields belong HERE, between the player card and the action row (phone content
          order, ui-mapping 10-audio.md:139). Until then the flow supplies a default base name
          and an empty caption, and the line below shows what will actually be written. Save is
          ungated because there is nothing yet for the visitor to get wrong; P4.4 restores the
          phone's "Save Audio disabled until the filename is valid" gate along with the form. */}
      <div style={{ fontSize: 11, color: '#7a9fc4', marginBottom: 14 }}>
        Saves as <span style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", color: '#cdd9e6' }}>{filename}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button type="button" onClick={onRecordAgain} style={{ flex: 1, padding: 14, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Record Again
        </button>
        <button type="button" onClick={onSave} style={{ flex: 1, padding: 14, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Save Audio
        </button>
      </div>
    </div>
  )
}

const timeText: CSSProperties = {
  fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
  fontSize: 11,
  color: '#7a9fc4',
}

const infoText: CSSProperties = { fontSize: 11, color: '#7a9fc4' }
