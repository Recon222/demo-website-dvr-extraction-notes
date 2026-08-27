'use client'

import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ADDITIVE_FORM_STEPS,
  LINEAR_FORM_STEPS,
  getStepFields,
  isFieldAlwaysOn,
  isStepMustStay,
} from '@/features/demo/engine/content/form-customization'
import { PROFILE_BLURBS, PROFILE_LABELS, describeProfile } from '@/features/demo/engine/content/profiles'
import { PROFILES, type FormFieldId, type FormStepDef, type FormStepId, type Profile } from '@/features/demo/engine/types'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { switchKeyDown } from '@/features/demo/ui/screens/_shared'
import { PaneDescription } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { colors } from '@/features/demo/ui/tokens/palette'

/**
 * Detail pane: **Form Fields** (matrix row A2, owner decision D9) — the phone's
 * `FormCustomizationSection` + `FormCustomizationProfilePicker`, and REAL, not a stub: the
 * profile chips and every toggle here change what the wizard renders, immediately.
 *
 * Presentational, like every other pane: visibility arrives already resolved
 * (`isStepVisible`/`isFieldVisible` are the bridge's resolver bound to the store state) and
 * intent leaves through callbacks. The precedence rule, the locks and the cascades all live in
 * `engine/` — this file only knows how to draw a row.
 *
 * ## Row shape (phone `FormCustomizationSection.tsx:96-142`)
 *
 * Every step renders the same row: a chevron + label that expands, then an optional "Always on"
 * pill, then the screen switch. Field-capable rows expand into per-field switches; screen-only
 * rows expand into one explanatory line. LOCKED rows render the switch on and `aria-disabled` —
 * the store refuses the write anyway, so showing the control disabled is more honest than
 * hiding it and more honest than letting it appear to take.
 *
 * ## The one addition to the phone's picker
 *
 * Under the active profile's blurb sits a DERIVED reduction line ("hides 1 screen · 12 fields",
 * counted by `describeProfile`). The phone's blurbs are carried verbatim, and one of them —
 * `limited`'s "Comprehensive, lightly reduced" — describes defaults that drop nothing at all.
 * A number computed from the same map the resolver reads cannot make that mistake; see
 * `content/profiles.ts`'s note and deferred §82.
 *
 * There is no Reset control, on either side: the phone's store has `resetToProfileDefaults` and
 * its settings UI never calls it. Re-stamping a profile is the reset path in both apps.
 */

export interface FormFieldsPaneProps {
  profile: Profile
  isStepVisible(id: FormStepId): boolean
  isFieldVisible(id: FormFieldId): boolean
  /** Apply a profile. The bridge raises the phone's confirm first when overrides exist — a
   *  blocking dialog is bridge state on this side, so the pane just reports the intent. */
  onApplyProfile(profile: Profile): void
  onToggleStep(id: FormStepId, on: boolean): void
  onToggleField(id: FormFieldId, on: boolean): void
}

/** Phone copy, verbatim (`FormCustomizationSection.tsx:41-47`), keyed by the demo's step ids. */
const SCREEN_NOTES: Partial<Record<FormStepId, string>> = {
  timeOffset: 'Required time calibration — always shown. No individual fields to configure.',
  extractedScope: 'Auto-calculated from the time offset. No individual fields to configure.',
  notes: 'Auto-generated from your entries. No individual fields to configure.',
  mediaCapture: 'A capture tool opened from the wizard drawer. No individual fields to configure.',
  audioRecording: 'A capture tool opened from the wizard drawer. No individual fields to configure.',
}

const COPY = {
  description:
    'Pick a profile for sensible defaults, then turn individual screens or fields on or off. Required screens and fields stay on. Changes apply to the wizard immediately.',
  profileLabel: 'Profile',
  profileHelp:
    'Sets the default fields. You can still toggle anything below; switching profiles resets to its defaults.',
  additiveHeader: 'Additive tools',
  screenHidden: 'This screen is hidden. Turn it on above to customize its fields.',
  noFields: 'This screen has no individual fields to configure.',
  footnote:
    'Hidden screens are removed from the wizard flow only — any data already entered is still saved and still appears in the generated report.',
  lock: 'Always on',
} as const

const group: CSSProperties = {
  border: GLASS.borderSoft,
  borderRadius: 10,
  marginBottom: 8,
  overflow: 'hidden',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
  minHeight: 48,
}

const chevronButton: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 0',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  color: '#f0f4f8',
}

const pill: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 10.5,
  fontWeight: 600,
  color: '#7a9fc4',
  border: GLASS.borderSoft,
  borderRadius: 999,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
}

const bodyStyle: CSSProperties = { padding: '2px 12px 12px 30px' }
const noteStyle: CSSProperties = { fontSize: 12, lineHeight: 1.5, color: '#7a9fc4' }

/**
 * The "Always on" tag beside a locked row — and, since review R-6, that row's switch's
 * `aria-describedby` target. `aria-disabled` announces a STATE ("dimmed") and carries no reason;
 * the house rule this control cites (`ModalActions.submitBlocked`) pairs it with a description,
 * and pointing at this pill makes the pill's own words the reason without writing new copy.
 */
function LockPill({ id, testId }: { id: string; testId: string }) {
  return (
    <span id={id} data-testid={testId} style={pill}>
      {COPY.lock}
    </span>
  )
}

/**
 * The grid's switch. `_shared.tsx`'s `Toggle` prints its label INSIDE the control, which is
 * right for a settings row and wrong here — a grid row already draws its own label, and the two
 * would read twice to a sighted visitor and once too often to a screen reader. Same visual
 * track, same `aria-disabled`-not-`disabled` rule (the control stays focusable so a keyboard
 * visitor reaches it and hears WHY), same `switchKeyDown`.
 *
 * "Hears why" is `describedBy` (R-6): a locked switch points at its own `LockPill`, so focusing
 * it announces "…, switch, on, dimmed, Always on" instead of stopping at "dimmed". Without it a
 * screen-reader visitor cannot tell a deliberate lock from a broken control — the pill is an
 * unlabelled span two nodes away and is never read at that moment.
 */
function RowSwitch({
  label,
  on,
  disabled,
  describedBy,
  onToggle,
  testId,
}: {
  label: string
  on: boolean
  disabled: boolean
  /** Id of the element saying WHY this control is inert. Read only while `disabled`. */
  describedBy?: string
  onToggle(): void
  testId: string
}) {
  const activate = () => {
    if (!disabled) onToggle()
  }
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      aria-describedby={disabled ? describedBy : undefined}
      aria-label={label}
      data-testid={testId}
      tabIndex={0}
      onClick={activate}
      onKeyDown={switchKeyDown(activate)}
      style={{
        flex: '0 0 auto',
        width: 46,
        height: 28,
        borderRadius: 14,
        background: on ? '#2B8CC1' : colors.border,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        aria-hidden="true"
        style={{ position: 'absolute', top: 3, [on ? 'right' : 'left']: 3, width: 22, height: 22, borderRadius: 11, background: on ? '#fff' : '#7a9fc4' }}
      />
    </div>
  )
}

function ProfilePicker({
  profile,
  onApplyProfile,
}: Pick<FormFieldsPaneProps, 'profile' | 'onApplyProfile'>) {
  const reduction = describeProfile(profile)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8' }}>{COPY.profileLabel}</div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#7a9fc4', margin: '4px 0 10px' }}>{COPY.profileHelp}</div>
      <div role="radiogroup" aria-label={COPY.profileLabel} style={{ display: 'flex', gap: 8 }}>
        {PROFILES.map((p) => {
          const active = p === profile
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={active}
              data-testid={`fc-profile-${p}`}
              onClick={() => onApplyProfile(p)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${active ? '#2B8CC1' : colors.border}`,
                background: active ? 'rgba(43,140,193,0.14)' : 'transparent',
                color: active ? '#2B8CC1' : '#cdd9e6',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {PROFILE_LABELS[p]}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 12.5, color: '#99badd', marginTop: 10 }}>{PROFILE_BLURBS[profile]}</div>
      {/* Derived from PROFILE_DEFAULTS, never from the blurb above it.
          R-17: scoped to the PROFILE, because that is all `describeProfile` counts. The old
          "every screen and field is on" was a present-tense claim about the live form, which
          the visitor's own overrides can falsify one row below — the counterweight §82d built
          against a stale blurb must not need one of its own. */}
      <div data-testid="fc-profile-reduction" style={{ fontSize: 11.5, color: '#7a9fc4', marginTop: 3 }}>
        {reduction.steps === 0 && reduction.fields === 0
          ? 'This profile hides nothing by default.'
          : `Hides ${plural(reduction.steps, 'screen')} · ${plural(reduction.fields, 'field')} by default.`}
      </div>
    </div>
  )
}

function ScreenRow({
  step,
  isStepVisible,
  isFieldVisible,
  onToggleStep,
  onToggleField,
}: { step: FormStepDef } & Pick<
  FormFieldsPaneProps,
  'isStepVisible' | 'isFieldVisible' | 'onToggleStep' | 'onToggleField'
>) {
  const [expanded, setExpanded] = useState(false)
  // One id per row instance; the lock pills hang their `aria-describedby` targets off it, so
  // twelve rows (and fifty field rows) never collide even though the pill copy is identical.
  const uid = useId()
  const lockId = (suffix: string) => `${uid}-lock-${suffix}`
  const bodyId = `${uid}-body`
  const locked = isStepMustStay(step.id)
  const visible = isStepVisible(step.id)
  const fields = getStepFields(step.id)
  const fieldCapable = step.classification === 'field-capable' && fields.length > 0

  return (
    <div style={group}>
      <div style={rowStyle}>
        <button
          type="button"
          // R-31: `aria-expanded` already carries the state, so the NAME must not repeat it —
          // the repo's own `MediaAccordion` states this rule and the other eight
          // `aria-expanded` sites follow it. The name is the step label, full stop; the state
          // and the target come from the two attributes beside it.
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={step.label}
          data-testid={`fc-group-${step.id}`}
          onClick={() => setExpanded((e) => !e)}
          style={chevronButton}
        >
          <span aria-hidden="true" style={{ width: 12, textAlign: 'center', color: '#7a9fc4', fontSize: 13 }}>
            {expanded ? '▾' : '▸'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.label}
          </span>
        </button>
        {locked && <LockPill id={lockId(step.id)} testId={`fc-screen-lock-${step.id}`} />}
        <RowSwitch
          label={step.label}
          on={locked ? true : visible}
          disabled={locked}
          describedBy={lockId(step.id)}
          onToggle={() => onToggleStep(step.id, !visible)}
          testId={`fc-screen-toggle-${step.id}`}
        />
      </div>

      {expanded && (
        <div id={bodyId} style={bodyStyle} data-testid={`fc-body-${step.id}`}>
          {!fieldCapable ? (
            <div style={noteStyle}>{SCREEN_NOTES[step.id] ?? COPY.noFields}</div>
          ) : !visible ? (
            <div style={noteStyle}>{COPY.screenHidden}</div>
          ) : (
            fields.map((f) => {
              const fieldLocked = isFieldAlwaysOn(f.id)
              const on = isFieldVisible(f.id)
              return (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#cdd9e6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.label}
                  </span>
                  {fieldLocked && <LockPill id={lockId(f.id)} testId={`fc-field-lock-${f.id}`} />}
                  <RowSwitch
                    label={f.label}
                    on={fieldLocked ? true : on}
                    disabled={fieldLocked}
                    describedBy={lockId(f.id)}
                    onToggle={() => onToggleField(f.id, !on)}
                    testId={`fc-toggle-${f.id}`}
                  />
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export function FormFieldsPane({
  profile,
  isStepVisible,
  isFieldVisible,
  onApplyProfile,
  onToggleStep,
  onToggleField,
}: FormFieldsPaneProps) {
  const rowProps = { isStepVisible, isFieldVisible, onToggleStep, onToggleField }
  return (
    <div data-testid="settings-pane-form-customization">
      <PaneDescription>{COPY.description}</PaneDescription>

      <ProfilePicker profile={profile} onApplyProfile={onApplyProfile} />

      {LINEAR_FORM_STEPS.map((s) => (
        <ScreenRow key={s.id} step={s} {...rowProps} />
      ))}

      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#f0f4f8', margin: '16px 0 8px' }}>{COPY.additiveHeader}</div>
      {ADDITIVE_FORM_STEPS.map((s) => (
        <ScreenRow key={s.id} step={s} {...rowProps} />
      ))}

      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#5d7a9a', marginTop: 14 }}>{COPY.footnote}</div>
    </div>
  )
}
