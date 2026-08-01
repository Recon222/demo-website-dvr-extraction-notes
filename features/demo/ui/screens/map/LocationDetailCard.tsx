'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { MAP_PIN_COLORS, STATUS_LABEL, SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { formatCoordinate } from '@/features/demo/engine/logic/coordinates'

export interface LocationDetailCardProps {
  item: SheetItem
  onBack(): void
  onCall(number: string): void
  onEmail(address: string): void
  onGoToLocation(id: string): void
  /** Incident variant only — opens the incident-location editor for the case (matrix row 22:
   *  this CTA is the sole entry to row 23). The id is the CASE id (incident items carry it). */
  onEditIncident(caseId: string): void
  /**
   * Location variant only — whether THIS location's cameras are currently plotted on the map.
   * Drives the toggle's label + expanded state; defaults to hidden, exactly as the phone's
   * `camerasShown` does (LocationDetailCard.tsx:119-123, 348).
   */
  camerasShown?: boolean
  /** Location variant only — flips the cameras on/off. The row is only rendered when the
   *  location has geolocated cameras AND a handler exists to act on the press. */
  onToggleCameras?(): void
}

const container: CSSProperties = { padding: '14px 16px 24px' }
const backBtn: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 16, border: 'none', background: 'rgba(43,140,193,0.14)', color: '#4ba3d4', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 14 }
const nameRow: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }
const name: CSSProperties = { fontSize: 21, fontWeight: 700, color: SHEET_COLORS.text, letterSpacing: -0.3, flex: 1 }
const card: CSSProperties = { background: SHEET_COLORS.infoBg, border: `1px solid ${SHEET_COLORS.divider}`, borderRadius: 12, padding: 13, marginBottom: 12 }
const cardLabel: CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: SHEET_COLORS.textFaint, marginBottom: 8 }
const rowText: CSSProperties = { fontSize: 14, fontWeight: 500, color: SHEET_COLORS.text, padding: '6px 0' }
const tapRow: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 0', color: MAP_PIN_COLORS.working, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const cta: CSSProperties = { width: '100%', height: 48, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#1a8fc2,#0f6f9e)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 6 }
/** Phone copy, verbatim (ui-mapping 03:256/262 — `IncidentDetailCard`'s only CTA). */
export const EDIT_INCIDENT_LABEL = 'Edit Incident Location'
const chip = (color: string): CSSProperties => ({ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.4, padding: '4px 10px', borderRadius: 10, background: `${color}25`, marginTop: 2, whiteSpace: 'nowrap' })

/** The cameras toggle row — a bordered, tappable card between the address and the requester
 *  cards, matching the phone's placement (LocationDetailCard.tsx:503-540). */
const camerasToggle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '11px 13px',
  marginBottom: 12,
  borderRadius: 12,
  border: `1px solid ${active ? 'rgba(43,140,193,0.5)' : SHEET_COLORS.divider}`,
  background: active ? 'rgba(43,140,193,0.12)' : SHEET_COLORS.infoBg,
  color: SHEET_COLORS.text,
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
})

/**
 * "2" when every camera plots, "2 of 5" when some have no GPS fix (review R-19). A camera the
 * wizard lists but the map cannot place is a partial result, and the repo counts partial results
 * rather than quietly shortening the list.
 */
export function cameraCountLabel(plotted: number, total: number): string {
  return total > plotted ? `${plotted} of ${total}` : String(plotted)
}

/** Stand-in for the phone's Ionicons `videocam` / `videocam-outline`: the demo has no icon font,
 *  so the camcorder is drawn inline — filled when the cameras are shown, outlined when hidden. */
function CamcorderGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="2.5"
        y="6.5"
        width="12"
        height="11"
        rx="2.5"
        fill={filled ? '#2B8CC1' : 'none'}
        stroke="#2B8CC1"
        strokeWidth="1.6"
      />
      <path d="M15.5 10.5 20.5 7.6v8.8l-5-2.9z" fill={filled ? '#2B8CC1' : 'none'} stroke="#2B8CC1" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function AddressCard({ businessName, street, city, address, coord }: { businessName: string; street: string; city: string; address: string; coord: [number, number] }) {
  return (
    <div style={{ ...card, display: 'flex', gap: 10 }}>
      <span aria-hidden="true">📍</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {businessName && <div style={{ fontSize: 14, fontWeight: 600, color: SHEET_COLORS.text }}>{businessName}</div>}
        <div style={{ fontSize: 14, color: SHEET_COLORS.text }}>{street || address}</div>
        {city && <div style={{ fontSize: 12, color: SHEET_COLORS.textDim, marginTop: 2 }}>{city}</div>}
        <div style={{ fontSize: 12, fontFamily: 'monospace', color: SHEET_COLORS.textDim, marginTop: 6 }}>
          {formatCoordinate(coord[1], coord[0])}
        </div>
      </div>
    </div>
  )
}

/** The bottom-sheet detail view. Location variant: status badge, address, Requester + Contact cards
 *  (phone → tap-to-call, email → tap-to-email), and "Go to Location". Incident variant: headline +
 *  chip + address + "Edit Incident Location" (no requester/contact and no wizard hand-off — the
 *  incident is a case-level scene, not a recovery site; its only action is editing itself,
 *  phone IncidentDetailCard, ui-mapping 03:250-262). */
export function LocationDetailCard({
  item,
  onBack,
  onCall,
  onEmail,
  onGoToLocation,
  onEditIncident,
  camerasShown = false,
  onToggleCameras,
}: LocationDetailCardProps) {
  const back = (
    <button type="button" onClick={onBack} style={backBtn}>
      {'‹'} All Locations
    </button>
  )

  if (item.kind === 'incident') {
    const headline = item.displayName || item.caseNumber
    return (
      <div data-map-detail style={container}>
        {back}
        <div style={nameRow}>
          <div style={name}>{headline}</div>
          <span style={chip(MAP_PIN_COLORS.incident)}>Incident</span>
        </div>
        <AddressCard businessName={item.businessName} street={item.streetAddress} city={item.city} address={item.address} coord={item.coord} />
        <button type="button" style={cta} onClick={() => onEditIncident(item.id)}>
          {EDIT_INCIDENT_LABEL}
        </button>
      </div>
    )
  }

  const color = MAP_PIN_COLORS[item.status]
  const hasRequester = Boolean(item.requesterName || item.requesterBadge || item.requesterUnit || item.requesterPhone || item.requesterEmail)
  const hasContact = Boolean(item.locationContact || item.locationPhone)
  const reqNameBadge = item.requesterName
    ? item.requesterBadge
      ? `${item.requesterName} · #${item.requesterBadge}`
      : item.requesterName
    : item.requesterBadge
      ? `#${item.requesterBadge}`
      : ''

  return (
    <div data-map-detail style={container}>
      {back}
      <div style={nameRow}>
        <div style={name}>{item.locationName}</div>
        <span style={chip(color)}>{STATUS_LABEL[item.status]}</span>
      </div>
      <AddressCard businessName={item.businessName} street={item.streetAddress} city={item.city} address={item.address} coord={item.coord} />

      {/* Cameras toggle — reveals/hides THIS location's geolocated cameras on the map. Rendered
          only when the location HAS geolocated cameras (phone: `cameraCount > 0`,
          LocationDetailCard.tsx:509) and a handler exists to act on the press — a button that
          cannot do what it says is the demo's honesty rule (§49a). */}
      {item.cameras.length > 0 && onToggleCameras && (
        <button
          type="button"
          data-testid="detail-cameras-toggle"
          onClick={onToggleCameras}
          // `aria-pressed`, not `aria-expanded` (review R-20): this button toggles markers on a
          // map, it does not disclose an adjacent region — and `MapControls` next door already
          // uses `aria-pressed` for all four of its toggle groups. (The camera MARKER's own
          // `aria-expanded` is correct: that one really does disclose its callout.)
          aria-pressed={camerasShown}
          aria-label={`${camerasShown ? 'Hide' : 'Show'} ${item.cameras.length} camera${item.cameras.length === 1 ? '' : 's'} on the map${
            item.cameraTotal > item.cameras.length ? ` (${item.cameraTotal - item.cameras.length} without a GPS fix)` : ''
          }`}
          style={camerasToggle(camerasShown)}
        >
          <CamcorderGlyph filled={camerasShown} />
          <span>
            {`${camerasShown ? 'Hide' : 'Show'} cameras (${cameraCountLabel(item.cameras.length, item.cameraTotal)})`}
          </span>
        </button>
      )}

      {hasRequester && (
        <div style={card}>
          <div style={cardLabel}>Requester</div>
          {reqNameBadge && <div style={rowText}>{reqNameBadge}</div>}
          {item.requesterUnit && <div style={rowText}>{item.requesterUnit}</div>}
          {item.requesterPhone && (
            <button type="button" style={tapRow} onClick={() => onCall(item.requesterPhone)}>
              {item.requesterPhone}
            </button>
          )}
          {item.requesterEmail && (
            <button type="button" style={tapRow} onClick={() => onEmail(item.requesterEmail)}>
              {item.requesterEmail}
            </button>
          )}
        </div>
      )}

      {hasContact && (
        <div style={card}>
          <div style={cardLabel}>Contact</div>
          {item.locationContact && <div style={rowText}>{item.locationContact}</div>}
          {item.locationPhone && (
            <button type="button" style={tapRow} onClick={() => onCall(item.locationPhone)}>
              {item.locationPhone}
            </button>
          )}
        </div>
      )}

      <button type="button" style={cta} onClick={() => onGoToLocation(item.id)}>
        Go to Location
      </button>
    </div>
  )
}
