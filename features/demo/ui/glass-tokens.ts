import type { CSSProperties } from 'react'

import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, palette, scheme, type ColorScheme } from '@/features/demo/ui/tokens/palette'
import { radius } from '@/features/demo/ui/tokens/scale'

/**
 * Shared glass-aesthetic tokens for the demo UI (parity P0.5 / matrix G6).
 *
 * The demo styles inline (no Tailwind — see features/demo/CLAUDE.md). Before this module the
 * same gradient/border/radius literals were copy-pasted across ~25 files; they are extracted
 * here so a future restyle is a one-file change. This is DEDUPLICATION, not restyling — every
 * value below is byte-identical to the literals it replaced.
 *
 * SINCE U1.1 THIS MODULE IS A PROJECTION, NOT A SOURCE. The card/diagonal/panel gradients
 * and the soft border are DERIVED from `tokens/glass-tiers.ts` (`SEAM(U1.1)`) at module init,
 * so the phone's six-tier system is the single source and these four keys cannot drift from it
 * by hand. The ~54 files that import `GLASS` keep working unchanged. New code should reach for
 * `GLASS_TIER[scheme].<tier>` directly; these four survive for the call sites that predate it.
 *
 * Conventions:
 * - `GLASS.*` string tokens are full CSS values (border shorthands include `1px solid`).
 * - `glassCard` / `glassCardNested` / `glassBtnPrimary` / `glassBtnSecondary` are spreadable
 *   style fragments; call sites override/extend around them.
 *
 *   THE LIT-EDGE RULE, both halves. Ruled by measurement — 40 cells x 3 paints, jsdom AND
 *   real Chromium, react-dom 19.2.3, zero disagreement:
 *   `docs/planning/demo-phone-ui-parity/reports/partner-lit-edge-ruling.md` §3-§4.
 *
 *     FRAGMENTS carry ONLY longhands. `glassCard` and `glassCardNested` spell
 *     `borderStyle` / `borderWidth` / the three side colour longhands / `borderTopColor`,
 *     and NO `border`, `borderColor` or `borderTop` key. Pinned in
 *     `ui/__tests__/glass-card-recipe.test.tsx`.
 *
 *     CONSUMERS re-tint with colour LONGHANDS only:
 *
 *         { ...glassCard, borderRightColor: X, borderBottomColor: X, borderLeftColor: X }
 *
 *   Nothing there can erase the lit edge, on any paint, because nothing writes it — and when
 *   the tint is CONDITIONAL (`...(lit && sides)`) the sides self-heal to the fragment's own
 *   colour on collapse instead of falling to `currentColor`. Both are pinned.
 *
 *   Any border SHORTHAND after the spread is wrong, and it is wrong on FIRST paint now that
 *   the fragment holds no shorthand to agree with — `{ ...glassCard, border: X }` and
 *   `{ ...glassCard, borderColor: X }` alike, because `border-color` is itself a four-side
 *   shorthand. Two forms that look like fixes and are not, both kept as negative controls in
 *   the pin file: re-setting `borderTopColor` after the shorthand (spread keeps a duplicate
 *   key at the FIRST occurrence's position, so the "re-set" collapses back in front of it),
 *   and lifting the edge out of the fragment first (right on first paint, wrong on the next —
 *   React writes only the keys that CHANGED, so an unchanged longhand is skipped while the
 *   changed shorthand is written). The second class also has a runtime tripwire: React's own
 *   "conflicting property" warning is a test failure repo-wide (`vitest.setup.ts`).
 *
 *   `boxShadow` is the same class: `glassCard`'s fuses the tier inset (A32) with
 *   `GLASS.shadowCard` (A44), so overriding it after the spread drops the inset. Compose —
 *   `` boxShadow: `${glassCard.boxShadow}, <yours>` `` — or do not override.
 *
 *   `glassBtnPrimary` / `glassBtnSecondary` are NOT longhands-only and do not need to be:
 *   neither carries a per-side longhand, so `{ ...glassBtnSecondary, border: X }` — which
 *   `RowActions.tsx` and `controls/AlertDialog.tsx` both ship — replaces the whole border and
 *   has nothing to clobber. The rule follows the lit edge, not the word "fragment".
 * - Sibling token modules stay scoped: `inputs/input-theme.ts` (`T`, the picker theme — its
 *   accent stops are sourced from here) and `screens/map/mapTokens.ts` (map sheet colours).
 * - MIRROR (review R-25): `app/css/style.css` `@theme` re-declares `accentFrom`/`accentTo`
 *   and the `borderError` red as `--color-demo-accent-from/-to` / `--color-demo-error` for
 *   the `/demo` route error page (`app/demo/error.tsx`), which styles with Tailwind and
 *   sits outside this module's guard-test scan root. Restyle both together.
 */

// The phone's `PrimaryButtonGradient.dark` (`Colors.ts:471-474`): `[Colors.dark.primaryDark,
// '#17527A']`. Kept as module CONSTS spelled as literals — the drift guard's anchors 7/8
// read them with `readConst`, which matches literals, not identifier references.
//
// So the top stop is the SAME hex as `palette.dark.primaryDark`, held twice.
// `= palette.dark.primaryDark` would blind the guard; `satisfies` keeps the literal readable
// AND makes the duplication a type-level identity, so re-basing the palette without re-basing
// the stop stops compiling.
//
// `palette.dark.primaryDark`, NOT `colors.primaryDark` (W1/F15). `colors` is `palette[scheme]`,
// so binding to it would bind a DARK-ONLY constant to the CONSUMED scheme and `scheme = 'light'`
// — the one-site flip plan §9 clause 12 promises and this module's own docblock asserts —
// became a hard TS1360 here. `ACCENT_FROM` is `PrimaryButtonGradient.dark`'s top stop by
// definition and has no light sibling (ledger §90), so it is scheme-INDEPENDENT and must say
// so. Verified both ways: the flip now compiles, and a one-sided `primaryDark` re-base still
// fails to compile. Without it that mutation is green on any run where the phone repo is
// absent (ledger §91) — and the AA claim at `palette-contrast.test.ts:307-317` measures
// against `GLASS.accentFrom`, so it would move WITH the stale value. `ACCENT_TO` has no
// palette sibling and stays plain.
//
// Measured with `onPrimary` (#ffffff): 5.80:1 on the top stop, 8.32:1 on the bottom. The
// character INVERTS from the demo's old pair — light->mid becomes mid->dark. Do NOT lighten
// either stop and do NOT re-tokenise the light pair to [primaryLight, primaryDark]: the old
// dark recipe measured 2.94:1, and that light swap takes a passing 5.17 down to 3.68.
const ACCENT_FROM = '#1F6B99' satisfies typeof palette.dark.primaryDark
const ACCENT_TO = '#17527A'

/**
 * `Layout.shadow.card` (matrix A44), BOTH halves — phone `Layout.ts:115-137`.
 *
 * Light is not dark at another alpha: it is TINTED (`rgba(30,58,138,0.18)`, not black) and
 * cast a pixel shorter, because — the phone's own comment — "a neutral black shadow disappears
 * against white". `shadowOpacity` is 1 there, so the colour's alpha is final; in dark the
 * `0.15` opacity multiplies `#000`. RN spends five props on what CSS spends one on.
 *
 * A record rather than a bare dark string because D2 as amended is absolute: "Nothing
 * hard-codes a dark value that has a light sibling." `shadow.card` appears once in the whole
 * plan (U1.2's row), so no later package owns the light half — on the flip day this would
 * otherwise have left a black drop under a white surface, and (see below) nothing would have
 * noticed.
 *
 * NOTHING ANCHORS THIS. `Layout.shadow` is one of the three things the phone's design-sync
 * generator deliberately does not emit (phone §1.Y.3), and the guard cannot read five native
 * shadow props as one flat CSS value — so these two literals are the only gate, pinned in
 * `ui/__tests__/glass-card-recipe.test.tsx`. Ledger §95.
 *
 * A44/A54 port the phone's INTENDED card shadow. Its iOS rendering is currently dead (the note
 * in the phone's `Card.tsx`); the matrix rows are owner-ratified regardless, and the web has no
 * equivalent defect.
 *
 * Consume it as `SHADOW_CARD[scheme]`, never `SHADOW_CARD.dark` — plan §9 clause 12, enforced
 * by `ui/__tests__/glass-tokens.test.ts`'s "no production module hard-codes a scheme half"
 * scan, which is identifier-agnostic and so covers this record without being told about it
 * (review r1 F23: it did NOT, when that scan named its records by hand).
 */
export const SHADOW_CARD = {
  light: '0 3px 8px rgba(30,58,138,0.18)', // Layout.ts:123-128
  dark: '0 4px 8px rgba(0,0,0,0.15)', // Layout.ts:130-136
} as const satisfies Record<ColorScheme, string>

/**
 * The glass tiers for the scheme the demo renders (`SEAM(U1.1)`).
 *
 * `scheme` comes from `tokens/palette.ts`, which owns the ONE consumed-scheme site (§9
 * clause 12). Resolving it here rather than writing `GLASS_TIER.dark` is what keeps flipping
 * the demo to light a one-line change.
 */
const tier = GLASS_TIER[scheme]

export const GLASS = {
  // accent gradient stops (single source — input-theme's T re-exports these)
  accentFrom: ACCENT_FROM,
  accentTo: ACCENT_TO,
  // gradients
  // A29 - the `card` tier, vertical. Derived, so a phone-side re-base moves both of these.
  gradientCard: `linear-gradient(180deg,${tier.card.gradient[0]},${tier.card.gradient[1]})`,
  // D11 - a 135° variant of the SAME stops. The phone has no diagonal gradient anywhere; the
  // owner ratified keeping it, re-based, so it re-bases with `card` by construction.
  gradientCardDiag: `linear-gradient(135deg,${tier.card.gradient[0]},${tier.card.gradient[1]})`,
  // A36 - `gradientPanel` IS the `elevated` tier's gradient; the two were the same recipe under
  // two names. `GLASS.borderAccent` below is the other half of the same tier, derived since
  // U1.3, so the pair moves together.
  gradientPanel: `linear-gradient(180deg,${tier.elevated.gradient[0]},${tier.elevated.gradient[1]})`,
  gradientAccent: `linear-gradient(180deg,${ACCENT_FROM},${ACCENT_TO})`,
  /** Faint blueprint grid backgroundImage (phone screen + modal sheets). */
  gridOverlay:
    'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)',
  // border shorthands
  border: `1px solid ${colors.border}`,
  // A30 - `card.border`. U0.1 already landed the VALUE (`colors.border` at 50%, which CSS
  // cannot express as alpha-on-hex); U1.1 only re-points it at the tier that owns it, so this
  // line is a refactor with a byte-identical result and no pin moved.
  borderSoft: `1px solid ${tier.card.border}`,
  borderBtn: `1px solid ${colors.borderLight}`,
  // A36 (U1.3) - the `elevated` tier's border. The demo's `rgba(43,140,193,0.3)` was a
  // near-miss of the phone's long-standing `0.25` (`Colors.ts:387`); U1.1 left it spelled and
  // pinned the NEGATIVE so this package could not skip it. Derived now, so `gradientPanel` and
  // `borderAccent` - the two halves of one tier under two names - can no longer drift apart.
  borderAccent: `1px solid ${tier.elevated.border}`,
  borderError: '1px solid rgba(255,71,87,0.3)',
  // A44 (U1.2) - `Layout.shadow.card`, resolved for the consumed scheme. Both halves and the
  // sourcing live on `SHADOW_CARD` above (W1/F19). The MISSING-SEAM the row names is the
  // demo's 22 distinct box-shadows across 26 occurrences (demo inventory §2.5), almost every
  // one a one-off; this is the raised-surface recipe they were all approximating.
  //
  // NOT derivable from `GLASS_TIER`: `innerShadow` is the tier's INSET, a different value on
  // a different axis.
  shadowCard: SHADOW_CARD[scheme],
} as const

/**
 * The card surface — the phone's FOUR-part glass composition plus the card elevation shadow
 * (matrix A31, A32, A44, A54; the composition is A40 / phone §1.8 `conventions.md`).
 *
 * ```css
 * background:       <card.gradient>       A29
 * border:           1px solid <border>    A30
 * border-top-color: <highlightTop>        A31 - the lit top edge
 * box-shadow:       inset 0 1px 0 <innerShadow>,   A32
 *                   0 4px 8px rgba(0,0,0,0.15)     A44
 * border-radius:    lg (12)               A43 - the depth tier
 * ```
 *
 * WHY `borderTopColor` AND NOT A CHILD ELEMENT. The phone paints the highlight as a 1px
 * absolutely-positioned `<View>` at `top:0, zIndex:1` inside an `overflow:'hidden'` wrapper
 * (`Card.tsx:170-174,229-236`) because RN has no per-side border colour. On the web the
 * published recipe is the longhand, and it is what `conventions.md` itself prescribes.
 *
 * NO SHORTHAND KEY EXISTS IN THIS FRAGMENT, and that is the contract — not an ordering.
 * Ordering only mattered while there was a shorthand to order against, and it could not be
 * made safe: with `border` at slot 2 and the edge after it, `{ ...glassCard, border: X }` was
 * right on the first paint and wrong on the next, which is a trap that ships green through a
 * render-once test. The measured ruling (module header; `partner-lit-edge-ruling.md` §3-§4)
 * is to take the shorthand out of the FRAGMENT rather than ask 22 consumers to dodge it.
 * Re-tint with the three side colour longhands. `ui/__tests__/glass-card-recipe.test.tsx`
 * pins all of it — first paint, the update path, the conditional self-heal, both negative
 * controls, and the `boxShadow` clause.
 * A NEW CONSUMER MUST BE ADDED TO `CONSUMERS` IN THAT FILE: the per-consumer loop is what
 * observes an erased edge, and a consumer outside the list is unobserved.
 *
 * `padding` is deliberately NOT here even though `conventions.md` lists it: the demo's ten
 * card sites carry six different paddings lifted from the prototype, and demo §0.4 forbids
 * tidying lifted pixel values.
 */
export const glassCard = {
  borderRadius: radius.lg,
  borderStyle: 'solid',
  borderWidth: 1,
  borderRightColor: tier.card.border,
  borderBottomColor: tier.card.border,
  borderLeftColor: tier.card.border,
  borderTopColor: tier.card.highlightTop,
  background: GLASS.gradientCard,
  boxShadow: `inset 0 1px 0 ${tier.card.innerShadow}, ${GLASS.shadowCard}`,
} as const satisfies CSSProperties

/**
 * A card INSIDE a card (matrix A33, A34, A35, A55) — `GLASS_TIER[scheme].nestedCard`.
 *
 * The same four-part composition as `glassCard`, one tier down. Three things about the values
 * are counter-intuitive enough to be worth naming, all of them the phone's:
 *
 * - **The stops are the SWAP of `card`'s, not a new pair** (A33): `card` runs
 *   `0.85 -> 0.92` top-to-bottom, `nestedCard` runs `rgba(23,65,110,0.7) ->
 *   rgba(14,57,101,0.6)` — the same two colours, inverted, so a nested surface reads as lit
 *   from a different angle rather than as a darker version of its parent.
 * - **The border does the work** (A34): at `rgba(43,140,193,0.45)` it is CIE76 dE 14.7 from
 *   the fill, against the old hairline's 3.1. In dark it is the only part carrying the tier,
 *   and `ui/__tests__/palette-contrast.test.ts` pins it >= 1.25 against both stops.
 * - **The lit edge went 0.06 -> 0.2** (A35). At 0.06 the phone's was not rendering at all.
 *
 * NO ELEVATION SHADOW, and it is the PHONE'S reason, not an inference from the matrix's
 * silence. `Colors.ts:376-378`, verbatim: "A defined border plus a genuinely lit top edge is
 * how a raised panel is drawn without a shadow, which matters here because the iOS shadow on
 * this component is dead (see the note in Card.tsx) and repairing it is held." The border at
 * dE 14.7 and the edge at 0.2 alpha ARE the elevation. The matrix agrees by omission — it
 * assigns shadows per row and A55 names none, while A54 takes `Layout.shadow.card` and A56
 * takes `shadow.dialog` (U4's) — and a nested surface casting a drop shadow inside its own
 * parent would be the phone's "sheet on a dialog" mistake in miniature (phone §1.5).
 *
 * RADIUS is `lg` (12), the same as `glassCard`: a nested CARD stays at `lg` and only a nested
 * ROW takes `md` — adjudicated-closed on the phone, guarded in both `Card.tsx` and
 * `Layout.ts`, and restated at `tokens/scale.ts`. Depth is carried by the gradient, never by
 * the corner. Two of the five adopters override it back to their lifted `10`; that is demo
 * §0.4 (do not tidy lifted pixel values), and A43's sweep is the radius-16 CARD sites.
 *
 * Longhands only, exactly as `glassCard` — the lit-edge rule in the module header binds
 * here identically, and this fragment is pinned by the same no-shorthand-key assertion.
 */
export const glassCardNested = {
  borderRadius: radius.lg,
  borderStyle: 'solid',
  borderWidth: 1,
  borderRightColor: tier.nestedCard.border,
  borderBottomColor: tier.nestedCard.border,
  borderLeftColor: tier.nestedCard.border,
  borderTopColor: tier.nestedCard.highlightTop,
  background: `linear-gradient(180deg,${tier.nestedCard.gradient[0]},${tier.nestedCard.gradient[1]})`,
  boxShadow: `inset 0 1px 0 ${tier.nestedCard.innerShadow}`,
} as const satisfies CSSProperties

/*
 * `glassBtnPrimary` / `glassBtnSecondary` LIVED HERE until U2.2 (A64/A65/A68). They were a
 * four-key colour fragment each — radius, border, background, label — and every one of their
 * ~45 call sites then re-derived padding, label size, min-height and a disabled treatment by
 * hand. `ui/controls/button-recipe.ts`'s `buttonStyle()` is the whole recipe instead: five
 * variants x three sizes x enabled/disabled, in both scheme halves.
 *
 * They are DELETED rather than kept as thin aliases. An alias would have carried the recipe's
 * padding and min-height into every un-migrated site (the spread wins over a `padding:` written
 * before it) while leaving that site's `fontSize:` — written AFTER the spread — at the demo's
 * old 13/14/15. Half-ported is worse than either end, and §9 clause 7's census wants ONE button
 * recipe, not two spellings of one.
 *
 * `GLASS.gradientAccent` stays: it is `ACCENT_FROM`/`ACCENT_TO` under a name the drift guard and
 * `input-theme.ts` both read, and `PrimaryButtonGradient.dark` points at those same two consts.
 */
