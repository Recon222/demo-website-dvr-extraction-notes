import type { CSSProperties } from 'react'

import { palette, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U2.1): the ONE text-input recipe. Matrix A72, demo §4.7's #1 leverage point.
 *
 * Before this module the demo declared the same nine-key style object in FIVE places, all
 * byte-identical and none importing any of the others — `_shared.tsx:188` (module-local, not
 * exported), `inputs/AddressAutocomplete.tsx:36`, `inputs/IncidentLocationFields.tsx:88`,
 * `screens/NewCaseModal.tsx:53` and inline at `screens/SubmissionScreen.tsx:148`. Every text
 * input in the product now resolves here, so a phone-side re-tint moves all of them at once.
 *
 * ## A FUNCTION, not a spreadable const
 *
 * The phone's border is a four-way precedence over live state (`TextInput.tsx:70-75`), so a
 * static fragment cannot carry it — every adopting site would re-derive the override, which is
 * exactly the duplication this seam exists to remove. Two sites already did: `_shared.tsx:264`
 * (`error ? { ...fieldInput, borderColor: '#ff4757' } : fieldInput`) and `NewCaseModal`'s copy.
 *
 * ## The recipe, transcribed
 *
 * `styles.input` (`TextInput.tsx:166-173`), which PR #115 left byte-identical to baseline:
 * `borderWidth 1` · `borderRadius Layout.borderRadius.md` (8) · `paddingHorizontal` and
 * `paddingVertical` both `Layout.spacing.md` (16) · `fontSize Typography.fontSize.base` (16) ·
 * `minHeight Layout.touchTarget.min` (44). Plus `styles.inputError`'s `borderWidth: 2`
 * (`:174`), which the phone's style array applies on `error` alone — so a field that is both
 * disabled and in error keeps the disabled COLOUR and takes the error WIDTH. That is
 * transcription, not a judgement call.
 *
 * Dynamic (`:78-90`): `backgroundColor: colors.background`, the precedence `borderColor`, and
 * `color: isDisabled ? colors.textSecondary : colors.text`.
 *
 * Two keys are the demo's own and have no phone counterpart, both load-bearing:
 *  - `width: '100%'` — RN's `TextInput` fills its flex parent; CSS's shrinks to its `size`
 *    attribute. All five copies carried it.
 *  - `outline: 'none'` — RN has no focus ring. Suppressing the browser's is only defensible
 *    because the `focused` branch paints `colors.primary` on the border instead; the two are
 *    one decision and neither may be deleted alone.
 *
 * ## What is deliberately NOT here
 *
 * - **The placeholder colour.** The phone passes `placeholderTextColor={colors.textTertiary}`
 *   (`:121`). The web spells that `::placeholder`, which needs a stylesheet rule, and
 *   `ui/demo.css` is U8.2's alone (§6.1). Reported as a deferral proposal rather than smuggled
 *   in — the demo has no placeholder styling today, so nothing regresses meanwhile.
 * - **`styles.multiline`** (`minHeight 100`, `paddingTop 16`). `Field`'s textarea geometry is
 *   `_shared.tsx`'s and U6.1 owns that block; this seam is the input box.
 * - **A fill change.** DEF-UI-011 refused `backgroundSecondary` on measurement (1.04/1.09
 *   inside a glass card versus 1.20/1.37 retained) — the fill is `background` in every state.
 */
const c = palette[scheme]

/**
 * A72's LABEL half — U6.4a. `styles.labelContainer` (`TextInput.tsx:155-157`) supplies
 * `marginBottom: Layout.spacing.xs`, `styles.label` (`:158-161`) the `Typography.fontSize.sm`
 * / `fontWeight.medium` pair, and `:105` paints it `colors.text`.
 *
 * ## Why this is a seam and not a style on `Field`
 *
 * U6.1 moved `Field`'s label onto these values and left the recipe inline. It was never
 * `Field`'s alone: the demo declared the SAME four-key object at **eight** sites, all
 * byte-identical at `13 / 500 / #cdd9e6 / 6` and none importing any of the others —
 * `_shared.tsx`'s `Field`, `inputs/AddressAutocomplete.tsx`, `inputs/DateTimeField.tsx`,
 * `inputs/Dropdown.tsx`, `inputs/IncidentLocationFields.tsx`, `screens/NewCaseModal.tsx`'s
 * `CoordinateField`, `screens/SubmissionScreen.tsx` and
 * `screens/settings/UserProfileModal.tsx`. Two of the eight reached the tone through
 * `T.textDim`; the other six spelled the hex. Fixing `Field` alone left seven surfaces a step
 * smaller and a step darker than the field beside them — which is U2.4 deferral D-3's whole
 * point, and why its trigger is this package.
 *
 * `T.textDim` is DELETED rather than re-pointed. It had no palette sibling (it was the one key
 * in `T` that was not an alias), so every site spelling it was invisible to `palette[scheme]`
 * and the one-line light flip (plan §9 clause 12) would have left all eight on the dark half.
 * Deleting the key is also the guard: a surface that re-grows a private label is a compile
 * error, not a review finding.
 *
 * The required asterisk is deliberately NOT here. It is one `<span>` at the two sites that
 * take a `required` flag, both already naming `colors.error`; a second export to carry a token
 * both call sites already spell would add a hop and remove no duplication.
 */
export const fieldLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: c.text,
  marginBottom: spacing.xs,
}

/**
 * A72's ERROR-LINE half — U6.4a, and the row that closes U6.1 deferral proposal 2 for every
 * site its four modals reach.
 *
 * The LAYOUT only; the glyph and the semantics belong to the caller (see `FieldError` in
 * `screens/_shared.tsx`, which composes both). `errorContainer` (`TextInput.tsx:181-183`) is
 * `marginTop: Layout.spacing.xs`, `errorText` (`:184-186`) is `fontSize.sm`.
 *
 * **The colour is `colors.text`, not `colors.error`, and that is matrix §C.3 rule 1** — the
 * campaign's adjudicated-closed `P8-DEF-A`, measured by U6.1 over the same dark grounds
 * `ui/__tests__/palette-contrast.test.ts` composites: the retired red 3.84 worst / 5.34 best,
 * the phone's own `colors.error` 3.16 / 4.40, `colors.text` 9.56 / 13.30. Porting the phone's
 * token verbatim would have LOWERED this line. Severity moves to the glyph, which is a
 * non-text mark and needs only 1.4.11's 3.0.
 */
export const fieldErrorStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing.xs,
  fontSize: 14,
  color: c.text,
  marginTop: spacing.xs,
}

/** The live state a caller has; every flag defaults to false. */
export interface FieldInputState {
  /** The field displays a value it refuses to edit (`editable={false}` on the phone). */
  disabled?: boolean
  /** A validation message is showing for THIS field. */
  error?: boolean
  /** The field holds focus. Paints the indicator `outline: 'none'` suppresses. */
  focused?: boolean
}

export function fieldInputStyle({ disabled = false, error = false, focused = false }: FieldInputState = {}): CSSProperties {
  // `TextInput.tsx:70-75`, in order. A `borderColor` longhand would be erased by any later
  // `border` shorthand (§4.3); one shorthand written once cannot be.
  const borderColor = disabled ? c.disabled : error ? c.error : focused ? c.primary : c.border
  return {
    width: '100%',
    borderRadius: radius.md,
    border: `${error ? 2 : 1}px solid ${borderColor}`,
    background: c.background,
    color: disabled ? c.textSecondary : c.text,
    fontSize: 16,
    padding: spacing.md,
    minHeight: touchTarget.min,
    outline: 'none',
  }
}
