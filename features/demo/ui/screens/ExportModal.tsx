'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  describeExportProgress,
  describeValidationPrompt,
  missingFieldLine,
  type CasePdfValidationResult,
  type ExportModalMode,
  type ExportStage,
  type ProgressInfo,
} from '@/features/demo/engine/logic/export'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'

/**
 * ExportModal — the unified export progress / validation overlay (parity P5.3, matrix row 25).
 * Web port of the phone's `src/components/export/ExportModal.tsx`.
 *
 * ONE container, two mutually exclusive modes, exactly like the phone: the RN original exists
 * as a single component because two RN `Modal`s cannot transition simultaneously
 * (`ExportModal.tsx:1-12`). The browser has no such constraint, but the one-container shape is
 * kept anyway — it is what makes the validation → progress hand-off (which the flow machine
 * performs in ONE state write, `continueValidatedExport`) render without a blank frame.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store. Every string and
 * every conditional comes from the P5.1 engine (`describeExportProgress`,
 * `describeValidationPrompt`, `missingFieldLine`) — this file re-derives none of it, so the
 * copy cannot drift from the vocabulary the flow machine and its tests share.
 *
 * `mode` is likewise NOT derived here: the bridge computes it with `resolveExportModalMode`,
 * the single home of the phone's three hand-copied precedence ternaries.
 */

/** Callbacks and flags every mode carries. */
interface ExportModalCommonProps {
  /** Disables both validation buttons and the escape routes (phone `:232/242/153/289`). */
  isExporting?: boolean
  onContinueAnyway(): void
  onCancel(): void
}

/**
 * Discriminated on `mode` (review R-17). The flat shape this replaces let
 * `{ mode: 'validation', validationResult: null }` typecheck into an invisible modal — the
 * component then carried a runtime guard and a comment apologising for it. `mode` already
 * arrives from `resolveExportModalMode`, which only returns `'validation'` when a failing
 * result exists, so the pairing is a fact about the state machine; the props now say so.
 */
export type ExportModalProps = ExportModalCommonProps &
  (
    | { mode: 'hidden' }
    | {
        mode: 'progress'
        /** Defaults to `'idle'` like the phone's prop (`ExportModal.tsx:259`). */
        stage?: ExportStage
        progress?: ProgressInfo
        currentLocationName?: string | null
      }
    | { mode: 'validation'; validationResult: CasePdfValidationResult }
  )

/** Off-screen but readable by assistive tech — the web analog of the phone's
 *  `AccessibilityInfo.announceForAccessibility` target. */
const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const scrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 40,
  background: 'rgba(4,8,14,0.66)',
  pointerEvents: 'auto',
}

/**
 * The progress overlay (phone `ProgressContent`, `ExportModal.tsx:80-125`).
 *
 * NOT dismissible — no button, no scrim click, no Escape. The phone's `handleRequestClose`
 * deliberately no-ops in this mode (`:288-293`) and the demo keeps that: a "cancel" that only
 * hid the overlay while the simulated pipeline kept running would be a lie about what stopped.
 */
function ProgressContent({
  stage,
  progress,
  currentLocationName,
}: {
  stage: ExportStage
  progress: ProgressInfo | undefined
  currentLocationName: string | null | undefined
}) {
  const view = describeExportProgress(stage, progress, currentLocationName)
  const reduceMotion = useReducedMotion()

  /**
   * The overlay's spoken track (review R-6).
   *
   * `role="progressbar"` has PRESENTATIONAL CHILDREN: the stage line, the k-of-n counter and the
   * location name are pruned out of the accessibility tree, so the visible text is not readable
   * at all. And an `aria-live` region only announces what changes AFTER it mounts — this one
   * mounted with its text already in place and thereafter changed only an attribute, so a screen
   * reader heard silence for the whole run. Same trap, same fix as `ValidationContent` below:
   * an sr-only region written on the next tick. The composed string is what changes, so every
   * stage AND every location tick is announced.
   */
  const spoken = [view.stageMessage, view.progressLabel, view.locationLabel].filter(Boolean).join(' — ')
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    setAnnouncement(spoken)
  }, [spoken])

  return (
    <>
      <div data-export-scrim style={scrim} />
      <div data-testid="export-progress-announcement" role="status" aria-live="polite" style={srOnly}>
        {announcement}
      </div>
      <div
        data-testid="export-progress-overlay"
        role="progressbar"
        // Indeterminate (no `aria-valuenow`): the pipeline's total is the PDF pass, but the
        // zipping step has no share of it, so any percentage here would be invented. The
        // `aria-valuetext` carries the same composed line the live region speaks, which is what
        // a screen reader reads when it lands on the bar itself.
        aria-label={view.stageMessage}
        aria-valuetext={spoken}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 41,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          pointerEvents: 'auto',
        }}
      >
        <div
          data-export-spinner
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            border: '3px solid rgba(43,140,193,0.25)',
            borderTopColor: GLASS.accentFrom,
            // R-18: an infinite spin is exactly what `prefers-reduced-motion` is for, and the
            // repo gates every other one (ScreenStage, DashboardScreen, MediaCaptureScreen,
            // this PR's own ExportHub). Reduced motion keeps the ring — it is the only static
            // signal that work is in flight — and drops the rotation.
            ...(reduceMotion ? {} : { animation: 'spin 0.9s linear infinite' }),
            marginBottom: 18,
          }}
        />
        <div style={{ fontSize: 17, fontWeight: 600, color: '#f0f4f8', textAlign: 'center', marginBottom: 8 }}>
          {view.stageMessage}
        </div>
        {view.progressLabel && (
          <div style={{ fontSize: 14, color: '#9fc0db', textAlign: 'center', marginBottom: 4 }}>
            {view.progressLabel}
          </div>
        )}
        {view.locationLabel && (
          <div style={{ fontSize: 13, color: '#7a9fc4', textAlign: 'center', fontStyle: 'italic', maxWidth: 260 }}>
            {view.locationLabel}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * The pre-export validation prompt (phone `ValidationContent`, `ExportModal.tsx:138-253`).
 *
 * Escape and the scrim both mean Cancel — and both are gated on `!isExporting`, the phone's own
 * rule (`:152-156`, `:289`). Focus moves to the dialog on mount and returns to the opener on
 * unmount: the AlertDialog idiom, so a screen reader hears the title and the summary rather
 * than landing on the first button.
 */
function ValidationContent({
  validationResult,
  isExporting,
  onContinue,
  onCancel,
}: {
  validationResult: CasePdfValidationResult
  isExporting: boolean
  onContinue(): void
  onCancel(): void
}) {
  const uid = useId()
  const titleId = `${uid}-title`
  const bodyId = `${uid}-body`
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const prompt = describeValidationPrompt(validationResult)

  // Live regions only announce content that CHANGES after they mount, so the announcement is
  // written on the next tick rather than rendered inline — otherwise the region ships with its
  // text already in place and most screen readers say nothing.
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    setAnnouncement(prompt.announcement)
  }, [prompt.announcement])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isExporting, onCancel])

  useEffect(() => {
    const opener = document.activeElement
    dialogRef.current?.focus()
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  return (
    <>
      <div
        data-export-scrim
        onClick={() => {
          if (!isExporting) onCancel()
        }}
        style={scrim}
      />
      <div data-testid="export-validation-announcement" role="status" aria-live="assertive" style={srOnly}>
        {announcement}
      </div>
      <div
        ref={dialogRef}
        data-testid="export-validation-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 41,
          borderRadius: 16,
          border: GLASS.borderSoft,
          background: GLASS.gradientPanel,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          padding: '20px 18px 16px',
          outline: 'none',
          pointerEvents: 'auto',
          animation: 'screenIn 0.2s ease',
        }}
      >
        {/* The phone's 48px Ionicon: `alert-circle` in the error colour when nothing can
            produce a PDF, `warning` in the warning colour otherwise (`:171-178`). */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          {prompt.allInvalid ? (
            <svg data-testid="export-validation-icon-all" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff6b7a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
          ) : (
            <svg data-testid="export-validation-icon-some" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          )}
        </div>
        <div id={titleId} style={{ fontSize: 17, fontWeight: 700, color: '#f0f4f8', textAlign: 'center', marginBottom: 8 }}>
          {prompt.title}
        </div>
        <div style={{ fontSize: 13, color: '#9fc0db', textAlign: 'center', lineHeight: 1.5, marginBottom: 14 }}>
          {prompt.description}
        </div>
        <div
          data-testid="export-invalid-locations"
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            borderRadius: 12,
            border: GLASS.border,
            background: 'rgba(13,27,42,0.6)',
            padding: 14,
            marginBottom: 14,
          }}
        >
          {prompt.invalidLocations.map((location) => (
            <div key={location.locationId} data-invalid-location={location.locationId} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#f0f4f8', lineHeight: 1.4 }}>{'•'}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8', flex: 1, minWidth: 0 }}>
                  {location.locationName}
                </span>
              </div>
              {location.errors.map((error) => (
                <div key={error} style={{ fontSize: 12, color: '#ff9aa5', marginLeft: 22, marginTop: 2 }}>
                  {missingFieldLine(error)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          id={bodyId}
          style={{ fontSize: 13, color: '#9fc0db', textAlign: 'center', fontStyle: 'italic', marginBottom: 16 }}
        >
          {prompt.summary}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            aria-label="Cancel export"
            style={{
              flex: 1,
              padding: 12,
              fontSize: 14.5,
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.5 : 1,
              ...glassBtnSecondary,
            }}
          >
            {prompt.cancelLabel}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={isExporting}
            aria-label="Continue with export"
            style={{
              flex: 1,
              padding: 12,
              fontSize: 14.5,
              fontWeight: 600,
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.5 : 1,
              ...glassBtnPrimary,
            }}
          >
            {prompt.continueLabel}
          </button>
        </div>
      </div>
    </>
  )
}

export function ExportModal(props: ExportModalProps) {
  // Narrowed by the discriminant, not by a runtime null check (R-17): the "validation mode with
  // no result" state the old guard existed to survive is now unrepresentable, so the invisible
  // modal it would have rendered cannot be constructed.
  if (props.mode === 'hidden') return null
  return (
    <PhoneOverlayPortal>
      {props.mode === 'progress' ? (
        <ProgressContent
          stage={props.stage ?? 'idle'}
          progress={props.progress}
          currentLocationName={props.currentLocationName}
        />
      ) : (
        <ValidationContent
          validationResult={props.validationResult}
          isExporting={props.isExporting ?? false}
          onContinue={props.onContinueAnyway}
          onCancel={props.onCancel}
        />
      )}
    </PhoneOverlayPortal>
  )
}
