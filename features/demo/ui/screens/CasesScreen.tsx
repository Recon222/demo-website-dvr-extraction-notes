'use client'

import { useRef, useState } from 'react'
import type { CaseCard, CaseLocationRow } from '@/features/demo/ui/screens/screenData'
import { GLASS, glassBtnPrimary, glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { RowActionsTray, RowActionsTrigger } from '@/features/demo/ui/screens/RowActions'
import { SettingsGearButton } from '@/features/demo/ui/screens/SettingsGearButton'
import { EmptyState } from '@/features/demo/ui/controls/EmptyState'
import { LONG_PRESS_SURFACE_STYLE, useLongPress } from '@/features/demo/ui/primitives/useLongPress'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

export interface CasesScreenProps {
  cases: CaseCard[]
  expandedId: string | null
  onToggle(caseId: string): void
  onNewCase(): void
  onOpenLocation(locationId: string): void
  onAddLocation(caseId: string): void
  onImport(caseId: string): void
  /** Opens the delete confirmation for a case (the bridge owns the dialog + the store write). */
  onDeleteCase(caseId: string): void
  onDeleteLocation(locationId: string): void
  /** Opens the per-location action chooser — the phone's `DuplicateLocationModal` (P3.5). */
  onLocationActions(locationId: string): void
  /** The header gear (P7.1) — phone `MainHeader.onSettingsPress`, wired identically here. */
  onSettings(): void
}

/** Row-actions keys, mirroring the phone's single-open swipeable key space
 *  (`CaseList.tsx:101-104`: `case-${id}` / `location-${id}`). */
const caseKey = (id: string) => `case-${id}`
const locationKey = (id: string) => `location-${id}`

/** The Cases list — expandable cards with per-case Import / Add Location actions, and the
 *  long-press row actions that stand in for the phone's swipe-to-delete (see `RowActions`). */
export function CasesScreen({
  cases,
  expandedId,
  onToggle,
  onNewCase,
  onOpenLocation,
  onAddLocation,
  onImport,
  onDeleteCase,
  onDeleteLocation,
  onLocationActions,
  onSettings,
}: CasesScreenProps) {
  /**
   * SINGLE-OPEN (phone parity, `CaseList.tsx:64-75`: opening one swipeable closes the previous).
   * One id for the whole list, so at most one row can be showing its destructive action.
   * Local to the screen — unlike `expandedId`, nothing outside it drives this, and the bridge
   * has no reason to know which row is showing a button.
   */
  const [openActionsKey, setOpenActionsKey] = useState<string | null>(null)
  const toggleActions = (key: string) => setOpenActionsKey((prev) => (prev === key ? null : key))
  const closeActions = () => setOpenActionsKey(null)

  /** Expanding (or collapsing) a card closes any tray belonging to it — the phone closes the
   *  swipeable on expand (`SwipeableCaseCard.tsx:67-73`) and its location swipeables unmount
   *  with the card, so a re-expand never resurrects a revealed delete button. */
  const handleToggle = (caseId: string) => {
    const card = cases.find((c) => c.id === caseId)
    const owned = new Set<string>([caseKey(caseId), ...(card?.locations.map((l) => locationKey(l.id)) ?? [])])
    setOpenActionsKey((prev) => (prev !== null && owned.has(prev) ? null : prev))
    onToggle(caseId)
  }

  return (
    <div style={{ minHeight: 786, padding: '58px 0 96px' }}>
      {/* D15's GEOMETRY HALF (owner-ratified; the scroll-materialising blur stays deferred).
          Phone `components/layout/MainHeader.tsx:105-135` after PR #125 issue 10, verbatim:
          `paddingHorizontal: spacing.md` (16), `paddingTop`/`paddingBottom: spacing.xs` (4),
          `minHeight: touchTarget.min` (44), and NO bottom margin — the phone deleted its
          `marginBottom: md` outright because "inside OverlayHeader a child margin inflates
          the measured glass box". `min` and not `large` (56): the phone's own comment calls
          56 "a floor ABOVE the row's natural height ... padding wearing a different name". */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: `${spacing.xs}px ${spacing.md}px`, minHeight: touchTarget.min }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#f0f4f8' }}>Cases</div>
        {/* Phone `MainHeader.tsx:49-74`: New Case then the gear, in that order, and only this
            header carries both. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" aria-label="New case" onClick={onNewCase} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M12 11v5M9.5 13.5h5" />
            </svg>
          </button>
          <SettingsGearButton onClick={onSettings} />
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {cases.length === 0 && <EmptyState message="No cases yet — tap + to create one." />}
        {cases.map((c) => (
          <CaseRow
            key={c.id}
            card={c}
            expanded={expandedId === c.id}
            openActionsKey={openActionsKey}
            onToggleActions={toggleActions}
            onCloseActions={closeActions}
            onToggle={handleToggle}
            onOpenLocation={onOpenLocation}
            onAddLocation={onAddLocation}
            onImport={onImport}
            onDeleteCase={onDeleteCase}
            onDeleteLocation={onDeleteLocation}
            onLocationActions={onLocationActions}
          />
        ))}
      </div>
    </div>
  )
}

/** One case card. Split out because the long-press hook is per-row — a single hook at list
 *  level would share one hold timer across every card. */
function CaseRow({
  card: c,
  expanded,
  openActionsKey,
  onToggleActions,
  onCloseActions,
  onToggle,
  onOpenLocation,
  onAddLocation,
  onImport,
  onDeleteCase,
  onDeleteLocation,
  onLocationActions,
}: {
  card: CaseCard
  expanded: boolean
  openActionsKey: string | null
  onToggleActions(key: string): void
  onCloseActions(): void
} & Pick<
  CasesScreenProps,
  'onToggle' | 'onOpenLocation' | 'onAddLocation' | 'onImport' | 'onDeleteCase' | 'onDeleteLocation' | 'onLocationActions'
>) {
  const key = caseKey(c.id)
  const actionsOpen = openActionsKey === key
  // Phone parity (`SwipeableCaseCard.tsx:99-100,162`: `enabled={!isExpanded}` and
  // renderRightActions returns null while expanded) — a case's destructive action is
  // unreachable while its locations are on screen, so it can't be hit while browsing them.
  const actionsAllowed = !expanded
  const longPress = useLongPress(() => onToggleActions(key), { enabled: actionsAllowed })
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    // A43 (U1.2) - the depth tier, phone `Layout.ts:25-41`: a top-level CARD is `lg` (12).
    // This shipped at 16, which is `xl` - the radius the ladder reserves for centred dialogs
    // (A45). The nested location rows below stay at `md` (8), which is the same rule's other
    // half, not an inconsistency.
    <div style={{ marginBottom: 14, borderRadius: radius.lg, border: GLASS.borderSoft, background: GLASS.gradientCardDiag, overflow: 'hidden' }}>
      {/* The hook rides the BUTTON, not this strip: it is the gesture surface, so its own
          nested-control rule resolves to "this element" for a press anywhere inside, while the
          ⋯ trigger beside it stays outside the gesture entirely (R-1). */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button type="button" onClick={() => onToggle(c.id)} {...longPress} style={{ flex: 1, textAlign: 'left', padding: 16, cursor: 'pointer', background: 'transparent', border: 'none', ...LONG_PRESS_SURFACE_STYLE }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>{c.caseNumber}</div>
              {c.displayName && <div style={{ fontSize: 13, color: '#99badd', marginTop: 4 }}>{c.displayName}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 10 }}>
              <div style={{ padding: '3px 9px', borderRadius: 20, border: `1px solid ${c.status.border}`, background: c.status.bg }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: c.status.color }}>{c.status.label}</span>
              </div>
              <div style={{ fontSize: 11, color: '#7a9fc4' }}>{c.locationCountLabel}</div>
            </div>
          </div>
        </button>
        {actionsAllowed && (
          <RowActionsTrigger label={`Actions for case ${c.caseNumber}`} open={actionsOpen} onToggle={() => onToggleActions(key)} triggerRef={triggerRef} />
        )}
      </div>

      {actionsAllowed && actionsOpen && (
        <RowActionsTray
          label={`Actions for case ${c.caseNumber}`}
          // The tray closes as it hands off, exactly as the phone closes the swipeable before
          // raising the confirm (`SwipeableCaseCard.tsx:75-78`).
          actions={[
            {
              label: 'Delete',
              tone: 'danger',
              // Focus moves to the ⋯ trigger BEFORE the tray unmounts (review R-10). The dialog
              // captures `document.activeElement` on mount to restore it on close; the tray
              // button it was activated from is gone by then, so without this the capture was
              // `<body>` and the documented focus-return was a no-op at its only call path. The
              // trigger is the right anchor anyway — it is the affordance that led here, and it
              // survives the tray closing.
              onSelect: () => { triggerRef.current?.focus(); onCloseActions(); onDeleteCase(c.id) },
            },
          ]}
        />
      )}

      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ height: 1, background: colors.border, marginBottom: 12 }} />
          {c.locations.length > 0 ? (
            c.locations.map((loc) => (
              <LocationRow
                key={loc.id}
                row={loc}
                openActionsKey={openActionsKey}
                onToggleActions={onToggleActions}
                onCloseActions={onCloseActions}
                onOpenLocation={onOpenLocation}
                onDeleteLocation={onDeleteLocation}
                onLocationActions={onLocationActions}
              />
            ))
          ) : (
            // The IN-CARD empty LINE, not A80's screen-level `EmptyState`. Phone
            // `case-management/components/CaseCard.tsx:274-278`: `fontSize.base` (16),
            // `colors.textSecondary`, and it KEEPS `fontStyle: 'italic'` at `dd5551ec`.
            // The padding is the demo's own — the phone's style carries none, and an
            // Import / Add Location row sits 6px below this. See controls/EmptyState.tsx.
            <div style={{ fontSize: 16, color: colors.textSecondary, fontStyle: 'italic', padding: '6px 0 14px' }}>No locations yet</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => onImport(c.id)} style={{ flex: 1, textAlign: 'center', padding: 10, ...glassBtnSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Import</button>
            <button type="button" onClick={() => onAddLocation(c.id)} style={{ flex: 1, textAlign: 'center', padding: 10, ...glassBtnPrimary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add Location</button>
          </div>
        </div>
      )}
    </div>
  )
}

/** One location row inside an expanded case. Unlike the case row its actions are ALWAYS
 *  reachable — the phone gates only the case swipe on expansion (`CaseList` renders location
 *  swipeables with no expand-state gate, ui-mapping 02 § Location row). */
function LocationRow({
  row: loc,
  openActionsKey,
  onToggleActions,
  onCloseActions,
  onOpenLocation,
  onDeleteLocation,
  onLocationActions,
}: {
  row: CaseLocationRow
  openActionsKey: string | null
  onToggleActions(key: string): void
  onCloseActions(): void
} & Pick<CasesScreenProps, 'onOpenLocation' | 'onDeleteLocation' | 'onLocationActions'>) {
  const key = locationKey(loc.id)
  const actionsOpen = openActionsKey === key
  const longPress = useLongPress(() => onToggleActions(key))
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div style={{ marginBottom: 8, borderRadius: 8, border: GLASS.borderSoft, background: GLASS.gradientCardDiag, overflow: 'hidden' }}>
      {/* Same as the case header above: the hook rides the row BUTTON (R-1). */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button type="button" onClick={() => onOpenLocation(loc.id)} {...longPress} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', ...LONG_PRESS_SURFACE_STYLE }}>
          <div style={{ flex: 1, marginRight: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{loc.locationName}</div>
            {loc.address && <div style={{ fontSize: 12, color: '#99badd', marginTop: 2 }}>{loc.address}</div>}
          </div>
          <div style={{ padding: '3px 8px', borderRadius: 12, background: loc.status.bg }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: loc.status.color }}>{loc.status.label}</span>
          </div>
        </button>
        <RowActionsTrigger label={`Actions for location ${loc.locationName}`} open={actionsOpen} onToggle={() => onToggleActions(key)} triggerRef={triggerRef} />
      </div>
      {actionsOpen && (
        // Both of the phone's location gestures land here (§48g's marked seam, closed at the
        // P3 assembly): swipe-to-delete and long-press-to-duplicate are separate gestures on
        // the phone, and the web collapses them onto this one tray. Non-destructive first.
        // "Duplicate…" is elided because it opens a CHOOSER (duplicate ×2, new-address ×2,
        // export ×2), not because the tray is short of room.
        <RowActionsTray
          label={`Actions for location ${loc.locationName}`}
          actions={[
            { label: 'Duplicate…', onSelect: () => { triggerRef.current?.focus(); onCloseActions(); onLocationActions(loc.id) } },
            // Focus to the ⋯ trigger before the tray goes — see the case row above (R-10).
            { label: 'Delete', tone: 'danger', onSelect: () => { triggerRef.current?.focus(); onCloseActions(); onDeleteLocation(loc.id) } },
          ]}
        />
      )}
    </div>
  )
}
