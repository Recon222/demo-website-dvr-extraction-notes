import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * D7 / U8.4 — the design-sync bundle's three "config edited, generator not re-run" holes.
 *
 * `.design-sync/config.json` is hand-edited; `ds-entry.ts` and `dtsPropsFor` are GENERATED from
 * it by two scripts that nothing runs automatically. Every failure mode below is silent:
 *
 *  1. **Unreachable component.** `.design-sync/NOTES.md:162-165`, verbatim: *"a component added
 *     to `componentSrcMap` without re-running `gen-entry.mjs` is bundled-but-unreachable (or
 *     absent), and the card fails at RUNTIME, not build time."* The bundle builds, validate
 *     passes, and the design agent sees "Element type is invalid" on a card.
 *  2. **Missing `cardMode`.** `NOTES.md:143-150`: every component's dark frame is wider than the
 *     default grid cell, so a component with no `{cardMode:'column'}` override draws a
 *     `[GRID_OVERFLOW]` warn — presentation-only, and therefore easy to ship.
 *  3. **Missing prop contract.** `NOTES.md:98-101`: without a `dtsPropsFor` entry the emitted
 *     `<Name>.d.ts` degrades to `{ [key: string]: unknown }`, and *"the `.d.ts` IS the API
 *     contract the design agent codes against"*.
 *
 * The pin for (1) is a REAL IMPORT of the generated entry, never a scan of its source text: a
 * `export { X } from '…'` line proves nothing about whether `X` resolves, and a source-contains
 * assertion stays green over a dead export (mutation-testing skill, "the string-presence trap").
 *
 * Everything is driven FROM `componentSrcMap`, so a component added later is covered with no
 * edit here — no exemption list, nothing opted out by default.
 */
const cfg = JSON.parse(
  readFileSync(join(process.cwd(), '.design-sync', 'config.json'), 'utf8'),
) as {
  componentSrcMap: Record<string, string | null>
  overrides: Record<string, { cardMode?: string }>
  dtsPropsFor: Record<string, string>
}

/** The components the bundle ships. `null` means deliberately excluded (`NOTES.md:47-50`). */
const pinned = Object.entries(cfg.componentSrcMap)
  .filter(([, src]) => src !== null)
  .map(([name]) => name)

describe('the design-sync bundle entry (D7 / U8.4)', () => {
  it('pins components at all', () => {
    // Anti-vacuity. Every assertion below iterates `pinned`; an empty map would make all of
    // them pass over a bundle that ships nothing.
    expect(pinned.length).toBeGreaterThan(30)
  })

  // Per-name rather than one collected list, because plan §5 U8.4 words the gate as "import
  // each by its `componentSrcMap` key" and a per-case run PRINTS each key — the gate's output
  // is then the evidence, not a summary of it. The module is imported once and cached.
  it.each(pinned)('%s resolves from the GENERATED entry', async (name) => {
    const entry = (await import('@/.design-sync/ds-entry')) as unknown as Record<string, unknown>
    expect(
      typeof entry[name],
      `${name} is bundled-but-unreachable — run \`node .design-sync/gen-entry.mjs\` after editing componentSrcMap`,
    ).toBe('function')
  })

  it('gives every pinned component a cardMode override', () => {
    const missing = pinned.filter((name) => cfg.overrides[name]?.cardMode === undefined)
    expect(missing, 'each would draw [GRID_OVERFLOW] — see NOTES.md "cardMode overrides"').toEqual([])
  })

  it('gives every pinned component a prop contract, and carries no orphan contract', () => {
    // Both directions. A missing entry degrades the .d.ts to `{ [key: string]: unknown }`; an
    // orphan entry is a contract for a component the bundle no longer ships, which
    // `gen-dts-props.mjs` cannot remove on its own (it only ever adds).
    expect(Object.keys(cfg.dtsPropsFor).sort()).toEqual([...pinned].sort())
  })
})
