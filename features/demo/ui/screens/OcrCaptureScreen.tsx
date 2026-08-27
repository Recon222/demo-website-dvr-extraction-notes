'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { OverlayHeader } from '@/features/demo/ui/chrome/OverlayHeader'
import { CAMERA_CHROME } from '@/features/demo/ui/screens/camera-chrome'
import { buttonStyle, SAMPLE_TINT } from '@/features/demo/ui/controls/button-recipe'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { DateTimeField } from '@/features/demo/ui/screens/_shared'
import { DateDisambiguationWarning } from '@/features/demo/ui/screens/DateDisambiguationWarning'
import { isDvrDraftCommittable, type DvrDateResolution } from '@/features/demo/engine/logic/ocr'
import { OCR_BOX_HEIGHT_FRACTION, OCR_BOX_WIDTH_FRACTION, ocrCropRegion } from '@/features/demo/engine/logic/ocr-crop'
import { CAPTURE_PERMISSION_COPY, selectCaptureDevice } from '@/features/demo/engine/logic/media'
import type { OcrSampleFrame } from '@/features/demo/engine/content/seed'
import { grabVideoFrame, type FrameGrabOptions, type MediaDevicesLike } from '@/features/demo/ui/inputs/capture-media'
import { useCaptureStream } from '@/features/demo/ui/inputs/useCaptureStream'
import { disposeDvrRecognizer, recognizeDvrStrip, type OcrRecognizeFn } from '@/features/demo/ui/inputs/ocr-recognize'
import { colors } from '@/features/demo/ui/tokens/palette'

export type OcrResult =
  | {
      ok: true
      /** What OCR read, after MM/DD-vs-DD/MM resolution — the evidence line, never edited. */
      dvrTime: string
      /** `measured: false` = the fixed sample score (R-16's badge applies); `true` = the
       *  in-browser recogniser's own score for a live frame — a real number, no badge. */
      confidence: { label: string; color: string; measured: boolean }
      actual: string
      /** What the reader had to assume — drives the warning/blocker, exactly one at a time. */
      resolution: DvrDateResolution
    }
  | { ok: false; rawText: string }

/** A live frame the recogniser read — everything the bridge needs to run the same
 *  clean/parse/present path the samples use, plus the strip image for `OcrProof`. */
export interface OcrLiveRead {
  rawText: string
  /** Recogniser confidence, 0–1 (measured, unlike the sample constant). */
  confidence: number
  /** The cropped strip as a data URL — becomes `OcrProof.imageDataUrl` on commit. */
  imageDataUrl?: string
}

/** Test seams: the capture stream's own, plus the canvas factory the frame grab needs and
 *  the recogniser (jsdom has no camera, no 2d context and no wasm). */
export interface OcrCaptureScreenDeps {
  mediaDevices?: MediaDevicesLike | null
  createCanvas?: FrameGrabOptions['createCanvas']
  recognize?: OcrRecognizeFn
}

export interface OcrCaptureScreenProps {
  /** null = aim/camera stage; present = the confirm stage (parsed or failed). */
  result: OcrResult | null
  /** The operator's working DVR date/time — pre-filled from the read, editable before commit. */
  dvrDraft: string
  onChangeDvrDraft(value: string): void
  /** True once the operator has accepted the assumed date (only meaningful when
   *  `result.resolution.kind === 'assumed-date'` — R-23 replaced the flat `assumedDate` field
   *  this once named with the three-arm union). */
  dateConfirmed: boolean
  onConfirmDate(): void
  /**
   * True when extracted video scopes already exist, so committing would regenerate — and
   * discard any manual edits to — the whole list. Gates the phone's recalculate prompt.
   */
  hasExtractedScopes: boolean
  onUseSample(frame: OcrSampleFrame): void
  /** The no-camera shutter: the bridge runs the clean sample frame (the honest fallback). */
  onCapture(): void
  /** A LIVE frame was captured and recognised — the bridge cleans/parses/presents it. */
  onLiveRead(read: OcrLiveRead): void
  onCancel(): void
  onRetake(): void
  /** `regenerate: false` = the phone's "Keep My Edits" — recalculate without rebuilding scopes. */
  onConfirm(regenerate: boolean): void
  deps?: OcrCaptureScreenDeps
}

// ---- Viewfinder geometry ----------------------------------------------------

/**
 * OWNER DIRECTIVE (plan §5 P4.7, 2026-07-30): the viewfinder is LANDSCAPE — a wide frame
 * inside the portrait phone, the crop strip running across the long axis. The phone's
 * portrait-vertical guide box exists only because the operator physically rotates the phone;
 * a browser viewfinder starts wide, so the demo renders the rotated posture directly.
 */
const VIEWFINDER_ASPECT = 16 / 9

/** Size bound for the stored strip (`OcrProof.imageDataUrl` is persisted with the snapshot):
 *  1280 px is plenty for the recogniser and keeps the data URL to tens of kilobytes. */
const OCR_STRIP_MAX_WIDTH = 1280

/** Phone `IMAGE_SETTINGS.CAPTURE_QUALITY` (constants/index.ts:27): maximum quality to
 *  minimise JPEG artifacts at capture — the RECOGNISER reads this exact image. */
const OCR_CAPTURE_QUALITY = 1.0

/** The PERSISTED strip's encoding (R-15): the data URL goes into the sessionStorage
 *  snapshot, where q=1.0 costs ~2–3× the §64a byte budget for no forensic gain — the
 *  recogniser never reads this copy. 0.85 keeps the report image visually indistinguishable
 *  and the budget honest. */
const OCR_STRIP_DATAURL_QUALITY = 0.85

/** The on-screen guide box mirrors the phone's: 80% × 17% of the (visible) frame. The extra
 *  5% per-side crop buffer lands OUTSIDE the guide, exactly as on the phone — the guide shows
 *  the aim, the crop forgives the hands (`ocr-capture-service.ts:65-70`). */
const STRIP_TOP = `${(((1 - OCR_BOX_HEIGHT_FRACTION) / 2) * 100).toFixed(1)}%`
const STRIP_SIDE = `${(((1 - OCR_BOX_WIDTH_FRACTION) / 2) * 100).toFixed(1)}%`

const corner = (pos: CSSProperties): CSSProperties => ({ position: 'absolute', width: 14, height: 14, ...pos })

const label12: CSSProperties = { fontSize: 12, color: '#7a9fc4' }
const mono = "var(--font-jbmono),'JetBrains Mono',monospace"
// SEAM(U7.2): the mask outside the guide box. The ALPHA is the phone's
// (`ocr-time-capture/constants/index.ts:53`, `darkOverlayOpacity: 0.6`); the COLOUR is the
// demo's own black where the phone washes its app background (`BoundingBoxOverlay.tsx:87`).
// D17 freezes the camera palette, so the value moved nowhere — see `camera-chrome.ts`.
const scrim: CSSProperties = { position: 'absolute', background: CAMERA_CHROME.guideMask }

const viewfinderPanel: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: '0 18px',
  textAlign: 'center',
}

/**
 * A DEMO-ONLY recipe, not one of A66's outline sites — matrix A66 counted it as one and it is
 * not: `#4BA3D4` border + a 14% `primary` wash + a `#9fd4ee` label. Neither that wash nor
 * `#9fd4ee` returns a single hit anywhere in the phone's `src/` at `dd5551ec` (measured), and
 * the phone's `Button` has exactly five variants, none of them tinted-fill.
 *
 * So: `outline` plus ONE background override, per D12's "follow, inside the frame". The wash
 * survives as the mark of a sample/fallback affordance; the border and label join `link` with
 * everything else. `palette-contrast.test.ts` measures `link` UNDER this wash, on every dark
 * ground, because the wash is a ground the phone's contract has never seen.
 */
const panelButton: CSSProperties = {
  ...buttonStyle({ variant: 'outline', size: 'small' }),
  background: SAMPLE_TINT,
}

/**
 * Full-screen OCR capture (launch-only). The aim stage is a real landscape webcam viewfinder
 * when the browser grants one — the shutter crops the timestamp strip (the phone's 80% × 17%
 * + 5% width buffer), runs in-browser recognition, and hands the RAW text to the bridge for
 * the ported clean/parse pipeline. Where there is no camera (the suite's default world), the
 * sample DVR frames drive the exact same pipeline, said in so many words.
 */
export function OcrCaptureScreen({
  result,
  dvrDraft,
  onChangeDvrDraft,
  dateConfirmed,
  onConfirmDate,
  hasExtractedScopes,
  onUseSample,
  onCapture,
  onLiveRead,
  onCancel,
  onRetake,
  onConfirm,
  deps,
}: OcrCaptureScreenProps) {
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  // Stable identity: AlertDialog keys its Escape listener on `onDismiss`, so a fresh closure
  // per render would tear the listener down and re-add it on every parent update.
  const closeRecalc = useCallback(() => setConfirmRecalc(false), [])
  /** Ties the commit CTA to whichever reason is currently blocking it (R-15). */
  const blockedId = `${useId()}-blocked`

  // ---- Live camera ----------------------------------------------------------

  const {
    permission,
    failure,
    stream,
    devices,
    deviceFailure,
    selectedDeviceId,
    isOpening,
    open,
    selectDevice,
    close,
  } = useCaptureStream({ facility: 'camera', deps: deps && 'mediaDevices' in deps ? { mediaDevices: deps.mediaDevices } : undefined })

  /** An in-flight grab/recognition — disables the shutter and shows the reading status. */
  const [reading, setReading] = useState(false)
  /** The last grab/recognition failure — honest notice, dismissible. */
  const [notice, setNotice] = useState<string | null>(null)
  /**
   * Generation token for live reads (R-4 — the `importGen` pattern, p1-review H2). The first
   * live recognition is slow by construction (lazy tesseract import + ~6.8 MB of assets), and
   * the DVR timestamp becomes the calibration offset — it must never change underneath the
   * operator. Bumped by anything that supersedes an in-flight read: a newer capture, a sample
   * frame, or a result arriving from the bridge. A read that comes back stale writes NOTHING —
   * no result, no notice out of context.
   */
  const readGen = useRef(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  // The default recogniser holds a wasm worker; release it with the screen. An injected
  // `recognize` seam owns its own lifecycle (and the dispose would touch a singleton the
  // test world never created — harmless, but not ours to call).
  const usesDefaultRecognizer = useRef(deps?.recognize === undefined)
  useEffect(() => {
    const owned = usesDefaultRecognizer.current
    return () => {
      if (owned) void disposeDvrRecognizer()
    }
  }, [])

  // Point the <video> at the live stream (jsdom implements no srcObject setter; the
  // assignment is an inert expando there).
  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    element.srcObject = stream
    return () => {
      element.srcObject = null
    }
  }, [stream])

  // The phone unmounts its camera while the confirmation screen is up (isActive follows
  // focus); the demo's parallel: close the stream when a result arrives — the camera light
  // must not stay on behind a form — and reopen the one WE closed when Retake returns to the
  // aim stage. A stream the visitor never had is never opened here.
  const reopenOnAimRef = useRef(false)
  useEffect(() => {
    if (result) {
      // A result is up — whatever produced it, any still-in-flight live read is now stale
      // (R-4): its landing would replace the value the operator is already correcting. The
      // stale read's own `finally` deliberately won't release the flags of a generation it
      // no longer owns, so the supersession point clears them: the shutter must not come
      // back to the aim stage still held, and a failure notice describing the superseded
      // read must not materialise out of context on Retake.
      readGen.current++
      setReading(false)
      setNotice(null)
      if (stream) {
        reopenOnAimRef.current = true
        close()
      }
    } else if (reopenOnAimRef.current) {
      reopenOnAimRef.current = false
      // Pinned to the device the visitor chose (review FD-3, twin of the capture screen's):
      // `close()` keeps `selectedDeviceId`, so a bare `open()` would silently drop them back
      // to the browser default on Retake while the caption followed along.
      void open(selectedDeviceId ?? undefined)
    }
  }, [result, stream, close, open, selectedDeviceId])

  const runLiveCapture = useCallback(
    async (video: HTMLVideoElement) => {
      const gen = ++readGen.current
      /** Stale = unmounted, or superseded by a newer capture/sample/result (R-4). */
      const stale = () => !aliveRef.current || readGen.current !== gen
      setReading(true)
      setNotice(null)
      try {
        const crop = ocrCropRegion(video.videoWidth, video.videoHeight, VIEWFINDER_ASPECT)
        const grab = crop
          ? await grabVideoFrame(video, {
              crop,
              includeDataUrl: true,
              targetWidth: OCR_STRIP_MAX_WIDTH,
              quality: OCR_CAPTURE_QUALITY,
              dataUrlQuality: OCR_STRIP_DATAURL_QUALITY,
              ...(deps?.createCanvas ? { createCanvas: deps.createCanvas } : {}),
            })
          : null
        if (stale()) return
        if (!grab || !grab.ok) {
          // A camera that has not delivered a frame yet and a canvas that cannot encode land
          // on the same honest sentence — nothing was captured.
          setNotice((grab && !grab.ok ? grab.failure.message : null) ?? 'This browser could not turn the camera frame into an image — nothing was captured.')
          return
        }
        const recognize = deps?.recognize ?? recognizeDvrStrip
        const outcome = await recognize(grab.blob)
        if (stale()) return
        if (!outcome.ok) {
          setNotice(outcome.message)
          return
        }
        onLiveRead({ rawText: outcome.text, confidence: outcome.confidence, imageDataUrl: grab.dataUrl })
      } finally {
        // A superseded read must not clear the flag a NEWER read owns; only the current
        // generation may release the shutter.
        if (aliveRef.current && readGen.current === gen) setReading(false)
      }
    },
    [deps?.createCanvas, deps?.recognize, onLiveRead],
  )

  /** Sample actions supersede any in-flight live read (R-4) and clear a pending failure
   *  notice — it described a read that no longer matters, and surfacing it after the sample's
   *  confirm stage would be a message detached from its cause. */
  const pickSample = useCallback(
    (frame: OcrSampleFrame) => {
      readGen.current++
      setNotice(null)
      onUseSample(frame)
    },
    [onUseSample],
  )

  const onShutterPress = useCallback(() => {
    if (reading) return
    const video = videoRef.current
    if (!stream || !video) {
      // No live camera — the shutter says so in its name and runs the sample pipeline.
      readGen.current++
      setNotice(null)
      onCapture()
      return
    }
    void runLiveCapture(video)
  }, [reading, stream, onCapture, runLiveCapture])

  const onSwitchDevice = useCallback(() => {
    if (devices.length < 2) return
    const index = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const next = devices[(index + 1 + devices.length) % devices.length] ?? devices[0]
    void selectDevice(next.deviceId)
  }, [devices, selectedDeviceId, selectDevice])

  // ---- Confirm stage --------------------------------------------------------

  if (result) {
    // The commit gate is the engine's (`isDvrDraftCommittable`) — this screen only reflects it.
    const canCommit = result.ok && isDvrDraftCommittable(dvrDraft, result.resolution, dateConfirmed)
    const dateNeedsConfirming = result.ok && Boolean(dvrDraft) && !canCommit
    const edited = result.ok && dvrDraft !== result.dvrTime
    // Committing runs `generateExtractedScopes`, which replaces the editable extracted-scope
    // list wholesale. The phone stops here and asks (ocr-capture.tsx:282-317); so do we.
    const onCommitClick = () => {
      if (!canCommit) return // the CTA is aria-disabled, not disabled — the guard lives here
      if (hasExtractedScopes) setConfirmRecalc(true)
      else onConfirm(true)
    }
    // Same idiom for the assumed-date confirm (R-35): aria-disabled keeps it focusable, so the
    // refusal has to live here.
    const onConfirmDateClick = () => {
      if (dateConfirmed) return
      onConfirmDate()
    }

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', padding: '54px 22px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* SEAM(U7.2): `OverlayHeader`'s fourth adopter (A61) — the one site that had no header
            CONTROL at all, only a bare title div. It stays control-less (this stage's exits are
            its own Cancel / Try again CTAs) and takes the seam's 18/600 title so the four
            surfaces stop disagreeing about what a screen title is. The shell already insets
            22px, so the header supplies only its bottom gap.
            SEAM(U7.3): the confirm stage's CARDS below, its assumed-date warning, the mono
            policy and A93's copy sweep are U7.3's — untouched here. */}
        <OverlayHeader variant="glass" title="Captured timestamp" style={{ marginBottom: 16 }} />
        {result.ok ? (
          <>
            <div style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.6)', background: '#0a1320', padding: 16, marginBottom: 16 }}>
              <div style={{ ...label12, marginBottom: 4 }}>Parsed DVR time</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', fontFamily: mono, marginBottom: 14 }}>{result.dvrTime}</div>
              {/* R-16 applies to the SAMPLE score only: that one is the screen's one
                  not-measured number, so it gets the "not from the real thing" badge and the
                  note naming what it does and does not describe. A LIVE read's score comes
                  from the in-browser recogniser — a measured value needs no disclaimer. */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ ...label12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  OCR confidence
                  {!result.confidence.measured && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: '#ffd07a', background: 'rgba(255,200,90,0.12)', border: '1px solid rgba(255,200,90,0.3)', borderRadius: 6, padding: '1px 6px' }}>
                      Sample
                    </span>
                  )}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: result.confidence.color }}>{result.confidence.label}</span>
              </div>
              {!result.confidence.measured && (
                <div style={{ fontSize: 11, color: '#7a9fc4', lineHeight: 1.45, marginBottom: 10 }}>
                  Fixed for sample frames — no live frame was scored here. It rates how legibly the characters
                  read, never which date they mean.
                </div>
              )}
              <div style={label12}>
                Actual (atomic): <span style={{ color: '#cfe6f5', fontFamily: mono }}>{result.actual}</span>
              </div>
            </div>

            {/* Phone render order: the ambiguity warning sits between the captured evidence and
                the correction field (ui-mapping 06, Confirmation Step content items 2–3).
                The union makes "warning AND blocker at once" unrepresentable — see R-23. */}
            {result.resolution.kind === 'ambiguous' && <DateDisambiguationWarning result={result.resolution.ambiguity} />}

            {result.resolution.kind === 'assumed-date' && (
              <div role="alert" style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>No date on the DVR display</div>
                <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5, marginBottom: 12 }}>
                  Only a time was read from this frame. The date below is <strong>assumed</strong> — today&apos;s date on this
                  device, not something OCR saw. Correct it, or confirm it, before it becomes a scope boundary.
                </div>
                {/* R-35: `aria-disabled`, not `disabled` — the §44b rule applied to the button
                    that actually trips it. This one's state flips UNDER the operator's finger:
                    pressing it sets `dateConfirmed`, a native `disabled` blurs the just-pressed
                    element to <body>, and that lands at the exact moment the `role="status"`
                    blocked-reason clears and the (aria-disabled) commit CTA below becomes the
                    thing to press. The click is guarded in the handler instead — the same
                    three-layer shape as the CTA, and re-confirming would be idempotent anyway. */}
                <button
                  type="button"
                  onClick={onConfirmDateClick}
                  aria-disabled={dateConfirmed}
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: 11,
                    borderRadius: 10,
                    border: '1px solid #2B8CC1',
                    background: 'transparent',
                    color: '#4BA3D4',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: dateConfirmed ? 'default' : 'pointer',
                    opacity: dateConfirmed ? 0.45 : 1,
                  }}
                >
                  {dateConfirmed ? 'Date confirmed' : 'The date is correct'}
                </button>
              </div>
            )}

            <DateTimeField label="DVR Date/Time" value={dvrDraft} onChange={onChangeDvrDraft} />
            {edited && <div style={{ fontSize: 12, fontStyle: 'italic', color: '#7a9fc4', marginTop: -8, marginBottom: 12 }}>Manually edited</div>}

            {/* R-15: the reason the commit is blocked is a live region (it appears in response
                to an edit, so it has to announce), and it NAMES the CTA it blocks via
                aria-describedby. The CTA uses `aria-disabled` rather than `disabled` so it
                stays focusable — a keyboard user has to be able to land on it to hear why it
                won't fire, and `disabled` would also drop focus at the exact moment confirming
                the date re-enables it (the R-7 failure shape). The click is guarded instead. */}
            <div style={{ marginTop: 'auto' }}>
              <div role="status" style={{ ...label12 }}>
                {!dvrDraft && <div id={blockedId} style={{ marginBottom: 10 }}>DVR Time Required — please enter the DVR timestamp before continuing.</div>}
                {dateNeedsConfirming && <div id={blockedId} style={{ marginBottom: 10 }}>Confirm or correct the assumed date before continuing.</div>}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onRetake} style={{ ...buttonStyle({ variant: 'secondary' }) }}>Retake</button>
                <button
                  type="button"
                  onClick={onCommitClick}
                  aria-disabled={!canCommit}
                  aria-describedby={canCommit ? undefined : blockedId}
                  style={{ flex: 1, ...buttonStyle({ disabled: !canCommit }) }}
                >
                  Use this &amp; calculate
                </button>
              </div>
            </div>

            {/* The phone's `Recalculate Time Offset` Alert (`app/(form)/ocr-capture.tsx:288-317`,
                spec `docs/ui-mapping/06-wizard-b-time.md:145-155`) on the shared blocking-dialog
                primitive: title, message and all three button labels verbatim, `Cancel` carrying
                the phone's `style: 'cancel'` and `Regenerate Scopes` its `destructive`. */}
            {confirmRecalc && (
              <AlertDialog
                title="Recalculate Time Offset"
                message="Recalculating will update the time offset. What would you like to do with your extracted video scopes?"
                actions={[
                  // Phone: `router.push(TIME_OFFSET)` — leaves the OCR flow, discarding the read.
                  { label: 'Cancel', style: 'cancel', onPress: onCancel },
                  { label: 'Keep My Edits', onPress: () => onConfirm(false) },
                  { label: 'Regenerate Scopes', style: 'destructive', onPress: () => onConfirm(true) },
                ]}
                // Escape takes the least-destructive route — back to the confirm step with the
                // read intact. It deliberately is NOT the `Cancel` arm, which discards the read:
                // a stray keypress must not be able to throw away a capture.
                onDismiss={closeRecalc}
              />
            )}
          </>
        ) : (
          <>
            <div style={{ borderRadius: 12, border: GLASS.borderError, background: 'rgba(255,71,87,0.06)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#ff8a93', marginBottom: 8 }}>Couldn&apos;t read a timestamp</div>
              <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5 }}>OCR text: <span style={{ fontFamily: mono, color: '#cdd9e6' }}>{result.rawText}</span></div>
            </div>
            <button type="button" onClick={onRetake} style={{ marginTop: 'auto', ...buttonStyle() }}>Try again</button>
          </>
        )}
      </div>
    )
  }

  // ---- Aim stage ------------------------------------------------------------

  const live = stream !== null
  const selected = selectCaptureDevice(devices, selectedDeviceId)

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#05080d', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center,${colors.background},#05080d)` }} />
      <div style={{ marginTop: 54, textAlign: 'center', zIndex: 2 }}>
        <div style={{ fontFamily: "var(--font-stmono),'Share Tech Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#9fd4ee' }}>AIM AT THE DVR CLOCK</div>
      </div>

      {/* The LANDSCAPE viewfinder (owner directive): a wide frame in the portrait phone, the
          timestamp strip across its long axis. */}
      <div
        style={{
          position: 'relative',
          margin: '18px 10px 0',
          aspectRatio: `${VIEWFINDER_ASPECT}`,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#0a1320',
          border: '1px solid rgba(30,58,95,0.6)',
          zIndex: 2,
        }}
      >
        {live ? (
          <>
            <video
              ref={videoRef}
              aria-label="Live camera preview"
              autoPlay
              muted
              playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Phone BoundingBoxOverlay posture: dark scrim outside the strip, corner accents
                on it. Fractions come from the same constants the crop uses. */}
            <div style={{ ...scrim, left: 0, right: 0, top: 0, height: STRIP_TOP }} />
            <div style={{ ...scrim, left: 0, right: 0, bottom: 0, height: STRIP_TOP }} />
            <div style={{ ...scrim, left: 0, width: STRIP_SIDE, top: STRIP_TOP, bottom: STRIP_TOP }} />
            <div style={{ ...scrim, right: 0, width: STRIP_SIDE, top: STRIP_TOP, bottom: STRIP_TOP }} />
            <div style={{ position: 'absolute', left: STRIP_SIDE, right: STRIP_SIDE, top: STRIP_TOP, bottom: STRIP_TOP, border: '1px dashed rgba(255,255,255,0.85)' }}>
              <div style={corner({ top: -2, left: -2, borderTop: '3px solid #4BA3D4', borderLeft: '3px solid #4BA3D4' })} />
              <div style={corner({ top: -2, right: -2, borderTop: '3px solid #4BA3D4', borderRight: '3px solid #4BA3D4' })} />
              <div style={corner({ bottom: -2, left: -2, borderBottom: '3px solid #4BA3D4', borderLeft: '3px solid #4BA3D4' })} />
              <div style={corner({ bottom: -2, right: -2, borderBottom: '3px solid #4BA3D4', borderRight: '3px solid #4BA3D4' })} />
            </div>
            {/* Phone CameraInstructions.tsx:20, verbatim. */}
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: '#fff', textShadow: `0 1px 3px ${CAMERA_CHROME.instructionShadow}` }}>
              Align DVR timestamp to fill the bounding box
            </div>
          </>
        ) : permission === 'unavailable' ? (
          <div style={viewfinderPanel}>
            <div style={{ fontSize: 13, color: '#ff8a93', lineHeight: 1.5 }}>
              No camera available here — use the sample DVR clock below (same OCR pipeline).
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div style={viewfinderPanel}>
            <div style={{ fontSize: 12, color: '#9fc0db', lineHeight: 1.5 }}>{CAPTURE_PERMISSION_COPY.camera.deniedBody}</div>
            <button type="button" onClick={() => void open()} disabled={isOpening} style={{ ...panelButton, opacity: isOpening ? 0.6 : 1 }}>
              {isOpening ? 'Opening…' : 'Try again'}
            </button>
          </div>
        ) : permission === 'prompt' ? (
          <div style={viewfinderPanel}>
            {/* Phone CameraPermissions.tsx:38-43, message and button label verbatim. */}
            <div style={{ fontSize: 13, color: '#cfe6f5', lineHeight: 1.5 }}>Camera permission is required to capture DVR timestamps</div>
            <button type="button" onClick={() => void open()} disabled={isOpening} style={{ ...panelButton, opacity: isOpening ? 0.6 : 1 }}>
              {isOpening ? 'Opening…' : 'Grant Camera Permission'}
            </button>
          </div>
        ) : (
          // granted, stream closed (the confirm stage released it and Retake's reopen failed,
          // or is still in flight).
          <div style={viewfinderPanel}>
            <button type="button" onClick={() => void open()} disabled={isOpening} style={{ ...panelButton, opacity: isOpening ? 0.6 : 1 }}>
              {isOpening ? 'Opening…' : 'Restart camera'}
            </button>
          </div>
        )}
      </div>

      {/* Notices: honest failures stay visible until dismissed; the reading state announces. */}
      <div style={{ padding: '10px 20px 0', zIndex: 2 }}>
        <div role="status" style={{ ...label12 }}>
          {reading && <div style={{ color: '#9fd4ee', marginBottom: 8 }}>Reading timestamp…</div>}
        </div>
        {notice && (
          <div style={{ fontSize: 12, lineHeight: 1.45, color: '#ff8a93', display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ flex: 1 }}>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              style={{ background: 'transparent', border: 'none', color: '#9fd4ee', fontSize: 12, cursor: 'pointer', padding: 0 }}
            >
              Dismiss
            </button>
          </div>
        )}
        {failure && <div style={{ fontSize: 12, lineHeight: 1.45, color: '#ff8a93', marginBottom: 8 }}>{failure.message}</div>}
        {/* An unreadable device list is NOT "there are no other cameras" (P4.1 keeps them apart). */}
        {deviceFailure && live && <div style={{ fontSize: 12, lineHeight: 1.45, color: '#ffd07a', marginBottom: 8 }}>{deviceFailure.message}</div>}
      </div>

      <div style={{ marginTop: 'auto', padding: '20px 20px 26px', background: `linear-gradient(0deg,${CAMERA_CHROME.controlBarFade},transparent)`, zIndex: 3 }}>
        {/* Belt for the R-4 race: while a live read is in flight the sample paths are held —
            a sample landing mid-recognition is the very supersession the token exists for. */}
        {/* The THIRD site of the tinted-fill recipe above, inline — the partner's W2 census
            found two. Same treatment. */}
        <button type="button" disabled={reading} onClick={() => pickSample('clean')} style={{ width: '100%', marginBottom: 14, ...buttonStyle({ variant: 'outline', disabled: reading }), ...(reading ? {} : { background: SAMPLE_TINT }) }}>Use sample DVR clock</button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#7a9fc4' }}>Awkward frames:</span>
          <button type="button" disabled={reading} onClick={() => pickSample('ambiguous')} style={{ ...sampleLink, opacity: reading ? 0.5 : 1, cursor: reading ? 'default' : 'pointer' }}>Ambiguous date</button>
          <button type="button" disabled={reading} onClick={() => pickSample('timeOnly')} style={{ ...sampleLink, opacity: reading ? 0.5 : 1, cursor: reading ? 'default' : 'pointer' }}>Time only</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={onCancel} style={{ fontSize: 15, color: '#cdd9e6', cursor: 'pointer', padding: 10, width: 70, background: 'transparent', border: 'none', textAlign: 'left' }}>Cancel</button>
          {/* The shutter's accessible name says what it will ACTUALLY do (the P4.3 rule): a
              live grab is a capture; anything else attaches the bundled sample frame. */}
          <button
            type="button"
            aria-label={live ? 'Capture' : 'Capture sample frame'}
            disabled={reading}
            onClick={onShutterPress}
            style={{ width: 68, height: 68, borderRadius: 34, border: '4px solid #fff', background: 'rgba(255,255,255,0.22)', cursor: reading ? 'default' : 'pointer', opacity: reading ? 0.5 : 1 }}
          />
          {devices.length > 1 && live ? (
            <button
              type="button"
              aria-label="Switch camera"
              onClick={onSwitchDevice}
              style={{ width: 70, background: 'transparent', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', textAlign: 'right', padding: 10 }}
            >
              ⇄
            </button>
          ) : (
            <div style={{ width: 70 }} />
          )}
        </div>
        {devices.length > 1 && live && selected && (
          <div style={{ ...label12, textAlign: 'center', marginTop: 8 }}>{selected.label}</div>
        )}
      </div>
    </div>
  )
}

const sampleLink: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#9fd4ee',
  background: 'transparent',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  textDecoration: 'underline',
}
