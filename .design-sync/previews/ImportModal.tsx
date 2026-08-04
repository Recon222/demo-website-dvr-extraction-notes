// Authored preview — ImportModal. Bottom-sheet import flow; variant axis = stage
// (picker | paste | progress | result). ModalShell portals inline with no context,
// so it anchors to the position:relative frame.
import { ImportModal } from 'open-pro-next'

function Modal({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#0d1b2a', width: 378, height, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const noop = () => {}
const callbacks = {
  onPickPdf: noop,
  onChoosePaste: noop,
  onTextChange: noop,
  onRun: noop,
  onBack: noop,
  onRetry: noop,
  onOpenLocation: noop,
  onCancel: noop,
}

const PASTED = `From: Det. M. Okafor <m.okafor@peelpolice.ca>
Subject: CCTV recovery request — OCC PR-2026-0114-2287

Please recover footage for a commercial B&E at Northgate
Convenience, 1450 Dundas St E, Mississauga. On-site contact
S. Panag (owner), 905-555-0198.

DVR: Hikvision DS-7208HQHI-K1, ~21 day retention, video
monitor present. Cameras of interest: Ch1 (counter), Ch3
(entrance), Ch4 (stockroom).

Time range: 2026-01-12 22:00 to 2026-01-13 02:30 (actual time).`

const STAGES = [
  { label: 'Reading PDF text', state: 'done' as const },
  { label: 'Extracting fields with the model', state: 'active' as const },
  { label: 'Mapping to the case schema', state: 'pending' as const },
  { label: 'Validating time ranges', state: 'pending' as const },
]

const RESULT_VIEW = {
  locId: 'loc-northgate',
  title: 'Northgate Convenience',
  caseNumber: 'PR-2026-0114-2287',
  fieldCount: 14,
  timeFrameCount: 2,
  sections: [
    {
      heading: 'Requesting Officer',
      rows: [
        { label: 'Name', value: 'Det. M. Okafor' },
        { label: 'Badge', value: '4471' },
        { label: 'Phone', value: '905-555-0142' },
        { label: 'Email', value: 'm.okafor@peelpolice.ca' },
      ],
    },
    {
      heading: 'Recovery Location',
      rows: [
        { label: 'Offence', value: 'Commercial break & enter' },
        { label: 'Business', value: 'Northgate Convenience' },
        { label: 'Street', value: '1450 Dundas St E' },
        { label: 'City', value: 'Mississauga' },
        { label: 'On-site contact', value: 'S. Panag (owner)' },
      ],
    },
    {
      heading: 'DVR Information',
      rows: [
        { label: 'Make / Model', value: 'Hikvision DS-7208HQHI-K1' },
        { label: 'Retention', value: '~21 days' },
        { label: 'Video monitor', value: 'Yes' },
      ],
    },
  ],
  scopes: [
    { label: 'Scope 1', range: '2026-01-12 22:00:00 → 2026-01-13 02:30:00', isActualTime: true, cameras: 'Ch1, Ch3, Ch4' },
    { label: 'Scope 2', range: '2026-01-13 07:15:00 → 2026-01-13 08:00:00', isActualTime: false, cameras: 'Ch1' },
  ],
  warnings: [{ field: 'DVR Password', reason: 'DVR password was not provided in the request — left blank.' }],
  isSample: false,
}

export function Picker() {
  return (
    <Modal height={720}>
      <ImportModal stage="picker" text="" stages={[]} result={null} batch={null} {...callbacks} />
    </Modal>
  )
}

export function Paste() {
  return (
    <Modal height={720}>
      <ImportModal stage="paste" text={PASTED} stages={[]} result={null} batch={null} {...callbacks} />
    </Modal>
  )
}

export function Progress() {
  return (
    <Modal height={720}>
      <ImportModal stage="progress" text="" stages={STAGES} result={null} batch={{ current: 2, total: 3 }} {...callbacks} />
    </Modal>
  )
}

export function Result() {
  return (
    <Modal height={900}>
      <ImportModal
        stage="result"
        text=""
        stages={[]}
        result={{ ok: true, locations: [RESULT_VIEW], failures: [] }}
        batch={null}
        {...callbacks}
      />
    </Modal>
  )
}
