import type { AppView } from '@/features/demo/engine/store/create-store'
import type { ModalId } from '@/features/demo/engine/types'
import { DRAWER_DEFS } from '@/features/demo/engine/content/screens'

/**
 * The exploration-manifest registry — the rail checklist's single source of truth.
 *
 * Array order = numbering (repo convention: same as WIZARD_SCREENS and the marketing
 * feature catalog). Adding a chapter later is a one-entry edit; grouped screens share
 * one item via `covers` (an item lights when ANY covered id has been visited). Ids in
 * `covers` are view ids, launchable ids, or modal ids — whatever the store records in
 * `visited`. The registry may lead or lag the built screens safely: unknown visited
 * ids are ignored, and unbuilt screens simply aren't listed yet.
 *
 * `splash` is deliberately absent (unreachable until the deferred video entry);
 * the media screens join when built (see docs/features/demo-explorer/).
 */
export interface ExploreItem {
  /** Stable slug (tests, future analytics). */
  id: string
  /** Rail display name. */
  label: string
  /** Visited when ANY of these recorded ids is visited. Typed to the recordable id
   *  space (what setView/launch/openModal can write) so a typo'd entry is a compile
   *  error, not a permanently-unlit row (review M1). */
  covers: readonly (AppView | ModalId)[]
  /** Where a row click navigates the phone. */
  jumpTo: AppView
}

export const EXPLORE_ITEMS: readonly ExploreItem[] = [
  { id: 'dashboard', label: 'Dashboard', covers: ['dashboard'], jumpTo: 'dashboard' },
  { id: 'cases', label: 'Cases & Locations', covers: ['cases'], jumpTo: 'cases' },
  // The AI import is a modal, not a screen — it lights when the modal opens, and its
  // row jumps to Cases (where the per-case Import button lives).
  { id: 'import', label: 'AI Import', covers: ['import'], jumpTo: 'cases' },
  // The 10 wizard screens, labels shared with the in-phone drawer — one source of truth.
  ...DRAWER_DEFS.map((d) => ({ id: d.id, label: d.label, covers: [d.id], jumpTo: d.id })),
  { id: 'map', label: 'Case Map', covers: ['map'], jumpTo: 'map' },
]
