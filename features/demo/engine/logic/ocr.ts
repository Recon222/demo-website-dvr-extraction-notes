/**
 * CCTV-optimised OCR text cleaning + multi-format timestamp parsing, adapted from the
 * app's text-cleaning-pipeline and timestamp-parser. Cleaning fixes the character slips a
 * DVR-display OCR makes (O→0, l→1, dropped colons) while protecting day/month/meridiem
 * words; the parser reads several common DVR timestamp formats into 'YYYY-MM-DD HH:MM:SS'.
 *
 * `readDvrTimestamp` sits on top of the parser and adds the two judgements the confirmation
 * step has to put in front of a human: MM/DD-vs-DD/MM resolution, and a missing date.
 */

import {
  disambiguateDateFormat,
  needsDisambiguation,
  type DateDisambiguationResult,
} from '@/features/demo/engine/logic/date-disambiguation'

const OCR_CHAR_SUBS: Record<string, string> = {
  O: '0', o: '0', Q: '0', I: '1', l: '1', i: '1', S: '5', s: '5', Z: '2', z: '2', B: '8', G: '6',
}

const OCR_PROTECTED = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  'AM', 'PM',
]

function applyOcrCorrections(text: string): string {
  const saved: { ph: string; original: string }[] = []
  let result = text
  for (const word of OCR_PROTECTED) {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), (m) => {
      const safe = 'ACDEFHJKMNPRTUVWXY'
      const ph = `<<K${safe[saved.length % safe.length]}${saved.length}>>`
      saved.push({ ph, original: m })
      return ph
    })
  }
  for (const [oldC, newC] of Object.entries(OCR_CHAR_SUBS)) result = result.split(oldC).join(newC)
  for (const { ph, original } of saved) result = result.replace(ph, original)
  return result
}

/** CCTV-optimised cleaning: character fixes + space/structure normalisation. */
export function cleanOcrText(raw: string): string {
  if (!raw) return ''
  let t = raw.trim()
  // separate a meridiem from the digits, then tidy spaces before it
  t = t.replace(/(\d)([PApa][A-Za-z]?)\b/g, '$1 $2').replace(/\s+([PApa][A-Za-z]?)\b/g, ' $1')
  // strip stray spaces around time/date separators
  t = t.replace(/(\d)\s+(:)\s*(\d)/g, '$1$2$3').replace(/(\d)\s*(:)\s+(\d)/g, '$1$2$3')
  t = t.replace(/(\d)\s*([-/.])\s*(\d)/g, '$1$2$3').replace(/\s+/g, ' ').trim()
  // OCR character corrections (protected words preserved)
  t = applyOcrCorrections(t)
  // compressed-time colon repair: HHMM:SS and HH:MMSS
  t = t.replace(/(\d{2})(\d{2}):(\d{2})\b/g, (m, hh, mm, ss) =>
    +hh <= 23 && +mm <= 59 && +ss <= 59 ? `${hh}:${mm}:${ss}` : m,
  )
  t = t.replace(/(\d{1,2}):(\d{2})(\d{2})\b/g, (m, h, mm, ss) =>
    +h <= 23 && +mm <= 59 && +ss <= 59 ? `${h}:${mm}:${ss}` : m,
  )
  // '8' misread as a colon
  t = t.replace(/(\d{2})8(\d{2}):(\d{2})/g, '$1:$2:$3').replace(/(\d{2}):(\d{2})8(\d{2})/g, '$1:$2:$3')
  // compressed 8-digit date MMDDYYYY/DDMMYYYY
  t = t.replace(/(\d{2})(\d{2})(20[0-2]\d)\b/g, (m, a, b, y) =>
    +a >= 1 && +a <= 31 && +b >= 1 && +b <= 31 ? `${a}/${b}/${y}` : m,
  )
  return t.trim()
}

function normalizeYear(year: string): string {
  if (year.length === 2) {
    const n = parseInt(year, 10)
    return n <= 50 ? `20${year}` : `19${year}`
  }
  return year
}

function fmtDT(y: string, mo: string, d: string, h: string, mi: string, s = '00'): TimestampParse {
  return { kind: 'datetime', value: `${y}-${mo}-${d} ${h}:${mi}:${s}` }
}

function stripTimezone(text: string): string {
  let c = text.replace(/Z\s*$/i, '')
  c = c.replace(/[+-]\d{2}:?\d{2}\s*$/, '')
  c = c.replace(/\s+(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\s*$/i, '')
  return c.trim()
}

/**
 * What the OCR text actually carried.
 *
 * `time-only` exists because a DVR strip that shows just a clock (`12:05:30`) carries NO date,
 * and inventing one is not a parse — it is a guess that goes on to define a scope boundary.
 * The phone's parser does invent it (`src/features/ocr-time-capture/utils/timestamp-parser.ts`
 * lines 260-266 stamp `new Date()` straight into the result); this port refuses to, so the
 * confirm step can put the assumption in front of the operator (see `readDvrTimestamp`).
 */
export type TimestampParse =
  | { kind: 'datetime'; value: string }
  /** `HH:MM:SS` read off the frame — the frame showed no date. */
  | { kind: 'time-only'; time: string }

/** Parse several common DVR timestamp formats, or null when nothing timestamp-shaped is present. */
export function parseTimestampFromText(text: string): TimestampParse | null {
  const s = stripTimezone(text.replace(/\s+/g, ' ').trim())
  const to24 = (h: string, mer?: string) => {
    let n = parseInt(h, 10)
    const mm = mer ?? ''
    if (/pm/i.test(mm) && n !== 12) n += 12
    else if (/am/i.test(mm) && n === 12) n = 0
    return String(n).padStart(2, '0')
  }
  const p2 = (x?: string) => (x ? x.padStart(2, '0') : '00')
  let m: RegExpMatchArray | null

  // ISO with meridiem
  if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i)))
    return fmtDT(m[1], p2(m[2]), p2(m[3]), to24(m[4], m[7]), m[5], p2(m[6]))
  // ISO
  if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)))
    return fmtDT(m[1], p2(m[2]), p2(m[3]), p2(m[4]), m[5], p2(m[6]))
  // MM/DD/YYYY (no meridiem)
  if ((m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?!\s*(AM|PM))/i)))
    return fmtDT(normalizeYear(m[3]), p2(m[1]), p2(m[2]), p2(m[4]), m[5], p2(m[6]))
  // dash format. AMBIGUOUS when both parts are <= 12: we ASSUME MM-DD (North-American
  // forensic default; seed data is Peel Regional Police). Only a first part that is clearly
  // a day (> 12) forces DD-MM. This is an assumption, not a verified parse — M2's OCR chapter
  // should surface it so a reviewer can correct a transposed date.
  // dash with meridiem
  if ((m = s.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i))) {
    const f = +m[1]
    const se = +m[2]
    const mo = f > 12 && se <= 12 ? p2(m[2]) : p2(m[1])
    const d = f > 12 && se <= 12 ? p2(m[1]) : p2(m[2])
    return fmtDT(normalizeYear(m[3]), mo, d, to24(m[4], m[7]), m[5], p2(m[6]))
  }
  // dash (DD-MM or MM-DD)
  if ((m = s.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/))) {
    const f = +m[1]
    const se = +m[2]
    const mo = f > 12 && se <= 12 ? p2(m[2]) : p2(m[1])
    const d = f > 12 && se <= 12 ? p2(m[1]) : p2(m[2])
    return fmtDT(normalizeYear(m[3]), mo, d, p2(m[4]), m[5], p2(m[6]))
  }
  // MM/DD/YYYY with meridiem
  if ((m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i)))
    return fmtDT(normalizeYear(m[3]), p2(m[1]), p2(m[2]), to24(m[4], m[7]), m[5], p2(m[6]))
  // compressed digits YYYYMMDDHHMMSS / YYMMDDHHMMSS
  if ((m = s.replace(/\D/g, '').match(/(\d{2,4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/))) {
    const mo = +m[2]
    const d = +m[3]
    const h = +m[4]
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 23)
      return fmtDT(normalizeYear(m[1]), m[2], m[3], m[4], m[5], m[6] || '00')
  }
  // time-only HH:MM:SS — reported as such. Resolved (with an operator confirmation) by
  // readDvrTimestamp; this function never fabricates the missing date.
  if ((m = s.match(/^(\d{2}):(\d{2}):(\d{2})$/))) {
    if (+m[1] <= 23 && +m[2] <= 59) return { kind: 'time-only', time: `${m[1]}:${m[2]}:${m[3]}` }
  }
  return null
}

/** A year-first numeric date (`2025-03-08`) — unambiguous by construction, never disambiguated. */
const YEAR_FIRST_DATE = /(?:^|\D)\d{4}[-/]\d{1,2}[-/]\d{1,2}/
/** A year-last numeric date (`06/07/2024`, `13-03-25`) — the only shape that can be ambiguous. */
const YEAR_LAST_DATE = /(?:^|\D)(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?!\d)/

/** Everything the confirmation step needs to show — and to challenge — an OCR read. */
export interface DvrTimestampReading {
  /** The DVR date/time the confirm field is pre-filled with, `'YYYY-MM-DD HH:MM:SS'`. */
  dvrTime: string
  /**
   * Set ONLY when the frame carried a time but no date: the `'YYYY-MM-DD'` that was assumed
   * (today, off `currentTimeMs`) to make `dvrTime` well-formed. Its presence is the confirm
   * step's instruction to block the commit until the operator confirms or corrects the date.
   */
  assumedDate: string | null
  /**
   * Set when the date digits were MM/DD-vs-DD/MM ambiguous. `dvrTime` already carries the
   * resolver's `chosenDate`, so the field and the warning can never disagree.
   */
  ambiguity: DateDisambiguationResult | null
}

/**
 * Read a DVR timestamp out of cleaned OCR text, resolving the two things a bare parse cannot
 * decide on its own:
 *
 *  - **MM/DD vs DD/MM** — delegated verbatim to `disambiguateDateFormat`, gated exactly as the
 *    phone gates it (`text-cleaning-pipeline.ts:2081`: year-last input only, both components
 *    1..12). The resolver's `chosenDate` is written back into `dvrTime`, so the pre-filled field
 *    always matches what `DateDisambiguationWarning` says was chosen.
 *  - **A missing date** — reported through `assumedDate` rather than smuggled into `dvrTime`.
 *
 * Pure: `currentTimeMs` is the only clock input.
 *
 * NOTE (deliberate reuse, see deferred §40): the demo keeps ONE `date-disambiguation` module —
 * the import-side port, which additionally rejects future readings and distrusts proximity for
 * stale years. The phone's OCR feature keeps a proximity-only sibling copy. For a live DVR clock
 * both extra rules land the same way a reviewer would: a month/day swap into the future is not a
 * clock the operator should accept silently, and a years-stale reading is exactly the case where
 * "closer to today" carries no signal. Both produce `confidence: 'low'` → the operator is warned.
 */
export function readDvrTimestamp(text: string, currentTimeMs: number): DvrTimestampReading | null {
  const parse = parseTimestampFromText(text)
  if (!parse) return null

  if (parse.kind === 'time-only') {
    const n = new Date(currentTimeMs)
    const p = (x: number) => String(x).padStart(2, '0')
    const assumedDate = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
    return { dvrTime: `${assumedDate} ${parse.time}`, assumedDate, ambiguity: null }
  }

  const plain = { dvrTime: parse.value, assumedDate: null, ambiguity: null }
  if (YEAR_FIRST_DATE.test(text)) return plain
  const m = text.match(YEAR_LAST_DATE)
  if (!m) return plain
  const first = parseInt(m[1], 10)
  const second = parseInt(m[2], 10)
  if (!needsDisambiguation(first, second)) return plain

  const ambiguity = disambiguateDateFormat(first, second, parseInt(normalizeYear(m[3]), 10), currentTimeMs)
  // parse.value is always 'YYYY-MM-DD HH:MM:SS' — swap the 10-char date, keep the time.
  return { dvrTime: `${ambiguity.chosenDate}${parse.value.slice(10)}`, assumedDate: null, ambiguity }
}

/**
 * Whether the operator's working DVR date/time may be committed.
 *
 * Two conditions, both forensic rather than cosmetic:
 *  - there has to be a value at all (the phone gates its Confirm the same way,
 *    `ConfirmationScreen.tsx:312`);
 *  - if the read carried no date, the assumption has to have been dealt with — either
 *    explicitly confirmed, or corrected by editing the date away from it. Editing IS the
 *    correction, so it releases the gate on its own; an operator who has typed the real date
 *    should not also have to tap "confirm", or the gate becomes something to dismiss.
 *
 * Lives here, not in the screen, so the bridge can refuse the same commit the button disables —
 * a gate enforced only by a disabled button is enforced only by the UI.
 */
export function isDvrDraftCommittable(draft: string, assumedDate: string | null, dateConfirmed: boolean): boolean {
  if (!draft) return false
  if (assumedDate === null || dateConfirmed) return true
  return draft.slice(0, 10) !== assumedDate
}

export interface ConfidenceTier {
  level: 'high' | 'medium' | 'low' | 'fail'
  message: string
  color: string
}

export function getConfidenceLevel(confidence: number): ConfidenceTier {
  if (confidence >= 0.8) return { level: 'high', message: 'High confidence — result looks good', color: '#10d177' }
  if (confidence >= 0.6) return { level: 'medium', message: 'Medium confidence — please verify', color: '#ffd93d' }
  if (confidence >= 0.4) return { level: 'low', message: 'Low confidence — manual correction likely needed', color: '#ff7a45' }
  return { level: 'fail', message: 'OCR failed — please enter manually', color: '#ff4757' }
}
