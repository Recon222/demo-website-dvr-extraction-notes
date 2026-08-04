// cfg.buildCmd — produces cfg.cssEntry at .design-sync/.cache/case-file.css:
// app/css/style.css (Tailwind v4 SOURCE) compiled to plain CSS, with
// case-file-overrides.css appended.
//
// WHY ONE CONCATENATED FILE. The converter copies cssEntry into _ds_bundle.css
// VERBATIM — it does not resolve @imports. A wrapper stylesheet that
// `@import`s the compiled output therefore ships as a dangling stub, and since
// rendered designs only ever receive styles.css's transitive import closure,
// every token and utility silently disappears from every design
// ([CSS_PLACEHOLDER]). So cssEntry must be self-contained, and the two halves
// get concatenated here rather than linked.
//
// WHY NOT THE CLI. `npx @tailwindcss/cli@4` pulls the newest v4 (4.3.3 today)
// while this repo pins tailwindcss 4.0.3 — the synced CSS would then not be the
// CSS the site ships. Pinning the CLI to @4.0.3 instead just fails outright:
//   Error: Missing field `negated` on ScannerOptions.sources
// (its bundled oxide scanner disagrees with that release). So neither CLI is
// usable here.
//
// Instead this drives the repo's OWN compile path: @tailwindcss/postcss at the
// exact version in the lockfile, the same plugin postcss.config.js hands to
// Next. Output therefore matches `next build`'s CSS by construction, needs no
// network, and can't drift when a new Tailwind ships.
//
// Run from the repo root:  node .design-sync/compile-css.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const IN = join(ROOT, 'app/css/style.css')
const OVERRIDES = join(HERE, 'case-file-overrides.css')
const OUT = join(HERE, '.cache/case-file.css')

// Resolve postcss + the tailwind plugin from the REPO's node_modules, not this
// script's — the whole point is to use the versions the repo pins.
const require = createRequire(join(ROOT, 'package.json'))
const postcss = require('postcss')
const tailwind = require('@tailwindcss/postcss')

// Read the manifest as a FILE: @tailwindcss/postcss's `exports` map doesn't
// expose ./package.json, so require()-ing that subpath throws ERR_PACKAGE_PATH_NOT_EXPORTED.
const version = JSON.parse(
  await readFile(join(ROOT, 'node_modules/@tailwindcss/postcss/package.json'), 'utf8'),
).version

const css = await readFile(IN, 'utf8')
// `from` anchors Tailwind v4's automatic source detection and its relative
// @import resolution — it must be the real path of the entry, not a temp file.
const result = await postcss([tailwind()]).process(css, { from: IN, to: OUT })

const overrides = await readFile(OVERRIDES, 'utf8')
const out = `${result.css}\n\n${overrides}`

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, out)

for (const w of result.warnings()) console.error(`  ! ${w.toString()}`)

// Fail loudly rather than shipping a stylesheet with no design system in it:
// a silent token-less cssEntry is exactly the failure this file exists to prevent.
const tokens = (out.match(/--color-[a-z0-9-]+:/g) ?? []).length
if (tokens < 50) throw new Error(`only ${tokens} --color-* tokens in output — Tailwind compile looks wrong`)

// Check the COMPILED half only, and strip comments first: the overrides file
// discusses @theme/@apply in prose, and matching that is a false positive.
const compiledCode = result.css.replace(/\/\*[\s\S]*?\*\//g, '')
if (/@theme\b|@apply\b|@plugin\b/.test(compiledCode)) {
  throw new Error('raw Tailwind directives survived into the compiled output')
}

console.log(
  `@tailwindcss/postcss ${version} + overrides → ${(out.length / 1024).toFixed(1)}kb, ${tokens} --color-* tokens`,
)
