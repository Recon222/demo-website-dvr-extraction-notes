/**
 * SEAM(U0.1): the demo's colour palette, ported name-for-name from the phone app.
 *
 * Source of truth: the phone repo's `src/constants/Colors.ts` at `main` (`dd5551ec`).
 * Every value below is lifted verbatim with its `file:line`; nothing here is invented,
 * approximated or "tidied". A value that disagrees with that file is drift, and the
 * `.design-sync/check-rn-parity.mjs` guard is what proves it mechanically.
 *
 * ## Both scheme halves ship (decision D2, as amended by the owner 2026-08-27)
 *
 * `palette.light` and `palette.dark` carry ONE key set. The demo renders `dark` — the
 * single consumption site is `colors` below — but nothing hard-codes a dark value that
 * has a light sibling, so opening light mode later is a change to that one line rather
 * than an archaeology exercise. `light` is typed `satisfies Record<PaletteToken, string>`,
 * which makes a key present in one half and absent in the other a COMPILE ERROR in both
 * directions (a missing key fails the constraint; an extra one fails the excess-property
 * check). At `dd5551ec` the phone's own two halves have identical 45-leaf key sets.
 *
 * ## What is deliberately NOT here
 *
 * Three of the phone's exports are per-scheme records that live OUTSIDE `Colors` because
 * they are recipes, not palette entries. They land with the packages that consume them,
 * in the same `{ light, dark }` shape:
 *   - `PrimaryButtonGradient` (`Colors.ts:471-474`) — the CTA fill; U0.3 re-bases the demo's
 *     `ACCENT_FROM`/`ACCENT_TO` to its dark stops.
 *   - `ElevatedEdges` (`Colors.ts:487-490`) — specular highlight + cast shadow, deliberately
 *     white and black rather than palette tokens; U2.2.
 *   - `DangerFill` (`Colors.ts:510-513`) — `light: Colors.light.errorDark`,
 *     `dark: Colors.dark.errorLight`. **Port that MAPPING, not the name.** The `*Light` /
 *     `*Dark` names invert between schemes on purpose, which is exactly why the phone made
 *     it a lookup instead of two literals; U2.2.
 *
 * The status-tone family (`successLight`, `warningLight`, `infoLight`, `warningAccent`, the
 * four `*OnLight`), the grid tokens and `scrim` arrive with the packages that create their
 * web-side consumers (U3.1, U8.2, U4). `errorLight` is the one exception and is here now:
 * U2.2's danger fill needs it a full phase before U3.1 runs.
 */

/**
 * The dark scheme — what the demo renders. Phone `Colors.dark` (`Colors.ts:128-256`).
 *
 * This half defines the key set; `light` below must match it exactly.
 */
const dark = {
  // Primary — unchanged by the phone's P0 re-base, and load-bearing (matrix A28).
  primary: '#2B8CC1', // Colors.ts:130
  primaryLight: '#4BA3D4', // Colors.ts:131
  primaryDark: '#1F6B99', // Colors.ts:132

  // Surface ramp — the PRP badge-blue ladder that replaced the old navy ramp (A1-A3).
  // (The retired hexes are named in tokens/__tests__/palette.test.ts, which forbids them
  // from appearing anywhere under ui/ — including here.)
  background: '#002853', // Colors.ts:135 — badge-blue base
  backgroundSecondary: '#0e3965', // Colors.ts:136 — +6% lightness
  backgroundTertiary: '#17416e', // Colors.ts:137 — +9% lightness

  // Text ramp (A28), plus the inverse tone the phone added (A6).
  text: '#f0f4f8', // Colors.ts:140
  textSecondary: '#99badd', // Colors.ts:141
  // DOCUMENTED CEILING (phone ruling M2b, inherited under D5): 4.23:1 on `card`, below
  // AA 4.5. Accepted, not lightened — it is the placeholder colour for every input on a
  // card. Do not add new `textTertiary` TEXT (D5's rider).
  textTertiary: '#7a9fc4', // Colors.ts:149
  textInverse: '#002853', // Colors.ts:150 — token added, no demo surface takes it yet (A6)

  // Borders (A7-A9).
  border: '#1c4e84', // Colors.ts:153
  borderLight: '#2e5f97', // Colors.ts:154
  borderDark: '#063d72', // Colors.ts:155

  // Status (A28). NOTE the naming trap, phone §1.2 note 3: in DARK the `*Light` names are
  // the DARK BACKGROUND TONE a matching `*OnLight` foreground sits on — they are not
  // lighter shades. `errorLight` is the deep red a filled destructive control paints.
  success: '#10d177', // Colors.ts:165
  successDark: '#0faa5e', // Colors.ts:167
  error: '#ff4757', // Colors.ts:169
  errorLight: '#b72136', // Colors.ts:170 — DangerFill.dark (A52); `onError` clears 6.39:1 on it
  errorDark: '#ee2f44', // Colors.ts:171
  warning: '#ffd93d', // Colors.ts:173
  warningDark: '#ffc62b', // Colors.ts:175
  info: '#99badd', // Colors.ts:182
  infoDark: '#7a9fc4', // Colors.ts:184

  // Foregrounds for filled primary / destructive surfaces (A19).
  // BINDING RIDER (phone D7a): `onPrimary` pairs with the DEEP shade, never the flat
  // mid-tone — 3.73:1 on `primary` but 5.80:1 on `primaryDark`. Same for `onError`:
  // 3.34:1 on `error`, 6.39:1 on `errorLight`.
  onPrimary: '#ffffff', // Colors.ts:201
  onError: '#ffffff', // Colors.ts:202

  // The accent-AS-TEXT token (A27). `primary` is a FILL: at 16px semibold it measures
  // 2.87:1 on the dark glass stops. `link` measures 6.86:1. Interactive labels and their
  // 1px outlines take `link`; surfaces take `primary`.
  link: '#b8d4f0', // Colors.ts:208
  linkHover: '#d0e4f7', // Colors.ts:209

  // Surfaces (A4, A5).
  card: '#0e3965', // Colors.ts:212
  modal: '#17416e', // Colors.ts:213

  // Overlays (A20, A21). `scrim` is deliberately NOT the same value in dark and arrives
  // with U4 — do not resync the two.
  overlay: 'rgba(0, 40, 83, 0.9)', // Colors.ts:216
  overlayLight: 'rgba(0, 40, 83, 0.7)', // Colors.ts:217

  // Disabled (A23). D10: the demo keeps its `opacity` + `aria-disabled` idiom and spends
  // these only where the phone paints a FILL.
  disabled: '#2e5f97', // Colors.ts:234
  disabledText: '#6b7f95', // Colors.ts:235
} as const

/** Every token the palette carries. A key in one half and not the other is a type error. */
export type PaletteToken = keyof typeof dark

/**
 * The light scheme. Phone `Colors.light` (`Colors.ts:9-126`).
 *
 * The demo has no light surfaces today and light mode stays closed by ABSENCE, not by a
 * guard. These values ship anyway (D2 amended) so that no seam built on top of this module
 * has to invent a light half later.
 */
const light = {
  primary: '#1e3a8a', // Colors.ts:11 — Blue 900
  primaryLight: '#3b82f6', // Colors.ts:12 — Blue 500
  primaryDark: '#1e40af', // Colors.ts:13 — Blue 800

  background: '#ffffff', // Colors.ts:16
  backgroundSecondary: '#f9fafb', // Colors.ts:17 — Gray 50
  backgroundTertiary: '#f3f4f6', // Colors.ts:18 — Gray 100

  text: '#111827', // Colors.ts:30 — Gray 900
  textSecondary: '#4b5563', // Colors.ts:31 — Gray 600
  // DOCUMENTED CEILING, the light sibling of dark's M2b: 3.87:1 on the worst light glass
  // stop. OPEN on the phone as an owner either/or (DEF-063); inherited, not fixed here.
  textTertiary: '#6b7280', // Colors.ts:41 — Gray 500
  textInverse: '#ffffff', // Colors.ts:42

  border: '#e5e7eb', // Colors.ts:45 — Gray 200
  borderLight: '#f3f4f6', // Colors.ts:46 — Gray 100
  borderDark: '#d1d5db', // Colors.ts:47 — Gray 300

  success: '#10b981', // Colors.ts:57 — Green 500
  successDark: '#059669', // Colors.ts:59 — Green 600
  error: '#ef4444', // Colors.ts:61 — Red 500
  errorLight: '#fee2e2', // Colors.ts:62 — Red 100, the pale background tone (the names invert)
  errorDark: '#dc2626', // Colors.ts:63 — Red 600, and DangerFill.light
  warning: '#f59e0b', // Colors.ts:65 — Amber 500
  warningDark: '#d97706', // Colors.ts:67 — Amber 600
  info: '#3b82f6', // Colors.ts:79 — Blue 500
  infoDark: '#2563eb', // Colors.ts:81 — Blue 600

  onPrimary: '#ffffff', // Colors.ts:95
  onError: '#ffffff', // Colors.ts:96 — 3.76:1 on `error`, 4.83:1 on `errorDark`; pair deep

  link: '#1e40af', // Colors.ts:108 — Blue 800, moved from Blue 500 to clear AA in both themes
  linkHover: '#1e3a8a', // Colors.ts:109 — Blue 900, deeper on press

  card: '#ffffff', // Colors.ts:112
  modal: '#ffffff', // Colors.ts:113

  overlay: 'rgba(0, 0, 0, 0.5)', // Colors.ts:116
  overlayLight: 'rgba(0, 0, 0, 0.25)', // Colors.ts:117

  disabled: '#d1d5db', // Colors.ts:124 — Gray 300
  disabledText: '#9ca3af', // Colors.ts:125 — Gray 400
} as const satisfies Record<PaletteToken, string>

export const palette = { light, dark } as const

export type ColorScheme = keyof typeof palette

/**
 * The scheme the demo renders.
 *
 * THIS LINE IS THE SWITCH. Every consumer reads `colors.<phoneName>`, so flipping the demo
 * to light is a one-site change here — that is the contract D2 bought, and the reason no
 * consumer may reach for `palette.dark` directly.
 *
 * U1.1 gave the switch a NAME rather than leaving it a bare `.dark`, because a SECOND
 * two-scheme record arrived that same package (`tokens/glass-tiers.ts`'s `GLASS_TIER`) and
 * `glass-tokens.ts` has to resolve it. Spelling `GLASS_TIER.dark` over there would have made
 * the flip a two-site change and broken §9 clause 12 on the day it was written; every later
 * seam that ships both halves reads `scheme` for the same reason.
 *
 * `satisfies` and not an annotation: the literal type survives, so `palette[scheme]` is still
 * exactly `typeof dark` and no consumer's inferred type moved by a character.
 */
export const scheme = 'dark' satisfies ColorScheme
export const colors = palette[scheme]
