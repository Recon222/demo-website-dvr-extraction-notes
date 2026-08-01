/**
 * Settings VALUES: the shape the demo's Settings panes read and write, the phone's defaults,
 * every option list the panes render, and the master-row preview derivation (P7.1, D6).
 *
 * ## What this is and is not
 *
 * Decision **D6** builds the whole Settings surface as a faithful UI replica whose behaviour is
 * honestly stubbed. This module is the "renders state" half of that: the values are real, they
 * are typed, they change when the visitor changes them, and every option list is lifted from
 * the phone. What they are NOT is *consulted* — nothing downstream reads them, and each pane
 * says so in its own words. That is the D6 line: cosmetic state is allowed, a fabricated
 * capability is not.
 *
 * ## Why it is not persisted
 *
 * Deliberately absent from the sessionStorage snapshot (`engine/store/persistence.ts`). A
 * persisted value implies a value that matters; these do not, and `SNAPSHOT_VERSION` is a
 * three-device compile-time guard whose whole point is that it moves only when the persisted
 * SHAPE genuinely changes. Settings live in `DemoExperience`'s own state, alongside the other
 * ephemeral bridge state, and reset with the tab. P7.2 (User Profile) and P7.3 (Form
 * Customization) own their own persistence decisions — see deferred §80c.
 *
 * Phone sources, per field group:
 *   Appearance      `ThemeContext.isDark` + settings-store `importUi.showProcessDetails` (:59)
 *   Media Capture   `DEFAULT_MEDIA_CAPTURE_SETTINGS` (types/media-capture.types.ts:117-126)
 *   Location        `DEFAULT_LOCATION_SETTINGS` (store/settings-store.ts:67-75)
 *   Time Sync       `DEFAULT_TIME_SYNC_SETTINGS` (time-sync/types.ts:26-28)
 *   Export Security `DEFAULT_ENCRYPTION_SETTINGS` (export-security/types.ts:59-64)
 *   Security        `DEFAULT_BIOMETRIC_SETTINGS` (biometrics/types.ts:29-33)
 *   Cloud Sync      `DEFAULT_CLOUD_SYNC_SETTINGS` (cloud-sync/types.ts:20-22)
 */

import { APP_VERSION } from '@/features/demo/engine/content/app-info'
import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import { PROFILE_LABELS } from '@/features/demo/engine/content/profiles'
import type { Profile } from '@/features/demo/engine/types'
import { GPS_ACCURACY_MODES, type GpsAccuracyMode } from '@/features/demo/engine/logic/gps'

// ---- Closed unions (phone-verbatim) ----------------------------------------

/** `VideoQualityOption` (media-capture.types.ts:44). */
export const VIDEO_QUALITY_VALUES = ['720p', '1080p', '2160p'] as const
export type VideoQualityOption = (typeof VIDEO_QUALITY_VALUES)[number]

/** `VideoCodecOption` (media-capture.types.ts:64). */
export const VIDEO_CODEC_VALUES = ['auto', 'avc1', 'hvc1'] as const
export type VideoCodecOption = (typeof VIDEO_CODEC_VALUES)[number]

/** `MaxVideoDurationOption` in SECONDS; `0` is Unlimited (media-capture.types.ts:80). */
export const MAX_DURATION_VALUES = [60, 120, 300, 600, 900, 1800, 0] as const
export type MaxVideoDurationOption = (typeof MAX_DURATION_VALUES)[number]

/** `GpsTimeout` in SECONDS (settings/types.ts:9). */
export const GPS_TIMEOUT_VALUES = [15, 30, 60, 120] as const
export type GpsTimeoutOption = (typeof GPS_TIMEOUT_VALUES)[number]

/** `NtpRegion` (precision-time-sync/constants). */
export const NTP_REGION_VALUES = ['canada', 'usa', 'europe', 'global'] as const
export type NtpRegion = (typeof NTP_REGION_VALUES)[number]

/** `ZipPromptMode` (export-security/types.ts:12). */
export const PROMPT_MODE_VALUES = ['auto', 'always_prompt'] as const
export type ZipPromptMode = (typeof PROMPT_MODE_VALUES)[number]

/** `ZipEncryptionStrength` (export-security/types.ts:22), in the phone's DISPLAY order. */
export const ENCRYPTION_STRENGTH_VALUES = ['AES-256', 'AES-128', 'STANDARD'] as const
export type ZipEncryptionStrength = (typeof ENCRYPTION_STRENGTH_VALUES)[number]

// ---- The settings record ---------------------------------------------------

export interface DemoSettings {
  // Appearance (phone GeneralSettingsSection)
  darkMode: boolean
  showImportProcessDetails: boolean
  // Media Capture
  photoQuality: number
  videoQuality: VideoQualityOption
  videoCodec: VideoCodecOption
  maxVideoDuration: MaxVideoDurationOption
  gpsInMedia: boolean
  shutterSound: boolean
  skipProcessing: boolean
  // Location
  gpsAccuracyMode: GpsAccuracyMode
  gpsTimeout: GpsTimeoutOption
  showAccuracyWarning: boolean
  // Time Sync
  ntpRegion: NtpRegion
  // Export Security
  zipEncryptionEnabled: boolean
  singleFileEncryptionEnabled: boolean
  promptMode: ZipPromptMode
  encryptionStrength: ZipEncryptionStrength
  // Security (phone `@/features/biometrics` BiometricSettings)
  appLockEnabled: boolean
  exportProtectionEnabled: boolean
  allowDeviceFallback: boolean
  // Cloud Sync
  cloudSyncEnabled: boolean
}

/**
 * The phone's defaults, field for field. `darkMode: true` is the one value with no phone
 * default to copy — the phone's switch reads `ThemeContext.isDark`, and the demo's phone frame
 * renders the dark theme and only the dark theme (`ui/screens/map/mapTokens.ts:41`,
 * `import/ImportTerminalProgress.tsx:28`), so `true` is the state of the thing the switch
 * describes. The Appearance pane refuses to let it be changed rather than moving a switch over
 * a theme that cannot follow — see `AppearancePane`.
 *
 * Annotated `Readonly<…>` (R-25): the mutable annotation was discarding exactly the guarantee
 * `Object.freeze` is here to provide — assigning through it type-checked and then threw at
 * runtime, which is the worst of both. The frozen-ness is pinned by test as well; this makes it
 * a compile error first.
 */
export const DEFAULT_SETTINGS: Readonly<DemoSettings> = Object.freeze({
  darkMode: true,
  showImportProcessDetails: true,
  photoQuality: 0.9,
  videoQuality: '1080p',
  videoCodec: 'auto',
  maxVideoDuration: 300,
  gpsInMedia: true,
  shutterSound: true,
  skipProcessing: true,
  gpsAccuracyMode: 'balanced',
  gpsTimeout: 30,
  showAccuracyWarning: true,
  ntpRegion: 'canada',
  zipEncryptionEnabled: false,
  singleFileEncryptionEnabled: false,
  promptMode: 'auto',
  encryptionStrength: 'AES-256',
  appLockEnabled: false,
  exportProtectionEnabled: false,
  allowDeviceFallback: true,
  cloudSyncEnabled: false,
})

// ---- Option lists (verbatim labels + values) -------------------------------

/**
 * A picker option whose `value` is the DOMAIN value, not a bare string (R-11).
 *
 * The seven `as const` tuples above were exported and consumed by nothing, while eight
 * `onChange` handlers narrowed `string` back into those same unions with unchecked `as`. That is
 * the reverse of this repo's own policy (`persistence.ts:136-140`): the device that closes the
 * hole is written, and the hole is open beside it. Typing the lists is what puts the tuples to
 * work — a typo'd option value is now a compile error here, and `PaneSelect` narrows by LOOKING
 * THE VALUE UP in the list rather than asserting it, so no assertion survives at all.
 *
 * `number` is admitted because two settings are numeric unions (`maxVideoDuration`, `gpsTimeout`)
 * whose picker values were previously stringified at the list and re-parsed at the handler —
 * two conversions and a cast for a value the list already knew.
 */
export interface TypedOption<T extends string | number> {
  readonly label: string
  readonly value: T
}

/** `VIDEO_QUALITY_LABELS` (media-capture.types.ts:50-54). */
export const VIDEO_QUALITY_OPTIONS: readonly TypedOption<VideoQualityOption>[] = [
  { label: 'HD (720p)', value: '720p' },
  { label: 'Full HD (1080p)', value: '1080p' },
  { label: '4K UHD (2160p)', value: '2160p' },
]

/** `VIDEO_CODEC_LABELS` (media-capture.types.ts:70-74). */
export const VIDEO_CODEC_OPTIONS: readonly TypedOption<VideoCodecOption>[] = [
  { label: 'Auto (Device Default)', value: 'auto' },
  { label: 'H.264 (AVC) - Maximum Compatibility', value: 'avc1' },
  { label: 'H.265 (HEVC) - Better Compression', value: 'hvc1' },
]

/** `MAX_DURATION_LABELS` (media-capture.types.ts:86-94), in the phone's picker order. */
export const MAX_DURATION_OPTIONS: readonly TypedOption<MaxVideoDurationOption>[] = [
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: 'Unlimited', value: 0 },
]

/** `GPS_ACCURACY_OPTIONS` (LocationSettingsSection.tsx:23-27). */
export const GPS_ACCURACY_OPTIONS: readonly TypedOption<GpsAccuracyMode>[] = [
  { label: 'Quick (Any Accuracy)', value: 'quick' },
  { label: 'Balanced (50m)', value: 'balanced' },
  { label: 'Precise (10m)', value: 'precise' },
]

/** `GPS_TIMEOUT_OPTIONS` (LocationSettingsSection.tsx:30-35). */
export const GPS_TIMEOUT_OPTIONS: readonly TypedOption<GpsTimeoutOption>[] = [
  { label: '15 seconds', value: 15 },
  { label: '30 seconds', value: 30 },
  { label: '60 seconds', value: 60 },
  { label: '120 seconds', value: 120 },
]

/** `NTP_REGION_OPTIONS` (time-sync/types.ts:44-49). */
export const NTP_REGION_OPTIONS: readonly TypedOption<NtpRegion>[] = [
  { label: 'Canada (NRC)', value: 'canada' },
  { label: 'USA (NIST)', value: 'usa' },
  { label: 'Europe (PTB/METAS)', value: 'europe' },
  { label: 'Global (Cloudflare)', value: 'global' },
]

/** `Export Mode` radio group (ExportSecuritySection.tsx:237,282). */
export const PROMPT_MODE_OPTIONS: readonly TypedOption<ZipPromptMode>[] = [
  { label: 'Auto-use saved password', value: 'auto' },
  { label: 'Prompt before every export', value: 'always_prompt' },
]

/** `STRENGTH_OPTIONS` (ExportSecuritySection.tsx:46-62), display order preserved. */
export const ENCRYPTION_STRENGTH_OPTIONS: readonly TypedOption<ZipEncryptionStrength>[] = [
  { label: 'AES-256 — Recommended (strong)', value: 'AES-256' },
  { label: 'AES-128 — iOS yields AES-256', value: 'AES-128' },
  { label: 'Standard — weak (ZipCrypto), legacy only', value: 'STANDARD' },
]

// ---- Master-row previews ---------------------------------------------------

/** `VIDEO_QUALITY_SHORT` (settings-catalog.tsx:92-96) — note `2160p` shortens to `4K`. */
const VIDEO_QUALITY_SHORT: Record<VideoQualityOption, string> = {
  '720p': '720p',
  '1080p': '1080p',
  '2160p': '4K',
}

/** `NTP_REGION_SHORT` (settings-catalog.tsx:98-103) — SHORTER than the picker's own labels. */
const NTP_REGION_SHORT: Record<NtpRegion, string> = {
  canada: 'Canada (NRC)',
  usa: 'USA (NIST)',
  europe: 'Europe',
  global: 'Global',
}

/** `titleCase` (settings-catalog.tsx:105-107). */
function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

/**
 * Everything a preview can depend on. The two SEAM values are parameters rather than reads,
 * because their owners are separate packages:
 *
 * - `profileName` → **SEAM(P7.2)**. The phone's `useProfilePreview` shows the trimmed profile
 *   name, or the literal `Not set` when empty (settings-catalog.tsx:109-112). P7.1 has no
 *   profile store, so it passes `''` and the row honestly reads `Not set`.
 * - `formProfileLabel` → **SEAM(P7.3)**. The phone's `useFormCustomizationPreview` maps the
 *   active profile through `FORM_PROFILE_SHORT` (settings-catalog.tsx:158-167). P7.1 passes
 *   the demo store's live `profile`, which is real today — the demo genuinely runs the
 *   forensic profile — so this row is already truthful before P7.3 makes it changeable.
 */
export interface SettingsPreviewContext {
  settings: DemoSettings
  profileName: string
  formProfileLabel: string
}

/**
 * `FORM_PROFILE_SHORT` (settings-catalog.tsx:158-162), for the P7.3 seam's caller.
 *
 * P7.3 made the profile set real, so this is now an ALIAS of the pane's own `PROFILE_LABELS`
 * rather than a second copy of the same three strings — one source, and TOTAL over `Profile`,
 * so a fourth profile cannot reach the master row unlabelled.
 */
export const FORM_PROFILE_SHORT: Record<Profile, string> = PROFILE_LABELS

/**
 * The right-aligned value on a master row. One pure function over the whole catalog rather
 * than eleven hooks — the phone needs hooks because each preview subscribes to a different
 * store; the demo's values all arrive together.
 *
 * Returns `null` for a row with no preview, matching the phone's "hidden when falsy" rule
 * (`SettingsCategoryRow.tsx:31`). Every current row has one, but the `null` arm is what keeps
 * that a row-level decision instead of a structural assumption.
 */
export function settingsPreview(id: SettingsCategoryId, ctx: SettingsPreviewContext): string | null {
  const s = ctx.settings
  switch (id) {
    case 'user-profile':
      return ctx.profileName.trim().length > 0 ? ctx.profileName.trim() : 'Not set'
    case 'appearance':
      return s.darkMode ? 'Dark' : 'Light'
    case 'media-capture':
      return VIDEO_QUALITY_SHORT[s.videoQuality]
    case 'location':
      return titleCase(s.gpsAccuracyMode)
    case 'time-sync':
      return NTP_REGION_SHORT[s.ntpRegion]
    case 'form-customization':
      return ctx.formProfileLabel
    case 'security':
      // Phone: `isAvailable ? biometricName : 'Unavailable'` (settings-catalog.tsx:134-137).
      // A browser tab has no biometric sensor to name, so the phone's own unavailable literal
      // is both verbatim AND true here — nothing to adapt.
      return 'Unavailable'
    case 'export-security':
      // R-19. The phone's `useExportPreview` answers On/Off from the two flags, and "On" there
      // means the next export is encrypted. Here it would have meant nothing: the demo encrypts
      // nothing, the ZIP pipelines end in the D4 honesty notice, and the two exports that ARE
      // real — the case-map HTML and the printed PDFs — go out unprotected. A master row reading
      // "On" over that is the exact impression the sibling Cloud Sync pane refuses by holding
      // its toggle inert.
      //
      // The switches stay LIVE (D6's cosmetic arm — the pane is a faithful replica and its
      // reveal logic is real); it is only the row's CLAIM that is withdrawn. "Not applied" is
      // true in every state, which is the same test `security`'s `Unavailable` passes.
      return 'Not applied'
    case 'cloud-sync':
      return s.cloudSyncEnabled ? 'On' : 'Off'
    case 'about':
      return `v${APP_VERSION}`
    default:
      return assertNever(id)
  }
}

// ---- Display helpers used by more than one pane ----------------------------

/** The live `{percent}%` beside the Photo Quality slider (MediaCaptureSettingsSection.tsx:133). */
export function photoQualityPercent(quality: number): number {
  return Math.round(quality * 100)
}

/**
 * The phone's slider write path: round to 2 decimals, then clamp to [0.5, 1.0]
 * (MediaCaptureSettingsSection.tsx:92-98). Ported so the demo's slider cannot produce a value
 * the phone's own store would have refused.
 */
export function clampPhotoQuality(value: number): number {
  const rounded = Math.round(value * 100) / 100
  return Math.max(0.5, Math.min(1.0, rounded))
}

/** Re-exported so panes and tests share ONE accuracy-mode list with the GPS engine. */
export { GPS_ACCURACY_MODES }
export type { GpsAccuracyMode }
