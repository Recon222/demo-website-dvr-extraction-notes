import { describe, it, expect } from 'vitest'
import { buildImportedLocationView } from '@/features/demo/ui/screens/importResultData'
import type { MappedImport } from '@/features/demo/engine/logic/import'

function patch(over: Partial<MappedImport> = {}, impOver: Partial<MappedImport['_import']> = {}): MappedImport {
  return {
    requesterName: 'Det. Liam McHugh',
    requesterBadgeNumber: '4471',
    requesterPhone: '905-555-0199',
    requesterEmail: 'det@peel.ca',
    businessName: "Kim's Convenience",
    streetAddress: '1450 Eglinton Ave W',
    city: 'Mississauga',
    locationContact: 'Sandeep Gill',
    locationPhone: '905-555-0142',
    _import: {
      offenceType: 'Break & enter',
      dvrTypeBrand: 'Hikvision DS-7608',
      totalDvrRetention: '35 days',
      hasVideoMonitor: 'Yes',
      dvrUsername: 'admin',
      dvrPassword: 'Sp1ce2024',
      timeFrames: [{ startDateTime: '2025-03-08 23:45', endDateTime: '2025-03-09 01:30', isActualTime: true, cameras: 'cameras 3, 4 and 7' }],
      ...impOver,
    },
    ...over,
  }
}

const base = { caseNumber: 'PR25-0098213', warnings: [], locId: 'loc1', fieldCount: 15, timeFrameCount: 1 }

describe('buildImportedLocationView', () => {
  it('groups fields into the three sections in order', () => {
    const v = buildImportedLocationView({ patch: patch(), ...base })
    expect(v.sections.map((s) => s.heading)).toEqual(['Requesting Officer', 'Recovery Location', 'DVR Information'])
    expect(v.sections[0].rows[0]).toEqual({ label: 'Name', value: 'Det. Liam McHugh' })
  })

  it('omits empty rows and drops a wholly-empty section', () => {
    const v = buildImportedLocationView({ patch: patch({ requesterPhone: '' }), ...base })
    const officer = v.sections.find((s) => s.heading === 'Requesting Officer')!
    expect(officer.rows.map((r) => r.label)).not.toContain('Phone')

    const allDvrBlank = buildImportedLocationView({
      patch: patch({}, { dvrTypeBrand: '', totalDvrRetention: '', hasVideoMonitor: '', dvrUsername: '', dvrPassword: '' }),
      ...base,
    })
    expect(allDvrBlank.sections.find((s) => s.heading === 'DVR Information')).toBeUndefined()
  })

  it('falls back the title: business → filename → "Imported location"', () => {
    expect(buildImportedLocationView({ patch: patch(), ...base }).title).toBe("Kim's Convenience")
    expect(buildImportedLocationView({ patch: patch({ businessName: '' }), ...base, filename: 'req.pdf' }).title).toBe('req.pdf')
    expect(buildImportedLocationView({ patch: patch({ businessName: '' }), ...base }).title).toBe('Imported location')
  })

  it('maps scopes (canonical range, actual/DVR flag, cameras) with an end fallback', () => {
    const v = buildImportedLocationView({ patch: patch(), ...base })
    expect(v.scopes[0]).toEqual({
      label: 'Scope 1',
      range: '2025-03-08 23:45 → 2025-03-09 01:30',
      isActualTime: true,
      cameras: 'cameras 3, 4 and 7',
    })
    const v2 = buildImportedLocationView({
      patch: patch({}, { timeFrames: [{ startDateTime: '2025-03-08 23:45', endDateTime: '', isActualTime: false, cameras: '' }] }),
      ...base,
    })
    expect(v2.scopes[0].range).toBe('2025-03-08 23:45')
    expect(v2.scopes[0].isActualTime).toBe(false)

    const v3 = buildImportedLocationView({
      patch: patch({}, { timeFrames: [{ startDateTime: '', endDateTime: '', isActualTime: true, cameras: '' }] }),
      ...base,
    })
    expect(v3.scopes[0].range).toBe('—')
  })

  it('carries case number, warnings, counts, and locId', () => {
    const v = buildImportedLocationView({
      patch: patch(),
      caseNumber: 'PR25-X',
      warnings: [{ field: 'badgeNumber', reason: 'Extracted badge "4471"' }],
      locId: 'L',
      fieldCount: 12,
      timeFrameCount: 1,
    })
    expect(v.caseNumber).toBe('PR25-X')
    expect(v.warnings).toHaveLength(1)
    expect(v.fieldCount).toBe(12)
    expect(v.locId).toBe('L')
  })
})
