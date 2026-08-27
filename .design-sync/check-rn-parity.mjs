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

/** Slice a source file down to one object-literal region. Both markers are plain indexOf. */
function region(text, { after, before } = {}) {
  let out = text
  if (after) {
    const i = text.indexOf(after)
    if (i === -1) throw new Error(`region marker not found: ${after}`)
    out = text.slice(i)
  }
  if (before) {
    const j = out.indexOf(before)
    if (j !== -1) out = out.slice(0, j)
  }
  return out
}

/**
 * The value forms the guard reads, in match order: a quoted literal, a bare number, or a
 * dotted identifier reference. Ordered so `min: 44` is always the number and never an
 * identifier.
 */
const VALUE = `'[^']*'|"[^"]*"|[0-9.]+|[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*`

/**
 * Turn one matched value into a normalized string.
 *
 * A quoted literal or a bare number IS the value. Anything else is an identifier reference,
 * and `resolve` looks its LAST dotted segment up as a field of some region. That is the
 * one-level resolver both sides need, and it is the same six lines for each:
 *
 *   RN   `PrimaryButtonGradient.dark = [Colors.dark.primaryDark, '#17527A']`
 *          -> `primaryDark` inside Colors.ts's `dark: {` region
 *   web  `T.bg = colors.background`  (U0.1 made `T` a re-export)
 *          -> `background` inside palette.ts's `const dark = {` region
 *
 * ONE level, enforced structurally rather than by a counter: `resolve` is a `readField` call
 * that carries no `resolve` of its own, so a reference pointing at another reference throws
 * and becomes a PARSE-FAILED row. An alias chain is precisely the shape that hides drift —
 * the guard says "I could not read this" instead of following it.
 */
function value(raw, resolve) {
  const quoted = raw.match(/^'([^']*)'$/) ?? raw.match(/^"([^"]*)"$/)
  if (quoted) return norm(quoted[1])
  if (/^[0-9.]+$/.test(raw)) return norm(raw)
  if (!resolve) throw new Error(`unresolved reference: ${raw}`)
  return resolve(raw.split('.').pop())
}

/** Pull `key: <value>` from a specific object-literal region of a source file. */
function readField(text, key, opts = {}) {
  const m = region(text, opts).match(new RegExp(`\\b${key}\\s*:\\s*(${VALUE})`))
  if (!m) throw new Error(`field not found: ${key}`)
  return value(m[1], opts.resolve)
}

/**
 * Pull `const NAME = <value>`. The demo's accent stops live as module consts in
 * glass-tokens.ts (P0.5 dedup); `T` only re-exports them as `accentFrom: GLASS.accentFrom`.
 */
function readConst(text, name, opts = {}) {
  const m = region(text, opts).match(new RegExp(`\\b${name}\\s*=\\s*(${VALUE})`))
  if (!m) throw new Error(`const not found: ${name}`)
  return value(m[1], opts.resolve)
}

/** Pull stop `i` (1 or 2) of `<scheme>: [a, b]` — the phone's per-scheme gradient pairs. */
function readStop(text, scheme, i, opts = {}) {
  const m = region(text, opts).match(new RegExp(`\\b${scheme}\\s*:\\s*\\[\\s*(${VALUE})\\s*,\\s*(${VALUE})`))
  if (!m) throw new Error(`gradient stops not found: ${scheme}`)
  return value(m[i], opts.resolve)
}

export function checkParity() {
  const colors = source('RN Colors.ts', join(RN, 'src/constants/Colors.ts'))
  const layout = source('RN Layout.ts', join(RN, 'src/constants/Layout.ts'))
  // U0.1 made `tokens/palette.ts` the demo's palette and turned `inputs/input-theme.ts`'s `T`
  // into a re-export of it. The guard reads the DEFINITION, not the re-export: `T`'s aliases
  // are pinned at RUNTIME by tokens/__tests__/palette.test.ts:144-158, which is a stronger
  // check than parsing source text, and `T` only carries 8 of this stage's 15 keys anyway.
  const paletteSrc = source('web tokens/palette.ts', join(WEB, 'features/demo/ui/tokens/palette.ts'))
  // U0.2's scale seam. `touchFloor` used to read `T.rowH`, a literal that U0.0 deliberately
  // left in place because it was the guard's ONLY resolving anchor at the time.
  const scaleSrc = source('web tokens/scale.ts', join(WEB, 'features/demo/ui/tokens/scale.ts'))
  // Single source for the accent gradient stops; input-theme re-exports them.
  const glass = source('web glass-tokens.ts', join(WEB, 'features/demo/ui/glass-tokens.ts'))

  // RN dark palette only — slice from `dark: {` so we don't read the light `primary`.
  const darkOpts = { after: 'dark: {', before: '} as const' }
  // The demo's matching half. `palette.ts` declares `const dark = { … } as const`.
  const webDarkOpts = { after: 'const dark = {', before: '} as const' }
  // One-level resolver for the RN side. `Colors.dark.primaryDark` -> look `primaryDark` up
  // in the same region. No `resolve` of its own: the chain stops here by construction.
  const rnDark = (name) => readField(colors.text, name, darkOpts)
  // The CTA gradient moved on the phone's P9: `PRIMARY_GRADIENT` in `Button.tsx` became
  // `PrimaryButtonGradient` in `Colors.ts:471`, and its dark stops are now
  // `[Colors.dark.primaryDark, '#17527A']` — one literal and one reference, which is why
  // reading it at all needs the resolver above. `Button.tsx` is no longer read.
  const gradOpts = {
    after: 'export const PrimaryButtonGradient = {',
    before: '} as const',
    resolve: rnDark,
  }

  // Every read is wrapped: the readers throw on a miss, and one miss must never disable the
  // rest of the table.
  const anchors = [
    { label: 'primary',     rn: attempt(colors, (t) => readField(t, 'primary', darkOpts)),       web: attempt(paletteSrc, (t) => readField(t, 'primary', webDarkOpts)) },
    { label: 'background',  rn: attempt(colors, (t) => readField(t, 'background', darkOpts)),    web: attempt(paletteSrc, (t) => readField(t, 'background', webDarkOpts)) },
    { label: 'border',      rn: attempt(colors, (t) => readField(t, 'border', darkOpts)),        web: attempt(paletteSrc, (t) => readField(t, 'border', webDarkOpts)) },
    { label: 'text',        rn: attempt(colors, (t) => readField(t, 'text', darkOpts)),          web: attempt(paletteSrc, (t) => readField(t, 'text', webDarkOpts)) },
    { label: 'textMute',    rn: attempt(colors, (t) => readField(t, 'textSecondary', darkOpts)), web: attempt(paletteSrc, (t) => readField(t, 'textSecondary', webDarkOpts)) },
    { label: 'error',       rn: attempt(colors, (t) => readField(t, 'error', darkOpts)),         web: attempt(paletteSrc, (t) => readField(t, 'error', webDarkOpts)) },
    { label: 'gradientTop', rn: attempt(colors, (t) => readStop(t, 'dark', 1, gradOpts)),        web: attempt(glass, (t) => readConst(t, 'ACCENT_FROM')) },
    { label: 'gradientBot', rn: attempt(colors, (t) => readStop(t, 'dark', 2, gradOpts)),        web: attempt(glass, (t) => readConst(t, 'ACCENT_TO')) },
    { label: 'touchFloor',  rn: attempt(layout, (t) => readField(t, 'min', { after: 'touchTarget: {', before: '}' })), web: attempt(scaleSrc, (t) => readField(t, 'min', { after: 'export const touchTarget = {', before: '}' })) },
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
