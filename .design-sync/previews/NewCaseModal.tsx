// Authored preview — NewCaseModal. Bottom-sheet create form (case# + personnel accordions
// + incident location w/ coordinate chip). ModalShell portals inline, so it anchors to the
// position:relative frame. Variant axis = filled vs empty.
import { NewCaseModal } from 'open-pro-next'

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

const FILLED = {
  caseNumber: 'PR-2026-0114-2287',
  displayName: 'Northgate Convenience B&E',
  unit: 'Major Crime — Video Unit',
  oicName: 'Det. M. Okafor',
  oicBadge: '4471',
  vcName: 'Cst. R. Patel',
  vcBadge: '5120',
  incidentBusinessName: 'Northgate Convenience',
  incidentStreetAddress: '1450 Dundas St E',
  incidentCity: 'Mississauga',
  incidentLatitude: '43.6012',
  incidentLongitude: '-79.6089',
  incidentCoordinateSource: 'geocoded',
  notes: 'Commercial break & enter overnight; entry via rear stockroom door. Recover Ch1/Ch3/Ch4.',
}

const EMPTY = {
  caseNumber: '',
  displayName: '',
  unit: '',
  oicName: '',
  oicBadge: '',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  incidentLatitude: '',
  incidentLongitude: '',
  incidentCoordinateSource: '',
  notes: '',
}

export function Filled() {
  return (
    <Modal height={920}>
      <NewCaseModal form={FILLED} onChange={noop} onSubmit={noop} onCancel={noop} />
    </Modal>
  )
}

export function Empty() {
  return (
    <Modal height={820}>
      <NewCaseModal form={EMPTY} onChange={noop} onSubmit={noop} onCancel={noop} />
    </Modal>
  )
}
