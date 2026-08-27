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
import { RadioOption } from '@/features/demo/ui/controls/choice-controls'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import { PaneDescription } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

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
  color: colors.text,
}

const pill: CSSProperties = {
  flex: '0 0 auto',
  fontSize: 10.5,
  fontWeight: 600,
  color: colors.textTertiary,
  border: GLASS.borderSoft,
  borderRadius: 999,
  padding: '2px 8px',
  whiteSpace: 'nowrap',
}

const bodyStyle: CSSProperties = { padding: '2px 12px 12px 30px' }
const noteStyle: CSSProperties = { fontSize: 12, lineHeight: 1.5, color: colors.textTertiary }

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

function ProfilePicker({
  profile,
  onApplyProfile,
}: Pick<FormFieldsPaneProps, 'profile' | 'onApplyProfile'>) {
  const reduction = describeProfile(profile)
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  return (
    <div style={{ marginBottom: 18 }}>
      {/* The phone's `settingLabel` / `settingHelp` (`MediaCaptureSettingsSection.tsx:396-407`),
          hand-rolled here because this group is a `radiogroup` and cannot nest inside
          `PaneGroup`'s `role="group"`. It has to move WITH `PaneGroup` or this pane disagrees
          with every sibling in the same sheet. */}
      <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{COPY.profileLabel}</div>
      <div style={{ fontSize: 14, lineHeight: '21px', color: colors.textSecondary, margin: '4px 0 10px' }}>{COPY.profileHelp}</div>
      {/* A74 — the profile chips are the shared radio now, as they are on the phone: PR #123
          moved this very picker off its hand-rolled chips and onto `RadioGroup`
          (`ProfilePicker.tsx:75-81`), and `RadioGroup.tsx:151-156` records that the migration
          could not ship until the radio grew `minHeight: touchTarget.min`, because these chips
          were 46px. THIS ROW is the 3-up group `RadioOption`'s shrink machinery exists for, and
          it took two rounds to get right: F29 released the LABEL's `min-width: auto`, which
          left the `<button>`'s own floor binding and the row still 21px past the pane
          (Chromium at `250e12f`: clientWidth 342 vs scrollWidth 363, `fc-profile-canvas` right
          edge 433.8 vs 413; the same defect in re-cut pixels, `_captures/w2/DIFF.md` §f1-§f7:
          rightmost pixel x781 vs pane inset x739, all four shots). F29' releases the button and
          lets the word break. Nothing in jsdom can see any of that, and no capture of the FIX
          exists yet — the next settings re-cut is what settles it. */}
      <div role="radiogroup" aria-label={COPY.profileLabel} style={{ display: 'flex', gap: spacing.sm }}>
        {PROFILES.map((p) => (
          <RadioOption
            key={p}
            label={PROFILE_LABELS[p]}
            selected={p === profile}
            onSelect={() => onApplyProfile(p)}
            testId={`fc-profile-${p}`}
          />
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 10 }}>{PROFILE_BLURBS[profile]}</div>
      {/* Derived from PROFILE_DEFAULTS, never from the blurb above it.
          R-17: scoped to the PROFILE, because that is all `describeProfile` counts. The old
          "every screen and field is on" was a present-tense claim about the live form, which
          the visitor's own overrides can falsify one row below — the counterweight §82d built
          against a stale blurb must not need one of its own. */}
      <div data-testid="fc-profile-reduction" style={{ fontSize: 11.5, color: colors.textTertiary, marginTop: 3 }}>
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
          <span aria-hidden="true" style={{ width: 12, textAlign: 'center', color: colors.textTertiary, fontSize: 13 }}>
            {expanded ? '▾' : '▸'}
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.label}
          </span>
        </button>
        {locked && <LockPill id={lockId(step.id)} testId={`fc-screen-lock-${step.id}`} />}
        {/* `hideLabel` (U2.3): the row's chevron button already prints `step.label`, so the
            switch takes it as its accessible NAME only — printing it twice reads twice to a
            sighted visitor and once too often to a screen reader. `describedBy` points a locked
            switch at its own `LockPill`, so focus announces "…, switch, on, dimmed, Always on"
            rather than stopping at "dimmed" (R-6). */}
        <Toggle
          hideLabel
          label={step.label}
          on={locked ? true : visible}
          disabled={locked ? { reasonId: lockId(step.id) } : undefined}
          onClick={() => onToggleStep(step.id, !visible)}
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
                  {/* U6.4a: this names a FORM FIELD beside its switch, so it followed the
                      form-label family off the retired tone onto `colors.text`. The 13 and the
                      truncation trio are the grid's own and are unchanged (D3). */}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.label}
                  </span>
                  {fieldLocked && <LockPill id={lockId(f.id)} testId={`fc-field-lock-${f.id}`} />}
                  <Toggle
                    hideLabel
                    label={f.label}
                    on={fieldLocked ? true : on}
                    disabled={fieldLocked ? { reasonId: lockId(f.id) } : undefined}
                    onClick={() => onToggleField(f.id, !on)}
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

      <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.text, margin: '16px 0 8px' }}>{COPY.additiveHeader}</div>
      {ADDITIVE_FORM_STEPS.map((s) => (
        <ScreenRow key={s.id} step={s} {...rowProps} />
      ))}

      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: '#5d7a9a', marginTop: 14 }}>{COPY.footnote}</div>
    </div>
  )
}
