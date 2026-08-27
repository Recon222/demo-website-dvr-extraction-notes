// Authored preview — PickerSheet. Bottom-anchored overlay sheet. PhoneOverlayPortal falls
// back to inline rendering with no context, so it anchors to a positioned, sized frame.
// Rendered with realistic option rows (DVR manufacturer list) + a Done footer.
import { PickerSheet } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ position: 'relative', background: '#002853', width: 378, height: 480, overflow: 'hidden', fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const OPTIONS = ['Hikvision', 'Dahua Technology', 'Lorex', 'Swann', 'Uniview']
const SELECTED = 'Dahua Technology'

function OptionRow({ label, selected }: { label: string; selected: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 14px',
        marginBottom: 6,
        borderRadius: 10,
        border: `1px solid ${selected ? 'rgba(43,140,193,0.55)' : '#1c4e84'}`,
        background: selected ? 'rgba(43,140,193,0.12)' : '#002853',
        color: selected ? '#e8f0f8' : '#cdd9e6',
        fontSize: 15,
        fontWeight: selected ? 600 : 500,
      }}
    >
      <span>{label}</span>
      {selected && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F6B99" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  )
}

const DONE = (
  <button
    type="button"
    style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#1F6B99,#17527A)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
  >
    Done
  </button>
)

export function Open() {
  return (
    <Phone>
      <PickerSheet title="DVR Manufacturer" onClose={() => {}} footer={DONE}>
        {OPTIONS.map((o) => (
          <OptionRow key={o} label={o} selected={o === SELECTED} />
        ))}
      </PickerSheet>
    </Phone>
  )
}
