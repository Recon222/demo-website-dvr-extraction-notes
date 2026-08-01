import {
  groupedSettingsCategories,
  type SettingsCategoryId,
  type SettingsGroupId,
  type SettingsIconId,
} from '@/features/demo/engine/content/settings-catalog'
import { settingsPreview, type SettingsPreviewContext } from '@/features/demo/engine/content/settings-values'

/**
 * View-model mapper for the Settings master list — the `screenData.ts` role, scoped to this
 * surface: it shapes engine registries into the rows the list renders, so `SettingsModal`
 * stays a dumb presentational component and the bridge stays a one-liner.
 *
 * Lives in the UI layer for the same reason `screenData.ts` does: the shape it produces is a
 * DISPLAY concern (which string sits on the right of a row), not a domain one.
 */

export interface SettingsRowView {
  id: SettingsCategoryId
  title: string
  icon: SettingsIconId
  /** Right-aligned value; `null` hides it (phone `SettingsCategoryRow.tsx:31`). */
  preview: string | null
  /** Draws the padlock. The demo never simulates the prompt — see the catalog's note. */
  requiresAuth: boolean
}

export interface SettingsSectionView {
  id: SettingsGroupId
  label: string
  items: readonly SettingsRowView[]
}

/** The grouped master list with every row's preview resolved. Registry order throughout. */
export function toSettingsSections(ctx: SettingsPreviewContext): readonly SettingsSectionView[] {
  return groupedSettingsCategories().map((section) => ({
    id: section.group.id,
    label: section.group.label,
    items: section.items.map((c) => ({
      id: c.id,
      title: c.title,
      icon: c.icon,
      preview: settingsPreview(c.id, ctx),
      requiresAuth: c.requiresAuth === true,
    })),
  }))
}

/** Flattened lookup for the detail pane's title/back handling. */
export function findSettingsRow(
  sections: readonly SettingsSectionView[],
  id: SettingsCategoryId | null,
): SettingsRowView | null {
  if (!id) return null
  for (const section of sections) {
    const hit = section.items.find((r) => r.id === id)
    if (hit) return hit
  }
  return null
}
