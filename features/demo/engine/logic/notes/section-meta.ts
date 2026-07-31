/**
 * Section meta — the NotesScreen's per-section view model (the phone route screen's
 * `sectionMeta` equivalent). Pure derivation over the STORED sections: staleness and
 * the fresh preview are computed live via the shared `freshSectionContent` lookup,
 * never stored. The bridge (`DemoExperience`) builds this from the subscribed current
 * location and passes it down — the screen stays presentational.
 */

import type { DemoLocation, NoteSectionId } from '@/features/demo/engine/types'
import { extractNotesRelevantData } from '@/features/demo/engine/logic/notes/notes-relevant-data'
import {
  freshSectionContent,
  isSectionStale,
} from '@/features/demo/engine/logic/notes/section-reconciler'
import { sectionLabel } from '@/features/demo/engine/logic/notes/section-registry'

export interface NoteSectionMeta {
  id: NoteSectionId
  /** Registry display label (e.g. 'address & visits'). */
  label: string
  content: string
  userAddendum?: string
  manuallyEdited: boolean
  /** Live staleness: edited AND the fresh output is non-empty and differs from the
   *  frozen baseline. Un-edited sections are never stale (they auto-track). */
  stale: boolean
  /** Current formatter output — the stale panel's "would now read" preview. */
  freshContent: string
}

/** Build the per-section view model for the notes editor, in stored (registry) order.
 *  Empty before the first Flow-A reconcile — the bridge triggers `reconcileNotes()`
 *  on entering the screen, which fills all seven. */
export function buildNotesSectionMeta(loc: DemoLocation | null): NoteSectionMeta[] {
  if (!loc) return []
  const fd = extractNotesRelevantData(loc)
  return loc.form.notesSections.map((section) => ({
    id: section.id,
    label: sectionLabel(section.id),
    content: section.content,
    userAddendum: section.userAddendum,
    manuallyEdited: section.manuallyEdited,
    stale: isSectionStale(section, fd),
    freshContent: freshSectionContent(section.id, fd),
  }))
}
