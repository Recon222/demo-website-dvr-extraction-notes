// RN <-> Web token drift guard.
//
// The web demo's dark palette mirrors the React Native app's `Colors.dark` (+ the
// Button primary gradient and the 44pt touch floor) BY HAND — `T` in
// features/demo/ui/inputs/input-theme.ts, and the same hexes hardcoded across the
// wizard screens. Nothing enforces that mirror, so a hex change in the RN app silently
// desyncs the two products. This checker pins the shared anchors: it parses the CURRENT
// value from each side and asserts they're equal — so changing Colors.dark.primary in
// the RN repo fails until the web `T.primary` follows (and vice-versa).
//
// It parses values live (no hardcoded expectations), so it never goes stale on a
// legitimate synchronized change — only on drift.
//
// Standalone:  node .design-sync/check-rn-parity.mjs   (exit 1 on drift or mismatch)
// Also imported by features/demo/ui/inputs/__tests__/rn-token-parity.test.ts
//
// NO SHEBANG: this file is imported by a Vitest test, and Vite hoists its CJS import
// shims onto line 1 — which would push `#!` off byte 0 and fail Rolldown's parser.
// Always invoke it through `node`, never as `./check-rn-parity.mjs`.

import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = resolve(HERE, '..')
// Sibling RN repo (monorepo-of-repos layout: both under the same parent).
const RN = resolve(WEB, '..', '..', 'extraction_case_notes_react_native_expo')

export const RN_ROOT = RN
export const rnAvailable = () => existsSync(join(RN, 'src', 'constants', 'Colors.ts'))

// Each anchor: a human label, how to read the RN value, how to read the web value.
// value readers return a normalized string (lowercased hex or bare number).
const norm = (v) => v.trim().toLowerCase()

// Pull `key: '#hex'` (or a number) from a specific object-literal region of a source file.
function readField(text, key, { after, before } = {}) {
  let region = text
  if (after) {
    const i = text.indexOf(after)
    if (i === -1) throw new Error(`region marker not found: ${after}`)
    region = text.slice(i)
  }
  if (before) {
    const j = region.indexOf(before)
    if (j !== -1) region = region.slice(0, j)
  }
  const m = region.match(new RegExp(`\\b${key}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|([0-9.]+))`))
  if (!m) throw new Error(`field not found: ${key}`)
  return norm(m[1] ?? m[2] ?? m[3])
}

// Pull `const NAME = 'value'`. The accent stops live as module consts in glass-tokens.ts
// (P0.5 dedup); input-theme's `T` only re-exports them as `accentFrom: GLASS.accentFrom`,
// which readField cannot see through — it matches literals, not identifier references.
function readConst(text, name) {
  const m = text.match(new RegExp(`\\b${name}\\s*=\\s*(?:'([^']*)'|"([^"]*)")`))
  if (!m) throw new Error(`const not found: ${name}`)
  return norm(m[1] ?? m[2])
}

export function checkParity() {
  const colors = readFileSync(join(RN, 'src/constants/Colors.ts'), 'utf8')
  const layout = readFileSync(join(RN, 'src/constants/Layout.ts'), 'utf8')
  const button = readFileSync(join(RN, 'src/components/common/Button.tsx'), 'utf8')
  const theme = readFileSync(join(WEB, 'features/demo/ui/inputs/input-theme.ts'), 'utf8')
  // Single source for the accent gradient stops; input-theme re-exports them.
  const glass = readFileSync(join(WEB, 'features/demo/ui/glass-tokens.ts'), 'utf8')

  // RN dark palette only — slice from `dark: {` so we don't read the light `primary`.
  const darkOpts = { after: 'dark: {', before: '} as const' }
  // Button PRIMARY_GRADIENT.dark colors: ['#35A0D6', '#2580AD']
  const gradDark = button.match(/dark:\s*\{\s*colors:\s*\[\s*'([^']+)'\s*,\s*'([^']+)'/)
  if (!gradDark) throw new Error('Button PRIMARY_GRADIENT.dark not found')

  const anchors = [
    { label: 'primary',    rn: readField(colors, 'primary', darkOpts),        web: readField(theme, 'primary') },
    { label: 'background',  rn: readField(colors, 'background', darkOpts),     web: readField(theme, 'bg') },
    { label: 'border',      rn: readField(colors, 'border', darkOpts),        web: readField(theme, 'border') },
    { label: 'text',        rn: readField(colors, 'text', darkOpts),          web: readField(theme, 'text') },
    { label: 'textMute',    rn: readField(colors, 'textSecondary', darkOpts), web: readField(theme, 'textMute') },
    { label: 'error',       rn: readField(colors, 'error', darkOpts),         web: readField(theme, 'error') },
    { label: 'gradientTop', rn: norm(gradDark[1]),                            web: readConst(glass, 'ACCENT_FROM') },
    { label: 'gradientBot', rn: norm(gradDark[2]),                            web: readConst(glass, 'ACCENT_TO') },
    { label: 'touchFloor',  rn: readField(layout, 'min', { after: 'touchTarget: {', before: '}' }), web: readField(theme, 'rowH') },
  ]

  const drift = anchors.filter((a) => a.rn !== a.web)
  return { anchors, drift }
}

// Run standalone (only when invoked directly, never on import — argv[1] may be undefined).
const invokedDirectly = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  if (!rnAvailable()) {
    console.log(`skip: RN repo not found at ${RN}`)
    process.exit(0)
  }
  const { anchors, drift } = checkParity()
  for (const a of anchors) console.log(`  ${a.rn === a.web ? 'OK ' : 'DRIFT'}  ${a.label.padEnd(12)} RN=${a.rn}  web=${a.web}`)
  if (drift.length) {
    console.error(`\n✗ ${drift.length} token(s) drifted between the RN app and the web demo:`)
    for (const d of drift) console.error(`  ${d.label}: RN Colors.dark = ${d.rn}, web T = ${d.web}`)
    console.error('\nUpdate features/demo/ui/inputs/input-theme.ts (and the screens that hardcode the hex) to match, or vice-versa.')
    process.exit(1)
  }
  console.log(`\n✓ all ${anchors.length} shared anchors match between the RN app and the web demo`)
}
