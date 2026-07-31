import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'

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
 * Floating-controls glass, lifted from the phone's `MAP_GLASS_COLORS` (constants/index.ts:218-233).
 * Only the DARK variants exist here: the phone keeps light ones because the app theme is
 * switchable, while the demo's phone frame is always dark.
 */
export const MAP_GLASS_COLORS = {
  containerBg: 'rgba(13, 27, 42, 0.65)',
  inputBg: 'rgba(19, 34, 54, 0.55)',
  border: 'rgba(30, 58, 95, 0.35)',
  shadow: 'rgba(0, 0, 0, 0.35)',
  /** `Colors.dark.text` */
  text: '#f0f4f8',
  /** `Colors.dark.textSecondary` */
  textSecondary: '#99badd',
  /** `Colors.dark.textTertiary` */
  textTertiary: '#7a9fc4',
  /** `Colors.dark.primary` */
  primary: '#2B8CC1',
  /** `Colors.dark.primaryLight` */
  primaryLight: '#4BA3D4',
  /** Active Clear pill fill — MapControls.tsx:206-208 (dark branch). */
  clearActiveBg: 'rgba(43, 140, 193, 0.20)',
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

/** Map-overlay surfaces — phone `MAP_SURFACE_COLORS` (constants/index.ts:75-92). */
export const MAP_SURFACE_COLORS = {
  /** Error overlay — `Colors.dark.background` at 85 %. */
  overlayMedium: 'rgba(13, 27, 42, 0.85)',
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
