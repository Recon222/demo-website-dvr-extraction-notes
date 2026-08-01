import { describe, it, expect } from 'vitest'
import {
  SETTINGS_CATEGORIES,
  SETTINGS_CATEGORY_IDS,
  SETTINGS_GROUPS,
  SETTINGS_GROUP_IDS,
  SETTINGS_ICON_IDS,
  getSettingsCategory,
  groupedSettingsCategories,
} from '@/features/demo/engine/content/settings-catalog'

/**
 * The Settings catalog (P7.1, matrix rows 81–84 + 87–93 + A1).
 *
 * What is worth pinning here is the stuff a side-by-side parity check would otherwise have to
 * re-derive by eye: the phone's exact row titles, its group split, its declaration ORDER (which
 * is display order on both sides), and the two structural rulings — Developer is absent, and
 * Security carries the padlock.
 */

describe('SETTINGS_CATEGORIES (phone settings-catalog.tsx port)', () => {
  it('lists the phone catalog in declaration order, minus the __DEV__-only Developer row', () => {
    expect(SETTINGS_CATEGORIES.map((c) => c.id)).toEqual([
      'user-profile',
      'appearance',
      'media-capture',
      'location',
      'time-sync',
      'form-customization',
      'security',
      'export-security',
      'cloud-sync',
      'about',
    ])
    // Row 94 stays out (matrix §7 D6). Asserted by ABSENCE of the id AND of any dev badge —
    // the type has no `devOnly`/`badge` member, so this is the runtime half of that decision.
    expect(SETTINGS_CATEGORIES.some((c) => c.id === ('developer' as never))).toBe(false)
  })

  it('carries the phone titles verbatim (note: "Form Fields", not "Form Customization")', () => {
    const titleOf = (id: string) => SETTINGS_CATEGORIES.find((c) => c.id === id)?.title
    expect(titleOf('user-profile')).toBe('User Profile')
    expect(titleOf('appearance')).toBe('Appearance')
    expect(titleOf('media-capture')).toBe('Media Capture')
    expect(titleOf('location')).toBe('Location')
    expect(titleOf('time-sync')).toBe('Time Sync')
    expect(titleOf('form-customization')).toBe('Form Fields')
    expect(titleOf('security')).toBe('Security')
    expect(titleOf('export-security')).toBe('Export Security')
    expect(titleOf('cloud-sync')).toBe('Cloud Sync')
    expect(titleOf('about')).toBe('About')
  })

  it('gates exactly one row behind auth — Security, the phone’s only requiresAuth entry', () => {
    expect(SETTINGS_CATEGORIES.filter((c) => c.requiresAuth).map((c) => c.id)).toEqual(['security'])
  })

  it('keeps the id list, the entries and the icon union in sync', () => {
    expect(SETTINGS_CATEGORIES.map((c) => c.id)).toEqual([...SETTINGS_CATEGORY_IDS])
    const ids = SETTINGS_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const c of SETTINGS_CATEGORIES) {
      expect(SETTINGS_ICON_IDS, `${c.id} draws an unregistered glyph`).toContain(c.icon)
      expect(SETTINGS_GROUP_IDS, `${c.id} sits in an unknown group`).toContain(c.group)
    }
    // Every declared glyph is actually used — an orphan id would be a mapping nobody draws.
    const used = new Set(SETTINGS_CATEGORIES.map((c) => c.icon))
    expect([...SETTINGS_ICON_IDS].filter((i) => !used.has(i))).toEqual([])
  })
})

describe('groupedSettingsCategories', () => {
  it('renders the phone’s four groups, in order, with their verbatim labels', () => {
    expect(SETTINGS_GROUPS.map((g) => g.label)).toEqual([
      'Account',
      'Capture & Time',
      'Data & Security',
      'System',
    ])
    expect(groupedSettingsCategories().map((s) => s.group.id)).toEqual([
      'account',
      'capture',
      'data',
      'system',
    ])
  })

  it('places every category in exactly one group, preserving registry order within it', () => {
    const sections = groupedSettingsCategories()
    expect(sections.map((s) => s.items.map((c) => c.id))).toEqual([
      ['user-profile', 'appearance'],
      ['media-capture', 'location', 'time-sync', 'form-customization'],
      ['security', 'export-security', 'cloud-sync'],
      ['about'],
    ])
    expect(sections.flatMap((s) => s.items).length).toBe(SETTINGS_CATEGORIES.length)
  })

  it('drops empty groups rather than rendering a heading over nothing (phone parity)', () => {
    // Every group is populated today, so the guard is asserted structurally: no section may
    // ever be emitted with zero items.
    for (const section of groupedSettingsCategories()) {
      expect(section.items.length, `group "${section.group.id}" emitted empty`).toBeGreaterThan(0)
    }
  })
})

describe('getSettingsCategory', () => {
  it('resolves a known id and refuses everything else, including null', () => {
    expect(getSettingsCategory('time-sync')?.title).toBe('Time Sync')
    expect(getSettingsCategory(null)).toBeUndefined()
    expect(getSettingsCategory('')).toBeUndefined()
    // The one id that must NOT resolve, because the demo never builds its pane.
    expect(getSettingsCategory('developer')).toBeUndefined()
  })
})
