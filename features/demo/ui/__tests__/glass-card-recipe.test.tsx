import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
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
import { caseStatusTheme, locationStatusTheme, type CaseCard } from '@/features/demo/ui/screens/screenData'

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

const CARD_GRADIENT = normGradient(GLASS.gradientCard)
const DIAG_GRADIENT = normGradient(GLASS.gradientCardDiag)
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
      // A32 + A44 on one declaration: the tier's inset, then the card elevation.
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
