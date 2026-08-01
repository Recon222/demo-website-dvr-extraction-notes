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

/**
 * The pane resolver — the demo's stand-in for the phone catalog's `Component` field
 * (`settings-catalog.tsx:77`), which the engine cannot hold because it is React.
 *
 * A `Record<…>` and not a `switch`: it is exhaustive BY CONSTRUCTION, so adding a category id to
 * the catalog stops compiling here until a pane exists for it — the same property the phone gets
 * from a required `Component` member, and the device this repo already uses for `MODAL_IDS`,
 * `EXTRA_VIEWS` and `MODAL_ID_SET`.
 *
 * ## The panes this map does NOT hold
 *
 * A pane that renders STORE data cannot be a `SettingsPaneProps` component, and `SettingsPaneProps`
 * is deliberately not widened to fit one: it is the settings-backed panes' contract, not a base
 * class. `SettingsModal` takes a `renderPane` CALLBACK precisely so the store bridge can resolve
 * those ids to store-connected nodes of their own props and let everything else fall through here.
 *
 * `STORE_CONNECTED_PANE_IDS` below names them, and `StubPaneId` subtracts them — which keeps the
 * exhaustiveness property whole rather than trading it away: every catalog id is either in that
 * tuple or in this map, and `panes.test.tsx` asserts exactly that partition. (P7.2 removed
 * `user-profile`; **SEAM(P7.3)** — `form-customization` joins the tuple and leaves the map when the
 * profile chips + 57-toggle grid land, which is a one-line edit to each.)
 */

/** Ids the STORE BRIDGE resolves itself, before falling through to `SETTINGS_PANES`. */
export const STORE_CONNECTED_PANE_IDS = ['user-profile'] as const
export type StorePaneId = (typeof STORE_CONNECTED_PANE_IDS)[number]

/** Every other catalog id — the ones this map answers for. */
export type StubPaneId = Exclude<SettingsCategoryId, StorePaneId>

export const SETTINGS_PANES: Record<StubPaneId, ComponentType<SettingsPaneProps>> = {
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
 * Default resolution for a pane id. The bridge calls this as the TAIL of its own `renderPane`,
 * after its store-connected branches — which is why the parameter is `StubPaneId`: the branch
 * above it (`id === 'user-profile'`) is what narrows a `SettingsCategoryId` to this type, so
 * forgetting the branch is a compile error rather than a pane rendered without its data.
 */
export function renderSettingsPane(id: StubPaneId, props: SettingsPaneProps): ReactNode {
  const Pane = SETTINGS_PANES[id]
  return <Pane {...props} />
}

export type { SettingsPaneProps }
