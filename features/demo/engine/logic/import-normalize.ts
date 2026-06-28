/**
 * Deterministic post-processing for the model's loose JSON reply — ported from the phone
 * app's pdf-import normalization layer (null / phone / enums / officer + the date pipeline:
 * datetime-normalize, MM/DD-vs-DD/MM disambiguation, year-hallucination correction). Pure
 * functions, no AI / DOM / fetch. Every correction is recorded as an auditable `ImportWarning`.
 *
 * Time-frame start/end are normalized HERE to the canonical "YYYY-MM-DD HH:MM[:SS]" so the
 * scope pickers, time-offset math, and retention can consume imported dates directly. The
 * date modules are clock-injected (currentTimeMs) and need the source document text for the
 * year cold-case guard — both flow in via NormalizeOptions.
 */

import {
  parseAiJson,
  mapAiToForm,
  type ExtractedFields,
  type ExtractionTimeFrame,
  type MappedImport,
} from '@/features/demo/engine/logic/import'
import { normalizeDateTime } from '@/features/demo/engine/logic/datetime-normalize'
import { disambiguateHallucinatedYear } from '@/features/demo/engine/logic/year-disambiguation'

export interface ImportWarning {
  field: string
  originalValue: string
  normalizedValue: string
  reason: string
  /** Discriminates date-pipeline warnings (officer/phone/enum/null warnings leave it undefined). */
  kind?: 'datetime' | 'year_correction'
}

/** Clock + source text for the date pipeline. */
export interface NormalizeOptions {
  /** Reference "today" for proximity disambiguation. Defaults to Date.now(); tests inject. */
  currentTimeMs?: number
  /** The source document the reply came from — used by the year cold-case guard. */
  sourceText?: string
}

// ============================================================================
// NULL COERCION — ported from normalize-null.ts
// ============================================================================
const NULL_INDICATORS: ReadonlySet<string> = new Set([
  '', 'null', 'n/a', 'na', 'none', 'not specified', 'not provided', 'unknown', 'undefined',
  '-', '--', '---',
])

export function isNullValue(value: string): boolean {
  return NULL_INDICATORS.has(value.trim().toLowerCase())
}

export function coerceField(value: string): string {
  const trimmed = value.trim()
  return isNullValue(trimmed) ? '' : trimmed
}

// ============================================================================
// PHONE — ported from normalize-phone.ts
// ============================================================================
export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  let digits = trimmed.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }
  return trimmed // non-standard length → preserve, don't corrupt
}

// ============================================================================
// ENUMS — ported from normalize-enums.ts
// ============================================================================
const TIME_PERIOD_TYPE_MAP: Readonly<Record<string, 'Actual Time' | 'DVR Time'>> = {
  'actual time': 'Actual Time', 'real time': 'Actual Time', 'real-time': 'Actual Time',
  'wall clock': 'Actual Time', 'wall clock time': 'Actual Time', live: 'Actual Time', actual: 'Actual Time',
  'dvr time': 'DVR Time', 'recorder time': 'DVR Time', 'system time': 'DVR Time', dvr: 'DVR Time',
}

export function normalizeTimePeriodType(value: string): 'Actual Time' | 'DVR Time' {
  return TIME_PERIOD_TYPE_MAP[value.trim().toLowerCase()] ?? 'Actual Time'
}

const YES_NO_MAP: Readonly<Record<string, 'Yes' | 'No'>> = {
  yes: 'Yes', y: 'Yes', true: 'Yes',
  no: 'No', n: 'No', false: 'No',
}

/** "Yes" | "No" | "" ('' = not provided; the demo's field is a plain string). */
export function normalizeYesNo(value: string): 'Yes' | 'No' | '' {
  return YES_NO_MAP[value.trim().toLowerCase()] ?? ''
}

// ============================================================================
// OFFICER / BADGE — ported from normalize-officer.ts
// ============================================================================
const BADGE_PATTERNS: readonly RegExp[] = [
  /\bBadge\s*#\s*(\d+)/i,
  /\bBadge:\s*(\d+)/i,
  /\bBadge\s+(\d+)/i,
  /#\s*(\d+)/,
]

function extractBadgeFromName(name: string): { badge: string; cleanedName: string } | null {
  for (const pattern of BADGE_PATTERNS) {
    const match = name.match(pattern)
    if (match && match[1]) {
      const cleanedName = name.replace(match[0], '').replace(/[,\s]+$/, '').replace(/^\s+/, '').trim()
      return { badge: match[1], cleanedName }
    }
  }
  return null
}

function extractBadgeFromEmail(email: string): string | null {
  const trimmed = email.trim()
  const at = trimmed.indexOf('@')
  if (at <= 0) return null
  const local = trimmed.slice(0, at)
  return /^\d+$/.test(local) ? local : null
}

export function normalizeOfficerFields(
  rName: string,
  badge: string,
  email: string,
): { rName: string; badge: string; warnings: ImportWarning[] } {
  const warnings: ImportWarning[] = []
  let cleanedName = rName.trim()
  let resolvedBadge = badge.trim()

  const nameExtraction = extractBadgeFromName(cleanedName)
  if (nameExtraction) {
    cleanedName = nameExtraction.cleanedName
    if (!resolvedBadge) {
      resolvedBadge = nameExtraction.badge
      warnings.push({ field: 'badgeNumber', originalValue: badge, normalizedValue: resolvedBadge, reason: `Extracted badge "${resolvedBadge}" from officer name "${rName.trim()}"` })
      warnings.push({ field: 'requestingOfficerName', originalValue: rName.trim(), normalizedValue: cleanedName, reason: 'Removed badge number from officer name' })
    } else if (resolvedBadge !== nameExtraction.badge) {
      warnings.push({ field: 'badgeNumber', originalValue: resolvedBadge, normalizedValue: resolvedBadge, reason: `Badge in name "${nameExtraction.badge}" differs from provided badge "${resolvedBadge}"; kept provided value` })
      warnings.push({ field: 'requestingOfficerName', originalValue: rName.trim(), normalizedValue: cleanedName, reason: 'Removed badge number from officer name' })
    } else {
      warnings.push({ field: 'requestingOfficerName', originalValue: rName.trim(), normalizedValue: cleanedName, reason: 'Removed duplicate badge number from officer name' })
    }
  }

  if (!resolvedBadge) {
    const emailBadge = extractBadgeFromEmail(email)
    if (emailBadge) {
      resolvedBadge = emailBadge
      warnings.push({ field: 'badgeNumber', originalValue: badge, normalizedValue: resolvedBadge, reason: `Extracted badge "${resolvedBadge}" from email local-part "${email.trim()}"` })
    }
  }

  return { rName: cleanedName, badge: resolvedBadge, warnings }
}

// ============================================================================
// FULL NORMALIZATION + TRANSFORM
// ============================================================================
function normPhone(value: string, field: string, warnings: ImportWarning[]): string {
  const coerced = coerceField(value)
  if (!coerced) return ''
  const normalized = normalizePhoneNumber(coerced)
  if (normalized !== coerced) {
    warnings.push({ field, originalValue: value, normalizedValue: normalized, reason: `Formatted phone "${coerced}" to "${normalized}"` })
  }
  return normalized
}

function normMonitor(value: string, warnings: ImportWarning[]): string {
  const trimmed = (value ?? '').trim()
  const normalized = normalizeYesNo(trimmed)
  if (trimmed !== '' && normalized !== trimmed) {
    warnings.push({ field: 'hasVideoMonitor', originalValue: value, normalizedValue: normalized || '(removed)', reason: normalized ? `Mapped "${trimmed}" to "${normalized}"` : `Coerced "${trimmed}" to blank (not a Yes/No value)` })
  }
  return normalized
}

/**
 * Normalize one time-frame field: parse to canonical "YYYY-MM-DD HH:MM[:SS]", then correct a
 * hallucinated year. Pushes auditable warnings for any transformation. (Mirrors the phone's
 * normalizeTimeFrames + applyYearDisambiguation.)
 */
function normalizeFrameTime(raw: string, fieldLabel: string, currentTimeMs: number, sourceText: string, warnings: ImportWarning[]): string {
  const dt = normalizeDateTime(raw, currentTimeMs)
  if (dt.warning) {
    warnings.push({ field: fieldLabel, originalValue: raw, normalizedValue: dt.normalized, reason: dt.warning, kind: 'datetime' })
  }
  const yr = disambiguateHallucinatedYear(dt.normalized, sourceText, currentTimeMs)
  if (yr.reason === 'ai_year_implausibly_old' || yr.reason === 'ai_year_implausibly_future') {
    warnings.push({ field: fieldLabel, originalValue: yr.aiOriginalDate, normalizedValue: yr.chosenDate, reason: `Corrected year ${yr.aiOriginalYear} → ${yr.chosenYear} by proximity to today; please verify.`, kind: 'year_correction' })
    return yr.chosenDate
  }
  return dt.normalized
}

/**
 * Clean a Partial<ExtractedFields> into a full ExtractedFields + warnings. Time-frame start/end
 * are normalized to canonical "YYYY-MM-DD HH:MM[:SS]" via the date pipeline (clock + source text
 * from `opts`); the scope screen only offers manual edit afterward.
 */
export function normalizeExtractedFields(ai: Partial<ExtractedFields>, opts: NormalizeOptions = {}): { fields: ExtractedFields; warnings: ImportWarning[] } {
  const a = ai || {}
  const currentTimeMs = opts.currentTimeMs ?? Date.now()
  const sourceText = opts.sourceText ?? ''
  const warnings: ImportWarning[] = []

  const officer = normalizeOfficerFields(
    coerceField(a.requestingOfficerName || ''),
    coerceField(a.badgeNumber || ''),
    coerceField(a.requestingEmail || ''),
  )
  warnings.push(...officer.warnings)

  const frames: ExtractionTimeFrame[] = (Array.isArray(a.extractionTimeFrames) ? a.extractionTimeFrames : []).map((t, i) => {
    const rawType = String(t?.timePeriodType ?? '').trim()
    const type = normalizeTimePeriodType(rawType)
    if (rawType && type !== rawType) {
      warnings.push({ field: 'timePeriodType', originalValue: rawType, normalizedValue: type, reason: `Mapped "${rawType}" to "${type}"` })
    }
    return {
      extractionStartTime: normalizeFrameTime(String(t?.extractionStartTime ?? ''), `timeFrames[${i}].start`, currentTimeMs, sourceText, warnings),
      extractionEndTime: normalizeFrameTime(String(t?.extractionEndTime ?? ''), `timeFrames[${i}].end`, currentTimeMs, sourceText, warnings),
      timePeriodType: type,
      cameraDetails: coerceField(t?.cameraDetails || ''),
    }
  })

  const fields: ExtractedFields = {
    occurrenceNumber: coerceField(a.occurrenceNumber || ''),
    offenceType: coerceField(a.offenceType || ''),
    requestingOfficerName: officer.rName,
    badgeNumber: officer.badge,
    requestingPhone: normPhone(a.requestingPhone || '', 'requestingPhone', warnings),
    requestingEmail: coerceField(a.requestingEmail || ''),
    businessName: coerceField(a.businessName || ''),
    locationAddress: coerceField(a.locationAddress || ''),
    city: coerceField(a.city || ''),
    locationContactName: coerceField(a.locationContactName || ''),
    locationContactPhone: normPhone(a.locationContactPhone || '', 'locationContactPhone', warnings),
    dvrMakeModel: coerceField(a.dvrMakeModel || ''),
    dvrRetention: coerceField(a.dvrRetention || ''),
    hasVideoMonitor: normMonitor(a.hasVideoMonitor || '', warnings),
    dvrUsername: coerceField(a.dvrUsername || ''),
    dvrPassword: coerceField(a.dvrPassword || ''),
    extractionTimeFrames: frames,
  }

  return { fields, warnings }
}

export interface ImportTransform {
  patch: MappedImport
  warnings: ImportWarning[]
  fieldCount: number
  timeFrameCount: number
}

/** parseAiJson → normalizeExtractedFields → mapAiToForm. Pure. Throws only if no JSON object. */
export function parseNormalizeMap(rawText: string, opts: NormalizeOptions = {}): ImportTransform {
  const parsed = parseAiJson(rawText) // throws on no-JSON
  const { fields, warnings } = normalizeExtractedFields(parsed, opts)
  const patch = mapAiToForm(fields)
  const flat = [
    patch.requesterName, patch.requesterBadgeNumber, patch.requesterPhone, patch.requesterEmail,
    patch.businessName, patch.streetAddress, patch.city, patch.locationContact, patch.locationPhone,
    patch._import.offenceType, patch._import.dvrTypeBrand, patch._import.totalDvrRetention,
    patch._import.hasVideoMonitor, patch._import.dvrUsername, patch._import.dvrPassword,
  ]
  const fieldCount = flat.filter((v) => v && v.length > 0).length
  return { patch, warnings, fieldCount, timeFrameCount: patch._import.timeFrames.length }
}
