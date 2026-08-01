/**
 * The Settings master/detail catalog — the demo's port of the phone's
 * `src/features/settings/components/settings-catalog.tsx` (P7.1, matrix rows 81–84, D6).
 *
 * Same job as the phone's: ONE registry binding identity (id, title, group, icon) so the
 * master list, the nav-bar title and the detail body can never disagree. Two deliberate
 * differences, both forced by this feature's architecture:
 *
 * 1. **No `Component` member.** The engine is pure TS with no React (`features/demo/CLAUDE.md`),
 *    so the catalog names panes and the UI resolves them (`ui/screens/settings/panes`). The
 *    resolver is a `Record<SettingsCategoryId, …>`, which gives the same "add an entry and
 *    nothing else changes" property the phone's `Component` field does — a new id is a
 *    compile error until a pane exists for it.
 * 2. **No `usePreview` hook.** Preview values are a pure derivation over the settings values
 *    (`settings-values.ts` `settingsPreview`), not a hook — for the same reason.
 *
 * **Row 94 (Developer) is deliberately absent.** It is `devOnly: true` on the phone
 * (`settings-catalog.tsx:266`), so it does not exist in any build a user can install; the
 * owner ruled it permanently out of scope (matrix §7 D6: "Row 94 (Developer, `__DEV__`-only)
 * stays out"). There is no `devOnly` member on this type at all — a field with exactly one
 * possible value and no consumer is worse than its absence. See deferred §80a.
 *
 * Order is registry order, top to bottom, exactly as on the phone: array position IS display
 * order (the house rule shared with `WIZARD_SCREENS`, `EXPLORE_ITEMS` and `DRAWER_DEFS`).
 */

/** Group ids, in master-list order (phone `SETTINGS_GROUPS`, settings-catalog.tsx:58-63). */
export const SETTINGS_GROUP_IDS = ['account', 'capture', 'data', 'system'] as const
export type SettingsGroupId = (typeof SETTINGS_GROUP_IDS)[number]

export interface SettingsGroup {
  readonly id: SettingsGroupId
  /** Rendered uppercase by the list; stored in the phone's own casing. */
  readonly label: string
}

/** Phone-verbatim group labels (`settings-catalog.tsx:59-62`). */
export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: 'account', label: 'Account' },
  { id: 'capture', label: 'Capture & Time' },
  { id: 'data', label: 'Data & Security' },
  { id: 'system', label: 'System' },
]

/**
 * The ten categories the demo builds, in phone declaration order.
 *
 * Ids are the phone's verbatim (`settings-catalog.tsx:174-268`) — they seed testids on both
 * sides, so a shared id is what makes a side-by-side parity check mechanical.
 */
export const SETTINGS_CATEGORY_IDS = [
  'user-profile',
  'appearance',
  'media-capture',
  'location',
  'time-sync',
  'form-customization',
  'security',
  'export-security',
  'cloud-sync',
  'about',
] as const
export type SettingsCategoryId = (typeof SETTINGS_CATEGORY_IDS)[number]

/**
 * Icon ids, named for the Ionicons glyph each one draws (the phone's `icon` field). The demo
 * has no icon font, so `ui/screens/settings/settings-icons.tsx` draws the web equivalents —
 * keeping the glyph NAME as the id is what makes that mapping checkable against the phone.
 */
export const SETTINGS_ICON_IDS = [
  'person-circle-outline',
  'contrast-outline',
  'camera-outline',
  'location-outline',
  'time-outline',
  'options-outline',
  'shield-checkmark-outline',
  'lock-closed-outline',
  'cloud-upload-outline',
  'information-circle-outline',
] as const
export type SettingsIconId = (typeof SETTINGS_ICON_IDS)[number]

export interface SettingsCategory {
  readonly id: SettingsCategoryId
  /** Row label AND detail nav-bar title — one string, as on the phone. */
  readonly title: string
  readonly group: SettingsGroupId
  readonly icon: SettingsIconId
  /**
   * The phone gates this row behind `authenticateWithFallback('settings_access')`
   * (`SettingsModal.tsx:70-73`) and draws a padlock beside its chevron
   * (`SettingsCategoryRow.tsx:73-75`). The demo draws the padlock — it is a real thing about
   * this row on the device — but never simulates the prompt: a fake Face ID sheet in a browser
   * tab is precisely the fabricated device capability decision D6 forbids. The pane says so
   * itself.
   */
  readonly requiresAuth?: boolean
}

export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  // Account
  { id: 'user-profile', title: 'User Profile', group: 'account', icon: 'person-circle-outline' },
  { id: 'appearance', title: 'Appearance', group: 'account', icon: 'contrast-outline' },
  // Capture & Time
  { id: 'media-capture', title: 'Media Capture', group: 'capture', icon: 'camera-outline' },
  { id: 'location', title: 'Location', group: 'capture', icon: 'location-outline' },
  { id: 'time-sync', title: 'Time Sync', group: 'capture', icon: 'time-outline' },
  // Phone title is "Form Fields", not "Form Customization" (settings-catalog.tsx:218).
  { id: 'form-customization', title: 'Form Fields', group: 'capture', icon: 'options-outline' },
  // Data & Security
  { id: 'security', title: 'Security', group: 'data', icon: 'shield-checkmark-outline', requiresAuth: true },
  { id: 'export-security', title: 'Export Security', group: 'data', icon: 'lock-closed-outline' },
  { id: 'cloud-sync', title: 'Cloud Sync', group: 'data', icon: 'cloud-upload-outline' },
  // System
  { id: 'about', title: 'About', group: 'system', icon: 'information-circle-outline' },
]

export interface SettingsGroupSection {
  readonly group: SettingsGroup
  readonly items: readonly SettingsCategory[]
}

/**
 * The master list, grouped and in registry order. Empty groups are dropped, matching the
 * phone's `.filter((g) => g.items.length > 0)` (`SettingsCategoryList.tsx:38`) — which is what
 * keeps a group heading from rendering over nothing if a future ruling empties one.
 */
export function groupedSettingsCategories(): readonly SettingsGroupSection[] {
  return SETTINGS_GROUPS.map((group) => ({
    group,
    items: SETTINGS_CATEGORIES.filter((c) => c.group === group.id),
  })).filter((section) => section.items.length > 0)
}

/** Look up one category. Returns `undefined` for an unknown id (phone `getCategoryById`). */
export function getSettingsCategory(id: string | null): SettingsCategory | undefined {
  if (!id) return undefined
  return SETTINGS_CATEGORIES.find((c) => c.id === id)
}
