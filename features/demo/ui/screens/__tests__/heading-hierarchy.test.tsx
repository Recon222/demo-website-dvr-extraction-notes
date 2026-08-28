import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TimeOffsetScreen, type TimeOffsetScreenProps } from '@/features/demo/ui/screens/TimeOffsetScreen'

/**
 * DEF-UI-012 — the three-level heading ladder, pinned as a LADDER rather than as three values.
 *
 * The phone settled this in PR #124 (`4f69eb73`) and wrote the reasoning into
 * `time-offset.tsx`'s stylesheet, quoted verbatim in
 * `docs/planning/demo-phone-ui-parity/phone-ui-delta-inventory.md:12402-12414`:
 *
 *   *"This used to be lg/BOLD, which made a sub-heading heavier than its own parent -
 *   `FormSection`'s title is lg/semibold - with `scopeTitle` at base/bold beneath it, so the
 *   middle level outweighed the top and the bottom matched the middle. The three levels are
 *   decided together as one monotone ladder, size and weight both descending:*
 *
 *       FormSection title   lg   (18) / semibold   <- not ours to change
 *       sectionHeader       base (16) / semibold
 *       scopeTitle          sm   (14) / semibold
 *
 * ## Why the pin is a LADDER and not three literal assertions
 *
 * Three literals would pass over a ladder that is internally consistent and wrong — raise all
 * three by a step and each assertion still names a number somebody typed. The defect
 * DEF-UI-012 records is RELATIONAL ("the middle level outweighed the top"), so the invariant
 * is relational too: every level is no larger and no heavier than the one above it. The plan
 * row asks for exactly this ("each level's computed weight <= its parent's").
 *
 * The literals are still pinned — once, as the ladder's TOP and BOTTOM rungs — because a
 * monotone check alone is satisfied by 18/18/18. Together the two halves say "descending, and
 * descending from HERE to HERE"; neither is sufficient alone.
 *
 * ## The ladder is a typographic REGISTER, not DOM ancestry
 *
 * Level 1 is `SectionCard`'s title (`_shared.tsx`, A77). Level 2 sits BELOW that card in the
 * DOM rather than inside it, and that is deliberate on both sides: DEF-UI-012's other half is
 * *"never nest a glass section inside a glass section"*, so the phone could not fix the
 * collision structurally and neither can the demo. What descends is the register a reader
 * perceives, which is what the phone's own comment ranks.
 */

const nav = { nextLabel: "Next: Test Step", onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }

const props: TimeOffsetScreenProps = {
  dvrDateTime: '2026-06-01 12:05:30',
  actualDateTime: '2026-06-01 12:00:00',
  onChangeDvr: vi.fn(),
  onChangeActual: vi.fn(),
  onUseCurrentTime: vi.fn(),
  onCalculate: vi.fn(),
  onCaptureOcr: vi.fn(),
  sync: null,
  syncing: false,
  result: { diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false },
  correctedScopes: [
    {
      id: 'sc1',
      reqLabel: 'Real Time',
      adjLabel: 'DVR Time',
      reqStart: '2026-06-01 09:00:00',
      reqEnd: '2026-06-01 10:00:00',
      adjStart: '2026-06-01 09:05:30',
      adjEnd: '2026-06-01 10:05:30',
      cameras: 'Cam 1, Cam 2',
    },
  ],
  dvrAppliesDST: false,
  onToggleDst: vi.fn(),
  dstAdvisory: null,
  hasExtractedScopes: false,
  ...nav,
}

/** `fontSize` / `fontWeight` as numbers. jsdom keeps inline values verbatim apart from units. */
function register(el: HTMLElement): { size: number; weight: number } {
  return { size: parseFloat(el.style.fontSize), weight: parseInt(el.style.fontWeight, 10) }
}

describe('DEF-UI-012 — the Time Offset heading ladder descends monotonically', () => {
  /** The three levels, top-down, each addressed by its own copy. */
  function ladder(): { name: string; size: number; weight: number }[] {
    render(<TimeOffsetScreen {...props} />)
    return [
      ['FormSection title', 'DVR Time vs Actual Time'],
      ['sectionHeader', 'Adjusted Time Ranges'],
      ['scopeTitle', 'Scope 1'],
    ].map(([name, text]) => ({ name, ...register(screen.getByText(text)) }))
  }

  it('never lets a level outweigh or outgrow the level above it', () => {
    const levels = ladder()
    // Reported as a table rather than three separate assertions: a failure has to say WHICH
    // rung broke and by how much, and the phone's own defect was visible only as a pair.
    expect(levels.map((l) => `${l.name} ${l.size}/${l.weight}`)).toEqual([
      'FormSection title 18/600',
      'sectionHeader 16/600',
      'scopeTitle 14/600',
    ])
    for (let i = 1; i < levels.length; i++) {
      const [parent, child] = [levels[i - 1], levels[i]]
      expect(child.weight, `${child.name} outweighs its parent ${parent.name}`).toBeLessThanOrEqual(parent.weight)
      expect(child.size, `${child.name} outgrows its parent ${parent.name}`).toBeLessThanOrEqual(parent.size)
    }
  })
})
