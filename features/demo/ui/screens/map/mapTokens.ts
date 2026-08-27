import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
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
    // constants/index.ts:257 — `Colors.dark.background` (#002853) at 82%. Was
    // `rgba(13, 27, 42, 0.65)`: the retired navy ramp's base AND the pre-redesign 0.65 alpha,
    // two drifts in one value (A83). (The retired hexes are named in
    // `tokens/__tests__/palette.test.ts`, which forbids them from appearing anywhere under
    // `ui/` — including in a comment here.) **DEF-062 is inherited knowingly per D5**: 0.82 still
    // leaves the 1.70:1 / 1.77:1 shortfall the phone closed as ACCEPTED — not fixed, and with
    // no reopen trigger. Port the value; do not "improve" it unasked.
    containerBg: 'rgba(0, 40, 83, 0.82)',
    // constants/index.ts:269 — `Colors.dark.border` (#1c4e84) at 45%. Was
    // `rgba(30, 58, 95, 0.35)`, the retired border hex at the pre-redesign alpha.
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

/** Proximity accent + fills — phone `PROXIMITY_COLORS` (constants/index.ts:60-67). */
export const PROXIMITY_COLORS = {
  /** Solid accent — ring border line, active toggle text. Equal to `PIN_COLORS.working`. */
  accent: '#00BFFF',
  /** 15 % fill — ring interior and the active proximity toggle background. */
  fillLight: 'rgba(0, 191, 255, 0.15)',
  /** 20 % fill — the selected radius preset background. */
  fillMedium: 'rgba(0, 191, 255, 0.2)',
} as const

/**
 * Cluster bubble chrome — phone `CLUSTER_CIRCLE_STYLE` (constants/index.ts:179-195) +
 * `ClusterBadge` text style (ClusterBadge.tsx:36-60). Dark translucent navy, borderless, with a
 * white halo'd count on top: clusters read as map chrome rather than a fourth status colour.
 */
export const CLUSTER_COLORS = {
  /** `Colors.dark.background` at `circleOpacity` 0.65. */
  circle: 'rgba(13, 27, 42, 0.65)',
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

/** Per-camera marker chrome — phone `CAMERA_MARKER` (constants/index.ts:103-123). */
export const CAMERA_MARKER = {
  glyphSize: 30,
  iconSize: 18,
  glyphColor: '#111111',
  baseColor: '#ffffff',
  baseBorder: 'rgba(13, 27, 42, 0.55)',
  /** Callout bubble background — `MAP_SURFACE_COLORS.controlsBg`. */
  calloutBg: 'rgba(13, 27, 42, 0.95)',
  /** Callout bubble border — `MAP_SURFACE_COLORS.borderStrong`. */
  calloutBorder: 'rgba(30, 58, 95, 0.6)',
  calloutText: '#ffffff',
  calloutTextDim: 'rgba(255, 255, 255, 0.7)',
} as const

/**
 * SEAM(U5.1): map-overlay surfaces — phone `MAP_SURFACE_COLORS` (constants/index.ts:92-109).
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
  /** constants/index.ts:98 — `Colors.dark.background` at 85%. Was `rgba(13, 27, 42, 0.85)` (A20/A83). */
  overlayMedium: 'rgba(0, 40, 83, 0.85)',
  /** constants/index.ts:104 — `Colors.dark.border` at 60%. `CAMERA_MARKER`'s callout border. */
  borderStrong: 'rgba(28, 78, 132, 0.6)',
} as const

/** Always-dark "glass" surface tokens for the bottom sheet (the satellite tiles are dark). */
export const SHEET_COLORS = {
  background: 'rgb(10, 22, 36)',
  border: 'rgba(30, 58, 95, 0.55)',
  handle: 'rgba(255, 255, 255, 0.20)',
  divider: 'rgba(30, 58, 95, 0.50)',
  rowBg: 'rgba(19, 34, 54, 0.78)',
  rowBorder: 'rgba(30, 58, 95, 0.45)',
  infoBg: 'rgba(255, 255, 255, 0.04)',
  text: '#e7eef6',
  textDim: '#9fb6d0',
  textFaint: '#7a9fc4',
  accent: '#1a8fc2',
} as const
