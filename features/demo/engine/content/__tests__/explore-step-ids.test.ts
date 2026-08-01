import { describe, it, expect } from 'vitest'
import { EXPLORE_ITEMS } from '@/features/demo/engine/content/explore'
import { WIZARD_SCREENS } from '@/features/demo/engine/content/screens'
import { isKnownFormStep } from '@/features/demo/engine/logic/form-visibility'

/**
 * `ExploreItem.id` is the one bare-string field in its registry, and P7.3 made it load-bearing:
 * `selectExploreStatus` filters a row out when its id names a form step the visitor has switched
 * off. That join is by convention, so it is pinned in BOTH directions here (review R-28) — a
 * slug that drifts from its step id stops being filterable silently, and a non-step slug that
 * collides with a step id would be filtered when it should not be.
 */
describe('the explore registry joins to the form-step id space by convention', () => {
  it('carries exactly one row per wizard screen, slugged with that screen id', () => {
    // The rail's step rows are generated from DRAWER_DEFS, so the slug IS the step id today.
    // If that generation is ever hand-unrolled, this is what stops a slug drifting: a step row
    // whose slug no longer matches its step can never be filtered by the grid again.
    for (const screen of WIZARD_SCREENS) {
      const matches = EXPLORE_ITEMS.filter((i) => i.id === screen)
      expect(matches, `no explore row slugged "${screen}"`).toHaveLength(1)
      expect(matches[0].jumpTo).toBe(screen)
    }
  })

  it('lets no OTHER row collide with a form-step id', () => {
    // A collision here would hide a row (Media Library, Settings, the modals…) whenever the
    // colliding step was switched off — a row the grid does not govern at all.
    const others = EXPLORE_ITEMS.filter((i) => !(WIZARD_SCREENS as readonly string[]).includes(i.id))
    for (const row of others) {
      if (!isKnownFormStep(row.id)) continue
      // The two capture TOOLS are the deliberate exception: they ARE additive form steps, and
      // being dropped with their tool is exactly the behaviour P7.3 built.
      expect(['mediaCapture', 'audioRecording'], `slug "${row.id}" collides with a form step`).toContain(row.id)
    }
  })
})
