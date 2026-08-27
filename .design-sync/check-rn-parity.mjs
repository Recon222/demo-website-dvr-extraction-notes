// RN <-> Web token drift guard.
//
// The web demo's palette mirrors the React Native app's `Colors` BY HAND (plus the CTA
// gradient and the 44pt touch floor). Nothing enforces that mirror, so a hex change in
// the RN app silently desyncs the two products. This checker pins the shared anchors: it
// parses the CURRENT value from each side and asserts they're equal — so changing
// `Colors.dark.primary` in the RN repo fails until `palette.dark.primary` follows here
// (and vice-versa).
//
// Sides read, as of U1.1:
//   RN   src/constants/Colors.ts        `Colors.light` / `Colors.dark`, `PrimaryButtonGradient`,
//                                       `GlassColors.light` / `.dark` (the six glass tiers)
//        src/constants/Layout.ts        `touchTarget.min`
//   web  features/demo/ui/tokens/palette.ts      the definition, NOT `T`'s re-export
//        features/demo/ui/tokens/scale.ts        `touchTarget.min`
//        features/demo/ui/tokens/glass-tiers.ts  `GLASS_TIER` (the six tiers, both halves)
//        features/demo/ui/glass-tokens.ts        `ACCENT_FROM` / `ACCENT_TO`
//
// The tier rows close a hole the guard could not see before U1.1: `glass-tokens.test.ts` pins
// the demo's glass values TO THEMSELVES, so it is structurally incapable of noticing a
// phone-side re-tint. Plan §2's Tier-A caveat said so in as many words. It no longer applies.
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
  // Strip line comments FIRST. `readField` takes the first `key: <value>` in the slice and has
  // no idea whether it is code, so a refactor that leaves `// was text: '#f0f4f8'` above the
  // changed value makes the guard read the COMMENT and report zero drift (review W0/F4;
  // probed, it SURVIVED). The inverse — a `// TODO: text: '#ffffff'` — is a false red. Both
  // repos' constant files are comment-dense, and `Colors.ts` is where U1.1's tier reads land.
  //
  // Line comments only, and that is enough: every field the guard reads sits on its own line,
  // and none of the five files sliced here contains `//` inside a string (no URLs — checked).
  // A block-comment stripper would need to respect string literals to stay correct, and there
  // is nothing yet for it to catch.
  let out = text.replace(/\/\/[^\n]*/g, '')
  const markers = after == null ? [] : Array.isArray(after) ? after : [after]
  for (const marker of markers) {
    const i = out.indexOf(marker)
    if (i === -1) throw new Error(`region marker not found: ${marker}`)
    out = out.slice(i)
  }
  if (before) {
    const j = out.indexOf(before)
    // A missed `before` used to fall through and widen the slice to EOF, so a key absent from
    // its intended block but present in a LATER one was read from the wrong literal instead of
    // reported. Now it degrades like a missed `after` does — to a PARSE-FAILED row.
    if (j === -1) throw new Error(`region end marker not found: ${before}`)
    out = out.slice(0, j)
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
 *
 * The pattern is CLOSED on the right (`\\s*\\]`) and that is the whole of review F21: without it a
 * three-stop tuple matched, the reader silently compared only the first two, and the row
 * reported OK against a gradient the demo cannot render. Truncation was the one malformed
 * shape this reader accepted quietly; now it lands as PARSE-FAILED like every other one. A
 * one-stop tuple already threw. Both callers pass 2-tuples, so nothing legitimate is lost.
 */
export function readStop(text, key, i, opts = {}) {
  const m = region(text, opts).match(new RegExp(`\\b${key}\\s*:\\s*\\[\\s*(${VALUE})\\s*,\\s*(${VALUE})\\s*\\]`))
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
 * The web twin of `rnTierScope`. `tokens/glass-tiers.ts` (U1.1) deliberately mirrors
 * `GlassColors`' own nesting — one `{ light: { <tier>: { … } }, dark: { … } }` literal rather
 * than the two module-level consts `tokens/palette.ts` uses — so ONE scope shape addresses both
 * sides and there is no second, differently-shaped reader to keep in step.
 *
 * `'export const GLASS_TIER'` and not `'GLASS_TIER'`: the shorter marker would match the first
 * mention of the name anywhere, and on the RN side the identical mistake lands on a COMMENT
 * (`Colors.ts:25`) that reads the LIGHT tier for both schemes — zero drift, proving nothing.
 */
export const webTierScope = (scheme, tier) => ({
  after: ['export const GLASS_TIER', `${scheme}: {`, `${tier}: {`],
  before: '}',
})

/**
 * EVERY key in the demo's palette, anchored in both scheme halves.
 *
 * This list is a hand-maintained mirror of `tokens/palette.ts`'s key set, because the guard is
 * plain `.mjs` and cannot import the TypeScript module it checks. Deriving it by parsing that
 * file would be self-referential — a key deleted from the demo would silently delete its own
 * anchor. So the list is explicit, and MEMBERSHIP is pinned from the test, which CAN import the
 * palette: `rn-token-parity.test.ts` asserts this array equals `Object.keys(palette.dark)`.
 * Adding a palette token without an anchor is a red test, not a quiet coverage hole.
 *
 * REVIEW W0/F2 changed the shape of this list. It used to carry 15 keys — the subset the plan's
 * U0.4 row names — leaving 17 of the palette's 32 unanchored with no future package owning them
 * (the plan's ~44-key arithmetic never reaches `borderLight`, `borderDark`, `onPrimary`,
 * `card`, `overlay`, `disabled`, …), i.e. the port's mechanical gate was true of 53% of the
 * palette. Anchoring the rest is a green no-op: 32 keys x 2 halves = 64 rows, 0 drift.
 *
 * The staging rule it looked like it was obeying (plan §6.6 gate 1: never anchor a token whose
 * WEB SIDE does not exist yet) does not apply here — U0.1 created all 32 web tokens. The rule
 * still binds anything the demo has not tokenised: `successLight`/`warningLight` (U3.1) and
 * `gridSubtle` (U8.2) stay out until their package creates them. The six glass tiers were on
 * that list until U1.1 LANDED and created `tokens/glass-tiers.ts`; their 24 keys are anchored
 * below.
 *
 * SCHEDULE, corrected — this supersedes the plan's stage figures:
 *   U0.4 (here)  32 palette keys x 2 halves                              = 64 rows
 *                + PrimaryButtonGradient's 2 dark stops + touchFloor     = 67 rows
 *   U2.2 (LANDED) +PrimaryButtonGradient's 2 LIGHT stops                  =  +2 rows
 *   U1.1 (LANDED) +24 glass-tier keys x 2                                 = +48 rows
 *                -> 115 rows / 56 keys HERE, which is what this table produces today
 *   U3.1 (LANDED) +8 keys x 2                                            = +16 rows
 *                -> 40 palette keys / 131 rows HERE, which is what this table produces today
 *   U8.2         +gridSubtle x 2                                         =  +4 rows
 *   -> 65 keys / 135 rows at the end, not the plan's ~44 keys / ~88 rows.
 *
 * U3.1's count corrects BOTH earlier figures. The plan's U3.1 row says "the four status
 * anchors (`success`, `successLight`, `warning`, `warningLight`)"; U0.4's schedule above said
 * two, on the grounds that `success`/`warning`/`successDark`/`warningDark` were already here.
 * Both undercount, and the reason is structural rather than arithmetic: this list is not a
 * chosen subset any more. Since W0/F2 it is pinned by MEMBERSHIP — `rn-token-parity.test.ts`
 * asserts it equals `Object.keys(palette.dark)` — so a package that creates N palette tokens
 * anchors N keys or reds that pin. U3.1 created eight (`successLight`, `warningLight`,
 * `infoLight`, `warningAccent`, and the four `*OnLight`), so eight is not a choice it made.
 *
 * Both halves are pinned per decision D2 as amended by the owner on 2026-08-27. The demo renders
 * only `dark`, but a light half that silently diverges is drift the moment `palette.ts`'s
 * one-site scheme switch is flipped.
 */
export const PALETTE_KEYS = [
  // primary ramp
  'primary',
  'primaryLight',
  'primaryDark',
  // surface ramp
  'background',
  'backgroundSecondary',
  'backgroundTertiary',
  // text ramp
  'text',
  'textSecondary',
  'textTertiary',
  'textInverse',
  // borders
  'border',
  'borderLight',
  'borderDark',
  // status. U3.1 added the eight the demo had no web-side token for; `warningAccent` is a
  // SEPARATE key from `warningDark` even though dark spells them the same hex (light does not),
  // so it gets its own row and a re-point of either side fails alone.
  'success',
  'successLight',
  'successDark',
  'error',
  'errorLight',
  'errorDark',
  'warning',
  'warningLight',
  'warningDark',
  'warningAccent',
  'info',
  'infoLight',
  'infoDark',
  // status foregrounds. All four are `#f0f4f8` in DARK and four different hexes in light, which
  // is exactly why they are anchored: a light half that quietly re-tints them is invisible to
  // every other gate in this repo.
  'infoOnLight',
  'warningOnLight',
  'successOnLight',
  'errorOnLight',
  // foregrounds for filled surfaces — the only two keys that are scheme-INVARIANT (#ffffff in
  // both halves), which is why the light-vs-dark structural pin excludes them by name.
  'onPrimary',
  'onError',
  // accent-as-text
  'link',
  'linkHover',
  // surfaces
  'card',
  'modal',
  // overlays — the first anchors that are not bare hexes
  'overlay',
  'overlayLight',
  // disabled
  'disabled',
  'disabledText',
]

/**
 * The six glass tiers x the four parts of each that the guard can read as a flat value.
 * 6 x 4 = 24 keys, each pinned in BOTH halves = 48 anchor rows. U1.1's closing act.
 *
 * `innerShadow` is the fifth part and is deliberately ABSENT. It is not a CSS value on either
 * side — the phone hands it to a native shadow prop and the web composes it into
 * `box-shadow: inset 0 1px 0 <innerShadow>` — so an anchor on it would compare two things that
 * are equal by transcription rather than by contract. Its twelve values are pinned instead by
 * `features/demo/ui/tokens/__tests__/glass-tiers.test.ts`, which is the ONLY gate on them; if
 * that file is ever thinned, they lose their last guard. (Plan §5, U1.1 row, states the
 * exclusion; this says what covers the gap.)
 *
 * The two gradient stops are separate KEYS, not one, for the reason `readStop` takes an index:
 * an anchor row is the unit of PARSE-FAILED isolation, so a gradient whose second stop moves
 * must be able to fail without taking the first one's verdict with it.
 */
export const TIER_KEYS = ['card', 'nestedCard', 'elevated', 'header', 'sheet', 'recessed']
export const TIER_PARTS = ['gradientTop', 'gradientBot', 'border', 'highlightTop']

/**
 * Keys whose two halves hold the SAME value by design, excluded from the stuck-reader check
 * below. Both are `#ffffff` in either scheme (`Colors.ts:95-96`, `:201-202`) — a foreground for
 * a filled surface does not change with the theme. Anything added here needs the same one-line
 * justification, or it is hiding a stuck reader. None of the 24 tier keys qualifies.
 */
export const SCHEME_INVARIANT = ['onPrimary', 'onError']

/** Both scheme halves, in report order. */
export const SCHEMES = ['light', 'dark']

export function checkParity() {
  const colors = source('RN Colors.ts', join(RN, 'src/constants/Colors.ts'))
  const layout = source('RN Layout.ts', join(RN, 'src/constants/Layout.ts'))
  // U0.1 made `tokens/palette.ts` the demo's palette and turned `inputs/input-theme.ts`'s `T`
  // into a re-export of it. The guard reads the DEFINITION, not the re-export: `T`'s aliases
  // are pinned at RUNTIME by tokens/__tests__/palette.test.ts:144-158, which is a stronger
  // check than parsing source text, and `T` only carries 8 of the 32 anyway.
  const paletteSrc = source('web tokens/palette.ts', join(WEB, 'features/demo/ui/tokens/palette.ts'))
  // U0.2's scale seam. `touchFloor` used to read `T.rowH`, a literal that U0.0 deliberately
  // left in place because it was the guard's ONLY resolving anchor at the time.
  const scaleSrc = source('web tokens/scale.ts', join(WEB, 'features/demo/ui/tokens/scale.ts'))
  // Single source for the accent gradient stops; input-theme re-exports them.
  const glass = source('web glass-tokens.ts', join(WEB, 'features/demo/ui/glass-tokens.ts'))
  // U2.2's button recipe. It is the only place the demo carries the LIGHT CTA pair, and it holds
  // the dark pair as a REFERENCE to the two consts above rather than a copy, so the two rows
  // below read light here and the two dark rows keep reading `glass`.
  const buttonRecipe = source(
    'web controls/button-recipe.ts',
    join(WEB, 'features/demo/ui/controls/button-recipe.ts'),
  )
  // U1.1's tier seam. The four `GLASS.*` composites derived from it are NOT read here: they are
  // template literals, so their text holds `${tier.card.gradient[0]}` and not a colour. Reading
  // the definition is also the right side to read — a derived key that stopped deriving would
  // be caught by `glass-tokens.test.ts`'s byte-exact shape pin, not by this guard.
  const tiers = source('web tokens/glass-tiers.ts', join(WEB, 'features/demo/ui/tokens/glass-tiers.ts'))

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
  // its keep — 115 rows, each independently resolvable.
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

  // U1.1's 48 tier rows. `readStop` for the two gradient stops (after `gradient:` comes `[`,
  // which matches none of `readField`'s value alternatives — all twelve would be permanent
  // PARSE-FAILED rows without it) and `readField` for the two flat parts. No `resolve` on either
  // side: every tier value is a spelled literal in both repos, and an identifier appearing here
  // should become a PARSE-FAILED row to be looked at, not be quietly followed.
  //
  // This is where U0.4's `norm()` whitespace fix earns its keep — the phone spells
  // `rgba(28, 78, 132, 0.5)` and the demo spells `rgba(28,78,132,0.5)`. Without it all 48 rows
  // compare unequal forever.
  for (const scheme of SCHEMES) {
    for (const tier of TIER_KEYS) {
      const rnOpts = rnTierScope(scheme, tier)
      const webOpts = webTierScope(scheme, tier)
      const row = (part, rnRead, webRead) => ({
        key: `${tier}.${part}`,
        scheme,
        label: `${tier}.${part}.${scheme}`,
        rn: attempt(colors, rnRead),
        web: attempt(tiers, webRead),
      })
      anchors.push(
        row('gradientTop', (t) => readStop(t, 'gradient', 1, rnOpts), (t) => readStop(t, 'gradient', 1, webOpts)),
        row('gradientBot', (t) => readStop(t, 'gradient', 2, rnOpts), (t) => readStop(t, 'gradient', 2, webOpts)),
        row('border', (t) => readField(t, 'border', rnOpts), (t) => readField(t, 'border', webOpts)),
        row('highlightTop', (t) => readField(t, 'highlightTop', rnOpts), (t) => readField(t, 'highlightTop', webOpts)),
      )
    }
  }

  // The CTA gradient moved on the phone's P9: `PRIMARY_GRADIENT` in `Button.tsx` became
  // `PrimaryButtonGradient` in `Colors.ts:471`, and its dark stops are now
  // `[Colors.dark.primaryDark, '#17527A']` — one literal and one reference, which is why
  // reading it at all needs the resolver. `Button.tsx` is no longer read.
  //
  // BOTH HALVES since U2.2 — this was DARK ONLY, and the comment here used to say why: the
  // phone's light pair (`['#2563eb','#1d3584']`) had no web-side token, U0.3 having re-based
  // the dark stops alone, and anchoring a token that does not exist is the one thing §6.6
  // gate 1 forbids. It said "whichever package gives the demo a light accent pair adds these
  // two rows as its closing act". U2.2 is that package: `PrimaryButtonGradient` in
  // `ui/controls/button-recipe.ts` carries both halves, so the light rows are here now and
  // deferral §90's second clause is closed.
  //
  // The two sides are read from DIFFERENT web files on purpose. Dark lives in `glass-tokens.ts`
  // as `ACCENT_FROM`/`ACCENT_TO`, spelled as literals because `readConst` matches literals and
  // not identifier references; `PrimaryButtonGradient.dark` points AT those two consts, so
  // reading it here instead would only prove the reference resolves. Light has no such const
  // and is read from the record itself.
  const gradOpts = {
    after: 'export const PrimaryButtonGradient = {',
    before: '} as const',
    resolve: rnRef('dark'),
  }
  const gradOptsLight = { ...gradOpts, resolve: rnRef('light') }
  // The web-side record ends `} as const satisfies Record<...>`, which `'} as const'` still
  // bounds — it is a substring cut, not a parse.
  const webGradOpts = { after: 'export const PrimaryButtonGradient = {', before: '} as const' }
  anchors.push(
    { key: 'gradientTop', scheme: 'dark', label: 'gradientTop.dark', rn: attempt(colors, (t) => readStop(t, 'dark', 1, gradOpts)), web: attempt(glass, (t) => readConst(t, 'ACCENT_FROM')) },
    { key: 'gradientBot', scheme: 'dark', label: 'gradientBot.dark', rn: attempt(colors, (t) => readStop(t, 'dark', 2, gradOpts)), web: attempt(glass, (t) => readConst(t, 'ACCENT_TO')) },
    { key: 'gradientTop', scheme: 'light', label: 'gradientTop.light', rn: attempt(colors, (t) => readStop(t, 'light', 1, gradOptsLight)), web: attempt(buttonRecipe, (t) => readStop(t, 'light', 1, webGradOpts)) },
    { key: 'gradientBot', scheme: 'light', label: 'gradientBot.light', rn: attempt(colors, (t) => readStop(t, 'light', 2, gradOptsLight)), web: attempt(buttonRecipe, (t) => readStop(t, 'light', 2, webGradOpts)) },
    // Scheme-invariant: a touch floor is a geometry constant, and neither repo branches it.
    { key: 'touchFloor', scheme: 'any', label: 'touchFloor', rn: attempt(layout, (t) => readField(t, 'min', { after: 'touchTarget: {', before: '}' })), web: attempt(scaleSrc, (t) => readField(t, 'min', { after: 'export const touchTarget = {', before: '}' })) },
  )

  const parseFailed = anchors.filter((a) => isParseFailed(a.rn) || isParseFailed(a.web))
  // A parse failure is drift even when both sides fail identically — an anchor that cannot
  // be read has not been proven equal.
  const drift = anchors.filter((a) => a.rn !== a.web || isParseFailed(a.rn))

  // The third failure mode, and the one `drift` is structurally blind to (review F17): a reader
  // STUCK on one half compares that half to itself, so every row is equal and the table is a
  // wall of OK. Measured: flattening both tier scopes to one level printed "all 115 anchor rows
  // match" and exited 0 while comparing light to light. It has to be computed here rather than
  // in the vitest file, because the standalone CLI is advertised as authoritative ("exit 1 on
  // drift or mismatch") and quoted as verification evidence — two entry points reaching opposite
  // verdicts on the same tree is worse than either verdict alone.
  //
  // Parse-failed rows are skipped: they are already reported, and two identical
  // "field not found" strings are not evidence of a stuck reader.
  const halves = new Map()
  for (const a of anchors) {
    if (a.scheme !== 'light' && a.scheme !== 'dark') continue
    const pair = halves.get(a.key) ?? {}
    pair[a.scheme] = a
    halves.set(a.key, pair)
  }
  const stuck = []
  for (const [key, pair] of halves) {
    if (!pair.light || !pair.dark || SCHEME_INVARIANT.includes(key)) continue
    for (const side of ['rn', 'web']) {
      if (isParseFailed(pair.light[side]) || isParseFailed(pair.dark[side])) continue
      if (pair.light[side] === pair.dark[side]) stuck.push({ key, side, value: pair.light[side] })
    }
  }
  return { anchors, drift, parseFailed, stuck }
}

const statusOf = (a) => (isParseFailed(a.rn) || isParseFailed(a.web) ? 'PARSE-FAILED' : a.rn === a.web ? 'OK' : 'DRIFT')

// Run standalone (only when invoked directly, never on import — argv[1] may be undefined).
const invokedDirectly = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  if (!rnAvailable()) {
    console.log(`skip: RN repo not found at ${RN}`)
    process.exit(0)
  }
  const { anchors, drift, parseFailed, stuck } = checkParity()
  // 30 fits `nestedCard.highlightTop.light`, the longest label in the set.
  for (const a of anchors) console.log(`  ${statusOf(a).padEnd(12)}  ${a.label.padEnd(30)} RN=${a.rn}  web=${a.web}`)
  if (parseFailed.length) {
    console.error(`\n✗ ${parseFailed.length} anchor row(s) could not be parsed on one side — the guard is BLIND there:`)
    for (const p of parseFailed) console.error(`  ${p.label}: RN=${p.rn}  web=${p.web}`)
    console.error('A moved or renamed constant. Repoint the reader in .design-sync/check-rn-parity.mjs.')
  }
  if (stuck.length) {
    console.error(
      `\n✗ ${stuck.length} anchor row-pair(s) read the SAME value for light and dark — a reader is STUCK on one half:`,
    )
    for (const s of stuck) console.error(`  ${s.key} (${s.side} side): both halves read ${s.value}`)
    console.error('A scope that names the tier but not the scheme lands on the LIGHT half for BOTH')
    console.error('schemes, which reports zero drift while proving nothing. Re-read the scope markers.')
  }
  if (drift.length) {
    console.error(`\n✗ ${drift.length} anchor row(s) drifted between the RN app and the web demo:`)
    for (const d of drift) console.error(`  ${d.label}: RN Colors.${d.scheme} = ${d.rn}, web = ${d.web}`)
    console.error('\nUpdate features/demo/ui/tokens/palette.ts (or tokens/scale.ts / glass-tokens.ts for')
    console.error('the touch floor and the accent stops) to match the phone, or vice-versa.')
  }
  if (drift.length || stuck.length) process.exit(1)
  console.log(
    `\n✓ all ${anchors.length} anchor rows match between the RN app and the web demo ` +
      `(${PALETTE_KEYS.length} palette keys + ${TIER_KEYS.length * TIER_PARTS.length} glass-tier keys, ` +
      `each x both halves, + the 4 CTA gradient stops (both halves too) and the touch floor)`,
  )
}
