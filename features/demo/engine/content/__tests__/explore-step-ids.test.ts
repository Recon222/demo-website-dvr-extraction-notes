import { describe, it, expect } from 'vitest'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { FORM_STEPS } from '@/features/demo/engine/content/form-customization'
import { WIZARD_SCREENS } from '@/features/demo/engine/content/screens'

/**
 * `ExploreItem.id` is the one bare-string field in its registry, and P7.3 made it load-bearing:
 * `selectExploreStatus` drops a row when its id names a form step the visitor has switched off.
 * The join is by convention — most rows are not steps at all (`newCase`, `mediaLibrary`, `map`,
 * `settings`), so the field cannot simply be typed — which is why it is pinned here (R-28).
 *
 * The first test is the whole guarantee, in one assertion, over the whole `FORM_STEPS` id space
 * (fix-delta FD-5). R-28 originally split it in two, and the second half — "lets no OTHER row
 * collide with a form-step id" — was vacuous by construction: it filtered the candidates out
 * before asserting, then allowlisted the only survivors that could have tripped it. A count per
 * step id catches BOTH directions with nothing filtered away, and covers the two additive tools
 * that the wizard-screen half never reached.
 */
describe('the explore registry joins to the form-step id space by convention', () => {
  it('carries exactly one row per form step — no drift, no collision', () => {
    // n === 0 → a step row's slug drifted and that row can never be filtered by the grid again.
    // n === 2 → some OTHER row (Media Library, Settings, a modal) collides with a step id and
    // will vanish whenever that step is switched off, though the grid does not govern it.
    // Both readings are the same count, which is why this is one assertion and not two tests.
    const carriers = FORM_STEPS.map((step) => ({
      step: step.id,
      rows: EXPLORE_ITEMS.filter((i) => i.id === step.id).map((i) => i.label),
    }))
    expect(carriers.filter((c) => c.rows.length !== 1)).toEqual([])
  })

  it('routes each wizard-screen row at its own screen', () => {
    // The half the count cannot see: a row correctly slugged `cameras` that jumps somewhere else
    // is filterable but lands the visitor on the wrong screen. (The two additive tools are
    // excluded — they are launchables, and `jumpTo` names the launch screen, not a chapter.)
    for (const screen of WIZARD_SCREENS) {
      const row = EXPLORE_ITEMS.find((i) => i.id === screen)
      expect(row, `no explore row slugged "${screen}"`).toBeTruthy()
      expect(row!.jumpTo).toBe(screen)
    }
  })
})
