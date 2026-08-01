import { describe, it, expect } from 'vitest'
import {
  describeCaseMapTerminal,
  describeExportTerminal,
  EXPORT_DOWNLOAD_TITLE,
  type SimulatedExportRun,
} from '@/features/demo/ui/screens/exportNotices'
import { EXPORT_TYPES } from '@/features/demo/engine/logic/export'
import type { CaseMapCoverage } from '@/features/demo/engine/logic/case-map'

/**
 * P5.3 / decision D4 / deferred §70k — the honest terminal notice every export pipeline ends in.
 *
 * These are the demo's answer to two verbatim phone strings that describe an archive the
 * browser cannot write. If they ever soften into "Export Complete", §70k's failure mode is back.
 */

/** Every SIMULATED run — `case-map` is deliberately absent: it is real now, and the type no
 *  longer admits it here (review R-14). */
const RUNS: Record<SimulatedExportRun['type'], SimulatedExportRun> = {
  case: { type: 'case', caseId: 'c1' },
  'case-subset': { type: 'case-subset', caseId: 'c1', locationIds: ['l1', 'l2'] },
  location: { type: 'location', locationId: 'l1' },
  'location-geojson': { type: 'location-geojson', locationId: 'l1' },
}

/** The simulated members of the engine's union — the set this file's terminal answers for. */
const SIMULATED_TYPES = EXPORT_TYPES.filter((t) => t !== 'case-map') as SimulatedExportRun['type'][]

const coverage = (over: Partial<CaseMapCoverage> = {}): CaseMapCoverage => ({
  totalLocations: 2,
  plottedLocations: 2,
  droppedLocationNames: [],
  hasPlottedLocations: true,
  ...over,
})

describe('describeExportTerminal — every pipeline is covered', () => {
  it('answers for each member of the flow machine s ExportType union', () => {
    // Keyed off the engine's own tuple (minus the real one), so a new export type fails here
    // rather than reaching the bridge with no terminal treatment.
    for (const type of SIMULATED_TYPES) {
      const notice = describeExportTerminal(RUNS[type])
      expect(notice.title).toBe(EXPORT_DOWNLOAD_TITLE)
      expect(notice.message.length).toBeGreaterThan(0)
    }
  })

  it('never claims the export succeeded', () => {
    for (const type of SIMULATED_TYPES) {
      const { title, message } = describeExportTerminal(RUNS[type])
      expect(`${title}\n${message}`).not.toMatch(/export complete|downloaded|saved to|shared successfully/i)
    }
  })
})

describe('describeExportTerminal — the artifact claim is completed, not retracted', () => {
  it('a whole-case run names the case map the artifact line promises', () => {
    // `resolveExportPlan` renders CASE ZIP · CANONICAL · INCLUDES CASE MAP; this is what
    // answers it (§70k).
    const { message } = describeExportTerminal(RUNS.case)
    expect(message).toContain('a ZIP of the whole case')
    expect(message).toContain('plus the interactive case map')
  })

  it('a subset run counts the locations it was actually given', () => {
    expect(describeExportTerminal(RUNS['case-subset']).message).toContain('the 2 selected locations')
    expect(
      describeExportTerminal({ type: 'case-subset', caseId: 'c1', locationIds: ['l1'] }).message,
    ).toContain('the 1 selected location')
  })

  it('a single-location run promises only that location', () => {
    const { message } = describeExportTerminal(RUNS.location)
    expect(message).toContain('a ZIP of this location')
    expect(message).not.toContain('whole case')
  })

  it('a GeoJSON run names the GeoJSON, not a ZIP', () => {
    const { message } = describeExportTerminal(RUNS['location-geojson'])
    expect(message).toContain('canonical GeoJSON')
    expect(message).not.toContain('a ZIP of')
  })
})

describe('describeExportTerminal — the honest body', () => {
  it('says why there is no file and where the real documents are', () => {
    const { message } = describeExportTerminal(RUNS.case)
    expect(message).toContain('no file system, no share sheet')
    expect(message).toContain('print or save either one as a PDF')
  })

  it('does NOT repeat the phone’s on-device/never-leaves-the-phone claims', () => {
    for (const type of SIMULATED_TYPES) {
      expect(describeExportTerminal(RUNS[type]).message).not.toMatch(/never leaves|on-device|on this phone/i)
    }
  })

  it('has no case-map arm left to soften — the union excludes it (review R-14)', () => {
    // The interim sentence ("is being built; it just is not wired to this button yet") is gone
    // with the member that carried it: `SimulatedExportRun` cannot express a case-map run, so
    // it cannot be given a false terminal by a future edit.
    expect(SIMULATED_TYPES).not.toContain('case-map')
    // @ts-expect-error `case-map` is not a SimulatedExportRun — the compile-time half of the fix
    expect(() => describeExportTerminal({ type: 'case-map', caseId: 'c1' })).toBeDefined()
  })
})

describe('describeCaseMapTerminal — the one real export (decision D4)', () => {
  it('claims a REQUEST, names the file, and never claims a completed write', () => {
    const { title, message } = describeCaseMapTerminal({
      kind: 'requested',
      filename: 'MapCase-Case-Map.html',
      coverage: coverage(),
      mapIsEmpty: false,
      hasToken: true,
    })
    expect(title).toBe('Case Map Ready')
    expect(message).toContain('Your browser was asked to save MapCase-Case-Map.html.')
    expect(message).toContain('Check your downloads.')
    // R-2: a browser cannot observe whether the file landed, so it must not say that it did.
    expect(message).not.toMatch(/exported successfully|saved to|download complete/i)
    // The artifact claim is completed, not retracted (§70k's rule, applied to a real file).
    expect(message).toContain('self-contained interactive HTML map')
    // Nothing is wrong, so no caveat fires.
    expect(message).not.toContain('not on the map')
    expect(message).not.toContain('empty map')
    expect(message).not.toContain('Mapbox token')
  })

  it('counts the locations left off the map (review R-1)', () => {
    expect(
      describeCaseMapTerminal({
        kind: 'requested',
        filename: 'f.html',
        coverage: coverage({ totalLocations: 3, plottedLocations: 1, droppedLocationNames: ['b', 'c'] }),
        mapIsEmpty: false,
        hasToken: true,
      }).message,
    ).toContain('2 of 3 locations have no coordinates yet and are not on the map.')
  })

  it('uses the louder framing when NO location plots', () => {
    const { message } = describeCaseMapTerminal({
      kind: 'requested',
      filename: 'f.html',
      coverage: coverage({ totalLocations: 2, plottedLocations: 0, droppedLocationNames: ['a', 'b'], hasPlottedLocations: false }),
      mapIsEmpty: false,
      hasToken: true,
    })
    expect(message).toContain('None of its 2 locations have coordinates yet, so none of them are on the map.')
    expect(message).not.toContain('of 2 locations have no coordinates yet and are not')
  })

  it('says the case has no locations at all rather than counting zero of zero', () => {
    expect(
      describeCaseMapTerminal({
        kind: 'requested',
        filename: 'f.html',
        coverage: coverage({ totalLocations: 0, plottedLocations: 0, hasPlottedLocations: false }),
        mapIsEmpty: true,
        hasToken: true,
      }).message,
    ).toContain('This case has no locations yet.')
  })

  it('adds the empty-map and blank-basemap caveats when they are true', () => {
    const { message } = describeCaseMapTerminal({
      kind: 'requested',
      filename: 'f.html',
      coverage: coverage({ totalLocations: 0, plottedLocations: 0, hasPlottedLocations: false }),
      mapIsEmpty: true,
      hasToken: false,
    })
    expect(message).toContain('Nothing plots yet, so it opens with an empty map.')
    expect(message).toContain('Without a Mapbox token its basemap stays blank.')
  })

  it('distinguishes the three failures, and none of them claims a file', () => {
    const builder = describeCaseMapTerminal({ kind: 'builder-unavailable' })
    const unavailable = describeCaseMapTerminal({ kind: 'save-unavailable' })
    const failed = describeCaseMapTerminal({ kind: 'save-failed' })
    for (const notice of [builder, unavailable, failed]) {
      expect(notice.title).toBe('Export Error')
      expect(notice.message).not.toMatch(/asked to save|check your downloads/i)
    }
    expect(builder.message).toContain('could not be loaded')
    expect(unavailable.message).toContain('no way to save a file')
    expect(failed.message).toContain('refused to save it')
    // Distinct causes, distinct sentences — a visitor acts differently on each.
    expect(new Set([builder.message, unavailable.message, failed.message]).size).toBe(3)
  })
})
