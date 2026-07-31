import { describe, it, expect } from 'vitest'
import { SECTION_DEFINITIONS, sectionLabel } from '@/features/demo/engine/logic/notes/section-registry'
import { NOTE_SECTION_IDS } from '@/features/demo/engine/types'
import { mockFormData } from './test-utils'

// Phone parity: notes/services/section-registry.ts:28-78 — identity, ORDER, labels.
describe('SECTION_DEFINITIONS', () => {
  it('has exactly the seven sections, in the phone display order', () => {
    expect(SECTION_DEFINITIONS.map(d => d.id)).toEqual([
      'address',
      'timeOffset',
      'scopes',
      'retention',
      'cameras',
      'export',
      'timeOnScene',
    ])
  })

  it('covers the NoteSectionId tuple exactly (one definition per union member)', () => {
    expect([...SECTION_DEFINITIONS.map(d => d.id)].sort()).toEqual([...NOTE_SECTION_IDS].sort())
  })

  it('carries the phone labels verbatim', () => {
    expect(SECTION_DEFINITIONS.map(d => d.label)).toEqual([
      'address & visits',
      'time offset',
      'recovered footage',
      'dvr retention',
      'cameras',
      'export',
      'time on scene',
    ])
  })

  it('the cameras formatter is DISCONNECTED — always "" even with populated cameras (PR-86)', () => {
    // Widen to SectionDefinition: the registry literal narrows cameras' formatter to
    // its 0-arg `(): string` shape; the registry CONTRACT is the 1-arg signature.
    const cameras: { formatter(fd: ReturnType<typeof mockFormData>): string } | undefined =
      SECTION_DEFINITIONS.find(d => d.id === 'cameras')
    const fd = mockFormData({
      cameras: [{ cameraName: 'Till', resolution: '1080p', recordingFps: '15' }],
    })
    expect(cameras?.formatter(fd)).toBe('')
  })

  it('every other formatter produces content for the fully-populated fixture', () => {
    for (const def of SECTION_DEFINITIONS) {
      if (def.id === 'cameras') continue
      expect(def.formatter(mockFormData()), `section ${def.id}`).not.toBe('')
    }
  })
})

describe('sectionLabel', () => {
  it('resolves registry labels', () => {
    expect(sectionLabel('scopes')).toBe('recovered footage')
    expect(sectionLabel('timeOnScene')).toBe('time on scene')
  })
})
