import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

/**
 * SEAM(U7.3) — **A93, THE EM-DASH RULE**, as a repo-wide guard.
 *
 * The rule, from the phone campaign's owner ruling
 * (`docs/plans/ui-consistency/02-ui-consistency-owner-rulings.md:188`), verbatim:
 *
 *   *"**Standing rule (all user-facing copy, campaign-wide and beyond): no em dashes.** The
 *   owner considers them an AI-copy tell; use periods, commas, or parentheses. Data-glyph
 *   placeholders (a lone dash meaning no value) are exempt. A repo-wide sweep of existing copy
 *   is deferred to a future pass."*
 *
 * The demo IS that deferred pass, for the demo's own copy. Plan §4.3 restates the rule and the
 * U7.3 row makes the sweep and this test its deliverable.
 *
 * ---
 *
 * ## REFUTATION 1 — the census is not two sites. It is 120 lines.
 *
 * Matrix A93's Demo-state column says *"**Two demo-only sites**, both user-facing:
 * `chrome/DemoErrorBoundary.tsx` ... and `chrome/PdfPreview.tsx`"*, and its correction block
 * concludes *"the demo's only real violations are in **demo-only** copy the phone never wrote"*.
 * Measured at this branch point, comments stripped, over every `.ts`/`.tsx` under `ui/`
 * excluding `__tests__`: **120 lines**, across 39 files. The row's own sizing was written
 * against a census two orders of magnitude short.
 *
 * ## REFUTATION 2 — the phone is not clean either, and that changes what "sweep" can mean
 *
 * A93 says *"Three surviving phone em dashes are all agency-cloud, out of scope both sides"*,
 * and `phone-ui-delta-inventory.md:13301-13304` names those three. The same scan over the
 * phone's `src/` at `dd5551ec` returns **82 lines**, and several are rendered copy the demo
 * ports byte-for-byte:
 *
 *   `ImportPickerModal.tsx:920`          = the demo's `PickerStage.tsx` pasteTextDescription
 *   `ImportPickerModal.tsx:721`          ~ the demo's `PasteStage.tsx` hint (D5-adapted)
 *   `SectionBlock.tsx:283`               = the demo's `NotesScreen.tsx` stale caption
 *   `NotesSectionEditor.tsx:212`         = the demo's `NotesScreen.tsx` restore banner
 *   `FormCustomizationSection.tsx:187`   = the demo's `FormFieldsPane.tsx` footnote
 *   `CloudSyncSettingsSection.tsx:128`   = the demo's `CloudSyncPane.tsx` description
 *
 * So A93's premise is inverted: the demo's violations are NOT all demo-only, and six of them
 * are the plan's OWN §4.1 rule 7 ("lift copy verbatim") in force.
 *
 * ## THE RULING THIS ENCODES, and why it is not the implementer's invention
 *
 * `phone-ui-delta-inventory.md:13300` settles the conflict in the inventory's own words:
 * *"**Em dashes that SURVIVE** (do not 'fix' them in the demo without an owner call — they are
 * still in the phone strings at `main`)"*. It names only the three agency-cloud strings because
 * that is all its author had found; the instruction is general and applies to every phone-verbatim
 * string the same evidence covers. So:
 *
 *   **SWEEP**  — demo-ORIGINATED user-facing copy. The phone never wrote it, so no parity claim
 *                is at stake and the owner's product rule governs alone. This is the great bulk.
 *   **FREEZE** — copy that is byte-verbatim from a phone string which STILL carries the em dash
 *                at `dd5551ec`. Rewriting it would break §4.1 rule 7 and manufacture NEW
 *                demo/phone copy drift inside a parity port. Each is named below with its phone
 *                `file:line`, and the un-defer trigger is the owner call the inventory demands.
 *   **EXEMPT** — data-glyph placeholders (the rule's own carve-out) and developer console
 *                diagnostics. The latter is not a judgement call: the rule's scope is stated
 *                four times as "user-facing" / "all user-facing copy", the phone left its own
 *                `[MediaUpload]` and `[SupabaseConfig]` console strings em-dashed at `main`, and
 *                a PR-122 review adjudication dropped an added em dash *because* it was not
 *                rendered ("the ruling governs user-facing copy. Filing it would be noise").
 *
 * ## MECHANISM
 *
 * Comments are stripped, then every `console.<method>( … )` call is removed by matching parens —
 * not by a line heuristic, because four of these calls are multi-line concatenations
 * (`motion.ts`, `phone-overlay.tsx`, `BootSequence.tsx` x2) and a line-scoped rule would let a
 * rendered string on a continuation line through.
 *
 * The FROZEN list is keyed by file AND by the exact string, and every entry must still be
 * present: a frozen string that is edited or deleted reds here, so the list cannot rot into a
 * blanket exemption for a file. That is the dead-exemption half.
 */

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')
const EM_DASH = '—'

/**
 * Phone-verbatim strings whose phone original still carries the em dash at `dd5551ec`.
 * FROZEN pending the owner call `phone-ui-delta-inventory.md:13300` requires. Value = the phone
 * source that makes it verbatim.
 */
const FROZEN_PHONE_VERBATIM: Readonly<Record<string, ReadonlyArray<readonly [text: string, phone: string]>>> = {
  'screens/import/PickerStage.tsx': [
    [
      `Paste a request email or notes ${EM_DASH} AI fills the form`,
      'ImportPickerModal.tsx:920 — byte-identical',
    ],
  ],
  'screens/import/PasteStage.tsx': [
    [
      `Paste the recovery request ${EM_DASH} an email, form text, or notes.`,
      'ImportPickerModal.tsx:721 — the demo swaps "The on-device AI" for "The AI" (D5, never claim on-device); the clause with the dash is verbatim',
    ],
  ],
  'screens/NotesScreen.tsx': [
    [`SOURCE DATA CHANGED ${EM_DASH} AUTO-GENERATED WOULD NOW READ`, 'SectionBlock.tsx:283 — byte-identical'],
    [`Auto-generation is off ${EM_DASH} restore anytime`, 'NotesSectionEditor.tsx:212 — byte-identical'],
  ],
  'screens/settings/panes/FormFieldsPane.tsx': [
    [
      `Hidden screens are removed from the wizard flow only ${EM_DASH} any data already entered is still saved`,
      'FormCustomizationSection.tsx:187 — byte-identical through the clause',
    ],
  ],
  'screens/settings/panes/CloudSyncPane.tsx': [
    [`the database ${EM_DASH} nothing is shared with anyone else.`, 'CloudSyncSettingsSection.tsx:128 — byte-identical'],
  ],
}

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

/** Block then line comments, replaced by spaces so every line number survives. */
const stripComments = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))

/**
 * Blank out every `console.<method>( … )` call, parens matched. Developer diagnostics are not
 * user-facing copy (see the docblock); a line-scoped rule would miss the four multi-line ones.
 */
function stripConsoleCalls(text: string): string {
  // `text.split('')`, not `[...text]`: `tsconfig.json` targets es5 without `downlevelIteration`,
  // so spreading a string is a compile error here. Splitting by UTF-16 code unit is also the
  // CORRECT unit for this job — `m.index` from the regex is code-unit based, and blanking a
  // surrogate pair as two spaces keeps every later index and line number exact.
  const chars = text.split('')
  const re = /console\.\w+\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let depth = 0
    let quote: string | null = null
    for (let i = m.index + m[0].length - 1; i < chars.length; i++) {
      const c = chars[i]
      if (quote !== null) {
        // Inside a string: only an unescaped matching quote ends it, and a backslash eats the
        // next unit. Parens in here are DATA and must not move `depth`.
        if (c === '\\') {
          if (chars[i] !== '\n') chars[i] = ' '
          i++
          if (i < chars.length && chars[i] !== '\n') chars[i] = ' '
          continue
        }
        if (c === quote) quote = null
      } else if (c === "'" || c === '"' || c === '`') {
        quote = c
      } else if (c === '(') depth++
      else if (c === ')') {
        depth--
        if (depth === 0) break
      }
      if (chars[i] !== '\n') chars[i] = ' '
    }
  }
  return chars.join('')
}

/**
 * A data-glyph placeholder: the em dash is the WHOLE string literal. The phone's own idiom —
 * `format-coordinates.ts:51` (`COORDINATES_SENTINEL = '—'`), `ImportResultBody.tsx:165` and
 * `pdf-import-orchestrator.ts:887` (`?? '—'`). Exempt by the rule's own text.
 */
const isDataGlyph = (line: string, index: number): boolean => {
  const before = line[index - 1]
  const after = line[index + 1]
  return (before === "'" || before === '"' || before === '`') && before === after
}

/**
 * Does a FROZEN string's span cover the em dash at `at`? Every occurrence is checked, because a
 * frozen string can legitimately appear twice on one line and only one of them may be the one
 * carrying this dash.
 */
function coversOccurrence(line: string, text: string, at: number): boolean {
  for (let s = line.indexOf(text); s !== -1; s = line.indexOf(text, s + 1)) {
    if (at >= s && at < s + text.length) return true
  }
  return false
}

interface Offender {
  file: string
  line: number
  text: string
}

function scan(): Offender[] {
  const out: Offender[] = []
  for (const full of sourceFiles(UI_ROOT)) {
    const file = full.slice(UI_ROOT.length + 1).split(sep).join('/')
    const frozen = FROZEN_PHONE_VERBATIM[file] ?? []
    const cleaned = stripConsoleCalls(stripComments(readFileSync(full, 'utf8')))
    cleaned.split('\n').forEach((line, i) => {
      for (let at = line.indexOf(EM_DASH); at !== -1; at = line.indexOf(EM_DASH, at + 1)) {
        if (isDataGlyph(line, at)) continue
        // F57 — the exemption is keyed by STRING, so it must be checked at the OCCURRENCE, not
        // at the line. `line.includes(text)` excused every em dash sharing a line with a frozen
        // one, which is the third recurrence of the exemption-broader-than-its-reason class
        // (F32 file-for-role, F33 line-for-arm, this line-for-string). The dash must fall INSIDE
        // the frozen string's own span to be covered by it.
        if (frozen.some(([text]) => coversOccurrence(line, text, at))) continue
        out.push({ file, line: i + 1, text: line.trim() })
      }
    })
  }
  return out
}

describe('A93 — no em dashes in user-facing copy', () => {
  it('carries none anywhere under `ui/`, outside the two named exemptions', () => {
    expect(
      scan(),
      'the standing rule (owner, phone `02-ui-consistency-owner-rulings.md:188`) bans em dashes ' +
        'in every string the demo renders. Use a period, a comma, a colon or parentheses. If the ' +
        'string is lifted verbatim from a phone string that STILL has the dash at `main`, add it ' +
        'to FROZEN_PHONE_VERBATIM with its phone file:line instead — see the docblock.',
    ).toEqual([])
  })

  it('keeps every FROZEN entry live — a stale exemption is a silent blanket exemption', () => {
    // The dead-exemption half. If a frozen string is edited or deleted, its row must go too;
    // otherwise the file quietly carries a permanent pass for a string that no longer exists.
    for (const [file, entries] of Object.entries(FROZEN_PHONE_VERBATIM)) {
      const text = stripComments(readFileSync(join(UI_ROOT, ...file.split('/')), 'utf8'))
      for (const [needle, phone] of entries) {
        expect(
          text.includes(needle),
          `${file} no longer contains the frozen string "${needle}" (${phone}) — delete its row`,
        ).toBe(true)
      }
    }
  })

  it('exempts the data glyph, and ONLY when it is the whole string', () => {
    // The carve-out is "a lone dash meaning no value", not "a line containing a lone dash".
    expect(isDataGlyph(`x ?? '${EM_DASH}'`, 6)).toBe(true)
    expect(isDataGlyph(`'a ${EM_DASH} b'`, 4)).toBe(false)
  })

  it('blanks console calls whole, including the multi-line concatenations', () => {
    const src = ["console.warn(", `  'a ${EM_DASH} b' +`, `  'c ${EM_DASH} d',`, ')', `const shown = 'e ${EM_DASH} f'`].join('\n')
    const cleaned = stripConsoleCalls(src)
    expect(cleaned).not.toContain(`a ${EM_DASH} b`)
    expect(cleaned).not.toContain(`c ${EM_DASH} d`)
    // ...and stops at the closing paren rather than eating the rest of the file.
    expect(cleaned).toContain(`e ${EM_DASH} f`)
    // Line numbers survive, so an offender's reported line is the real one.
    expect(cleaned.split('\n')).toHaveLength(5)
  })

  /**
   * F56 — the guard used to FAIL OPEN on one unbalanced paren inside a console string. A
   * paren-depth counter that cannot see quotes never closes on `'oops ('`, so it blanked to the
   * next stray `)` (or to end-of-file) and every rendered string after it was silently exempt.
   * Latent when it was found — no such string existed — which is exactly the shape that ships.
   */
  it('treats a paren INSIDE a console string as data, so later rendered copy is still scanned', () => {
    const src = [`console.warn('unbalanced ( inside a string')`, `const shown = 'x ${EM_DASH} y'`].join('\n')
    const cleaned = stripConsoleCalls(src)
    expect(cleaned).not.toContain('unbalanced')
    expect(cleaned, 'the blanker ran past its own call and exempted the rest of the file').toContain(`x ${EM_DASH} y`)
  })

  it('honours backslash escapes, so an escaped quote does not end the string early', () => {
    // Without the escape arm, `\'` closes the run, the following `(` counts as structure, and
    // the blanker overshoots again — the same fail-open by a different door.
    const src = [`console.warn('it\\'s ( fine')`, `const shown = 'p ${EM_DASH} q'`].join('\n')
    const cleaned = stripConsoleCalls(src)
    expect(cleaned).toContain(`p ${EM_DASH} q`)
  })

  /**
   * F57 — the FROZEN exemption is keyed by STRING and must be checked at the OCCURRENCE. Applied
   * per LINE it excused any NEW violation that happened to share a line with a frozen one.
   */
  it('covers only the em dash inside a frozen string, not its line-mates', () => {
    const frozen = `Auto-generation is off ${EM_DASH} restore anytime`
    const line = `  const a = '${frozen}', b = 'brand new ${EM_DASH} violation'`
    expect(coversOccurrence(line, frozen, line.indexOf(EM_DASH))).toBe(true)
    expect(coversOccurrence(line, frozen, line.lastIndexOf(EM_DASH))).toBe(false)
  })
})
