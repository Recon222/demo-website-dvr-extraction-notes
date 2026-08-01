'use client'

import { useState } from 'react'
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from '@/features/demo/engine/content/app-info'
import { clock } from '@/features/demo/ui/inputs/clock'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { PaneStubNote } from '@/features/demo/ui/screens/settings/panes/_pane-chrome'

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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0 20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 72,
            height: 72,
            borderRadius: 18,
            background: GLASS.gradientAccent,
            marginBottom: 6,
          }}
        >
          {/* Ionicons `videocam` — the phone's app-icon chip glyph. */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
            <path d="M15.5 10.5l5-3v9l-5-3z" />
          </svg>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', textAlign: 'center' }}>{APP_NAME}</div>
        <div style={{ fontSize: 14, color: '#99badd' }}>Version {APP_VERSION}</div>
      </div>

      <div style={{ paddingTop: 14, borderTop: GLASS.border, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <InfoRow label="Platform:" value="Web (browser)" />
        <InfoRow label="Build:" value="Interactive demo" />
      </div>

      <p style={{ margin: '18px 0', fontSize: 13, lineHeight: 1.6, color: '#99badd', textAlign: 'center' }}>
        A professional tool for law enforcement and forensic professionals to document CCTV/DVR
        evidence recovery with court-admissible documentation and precise time calibration.
      </p>

      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}
        data-testid="about-contact-support"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 14,
          borderRadius: 10,
          border: GLASS.borderBtn,
          color: '#2B8CC1',
          fontSize: 14,
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        {/* Ionicons `mail`. */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M4 7.5l8 5.5 8-5.5" />
        </svg>
        <span style={{ flex: 1 }}>Contact Support</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a9fc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#7a9fc4', userSelect: 'text' }}
      >
        {SUPPORT_EMAIL}
      </div>

      <div style={{ paddingTop: 18, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, color: '#46607e' }}>© {year} {APP_NAME}</div>
        <div style={{ fontSize: 11, color: '#46607e' }}>All rights reserved</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#99badd' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>{value}</span>
    </div>
  )
}
