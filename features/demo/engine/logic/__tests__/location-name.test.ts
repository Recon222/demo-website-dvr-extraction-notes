import { describe, it, expect } from 'vitest'

import { isLocationNameTaken } from '@/features/demo/engine/logic/location-name'

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
