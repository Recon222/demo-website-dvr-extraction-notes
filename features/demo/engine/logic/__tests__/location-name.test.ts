import { describe, it, expect } from 'vitest'
import {
  LOCATION_NAME_MAX_LENGTH,
  ensureUniqueLocationName,
  generateCopyName,
  isLocationNameTaken,
} from '@/features/demo/engine/logic/location-name'

/**
 * The phone's location-name helpers, ported (P3.4 row 13 + P3.5 row 14, merged at the P3
 * assembly — both packages ported `isLocationNameTaken`; P3.4's suite below is the superset
 * that survived, P3.5's redundant copy was dropped).
 *
 * The generator describes mirror the phone's own suite
 * (`src/features/case-management/utils/__tests__/location-name.test.ts`) case for case, so a
 * divergence in the numbering semantics shows up here as a red test rather than as a subtly
 * different name in a case file. The fourth describe pins the edge cases the phone's suite
 * leaves implicit (suffix-only sources, truncation-with-collision, the loop bound).
 */

describe('isLocationNameTaken (phone location-name.ts:49-52)', () => {
  it('matches an identical sibling', () => {
    expect(isLocationNameTaken('Main Store', ['Main Store'])).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isLocationNameTaken('MAIN STORE', ['main store'])).toBe(true)
    expect(isLocationNameTaken('main store', ['Main Store'])).toBe(true)
  })

  it('trims both sides before comparing', () => {
    // The phone's stated reason: "Main Store" and " main store " are the same location to a
    // human reading a case file (location-name.ts:6-8).
    expect(isLocationNameTaken('  Main Store  ', ['Main Store'])).toBe(true)
    expect(isLocationNameTaken('Main Store', ['\tmain store\n'])).toBe(true)
  })

  it('does not match a different name, or a name that merely contains it', () => {
    expect(isLocationNameTaken('Main Store', ['Rear Door'])).toBe(false)
    expect(isLocationNameTaken('Main', ['Main Store'])).toBe(false)
    expect(isLocationNameTaken('Main Store 2', ['Main Store'])).toBe(false)
  })

  it('does not match interior whitespace differences (trim is not a squeeze)', () => {
    expect(isLocationNameTaken('Main  Store', ['Main Store'])).toBe(false)
  })

  it('is false against an empty sibling list', () => {
    expect(isLocationNameTaken('Main Store', [])).toBe(false)
  })

  it('finds a collision anywhere in the list', () => {
    expect(isLocationNameTaken('Rear Door', ['Main Store', 'Loading Bay', 'rear door'])).toBe(true)
  })

  it('treats blank as colliding with a blank sibling — callers gate blank first', () => {
    // Documented, not desirable: the gate reports `nameRequired` before it ever asks this
    // (new-location-gate.ts), so this never surfaces as "duplicate" in the UI.
    expect(isLocationNameTaken('   ', [''])).toBe(true)
    expect(isLocationNameTaken('', ['Main Store'])).toBe(false)
  })
})

describe('generateCopyName', () => {
  it('suggests "X - Copy" when no copy exists yet', () => {
    expect(generateCopyName('Main Store', ['Main Store'])).toBe('Main Store - Copy')
  })

  it('suggests "X - Copy (2)" when "X - Copy" already exists', () => {
    expect(generateCopyName('Main Store', ['Main Store', 'Main Store - Copy'])).toBe(
      'Main Store - Copy (2)',
    )
  })

  it('suggests "X - Copy (3)" when Copy and Copy (2) exist', () => {
    expect(
      generateCopyName('Main Store', ['Main Store', 'Main Store - Copy', 'Main Store - Copy (2)']),
    ).toBe('Main Store - Copy (3)')
  })

  it('fills the first free slot when numbering has gaps', () => {
    // "X - Copy" taken, "X - Copy (2)" free — the gap is filled, not skipped past.
    expect(
      generateCopyName('Main Store', ['Main Store', 'Main Store - Copy', 'Main Store - Copy (3)']),
    ).toBe('Main Store - Copy (2)')
  })

  it('does not stack " - Copy - Copy" when duplicating a copy', () => {
    expect(generateCopyName('Main Store - Copy', ['Main Store', 'Main Store - Copy'])).toBe(
      'Main Store - Copy (2)',
    )
  })

  it('increments when duplicating a numbered copy', () => {
    expect(
      generateCopyName('Main Store - Copy (2)', [
        'Main Store',
        'Main Store - Copy',
        'Main Store - Copy (2)',
      ]),
    ).toBe('Main Store - Copy (3)')
  })

  it('treats existing names case-insensitively', () => {
    expect(generateCopyName('Main Store', ['main store', 'MAIN STORE - COPY'])).toBe(
      'Main Store - Copy (2)',
    )
  })

  it('returns "X - Copy" for an empty existing list', () => {
    expect(generateCopyName('Main Store', [])).toBe('Main Store - Copy')
  })

  it('never exceeds the max length', () => {
    const longName = 'A'.repeat(LOCATION_NAME_MAX_LENGTH)
    const result = generateCopyName(longName, [longName])

    expect(result.length).toBeLessThanOrEqual(LOCATION_NAME_MAX_LENGTH)
    expect(result.endsWith(' - Copy')).toBe(true)
  })

  it('never exceeds the max length with a numbered suffix', () => {
    const longName = 'A'.repeat(LOCATION_NAME_MAX_LENGTH)
    const truncatedCopy = generateCopyName(longName, [longName])
    const result = generateCopyName(longName, [longName, truncatedCopy])

    expect(result.length).toBeLessThanOrEqual(LOCATION_NAME_MAX_LENGTH)
    expect(result.endsWith(' - Copy (2)')).toBe(true)
  })

  it('trims the source name before suffixing', () => {
    expect(generateCopyName('  Main Store  ', ['Main Store'])).toBe('Main Store - Copy')
  })
})

describe('ensureUniqueLocationName', () => {
  it('returns the name unchanged when it is free', () => {
    expect(ensureUniqueLocationName('Main Store', ['Back Office'])).toBe('Main Store')
  })

  it('appends " (2)" when the name is taken', () => {
    expect(ensureUniqueLocationName('Main Store', ['Main Store'])).toBe('Main Store (2)')
  })

  it('increments to the first free number', () => {
    expect(ensureUniqueLocationName('Main Store', ['Main Store', 'Main Store (2)'])).toBe(
      'Main Store (3)',
    )
  })

  it('does not stack suffixes when the input already carries one', () => {
    expect(ensureUniqueLocationName('Main Store (2)', ['Main Store', 'Main Store (2)'])).toBe(
      'Main Store (3)',
    )
  })

  it('compares case-insensitively', () => {
    expect(ensureUniqueLocationName('main store', ['Main Store'])).toBe('main store (2)')
  })

  it('never exceeds the max length', () => {
    const longName = 'B'.repeat(LOCATION_NAME_MAX_LENGTH)
    const result = ensureUniqueLocationName(longName, [longName])

    expect(result.length).toBeLessThanOrEqual(LOCATION_NAME_MAX_LENGTH)
    expect(result.endsWith(' (2)')).toBe(true)
  })

  it('returns the trimmed name when free', () => {
    expect(ensureUniqueLocationName('  Main Store  ', [])).toBe('Main Store')
  })
})

describe('numbering edge cases (phone behaviour, pinned)', () => {
  it('generateCopyName: a source that is ONLY a copy suffix keeps its own text', () => {
    // "- Copy" strips to empty, so the guard falls back to the trimmed source rather than
    // emitting a bare " - Copy" with no name in front of it.
    expect(generateCopyName('- Copy', [])).toBe('- Copy - Copy')
  })

  it('generateCopyName: truncation trims the trailing space it lands on', () => {
    // 100 - " - Copy".length = 93 → the slice ends on the space, which trimEnd removes,
    // so the result is "A"×92 + " - Copy" (99 chars), never "A"×92 + "  - Copy".
    const source = `${'A'.repeat(92)} ${'B'.repeat(10)}`
    const result = generateCopyName(source, [])

    expect(result).toBe(`${'A'.repeat(92)} - Copy`)
    expect(result.length).toBe(99)
  })

  it('generateCopyName: a truncated copy collides with its own truncation and numbers on', () => {
    // Two DIFFERENT long names that truncate to the same base: the second must still get a
    // free slot rather than re-proposing the taken truncation.
    const a = `${'A'.repeat(93)}-first`
    const b = `${'A'.repeat(93)}-second`
    const firstCopy = generateCopyName(a, [a])
    const secondCopy = generateCopyName(b, [a, b, firstCopy])

    expect(firstCopy).toBe(`${'A'.repeat(93)} - Copy`)
    expect(secondCopy).toBe(`${'A'.repeat(89)} - Copy (2)`)
    expect(secondCopy.length).toBeLessThanOrEqual(LOCATION_NAME_MAX_LENGTH)
  })

  it('generateCopyName: the loop bound covers a fully-packed numbering run', () => {
    // Every slot from "- Copy" through "- Copy (5)" taken → the first free one is (6),
    // reached inside the `existingNames.length + 2` bound (6 names → n runs to 8).
    const existing = [
      'Site',
      'Site - Copy',
      'Site - Copy (2)',
      'Site - Copy (3)',
      'Site - Copy (4)',
      'Site - Copy (5)',
    ]
    expect(generateCopyName('Site', existing)).toBe('Site - Copy (6)')
  })

  it('ensureUniqueLocationName: the new-address default walks "New Location" upward', () => {
    // The exact call the new-address flow makes (phone cases.tsx:461).
    expect(ensureUniqueLocationName('New Location', [])).toBe('New Location')
    expect(ensureUniqueLocationName('New Location', ['New Location'])).toBe('New Location (2)')
    expect(
      ensureUniqueLocationName('New Location', ['New Location', 'new location (2)']),
    ).toBe('New Location (3)')
  })

  it('ensureUniqueLocationName: a " - Copy" tail is NOT stripped (different suffix style)', () => {
    // Only the " (N)" style is stripped here; a copy name numbers as a whole.
    expect(ensureUniqueLocationName('Main Store - Copy', ['Main Store - Copy'])).toBe(
      'Main Store - Copy (2)',
    )
  })

  it('both helpers ignore an empty candidate list without inventing a suffix', () => {
    expect(isLocationNameTaken('', [])).toBe(false)
    expect(ensureUniqueLocationName('Site', [])).toBe('Site')
  })
})
