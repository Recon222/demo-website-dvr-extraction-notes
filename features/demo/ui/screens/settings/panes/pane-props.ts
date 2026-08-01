import type { DemoSettings } from '@/features/demo/engine/content/settings-values'

/**
 * What every Settings detail pane receives.
 *
 * A patch callback rather than per-field setters: the panes are stubs whose whole job is to
 * render a value and hand a new one back, and one shape means the bridge holds ONE piece of
 * state (see `DemoExperience`'s `settings`) instead of twenty-one.
 *
 * The two panes this package does not own (User Profile → P7.2, Form Fields → P7.3) need data
 * this shape cannot carry. They are NOT expected to widen it: the shell takes a `renderPane`
 * callback so the store bridge can resolve those two ids to store-connected nodes of their own
 * props, leaving this contract for the eight settings-backed panes. See `panes/index.tsx`.
 */
export interface SettingsPaneProps {
  settings: DemoSettings
  onChange(patch: Partial<DemoSettings>): void
}
