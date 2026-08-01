import { describe, it, expect } from 'vitest'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { CHAPTERS, WIZARD_SCREENS, LAUNCHABLE, DRAWER_DEFS, TAB_VIEWS } from '@/features/demo/engine/content/screens'
import type { ModalId } from '@/features/demo/engine/types'

// The exploration-manifest registry: the rail checklist's single source of truth.
// Array order = numbering (repo convention — same as WIZARD_SCREENS and the marketing
// feature catalog). These invariants are what make future additions safe: the owner
// adds/regroups items freely; the cross-registry checks catch typos at test time.
const KNOWN_TARGETS = new Set<string>([...CHAPTERS, ...LAUNCHABLE, ...TAB_VIEWS])
/** Exhaustive by construction, like `MODAL_IDS` in `store/persistence.ts`: a new `ModalId`
 *  is a COMPILE error here, which forces whoever adds one to decide whether the manifest
 *  should list it. The previous hand-written trio had already rotted — `editIncident`,
 *  `duplicateLocation`, `newAddressLocation` and `mediaLibrary` were all missing, so any of
 *  them appearing in `covers` would have failed this check for the wrong reason. */
const MODAL_ID_SET: Record<ModalId, true> = {
  newCase: true,
  newLocation: true,
  import: true,
  mediaLibrary: true,
  editIncident: true,
  duplicateLocation: true,
  newAddressLocation: true,
  // Deliberately NOT listed in EXPLORE_ITEMS (P5.3): the scope chooser is a step INSIDE
  // Completion, reached from its "Export Zip" button, the same relationship `ocr` has to Time
  // Offset — and the module note above says why that shape gets no row of its own. The Export
  // TAB is a destination and will bring its own row (P5.2).
  exportScope: true,
}
const KNOWN_COVER_IDS = new Set<string>([...CHAPTERS, ...LAUNCHABLE, ...TAB_VIEWS, ...Object.keys(MODAL_ID_SET)])

describe('EXPLORE_ITEMS registry', () => {
  it('every jumpTo is a known view and every covers id is a known view/modal/launchable', () => {
    for (const item of EXPLORE_ITEMS) {
      expect(KNOWN_TARGETS.has(item.jumpTo), `item "${item.id}" jumps to unknown view "${item.jumpTo}"`).toBe(true)
      for (const c of item.covers) {
        expect(KNOWN_COVER_IDS.has(c), `item "${item.id}" covers unknown id "${c}"`).toBe(true)
      }
      expect(item.covers.length, `item "${item.id}" covers nothing`).toBeGreaterThan(0)
    }
  })

  it('ids are unique and labels non-empty', () => {
    const ids = EXPLORE_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of EXPLORE_ITEMS) expect(item.label.length).toBeGreaterThan(0)
  })

  it('covers sets are disjoint across items (keeps "exactly one active row" sound)', () => {
    // Grouping means ONE item covering MANY ids — never two items sharing an id,
    // which would light two active markers at once (review L3).
    const all = EXPLORE_ITEMS.flatMap((i) => [...i.covers])
    expect(new Set(all).size).toBe(all.length)
  })

  it('lists every wizard screen (labels shared with the drawer) plus every tab and import', () => {
    const ids = EXPLORE_ITEMS.map((i) => i.id)
    for (const w of WIZARD_SCREENS) expect(ids, `wizard screen "${w}" missing`).toContain(w)
    // Every tab destination is reachable from the manifest, not just the ones that predate it.
    for (const t of TAB_VIEWS) expect(ids, `tab "${t}" missing`).toContain(t)
    expect(ids).toContain('import')
    // Labels for wizard rows come from DRAWER_DEFS — one source, the drawer and the
    // manifest can never disagree.
    for (const d of DRAWER_DEFS) {
      expect(EXPLORE_ITEMS.find((i) => i.id === d.id)?.label).toBe(d.label)
    }
  })

  it('excludes splash (unreachable until the deferred video entry)', () => {
    expect(EXPLORE_ITEMS.some((i) => i.id === 'splash' || i.covers.includes('splash'))).toBe(false)
  })

  it('splits case management into Create a Case / Add a Location / Import Location, each lit by its own modal', () => {
    const byId = (id: string) => EXPLORE_ITEMS.find((i) => i.id === id)
    expect(byId('newCase')?.label).toBe('Create a Case')
    expect(byId('newLocation')?.label).toBe('Add a Location')
    expect(byId('import')?.label).toBe('Import Location')
    expect(byId('newCase')?.covers).toEqual(['newCase'])
    expect(byId('newLocation')?.covers).toEqual(['newLocation'])
    expect(byId('import')?.covers).toEqual(['import'])
    // the case-management rows all route to the Cases screen where the actions live
    for (const id of ['newCase', 'newLocation', 'import']) expect(byId(id)?.jumpTo).toBe('cases')
  })

  it('orders the case-management actions right after Cases, before the wizard', () => {
    const ids = EXPLORE_ITEMS.map((i) => i.id)
    expect(ids.slice(0, 5)).toEqual(['dashboard', 'cases', 'newCase', 'newLocation', 'import'])
  })

  it('lists the three media surfaces after the wizard steps, then the tab-only destinations (§63g)', () => {
    const ids = EXPLORE_ITEMS.map((i) => i.id)
    // Positional, because the numbering is: the accordion sits after the step list in the
    // drawer, so it sits after the step rows here. Map and Export close the list — the two
    // tabs that are not also chapters, in tab-bar order (P5.2).
    expect(ids.slice(-5)).toEqual(['mediaCapture', 'audioRecording', 'mediaLibrary', 'map', 'export'])
    // …and after the LAST wizard screen specifically, not merely somewhere later.
    expect(ids.indexOf('mediaCapture')).toBe(ids.indexOf(WIZARD_SCREENS[WIZARD_SCREENS.length - 1]) + 1)
  })

  it('labels the media rows with the drawer accordion’s own visible text', () => {
    const byId = (id: string) => EXPLORE_ITEMS.find((i) => i.id === id)
    // `WizardDrawer.tsx:331-333`. Those row defs carry JSX icons, so they cannot live in the
    // engine the way DRAWER_DEFS does — this is the pairing DRAWER_DEFS gets for free.
    expect(byId('mediaCapture')?.label).toBe('Capture Media')
    expect(byId('audioRecording')?.label).toBe('Record Audio')
    expect(byId('mediaLibrary')?.label).toBe('Media Library')
  })

  it('jumps the two capture screens to themselves and the library to the wizard that opens it', () => {
    const byId = (id: string) => EXPLORE_ITEMS.find((i) => i.id === id)
    expect(byId('mediaCapture')?.jumpTo).toBe('mediaCapture')
    expect(byId('audioRecording')?.jumpTo).toBe('audioRecording')
    // A modal has no view to jump to — same treatment as newCase/newLocation/import, which
    // route to the screen holding their opener.
    expect(byId('mediaLibrary')?.jumpTo).toBe('submission')
  })

  it('still leaves ocr uncovered — it is a step inside Time Offset, not a destination', () => {
    expect(EXPLORE_ITEMS.some((i) => i.id === 'ocr' || i.covers.includes('ocr'))).toBe(false)
  })
})
