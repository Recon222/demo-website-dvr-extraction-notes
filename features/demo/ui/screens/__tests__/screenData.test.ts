import { describe, it, expect } from 'vitest'
import { toCaseCards, toCaseSheet, caseStatusTheme, locationStatusTheme } from '@/features/demo/ui/screens/screenData'
import { MAP_PIN_COLORS, STATUS_LABEL } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { STATUS_ACCENT, STATUS_SEVERITY, neutralTone, severityTone } from '@/features/demo/ui/tokens/status'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoCase, DemoLocation, LocationForm } from '@/features/demo/engine/types'
import { demoCase, demoLocation } from '@/features/demo/engine/store/__tests__/test-utils'

const aCase = (over: Partial<DemoCase> = {}): DemoCase => demoCase({ displayName: 'Case One', createdLabel: 'Mar 9, 2025', ...over })

const aLoc = (over: Partial<DemoLocation> = {}): DemoLocation => demoLocation(over)

describe('toCaseCards', () => {
  it('maps personnel, status theme, and location rows', () => {
    const [card] = toCaseCards([aCase()], [aLoc()])
    expect(card.caseNumber).toBe('PR25-0001')
    // Phone `CaseStatusBadge.tsx:142-144`: DRAFT DISPLAYS AS "Active"; the enum rename is
    // deferred there, and the demo has no enum to rename.
    expect(card.status.label).toBe('Active')
    expect(card.personnel[0]).toMatchObject({ role: 'OIC', name: 'L. McHugh', badge: '4471' })
    expect(card.locationCountLabel).toBe('1 location')
    expect(card.locations[0]).toMatchObject({ locationName: "Kim's Convenience", address: '1450 Eglinton Ave W, Mississauga' })
  })

  it('pluralises the location count and only attaches a case\'s own locations', () => {
    const cards = toCaseCards([aCase()], [aLoc(), aLoc({ id: 'l2', caseId: 'other' })])
    expect(cards[0].locationCountLabel).toBe('1 location')
    const [card] = toCaseCards([aCase({ locationIds: ['l1', 'l2'] })], [aLoc(), aLoc({ id: 'l2' })])
    expect(card.locationCountLabel).toBe('2 locations')
  })

  it('routes every case status through the ONE severity recipe, archived through the neutral', () => {
    // Phone `getStatusConfig` (`CaseStatusBadge.tsx:140-167`). Read off the recipe, never
    // re-typed: a literal `'#0f6b42'` here would stay green through a re-point of
    // `successLight` and through a wiring swap of fill against foreground, which are the two
    // edits this pin exists to catch.
    expect(caseStatusTheme('complete')).toEqual({ label: 'Complete', ...severityTone('success') })
    expect(caseStatusTheme('draft')).toEqual({ label: 'Active', ...severityTone('warning') })
    // ARCHIVED is the ABSENCE of a severity, not a fifth one — the phone's `neutralConfig`.
    expect(caseStatusTheme('archived')).toEqual({ label: 'Archived', ...neutralTone() })
    expect(caseStatusTheme('archived').background).not.toBe(severityTone('info').background)
  })
})

// The Case Actions Sheet's read-only report (P3.2, matrix row 9) — phone
// CaseActionsSheet.tsx:136-233.
describe('toCaseSheet', () => {
  const rowsOf = (sheet: ReturnType<typeof toCaseSheet>, groupId: string) =>
    sheet.groups.find((g) => g.id === groupId)?.rows ?? []

  it('renders every nameWithBadge arm: both parts, name only, badge only, neither', () => {
    const both = toCaseSheet(aCase({ vcName: 'A. Okafor', vcBadge: '8812' }), [])
    expect(rowsOf(both, 'personnel')).toContainEqual({ label: 'Video Coordinator', value: 'A. Okafor · #8812' })

    const nameOnly = toCaseSheet(aCase({ oicBadge: '' }), [])
    expect(rowsOf(nameOnly, 'personnel')).toContainEqual({ label: 'Officer in Charge', value: 'L. McHugh' })

    const badgeOnly = toCaseSheet(aCase({ oicName: '' }), [])
    expect(rowsOf(badgeOnly, 'personnel')).toContainEqual({ label: 'Officer in Charge', value: '#4471' })

    const neither = toCaseSheet(aCase({ oicName: '', oicBadge: '' }), [])
    expect(rowsOf(neither, 'personnel').map((r) => r.label)).toEqual(['Unit'])
  })

  it('drops the personnel group entirely when OIC, VC and Unit are all empty', () => {
    const sheet = toCaseSheet(aCase({ oicName: '', oicBadge: '', unit: '' }), [])
    expect(sheet.groups.map((g) => g.id)).toEqual(['meta'])
  })

  it('counts only the case\'s own locations', () => {
    const sheet = toCaseSheet(aCase(), [aLoc(), aLoc({ id: 'l2' }), aLoc({ id: 'l3', caseId: 'other' })])
    expect(rowsOf(sheet, 'meta')).toContainEqual({ label: 'Locations', value: '2' })
  })

  it('passes the stored createdLabel through unparsed (the demo has no case-creation clock)', () => {
    const sheet = toCaseSheet(aCase({ createdLabel: 'Mar 9, 2025' }), [])
    expect(rowsOf(sheet, 'meta')).toContainEqual({ label: 'Created', value: 'Mar 9, 2025' })
  })

  it('blanks a display name that only repeats the case number', () => {
    expect(toCaseSheet(aCase({ displayName: 'PR25-0001' }), []).displayName).toBe('')
    expect(toCaseSheet(aCase({ displayName: '   ' }), []).displayName).toBe('')
    expect(toCaseSheet(aCase({ displayName: 'Case One' }), []).displayName).toBe('Case One')
  })

  it('marks the coordinate row monospace and gates it on a captured position', () => {
    const real = toCaseSheet(aCase({ incidentCoordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' } }), [])
    expect(rowsOf(real, 'incident')).toContainEqual({ label: 'Coordinates', value: '43.608700, -79.650500', mono: true })

    const nullIsland = toCaseSheet(aCase({ incidentCoordinates: { lat: 0, lng: 0, source: 'manual' } }), [])
    expect(nullIsland.groups.some((g) => g.id === 'incident')).toBe(false)
  })

  it('carries notes as a free-text body, not a label/value row', () => {
    const sheet = toCaseSheet(aCase({ notes: 'Suspect fled east.' }), [])
    const notes = sheet.groups.find((g) => g.id === 'notes')
    expect(notes).toMatchObject({ title: 'Notes', rows: [], body: 'Suspect fled east.' })
  })

  it('carries the raw status plus the phone\'s status label', () => {
    expect(toCaseSheet(aCase({ status: 'draft' }), [])).toMatchObject({ status: 'draft', statusLabel: 'Active' })
    expect(toCaseSheet(aCase({ status: 'complete' }), [])).toMatchObject({ status: 'complete', statusLabel: 'complete' })
  })
})

describe('truthful location-row status (G3)', () => {
  // A truly untouched location has no submission fields at all — the aLoc() fixture's
  // street/city already count toward the submission screen, i.e. 'working'.
  const untouched = (over: Partial<DemoLocation> = {}) => aLoc({ streetAddress: '', city: '', ...over })

  it('an untouched location reads Started — never a hardcoded Draft', () => {
    const [card] = toCaseCards([aCase()], [untouched()])
    expect(card.locations[0].status.label).toBe('Started')
    expect(card.locations[0].status).toMatchObject(severityTone(STATUS_SEVERITY.started))
  })

  it('a partially-filled form reads Working', () => {
    const [card] = toCaseCards([aCase()], [aLoc({ requesterName: 'L. McHugh' })])
    expect(card.locations[0].status.label).toBe('Working')
    expect(card.locations[0].status).toMatchObject(severityTone(STATUS_SEVERITY.working))
  })

  it('per-location: each row derives its own status independently', () => {
    const cards = toCaseCards(
      [aCase({ locationIds: ['l1', 'l2'] })],
      [untouched(), untouched({ id: 'l2', requesterName: 'A. Okafor' })],
    )
    expect(cards[0].locations.map((l) => l.status.label)).toEqual(['Started', 'Working'])
  })

  /**
   * A70, and the pin that used to assert the OPPOSITE.
   *
   * It read `locationStatusTheme(status).color === MAP_PIN_COLORS[status]` — "don't retheme one
   * without the other". That coupling is exactly what the phone broke and why: `PIN_COLORS`
   * paints marks ONTO satellite tiles and is deliberately theme-invariant, while a badge inside
   * a theme-aware surface is not on a tile. Routing the badge through the pin palette measured
   * `started` at 1.26:1 (phone `status-severity.ts:37-52`).
   *
   * So the contract inverts: the pin colours must NOT move, the sheet colours must route through
   * `STATUS_SEVERITY`, and the two must now be DIFFERENT. The labels stay shared — one status
   * vocabulary, two palettes.
   */
  it('splits the badge palette from the map-pin palette, and keeps the pin values frozen', () => {
    expect(MAP_PIN_COLORS).toEqual({
      started: '#FF9500',
      working: '#00BFFF',
      complete: '#34C759',
      incident: '#e53935',
    })

    for (const status of ['started', 'working', 'complete'] as const) {
      const theme = locationStatusTheme(status)
      expect(theme.label).toBe(STATUS_LABEL[status])
      expect(theme).toMatchObject(severityTone(STATUS_SEVERITY[status]))
      // The split itself: neither the badge's fill nor its bare-mark accent is the pin colour.
      expect(theme.background).not.toBe(MAP_PIN_COLORS[status])
      expect(theme.accent).not.toBe(MAP_PIN_COLORS[status])
      // ...and the accent is the token `STATUS_ACCENT` names, not the severity's own hex.
      expect(theme.accent).toBe(colors[STATUS_ACCENT[status]])
    }
  })

  it('a fully-complete form reads Complete (green end to end)', () => {
    // Fill every counted field on every wizard screen (mirrors selectDrawerStatus's field map).
    const form: LocationForm = {
      ...blankLocationForm(),
      scopes: [{ id: 's1', startDateTime: '2025-03-08 23:45:00', endDateTime: '2025-03-09 01:30:00', isActualTime: true, cameras: '3' }],
      extractedScopes: [{ id: 'es1', startDateTime: '2025-03-08 23:50:00', endDateTime: '2025-03-09 01:40:00', isActualTime: false, cameras: '3' }],
      arrivalDepartures: [{ id: 'a1', arrival: '2025-03-09 09:00', departure: '2025-03-09 11:00' }],
      timeOffset: {
        dvrDateTime: '2025-03-08 12:05:30',
        actualDateTime: '2025-03-08 12:00:00',
        differenceMs: 330000,
        formattedDifference: '00:05:30',
        direction: 'AHEAD OF',
        isDvrAhead: true,
        isCorrect: false,
        dvrAppliesDST: false,
        sync: null,
        captureMethod: 'manual',
      },
      dvr: {
        dvrLocation: 'Back office',
        dvrTypeBrand: 'Hikvision',
        serialModelNumber: '',
        dvrUsername: 'admin',
        dvrPassword: 'x',
        numberOfChannels: '8',
        activeCameras: '6',
        recordingSchedule: 'Continuous',
        resolution: '1080p',
        recordingFps: '15',
        firstRecordedDate: '2025-02-20 00:00',
        totalDvrRetention: '17 days',
      },
      cameras: [{ id: 'c1', cameraName: 'Front door', resolution: '1080p', recordingFps: '15' }],
      export: { exportMedia: 'USB', fileType: '.mp4', sizeGb: '2', mediaPlayerIncluded: false, mediaProvidedVia: 'USB' },
      notesFreeText: 'Notes',
      dateTimeCompleted: '2025-03-09 12:00',
      completedBy: 'Det. McHugh',
    }
    const loc = aLoc({
      requesterName: 'L. McHugh',
      requesterBadge: '4471',
      requesterPhone: '905-555-0000',
      requesterEmail: 'lm@peel.ca',
      businessName: "Kim's Convenience",
      locationContact: 'S. Gill',
      locationPhone: '905-555-0001',
      form,
    })
    const [card] = toCaseCards([aCase()], [loc])
    expect(card.locations[0].status.label).toBe('Complete')
    expect(card.locations[0].status).toMatchObject(severityTone(STATUS_SEVERITY.complete))
  })
})
