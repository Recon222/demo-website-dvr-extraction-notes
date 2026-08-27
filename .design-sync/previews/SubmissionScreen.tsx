// Authored preview — SubmissionScreen. Text-heavy wizard screen: OCC#, requester + location
// fields. This is the calibration text-heavy solo (fonts/typography surface).
import { SubmissionScreen } from 'open-pro-next'

const FIELDS = {
  requesterName: 'Det. M. Okafor',
  requesterBadge: '4471',
  requesterUnit: 'Major Crime — Video Unit',
  requesterPhone: '905-555-0142',
  requesterEmail: 'm.okafor@peelpolice.ca',
  businessName: 'Northgate Convenience',
  streetAddress: '1450 Dundas St E',
  city: 'Mississauga',
  locationContact: 'S. Panag (owner)',
  locationPhone: '905-555-0198',
}

export function Filled() {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
      <SubmissionScreen
        occNumber="PR-2026-0114-2287"
        fields={FIELDS}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
        onPickCoords={() => {}}
      />
    </div>
  )
}

export function Empty() {
  return (
    <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>
      <SubmissionScreen
        occNumber="PR-2026-0114-2287"
        fields={{ requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
        onPickCoords={() => {}}
      />
    </div>
  )
}
