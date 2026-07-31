/**
 * Notes module — the phone's seven-section notes generator, ported for the demo
 * (P2.1, matrix row 45 / gap G2). Pure logic: registry, formatters, reconciler,
 * assembler, and the single coercion site. Consumed by the store's notes actions,
 * the NotesScreen bridge wiring, and the Case Notes PDF generator.
 */

export { SECTION_DEFINITIONS, sectionLabel } from '@/features/demo/engine/logic/notes/section-registry'
export {
  freshSectionContent,
  isSectionStale,
  reconcileSections,
} from '@/features/demo/engine/logic/notes/section-reconciler'
export { assembleNotesString } from '@/features/demo/engine/logic/notes/notes-assembler'
export { extractNotesRelevantData } from '@/features/demo/engine/logic/notes/notes-relevant-data'
export { buildNotesSectionMeta, type NoteSectionMeta } from '@/features/demo/engine/logic/notes/section-meta'
export type {
  NotesRelevantFormData,
  NotesScope,
  NotesExtractedScope,
  NotesCamera,
  SectionDefinition,
} from '@/features/demo/engine/logic/notes/types'
