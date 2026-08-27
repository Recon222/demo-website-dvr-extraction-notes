'use client'

import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing } from '@/features/demo/ui/tokens/scale'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'

/**
 * SEAM(U4.3): the centred dialog. Matrix A45 (`Layout.shadow.dialog`), A56 (the `elevated`
 * tier as a modal surface), B.2 rows 15/25 and the `AlertDialog` row.
 *
 * ONE shell for the demo's three centred dialogs — `controls/AlertDialog`,
 * `screens/DeleteConfirmationModal` and `screens/ExportModal`'s validation prompt — which
 * carried three near-identical hand-rolled panels and three different focus blocks between
 * them (demo inventory §4.7's #3 leverage point).
 *
 * Source of truth for every value: the phone at `main` (`dd5551ec`).
 * - The surface is `<Card glass glassVariant="elevated">`, which is what BOTH phone dialogs
 *   render: `DeleteConfirmationModal.tsx:69`, `export/ExportModal.tsx:164`.
 * - The composition is the phone's own published WEB form, `.design-sync/conventions.md:32-45`
 *   ("`elevated` for modals/popovers"): gradient + 1px border + lit top edge + inset inner
 *   shadow + `--radius-lg` + `--spacing-md` of padding. All six parts are here.
 * - The horizontal inset is the overlay's `padding: Layout.spacing.lg` (24) —
 *   `DeleteConfirmationModal.tsx:232`, `export/ExportModal.tsx:363`.
 * - Centring is the overlay's `justifyContent: 'center'`; on the web that is the demo's
 *   existing `top: 50%` + `translateY(-50%)`, kept verbatim.
 *
 * ## What this shell does NOT own
 *
 * Content, buttons and their row. The three dialogs disagree there by design (`AlertDialog`
 * stacks 3+ actions into a column; `DeleteConfirmationModal` scrolls a capped location list;
 * `ExportModal` disables both buttons while exporting) and none of that is surface.
 *
 * ## The lit edge: longhands only
 *
 * `dialogSurface` carries NO `border` and NO `borderColor` key — four colour longhands plus
 * `borderStyle`/`borderWidth` instead. That is the measured ruling
 * (`reports/partner-lit-edge-ruling.md` §1): every other fragment shape has a paint-1-OK /
 * paint-2-FAIL trap, where a consumer's override keeps the lit edge on first render and
 * silently wipes it on the next update. A consumer that must re-tint the sides writes the
 * three side longhands; `border`, `borderColor` and `borderTop` after a spread are all wrong
 * on the FIRST paint here, which is where the demo's style pins read.
 */

const elevated = GLASS_TIER[scheme].elevated

/**
 * A45 — `Layout.shadow.dialog.dark` (`Layout.ts:165-171`: `#000`, offset `0 8`, opacity `0.5`,
 * radius `40`). Casts DOWNWARD: a surface floating in the middle of the screen throws its
 * shadow down, not up. The phone's own rationale for reaching for `dialog` rather than `sheet`
 * is written at its single consumer, `PasswordModal.tsx:112-123`, and names exactly this
 * shape: *"this overlay is `justifyContent: 'center'`, so the card floats in the middle of the
 * screen."*
 *
 * The demo's three copies shared `0 24px 60px rgba(0,0,0,0.55)` by value; this replaces it.
 */
export const DIALOG_SHADOW = '0 8px 40px rgba(0,0,0,0.5)'

/**
 * The painted surface of a centred dialog: ground, border, lit edge, radius, cast, padding.
 *
 * Spread this to put a surface on the dialog tier without mounting the shell. Positioning, z
 * and sizing are NOT here — they belong to whoever anchors the surface, which for the three
 * callers is the shell below.
 *
 * `padding` IS here, unlike `glassCard`'s (`glass-tokens.ts:133-135` leaves it out because the
 * demo's ten card sites carry six different lifted paddings). The dialogs do not: the phone
 * gives every one of them `Layout.spacing.md` through `Card`'s `padding = 'md'` default
 * (`Card.tsx:47,183`) and neither dialog overrides it, and `conventions.md:41` publishes the
 * same value in the web form. One value, two independent sources — so it belongs to the
 * recipe rather than to three call sites.
 */
export const dialogSurface: CSSProperties = {
  // A43 / D13(a): `lg` is "cards, modals, form sections". `Card`'s glass branch hardcodes it
  // (`Card.tsx:225,250`) and `glassVariant` selects colours only — depth rides the gradient,
  // never the corner. The demo's three copies were at 16; U1.2 deliberately left
  // `AlertDialog.tsx:147` for this package.
  borderRadius: radius.lg,
  background: `linear-gradient(180deg,${elevated.gradient[0]},${elevated.gradient[1]})`,
  // Longhands only — see the docblock. Do not collapse these into `border`/`borderColor`.
  borderStyle: 'solid',
  borderWidth: 1,
  borderRightColor: elevated.border,
  borderBottomColor: elevated.border,
  borderLeftColor: elevated.border,
  borderTopColor: elevated.highlightTop,
  boxShadow: `inset 0 1px 0 ${elevated.innerShadow}, ${DIALOG_SHADOW}`,
  padding: spacing.md,
}

/**
 * The dim behind the dialog. `zIndex` is the shell's.
 *
 * SEAM(U4.4): this literal is where `AlertDialog.tsx:131`, `DeleteConfirmationModal.tsx:97`
 * and `ExportModal.tsx:84` — the three `rgba(4,8,14,0.66)` sites the scrim family names — now
 * live, as ONE site. Those three `file:line`s no longer exist.
 *
 * FINDING for U4.4, recorded where it will be read: A22 folds these onto `colors.scrim`, but
 * the phone paints BOTH centred dialogs' backdrops with `colors.overlay`
 * (`DeleteConfirmationModal.tsx:229`, `export/ExportModal.tsx:325,360`) and reserves
 * `colors.scrim` for the sheet family and `PasswordModal.tsx:98`. `overlay` is
 * `rgba(0,40,83,0.9)`; `scrim` is `rgba(0,40,83,0.32)`. They are not interchangeable and A22
 * says so itself.
 */
export const dialogScrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(4,8,14,0.66)',
  pointerEvents: 'auto',
}

/**
 * The element that started the current interaction, captured at GESTURE time.
 *
 * WHY NOT `document.activeElement` IN THE MOUNT EFFECT. A handler that disables its own
 * control — the map's Export Map in-flight belt, `ExportHub`'s footer CTA — makes that control
 * non-focusable in the SAME commit that mounts the dialog. HTML's focus fixup then moves focus
 * to `<body>` before React runs passive effects, so a mount-time read captures `<body>` and
 * dismissing drops the keyboard visitor at document start. Capture-phase listeners run before
 * all of it: before the click handler, before the disable, before the fixup.
 *
 * Installed at MODULE scope, not on mount: by the time a dialog mounts, the gesture that
 * opened it is already over.
 *
 * This is the mechanism the OTHER two dialogs did not have. `DeleteConfirmationModal:83` and
 * `ExportModal:231` each read `document.activeElement` at mount — the path this note calls
 * broken — so consolidating onto THEM would have been a regression. It is the survivor.
 */
let activationOrigin: HTMLElement | null = null
let tracking = false

/** What a restored focus can legally land on. Mirrors the focusable set the demo actually
 *  renders — every overlay opener here is a button or a `tabIndex` div. */
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

/**
 * Can this element still take focus at RESTORE time? A disconnected or still-disabled opener
 * is not an error — it is the normal outcome of a destructive or state-changing action — so
 * focus is left where it is rather than forced somewhere arbitrary.
 *
 * Deliberately NOT applied when the origin is captured: at mount the opener is very often
 * disabled, because disabling it is what raised this dialog. That is the whole finding.
 */
function canTakeFocus(el: HTMLElement | null): el is HTMLElement {
  return !!el && el.isConnected && (el as Partial<HTMLButtonElement>).disabled !== true
}

function rememberPointerOrigin(e: Event) {
  const target = e.target
  activationOrigin = target instanceof HTMLElement ? target.closest<HTMLElement>(FOCUSABLE) : null
}

function rememberKeyOrigin() {
  // Keyboard activation fires on the focused element, and at keydown it is still focused.
  const active = document.activeElement
  activationOrigin = active instanceof HTMLElement && active !== document.body ? active : null
}

/** Idempotent; exported so a test can assert the tracker is armed without importing internals. */
export function trackDialogActivationOrigin(): void {
  if (typeof document === 'undefined' || tracking) return
  tracking = true
  document.addEventListener('pointerdown', rememberPointerOrigin, true)
  document.addEventListener('keydown', rememberKeyOrigin, true)
}

trackDialogActivationOrigin()

/**
 * Every mounted dialog, oldest first. Escape is answered by the LAST one only.
 *
 * `DemoExperience.tsx:3116` renders `AlertDialog` after every other overlay *"so it sits over
 * every other overlay, like an OS alert does"* — stacking is designed behaviour, not an
 * accident. Each shell listens on `document`, so without this an Escape over an alert raised
 * on top of a delete confirmation would dismiss BOTH, and the one underneath would vanish
 * unanswered. Mount order rather than z-order, because that is what React gives for free and
 * what DOM paint order agrees with at equal z; a caller that mounts a LOWER z last gets the
 * top of this stack rather than the top of the screen, which is a reason to keep `z` a caller
 * decision (D14) rather than a reason to sort by it.
 */
const openDialogs: object[] = []

export interface CentredDialogProps {
  /**
   * The scrim's `zIndex`; the panel paints on `z + 1`.
   *
   * D14 keeps the demo's five z schemes OUT of this port, and the three callers do not agree:
   * the alert and the delete confirmation paint on 60/61, the export validation prompt on
   * 40/41 so an alert can be raised over it. Renumbering them here would be the change D14
   * refuses and `UserProfilePane.test.tsx:301,315,316` pin against.
   */
  z: number
  /** id of the element that names the dialog (`aria-labelledby`). */
  labelledBy: string
  /** id of the element that describes it (`aria-describedby`), where there is one. */
  describedBy?: string
  /**
   * What Escape and the scrim mean. Required, not optional: a dismissal route with no handler
   * is a dialog that cannot be closed, and making the handler mandatory is what stops that
   * state being constructible.
   */
  onDismiss: () => void
  /**
   * Does a scrim click dismiss? The per-caller behavioural difference this shell preserves
   * rather than unifies. `AlertDialog` passes `false` — a native alert is answered by choosing
   * a button. `DeleteConfirmationModal` passes `true` (the phone's `handleOverlayPress`,
   * `DeleteConfirmationModal.tsx:43-47`). `ExportModal` passes `!isExporting`.
   */
  dismissOnScrim: boolean
  /** Does Escape dismiss? `ExportModal` gates it on `!isExporting`; the other two pass `true`. */
  dismissOnEscape: boolean
  /** `data-testid` on the panel, for callers whose suites already name it. */
  testId?: string
  /** `data-testid` on the scrim, likewise. */
  scrimTestId?: string
  children: ReactNode
}

/**
 * The demo's centred blocking dialog: a scrim, and a panel on the `elevated` tier floating in
 * the middle of the phone screen.
 *
 * Presentational: props in, callbacks out. Nothing here touches the store.
 *
 * Focus, in one place for all three callers: the panel takes focus on mount (`tabIndex={-1}`,
 * so a screen reader hears the title AND the body rather than just the first button) and hands
 * it back to the opener on unmount, where "the opener" is the gesture tracker's capture-phase
 * reading and not `document.activeElement`.
 *
 * There is no `visible` / `open` prop, deliberately. All three callers mount conditionally
 * (`DemoExperience.tsx:3086`, `:3105`, `:3120`), so the prop would be permanently `true` — the
 * same dead weight `DeleteConfirmationModal.tsx:32-36` refuses `isDeleting` for — and the
 * focus hand-back is an unmount cleanup, so introducing one would silently move the moment
 * focus returns. A successor that needs an exit animation adds `visible` the way
 * `GlassBottomSheet` did, and takes the behaviour change with it.
 */
export function CentredDialog({
  z,
  labelledBy,
  describedBy,
  onDismiss,
  dismissOnScrim,
  dismissOnEscape,
  testId,
  scrimTestId,
  children,
}: CentredDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (!dismissOnEscape) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Only the topmost dialog answers — see `openDialogs`.
      if (openDialogs[openDialogs.length - 1] !== panelRef) return
      onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismissOnEscape, onDismiss])

  useEffect(() => {
    // The ref OBJECT is the stack token: it is stable for this component's whole life, which a
    // fresh `{}` per effect run would not be.
    openDialogs.push(panelRef)
    // The gesture's own origin wins; `document.activeElement` is the fallback for a dialog
    // nobody clicked open (a finished pipeline, a store change). The captured value is
    // connectivity-checked HERE as well as at restore time, so a stale origin left by an
    // earlier interaction can never become this dialog's opener.
    const captured = activationOrigin?.isConnected ? activationOrigin : null
    const active = document.activeElement
    const opener = captured ?? (active instanceof HTMLElement && active !== document.body ? active : null)
    panelRef.current?.focus()
    return () => {
      const at = openDialogs.indexOf(panelRef)
      if (at >= 0) openDialogs.splice(at, 1)
      if (canTakeFocus(opener)) opener.focus()
    }
  }, [])

  return (
    <PhoneOverlayPortal>
      <div
        data-dialog-scrim
        data-testid={scrimTestId}
        onClick={dismissOnScrim ? onDismiss : undefined}
        style={{ ...dialogScrim, zIndex: z }}
      />
      <div
        ref={panelRef}
        data-dialog-panel
        data-testid={testId}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        style={{
          position: 'absolute',
          // The phone's overlay padding, `Layout.spacing.lg`. Its `maxWidth` caps (340 for the
          // delete confirmation, 380 for the export prompt) are NOT ported: inside the demo's
          // frozen 378px frame the panel is 330px wide, so neither cap can bind and porting
          // one would add a value no surface can render.
          left: spacing.lg,
          right: spacing.lg,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: z + 1,
          ...dialogSurface,
          outline: 'none',
          pointerEvents: 'auto',
          // Gated like every other entrance in this feature (`GlassBottomSheet.tsx:331`,
          // `ScreenStage`, `DashboardScreen`, `MediaCaptureScreen`, `ExportHub`). The three
          // copies ran `screenIn` unconditionally; it translates 8px (`demo.css:92-95`), which
          // is exactly what the preference is for.
          animation: reducedMotion ? undefined : 'screenIn 0.2s ease',
        }}
      >
        {children}
      </div>
    </PhoneOverlayPortal>
  )
}
