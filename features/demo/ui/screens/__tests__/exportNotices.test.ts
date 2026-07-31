import { describe, it, expect } from 'vitest'
import {
  describeExportTerminal,
  EXPORT_DOWNLOAD_TITLE,
} from '@/features/demo/ui/screens/exportNotices'
import { EXPORT_TYPES, type ExportRun } from '@/features/demo/engine/logic/export'

/**
 * P5.3 / decision D4 / deferred §70k — the honest terminal notice every export pipeline ends in.
 *
 * These are the demo's answer to two verbatim phone strings that describe an archive the
 * browser cannot write. If they ever soften into "Export Complete", §70k's failure mode is back.
 */

const RUNS: Record<ExportRun['type'], ExportRun> = {
  case: { type: 'case', caseId: 'c1' },
  'case-subset': { type: 'case-subset', caseId: 'c1', locationIds: ['l1', 'l2'] },
  location: { type: 'location', locationId: 'l1' },
  'location-geojson': { type: 'location-geojson', locationId: 'l1' },
  'case-map': { type: 'case-map', caseId: 'c1' },
}

describe('describeExportTerminal — every pipeline is covered', () => {
  it('answers for each member of the flow machine s ExportType union', () => {
    // Keyed off the engine's own tuple, so a new export type fails here rather than reaching
    // the bridge with no terminal treatment.
    for (const type of EXPORT_TYPES) {
      const notice = describeExportTerminal(RUNS[type])
      expect(notice.title).toBe(EXPORT_DOWNLOAD_TITLE)
      expect(notice.message.length).toBeGreaterThan(0)
    }
  })

  it('never claims the export succeeded', () => {
    for (const type of EXPORT_TYPES) {
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
    for (const type of EXPORT_TYPES) {
      expect(describeExportTerminal(RUNS[type]).message).not.toMatch(/never leaves|on-device|on this phone/i)
    }
  })

  it('the case-map interim says the map was NOT generated (P5.4 replaces it)', () => {
    const { message } = describeExportTerminal(RUNS['case-map'])
    expect(message).toContain('self-contained interactive HTML map')
    expect(message).toContain('Nothing was generated.')
    // It is the one artifact D4 says a browser can really produce, so the interim must not
    // claim browsers can't do it.
    expect(message).not.toContain('no file system, no share sheet')
  })
})
