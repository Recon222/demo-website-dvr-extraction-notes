'use client'

import type { ComponentType, ReactNode } from 'react'
import type { SettingsCategoryId } from '@/features/demo/engine/content/settings-catalog'
import type { SettingsPaneProps } from '@/features/demo/ui/screens/settings/panes/pane-props'
import { AboutPane } from '@/features/demo/ui/screens/settings/panes/AboutPane'
import { AppearancePane } from '@/features/demo/ui/screens/settings/panes/AppearancePane'
import { CloudSyncPane } from '@/features/demo/ui/screens/settings/panes/CloudSyncPane'
import { ExportSecurityPane } from '@/features/demo/ui/screens/settings/panes/ExportSecurityPane'
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
 * `BRIDGE_PANE_IDS` below names them, and `StubPaneId` subtracts them — which keeps the
 * exhaustiveness property whole rather than trading it away: every catalog id is either in that
 * tuple or in this map, and `panes.test.tsx` asserts exactly that partition. Both SEAMs are now
 * closed — P7.2 moved `user-profile` into the tuple and P7.3 `form-customization`, each a
 * one-line edit to the tuple and one deletion from the map, exactly as the seam notes predicted.
 */
/**
 * The ids the STORE BRIDGE resolves itself, because their panes need store data that
 * `SettingsPaneProps` cannot carry (P7.2's `user-profile`, P7.3's `form-customization`).
 *
 * Excluding them from `SETTINGS_PANES` is the point: `renderSettingsPane` then only ACCEPTS the
 * settings-backed ids, so a bridge that forgot to branch for one of these is a compile error
 * rather than a placeholder silently rendering in place of the real pane. Same
 * exhaustive-by-construction device the record itself uses, pointed the other way.
 */
export const BRIDGE_PANE_IDS = ['user-profile', 'form-customization'] as const satisfies readonly SettingsCategoryId[]
export type BridgePaneId = (typeof BRIDGE_PANE_IDS)[number]
/** The ids this module can render — everything the bridge does not own. */
export type StubPaneId = Exclude<SettingsCategoryId, BridgePaneId>

export function isBridgePaneId(id: SettingsCategoryId): id is BridgePaneId {
  return (BRIDGE_PANE_IDS as readonly SettingsCategoryId[]).includes(id)
}

export const SETTINGS_PANES: Record<StubPaneId, ComponentType<SettingsPaneProps>> = {
  appearance: AppearancePane,
  'media-capture': MediaCapturePane,
  location: LocationPane,
  'time-sync': TimeSyncPane,
  security: SecurityPane,
  'export-security': ExportSecurityPane,
  'cloud-sync': CloudSyncPane,
  about: AboutPane,
}

/**
 * Default resolution for a pane id. The bridge calls this as the TAIL of its own `renderPane`,
 * after branching every `BridgePaneId` — which is why the parameter is `StubPaneId`: those
 * branches (`id === 'user-profile'`, `id === 'form-customization'`) are what narrow a
 * `SettingsCategoryId` down to this type, so a branch that goes missing is a compile error
 * rather than a pane rendered without its data.
 */
export function renderSettingsPane(id: StubPaneId, props: SettingsPaneProps): ReactNode {
  const Pane = SETTINGS_PANES[id]
  return <Pane {...props} />
}

export type { SettingsPaneProps }
