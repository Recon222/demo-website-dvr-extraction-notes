import type { ChapterId, WizardScreenId, LaunchableId, DrawerDef } from '@/features/demo/engine/types'

/**
 * The single source of truth for screen ordering and numbering.
 *
 * Step numbers are DERIVED from array position (`chapterNumber`/`wizardNumber`) — never
 * hand-typed — which fixes the prototype's nav-numbering bug (colliding "01 · …" labels).
 * OCR/media live in `LAUNCHABLE` and are intentionally absent from both flow registries,
 * so they can only be opened by an action button, never reached via Next/Back.
 */

/** The 10 wizard screens, in Next/Back + drawer order. */
export const WIZARD_SCREENS: readonly WizardScreenId[] = [
  'submission',
  'requestedScope',
  'arrivalDeparture',
  'timeOffset',
  'extractedScope',
  'dvrInfo',
  'cameras',
  'exportInfo',
  'notes',
  'completion',
]

/** The app flow order: entry chapters then the wizard screens (array order = numbering). */
export const CHAPTERS: readonly ChapterId[] = ['splash', 'dashboard', 'cases', ...WIZARD_SCREENS]

/** Launch-only screens — reached by an action button, never Next/Back. */
export const LAUNCHABLE: readonly LaunchableId[] = ['ocr', 'mediaCapture', 'audioRecording']

/**
 * The bottom tab bar's destinations, in the phone's own order — Dashboard · Cases · Map ·
 * Export (`app/(tabs)/_layout.tsx:26-66`, where the four `<Tabs.Screen>` entries appear in
 * exactly this sequence).
 *
 * Array order IS the tab order, same rule as `WIZARD_SCREENS`: `TabBar` maps over this tuple
 * rather than hand-listing buttons, and the bridge decides "is the tab bar showing" with
 * `isTabView` instead of a widening `||` chain. Two of the four (`dashboard`, `cases`) are
 * also guided chapters; `map` and `export` are tab-only destinations that never become
 * `currentChapter`.
 */
export const TAB_VIEWS = ['dashboard', 'cases', 'map', 'export'] as const
export type TabView = (typeof TAB_VIEWS)[number]

/**
 * Tab labels, from the phone's `options.title` (`_layout.tsx:31,42,53,64`). A TOTAL record, so
 * a tab added to the tuple above cannot ship unlabelled. The icons stay in the UI layer
 * (`ui/controls/TabBar.tsx`) — they are JSX, the same reason the drawer's Media accordion rows
 * can't live here (see `content/explore.ts`); the pairing is pinned by test.
 */
export const TAB_LABELS: Record<TabView, string> = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  map: 'Map',
  export: 'Export',
}

/** Whether a view id is a tab destination — the tab bar's visibility rule. */
export function isTabView(v: string): v is TabView {
  return (TAB_VIEWS as readonly string[]).includes(v)
}

/** Whether a view id is a launch-only screen. The narration anchor needs this (§60k): a
 *  launchable's rail copy lives in `MODAL_NARRATION`, keyed by `ModalId | LaunchableId`, and
 *  indexing that record with the full `AppView` union would not typecheck. */
export function isLaunchableId(v: string): v is LaunchableId {
  return (LAUNCHABLE as readonly string[]).includes(v)
}

/** The in-phone wizard drawer, in display order (mirrors WIZARD_SCREENS). */
export const DRAWER_DEFS: readonly DrawerDef[] = [
  { id: 'submission', label: 'Submission Details', icon: 'document-text' },
  { id: 'requestedScope', label: 'Requested Scope', icon: 'list' },
  { id: 'arrivalDeparture', label: 'Arrival/Departure', icon: 'time' },
  { id: 'timeOffset', label: 'Time Offset', icon: 'sync' },
  { id: 'extractedScope', label: 'Extracted Video Scope', icon: 'film' },
  { id: 'dvrInfo', label: 'DVR Information', icon: 'videocam' },
  { id: 'cameras', label: 'Cameras', icon: 'camera' },
  { id: 'exportInfo', label: 'Export Information', icon: 'download' },
  { id: 'notes', label: 'Notes', icon: 'pencil' },
  { id: 'completion', label: 'Completion', icon: 'checkmark-circle' },
]

/** 1-based tour-chapter number, derived from position. 0 if unknown. */
export function chapterNumber(id: ChapterId): number {
  return CHAPTERS.indexOf(id) + 1
}

/** 1-based wizard-screen number, derived from position. 0 if unknown. */
export function wizardNumber(id: WizardScreenId): number {
  return WIZARD_SCREENS.indexOf(id) + 1
}

/** The next chapter in tour order, or null at the end / for an unknown id. */
export function nextChapter(id: ChapterId): ChapterId | null {
  const i = CHAPTERS.indexOf(id)
  return i >= 0 && i < CHAPTERS.length - 1 ? CHAPTERS[i + 1] : null
}

/** The previous chapter in tour order, or null at the start / for an unknown id. */
export function prevChapter(id: ChapterId): ChapterId | null {
  const i = CHAPTERS.indexOf(id)
  return i > 0 ? CHAPTERS[i - 1] : null
}
