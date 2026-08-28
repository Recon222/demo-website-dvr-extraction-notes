// Authored preview — NewLocationModal. Bottom-sheet recovery-location form (name + business +
// address + contact + Capture GPS). ModalShell portals inline, anchors to position:relative frame.
// Variant axis = filled vs empty.
import { NewLocationModal } from 'open-pro-next'

function Modal({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const noop = () => {}

const FILLED = {
  locationName: 'Front entrance',
  businessName: 'Northgate Convenience',
  streetAddress: '1450 Dundas St E',
  city: 'Mississauga',
  locationContact: 'S. Panag (owner)',
  locationPhone: '905-555-0198',
  // `source` became required on the coordinate object: 'manual' | 'gps' | 'geocoded'.
  coordinates: { lat: 43.6012, lng: -79.6089, source: 'geocoded' as const },
}

const EMPTY = {
  locationName: '',
  businessName: '',
  streetAddress: '',
  city: '',
  locationContact: '',
  locationPhone: '',
}

export function Filled() {
  return (
    <Modal height={760}>
      <NewLocationModal form={FILLED} onChange={noop} onSubmit={noop} onCancel={noop} />
    </Modal>
  )
}

export function Empty() {
  return (
    <Modal height={760}>
      <NewLocationModal form={EMPTY} onChange={noop} onSubmit={noop} onCancel={noop} />
    </Modal>
  )
}
