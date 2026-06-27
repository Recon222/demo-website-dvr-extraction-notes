/**
 * AI field-extraction prompt + parsing + form mapping, ported from the app's PDF-import
 * feature. The demo does not call a live model — the import chapter resolves to
 * `SAMPLE_EXTRACTION` — but `parseAiJson`/`mapAiToForm` are the app's real logic, run
 * verbatim so the mapping the visitor sees is the genuine one.
 */

// ============================================================================
// AI FIELD EXTRACTION — verbatim from extract-fields-prompt.ts
// ============================================================================
export const EXTRACT_FIELDS_SYSTEM_PROMPT = `You read CCTV/DVR recovery requests — formal forms or casual emails from detectives — and extract them into a JSON record. Different agencies use different labels: "Occurrence #", "OCC #", "Case #", "File #" all mean the same thing.

# CORE RULES

Extract every value exactly as written. If a field is not stated, use "" (or [] for extractionTimeFrames). Do not reformat. Do not invent anything missing — no added years on year-less dates, no added street suffixes, no added model numbers. Ignore page headers, footers, and "Generated:" timestamps — they are not data. Better blank than guessed.

Keep values complete. Do not strip qualifying words from a value — a retention of "35 days" stays "35 days", not "35"; a camera list of "cameras 1 through 4" stays "cameras 1 through 4", not "1 through 4".

# FIELDS

- occurrenceNumber: case / occurrence / file / incident number.
- offenceType: category of crime if stated.
- requestingOfficerName: officer's name ONLY. No badge digits, no title prefix, no unit.
- badgeNumber: digits only.
- requestingPhone, requestingEmail: officer's contact info, exactly as written.
- businessName: the store / restaurant / business at the recovery location.
- locationAddress: street address only — not the business, not the city.
- city: city name.
- locationContactName: on-site coordinator (manager, owner, security).
- locationContactPhone: their phone.
- dvrMakeModel: brand name, optionally followed by a model number, exactly as written.
- dvrRetention: how long the DVR keeps footage before overwriting, including the unit.
- hasVideoMonitor: "Yes", "No", or "".
- dvrUsername, dvrPassword: DVR login credentials.
- extractionTimeFrames: array of time ranges. Each entry has extractionStartTime,
  extractionEndTime, timePeriodType ("Actual Time" or "DVR Time"), and cameraDetails.

# OUTPUT

Respond with the JSON shape only. No code fences. No explanatory text. JSON only.`

// ============================================================================
// TYPES
// ============================================================================
export interface ExtractionTimeFrame {
  extractionStartTime: string
  extractionEndTime: string
  /** "Actual Time" | "DVR Time" */
  timePeriodType: string
  cameraDetails: string
}

export interface ExtractedFields {
  occurrenceNumber: string
  offenceType: string
  requestingOfficerName: string
  badgeNumber: string
  requestingPhone: string
  requestingEmail: string
  businessName: string
  locationAddress: string
  city: string
  locationContactName: string
  locationContactPhone: string
  dvrMakeModel: string
  dvrRetention: string
  hasVideoMonitor: string
  dvrUsername: string
  dvrPassword: string
  extractionTimeFrames: ExtractionTimeFrame[]
}

export interface ImportTimeFrame {
  startDateTime: string
  endDateTime: string
  isActualTime: boolean
  cameras: string
}

export interface ImportPatch {
  offenceType: string
  dvrTypeBrand: string
  totalDvrRetention: string
  hasVideoMonitor: string
  dvrUsername: string
  dvrPassword: string
  timeFrames: ImportTimeFrame[]
}

export interface MappedImport {
  requesterName: string
  requesterBadgeNumber: string
  requesterPhone: string
  requesterEmail: string
  businessName: string
  streetAddress: string
  city: string
  locationContact: string
  locationPhone: string
  _import: ImportPatch
}

// ============================================================================
// SANITISE + PROMPT BUILD — verbatim
// ============================================================================
/** Anti-injection: scrub the document envelope markers from input. */
export function sanitizeInputText(text: unknown): string {
  const str =
    typeof text !== 'string'
      ? typeof text === 'object' && text !== null
        ? JSON.stringify(text)
        : String(text)
      : text
  return str
    .replace(/---BEGIN DOCUMENT---/gi, '[MARKER-REMOVED]')
    .replace(/---END DOCUMENT---/gi, '[MARKER-REMOVED]')
}

/** Wrap the document in the BEGIN/END envelope. */
export function buildExtractFieldsUserPrompt(rawText: unknown): string {
  const sanitized = sanitizeInputText(rawText)
  return `---BEGIN DOCUMENT---\n${sanitized}\n---END DOCUMENT---`
}

// ============================================================================
// PARSE + MAP — verbatim
// ============================================================================
/**
 * Robustly parse the model's JSON reply: strip code fences, then slice from the first
 * "{" to the last "}" before JSON.parse.
 */
export function parseAiJson(text: string): ExtractedFields {
  if (!text || typeof text !== 'string') throw new Error('Empty AI response')
  let s = text.trim()
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first === -1 || last === -1 || last < first) {
    throw new Error('No JSON object found in AI response')
  }
  return JSON.parse(s.slice(first, last + 1)) as ExtractedFields
}

/**
 * Map the validated AI output onto the app's flat form state. `occurrenceNumber` is
 * intentionally NOT mapped — in the real app it is injected from the selected case (the
 * model consistently misreads letterheads), so the demo keeps the case's own number.
 */
export function mapAiToForm(ai: Partial<ExtractedFields>): MappedImport {
  const a = ai || {}
  const tf = Array.isArray(a.extractionTimeFrames) ? a.extractionTimeFrames : []
  return {
    requesterName: a.requestingOfficerName || '',
    requesterBadgeNumber: a.badgeNumber || '',
    requesterPhone: a.requestingPhone || '',
    requesterEmail: a.requestingEmail || '',
    businessName: a.businessName || '',
    streetAddress: a.locationAddress || '',
    city: a.city || '',
    locationContact: a.locationContactName || '',
    locationPhone: a.locationContactPhone || '',
    _import: {
      offenceType: a.offenceType || '',
      dvrTypeBrand: a.dvrMakeModel || '',
      totalDvrRetention: a.dvrRetention || '',
      hasVideoMonitor: a.hasVideoMonitor || '',
      dvrUsername: a.dvrUsername || '',
      dvrPassword: a.dvrPassword || '',
      timeFrames: tf.map((t) => ({
        startDateTime: t.extractionStartTime || '',
        endDateTime: t.extractionEndTime || '',
        isActualTime: (t.timePeriodType || 'Actual Time') !== 'DVR Time',
        cameras: t.cameraDetails || '',
      })),
    },
  }
}

// ============================================================================
// FORM OPTIONS + SAMPLE — for the later wizard screens / the demo's import chapter
// ============================================================================
export const FORM_OPTIONS = {
  exportMedia: ['USB Drive', 'External Hard Drive', 'DVD', 'Cloud Upload', 'Network Transfer', 'Other'],
  fileType: ['MP4', 'AVI', 'MOV', 'MKV', 'Proprietary', 'Other'],
  mediaProvided: ['Hand Delivered', 'Mailed', 'Left with Contact', 'Electronic Transfer', 'Other'],
  resolution: ['352x240', '704x480', '960x480', '1280x720', '1920x1080', '2560x1440', '3840x2160', 'custom'],
  fps: ['1', '5', '10', '15', '20', '25', '30', 'custom'],
} as const

/** Deterministic extraction of `SAMPLE_REQUEST_DOC` — the demo doesn't call a real model. */
export const SAMPLE_EXTRACTION: ExtractedFields = {
  occurrenceNumber: 'PR25-0098213',
  offenceType: 'Break & enter',
  requestingOfficerName: 'Liam McHugh',
  badgeNumber: '4471',
  requestingPhone: '',
  requestingEmail: 'det.mchugh.4471@peelpolice.ca',
  businessName: "Kim's Convenience",
  locationAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  locationContactName: 'Sandeep Gill',
  locationContactPhone: '905-555-0142',
  dvrMakeModel: 'Hikvision DS-7608',
  dvrRetention: '35 days',
  hasVideoMonitor: 'Yes',
  dvrUsername: 'admin',
  dvrPassword: 'Sp1ce2024',
  extractionTimeFrames: [
    {
      extractionStartTime: '11:45 PM on March 8 2025',
      extractionEndTime: '1:30 AM on March 9 2025',
      timePeriodType: 'Actual Time',
      cameraDetails: 'cameras 3, 4 and 7',
    },
  ],
}
