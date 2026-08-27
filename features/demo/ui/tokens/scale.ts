/**
 * SEAM(U0.2): the demo's numeric scales, plus the two colour helpers every later recipe
 * is written in terms of.
 *
 * Source of truth: the phone's `src/constants/Layout.ts` (the scales, `:10-74`) and
 * `src/lib/utils/with-alpha.ts` (the helpers). Values are transcribed, not re-derived.
 *
 * Per decision D3 this module does NOT sweep the demo's 763 ad-hoc spacing occurrences or
 * its 222 radii. It creates the ladder; each later package adopts it in the recipes it
 * already touches. An off-scale value that the phone deliberately keeps (§4.9's type-size
 * rule is the live example) stays a commented literal — it is never snapped to the nearest
 * step, and no invented step is added for it.
 */

/**
 * Spacing. `xsm` (6), `base` (12) and `mdlg` (20) are NEW on the phone: those three were
 * being reached by arithmetic (`sm + xs`) or raw literals at ~65 sites, and naming them is
 * what stopped the arithmetic. Phone `Layout.ts:10-21`.
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  xsm: 6,
  sm: 8,
  base: 12,
  md: 16,
  mdlg: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

/**
 * Border radius. The ladder is also a DEPTH TIER (phone ruling D13(a), `Layout.ts:25-41`) —
 * the radius says how deep a surface sits:
 *
 *   md (8)        nested ROWS
 *   lg (12)       cards, modals and form sections, INCLUDING nested cards
 *   sheet (22)    bottom sheets and pickers
 *   control (10)  inputs, pills, chips and small tap targets
 *
 * A nested CARD stays at `lg`. Do NOT key a card's radius off its glass variant: depth is
 * carried by the gradient, not by the corner. That is adjudicated-closed on the phone, and
 * the guard against it is duplicated in `Card.tsx` and `Layout.ts` there.
 *
 * `full` is 9999, one spelling. The demo had two (`999` and `9999`). Phone `Layout.ts:42-51`.
 */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  control: 10,
  lg: 12,
  xl: 16,
  sheet: 22,
  full: 9999,
} as const

/**
 * Touch targets. `comfortable` (48) is the phone's default Button height; `min` (44) is the
 * map-chrome pill height and the demo's row floor. Phone `Layout.ts:54-59`.
 *
 * WEB CAVEAT (phone DEF-UI-019): there is no `hitSlop` here. A control PAINTED smaller than
 * 44 needs real padding or a pseudo-element to reach 44x44 — growing the painted box is not
 * the only option, but doing nothing is not one either.
 */
export const touchTarget = {
  min: 44,
  medium: 46,
  comfortable: 48,
  large: 56,
} as const

/** Icon sizes. Phone `Layout.ts:68-74`. */
export const iconSize = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
} as const

/** `[r, g, b, a]`, or `null` for anything that is not a hex / rgb(a) colour. */
function parseColor(color: string): [number, number, number, number] | null {
  // Anchored at BOTH ends: unanchored, `rgb(1, 2, 3) and then some` parsed as a colour.
  const rgb = color.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]]

  // 4- and 8-digit forms carry an alpha PAIR. The demo already renders four `#rrggbbaa`
  // values (`map/LocationDetailCard.tsx:43`, `map/LocationRow.tsx:22,23,26`) that U5.4
  // routes through `withAlpha`; before they parsed, they came back unchanged — i.e. at
  // their OWN alpha, which is the bug the phone's private copies had for `rgba()` inputs.
  const hex = color.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  if (!hex) return null

  const digits = hex[1]
  const pairs =
    digits.length <= 4
      ? // `split('')`, not `[...digits]` — tsconfig targets es5 and spreading a string
        // there needs `--downlevelIteration`. Vitest transpiles it happily; `tsc` does not.
        digits.split('').map((d) => d + d)
      : (digits.match(/../g) as string[])
  const [r, g, b, a] = pairs.map((pair) => parseInt(pair, 16))
  return [r, g, b, a === undefined ? 1 : a / 255]
}

/**
 * Dev-only breadcrumb for the two arms that hand an input straight back. Both are silent
 * degradations: the caller gets a plausible colour that is NOT what it asked for.
 * Shape per the repo's `generateExtractedScopes` convention
 * (`engine/logic/case-map/geojson.ts:287-291`).
 */
function warnUnparseable(fn: string, color: string, detail: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[demo] ${fn}: cannot parse "${color}" — ${detail}`)
  }
}

/** Colour-SHAPED but unparseable. `transparent` / `currentColor` are documented safe inputs
 *  to `withAlpha`, so warning on them would be the noise that gets the warning muted. */
const looksLikeColour = (color: string) => /^(#|rgba?\()/i.test(color)

/**
 * Re-alpha a colour token — the demo's ONE way to derive a tinted variant.
 *
 * Returns a LITERAL `rgba(r, g, b, a)` string computed here in TypeScript. Never
 * `color-mix()`: a CSS function carries no channels, so `flattenOver` could not composite
 * it and every value routed through it would become invisible to the contrast gate. That
 * restriction is scoped to `features/demo/**`; `app/css/style.css`'s `@theme` mirrors are
 * free to use `color-mix()`.
 *
 * Two things the phone's four private copies got wrong and this does not (`with-alpha.ts:10-17`):
 *   - `rgba()` / `rgb()` inputs were passed through untouched, so the requested alpha was
 *     silently ignored. Every glass gradient stop and every overlay token is such a string.
 *   - 3-digit hex was read as `rgba(54, 15, NaN, ...)`.
 *
 * Anything unparseable is returned unchanged, so `transparent` and named colours are safe.
 *
 * @param color `#rgb`, `#rrggbb`, `rgb(...)` or `rgba(...)`
 * @param alpha 0-1
 */
export function withAlpha(color: string, alpha: number): string {
  const parsed = parseColor(color)
  if (!parsed) {
    if (looksLikeColour(color)) warnUnparseable('withAlpha', color, `returned unchanged, alpha ${alpha} ignored`)
    return color
  }
  const [r, g, b] = parsed
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Flatten a translucent colour onto the stack beneath it — source-over compositing —
 * returning the opaque colour the eye actually sees.
 *
 * WIDENED FROM THE PHONE'S TWO-ARG FORM, deliberately: the contrast test composites a whole
 * ground STACK (a gradient stop over a card stop over the background), so this takes the
 * grounds as a rest parameter and folds from the bottom up. `flattenOver(a, b, c)` is
 * exactly `flattenOver(a, flattenOver(b, c))`, and the one-ground call is the phone's own
 * function unchanged.
 *
 * The LAST ground's alpha is IGNORED — it is treated as the opaque surface it is assumed to
 * be. Pass the colour that is actually painted, not a wash with something still showing
 * through it.
 *
 * The trap this closes is reaching for `withAlpha(token, 1)` instead. That does not flatten
 * anything, it DISCARDS the alpha and hands back the raw triple — a colour the token was
 * never meant to render at. On the phone that turned a `recessed` wash into near-black and
 * shipped the time picker's drum 27 CIE76 dE from its own sheet (`with-alpha.ts:56-65`).
 *
 * At least ONE ground is required, by signature: `flattenOver(x)` used to return `x`
 * uncomposited, which is a plausible wrong answer no test could tell from a right one.
 * Now it does not compile.
 *
 * @param top    the translucent colour
 * @param ground the layer directly beneath it
 * @param rest   further layers, nearest first; the LAST layer given is treated as opaque
 * @returns an opaque `rgb(...)` string, or `top` unchanged if any layer is unparseable
 */
export function flattenOver(top: string, ground: string, ...rest: string[]): string {
  const grounds = [ground, ...rest]
  const t = parseColor(top)
  const layers = grounds.map(parseColor)
  if (!t || layers.some((l) => l === null)) {
    // Unlike `withAlpha`, nothing is a safe layer here: every argument must be a real
    // colour, so this warns unconditionally.
    const bad = t ? grounds[layers.findIndex((l) => l === null)] : top
    warnUnparseable('flattenOver', bad, 'returned the top layer UNCOMPOSITED')
    return top
  }
  const parsed = layers as [number, number, number, number][]

  // Bottom-up: the last layer is the painted surface, everything above washes over it.
  let below = parsed[parsed.length - 1]
  for (let i = parsed.length - 2; i >= 0; i--) below = mixOver(parsed[i], below)

  const [r, g, b] = mixOver(t, below)
  return `rgb(${r}, ${g}, ${b})`
}

/** One source-over step over an assumed-opaque bottom. */
function mixOver(
  top: [number, number, number, number],
  bottom: [number, number, number, number],
): [number, number, number, number] {
  const a = top[3]
  const mix = (i: 0 | 1 | 2) => Math.round(top[i] * a + bottom[i] * (1 - a))
  return [mix(0), mix(1), mix(2), 1]
}
