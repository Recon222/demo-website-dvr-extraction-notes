'use client'

import type { ComponentType, ReactNode } from 'react'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'
import { AboutPane } from '@/features/demo/ui/screens/settings/panes/AboutPane'
import { AppearancePane } from '@/features/demo/ui/screens/settings/panes/AppearancePane'
import { CloudSyncPane } from '@/features/demo/ui/screens/settings/panes/CloudSyncPane'
import { ExportSecurityPane } from '@/features/demo/ui/screens/settings/panes/ExportSecurityPane'
import { FormFieldsPane } from '@/features/demo/ui/screens/settings/panes/FormFieldsPane'
import { LocationPane } from '@/features/demo/ui/screens/settings/panes/LocationPane'
import { MediaCapturePane } from '@/features/demo/ui/screens/settings/panes/MediaCapturePane'
import { SecurityPane } from '@/features/demo/ui/screens/settings/panes/SecurityPane'
import { TimeSyncPane } from '@/features/demo/ui/screens/settings/panes/TimeSyncPane'
import { UserProfilePane } from '@/features/demo/ui/screens/settings/panes/UserProfilePane'

/**
 * The pane resolver — the demo's stand-in for the phone catalog's `Component` field
 * (`settings-catalog.tsx:77`), which the engine cannot hold because it is React.
 *
 * `Record<SettingsCategoryId, …>` and not a `switch`: it is exhaustive BY CONSTRUCTION, so
 * adding a category id to the catalog stops compiling here until a pane exists for it — the
 * same property the phone gets from a required `Component` member, and the device this repo
 * already uses for `MODAL_IDS`, `EXTRA_VIEWS` and `MODAL_ID_SET`.
 *
 * ## The two SEAM entries
 *
 * `user-profile` (**SEAM(P7.2)**) and `form-customization` (**SEAM(P7.3)**) hold interim
 * placeholders. Neither successor should widen `SettingsPaneProps` to fit: both need store data,
 * and `SettingsModal` takes a `renderPane` CALLBACK precisely so the store bridge can resolve
 * those two ids to its own store-connected nodes and let everything else fall through to this
 * map. Each placeholder file carries the full hand-off note.
 */
export const SETTINGS_PANES: Record<SettingsCategoryId, ComponentType<SettingsPaneProps>> = {
  // SEAM(P7.2) — replaced by the real profile pane; see UserProfilePane.tsx.
  'user-profile': UserProfilePane,
  appearance: AppearancePane,
  'media-capture': MediaCapturePane,
  location: LocationPane,
  'time-sync': TimeSyncPane,
  // SEAM(P7.3) — replaced by the profile chips + 57-toggle grid; see FormFieldsPane.tsx.
  'form-customization': FormFieldsPane,
  security: SecurityPane,
  'export-security': ExportSecurityPane,
  'cloud-sync': CloudSyncPane,
  about: AboutPane,
}

/**
 * Default resolution for a pane id. The bridge calls this as the tail of its own `renderPane`,
 * after any store-connected branch of its own.
 */
export function renderSettingsPane(id: SettingsCategoryId, props: SettingsPaneProps): ReactNode {
  const Pane = SETTINGS_PANES[id]
  return <Pane {...props} />
}

export type { SettingsPaneProps }
