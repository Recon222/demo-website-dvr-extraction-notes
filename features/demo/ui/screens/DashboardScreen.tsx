'use client'

import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import type { CaseCard } from '@/features/demo/ui/screens/screenData'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { SettingsGearButton } from '@/features/demo/ui/screens/SettingsGearButton'
import { LONG_PRESS_SURFACE_STYLE, useLongPress } from '@/features/demo/ui/primitives/useLongPress'

/**
 * The phone's `DASHBOARD_CASE_LIMIT` (`app/(tabs)/home.tsx:37`), which it applies as
 * `useCases({ pageSize: 5 })` — a `created_at DESC` query capped at one page, with no
 * "load more" reachable from this screen. The demo has no query layer (the store IS the
 * data), so the honest equivalent is to take the 5 most recent from the head of the list:
 * `createCase` prepends, so index 0 is the newest case. Everything older stays reachable
 * on the Cases tab, exactly as on the phone.
 */
export const DASHBOARD_CASE_LIMIT = 5

/** Locations shown as pills before collapsing to "+N" (phone DashboardCaseCard.tsx:29). */
const VISIBLE_LOCATION_COUNT = 1

export interface DashboardScreenProps {
  cases: CaseCard[]
  onOpenLocation(locationId: string): void
  /** Long-press / right-click / the ⋯ button on a case card — opens the Case Actions Sheet. */
  onCaseActions(caseId: string): void
  /** The header gear (P7.1) — phone `MainHeader.onSettingsPress`, wired identically here. */
  onSettings(): void
}

/**
 * Press-and-hold, the honest web equivalent of the phone's `onLongPress` (matrix row 8/9), plus
 * right-click (the desktop convention for "reveal this thing's actions", and the event a touch
 * long-press raises anyway) and the card's ⋯ button, which is the only one a keyboard or screen
 * reader can reach.
 *
 * The gesture itself is `@/features/demo/ui/primitives/useLongPress` — this screen shipped a
 * PRIVATE copy of it (P3.2), which the assembly's §56f consolidation never saw because it was
 * not a module. Review R-1 retired it; its two contributions, the `fired` latch and the
 * nested-control bail, live in the shared hook now, and the local `LONG_PRESS_MS` that could
 * have drifted from the shared beat is gone with it.
 */

/** The dashboard "Recent Activity" timeline: the 5 most recent cases, newest first. */
export function DashboardScreen({ cases, onOpenLocation, onCaseActions, onSettings }: DashboardScreenProps) {
  const recent = cases.slice(0, DASHBOARD_CASE_LIMIT)
  return (
    <div style={{ minHeight: 786, padding: '58px 0 96px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '8px 18px 16px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#f0f4f8' }}>Dashboard</div>
        {/* The phone's `MainHeader` puts the gear at the right of BOTH tab headers, with the
            New Case folder beside it on Cases only (`MainHeader.tsx:49-74`). Same here. */}
        <SettingsGearButton onClick={onSettings} />
      </div>
      <div style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", fontSize: 11, color: '#7a9fc4', textTransform: 'uppercase', letterSpacing: 1.5, margin: '8px 0 16px 42px' }}>
        Recent Activity
      </div>

      {recent.length === 0 && <div style={{ padding: '0 18px', fontSize: 14, color: '#7a9fc4', fontStyle: 'italic' }}>No cases yet.</div>}

      {recent.map((c, ci) => (
        <TimelineCase
          key={c.id}
          card={c}
          index={ci}
          isLast={ci === recent.length - 1}
          onOpenLocation={onOpenLocation}
          onCaseActions={onCaseActions}
        />
      ))}
    </div>
  )
}

interface TimelineCaseProps {
  card: CaseCard
  index: number
  isLast: boolean
  onOpenLocation(locationId: string): void
  onCaseActions(caseId: string): void
}

/** One timeline row: the glowing marker + connector track, and the case card beside it. */
function TimelineCase({ card, index, isLast, onOpenLocation, onCaseActions }: TimelineCaseProps) {
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  const longPress = useLongPress(() => onCaseActions(card.id))

  const visible = card.locations.slice(0, VISIBLE_LOCATION_COUNT)
  const hidden = Math.max(0, card.locations.length - VISIBLE_LOCATION_COUNT)

  return (
    <div
      style={{
        display: 'flex',
        padding: '0 16px',
        marginBottom: 14,
        // The phone's `FadeInLeft.delay(100 + index * 100)` (TimelineItem). `slideBack` is
        // already exactly that motion (fade + 28px from the left); `both` holds the
        // pre-animation frame so a card never flashes at full opacity before its turn.
        ...(reduceMotion ? {} : { animation: 'slideBack 0.34s ease both', animationDelay: `${100 + index * 100}ms` }),
      }}
    >
      <div style={{ width: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', paddingTop: 24 }}>
        <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, background: card.status.color, opacity: 0.4, filter: 'blur(3px)' }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, border: `2px solid ${card.status.color}`, background: card.status.bg, zIndex: 1 }} />
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, background: '#1e3a5f', marginTop: 6, minHeight: 30 }} />}
      </div>

      <div
        {...longPress}
        data-case-card={card.id}
        style={{
          flex: 1,
          marginLeft: 8,
          borderRadius: 16,
          border: GLASS.borderSoft,
          background: GLASS.gradientCardDiag,
          padding: 16,
          // A hold that selects the card's text reads as a broken gesture, not a menu.
          ...LONG_PRESS_SURFACE_STYLE,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
          <div style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, color: '#f0f4f8' }}>{card.caseNumber}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '4px 10px', borderRadius: 20, border: `1px solid ${card.status.border}`, background: card.status.bg }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: card.status.color }}>{card.status.label}</div>
            </div>
            {/* The keyboard/AT path to the same menu the hold opens. The phone's card carries
                `accessibilityLabel="Case {n}. Long press for actions."`; naming a gesture a
                click cannot perform would be the wrong instruction here, so the label states
                the action instead. */}
            <button
              type="button"
              onClick={() => onCaseActions(card.id)}
              aria-haspopup="dialog"
              aria-label={`Case actions for ${card.caseNumber}`}
              style={{ display: 'flex', alignItems: 'center', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#7a9fc4" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          </div>
        </div>
        {card.displayName && <div style={{ fontSize: 13, color: '#99badd', marginBottom: 10 }}>{card.displayName}</div>}
        {card.personnel.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {card.personnel.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#1a2d44', borderRadius: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#7a9fc4' }}>{p.role}</span>
                <span style={{ fontSize: 11, color: '#f0f4f8' }}>{p.name}</span>
                {p.badge && <span style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", fontSize: 10, color: '#4ecdc4' }}>#{p.badge}</span>}
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, color: '#99badd', marginBottom: 12 }}>Created: {card.createdLabel}</div>
        {card.locations.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {visible.map((loc) => (
              <button key={loc.id} type="button" onClick={() => onOpenLocation(loc.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 20, border: GLASS.borderAccent, background: 'rgba(43,140,193,0.10)', cursor: 'pointer' }}>
                <div style={{ width: 7, height: 7, borderRadius: 4, background: loc.status.color }} />
                <span style={{ fontSize: 12, color: '#f0f4f8' }}>{loc.locationName}</span>
              </button>
            ))}
            {/* MoreLocationsPill (phone LocationPill.tsx:111-131): "+N", and the only control
                that expands the card. Its label is the phone's, verbatim. */}
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                aria-label={`${hidden} more locations`}
                style={{ padding: '7px 12px', borderRadius: 20, border: 'none', background: '#1a2d44', cursor: 'pointer' }}
              >
                <span style={{ fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", fontSize: 11, color: '#7a9fc4' }}>+{hidden}</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic' }}>No locations yet</div>
        )}

        {/* The expanded list shows EVERY location, including the one already on a pill —
            phone parity (DashboardCaseCard.tsx:248-261). */}
        {hidden > 0 && expanded && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: GLASS.border }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#99badd', marginBottom: 8 }}>All Locations:</div>
            {card.locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => onOpenLocation(loc.id)}
                aria-label={`Location: ${loc.locationName}`}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', marginBottom: 8, borderRadius: 8, border: GLASS.borderSoft, background: GLASS.gradientCardDiag, cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#f0f4f8' }}>
                  {loc.locationName}
                  {loc.address && <span style={{ color: '#7a9fc4' }}> — {loc.address}</span>}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: 12, background: loc.status.bg, fontSize: 10, fontWeight: 600, color: loc.status.color }}>{loc.status.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
