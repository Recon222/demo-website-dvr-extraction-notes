/**
 * Section registry — the single source of truth for section identity, display order,
 * and UI/accessibility labels (phone parity:
 * `notes/services/section-registry.ts`, ported verbatim).
 *
 * The formatter IS the section's definition: a section's inputs are whatever its
 * formatter reads, and it needs regeneration exactly when the formatter's output
 * differs from what was last applied — decided by output comparison in
 * `section-reconciler.ts`, never by a parallel field list.
 */

import type { NoteSectionId } from '@/features/demo/engine/types'
import type { SectionDefinition } from '@/features/demo/engine/logic/notes/types'
import { formatAddressAndVisits } from '@/features/demo/engine/logic/notes/address-formatter'
import { formatTimeOffset } from '@/features/demo/engine/logic/notes/time-offset-formatter'
import { formatScopes } from '@/features/demo/engine/logic/notes/scopes-formatter'
import { formatRetention } from '@/features/demo/engine/logic/notes/retention-formatter'
import { formatExport } from '@/features/demo/engine/logic/notes/export-formatter'
import { formatTimeOnScene } from '@/features/demo/engine/logic/notes/time-on-scene-formatter'

/**
 * Ordered array of section definitions. The order here determines the display order
 * of sections in the editor AND in the assembled notes string.
 */
export const SECTION_DEFINITIONS = [
  {
    id: 'address',
    label: 'address & visits',
    formatter: formatAddressAndVisits,
  },
  {
    id: 'timeOffset',
    label: 'time offset',
    formatter: formatTimeOffset,
  },
  {
    id: 'scopes',
    label: 'recovered footage',
    formatter: formatScopes,
  },
  {
    id: 'retention',
    label: 'dvr retention',
    formatter: formatRetention,
  },
  {
    // DISCONNECTED by product decision — replicated from the phone (PR-86): the
    // PDF's camera table is the canonical camera surface; the bullet notes no
    // longer duplicate the per-camera bullets. The section id, label, formatter
    // module (camera-formatter.ts) and its tests all stay intact.
    // Re-enable recipe (two lines):
    //   1. import { formatCameras } from './camera-formatter' (and NotesRelevantFormData)
    //   2. formatter: (fd: NotesRelevantFormData): string => formatCameras(fd.cameras ?? [])
    // Un-edited stored camera sections self-heal to empty on the next reconcile
    // (output comparison); manually-edited ones stay. Do NOT remove 'cameras' from
    // NoteSectionId — the exhaustiveness check below requires a registry entry per
    // union member.
    id: 'cameras',
    label: 'cameras',
    formatter: (): string => '',
  },
  {
    id: 'export',
    label: 'export',
    formatter: formatExport,
  },
  {
    id: 'timeOnScene',
    label: 'time on scene',
    formatter: formatTimeOnScene,
  },
] as const satisfies readonly SectionDefinition[]

// Phone DEF-038 guard: adding a NoteSectionId member without a registry entry is a
// compile error (registry-driven consumers would otherwise silently never render it).
type RegisteredId = (typeof SECTION_DEFINITIONS)[number]['id']
type MissingRegistryEntry = Exclude<NoteSectionId, RegisteredId>
const _registryIsExhaustive: MissingRegistryEntry extends never ? true : never = true
void _registryIsExhaustive

/** Display label for a section id (registry-derived, never hand-typed at call sites). */
export function sectionLabel(id: NoteSectionId): string {
  // The exhaustiveness guard above makes the lookup total; the fallback is unreachable.
  return SECTION_DEFINITIONS.find(def => def.id === id)?.label ?? id
}
