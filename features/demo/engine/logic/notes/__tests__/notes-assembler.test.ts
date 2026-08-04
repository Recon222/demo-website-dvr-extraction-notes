import { describe, it, expect } from 'vitest'
import { assembleNotesString } from '@/features/demo/engine/logic/notes/notes-assembler'
import type { NoteSection, NoteSectionId } from '@/features/demo/engine/types'
import { mockSection } from './test-utils'

// Behavior contract ported from the phone: notes/services/notes-assembler.ts
// (+ phone-inventory §12 "Flat assembly" steps 1–5).
describe('assembleNotesString', () => {
  it('joins non-empty section blocks with a blank line, in canonical registry order regardless of input order', () => {
    const sections = [
      mockSection('export', { content: '• export line' }),
      mockSection('address', { content: '• address line' }),
      mockSection('timeOffset', { content: '• offset line' }),
    ]
    expect(assembleNotesString(sections, '')).toBe(
      '• address line\n\n• offset line\n\n• export line',
    )
  })

  it('drops empty blocks entirely — no stray newlines', () => {
    const sections = [
      mockSection('address', { content: '• address line' }),
      mockSection('scopes', { content: '' }),
      mockSection('retention', { content: '• retention line' }),
    ]
    expect(assembleNotesString(sections, '')).toBe('• address line\n\n• retention line')
  })

  it('an addendum sits on its own line INSIDE its section block', () => {
    const sections = [
      mockSection('address', { content: '• address line', userAddendum: 'manager was present' }),
      mockSection('retention', { content: '• retention line' }),
    ]
    expect(assembleNotesString(sections, '')).toBe(
      '• address line\nmanager was present\n\n• retention line',
    )
  })

  it('a deleted section carrying an addendum renders the addendum alone', () => {
    const sections = [
      mockSection('address', { content: '', userAddendum: 'kept annotation', manuallyEdited: true }),
    ]
    expect(assembleNotesString(sections, '')).toBe('kept annotation')
  })

  it('free text is always last, blank-line separated; alone it stands by itself', () => {
    const sections = [mockSection('address', { content: '• address line' })]
    expect(assembleNotesString(sections, 'extra observations')).toBe(
      '• address line\n\nextra observations',
    )
    expect(assembleNotesString([], 'only free text')).toBe('only free text')
    expect(assembleNotesString([], '')).toBe('')
  })

  it('unknown section ids sort after known ones (defensive)', () => {
    const ghost: NoteSection = {
      id: 'ghost' as NoteSectionId,
      content: '• ghost line',
      generatedContent: '• ghost line',
      manuallyEdited: false,
    }
    const sections = [ghost, mockSection('timeOnScene', { content: '• last real section' })]
    expect(assembleNotesString(sections, '')).toBe('• last real section\n\n• ghost line')
  })

  it('does not mutate the input array (sorts a copy)', () => {
    const sections = [
      mockSection('export', { content: 'b' }),
      mockSection('address', { content: 'a' }),
    ]
    const before = [...sections]
    assembleNotesString(sections, '')
    expect(sections).toEqual(before)
  })
})
