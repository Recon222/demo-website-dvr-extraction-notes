import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { GLASS, glassCard, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { scheme } from '@/features/demo/ui/tokens/palette'
import { radius } from '@/features/demo/ui/tokens/scale'

import { ArrivalDepartureScreen } from '@/features/demo/ui/screens/ArrivalDepartureScreen'
import { AudioPreviewScreen } from '@/features/demo/ui/screens/AudioPreviewScreen'
import { AudioRecorderScreen, type AudioRecorderScreenProps } from '@/features/demo/ui/screens/AudioRecorderScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExtractedScopeScreen } from '@/features/demo/ui/screens/ExtractedScopeScreen'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { SectionCard } from '@/features/demo/ui/screens/_shared'
import { SettingsCategoryList } from '@/features/demo/ui/screens/settings/SettingsCategoryList'
import type { SettingsSectionView } from '@/features/demo/ui/screens/settings/settingsData'
import { TimeOffsetScreen, type TimeOffsetScreenProps } from '@/features/demo/ui/screens/TimeOffsetScreen'
import { CasesScreen, type CasesScreenProps } from '@/features/demo/ui/screens/CasesScreen'
import { DashboardScreen } from '@/features/demo/ui/screens/DashboardScreen'
import { ExportCaseCard, type ExportCaseCardProps } from '@/features/demo/ui/screens/export/ExportCaseCard'
import { caseStatusTheme, locationStatusTheme, toCaseSheet, type CaseCard } from '@/features/demo/ui/screens/screenData'
import { CaseActionsSheet } from '@/features/demo/ui/screens/CaseActionsSheet'
import { CompletionScreen } from '@/features/demo/ui/screens/CompletionScreen'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { ExportModal } from '@/features/demo/ui/screens/ExportModal'
import { ImportModal } from '@/features/demo/ui/screens/ImportModal'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { demoCase, demoLocation } from '@/features/demo/engine/store/__tests__/test-utils'

import type { CameraEntry } from '@/features/demo/engine/types'
import type { CapturedMedia } from '@/features/demo/engine/logic/media'
import { CAPTURE_PERMISSION_COPY, SAMPLE_MEDIA_NOTICE } from '@/features/demo/engine/logic/media'
import { RESTING_METER } from '@/features/demo/ui/inputs/useAudioAnalyser'

/**
 * U1.2 — the card recipe, asserted where it actually lands: on the DOM of EVERY `glassCard`
 * consumer, not on the fragment alone.
 *
 * Why a loop and not one component (plan §5, U1.2's Tests column): the highlight edge is the
 * part §4.3's shorthand-after-longhand rule erases SILENTLY. `{ ...glassCard, border: 'X' }`
 * is valid TypeScript, renders without a warning, and drops `borderTopColor` on the floor —
 * so a pin on the fragment object cannot see it and a pin on one component cannot see it
 * happen in the other eight. The phone shipped the mirror of this defect: a highlight at
 * 0.06 alpha that was not rendering at all (matrix A35).
 *
 * MEASURED, and the reason this is a real pin rather than a source scan: jsdom DOES model
 * the ordering. `style.border = '1px solid <c>'` then `style.borderTopColor = '<h>'` reads
 * back `borderTopColor: '<h>'` and `borderColor: '<h> <c> <c>'`; writing `border` (or
 * `borderColor` — BOTH are shorthands over all four sides) afterwards resets it to the new
 * colour. So an erased highlight is observable here, and the mutation that proves it is
 * "add a `border:` override after the spread at any one consumer".
 *
 * jsdom rewrites colour spellings (`rgba(184,212,240,0.08)` -> `rgba(184, 212, 240, 0.08)`),
 * so every expectation is normalised through jsdom itself rather than compared byte-for-byte
 * (§4.7). `norm()` writes the value into a real declaration and reads back what jsdom stored.
 */

const tier = GLASS_TIER[scheme]

/** What jsdom stores for a colour written into a `border-top-color` declaration. */
function normColor(value: string): string {
  const probe = document.createElement('div')
  probe.style.borderTopColor = value
  return probe.style.borderTopColor
}

/** What jsdom stores for a `background` shorthand carrying a gradient (it lands on `background-image`). */
function normGradient(value: string): string {
  const probe = document.createElement('div')
  probe.style.background = value
  return probe.style.backgroundImage
}

/**
 * Every expectation below is composed from `tokens/glass-tiers.ts`, NEVER from the fragment
 * under test. That is not style — it is what makes these assertions falsifiable. MEASURED:
 * with `CARD_GRADIENT` read off `glassCard.background`, a mutation re-pointing the fragment at
 * a different tier moved the expectation with it and the whole file stayed green (probes P11
 * and P13, both SURVIVED). Reading the tier makes the same mutations fail, because the two
 * sides of the comparison now come from two modules.
 */
const composed = (t: { gradient: readonly [string, string] }) =>
  `linear-gradient(180deg,${t.gradient[0]},${t.gradient[1]})`

const CARD_GRADIENT = normGradient(composed(tier.card))
const DIAG_GRADIENT = normGradient(`linear-gradient(135deg,${tier.card.gradient[0]},${tier.card.gradient[1]})`)
const HIGHLIGHT = normColor(tier.card.highlightTop)
const SIDE_BORDER = normColor(tier.card.border)

/**
 * Every element painting the card gradient, minus `<button>`s.
 *
 * The one button that paints it is `AudioRecorderScreen`'s transport pill (`:481`,
 * `borderRadius: 21`) — not a card, and U7.2's DEF-UI-008 carve-out keeps it on its own
 * gradient deliberately. Every `glassCard` consumer today is a `<div>`; a future card on a
 * `<button>` belongs in this list explicitly, not silently.
 */
function cardSurfaces(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
    (el) => el.style.backgroundImage === CARD_GRADIENT && el.tagName !== 'BUTTON',
  )
}

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn(), isFieldVisible: () => true }

const scope = (id: string) => ({
  id,
  startDateTime: '2025-03-08 23:45:00',
  endDateTime: '2025-03-09 01:30:00',
  isActualTime: true,
  cameras: '3,4,7',
})

const camera = (id: string): CameraEntry => ({
  id,
  cameraName: `Camera ${id}`,
  resolution: '1080p',
  recordingFps: '15',
})

const captured: CapturedMedia = {
  kind: 'audio',
  url: 'blob:demo/note-1',
  mimeType: 'audio/webm;codecs=opus',
  sizeBytes: 8192,
  durationSec: 4,
  capturedAt: '2026-07-31 14:05:09',
  sample: false,
}

const recorderProps: AudioRecorderScreenProps = {
  mode: 'live',
  phase: 'idle',
  elapsedMs: 0,
  canStop: false,
  meter: RESTING_METER,
  format: { sampleRate: '48.0kHz', channels: 'MONO', codec: 'OPUS' },
  timeOfDay: '14:05:09',
  deniedTitle: CAPTURE_PERMISSION_COPY.microphone.title,
  deniedBody: CAPTURE_PERMISSION_COPY.microphone.deniedBody,
  sampleNotice: SAMPLE_MEDIA_NOTICE.microphone,
  notice: null,
  reduceMotion: false,
  failure: null,
  onDismissFailure: vi.fn(),
  onStart: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onStop: vi.fn(),
  onEnableMicrophone: vi.fn(),
  onUseSample: vi.fn(),
  onCancel: vi.fn(),
}

const timeOffsetProps: TimeOffsetScreenProps = {
  dvrDateTime: '2026-06-01 12:05:30',
  actualDateTime: '2026-06-01 12:00:00',
  onChangeDvr: vi.fn(),
  onChangeActual: vi.fn(),
  onUseCurrentTime: vi.fn(),
  onCalculate: vi.fn(),
  onCaptureOcr: vi.fn(),
  sync: null,
  syncing: false,
  result: { diff: '00:05:30', direction: 'AHEAD OF', isCorrect: false },
  correctedScopes: [
    {
      id: 'a',
      reqLabel: 'ACTUAL',
      adjLabel: 'DVR',
      reqStart: '2025-03-08 23:45:00',
      reqEnd: '2025-03-09 01:30:00',
      adjStart: '2025-03-08 23:39:30',
      adjEnd: '2025-03-09 01:24:30',
      cameras: '3,4,7',
    },
  ],
  dvrAppliesDST: false,
  onToggleDst: vi.fn(),
  dstAdvisory: null,
  hasExtractedScopes: false,
  onNext: vi.fn(),
  onBack: vi.fn(),
  onMenu: vi.fn(),
}

const settingsSections: readonly SettingsSectionView[] = [
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'appearance', title: 'Appearance', icon: 'contrast-outline', preview: 'Dark', requiresAuth: false },
    ],
  },
  {
    id: 'data',
    label: 'Data & Security',
    items: [{ id: 'security', title: 'Security', icon: 'lock-closed-outline', preview: null, requiresAuth: true }],
  },
]

/**
 * The nine consumers (`glassCard` importers, measured), with the number of card surfaces each
 * renders for the props below. The COUNT is load-bearing: an override that erases the border
 * changes both the top and the side colours, which is exactly what the filter reads — so the
 * offending element would drop out of the set and only the count would notice.
 */
const CONSUMERS: ReadonlyArray<[name: string, render: () => { container: HTMLElement }, cards: number]> = [
  ['ArrivalDepartureScreen', () => render(<ArrivalDepartureScreen visits={[{ id: 'v1', arrival: '', departure: '' }, { id: 'v2', arrival: '', departure: '' }]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...nav} />), 2],
  ['AudioPreviewScreen', () => render(<AudioPreviewScreen captured={captured} defaultFilenameBase="audio-note-1" notice={null} onSave={vi.fn()} onRecordAgain={vi.fn()} onCancel={vi.fn()} />), 1],
  ['AudioRecorderScreen', () => render(<AudioRecorderScreen {...recorderProps} />), 2],
  ['CamerasScreen', () => render(<CamerasScreen cameras={[camera('c1'), camera('c2')]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} onCaptureGps={vi.fn()} {...nav} />), 2],
  ['ExtractedScopeScreen', () => render(<ExtractedScopeScreen scopes={[scope('e1'), scope('e2')]} onChange={vi.fn()} onRemove={vi.fn()} onRegenerate={vi.fn()} {...nav} />), 2],
  ['RequestedScopeScreen', () => render(<RequestedScopeScreen scopes={[scope('s1'), scope('s2')]} onChange={vi.fn()} onAdd={vi.fn()} onRemove={vi.fn()} {...nav} />), 2],
  ['SectionCard (_shared)', () => render(<SectionCard title="DVR Time vs Actual Time">body</SectionCard>), 1],
  ['SettingsCategoryList', () => render(<SettingsCategoryList sections={settingsSections} onSelect={vi.fn()} />), 2],
  // SectionCard ("DVR Time vs Actual Time") + one corrected-scope card.
  ['TimeOffsetScreen', () => render(<TimeOffsetScreen {...timeOffsetProps} />), 2],
]

describe('the card recipe reaches every glassCard consumer (U1.2 / A31, A32, A44, A54)', () => {
  it.each(CONSUMERS)('%s paints the lit top edge on every card', (_name, mount, count) => {
    const { container } = mount()
    const cards = cardSurfaces(container)

    expect(cards).toHaveLength(count)
    for (const card of cards) {
      // The lit edge, and the three sides that are NOT lit — the pair is the point. A
      // `border` or `borderColor` override after the spread makes all four equal.
      expect(card.style.borderTopColor).toBe(HIGHLIGHT)
      expect(card.style.borderRightColor).toBe(SIDE_BORDER)
      expect(card.style.borderBottomColor).toBe(SIDE_BORDER)
      expect(card.style.borderLeftColor).toBe(SIDE_BORDER)
      expect(card.style.borderTopColor).not.toBe(card.style.borderRightColor)
      // A32 + A44 on one declaration: the tier's inset, then the card elevation. This line
      // pins the COMPOSITION — that both halves reach the DOM, in that order (probe P6:
      // dropping the elevation half KILLS it). `GLASS.shadowCard`'s VALUE is pinned by the
      // literal in `glass-tokens.test.ts`, not here: a `0 4px 8px -> 9px` drift survives this
      // line (probe P7) and dies there, and duplicating A44's literal in two files would make
      // a legitimate re-base a two-file edit for no extra falsifiability.
      expect(card.style.boxShadow).toBe(`inset 0 1px 0 ${tier.card.innerShadow}, ${GLASS.shadowCard}`)
    }
  })

  it('composes the fragment in the order the phone publishes (border, THEN border-top-color)', () => {
    // Not a restatement of the `toEqual` in glass-tokens.test.ts: that pins the VALUES, this
    // pins the ORDER, and the order is what a re-sort of the object literal destroys without
    // changing a single value. `Object.keys` is the insertion order React replays into the
    // style declaration.
    const keys = Object.keys(glassCard)
    expect(keys.indexOf('borderTopColor')).toBeGreaterThan(keys.indexOf('border'))
    expect(keys.indexOf('border')).toBeGreaterThanOrEqual(0)
  })
})

const caseCard: CaseCard = {
  id: 'c1',
  caseNumber: 'PR25-A',
  displayName: "Kim's — B&E",
  status: caseStatusTheme('draft'),
  personnel: [{ role: 'OIC', name: 'L. McHugh', badge: '4471' }],
  createdLabel: 'Just now',
  locations: [{ id: 'l1', locationName: "Kim's Convenience", address: '1450 Eglinton Ave W', status: locationStatusTheme('started') }],
  locationCountLabel: '1 location',
}

const casesProps: CasesScreenProps = {
  cases: [caseCard],
  expandedId: null,
  onToggle: vi.fn(),
  onNewCase: vi.fn(),
  onOpenLocation: vi.fn(),
  onAddLocation: vi.fn(),
  onImport: vi.fn(),
  onLocationActions: vi.fn(),
  onDeleteCase: vi.fn(),
  onDeleteLocation: vi.fn(),
  onSettings: vi.fn(),
}

const exportCardProps: ExportCaseCardProps = {
  card: caseCard,
  checkbox: 'none',
  selectedIds: new Set<string>(),
  expanded: false,
  dimmed: false,
  isExporting: false,
  onToggleExpand: vi.fn(),
  onToggleCase: vi.fn(),
  onToggleLocation: vi.fn(),
}

/**
 * A43 — the depth tier (phone ruling D13(a), `Layout.ts:25-41`): nested ROWS `md` (8),
 * cards `lg` (12). The three sites below shipped at `16`, which is `xl` — a radius the
 * ladder reserves for dialogs (A45/U4.3), not cards.
 *
 * These three paint the DIAGONAL card gradient (`gradientCardDiag`, the D11 demo-only
 * variant), which is why they are a separate set from the nine above.
 */
describe('the depth rule holds — no card at radius 16 (U1.2 / A43)', () => {
  const LADDER = new Set([`${radius.md}px`, `${radius.lg}px`])

  const DIAG_SCREENS: ReadonlyArray<[name: string, render: () => { container: HTMLElement }]> = [
    ['CasesScreen', () => render(<CasesScreen {...casesProps} />)],
    ['DashboardScreen', () => render(<DashboardScreen cases={[caseCard]} onOpenLocation={vi.fn()} onCaseActions={vi.fn()} onSettings={vi.fn()} />)],
    ['ExportCaseCard', () => render(<ExportCaseCard {...exportCardProps} />)],
  ]

  it.each(DIAG_SCREENS)('%s renders its cards on the depth ladder, never at xl', (_name, mount) => {
    const { container } = mount()
    const surfaces = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.backgroundImage === DIAG_GRADIENT,
    )
    expect(surfaces.length).toBeGreaterThan(0)
    for (const el of surfaces) {
      expect(LADDER.has(el.style.borderRadius), `${el.style.borderRadius} is off the depth ladder`).toBe(true)
    }
    // At least one is a top-level CARD at `lg` — otherwise a screen that rendered only
    // nested rows would pass this vacuously.
    expect(surfaces.some((el) => el.style.borderRadius === `${radius.lg}px`)).toBe(true)
  })
})

/**
 * U1.3 — the nested tier, asserted at each of the five sites that hand-rolled a near-miss of
 * it, plus the one that hand-rolled the `elevated` tier.
 *
 * These are the surfaces deferral §31 named. Each one shipped a private gradient built from
 * the demo's OLD card stops at a different alpha (`0.6/0.7`, a flat `0.45`, three copies of
 * `rgba(13,27,42,0.6)`, `0.9/0.96`) — near enough to look intentional, far enough that five
 * cards on one screen never agreed. The composed-gradient bans in `glass-tokens.test.ts`
 * sailed over every one of them because the alphas differed, which is the whole reason this
 * check is behavioural: it reads what the element PAINTS, not what the source says.
 *
 * `.toBe(NESTED_GRADIENT)` is what makes it a real pin — asserting merely "not the old
 * literal" would pass over any new private gradient.
 */
const NESTED_GRADIENT = normGradient(composed(tier.nestedCard))
const NESTED_HIGHLIGHT = normColor(tier.nestedCard.highlightTop)
const NESTED_BORDER = normColor(tier.nestedCard.border)
const PANEL_GRADIENT = normGradient(composed(tier.elevated))

function expectNestedTier(el: HTMLElement) {
  expect(el.style.backgroundImage).toBe(NESTED_GRADIENT)
  expect(el.style.borderTopColor).toBe(NESTED_HIGHLIGHT)
  expect(el.style.borderRightColor).toBe(NESTED_BORDER)
  expect(el.style.borderBottomColor).toBe(NESTED_BORDER)
  expect(el.style.borderLeftColor).toBe(NESTED_BORDER)
  // A55 takes no elevation shadow — only the tier's inset. A54 (card) and A56 (elevated)
  // are the rows that carry `Layout.shadow.card` / `shadow.dialog`; A55 names neither.
  expect(el.style.boxShadow).toBe(`inset 0 1px 0 ${tier.nestedCard.innerShadow}`)
}

const importedView: ImportedLocationView = {
  locId: 'L',
  title: "Kim's Convenience",
  caseNumber: 'PR25-0098213',
  fieldCount: 9,
  timeFrameCount: 1,
  sections: [{ heading: 'Requesting Officer', rows: [{ label: 'Name', value: 'Det. Liam McHugh' }] }],
  scopes: [],
  warnings: [],
  isSample: false,
}

const importCallbacks = {
  onPdfFilesSelected: vi.fn(),
  onClipboardText: vi.fn(),
  onChoosePaste: vi.fn(),
  onTextChange: vi.fn(),
  onRun: vi.fn(),
  onBack: vi.fn(),
  onRetry: vi.fn(),
  onOpenLocation: vi.fn(),
  onCancel: vi.fn(),
  onAcknowledgeResult: vi.fn(),
  onReviewImport: vi.fn(),
}

const completionSummary = {
  occNumber: 'PR25-0098213',
  location: "Kim's Convenience",
  dvr: 'Hikvision DS-7608',
  offset: '00:05:30 AHEAD OF',
  scopes: 1,
  cameras: 0,
  export: 'USB Drive',
}

describe('the nested tier reaches every adopted site (U1.3 / A33, A34, A35, A55)', () => {
  it('ImportResultBody — the location card', () => {
    const { container } = render(<ImportResultBody view={importedView} />)
    const cards = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.backgroundImage === NESTED_GRADIENT,
    )
    expect(cards.length).toBeGreaterThan(0)
    cards.forEach(expectNestedTier)
  })

  it('ImportModal — the Data Found card', () => {
    render(
      <ImportModal
        stage="result"
        text=""
        activeStage={null}
        lastRealStage={null}
        batch={null}
        result={{ ok: false, error: 'x', code: 'NO_FIELDS_FOUND', partialData: { caseNumber: 'PR25-777' } }}
        {...importCallbacks}
      />,
    )
    expectNestedTier(screen.getByTestId('import-data-found'))
  })

  it('CaseActionsSheet — the case-report panel', () => {
    const caseData = toCaseSheet(demoCase(), [demoLocation()])
    const { container } = render(
      <CaseActionsSheet caseData={caseData} onComplete={vi.fn()} onReopen={vi.fn()} onArchive={vi.fn()} onClose={vi.fn()} />,
    )
    const panel = container.querySelector<HTMLElement>('[data-case-report]')
    expect(panel).not.toBeNull()
    expectNestedTier(panel as HTMLElement)
  })

  it('DvrInfoScreen — the per-scope retention rows', () => {
    const { container } = render(
      <DvrInfoScreen
        dvr={blankLocationForm().dvr}
        retention={{ totalRetention: 30, scopes: [{ label: 'Scope 1', daysUntilOverwritten: 12, overwrittenDate: '2026-09-08' }] }}
        onChange={vi.fn()}
        {...nav}
      />,
    )
    const rows = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.backgroundImage === NESTED_GRADIENT,
    )
    expect(rows).toHaveLength(1)
    rows.forEach(expectNestedTier)
  })

  it('ExportModal — the invalid-locations panel', () => {
    render(
      <ExportModal
        mode="validation"
        validationResult={{
          caseId: 'c1',
          caseNumber: 'PR25-0098213',
          validLocations: [],
          invalidLocations: [{ locationId: 'l1', locationName: 'Rear Alley Camera', valid: false, errors: ['Completion date'] }],
          allValid: false,
          totalLocations: 1,
          validCount: 0,
          invalidCount: 1,
        }}
        onContinueAnyway={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expectNestedTier(screen.getByTestId('export-invalid-locations'))
  })
})

describe('the elevated tier absorbs its near-miss (U1.3 / A36, A56)', () => {
  it('CompletionScreen — the OCC summary card paints gradientPanel, not a private 0.9/0.96', () => {
    const { container } = render(
      <CompletionScreen
        summary={completionSummary}
        validationErrors={[]}
        isComplete={false}
        canComplete
        dateTimeCompleted=""
        completedBy=""
        onChange={vi.fn()}
        onPreviewPdf={vi.fn()}
        onPreviewTimeOffsetPdf={vi.fn()}
        onExportZip={vi.fn()}
        canExport
        isExporting={false}
        onComplete={vi.fn()}
        onReviewAgain={vi.fn()}
        onBackToDashboard={vi.fn()}
        onBackToCases={vi.fn()}
        {...nav}
      />,
    )
    const panels = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.backgroundImage === PANEL_GRADIENT,
    )
    expect(panels).toHaveLength(1)
    // The accent border is the SAME tier's border since U1.3 — the pair is the point.
    expect(panels[0].style.borderRightColor).toBe(normColor(tier.elevated.border))
    // SEAM(U6.4b): the techGlow on this element is M1(a)'s to remove, and is still here.
    // When it goes, this line is the one that must be deleted rather than "fixed" — and the
    // gradient assertion above must survive untouched.
    expect(panels[0].style.boxShadow).toBe('0 0 22px rgba(43,140,193,0.12)')
  })

  it('GLASS.borderAccent and GLASS.gradientPanel are the same tier (A36)', () => {
    expect(GLASS.borderAccent).toBe(`1px solid ${tier.elevated.border}`)
    expect(GLASS.gradientPanel).toBe(
      `linear-gradient(180deg,${tier.elevated.gradient[0]},${tier.elevated.gradient[1]})`,
    )
  })
})

/**
 * F14 — the escape hatch the module documents, exercised the way a consumer writes it.
 *
 * Every one of the fragment's consumers SPREADS it, so the spread is the only form that
 * matters, and two plausible-looking ways to re-tint a card's sides are wrong. Both measured
 * here, both kept below as negative controls:
 *
 * 1. `{ ...glassCard, borderColor: X, borderTopColor: h }` — the sentence this replaces.
 *    Object spread keeps a duplicate key at the FIRST occurrence's position with the LAST
 *    value, so the "re-set" edge collapses back into the spread's slot at index 2 and
 *    `borderColor` (a four-side shorthand) lands after it and wipes it. First paint read
 *    `rgb(1, 1, 1)` where `rgba(184, 212, 240, 0.08)` was expected.
 * 2. Lifting the edge out first (`const { borderTopColor, ...base } = glassCard`) fixes first
 *    paint and STILL breaks on update: React writes only the keys that changed between
 *    renders, so an unchanged `borderTopColor` is skipped while the changed shorthand is
 *    written — and the shorthand erases it. Measured: `rgb(2, 2, 2)` on the second render.
 *
 * The form that survives both is the one with NO shorthand in it: three side LONGHANDS. There
 * is then nothing that can erase the edge, on any render, because nothing writes it.
 */
describe('the documented escape hatch actually works (F14)', () => {
  const TINT = 'rgb(1, 1, 1)'
  const TINT2 = 'rgb(2, 2, 2)'
  /** The prescribed form. */
  const tinted = (tint: string) => ({
    ...glassCard,
    borderRightColor: tint,
    borderBottomColor: tint,
    borderLeftColor: tint,
  })

  it('a re-tinted card keeps its lit edge on FIRST paint', () => {
    const { container } = render(<div style={tinted(TINT)} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderTopColor).toBe(HIGHLIGHT)
    expect(el.style.borderRightColor).toBe(TINT)
    expect(el.style.borderBottomColor).toBe(TINT)
    expect(el.style.borderLeftColor).toBe(TINT)
  })

  it('and keeps it across an UPDATE, which is where the other two forms fail', () => {
    const Card = ({ tint }: { tint: string }) => <div style={tinted(tint)} />
    const { container, rerender } = render(<Card tint={TINT} />)
    const el = () => container.firstElementChild as HTMLElement
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    rerender(<Card tint={TINT2} />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderRightColor).toBe(TINT2)
    rerender(<Card tint={SIDE_BORDER} />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderRightColor).toBe(SIDE_BORDER)
  })

  // Negative controls. Not wishes: if React or jsdom ever stopped resolving a duplicate spread
  // key at the first occurrence's position, or started re-writing unchanged style keys, these
  // would fail and the rule above would need re-deriving instead of being trusted.
  it('NEGATIVE CONTROL — the shorthand-then-longhand spread loses the edge on first paint', () => {
    const { container } = render(
      <div style={{ ...glassCard, borderColor: TINT, borderTopColor: glassCard.borderTopColor }} />,
    )
    expect((container.firstElementChild as HTMLElement).style.borderTopColor).toBe(TINT)
  })

  it('NEGATIVE CONTROL — lifting the edge out survives first paint and loses it on update', () => {
    const { borderTopColor: litEdge, ...base } = glassCard
    const Card = ({ tint }: { tint: string }) => (
      <div style={{ ...base, borderColor: tint, borderTopColor: litEdge }} />
    )
    const { container, rerender } = render(<Card tint={TINT} />)
    const el = () => container.firstElementChild as HTMLElement
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    rerender(<Card tint={TINT2} />)
    expect(el().style.borderTopColor).toBe(TINT2)
  })

  it('a boxShadow override after the spread drops the tier inset — compose instead', () => {
    const own = '0 0 12px rgba(43,140,193,0.2)'
    const { container } = render(
      <>
        <div data-testid="replaced" style={{ ...glassCard, boxShadow: own }} />
        <div data-testid="composed" style={{ ...glassCard, boxShadow: `${glassCard.boxShadow}, ${own}` }} />
      </>,
    )
    const inset = `inset 0 1px 0 ${tier.card.innerShadow}`
    expect(screen.getByTestId('replaced').style.boxShadow).not.toContain(inset)
    expect(screen.getByTestId('composed').style.boxShadow).toContain(inset)
    expect(screen.getByTestId('composed').style.boxShadow).toContain(own)
    expect(container).toBeTruthy()
  })
})

/**
 * F19 — `GLASS.shadowCard` carries BOTH scheme halves, like every other value in the wave.
 *
 * D2 as amended, verbatim: "Nothing hard-codes a dark value that has a light sibling." The
 * phone's light card shadow is not the dark one at a different alpha — it is TINTED
 * (`rgba(30,58,138,0.18)`, not black) and cast one pixel shorter, because a neutral black
 * shadow disappears against white (`Layout.ts:115-137`).
 *
 * Nothing anchors this: `Layout.shadow` is one of the three things the phone's design-sync
 * generator deliberately does not emit, and RN spells it as five props no CSS-shaped anchor
 * can read (ledger §95). These two literals ARE the gate.
 */
describe('the card elevation shadow ships both halves (F19 / A44, D2)', () => {
  it('transcribes Layout.shadow.card, both schemes, and consumes the rendered one', async () => {
    const { SHADOW_CARD } = await import('@/features/demo/ui/glass-tokens')
    expect(SHADOW_CARD).toEqual({
      // `Layout.ts:123-128` — shadowColor `rgba(30, 58, 138, 0.18)`, offset {0,3},
      // shadowOpacity 1 (so the colour's own alpha is final), radius 8.
      light: '0 3px 8px rgba(30,58,138,0.18)',
      // `Layout.ts:130-136` — `#000`, offset {0,4}, shadowOpacity 0.15, radius 8.
      dark: '0 4px 8px rgba(0,0,0,0.15)',
    })
    expect(GLASS.shadowCard).toBe(SHADOW_CARD[scheme])
  })
})
