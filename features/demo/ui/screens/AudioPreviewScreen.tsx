'use client'

import { useCallback, useRef, useState, type CSSProperties } from 'react'

import {
  formatDuration,
  formatFileSize,
  isValidFilename,
  mediaFilename,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media'
import { OverlayHeader } from '@/features/demo/ui/chrome/OverlayHeader'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
import { MetadataForm, type MetadataFormValue } from '@/features/demo/ui/inputs/MetadataForm'

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
  /** The filename BASE the metadata form opens pre-filled with — no extension; the form's
   *  `savingAs` line adds the real container's (§58c). */
  defaultFilenameBase: string
  /** An informational line carried over from the recorder (today: the 1-hour auto-stop, which
   *  lands the visitor HERE without them pressing anything — an unexplained screen change is a
   *  silent event). Not a failure; never the red treatment. */
  notice: string | null
  onSave(meta: MetadataFormValue): void
  onRecordAgain(): void
  onCancel(): void
}

export function AudioPreviewScreen({ captured, defaultFilenameBase, notice, onSave, onRecordAgain, onCancel }: AudioPreviewScreenProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [elementDuration, setElementDuration] = useState<number | null>(null)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  // Owned here, as the phone's `AudioPreview` owns it (`AudioPreview.tsx:92-96`): this screen
  // mounts once per take and unmounts on Record Again, so a discarded take's name cannot
  // survive onto the next one.
  const [meta, setMeta] = useState<MetadataFormValue>(() => ({ filename: defaultFilenameBase, caption: '' }))
  const canSave = isValidFilename(meta.filename)

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
      {/* SEAM(U7.2): one of `OverlayHeader`'s four adopters (A61). The phone paints this exact
          header through `FormLayout` -> `Header` (`AudioRecordingFlow.tsx:127` —
          `title="Review Audio" showExit onExit={onCancel}`), which is where the seam's 18/600
          title and its LEADING exit control come from; the ✕ used to sit trailing here.
          The shell already insets 20px, so the header supplies only its own bottom gap. */}
      <OverlayHeader
        variant="glass"
        // Phone title verbatim (AudioRecordingFlow.tsx:127).
        title="Review Audio"
        onBack={onCancel}
        // The phone's label here is "Exit form" — it names the wizard form this screen sits
        // inside on the device. The demo reaches the recorder as a launch surface, not a
        // wizard step, so the label names what leaving actually does.
        backLabel="Exit audio recording"
        style={{ marginBottom: 16 }}
      />

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

      {/* D19 hand-back: U3.3 built `Banner` and handed this screen's PAIR to U7.2, which opens
          the file anyway. Both were local recipes — a `borderAccent`/8%-wash info box and a
          `borderError`/6%-wash error box — and A71 is that there is ONE severity callout.
          The fill goes OPAQUE (`*Light`), which is the point: the phone's own reason
          (`Banner.tsx:11-16`) is that the `*OnLight` foregrounds are measured against those
          tones and a translucent wash over an unknown parent cannot be measured at all.
          `role="status"` becomes Banner's `role="alert" aria-live="polite"` — the same
          politeness, plus a severity in the accessible name that the colour never carried. */}
      {notice !== null && <Banner severity="info" message={notice} style={{ marginBottom: 14 }} />}

      {playbackBlocked && (
        <Banner
          severity="error"
          message="The browser refused to start playback. The recording itself is unaffected — it is still here and still saveable."
          style={{ marginBottom: 14 }}
        />
      )}

      {/* Between the player card and the action row — the phone's content order
          (ui-mapping 10-audio.md:139, `AudioPreview.tsx:271-278`). */}
      <MetadataForm
        value={meta}
        onChange={setMeta}
        mediaType="audio"
        savingAs={mediaFilename(meta.filename, captured)}
      />

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button type="button" onClick={onRecordAgain} style={{ flex: 1, ...buttonStyle({ variant: 'secondary' }) }}>
          Record Again
        </button>
        {/* The phone's gate (`AudioPreview.tsx:294` — `disabled={!isFormValid || isSaving}`),
            restored with the house `aria-disabled` + guarded-handler idiom (§44b / R-15 /
            §61b): the control stays focusable and the reason is already announced by the
            filename field's `role="alert"`. */}
        <button
          type="button"
          aria-disabled={canSave ? undefined : true}
          onClick={() => {
            if (!canSave) return
            onSave(meta)
          }}
          style={{
            flex: 1,
            ...buttonStyle({ disabled: !canSave }),
          }}
        >
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
