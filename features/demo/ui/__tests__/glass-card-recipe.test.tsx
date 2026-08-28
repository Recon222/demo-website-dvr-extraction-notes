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
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'
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
 * Whether the consumed scheme's `card` tier gives the lit edge a colour of its own (W4/F85).
 *
 * In DARK it does — `rgba(184,212,240,0.08)` against a `rgba(28,78,132,0.5)` side. In LIGHT the
 * phone deliberately sets the two to the SAME value (`tokens/glass-tiers.ts:73-74`, lifted from
 * `Colors.ts:279,281` whose own comment reads *"matches the border, for visibility"*); three of
 * light's other five tiers do it too. There is no light to catch on a white surface, so light's
 * "lit edge" is a border that happens to run along the top.
 *
 * So the DISTINCTNESS tripwire below has a signal only where the two tokens differ. It is not
 * skipped in light to make the flip green — it is skipped because in light it cannot observe
 * anything: the shorthand-override regression it hunts is caught there by the two `toBe` lines
 * above it (an override drives all four sides to the override's colour, which is neither
 * `HIGHLIGHT` nor `SIDE_BORDER`), and by the no-shorthand-key assertion in the next case.
 */
const EDGE_IS_DISTINCT = HIGHLIGHT !== SIDE_BORDER

/**
 * The card surfaces that ARE cards on a `<button>`, by `data-testid` (U5.4).
 *
 * `LocationRow` is the first — the map sheet's row is pressable and paints the card tier, which
 * is the phone's own shape (`map-view/components/LocationRow.tsx:73-97`: a `Pressable` wrapping
 * the `GlassColors[scheme].card` gradient). It is exactly the "a future card on a `<button>`"
 * case the note below reserved, so it is named rather than admitted by loosening the filter.
 */
const CARD_BUTTONS: ReadonlySet<string> = new Set(['location-row'])

/**
 * Every element painting the card gradient, minus `<button>`s that are not named above.
 *
 * The one button that paints it and is NOT a card is `AudioRecorderScreen`'s transport pill
 * (`:481`, `borderRadius: 21`) — U7.2's DEF-UI-008 carve-out keeps it on its own gradient
 * deliberately. A card on a `<button>` belongs in `CARD_BUTTONS` explicitly, not silently.
 */
function cardSurfaces(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
    (el) =>
      el.style.backgroundImage === CARD_GRADIENT &&
      (el.tagName !== 'BUTTON' || CARD_BUTTONS.has(el.dataset.testid ?? '')),
  )
}

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn(), isFieldVisible: () => true }

const mapRowItem = sheetLocation({ businessName: 'Kim', address: '1450 Eglinton, Mississauga' })

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
  // U5.4 — the map sheet's row, and the first card painted on a `<button>` (see `CARD_BUTTONS`).
  ['LocationRow (map)', () => render(<LocationRow item={mapRowItem} selected={false} onSelect={vi.fn()} />), 1],
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
      if (EDGE_IS_DISTINCT) expect(card.style.borderTopColor).not.toBe(card.style.borderRightColor)
      // A32 + A44 on one declaration: the tier's inset, then the card elevation. This line
      // pins the COMPOSITION — that both halves reach the DOM, in that order (probe P6:
      // dropping the elevation half KILLS it). `GLASS.shadowCard`'s VALUE is pinned by the
      // literal in `glass-tokens.test.ts`, not here: a `0 4px 8px -> 9px` drift survives this
      // line (probe P7) and dies there, and duplicating A44's literal in two files would make
      // a legitimate re-base a two-file edit for no extra falsifiability.
      expect(card.style.boxShadow).toBe(`inset 0 1px 0 ${tier.card.innerShadow}, ${GLASS.shadowCard}`)
    }
  })

  it('carries NO border shorthand key — the ruled fragment shape', () => {
    // What replaced the old key-ORDER pin, and it is the stronger invariant. Ordering only
    // mattered while a shorthand existed to be ordered against; the measured ruling
    // (`partner-lit-edge-ruling.md` §3, 40 cells x 3 paints, jsdom AND Chromium, zero
    // disagreement) is that a fragment carrying ANY of these keys hands its consumers a trap
    // no ordering can close — `{ ...f, border: X }` was OK on first paint and wrong on the
    // next. Longhands only leaves nothing to clobber.
    for (const fragment of [glassCard, glassCardNested]) {
      for (const banned of ['border', 'borderColor', 'borderTop'] as const) {
        expect(Object.keys(fragment), `a card fragment must not carry \`${banned}\``).not.toContain(banned)
      }
      expect(Object.keys(fragment)).toEqual(
        expect.arrayContaining(['borderStyle', 'borderWidth', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopColor']),
      )
    }
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
    // TWO since U6.4b: the per-scope row, and the Total DVR Retention box it joined. That box
    // was a private `rgba(43,140,193,0.08)` wash under the `elevated` border — an accent fill
    // at 0.08 beneath an accent border at 0.25, a pairing no tier spells. The phone has both on
    // `nestedCard` (`dvr-information.tsx:401` and `:429`), which is what makes them one family.
    expect(rows).toHaveLength(2)
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
  /**
   * U6.4b / M1(a) — this case's SUBJECT moved, and its GUARANTEE did not.
   *
   * U1.3 left a `SEAM(U6.4b)` note here saying the glow assertion below should be deleted when
   * the glow went, and that "the gradient assertion above must survive untouched". Refuted at
   * source: M1(a) drops the tier as well as the glow. Matrix row 46, verbatim — *"M1(a): the
   * summary card DROPS `techGlow` + `elevated` to a plain nested glass card"* — and the phone's
   * own card is `<Card glass glassVariant="nestedCard">` with `techGlow` never passed
   * (`app/(form)/completion.tsx:532-536`). The plan row abbreviates M1(a) to just the glow,
   * which is what U1.3's note was written against.
   *
   * So the case is re-pointed rather than deleted: U1.3's real guarantee is that the private
   * `0.9/0.96` near-miss cannot come back, and that is asserted here in the form it now takes —
   * this screen holds NO elevated panel at all, and the summary card is the nested tier.
   */
  it('CompletionScreen — the OCC summary card took the nested tier, near-miss and glow both gone', () => {
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
    // No elevated panel survives on this screen — M1(a) took the only one.
    const panels = Array.from(container.querySelectorAll<HTMLElement>('*')).filter(
      (el) => el.style.backgroundImage === PANEL_GRADIENT,
    )
    expect(panels).toHaveLength(0)
    // ...and the near-miss it absorbed is not back either. This is the assertion U1.3 actually
    // needed: a source-independent ban on the private 0.9/0.96 pair, which no tier spells.
    const nearMiss = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) =>
      /rgba\([^)]*,\s*0\.9\)[\s\S]*rgba\([^)]*,\s*0\.96\)/.test(el.style.backgroundImage),
    )
    expect(nearMiss).toHaveLength(0)
    // The summary card is the NESTED tier now, glow included — `expectNestedTier` asserts
    // `boxShadow` is the tier's inset ALONE, so a returning `0 0 22px` accent bloom reds here.
    expectNestedTier(screen.getByText(/^OCC #/).parentElement as HTMLElement)
  })

  it('GLASS.borderAccent and GLASS.gradientPanel are the same tier (A36)', () => {
    expect(GLASS.borderAccent).toBe(`1px solid ${tier.elevated.border}`)
    expect(GLASS.gradientPanel).toBe(
      `linear-gradient(180deg,${tier.elevated.gradient[0]},${tier.elevated.gradient[1]})`,
    )
  })
})

/**
 * The lit-edge composition rule, as RULED — `partner-lit-edge-ruling.md` §3-§4.
 *
 * Settled by measurement, not argument: 40 cells x 3 paints in jsdom AND real Chromium
 * (react-dom 19.2.3), zero OK/XX disagreement between the two environments. Two earlier
 * answers this file used to encode both fell over in that matrix:
 *
 *   - `{ ...f, borderColor: X, borderTopColor: h }` — spread keeps a duplicate key at the
 *     FIRST occurrence's position with the LAST value, so the "re-set" edge collapses back
 *     into the spread's slot and the shorthand lands after it. Wrong on first paint.
 *   - lifting the edge out of the fragment first — right on first paint, wrong on the next:
 *     React writes only the keys that CHANGED, so an unchanged `borderTopColor` is skipped
 *     while the changed shorthand is written.
 *
 * The ruling removes the trap from the FRAGMENT rather than asking consumers to dodge it:
 * `glassCard` and `glassCardNested` carry `borderStyle` / `borderWidth` / the three side
 * colour longhands / `borderTopColor`, and NO shorthand key at all. A consumer then re-tints
 * with colour longhands, and there is nothing left that can clobber the edge on any paint.
 *
 * The cells below are the ruling's own: p1, p2, and the conditional case that is A2's unique
 * win — when the side longhands COLLAPSE out of the object, the sides self-heal to the
 * fragment's own tint instead of falling back to `currentColor` (Chromium) / `""` (jsdom),
 * which is what every shorthand-carrying shape did.
 */
describe('the lit-edge composition rule (ruled: fragments carry only longhands)', () => {
  const TINT = 'rgb(1, 1, 1)'
  const TINT2 = 'rgb(2, 2, 2)'
  const sideLonghands = (tint: string) => ({
    borderRightColor: tint,
    borderBottomColor: tint,
    borderLeftColor: tint,
  })

  it('p1 — a re-tinted card keeps its lit edge on first paint', () => {
    const { container } = render(<div style={{ ...glassCard, ...sideLonghands(TINT) }} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.borderTopColor).toBe(HIGHLIGHT)
    expect(el.style.borderRightColor).toBe(TINT)
    expect(el.style.borderBottomColor).toBe(TINT)
    expect(el.style.borderLeftColor).toBe(TINT)
  })

  it('p2/p3 — and across updates that change the tint', () => {
    const Card = ({ tint }: { tint: string }) => <div style={{ ...glassCard, ...sideLonghands(tint) }} />
    const { container, rerender } = render(<Card tint={TINT} />)
    const el = () => container.firstElementChild as HTMLElement
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    rerender(<Card tint={TINT2} />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderRightColor).toBe(TINT2)
    rerender(<Card tint={TINT} />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderRightColor).toBe(TINT)
  })

  it('the CONDITIONAL form self-heals — sides collapse back to the fragment tint, not to nothing', () => {
    // `...(expanded && sideLonghands(T))` — the shape a real consumer writes for a lit/idle
    // card. Every shorthand-carrying fragment left `border-left-color` at `currentColor` /
    // `""` on the collapse render (ruling Appendix A, `removeSides`); the longhands-only
    // fragment restores its own tint, because that is the only declaration left standing.
    const Card = ({ expanded }: { expanded: boolean }) => (
      <div style={{ ...glassCard, ...(expanded && sideLonghands(TINT)) }} />
    )
    const { container, rerender } = render(<Card expanded />)
    const el = () => container.firstElementChild as HTMLElement
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderLeftColor).toBe(TINT)
    rerender(<Card expanded={false} />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderLeftColor).toBe(SIDE_BORDER)
    rerender(<Card expanded />)
    expect(el().style.borderTopColor).toBe(HIGHLIGHT)
    expect(el().style.borderLeftColor).toBe(TINT)
  })

  // Negative controls. Not wishes: if React or jsdom ever stopped resolving a duplicate spread
  // key at the first occurrence's position, or started re-writing unchanged style keys, these
  // fail and the ruling gets re-derived instead of trusted (the ruling names them as exactly
  // that tripwire). Both cells are silent in React's own detector, which is why the
  // `conflicting property` guard in `vitest.setup.ts` is a complement to them and not a
  // replacement.
  it('NEGATIVE CONTROL — a `borderColor` override after the spread loses the edge on first paint', () => {
    const { container } = render(<div style={{ ...glassCard, borderColor: TINT }} />)
    expect((container.firstElementChild as HTMLElement).style.borderTopColor).toBe(TINT)
  })

  it('NEGATIVE CONTROL — a `border` override now loses it on FIRST paint too, not on the second', () => {
    // The ruling's headline change for this fragment. Under the old shape this cell was
    // `OK p1, FAIL p2` — a trap that shipped green through a first-render-only test. With no
    // shorthand in the fragment there is nothing for `border` to agree with, so it is wrong
    // immediately and any render-once pin catches it.
    const { container } = render(<div style={{ ...glassCard, border: `1px solid ${TINT}` }} />)
    expect((container.firstElementChild as HTMLElement).style.borderTopColor).toBe(TINT)
  })

  it('a boxShadow override after the spread drops the tier inset — compose instead', () => {
    const own = '0 0 12px rgba(43,140,193,0.2)'
    render(
      <>
        <div data-testid="replaced" style={{ ...glassCard, boxShadow: own }} />
        <div data-testid="composed" style={{ ...glassCard, boxShadow: `${glassCard.boxShadow}, ${own}` }} />
      </>,
    )
    const inset = `inset 0 1px 0 ${tier.card.innerShadow}`
    expect(screen.getByTestId('replaced').style.boxShadow).not.toContain(inset)
    expect(screen.getByTestId('composed').style.boxShadow).toContain(inset)
    expect(screen.getByTestId('composed').style.boxShadow).toContain(own)
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
    // Pins that the consumed half is the one that ships. It does NOT catch the indirection
    // being SEVERED back to a spelled `'0 4px 8px rgba(0,0,0,0.15)'` — measured, probe Q7,
    // SURVIVED (exit 0) — because the severed literal equals `SHADOW_CARD[scheme]` while
    // `scheme` is `'dark'`, and a literal-vs-reference distinction is not observable at
    // runtime (same class as U1.1's P4b). That is exactly the class W1/F18 files against
    // `GLASS_TIER.dark`, and its source scan is the mechanism that catches it: `SHADOW_CARD`
    // belongs in that scan's list. Not duplicated here — F18's owner holds that file.
    expect(GLASS.shadowCard).toBe(SHADOW_CARD[scheme])
  })
})
