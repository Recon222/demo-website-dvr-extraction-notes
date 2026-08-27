'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { DvrInformation, FormFieldId } from '@/features/demo/engine/types'
import { getRetentionStatus, type RetentionStatus, type RetentionView } from '@/features/demo/engine/logic/retention'
import { Field, SectionCard, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { CheckboxBox } from '@/features/demo/ui/controls/choice-controls'
import {
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  RECORDING_SCHEDULE_OPTIONS,
  CUSTOM_VALUE,
  isCustomResolution,
  isCustomFps,
  parseRecordingSchedule,
  toggleRecordingSchedule,
} from '@/features/demo/ui/screens/field-options'
import { DateField } from '@/features/demo/ui/inputs/DateField'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'
import { severityTone, type StatusSeverity } from '@/features/demo/ui/tokens/status'

/**
 * `RetentionStatus` -> severity, the phone's `RETENTION_SEVERITY`
 * (`src/lib/utils/retention-calculation.ts:34-38`).
 *
 * `OVERWRITTEN` is `error` and NOT a neutral: on the phone it had been the neutral fallback
 * since the screen was written, so the one TERMINAL state — the footage is already gone — was
 * the only one of the four painted as if it carried no severity, while the strictly-less-bad
 * `CRITICAL` got full red. The demo already mapped both to its `danger` triple, so this is a
 * re-point rather than a re-ruling. `CRITICAL` and `OVERWRITTEN` deliberately share the red
 * pair (owner ruling): both mean "the evidence is at risk", and their labels say which.
 */
const RETENTION_SEVERITY = {
  SAFE: 'success',
  WARNING: 'warning',
  CRITICAL: 'error',
  OVERWRITTEN: 'error',
} as const satisfies Record<RetentionStatus, StatusSeverity>

const RETENTION_LABEL: Record<RetentionStatus, string> = {
  SAFE: 'Safe',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
  OVERWRITTEN: 'Overwritten',
}

/** Phone `dvr-information.tsx:438` — `withAlpha(statusDetails.accent, 0.15)`. */
const RETENTION_TINT_ALPHA = 0.15

/**
 * The retention pill is NOT A69's `statusBadgeStyle`, and that is the phone's own split, not an
 * oversight here: `dvr-information.tsx:547-556` gives this badge `borderRadius.sm` (4) and a
 * **15% tint of the saturated severity** as its fill, where `CaseStatusBadge` takes
 * `borderRadius.lg` (12) and the OPAQUE `*Light` tone. Only the foreground rule is shared —
 * `*OnLight`, never the accent, which is what put the evidence-overwrite warning at 1.95:1
 * (WARNING) and 2.25:1 (SAFE) in light mode (`dvr-information.tsx:160-165`).
 *
 * Was: `#ff7a85` / `#10d177` / `#ffd93d` text on a 12-14% tint of its own hue — the accent AS
 * text, which §C.3 rule 1 bans.
 */
function retentionBadge(status: RetentionStatus): CSSProperties {
  const tone = severityTone(RETENTION_SEVERITY[status])
  return {
    color: tone.color,
    background: withAlpha(tone.borderColor, RETENTION_TINT_ALPHA),
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tone.borderColor,
    borderRadius: radius.sm,
    padding: `${spacing.xs}px ${spacing.sm}px`,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    // The phone renders the raw `RetentionStatus` enum member, which is already upper case
    // (`dvr-information.tsx:177`, `label: status`). The demo carries Title Case labels and
    // uppercases them in CSS — same glyphs on screen. NOT the `textTransform` A69 deleted from
    // the case pills: there the phone genuinely stopped shouting.
    textTransform: 'uppercase',
  }
}


export interface DvrInfoScreenProps {
  dvr: DvrInformation
  /** Derived retention view (total window + per-scope countdown), computed by the bridge. */
  retention: RetentionView
  onChange(field: keyof DvrInformation, value: string): void
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). */
  isFieldVisible(id: FormFieldId): boolean
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function DvrInfoScreen({ dvr, retention, onChange, isFieldVisible, onNext, onBack, onMenu }: DvrInfoScreenProps) {
  // Custom Resolution/FPS mode — mirrors the phone's dvr-information.tsx:69-74,124-142:
  // local state seeded from the stored value (a saved free-text value reopens in custom
  // mode); selecting the `custom` sentinel reveals the free-text input and leaves the
  // stored value untouched; selecting a standard value clears the flag and writes through.
  const [customResolution, setCustomResolution] = useState(isCustomResolution(dvr.resolution))
  const [customFps, setCustomFps] = useState(isCustomFps(dvr.recordingFps))

  const handleResolutionSelect = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomResolution(true)
    } else {
      setCustomResolution(false)
      onChange('resolution', value)
    }
  }

  const handleFpsSelect = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomFps(true)
    } else {
      setCustomFps(false)
      onChange('recordingFps', value)
    }
  }

  // Three section cards, each hidden once it has nothing left to hold — a titled card with an
  // empty body reads as a bug. The store's cascade hides the whole SCREEN when the last field
  // anywhere on it goes off, so an all-empty render is unreachable.
  //
  // TWO of the three no longer need a call-site guard: U6.1 moved the collapse into
  // `SectionCard`'s recipe (`Children.toArray(children).length === 0`), and every child of the
  // first two sections is a `{show.x && <Field/>}` that `toArray` drops. Their hoisted booleans
  // were deleted here as redundant — U6.4a's consume-me item 4 hands that deletion to this
  // package, and `field-visibility.test.tsx`'s "drops each DVR card independently" is the pin
  // that proves the recipe still does it.
  //
  // `showRetention` STAYS, and it is the exception U6.1's Defect 2 predicted by name: this
  // section's body is a TERNARY, so it always yields exactly one child and the recipe's
  // zero-children test can never fire for it. Without this guard, switching off all three
  // retention fields renders an empty titled card holding a placeholder that names a control
  // no longer on the screen. Pinned in `status-owners.test.tsx`.
  const show = {
    dvrLocation: isFieldVisible('dvr.dvrLocation'),
    dvrTypeBrand: isFieldVisible('dvr.dvrTypeBrand'),
    serialModelNumber: isFieldVisible('dvr.serialModelNumber'),
    dvrUsername: isFieldVisible('dvr.dvrUsername'),
    dvrPassword: isFieldVisible('dvr.dvrPassword'),
    numberOfChannels: isFieldVisible('dvr.numberOfChannels'),
    activeCameras: isFieldVisible('dvr.activeCameras'),
    resolution: isFieldVisible('dvr.resolution'),
    recordingFps: isFieldVisible('dvr.recordingFps'),
    recordingSchedule: isFieldVisible('dvr.recordingSchedule'),
    firstRecordedDate: isFieldVisible('dvr.firstRecordedDate'),
    totalDvrRetention: isFieldVisible('dvr.totalDvrRetention'),
    daysUntilOverwritten: isFieldVisible('dvr.daysUntilOverwritten'),
  }
  const showRetention = show.firstRecordedDate || show.totalDvrRetention || show.daysUntilOverwritten

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="DVR Information" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Basic DVR Details">
          {show.dvrLocation && <Field label="DVR Location" value={dvr.dvrLocation} onChange={(v) => onChange('dvrLocation', v)} placeholder="e.g., Manager's office" />}
          {show.dvrTypeBrand && <Field label="DVR Type / Brand" value={dvr.dvrTypeBrand} onChange={(v) => onChange('dvrTypeBrand', v)} placeholder="e.g., Hikvision, Dahua" />}
          {show.serialModelNumber && <Field label="Serial / Model Number" value={dvr.serialModelNumber} onChange={(v) => onChange('serialModelNumber', v)} placeholder="Serial or model" />}
          {show.dvrUsername && <Field label="DVR Username" value={dvr.dvrUsername} onChange={(v) => onChange('dvrUsername', v)} placeholder="e.g., admin" />}
          {show.dvrPassword && <Field label="DVR Password" value={dvr.dvrPassword} onChange={(v) => onChange('dvrPassword', v)} placeholder="Login password" />}
        </SectionCard>

        <SectionCard title="Recording Configuration">
          {show.numberOfChannels && <Field label="Channels" value={dvr.numberOfChannels} onChange={(v) => onChange('numberOfChannels', v)} placeholder="e.g., 16" />}
          {show.activeCameras && <Field label="Active Cameras" value={dvr.activeCameras} onChange={(v) => onChange('activeCameras', v)} placeholder="e.g., 8" />}
          {show.resolution && (
            <>
              <SelectField label="Resolution" value={customResolution ? CUSTOM_VALUE : dvr.resolution} onChange={handleResolutionSelect} options={RESOLUTION_OPTIONS} />
              {customResolution && (
                <Field label="Custom Resolution" value={dvr.resolution} onChange={(v) => onChange('resolution', v)} placeholder="e.g., 1440x900" />
              )}
            </>
          )}
          {show.recordingFps && (
            <>
              <SelectField label="Recording FPS" value={customFps ? CUSTOM_VALUE : dvr.recordingFps} onChange={handleFpsSelect} options={FPS_OPTIONS} />
              {customFps && (
                <Field label="Custom FPS" value={dvr.recordingFps} onChange={(v) => onChange('recordingFps', v)} placeholder="e.g., 12" />
              )}
            </>
          )}
          {show.recordingSchedule && (
          <div>
            {/* U6.4a's A72 seam — this was one of the retired four-key label copies. */}
            <div style={fieldLabelStyle}>Recording Schedule</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {RECORDING_SCHEDULE_OPTIONS.map((opt) => {
                const on = parseRecordingSchedule(dvr.recordingSchedule).includes(opt.toLowerCase())
                return (
                  <button
                    key={opt}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={opt}
                    onClick={() => onChange('recordingSchedule', toggleRecordingSchedule(dvr.recordingSchedule, opt))}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      // Phone `Checkbox.tsx:116` puts `spacing.sm` between the box and its label;
                      // the seam deliberately carries no `marginRight`, so the row supplies it.
                      gap: spacing.sm,
                      padding: '11px 12px',
                      borderRadius: 8,
                      border: `1px solid ${on ? colors.primary : colors.border}`,
                      background: on ? withAlpha(colors.primary, 0.14) : colors.background,
                      // ONE token, not a ternary. The phone's label is `colors.text` in both
                      // states (`Checkbox.tsx:88`) — selection is carried by the box, the border
                      // and the fill, three carriers already. The demo dimmed the unchecked
                      // label to the retired `#cdd9e6`, making colour a FOURTH carrier and the
                      // only one that also said "less readable".
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* A75 / SEAM(U2.4). Was a private 16x16 square at `borderWidth: 1` with a
                        hand-inlined `#fff` SVG tick — one of the three sites matrix A75 names.
                        The seam is the phone's `Checkbox.tsx:109-128`: 24x24, `borderWidth: 2`,
                        `radius.sm`, `colors.primary` fill, and the glyph as the LITERAL U+2713
                        in `colors.onPrimary`. The row geometry around it stays demo-owned — the
                        phone has no pill here at all (its `Checkbox` row is a bare 44px line),
                        and A75 is the BOX recipe, not the row. */}
                    <CheckboxBox checked={on} />
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
          )}
        </SectionCard>

        {showRetention && (
        <SectionCard title="Retention">
          {show.firstRecordedDate && (
            <>
              <div style={fieldLabelStyle}>First Recorded Date</div>
              <div style={{ marginBottom: 14 }}>
                <DateField value={dvr.firstRecordedDate} onChange={(v) => onChange('firstRecordedDate', v)} />
              </div>
            </>
          )}

          {retention.totalRetention != null ? (
            <>
              {show.totalDvrRetention && (
              /* A55 — the nested tier. Was a private `rgba(43,140,193,0.08)` wash under the
                 `elevated` border, a pairing no tier spells: an accent border at 0.25 over an
                 accent FILL at 0.08. The phone's is `<Card glass glassVariant="nestedCard">`
                 (`dvr-information.tsx:401`), the same tier the per-scope rows below already take,
                 which is what makes the two read as one family. Lifted 10/14 kept (demo §0.4). */
              <div style={{ ...glassCardNested, marginBottom: 14, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: colors.textTertiary, letterSpacing: 0.3 }}>Total DVR Retention</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{retention.totalRetention} days</div>
                <div style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>From the earliest recorded date to today.</div>
              </div>
              )}

              {show.daysUntilOverwritten && retention.scopes.length > 0 && (
                <div>
                  {/* A sub-heading, not a field label — hence `colors.text` at 600 rather than
                      `fieldLabelStyle`. Phone `scopeRetentionTitle` (`dvr-information.tsx:530-535`)
                      is `fontSize.base`/semibold; the demo's lifted 13 stays (demo §0.4). */}
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Retention status by scope</div>
                  {retention.scopes.map((s) => {
                    const status = getRetentionStatus(s.daysUntilOverwritten)
                    return (
                      // A33/A55 (U1.3) - the nested tier; was `rgba(13,27,42,0.6)` on the
                      // card hairline. Lifted `borderRadius: 10` kept (demo §0.4).
                      <div key={s.label} style={{ ...glassCardNested, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{s.label}</div>
                          <div style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
                            {s.daysUntilOverwritten === 0 ? 'Already overwritten' : `${s.daysUntilOverwritten} days until overwritten · ${s.overwrittenDate}`}
                          </div>
                        </div>
                        <span style={retentionBadge(status)}>{RETENTION_LABEL[status]}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            // R-8: the placeholder names a control, so it may only appear while that control is
            // on the screen. With First Recorded Date switched off in the Form Fields grid and
            // either retention output left on, this card's whole body used to be an instruction
            // to use a picker three clicks away in Settings.
            <div style={{ fontSize: 12, color: colors.textTertiary, fontStyle: 'italic', padding: '4px 2px' }} data-testid="dvr-retention-empty">
              {show.firstRecordedDate
                ? 'Pick the first recorded date to calculate total retention and per-scope overwrite countdowns.'
                : 'Turn First Recorded Date back on in Settings → Form Fields to calculate retention.'}
            </div>
          )}
        </SectionCard>
        )}

        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
