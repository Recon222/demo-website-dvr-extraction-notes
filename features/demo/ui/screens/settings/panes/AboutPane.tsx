'use client'

import { useState } from 'react'
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from '@/features/demo/engine/content/app-info'
import { clock } from '@/features/demo/ui/inputs/clock'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'
import { colors } from '@/features/demo/ui/tokens/palette'
import { iconSize, radius, spacing } from '@/features/demo/ui/tokens/scale'

/**
 * Detail pane: **About** (matrix row 93; phone `AboutSection.tsx`).
 *
 * The pane whose whole content is claims about the running build, so every value is the
 * DEMO's — the P4.2 version-chrome precedent applied to a second surface. Three adaptations,
 * each because the phone's value has no true web counterpart:
 *
 * - `Platform:` reads `Web (browser)` rather than `iOS`/`Android`.
 * - The phone's `Expo SDK:` row is replaced by `Build:` → `Interactive demo`. A row labelled
 *   "Expo SDK" over a dash would be chrome for a fact that does not exist here.
 * - The version line still reads `Version 1.0.0` — that IS the app's version, and the demo is
 *   its demo, which the Build row now says out loud.
 *
 * `Contact Support` is REAL: a `mailto:` is one of the few things in this surface a browser does
 * properly, so it is wired rather than stubbed. The address is the site's published contact
 * (`app-info.ts` `SUPPORT_EMAIL`), not the phone's in-app support address — a demo visitor is
 * not an operator with a case open.
 *
 * The copyright year comes through the injectable clock seam (`ui/inputs/clock.ts`), read ONCE
 * at mount via a lazy state initializer rather than on every render: the demo forbids an argless
 * `new Date()` at render scope, and a spy-able single read is what lets a test pin the line
 * without freezing the whole suite's clock.
 */
export function AboutPane() {
  const [year] = useState(() => clock.now().getFullYear())
  const subject = `${APP_NAME} v${APP_VERSION} demo - Support Request`

  return (
    <div data-testid="settings-pane-about">
      <PaneStubNote>
        Everything on this screen describes what you are actually looking at: a browser build of
        the demo, carrying the app&apos;s version. Contact Support hands the address to your
        browser — if nothing happens, this machine has no mail app registered, so the address is
        printed below it to copy.
      </PaneStubNote>

      {/* Phone `styles.header` (`:138-142`) — `paddingVertical: spacing.lg`, `gap: spacing.sm`. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.sm,
          padding: `${spacing.lg}px 0`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // Phone `styles.iconContainer` (`:130-137`) — 80x80 at `borderRadius.xl`, was
            // 72x72 at a bare 18.
            width: 80,
            height: 80,
            borderRadius: radius.xl,
            background: GLASS.gradientAccent,
            marginBottom: spacing.sm,
          }}
        >
          {/* Ionicons `videocam` — the phone's app-icon chip glyph, on the accent fill, so its
              stroke is `onPrimary` rather than a bare white (A19). */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.onPrimary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
            <path d="M15.5 10.5l5-3v9l-5-3z" />
          </svg>
        </div>
        {/* `fontSize['2xl']` / bold (`:143-147`), was 20. */}
        <div style={{ fontSize: 24, fontWeight: 700, color: colors.text, textAlign: 'center' }}>{APP_NAME}</div>
        {/* `fontSize.base` in `textSecondary` (`:148-150`, `:61`), was 14. */}
        <div style={{ fontSize: 16, color: colors.textSecondary }}>Version {APP_VERSION}</div>
      </div>

      {/* Phone `styles.infoSection` (`:151-155`) — `paddingTop: spacing.md` (was 14),
          `borderTopWidth: 1`, `gap: spacing.sm`. */}
      <div
        style={{
          paddingTop: spacing.md,
          borderTop: GLASS.border,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        <InfoRow label="Platform:" value="Web (browser)" />
        <InfoRow label="Build:" value="Interactive demo" />
      </div>

      {/* Phone `styles.descriptionSection` + `styles.description` (`:172-181`) —
          `paddingVertical: spacing.sm`, `fontSize.sm` on `fontSize.base * relaxed` = 28. */}
      <p
        style={{
          margin: `${spacing.sm}px 0`,
          fontSize: 14,
          lineHeight: '28px',
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        A professional tool for law enforcement and forensic professionals to document CCTV/DVR
        evidence recovery with court-admissible documentation and precise time calibration.
      </p>

      {/*
        A66's last settings site. The phone wraps this row in `<Button variant="outline" fullWidth>`
        and mirrors the recipe by hand on the children, because `Button` renders non-string
        children verbatim (`AboutSection.tsx:89-108`, and DEF-UI-018's PR #123 closure is the
        commit that put `colors.link` on both the glyph and the label). The demo does the same
        with `buttonStyle`, spread LAST per its docblock, then overridden only outside the border
        family.

        The trailing chevron stays on the SECONDARY tone, and that is the phone's ruling verbatim
        (`:101-103`): *"a decorative affordance rather than the label"*. The demo's was
        `textTertiary`; `textSecondary` is what the phone measured at 5.21 dark.
      */}
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}
        data-testid="about-contact-support"
        style={{
          ...buttonStyle({ variant: 'outline' }),
          // Phone `styles.supportButtonContent` (`:157-165`): the icon/label/chevron row the
          // hand-rolled button laid out itself, `fullWidth`, and left-aligned rather than
          // `Button`'s centred single child.
          width: '100%',
          justifyContent: 'flex-start',
          gap: spacing.sm,
          textDecoration: 'none',
        }}
      >
        {/* Ionicons `mail` at `Layout.iconSize.sm`. */}
        <svg width={iconSize.sm} height={iconSize.sm} viewBox="0 0 24 24" fill="none" stroke={colors.link} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M4 7.5l8 5.5 8-5.5" />
        </svg>
        {/* `styles.supportButtonText` (`:166-170`) — `fontSize.base`, medium, `flex: 1`. The
            weight overrides `buttonStyle`'s semibold exactly as the phone's `<Text>` overrides
            `Button`'s. */}
        <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>Contact Support</span>
        <svg width={iconSize.sm} height={iconSize.sm} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </a>

      {/*
        R-18. A `mailto:` with no registered handler does NOTHING — no navigation, no error, no
        event the page can observe — so the note's "it opens your mail client" was a claim the
        surface could not keep and could not detect breaking. Rather than soften the sentence and
        leave the visitor with a dead button, the address itself is printed here as selectable
        text: the failure mode now degrades to something usable instead of to silence. Same
        instinct as the export terminals — say what is true, then point at what still works.
      */}
      <div
        data-testid="about-support-address"
        style={{ marginTop: spacing.sm, textAlign: 'center', fontSize: 12, color: colors.textTertiary, userSelect: 'text' }}
      >
        {SUPPORT_EMAIL}
      </div>

      {/* Phone `styles.footer` + `styles.copyright` (`:186-194`) — `paddingTop: spacing.md`
          (was 18), `gap: spacing.xs`, `fontSize.xs` (was 11) in `colors.textTertiary`.
          `#46607e` is on no ramp in this palette at all, which is why row 93 names it. */}
      <div
        style={{
          paddingTop: spacing.md,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
        }}
      >
        <div style={{ fontSize: 12, color: colors.textTertiary }}>© {year} {APP_NAME}</div>
        <div style={{ fontSize: 12, color: colors.textTertiary }}>All rights reserved</div>
      </div>
    </div>
  )
}

/** Phone `styles.infoRow` / `infoLabel` / `infoValue` (`:156-171`) — both at `fontSize.sm`. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: colors.textSecondary }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{value}</span>
    </div>
  )
}
