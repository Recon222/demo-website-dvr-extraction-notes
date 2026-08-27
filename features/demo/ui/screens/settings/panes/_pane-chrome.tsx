'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { TypedOption } from '@/features/demo/engine/content/settings-values'
import { SelectField } from '@/features/demo/ui/screens/_shared'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone } from '@/features/demo/ui/tokens/status'

/**
 * Shared chrome for the Settings detail panes — the demo's equivalent of the styles every
 * `*SettingsSection.tsx` on the phone repeats (`description` / `settingGroup` / `settingLabel`
 * / `settingHelp` / `infoBox` / `warningNote` / `successNote`). Built once here for the same
 * reason `screens/_shared.tsx` exists: eight panes re-rolling the same label + helper + note
 * stack is how they drift apart.
 *
 * Presentational only. Nothing here knows what a setting means.
 */

// ---- Text -------------------------------------------------------------------

/** The pane's opening paragraph (phone `styles.description`). */
export function PaneDescription({ children }: { children: ReactNode }) {
  return <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.55, color: '#99badd' }}>{children}</p>
}

/**
 * One labelled setting: bold label, optional helper line, then the control (phone
 * `settingGroup` → `settingLabel` → `settingHelp` → control).
 *
 * `value` renders right-aligned beside the label — the phone does this for exactly one control,
 * the Photo Quality slider's live `{percent}%` (MediaCaptureSettingsSection.tsx:153-155).
 *
 * `role="group"` + `aria-label` is a small IMPROVEMENT on the phone, not a divergence in what is
 * rendered. Phone parity requires the label to appear once, above the control, with the shared
 * `Picker`'s own `label` prop left unset (ui-mapping 12 documents that on every settings picker,
 * which is why their bottom sheets all fall back to "Select an option"). A dropdown named only
 * by its current value then tells a screen-reader user *what is selected* but not *what for*;
 * naming the surrounding group restores that without printing the label twice or touching a
 * shared input eight other screens depend on.
 */
export function PaneGroup({
  label,
  help,
  value,
  children,
}: {
  label: string
  help?: ReactNode
  value?: ReactNode
  children?: ReactNode
}) {
  return (
    <div role="group" aria-label={label} style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f4f8' }}>{label}</div>
        {value !== undefined && <div style={{ fontSize: 15, fontWeight: 700, color: '#2B8CC1' }}>{value}</div>}
      </div>
      {help && <div style={{ fontSize: 12.5, lineHeight: 1.45, color: '#7a9fc4', margin: '4px 0 10px' }}>{help}</div>}
      {children}
    </div>
  )
}

// ---- Notes ------------------------------------------------------------------

export type PaneNoteTone = 'info' | 'warning' | 'success'

/**
 * A69's eighth status-colour owner, retired. The three hand-mixed triples this replaces spent
 * the SATURATED accent as the note's text on a 9-10% tint of its own hue — the pairing the
 * phone's `Banner` docblock measures at **1.92-2.24:1** and §C.3 rule 1 bans outright.
 *
 * The phone's `infoBox` / `warningNote` / `successNote` are `<Banner severity>` at `main`
 * (e.g. `LocationSettingsSection.tsx:126`, `MediaCaptureSettingsSection.tsx:224`), so the tone
 * half is exactly `severityTone()`. **Only the tone half lands here.** Replacing `PaneNote`
 * with the `Banner` COMPONENT — which would also move padding 13 -> 12, radius 10 -> 8 and
 * fontSize 12.5 -> 14 — is U6.2's under D19's re-cut, and U6.2 already opens this file.
 *
 * `PaneNoteTone` needs no runtime guard: `severityTone(tone)` only compiles while every tone
 * IS a severity, so widening the union to something with no `*Light` pair is a type error here.
 *
 * `id` (R-6) makes a note addressable as an `aria-describedby` target. Every inert control in
 * these panes points at the short note beside it, so the reason is announced AT the control
 * rather than only being legible to someone who scrolled past it.
 */
export function PaneNote({
  tone = 'info',
  id,
  role,
  children,
}: {
  tone?: PaneNoteTone
  id?: string
  /**
   * `'status'` for a note that APPEARS in response to a control (R-34) — a polite live region,
   * the repo's existing idiom (`MediaCaptureScreen.tsx:530`). Omit for a note that is simply
   * part of the pane: a static live region announces nothing and costs a needless AT boundary.
   */
  role?: 'status'
  children: ReactNode
}) {
  const t = severityTone(tone)
  return (
    <div
      id={id}
      role={role}
      data-pane-note={tone}
      style={{
        // Geometry unchanged and deliberately so — see the tone docblock above: the Banner
        // adoption that moves 13/10/12.5 to the phone's 12/8/14 is U6.2's half of D19.
        padding: 13,
        marginTop: 10,
        borderRadius: 10,
        // Three longhands, never the `border` shorthand: a shorthand after a longhand erases
        // it, and React writes only CHANGED keys on update.
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: t.borderColor,
        background: t.background,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: t.color,
      }}
    >
      {children}
    </div>
  )
}

/**
 * **The honesty treatment for a stubbed pane (decision D6).**
 *
 * Every pane in this package renders one, first thing, and each one names the specific thing
 * ITS controls do not do. That specificity is the whole point: "this is a demo" at the top of a
 * settings screen would be decoration, whereas "the demo's capture path never reads these, and
 * it embeds no EXIF at all" is a fact a visitor can check.
 *
 * Same shape as the export terminals (`exportNotices.ts`): say what the real app does with the
 * setting, then say plainly why nothing here does. Never a fake success, never a claim about a
 * device capability a browser tab does not have.
 */
export function PaneStubNote({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="settings-pane-stub-note"
      style={{
        padding: 14,
        marginBottom: 18,
        borderRadius: 10,
        border: GLASS.borderAccent,
        background: 'rgba(43,140,193,0.08)',
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: '#7a9fc4',
          marginBottom: 7,
        }}
      >
        In the demo
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: '#cdd9e6' }}>{children}</div>
    </div>
  )
}

// ---- Controls ---------------------------------------------------------------

const radioOption = (selected: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '12px 14px',
  marginBottom: 8,
  borderRadius: 10,
  border: `1px solid ${selected ? '#2B8CC1' : colors.border}`,
  background: selected ? 'rgba(43,140,193,0.08)' : 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
})

/**
 * The phone's radio groups (Export Mode, Encryption Strength) — a bordered row per option with
 * a ring + dot, the border lighting on the selection. `radiogroup`/`radio` roles so the set
 * reads as one control to AT, which the phone gets from `accessibilityRole="radio"`.
 */
export function PaneRadioGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  testIdOf,
}: {
  label: string
  options: readonly TypedOption<T>[]
  value: T
  /** Receives the domain value straight off the option — nothing is asserted (R-11). */
  onChange(value: T): void
  /** Per-option testid, so a pane can seed the phone's own (`export-security-strength-aes256`). */
  testIdOf?(value: T): string
}) {
  return (
    <div role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-testid={testIdOf?.(o.value)}
            onClick={() => onChange(o.value)}
            style={radioOption(selected)}
          >
            <span
              aria-hidden="true"
              style={{
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                borderRadius: 10,
                border: `2px solid ${selected ? '#2B8CC1' : '#7a9fc4'}`,
              }}
            >
              {selected && <span style={{ width: 10, height: 10, borderRadius: 5, background: '#2B8CC1' }} />}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 500, color: '#f0f4f8' }}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * A settings picker bound to a CLOSED union (R-11).
 *
 * The narrowing is a lookup, not an assertion: the option whose stringified value matches what
 * `Dropdown` hands back IS the domain value, so `onChange` receives `T` with nothing asserted
 * and an unrecognised string is dropped rather than cast into the union. That also absorbs the
 * two numeric settings, whose values used to be stringified in the list and re-parsed at the
 * handler for want of a place to keep the type.
 *
 * `a11yLabel` is required here because every caller is a label-less settings picker — see R-9;
 * `SelectField`'s own `label` stays unset for phone parity.
 */
export function PaneSelect<T extends string | number>({
  a11yLabel,
  value,
  options,
  onChange,
}: {
  a11yLabel: string
  value: T
  options: readonly TypedOption<T>[]
  onChange(value: T): void
}) {
  return (
    <SelectField
      a11yLabel={a11yLabel}
      value={String(value)}
      options={options.map((o) => ({ label: o.label, value: String(o.value) }))}
      onChange={(picked) => {
        const hit = options.find((o) => String(o.value) === picked)
        if (hit) onChange(hit.value)
      }}
    />
  )
}

/**
 * The Photo Quality slider (the phone's only `@react-native-community/slider`). A native
 * `<input type="range">`: it is keyboard-operable, announces its value, and honours the same
 * min/max/step the phone passes — everything a hand-rolled track would have to re-earn.
 *
 * `valueText` is REQUIRED (R-7) because the raw value is not the value the visitor sees. This
 * control is bound to a 0.5–1.0 scalar while the pane's readout — the only reason the control
 * exists — is a percentage. Without `aria-valuetext` AT announces `0.85`, or on a `min≠0` range
 * several AT/browser pairs announce percent-OF-RANGE (70% for the same reading), either of which
 * CONTRADICTS the number on screen. Not merely missing information: announced information that
 * is false (WCAG 4.1.2). Required rather than optional so a second slider cannot repeat it.
 */
export function PaneSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueText,
  minLabel,
  maxLabel,
  testId,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange(value: number): void
  /** What the visitor SEES for the current value (e.g. `"85%"`). Announced verbatim. */
  valueText: string
  minLabel: string
  maxLabel: string
  testId?: string
}) {
  return (
    <div>
      <input
        type="range"
        aria-label={label}
        aria-valuetext={valueText}
        data-testid={testId}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#2B8CC1', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7a9fc4' }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
