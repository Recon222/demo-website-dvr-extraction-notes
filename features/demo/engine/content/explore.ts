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
 * `splash` is deliberately absent (unreachable until the deferred video entry).
 * The three media surfaces joined once all of them were built (§63g, after P4.7) — as a
 * group, because the numbering is positional and a half-listed accordion reads worse than
 * an unlisted one. `ocr` still has no entry: it is a step INSIDE Time Offset rather than a
 * destination of its own, and the Time Offset row is what stays active while it is open
 * (pinned in `selectors.test.ts`).
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
  // The Cases library/tab — kept as the boot-active row (the demo opens here).
  { id: 'cases', label: 'Cases', covers: ['cases'], jumpTo: 'cases' },
  // The three case-management actions are modals, not screens — each lights when its
  // modal opens and is active while it's up (anchor prefers the open modal). They all
  // route to Cases, where the New Case / Add Location / Import buttons live.
  { id: 'newCase', label: 'Create a Case', covers: ['newCase'], jumpTo: 'cases' },
  { id: 'newLocation', label: 'Add a Location', covers: ['newLocation'], jumpTo: 'cases' },
  { id: 'import', label: 'Import Location', covers: ['import'], jumpTo: 'cases' },
  // The 10 wizard screens, labels shared with the in-phone drawer — one source of truth.
  ...DRAWER_DEFS.map((d) => ({ id: d.id, label: d.label, covers: [d.id], jumpTo: d.id })),
  // The drawer's Media accordion, in its own order and appended after the step list exactly
  // as the drawer appends it (`WizardDrawer.tsx:329-335`, itself phone parity). Labels are the
  // accordion rows' visible text; those row defs carry JSX icons and handlers, so they cannot
  // live in the engine the way `DRAWER_DEFS` does — the pairing is pinned by test instead.
  //
  // The two capture screens are LAUNCHABLES, so `jumpTo` names them directly: for a non-chapter
  // view `setView` and `launch` are the same write (`create-store.ts:708-718` — both set `view`
  // + `visited` and leave `currentChapter` alone), which is the property that makes closing the
  // screen return the visitor to the wizard step they jumped from.
  { id: 'mediaCapture', label: 'Capture Media', covers: ['mediaCapture'], jumpTo: 'mediaCapture' },
  { id: 'audioRecording', label: 'Record Audio', covers: ['audioRecording'], jumpTo: 'audioRecording' },
  // The library is a MODAL, so it has no view to jump to. Same treatment as the three
  // case-management rows above: route to where its opener lives — here the wizard, whose drawer
  // holds the Media accordion — and let the visitor press it, which keeps the row's own
  // no-location gate (a toast, not an empty sheet) on the one path that can hit it.
  { id: 'mediaLibrary', label: 'Media Library', covers: ['mediaLibrary'], jumpTo: 'submission' },
  { id: 'map', label: 'Case Map', covers: ['map'], jumpTo: 'map' },
  // The Export tab (P5.2) — the 4th tab, and a destination in its own right, so it earns a row
  // exactly as the map did. Listed last because it is the last tab; the run itself lands with
  // P5.3, but the row is honest today: the tab exists and does what its rail copy describes.
  { id: 'export', label: 'Export', covers: ['export'], jumpTo: 'export' },
]
