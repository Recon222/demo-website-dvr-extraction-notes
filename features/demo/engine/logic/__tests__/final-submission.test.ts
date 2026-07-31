import { describe, it, expect } from 'vitest'
import {
  FINAL_SUBMISSION_MESSAGES,
  finalSubmissionSchema,
  toFinalSubmissionInput,
  validateFinalSubmission,
  type FinalSubmissionInput,
} from '@/features/demo/engine/logic/final-submission'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoCase, DemoLocation, ScopeEntry } from '@/features/demo/engine/types'

const scope = (o: Partial<ScopeEntry> = {}): ScopeEntry => ({
  id: 's1',
  startDateTime: '2025-03-08 22:00:00',
  endDateTime: '2025-03-08 23:00:00',
  isActualTime: true,
  cameras: '',
  ...o,
})

const input = (o: Partial<FinalSubmissionInput> = {}): FinalSubmissionInput => ({
  occNumber: 'PR25-0001',
  address: "Kim's Convenience, 1450 Eglinton Ave W, Mississauga",
  scopes: [{ startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-08 23:00:00' }],
  ...o,
})

const demoCase = (o: Partial<DemoCase> = {}): DemoCase => ({
  id: 'c1',
  caseNumber: 'PR25-0001',
  displayName: 'Robbery',
  unit: 'Robbery',
  oicName: '',
  oicBadge: '',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  notes: '',
  status: 'draft',
  createdLabel: 'today',
  locationIds: ['l1'],
  ...o,
})

const demoLocation = (o: Partial<DemoLocation> = {}): DemoLocation => ({
  id: 'l1',
  caseId: 'c1',
  locationName: 'Rear Door',
  businessName: "Kim's Convenience",
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  form: { ...blankLocationForm(), scopes: [scope()] },
  ...o,
})

describe('finalSubmissionSchema (phone port — src/lib/schemas/form-schema.ts:137-149)', () => {
  it('passes when OCC number, address and one complete scope are all present', () => {
    expect(validateFinalSubmission(input())).toEqual({ ok: true })
    expect(finalSubmissionSchema.safeParse(input()).success).toBe(true)
  })

  it('blocks on a missing OCC number with the phone message verbatim', () => {
    const out = validateFinalSubmission(input({ occNumber: '' }))
    expect(out).toEqual({ ok: false, errors: ['OCC number is required'] })
  })

  it('blocks on a missing address with the phone message verbatim', () => {
    const out = validateFinalSubmission(input({ address: '' }))
    expect(out).toEqual({ ok: false, errors: ['Address is required'] })
  })

  it('blocks when there are no scopes at all', () => {
    const out = validateFinalSubmission(input({ scopes: [] }))
    expect(out).toEqual({
      ok: false,
      errors: ['At least one extraction scope with start and end times is required'],
    })
  })

  it('blocks when every scope is half-filled — a start alone or an end alone is not a scope', () => {
    const startOnly = validateFinalSubmission(
      input({ scopes: [{ startDateTime: '2025-03-08 22:00:00', endDateTime: '' }] }),
    )
    const endOnly = validateFinalSubmission(
      input({ scopes: [{ startDateTime: '', endDateTime: '2025-03-08 23:00:00' }] }),
    )
    expect(startOnly).toEqual({
      ok: false,
      errors: ['At least one extraction scope with start and end times is required'],
    })
    expect(endOnly).toEqual(startOnly)
  })

  it('passes when ONE scope is complete among incomplete ones (phone `.some`, not `.every`)', () => {
    const out = validateFinalSubmission(
      input({
        scopes: [
          { startDateTime: '', endDateTime: '' },
          { startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-08 23:00:00' },
          { startDateTime: '2025-03-09 01:00:00', endDateTime: '' },
        ],
      }),
    )
    expect(out).toEqual({ ok: true })
  })

  it('reports every failing rule at once, in the phone key order (occNumber → address → scopes)', () => {
    const out = validateFinalSubmission({ occNumber: '', address: '', scopes: [] })
    expect(out).toEqual({
      ok: false,
      errors: [
        'OCC number is required',
        'Address is required',
        'At least one extraction scope with start and end times is required',
      ],
    })
  })

  it('exposes the three messages as constants so UI copy pins cannot drift from the schema', () => {
    const out = validateFinalSubmission({ occNumber: '', address: '', scopes: [] })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.errors).toEqual([
      FINAL_SUBMISSION_MESSAGES.occNumber,
      FINAL_SUBMISSION_MESSAGES.address,
      FINAL_SUBMISSION_MESSAGES.scopes,
    ])
  })

  it('does NOT trim occNumber — `z.string().min(1)` verbatim, matching the phone', () => {
    // Deliberate non-improvement: the phone stores whatever the operator typed and gates on
    // min(1). Trimming here would be a silent behaviour fork from the source of truth.
    expect(validateFinalSubmission(input({ occNumber: ' ' }))).toEqual({ ok: true })
  })
})

describe('toFinalSubmissionInput (demo-shape derivation)', () => {
  it('reads OCC number from the case handed in — the caller derives it from loc.caseId (R-19)', () => {
    const out = toFinalSubmissionInput(demoLocation(), demoCase({ caseNumber: 'PR25-9999' }))
    expect(out.occNumber).toBe('PR25-9999')
  })

  it('joins the location address the way every other demo consumer does', () => {
    expect(toFinalSubmissionInput(demoLocation(), demoCase()).address).toBe(
      "Kim's Convenience, 1450 Eglinton Ave W, Mississauga",
    )
    expect(
      toFinalSubmissionInput(demoLocation({ businessName: '', streetAddress: '' }), demoCase()).address,
    ).toBe('Mississauga')
  })

  it('composes the address through the shared formatAddress — one producer (deferred §38)', () => {
    // §38's strike-trigger: when P2.3's formatAddress landed it became the single producer of
    // a composed address. The observable tell is the street-type abbreviation, which only
    // formatAddress applies — a private join here would leave "Avenue" unabbreviated and the
    // gate would be reading a different string from the PDF header, notes and Cases row.
    const out = toFinalSubmissionInput(
      demoLocation({ businessName: '', streetAddress: '1450 Eglinton Avenue', city: 'Mississauga' }),
      demoCase(),
    )
    expect(out.address).toBe('1450 Eglinton Ave, Mississauga')
    expect(out.address).toBe(formatAddress('', '1450 Eglinton Avenue', 'Mississauga'))
  })

  it('treats a whitespace-only address as absent (phone formatAddress trims each component)', () => {
    const out = toFinalSubmissionInput(
      demoLocation({ businessName: '  ', streetAddress: ' ', city: '\t' }),
      demoCase(),
    )
    expect(out.address).toBe('')
    expect(validateFinalSubmission(out)).toEqual({ ok: false, errors: ['Address is required'] })
  })

  it('never treats the location NAME as an address — the summary card falls back, the gate must not', () => {
    // CompletionScreen's summary shows locationName when the address is empty; letting that
    // fallback into the gate would pass a location that has no address at all.
    const out = toFinalSubmissionInput(
      demoLocation({ businessName: '', streetAddress: '', city: '', locationName: 'Rear Door' }),
      demoCase(),
    )
    expect(out.address).toBe('')
  })

  it('carries only the two fields the schema reads from each scope', () => {
    const out = toFinalSubmissionInput(demoLocation(), demoCase())
    expect(out.scopes).toEqual([
      { startDateTime: '2025-03-08 22:00:00', endDateTime: '2025-03-08 23:00:00' },
    ])
  })

  it('with no location open, every rule fails — never a silent pass', () => {
    expect(validateFinalSubmission(toFinalSubmissionInput(null, null))).toEqual({
      ok: false,
      errors: [
        'OCC number is required',
        'Address is required',
        'At least one extraction scope with start and end times is required',
      ],
    })
  })
})
