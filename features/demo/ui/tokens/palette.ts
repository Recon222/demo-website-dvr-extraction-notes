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
 * `scrim` landed with U4.4 and the status-tone family with U3.1; both are here now.
 *
 * Of the phone's THREE grid tokens (`Colors.ts:52-54` / `:158-160`) U8.2 ports exactly ONE.
 * `gridSubtle` is the app-wide default and the demo has a consumer for it — `GLASS.gridOverlay`,
 * which paints the phone frame and every modal sheet. `grid` (A11) and `gridLight` (A12) have
 * NO web-side surface: the demo never rendered a second or third grid weight, and A12's own
 * matrix row records the demo side as "None". Adding them here would create two tokens nothing
 * reads and — because `PALETTE_KEYS`' membership pin forces an anchor per key — two drift-guard
 * rows over values no demo pixel depends on. Plan §6.6 gate 1 forbids exactly that, and D3
 * ("leave unique unchanged literals alone") points the same way. They stay unported until a
 * demo surface needs a second grid weight; that surface's package ports them.
 *
 * ## The naming trap — read this before spending a `*Light` token (phone §1.2, note 2)
 *
 * **In DARK the `*Light` names mean the DARK BACKGROUND TONE the matching `*OnLight`
 * foreground sits on.** They are not lighter shades of their severity, and `successLight` is
 * darker than `success`, not lighter. The names are historical: they were coined for the light
 * theme, where they ARE pale tints, and they kept their spelling when dark was added so a
 * consumer could write one flat name in both schemes. Every consumer gets this wrong once.
 *
 * The pairing contract that follows from it: a badge, chip or banner takes `*Light` as its
 * FILL, `*` as its 1px border and `*OnLight` as its text — never `*` as text (matrix §C.3
 * rule 1). A bare dot or a 1px selection accent takes the accent directly, which is what
 * `warningAccent` exists for.
 *
 * `warningBackground` (phone `Colors.ts:68`/`:176`) is deliberately NOT ported: no demo surface
 * takes it and no matrix row names it. It would be an unanchorable key on the web side.
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

  // The grid (A10, U8.2). `GLASS.gridOverlay` composes both of its repeating gradients from
  // this one token, so the phone frame's ambient grid and every modal sheet's move together.
  //
  // SPACED, like `overlay`/`scrim` below and unlike the demo's own rgba literals: this is
  // lifted verbatim from `Colors.ts:158` and nothing here is re-spelled. The drift guard's
  // `norm` strips whitespace on both sides, and `glass-tokens.test.ts`'s sweep does too.
  gridSubtle: 'rgba(153, 186, 221, 0.11)', // Colors.ts:158 — app-wide default grid opacity

  // Status (A28). NOTE the naming trap, phone §1.2 note 3: in DARK the `*Light` names are
  // the DARK BACKGROUND TONE a matching `*OnLight` foreground sits on — they are not
  // lighter shades. `errorLight` is the deep red a filled destructive control paints.
  success: '#10d177', // Colors.ts:165
  successLight: '#0f6b42', // Colors.ts:166 — background tone; was #1a8754 (4.10:1)
  successDark: '#0faa5e', // Colors.ts:167
  error: '#ff4757', // Colors.ts:169
  errorLight: '#b72136', // Colors.ts:170 — DangerFill.dark (A52); `onError` clears 6.39:1 on it
  errorDark: '#ee2f44', // Colors.ts:171
  warning: '#ffd93d', // Colors.ts:173
  warningLight: '#7d5f10', // Colors.ts:174 — background tone; was #b38f2f (2.76:1)
  warningDark: '#ffc62b', // Colors.ts:175
  // The amber that clears WCAG 1.4.11's 3:1 as a small NON-TEXT mark — a status dot, a 1px
  // selection accent (DEF-UI-017). Dark already had one, so this is `warningDark`'s value
  // under the name consumers reach in BOTH themes without branching (phone `Colors.ts:177-180`);
  // light's is a different hex. It is a SEPARATE TOKEN from `warningDark`, not an alias:
  // re-pointing either must not move the other. Measured 6.82:1 on the worst card/sheet stop.
  warningAccent: '#ffc62b', // Colors.ts:180
  info: '#99badd', // Colors.ts:182
  infoLight: '#2e5f97', // Colors.ts:183 — background tone. Deliberately the SAME hex as
  // `borderLight` (A8/A16) and deliberately NOT collapsed into it: a border token and a status
  // fill drift apart the moment either side re-tints.
  infoDark: '#7a9fc4', // Colors.ts:184

  // Status FOREGROUNDS — the AA-passing text/icon tone that pairs with the matching `*Light`
  // background tone (phone D8a). All four resolve to `text`'s own `#f0f4f8` in dark: the dark
  // theme carries severity in the FILL and the BORDER, never in the text colour (phone §1.2
  // note 3). They exist as four NAMES so a consumer writes `colors.warningOnLight` flat instead
  // of branching on the active scheme — which is the whole reason light's four differ.
  // Measured on their own `*Light` grounds: info 5.94 / warning 5.40 / success 5.93 / error 5.79.
  infoOnLight: '#f0f4f8', // Colors.ts:191
  warningOnLight: '#f0f4f8', // Colors.ts:192
  successOnLight: '#f0f4f8', // Colors.ts:193
  errorOnLight: '#f0f4f8', // Colors.ts:194

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
  scrim: 'rgba(0, 40, 83, 0.32)', // Colors.ts:231

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

  // Navy lines over the white ground, derived from light's `primary` rgb(30,58,138) — the
  // phone's own comment at `Colors.ts:49-51`. NOT dark's value at another alpha.
  gridSubtle: 'rgba(30, 58, 138, 0.06)', // Colors.ts:52

  success: '#10b981', // Colors.ts:57 — Green 500
  successLight: '#d1fae5', // Colors.ts:58 — Green 100, the pale background tone
  successDark: '#059669', // Colors.ts:59 — Green 600
  error: '#ef4444', // Colors.ts:61 — Red 500
  errorLight: '#fee2e2', // Colors.ts:62 — Red 100, the pale background tone (the names invert)
  errorDark: '#dc2626', // Colors.ts:63 — Red 600, and DangerFill.light
  warning: '#f59e0b', // Colors.ts:65 — Amber 500
  warningLight: '#fef3c7', // Colors.ts:66 — Amber 100, the pale background tone
  warningDark: '#d97706', // Colors.ts:67 — Amber 600
  // Light HAD no amber clearing 3:1 as a non-text mark — `warning` measured 1.76 and
  // `warningDark` 2.62 on the worst stop, this one 4.58 (phone `Colors.ts:69-77`).
  warningAccent: '#b45309', // Colors.ts:77 — Amber 700
  info: '#3b82f6', // Colors.ts:79 — Blue 500
  infoLight: '#dbeafe', // Colors.ts:80 — Blue 100, the pale background tone
  infoDark: '#2563eb', // Colors.ts:81 — Blue 600

  // The status foregrounds. Unlike dark's four, light's genuinely differ from each other and
  // from `text` — in light the severity IS carried by the text colour. Measured against their
  // own `*Light` grounds: info 7.15 / warning 8.15 / success 6.78 / error 6.80.
  infoOnLight: '#1e40af', // Colors.ts:86 — Blue 800
  warningOnLight: '#78350f', // Colors.ts:87 — Amber 900
  successOnLight: '#065f46', // Colors.ts:88 — Emerald 800
  errorOnLight: '#991b1b', // Colors.ts:89 — Red 800

  onPrimary: '#ffffff', // Colors.ts:95
  onError: '#ffffff', // Colors.ts:96 — 3.76:1 on `error`, 4.83:1 on `errorDark`; pair deep

  link: '#1e40af', // Colors.ts:108 — Blue 800, moved from Blue 500 to clear AA in both themes
  linkHover: '#1e3a8a', // Colors.ts:109 — Blue 900, deeper on press

  card: '#ffffff', // Colors.ts:112
  modal: '#ffffff', // Colors.ts:113

  overlay: 'rgba(0, 0, 0, 0.5)', // Colors.ts:116
  overlayLight: 'rgba(0, 0, 0, 0.25)', // Colors.ts:117
  scrim: 'rgba(0, 0, 0, 0.5)', // Colors.ts:121 — the SAME value as `overlay` in light, and not in dark

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

/**
 * SEAM(W4/F84): `scheme` WIDENED to the union, for `=== 'dark'` gates that must survive the flip.
 *
 * The problem this closes. `scheme`'s type is the LITERAL `'dark'` (the `satisfies` above, for the
 * reason the docblock gives). TypeScript therefore reads `scheme === 'dark'` as a comparison
 * between `'dark'` and `'dark'` — fine today, and **TS2367 "This comparison appears unintentional
 * because the types have no overlap" the moment the switch is flipped to `'light'`**. Six sites
 * carry that shape and every one of them fails the flip's compile leg (W4/F84): four production
 * (`button-recipe.ts:181,186`, `sheet-chrome.ts:227,242` — the W2/F34 dark-only gates) and two
 * test (`__tests__/palette-contrast.test.ts`, `controls/__tests__/sheet-chrome.test.tsx`).
 *
 * Why widen HERE and not at the export. Annotating `scheme: ColorScheme` would fix all six in one
 * line, and it compiles — measured, tsc exit 0 at `de1cd33`. It is still the wrong line: it makes
 * `colors` the UNION `typeof dark | typeof light`, so every consumer's inferred type widens
 * (`colors.background` becomes `'#002853' | '#ffffff'` rather than `'#002853'`), which is exactly
 * what the docblock above says `satisfies` was chosen to prevent — *"no consumer's inferred type
 * moved by a character"*. W4/F84's own prescription is explicit for the same reason: **"widen the
 * comparison, not the export ... keeping `scheme`'s literal type for the `satisfies typeof`
 * devices that depend on it."** So the widening gets its own name and stays opt-in.
 *
 * A typed `const`, NOT a cast. `(scheme as ColorScheme) === 'dark'` silences the same error, but a
 * cast is an unchecked claim: if `scheme` ever stopped being a `ColorScheme` the cast would keep
 * lying, while this binding fails to compile. Same reason `light` is `satisfies
 * Record<PaletteToken, string>` rather than annotated.
 *
 * A gate spelled `activeScheme === 'dark'` reads as *"is the scheme currently dark"* — a runtime
 * question with two possible answers — which is what these four production sites actually mean:
 * each paints a shadow the phone ships under `isDark && {...}` and must NOT paint on white.
 */
export const activeScheme: ColorScheme = scheme
