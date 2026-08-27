import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import { EmptyState } from '@/features/demo/ui/controls/EmptyState'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * A80 / U3.4. Two contracts, and they pull in opposite directions on purpose:
 *
 *  1. The SCREEN-LEVEL empty state (`controls/EmptyState.tsx`) renders the phone's
 *     `EmptyState.tsx:39-52` recipe and **no italic, no border**.
 *  2. The IN-CARD empty line and every live-data italic in the demo **keep** their italic,
 *     because the phone keeps them too. A blanket "no italic" sweep is the regression this
 *     file exists to stop, and A80's row invites exactly that sweep.
 */

const rgb = (hex: string): string => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

describe('EmptyState — the screen-level recipe (A80)', () => {
  // Scoped through the render's own `container`, not `screen`: the last case mounts twice in
  // one test and a global query then finds both copies.
  const mount = (action?: React.ReactNode) => {
    const { container } = render(<EmptyState message="No cases yet." action={action} />)
    const box = container.firstElementChild as HTMLElement
    return { box, message: within(box).getByText('No cases yet.') }
  }

  it('lands the phone EmptyState.tsx:39-52 values', () => {
    const { box, message } = mount()
    // container `:41` paddingVertical: Layout.spacing.xxl
    expect(box.style.padding).toBe('48px 0px')
    expect(box.style.alignItems).toBe('center')
    expect(box.style.justifyContent).toBe('center')
    // message `:46-48` + `:29`
    expect(message.style.fontSize).toBe('18px')
    expect(message.style.marginBottom).toBe('24px')
    expect(message.style.textAlign).toBe('center')
    // jsdom rewrites hex to rgb(); assert against the TOKEN, not a retyped literal, so a
    // re-point of `textSecondary` moves the pin with it.
    expect(message.style.color).toBe(rgb(colors.textSecondary))
  })

  it('renders NO italic and NO border — the two A80 bans that have teeth', () => {
    const { box, message } = mount()
    for (const el of [box, message]) {
      // `''` is jsdom's "not set". Asserting `not.toBe('italic')` would pass over a
      // `fontStyle: 'oblique'`, which is the same regression wearing a different word.
      expect(el.style.fontStyle).toBe('')
      expect(el.style.border).toBe('')
      expect(el.style.borderWidth).toBe('')
      expect(el.style.borderColor).toBe('')
      // "no glass": nothing paints a ground here either.
      expect(el.style.background).toBe('')
      expect(el.style.backgroundImage).toBe('')
    }
  })

  it('gives the optional action its own minWidth 200 box, and omits the box otherwise', () => {
    const { box } = mount(<button type="button">Create Case</button>)
    const slot = box.lastElementChild as HTMLElement
    expect(slot.style.minWidth).toBe('200px')
    expect(slot).toContainElement(screen.getByRole('button', { name: 'Create Case' }))
    // phone `:30-34`: the button subtree renders only when a handler is supplied.
    expect(mount().box.children).toHaveLength(1)
  })
})

/**
 * The KEEP-LIST, as a census of `ui/` source.
 *
 * Why source and not a render: the risk this guards is a FUTURE blanket sweep across files
 * whose render fixtures live in eleven different suites, several of which have no case that
 * reaches the italic branch at all (`DvrInfoScreen`'s retention placeholder needs two settings
 * toggles; `MediaLibrarySheet`'s caption needs a captioned item). A census reds on the sweep
 * itself, in one place, and it reds in BOTH directions — a converted keep-site drops its count
 * and a newly-added italic raises it. Both directions are mutation-verified (U3.4 report).
 *
 * The repo's own precedent for a source-shape invariant is `ui/__tests__/glass-tokens.test.ts`'s
 * banned-literal sweep and `tokens/__tests__/palette.test.ts`'s retired-ramp sweep; this is the
 * same shape and the same justification.
 *
 * EVERY ENTRY IS A RULING. Each says why the site is not an empty state, so that removing one
 * is a reviewable act rather than a number edit.
 */
const ITALIC_KEEP_LIST: Readonly<Record<string, number>> = {
  // Live DATA — the italic carries "this text came from the case", not "this list is empty".
  'screens/map/LocationRow.tsx': 1, // `biz`, the business name on a map row
  'screens/MediaLibrarySheet.tsx': 2, // `item.caption`, twice (the info line and the list row)
  'screens/ExportModal.tsx': 2, // `view.locationLabel` and `prompt.summary`
  'screens/SyncStatusCard.tsx': 1, // `sync.traceability`
  // U6.4b took the Banner hand-back, so the dashed advisory's italic went with the box. The
  // `Cameras:` line is the survivor, and it is the phone's own (`time-offset.tsx:870-874`).
  'screens/TimeOffsetScreen.tsx': 1, // `Cameras: {sc.cameras}`
  'screens/OcrCaptureScreen.tsx': 1, // the "Manually edited" status label
  'screens/DeleteConfirmationModal.tsx': 1, // the red warning line (U4.3/§C.3 rule 1, not A80)

  // IN-CARD empty LINES. These ARE empty states — and the phone styles them italic anyway, in
  // its own separate stylesheets. De-italicising them is drift AWAY from `dd5551ec`:
  'screens/CasesScreen.tsx': 1, // "No locations yet" — phone CaseCard.tsx:274-278
  'screens/DashboardScreen.tsx': 1, // "No locations yet" — phone DashboardCaseCard.tsx:333-337
  'screens/export/ExportCaseCard.tsx': 1, // phone export-hub/ExportCaseCard.tsx:340-346
  'screens/DvrInfoScreen.tsx': 1, // the retention placeholder, inside a populated SectionCard
}

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      out.push(full)
    }
  }
  return out
}

describe('the italic keep-list (A80 — what the sweep must NOT touch)', () => {
  it('leaves exactly the ruled sites italic, and no others', () => {
    const census: Record<string, number> = {}
    for (const file of sourceFiles(UI_ROOT)) {
      // Comments stripped FIRST, block then line. Without it this file's own docblock — which
      // quotes the declaration to explain the rule — counts as a site, and so would any future
      // `// was fontStyle: 'italic'` breadcrumb left by a refactor. Same reasoning, and the
      // same failure mode, as the drift guard's `region()` (`check-rn-parity.mjs:118-127`).
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
      // Case-insensitive and whitespace-tolerant, per plan §4.7: the demo spells the same
      // declaration `fontStyle: 'italic'` and (in a wrapped object) `fontStyle:'italic'`.
      const hits = src.match(/fontstyle\s*:\s*'italic'/gi)
      if (hits) census[relative(UI_ROOT, file).split(sep).join('/')] = hits.length
    }
    expect(census, 'a site left or joined the keep-list — rule on it here, do not edit the number').toEqual(
      ITALIC_KEEP_LIST,
    )
  })

  it('accounts for the whole pre-U3.4 census: 20 sites in 17 files, minus the five converted', () => {
    const kept = Object.values(ITALIC_KEEP_LIST).reduce((a, b) => a + b, 0)
    // 20 measured at `28e7993` (partner legwork W2, C7). U3.4 converted five screen-level
    // sites to `EmptyState`: CasesScreen:86, DashboardScreen:62, CamerasScreen:83,
    // ArrivalDepartureScreen:33, ExtractedScopeScreen:27.
    // U3.3 then removed a SIXTH italic, and not by sweeping: `DateDisambiguationWarning`'s
    // suggestion BOX is gone entirely, because the phone folds `warning.suggestion` into the
    // Banner message (phone `DateDisambiguationWarning.tsx:47`). The ruling is a deletion, not a
    // de-italicisation — there is no longer a node to italicise — which is why the entry left
    // the list above rather than changing its count. Do not restore either.
    // U6.4b removed a SEVENTH the same way: `TimeOffsetScreen`'s dashed DST advisory is gone as
    // a BOX (A71 / D19's hand-back), so its italic went with it rather than being swept. The
    // phone made the identical deletion in `4853f9d9`. This file's count went 2 -> 1 because it
    // had two sites and kept the `Cameras:` line.
    expect(kept, '20 measured before U3.4; 5 converted there, 1 deleted by U3.3, 1 by U6.4b').toBe(20 - 5 - 1 - 1)
    // The five converted files must carry NO screen-level italic any more. Three of them are
    // off the list entirely; two keep exactly their in-card line, asserted by the census above.
    for (const gone of ['screens/CamerasScreen.tsx', 'screens/ArrivalDepartureScreen.tsx', 'screens/ExtractedScopeScreen.tsx']) {
      expect(ITALIC_KEEP_LIST[gone], `${gone} was fully converted`).toBeUndefined()
    }
  })
})
