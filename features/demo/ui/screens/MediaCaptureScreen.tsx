'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'

import {
  CAPTURE_PERMISSION_COPY,
  captureFailureMessage,
  defaultCaptureBasename,
  formatDuration,
  isValidFilename,
  mediaFilename,
  selectCaptureDevice,
  suggestedFilenameBase,
  type CapturedMedia,
  type CapturePermission,
} from '@/features/demo/engine/logic/media'
import { glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import type { FrameGrabOptions } from '@/features/demo/ui/inputs/capture-media'
import { MetadataForm, type MetadataFormValue } from '@/features/demo/ui/inputs/MetadataForm'
import { useMediaCapture, type UseMediaCaptureOptions } from '@/features/demo/ui/inputs/useMediaCapture'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * Photo/video capture (parity P4.3, matrix rows 49–55; phone `MediaCaptureFlow` +
 * `VisionCameraScreen` + `PermissionsView` + `ModeToggle` + `CaptureButton` +
 * `RecordingIndicator` + `PhotoPreview` + `VideoPreview`, ui-mapping 09).
 *
 * A LAUNCH-only screen: the drawer's Capture Media row (P4.2) is the only way in, and
 * `closeLaunch` returns the visitor to the wizard step they came from. Presentational and
 * callback-driven — it never touches the store. The capability comes from `useMediaCapture`
 * (P4.1), exactly as `CameraGpsCapture` composes `useGpsCapture` directly.
 *
 * ── The three camera states, and why they are not the phone's three ─────────────────────────
 * The phone gates on `hasPermissions` (camera AND microphone, two OS permissions) and on
 * `useCameraDevice(position)` returning a device. A browser answers for both facilities in ONE
 * `getUserMedia` prompt and has a state the phone does not: `unavailable`, where the page was
 * never given a capture API at all. So:
 *
 * - `prompt` / `denied` → the phone's full-screen replacement (`PermissionsView`), headline
 *   verbatim, remedy sentence browser-corrected (deferred §58b), ONE grant control because
 *   there is only one prompt to fire.
 * - `unavailable` → the OCR screen's precedent: the camera chrome stays, the viewfinder is
 *   replaced by an honest "no camera" panel, and the shutter attaches a bundled SAMPLE. Its
 *   headline is the phone's own "No camera device available" (`VisionCameraScreen.tsx:497`,
 *   through `captureFailureMessage`). This is the DEFAULT path under Vitest, which leaves
 *   `navigator.mediaDevices` undefined on purpose.
 * - `granted` → the live viewfinder.
 *
 * ── Object-URL ownership ────────────────────────────────────────────────────────────────────
 * A capture's `blob:` URL belongs to the hook's registry and is revoked when this screen
 * unmounts. `handOff()` is called ONLY after `onSave` reports the store took the item —
 * a save that could not happen must still have its bytes released.
 *
 * ── The review stage names the file ─────────────────────────────────────────────────────────
 * `ReviewStage` embeds the shared `MetadataForm` (P4.4) between the preview and the action row
 * and owns its value, so `onSave` carries the VISITOR's filename base and caption rather than a
 * default. Save is gated on the phone's rule (trimmed 1–100), derived here from the engine
 * predicate instead of the phone's `onValidChange` push.
 */

export type CaptureMode = 'photo' | 'video'

export interface SaveMediaRequest {
  captured: CapturedMedia
  /** The visitor's filename WITHOUT an extension — `buildMediaItem`/`mediaFilename` add the
   *  real container's. */
  filename: string
  caption: string
}

/** Test seams. Extends the hook's own with the canvas factory the photo grab needs (jsdom's
 *  canvas returns no 2d context, so a live-photo test has to hand one in). */
export interface MediaCaptureScreenDeps extends NonNullable<UseMediaCaptureOptions['deps']> {
  createCanvas?: FrameGrabOptions['createCanvas']
}

export interface MediaCaptureScreenProps {
  /** Close the launch screen (drawer entry → `closeLaunch`). */
  onCancel(): void
  /**
   * Hand the capture to the bridge. Returns whether the store TOOK it: `false` (no location
   * open) leaves the object URL owned here so the unmount sweep frees it.
   */
  onSave(request: SaveMediaRequest): boolean
  deps?: MediaCaptureScreenDeps
}

// ---- Chrome -----------------------------------------------------------------

const shell: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 40,
  background: '#05080d',
  overflow: 'hidden',
}

const topControls: CSSProperties = {
  position: 'absolute',
  top: 44,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0 16px',
  zIndex: 4,
}

/** Phone `controlButton`: 48×48 circle on a 40%-black scrim (`VisionCameraScreen.tsx:637-644`). */
const controlButton: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 24,
  background: 'rgba(0,0,0,0.4)',
  border: 'none',
  color: '#fff',
  fontSize: 20,
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
}

const bottomControls: CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '18px 20px 26px',
  background: 'linear-gradient(0deg,rgba(0,0,0,0.88),transparent)',
  zIndex: 4,
}

const mainRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingLeft: 20,
  paddingRight: 20,
}

/** Phone `ModeToggle` container: pill on a 50%-black scrim (`ModeToggle.tsx:179-184`). */
const modePill: CSSProperties = {
  display: 'inline-flex',
  background: 'rgba(0,0,0,0.5)',
  borderRadius: 20,
  padding: 4,
  marginBottom: 18,
}

const modeOption = (active: boolean, disabled: boolean): CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 16,
  border: 'none',
  background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
  fontSize: 16,
  fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

const panelTitle: CSSProperties = { fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 12, textAlign: 'center' }
const panelBody: CSSProperties = {
  fontSize: 15,
  color: 'rgba(255,255,255,0.7)',
  textAlign: 'center',
  lineHeight: 1.5,
  maxWidth: 300,
}
const noticeLine: CSSProperties = { fontSize: 12, lineHeight: 1.45, marginBottom: 10 }
const label12: CSSProperties = { fontSize: 12, color: '#7a9fc4' }

// ---- Screen -----------------------------------------------------------------

export function MediaCaptureScreen({ onCancel, onSave, deps }: MediaCaptureScreenProps) {
  const [mode, setMode] = useState<CaptureMode>('photo')
  /** The phone's `isCapturing`: an in-flight grab or stop, which disables the shutter. */
  const [busy, setBusy] = useState(false)
  const [maxDurationHit, setMaxDurationHit] = useState(false)
  const reduceMotion = useReducedMotion()

  const blockedIdBase = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const onMaxDuration = useCallback(() => setMaxDurationHit(true), [])

  // `withAudio` is unconditional, not `mode === 'video'`: the phone opens its Camera with
  // `audio={microphonePermission.hasPermission}` regardless of mode (ui-mapping 09), and
  // re-opening the stream on every mode flip would re-prompt and drop frames. A machine with
  // no microphone still gets a (silent) camera through P4.1's degradation ladder, flagged by
  // `audioDegraded` — which video mode surfaces rather than swallows (§58e).
  const capture = useMediaCapture({ facility: 'camera', withAudio: true, onMaxDuration, deps })
  const {
    permission,
    stream,
    audioDegraded,
    devices,
    deviceFailure,
    selectedDeviceId,
    isOpening,
    open,
    close,
    selectDevice,
    capability,
    failure,
    clearFailure,
    capturePhoto,
    phase,
    elapsedMs,
    canStop,
    startRecording,
    stopRecording,
    captureSample,
    captured,
    discard,
    handOff,
  } = capture

  const isRecording = phase === 'recording' || phase === 'paused'

  // Point the <video> at the live stream. Assigning `srcObject` is the only way to render a
  // MediaStream; jsdom implements no setter, where the assignment is an inert expando.
  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    element.srcObject = stream
    return () => {
      element.srcObject = null
    }
  }, [stream])

  /**
   * Release the hardware while a capture is under review (review R-7).
   *
   * The phone's camera is `isActive={isFocused}` and `MediaCaptureFlow` swaps the whole screen
   * for `PhotoPreview`/`VideoPreview`, so the sensor is idle the moment the review is up. Here
   * the review is a sibling branch of the same component and the stream would otherwise stay
   * open for the entire naming-and-deciding window — camera LED and tab indicator lit, with
   * nothing rendering the frames, which is exactly the state `useCaptureStream` names as the
   * thing to avoid. `withAudio` is unconditional (§58e/§60d), so the microphone track is held
   * too: a live mic behind a filename field is the worse half of this.
   *
   * Same effect `OcrCaptureScreen` runs for its confirm stage, latch included: only the stream
   * WE closed is reopened, so a sample-path visitor — who never had one — is never met with a
   * surprise permission prompt on Retake. `stopRecording` resolves its capture before this
   * fires, so there is no ordering hazard with the recorder.
   *
   * The reopen is PINNED to the device the visitor chose (review FD-3). `close()` deliberately
   * leaves `selectedDeviceId` intact, so a bare `open()` would re-acquire the browser default
   * and the caption underneath would silently follow it — the visitor's Switch-camera choice
   * undone by a Retake, with nothing saying so. Pinning is `exact` inside `captureConstraints`,
   * which is the point: a camera unplugged during review now fails loudly as `NO_DEVICE` and
   * routes to the honest unavailable panel, rather than quietly opening a different lens.
   */
  const reopenAfterReviewRef = useRef(false)
  useEffect(() => {
    if (captured) {
      if (stream) {
        reopenAfterReviewRef.current = true
        close()
      }
    } else if (reopenAfterReviewRef.current) {
      reopenAfterReviewRef.current = false
      void open(selectedDeviceId ?? undefined)
    }
  }, [captured, stream, close, open, selectedDeviceId])

  const runBusy = useCallback(async (work: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await work()
    } finally {
      // The screen can unmount mid-grab (Cancel, or the drawer re-navigating); the hook's own
      // abort handles its state, this guards ours.
      if (aliveRef.current) setBusy(false)
    }
  }, [])

  // R-3: the answer for THIS mode, not one boolean for the whole screen. A browser with
  // `getUserMedia` but no `MediaRecorder` (Safari ≤ 14.0, hardened WebViews) takes photos for
  // real and can only attach a sample clip — the old `capability.sampleOnly` said "live" for
  // both, so every video press printed "This browser doesn't expose a camera to this page"
  // while the camera rendered behind the words.
  const modeIsSample = capability.modeFor(mode) === 'sample'

  /**
   * An acquisition is in flight and this mode needs the stream it will produce (review FD-4).
   *
   * The window R-7 opened: after Retake (and after a device switch) `permission` is still
   * `granted` while `stream` is momentarily `null`. A live shutter press in there grabs from a
   * `<video>` with no `srcObject` — the frame-grab sentence, wrong cause — or, in video mode,
   * reaches `startRecording` with nothing to record and prints "This browser doesn't expose a
   * camera to this page": R-3's exact sentence, re-entering through a new door. Transient and
   * self-correcting, but it is the wrong-cause copy this round spent two fixes deleting.
   *
   * Gated on `!modeIsSample` deliberately: attaching a bundled sample needs no stream, so
   * refusing it here would be a refusal with no cause behind it.
   */
  const reopening = isOpening && !modeIsSample

  const onShutter = useCallback(() => {
    if (busy) return
    if (modeIsSample) {
      captureSample(mode)
      return
    }
    // Every path below this line needs the live stream.
    if (isOpening) return
    if (mode === 'photo') {
      const element = videoRef.current
      if (!element) return
      void runBusy(() => capturePhoto(element, deps?.createCanvas ? { createCanvas: deps.createCanvas } : {}))
      return
    }
    if (!isRecording) {
      setMaxDurationHit(false)
      startRecording()
      return
    }
    // Gated on `canStop` (the shared 500 ms engine gate) rather than the phone's always-live
    // Stop: a browser `MediaRecorder` stopped before its first `dataavailable` assembles ZERO
    // bytes, which P4.1 correctly reports as RECORDING_FAILED. Refusing the guaranteed failure
    // beats showing the visitor an error they could not have avoided.
    if (!canStop) return
    void runBusy(stopRecording)
  }, [
    busy,
    canStop,
    isOpening,
    modeIsSample,
    capturePhoto,
    captureSample,
    deps?.createCanvas,
    isRecording,
    mode,
    runBusy,
    startRecording,
    stopRecording,
  ])

  const onRetake = useCallback(() => {
    setMaxDurationHit(false)
    discard()
  }, [discard])

  const onAccept = useCallback(
    (meta: MetadataFormValue) => {
      if (!captured) return
      const accepted = onSave({ captured, filename: meta.filename, caption: meta.caption })
      // Ownership passes to the store ONLY on a real save. A refused save leaves the URL owned
      // here so the unmount sweep frees it, instead of pinning bytes nothing can reach.
      if (accepted) handOff()
    },
    [captured, handOff, onSave],
  )

  /**
   * The shutter's refusals, stated rather than silent (review R-9).
   *
   * `aria-disabled` + a `role="status"` reason, not the `disabled` attribute — the demo's
   * convention (§44b / R-15, and the sibling `AudioRecorderScreen`'s two stop affordances).
   * A `disabled` applied to the control the visitor JUST pressed is the failure shape this repo
   * already documents: pressing Start blurs the page to `<body>`, and half a second later the
   * shutter re-enables with focus lost, so a keyboard or screen-reader user meets a dead button
   * that never says why.
   */
  const stopBlocked = mode === 'video' && isRecording && !canStop
  // `reopening` heads the ladder (FD-4): while the stream is being re-acquired every live
  // operation would fail for a reason that has nothing to do with what the visitor pressed, so
  // the refusal is stated here rather than discovered as a wrong-cause error afterwards.
  const shutterBlockedReason = reopening
    ? 'Reopening the camera…'
    : stopBlocked
      ? 'Stop unlocks after half a second of recording.'
      : busy
        ? 'Finishing the last capture…'
        : null
  const shutterBlockedId = `${blockedIdBase}-shutter-blocked`

  const onSwitchDevice = useCallback(() => {
    if (devices.length < 2) return
    const index = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const next = devices[(index + 1 + devices.length) % devices.length] ?? devices[0]
    void selectDevice(next.deviceId)
  }, [devices, selectedDeviceId, selectDevice])

  // ---- Review stage ---------------------------------------------------------

  if (captured) {
    return (
      <ReviewStage
        captured={captured}
        sampleNotice={capability.sampleNotice}
        maxDurationHit={maxDurationHit}
        onRetake={onRetake}
        onAccept={onAccept}
        onExit={onCancel}
      />
    )
  }

  // ---- Permission stage (phone parity: replaces the camera entirely) --------

  if (permission === 'prompt' || permission === 'denied') {
    return (
      <PermissionStage
        permission={permission}
        isOpening={isOpening}
        failure={failure ? failure.message : null}
        onGrant={() => void open()}
        onCancel={onCancel}
      />
    )
  }

  // ---- Camera stage (live, or the honest sample panel) ----------------------

  const selected = selectCaptureDevice(devices, selectedDeviceId)

  return (
    <div style={shell}>
      {/* Gated on the PERMISSION, not on `sampleOnly`: a browser that has a camera but no
          object-URL support is sample-only too, and telling that visitor "no camera device
          available" while a live viewfinder sits behind the words would be simply false. */}
      {permission === 'unavailable' ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            background: `radial-gradient(ellipse at center,${colors.background},#05080d)`,
          }}
        >
          {/* Phone verbatim (VisionCameraScreen.tsx:497), through the single copy site. */}
          <div style={panelTitle}>{captureFailureMessage('NO_DEVICE', 'camera')}</div>
          <div style={panelBody}>{CAPTURE_PERMISSION_COPY.camera.unavailableBody}</div>
        </div>
      ) : (
        <video
          ref={videoRef}
          aria-label="Live camera preview"
          autoPlay
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* No `aria-live` on the badge (review R-16). The phone's `RecordingIndicator` sets
          `accessibilityLiveRegion="polite"`, but a web `role="timer"` already defaults to
          `aria-live="off"` DELIBERATELY — overriding it queues one announcement per second, up
          to 3600 of them on a take that runs to the ceiling, and every genuine status change (a
          capture failure, the stop-gate reason) waits its turn behind them. The role plus a
          live `aria-label` still lets a screen-reader user read the elapsed time on demand,
          which is what the badge is for. The sibling audio timer ships silent too. */}
      {isRecording && (
        <div
          role="timer"
          aria-label={`Recording ${formatDuration(elapsedMs)}`}
          style={{ position: 'absolute', top: 54, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 5 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(0,0,0,0.6)',
              borderRadius: 20,
              padding: '8px 16px',
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: '#FF3B30',
                animation: reduceMotion ? undefined : 'blinkDot 1s ease-in-out infinite',
              }}
            />
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(elapsedMs)}
            </span>
          </div>
        </div>
      )}

      <div style={topControls}>
        <button type="button" aria-label="Close camera" onClick={onCancel} style={controlButton}>
          ✕
        </button>
      </div>

      <div style={bottomControls}>
        <div style={{ marginBottom: 4 }}>
          {failure && (
            <div style={{ ...noticeLine, color: '#ff8a93', display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{ flex: 1 }}>{failure.message}</span>
              <button
                type="button"
                onClick={clearFailure}
                style={{ background: 'transparent', border: 'none', color: '#9fd4ee', fontSize: 12, cursor: 'pointer', padding: 0 }}
              >
                Dismiss
              </button>
            </div>
          )}
          {/* An unreadable device list is NOT "there are no other cameras" — P4.1 kept the two
              apart so the picker's absence could be explained rather than just happen. */}
          {deviceFailure && <div style={{ ...noticeLine, color: '#ffd07a' }}>{deviceFailure.message}</div>}
          {mode === 'video' && audioDegraded && (
            <div style={{ ...noticeLine, color: '#ffd07a' }}>
              This browser gave the page a camera but no microphone — the take will be silent.
            </div>
          )}
          {/* R-9: the shutter's refusal, said out loud. `role="status"` so it is announced
              politely rather than interrupting, and `aria-describedby`-linked from the control
              it explains. */}
          {shutterBlockedReason && (
            <div id={shutterBlockedId} role="status" style={{ ...noticeLine, color: '#7a9fc4' }}>
              {shutterBlockedReason}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={modePill} role="group" aria-label="Capture mode">
            {(['photo', 'video'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-label={option === 'photo' ? 'Photo mode' : 'Video mode'}
                aria-pressed={mode === option}
                disabled={isRecording}
                onClick={() => {
                  if (isRecording || mode === option) return
                  setMode(option)
                }}
                style={modeOption(mode === option, isRecording)}
              >
                {option === 'photo' ? 'Photo' : 'Video'}
              </button>
            ))}
          </div>
        </div>

        <div style={mainRow}>
          <div style={{ width: 48 }} />
          <ShutterButton
            mode={mode}
            sampleOnly={modeIsSample}
            isRecording={isRecording}
            blocked={shutterBlockedReason !== null}
            describedBy={shutterBlockedReason !== null ? shutterBlockedId : undefined}
            onPress={onShutter}
          />
          {devices.length > 1 ? (
            <button
              type="button"
              aria-label="Switch camera"
              onClick={onSwitchDevice}
              disabled={isRecording}
              style={{ ...controlButton, opacity: isRecording ? 0.5 : 1 }}
            >
              ⇄
            </button>
          ) : (
            <div style={{ width: 48 }} />
          )}
        </div>

        {devices.length > 1 && selected && (
          <div style={{ ...label12, textAlign: 'center', marginTop: 10 }}>{selected.label}</div>
        )}
      </div>
    </div>
  )
}

// ---- Shutter ----------------------------------------------------------------

/**
 * The phone's `CaptureButton`: white disc in photo mode, red disc that squares off while
 * recording in video mode (`CaptureButton.tsx:112-126`).
 *
 * Its accessible name says what it will ACTUALLY do. On the sample path that is not "Take
 * photo" — it attaches a bundled file — and labelling it with the phone's string would be the
 * one thing the demo's honesty rule forbids: a control that claims a capability it does not
 * have.
 *
 * `blocked` renders `aria-disabled`, never the `disabled` attribute (R-9), so a refused shutter
 * stays focusable and carries its reason. The refusal itself is NOT duplicated here: it lives
 * once, in the parent's `onShutter`, so the guard cannot be deleted with the suite green — the
 * "refuses Stop until the take can produce bytes" test asserts the recorder was never stopped,
 * which only holds while that single guard exists.
 */
function ShutterButton({
  mode,
  sampleOnly,
  isRecording,
  blocked,
  describedBy,
  onPress,
}: {
  mode: CaptureMode
  sampleOnly: boolean
  isRecording: boolean
  blocked: boolean
  describedBy: string | undefined
  onPress(): void
}) {
  const label = sampleOnly
    ? mode === 'photo'
      ? 'Attach sample photo'
      : 'Attach sample clip'
    : mode === 'photo'
      ? 'Take photo'
      : isRecording
        ? 'Stop recording'
        : 'Start recording'

  const innerSize = mode === 'video' && isRecording ? 32 : 64
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={blocked}
      aria-describedby={describedBy}
      onClick={onPress}
      style={{
        width: 80,
        height: 80,
        borderRadius: 40,
        border: `4px solid ${mode === 'photo' ? '#CCCCCC' : '#FFFFFF'}`,
        background: mode === 'photo' ? '#FFFFFF' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: blocked ? 'not-allowed' : 'pointer',
        opacity: blocked ? 0.5 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: mode === 'video' && isRecording ? 6 : innerSize / 2,
          background: mode === 'photo' ? '#FFFFFF' : '#FF3B30',
        }}
      />
    </button>
  )
}

// ---- Permission stage -------------------------------------------------------

/** Phone `PermissionsView` (ui-mapping 09), with ONE grant control: a browser answers for the
 *  camera and the microphone in a single `getUserMedia` prompt, so two independently-grantable
 *  rows would be a control the page cannot honour. The mic half is reported after the fact by
 *  `audioDegraded`. */
function PermissionStage({
  permission,
  isOpening,
  failure,
  onGrant,
  onCancel,
}: {
  permission: Extract<CapturePermission, 'prompt' | 'denied'>
  isOpening: boolean
  failure: string | null
  onGrant(): void
  onCancel(): void
}) {
  const copy = CAPTURE_PERMISSION_COPY.camera
  const openingId = `${useId()}-opening`
  return (
    <div
      style={{
        ...shell,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 300, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={panelTitle}>{copy.title}</div>
        <div style={{ ...panelBody, marginBottom: 28 }}>
          {permission === 'denied' ? copy.deniedBody : copy.body}
        </div>

        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 0',
            marginBottom: 24,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: permission === 'denied' ? '#FF3B30' : '#ffd07a',
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1, fontSize: 16, color: '#fff' }}>Camera &amp; microphone</span>
          {/* R-9, same idiom as the shutter: `aria-disabled`, not `disabled`, so the control the
              visitor just pressed keeps focus while the browser's permission sheet is up. No
              handler guard is needed or wanted here — `useCaptureStream.open` already
              early-returns on a re-entrant call (`openingRef`), so a second press is genuinely
              idempotent rather than merely refused. */}
          <button
            type="button"
            onClick={onGrant}
            aria-disabled={isOpening}
            aria-describedby={isOpening ? openingId : undefined}
            style={{
              ...glassBtnPrimary,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: isOpening ? 'not-allowed' : 'pointer',
              opacity: isOpening ? 0.6 : 1,
            }}
          >
            {isOpening ? 'Opening…' : permission === 'denied' ? 'Try again' : 'Grant'}
          </button>
        </div>

        {isOpening && (
          <div id={openingId} role="status" style={{ ...noticeLine, color: '#7a9fc4', textAlign: 'center' }}>
            Waiting for your browser&rsquo;s camera permission&hellip;
          </div>
        )}

        {failure && (
          <div style={{ ...noticeLine, color: '#ff8a93', textAlign: 'center' }}>{failure}</div>
        )}

        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 16,
            padding: '12px 32px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ---- Review stage -----------------------------------------------------------

/**
 * Phone `PhotoPreview` / `VideoPreview` (ui-mapping 09) — titles, button labels and a11y names
 * verbatim, with `MetadataForm` between the preview and the action row, which is the phone's
 * content order (`PhotoPreview.tsx:83-122`).
 *
 * It owns the metadata state, as the phone's preview components do (`PhotoPreview.tsx:57-61`),
 * for the same reason: this component mounts once per capture and unmounts on Retake, so the
 * initialiser re-runs and a discarded take can never leave its name on the next one.
 */
function ReviewStage({
  captured,
  sampleNotice,
  maxDurationHit,
  onRetake,
  onAccept,
  onExit,
}: {
  captured: CapturedMedia
  /** Why the sample was attached — chosen by the capability's binding reason (R-3), not
   *  hard-coded. A live-camera browser that simply cannot hold a file must not be told it has
   *  no camera; that is the falsehood the unavailable panel already refuses to print. */
  sampleNotice: string
  maxDurationHit: boolean
  onRetake(): void
  onAccept(meta: MetadataFormValue): void
  onExit(): void
}) {
  const isPhoto = captured.kind === 'photo'
  // Pre-filled, unlike the phone's empty field. The phone's user is a trained analyst working a
  // scene; the demo's is a stranger, and a grey Save button over an empty required field with
  // no starting point is a dead end rather than a discipline. The value is honest either way —
  // a live capture's own timestamp, or the bundled asset's real name — and clearing it disables
  // Save exactly as the phone does, so the gate is ported, not softened.
  const [meta, setMeta] = useState<MetadataFormValue>(() => ({
    filename: suggestedFilenameBase(captured, defaultCaptureBasename(captured)),
    caption: '',
  }))
  const canSave = isValidFilename(meta.filename)

  return (
    <div
      style={{
        ...shell,
        overflowY: 'auto',
        padding: '44px 20px 24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8' }}>
          {isPhoto ? 'Review Image' : 'Review Video'}
        </div>
        <button
          type="button"
          aria-label="Exit media capture"
          onClick={onExit}
          style={{ background: 'transparent', border: 'none', color: '#cdd9e6', fontSize: 20, cursor: 'pointer', padding: 4 }}
        >
          ✕
        </button>
      </div>

      {isPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- a blob: object URL cannot go
        // through next/image, and the bundled sample is served from /public unoptimized anyway.
        <img
          src={captured.url}
          alt="Captured image preview"
          style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'contain', background: '#0a1320', borderRadius: 10 }}
        />
      ) : (
        <video
          aria-label="Video playback preview"
          src={captured.url}
          poster={captured.poster}
          controls
          style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'contain', background: '#0a1320', borderRadius: 10 }}
        />
      )}

      {!isPhoto && (
        <div style={{ ...label12, textAlign: 'center', marginTop: 8 }}>
          {/* Phone `VideoPreview.formatDuration`: '--:--' when the duration is unknown. */}
          Duration: {captured.durationSec === undefined ? '--:--' : formatDuration(captured.durationSec * 1000)}
        </div>
      )}

      {captured.sample && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 10,
            border: '1px solid rgba(255,200,90,0.3)',
            background: 'rgba(255,200,90,0.08)',
            padding: 12,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: '#ffd07a',
              background: 'rgba(255,200,90,0.12)',
              border: '1px solid rgba(255,200,90,0.3)',
              borderRadius: 6,
              padding: '1px 6px',
              marginBottom: 6,
            }}
          >
            Sample data
          </div>
          <div style={{ fontSize: 12, color: '#ffd07a', lineHeight: 1.45 }}>{sampleNotice}</div>
        </div>
      )}

      {maxDurationHit && (
        <div style={{ ...noticeLine, color: '#ffd07a', marginTop: 12 }}>
          Recording stopped at the one-hour limit — everything up to that point was kept.
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <MetadataForm
          value={meta}
          onChange={setMeta}
          mediaType={captured.kind}
          savingAs={mediaFilename(meta.filename, captured)}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 18 }}>
        <button
          type="button"
          aria-label={isPhoto ? 'Retake image' : 'Record again'}
          onClick={onRetake}
          style={{ flex: 1, padding: 14, ...glassBtnSecondary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          {isPhoto ? 'Retake' : 'Record Again'}
        </button>
        {/* `aria-disabled` + a guarded handler, not `disabled` — the established idiom for a
            refused control here (§44b / R-15 / §61b). The phone's button is genuinely disabled
            and silent about why; keeping this one focusable is what lets a keyboard visitor
            reach it, and the reason is already on screen as the field's `role="alert"`. */}
        <button
          type="button"
          aria-label={isPhoto ? 'Save image' : 'Save video'}
          aria-disabled={canSave ? undefined : true}
          onClick={() => {
            if (!canSave) return
            onAccept(meta)
          }}
          style={{
            flex: 1,
            padding: 14,
            ...glassBtnPrimary,
            fontSize: 15,
            fontWeight: 600,
            cursor: canSave ? 'pointer' : 'default',
            opacity: canSave ? 1 : 0.5,
          }}
        >
          {isPhoto ? 'Save Image' : 'Save Video'}
        </button>
      </div>
    </div>
  )
}
