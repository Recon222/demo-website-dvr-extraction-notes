#!/usr/bin/env node
/**
 * port-case-map-template.mjs
 *
 * Re-ports the phone app's single-file Case Map template into the demo engine as
 * `features/demo/engine/logic/case-map/template.ts`.
 *
 * The phone owns the map: you edit it in the phone repo's
 * `src/features/case-management/case-map-export/prototype/`, regenerate its own
 * `template/case-map.template.html` with that repo's `scripts/build-template.mjs`,
 * then run THIS script to bring the result across. The demo never edits the map's
 * HTML/CSS/JS — a divergence would fork the artifact the phone is the source of
 * truth for.
 *
 * Usage (from the repo root):
 *   node tools/port-case-map-template.mjs
 *   PHONE_REPO=/path/to/DVR-Extraction-Notes-ReactNative node tools/port-case-map-template.mjs
 *
 * Two DELIBERATE deltas are applied on the way across, both documented in
 * docs/code-reviews/deferred.md §71 and both back-port candidates for the phone:
 *
 *   1. The dev-only `<script src="assets/case-map.data.js">` tag is removed. The
 *      phone's build script means to strip it (build-template.mjs:73) but the
 *      `.split('…</script>\n')` key does not match the prototype's CRLF line
 *      endings, so it survives into the shipped template — every exported map
 *      404s on a sibling `assets/` dir that is not in the ZIP. In a browser
 *      download that 404 is in the visitor's console.
 *   2. The `<title>` is tokenized to `__CASE_TITLE__`. The prototype's hard-coded
 *      `Case Map — OCC-2026-00417` is a SAMPLE case number, and it currently ships
 *      in the tab title of every exported map regardless of whose case it is. The
 *      demo refuses to hand a visitor a file labelled with someone else's OCC.
 *
 * Everything else — markup, CSS, app JS, the three injection tokens — crosses
 * byte-for-byte, CRLF included.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const PHONE = process.env.PHONE_REPO
  ? resolve(process.env.PHONE_REPO)
  : resolve(REPO, '..', 'DVR-Extraction-Notes-ReactNative')

const SRC = join(
  PHONE,
  'src/features/case-management/case-map-export/template/case-map.template.html',
)
const OUT_DIR = join(REPO, 'features/demo/engine/logic/case-map')
const OUT = join(OUT_DIR, 'template.ts')

/** The phone's three injection tokens — the contract `buildCaseMapHtml` fills. */
const PHONE_TOKENS = ['__CASE_GEOJSON__', '__CASE_META__', '__MAPBOX_TOKEN__']
/** The demo's fourth (delta 2). */
const TITLE_TOKEN = '__CASE_TITLE__'

/** Dev-only sample-data tag (delta 1). Matched CRLF-tolerantly, unlike the phone's strip. */
const SAMPLE_DATA_TAG = /[ \t]*<script src="assets\/case-map\.data\.js"><\/script>\r?\n/g

async function main() {
  let html = await readFile(SRC, 'utf8')

  for (const token of PHONE_TOKENS) {
    if (!html.includes(token)) {
      throw new Error(`port-case-map-template: phone token missing from source → ${token}`)
    }
  }
  if (/var TOKEN = 'pk\./.test(html)) {
    throw new Error('port-case-map-template: a real Mapbox token is present in the phone template')
  }

  // --- delta 1: drop the dev-only sample-data script tag ---------------------
  // Only the TAG goes; the prose mention of the file in the header comment stays (it
  // documents the prototype's standalone fallback and references nothing at runtime).
  const removed = (html.match(SAMPLE_DATA_TAG) ?? []).length
  html = html.replace(SAMPLE_DATA_TAG, '')
  if (/<script src="[^"]*case-map\.data\.js"/.test(html)) {
    throw new Error('port-case-map-template: a case-map.data.js script tag survived the strip')
  }

  // --- delta 2: tokenize the <title> ----------------------------------------
  const titles = html.match(/<title>[^<]*<\/title>/g) ?? []
  if (titles.length !== 1) {
    throw new Error(`port-case-map-template: expected exactly 1 <title>, found ${titles.length}`)
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${TITLE_TOKEN}</title>`)

  for (const token of [...PHONE_TOKENS, TITLE_TOKEN]) {
    const hits = html.split(token).length - 1
    if (hits !== 1) {
      throw new Error(`port-case-map-template: token ${token} appears ${hits}× (must be exactly 1)`)
    }
  }

  const ts =
    `/**\n * template.ts — AUTO-GENERATED. Do not edit by hand.\n` +
    ` *\n` +
    ` * The phone app's single-file Case Map, ported verbatim from\n` +
    ` * DVR-Extraction-Notes-ReactNative/src/features/case-management/case-map-export/\n` +
    ` * template/case-map.template.html, with the two documented deltas described in\n` +
    ` * tools/port-case-map-template.mjs (dev sample-data tag dropped; <title> tokenized).\n` +
    ` *\n` +
    ` * Regenerate with:  node tools/port-case-map-template.mjs\n` +
    ` *\n` +
    ` * ~85 KB. NEVER import this from a module that the /demo First Load graph reaches —\n` +
    ` * it is behind the dynamic import in DemoExperience's export handler for that reason.\n` +
    ` */\n/* eslint-disable */\n` +
    `export const CASE_MAP_TEMPLATE_HTML: string = ${JSON.stringify(html)}\n`

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT, ts, 'utf8')

  console.log(
    `✓ case-map template ported (${Math.round(html.length / 1024)} KB, ` +
      `${removed} sample-data tag(s) dropped) → ${OUT}`,
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
