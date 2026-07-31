import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  freshSectionContent,
  isSectionStale,
  reconcileSections,
} from '@/features/demo/engine/logic/notes/section-reconciler'
import { SECTION_DEFINITIONS } from '@/features/demo/engine/logic/notes/section-registry'
import type { NoteSection, NoteSectionId } from '@/features/demo/engine/types'
import { emptyFormData, mockFormData, mockSection } from './test-utils'

// Behavior contract ported from the phone: notes/services/section-reconciler.ts +
// notes/services/__tests__/section-reconciler.test.ts semantics.

afterEach(() => vi.restoreAllMocks())

describe('freshSectionContent', () => {
  it('runs the registered formatter for the id', () => {
    expect(freshSectionContent('retention', mockFormData())).toBe('• DVR retention period: 30 days')
    expect(freshSectionContent('cameras', mockFormData())).toBe('') // disconnected
  })

  it('throws on an unknown id (programmer error, unreachable with the closed set)', () => {
    expect(() => freshSectionContent('bogus' as NoteSectionId, mockFormData())).toThrow(
      'unknown section id',
    )
  })
})

describe('isSectionStale', () => {
  const fd = mockFormData()

  it('un-edited sections are never stale (they auto-track)', () => {
    const s = mockSection('retention', { content: 'anything', generatedContent: 'anything' })
    expect(isSectionStale(s, fd)).toBe(false)
  })

  it('edited + fresh differs from the frozen baseline → stale', () => {
    const s = mockSection('retention', {
      content: 'my own words',
      generatedContent: '• DVR retention period: 14 days', // baseline from an older generation
      manuallyEdited: true,
    })
    expect(isSectionStale(s, fd)).toBe(true) // fresh is now "30 days"
  })

  it('edited + fresh equals the baseline → not stale', () => {
    const s = mockSection('retention', {
      content: 'my own words',
      generatedContent: '• DVR retention period: 30 days',
      manuallyEdited: true,
    })
    expect(isSectionStale(s, fd)).toBe(false)
  })

  it('LOAD-BEARING: an empty refresh never badges stale (reset must not offer to ERASE authored text)', () => {
    const s = mockSection('retention', {
      content: 'my own words',
      generatedContent: '• DVR retention period: 14 days',
      manuallyEdited: true,
    })
    expect(isSectionStale(s, emptyFormData())).toBe(false) // fresh === ''
    // the permanently-'' cameras section can never go stale
    const cams = mockSection('cameras', { content: 'authored', generatedContent: 'old', manuallyEdited: true })
    expect(isSectionStale(cams, fd)).toBe(false)
  })
})

describe('reconcileSections', () => {
  it('from empty storage: creates one un-edited entry per definition, in registry order, changed=true', () => {
    const { sections, changed } = reconcileSections(mockFormData(), [])
    expect(changed).toBe(true)
    expect(sections.map(s => s.id)).toEqual(SECTION_DEFINITIONS.map(d => d.id))
    for (const s of sections) {
      expect(s.manuallyEdited).toBe(false)
      expect(s.generatedContent).toBe(s.content)
    }
  })

  it('un-edited sections auto-track: content and generatedContent follow fresh output', () => {
    const first = reconcileSections(mockFormData(), []).sections
    const fd2 = mockFormData({ totalDvrRetention: '45' })
    const { sections, changed } = reconcileSections(fd2, first)
    expect(changed).toBe(true)
    expect(sections.find(s => s.id === 'retention')?.content).toBe('• DVR retention period: 45 days')
    expect(sections.find(s => s.id === 'retention')?.generatedContent).toBe('• DVR retention period: 45 days')
  })

  it('REFERENCE PRESERVATION: a clean pass returns every stored section by reference, changed=false', () => {
    const fd = mockFormData()
    const first = reconcileSections(fd, []).sections
    const { sections, changed } = reconcileSections(fd, first)
    expect(changed).toBe(false)
    sections.forEach((s, i) => expect(s).toBe(first[i]))
  })

  it('manually-edited sections are returned UNCHANGED — generatedContent stays the frozen baseline', () => {
    const fd = mockFormData()
    const first = reconcileSections(fd, []).sections
    const edited = first.map(s =>
      s.id === 'retention' ? { ...s, content: 'analyst text', manuallyEdited: true } : s,
    )
    const fd2 = mockFormData({ totalDvrRetention: '45' })
    const { sections } = reconcileSections(fd2, edited)
    const retention = sections.find(s => s.id === 'retention')
    expect(retention).toBe(edited.find(s => s.id === 'retention')) // same reference
    expect(retention?.content).toBe('analyst text')
    expect(retention?.generatedContent).toBe('• DVR retention period: 30 days') // frozen
  })

  it('a user edit survives ANY number of regenerations (the no-clobber guarantee)', () => {
    let stored = reconcileSections(mockFormData(), []).sections
    stored = stored.map(s => (s.id === 'address' ? { ...s, content: 'my account of attendance', manuallyEdited: true } : s))
    for (const retention of ['1', '2', '3']) {
      stored = reconcileSections(mockFormData({ totalDvrRetention: retention }), stored).sections
    }
    expect(stored.find(s => s.id === 'address')?.content).toBe('my account of attendance')
  })

  it('a missing section (e.g. after a registry gain) is created without touching the rest', () => {
    const fd = mockFormData()
    const first = reconcileSections(fd, []).sections
    const withoutExport = first.filter(s => s.id !== 'export')
    const { sections, changed } = reconcileSections(fd, withoutExport)
    expect(changed).toBe(true)
    expect(sections.map(s => s.id)).toEqual(SECTION_DEFINITIONS.map(d => d.id))
    expect(sections.find(s => s.id === 'address')).toBe(first[0]) // untouched by reference
  })

  it('unknown stored ids are dropped AND the drop counts as a change (heals the persisted array)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fd = mockFormData()
    const first = reconcileSections(fd, []).sections
    const withGhost: NoteSection[] = [
      ...first,
      { id: 'ghost' as NoteSectionId, content: 'x', generatedContent: 'x', manuallyEdited: false },
    ]
    const { sections, changed } = reconcileSections(fd, withGhost)
    expect(changed).toBe(true) // gates the caller's store write → the healed array persists
    expect(sections.some(s => (s.id as string) === 'ghost')).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ghost'))
  })

  it('a deleted section (manuallyEdited, content "") stays deleted across reconciles', () => {
    const fd = mockFormData()
    const first = reconcileSections(fd, []).sections
    const deleted = first.map(s => (s.id === 'export' ? { ...s, content: '', manuallyEdited: true } : s))
    const { sections } = reconcileSections(mockFormData({ sizeGb: '99' }), deleted)
    const exportSection = sections.find(s => s.id === 'export')
    expect(exportSection?.content).toBe('')
    expect(exportSection?.manuallyEdited).toBe(true)
  })
})
