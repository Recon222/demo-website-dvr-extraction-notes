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

/**
 * Compare-time normalisation.
 *
 * Whitespace INSIDE function notation is stripped because the two repos spell `rgba()`
 * differently and neither is wrong: the phone writes `rgba(14, 57, 101, 0.85)`, the demo's
 * older literals write `rgba(19,34,54,0.85)`. Without this, every string-valued anchor that
 * is not a bare hex compares unequal forever (U1.1's 24 glass-tier keys are all of that
 * shape, which is why the plan makes this a hard input to that package).
 *
 * DO NOT "fix" the mismatch the other way by re-spacing the demo's literals:
 * `features/demo/ui/__tests__/glass-tokens.test.ts` pins several of them BYTE-EXACTLY, so a
 * format-only edit reddens shape pins for no behaviour change. Normalising here is the
 * sanctioned answer (plan U0.4, defect 5).
 *
 * It cannot mask real drift: it is applied to BOTH sides of every anchor, and every value
 * the guard compares is a colour or a scalar, where whitespace carries no meaning.
 */
export const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, '')

/**
 * The value an anchor takes when its source could not be parsed at all — a renamed
 * constant, a moved file, a restructured object literal.
 *
 * U0.0: this used to be a THROW. One constant the phone renamed (PRIMARY_GRADIENT ->
 * PrimaryButtonGradient) therefore disabled all nine anchors and hid FOUR real drifts for
 * the whole life of the rename. A parse failure is now a per-anchor RESULT, so a broken
 * anchor takes out itself and nothing else. It counts as drift — never as a pass.
 */
export const PARSE_FAILED = 'PARSE-FAILED'
export const isParseFailed = (v) => typeof v === 'string' && v.startsWith(PARSE_FAILED)

/** Read a source file. Unreadable is a per-anchor parse failure, not a crash. */
function source(label, path) {
  try {
    return { label, text: readFileSync(path, 'utf8') }
  } catch (e) {
    return { label, text: '', error: `${label} unreadable: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * Resolve ONE side of ONE anchor. The reason is carried in the value so the report says
 * what broke ("PARSE-FAILED (field not found: bg)"), not merely that something did.
 */
function attempt(src, read) {
  try {
    if (src.error) throw new Error(src.error)
    return read(src.text)
  } catch (e) {
    return `${PARSE_FAILED} (${e instanceof Error ? e.message : String(e)})`
  }
}

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
  const colors = source('RN Colors.ts', join(RN, 'src/constants/Colors.ts'))
  const layout = source('RN Layout.ts', join(RN, 'src/constants/Layout.ts'))
  const button = source('RN Button.tsx', join(RN, 'src/components/common/Button.tsx'))
  const theme = source('web input-theme.ts', join(WEB, 'features/demo/ui/inputs/input-theme.ts'))
  // Single source for the accent gradient stops; input-theme re-exports them.
  const glass = source('web glass-tokens.ts', join(WEB, 'features/demo/ui/glass-tokens.ts'))

  // RN dark palette only — slice from `dark: {` so we don't read the light `primary`.
  const darkOpts = { after: 'dark: {', before: '} as const' }
  // Button PRIMARY_GRADIENT.dark colors: ['#35A0D6', '#2580AD'].
  // Stale on the phone since its P9 (renamed to PrimaryButtonGradient and moved into
  // Colors.ts) — U0.4 repoints it. Until then these two resolve to PARSE-FAILED, which is
  // the whole point: eight other anchors keep reporting.
  const gradStop = (i) => (text) => {
    const m = text.match(/dark:\s*\{\s*colors:\s*\[\s*'([^']+)'\s*,\s*'([^']+)'/)
    if (!m) throw new Error('Button PRIMARY_GRADIENT.dark not found')
    return norm(m[i])
  }

  // Every read is wrapped: `readField` / `readConst` throw on a miss, and one miss must
  // never disable the rest of the table.
  const anchors = [
    { label: 'primary',     rn: attempt(colors, (t) => readField(t, 'primary', darkOpts)),       web: attempt(theme, (t) => readField(t, 'primary')) },
    { label: 'background',  rn: attempt(colors, (t) => readField(t, 'background', darkOpts)),    web: attempt(theme, (t) => readField(t, 'bg')) },
    { label: 'border',      rn: attempt(colors, (t) => readField(t, 'border', darkOpts)),        web: attempt(theme, (t) => readField(t, 'border')) },
    { label: 'text',        rn: attempt(colors, (t) => readField(t, 'text', darkOpts)),          web: attempt(theme, (t) => readField(t, 'text')) },
    { label: 'textMute',    rn: attempt(colors, (t) => readField(t, 'textSecondary', darkOpts)), web: attempt(theme, (t) => readField(t, 'textMute')) },
    { label: 'error',       rn: attempt(colors, (t) => readField(t, 'error', darkOpts)),         web: attempt(theme, (t) => readField(t, 'error')) },
    { label: 'gradientTop', rn: attempt(button, gradStop(1)),                                    web: attempt(glass, (t) => readConst(t, 'ACCENT_FROM')) },
    { label: 'gradientBot', rn: attempt(button, gradStop(2)),                                    web: attempt(glass, (t) => readConst(t, 'ACCENT_TO')) },
    { label: 'touchFloor',  rn: attempt(layout, (t) => readField(t, 'min', { after: 'touchTarget: {', before: '}' })), web: attempt(theme, (t) => readField(t, 'rowH')) },
  ]

  const parseFailed = anchors.filter((a) => isParseFailed(a.rn) || isParseFailed(a.web))
  // A parse failure is drift even when both sides fail identically — an anchor that cannot
  // be read has not been proven equal.
  const drift = anchors.filter((a) => a.rn !== a.web || isParseFailed(a.rn))
  return { anchors, drift, parseFailed }
}

const statusOf = (a) => (isParseFailed(a.rn) || isParseFailed(a.web) ? 'PARSE-FAILED' : a.rn === a.web ? 'OK' : 'DRIFT')

// Run standalone (only when invoked directly, never on import — argv[1] may be undefined).
const invokedDirectly = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  if (!rnAvailable()) {
    console.log(`skip: RN repo not found at ${RN}`)
    process.exit(0)
  }
  const { anchors, drift, parseFailed } = checkParity()
  for (const a of anchors) console.log(`  ${statusOf(a).padEnd(12)}  ${a.label.padEnd(12)} RN=${a.rn}  web=${a.web}`)
  if (parseFailed.length) {
    console.error(`\n✗ ${parseFailed.length} anchor(s) could not be parsed on one side — the guard is BLIND there:`)
    for (const p of parseFailed) console.error(`  ${p.label}: RN=${p.rn}  web=${p.web}`)
    console.error('A moved or renamed constant. Repoint the reader in .design-sync/check-rn-parity.mjs.')
  }
  if (drift.length) {
    console.error(`\n✗ ${drift.length} token(s) drifted between the RN app and the web demo:`)
    for (const d of drift) console.error(`  ${d.label}: RN Colors.dark = ${d.rn}, web T = ${d.web}`)
    console.error('\nUpdate features/demo/ui/inputs/input-theme.ts (and the screens that hardcode the hex) to match, or vice-versa.')
    process.exit(1)
  }
  console.log(`\n✓ all ${anchors.length} shared anchors match between the RN app and the web demo`)
}
