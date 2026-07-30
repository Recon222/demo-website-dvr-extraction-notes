'use client'

import { Component, type CSSProperties, type ReactNode } from 'react'
import { GLASS, glassBtnPrimary } from '@/features/demo/ui/glass-tokens'
import type { AppView } from '@/features/demo/engine/store/create-store'

/**
 * Per-view fallback body copy. The launch flows mirror the phone's route-level
 * `ErrorFallback` copy verbatim (app/(form)/ocr-capture.tsx, media-capture.tsx,
 * audio-recording.tsx — see ui-mapping docs 06/09/10); every other view gets the
 * demo-voiced generic. Keyed by the `AppView` union (type-only import — the
 * store-bridge rule bans the store instance, not its types; StoryRail and
 * ExploreChecklist import the same union) so a typo or a `LaunchableId` rename
 * is a compile error, not a silent degrade to generic copy (review R-16).
 */
const FALLBACK_COPY: Partial<Record<AppView, string>> = {
  ocr: 'An unexpected error occurred during OCR capture',
  mediaCapture: 'An unexpected error occurred during media capture',
  audioRecording: 'An unexpected error occurred during audio recording. Please try again.',
}
const GENERIC_COPY = 'This screen hit an unexpected error — your session data is still here.'

const wrap: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '54px 22px 40px',
}
const card: CSSProperties = {
  width: '100%',
  borderRadius: 16,
  border: GLASS.borderError,
  background: GLASS.gradientCardDiag,
  padding: '26px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}
const detail: CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: GLASS.borderError,
  background: 'rgba(255,71,87,0.06)',
  padding: '10px 12px',
  fontSize: 12,
  lineHeight: 1.5,
  color: '#cdd9e6',
  fontFamily: "'JetBrains Mono',monospace",
  overflowWrap: 'break-word',
  marginBottom: 16,
}

export interface DemoErrorBoundaryProps {
  /** The active view id. Changing it clears a caught error (recovery-on-navigation)
   *  and selects the launch-specific fallback copy. */
  view: AppView
  /** Bridge-supplied recovery: return the app to the Cases screen (and clear any
   *  transient overlays that could re-throw). The boundary also clears its own error. */
  onReturnToCases(): void
  children?: ReactNode
}

interface DemoErrorBoundaryState {
  error: Error | null
  /** Last seen `view`, tracked so a view change resets the error (see below). */
  lastView: AppView
}

/**
 * The demo's error boundary — the only class component in the feature (error boundaries
 * are React's one class-only mechanism). Wraps the phone-frame screen subtree in
 * `DemoExperience` so a throwing screen/modal/overlay renders a glass fallback INSIDE
 * the phone frame instead of white-screening the frame and rail.
 *
 * Reset strategy: a `view` change clears the error via derived state rather than a
 * `key` remount — keying the boundary on `view` would remount `ScreenStage` every
 * navigation and kill the AnimatePresence cross-slide. Derived state resets only the
 * error flag; the healthy subtree is never remounted.
 */
export class DemoErrorBoundary extends Component<DemoErrorBoundaryProps, DemoErrorBoundaryState> {
  state: DemoErrorBoundaryState = { error: null, lastView: this.props.view }

  static getDerivedStateFromError(error: unknown): Partial<DemoErrorBoundaryState> {
    // Normalize non-Error throws (strings, etc.) so render can rely on `.message`.
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  static getDerivedStateFromProps(
    props: DemoErrorBoundaryProps,
    state: DemoErrorBoundaryState,
  ): Partial<DemoErrorBoundaryState> | null {
    if (props.view !== state.lastView) return { lastView: props.view, error: null }
    return null
  }

  private handleReturn = () => {
    this.props.onReturnToCases()
    // The callback lands on 'cases'; if we were already there the view prop won't
    // change, so clear the error explicitly — a still-broken screen is simply re-caught.
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" style={wrap}>
        <div style={card}>
          <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#ff4757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#9fc0db', lineHeight: 1.5, marginBottom: 14 }}>
            {FALLBACK_COPY[this.props.view] ?? GENERIC_COPY}
          </div>
          {error.message && <div style={detail}>{error.message}</div>}
          <button
            type="button"
            // The throwing subtree's unmount strands keyboard/SR focus on <body>; land it
            // on the only recovery control (in-repo idiom: ExitDialog's autoFocus). R-8.
            autoFocus
            onClick={this.handleReturn}
            style={{ width: '100%', textAlign: 'center', padding: 13, ...glassBtnPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Return to Cases
          </button>
        </div>
      </div>
    )
  }
}
