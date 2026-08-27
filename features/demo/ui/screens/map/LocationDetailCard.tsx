'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { STATUS_LABEL, SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { formatCoordinate } from '@/features/demo/engine/logic/coordinates'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
import { severityTone, STATUS_SEVERITY, type SeverityTone } from '@/features/demo/ui/tokens/status'

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
   * Location variant only — the cameras toggle, as ONE optional object (review R-16).
   *
   * Two independent optional props could express `camerasShown: true` with no `onToggleCameras`:
   * cameras plotted on the map with no way to hide them again. Pairing them makes that state
   * unrepresentable — the shown flag cannot exist without the handler that clears it.
   */
  cameras?: {
    /** Whether THIS location's cameras are currently plotted (phone `camerasShown`). */
    shown: boolean
    /** Flips them on/off. */
    onToggle(): void
  }
}

// phone `styles.content` `:826-829` — `paddingHorizontal: mdlg` (20), `paddingBottom: lg` (24).
// The 14px top is the demo's own: the phone's ScrollView sits under a handle + divider that
// already open the space, and demo §0.4 forbids tidying a lifted value with no counterpart.
const container: CSSProperties = { padding: `14px ${spacing.mdlg}px ${spacing.lg}px` }

/**
 * "‹  All Locations" — phone `BackButton` `:256-268`, a `<Button variant="ghost" size="small">`.
 * Its docblock: *"A ghost <Button> rather than the hand-rolled tinted pill it replaces: that pill
 * was one of six local button implementations on this screen ... The chevron rides inside the
 * label string so it still picks up the variant's text colour."* Two spaces after the chevron,
 * exactly as `:266` spells it.
 *
 * `inline-flex` overrides the recipe's `flex` so the button hugs its label in a block parent —
 * the web analog of the phone's `alignSelf: 'flex-start'` (`:831`). Outside the border family,
 * so the recipe's four longhands are untouched.
 */
const backBtn: CSSProperties = {
  ...buttonStyle({ variant: 'ghost', size: 'small' }),
  display: 'inline-flex',
  marginBottom: spacing.md,
}
const nameRow: CSSProperties = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.base, marginBottom: spacing.md }
// phone `styles.locationName` `:841-846` — `fontSize['2xl']` (24). Was 21.
const name: CSSProperties = { fontSize: 24, fontWeight: 700, color: SHEET_COLORS.text, letterSpacing: -0.3, flex: 1 }

/**
 * The four content cards — phone `:323`, `:509`, `:595-597`, `:664-666`, `:749-751`, every one a
 * `<Card glass glassVariant="nestedCard">` at `padding="base"`.
 *
 * `glassCardNested` is the nested tier A84 pointed at; U5.1's R2 established that the map sheet's
 * ROWS are the `card` tier and only these info cards are nested. The hand-rolled
 * `SHEET_COLORS.infoBg` + `SHEET_COLORS.divider` border is gone: the divider token's real job is
 * the sheet's own rule (`MapBottomSheet`), and a nested card's border is the tier's.
 *
 * THE LIT-EDGE RULE: spread the fragment, then write no `border` / `borderColor` / `borderTop`.
 */
const card: CSSProperties = { ...glassCardNested, padding: spacing.base, marginBottom: spacing.base }
// phone `styles.infoCard` `:874-876` — the scope / requester / contact wrappers take `mdlg` (20);
// only the address card takes `base` (`styles.addressCard` `:869-872`).
const infoCard: CSSProperties = { ...card, marginBottom: spacing.mdlg }
/**
 * phone `styles.cardLabel` `:990-996`, whose comment is the reason for the token move: *"Uppercase
 * micro-label at the top of each content card. On `textSecondary`, not `textTertiary`: the
 * tertiary token is a documented sub-AA ceiling (M2b) and these labels are read, not skimmed."*
 * The demo had `textFaint` (= `textTertiary`) at 10px/700.
 */
const cardLabel: CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textSecondary, marginBottom: spacing.sm }
const rowText: CSSProperties = { fontSize: 14, fontWeight: 500, color: SHEET_COLORS.text, padding: '6px 0' }
// phone `:713-716` / `:735-738` / `:786-789` — `colors.primary`. It was `MAP_PIN_COLORS.working`
// (#00BFFF), a mark meant for satellite tiles.
const tapRow: CSSProperties = { display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 0', color: colors.primary, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
/**
 * Both CTAs — phone `:367-375` and `:797-808`, each a `<Button variant="primary" fullWidth>`.
 *
 * A68 + PR #127 `e882912f`: **no `size="large"` anywhere in the map view**, so this is the
 * recipe's default `medium` (48 min-height, 16px label, `radius.control`). It replaces
 * `linear-gradient(135deg,#1a8fc2,#0f6f9e)` + `0 4px 16px rgba(26,143,194,0.35)` at height 50 /
 * radius 14 — a recipe that was duplicated VERBATIM in this file and `LocationList`. The phone
 * deleted both copies rather than sharing them ("It used to be a locally-authored gradient
 * button, one of six local button implementations on this screen, at a seventh height and
 * radius" — `LocationList.tsx:98-100`), which is why this is an adoption and not a shared const.
 */
const cta: CSSProperties = { ...buttonStyle({ variant: 'primary' }), width: '100%' }
/** Phone copy, verbatim (ui-mapping 03:256/262 — `IncidentDetailCard`'s only CTA). */
export const EDIT_INCIDENT_LABEL = 'Edit Incident Location'

/**
 * The location status badge — phone `:493-505` + `styles.statusBadge` `:847-866`. The `*Light`
 * tone fills, the saturated severity holds the border, and the `*OnLight` foreground carries both
 * the 6px dot and the label. It was `${color}25` behind bare `PIN_COLORS` text.
 *
 * NOT `tokens/status.ts`'s `statusBadgeStyle`: that ports `CaseStatusBadge` (radius `lg`, weight
 * 600, no dot, no letter-spacing) and the phone does not use it here — this badge is hand-rolled
 * at `radius.control` with a dot. The shared part is the TOKEN lookup, which is the contract
 * `status.ts` actually publishes.
 */
const statusBadge = (tone: SeverityTone): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing.xsm,
  padding: `${spacing.xs}px ${spacing.sm}px`,
  borderRadius: radius.control,
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: tone.borderColor,
  background: tone.background,
  marginTop: spacing.xs,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
  color: tone.color,
  whiteSpace: 'nowrap',
})
const statusDot = (tone: SeverityTone): CSSProperties => ({ width: 6, height: 6, borderRadius: radius.full, background: tone.color, flex: '0 0 auto' })
/** phone `styles.incidentTypeChip` `:909-919` — no border, no dot, uppercase at `radius.control`. */
const incidentTone = severityTone(STATUS_SEVERITY.incident)
const typeChip: CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  padding: `${spacing.xs}px ${spacing.sm}px`,
  borderRadius: radius.control,
  marginTop: spacing.xs,
  background: incidentTone.background,
  color: incidentTone.color,
  whiteSpace: 'nowrap',
}

/**
 * The cameras toggle — a tappable nested card between the address and the requester cards,
 * matching the phone's placement (`:550-586`).
 *
 * ACTIVE SWITCHES THE TIER, and that is the phone's own reasoning (`:563-566`): *"Active state
 * switches the glass tier rather than overriding the card's border: `elevated` is the variant
 * whose border is already primary-tinted, so 'on' reads brighter and bluer without a one-off
 * colour."* The demo had `rgba(43,140,193,0.5)` / `rgba(43,140,193,0.12)` — two of the five
 * accent alphas A53 exists to retire.
 *
 * The active arm writes colour LONGHANDS only, so on collapse the sides self-heal to
 * `glassCardNested`'s own values rather than falling to `currentColor` (the lit-edge ruling §3).
 */
const ELEVATED = GLASS_TIER[scheme].elevated
const camerasToggle = (active: boolean): CSSProperties => ({
  ...glassCardNested,
  ...(active && {
    background: `linear-gradient(180deg,${ELEVATED.gradient[0]},${ELEVATED.gradient[1]})`,
    borderRightColor: ELEVATED.border,
    borderBottomColor: ELEVATED.border,
    borderLeftColor: ELEVATED.border,
    borderTopColor: ELEVATED.highlightTop,
    boxShadow: `inset 0 1px 0 ${ELEVATED.innerShadow}`,
  }),
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
  width: '100%',
  // phone `styles.camerasToggle` `:959-962` — `minHeight: Layout.touchTarget.min`, `padding="base"`.
  minHeight: touchTarget.min,
  padding: spacing.base,
  marginBottom: spacing.base,
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
 *  so the camcorder is drawn inline — filled when the cameras are shown, outlined when hidden.
 *  `colors.primary`, as the phone tints its glyph (`:576`). */
function CamcorderGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="2.5"
        y="6.5"
        width="12"
        height="11"
        rx="2.5"
        fill={filled ? colors.primary : 'none'}
        stroke={colors.primary}
        strokeWidth="1.6"
      />
      <path d="M15.5 10.5 20.5 7.6v8.8l-5-2.9z" fill={filled ? colors.primary : 'none'} stroke={colors.primary} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function AddressCard({ businessName, street, city, address, coord }: { businessName: string; street: string; city: string; address: string; coord: [number, number] }) {
  return (
    <div style={{ ...card, display: 'flex', gap: spacing.sm }}>
      {/* phone `styles.addressEmoji` `:882-886` — `fontSize.base`, `marginTop: 1`. */}
      <span aria-hidden="true" style={{ fontSize: 16, marginTop: 1 }}>
        📍
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* phone `styles.businessNamePrimary` `:902-906` — 14/600, `marginBottom: xxs`. */}
        {businessName && <div style={{ fontSize: 14, fontWeight: 600, color: SHEET_COLORS.text, marginBottom: spacing.xxs }}>{businessName}</div>}
        {/* phone `styles.addressText` `:890-894` — 14/500 at `lineHeight.normal`. */}
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: SHEET_COLORS.text }}>{street || address}</div>
        {city && <div style={{ fontSize: 12, color: SHEET_COLORS.textDim, marginTop: spacing.xxs }}>{city}</div>}
        {/* phone `styles.coordinatesText` `:940-944` — mono, `fontSize.xs`, semibold. */}
        <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: SHEET_COLORS.textDim, marginTop: spacing.xsm }}>
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
  cameras,
}: LocationDetailCardProps) {
  const camerasShown = cameras?.shown ?? false
  const back = (
    <button type="button" data-testid="detail-back-button" aria-label="Back to all locations" onClick={onBack} style={backBtn}>
      {'‹  All Locations'}
    </button>
  )

  if (item.kind === 'incident') {
    const headline = item.displayName || item.caseNumber
    return (
      <div data-map-detail style={container}>
        {back}
        <div style={nameRow}>
          <div style={name}>{headline}</div>
          <span data-testid="detail-type-chip" style={typeChip}>
            Incident
          </span>
        </div>
        <AddressCard businessName={item.businessName} street={item.streetAddress} city={item.city} address={item.address} coord={item.coord} />
        <button type="button" style={cta} onClick={() => onEditIncident(item.id)}>
          {EDIT_INCIDENT_LABEL}
        </button>
      </div>
    )
  }

  const tone = severityTone(STATUS_SEVERITY[item.status])
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
        <span data-testid="detail-status-badge" style={statusBadge(tone)}>
          <span data-testid="detail-status-dot" style={statusDot(tone)} />
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <AddressCard businessName={item.businessName} street={item.streetAddress} city={item.city} address={item.address} coord={item.coord} />

      {/* Cameras toggle — reveals/hides THIS location's geolocated cameras on the map. Rendered
          only when the location HAS geolocated cameras (phone: `cameraCount > 0`,
          LocationDetailCard.tsx:550) and a handler exists to act on the press — a button that
          cannot do what it says is the demo's honesty rule (§49a). */}
      {item.cameras.length > 0 && cameras && (
        <button
          type="button"
          data-testid="detail-cameras-toggle"
          onClick={cameras.onToggle}
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
        <div data-testid="detail-requester-card" style={infoCard}>
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
        <div data-testid="detail-contact-card" style={infoCard}>
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
