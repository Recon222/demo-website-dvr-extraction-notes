import { describe, it, expect } from 'vitest'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { CHAPTERS, WIZARD_SCREENS, LAUNCHABLE, DRAWER_DEFS } from '@/features/demo/engine/content/screens'

// The exploration-manifest registry: the rail checklist's single source of truth.
// Array order = numbering (repo convention — same as WIZARD_SCREENS and the marketing
// feature catalog). These invariants are what make future additions safe: the owner
// adds/regroups items freely; the cross-registry checks catch typos at test time.
const KNOWN_TARGETS = new Set<string>([...CHAPTERS, ...LAUNCHABLE, 'map'])
const KNOWN_COVER_IDS = new Set<string>([...CHAPTERS, ...LAUNCHABLE, 'map', 'import', 'newCase', 'newLocation'])

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

  it('lists every wizard screen (labels shared with the drawer) plus dashboard, cases, import, and map', () => {
    const ids = EXPLORE_ITEMS.map((i) => i.id)
    for (const w of WIZARD_SCREENS) expect(ids, `wizard screen "${w}" missing`).toContain(w)
    for (const core of ['dashboard', 'cases', 'import', 'map']) expect(ids).toContain(core)
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
})
