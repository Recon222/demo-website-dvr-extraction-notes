// Authored preview — ModalShell. The bottom-sheet modal chrome (title + close + scrolling body)
// shared by New Case / New Location / Import. Renders absolute inset:0, so it needs a
// position:relative, sized phone frame to anchor into.
import { ModalShell } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 720, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const labelStyle = { fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 } as const
const inputStyle = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid #1c4e84',
  background: '#002853',
  color: '#f0f4f8',
  fontSize: 15,
  padding: '11px 12px',
  outline: 'none',
} as const

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      <input readOnly value={value} aria-label={label} style={inputStyle} />
    </div>
  )
}

export function NewCase() {
  return (
    <Phone>
      <ModalShell title="New Case" onClose={() => {}} closeAccessibilityLabel="Close new case">
        <Row label="Case / OCC Number" value="PR-2026-0114-2287" />
        <Row label="Display Name" value="Northgate Convenience — armed robbery" />
        <Row label="Investigative Unit" value="Major Crime — Video Unit" />
        <Row label="Officer in Charge" value="Det. M. Okafor (#4471)" />
      </ModalShell>
    </Phone>
  )
}

export function AddLocation() {
  return (
    <Phone>
      <ModalShell title="Add Location" onClose={() => {}} closeAccessibilityLabel="Close add location">
        <Row label="Location Name" value="Northgate Convenience" />
        <Row label="Street Address" value="1450 Dundas St E" />
        <Row label="City" value="Mississauga" />
        <Row label="On-site Contact" value="S. Panag (owner) — 905-555-0198" />
      </ModalShell>
    </Phone>
  )
}
