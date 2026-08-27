'use client'

import type { SyncResult } from '@/features/demo/engine/types'
import { GLASS, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { iconSize, spacing } from '@/features/demo/ui/tokens/scale'

const mono = "var(--font-jbmono),'JetBrains Mono',monospace"

/**
 * The status glyphs, in the shell the phone draws them in (`SyncStatusCard.tsx:238-255`) —
 * `Layout.iconSize.sm`, stroked, round-capped, `aria-hidden` because the word beside each one
 * already carries the meaning (`:264-265`).
 *
 * SEVERITY LIVES HERE AND NOWHERE ELSE ON THIS CARD. The phone's rule, `:54-58` verbatim:
 * *"Status is carried by an Ionicon, colour-coded for quick recognition … The WORDS beside it
 * are always `colors.text`: the saturated status tokens measure 2.1-3.2:1 as body text on this
 * card, and the icon is free to carry the colour because the label carries the meaning."*
 *
 * These replace two colour EMOJI (`⏱️` and `✓`). The phone's own reason for deleting its pair
 * (`:124-126`) is not aesthetic: colour emoji *"ignore the `color` style on both platforms, so
 * the computed colour was a silent no-op there as well and a screen reader announced the emoji
 * instead of a status"*. A glyph that cannot take the colour cannot carry the severity, which
 * makes the emoji form structurally incapable of the rule above.
 */
function StatusIcon({ stroke, children }: { stroke: string; children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width={iconSize.sm}
      height={iconSize.sm}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  )
}

function formatOffset(offsetMs: number): { text: string; direction: string } {
  const text = `${Math.abs(offsetMs / 1000).toFixed(3)}s`
  const direction = offsetMs > 0 ? 'slow' : offsetMs < 0 ? 'fast' : 'synchronized'
  return { text, direction }
}

function format24h(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export interface SyncStatusCardProps {
  sync: SyncResult | null
  syncing: boolean
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22 }}>
      <span style={{ fontSize: 12, color: colors.textTertiary }}>{label}</span>
      {/* `accent` is now a WEIGHT, not a colour. It marked the device offset — the card's one
          measured output — in `primaryLight`, which the phone de-coloured for the same reason it
          de-coloured the corrected times next door: an accent as body text fails AA on this
          ground. Phone `offsetValue` (`:416-420`) is `colors.text` at bold; only the weight
          separates it from the rows around it, exactly as here. */}
      <span style={{ fontSize: 12.5, color: colors.text, fontWeight: accent ? 700 : 500, fontFamily: mono, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

/**
 * The atomic-clock (NTP) time-sync card — full parity with the phone app's SyncStatusCard:
 * status, method, server, device offset, uncertainty, network delay, calibrated-at, and the
 * traceability chain. Presentational; the values come from the (mocked) simulateNtpSync.
 */
export function SyncStatusCard({ sync, syncing }: SyncStatusCardProps) {
  if (!syncing && !sync) return null
  const ok = !!sync && !syncing
  const offset = sync ? formatOffset(sync.offsetMs) : null
  return (
    // A55 / row 35 — the NESTED glass tier, in both states. Phone `:216-221`:
    // `<Card glass glassVariant="nestedCard">`, unconditionally; success is signalled by the
    // glyph, never by re-tinting the whole surface. What went: `rgba(16,209,119,0.06)` under a
    // `rgba(16,209,119,0.3)` border when synced, and a bare `#0a1320` when not — two hand-rolled
    // surfaces for one card, neither of them a tier. The card sits inside `TimeOffsetScreen`'s
    // glass `SectionCard`, which is what the nested tier is FOR (phone `:60-61`: it "used to be
    // the one flat box between two gradients").
    //
    // Lifted `padding: 14` / `borderRadius: 10` kept (demo §0.4 — do not tidy lifted values).
    // `glassCardNested` is spread FIRST and nothing after it touches the border family, so the
    // lit top edge survives (the lit-edge rule).
    <div style={{ ...glassCardNested, padding: 14, borderRadius: 10, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 10 }}>
        {/* Phone `:224-230` — `time-outline` at `iconSize.sm` in `colors.text`. The title glyph
            carries no severity, so it takes the text token, not a status one. */}
        <StatusIcon stroke={colors.text}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </StatusIcon>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Time Calibration</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 22, marginBottom: ok ? 8 : 0 }}>
        <span style={{ fontSize: 12, color: colors.textTertiary }}>Status</span>
        {syncing ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: colors.text }}>
            {/* The spinner is not a severity glyph — "in flight" is not a status the phone
                colour-codes either (it swaps in an `ActivityIndicator` in `colors.primary`,
                `:241-242`). `link` and not `primary`: this is a 2.5px stroked mark on glass,
                where `primary` measures 2.87-3.27 and `link` clears with room. */}
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.link} strokeWidth="2.5" style={{ animation: 'spin 0.9s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
            </svg>
            Synchronizing…
          </span>
        ) : (
          // The ruling, rendered: `checkmark-circle` in `colors.success` beside the word in
          // `colors.text`. Was `✓ Synchronized` — one string, coloured `#10d177` end to end.
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, fontSize: 12.5, color: colors.text, fontWeight: 600 }}>
            <StatusIcon stroke={colors.success}>
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.4l2.4 2.4 4.6-5.2" />
            </StatusIcon>
            Synchronized
          </span>
        )}
      </div>

      {ok && sync && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="Method" value="NTP (Atomic Clock)" />
          <Row label="Server" value={sync.server} />
          {offset && <Row label="Device Offset" value={`${offset.text} (${offset.direction})`} accent />}
          <Row label="Uncertainty" value={`±${sync.uncertaintyMs.toFixed(2)}ms`} />
          {sync.rttMs !== undefined && <Row label="Network Delay" value={`${(sync.rttMs / 2).toFixed(2)}ms`} />}
          {sync.timestamp !== undefined && <Row label="Calibrated at" value={format24h(sync.timestamp)} />}
          {sync.traceability && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: GLASS.border }}>
              <div style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 4 }}>Traceable to</div>
              {/* `colors.text`, not a dim tone, and the phone says why (`:338-341`): "A value,
                  not a label. It is the national-metrology provenance of a court-facing
                  calibration." Was `#9fc0db`, a bare hex with no palette sibling. */}
              <div style={{ fontSize: 10.5, color: colors.text, fontStyle: 'italic', lineHeight: 1.5 }}>{sync.traceability}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
