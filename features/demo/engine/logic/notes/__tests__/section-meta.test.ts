import { describe, it, expect } from 'vitest'
import { buildNotesSectionMeta } from '@/features/demo/engine/logic/notes/section-meta'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoLocation, NoteSection } from '@/features/demo/engine/types'

function locWith(sections: NoteSection[], formOver: Partial<DemoLocation['form']> = {}): DemoLocation {
  return {
    id: 'l1',
    caseId: 'c1',
    locationName: 'Shop',
    businessName: 'Shop',
    streetAddress: '1 A St',
    city: 'Town',
    requesterName: '',
    requesterBadge: '',
    requesterUnit: '',
    requesterPhone: '',
    requesterEmail: '',
    locationContact: '',
    locationPhone: '',
    form: { ...blankLocationForm(), notesSections: sections, ...formOver },
  }
}

const section = (over: Partial<NoteSection> = {}): NoteSection => ({
  id: 'retention',
  content: '',
  generatedContent: '',
  manuallyEdited: false,
  ...over,
})

describe('buildNotesSectionMeta', () => {
  it('null location → []', () => {
    expect(buildNotesSectionMeta(null)).toEqual([])
  })

  it('maps stored sections with registry labels and live fresh content', () => {
    const loc = locWith(
      [section({ content: '• DVR retention period: 35 days', generatedContent: '• DVR retention period: 35 days' })],
      { dvr: { ...blankLocationForm().dvr, totalDvrRetention: '35 days' } },
    )
    const [meta] = buildNotesSectionMeta(loc)
    expect(meta.label).toBe('dvr retention')
    expect(meta.stale).toBe(false)
    expect(meta.freshContent).toBe('• DVR retention period: 35 days')
  })

  it('flags an edited section stale when the fresh output moved past its frozen baseline', () => {
    const loc = locWith(
      [section({ content: 'authored', generatedContent: '• DVR retention period: 35 days', manuallyEdited: true })],
      { dvr: { ...blankLocationForm().dvr, totalDvrRetention: '40 days' } },
    )
    const [meta] = buildNotesSectionMeta(loc)
    expect(meta.stale).toBe(true)
    expect(meta.freshContent).toBe('• DVR retention period: 40 days') // the "would now read" preview
  })

  it('never flags stale when the fresh output is empty (nothing to offer → no badge)', () => {
    const loc = locWith([
      section({ content: 'authored', generatedContent: '• DVR retention period: 35 days', manuallyEdited: true }),
    ]) // blank form → fresh retention is ''
    expect(buildNotesSectionMeta(loc)[0].stale).toBe(false)
  })
})
