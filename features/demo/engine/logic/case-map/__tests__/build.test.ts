import { describe, it, expect } from 'vitest'
import {
  buildCaseMapHtml,
  buildCaseMapMeta,
  caseMapFileName,
  caseMapTitle,
  encodeJsonForScriptTag,
  CASE_MAP_FILENAME,
  CASE_MAP_MIME_TYPE,
} from '@/features/demo/engine/logic/case-map/build'
import { CASE_MAP_TEMPLATE_HTML } from '@/features/demo/engine/logic/case-map/template'
import { buildCaseMapGeoJson } from '@/features/demo/engine/logic/case-map/geojson'
import { demoCase, demoLocation } from '@/features/demo/engine/store/__tests__/test-utils'
import type { CaseMapMeta, GeoJSONFeatureCollection } from '@/features/demo/engine/logic/case-map/types'

const STAMP = '2026-07-31T12:00:00.000Z'
const emptyCollection: GeoJSONFeatureCollection = { type: 'FeatureCollection', features: [] }
const meta = (over: Partial<CaseMapMeta> = {}): CaseMapMeta => ({
  caseNumber: 'PR25-0001',
  displayName: "Kim's — B&E",
  generatedAt: STAMP,
  ...over,
})

/** Read a `<script type="application/json" id="…">` payload back out of a built page —
 *  exactly what the map's own `loadCase()` does (`case-map.app.js:107-110`). */
function readInjectedJson(html: string, id: string): unknown {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))
  if (!match) throw new Error(`no #${id} tag in the built page`)
  return JSON.parse(match[1])
}

describe('the ported template', () => {
  it('carries exactly one of each injection token', () => {
    for (const token of ['__CASE_GEOJSON__', '__CASE_META__', '__CASE_TITLE__', '__MAPBOX_TOKEN__']) {
      expect(CASE_MAP_TEMPLATE_HTML.split(token)).toHaveLength(2)
    }
  })

  it('is self-contained — no relative asset references survive the port', () => {
    // The phone's build script means to drop the dev-only sample-data tag but its strip is
    // line-ending-blind, so the tag ships in every phone export and 404s. The port removes it;
    // this pins that the downloaded file asks the network for nothing but the CDN basemap.
    expect(CASE_MAP_TEMPLATE_HTML).not.toMatch(/<script src="(?!https:\/\/)/)
    expect(CASE_MAP_TEMPLATE_HTML).not.toMatch(/<link[^>]+href="(?!https:\/\/)/)
    expect(CASE_MAP_TEMPLATE_HTML).not.toContain('case-map.data.js"></script>')
  })

  it('contains no committed Mapbox token', () => {
    expect(CASE_MAP_TEMPLATE_HTML).not.toMatch(/var TOKEN = 'pk\./)
  })
})

describe('buildCaseMapMeta', () => {
  it('projects the case header, taking the caller-supplied stamp', () => {
    expect(buildCaseMapMeta(demoCase({ incidentCity: 'Mississauga', vcName: 'A. Vance', vcBadge: '2201' }), STAMP)).toEqual({
      caseNumber: 'PR25-0001',
      displayName: "Kim's — B&E",
      city: 'Mississauga',
      unit: 'Robbery',
      oicName: 'L. McHugh',
      oicBadgeNumber: '4471',
      videoCoordinatorName: 'A. Vance',
      videoCoordinatorBadgeNumber: '2201',
      generatedAt: STAMP,
    })
  })

  it('falls back display name → case number → "Case Map", and omits blank personnel', () => {
    expect(buildCaseMapMeta(demoCase({ displayName: '  ' }), STAMP).displayName).toBe('PR25-0001')
    const bare = buildCaseMapMeta(
      demoCase({ displayName: '', caseNumber: '', unit: '', oicName: '', oicBadge: '', incidentCity: '' }),
      STAMP,
    )
    expect(bare).toEqual({ caseNumber: '', displayName: 'Case Map', generatedAt: STAMP })
  })

  it('survives a null case', () => {
    expect(buildCaseMapMeta(null, STAMP)).toEqual({ caseNumber: '', displayName: 'Case Map', generatedAt: STAMP })
  })
})

describe('encodeJsonForScriptTag', () => {
  it('escapes `<` so a value containing </script> cannot close the tag early', () => {
    const encoded = encodeJsonForScriptTag({ locationName: '</script><script>alert(1)</script>' })
    expect(encoded).not.toContain('</script>')
    // Lossless: it is still JSON, and still parses back to the original string.
    expect(JSON.parse(encoded)).toEqual({ locationName: '</script><script>alert(1)</script>' })
  })
})

describe('buildCaseMapHtml', () => {
  it('injects the collection and the metadata so the map can parse them back', () => {
    const geojson = buildCaseMapGeoJson(
      demoCase({ incidentCoordinates: { lat: 43.7, lng: -79.4, source: 'geocoded' } }),
      [demoLocation({ gps: { lat: 43.6, lng: -79.6, source: 'gps' } })],
    )
    const html = buildCaseMapHtml(geojson, meta(), 'pk.test-token')

    expect(readInjectedJson(html, 'case-geojson')).toEqual(geojson)
    expect(readInjectedJson(html, 'case-meta')).toEqual(meta())
    expect(html).toContain("var TOKEN = 'pk.test-token'")
    expect(html).not.toContain('__CASE_GEOJSON__')
    expect(html).not.toContain('__CASE_META__')
    expect(html).not.toContain('__CASE_TITLE__')
    expect(html).not.toContain('__MAPBOX_TOKEN__')
  })

  it('titles the page with the case, not the prototype sample OCC', () => {
    const html = buildCaseMapHtml(emptyCollection, meta({ caseNumber: 'PR25-0777' }), '')
    expect(html).toContain('<title>Case Map — PR25-0777</title>')
    expect(html).not.toContain('OCC-2026-00417')
  })

  it('escapes the title — a case number is visitor-typed free text', () => {
    const html = buildCaseMapHtml(emptyCollection, meta({ caseNumber: '<img src=x>' }), '')
    expect(html).toContain('<title>Case Map — &lt;img src=x&gt;</title>')
  })

  it('treats `$` sequences in the data as literal text, not replace patterns', () => {
    // `$&` / `$1` / `$$` are String.replace specials; the phone uses function replacers for
    // exactly this reason (case-map-export-service.ts:142-145) and so does this port.
    const geojson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-79.6, 43.6] },
          properties: { featureType: 'location', locationName: "$& $1 $$ $' $`" },
        },
      ],
    }
    const html = buildCaseMapHtml(geojson, meta({ displayName: '$& $1 $$' }), '$&')
    expect(readInjectedJson(html, 'case-geojson')).toEqual(geojson)
    expect((readInjectedJson(html, 'case-meta') as CaseMapMeta).displayName).toBe('$& $1 $$')
    expect(html).toContain("var TOKEN = '$&'")
  })

  it('still exports with no Mapbox token — the data renders, only the basemap is blank', () => {
    const html = buildCaseMapHtml(emptyCollection, meta(), '')
    expect(html).toContain("var TOKEN = ''")
    expect(readInjectedJson(html, 'case-meta')).toEqual(meta())
  })
})

describe('output naming', () => {
  it('names the download after the case, sanitising path characters', () => {
    expect(caseMapFileName(demoCase({ displayName: 'Kim/s: B&E' }))).toBe('Kims B&E-Case-Map.html')
    expect(caseMapFileName(demoCase({ displayName: '   ' }))).toBe('PR25-0001-Case-Map.html')
    expect(caseMapFileName(demoCase({ displayName: '', caseNumber: '' }))).toBe('Case-Case-Map.html')
    expect(caseMapFileName(null)).toBe('Case-Case-Map.html')
  })

  it('keeps the phone constants the ZIP path would need', () => {
    expect(CASE_MAP_FILENAME).toBe('Case Map.html')
    expect(CASE_MAP_MIME_TYPE).toBe('text/html')
  })

  it('falls back to the display name, then the bare label, for the page title', () => {
    expect(caseMapTitle(meta({ caseNumber: '  ' }))).toBe("Case Map — Kim's — B&E")
    expect(caseMapTitle(meta({ caseNumber: '', displayName: '' }))).toBe('Case Map')
  })
})
