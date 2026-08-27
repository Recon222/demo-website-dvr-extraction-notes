'use client'

import type { ReactNode } from 'react'
import type { TypedOption } from '@/features/demo/engine/content/settings-values'
import { SelectField } from '@/features/demo/ui/screens/_shared'
import { BannerIcon } from '@/features/demo/ui/controls/Banner'
import { RadioOption } from '@/features/demo/ui/controls/choice-controls'
import { GLASS } from '@/features/demo/ui/glass-tokens'
// The non-severity tokens only (text / textSecondary / textTertiary / primary). The SEVERITY
// trio comes from `severityTone` below and nowhere else — W2 F26. Master's F26 pass dropped
// this import because its smaller `_pane-chrome` had no reads left; U6.2's does.
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone } from '@/features/demo/ui/tokens/status'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

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

/**
 * The pane's opening paragraph — phone `styles.description`
 * (`MediaCaptureSettingsSection.tsx:383-387`, byte-identical in `LocationSettingsSection`,
 * `TimeSyncSettingsSection` and `SecuritySettingsSection`):
 *
 *   fontSize   `Typography.fontSize.sm`   14   (was 13)
 *   lineHeight `fontSize.base * lineHeight.relaxed` = 16 x 1.75 = **28**, an absolute value
 *   colour     `colors.textSecondary`     (was the same hex, spelled)
 *
 * `lineHeight` is spelled as a `px` PRODUCT, not a unitless ratio, for `Banner.tsx:140-143`'s
 * reason: RN takes points, and 28 is derived from `fontSize.base` rather than from this
 * paragraph's own 14 — a unitless 2.0 would silently re-derive if the size ever moved.
 *
 * The bottom margin is the phone's TWO gaps summed. `description.marginBottom` is
 * `Layout.spacing.sm` (8) and the section container adds `gap: Layout.spacing.lg` (24)
 * between every child (`:380-382`); RN adds a container gap to a child's margin exactly as
 * CSS does, so the description-to-first-group distance on the phone is **32**. The demo has no
 * shared pane container to hang the 24 on — each pane is a hand-written `<div>` — so the sum
 * lives here and `PaneGroup` carries the 24 as its own `marginBottom`.
 */
export function PaneDescription({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 32px', fontSize: 14, lineHeight: '28px', color: colors.textSecondary }}>{children}</p>
  )
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
 *
 * ## The recipe (A78's sibling — phone `MediaCaptureSettingsSection.tsx:388-408`)
 *
 * ```
 * settingGroup   gap Layout.spacing.xs (4)                     was: margins, per child
 * settingHeader  row · space-between · center                  was: the same, plus a gap: 10
 * settingLabel   fontSize.base 16 / semibold / colors.text     was: 15 / 600 / the hex
 * settingValue   fontSize.base 16 / bold / colors.primary      was: 15 / 700 / the hex
 * settingHelp    fontSize.sm 14 / lineHeight 14x1.5 = 21 /
 *                colors.textSecondary / marginBottom xs (4)    was: 12.5 / 1.45 / textTertiary
 * ```
 *
 * Three of those are more than a number:
 *
 * - **The help line moves off `textTertiary` onto `textSecondary`** (`:170`, `:196`, … — every
 *   `settingHelp` in the file). `textTertiary` carries the documented M2(b) ceiling (4.23:1 on
 *   `card`) and D5's rider says do not ADD text to it; this REMOVES eight lines from it.
 * - **The header row loses its `gap: 10`.** The phone's `settingHeader` has none (`:391-395`) —
 *   `space-between` on two items is the whole layout. A demo-only gap changes where the value
 *   sits the moment a label wraps.
 * - **`gap` replaces the per-child margins.** RN adds a container gap to a child's own margin
 *   exactly as CSS does, which is how the phone gets 4 between the label row and the help, 8
 *   between the help and the control (gap 4 + `settingHelp.marginBottom` 4), and 8 between the
 *   control and a note (gap 4 + `styles.note.marginTop` 4). Spelling the same three distances
 *   as three margins here would look identical and drift on the first insertion.
 *
 * `marginBottom` is the phone's CONTAINER gap (`:380-382`, `Layout.spacing.lg` = 24), carried
 * here because the demo's panes are hand-written `<div>`s with no shared wrapper to hang it on.
 * `PaneDescription`'s docblock carries the other half of that arithmetic.
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
    <div
      role="group"
      aria-label={label}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, marginBottom: spacing.lg }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{label}</div>
        {value !== undefined && <div style={{ fontSize: 16, fontWeight: 700, color: colors.primary }}>{value}</div>}
      </div>
      {help && (
        <div style={{ fontSize: 14, lineHeight: '21px', color: colors.textSecondary, marginBottom: spacing.xs }}>
          {help}
        </div>
      )}
      {children}
    </div>
  )
}

// ---- Notes ------------------------------------------------------------------

export type PaneNoteTone = 'info' | 'warning' | 'success'

/**
 * A69's eighth status-colour owner, retired. The three hand-mixed triples this replaces spent
 * the SATURATED accent as the note's text on a 9-10% tint of its own hue — the pairing the
 * phone's `Banner` docblock measures at **1.92-2.24:1** and §C.3 rule 1 bans outright. U3.2
 * landed the tone half (`severityTone`); U6.2 lands everything else.
 *
 * ## This IS the phone's `Banner`, drawn here rather than imported — and that is a RULING
 *
 * The phone's `infoBox` / `warningNote` / `successNote` are `<Banner severity>` at `main`
 * (`LocationSettingsSection.tsx:126`, `MediaCaptureSettingsSection.tsx:224,247,271,278,285,308`,
 * `SecuritySettingsSection.tsx:117,201`), each passed `style={styles.note}` = a lone
 * `marginTop: Layout.spacing.xs`. So every VISIBLE part of the phone's settings note is ported
 * here byte for byte — `Banner.tsx:84-99`'s row / flex-start / gap sm / radius md (8) /
 * borderWidth 1 / padding base (12), its `messageStyle` (flex 1 / fontSize.sm 14 /
 * lineHeight 21), and its 20px severity glyph, imported from `Banner` so the two cannot draw
 * different icons. `pane-chrome.test.tsx`'s drift guard renders both and asserts the styles are
 * EQUAL; if it ever reds, they have diverged and one of them is wrong.
 *
 * What is NOT taken is the component, and the reason is scope, not taste. `<Banner>` is
 * hard-wired to `role="alert"` + an explicit `aria-live`, and it has no `id`. Adopting it here
 * would:
 *
 *   1. break `aria-describedby` on the three inert controls that point at their note (R-6 —
 *      `AppearancePane`'s Dark Mode, `CloudSyncPane`'s switch, `ExportSecurityPane`'s Set
 *      Default Password), because there would be no `id` to point at;
 *   2. turn the six STATIC pane notes into live regions that announce on mount (R-34's
 *      explicit finding: "a static live region announces nothing and costs a needless AT
 *      boundary");
 *   3. turn the two REACTIVE notes from `role="status"` (polite) into `role="alert"`
 *      (assertive), interrupting the picker the visitor is still operating.
 *
 * All three are BEHAVIOUR changes to the accessibility tree, not style changes — and plan §2's
 * D20 carve-out names the six packages allowed one (U2.3, U4.2, U4.3, U5.2, U5.3, U6.3).
 * **U6.2 is not among them**, so §2's instruction applies as written: raise it rather than take
 * it. The `PaneNote`-as-`Banner`-wrapper shape U3.3's consume-me offers as the alternative is
 * worse than either end — it nests a `role="alert"` inside a `role="status"`.
 *
 * `PaneNoteTone` needs no runtime guard: `severityTone(tone)` only compiles while every tone
 * IS a severity, so widening the union to something with no `*Light` pair is a type error here.
 * It stays three-wide (no `error`) because no settings note on either side is an error.
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
        // `Banner.tsx:114-131` (phone `Banner.tsx:85-93`), key for key and in its order.
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderStyle: 'solid',
        padding: spacing.base,
        // The four side longhands, never the `borderColor` shorthand — `border-color` is itself
        // a four-side shorthand and erases a per-side longhand identically
        // (`reports/partner-lit-edge-ruling.md` §1). `Banner` writes the accent the same way;
        // the drift guard compares the two, so this cannot quietly become a shorthand.
        borderTopColor: t.borderColor,
        borderRightColor: t.borderColor,
        borderBottomColor: t.borderColor,
        borderLeftColor: t.borderColor,
        // `backgroundColor`, not the `background` shorthand — `Banner.tsx:170`'s spelling, and
        // the fill must stay a flat OPAQUE `*Light` tone or the `*OnLight` ratio it was
        // measured against stops being measurable.
        backgroundColor: t.background,
        // Phone `styles.note` — the ONLY thing every settings caller passes to `<Banner>`.
        marginTop: spacing.xs,
      }}
    >
      <BannerIcon severity={tone} color={t.color} />
      <div style={{ flex: 1, fontSize: 14, lineHeight: '21px', color: t.color }}>{children}</div>
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
 *
 * **D12 puts this in the "follow" arm, not the "freeze" arm** — it renders INSIDE the phone
 * frame, so its colours move with the palette. Its GEOMETRY does not: there is no phone recipe
 * to port one from, and D3 leaves an unchanged unique literal alone rather than snapping it to
 * a step. So `14 / 18 / 10 / 7` and the two off-ladder type sizes (§4.9's rule) stay spelled.
 *
 * The body's colour is `colors.text` since U6.4a. It used to be the demo-wide form-label tone,
 * a bare dark value with no palette sibling that eight surfaces spelled by hand; U2.4's
 * deferral D-3 held it here until one package could move the whole family, and U6.4a did.
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
        // Was the same alpha spelled as a bare `rgba()`. Derived now, so a `primary` re-base
        // moves the wash with it — the phone's own idiom for exactly this (`withAlpha`).
        background: withAlpha(colors.primary, 0.08),
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: colors.textTertiary,
          marginBottom: 7,
        }}
      >
        In the demo
      </div>
      {/* U6.4a moved it, as U6.2's docblock said it would. `colors.text` is `PaneNote`'s
          message tone (a severity `*OnLight` resolves there in dark) — this body reads as the
          same kind of line, and it is the sentence the visitor is here to read. */}
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: colors.text }}>{children}</div>
    </div>
  )
}

// ---- Controls ---------------------------------------------------------------

/**
 * The phone's radio groups (Export Mode, Encryption Strength) — a bordered row per option with
 * a ring + dot, the border lighting on the selection. `radiogroup`/`radio` roles so the set
 * reads as one control to AT, which the phone gets from `accessibilityRole="radio"`.
 *
 * U2.4 (A74): the row, ring, dot and label are `RadioOption` now — the module-local
 * `radioOption` style fn that used to live here is DELETED, along with its three hardcoded
 * accents. Its selected treatment was `#2B8CC1` on the border and the dot with a `#f0f4f8`
 * label, which is DEF-UI-018's failing pair (2.81:1 on the carriers, 3.46:1 on the label);
 * `RadioOption` puts all four parts on `colors.link`. The group keeps `role="radiogroup"`,
 * `testIdOf` and the layout, which is everything the three consumers disagree about.
 *
 * `direction="column"` because a settings pane stacks its options full-width; the phone's own
 * default is `row` and the two wizard groups take it. The `gap` replaces the per-option
 * `marginBottom: 8` — same 8px between rows, no trailing margin after the last (phone
 * `RadioGroup.tsx:134-140`, `optionsContainer` + `optionsColumn`).
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
    <div
      role="radiogroup"
      aria-label={label}
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
    >
      {options.map((o) => (
        <RadioOption
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onSelect={() => onChange(o.value)}
          direction="column"
          testId={testIdOf?.(o.value)}
        />
      ))}
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
 *
 * ## The recipe (phone `MediaCaptureSettingsSection.tsx:173-188` + `:409-418`)
 *
 * ```
 * slider       width '100%' · height 40
 *              minimumTrackTintColor colors.primary
 *              thumbTintColor        colors.primary
 *              maximumTrackTintColor colors.border      <- see below
 * sliderLabels row · space-between
 * sliderLabel  fontSize.xs 12 · colors.textTertiary     was: 11 · the same hex, spelled
 * ```
 *
 * **`maximumTrackTintColor` has no inline expression and is deliberately not ported.**
 * `accentColor` is the CSS property carrying the phone's other two — it paints the FILLED track
 * and the thumb, which is exactly `minimumTrackTintColor` + `thumbTintColor` — but the UNFILLED
 * track is reachable only through `::-webkit-slider-runnable-track` / `::-moz-range-track`,
 * i.e. a stylesheet. `features/demo/**` styles with `CSSProperties` and `ui/demo.css` is frozen
 * (plan §4.2, D9), and a value moved into a class would un-pin its own test (jsdom renders no
 * CSS). Hand-rolling the track instead would trade one unportable value for a whole control the
 * phone does not have. So the demo keeps the UA's neutral trough, and this divergence is
 * recorded rather than faked.
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
        style={{ width: '100%', height: 40, accentColor: colors.primary, cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textTertiary }}>
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}
