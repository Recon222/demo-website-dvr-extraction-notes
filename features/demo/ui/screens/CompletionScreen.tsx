'use client'

import type { FormFieldId } from '@/features/demo/engine/types'
import { DateTimeField, Field, SectionCard, WizardHeader } from '@/features/demo/ui/screens/_shared'
import { Banner } from '@/features/demo/ui/controls/Banner'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { glassCardNested } from '@/features/demo/ui/glass-tokens'
import { fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * The id the blocked `Complete & Save` points `aria-describedby` at (D10 / review F39). It has
 * to be stable and it has to exist only while the banner does — a describedby naming a missing
 * node reads as no reason at all.
 */
const NO_CASE_BANNER_ID = 'completion-no-case'

/** Phone `completion.tsx:497` verbatim, apart from the screen it names: the demo creates a case
 *  from **Cases** (`CasesScreen`'s New Case button is the only one), not from a Home tab. */
const NO_CASE_MESSAGE =
  'No Case Selected. Please create a case and location from the Cases screen before completing the form.'

export interface CompletionSummary {
  occNumber: string
  location: string
  dvr: string
  offset: string | null
  scopes: number
  cameras: number
  export: string
}

export interface CompletionScreenProps {
  summary: CompletionSummary
  /** Location-scoped (R-1): true only when THIS location was completed — never the case. */
  isComplete: boolean
  /** False when no location is open (rail-jump with nothing selected): Complete & Save disables
   *  instead of silently no-opping. */
  canComplete: boolean
  /** Messages from the last blocked gate run (`finalSubmissionSchema`). Empty = no card.
   *  The bridge owns the state and clears it as soon as the data becomes valid, exactly like
   *  the phone's auto-clear effect (`app/(form)/completion.tsx:115-125`). */
  validationErrors: readonly string[]
  dateTimeCompleted: string
  completedBy: string
  onChange(field: 'dateTimeCompleted' | 'completedBy', value: string): void
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). */
  isFieldVisible(id: FormFieldId): boolean
  onPreviewPdf(): void
  onPreviewTimeOffsetPdf(): void
  /** Opens the export scope chooser (phone `setShowExportSheet(true)`, completion.tsx:554). */
  onExportZip(): void
  /** Phone: `disabled={isExporting || !currentLocationId}` (completion.tsx:557). Split from
   *  `canComplete` because the two disable for different reasons and say so differently. */
  canExport: boolean
  /** Phone: the label flips to `Exporting...` while a run is in flight (completion.tsx:562). */
  isExporting: boolean
  onComplete(): void
  /** Back from the confirmation to the review form — the court PDF is never a one-shot. */
  onReviewAgain(): void
  onBackToDashboard(): void
  onBackToCases(): void
  onBack(): void
  onMenu(): void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: colors.textTertiary }}>{label}</span>
      <span style={{ fontSize: 13, color: colors.text, textAlign: 'right', maxWidth: '62%' }}>{value}</span>
    </div>
  )
}

/** Review summary → real court-PDF preview + simulated biometric export gate → complete. */
export function CompletionScreen(p: CompletionScreenProps) {
  if (p.isComplete) {
    return (
      <div style={{ minHeight: 786, paddingBottom: 40 }}>
        <WizardHeader title="Completion & Review" onBack={p.onBack} onMenu={p.onMenu} />
        {/* One `padding` SHORTHAND, not `padding: 16` + a `paddingTop: 60` longhand. React
            reuses this node for the review form's `{ padding: 16 }` div at :82, so on the
            "Review / Export again" transition it removed `paddingTop` while `padding` stayed
            unchanged and never reasserted — the form rendered with NO top padding, and said so
            only in a console error nobody read (lit-edge ruling §4.3; caught by the repo-wide
            guard in `vitest.setup.ts`). Same 60/16/16 box. */}
        <div style={{ padding: '60px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 84, height: 84, borderRadius: 42, background: 'rgba(16,209,119,0.13)', border: '1px solid rgba(16,209,119,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, marginBottom: 10 }}>Location Complete</div>
          <div style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.5, maxWidth: 280, marginBottom: 30 }}>Saved and marked complete. This location is locked, with its PDFs and media archived.</div>
          <button type="button" onClick={p.onBackToDashboard} style={{ width: '100%', marginBottom: 10, ...buttonStyle() }}>Back to Dashboard</button>
          <button type="button" onClick={p.onBackToCases} style={{ width: '100%', marginBottom: 10, ...buttonStyle({ variant: 'secondary' }) }}>Return to Cases</button>
          <button type="button" onClick={p.onReviewAgain} style={{ width: '100%', ...buttonStyle({ variant: 'secondary' }) }}>Review / Export again</button>
        </div>
      </div>
    )
  }
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Completion & Review" onBack={p.onBack} onMenu={p.onMenu} />
      <div style={{ padding: 16 }}>
        {/* A71 / D19's hand-back — and the phone has TWO of these, mutually exclusive
            (`completion.tsx:492-506`). The order and the exclusion are both load-bearing, and
            the phone records why (`:482-487`): "one tap with no case selected used to mount the
            second assertive region beside the first and the announcements cut each other off.
            At most one shows, and it is the context banner." */}
        {!p.canComplete ? (
          <Banner severity="error" message={NO_CASE_MESSAGE} style={{ marginBottom: spacing.md }} id={NO_CASE_BANNER_ID} />
        ) : (
          p.validationErrors.length > 0 && (
            /* One Banner carrying every failed rule, not one per rule. Phone `:475-477`:
               "a Banner is a single status line, and each one is an assertive live region, so N
               banners would mean N interruptions announcing one validation failure." The message
               is the phone's own composition (`:478-480`) — a heading line, then `- ` per rule.
               `whiteSpace: 'pre-line'` is what makes those newlines render: RN's `<Text>` breaks
               on `\n` and HTML collapses it, so without this the phone's string would paint as
               one run-on line. LAYOUT only, which is all Banner's `style` may carry. */
            <Banner
              severity="error"
              message={`Required Fields Missing:\n${p.validationErrors.map((err) => `- ${err}`).join('\n')}`}
              style={{ marginBottom: spacing.md, whiteSpace: 'pre-line' }}
            />
          )
        )}
        {/* M1(a) — the summary card drops `techGlow` AND `elevated` for plain nested glass.
            The glow was `0 0 22px rgba(43,140,193,0.12)`, a 22px accent bloom under a summary
            panel; the phone's own card passes no `techGlow` at all (`completion.tsx:532-536`)
            and is a bare `<Card glass glassVariant="nestedCard">`.

            U1.3's note here said "do not revert the gradient when the glow goes", and this does
            not: it moves the tier FORWARD (`elevated` -> `nestedCard`), it does not restore the
            `0.9/0.96` near-miss U1.3 normalised away. Lifted `borderRadius: 14` and
            `padding: 18` kept (demo §0.4). Spread FIRST, with nothing after it touching the
            border family, so the lit top edge survives. */}
        <div style={{ ...glassCardNested, borderRadius: 14, padding: 18, marginBottom: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace", marginBottom: 14 }}>OCC #{p.summary.occNumber}</div>
          <Row label="Location" value={p.summary.location} />
          <Row label="DVR" value={p.summary.dvr} />
          {p.summary.offset && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: colors.textTertiary }}>Time offset</span>
              {/* Was `primaryLight` — the accent as text, on the one summary line that
                  restates a forensic measurement. Same ruling as `TimeOffsetScreen`'s own
                  corrected times; weight 600 still separates it from the rows around it. */}
              <span style={{ fontSize: 13, color: colors.text, fontWeight: 600 }}>{p.summary.offset}</span>
            </div>
          )}
          <Row label="Scopes / Cameras" value={`${p.summary.scopes} / ${p.summary.cameras}`} />
          <Row label="Export" value={p.summary.export} />
        </div>
        {/* The card goes when both its entries do — the summary above and the export actions
            below are chrome, not fields, and neither is switchable. Completion is a must-stay
            screen precisely so those actions stay reachable. */}
        {(p.isFieldVisible('completion.dateTimeCompleted') || p.isFieldVisible('completion.completedBy')) && (
        <SectionCard title="Completion Details">
          {p.isFieldVisible('completion.dateTimeCompleted') && (
            <div style={{ marginBottom: 14 }}>
              {/* U6.4a's A72 seam. Was the ninth byte-identical copy of the four-key form-label object
                  (`13 / 500 / #cdd9e6 / 6`) — see `field-recipe-sweep.test.tsx`. */}
              <div style={fieldLabelStyle}>Date / Time Completed</div>
              <DateTimeField label="Date / Time Completed" value={p.dateTimeCompleted} onChange={(v) => p.onChange('dateTimeCompleted', v)} />
            </div>
          )}
          {p.isFieldVisible('completion.completedBy') && (
            <Field label="Completed By" value={p.completedBy} onChange={(v) => p.onChange('completedBy', v)} placeholder="Analyst name" />
          )}
        </SectionCard>
        )}
        {/* Phone `app/(form)/completion.tsx:561-569`: `variant="outline"`, `fullWidth`, default
            size. A66/DEF-UI-018 — border AND label leave `#2B8CC1`/`#4BA3D4` for `link`
            (2.81 -> 6.86). The glyph takes `currentColor` so it cannot drift from the label. */}
        <button type="button" onClick={p.onPreviewPdf} style={{ gap: 9, marginBottom: 10, width: '100%', ...buttonStyle({ variant: 'outline' }) }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
          Preview / Export PDF
        </button>
        {p.summary.offset && (
          <button type="button" onClick={p.onPreviewTimeOffsetPdf} style={{ width: '100%', marginBottom: 10, ...buttonStyle({ variant: 'secondary' }) }}>Preview Time-Offset Calibration</button>
        )}
        {/* Phone order (FormActions, completion.tsx:504-572): Preview/Export PDF → the
            conditional Time-Offset preview → Export Zip → Complete & Save. */}
        {/* D10 / review F39 — `aria-disabled` and NOT the `disabled` attribute, on both.
            `disabled` strips a control out of the tab order entirely, so a keyboard visitor
            cannot reach it to be told why it is unavailable; `aria-disabled` keeps it focusable
            and announces the state. The other half is the REASON: `aria-disabled` says "dimmed"
            and carries no explanation, and in focus mode a screen reader reads only the focused
            node — never an unlabelled sibling and never a `title` tooltip, which is a pointer
            affordance the accessibility tree does not surface here. F39's precedent
            (`ModalActions.submitBlocked`, `Toggle`'s `disabled.reasonId`) is the pair, so the
            Complete CTA points at the banner that already says it in words.

            `title` is kept where it still says something a hover can usefully add, and dropped
            where it only duplicated the banner.

            The trade `disabled` makes for free and this idiom does not: the browser no longer
            suppresses the click, so each handler refuses for itself. */}
        <button
          type="button"
          onClick={() => p.canExport && p.onExportZip()}
          aria-disabled={!p.canExport || undefined}
          aria-label="Export options"
          title={p.canExport ? 'Choose between exporting this location or the full case' : 'Open a location first'}
          style={{ width: '100%', marginBottom: 10, ...buttonStyle({ variant: 'secondary', disabled: !p.canExport }) }}
        >
          {p.isExporting ? 'Exporting...' : 'Export Zip'}
        </button>
        <button
          type="button"
          onClick={() => p.canComplete && p.onComplete()}
          aria-disabled={!p.canComplete || undefined}
          aria-describedby={p.canComplete ? undefined : NO_CASE_BANNER_ID}
          style={{ width: '100%', ...buttonStyle({ disabled: !p.canComplete }) }}
        >
          Complete &amp; Save
        </button>
      </div>
    </div>
  )
}
