import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/**
 * A89 — the teal purge (phone P6 / issue #115), mechanised.
 *
 * The phone deleted `#4ECDC4` wholesale: it was sweeping across the white light theme behind
 * nearly every screen. The demo carried eleven sites across seven files. Two mapped cleanly to
 * phone values and are gone — `TerminalLine`'s VERB accent (U7.1, A85, -> `textTertiary`) and
 * `PhoneFrame`'s scan sweep (U8.2, A88, -> `colors.primary`) — plus `DashboardScreen`'s badge
 * number, which is inside the phone frame and therefore follows the palette (D12's "follow"
 * arm; the phone's own `DashboardCaseCard.tsx:295-306` settles it at `colors.text`).
 *
 * THE SIX THAT SURVIVE ARE D12, NOT AN OVERSIGHT. `StoryRail`, `ExitDialog` and
 * `ExploreChecklist` sit OUTSIDE the frame and speak in the Case-File site's voice, not the
 * app's. D12's three-way split freezes exactly those three, and this file is where that ruling
 * stops being prose: each is an ALLOWED row with its reason, and the inventory case below
 * fails if one disappears as loudly as if a fourth appears.
 *
 * ## Scope, stated exactly (convention 2 — shrink the claim)
 *
 * Every `.ts`/`.tsx` file under `features/demo/ui/`, comments stripped, `__tests__` excluded.
 * NOT the marketing tree, NOT `engine/`, and NOT `ui/demo.css` — that file is a `.css` and is
 * frozen by D9 anyway; measured teal-free at the time this landed. The claim is "no production
 * module under `ui/` PAINTS the pre-recolor teal", and that is all it is: a comment recording
 * "was `#4ECDC4`" is documentation and deliberately passes, which is what lets the port keep
 * its own history in prose (the same rule `settings-palette-sweep.test.ts` adopted after U6.1's
 * report recorded the alternative costing a commit).
 *
 * ## The four spellings (convention 3 — ledger §120's class)
 *
 * `#4ecdc4`, `#4ECDC4`, `rgb(78,205,196)` and `rgba(78, 205, 196, a)` are ONE colour, and a
 * needle list of hex strings sees two of them. That is exactly the hole ledger §120 records in
 * `palette.test.ts`'s RETIRED sweep, and this file does not reproduce it: every literal found —
 * needle side and haystack side alike — is CANONICALISED to `#rrggbb` first, so all four
 * collapse before anything is compared. `canonicalTeals` is the single extraction both the
 * planted control and the tree walk go through; a spelling this file cannot see is a spelling
 * the control cannot see either, and the control is asserted.
 *
 * Deliberately NOT extended to `palette.test.ts`'s RETIRED sweep, which §120 names as the other
 * half of its trigger. Measured on this tree: the rgb-form needles for the retired navy ramp
 * red at FIFTEEN live sites across eleven files owned by four merged packages
 * (`CoordinateDisplay`, `ImportResultAccordion`, `NotesScreen`, `_shared`, `ExitDialog`,
 * `ExploreChecklist`, `AudioPreviewScreen`, `AudioRecorderScreen`, `MediaLibrarySheet`,
 * `OcrCaptureScreen`, `TimeWheel`) — not the "one live instance" §120 assumed. That is a sweep
 * package, not U8.2's closing act; see the implementation report's deferral proposal.
 */

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/** The pre-recolor teal, canonical. */
const TEAL = '#4ecdc4'

/** `<path relative to ui/>:<canonical hex>` — the unit an exemption is granted in. */
type Site = `${string}:#${string}`

/**
 * The teal that survives on purpose (D12). Keyed by SITE, per W2/F32 as amended by W3/F66: a
 * value-keyed map exempts the value across the whole walk, and a probe planting the exempt hex
 * in a SECOND file survives it. A path in the key means a fourth file spelling the teal is a
 * NEW key that reds naming its own file.
 *
 * One row per file rather than per occurrence, because the value is canonicalised: `StoryRail`
 * paints the teal four times in three spellings and the reason is the same sentence each time.
 */
const ALLOWED: Readonly<Record<Site, string>> = {
  'StoryRail.tsx:#4ecdc4':
    'D12 "freeze". The narration rail is beside the phone, not inside it — eyebrow, the ' +
    '"you\'re driving" callout and its icon, and the unseen-chapter dots. This is the ' +
    'Case-File site speaking about the app, so it keeps the site\'s accent.',
  'controls/ExitDialog.tsx:#4ecdc4':
    'D12 "freeze". The leave-the-demo dialog is site chrome rendered outside the frame; its ' +
    'eyebrow matches the rail it belongs to.',
  'controls/ExploreChecklist.tsx:#4ecdc4':
    'D12 "freeze". The visited/unvisited tick in the rail\'s exploration manifest — same ' +
    'surface, same voice, same accent.',
}

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

/**
 * Every colour literal in `src`, canonicalised to `#rrggbb`, filtered to the teal.
 *
 * `rgb()`/`rgba()` are matched with their channels and converted here rather than being listed
 * as extra needles: a needle list has to anticipate the spacing AND the alpha, and
 * `rgba(78,205,196,0.35)` / `rgba(78, 205, 196, 0.6)` are already two of them in this repo.
 */
const canonicalTeals = (src: string): string[] => {
  const found: string[] = []
  // `{3,8}`, matching every sibling scan in this repo (`settings-palette-sweep.test.ts:100`,
  // `field-recipe-sweep.test.tsx`). W4/F88: this read `{6}`, so `#4ecdc4ff` — the same colour
  // with an alpha channel — walked past a guard whose docblock claims every literal is
  // canonicalised. Zero 8-digit literals are live today; the point is that the docblock's claim
  // and the mechanism now agree, which is convention 2.
  const pattern = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*[,)]/g
  let m = pattern.exec(src)
  while (m !== null) {
    // `toString(16)` + a manual pad, not `padStart`: tsconfig targets es5.
    const hex =
      m[1] === undefined
        ? '#' + expandHex(m[0].slice(1).toLowerCase())
        : '#' +
          [m[1], m[2], m[3]]
            .map((n) => {
              const h = Number(n).toString(16)
              return h.length < 2 ? '0' + h : h
            })
            .join('')
    if (hex === TEAL) found.push(hex)
    m = pattern.exec(src)
  }
  return found
}

/**
 * A hex literal's digits -> its six RGB digits: `#rgb`/`#rgba` double, `#rrggbb`/`#rrggbbaa`
 * truncate. The alpha channel is DROPPED rather than compared — `#4ecdc4ff` and `#4ecdc480` are
 * the same colour at two opacities, and A89 purged the colour.
 *
 * 5- and 7-digit runs are not valid CSS colours; they fall through `slice(0, 6)` and simply
 * never equal the needle, which is the right answer for a string that is not a colour.
 */
const expandHex = (digits: string): string =>
  digits.length <= 4 ? digits.slice(0, 3).replace(/./g, (c) => c + c) : digits.slice(0, 6)

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') out.push(...sourceFiles(full))
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

const siteKey = (file: string): Site =>
  `${relative(UI_ROOT, file).split(sep).join('/')}:${TEAL}` as Site

describe('the teal purge (A89 / D12)', () => {
  const files = sourceFiles(UI_ROOT)

  it('catches a planted teal in all four spellings, and nothing next to it', () => {
    // Convention 1, both halves: the violation is PLANTED, it is caught, and the control stays
    // asserted — an empty result from the walk below means "no teal" only for as long as this
    // passes. It runs the SAME extraction the walk does, so a spelling that stops being seen
    // here stops being seen there in the same run.
    expect(canonicalTeals("color: '#4ecdc4'")).toEqual([TEAL])
    expect(canonicalTeals("color: '#4ECDC4'")).toEqual([TEAL])
    expect(canonicalTeals("background: 'rgb(78,205,196)'")).toEqual([TEAL])
    expect(canonicalTeals("boxShadow: '0 0 12px rgba(78, 205, 196, 0.6)'")).toEqual([TEAL])
    // W4/F88 — the eight-digit form, in both cases. The alpha channel is dropped, not compared:
    // the same colour at two opacities is the same purged colour.
    expect(canonicalTeals("color: '#4ecdc4ff'")).toEqual([TEAL])
    expect(canonicalTeals("color: '#4ECDC480'")).toEqual([TEAL])
    // Not a blanket cyan ban: one channel off is a different colour and must pass.
    expect(canonicalTeals("color: '#4ecdc5'")).toEqual([])
    expect(canonicalTeals("background: 'rgba(78, 205, 197, 0.35)'")).toEqual([])
    // Widening to `{3,8}` must not invent matches. `#4ec` expands to `#44eecc`, which is a
    // different colour and stays silent — the shorthand is now SEEN, not assumed to be teal.
    expect(canonicalTeals("color: '#4ec'")).toEqual([])
    expect(canonicalTeals("color: '#4ecf'")).toEqual([])
    // The tree is non-empty — an empty walk makes every assertion below vacuously true, which
    // is the one failure a source scan has and a behaviour test does not.
    expect(files.length).toBeGreaterThan(50)
  })

  it('paints no pre-recolor teal in any ui/ module outside the three D12 surfaces', () => {
    const offenders: string[] = []
    for (const file of files) {
      const key = siteKey(file)
      if (key in ALLOWED) continue
      if (canonicalTeals(stripComments(readFileSync(file, 'utf8'))).length > 0) offenders.push(key)
    }
    expect(
      offenders,
      'the phone purged #4ECDC4 in P6 (A89). Inside the frame, follow the palette — the scan ' +
        'sweep takes `withAlpha(colors.primary, 0.3)` (A88) and a badge number takes ' +
        '`colors.text`. Outside it, add a D12 row above with a reason.',
    ).toEqual([])
  })

  it('leaves EXACTLY the three D12 surfaces — no more, and no fewer', () => {
    const found: Site[] = []
    for (const file of files) {
      if (canonicalTeals(stripComments(readFileSync(file, 'utf8'))).length > 0) {
        found.push(siteKey(file))
      }
    }
    expect(
      found.sort(),
      'a NEW file: route it through the palette, or add a D12 row with a reason. A file that ' +
        'VANISHED: delete its row — a reason kept for a site that no longer exists is how a ' +
        'stale exemption outlives the thing it excused.',
    ).toEqual(Object.keys(ALLOWED).sort())
  })
})
