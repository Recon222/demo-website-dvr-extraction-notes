/**
 * CCTV-optimised OCR text cleaning + multi-format timestamp parsing, adapted from the
 * app's text-cleaning-pipeline and timestamp-parser. Cleaning fixes the character slips a
 * DVR-display OCR makes (O→0, l→1, dropped colons) while protecting day/month/meridiem
 * words; the parser reads several common DVR timestamp formats into 'YYYY-MM-DD HH:MM:SS'.
 */

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

function fmtDT(y: string, mo: string, d: string, h: string, mi: string, s = '00'): string {
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`
}

function stripTimezone(text: string): string {
  let c = text.replace(/Z\s*$/i, '')
  c = c.replace(/[+-]\d{2}:?\d{2}\s*$/, '')
  c = c.replace(/\s+(UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT)\s*$/i, '')
  return c.trim()
}

/** Parse several common DVR timestamp formats → 'YYYY-MM-DD HH:MM:SS', or null. */
export function parseTimestampFromText(text: string): string | null {
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
  // dash with meridiem (DD-MM or MM-DD)
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
  // time-only HH:MM:SS → today's date
  if ((m = s.match(/^(\d{2}):(\d{2}):(\d{2})$/))) {
    if (+m[1] <= 23 && +m[2] <= 59) {
      const n = new Date()
      const p = (x: number) => String(x).padStart(2, '0')
      return fmtDT(String(n.getFullYear()), p(n.getMonth() + 1), p(n.getDate()), m[1], m[2], m[3])
    }
  }
  return null
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
