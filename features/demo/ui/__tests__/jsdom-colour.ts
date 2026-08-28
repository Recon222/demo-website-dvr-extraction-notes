/**
 * jsdom's colour normalisation, applied to a token so a pin can compare against what
 * `element.style` actually reads back.
 *
 * Not a convenience. `vitest.config.mts:31` sets `css: false`, so an inline style is the only
 * observable a style pin has — and jsdom REWRITES the inline values it does accept
 * (`.claude/skills/mutation-testing/SKILL.md`, project hazards): `'#002853'` reads back as
 * `'rgb(0, 40, 83)'`, and an `rgba()` is re-spaced. A pin that compares a hex constant to
 * `style.color` therefore fails for a reason that has nothing to do with the value, and the
 * usual repair — retyping the expected value as a literal `rgb(...)` string — silently
 * unhooks the pin from the token it was meant to guard.
 *
 * Three private copies of this already exist (`inputs/__tests__/CoordinateDisplay.test.tsx:8`,
 * `screens/__tests__/DeleteConfirmationModal.test.tsx:164`, `screens/__tests__/Toggle.test.tsx:29`),
 * all named `hexToJsdomRgb` and all hex-only. This one also passes `rgba()` through, because a
 * token layer that derives its alphas with `withAlpha` produces `rgba()` constants that the
 * hex-only form throws on. Folding the three in is a later package's tidy-up, not U8.1's — the
 * files belong to other rows.
 *
 * THROWS on anything it cannot parse, deliberately: a silent pass-through would hand a pin a
 * plausible-looking string for a value it never understood.
 */
export const asJsdom = (colour: string): string => {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour)
  if (hex) return `rgb(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)})`
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(colour)
  if (!rgba) throw new Error(`asJsdom: cannot parse ${colour}`)
  const [, r, g, b, a] = rgba
  return a === undefined || Number(a) === 1
    ? `rgb(${r}, ${g}, ${b})`
    : `rgba(${r}, ${g}, ${b}, ${a})`
}
