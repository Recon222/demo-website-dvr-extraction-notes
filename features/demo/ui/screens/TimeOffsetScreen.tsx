'use client'

import { useCallback, useState } from 'react'
import { DateTimeField, SectionCard, Toggle, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { SyncStatusCard } from '@/features/demo/ui/screens/SyncStatusCard'
import type { SyncResult } from '@/features/demo/engine/types'
import { AlertDialog } from '@/features/demo/ui/controls/AlertDialog'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

export interface CorrectedScope {
  id: string
  reqLabel: string
  /** The domain the adjusted times are in — the inverse of `reqLabel`, as the phone labels it. */
  adjLabel: string
  reqStart: string
  reqEnd: string
  adjStart: string
  adjEnd: string
  cameras: string
}

export interface TimeOffsetScreenProps {
  dvrDateTime: string
  actualDateTime: string
  onChangeDvr(value: string): void
  onChangeActual(value: string): void
  onUseCurrentTime(): void
  onCalculate(): void
  onCaptureOcr(): void
  sync: SyncResult | null
  syncing: boolean
  result: { diff: string; direction: string; isCorrect: boolean } | null
  correctedScopes: CorrectedScope[]
  dvrAppliesDST: boolean
  onToggleDst(): void
  /** The phone's DST scenario message for the current calibration, or null. */
  dstAdvisory: string | null
  /** True when a recalculation would overwrite generated/edited extracted scopes. */
  hasExtractedScopes: boolean
  onNext(): void
  /** Derived CTA copy — see `WizardNext` / `nextCtaLabel`. Never a literal. */
  nextLabel: string | null
  onBack(): void
  onMenu(): void
}

const cell = (color: string): React.CSSProperties => ({ fontSize: 12.5, color, fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace" })

/** The marquee: capture the DVR clock vs real time and compute the defensible offset, then show
 *  the requested ranges corrected onto the DVR clock. Calls the real time-offset math. */
export function TimeOffsetScreen(p: TimeOffsetScreenProps) {
  const canCalc = Boolean(p.dvrDateTime && p.actualDateTime)
  const [confirmRecalc, setConfirmRecalc] = useState(false)
  // The phone gates Calculate behind a confirmation once extracted scopes exist, because the
  // recalculation regenerates them wholesale and discards any manual edits. The demo's
  // `generateExtractedScopes` replaces the list the same way, and its Extracted-Scope screen is
  // editable — so the guard is load-bearing here, not ceremony.
  const onCalculateClick = () => {
    if (p.hasExtractedScopes) setConfirmRecalc(true)
    else p.onCalculate()
  }
  // Stable identity: AlertDialog keys its Escape listener on `onDismiss`, so a fresh closure
  // per render would tear the listener down and re-add it on every parent update.
  const cancelRecalc = useCallback(() => setConfirmRecalc(false), [])
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Time Offset" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="DVR Time vs Actual Time">
          <DateTimeField label="DVR Date / Time" value={p.dvrDateTime} onChange={p.onChangeDvr} />
          <DateTimeField label="Actual Date / Time" value={p.actualDateTime} onChange={p.onChangeActual} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* Phone `app/(form)/time-offset.tsx:467-476`: `variant="outline"`, default size,
                `style={styles.flexButton}`. A66. */}
            <button type="button" onClick={p.onUseCurrentTime} style={{ flex: 1, ...buttonStyle({ variant: 'outline' }) }}>Use Current Time</button>
            <button type="button" onClick={onCalculateClick} disabled={!canCalc} style={{ flex: 1, ...buttonStyle({ disabled: !canCalc }) }}>Calculate</button>
          </div>
          {/* Phone `app/(form)/time-offset.tsx:505-533`: `variant="outline"`, default size, with
              NON-STRING children — so the phone has to re-state `colors.link` on both the icon
              (`:521`) and the label (`:527`), and its `ocrCaptureText` is `fontSize.base`/semibold
              (`:736-740`). On the web both inherit from the button, so they are dropped rather
              than restated: one source for the token, and `currentColor` for the glyph. */}
          <button type="button" onClick={p.onCaptureOcr} style={{ gap: 9, width: '100%', ...buttonStyle({ variant: 'outline' }) }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            <span>Capture from DVR</span>
          </button>
        </SectionCard>

        <SyncStatusCard sync={p.sync} syncing={p.syncing} />

        {p.result && (
          <>
            <div style={{ borderRadius: 12, border: GLASS.borderAccent, background: GLASS.gradientPanel, padding: 20, marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: colors.textTertiary, marginBottom: 6 }}>Time Difference</div>
              <div style={{ fontSize: 34, fontWeight: 700, color: colors.text, fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", marginBottom: 6 }}>{p.result.diff}</div>
              {/* Phone `resultDirection` (`time-offset.tsx:759-762`), de-coloured in the same
                  campaign: "the label above it already says 'Time Difference', so colour was
                  decoration on a calibration verdict". Was `primaryLight`, which measures
                  3.82-4.35 on the four glass stops this screen paints on — under AA at every
                  one. `colors.text` is 9.70-11.05 on the same four. The verdict is still
                  distinguished from the label above it, by WEIGHT (500 vs 400). */}
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{p.result.isCorrect ? 'DVR time is correct' : `DVR is ${p.result.direction} real time`}</div>
            </div>

            {p.correctedScopes.length > 0 && (
              <>
                {/* DEF-UI-012's middle rung — `sectionHeader`, base/semibold. Already correct;
                    the ladder is pinned whole in `__tests__/heading-hierarchy.test.tsx`. */}
                <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 12 }}>Adjusted Time Ranges</div>
                {p.correctedScopes.map((sc, i) => (
                  <div key={sc.id} style={{ ...glassCard, padding: 14, marginBottom: 12 }}>
                    {/* DEF-UI-012's bottom rung — `scopeTitle`, sm/SEMIBOLD. Was 700, which made
                        the deepest level the heaviest one on the screen: heavier than the
                        `sectionHeader` above it (600) and than `SectionCard`'s own title (600).
                        The phone settled all three together as one monotone ladder
                        (`4f69eb73`, PR #124); this is its bottom rung, and the only value on
                        this side that was off it. */}
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 10 }}>Scope {i + 1}</div>
                    {/* `timeSectionHeader` — the phone's field-LABEL register, and explicitly
                        NOT a fourth heading level (`time-offset.tsx:782-785`: "uppercase and
                        painted in `textSecondary` … case plus colour separate it from
                        `scopeTitle` without competing on weight"). The 11px and the 0.5
                        letter-spacing are lifted prototype values, off plan §4.9's ladder and
                        kept as literals rather than snapped to it. */}
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 5 }}>Requested ({sc.reqLabel})</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell(colors.textTertiary)}>Start</span><span style={cell(colors.text)}>{sc.reqStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={cell(colors.textTertiary)}>End</span><span style={cell(colors.text)}>{sc.reqEnd}</span></div>
                    {/* Was `primaryLight`, i.e. colour as the SOLE carrier of which domain a
                        block is in — on the one screen whose entire job is telling two domains
                        apart, where a reader who cannot separate the hues gets two identically
                        laid-out blocks. The phone paints both sub-labels from ONE token
                        (`:566` and `:588`); the words already say which is which. */}
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.textTertiary, marginBottom: 5 }}>Adjusted ({sc.adjLabel})</div>
                    {/* Phone `timeValueAdjusted` (`:844-848`): "Every accent token in the palette
                        fails at least one theme on this surface; only `colors.text` clears
                        both." These two ARE the screen's output — the times an analyst
                        transcribes. What still marks them as adjusted is the weight (600 against
                        the requested rows' 400), which is the phone's carrier too. */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={cell(colors.textTertiary)}>Start</span><span style={{ ...cell(colors.text), fontWeight: 600 }}>{sc.adjStart}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={cell(colors.textTertiary)}>End</span><span style={{ ...cell(colors.text), fontWeight: 600 }}>{sc.adjEnd}</span></div>
                    {sc.cameras && <div style={{ fontSize: 12, color: colors.textTertiary, fontStyle: 'italic', marginTop: 10 }}>Cameras: {sc.cameras}</div>}
                  </div>
                ))}
              </>
            )}

            {/* U2.3: was a verbatim re-implementation of `Toggle`'s track (demo §4.7 #4). The
                row's own `padding: '12px 4px'` and `marginTop: 6` go with it — one switch, one
                row recipe, and the phone's own Switch row carries no padding at all. */}
            <Toggle label="DVR Applies DST" on={p.dvrAppliesDST} onClick={p.onToggleDst} />
            <div style={{ fontSize: 12.5, color: colors.textTertiary, marginTop: 2, marginBottom: 10 }}>
              Enable if the DVR clock adjusts for Daylight Saving Time
            </div>

            {/* A71 / D19's hand-back. The phone's own move (`4853f9d9`): "route the DST callout
                through Banner and stop signalling with colour alone". What went: a 1px DASHED
                amber outline over a 7% wash of the same hue, with the message itself in
                `#ffd93d` — the saturated accent as text, which §C.3 rule 1 bans and which
                `PaneNote` and the retention pill were re-based off in U3.2. The dashed outline
                had no phone counterpart in any revision; the phone's deleted
                `dstNotificationCard` was a solid 1px `<Card>`.

                `marginTop` is the phone's `dstNotification` (`Layout.spacing.md`), the ONE
                style that survived its rewrite. `Banner` owns everything else — including the
                italic/centred treatment, which is deliberately not re-applied through `style`:
                a callout that centres and italicises one message and not the other three is
                the private recipe this adoption exists to delete. */}
            {p.dstAdvisory && <Banner severity="warning" message={p.dstAdvisory} style={{ marginTop: spacing.md }} />}
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <WizardNext label={p.nextLabel} onClick={p.onNext} />
        </div>
      </div>

      {/* The phone's `Recalculate Time Offset?` Alert (`app/(form)/time-offset.tsx:372-382`,
          spec `docs/ui-mapping/06-wizard-b-time.md:80-83`) on the shared blocking-dialog
          primitive: title, message and both button labels verbatim, `Cancel` carrying the
          phone's `style: 'cancel'`, Escape dismissing to the safe default. */}
      {confirmRecalc && (
        <AlertDialog
          title="Recalculate Time Offset?"
          message="This will reset your extracted video scopes. Any manual edits to the extracted times will be lost."
          actions={[
            { label: 'Cancel', style: 'cancel', onPress: cancelRecalc },
            {
              label: 'Continue',
              onPress: () => {
                setConfirmRecalc(false)
                p.onCalculate()
              },
            },
          ]}
          onDismiss={cancelRecalc}
        />
      )}
    </div>
  )
}
