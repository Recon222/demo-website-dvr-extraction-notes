import type { ChapterId, WizardScreenId, LaunchableId, DrawerDef } from '@/lib/demo/types'

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

/** The guided-tour narrative order: app chapters then the wizard screens. */
export const TOUR_CHAPTERS: readonly ChapterId[] = ['splash', 'dashboard', 'cases', ...WIZARD_SCREENS]

/** Launch-only screens — reached by an action button, never Next/Back. */
export const LAUNCHABLE: readonly LaunchableId[] = ['ocr', 'mediaCapture', 'audioRecording']

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
  return TOUR_CHAPTERS.indexOf(id) + 1
}

/** 1-based wizard-screen number, derived from position. 0 if unknown. */
export function wizardNumber(id: WizardScreenId): number {
  return WIZARD_SCREENS.indexOf(id) + 1
}

/** The next chapter in tour order, or null at the end / for an unknown id. */
export function nextChapter(id: ChapterId): ChapterId | null {
  const i = TOUR_CHAPTERS.indexOf(id)
  return i >= 0 && i < TOUR_CHAPTERS.length - 1 ? TOUR_CHAPTERS[i + 1] : null
}

/** The previous chapter in tour order, or null at the start / for an unknown id. */
export function prevChapter(id: ChapterId): ChapterId | null {
  const i = TOUR_CHAPTERS.indexOf(id)
  return i > 0 ? TOUR_CHAPTERS[i - 1] : null
}
