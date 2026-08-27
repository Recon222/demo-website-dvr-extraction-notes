import type { CSSProperties } from 'react'

import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'

/**
 * SEAM(U1.4): the ONE header recipe. Matrix A37.
 *
 * Before this module the demo hand-rolled a different bar gradient at every chrome edge —
 * `WizardHeader` `linear-gradient(180deg,#1b2e48,#15273b)`, the wizard drawer's header
 * `rgba(26,45,68,0.6)→rgba(13,27,42,0.2)` and its footer the same pair flipped, and the case
 * picker's `linear-gradient(180deg,#13243a,#0e1d30)`. Four navies, no two alike, none of them
 * on the phone's ramp. They all resolve to `GLASS_TIER[scheme].header` here, so a phone-side
 * re-tint moves every bar in the demo at once and the drift guard can see it.
 *
 * ## What the phone actually paints, and what it does NOT
 *
 * Six components read the tier at `dd5551ec`, and between them they use exactly two of its four
 * parts everywhere plus a third in one place:
 *
 * | part           | phone consumers |
 * |----------------|-----------------|
 * | `gradient`     | all six — `Header.tsx:118-124`, `CustomDrawerContent.tsx:155-159` (header) and `:436-440` (footer), `GlassBottomSheet.tsx:317-320`, `ExportHub.tsx:231`, `ImportFlowModal.tsx:116` |
 * | `border`       | all six — always ONE edge: `borderBottomColor` on a bar above its content, `borderTopColor` on a bar below it (`CustomDrawerContent.tsx:440`, `ExportHub.tsx:318`) |
 * | `highlightTop` | ONE — `Header.tsx:113-117`, a 1px absolutely-positioned strip over the top of the gradient |
 * | `innerShadow`  | NONE |
 *
 * So `glassHeaderBar` carries the two universal parts, `glassWizardHeaderBar` adds the third
 * for the one surface whose phone counterpart paints it, and **`header.innerShadow` reaches no
 * screen** — here or on the phone. Adding it would be invention, not a port; U1.1's deferral
 * proposal D-3 already records that its twelve values have exactly one gate, and this is the
 * package that confirms the reason (the phone hands `innerShadow` to a native shadow prop that
 * the header tier's consumers never set).
 *
 * ## `boxShadow`, not `borderTopColor`, for the highlight
 *
 * A40's canonical composition spells the lit edge `border-top-color`, and that is right for a
 * CARD, which has a border on all four sides for the longhand to override. A header bar has a
 * border on ONE edge, so `border-top-color` paints nothing at all — it would be a value that
 * type-checks, passes a style pin, and is invisible on screen. `inset 0 1px 0` reproduces what
 * the phone actually builds: a 1px line at the top, drawn over the gradient, costing no layout
 * (`Header.tsx:168-175` — `position:'absolute', top:0, left:0, right:0, height:1, zIndex:1`).
 *
 * ## Geometry is NOT in this module, deliberately
 *
 * A37 is a colour row; its Delta names four values and no lengths. The bars' top paddings
 * (`56px` on `WizardHeader`, `54px` on the drawer and the picker) are the demo frame's own
 * status-bar clearance — `PhoneFrame`'s status bar is `height: 50` and demo §3 lists
 * `'54px …'`/`'56px …'`/`'50px …'` as one idiom for "full-bleed overlay clearing the status
 * bar". The phone's numbers (`Layout.headerPadding.ios 50`, `Layout.drawerHeaderPadding.ios
 * 60`) are iOS safe-area allowances for a real notch. There is no phone number to match, the
 * same finding D6 ratified for `TAB_BAR_HEIGHT`. Leave the paddings where the consumers own
 * them.
 *
 * ## The tab bar is NOT a header
 *
 * `TabBar.tsx` is listed under A37 because it hand-rolls a bar gradient too, but the phone's
 * tab bar is a FLAT `colors.card` fill (`app/(tabs)/_layout.tsx`, matrix A63) and never touches
 * this tier. Putting it on the header tier here would be a wrong value that U8.3 has to undo.
 * It is not a consumer of this module and must not become one.
 */

const header = GLASS_TIER[scheme].header

/**
 * A bar ABOVE its content: the tier's gradient top-to-bottom, hairline on the bottom edge.
 *
 * Phone `CustomDrawerContent.tsx:155-159` — `<LinearGradient colors={gradient} start={{x:0,y:0}}
 * end={{x:0,y:1}} style={[styles.header, { borderBottomColor: border }]}>` over
 * `styles.header`'s `borderBottomWidth: 1` (`:476`).
 */
export const glassHeaderBar: CSSProperties = {
  background: `linear-gradient(180deg,${header.gradient[0]},${header.gradient[1]})`,
  borderBottom: `1px solid ${header.border}`,
}

/**
 * The wizard header alone: the bar above, plus the tier's lit top edge.
 *
 * Phone `Header.tsx:108-128` — the glass branch stacks a 1px `highlightTop` strip over the
 * gradient. The demo's `WizardHeader` is that component's counterpart (10 wizard screens), and
 * it is the only demo bar whose phone twin paints the edge.
 */
export const glassWizardHeaderBar: CSSProperties = {
  ...glassHeaderBar,
  boxShadow: `inset 0 1px 0 ${header.highlightTop}`,
}

/**
 * A bar BELOW its content: the SAME two stops flipped, hairline on the top edge.
 *
 * Phone `CustomDrawerContent.tsx:436-440` — `colors={[...gradient].reverse()}` with the same
 * top-to-bottom `start`/`end`, plus `borderTopColor`. `linear-gradient(0deg,a,b)` is that
 * reversal in CSS (0° runs bottom-to-top, so `a` lands at the bottom), and it is the spelling
 * the demo's own drawer footer already used.
 *
 * Written as a flip of the same two stops rather than a second pair on purpose: a phone-side
 * re-tint of the header tier moves the footer with it, which is what "one recipe" has to mean.
 */
export const glassHeaderFooterBar: CSSProperties = {
  background: `linear-gradient(0deg,${header.gradient[0]},${header.gradient[1]})`,
  borderTop: `1px solid ${header.border}`,
}
