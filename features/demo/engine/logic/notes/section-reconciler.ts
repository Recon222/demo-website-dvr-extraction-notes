/**
 * Section reconciler — output-comparison reconciliation (phone parity:
 * `notes/services/section-reconciler.ts`, ported verbatim).
 *
 * A section needs regeneration exactly when its formatter's output differs from what
 * was last applied to its content — answered by RUNNING the formatter, not by a
 * hand-maintained hash of its inputs.
 *
 * Pure module: no store, no React. `reconcileSections` never throws for well-formed
 * input; `freshSectionContent` throws on an unknown id (programmer error — cannot
 * occur with the closed id set).
 */

import type { NoteSection, NoteSectionId } from '@/features/demo/engine/types'
import type { NotesRelevantFormData } from '@/features/demo/engine/logic/notes/types'
import { SECTION_DEFINITIONS } from '@/features/demo/engine/logic/notes/section-registry'

/**
 * The current formatter output for a section id — the shared lookup used by
 * `isSectionStale`, the screen's section meta, and reset-to-auto.
 *
 * @throws if `id` is not a registered section (unreachable with the closed id set).
 */
export function freshSectionContent(
  id: NoteSectionId,
  formData: NotesRelevantFormData
): string {
  const definition = SECTION_DEFINITIONS.find(def => def.id === id)
  if (!definition) {
    throw new Error(`freshSectionContent: unknown section id "${id}"`)
  }
  return definition.formatter(formData)
}

/**
 * Live staleness: an edited section is stale when the formatter would now produce
 * something other than the generation the user overwrote. Never stored; always
 * computed. Un-edited sections are never "stale" — they auto-track.
 *
 * A section is NOT stale when the fresh output is EMPTY (phone PR-86 fix-delta HIGH):
 * "stale" powers a rail whose preview shows the refresh and a reset that applies it —
 * when the refresh is nothing (a disconnected section like cameras, or wizard data
 * cleared below the render threshold), that affordance becomes a mis-worded nudge to
 * ERASE the analyst's authored text. Nothing to offer → no badge.
 */
export function isSectionStale(
  section: NoteSection,
  formData: NotesRelevantFormData
): boolean {
  if (!section.manuallyEdited) return false
  const fresh = freshSectionContent(section.id, formData)
  return fresh !== '' && fresh !== section.generatedContent
}

/**
 * Reconciles stored sections against fresh formatter output.
 *
 * For each SECTION_DEFINITIONS entry, with `fresh = def.formatter(formData)`:
 * - No stored section        → create `{ content: fresh, generatedContent: fresh, manuallyEdited: false }`.
 * - `!stored.manuallyEdited` → `fresh === stored.content` ? return `stored` (same
 *                              reference) : `{ ...stored, content: fresh, generatedContent: fresh }`.
 * - `stored.manuallyEdited`  → return `stored` unchanged (generatedContent stays the frozen baseline).
 *
 * Reference-preservation is load-bearing: unchanged sections return by reference so
 * `changed` (which gates the caller's store write) and React memoization stay honest —
 * a clean pass performs ZERO writes. The result is always complete (one entry per
 * definition) in registry order; stored sections with unknown ids are dropped
 * (defensive), and the drop COUNTS AS a change (phone PR-85 C1 secondary) — without
 * that, the healed array is never persisted and the stale id survives every reconcile.
 */
export function reconcileSections(
  formData: NotesRelevantFormData,
  storedSections: NoteSection[]
): { sections: NoteSection[]; changed: boolean } {
  const storedById = new Map(storedSections.map(s => [s.id, s]))

  const knownIds = new Set<NoteSectionId>(SECTION_DEFINITIONS.map(def => def.id))
  const droppedIds = storedSections.map(s => s.id).filter(id => !knownIds.has(id))
  if (droppedIds.length > 0 && process.env.NODE_ENV !== 'production') {
    // Unreachable while NoteSectionId stays closed + snapshot-guarded; kept as the
    // phone keeps its logError — a renamed/removed id would otherwise silently lose
    // stored analyst text (phone PR-84 M2).
    console.warn(
      `[demo] reconcileSections: dropping ${droppedIds.length} stored section(s) with unknown id(s): ${droppedIds.join(', ')}`
    )
  }

  let changed = droppedIds.length > 0

  const sections = SECTION_DEFINITIONS.map(def => {
    const stored = storedById.get(def.id)
    const fresh = def.formatter(formData)

    if (!stored) {
      changed = true
      return {
        id: def.id,
        content: fresh,
        generatedContent: fresh,
        manuallyEdited: false,
      }
    }

    // Edited sections are frozen — generatedContent is the staleness baseline.
    if (stored.manuallyEdited) {
      return stored
    }

    // Un-edited: auto-track. Same output → same reference (no churn).
    if (fresh === stored.content) {
      return stored
    }

    changed = true
    return { ...stored, content: fresh, generatedContent: fresh }
  })

  return { sections, changed }
}
