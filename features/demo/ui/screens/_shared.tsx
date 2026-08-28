'use client'

import { Children, useEffect, useId, useState } from 'react'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import type { CSSProperties, ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PickerOption } from '@/features/demo/engine/content/form-options'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
import { DateTimeField as DateTimeFieldImpl } from '@/features/demo/ui/inputs/DateTimeField'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { glassWizardHeaderBar } from '@/features/demo/ui/controls/header-chrome'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing } from '@/features/demo/ui/tokens/scale'
import { fieldErrorStyle, fieldInputStyle, fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'

/** Enter/Space → activate, for `role="switch"`/`button` divs. */
export function switchKeyDown(activate: () => void) {
  return (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      activate()
    }
  }
}

/**
 * The layers a `ModalShell` may sit on (review R-29). The numbers are OFFSETS added to the
 * shell's own lifted `21` (scrim) / `22` (sheet):
 *
 * - `base` — the prototype's own layer, used by every sheet that opens over a screen.
 * - `overSheet` — for a sheet opened from INSIDE another sheet, which today is the User Profile
 *   editor over the Settings sheet (the demo's only modal-over-modal). 25/26: above the Settings
 *   sheet's 22, and below `PickerSheet`'s 31/32, so the date pickers the editor itself opens still
 *   render over it. Without an explicit layer the winner would be DOM insertion order — true
 *   today, and true for no reason a reader of either file could see.
 *
 * Add a member here rather than passing a number at a call site: the constraint is the ORDER of
 * these values against each other and against `PickerSheet`, and it is only checkable in one place.
 */
export const MODAL_LAYER = { base: 0, overSheet: 4 } as const
export type ModalLayer = (typeof MODAL_LAYER)[keyof typeof MODAL_LAYER]

/**
 * The two z-indexes a `ModalShell` paints on at `MODAL_LAYER.base` — scrim, then panel one above
 * it. Named and exported rather than inlined (review FD-2) because they are one END of an
 * ordering that spans three files: a sheet opened from inside another sheet lands at
 * `SETTINGS_SHEET_Z + MODAL_LAYER.overSheet` and must stay strictly under `PICKER_SHEET_Z`. An
 * invariant asserted against re-typed literals is asserted against nothing.
 */
export const MODAL_SCRIM_Z = 21
export const MODAL_SHEET_Z = 22

const grid = {
  position: 'absolute',
  inset: 0,
  backgroundImage: GLASS.gridOverlay,
  pointerEvents: 'none',
} as const satisfies CSSProperties

/**
 * SEAM(U4.2): the page-sheet chrome - scrim + panel - shared by `ModalShell` and the Settings
 * sheet. Matrix B.2 row 16 / B.7 row 81, demo inventory §4 leverage point 2.
 *
 * `SettingsModal.tsx:64-96` used to be a BYTE-IDENTICAL second copy of these two objects, built
 * from the same z-index constants but not from the same source. The inventory's warning was
 * exact: *"Change `ModalShell`'s sheet look and Settings will silently diverge."*
 *
 * ## Why a seam and not one component
 *
 * Plan §5's U4.2 row offers both and asks which, with the reason: *"`SettingsModal` stops
 * hand-rolling and consumes `ModalShell` (or, if the two header variants genuinely block that,
 * it consumes the scrim + sheet seam and keeps only its own nav bar - record which, with the
 * reason the demo's docblock gives)."* The header variants do block it, and the reason is the
 * one `SettingsModal.tsx:18-25` already recorded: that sheet swaps between a master bar and a
 * pushed detail bar with its own back affordance, so wrapping it in `ModalShell` means either
 * two stacked headers or a "custom header" escape hatch on a component eight other modals
 * depend on. The CHROME is what was duplicated; the chrome is what is now shared.
 *
 * ## The ground is `colors.background`, not `colors.modal`
 *
 * Every page sheet on the phone paints `colors.background` behind `GridBackground` - measured at
 * `dd5551ec`, ten for ten: `UserProfileModal.tsx:133`, `EnrollDeviceModal.tsx:281`,
 * `EnrollmentQRModal.tsx:41`, `ProvisioningWizardModal.tsx:188`, `UserManagementModal.tsx:313`,
 * `NewCaseModal.tsx:250`, `NewLocationModal.tsx:201`, `DuplicateLocationModal.tsx:104`,
 * `EditIncidentLocationModal.tsx:104`, `CaseActionsSheet.tsx:257`. `Colors.dark.modal`
 * (`Colors.ts:213`) has ZERO consumers in the phone repo. See the U4.2 report, R-2.
 *
 * ## `top: 34` and `borderTopLeftRadius: 24` are the demo's own
 *
 * The phone's page sheet is OS chrome (`presentationStyle="pageSheet"`), so its inset and its
 * corner radius are iOS's, not values in any file. These are the demo's web analog of them and
 * have no phone number to match - the same finding D6 ratified for `TAB_BAR_HEIGHT` and U1.4 for
 * `WizardHeader`'s 56px. Do not "correct" them toward `radius.sheet`.
 */
export const modalScrim = {
  position: 'absolute',
  inset: 0,
  zIndex: MODAL_SCRIM_Z,
  // SEAM(U4.4): one of the three scrim darknesses matrix A22 collapses into
  // `palette[scheme].scrim`. Two sites became one here; this is the survivor.
  background: 'rgba(4,8,14,0.55)',
  pointerEvents: 'auto',
} as const satisfies CSSProperties

/** The panel the scrim sits under. See `modalScrim`'s docblock - one recipe, two surfaces. */
export const modalSheet = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 34,
  bottom: 0,
  zIndex: MODAL_SHEET_Z,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  background: colors.background,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  pointerEvents: 'auto',
} as const satisfies CSSProperties

/**
 * The panel's entrance, SEPARATE from the panel, because it is conditional.
 *
 * Both consumers spread it only when the visitor has not asked for reduced motion. It used to
 * live inside the fragment above, unconditionally, so nine surfaces (this shell's eight callers
 * plus the Settings sheet) slid in for people who had asked them not to - while every other
 * inline-styled motion in this feature gates (`features/demo/CLAUDE.md`; U4.1 fixed the same
 * defect on the three picker sheets). Collapsing the two chrome copies is what made it one site.
 *
 * `@/lib/hooks/use-reduced-motion`, not `motion/react`'s: `import/PickerStage.tsx:94` records
 * that the latter caches its `matchMedia` subscription module-globally, and U4.1's
 * `GlassBottomSheet.tsx:5` chose the same way for the same reason.
 */
export const modalSheetEnter = { animation: 'screenIn 0.3s ease' } as const satisfies CSSProperties

/**
 * SEAM(U4.2): the page-sheet header bar - matrix A60, phone `ModalHeader.tsx:54-97`.
 *
 * The phone shipped this block byte-for-byte in five modals (`ModalHeader.tsx:4-11` names them)
 * and again, without the icon or the close control, in every `case-management` page sheet:
 * `NewCaseModal.tsx:252-260` is the same `elevated` LinearGradient over the same
 * `padding: Layout.spacing.lg` + `borderBottomWidth: 1` + `borderBottomColor: glassStyle.border`.
 * `ModalShell` is the demo's single copy of it, so it reads the tier rather than a navy of its
 * own - the drift guard can then see a phone-side re-tint.
 *
 * ## `elevated`, and only two of its four parts
 *
 * `ModalHeader.tsx:52` takes `GlassColors[colorScheme].elevated` and spends exactly `gradient`
 * (`:56`) and `border` (`:59`, on one edge). It never touches `highlightTop` or `innerShadow`.
 * U1.4 made the same finding for the header tier and drew the same line: painting a part the
 * phone leaves unpainted is invention, not a port (`controls/header-chrome.ts:20-35`).
 *
 * ## Longhands only, no border shorthand of any kind
 *
 * The lit-edge ruling (`reports/partner-lit-edge-ruling.md` §1, measured in jsdom AND Chromium
 * across three paints) is that a glass fragment carries NO `border` / `borderColor` / `borderTop`
 * key, and a consumer writes only colour longhands after spreading one. This bar has a single
 * edge rather than a lit top, so it has no highlight to lose - but a `borderBottom:` shorthand
 * here would still be the one slot that turns `{ ...modalHeaderBar, borderBottomColor: X }` into
 * React's `conflicting property` warning and a wrong edge on paint 2. There is no reason to leave
 * the trap in a fragment that eight surfaces render.
 *
 * ## No leading icon prop
 *
 * `ModalHeader` takes a required `icon` (`:29`). Of this shell's eight callers exactly one has a
 * phone counterpart that passes one (`UserProfileModal.tsx:138` - `person-circle-outline`); the
 * other seven port `case-management` page sheets whose headers carry no glyph at all. A required
 * prop with one honest value and seven invented ones is worse than no prop, so the slot is not
 * built here. See the U4.2 report's deferral proposals for the trigger.
 */
export const modalHeaderBar = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm, // ModalHeader.tsx:87
  padding: spacing.lg, // ModalHeader.tsx:85 - was 18
  background: `linear-gradient(180deg,${GLASS_TIER[scheme].elevated.gradient[0]},${GLASS_TIER[scheme].elevated.gradient[1]})`,
  borderBottomStyle: 'solid', // :86 `borderBottomWidth: 1`, spelled in longhands per the ruling
  borderBottomWidth: 1,
  borderBottomColor: GLASS_TIER[scheme].elevated.border, // :59
} as const satisfies CSSProperties

/**
 * The header's two glyph buttons (close, and the optional back chevron).
 *
 * `ModalHeader.tsx:94-96` paints a `padding: Layout.spacing.xs` frame - 24 + 4 + 4 = 32 square -
 * and then hands it `hitSlop={10}` (`:70`), taking the HIT area to 52 while the header stays
 * 32 tall. Its own comment says that is the point: a real 44 (let alone 52) frame would grow the
 * header by 20px.
 *
 * The web has no `hitSlop`. A49/DEF-UI-019's ruling is "real padding or a pseudo-element", and an
 * inline `CSSProperties` object cannot write a pseudo-element - so the padding IS the hit area
 * (14 each side: 24 + 28 = 52) and an equal negative margin hands the 32-square box back to the
 * flex row. The painted glyph lands in exactly the position `padding: 4` put it, because the
 * margin box is 32 either way and the glyph is centred in it.
 */
const modalHeaderIconBtn = {
  cursor: 'pointer',
  display: 'flex',
  background: 'transparent',
  border: 'none',
  padding: 14, // (52 - iconSize.md) / 2
  margin: -10, // 14 - spacing.xs: the phone's hitSlop, spelled as layout
} as const satisfies CSSProperties

/** The bottom-sheet modal chrome shared by the New Case / New Location / Import modals.
 *  `onBack` (optional) renders a chevron before the title for in-modal sub-steps — the
 *  phone's paste-text header shape (chevron-back · title · close, ImportPickerModal.tsx:642-661).
 *
 *  `subtitle` / `footer` / `fillBody` (all optional, added by P3.2) carry the phone's
 *  pageSheet shape for the Case Actions Sheet: header lines under the title, an action row
 *  PINNED below the body (never scrolled away), and a body that hands scrolling to its child
 *  instead of owning it (the sheet's report panel measures its own overflow). Every default
 *  reproduces the pre-P3.2 markup byte for byte, so the three existing callers are untouched. */
export function ModalShell({
  title,
  subtitle,
  onClose,
  closeAccessibilityLabel,
  onBack,
  backLabel = 'Back',
  fillBody = false,
  elevation = MODAL_LAYER.base,
  footer,
  children,
}: {
  title: string
  /** One-line header caption under the title, rendered only when passed (phone
   *  NewLocationModal.tsx:212-219). It becomes the dialog's DESCRIPTION, never part of its
   *  accessible name. ReactNode so richer captions (P3.2's sheet) fit; plain strings for the
   *  phone-parity callers. */
  subtitle?: ReactNode
  onClose(): void
  /**
   * Screen-reader name for the close control. REQUIRED, not defaulted to "Close" - phone
   * `ModalHeader.tsx:32-38`, verbatim: *"five near-identical page sheets that all announce
   * 'Close' are indistinguishable to a screen-reader user, which is the regression DEF-UI-006
   * records for `GlassBottomSheet`'s hardcoded scrim label."* The demo had EIGHT of them.
   *
   * Not `closeLabel`: that is `GlassBottomSheet`'s prop (`GlassBottomSheet.tsx:105`) and it
   * labels the SCRIM. This one is `ModalHeader`'s (`:38`) and it labels the BUTTON. Two phone
   * components, two phone names, two different elements - so both are lifted as they are found.
   */
  closeAccessibilityLabel: string
  onBack?(): void
  backLabel?: string
  fillBody?: boolean
  /**
   * Which layer this sheet sits on. `MODAL_LAYER.base` (the default, every caller before the
   * profile editor) leaves the lifted values 21/22 exactly as they were.
   *
   * A two-member union, not a number (review R-29): the invariant is a RANGE — above the other
   * overlays that portal into the same phone-overlay root, and strictly below `PickerSheet`'s
   * 31/32 so the pickers a sheet CONTAINS still land on top of it — and a bare `number` let any
   * caller pick a value that breaks either end while reading as valid. With two named members the
   * type carries what the comment carried alone, and a new layer has to be added here, next to
   * the values it must sit between.
   */
  elevation?: ModalLayer
  footer?: ReactNode
  children: ReactNode
}) {
  const subtitleId = `${useId()}-subtitle`
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const content = (
    <>
      <div data-modal-scrim onClick={onClose} style={{ ...modalScrim, zIndex: MODAL_SCRIM_Z + elevation }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={subtitle ? subtitleId : undefined}
        // Re-assigning `zIndex` keeps the key in the slot the fragment gave it, so at
        // `MODAL_LAYER.base` the declaration string is byte-identical to the Settings sheet's.
        style={{ ...modalSheet, zIndex: MODAL_SHEET_Z + elevation, ...(reduceMotion ? null : modalSheetEnter) }}
      >
        <div style={grid} />
        <div data-modal-header style={modalHeaderBar}>
          {onBack && (
            <button type="button" aria-label={backLabel} onClick={onBack} style={modalHeaderIconBtn}>
              <svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {/* `flex: 1` is the phone's own title style (`ModalHeader.tsx:92`): the stack takes the
              row and pushes the close glyph to the padding edge, which is why the bar needs no
              `justifyContent` of its own. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: colors.text }}>{title}</div>
            {subtitle && (
              <div id={subtitleId} data-testid="modal-subtitle" style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button type="button" aria-label={closeAccessibilityLabel} onClick={onClose} style={modalHeaderIconBtn}>
            <svg width={iconSize.md} height={iconSize.md} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          style={
            fillBody
              ? // The child owns its own scrolling (and its own overflow measurement);
                // `minHeight: 0` lets it shrink inside the flex column instead of pushing
                // the pinned footer off the sheet. Column flex so the child can claim the
                // remaining height with `flex: 1` and MEASURE it.
                {
                  position: 'relative',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column' as const,
                }
              : { position: 'relative', flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 18 }
          }
        >
          {children}
        </div>
        {footer && <div style={{ position: 'relative', padding: 18, borderTop: GLASS.border }}>{footer}</div>}
      </div>
    </>
  )
  return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>
}

/**
 * SEAM(U6.4a): the ONE validation-message line — A72's error half, composed.
 *
 * `styles.errorContainer` + `styles.errorText` (`TextInput.tsx:181-186`) supply the geometry
 * (`tokens/field-input.ts`'s `fieldErrorStyle`); this adds the severity glyph and lets the
 * caller own the live-region semantics.
 *
 * ## The colour is a deliberate divergence from the phone, and it is the campaign's ruling
 *
 * The phone paints `color: colors.error` (`:128`). Matrix §C.3 rule 1 — adjudicated-closed as
 * `P8-DEF-A` and called *"the single most portable recipe in the whole ledger"* — forbids
 * exactly that:
 *
 *   "Stop using red as text. […] The answer is not a better red — it is severity on the icon
 *    (3:1 non-text floor), text in `colors.text`."
 *
 * It names `#ff6b78` — the value four of this component's five call sites used to carry —
 * among the six error-text reds *"doing exactly what this rule forbids"*. Measured by U6.1 on
 * the dark glass grounds `ui/__tests__/palette-contrast.test.ts` composites (background + both
 * `card` stops + both `nestedCard` stops): `#ff6b78` **3.84** worst / 5.34 best, the phone's
 * `colors.error` **3.16** / 4.40 — so porting the phone's token verbatim would have LOWERED
 * these lines, and neither red clears AA's 4.5 at any size. Severity moves to the glyph, which
 * is a non-text mark and needs only 1.4.11's 3.0 (3.16 clears it); the message takes
 * `colors.text` at **9.56** worst.
 *
 * ## Why the semantics are the CALLER's and not baked in
 *
 * `role="alert"` is right for a message raised by a deliberate act — a refused submit, a blur
 * that failed to parse — and it is what `Field` and both `CoordinateField`s pass. It is WRONG
 * for the two blocked-reason lines (`NewLocationModal`, `DuplicateLocationModal`), which sit
 * INSIDE an unconditionally-rendered `role="status"` region: that region exists before it has
 * content on purpose (a region created together with its text is not reliably announced), and
 * nesting an assertive `role="alert"` inside a polite `role="status"` is the exact defect U6.2
 * refused when it declined to fold `PaneNote` onto `Banner`. So `role` is optional and the two
 * blocked lines omit it — they are already inside their region.
 *
 * ## The glyph
 *
 * `Banner`'s `error` alert-circle — the mark the demo already reads as "error" at
 * `PickerStage`, `ImportModal` and `DemoErrorBoundary` — at `iconSize.xs` beside 14px text
 * rather than `BannerIcon`'s `iconSize.sm`, which is sized for a callout. `aria-hidden`,
 * because the message beside it already carries the severity in words.
 */
export function FieldError({
  id,
  role,
  style,
  children,
}: {
  id?: string
  /** `'alert'` where this line IS the live region. Omitted where the caller already is one. */
  role?: 'alert'
  /** Caller LAYOUT only (margins). Never a colour: the ruling above is the point. */
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div id={id} role={role} style={style ? { ...fieldErrorStyle, ...style } : fieldErrorStyle}>
      <svg
        aria-hidden="true"
        width={iconSize.xs}
        height={iconSize.xs}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.error}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      {children}
    </div>
  )
}

/** A labelled text input (or textarea when `multiline`), lifted from the prototype's form styling. */
export function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  hint,
  error,
  readOnly,
  multiline,
  maxLength,
  autoCorrect,
}: {
  label: string
  required?: boolean
  value: string
  onChange(value: string): void
  placeholder?: string
  hint?: string
  /**
   * Validation message for THIS field — the phone's shared `TextInput` `error` prop.
   *
   * Reddens the border, sets `aria-invalid`, and REPLACES `hint`: the phone renders the error
   * line OR the helper line, never both (`src/components/common/TextInput.tsx:113-125` —
   * `{error && …}` then `{!error && helperText && …}`).
   *
   * ONE treatment for both kinds of caller (P3 assembly; three spellings of this prop landed
   * in parallel). The message carries BOTH `role="alert"` and an id the input's
   * `aria-describedby` points at, which is a superset, not a compromise:
   *  - `role="alert"` is what a SUBMIT-TIME message needs (P3.3's "Case number is required"
   *    on a refused Create). Focus is on the button at that moment, so `aria-describedby` on
   *    the input would announce nothing at all — a silently refused submit;
   *  - `aria-describedby` is what a field-focused visitor needs, and it re-reads the message
   *    on every return to the field.
   * P3.4 dropped `role="alert"` for fear a LIVE per-keystroke check would interrupt
   * continuously. It does not: the live callers pass a CONSTANT string from a conditionally
   * mounted node (`NEW_LOCATION_BLOCK_MESSAGES.duplicateName`), so the region announces when
   * the collision appears and stays silent while the visitor keeps typing into it.
   */
  error?: string
  /** Displays the value but refuses edits — dimmed like the phone's `readOnlyField`
   *  treatment (`NewCaseModal.tsx:494-498`). Still focusable and selectable, so the value
   *  can be read and copied; `disabled` would take it out of the tab order entirely. */
  readOnly?: boolean
  multiline?: boolean
  /** Hard cap on typed length — the phone's `TextInput` `maxLength` (`MetadataForm.tsx:101`,
   *  `:113`). A refused keystroke, not a validation state: the value can never exceed it. */
  maxLength?: number
  /**
   * `false` for a field holding a machine-facing value rather than prose — a filename, an
   * identifier, pasted evidence text. Turns off the browser's three text-assist behaviours
   * TOGETHER, because they are one decision and leaving any of them on re-introduces the same
   * problem: autocorrect rewriting a name, autocapitalize changing its first letter, the
   * spellcheck underline claiming a correct value is wrong.
   *
   * The phone spells the same decision `autoCapitalize="none"` + `autoCorrect={false}`
   * (`MetadataForm.tsx:99-100`); the demo's import paste step spells it with all three
   * (`import/PasteStage.tsx:71-73`).
   */
  autoCorrect?: boolean
}) {
  const errorId = `${useId()}-error`
  const describedBy = error ? errorId : undefined
  const invalid = error ? true : undefined
  // `readOnly` IS the phone's `editable={false}`, i.e. its `isDisabled` (`TextInput.tsx:67`).
  const [focused, setFocused] = useState(false)
  const boxStyle = fieldInputStyle({ error: Boolean(error), focused, disabled: readOnly })
  const focusProps = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
  // The read-only dimming lives on the BOX, never on the wrapper below. A wrapper opacity
  // takes the LABEL down with it — the exact defect the phone's PR #115 fixed and D10 forbids
  // ("never fade a label that carries data"). `NewCaseModal.tsx:215` renders this path for
  // the case number of an existing case.
  const assist =
    autoCorrect === false
      ? ({ autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false } as const)
      : {}
  return (
    // The block's own rhythm is the phone's `styles.container` (`TextInput.tsx:151-153`):
    // `marginBottom: Layout.spacing.md` (was 14).
    <div style={{ marginBottom: spacing.md }}>
      {/* U6.4a: `styles.labelContainer:155-157` + `styles.label:158-161` are the SEAM now
          (`tokens/field-input.ts`), because seven other surfaces were hand-rolling the same
          four keys. Read the seam's docblock before changing anything here. */}
      <div style={fieldLabelStyle}>
        {label}
        {/* `:110` — `styles.required` in `colors.error`. Same hex, now the token. */}
        {required && <span style={{ color: colors.error }}> *</span>}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          readOnly={readOnly}
          rows={3}
          maxLength={maxLength}
          {...assist}
          {...focusProps}
          // `styles.multiline` (`TextInput.tsx:175-179`): `minHeight: 100` (was 76). Its
          // `paddingTop: Layout.spacing.md` is NOT re-declared — `fieldInputStyle` already
          // writes `padding: 16`, and a `paddingTop` after a `padding` is the exact clobber
          // `vitest.setup.ts`'s tripwire exists to catch (it shipped once, in
          // `CompletionScreen`). `textAlignVertical: 'top'` is RN-only; a `<textarea>` is
          // top-aligned by construction. The other three keys are the demo's web affordances.
          style={{ ...boxStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          readOnly={readOnly}
          maxLength={maxLength}
          {...assist}
          {...focusProps}
          style={boxStyle}
        />
      )}
      {error ? (
        /* The recipe is `FieldError`'s — see its docblock, and do not re-derive it here. */
        <FieldError id={errorId} role="alert">
          {error}
        </FieldError>
      ) : (
        /* `styles.helperContainer` + `styles.helperText` (`:181-186`) — `spacing.xs`,
           `fontSize.sm`; `:133` paints `colors.textSecondary`. The demo's `#7a9fc4` is
           `textTertiary`, which D5's rider bars from NEW text (3.81 worst vs 5.24). */
        hint && <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs }}>{hint}</div>
      )}
    </div>
  )
}

/** A collapsed-by-default disclosure for secondary modal fields (OIC, Video Coordinator). */
export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  // Phone `FormSection.tsx:67` — `useState(defaultCollapsed)`, and `:60` defaults it FALSE, so
  // these sections open. Neither call site overrides it. Controlled rather than a bare `open`
  // attribute: React re-asserts `open` on every render, so an uncontrolled one springs back
  // open the next time the modal re-renders.
  const [open, setOpen] = useState(true)
  return (
    /* Phone `FormSection` in its NON-glass branch (`:142-147`) — `NewCaseModal.tsx:333-334`
       and `:367-368` pass `collapsible` WITHOUT `glass`. That branch's entire styling is
       `marginBottom: Layout.spacing.lg`: no fill, no border, no radius. The card this used to
       paint (`rgba(13,27,42,0.4)` on `GLASS.border`) was prototype furniture from `802ab13`,
       never a port, and its ground was the retired navy in the rgb spelling DP-4 exposed. */
    <details
      className="demo-accordion"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      style={{ marginBottom: spacing.lg }}
    >
      {/* Phone `:175-187`: the header is a rule, not a bar — `paddingBottom: spacing.sm`, a 1px
          `colors.border` bottom edge, `marginBottom: spacing.md`, title at `fontSize.lg`/
          semibold. Three longhands rather than the `borderBottom` shorthand, so width and colour
          stay separately readable (HANDOFF §4 — jsdom does not decompose a shorthand). */}
      <summary
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: spacing.sm,
          marginBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: colors.border,
          fontSize: 18,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        <span>{title}</span>
        {/* Phone `:80-84` + `:190-195`: a `+`/`−` GLYPH at `fontSize['2xl']` bold, `width: 24`,
            centred, on `textSecondary` — not the chevron this used to draw. `aria-hidden`
            because `<summary>` already announces its own expanded state. */}
        <span aria-hidden="true" style={{ fontSize: 24, fontWeight: 700, width: 24, textAlign: 'center', color: colors.textSecondary }}>
          {open ? '−' : '+'}
        </span>
      </summary>
      {children}
    </details>
  )
}

/** Cancel / primary action row at the foot of a modal. */
export function ModalActions({
  cancelLabel = 'Cancel',
  submitLabel,
  onCancel,
  onSubmit,
  submitBlocked = false,
  submitDescribedBy,
}: {
  cancelLabel?: string
  submitLabel: string
  onCancel(): void
  onSubmit(): void
  /**
   * The form's gate is unsatisfied: the primary action reads as unavailable (dimmed +
   * `aria-disabled`) but STILL FIRES `onSubmit`. **The caller MUST guard** — this prop is
   * presentation + a11y only, and deleting a caller's validate-and-return re-opens the submit.
   *
   * Never the `disabled` attribute: it drops keyboard focus to `<body>`, and a gate that flips
   * on a keystroke would strand the visitor mid-form (the R-7/R-15 house choice, and §45a's
   * `aria-disabled`-over-`disabled` precedent on the GPS capture button).
   *
   * WHY THE CLICK IS NOT SWALLOWED HERE (P3 assembly — three spellings of this gate landed in
   * parallel and this is the union of their semantics): the phone hard-`disabled`s Create Case
   * while Case Number or Unit is blank (`NewCaseModal.tsx:445`) using the SAME predicate as its
   * `validateForm`, which makes that function's messages ("Case number is required" / "Unit is
   * required") permanently unreachable. Letting the click through so the caller's handler can
   * surface those verbatim messages ships the phone's copy live instead of dead (§50a). A
   * caller whose reason is ALREADY on screen (a live region, per `submitDescribedBy`) simply
   * returns from its guard and nothing further happens — the same user-visible behaviour a
   * swallow gave it, with enforcement kept where it can be read.
   */
  submitBlocked?: boolean
  /** Id of the element stating WHY the action is blocked; described from the button while
   *  blocked so a keyboard user landing on it hears the reason without activating it. */
  submitDescribedBy?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <button type="button" onClick={onCancel} style={{ flex: 1, ...buttonStyle({ variant: 'secondary' }) }}>
        {cancelLabel}
      </button>
      <button
        type="button"
        // Deliberately unguarded — the caller's handler is the enforcement point. See the
        // `submitBlocked` doc above before "fixing" this.
        onClick={onSubmit}
        aria-disabled={submitBlocked}
        aria-describedby={submitBlocked ? submitDescribedBy : undefined}
        // `submitBlocked` is deliberately NOT the `disabled` ATTRIBUTE (see its doc above —
        // the caller's handler is the enforcement point and must still run). It is the disabled
        // PAINT only, which is exactly what D10 buys: `colors.disabled` fill + `disabledText`
        // label, replacing the `opacity: 0.45` this carried.
        style={{ flex: 1, ...buttonStyle({ disabled: submitBlocked }) }}
      >
        {submitLabel}
      </button>
    </div>
  )
}

/**
 * Sticky wizard header — back arrow + title + hamburger (opens the wizard drawer).
 *
 * The bar is the `header` glass tier (A37 / U1.4). This is the demo's counterpart of the
 * phone's `Header.tsx` glass variant, the ONE header-tier consumer there that also paints the
 * tier's lit top edge — hence `glassWizardHeaderBar` rather than the plain bar. The `56px` top
 * padding is the demo frame's own status-bar clearance and stays the demo's (A37 carries no
 * geometry; the phone's `Layout.headerPadding.ios` is a notch inset with nothing here to match,
 * the same finding D6 ratified for `TAB_BAR_HEIGHT`).
 */
export function WizardHeader({ title, onBack, onMenu }: { title: string; onBack(): void; onMenu(): void }) {
  const iconBtn: CSSProperties = { cursor: 'pointer', display: 'flex', padding: 4, background: 'transparent', border: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 16, padding: '56px 12px 11px', ...glassWizardHeaderBar }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" aria-label="Back" onClick={onBack} style={iconBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
      </div>
      <button type="button" aria-label="Menu" onClick={onMenu} style={iconBtn}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </button>
    </div>
  )
}

/**
 * Primary CTA at the foot of a wizard screen.
 *
 * `label` is DERIVED, never written here: the bridge builds it with `nextCtaLabel`
 * (`engine/logic/form-visibility.ts`) from the next VISIBLE step, exactly as the phone's
 * `useWizardNav` does. The demo used to hard-code "Continue →" at nine call sites and
 * "Next: Requested Scope" at a tenth — prototype residue, and the very pair of anti-patterns the
 * phone retired (`hooks/useWizardNav.ts:6-8`).
 *
 * `null` renders nothing, which is the phone's `{nav.next && <Button …>}`
 * (`app/(form)/requested-scope.tsx:182-186`). It is not a fallback and it has no substitute
 * copy — see `nextCtaLabel`'s docblock for why only `completion` reaches it, and `completion`
 * renders no CTA.
 */
export function WizardNext({ label, onClick }: { label: string | null; onClick(): void }) {
  if (label === null) return null
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', ...buttonStyle() }}>
      {label}
    </button>
  )
}

/**
 * A titled form section card — the phone's `FormSection` (`src/components/form/FormSection.tsx`
 * at `dd5551ec`) in its GLASS branch, which is the only branch the demo renders: all five
 * consumers (`CompletionScreen`, `DvrInfoScreen`, `ExportInfoScreen`, `SubmissionScreen`,
 * `TimeOffsetScreen`) are glass sections. Matrix A77.
 *
 * ## Three RN nodes collapse to one web node
 *
 * The phone paints the glass branch with a stack (`:126-139`): an `overflow:'hidden'` wrapper
 * carrying `Layout.shadow.card`, an absolutely positioned 1px `highlight` View, and the
 * `LinearGradient` that carries the border and the padding. On the web `glassCard` already
 * spells all four parts of the tier in ONE declaration — the gradient, the three side border
 * longhands plus the lit `borderTopColor` (A31), the inner shadow and `GLASS.shadowCard` (A44)
 * — so the wrapper and the highlight strip have nothing left to do. `overflow: 'hidden'` is
 * kept from the wrapper (`:159`): it is what clips a child to the card's corner, which the
 * radius alone does only for the background.
 *
 * ## The header's bottom margin is the phone's TWO values, summed
 *
 * The phone puts `marginBottom: Layout.spacing.md` (16) on the header (`:182`) and
 * `marginTop: Layout.spacing.sm` (8) on a content wrapper (`:198`) — 24 between the title rule
 * and the first field, because RN does not collapse margins. CSS does: two adjacent siblings'
 * facing margins collapse to the LARGER, so spelling the pair verbatim would render 16 and
 * silently lose 8px. The sum is written on the header instead, and the content wrapper is not
 * created — same rendered 24, one node rather than two. (The one case that diverges is a first
 * child carrying its own `marginTop`, which would collapse into this 24 instead of adding to
 * it. No consumer has one: `Field`, `SelectField` and `DateTimeField` all lead with
 * `marginBottom`.)
 */
export function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  // Phone `:114-120`, load-bearing: a section whose every field is gated off by Form
  // Customization renders NOTHING, not an empty titled box. `Children.toArray` drops
  // false/null/undefined and flattens fragments, so an all-`{show && <Field/>}` section
  // resolves to []. Two consumers rely on it today by hoisting the same test to the call site
  // (`DvrInfoScreen.tsx:84-86`, `SubmissionScreen`'s `showRequester`); with the guard in the
  // recipe a third consumer cannot forget it.
  if (Children.toArray(children).length === 0) return null
  return (
    <div style={{ marginBottom: spacing.lg, ...glassCard, overflow: 'hidden', padding: spacing.md }}>
      <div
        style={{
          // Phone `:184-187` — `Typography.fontSize.lg` / `fontWeight.semibold`. 17 -> 18 is a
          // step on plan §4.9's ladder, not a re-tune.
          fontSize: 18,
          fontWeight: 600,
          color: colors.text,
          // Phone `:180` — `paddingBottom: Layout.spacing.sm` (was 10).
          paddingBottom: spacing.sm,
          // Phone `:182` + `:198`, summed — see the docblock (was 14).
          marginBottom: spacing.md + spacing.sm,
          // Phone `:181` + `:75`: the rule is 1px and TRANSPARENT under glass. It holds its
          // 1px of layout and paints nothing; the demo used to draw `GLASS.border` here.
          // Three longhands rather than the `borderBottom` shorthand the demo had, so the
          // width and the colour are separately readable — jsdom does not decompose a
          // shorthand into the sides a pin needs (HANDOFF §4, measured by U3.3).
          borderBottomWidth: 1,
          borderBottomStyle: 'solid',
          borderBottomColor: 'transparent',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

/** Date+time field bound to a store 'YYYY-MM-DD HH:MM:SS' string — separate Date/Time
 *  buttons (bottom-sheet calendar + HH:MM:SS wheel) matching the phone app. */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return <DateTimeFieldImpl label={label} value={value} onChange={onChange} />
}

/** A labelled dropdown bound to a string value — the custom picker matching the phone app.
 *  Options are plain strings or `{ label, value }` pairs (see `DropdownProps`).
 *
 *  `label` is OPTIONAL (P7.1): every settings picker on the phone leaves the shared `Picker`'s
 *  own `label` prop unset and renders the label as a separate line above it (ui-mapping 12
 *  documents this on all six of them — it is why their bottom sheets read "Select an option").
 *  Omitting it here reproduces that exactly, and `Dropdown` already handles the absence, sheet
 *  title included. Wizard callers pass it as before.
 *
 *  A label-less caller MUST pass `a11yLabel` (R-9): the sheet that opens on top of the trigger
 *  is outside `PaneGroup`'s `role="group"` boundary, so without it the dialog and its menu both
 *  announce the bare placeholder. `SelectFieldName` is what makes that a compile error rather
 *  than a convention (FD-4) — see its own note. */
export function SelectField({ label, a11yLabel, value, onChange, options }: SelectFieldProps) {
  return <Dropdown label={label} a11yLabel={a11yLabel} value={value} onChange={onChange} options={options} placeholder="Select…" />
}

/**
 * Naming, as a union: a `SelectField` is either visibly labelled or invisibly labelled, never
 * neither (FD-4, the `RetentionView` precedent — "the union makes the impossible state
 * unrepresentable").
 *
 * Two independent optionals permitted a THIRD state neither caller wants: no `label`, no
 * `a11yLabel`, and a picker whose trigger, sheet title and menu all announce the bare
 * placeholder. Every call site is correct today; this closes the shape, not a bug.
 *
 * The `label?: undefined` arm is load-bearing — without it, excess-property checking lets an
 * object literal satisfy the a11y arm while also carrying a `label`, which is the very
 * combination the phone-parity rule forbids for the settings pickers.
 */
export type SelectFieldName =
  /** Visibly labelled (the wizard callers): `Dropdown` renders the line AND names the sheet. */
  | { label: string; a11yLabel?: undefined }
  /** Invisibly labelled (the six settings pickers): no visible line, sheet + menu still named. */
  | { label?: undefined; a11yLabel: string }

export type SelectFieldProps = SelectFieldName & {
  value: string
  onChange(value: string): void
  options: ReadonlyArray<string | PickerOption>
}

/**
 * SEAM(U2.3): THE on/off switch (keyboard-operable). The demo's only switch renderer.
 *
 * Three verbatim re-implementations of the track below used to exist — `FormFieldsPane`'s
 * `RowSwitch`, `TimeOffsetScreen`'s DST row and `GpsCaptureControl`'s geocode toggle — and U2.3
 * deleted all three onto this one (matrix A76; demo §4.7 leverage point 4). `hideLabel` is what
 * made that possible: two of the three drew no inline label because their host already draws one.
 * `screens/__tests__/one-switch-renderer.test.ts` fails if a fourth appears.
 *
 * The phone uses the PLATFORM switch (`common/Switch.tsx:51-56`), so the only portable spec is
 * colour + row — off-track `colors.border`, on-track `colors.primary`, label 16/500 `colors.text`,
 * row `space-between` with the label taking the slack (`Switch.tsx:74-81`). The track/thumb
 * GEOMETRY is demo-owned by necessity (the web has no platform switch) and is kept.
 */
export function Toggle({
  label,
  on,
  onClick,
  disabled,
  disclosure,
  hideLabel = false,
  testId,
}: {
  label: string
  on: boolean
  onClick(): void
  /**
   * Present ⇒ the switch states its value but refuses to change it (P7.1), and `reasonId` is the
   * id of the element saying WHY. `aria-disabled` + an inert handler, never the `disabled`
   * attribute — this is a `role="switch"` div, and the house rule (`ModalActions.submitBlocked`,
   * the GPS capture button's §45a precedent) is that a control stays focusable so a keyboard
   * visitor can reach it and hear why it is unavailable.
   *
   * ONE member carrying both facts, not a `disabled` boolean beside a `describedBy` string
   * (review F39, and the same FD-4 move `disclosure` makes below). The rule has two halves and
   * P7.1 shipped one: `aria-disabled` announces a STATE ("dimmed") and carries no reason, and in
   * focus mode a screen reader reads only the focused node's name/role/state — never an
   * unlabelled sibling. So "hear why from the copy beside it" was true of the pixels and false of
   * the accessibility tree, and a visitor could not tell "deliberately locked" from "broken". The
   * cited precedent does both halves (`ModalActions` at :346-347), as does every other inert
   * control in this feature (`DuplicateLocationModal.tsx:95`, `OcrCaptureScreen.tsx:445`,
   * `MediaCaptureScreen.tsx:737`).
   *
   * The split pair let the type permit exactly the defect its own docblock narrated — an inert
   * switch with nothing to point at, and (the mirror) a reason id on a live switch that would
   * never be applied. This is the demo's ONLY switch renderer and `one-switch-renderer.test.ts`
   * concentrates every future inert switch on it, so the guarantee belongs in the type rather
   * than in four call sites' good manners. Pinned at compile time in
   * `screens/__tests__/Toggle.test.tsx`.
   */
  disabled?: { reasonId: string }
  /**
   * This switch reveals a block (R-34): the id it reveals, and whether it is revealed right now.
   * Flipping a settings switch that inserts a whole configuration block announced "on" and
   * nothing else; `aria-controls` + `aria-expanded` name what appeared, so a focus-mode visitor
   * gets the signal a sighted one does.
   *
   * ONE member, not two optionals (FD-4). The split pair permitted `controls` without
   * `expanded` — a switch advertising a disclosure relationship while withholding its state,
   * which is exactly the shape that loses axe's disclosure carve-out and announces a control
   * that governs something unknown. The two facts arrive together or not at all, so the type
   * says so. Same move as R-7's required `valueText` and R-23/R-29's nameable modes.
   */
  disclosure?: { controls: string; expanded: boolean }
  /**
   * Paint the track ALONE — no row, no inline label — for a host that already draws the label
   * itself. `label` stays required and stays the accessible name: printing it here as well would
   * read twice to a sighted visitor and once too often to a screen reader, which is the whole
   * reason `FormFieldsPane` re-implemented the track rather than reuse this component.
   *
   * A plain boolean, not a props union: unlike `SelectField`'s `a11yLabel` split, nothing about
   * the CONTRACT changes between the two modes — the same name, the same states, the same
   * handlers. Only the painting does.
   */
  hideLabel?: boolean
  /** `data-testid` on the switch element itself (`RowSwitch`'s, which the pane tests address). */
  testId?: string
}) {
  const activate = () => {
    if (!disabled) onClick()
  }
  /** Every state and handler the two modes share; only the node they land on differs. */
  const switchProps = {
    role: 'switch',
    'aria-checked': on,
    'aria-disabled': disabled ? true : undefined,
    'aria-describedby': disabled?.reasonId,
    'aria-controls': disclosure?.controls,
    'aria-expanded': disclosure?.expanded,
    'aria-label': label,
    'data-testid': testId,
    tabIndex: 0,
    onClick: activate,
    onKeyDown: switchKeyDown(activate),
  } as const
  const track: CSSProperties = {
    flex: '0 0 auto',
    width: 46,
    height: 28,
    borderRadius: 14,
    background: on ? colors.primary : colors.border,
    position: 'relative',
  }
  // Recorded divergence (plan §5 U2.3): the phone's thumb is `colors.background` — the navy the
  // app sits on. The demo keeps white-on / faint-off, a web-legibility choice, since there is no
  // platform switch drawing the puck's own shadow and elevation. (Spelling the phone's hex out
  // here trips `glass-tokens.test.ts`'s banned-literal scan, which reads source TEXT — U0's
  // successor note 5 says the same about `palette.ts`'s own docblock.)
  const thumb = (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', top: 3, [on ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: on ? '#fff' : '#7a9fc4' }}
    />
  )
  const cursor = disabled ? 'not-allowed' : 'pointer'
  const opacity = disabled ? 0.55 : 1

  // With no row to fade, the D10 disabled treatment lands on the track itself.
  if (hideLabel) {
    return (
      <div {...switchProps} style={{ ...track, cursor, opacity }}>
        {thumb}
      </div>
    )
  }

  return (
    <div
      {...switchProps}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor,
        padding: '4px 0',
        opacity,
      }}
    >
      {/* `flex: 1` + a 16px gutter is the phone's own label style (`Switch.tsx:76-81`): the
          label takes the slack so a long one wraps instead of squeezing the 46px track. */}
      <span style={{ fontSize: 16, fontWeight: 500, flex: 1, marginRight: 16, color: colors.text }}>{label}</span>
      <div style={track}>{thumb}</div>
    </div>
  )
}

/**
 * "+ Add …" dashed button used by the three array wizard screens (`ArrivalDepartureScreen`,
 * `CamerasScreen`, `RequestedScopeScreen`).
 *
 * DEMO-ONLY: the phone has no dashed "add a row" affordance anywhere — `grep -rn dashed src/
 * app/` at `dd5551ec` returns a PDF-template rule, the OCR bounding box and prose. So there is
 * no recipe to lift, and this stays the demo's own control at its own geometry (`marginBottom:
 * 14` is one of the lifted literals demo §0.4 forbids tidying).
 *
 * The COLOURS are not the demo's own, though. A66/A27's rule reaches any accent-as-text: at
 * 14/600 the old `primaryLight` label measured 3.77 on the worst dark glass ground and
 * `colors.link` measures 6.90. The dashed border keeps `colors.borderLight`, whose A8 re-base
 * landed in U0.1, because the LABEL is what carries this affordance and not the outline.
 */
export function AddRowButton({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', textAlign: 'center', padding: spacing.base, borderRadius: radius.control, border: `1px dashed ${colors.borderLight}`, background: 'transparent', color: colors.link, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }}>
      {label}
    </button>
  )
}
