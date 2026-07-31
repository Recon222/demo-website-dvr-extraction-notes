import { describe, it, expect } from 'vitest'

import {
  NEW_LOCATION_BLOCKS,
  NEW_LOCATION_BLOCK_MESSAGES,
  newLocationBlock,
  type NewLocationGateInput,
} from '@/features/demo/engine/logic/new-location-gate'

const input = (o: Partial<NewLocationGateInput> = {}): NewLocationGateInput => ({
  locationName: 'Rear Door',
  streetAddress: '',
  existingNames: [],
  requireAddress: false,
  ...o,
})

describe('newLocationBlock — the phone\'s three submit rules as one derivation', () => {
  it('passes a named location with no siblings', () => {
    expect(newLocationBlock(input())).toBeNull()
  })

  it('blocks a blank name', () => {
    expect(newLocationBlock(input({ locationName: '' }))).toBe('nameRequired')
  })

  it('blocks a whitespace-only name (the phone trims before testing)', () => {
    expect(newLocationBlock(input({ locationName: '   ' }))).toBe('nameRequired')
  })

  it('blocks a name already on the case, case-insensitively and trimmed', () => {
    expect(newLocationBlock(input({ locationName: '  rear DOOR ', existingNames: ['Rear Door'] }))).toBe('duplicateName')
  })

  it('allows a name that is taken on a DIFFERENT case — the caller passes only this case\'s siblings', () => {
    expect(newLocationBlock(input({ locationName: 'Rear Door', existingNames: ['Main Store'] }))).toBeNull()
  })

  it('reports nameRequired, never duplicateName, when the name is blank and a blank sibling exists', () => {
    // Order is load-bearing: isLocationNameTaken('') matches a blank sibling, so evaluating the
    // duplicate rule first would tell the visitor the wrong thing about an empty field.
    expect(newLocationBlock(input({ locationName: '  ', existingNames: [''] }))).toBe('nameRequired')
  })

  describe('requireAddress (the new-address-copy variant)', () => {
    it('is off by default — a blank street submits, matching the ordinary Add Location flow', () => {
      expect(newLocationBlock(input({ streetAddress: '' }))).toBeNull()
    })

    it('blocks a blank street when on', () => {
      expect(newLocationBlock(input({ streetAddress: '', requireAddress: true }))).toBe('addressRequired')
    })

    it('blocks a whitespace-only street when on', () => {
      expect(newLocationBlock(input({ streetAddress: '  \t ', requireAddress: true }))).toBe('addressRequired')
    })

    it('passes once a street address is entered', () => {
      expect(newLocationBlock(input({ streetAddress: '1450 Eglinton Ave W', requireAddress: true }))).toBeNull()
    })

    it('still reports the name rules first — a copy with no name AND no address says nameRequired', () => {
      expect(newLocationBlock(input({ locationName: '', streetAddress: '', requireAddress: true }))).toBe('nameRequired')
      expect(
        newLocationBlock(input({ locationName: 'Rear Door', existingNames: ['Rear Door'], streetAddress: '', requireAddress: true })),
      ).toBe('duplicateName')
    })
  })

  it('carries the phone\'s copy verbatim for every block', () => {
    expect(NEW_LOCATION_BLOCK_MESSAGES).toEqual({
      nameRequired: 'Location name is required',
      duplicateName: 'A location with this name already exists in this case',
      addressRequired: 'Street address is required',
    })
    // Every member of the union has a message — a fourth rule cannot ship messageless.
    for (const block of NEW_LOCATION_BLOCKS) {
      expect(NEW_LOCATION_BLOCK_MESSAGES[block]).toBeTruthy()
    }
  })
})
