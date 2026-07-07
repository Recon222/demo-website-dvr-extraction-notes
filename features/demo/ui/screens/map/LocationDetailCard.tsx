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
const chip = (color: string): CSSProperties => ({ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.4, padding: '4px 10px', borderRadius: 10, background: `${color}25`, marginTop: 2, whiteSpace: 'nowrap' })

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
 *  chip + address (no requester/contact/CTA — the incident has no wizard). */
export function LocationDetailCard({ item, onBack, onCall, onEmail, onGoToLocation }: LocationDetailCardProps) {
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
