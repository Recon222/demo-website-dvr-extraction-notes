import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

import { T } from '@/features/demo/ui/inputs/input-theme'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
import { stubClock } from '@/features/demo/ui/inputs/__tests__/test-utils'
import { DateTimeField, Field } from '@/features/demo/ui/screens/_shared'
import { EditIncidentLocationModal } from '@/features/demo/ui/screens/EditIncidentLocationModal'
import { NewCaseModal } from '@/features/demo/ui/screens/NewCaseModal'
import { NewLocationModal } from '@/features/demo/ui/screens/NewLocationModal'
import { DuplicateLocationModal } from '@/features/demo/ui/screens/DuplicateLocationModal'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { SubmissionScreen } from '@/features/demo/ui/screens/SubmissionScreen'
import { UserProfilePane } from '@/features/demo/ui/screens/settings/panes/UserProfilePane'
import { blankCaseForm } from '@/features/demo/ui/screens/caseFormData'
import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import { DEFAULT_USER_PROFILE } from '@/features/demo/engine/logic/user-profile'
import { fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * U6.4a — the guard for A72's LABEL half, and for the retirement of the tone it carried.
 *
 * ## What is being held
 *
 * The demo declared the SAME four-key form-label object at EIGHT sites, byte-identical at
 * `13 / 500 / #cdd9e6 / 6`. U6.1 moved one of them (`Field`) onto the phone's
 * `TextInput` values and left the other seven a step smaller and a step darker than the field
 * beside them. `#cdd9e6` was `T.textDim` — the one key in `T` that was NOT an alias of a
 * palette token, so every site reading it was invisible to `palette[scheme]` and the one-line
 * light flip (plan §9 clause 12) would have left all eight on the dark half. U2.4 deferral D-3
 * held the family together and named THIS package as its trigger.
 *
 * ## Three independent teeth, because none of them catches the others' failure
 *
 * 1. **`T.textDim` is gone as a KEY** — the strongest guard, and free: a surface that re-grows
 *    a private label tone through `T` is a compile error. Asserted over `Object.keys` rather
 *    than by reading `T.textDim`, because reading a deleted key is a compile error in the TEST
 *    and this case has to survive to run.
 * 2. **A source scan** over the subtree the family lived in. jsdom performs no layout and a
 *    style pin can only see the surfaces a test happens to mount, so the source IS the
 *    invariant for "no NINTH copy" — the same reasoning `glass-tokens.test.ts` and
 *    `settings-palette-sweep.test.ts` carry.
 * 3. **Behavioural pins, one per adopted surface** (the U6.4a row's Tests column). These are
 *    what a source scan cannot do: they prove the seam's values actually REACH the DOM at each
 *    site, so a file that imports `fieldLabelStyle` and then overrides it still reds.
 *
 * ## The non-tautology split, deliberately
 *
 * The seam's own values are pinned LITERALLY, once (`the recipe IS the phone's`). Every
 * surface is then pinned against `fieldLabelStyle` rather than against retyped numbers. Both
 * halves are needed and neither is redundant: a mutation to the seam is caught by the literal
 * case; a surface quietly hand-rolling its own is caught by the per-surface cases. Pinning the
 * surfaces against retyped numbers instead would double the literal case and still miss the
 * day someone changes the seam and every retyped copy with it.
 */

const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')

/**
 * Where the form-label family lived. Two whole subtrees plus the wizard screens that spelled a
 * copy — NOT `ui/**`, deliberately: `#cdd9e6` survives at ~20 further sites in files this
 * package does not own (`WizardDrawer`, `AlertDialog`, `MapScreen`, and `CompletionScreen` /
 * `DvrInfoScreen`, which are **U6.4b's**). Widening this root would either red on landing or
 * drag a sweep into another package's file, which is the trap `glass-tokens.test.ts`'s own
 * ban list documents twice. Each of the eight is a file U6.4a opened.
 */
const SWEPT_ROOTS: readonly string[] = ['inputs', join('screens', 'settings')]

const SWEPT_FILES: readonly string[] = [
  join('screens', '_shared.tsx'),
  join('screens', 'NewCaseModal.tsx'),
  join('screens', 'NewLocationModal.tsx'),
  join('screens', 'DuplicateLocationModal.tsx'),
  join('screens', 'EditIncidentLocationModal.tsx'),
  join('screens', 'SubmissionScreen.tsx'),
  join('screens', 'RequestedScopeScreen.tsx'),
  join('screens', 'ExtractedScopeScreen.tsx'),
  join('screens', 'ExportInfoScreen.tsx'),
]

/** The retired tone. Lower-cased on both sides — §4.7: every hex sweep is case-insensitive. */
const RETIRED_LABEL_TONE = '#cdd9e6'

/**
 * Sites in the swept set allowed to keep the retired tone. EMPTY, and that is the point: the
 * family moved whole. A row added here needs a reason a reader can check, and the third case
 * below fails if a row outlives the literal it excuses.
 */
const ALLOWED: Readonly<Record<string, string>> = {}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

/**
 * Comments are STRIPPED first. `glass-tokens.test.ts`'s sweep does not strip, and U6.1's report
 * (§8 item 7) records that costing a commit — a docblock explaining which value was retired
 * reads as a re-inline. Every file this package touched names the retired tone in prose.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const sweptSources = (): { rel: string; src: string }[] => {
  const files = [
    ...SWEPT_ROOTS.flatMap((r) => walk(join(UI_ROOT, r))),
    ...SWEPT_FILES.map((f) => join(UI_ROOT, f)),
  ]
  return files.map((full) => ({
    rel: relative(UI_ROOT, full).split(sep).join('/'),
    src: stripComments(readFileSync(full, 'utf8')),
  }))
}

describe('A72 label sweep — the form-label family has ONE owner (U6.4a)', () => {
  it('walks a real, non-empty tree — a broken root would pass every case below silently', () => {
    // The positive control a source scan needs and a behaviour test does not: an empty file
    // list makes the ban vacuously true, which is the "opposite of the truth" failure the
    // mutation skill warns about twice.
    const files = sweptSources()
    expect(files.length).toBeGreaterThan(30)
    // And the scan can actually SEE a hex: the seam module spells the palette's own text token
    // nowhere, so prove the reader works against a value that IS present.
    expect(files.some((f) => f.rel === 'screens/_shared.tsx')).toBe(true)
    expect(files.some((f) => /fieldLabelStyle/.test(f.src))).toBe(true)
    for (const f of SWEPT_FILES) expect(statSync(join(UI_ROOT, f)).isFile(), f).toBe(true)
  })

  it('deletes `textDim` from `T` rather than re-pointing it', () => {
    // Deleting the KEY is what makes a ninth copy a compile error. Re-pointing it at
    // `colors.text` would have left the alias alive and the next label free to reach for a
    // "dim" tone that is no longer dim.
    expect(Object.keys(T)).not.toContain('textDim')
    // ...and it did not come back under another name: `T` carries no bare hex at all now.
    for (const [key, value] of Object.entries(T)) {
      if (typeof value !== 'string') continue
      expect(value.toLowerCase(), `T.${key}`).not.toBe(RETIRED_LABEL_TONE)
    }
  })

  it('spells the retired label tone nowhere in the swept set', () => {
    const offenders: string[] = []
    for (const { rel, src } of sweptSources()) {
      for (const hex of src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        if (hex.toLowerCase() === RETIRED_LABEL_TONE) offenders.push(`${rel}: ${hex}`)
      }
    }
    expect(
      offenders.filter((o) => !(o.split(':')[0] in ALLOWED)),
      'a form-label tone with no palette sibling was re-inlined. It is invisible to ' +
        '`palette[scheme]`, so the one-line light flip would leave it on the dark half (D2 as ' +
        'amended, plan §9 clause 12). Reach for `fieldLabelStyle`, or for `colors.text`.',
    ).toEqual([])
  })

  it('keeps EXACTLY the exemptions that still have something to excuse', () => {
    // The dead-exemption case. A reason kept for a literal that no longer exists is how a
    // stale exemption outlives the thing it excused — `settings-palette-sweep.test.ts` carries
    // the same case, and this package's own commit deleted a row from it.
    const live = new Set<string>()
    for (const { rel, src } of sweptSources()) {
      if ((src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).some((h) => h.toLowerCase() === RETIRED_LABEL_TONE)) {
        live.add(rel)
      }
    }
    expect(
      Object.keys(ALLOWED).sort(),
      'an ALLOWED row names a file that no longer spells the retired tone — delete the row.',
    ).toEqual(Array.from(live).sort())
  })

  it('is the phone`s recipe, spelled once', () => {
    // The ONE literal pin. `TextInput.tsx:155-161` + `:105`: `Typography.fontSize.sm` (14),
    // `fontWeight.medium` (500), `colors.text`, `Layout.spacing.xs` (4) under the label.
    expect(fieldLabelStyle).toEqual({
      fontSize: 14,
      fontWeight: 500,
      color: colors.text,
      marginBottom: spacing.xs,
    })
  })
})

// ---------------------------------------------------------------------------------------
// One behavioural pin per adopted surface (the U6.4a row's Tests column).
// ---------------------------------------------------------------------------------------

/**
 * Every expectation is DERIVED from `fieldLabelStyle`, never retyped — the surface's claim is
 * "I render the shared recipe", and retyping the values here would turn a hand-rolled label
 * that happens to agree today into a pass. jsdom re-renders a hex as `rgb(...)`, so the colour
 * is compared through a rendered probe rather than against the token string.
 */
function expectSharedLabel(el: HTMLElement | null, where: string) {
  expect(el, `${where}: no label element found`).not.toBeNull()
  const style = (el as HTMLElement).style
  expect(style.fontSize, where).toBe(`${fieldLabelStyle.fontSize}px`)
  expect(style.fontWeight, where).toBe(String(fieldLabelStyle.fontWeight))
  expect(style.marginBottom, where).toBe(`${fieldLabelStyle.marginBottom}px`)
  expect(style.color, where).toBe(probeColor(fieldLabelStyle.color as string))
}

/** jsdom's own normalisation of a colour, obtained from jsdom — not hand-converted. */
function probeColor(value: string): string {
  const el = document.createElement('div')
  el.style.color = value
  return el.style.color
}

/** The label DIV for `text`, i.e. the element whose OWN text is exactly that string. */
function labelFor(text: string): HTMLElement | null {
  return screen.getAllByText(text).find((el) => el.tagName === 'DIV') ?? null
}

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn(), isFieldVisible: () => true }

const blankIncident: IncidentLocationValues = {
  businessName: '', streetAddress: '', city: '', latitude: '', longitude: '', coordinateSource: '',
}

describe('every form label in the demo renders the shared recipe, not a private one', () => {
  beforeEach(() => stubClock())
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('`_shared.Field` — the site U6.1 moved, now reading the seam', () => {
    render(<Field label="Unit" value="" onChange={vi.fn()} />)
    expectSharedLabel(labelFor('Unit'), 'Field')
  })

  it('`inputs/DateTimeField` — was `T.textDim`', () => {
    render(<DateTimeField label="Start Date / Time" value="2025-03-08 23:45:00" onChange={vi.fn()} />)
    expectSharedLabel(labelFor('Start Date / Time'), 'DateTimeField')
  })

  it('`inputs/Dropdown` — was `T.textDim`', () => {
    render(<Dropdown label="File Type" value="MP4" options={['MP4', 'AVI']} onChange={vi.fn()} />)
    expectSharedLabel(labelFor('File Type'), 'Dropdown')
  })

  it('`inputs/AddressAutocomplete` — the copy that carried the required asterisk too', () => {
    render(<AddressAutocomplete label="Street Address" required value="" onChange={vi.fn()} onPick={vi.fn()} />)
    // `getAllByText` with the asterisk in a child span: the label div's OWN text node matches,
    // so the div is still the node returned for the plain string.
    expectSharedLabel(labelFor('Street Address'), 'AddressAutocomplete')
  })

  it('`inputs/IncidentLocationFields` — through `EditIncidentLocationModal`, the modal that mounts it', () => {
    render(
      <EditIncidentLocationModal
        values={blankIncident}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        reverseGeocode={async () => null}
      />,
    )
    expectSharedLabel(labelFor('Latitude'), 'IncidentLocationFields')
  })

  it('NewCaseModal.CoordinateField — the modal own second copy of the same label', () => {
    render(<NewCaseModal form={blankCaseForm} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expectSharedLabel(labelFor('Longitude'), 'NewCaseModal')
  })

  it('`SubmissionScreen` — the read-only Case Number line', () => {
    render(
      <SubmissionScreen
        occNumber="PR25-0098213"
        fields={{
          requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '',
          requesterEmail: '', businessName: '', streetAddress: '', city: '',
          locationContact: '', locationPhone: '',
        }}
        onChange={vi.fn()}
        onCoordinates={vi.fn()}
        {...nav}
      />,
    )
    expectSharedLabel(labelFor('Case Number'), 'SubmissionScreen')
  })

  it('RequestedScopeScreen — the radio group label', () => {
    render(
      <RequestedScopeScreen
        scopes={[{ id: 's1', startDateTime: '', endDateTime: '', isActualTime: true, cameras: '' }]}
        onChange={vi.fn()}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        {...nav}
      />,
    )
    expectSharedLabel(labelFor('Time Entry Type'), 'RequestedScopeScreen')
  })

  it('`settings/UserProfileModal` — the eighth copy, in the settings subtree', () => {
    render(<UserProfilePane profile={DEFAULT_USER_PROFILE} onSave={vi.fn()} saveState="saved" />)
    fireEvent.click(screen.getByTestId('user-profile-section-edit-button'))
    expectSharedLabel(labelFor('Start Date in Field'), 'UserProfileModal')
  })
})

// ---------------------------------------------------------------------------------------
// A72's ERROR half — matrix §C.3 rule 1 at the four sites U6.1 deferral proposal 2 named,
// all of them reachable from this row's four modals.
// ---------------------------------------------------------------------------------------

/** The rendered form of `colors.error`, obtained from jsdom rather than hand-converted. */
const ERROR_STROKE = () => probeColor(colors.error)

/**
 * A validation line is correct only if BOTH halves of §C.3 rule 1 hold: the message is NOT
 * red, and the severity is carried by a mark that IS. Asserting only the text colour would
 * pass a line that lost its red and said nothing instead — which is a legibility fix that
 * deletes the signal, and the rule's whole point is that the signal moves rather than goes.
 */
function expectSeverityOnGlyph(line: HTMLElement | null, where: string) {
  expect(line, `${where}: no validation line found`).not.toBeNull()
  const el = line as HTMLElement
  expect(el.style.color, `${where}: message must not be red`).toBe(probeColor(colors.text))
  expect(el.style.fontSize, where).toBe('14px')
  const glyph = el.querySelector('svg')
  expect(glyph, `${where}: severity has no glyph to sit on`).not.toBeNull()
  expect((glyph as SVGElement).getAttribute('stroke'), where).toBe(colors.error)
  expect((glyph as SVGElement).getAttribute('aria-hidden'), where).toBe('true')
}

describe('validation lines carry severity on the glyph, never as red text (§C.3 rule 1)', () => {
  afterEach(cleanup)

  it('`NewCaseModal.CoordinateField` — and it gains the a11y association it never had', () => {
    // The value is a controlled PROP: typing into it with a spy `onChange` never changes
    // what the blur validator reads, so the bad value is seeded instead of typed.
    render(
      <NewCaseModal
        form={{ ...blankCaseForm, incidentLatitude: 'not a coordinate' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const lat = screen.getByLabelText('Latitude')
    fireEvent.blur(lat)

    const line = screen.getByRole('alert')
    expectSeverityOnGlyph(line, 'NewCaseModal.CoordinateField')
    // The half that was MISSING entirely before U6.4a: this input had a red border and no
    // announcement and no way back to the message. Its twin in `IncidentLocationFields` got
    // this at P3 review R-16; this copy was missed.
    expect(lat.getAttribute('aria-invalid')).toBe('true')
    expect(lat.getAttribute('aria-describedby')).toBe(line.id)
    expect(line.id).not.toBe('')
  })

  it('`IncidentLocationFields.CoordinateField`, through `EditIncidentLocationModal`', () => {
    render(
      <EditIncidentLocationModal
        values={{ ...blankIncident, latitude: 'not a coordinate' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        reverseGeocode={async () => null}
      />,
    )
    fireEvent.blur(screen.getByLabelText('Latitude'))
    expectSeverityOnGlyph(screen.getByRole('alert'), 'IncidentLocationFields')
  })

  it('NewLocationModal blocked reason — inside its region, never a nested alert', () => {
    render(
      <NewLocationModal
        form={{ locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const region = screen.getByTestId('new-location-blocked')
    expectSeverityOnGlyph(region.firstElementChild as HTMLElement, 'NewLocationModal')
    // The politeness is the point: an assertive `role="alert"` nested in this polite region
    // would interrupt the visitor on every keystroke that changes the gate.
    expect(region.getAttribute('role')).toBe('status')
    expect(region.querySelectorAll('[role="alert"]').length).toBe(0)
  })

  it('DuplicateLocationModal blocked reason — the identical gate, the identical shape', () => {
    render(
      <DuplicateLocationModal
        name=""
        onChangeName={vi.fn()}
        existingNames={['Main Store']}
        onClose={vi.fn()}
        onDuplicate={vi.fn()}
      />,
    )
    const region = screen.getByTestId('duplicate-location-blocked')
    expectSeverityOnGlyph(region.firstElementChild as HTMLElement, 'DuplicateLocationModal')
    expect(region.getAttribute('role')).toBe('status')
    expect(region.querySelectorAll('[role="alert"]').length).toBe(0)
  })

  it('`_shared.Field` — the site the treatment came from, still on it', () => {
    render(<Field label="Unit" value="" onChange={vi.fn()} error="Unit is required" />)
    expectSeverityOnGlyph(screen.getByRole('alert'), 'Field')
  })

})
