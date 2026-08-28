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

  /**
   * W4/F82 — the VALUE-level tripwire. The key-set assertion above is satisfied by a config whose
   * every contract has been gutted, and that is exactly the state `gen-dts-props.mjs` produced
   * before W4: `[DTS] parsed 0 .d.ts files` degrades each entry to `{ [key: string]: unknown }`
   * (`NOTES.md`'s "RESOLVED — weak `.d.ts` prop contracts"), and a key-set-only guard stays green
   * over all 37 of them. A guard that cannot tell a contract from its own absence is not a guard.
   *
   * Not a snapshot, and deliberately not a per-component expectation table: those fail on every
   * legitimate prop change and get updated without being read (the change-detector trap). Two
   * assertions that fail only on GUTTING:
   */
  it('carries contracts with real content, not the degenerate index signature', () => {
    const degenerate = pinned.filter((name) => {
      const body = cfg.dtsPropsFor[name] ?? ''
      // The exact shape the weak-contract regression emits, plus the trivially-empty forms.
      return /\[\s*key\s*:\s*string\s*\]/.test(body) || !body.includes(':') || body.trim().length < 3
    })
    expect(degenerate, 'a contract degraded to an index signature is the pre-W4 regression').toEqual([])
  })

  it("keeps ModalShell's required close label in the shipped contract", () => {
    // The single named sentinel, and F82's own headline: `closeAccessibilityLabel` is REQUIRED on
    // `ModalShell` (`screens/_shared.tsx:247`, U4.2 under D20) because "five near-identical page
    // sheets that all announce 'Close' are indistinguishable to a screen-reader user". It is also
    // the prop `gen-dts-props.mjs` cites as its own fix's evidence, so it is the one value whose
    // disappearance from the contract means the generator has regressed to its no-op — the defect
    // that hid this whole class for a campaign. Optionality is asserted too: the `?` returning
    // would silently re-legalise a nameless close button in the design agent's API.
    expect(cfg.dtsPropsFor.ModalShell).toContain('closeAccessibilityLabel: string')
    expect(cfg.dtsPropsFor.ModalShell).not.toContain('closeAccessibilityLabel?')
  })

  /**
   * W4/F83 — the three MIS-ENCODINGS. Each shipped a contract that was not merely incomplete but
   * WRONG, and each was silent for a whole campaign because nothing read the generator's output
   * back. These are general scans, not per-component expectation tables: a table over 37
   * contracts fails on every legitimate prop change and gets updated without being read.
   */
  describe('the shipped contracts are well-formed (W4/F83)', () => {
    const bodies = Object.entries(cfg.dtsPropsFor)
    /** Comments carry prose; string literals carry data. Neither is a type reference. */
    const typeText = (body: string) => body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^']*'/g, "''")

    it('names no type the emitted .d.ts does not define', () => {
      // The emitted file imports only `React`, so a bare capitalised identifier that is not a
      // `React.*` member and not a DOM lib type is unresolvable IN PRINCIPLE — the design agent
      // is told a prop's shape has a name and given no way to look it up. This is what the
      // missing intersection arm, the dropped generic binder and the unexpanded `Promise<T>`
      // all produced (`GpsCoordinates`, `GpsSource`, `ReverseGeocodeResult`,
      // `OcrRecognizeOutcome`, and a bare `K`).
      const DEFINED = new Set([
        'React', 'Array', 'Promise', 'Date', 'File', 'Blob',
        // lib.dom, which the design tool's tsc has.
        'PositionOptions', 'MediaStreamConstraints', 'MediaStream', 'MediaDeviceInfo', 'HTMLCanvasElement',
      ])
      const offenders = bodies.flatMap(([name, body]) => {
        const names = [...typeText(body).matchAll(/(?<![.\w])([A-Z][A-Za-z0-9_]*)(?!\.)\b/g)].map((m) => m[1])
        const unknown = [...new Set(names)].filter((n) => !DEFINED.has(n))
        return unknown.length ? [`${name}: ${unknown.join(', ')}`] : []
      })
      expect(offenders, 'unresolvable type names in the shipped .d.ts contracts').toEqual([])
    })

    it('parenthesises every union array element', () => {
      // `X[]` binds tighter than `|`, so `'a' | 'b' | 'c'[]` means `'a' | 'b' | ('c'[])` — a
      // contract that rejects the array the component takes and accepts a bare string. The
      // signature is a union arm carrying its own `[]` suffix with no enclosing paren.
      //
      // The `[]` must be preceded by something that is NOT a closer. `{ …; status?: 'a' | 'b' }[]`
      // and `('a' | 'b')[]` are both correct — the union is already bracketed by the `}` or the
      // `)` — so the character immediately before `[]` is what separates them from the bug, where
      // the suffix lands directly on a union arm (`| 'complete'[]`). Measured: without the
      // closer exclusion this reds on `ExploreChecklist` and `WizardDrawer`, which are fine.
      const offenders = bodies.flatMap(([name, body]) =>
        / \| [^;|]*[^\s})\]]\[\]/.test(typeText(body)) ? [name] : [],
      )
      expect(offenders, "a union array element must be parenthesised — `('a' | 'b')[]`").toEqual([])
    })

    it('marks a flattened union props type as KNOWN-LOSSY rather than silently widening it', () => {
      // `OverlayHeader`'s real props type is `Base & ({onBack; backLabel} | {onBack?: undefined;
      // backLabel?: undefined})` — the discriminated pair W3/F74 introduced so an icon-only
      // header cannot ship without an accessible name. An interface BODY cannot express a union,
      // so the flatten is unavoidable; what is NOT acceptable is flattening it to
      // `backLabel?: string; onBack?: () => void` with no trace, which tells the design agent
      // F74's illegal state is legal. The marker is the honest form of the loss.
      expect(cfg.dtsPropsFor.OverlayHeader).toContain('KNOWN-LOSSY')
      expect(cfg.dtsPropsFor.OverlayHeader).toContain('DISCRIMINATED GROUP')
    })
  })
})
