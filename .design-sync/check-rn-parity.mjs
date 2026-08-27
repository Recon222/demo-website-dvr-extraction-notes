// RN <-> Web token drift guard.
//
// The web demo's palette mirrors the React Native app's `Colors` BY HAND (plus the CTA
// gradient and the 44pt touch floor). Nothing enforces that mirror, so a hex change in
// the RN app silently desyncs the two products. This checker pins the shared anchors: it
// parses the CURRENT value from each side and asserts they're equal — so changing
// `Colors.dark.primary` in the RN repo fails until `palette.dark.primary` follows here
// (and vice-versa).
//
// Sides read, as of U0.4:
//   RN   src/constants/Colors.ts        `Colors.light` / `Colors.dark`, `PrimaryButtonGradient`
//        src/constants/Layout.ts        `touchTarget.min`
//   web  features/demo/ui/tokens/palette.ts   the definition, NOT `T`'s re-export
//        features/demo/ui/tokens/scale.ts     `touchTarget.min`
//        features/demo/ui/glass-tokens.ts     `ACCENT_FROM` / `ACCENT_TO`
//
// BOTH scheme halves are pinned (decision D2 as amended by the owner, 2026-08-27). The
// demo renders only `dark`; a light half that quietly diverges is drift the moment
// `palette.ts`'s one-site scheme switch is flipped.
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

/**
 * Slice a source file down to one object-literal region. Every marker is a plain `indexOf`,
 * not a parser — a reordered source file degrades these silently, which is why a marker that
 * misses THROWS (and lands as PARSE-FAILED) rather than falling back to the whole file.
 *
 * `after` may be a LIST of successive markers, each searched from the previous hit. That is
 * how a NESTED literal is addressed, and the phone's glass tiers need three levels:
 * `['export const GlassColors', 'dark: {', 'card: {']`. Two levels is not enough and one is
 * actively wrong — measured at `dd5551ec`:
 *   `'card: {'`      alone -> `GlassColors.LIGHT.card` (:275), because light is declared first
 *   `'dark: {'`      alone -> `Colors.dark` (:128), 200 lines above `GlassColors.dark` (:345)
 *   `'GlassColors'`  alone -> a COMMENT at :25 that happens to name it
 * The first marker must therefore be `'export const GlassColors'`, not `'GlassColors'`.
 */
function region(text, { after, before } = {}) {
  let out = text
  const markers = after == null ? [] : Array.isArray(after) ? after : [after]
  for (const marker of markers) {
    const i = out.indexOf(marker)
    if (i === -1) throw new Error(`region marker not found: ${marker}`)
    out = out.slice(i)
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
function value(raw, follow) {
  const quoted = raw.match(/^'([^']*)'$/) ?? raw.match(/^"([^"]*)"$/)
  if (quoted) return norm(quoted[1])
  if (/^[0-9.]+$/.test(raw)) return norm(raw)
  // (`follow` is `opts.resolve`; named apart from it here only to avoid shadowing the
  //  `resolve` imported from node:path at the top of the file.)
  if (!follow) throw new Error(`unresolved reference: ${raw}`)
  return follow(raw.split('.').pop())
}

/**
 * Pull `key: <value>` from a specific object-literal region of a source file.
 *
 * It reads scalars only. A field whose value is an ARRAY (`gradient: ['…','…']`) matches none
 * of `VALUE`'s alternatives and throws `field not found` — use `readStop` for those.
 */
export function readField(text, key, opts = {}) {
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

/**
 * Pull stop `i` (1 or 2) of a two-element tuple field, `key: [a, b]`.
 *
 * `key` is whatever names the tuple. Two shapes use it today and they are why it is not
 * spelled for either one of them:
 *   `PrimaryButtonGradient` -> `readStop(t, 'dark', 1, …)`      the scheme names the tuple
 *   `GlassColors[s][tier]`  -> `readStop(t, 'gradient', 1, …)`  the part names it (U1.1's 12)
 *
 * ONE stop per call, on purpose: an anchor ROW is the unit of PARSE-FAILED isolation, so the
 * two stops of a gradient must be able to fail independently. Both go through `value`, so a
 * stop that is an identifier reference resolves like any other field.
 */
export function readStop(text, key, i, opts = {}) {
  const m = region(text, opts).match(new RegExp(`\\b${key}\\s*:\\s*\\[\\s*(${VALUE})\\s*,\\s*(${VALUE})`))
  if (!m) throw new Error(`tuple stops not found: ${key}`)
  return value(m[i], opts.resolve)
}

/**
 * The scope of ONE glass tier part in the phone's `GlassColors` — the shape U1.1's 24 tier
 * keys read through. Three levels, each load-bearing; see `region` above for what each of the
 * shorter forms actually hits.
 *
 * `before: '}'` is safe for every tier: a tier body holds only `rgba()` (parens) and one
 * `[…]` tuple, so the first `}` after the opening brace is the tier's own close. Verified
 * across all six tiers in both halves at `dd5551ec`.
 */
export const rnTierScope = (scheme, tier) => ({
  after: ['export const GlassColors', `${scheme}: {`, `${tier}: {`],
  before: '}',
})

/**
 * The palette keys anchored at THIS stage of the port.
 *
 * The rule, from the master plan (§6.6 gate 1): the anchor set is what the port has TOKENISED
 * so far, and **adding an anchor is the closing act of the package that creates its web-side
 * token.** A phase is never gated on an anchor whose web token does not exist yet. So the set
 * grows with the phases and only with them:
 *
 *   U0.4 (this list)  the 15 palette keys U0.1 created and the plan's U0.4 row names
 *   U1.1              +24 glass-tier keys (both gradient stops + border + highlightTop, x6)
 *   U3.1              +4 status keys (success, successLight, warning, warningLight)
 *   U8.2              +gridSubtle
 *   -> ~44 keys at the end, each pinned in both halves
 *
 * `success` and `warning` DO already exist in `tokens/palette.ts` and are still deliberately
 * absent here: U3.1's row claims all four status anchors as its own closing act, and taking
 * them early would leave that package with nothing to close.
 *
 * Both halves are pinned — decision D2 as amended by the owner on 2026-08-27. 15 keys x
 * { light, dark } = 30 rows. The demo renders only `dark`, but a light half that silently
 * diverges is drift the moment `palette.ts`'s one-site scheme switch is flipped.
 */
export const PALETTE_KEYS = [
  'primary',
  'primaryLight',
  'primaryDark',
  'background',
  'backgroundSecondary',
  'backgroundTertiary',
  'text',
  'textSecondary',
  'textTertiary',
  'textInverse',
  'border',
  'error',
  'errorLight',
  'errorDark',
  'link',
]

/** Both scheme halves, in report order. */
export const SCHEMES = ['light', 'dark']

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

  // Region slices, per scheme, per side. All four are plain string-index cuts, not parsers.
  //
  // The RN markers rely on ORDER and it is worth stating why they are safe: `light: {` and
  // `dark: {` each occur twice in Colors.ts (`Colors` at :9/:128, `GlassColors` at :274/:345)
  // and `indexOf` takes the FIRST, so both slices land inside `Colors`. Light is bounded by
  // the start of dark rather than by `} as const`, which would run past it.
  const rnRegion = {
    light: { after: 'light: {', before: 'dark: {' },
    dark: { after: 'dark: {', before: '} as const' },
  }
  // The demo's matching halves. `palette.ts` declares `const light = { … } as const` and
  // `const dark = { … } as const` as two top-level bindings, so each has its own marker.
  const webRegion = {
    light: { after: 'const light = {', before: '} as const' },
    dark: { after: 'const dark = {', before: '} as const' },
  }
  // One-level resolvers, one per side per scheme. `Colors.dark.primaryDark` -> look
  // `primaryDark` up in the same region. Neither carries a `resolve` of its own, so the chain
  // stops here by construction (see `value` above).
  const rnRef = (scheme) => (name) => readField(colors.text, name, rnRegion[scheme])
  const webRef = (scheme) => (name) => readField(paletteSrc.text, name, webRegion[scheme])

  // Every read is wrapped by `attempt`: the readers throw on a miss, and one miss must never
  // disable the rest of the table. That is U0.0's degrade, and this table is where it earns
  // its keep — 35 rows, each independently resolvable.
  const anchors = []
  for (const scheme of SCHEMES) {
    for (const key of PALETTE_KEYS) {
      anchors.push({
        key,
        scheme,
        label: `${key}.${scheme}`,
        rn: attempt(colors, (t) => readField(t, key, { ...rnRegion[scheme], resolve: rnRef(scheme) })),
        web: attempt(paletteSrc, (t) => readField(t, key, { ...webRegion[scheme], resolve: webRef(scheme) })),
      })
    }
  }

  // The CTA gradient moved on the phone's P9: `PRIMARY_GRADIENT` in `Button.tsx` became
  // `PrimaryButtonGradient` in `Colors.ts:471`, and its dark stops are now
  // `[Colors.dark.primaryDark, '#17527A']` — one literal and one reference, which is why
  // reading it at all needs the resolver. `Button.tsx` is no longer read.
  //
  // DARK ONLY, and that is not an oversight: the phone's light pair (`['#2563eb','#1d3584']`)
  // has NO web-side token. U0.3 kept the demo's stops as the two module consts below, which
  // are the dark pair only. Anchoring light here would gate the phase on a token that does
  // not exist — the one thing §6.6 gate 1 forbids. Whichever package gives the demo a light
  // accent pair adds these two rows as its closing act.
  const gradOpts = {
    after: 'export const PrimaryButtonGradient = {',
    before: '} as const',
    resolve: rnRef('dark'),
  }
  anchors.push(
    { key: 'gradientTop', scheme: 'dark', label: 'gradientTop.dark', rn: attempt(colors, (t) => readStop(t, 'dark', 1, gradOpts)), web: attempt(glass, (t) => readConst(t, 'ACCENT_FROM')) },
    { key: 'gradientBot', scheme: 'dark', label: 'gradientBot.dark', rn: attempt(colors, (t) => readStop(t, 'dark', 2, gradOpts)), web: attempt(glass, (t) => readConst(t, 'ACCENT_TO')) },
    // Scheme-invariant: a touch floor is a geometry constant, and neither repo branches it.
    { key: 'touchFloor', scheme: 'any', label: 'touchFloor', rn: attempt(layout, (t) => readField(t, 'min', { after: 'touchTarget: {', before: '}' })), web: attempt(scaleSrc, (t) => readField(t, 'min', { after: 'export const touchTarget = {', before: '}' })) },
  )

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
  for (const a of anchors) console.log(`  ${statusOf(a).padEnd(12)}  ${a.label.padEnd(26)} RN=${a.rn}  web=${a.web}`)
  if (parseFailed.length) {
    console.error(`\n✗ ${parseFailed.length} anchor row(s) could not be parsed on one side — the guard is BLIND there:`)
    for (const p of parseFailed) console.error(`  ${p.label}: RN=${p.rn}  web=${p.web}`)
    console.error('A moved or renamed constant. Repoint the reader in .design-sync/check-rn-parity.mjs.')
  }
  if (drift.length) {
    console.error(`\n✗ ${drift.length} anchor row(s) drifted between the RN app and the web demo:`)
    for (const d of drift) console.error(`  ${d.label}: RN Colors.${d.scheme} = ${d.rn}, web = ${d.web}`)
    console.error('\nUpdate features/demo/ui/tokens/palette.ts (or tokens/scale.ts / glass-tokens.ts for')
    console.error('the touch floor and the accent stops) to match the phone, or vice-versa.')
    process.exit(1)
  }
  const keys = new Set(anchors.map((a) => a.key))
  console.log(
    `\n✓ all ${anchors.length} anchor rows match between the RN app and the web demo ` +
      `(${keys.size} keys x both scheme halves, minus the light gradient the demo has no token for)`,
  )
}
