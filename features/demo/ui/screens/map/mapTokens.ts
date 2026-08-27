import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme, type ColorScheme } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * A geographic point in GeoJSON order. Labelled because the map layer is [lng, lat] throughout
 * while `formatCoordinate` next door takes (lat, lng) — the one transposition this feature can
 * make silently.
 */
export type LngLat = readonly [lng: number, lat: number]

/** The sheet-header / projection status tally. One type, four former copies (review R-27h). */
export type StatusCounts = Record<LocationMapStatus, number>

/**
 * First-paint camera centre, and the proximity toggle's last-resort anchor.
 *
 * One literal, read by both `MapCanvas` and `MapScreen` (review R-18b): they previously carried
 * a copy each, with a comment on the second asserting an identity nothing enforced.
 */
export const DEFAULT_MAP_CENTER: LngLat = Object.freeze([-79.65, 43.61]) as LngLat


/**
 * Map pin + sheet colours, lifted verbatim from the phone's `map-view` constants so the demo reads
 * identically. Location pins are coloured by derived status; the incident is the red marker.
 */
export const MAP_PIN_COLORS: Record<LocationMapStatus | 'incident', string> = {
  started: '#FF9500',
  working: '#00BFFF',
  complete: '#34C759',
  incident: '#e53935',
}

export const STATUS_LABEL: Record<LocationMapStatus, string> = {
  started: 'Started',
  working: 'Working',
  complete: 'Complete',
}

/**
 * SEAM(U5.1): the floating-chrome glass, in BOTH scheme halves.
 *
 * Source of truth: the phone's `src/features/location/map-view/constants/index.ts`
 * `MAP_GLASS_COLORS` at `main` (`dd5551ec`), `:255-274`. The phone spells the two halves as
 * FOUR flat keys (`containerBgDark` / `containerBgLight` / `borderDark` / `borderLight`) and
 * resolves them at the call site with `isDark ? … : …`; the demo spells them as a record
 * indexed by `[scheme]`, which is the shape plan §9 clause 12 requires and the shape
 * `tokens/glass-tiers.ts` already uses. Same values, one indirection instead of a ternary in
 * every consumer.
 *
 * **This supersedes, IN PART, the old note that "only the DARK variants exist here" and matrix
 * A84's line ratifying it.** D2 as amended binds harder and is later: *"Nothing hard-codes a
 * dark value that has a light sibling."* These two keys have light siblings on the phone, and
 * `containerBgLight`'s 0.60 -> 0.92 move was the entire trigger for the #127 chrome redesign —
 * a light half that silently diverges is exactly the drift D2 exists to catch. Everything in
 * this module that is genuinely map-domain (`MAP_SURFACE_COLORS`) or painted ONTO the satellite
 * tiles (`MAP_PIN_COLORS`, `CLUSTER_COLORS`, `CAMERA_MARKER`) stays single-valued, because the
 * phone anchors those on `Colors.dark` too — for those, the old note is still exactly right.
 *
 * The values are SPELLED, not derived through `withAlpha`, for the same reason
 * `tokens/glass-tiers.ts` spells its 48: the drift guard reads source text, and a computed
 * expression becomes a PARSE-FAILED row rather than an anchor. The derivations
 * (`background`@0.82, `border`@0.45, light `background`@0.92) are pinned instead in
 * `__tests__/mapTokens.test.ts`, so a palette re-tint that fails to reach here still reds.
 *
 * `satisfies Record<ColorScheme, …>`: a key present in one half and absent in the other is a
 * compile error in both directions, exactly as in `tokens/palette.ts`.
 */
const MAP_GLASS_SCHEME = {
  light: {
    // constants/index.ts:267 — `Colors.light.background` (#ffffff) at 92%. Near-opaque on
    // purpose: 60% white over busy, high-frequency satellite imagery washed out to
    // illegibility, and that is the redesign trigger. Not `rgba(255,255,255,0.60)` any more.
    containerBg: 'rgba(255, 255, 255, 0.92)',
    // constants/index.ts:271 — slate-500 at 35%. Deliberately NOT aliased: `palette.light.border`
    // is `#e5e7eb`, so this hex has no light-palette owner. It happens to equal
    // `GLASS_TIER.light.elevated.border` (`Colors.ts:316`); that is a coincidence of two
    // independent declarations, not a contract, so it is transcribed rather than cross-linked.
    border: 'rgba(100, 116, 139, 0.35)',
  },
  dark: {
    // constants/index.ts:257 — `Colors.dark.background` (#002853) at 82%. It was the retired
    // navy ramp's base at the pre-redesign 0.65 alpha: two drifts in one value (A83). (The
    // retired values are named in `tokens/__tests__/palette.test.ts` and in this module's own
    // `__tests__/mapTokens.test.ts`, both of which forbid them from appearing here — including
    // inside a comment.) **DEF-062 is inherited knowingly per D5**: 0.82 still
    // leaves the 1.70:1 / 1.77:1 shortfall the phone closed as ACCEPTED — not fixed, and with
    // no reopen trigger. Port the value; do not "improve" it unasked.
    containerBg: 'rgba(0, 40, 83, 0.82)',
    // constants/index.ts:269 — `Colors.dark.border` (#1c4e84) at 45%. It was the retired
    // border navy at the pre-redesign 0.35 alpha.
    border: 'rgba(28, 78, 132, 0.45)',
  },
} as const satisfies Record<ColorScheme, { containerBg: string; border: string }>

/**
 * Exported so the drift guard's membership pin has something outside itself to compare against
 * (the `PALETTE_KEYS` precedent, review W0/F2): the guard is `.mjs` and cannot import this
 * module, so its hand-maintained key list is held honest by
 * `__tests__/mapTokens.test.ts` asserting it equals these keys.
 */
export const MAP_GLASS_SCHEMES = MAP_GLASS_SCHEME

/**
 * What the demo actually paints. The scheme-resolved glass plus the tokens the floating chrome
 * reads flat.
 *
 * **`inputBg` IS GONE.** The phone deleted `inputBgDark`/`inputBgLight` in `6e10eea3` because
 * the redesigned chrome paints every surface with one fill; the demo's four readers in
 * `MapControls` take `containerBg` now. Do not reintroduce it — a second surface token is the
 * thing the redesign removed.
 */
export const MAP_GLASS_COLORS = {
  ...MAP_GLASS_SCHEME[scheme],
  /** constants/index.ts:273 — one shadow for both modes; deliberately not a two-half key. */
  shadow: 'rgba(0, 0, 0, 0.35)',
  text: colors.text,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textTertiary,
  primary: colors.primary,
  /**
   * U5.2's filters glyph (`MapControls.tsx:234`) is this key's ONLY reader. It survives the
   * chrome rewrite as an ALIAS rather than being orphaned or inlined, which is what gives
   * `primaryLight` a single owner (`tokens/palette.ts`) and leaves U0.4's `primaryLight` anchor
   * with ONE web-side read instead of two files to keep in step.
   */
  primaryLight: colors.primaryLight,
  /**
   * Active-filter wash. Derived rather than hand-written for the reason the phone's own
   * `PROXIMITY_COLORS` docblock gives (`constants/index.ts:72-76`): a literal rgba drifts the
   * moment its base token moves. U5.2 deletes this key's one reader with the Clear pill.
   */
  clearActiveBg: withAlpha(colors.primary, 0.2),
} as const

/**
 * Proximity accent + fills — phone `PROXIMITY_COLORS` (constants/index.ts:77-84).
 *
 * DERIVED, not written out, and the phone's own docblock says why (`:73-76`): *"The fills are
 * derived with `withAlpha` rather than written out, because they are defined as opacity
 * variants OF the accent: hand-written rgba drifted the moment `PIN_COLORS.working` moved off
 * the old #00BFFF."* The demo held three literals and a COMMENT asserting the identity — the
 * same shape review r1 F5 caught in `input-theme.ts`, where a value pin cannot tell an alias
 * from a re-typed literal. Values are byte-unchanged; only the guarantee is new.
 */
export const PROXIMITY_COLORS = {
  /** Solid accent — ring border line, active toggle text. */
  accent: MAP_PIN_COLORS.working,
  /** 15 % fill — ring interior and the active proximity toggle background. */
  fillLight: withAlpha(MAP_PIN_COLORS.working, 0.15),
  /** 20 % fill — the selected radius preset background. */
  fillMedium: withAlpha(MAP_PIN_COLORS.working, 0.2),
} as const

/**
 * Cluster bubble chrome — phone `CLUSTER_CIRCLE_STYLE` (constants/index.ts:179-195) +
 * `ClusterBadge` text style (ClusterBadge.tsx:36-60). Dark translucent navy, borderless, with a
 * white halo'd count on top: clusters read as map chrome rather than a fourth status colour.
 */
export const CLUSTER_COLORS = {
  /**
   * `Colors.dark.background` at `circleOpacity` 0.65 — the phone's `CLUSTER_CIRCLE_STYLE`
   * (`constants/index.ts:222-223`) composed into one CSS value. It was still composing the
   * RETIRED navy, which is drift rather than theme-invariance.
   *
   * SPELLED, not `withAlpha(colors.background, …)`, and that is the whole distinction this
   * module now draws: a cluster bubble is painted onto satellite tiles, which never follow a
   * theme, so it must NOT move when `scheme` flips — the phone anchors it on `Colors.dark` for
   * exactly that reason (`:55-56`). Reaching for `palette.dark` here would name a scheme half
   * in a value position and red `ui/__tests__/glass-tokens.test.ts`'s scan; the derivation is
   * pinned instead in `__tests__/mapTokens.test.ts`, where naming the half is allowed.
   */
  circle: 'rgba(0, 40, 83, 0.65)',
  text: '#FFFFFF',
  halo: 'rgba(0, 0, 0, 0.5)',
} as const

/**
 * Circle radius by cluster size — phone `CLUSTER_CIRCLE_STYLE.circleRadius`
 * (constants/index.ts:180): `['step', ['get','point_count'], 16, 10, 22, 50, 28]`.
 *
 * These two step rules live with the tokens rather than in `mapCluster.ts` so the marker chrome
 * can read them WITHOUT importing the clustering module — that module carries `supercluster`, and
 * it must stay behind `MapCanvas`'s dynamic import.
 */
export function clusterRadiusFor(count: number): number {
  if (count >= 50) return 28
  if (count >= 10) return 22
  return 16
}

/** Count-label size by cluster size — phone ClusterBadge `textSize` step (ClusterBadge.tsx:46-54). */
export function clusterFontSizeFor(count: number): number {
  if (count >= 50) return 16
  if (count >= 10) return 14
  return 12
}

/**
 * Proximity radius presets and the default selection — phone `PROXIMITY_PRESETS` /
 * `DEFAULT_PROXIMITY_RADIUS` (constants/index.ts:131-133).
 *
 * Here rather than in `mapProximity.ts` for the same reason as the cluster steps: `MapControls`
 * renders the preset pills on first paint, and `mapProximity` carries Turf, which must stay
 * behind the screen's dynamic import.
 */
export const PROXIMITY_PRESETS = [0.5, 1, 2, 5] as const
export type RadiusPreset = (typeof PROXIMITY_PRESETS)[number]
export const DEFAULT_PROXIMITY_RADIUS: RadiusPreset = 1

/**
 * SEAM(U5.1): map-overlay surfaces — phone `MAP_SURFACE_COLORS` (constants/index.ts:92-109).
 * Declared BEFORE `CAMERA_MARKER` because that record now references it, exactly as the phone's
 * does (`:133`, `:135`).
 *
 * ALWAYS DARK, and that is the phone's own ruling rather than a demo shortcut
 * (`constants/index.ts:86-91`): *"The map always uses the Mapbox satellite-streets style, so
 * these are map-domain constants rather than theme-switched values. Base hex values align with
 * `Colors.dark`."* So no light half exists to ship, and the guard anchors these as
 * scheme-invariant rows.
 *
 * Values SPELLED for the guard, derivations pinned in `__tests__/mapTokens.test.ts` — same
 * split as `MAP_GLASS_SCHEME` above. The phone's other five keys (`overlayLight`, `inputBg`,
 * `borderSubtle`, `primaryFill`, `dimWhite`) are deliberately absent: no demo surface takes
 * them, and an unanchorable key with no consumer is the shape U0.4's staging rule forbids.
 */
export const MAP_SURFACE_COLORS = {
  /** constants/index.ts:94 — `Colors.dark.background` at 95%. `CAMERA_MARKER`'s callout fill. */
  controlsBg: 'rgba(0, 40, 83, 0.95)',
  /** constants/index.ts:98 — `Colors.dark.background` at 85%. Re-based off the retired navy (A20/A83). */
  overlayMedium: 'rgba(0, 40, 83, 0.85)',
  /** constants/index.ts:104 — `Colors.dark.border` at 60%. `CAMERA_MARKER`'s callout border. */
  borderStrong: 'rgba(28, 78, 132, 0.6)',
} as const

/**
 * Per-camera marker chrome — phone `CAMERA_MARKER` (constants/index.ts:120-140; the old
 * `:103-123` cite predates PR #127's edits to that file).
 *
 * The glyph, the white base and the callout text are theme-INVARIANT by the phone's own
 * reasoning (`:125-129`): a monochrome camera on a white base is what sets this marker apart
 * from the coloured status pins and the red incident teardrop. Those stay spelled.
 *
 * The three NAVY values did not stay: they tracked the retired ramp, and two of them were
 * declared aliases of `MAP_SURFACE_COLORS` in a DOCBLOCK while re-typing the old value
 * underneath — the shape `tokens/__tests__/palette.test.ts`'s alias pins exist to catch. The
 * phone spells those two as real references; so does this now.
 */
export const CAMERA_MARKER = {
  glyphSize: 30,
  iconSize: 18,
  glyphColor: '#111111',
  baseColor: '#ffffff',
  /** constants/index.ts:131 — `Colors.dark.background` at 55%, so the white badge stays legible on light tiles. */
  baseBorder: 'rgba(0, 40, 83, 0.55)',
  /** constants/index.ts:133 — the phone's own reference, not a copy of its value. */
  calloutBg: MAP_SURFACE_COLORS.controlsBg,
  /** constants/index.ts:135 — likewise. */
  calloutBorder: MAP_SURFACE_COLORS.borderStrong,
  calloutText: '#ffffff',
  calloutTextDim: 'rgba(255, 255, 255, 0.7)',
} as const

/**
 * SEAM(U5.1): the map bottom sheet's surfaces (A84). U5.4 paints its rows and cards from here.
 *
 * Every value is now an alias. Nothing below is transcribed, because unlike the floating
 * chrome the phone holds NO map-local sheet constants any more: `6e10eea3` collapsed
 * `SHEET_SURFACE_COLORS` down to the background gradient alone, and everything else it used to
 * carry — accent strip, top border, handle, divider, row glass — is derived from the theme at
 * the call site (`constants/index.ts:326-334`). So the demo derives them too, from the same
 * tokens the phone's call sites reach for. That also means these keys take no drift-guard
 * anchors: their sources are already anchored in `tokens/palette.ts` and
 * `tokens/glass-tiers.ts`, and an anchor here would compare a value to itself.
 *
 * ## The ground is THREE OPAQUE STOPS, not the `sheet` glass tier
 *
 * Plan §5's U5.1 row and matrix A84 both say `background -> sheet gradient (A38)`. **The phone
 * says the opposite, in source, twice**, and it is a performance ruling rather than a
 * preference — `constants/index.ts:339-343`: *"Fully opaque (alpha 1.0) on purpose, in BOTH
 * themes: the sheet translates over the live Mapbox GL surface, and a translucent surface
 * forces the compositor to keep rendering the map behind the sheet AND alpha-blend it on every
 * drag frame (a UI-thread cost that dropped the drag to ~45fps). … This is why the sheet does
 * NOT use `GlassColors[scheme].sheet`, whose dark gradient starts at 0.98 alpha."*
 * `map-view/README.md:407` restates it. The demo's sheet drags over a live `mapbox-gl` canvas
 * for exactly the same reason, so the ruling ports unchanged.
 *
 * ## Rows are the CARD tier; only the info cards are NESTED (U5.1's R2, closed by U5.4)
 *
 * A84 said `rowBg`/`rowBorder -> nestedCard`. The phone's `LocationRow.tsx:70` reads
 * `GlassColors[colorScheme].card`, its docblock at `:5` says so in words, and matrix row 18
 * ("Phone rebuilt it on `GlassColors[scheme].card` + `Layout.shadow.card`") agrees with the
 * phone against A84. The nested tier is `LocationDetailCard`'s four info cards, which the phone
 * moved to `<Card glass glassVariant="nestedCard">`.
 *
 * U5.1 held that ruling here as three projection keys (`rowBg` / `rowBorder` / `infoBg`) so
 * U5.4 could paint from them. U5.4 adopted the FRAGMENTS instead — `glassCard` on the row,
 * `glassCardNested` on the info cards — which is what "the same recipe `Card.tsx` paints"
 * means on the web, and which carries the lit edge and the inset the three keys could not.
 * The keys are gone with their readers; the refutation is now pinned where it renders, in
 * `__tests__/LocationRow.test.tsx` and `__tests__/LocationDetailCard.test.tsx`, including that
 * the two tiers do not collapse into one another.
 *
 * The dark half only, and here that note is still exactly right (unlike `MAP_GLASS_SCHEME`
 * above): every source these alias is itself two-halved, so flipping `scheme` flips this whole
 * record with it. There is nothing left to hard-code.
 */
export const SHEET_COLORS = {
  /**
   * Phone `SHEET_SURFACE_COLORS[scheme].backgroundGradient` (`constants/index.ts:350-367`)
   * painted by `SheetBackground.tsx:31-37` at `locations` `[0, 0.5, 1]`, vertical. Renamed from
   * `background` because it is no longer a colour: the flat navy it replaces was hand-rolled
   * and sat on no ramp in the palette at all.
   */
  backgroundGradient: `linear-gradient(180deg,${colors.background} 0%,${colors.backgroundSecondary} 50%,${colors.background} 100%)`,
  /** Phone `MapBottomSheet.tsx:208` — `GlassColors[colorScheme].sheet.border`. */
  border: GLASS_TIER[scheme].sheet.border,
  /** Phone `SheetHandle.tsx:69` — the pill tracks the TEXT ramp, not a bare white. */
  handle: withAlpha(colors.text, 0.2),
  /** Phone `MapBottomSheet.tsx:215` — `withAlpha(colors.border, 0.5)`. */
  divider: withAlpha(colors.border, 0.5),
  text: colors.text,
  textDim: colors.textSecondary,
  /**
   * The sheet's accent SURFACE. Its one reader is `MapCanvas`'s retry button — a filled
   * control — so A19's binding rider applies and it takes the DEEP shade: `onPrimary` measures
   * 3.73:1 on `primary` and 5.80:1 on `primaryDark`. It used to be an accent on no ramp at all.
   * (U5.4 may fold that button onto U2.2's `buttonStyle`, at which point this key can go.)
   */
  accent: colors.primaryDark,
} as const
