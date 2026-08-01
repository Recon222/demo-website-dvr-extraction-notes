import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubmissionScreen } from '@/features/demo/ui/screens/SubmissionScreen'
import { RequestedScopeScreen } from '@/features/demo/ui/screens/RequestedScopeScreen'
import { ArrivalDepartureScreen } from '@/features/demo/ui/screens/ArrivalDepartureScreen'
import { DvrInfoScreen } from '@/features/demo/ui/screens/DvrInfoScreen'
import { CamerasScreen } from '@/features/demo/ui/screens/CamerasScreen'
import { ExportInfoScreen } from '@/features/demo/ui/screens/ExportInfoScreen'
import { CompletionScreen } from '@/features/demo/ui/screens/CompletionScreen'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import { FORM_FIELDS, getStepFields, isFieldAlwaysOn } from '@/features/demo/engine/content/form-customization'
import type { FormFieldId, FormStepId } from '@/features/demo/engine/types'

/**
 * P7.3's field gating, screen by screen — the half that makes a toggle mean something.
 *
 * Every field-capable screen is rendered TWICE: once with everything visible, once with one id
 * hidden, and the difference must be exactly that field's control. That shape is deliberate — a
 * test that only asserts "hidden field absent" passes just as well when the screen renders
 * nothing at all.
 */

const nav = { onNext: vi.fn(), onBack: vi.fn(), onMenu: vi.fn() }
const all = () => true
/** Everything visible except `hidden` — and its group members, which move as one. */
const allBut = (hidden: FormFieldId) => {
  const group = FORM_FIELDS.find((f) => f.id === hidden)?.group
  const off = new Set(
    group ? FORM_FIELDS.filter((f) => f.group === group).map((f) => f.id) : [hidden],
  )
  return (id: FormFieldId) => !off.has(id)
}

const submissionFields = {
  requesterName: 'L. McHugh',
  requesterBadge: '4471',
  requesterUnit: 'FVU',
  requesterPhone: '905-555-0000',
  requesterEmail: 'lm@peel.ca',
  businessName: "Kim's",
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  locationContact: 'S. Gill',
  locationPhone: '905-555-0001',
}

const completionProps = {
  summary: { occNumber: 'PR25-1', location: 'Kim’s', dvr: 'Hikvision', offset: null, scopes: 1, cameras: 1, export: 'USB' },
  isComplete: false,
  canComplete: true,
  validationErrors: [] as readonly string[],
  dateTimeCompleted: '',
  completedBy: '',
  onChange: vi.fn(),
  onPreviewPdf: vi.fn(),
  onPreviewTimeOffsetPdf: vi.fn(),
  onExportZip: vi.fn(),
  canExport: true,
  isExporting: false,
  onComplete: vi.fn(),
  onReviewAgain: vi.fn(),
  onBackToDashboard: vi.fn(),
  onBackToCases: vi.fn(),
}

/** Render one screen with a given gate. One switchboard so each case below is one line. */
function renderScreen(step: FormStepId, isFieldVisible: (id: FormFieldId) => boolean) {
  const form = blankLocationForm()
  switch (step) {
    case 'submission':
      return render(
        <SubmissionScreen occNumber="PR25-1" fields={submissionFields} isFieldVisible={isFieldVisible} onChange={vi.fn()} onCoordinates={vi.fn()} {...nav} />,
      )
    case 'requestedScope':
      return render(
        <RequestedScopeScreen
          scopes={[{ id: 's1', startDateTime: '', endDateTime: '', isActualTime: true, cameras: '' }]}
          onChange={vi.fn()}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          isFieldVisible={isFieldVisible}
          {...nav}
        />,
      )
    case 'arrivalDeparture':
      return render(
        <ArrivalDepartureScreen
          visits={[{ id: 'a1', arrival: '', departure: '' }]}
          onChange={vi.fn()}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          isFieldVisible={isFieldVisible}
          {...nav}
        />,
      )
    case 'dvrInfo':
      return render(
        <DvrInfoScreen
          dvr={{ ...form.dvr, firstRecordedDate: '2025-01-01' }}
          retention={{ totalRetention: 90, scopes: [{ label: 'Scope 1', daysUntilOverwritten: 30, overwrittenDate: '2025-04-01' }] }}
          onChange={vi.fn()}
          isFieldVisible={isFieldVisible}
          {...nav}
        />,
      )
    case 'cameras':
      return render(
        <CamerasScreen
          cameras={[{ id: 'c1', cameraName: 'Front', resolution: '1080p', recordingFps: '15' }]}
          onChange={vi.fn()}
          onAdd={vi.fn()}
          onRemove={vi.fn()}
          onCaptureGps={vi.fn()}
          isFieldVisible={isFieldVisible}
          {...nav}
        />,
      )
    case 'exportInfo':
      return render(<ExportInfoScreen data={form.export} onChange={vi.fn()} onToggleMediaPlayer={vi.fn()} isFieldVisible={isFieldVisible} {...nav} />)
    case 'completion':
      return render(<CompletionScreen {...completionProps} isFieldVisible={isFieldVisible} {...nav} />)
    default:
      throw new Error(`no fixture for step "${step}"`)
  }
}

/**
 * The on-screen control each toggle governs, by field id. The name is what a visitor reads —
 * a label, a section title, or (for the two derived retention blocks) the heading of the card
 * that renders the computation. Every switchable field on a field-capable screen appears here;
 * the completeness of THIS map against the registry is asserted below, so a field added to the
 * grid without a control to hide is a test failure rather than a dead switch.
 */
/** A control is located either by its visible label or, for the two GPS BLOCKS (which are a
 *  capture button + a coordinate card rather than one label), by the block's own testid. */
type Locate = () => HTMLElement[]
const byText = (re: RegExp): Locate => () => screen.queryAllByText(re)
const byTestId = (id: string): Locate => () => screen.queryAllByTestId(id)

const CONTROL: Partial<Record<FormFieldId, Locate>> = {
  'submission.requesterName': byText(/^Requester Name$/),
  'submission.requesterBadgeNumber': byText(/^Requester Badge$/),
  'submission.requesterUnit': byText(/^Requester Unit$/),
  'submission.requesterPhone': byText(/^Requester Phone$/),
  'submission.requesterEmail': byText(/^Requester Email$/),
  'submission.latitude': byTestId('gps-capture-control'),
  'submission.locationContact': byText(/^Contact Person$/),
  'submission.locationPhone': byText(/^Contact Phone$/),
  'scope.isActualTime': byText(/^Time Entry Type$/),
  'scope.cameras': byText(/^Cameras$/),
  'arrival.arrivalDateTime': byText(/^Arrival$/),
  'arrival.departureDateTime': byText(/^Departure$/),
  'dvr.dvrLocation': byText(/^DVR Location$/),
  'dvr.dvrTypeBrand': byText(/^DVR Type \/ Brand$/),
  'dvr.serialModelNumber': byText(/^Serial \/ Model Number$/),
  'dvr.dvrUsername': byText(/^DVR Username$/),
  'dvr.dvrPassword': byText(/^DVR Password$/),
  'dvr.numberOfChannels': byText(/^Channels$/),
  'dvr.activeCameras': byText(/^Active Cameras$/),
  'dvr.recordingSchedule': byText(/^Recording Schedule$/),
  'dvr.resolution': byText(/^Resolution$/),
  'dvr.recordingFps': byText(/^Recording FPS$/),
  'dvr.firstRecordedDate': byText(/^First Recorded Date$/),
  'dvr.totalDvrRetention': byText(/^Total DVR Retention$/),
  'dvr.daysUntilOverwritten': byText(/^Retention status by scope$/),
  'camera.cameraName': byText(/^Camera Name \/ Location$/),
  'camera.resolution': byText(/^Resolution$/),
  'camera.recordingFps': byText(/^FPS$/),
  'camera.latitude': byTestId('camera-gps-c1'),
  'export.exportMedia': byText(/^Export Media$/),
  'export.fileType': byText(/^File Type$/),
  'export.sizeGb': byText(/^Total Size \(GB\)$/),
  'export.mediaPlayerIncluded': byText(/^Media player included$/),
  'export.mediaProvidedVia': byText(/^Provided Via$/),
  'completion.dateTimeCompleted': byText(/^Date \/ Time Completed$/),
  'completion.completedBy': byText(/^Completed By$/),
}

const FIELD_CAPABLE: readonly FormStepId[] = [
  'submission',
  'requestedScope',
  'arrivalDeparture',
  'dvrInfo',
  'cameras',
  'exportInfo',
  'completion',
]

describe('every switchable field hides exactly its own control', () => {
  for (const step of FIELD_CAPABLE) {
    for (const field of getStepFields(step)) {
      const control = CONTROL[field.id]
      if (!control) continue // always-on, or a group member covered by its leader — asserted below
      it(`${step}: "${field.id}"`, () => {
        const { unmount } = renderScreen(step, all)
        expect(control().length, `"${field.id}" has no control on screen when visible`).toBeGreaterThan(0)
        unmount()

        renderScreen(step, allBut(field.id))
        expect(control(), `"${field.id}" still renders when hidden`).toHaveLength(0)
      })
    }
  }
})

describe('the control map is complete against the registry', () => {
  it('names a control for every switchable field on a field-capable screen', () => {
    // Always-on fields have no switch, and grouped fields are represented by their leader —
    // everything else must be here, or its toggle would move nothing.
    const groupsCovered = new Set(
      FORM_FIELDS.filter((f) => f.group && CONTROL[f.id]).map((f) => f.group),
    )
    const missing = FIELD_CAPABLE.flatMap((step) => getStepFields(step))
      .filter((f) => !CONTROL[f.id])
      .filter((f) => !(f.group && groupsCovered.has(f.group)))
      .map((f) => f.id)
    // What is left is exactly the always-on set on these screens — the fields that have no
    // switch to honour, in registry order.
    expect(missing).toEqual([
      'submission.occNumber',
      'submission.businessName',
      'submission.streetAddress',
      'submission.city',
      'submission.address',
      'scope.startDateTime',
      'scope.endDateTime',
    ])
    for (const id of missing) expect(isFieldAlwaysOn(id as FormFieldId), `"${id}" has no control and no lock`).toBe(true)
  })
})

describe('the DVR Retention placeholder never names a control the screen has hidden (R-8)', () => {
  it('asks for the date while the picker is there, and points at Settings when it is not', () => {
    const form = blankLocationForm()
    const empty = { totalRetention: null, scopes: [] }
    const { unmount } = render(
      <DvrInfoScreen dvr={form.dvr} retention={empty} onChange={vi.fn()} isFieldVisible={all} {...nav} />,
    )
    expect(screen.getByTestId('dvr-retention-empty')).toHaveTextContent('Pick the first recorded date')
    unmount()

    render(
      <DvrInfoScreen
        dvr={form.dvr}
        retention={empty}
        onChange={vi.fn()}
        isFieldVisible={(id) => id !== 'dvr.firstRecordedDate'}
        {...nav}
      />,
    )
    expect(screen.queryByText(/^First Recorded Date$/)).not.toBeInTheDocument()
    expect(screen.getByTestId('dvr-retention-empty')).toHaveTextContent('Turn First Recorded Date back on')
  })
})

describe('the submission coordinate group is a BLOCK, not just its button (§82b)', () => {
  const coordinates = { lat: 43.6087, lng: -79.6505, accuracyM: 8, source: 'gps' as const }

  it('takes the coordinate card with the capture control', () => {
    // The registry-driven loop above cannot cover this: its fixture carries no coordinates, so
    // `CoordinateDisplay` is absent from BOTH arms of the visible/hidden diff and the card could
    // be moved outside the gate unnoticed (review R-2a).
    const { unmount } = render(
      <SubmissionScreen occNumber="PR25-1" fields={submissionFields} coordinates={coordinates} isFieldVisible={all} onChange={vi.fn()} onCoordinates={vi.fn()} {...nav} />,
    )
    expect(screen.getByTestId('gps-capture-control')).toBeInTheDocument()
    expect(screen.getByText(/43\.6087/)).toBeInTheDocument()
    unmount()

    render(
      <SubmissionScreen
        occNumber="PR25-1"
        fields={submissionFields}
        coordinates={coordinates}
        isFieldVisible={(id) => id !== 'submission.latitude'}
        onChange={vi.fn()}
        onCoordinates={vi.fn()}
        {...nav}
      />,
    )
    expect(screen.queryByTestId('gps-capture-control')).not.toBeInTheDocument()
    expect(screen.queryByText(/43\.6087/)).not.toBeInTheDocument()
  })
})

describe('a section card goes when its last field does', () => {
  it('drops Requester Information, and keeps Location Information (address is always-on)', () => {
    const requester: FormFieldId[] = [
      'submission.requesterName',
      'submission.requesterBadgeNumber',
      'submission.requesterUnit',
      'submission.requesterPhone',
      'submission.requesterEmail',
    ]
    renderScreen('submission', (id) => !requester.includes(id))
    expect(screen.queryByText('Requester Information')).not.toBeInTheDocument()
    expect(screen.getByText('Location Information')).toBeInTheDocument()
    expect(screen.getByText('Case Information')).toBeInTheDocument()
  })

  it('drops each DVR card independently', () => {
    const basics: FormFieldId[] = ['dvr.dvrLocation', 'dvr.dvrTypeBrand', 'dvr.serialModelNumber', 'dvr.dvrUsername', 'dvr.dvrPassword']
    renderScreen('dvrInfo', (id) => !basics.includes(id))
    expect(screen.queryByText('Basic DVR Details')).not.toBeInTheDocument()
    expect(screen.getByText('Recording Configuration')).toBeInTheDocument()
    expect(screen.getByText('Retention')).toBeInTheDocument()
  })

  it('drops the Completion Details card while leaving the export actions reachable', () => {
    // Completion is a must-stay screen precisely because its buttons are not fields.
    renderScreen('completion', (id) => id !== 'completion.dateTimeCompleted' && id !== 'completion.completedBy')
    expect(screen.queryByText('Completion Details')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Preview \/ Export PDF/ })).toBeInTheDocument()
  })
})
