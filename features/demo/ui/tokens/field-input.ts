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
